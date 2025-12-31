/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var _a;
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import * as errors from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { transformIncomingURIs } from '../../../../base/common/uriIpc.js';
import { CanceledLazyPromise, LazyPromise } from './lazyPromise.js';
import { getStringIdentifierForProxy, ProxyIdentifier, SerializableObjectWithBuffers, } from './proxyIdentifier.js';
function safeStringify(obj, replacer) {
    try {
        return JSON.stringify(obj, replacer);
    }
    catch (err) {
        return 'null';
    }
}
const refSymbolName = '$$ref$$';
const undefinedRef = { [refSymbolName]: -1 };
class StringifiedJsonWithBufferRefs {
    constructor(jsonString, referencedBuffers) {
        this.jsonString = jsonString;
        this.referencedBuffers = referencedBuffers;
    }
}
export function stringifyJsonWithBufferRefs(obj, replacer = null, useSafeStringify = false) {
    const foundBuffers = [];
    const serialized = (useSafeStringify ? safeStringify : JSON.stringify)(obj, (key, value) => {
        if (typeof value === 'undefined') {
            return undefinedRef; // JSON.stringify normally converts 'undefined' to 'null'
        }
        else if (typeof value === 'object') {
            if (value instanceof VSBuffer) {
                const bufferIndex = foundBuffers.push(value) - 1;
                return { [refSymbolName]: bufferIndex };
            }
            if (replacer) {
                return replacer(key, value);
            }
        }
        return value;
    });
    return {
        jsonString: serialized,
        referencedBuffers: foundBuffers,
    };
}
export function parseJsonAndRestoreBufferRefs(jsonString, buffers, uriTransformer) {
    return JSON.parse(jsonString, (_key, value) => {
        if (value) {
            const ref = value[refSymbolName];
            if (typeof ref === 'number') {
                return buffers[ref];
            }
            if (uriTransformer && value.$mid === 1 /* MarshalledId.Uri */) {
                return uriTransformer.transformIncoming(value);
            }
        }
        return value;
    });
}
function stringify(obj, replacer) {
    return JSON.stringify(obj, replacer);
}
function createURIReplacer(transformer) {
    if (!transformer) {
        return null;
    }
    return (key, value) => {
        if (value && value.$mid === 1 /* MarshalledId.Uri */) {
            return transformer.transformOutgoing(value);
        }
        return value;
    };
}
export var RequestInitiator;
(function (RequestInitiator) {
    RequestInitiator[RequestInitiator["LocalSide"] = 0] = "LocalSide";
    RequestInitiator[RequestInitiator["OtherSide"] = 1] = "OtherSide";
})(RequestInitiator || (RequestInitiator = {}));
export var ResponsiveState;
(function (ResponsiveState) {
    ResponsiveState[ResponsiveState["Responsive"] = 0] = "Responsive";
    ResponsiveState[ResponsiveState["Unresponsive"] = 1] = "Unresponsive";
})(ResponsiveState || (ResponsiveState = {}));
const noop = () => { };
const _RPCProtocolSymbol = Symbol.for('rpcProtocol');
const _RPCProxySymbol = Symbol.for('rpcProxy');
export class RPCProtocol extends Disposable {
    static { _a = _RPCProtocolSymbol; }
    static { this.UNRESPONSIVE_TIME = 3 * 1000; } // 3s
    constructor(protocol, logger = null, transformer = null) {
        super();
        this[_a] = true;
        this._onDidChangeResponsiveState = this._register(new Emitter());
        this.onDidChangeResponsiveState = this._onDidChangeResponsiveState.event;
        this._protocol = protocol;
        this._logger = logger;
        this._uriTransformer = transformer;
        this._uriReplacer = createURIReplacer(this._uriTransformer);
        this._isDisposed = false;
        this._locals = [];
        this._proxies = [];
        for (let i = 0, len = ProxyIdentifier.count; i < len; i++) {
            this._locals[i] = null;
            this._proxies[i] = null;
        }
        this._lastMessageId = 0;
        this._cancelInvokedHandlers = Object.create(null);
        this._pendingRPCReplies = {};
        this._responsiveState = 0 /* ResponsiveState.Responsive */;
        this._unacknowledgedCount = 0;
        this._unresponsiveTime = 0;
        this._asyncCheckUresponsive = this._register(new RunOnceScheduler(() => this._checkUnresponsive(), 1000));
        this._register(this._protocol.onMessage((msg) => this._receiveOneMessage(msg)));
    }
    dispose() {
        this._isDisposed = true;
        // Release all outstanding promises with a canceled error
        Object.keys(this._pendingRPCReplies).forEach((msgId) => {
            const pending = this._pendingRPCReplies[msgId];
            delete this._pendingRPCReplies[msgId];
            pending.resolveErr(errors.canceled());
        });
        super.dispose();
    }
    drain() {
        if (typeof this._protocol.drain === 'function') {
            return this._protocol.drain();
        }
        return Promise.resolve();
    }
    _onWillSendRequest(req) {
        if (this._unacknowledgedCount === 0) {
            // Since this is the first request we are sending in a while,
            // mark this moment as the start for the countdown to unresponsive time
            this._unresponsiveTime = Date.now() + RPCProtocol.UNRESPONSIVE_TIME;
        }
        this._unacknowledgedCount++;
        if (!this._asyncCheckUresponsive.isScheduled()) {
            this._asyncCheckUresponsive.schedule();
        }
    }
    _onDidReceiveAcknowledge(req) {
        // The next possible unresponsive time is now + delta.
        this._unresponsiveTime = Date.now() + RPCProtocol.UNRESPONSIVE_TIME;
        this._unacknowledgedCount--;
        if (this._unacknowledgedCount === 0) {
            // No more need to check for unresponsive
            this._asyncCheckUresponsive.cancel();
        }
        // The ext host is responsive!
        this._setResponsiveState(0 /* ResponsiveState.Responsive */);
    }
    _checkUnresponsive() {
        if (this._unacknowledgedCount === 0) {
            // Not waiting for anything => cannot say if it is responsive or not
            return;
        }
        if (Date.now() > this._unresponsiveTime) {
            // Unresponsive!!
            this._setResponsiveState(1 /* ResponsiveState.Unresponsive */);
        }
        else {
            // Not (yet) unresponsive, be sure to check again soon
            this._asyncCheckUresponsive.schedule();
        }
    }
    _setResponsiveState(newResponsiveState) {
        if (this._responsiveState === newResponsiveState) {
            // no change
            return;
        }
        this._responsiveState = newResponsiveState;
        this._onDidChangeResponsiveState.fire(this._responsiveState);
    }
    get responsiveState() {
        return this._responsiveState;
    }
    transformIncomingURIs(obj) {
        if (!this._uriTransformer) {
            return obj;
        }
        return transformIncomingURIs(obj, this._uriTransformer);
    }
    getProxy(identifier) {
        const { nid: rpcId, sid } = identifier;
        if (!this._proxies[rpcId]) {
            this._proxies[rpcId] = this._createProxy(rpcId, sid);
        }
        return this._proxies[rpcId];
    }
    _createProxy(rpcId, debugName) {
        const handler = {
            get: (target, name) => {
                if (typeof name === 'string' &&
                    !target[name] &&
                    name.charCodeAt(0) === 36 /* CharCode.DollarSign */) {
                    target[name] = (...myArgs) => {
                        return this._remoteCall(rpcId, name, myArgs);
                    };
                }
                if (name === _RPCProxySymbol) {
                    return debugName;
                }
                return target[name];
            },
        };
        return new Proxy(Object.create(null), handler);
    }
    set(identifier, value) {
        this._locals[identifier.nid] = value;
        return value;
    }
    assertRegistered(identifiers) {
        for (let i = 0, len = identifiers.length; i < len; i++) {
            const identifier = identifiers[i];
            if (!this._locals[identifier.nid]) {
                throw new Error(`Missing proxy instance ${identifier.sid}`);
            }
        }
    }
    _receiveOneMessage(rawmsg) {
        if (this._isDisposed) {
            return;
        }
        const msgLength = rawmsg.byteLength;
        const buff = MessageBuffer.read(rawmsg, 0);
        const messageType = buff.readUInt8();
        const req = buff.readUInt32();
        switch (messageType) {
            case 1 /* MessageType.RequestJSONArgs */:
            case 2 /* MessageType.RequestJSONArgsWithCancellation */: {
                let { rpcId, method, args } = MessageIO.deserializeRequestJSONArgs(buff);
                if (this._uriTransformer) {
                    args = transformIncomingURIs(args, this._uriTransformer);
                }
                this._receiveRequest(msgLength, req, rpcId, method, args, messageType === 2 /* MessageType.RequestJSONArgsWithCancellation */);
                break;
            }
            case 3 /* MessageType.RequestMixedArgs */:
            case 4 /* MessageType.RequestMixedArgsWithCancellation */: {
                let { rpcId, method, args } = MessageIO.deserializeRequestMixedArgs(buff);
                if (this._uriTransformer) {
                    args = transformIncomingURIs(args, this._uriTransformer);
                }
                this._receiveRequest(msgLength, req, rpcId, method, args, messageType === 4 /* MessageType.RequestMixedArgsWithCancellation */);
                break;
            }
            case 5 /* MessageType.Acknowledged */: {
                this._logger?.logIncoming(msgLength, req, 0 /* RequestInitiator.LocalSide */, `ack`);
                this._onDidReceiveAcknowledge(req);
                break;
            }
            case 6 /* MessageType.Cancel */: {
                this._receiveCancel(msgLength, req);
                break;
            }
            case 7 /* MessageType.ReplyOKEmpty */: {
                this._receiveReply(msgLength, req, undefined);
                break;
            }
            case 9 /* MessageType.ReplyOKJSON */: {
                let value = MessageIO.deserializeReplyOKJSON(buff);
                if (this._uriTransformer) {
                    value = transformIncomingURIs(value, this._uriTransformer);
                }
                this._receiveReply(msgLength, req, value);
                break;
            }
            case 10 /* MessageType.ReplyOKJSONWithBuffers */: {
                const value = MessageIO.deserializeReplyOKJSONWithBuffers(buff, this._uriTransformer);
                this._receiveReply(msgLength, req, value);
                break;
            }
            case 8 /* MessageType.ReplyOKVSBuffer */: {
                const value = MessageIO.deserializeReplyOKVSBuffer(buff);
                this._receiveReply(msgLength, req, value);
                break;
            }
            case 11 /* MessageType.ReplyErrError */: {
                let err = MessageIO.deserializeReplyErrError(buff);
                if (this._uriTransformer) {
                    err = transformIncomingURIs(err, this._uriTransformer);
                }
                this._receiveReplyErr(msgLength, req, err);
                break;
            }
            case 12 /* MessageType.ReplyErrEmpty */: {
                this._receiveReplyErr(msgLength, req, undefined);
                break;
            }
            default:
                console.error(`received unexpected message`);
                console.error(rawmsg);
        }
    }
    _receiveRequest(msgLength, req, rpcId, method, args, usesCancellationToken) {
        this._logger?.logIncoming(msgLength, req, 1 /* RequestInitiator.OtherSide */, `receiveRequest ${getStringIdentifierForProxy(rpcId)}.${method}(`, args);
        const callId = String(req);
        let promise;
        let cancel;
        if (usesCancellationToken) {
            const cancellationTokenSource = new CancellationTokenSource();
            args.push(cancellationTokenSource.token);
            promise = this._invokeHandler(rpcId, method, args);
            cancel = () => cancellationTokenSource.cancel();
        }
        else {
            // cannot be cancelled
            promise = this._invokeHandler(rpcId, method, args);
            cancel = noop;
        }
        this._cancelInvokedHandlers[callId] = cancel;
        // Acknowledge the request
        const msg = MessageIO.serializeAcknowledged(req);
        this._logger?.logOutgoing(msg.byteLength, req, 1 /* RequestInitiator.OtherSide */, `ack`);
        this._protocol.send(msg);
        promise.then((r) => {
            delete this._cancelInvokedHandlers[callId];
            const msg = MessageIO.serializeReplyOK(req, r, this._uriReplacer);
            this._logger?.logOutgoing(msg.byteLength, req, 1 /* RequestInitiator.OtherSide */, `reply:`, r);
            this._protocol.send(msg);
        }, (err) => {
            delete this._cancelInvokedHandlers[callId];
            const msg = MessageIO.serializeReplyErr(req, err);
            this._logger?.logOutgoing(msg.byteLength, req, 1 /* RequestInitiator.OtherSide */, `replyErr:`, err);
            this._protocol.send(msg);
        });
    }
    _receiveCancel(msgLength, req) {
        this._logger?.logIncoming(msgLength, req, 1 /* RequestInitiator.OtherSide */, `receiveCancel`);
        const callId = String(req);
        this._cancelInvokedHandlers[callId]?.();
    }
    _receiveReply(msgLength, req, value) {
        this._logger?.logIncoming(msgLength, req, 0 /* RequestInitiator.LocalSide */, `receiveReply:`, value);
        const callId = String(req);
        if (!this._pendingRPCReplies.hasOwnProperty(callId)) {
            return;
        }
        const pendingReply = this._pendingRPCReplies[callId];
        delete this._pendingRPCReplies[callId];
        pendingReply.resolveOk(value);
    }
    _receiveReplyErr(msgLength, req, value) {
        this._logger?.logIncoming(msgLength, req, 0 /* RequestInitiator.LocalSide */, `receiveReplyErr:`, value);
        const callId = String(req);
        if (!this._pendingRPCReplies.hasOwnProperty(callId)) {
            return;
        }
        const pendingReply = this._pendingRPCReplies[callId];
        delete this._pendingRPCReplies[callId];
        let err = undefined;
        if (value) {
            if (value.$isError) {
                err = new Error();
                err.name = value.name;
                err.message = value.message;
                err.stack = value.stack;
            }
            else {
                err = value;
            }
        }
        pendingReply.resolveErr(err);
    }
    _invokeHandler(rpcId, methodName, args) {
        try {
            return Promise.resolve(this._doInvokeHandler(rpcId, methodName, args));
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
    _doInvokeHandler(rpcId, methodName, args) {
        const actor = this._locals[rpcId];
        if (!actor) {
            throw new Error('Unknown actor ' + getStringIdentifierForProxy(rpcId));
        }
        const method = actor[methodName];
        if (typeof method !== 'function') {
            throw new Error('Unknown method ' + methodName + ' on actor ' + getStringIdentifierForProxy(rpcId));
        }
        return method.apply(actor, args);
    }
    _remoteCall(rpcId, methodName, args) {
        if (this._isDisposed) {
            return new CanceledLazyPromise();
        }
        let cancellationToken = null;
        if (args.length > 0 && CancellationToken.isCancellationToken(args[args.length - 1])) {
            cancellationToken = args.pop();
        }
        if (cancellationToken && cancellationToken.isCancellationRequested) {
            // No need to do anything...
            return Promise.reject(errors.canceled());
        }
        const serializedRequestArguments = MessageIO.serializeRequestArguments(args, this._uriReplacer);
        const req = ++this._lastMessageId;
        const callId = String(req);
        const result = new LazyPromise();
        const disposable = new DisposableStore();
        if (cancellationToken) {
            disposable.add(cancellationToken.onCancellationRequested(() => {
                const msg = MessageIO.serializeCancel(req);
                this._logger?.logOutgoing(msg.byteLength, req, 0 /* RequestInitiator.LocalSide */, `cancel`);
                this._protocol.send(msg);
            }));
        }
        this._pendingRPCReplies[callId] = new PendingRPCReply(result, disposable);
        this._onWillSendRequest(req);
        const msg = MessageIO.serializeRequest(req, rpcId, methodName, serializedRequestArguments, !!cancellationToken);
        this._logger?.logOutgoing(msg.byteLength, req, 0 /* RequestInitiator.LocalSide */, `request: ${getStringIdentifierForProxy(rpcId)}.${methodName}(`, args);
        this._protocol.send(msg);
        return result;
    }
}
class PendingRPCReply {
    constructor(_promise, _disposable) {
        this._promise = _promise;
        this._disposable = _disposable;
    }
    resolveOk(value) {
        this._promise.resolveOk(value);
        this._disposable.dispose();
    }
    resolveErr(err) {
        this._promise.resolveErr(err);
        this._disposable.dispose();
    }
}
class MessageBuffer {
    static alloc(type, req, messageSize) {
        const result = new MessageBuffer(VSBuffer.alloc(messageSize + 1 /* type */ + 4 /* req */), 0);
        result.writeUInt8(type);
        result.writeUInt32(req);
        return result;
    }
    static read(buff, offset) {
        return new MessageBuffer(buff, offset);
    }
    get buffer() {
        return this._buff;
    }
    constructor(buff, offset) {
        this._buff = buff;
        this._offset = offset;
    }
    static sizeUInt8() {
        return 1;
    }
    static { this.sizeUInt32 = 4; }
    writeUInt8(n) {
        this._buff.writeUInt8(n, this._offset);
        this._offset += 1;
    }
    readUInt8() {
        const n = this._buff.readUInt8(this._offset);
        this._offset += 1;
        return n;
    }
    writeUInt32(n) {
        this._buff.writeUInt32BE(n, this._offset);
        this._offset += 4;
    }
    readUInt32() {
        const n = this._buff.readUInt32BE(this._offset);
        this._offset += 4;
        return n;
    }
    static sizeShortString(str) {
        return 1 /* string length */ + str.byteLength; /* actual string */
    }
    writeShortString(str) {
        this._buff.writeUInt8(str.byteLength, this._offset);
        this._offset += 1;
        this._buff.set(str, this._offset);
        this._offset += str.byteLength;
    }
    readShortString() {
        const strByteLength = this._buff.readUInt8(this._offset);
        this._offset += 1;
        const strBuff = this._buff.slice(this._offset, this._offset + strByteLength);
        const str = strBuff.toString();
        this._offset += strByteLength;
        return str;
    }
    static sizeLongString(str) {
        return 4 /* string length */ + str.byteLength; /* actual string */
    }
    writeLongString(str) {
        this._buff.writeUInt32BE(str.byteLength, this._offset);
        this._offset += 4;
        this._buff.set(str, this._offset);
        this._offset += str.byteLength;
    }
    readLongString() {
        const strByteLength = this._buff.readUInt32BE(this._offset);
        this._offset += 4;
        const strBuff = this._buff.slice(this._offset, this._offset + strByteLength);
        const str = strBuff.toString();
        this._offset += strByteLength;
        return str;
    }
    writeBuffer(buff) {
        this._buff.writeUInt32BE(buff.byteLength, this._offset);
        this._offset += 4;
        this._buff.set(buff, this._offset);
        this._offset += buff.byteLength;
    }
    static sizeVSBuffer(buff) {
        return 4 /* buffer length */ + buff.byteLength; /* actual buffer */
    }
    writeVSBuffer(buff) {
        this._buff.writeUInt32BE(buff.byteLength, this._offset);
        this._offset += 4;
        this._buff.set(buff, this._offset);
        this._offset += buff.byteLength;
    }
    readVSBuffer() {
        const buffLength = this._buff.readUInt32BE(this._offset);
        this._offset += 4;
        const buff = this._buff.slice(this._offset, this._offset + buffLength);
        this._offset += buffLength;
        return buff;
    }
    static sizeMixedArray(arr) {
        let size = 0;
        size += 1; // arr length
        for (let i = 0, len = arr.length; i < len; i++) {
            const el = arr[i];
            size += 1; // arg type
            switch (el.type) {
                case 1 /* ArgType.String */:
                    size += this.sizeLongString(el.value);
                    break;
                case 2 /* ArgType.VSBuffer */:
                    size += this.sizeVSBuffer(el.value);
                    break;
                case 3 /* ArgType.SerializedObjectWithBuffers */:
                    size += this.sizeUInt32; // buffer count
                    size += this.sizeLongString(el.value);
                    for (let i = 0; i < el.buffers.length; ++i) {
                        size += this.sizeVSBuffer(el.buffers[i]);
                    }
                    break;
                case 4 /* ArgType.Undefined */:
                    // empty...
                    break;
            }
        }
        return size;
    }
    writeMixedArray(arr) {
        this._buff.writeUInt8(arr.length, this._offset);
        this._offset += 1;
        for (let i = 0, len = arr.length; i < len; i++) {
            const el = arr[i];
            switch (el.type) {
                case 1 /* ArgType.String */:
                    this.writeUInt8(1 /* ArgType.String */);
                    this.writeLongString(el.value);
                    break;
                case 2 /* ArgType.VSBuffer */:
                    this.writeUInt8(2 /* ArgType.VSBuffer */);
                    this.writeVSBuffer(el.value);
                    break;
                case 3 /* ArgType.SerializedObjectWithBuffers */:
                    this.writeUInt8(3 /* ArgType.SerializedObjectWithBuffers */);
                    this.writeUInt32(el.buffers.length);
                    this.writeLongString(el.value);
                    for (let i = 0; i < el.buffers.length; ++i) {
                        this.writeBuffer(el.buffers[i]);
                    }
                    break;
                case 4 /* ArgType.Undefined */:
                    this.writeUInt8(4 /* ArgType.Undefined */);
                    break;
            }
        }
    }
    readMixedArray() {
        const arrLen = this._buff.readUInt8(this._offset);
        this._offset += 1;
        const arr = new Array(arrLen);
        for (let i = 0; i < arrLen; i++) {
            const argType = this.readUInt8();
            switch (argType) {
                case 1 /* ArgType.String */:
                    arr[i] = this.readLongString();
                    break;
                case 2 /* ArgType.VSBuffer */:
                    arr[i] = this.readVSBuffer();
                    break;
                case 3 /* ArgType.SerializedObjectWithBuffers */: {
                    const bufferCount = this.readUInt32();
                    const jsonString = this.readLongString();
                    const buffers = [];
                    for (let i = 0; i < bufferCount; ++i) {
                        buffers.push(this.readVSBuffer());
                    }
                    arr[i] = new SerializableObjectWithBuffers(parseJsonAndRestoreBufferRefs(jsonString, buffers, null));
                    break;
                }
                case 4 /* ArgType.Undefined */:
                    arr[i] = undefined;
                    break;
            }
        }
        return arr;
    }
}
var SerializedRequestArgumentType;
(function (SerializedRequestArgumentType) {
    SerializedRequestArgumentType[SerializedRequestArgumentType["Simple"] = 0] = "Simple";
    SerializedRequestArgumentType[SerializedRequestArgumentType["Mixed"] = 1] = "Mixed";
})(SerializedRequestArgumentType || (SerializedRequestArgumentType = {}));
class MessageIO {
    static _useMixedArgSerialization(arr) {
        for (let i = 0, len = arr.length; i < len; i++) {
            if (arr[i] instanceof VSBuffer) {
                return true;
            }
            if (arr[i] instanceof SerializableObjectWithBuffers) {
                return true;
            }
            if (typeof arr[i] === 'undefined') {
                return true;
            }
        }
        return false;
    }
    static serializeRequestArguments(args, replacer) {
        if (this._useMixedArgSerialization(args)) {
            const massagedArgs = [];
            for (let i = 0, len = args.length; i < len; i++) {
                const arg = args[i];
                if (arg instanceof VSBuffer) {
                    massagedArgs[i] = { type: 2 /* ArgType.VSBuffer */, value: arg };
                }
                else if (typeof arg === 'undefined') {
                    massagedArgs[i] = { type: 4 /* ArgType.Undefined */ };
                }
                else if (arg instanceof SerializableObjectWithBuffers) {
                    const { jsonString, referencedBuffers } = stringifyJsonWithBufferRefs(arg.value, replacer);
                    massagedArgs[i] = {
                        type: 3 /* ArgType.SerializedObjectWithBuffers */,
                        value: VSBuffer.fromString(jsonString),
                        buffers: referencedBuffers,
                    };
                }
                else {
                    massagedArgs[i] = {
                        type: 1 /* ArgType.String */,
                        value: VSBuffer.fromString(stringify(arg, replacer)),
                    };
                }
            }
            return {
                type: 1 /* SerializedRequestArgumentType.Mixed */,
                args: massagedArgs,
            };
        }
        return {
            type: 0 /* SerializedRequestArgumentType.Simple */,
            args: stringify(args, replacer),
        };
    }
    static serializeRequest(req, rpcId, method, serializedArgs, usesCancellationToken) {
        switch (serializedArgs.type) {
            case 0 /* SerializedRequestArgumentType.Simple */:
                return this._requestJSONArgs(req, rpcId, method, serializedArgs.args, usesCancellationToken);
            case 1 /* SerializedRequestArgumentType.Mixed */:
                return this._requestMixedArgs(req, rpcId, method, serializedArgs.args, usesCancellationToken);
        }
    }
    static _requestJSONArgs(req, rpcId, method, args, usesCancellationToken) {
        const methodBuff = VSBuffer.fromString(method);
        const argsBuff = VSBuffer.fromString(args);
        let len = 0;
        len += MessageBuffer.sizeUInt8();
        len += MessageBuffer.sizeShortString(methodBuff);
        len += MessageBuffer.sizeLongString(argsBuff);
        const result = MessageBuffer.alloc(usesCancellationToken
            ? 2 /* MessageType.RequestJSONArgsWithCancellation */
            : 1 /* MessageType.RequestJSONArgs */, req, len);
        result.writeUInt8(rpcId);
        result.writeShortString(methodBuff);
        result.writeLongString(argsBuff);
        return result.buffer;
    }
    static deserializeRequestJSONArgs(buff) {
        const rpcId = buff.readUInt8();
        const method = buff.readShortString();
        const args = buff.readLongString();
        return {
            rpcId: rpcId,
            method: method,
            args: JSON.parse(args),
        };
    }
    static _requestMixedArgs(req, rpcId, method, args, usesCancellationToken) {
        const methodBuff = VSBuffer.fromString(method);
        let len = 0;
        len += MessageBuffer.sizeUInt8();
        len += MessageBuffer.sizeShortString(methodBuff);
        len += MessageBuffer.sizeMixedArray(args);
        const result = MessageBuffer.alloc(usesCancellationToken
            ? 4 /* MessageType.RequestMixedArgsWithCancellation */
            : 3 /* MessageType.RequestMixedArgs */, req, len);
        result.writeUInt8(rpcId);
        result.writeShortString(methodBuff);
        result.writeMixedArray(args);
        return result.buffer;
    }
    static deserializeRequestMixedArgs(buff) {
        const rpcId = buff.readUInt8();
        const method = buff.readShortString();
        const rawargs = buff.readMixedArray();
        const args = new Array(rawargs.length);
        for (let i = 0, len = rawargs.length; i < len; i++) {
            const rawarg = rawargs[i];
            if (typeof rawarg === 'string') {
                args[i] = JSON.parse(rawarg);
            }
            else {
                args[i] = rawarg;
            }
        }
        return {
            rpcId: rpcId,
            method: method,
            args: args,
        };
    }
    static serializeAcknowledged(req) {
        return MessageBuffer.alloc(5 /* MessageType.Acknowledged */, req, 0).buffer;
    }
    static serializeCancel(req) {
        return MessageBuffer.alloc(6 /* MessageType.Cancel */, req, 0).buffer;
    }
    static serializeReplyOK(req, res, replacer) {
        if (typeof res === 'undefined') {
            return this._serializeReplyOKEmpty(req);
        }
        else if (res instanceof VSBuffer) {
            return this._serializeReplyOKVSBuffer(req, res);
        }
        else if (res instanceof SerializableObjectWithBuffers) {
            const { jsonString, referencedBuffers } = stringifyJsonWithBufferRefs(res.value, replacer, true);
            return this._serializeReplyOKJSONWithBuffers(req, jsonString, referencedBuffers);
        }
        else {
            return this._serializeReplyOKJSON(req, safeStringify(res, replacer));
        }
    }
    static _serializeReplyOKEmpty(req) {
        return MessageBuffer.alloc(7 /* MessageType.ReplyOKEmpty */, req, 0).buffer;
    }
    static _serializeReplyOKVSBuffer(req, res) {
        let len = 0;
        len += MessageBuffer.sizeVSBuffer(res);
        const result = MessageBuffer.alloc(8 /* MessageType.ReplyOKVSBuffer */, req, len);
        result.writeVSBuffer(res);
        return result.buffer;
    }
    static deserializeReplyOKVSBuffer(buff) {
        return buff.readVSBuffer();
    }
    static _serializeReplyOKJSON(req, res) {
        const resBuff = VSBuffer.fromString(res);
        let len = 0;
        len += MessageBuffer.sizeLongString(resBuff);
        const result = MessageBuffer.alloc(9 /* MessageType.ReplyOKJSON */, req, len);
        result.writeLongString(resBuff);
        return result.buffer;
    }
    static _serializeReplyOKJSONWithBuffers(req, res, buffers) {
        const resBuff = VSBuffer.fromString(res);
        let len = 0;
        len += MessageBuffer.sizeUInt32; // buffer count
        len += MessageBuffer.sizeLongString(resBuff);
        for (const buffer of buffers) {
            len += MessageBuffer.sizeVSBuffer(buffer);
        }
        const result = MessageBuffer.alloc(10 /* MessageType.ReplyOKJSONWithBuffers */, req, len);
        result.writeUInt32(buffers.length);
        result.writeLongString(resBuff);
        for (const buffer of buffers) {
            result.writeBuffer(buffer);
        }
        return result.buffer;
    }
    static deserializeReplyOKJSON(buff) {
        const res = buff.readLongString();
        return JSON.parse(res);
    }
    static deserializeReplyOKJSONWithBuffers(buff, uriTransformer) {
        const bufferCount = buff.readUInt32();
        const res = buff.readLongString();
        const buffers = [];
        for (let i = 0; i < bufferCount; ++i) {
            buffers.push(buff.readVSBuffer());
        }
        return new SerializableObjectWithBuffers(parseJsonAndRestoreBufferRefs(res, buffers, uriTransformer));
    }
    static serializeReplyErr(req, err) {
        const errStr = err
            ? safeStringify(errors.transformErrorForSerialization(err), null)
            : undefined;
        if (typeof errStr !== 'string') {
            return this._serializeReplyErrEmpty(req);
        }
        const errBuff = VSBuffer.fromString(errStr);
        let len = 0;
        len += MessageBuffer.sizeLongString(errBuff);
        const result = MessageBuffer.alloc(11 /* MessageType.ReplyErrError */, req, len);
        result.writeLongString(errBuff);
        return result.buffer;
    }
    static deserializeReplyErrError(buff) {
        const err = buff.readLongString();
        return JSON.parse(err);
    }
    static _serializeReplyErrEmpty(req) {
        return MessageBuffer.alloc(12 /* MessageType.ReplyErrEmpty */, req, 0).buffer;
    }
}
var MessageType;
(function (MessageType) {
    MessageType[MessageType["RequestJSONArgs"] = 1] = "RequestJSONArgs";
    MessageType[MessageType["RequestJSONArgsWithCancellation"] = 2] = "RequestJSONArgsWithCancellation";
    MessageType[MessageType["RequestMixedArgs"] = 3] = "RequestMixedArgs";
    MessageType[MessageType["RequestMixedArgsWithCancellation"] = 4] = "RequestMixedArgsWithCancellation";
    MessageType[MessageType["Acknowledged"] = 5] = "Acknowledged";
    MessageType[MessageType["Cancel"] = 6] = "Cancel";
    MessageType[MessageType["ReplyOKEmpty"] = 7] = "ReplyOKEmpty";
    MessageType[MessageType["ReplyOKVSBuffer"] = 8] = "ReplyOKVSBuffer";
    MessageType[MessageType["ReplyOKJSON"] = 9] = "ReplyOKJSON";
    MessageType[MessageType["ReplyOKJSONWithBuffers"] = 10] = "ReplyOKJSONWithBuffers";
    MessageType[MessageType["ReplyErrError"] = 11] = "ReplyErrError";
    MessageType[MessageType["ReplyErrEmpty"] = 12] = "ReplyErrEmpty";
})(MessageType || (MessageType = {}));
var ArgType;
(function (ArgType) {
    ArgType[ArgType["String"] = 1] = "String";
    ArgType[ArgType["VSBuffer"] = 2] = "VSBuffer";
    ArgType[ArgType["SerializedObjectWithBuffers"] = 3] = "SerializedObjectWithBuffers";
    ArgType[ArgType["Undefined"] = 4] = "Undefined";
})(ArgType || (ArgType = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnBjUHJvdG9jb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vcnBjUHJvdG9jb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVwRyxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBRy9GLE9BQU8sRUFBbUIscUJBQXFCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUUxRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDbkUsT0FBTyxFQUNOLDJCQUEyQixFQUczQixlQUFlLEVBQ2YsNkJBQTZCLEdBQzdCLE1BQU0sc0JBQXNCLENBQUE7QUFNN0IsU0FBUyxhQUFhLENBQUMsR0FBUSxFQUFFLFFBQXNDO0lBQ3RFLElBQUksQ0FBQztRQUNKLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQW9DLFFBQVEsQ0FBQyxDQUFBO0lBQ3ZFLENBQUM7SUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQTtBQUMvQixNQUFNLFlBQVksR0FBRyxFQUFFLENBQUMs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