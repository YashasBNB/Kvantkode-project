/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { getRandomElement } from '../../../common/arrays.js';
import { createCancelablePromise, timeout } from '../../../common/async.js';
import { VSBuffer } from '../../../common/buffer.js';
import { CancellationToken, CancellationTokenSource } from '../../../common/cancellation.js';
import { memoize } from '../../../common/decorators.js';
import { CancellationError, ErrorNoTelemetry } from '../../../common/errors.js';
import { Emitter, Event, EventMultiplexer, Relay } from '../../../common/event.js';
import { createSingleCallFunction } from '../../../common/functional.js';
import { DisposableStore, dispose, toDisposable } from '../../../common/lifecycle.js';
import { revive } from '../../../common/marshalling.js';
import * as strings from '../../../common/strings.js';
import { isFunction, isUndefinedOrNull } from '../../../common/types.js';
var RequestType;
(function (RequestType) {
    RequestType[RequestType["Promise"] = 100] = "Promise";
    RequestType[RequestType["PromiseCancel"] = 101] = "PromiseCancel";
    RequestType[RequestType["EventListen"] = 102] = "EventListen";
    RequestType[RequestType["EventDispose"] = 103] = "EventDispose";
})(RequestType || (RequestType = {}));
function requestTypeToStr(type) {
    switch (type) {
        case 100 /* RequestType.Promise */:
            return 'req';
        case 101 /* RequestType.PromiseCancel */:
            return 'cancel';
        case 102 /* RequestType.EventListen */:
            return 'subscribe';
        case 103 /* RequestType.EventDispose */:
            return 'unsubscribe';
    }
}
var ResponseType;
(function (ResponseType) {
    ResponseType[ResponseType["Initialize"] = 200] = "Initialize";
    ResponseType[ResponseType["PromiseSuccess"] = 201] = "PromiseSuccess";
    ResponseType[ResponseType["PromiseError"] = 202] = "PromiseError";
    ResponseType[ResponseType["PromiseErrorObj"] = 203] = "PromiseErrorObj";
    ResponseType[ResponseType["EventFire"] = 204] = "EventFire";
})(ResponseType || (ResponseType = {}));
function responseTypeToStr(type) {
    switch (type) {
        case 200 /* ResponseType.Initialize */:
            return `init`;
        case 201 /* ResponseType.PromiseSuccess */:
            return `reply:`;
        case 202 /* ResponseType.PromiseError */:
        case 203 /* ResponseType.PromiseErrorObj */:
            return `replyErr:`;
        case 204 /* ResponseType.EventFire */:
            return `event:`;
    }
}
var State;
(function (State) {
    State[State["Uninitialized"] = 0] = "Uninitialized";
    State[State["Idle"] = 1] = "Idle";
})(State || (State = {}));
/**
 * @see https://en.wikipedia.org/wiki/Variable-length_quantity
 */
function readIntVQL(reader) {
    let value = 0;
    for (let n = 0;; n += 7) {
        const next = reader.read(1);
        value |= (next.buffer[0] & 0b01111111) << n;
        if (!(next.buffer[0] & 0b10000000)) {
            return value;
        }
    }
}
const vqlZero = createOneByteBuffer(0);
/**
 * @see https://en.wikipedia.org/wiki/Variable-length_quantity
 */
function writeInt32VQL(writer, value) {
    if (value === 0) {
        writer.write(vqlZero);
        return;
    }
    let len = 0;
    for (let v2 = value; v2 !== 0; v2 = v2 >>> 7) {
        len++;
    }
    const scratch = VSBuffer.alloc(len);
    for (let i = 0; value !== 0; i++) {
        scratch.buffer[i] = value & 0b01111111;
        value = value >>> 7;
        if (value > 0) {
            scratch.buffer[i] |= 0b10000000;
        }
    }
    writer.write(scratch);
}
export class BufferReader {
    constructor(buffer) {
        this.buffer = buffer;
        this.pos = 0;
    }
    read(bytes) {
        const result = this.buffer.slice(this.pos, this.pos + bytes);
        this.pos += result.byteLength;
        return result;
    }
}
export class BufferWriter {
    constructor() {
        this.buffers = [];
    }
    get buffer() {
        return VSBuffer.concat(this.buffers);
    }
    write(buffer) {
        this.buffers.push(buffer);
    }
}
var DataType;
(function (DataType) {
    DataType[DataType["Undefined"] = 0] = "Undefined";
    DataType[DataType["String"] = 1] = "String";
    DataType[DataType["Buffer"] = 2] = "Buffer";
    DataType[DataType["VSBuffer"] = 3] = "VSBuffer";
    DataType[DataType["Array"] = 4] = "Array";
    DataType[DataType["Object"] = 5] = "Object";
    DataType[DataType["Int"] = 6] = "Int";
})(DataType || (DataType = {}));
function createOneByteBuffer(value) {
    const result = VSBuffer.alloc(1);
    result.writeUInt8(value, 0);
    return result;
}
const BufferPresets = {
    Undefined: createOneByteBuffer(DataType.Undefined),
    String: createOneByteBuffer(DataType.String),
    Buffer: createOneByteBuffer(DataType.Buffer),
    VSBuffer: createOneByteBuffer(DataType.VSBuffer),
    Array: createOneByteBuffer(DataType.Array),
    Object: createOneByteBuffer(DataType.Object),
    Uint: createOneByteBuffer(DataType.Int),
};
const hasBuffer = typeof Buffer !== 'undefined';
export function serialize(writer, data) {
    if (typeof data === 'undefined') {
        writer.write(BufferPresets.Undefined);
    }
    else if (typeof data === 'string') {
        const buffer = VSBuffer.fromString(data);
        writer.write(BufferPresets.String);
        writeInt32VQL(writer, buffer.byteLength);
        writer.write(buffer);
    }
    else if (hasBuffer && Buffer.isBuffer(data)) {
        const buffer = VSBuffer.wrap(data);
        writer.write(BufferPresets.Buffer);
        writeInt32VQL(writer, buffer.byteLength);
        writer.write(buffer);
    }
    else if (data instanceof VSBuffer) {
        writer.write(BufferPresets.VSBuffer);
        writeInt32VQL(writer, data.byteLength);
        writer.write(data);
    }
    else if (Array.isArray(data)) {
        writer.write(BufferPresets.Array);
        writeInt32VQL(writer, data.length);
        for (const el of data) {
            serialize(writer, el);
        }
    }
    else if (typeof data === 'number' && (data | 0) === data) {
        // write a vql if it's a number that we can do bitwise operations on
        writer.write(BufferPresets.Uint);
        writeInt32VQL(writer, data);
    }
    else {
        const buffer = VSBuffer.fromString(JSON.stringify(data));
        writer.write(BufferPresets.Object);
        writeInt32VQL(writer, buffer.byteLength);
        writer.write(buffer);
    }
}
export function deserialize(reader) {
    const type = reader.read(1).readUInt8(0);
    switch (type) {
        case DataType.Undefined:
            return undefined;
        case DataType.String:
            return reader.read(readIntVQL(reader)).toString();
        case DataType.Buffer:
            return reader.read(readIntVQL(reader)).buffer;
        case DataType.VSBuffer:
            return reader.read(readIntVQL(reader));
        case DataType.Array: {
            const length = readIntVQL(reader);
            const result = [];
            for (let i = 0; i < length; i++) {
                result.push(deserialize(reader));
            }
            return result;
        }
        case DataType.Object:
            return JSON.parse(reader.read(readIntVQL(reader)).toString());
        case DataType.Int:
            return readIntVQL(reader);
    }
}
export class ChannelServer {
    constructor(protocol, ctx, logger = null, timeoutDelay = 1000) {
        this.protocol = protocol;
        this.ctx = ctx;
        this.logger = logger;
        this.timeoutDelay = timeoutDelay;
        this.channels = new Map();
        this.activeRequests = new Map();
        // Requests might come in for channels which are not yet registered.
        // They will timeout after `timeoutDelay`.
        this.pendingRequests = new Map();
        this.protocolListener = this.protocol.onMessage((msg) => this.onRawMessage(msg));
        this.sendResponse({ type: 200 /* ResponseType.Initialize */ });
    }
    registerChannel(channelName, channel) {
        this.channels.set(channelName, channel);
        // https://github.com/microsoft/vscode/issues/72531
        setTimeout(() => this.flushPendingRequests(channelName), 0);
    }
    sendResponse(response) {
        switch (response.type) {
            case 200 /* ResponseType.Initialize */: {
                const msgLength = this.send([response.type]);
                this.logger?.logOutgoing(msgLength, 0, 1 /* RequestInitiator.OtherSide */, responseTypeToStr(response.type));
                return;
            }
            case 201 /* ResponseType.PromiseSuccess */:
            case 202 /* ResponseType.PromiseError */:
            case 204 /* ResponseType.EventFire */:
            case 203 /* ResponseType.PromiseErrorObj */: {
                const msgLength = this.send([response.type, response.id], response.data);
                this.logger?.logOutgoing(msgLength, response.id, 1 /* RequestInitiator.OtherSide */, responseTypeToStr(response.type), response.data);
                return;
            }
        }
    }
    send(header, body = undefined) {
        const writer = new BufferWriter();
        serialize(writer, header);
        serialize(writer, body);
        return this.sendBuffer(writer.buffer);
    }
    sendBuffer(message) {
        try {
            this.protocol.send(message);
            return message.byteLength;
        }
        catch (err) {
            // noop
            return 0;
        }
    }
    onRawMessage(message) {
        const reader = new BufferReader(message);
        const header = deserialize(reader);
        const body = deserialize(reader);
        const type = header[0];
        switch (type) {
            case 100 /* RequestType.Promise */:
                this.logger?.logIncoming(message.byteLength, header[1], 1 /* RequestInitiator.OtherSide */, `${requestTypeToStr(type)}: ${header[2]}.${header[3]}`, body);
                return this.onPromise({
                    type,
                    id: header[1],
                    channelName: header[2],
                    name: header[3],
                    arg: body,
                });
            case 102 /* RequestType.EventListen */:
                this.logger?.logIncoming(message.byteLength, header[1], 1 /* RequestInitiator.OtherSide */, `${requestTypeToStr(type)}: ${header[2]}.${header[3]}`, body);
                return this.onEventListen({
                    type,
                    id: header[1],
                    channelName: header[2],
                    name: header[3],
                    arg: body,
                });
            case 101 /* RequestType.PromiseCancel */:
                this.logger?.logIncoming(message.byteLength, header[1], 1 /* RequestInitiator.OtherSide */, `${requestTypeToStr(type)}`);
                return this.disposeActiveRequest({ type, id: header[1] });
            case 103 /* RequestType.EventDispose */:
                this.logger?.logIncoming(message.byteLength, header[1], 1 /* RequestInitiator.OtherSide */, `${requestTypeToStr(type)}`);
                return this.disposeActiveRequest({ type, id: header[1] });
        }
    }
    onPromise(request) {
        const channel = this.channels.get(request.channelName);
        if (!channel) {
            this.collectPendingRequest(request);
            return;
        }
        const cancellationTokenSource = new CancellationTokenSource();
        let promise;
        try {
            promise = channel.call(this.ctx, request.name, request.arg, cancellationTokenSource.token);
        }
        catch (err) {
            promise = Promise.reject(err);
        }
        const id = request.id;
        promise
            .then((data) => {
            this.sendResponse({ id, data, type: 201 /* ResponseType.PromiseSuccess */ });
        }, (err) => {
            if (err instanceof Error) {
                this.sendResponse({
                    id,
                    data: {
                        message: err.message,
                        name: err.name,
                        stack: err.stack ? err.stack.split('\n') : undefined,
                    },
                    type: 202 /* ResponseType.PromiseError */,
                });
            }
            else {
                this.sendResponse({ id, data: err, type: 203 /* ResponseType.PromiseErrorObj */ });
            }
        })
            .finally(() => {
            disposable.dispose();
            this.activeRequests.delete(request.id);
        });
        const disposable = toDisposable(() => cancellationTokenSource.cancel());
        this.activeRequests.set(request.id, disposable);
    }
    onEventListen(request) {
        const channel = this.channels.get(request.channelName);
        if (!channel) {
            this.collectPendingRequest(request);
            return;
        }
        const id = request.id;
        const event = channel.listen(this.ctx, request.name, request.arg);
        const disposable = event((data) => this.sendResponse({ id, data, type: 204 /* ResponseType.EventFire */ }));
        this.activeRequests.set(request.id, disposable);
    }
    disposeActiveRequest(request) {
        const disposable = this.activeRequests.get(request.id);
        if (disposable) {
            disposable.dispose();
            this.activeRequests.delete(request.id);
        }
    }
    collectPendingRequest(request) {
        let pendingRequests = this.pendingRequests.get(request.channelName);
        if (!pendingRequests) {
            pendingRequests = [];
            this.pendingRequests.set(request.channelName, pendingRequests);
        }
        const timer = setTimeout(() => {
            console.error(`Unknown channel: ${request.channelName}`);
            if (request.type === 100 /* RequestType.Promise */) {
                this.sendResponse({
                    id: request.id,
                    data: {
                        name: 'Unknown channel',
                        message: `Channel name '${request.channelName}' timed out after ${this.timeoutDelay}ms`,
                        stack: undefined,
                    },
                    type: 202 /* ResponseType.PromiseError */,
                });
            }
        }, this.timeoutDelay);
        pendingRequests.push({ request, timeoutTimer: timer });
    }
    flushPendingRequests(channelName) {
        const requests = this.pendingRequests.get(channelName);
        if (requests) {
            for (const request of requests) {
                clearTimeout(request.timeoutTimer);
                switch (request.request.type) {
                    case 100 /* RequestType.Promise */:
                        this.onPromise(request.request);
                        break;
                    case 102 /* RequestType.EventListen */:
                        this.onEventListen(request.request);
                        break;
                }
            }
            this.pendingRequests.delete(channelName);
        }
    }
    dispose() {
        if (this.protocolListener) {
            this.protocolListener.dispose();
            this.protocolListener = null;
        }
        dispose(this.activeRequests.values());
        this.activeRequests.clear();
    }
}
export var RequestInitiator;
(function (RequestInitiator) {
    RequestInitiator[RequestInitiator["LocalSide"] = 0] = "LocalSide";
    RequestInitiator[RequestInitiator["OtherSide"] = 1] = "OtherSide";
})(RequestInitiator || (RequestInitiator = {}));
export class ChannelClient {
    constructor(protocol, logger = null) {
        this.protocol = protocol;
        this.isDisposed = false;
        this.state = State.Uninitialized;
        this.activeRequests = new Set();
        this.handlers = new Map();
        this.lastRequestId = 0;
        this._onDidInitialize = new Emitter();
        this.onDidInitialize = this._onDidInitialize.event;
        this.protocolListener = this.protocol.onMessage((msg) => this.onBuffer(msg));
        this.logger = logger;
    }
    getChannel(channelName) {
        const that = this;
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return {
            call(command, arg, cancellationToken) {
                if (that.isDisposed) {
                    return Promise.reject(new CancellationError());
                }
                return that.requestPromise(channelName, command, arg, cancellationToken);
            },
            listen(event, arg) {
                if (that.isDisposed) {
                    return Event.None;
                }
                return that.requestEvent(channelName, event, arg);
            },
        };
    }
    requestPromise(channelName, name, arg, cancellationToken = CancellationToken.None) {
        const id = this.lastRequestId++;
        const type = 100 /* RequestType.Promise */;
        const request = { id, type, channelName, name, arg };
        if (cancellationToken.isCancellationRequested) {
            return Promise.reject(new CancellationError());
        }
        let disposable;
        let disposableWithRequestCancel;
        const result = new Promise((c, e) => {
            if (cancellationToken.isCancellationRequested) {
                return e(new CancellationError());
            }
            const doRequest = () => {
                const handler = (response) => {
                    switch (response.type) {
                        case 201 /* ResponseType.PromiseSuccess */:
                            this.handlers.delete(id);
                            c(response.data);
                            break;
                        case 202 /* ResponseType.PromiseError */: {
                            this.handlers.delete(id);
                            const error = new Error(response.data.message);
                            error.stack = Array.isArray(response.data.stack)
                                ? response.data.stack.join('\n')
                                : response.data.stack;
                            error.name = response.data.name;
                            e(error);
                            break;
                        }
                        case 203 /* ResponseType.PromiseErrorObj */:
                            this.handlers.delete(id);
                            e(response.data);
                            break;
                    }
                };
                this.handlers.set(id, handler);
                this.sendRequest(request);
            };
            let uninitializedPromise = null;
            if (this.state === State.Idle) {
                doRequest();
            }
            else {
                uninitializedPromise = createCancelablePromise((_) => this.whenInitialized());
                uninitializedPromise.then(() => {
                    uninitializedPromise = null;
                    doRequest();
                });
            }
            const cancel = () => {
                if (uninitializedPromise) {
                    uninitializedPromise.cancel();
                    uninitializedPromise = null;
                }
                else {
                    this.sendRequest({ id, type: 101 /* RequestType.PromiseCancel */ });
                }
                e(new CancellationError());
            };
            disposable = cancellationToken.onCancellationRequested(cancel);
            disposableWithRequestCancel = {
                dispose: createSingleCallFunction(() => {
                    cancel();
                    disposable.dispose();
                }),
            };
            this.activeRequests.add(disposableWithRequestCancel);
        });
        return result.finally(() => {
            disposable?.dispose(); // Seen as undefined in tests.
            this.activeRequests.delete(disposableWithRequestCancel);
        });
    }
    requestEvent(channelName, name, arg) {
        const id = this.lastRequestId++;
        const type = 102 /* RequestType.EventListen */;
        const request = { id, type, channelName, name, arg };
        let uninitializedPromise = null;
        const emitter = new Emitter({
            onWillAddFirstListener: () => {
                const doRequest = () => {
                    this.activeRequests.add(emitter);
                    this.sendRequest(request);
                };
                if (this.state === State.Idle) {
                    doRequest();
                }
                else {
                    uninitializedPromise = createCancelablePromise((_) => this.whenInitialized());
                    uninitializedPromise.then(() => {
                        uninitializedPromise = null;
                        doRequest();
                    });
                }
            },
            onDidRemoveLastListener: () => {
                if (uninitializedPromise) {
                    uninitializedPromise.cancel();
                    uninitializedPromise = null;
                }
                else {
                    this.activeRequests.delete(emitter);
                    this.sendRequest({ id, type: 103 /* RequestType.EventDispose */ });
                }
            },
        });
        const handler = (res) => emitter.fire(res.data);
        this.handlers.set(id, handler);
        return emitter.event;
    }
    sendRequest(request) {
        switch (request.type) {
            case 100 /* RequestType.Promise */:
            case 102 /* RequestType.EventListen */: {
                const msgLength = this.send([request.type, request.id, request.channelName, request.name], request.arg);
                this.logger?.logOutgoing(msgLength, request.id, 0 /* RequestInitiator.LocalSide */, `${requestTypeToStr(request.type)}: ${request.channelName}.${request.name}`, request.arg);
                return;
            }
            case 101 /* RequestType.PromiseCancel */:
            case 103 /* RequestType.EventDispose */: {
                const msgLength = this.send([request.type, request.id]);
                this.logger?.logOutgoing(msgLength, request.id, 0 /* RequestInitiator.LocalSide */, requestTypeToStr(request.type));
                return;
            }
        }
    }
    send(header, body = undefined) {
        const writer = new BufferWriter();
        serialize(writer, header);
        serialize(writer, body);
        return this.sendBuffer(writer.buffer);
    }
    sendBuffer(message) {
        try {
            this.protocol.send(message);
            return message.byteLength;
        }
        catch (err) {
            // noop
            return 0;
        }
    }
    onBuffer(message) {
        const reader = new BufferReader(message);
        const header = deserialize(reader);
        const body = deserialize(reader);
        const type = header[0];
        switch (type) {
            case 200 /* ResponseType.Initialize */:
                this.logger?.logIncoming(message.byteLength, 0, 0 /* RequestInitiator.LocalSide */, responseTypeToStr(type));
                return this.onResponse({ type: header[0] });
            case 201 /* ResponseType.PromiseSuccess */:
            case 202 /* ResponseType.PromiseError */:
            case 204 /* ResponseType.EventFire */:
            case 203 /* ResponseType.PromiseErrorObj */:
                this.logger?.logIncoming(message.byteLength, header[1], 0 /* RequestInitiator.LocalSide */, responseTypeToStr(type), body);
                return this.onResponse({ type: header[0], id: header[1], data: body });
        }
    }
    onResponse(response) {
        if (response.type === 200 /* ResponseType.Initialize */) {
            this.state = State.Idle;
            this._onDidInitialize.fire();
            return;
        }
        const handler = this.handlers.get(response.id);
        handler?.(response);
    }
    get onDidInitializePromise() {
        return Event.toPromise(this.onDidInitialize);
    }
    whenInitialized() {
        if (this.state === State.Idle) {
            return Promise.resolve();
        }
        else {
            return this.onDidInitializePromise;
        }
    }
    dispose() {
        this.isDisposed = true;
        if (this.protocolListener) {
            this.protocolListener.dispose();
            this.protocolListener = null;
        }
        dispose(this.activeRequests.values());
        this.activeRequests.clear();
    }
}
__decorate([
    memoize
], ChannelClient.prototype, "onDidInitializePromise", null);
/**
 * An `IPCServer` is both a channel server and a routing channel
 * client.
 *
 * As the owner of a protocol, you should extend both this
 * and the `IPCClient` classes to get IPC implementations
 * for your protocol.
 */
export class IPCServer {
    get connections() {
        const result = [];
        this._connections.forEach((ctx) => result.push(ctx));
        return result;
    }
    constructor(onDidClientConnect, ipcLogger, timeoutDelay) {
        this.channels = new Map();
        this._connections = new Set();
        this._onDidAddConnection = new Emitter();
        this.onDidAddConnection = this._onDidAddConnection.event;
        this._onDidRemoveConnection = new Emitter();
        this.onDidRemoveConnection = this._onDidRemoveConnection.event;
        this.disposables = new DisposableStore();
        this.disposables.add(onDidClientConnect(({ protocol, onDidClientDisconnect }) => {
            const onFirstMessage = Event.once(protocol.onMessage);
            this.disposables.add(onFirstMessage((msg) => {
                const reader = new BufferReader(msg);
                const ctx = deserialize(reader);
                const channelServer = new ChannelServer(protocol, ctx, ipcLogger, timeoutDelay);
                const channelClient = new ChannelClient(protocol, ipcLogger);
                this.channels.forEach((channel, name) => channelServer.registerChannel(name, channel));
                const connection = { channelServer, channelClient, ctx };
                this._connections.add(connection);
                this._onDidAddConnection.fire(connection);
                this.disposables.add(onDidClientDisconnect(() => {
                    channelServer.dispose();
                    channelClient.dispose();
                    this._connections.delete(connection);
                    this._onDidRemoveConnection.fire(connection);
                }));
            }));
        }));
    }
    getChannel(channelName, routerOrClientFilter) {
        const that = this;
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return {
            call(command, arg, cancellationToken) {
                let connectionPromise;
                if (isFunction(routerOrClientFilter)) {
                    // when no router is provided, we go random client picking
                    const connection = getRandomElement(that.connections.filter(routerOrClientFilter));
                    connectionPromise = connection
                        ? // if we found a client, let's call on it
                            Promise.resolve(connection)
                        : // else, let's wait for a client to come along
                            Event.toPromise(Event.filter(that.onDidAddConnection, routerOrClientFilter));
                }
                else {
                    connectionPromise = routerOrClientFilter.routeCall(that, command, arg);
                }
                const channelPromise = connectionPromise.then((connection) => connection.channelClient.getChannel(channelName));
                return getDelayedChannel(channelPromise).call(command, arg, cancellationToken);
            },
            listen(event, arg) {
                if (isFunction(routerOrClientFilter)) {
                    return that.getMulticastEvent(channelName, routerOrClientFilter, event, arg);
                }
                const channelPromise = routerOrClientFilter
                    .routeEvent(that, event, arg)
                    .then((connection) => connection.channelClient.getChannel(channelName));
                return getDelayedChannel(channelPromise).listen(event, arg);
            },
        };
    }
    getMulticastEvent(channelName, clientFilter, eventName, arg) {
        const that = this;
        let disposables;
        // Create an emitter which hooks up to all clients
        // as soon as first listener is added. It also
        // disconnects from all clients as soon as the last listener
        // is removed.
        const emitter = new Emitter({
            onWillAddFirstListener: () => {
                disposables = new DisposableStore();
                // The event multiplexer is useful since the active
                // client list is dynamic. We need to hook up and disconnection
                // to/from clients as they come and go.
                const eventMultiplexer = new EventMultiplexer();
                const map = new Map();
                const onDidAddConnection = (connection) => {
                    const channel = connection.channelClient.getChannel(channelName);
                    const event = channel.listen(eventName, arg);
                    const disposable = eventMultiplexer.add(event);
                    map.set(connection, disposable);
                };
                const onDidRemoveConnection = (connection) => {
                    const disposable = map.get(connection);
                    if (!disposable) {
                        return;
                    }
                    disposable.dispose();
                    map.delete(connection);
                };
                that.connections.filter(clientFilter).forEach(onDidAddConnection);
                Event.filter(that.onDidAddConnection, clientFilter)(onDidAddConnection, undefined, disposables);
                that.onDidRemoveConnection(onDidRemoveConnection, undefined, disposables);
                eventMultiplexer.event(emitter.fire, emitter, disposables);
                disposables.add(eventMultiplexer);
            },
            onDidRemoveLastListener: () => {
                disposables?.dispose();
                disposables = undefined;
            },
        });
        that.disposables.add(emitter);
        return emitter.event;
    }
    registerChannel(channelName, channel) {
        this.channels.set(channelName, channel);
        for (const connection of this._connections) {
            connection.channelServer.registerChannel(channelName, channel);
        }
    }
    dispose() {
        this.disposables.dispose();
        for (const connection of this._connections) {
            connection.channelClient.dispose();
            connection.channelServer.dispose();
        }
        this._connections.clear();
        this.channels.clear();
        this._onDidAddConnection.dispose();
        this._onDidRemoveConnection.dispose();
    }
}
/**
 * An `IPCClient` is both a channel client and a channel server.
 *
 * As the owner of a protocol, you should extend both this
 * and the `IPCServer` classes to get IPC implementations
 * for your protocol.
 */
export class IPCClient {
    constructor(protocol, ctx, ipcLogger = null) {
        const writer = new BufferWriter();
        serialize(writer, ctx);
        protocol.send(writer.buffer);
        this.channelClient = new ChannelClient(protocol, ipcLogger);
        this.channelServer = new ChannelServer(protocol, ctx, ipcLogger);
    }
    getChannel(channelName) {
        return this.channelClient.getChannel(channelName);
    }
    registerChannel(channelName, channel) {
        this.channelServer.registerChannel(channelName, channel);
    }
    dispose() {
        this.channelClient.dispose();
        this.channelServer.dispose();
    }
}
export function getDelayedChannel(promise) {
    // eslint-disable-next-line local/code-no-dangerous-type-assertions
    return {
        call(command, arg, cancellationToken) {
            return promise.then((c) => c.call(command, arg, cancellationToken));
        },
        listen(event, arg) {
            const relay = new Relay();
            promise.then((c) => (relay.input = c.listen(event, arg)));
            return relay.event;
        },
    };
}
export function getNextTickChannel(channel) {
    let didTick = false;
    // eslint-disable-next-line local/code-no-dangerous-type-assertions
    return {
        call(command, arg, cancellationToken) {
            if (didTick) {
                return channel.call(command, arg, cancellationToken);
            }
            return timeout(0)
                .then(() => (didTick = true))
                .then(() => channel.call(command, arg, cancellationToken));
        },
        listen(event, arg) {
            if (didTick) {
                return channel.listen(event, arg);
            }
            const relay = new Relay();
            timeout(0)
                .then(() => (didTick = true))
                .then(() => (relay.input = channel.listen(event, arg)));
            return relay.event;
        },
    };
}
export class StaticRouter {
    constructor(fn) {
        this.fn = fn;
    }
    routeCall(hub) {
        return this.route(hub);
    }
    routeEvent(hub) {
        return this.route(hub);
    }
    async route(hub) {
        for (const connection of hub.connections) {
            if (await Promise.resolve(this.fn(connection.ctx))) {
                return Promise.resolve(connection);
            }
        }
        await Event.toPromise(hub.onDidAddConnection);
        return await this.route(hub);
    }
}
/**
 * Use ProxyChannels to automatically wrapping and unwrapping
 * services to/from IPC channels, instead of manually wrapping
 * each service method and event.
 *
 * Restrictions:
 * - If marshalling is enabled, only `URI` and `RegExp` is converted
 *   automatically for you
 * - Events must follow the naming convention `onUpperCase`
 * - `CancellationToken` is currently not supported
 * - If a context is provided, you can use `AddFirstParameterToFunctions`
 *   utility to signal this in the receiving side type
 */
export var ProxyChannel;
(function (ProxyChannel) {
    function fromService(service, disposables, options) {
        const handler = service;
        const disableMarshalling = options && options.disableMarshalling;
        // Buffer any event that should be supported by
        // iterating over all property keys and finding them
        // However, this will not work for services that
        // are lazy and use a Proxy within. For that we
        // still need to check later (see below).
        const mapEventNameToEvent = new Map();
        for (const key in handler) {
            if (propertyIsEvent(key)) {
                mapEventNameToEvent.set(key, Event.buffer(handler[key], true, undefined, disposables));
            }
        }
        return new (class {
            listen(_, event, arg) {
                const eventImpl = mapEventNameToEvent.get(event);
                if (eventImpl) {
                    return eventImpl;
                }
                const target = handler[event];
                if (typeof target === 'function') {
                    if (propertyIsDynamicEvent(event)) {
                        return target.call(handler, arg);
                    }
                    if (propertyIsEvent(event)) {
                        mapEventNameToEvent.set(event, Event.buffer(handler[event], true, undefined, disposables));
                        return mapEventNameToEvent.get(event);
                    }
                }
                throw new ErrorNoTelemetry(`Event not found: ${event}`);
            }
            call(_, command, args) {
                const target = handler[command];
                if (typeof target === 'function') {
                    // Revive unless marshalling disabled
                    if (!disableMarshalling && Array.isArray(args)) {
                        for (let i = 0; i < args.length; i++) {
                            args[i] = revive(args[i]);
                        }
                    }
                    let res = target.apply(handler, args);
                    if (!(res instanceof Promise)) {
                        res = Promise.resolve(res);
                    }
                    return res;
                }
                throw new ErrorNoTelemetry(`Method not found: ${command}`);
            }
        })();
    }
    ProxyChannel.fromService = fromService;
    function toService(channel, options) {
        const disableMarshalling = options && options.disableMarshalling;
        return new Proxy({}, {
            get(_target, propKey) {
                if (typeof propKey === 'string') {
                    // Check for predefined values
                    if (options?.properties?.has(propKey)) {
                        return options.properties.get(propKey);
                    }
                    // Dynamic Event
                    if (propertyIsDynamicEvent(propKey)) {
                        return function (arg) {
                            return channel.listen(propKey, arg);
                        };
                    }
                    // Event
                    if (propertyIsEvent(propKey)) {
                        return channel.listen(propKey);
                    }
                    // Function
                    return async function (...args) {
                        // Add context if any
                        let methodArgs;
                        if (options && !isUndefinedOrNull(options.context)) {
                            methodArgs = [options.context, ...args];
                        }
                        else {
                            methodArgs = args;
                        }
                        const result = await channel.call(propKey, methodArgs);
                        // Revive unless marshalling disabled
                        if (!disableMarshalling) {
                            return revive(result);
                        }
                        return result;
                    };
                }
                throw new ErrorNoTelemetry(`Property not found: ${String(propKey)}`);
            },
        });
    }
    ProxyChannel.toService = toService;
    function propertyIsEvent(name) {
        // Assume a property is an event if it has a form of "onSomething"
        return name[0] === 'o' && name[1] === 'n' && strings.isUpperAsciiLetter(name.charCodeAt(2));
    }
    function propertyIsDynamicEvent(name) {
        // Assume a property is a dynamic event (a method that returns an event) if it has a form of "onDynamicSomething"
        return /^onDynamic/.test(name) && strings.isUpperAsciiLetter(name.charCodeAt(9));
    }
})(ProxyChannel || (ProxyChannel = {}));
const colorTables = [
    ['#2977B1', '#FC802D', '#34A13A', '#D3282F', '#9366BA'],
    ['#8B564C', '#E177C0', '#7F7F7F', '#BBBE3D', '#2EBECD'],
];
function prettyWithoutArrays(data) {
    if (Array.isArray(data)) {
        return data;
    }
    if (data && typeof data === 'object' && typeof data.toString === 'function') {
        const result = data.toString();
        if (result !== '[object Object]') {
            return result;
        }
    }
    return data;
}
function pretty(data) {
    if (Array.isArray(data)) {
        return data.map(prettyWithoutArrays);
    }
    return prettyWithoutArrays(data);
}
function logWithColors(direction, totalLength, msgLength, req, initiator, str, data) {
    data = pretty(data);
    const colorTable = colorTables[initiator];
    const color = colorTable[req % colorTable.length];
    let args = [
        `%c[${direction}]%c[${String(totalLength).padStart(7, ' ')}]%c[len: ${String(msgLength).padStart(5, ' ')}]%c${String(req).padStart(5, ' ')} - ${str}`,
        'color: darkgreen',
        'color: grey',
        'color: grey',
        `color: ${color}`,
    ];
    if (/\($/.test(str)) {
        args = args.concat(data);
        args.push(')');
    }
    else {
        args.push(data);
    }
    console.log.apply(console, args);
}
export class IPCLogger {
    constructor(_outgoingPrefix, _incomingPrefix) {
        this._outgoingPrefix = _outgoingPrefix;
        this._incomingPrefix = _incomingPrefix;
        this._totalIncoming = 0;
        this._totalOutgoing = 0;
    }
    logOutgoing(msgLength, requestId, initiator, str, data) {
        this._totalOutgoing += msgLength;
        logWithColors(this._outgoingPrefix, this._totalOutgoing, msgLength, requestId, initiator, str, data);
    }
    logIncoming(msgLength, requestId, initiator, str, data) {
        this._totalIncoming += msgLength;
        logWithColors(this._incomingPrefix, this._totalIncoming, msgLength, requestId, initiator, str, data);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL2lwYy9jb21tb24vaXBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzVELE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsT0FBTyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3BELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNsRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkQsT0FBTyxLQUFLLE9BQU8sTUFBTSw0QkFBNEIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUE0QnhFLElBQVcsV0FLVjtBQUxELFdBQVcsV0FBVztJQUNyQixxREFBYSxDQUFBO0lBQ2IsaUVBQW1CLENBQUE7SUFDbkIsNkRBQWlCLENBQUE7SUFDakIsK0RBQWtC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