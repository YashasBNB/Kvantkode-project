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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9pcGMvY29tbW9uL2lwYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUM1RCxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE9BQU8sRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM1RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZELE9BQU8sS0FBSyxPQUFPLE1BQU0sNEJBQTRCLENBQUE7QUFDckQsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBNEJ4RSxJQUFXLFdBS1Y7QUFMRCxXQUFXLFdBQVc7SUFDckIscURBQWEsQ0FBQTtJQUNiLGlFQUFtQixDQUFBO0lBQ25CLDZEQUFpQixDQUFBO0lBQ2pCLCtEQUFrQixDQUFB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