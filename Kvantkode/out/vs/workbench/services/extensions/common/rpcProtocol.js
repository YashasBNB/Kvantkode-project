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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnBjUHJvdG9jb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2NvbW1vbi9ycGNQcm90b2NvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXBHLE9BQU8sS0FBSyxNQUFNLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFHL0YsT0FBTyxFQUFtQixxQkFBcUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTFGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sMkJBQTJCLEVBRzNCLGVBQWUsRUFDZiw2QkFBNkIsR0FDN0IsTUFBTSxzQkFBc0IsQ0FBQTtBQU03QixTQUFTLGFBQWEsQ0FBQyxHQUFRLEVBQUUsUUFBc0M7SUFDdEUsSUFBSSxDQUFDO1FBQ0osT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBb0MsUUFBUSxDQUFDLENBQUE7SUFDdkUsQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDZCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFBO0FBQy9CLE1BQU0sWUFBWSxHQUFHLEVBQUUs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