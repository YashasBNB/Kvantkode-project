/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../common/buffer.js';
import { Emitter } from '../../../common/event.js';
import { Disposable, DisposableStore } from '../../../common/lifecycle.js';
import { IPCClient } from './ipc.js';
export var SocketDiagnosticsEventType;
(function (SocketDiagnosticsEventType) {
    SocketDiagnosticsEventType["Created"] = "created";
    SocketDiagnosticsEventType["Read"] = "read";
    SocketDiagnosticsEventType["Write"] = "write";
    SocketDiagnosticsEventType["Open"] = "open";
    SocketDiagnosticsEventType["Error"] = "error";
    SocketDiagnosticsEventType["Close"] = "close";
    SocketDiagnosticsEventType["BrowserWebSocketBlobReceived"] = "browserWebSocketBlobReceived";
    SocketDiagnosticsEventType["NodeEndReceived"] = "nodeEndReceived";
    SocketDiagnosticsEventType["NodeEndSent"] = "nodeEndSent";
    SocketDiagnosticsEventType["NodeDrainBegin"] = "nodeDrainBegin";
    SocketDiagnosticsEventType["NodeDrainEnd"] = "nodeDrainEnd";
    SocketDiagnosticsEventType["zlibInflateError"] = "zlibInflateError";
    SocketDiagnosticsEventType["zlibInflateData"] = "zlibInflateData";
    SocketDiagnosticsEventType["zlibInflateInitialWrite"] = "zlibInflateInitialWrite";
    SocketDiagnosticsEventType["zlibInflateInitialFlushFired"] = "zlibInflateInitialFlushFired";
    SocketDiagnosticsEventType["zlibInflateWrite"] = "zlibInflateWrite";
    SocketDiagnosticsEventType["zlibInflateFlushFired"] = "zlibInflateFlushFired";
    SocketDiagnosticsEventType["zlibDeflateError"] = "zlibDeflateError";
    SocketDiagnosticsEventType["zlibDeflateData"] = "zlibDeflateData";
    SocketDiagnosticsEventType["zlibDeflateWrite"] = "zlibDeflateWrite";
    SocketDiagnosticsEventType["zlibDeflateFlushFired"] = "zlibDeflateFlushFired";
    SocketDiagnosticsEventType["WebSocketNodeSocketWrite"] = "webSocketNodeSocketWrite";
    SocketDiagnosticsEventType["WebSocketNodeSocketPeekedHeader"] = "webSocketNodeSocketPeekedHeader";
    SocketDiagnosticsEventType["WebSocketNodeSocketReadHeader"] = "webSocketNodeSocketReadHeader";
    SocketDiagnosticsEventType["WebSocketNodeSocketReadData"] = "webSocketNodeSocketReadData";
    SocketDiagnosticsEventType["WebSocketNodeSocketUnmaskedData"] = "webSocketNodeSocketUnmaskedData";
    SocketDiagnosticsEventType["WebSocketNodeSocketDrainBegin"] = "webSocketNodeSocketDrainBegin";
    SocketDiagnosticsEventType["WebSocketNodeSocketDrainEnd"] = "webSocketNodeSocketDrainEnd";
    SocketDiagnosticsEventType["ProtocolHeaderRead"] = "protocolHeaderRead";
    SocketDiagnosticsEventType["ProtocolMessageRead"] = "protocolMessageRead";
    SocketDiagnosticsEventType["ProtocolHeaderWrite"] = "protocolHeaderWrite";
    SocketDiagnosticsEventType["ProtocolMessageWrite"] = "protocolMessageWrite";
    SocketDiagnosticsEventType["ProtocolWrite"] = "protocolWrite";
})(SocketDiagnosticsEventType || (SocketDiagnosticsEventType = {}));
export var SocketDiagnostics;
(function (SocketDiagnostics) {
    SocketDiagnostics.enableDiagnostics = false;
    SocketDiagnostics.records = [];
    const socketIds = new WeakMap();
    let lastUsedSocketId = 0;
    function getSocketId(nativeObject, label) {
        if (!socketIds.has(nativeObject)) {
            const id = String(++lastUsedSocketId);
            socketIds.set(nativeObject, id);
        }
        return socketIds.get(nativeObject);
    }
    function traceSocketEvent(nativeObject, socketDebugLabel, type, data) {
        if (!SocketDiagnostics.enableDiagnostics) {
            return;
        }
        const id = getSocketId(nativeObject, socketDebugLabel);
        if (data instanceof VSBuffer ||
            data instanceof Uint8Array ||
            data instanceof ArrayBuffer ||
            ArrayBuffer.isView(data)) {
            const copiedData = VSBuffer.alloc(data.byteLength);
            copiedData.set(data);
            SocketDiagnostics.records.push({ timestamp: Date.now(), id, label: socketDebugLabel, type, buff: copiedData });
        }
        else {
            // data is a custom object
            SocketDiagnostics.records.push({ timestamp: Date.now(), id, label: socketDebugLabel, type, data: data });
        }
    }
    SocketDiagnostics.traceSocketEvent = traceSocketEvent;
})(SocketDiagnostics || (SocketDiagnostics = {}));
export var SocketCloseEventType;
(function (SocketCloseEventType) {
    SocketCloseEventType[SocketCloseEventType["NodeSocketCloseEvent"] = 0] = "NodeSocketCloseEvent";
    SocketCloseEventType[SocketCloseEventType["WebSocketCloseEvent"] = 1] = "WebSocketCloseEvent";
})(SocketCloseEventType || (SocketCloseEventType = {}));
let emptyBuffer = null;
function getEmptyBuffer() {
    if (!emptyBuffer) {
        emptyBuffer = VSBuffer.alloc(0);
    }
    return emptyBuffer;
}
export class ChunkStream {
    get byteLength() {
        return this._totalLength;
    }
    constructor() {
        this._chunks = [];
        this._totalLength = 0;
    }
    acceptChunk(buff) {
        this._chunks.push(buff);
        this._totalLength += buff.byteLength;
    }
    read(byteCount) {
        return this._read(byteCount, true);
    }
    peek(byteCount) {
        return this._read(byteCount, false);
    }
    _read(byteCount, advance) {
        if (byteCount === 0) {
            return getEmptyBuffer();
        }
        if (byteCount > this._totalLength) {
            throw new Error(`Cannot read so many bytes!`);
        }
        if (this._chunks[0].byteLength === byteCount) {
            // super fast path, precisely first chunk must be returned
            const result = this._chunks[0];
            if (advance) {
                this._chunks.shift();
                this._totalLength -= byteCount;
            }
            return result;
        }
        if (this._chunks[0].byteLength > byteCount) {
            // fast path, the reading is entirely within the first chunk
            const result = this._chunks[0].slice(0, byteCount);
            if (advance) {
                this._chunks[0] = this._chunks[0].slice(byteCount);
                this._totalLength -= byteCount;
            }
            return result;
        }
        const result = VSBuffer.alloc(byteCount);
        let resultOffset = 0;
        let chunkIndex = 0;
        while (byteCount > 0) {
            const chunk = this._chunks[chunkIndex];
            if (chunk.byteLength > byteCount) {
                // this chunk will survive
                const chunkPart = chunk.slice(0, byteCount);
                result.set(chunkPart, resultOffset);
                resultOffset += byteCount;
                if (advance) {
                    this._chunks[chunkIndex] = chunk.slice(byteCount);
                    this._totalLength -= byteCount;
                }
                byteCount -= byteCount;
            }
            else {
                // this chunk will be entirely read
                result.set(chunk, resultOffset);
                resultOffset += chunk.byteLength;
                if (advance) {
                    this._chunks.shift();
                    this._totalLength -= chunk.byteLength;
                }
                else {
                    chunkIndex++;
                }
                byteCount -= chunk.byteLength;
            }
        }
        return result;
    }
}
var ProtocolMessageType;
(function (ProtocolMessageType) {
    ProtocolMessageType[ProtocolMessageType["None"] = 0] = "None";
    ProtocolMessageType[ProtocolMessageType["Regular"] = 1] = "Regular";
    ProtocolMessageType[ProtocolMessageType["Control"] = 2] = "Control";
    ProtocolMessageType[ProtocolMessageType["Ack"] = 3] = "Ack";
    ProtocolMessageType[ProtocolMessageType["Disconnect"] = 5] = "Disconnect";
    ProtocolMessageType[ProtocolMessageType["ReplayRequest"] = 6] = "ReplayRequest";
    ProtocolMessageType[ProtocolMessageType["Pause"] = 7] = "Pause";
    ProtocolMessageType[ProtocolMessageType["Resume"] = 8] = "Resume";
    ProtocolMessageType[ProtocolMessageType["KeepAlive"] = 9] = "KeepAlive";
})(ProtocolMessageType || (ProtocolMessageType = {}));
function protocolMessageTypeToString(messageType) {
    switch (messageType) {
        case 0 /* ProtocolMessageType.None */:
            return 'None';
        case 1 /* ProtocolMessageType.Regular */:
            return 'Regular';
        case 2 /* ProtocolMessageType.Control */:
            return 'Control';
        case 3 /* ProtocolMessageType.Ack */:
            return 'Ack';
        case 5 /* ProtocolMessageType.Disconnect */:
            return 'Disconnect';
        case 6 /* ProtocolMessageType.ReplayRequest */:
            return 'ReplayRequest';
        case 7 /* ProtocolMessageType.Pause */:
            return 'PauseWriting';
        case 8 /* ProtocolMessageType.Resume */:
            return 'ResumeWriting';
        case 9 /* ProtocolMessageType.KeepAlive */:
            return 'KeepAlive';
    }
}
export var ProtocolConstants;
(function (ProtocolConstants) {
    ProtocolConstants[ProtocolConstants["HeaderLength"] = 13] = "HeaderLength";
    /**
     * Send an Acknowledge message at most 2 seconds later...
     */
    ProtocolConstants[ProtocolConstants["AcknowledgeTime"] = 2000] = "AcknowledgeTime";
    /**
     * If there is a sent message that has been unacknowledged for 20 seconds,
     * and we didn't see any incoming server data in the past 20 seconds,
     * then consider the connection has timed out.
     */
    ProtocolConstants[ProtocolConstants["TimeoutTime"] = 20000] = "TimeoutTime";
    /**
     * If there is no reconnection within this time-frame, consider the connection permanently closed...
     */
    ProtocolConstants[ProtocolConstants["ReconnectionGraceTime"] = 10800000] = "ReconnectionGraceTime";
    /**
     * Maximal grace time between the first and the last reconnection...
     */
    ProtocolConstants[ProtocolConstants["ReconnectionShortGraceTime"] = 300000] = "ReconnectionShortGraceTime";
    /**
     * Send a message every 5 seconds to avoid that the connection is closed by the OS.
     */
    ProtocolConstants[ProtocolConstants["KeepAliveSendTime"] = 5000] = "KeepAliveSendTime";
})(ProtocolConstants || (ProtocolConstants = {}));
class ProtocolMessage {
    constructor(type, id, ack, data) {
        this.type = type;
        this.id = id;
        this.ack = ack;
        this.data = data;
        this.writtenTime = 0;
    }
    get size() {
        return this.data.byteLength;
    }
}
class ProtocolReader extends Disposable {
    constructor(socket) {
        super();
        this._onMessage = this._register(new Emitter());
        this.onMessage = this._onMessage.event;
        this._state = {
            readHead: true,
            readLen: 13 /* ProtocolConstants.HeaderLength */,
            messageType: 0 /* ProtocolMessageType.None */,
            id: 0,
            ack: 0,
        };
        this._socket = socket;
        this._isDisposed = false;
        this._incomingData = new ChunkStream();
        this._register(this._socket.onData((data) => this.acceptChunk(data)));
        this.lastReadTime = Date.now();
    }
    acceptChunk(data) {
        if (!data || data.byteLength === 0) {
            return;
        }
        this.lastReadTime = Date.now();
        this._incomingData.acceptChunk(data);
        while (this._incomingData.byteLength >= this._state.readLen) {
            const buff = this._incomingData.read(this._state.readLen);
            if (this._state.readHead) {
                // buff is the header
                // save new state => next time will read the body
                this._state.readHead = false;
                this._state.readLen = buff.readUInt32BE(9);
                this._state.messageType = buff.readUInt8(0);
                this._state.id = buff.readUInt32BE(1);
                this._state.ack = buff.readUInt32BE(5);
                this._socket.traceSocketEvent("protocolHeaderRead" /* SocketDiagnosticsEventType.ProtocolHeaderRead */, {
                    messageType: protocolMessageTypeToString(this._state.messageType),
                    id: this._state.id,
                    ack: this._state.ack,
                    messageSize: this._state.readLen,
                });
            }
            else {
                // buff is the body
                const messageType = this._state.messageType;
                const id = this._state.id;
                const ack = this._state.ack;
                // save new state => next time will read the header
                this._state.readHead = true;
                this._state.readLen = 13 /* ProtocolConstants.HeaderLength */;
                this._state.messageType = 0 /* ProtocolMessageType.None */;
                this._state.id = 0;
                this._state.ack = 0;
                this._socket.traceSocketEvent("protocolMessageRead" /* SocketDiagnosticsEventType.ProtocolMessageRead */, buff);
                this._onMessage.fire(new ProtocolMessage(messageType, id, ack, buff));
                if (this._isDisposed) {
                    // check if an event listener lead to our disposal
                    break;
                }
            }
        }
    }
    readEntireBuffer() {
        return this._incomingData.read(this._incomingData.byteLength);
    }
    dispose() {
        this._isDisposed = true;
        super.dispose();
    }
}
class ProtocolWriter {
    constructor(socket) {
        this._writeNowTimeout = null;
        this._isDisposed = false;
        this._isPaused = false;
        this._socket = socket;
        this._data = [];
        this._totalLength = 0;
        this.lastWriteTime = 0;
    }
    dispose() {
        try {
            this.flush();
        }
        catch (err) {
            // ignore error, since the socket could be already closed
        }
        this._isDisposed = true;
    }
    drain() {
        this.flush();
        return this._socket.drain();
    }
    flush() {
        // flush
        this._writeNow();
    }
    pause() {
        this._isPaused = true;
    }
    resume() {
        this._isPaused = false;
        this._scheduleWriting();
    }
    write(msg) {
        if (this._isDisposed) {
            // ignore: there could be left-over promises which complete and then
            // decide to write a response, etc...
            return;
        }
        msg.writtenTime = Date.now();
        this.lastWriteTime = Date.now();
        const header = VSBuffer.alloc(13 /* ProtocolConstants.HeaderLength */);
        header.writeUInt8(msg.type, 0);
        header.writeUInt32BE(msg.id, 1);
        header.writeUInt32BE(msg.ack, 5);
        header.writeUInt32BE(msg.data.byteLength, 9);
        this._socket.traceSocketEvent("protocolHeaderWrite" /* SocketDiagnosticsEventType.ProtocolHeaderWrite */, {
            messageType: protocolMessageTypeToString(msg.type),
            id: msg.id,
            ack: msg.ack,
            messageSize: msg.data.byteLength,
        });
        this._socket.traceSocketEvent("protocolMessageWrite" /* SocketDiagnosticsEventType.ProtocolMessageWrite */, msg.data);
        this._writeSoon(header, msg.data);
    }
    _bufferAdd(head, body) {
        const wasEmpty = this._totalLength === 0;
        this._data.push(head, body);
        this._totalLength += head.byteLength + body.byteLength;
        return wasEmpty;
    }
    _bufferTake() {
        const ret = VSBuffer.concat(this._data, this._totalLength);
        this._data.length = 0;
        this._totalLength = 0;
        return ret;
    }
    _writeSoon(header, data) {
        if (this._bufferAdd(header, data)) {
            this._scheduleWriting();
        }
    }
    _scheduleWriting() {
        if (this._writeNowTimeout) {
            return;
        }
        this._writeNowTimeout = setTimeout(() => {
            this._writeNowTimeout = null;
            this._writeNow();
        });
    }
    _writeNow() {
        if (this._totalLength === 0) {
            return;
        }
        if (this._isPaused) {
            return;
        }
        const data = this._bufferTake();
        this._socket.traceSocketEvent("protocolWrite" /* SocketDiagnosticsEventType.ProtocolWrite */, {
            byteLength: data.byteLength,
        });
        this._socket.write(data);
    }
}
/**
 * A message has the following format:
 * ```
 *     /-------------------------------|------\
 *     |             HEADER            |      |
 *     |-------------------------------| DATA |
 *     | TYPE | ID | ACK | DATA_LENGTH |      |
 *     \-------------------------------|------/
 * ```
 * The header is 9 bytes and consists of:
 *  - TYPE is 1 byte (ProtocolMessageType) - the message type
 *  - ID is 4 bytes (u32be) - the message id (can be 0 to indicate to be ignored)
 *  - ACK is 4 bytes (u32be) - the acknowledged message id (can be 0 to indicate to be ignored)
 *  - DATA_LENGTH is 4 bytes (u32be) - the length in bytes of DATA
 *
 * Only Regular messages are counted, other messages are not counted, nor acknowledged.
 */
export class Protocol extends Disposable {
    constructor(socket) {
        super();
        this._onMessage = new Emitter();
        this.onMessage = this._onMessage.event;
        this._onDidDispose = new Emitter();
        this.onDidDispose = this._onDidDispose.event;
        this._socket = socket;
        this._socketWriter = this._register(new ProtocolWriter(this._socket));
        this._socketReader = this._register(new ProtocolReader(this._socket));
        this._register(this._socketReader.onMessage((msg) => {
            if (msg.type === 1 /* ProtocolMessageType.Regular */) {
                this._onMessage.fire(msg.data);
            }
        }));
        this._register(this._socket.onClose(() => this._onDidDispose.fire()));
    }
    drain() {
        return this._socketWriter.drain();
    }
    getSocket() {
        return this._socket;
    }
    sendDisconnect() {
        // Nothing to do...
    }
    send(buffer) {
        this._socketWriter.write(new ProtocolMessage(1 /* ProtocolMessageType.Regular */, 0, 0, buffer));
    }
}
export class Client extends IPCClient {
    static fromSocket(socket, id) {
        return new Client(new Protocol(socket), id);
    }
    get onDidDispose() {
        return this.protocol.onDidDispose;
    }
    constructor(protocol, id, ipcLogger = null) {
        super(protocol, id, ipcLogger);
        this.protocol = protocol;
    }
    dispose() {
        super.dispose();
        const socket = this.protocol.getSocket();
        // should be sent gracefully with a .flush(), but try to send it out as a
        // last resort here if nothing else:
        this.protocol.sendDisconnect();
        this.protocol.dispose();
        socket.end();
    }
}
/**
 * Will ensure no messages are lost if there are no event listeners.
 */
export class BufferedEmitter {
    constructor() {
        this._hasListeners = false;
        this._isDeliveringMessages = false;
        this._bufferedMessages = [];
        this._emitter = new Emitter({
            onWillAddFirstListener: () => {
                this._hasListeners = true;
                // it is important to deliver these messages after this call, but before
                // other messages have a chance to be received (to guarantee in order delivery)
                // that's why we're using here queueMicrotask and not other types of timeouts
                queueMicrotask(() => this._deliverMessages());
            },
            onDidRemoveLastListener: () => {
                this._hasListeners = false;
            },
        });
        this.event = this._emitter.event;
    }
    _deliverMessages() {
        if (this._isDeliveringMessages) {
            return;
        }
        this._isDeliveringMessages = true;
        while (this._hasListeners && this._bufferedMessages.length > 0) {
            this._emitter.fire(this._bufferedMessages.shift());
        }
        this._isDeliveringMessages = false;
    }
    fire(event) {
        if (this._hasListeners) {
            if (this._bufferedMessages.length > 0) {
                this._bufferedMessages.push(event);
            }
            else {
                this._emitter.fire(event);
            }
        }
        else {
            this._bufferedMessages.push(event);
        }
    }
    flushBuffer() {
        this._bufferedMessages = [];
    }
}
class QueueElement {
    constructor(data) {
        this.data = data;
        this.next = null;
    }
}
class Queue {
    constructor() {
        this._first = null;
        this._last = null;
    }
    length() {
        let result = 0;
        let current = this._first;
        while (current) {
            current = current.next;
            result++;
        }
        return result;
    }
    peek() {
        if (!this._first) {
            return null;
        }
        return this._first.data;
    }
    toArray() {
        const result = [];
        let resultLen = 0;
        let it = this._first;
        while (it) {
            result[resultLen++] = it.data;
            it = it.next;
        }
        return result;
    }
    pop() {
        if (!this._first) {
            return;
        }
        if (this._first === this._last) {
            this._first = null;
            this._last = null;
            return;
        }
        this._first = this._first.next;
    }
    push(item) {
        const element = new QueueElement(item);
        if (!this._first) {
            this._first = element;
            this._last = element;
            return;
        }
        this._last.next = element;
        this._last = element;
    }
}
class LoadEstimator {
    static { this._HISTORY_LENGTH = 10; }
    static { this._INSTANCE = null; }
    static getInstance() {
        if (!LoadEstimator._INSTANCE) {
            LoadEstimator._INSTANCE = new LoadEstimator();
        }
        return LoadEstimator._INSTANCE;
    }
    constructor() {
        this.lastRuns = [];
        const now = Date.now();
        for (let i = 0; i < LoadEstimator._HISTORY_LENGTH; i++) {
            this.lastRuns[i] = now - 1000 * i;
        }
        setInterval(() => {
            for (let i = LoadEstimator._HISTORY_LENGTH; i >= 1; i--) {
                this.lastRuns[i] = this.lastRuns[i - 1];
            }
            this.lastRuns[0] = Date.now();
        }, 1000);
    }
    /**
     * returns an estimative number, from 0 (low load) to 1 (high load)
     */
    load() {
        const now = Date.now();
        const historyLimit = (1 + LoadEstimator._HISTORY_LENGTH) * 1000;
        let score = 0;
        for (let i = 0; i < LoadEstimator._HISTORY_LENGTH; i++) {
            if (now - this.lastRuns[i] <= historyLimit) {
                score++;
            }
        }
        return 1 - score / LoadEstimator._HISTORY_LENGTH;
    }
    hasHighLoad() {
        return this.load() >= 0.5;
    }
}
/**
 * Same as Protocol, but will actually track messages and acks.
 * Moreover, it will ensure no messages are lost if there are no event listeners.
 */
export class PersistentProtocol {
    get unacknowledgedCount() {
        return this._outgoingMsgId - this._outgoingAckId;
    }
    constructor(opts) {
        this._onControlMessage = new BufferedEmitter();
        this.onControlMessage = this._onControlMessage.event;
        this._onMessage = new BufferedEmitter();
        this.onMessage = this._onMessage.event;
        this._onDidDispose = new BufferedEmitter();
        this.onDidDispose = this._onDidDispose.event;
        this._onSocketClose = new BufferedEmitter();
        this.onSocketClose = this._onSocketClose.event;
        this._onSocketTimeout = new BufferedEmitter();
        this.onSocketTimeout = this._onSocketTimeout.event;
        this._loadEstimator = opts.loadEstimator ?? LoadEstimator.getInstance();
        this._shouldSendKeepAlive = opts.sendKeepAlive ?? true;
        this._isReconnecting = false;
        this._outgoingUnackMsg = new Queue();
        this._outgoingMsgId = 0;
        this._outgoingAckId = 0;
        this._outgoingAckTimeout = null;
        this._incomingMsgId = 0;
        this._incomingAckId = 0;
        this._incomingMsgLastTime = 0;
        this._incomingAckTimeout = null;
        this._lastReplayRequestTime = 0;
        this._lastSocketTimeoutTime = Date.now();
        this._socketDisposables = new DisposableStore();
        this._socket = opts.socket;
        this._socketWriter = this._socketDisposables.add(new ProtocolWriter(this._socket));
        this._socketReader = this._socketDisposables.add(new ProtocolReader(this._socket));
        this._socketDisposables.add(this._socketReader.onMessage((msg) => this._receiveMessage(msg)));
        this._socketDisposables.add(this._socket.onClose((e) => this._onSocketClose.fire(e)));
        if (opts.initialChunk) {
            this._socketReader.acceptChunk(opts.initialChunk);
        }
        if (this._shouldSendKeepAlive) {
            this._keepAliveInterval = setInterval(() => {
                this._sendKeepAlive();
            }, 5000 /* ProtocolConstants.KeepAliveSendTime */);
        }
        else {
            this._keepAliveInterval = null;
        }
    }
    dispose() {
        if (this._outgoingAckTimeout) {
            clearTimeout(this._outgoingAckTimeout);
            this._outgoingAckTimeout = null;
        }
        if (this._incomingAckTimeout) {
            clearTimeout(this._incomingAckTimeout);
            this._incomingAckTimeout = null;
        }
        if (this._keepAliveInterval) {
            clearInterval(this._keepAliveInterval);
            this._keepAliveInterval = null;
        }
        this._socketDisposables.dispose();
    }
    drain() {
        return this._socketWriter.drain();
    }
    sendDisconnect() {
        if (!this._didSendDisconnect) {
            this._didSendDisconnect = true;
            const msg = new ProtocolMessage(5 /* ProtocolMessageType.Disconnect */, 0, 0, getEmptyBuffer());
            this._socketWriter.write(msg);
            this._socketWriter.flush();
        }
    }
    sendPause() {
        const msg = new ProtocolMessage(7 /* ProtocolMessageType.Pause */, 0, 0, getEmptyBuffer());
        this._socketWriter.write(msg);
    }
    sendResume() {
        const msg = new ProtocolMessage(8 /* ProtocolMessageType.Resume */, 0, 0, getEmptyBuffer());
        this._socketWriter.write(msg);
    }
    pauseSocketWriting() {
        this._socketWriter.pause();
    }
    getSocket() {
        return this._socket;
    }
    getMillisSinceLastIncomingData() {
        return Date.now() - this._socketReader.lastReadTime;
    }
    beginAcceptReconnection(socket, initialDataChunk) {
        this._isReconnecting = true;
        this._socketDisposables.dispose();
        this._socketDisposables = new DisposableStore();
        this._onControlMessage.flushBuffer();
        this._onSocketClose.flushBuffer();
        this._onSocketTimeout.flushBuffer();
        this._socket.dispose();
        this._lastReplayRequestTime = 0;
        this._lastSocketTimeoutTime = Date.now();
        this._socket = socket;
        this._socketWriter = this._socketDisposables.add(new ProtocolWriter(this._socket));
        this._socketReader = this._socketDisposables.add(new ProtocolReader(this._socket));
        this._socketDisposables.add(this._socketReader.onMessage((msg) => this._receiveMessage(msg)));
        this._socketDisposables.add(this._socket.onClose((e) => this._onSocketClose.fire(e)));
        this._socketReader.acceptChunk(initialDataChunk);
    }
    endAcceptReconnection() {
        this._isReconnecting = false;
        // After a reconnection, let the other party know (again) which messages have been received.
        // (perhaps the other party didn't receive a previous ACK)
        this._incomingAckId = this._incomingMsgId;
        const msg = new ProtocolMessage(3 /* ProtocolMessageType.Ack */, 0, this._incomingAckId, getEmptyBuffer());
        this._socketWriter.write(msg);
        // Send again all unacknowledged messages
        const toSend = this._outgoingUnackMsg.toArray();
        for (let i = 0, len = toSend.length; i < len; i++) {
            this._socketWriter.write(toSend[i]);
        }
        this._recvAckCheck();
    }
    acceptDisconnect() {
        this._onDidDispose.fire();
    }
    _receiveMessage(msg) {
        if (msg.ack > this._outgoingAckId) {
            this._outgoingAckId = msg.ack;
            do {
                const first = this._outgoingUnackMsg.peek();
                if (first && first.id <= msg.ack) {
                    // this message has been confirmed, remove it
                    this._outgoingUnackMsg.pop();
                }
                else {
                    break;
                }
            } while (true);
        }
        switch (msg.type) {
            case 0 /* ProtocolMessageType.None */: {
                // N/A
                break;
            }
            case 1 /* ProtocolMessageType.Regular */: {
                if (msg.id > this._incomingMsgId) {
                    if (msg.id !== this._incomingMsgId + 1) {
                        // in case we missed some messages we ask the other party to resend them
                        const now = Date.now();
                        if (now - this._lastReplayRequestTime > 10000) {
                            // send a replay request at most once every 10s
                            this._lastReplayRequestTime = now;
                            this._socketWriter.write(new ProtocolMessage(6 /* ProtocolMessageType.ReplayRequest */, 0, 0, getEmptyBuffer()));
                        }
                    }
                    else {
                        this._incomingMsgId = msg.id;
                        this._incomingMsgLastTime = Date.now();
                        this._sendAckCheck();
                        this._onMessage.fire(msg.data);
                    }
                }
                break;
            }
            case 2 /* ProtocolMessageType.Control */: {
                this._onControlMessage.fire(msg.data);
                break;
            }
            case 3 /* ProtocolMessageType.Ack */: {
                // nothing to do, .ack is handled above already
                break;
            }
            case 5 /* ProtocolMessageType.Disconnect */: {
                this._onDidDispose.fire();
                break;
            }
            case 6 /* ProtocolMessageType.ReplayRequest */: {
                // Send again all unacknowledged messages
                const toSend = this._outgoingUnackMsg.toArray();
                for (let i = 0, len = toSend.length; i < len; i++) {
                    this._socketWriter.write(toSend[i]);
                }
                this._recvAckCheck();
                break;
            }
            case 7 /* ProtocolMessageType.Pause */: {
                this._socketWriter.pause();
                break;
            }
            case 8 /* ProtocolMessageType.Resume */: {
                this._socketWriter.resume();
                break;
            }
            case 9 /* ProtocolMessageType.KeepAlive */: {
                // nothing to do
                break;
            }
        }
    }
    readEntireBuffer() {
        return this._socketReader.readEntireBuffer();
    }
    flush() {
        this._socketWriter.flush();
    }
    send(buffer) {
        const myId = ++this._outgoingMsgId;
        this._incomingAckId = this._incomingMsgId;
        const msg = new ProtocolMessage(1 /* ProtocolMessageType.Regular */, myId, this._incomingAckId, buffer);
        this._outgoingUnackMsg.push(msg);
        if (!this._isReconnecting) {
            this._socketWriter.write(msg);
            this._recvAckCheck();
        }
    }
    /**
     * Send a message which will not be part of the regular acknowledge flow.
     * Use this for early control messages which are repeated in case of reconnection.
     */
    sendControl(buffer) {
        const msg = new ProtocolMessage(2 /* ProtocolMessageType.Control */, 0, 0, buffer);
        this._socketWriter.write(msg);
    }
    _sendAckCheck() {
        if (this._incomingMsgId <= this._incomingAckId) {
            // nothink to acknowledge
            return;
        }
        if (this._incomingAckTimeout) {
            // there will be a check in the near future
            return;
        }
        const timeSinceLastIncomingMsg = Date.now() - this._incomingMsgLastTime;
        if (timeSinceLastIncomingMsg >= 2000 /* ProtocolConstants.AcknowledgeTime */) {
            // sufficient time has passed since this message has been received,
            // and no message from our side needed to be sent in the meantime,
            // so we will send a message containing only an ack.
            this._sendAck();
            return;
        }
        this._incomingAckTimeout = setTimeout(() => {
            this._incomingAckTimeout = null;
            this._sendAckCheck();
        }, 2000 /* ProtocolConstants.AcknowledgeTime */ - timeSinceLastIncomingMsg + 5);
    }
    _recvAckCheck() {
        if (this._outgoingMsgId <= this._outgoingAckId) {
            // everything has been acknowledged
            return;
        }
        if (this._outgoingAckTimeout) {
            // there will be a check in the near future
            return;
        }
        if (this._isReconnecting) {
            // do not cause a timeout during reconnection,
            // because messages will not be actually written until `endAcceptReconnection`
            return;
        }
        const oldestUnacknowledgedMsg = this._outgoingUnackMsg.peek();
        const timeSinceOldestUnacknowledgedMsg = Date.now() - oldestUnacknowledgedMsg.writtenTime;
        const timeSinceLastReceivedSomeData = Date.now() - this._socketReader.lastReadTime;
        const timeSinceLastTimeout = Date.now() - this._lastSocketTimeoutTime;
        if (timeSinceOldestUnacknowledgedMsg >= 20000 /* ProtocolConstants.TimeoutTime */ &&
            timeSinceLastReceivedSomeData >= 20000 /* ProtocolConstants.TimeoutTime */ &&
            timeSinceLastTimeout >= 20000 /* ProtocolConstants.TimeoutTime */) {
            // It's been a long time since our sent message was acknowledged
            // and a long time since we received some data
            // But this might be caused by the event loop being busy and failing to read messages
            if (!this._loadEstimator.hasHighLoad()) {
                // Trash the socket
                this._lastSocketTimeoutTime = Date.now();
                this._onSocketTimeout.fire({
                    unacknowledgedMsgCount: this._outgoingUnackMsg.length(),
                    timeSinceOldestUnacknowledgedMsg,
                    timeSinceLastReceivedSomeData,
                });
                return;
            }
        }
        const minimumTimeUntilTimeout = Math.max(20000 /* ProtocolConstants.TimeoutTime */ - timeSinceOldestUnacknowledgedMsg, 20000 /* ProtocolConstants.TimeoutTime */ - timeSinceLastReceivedSomeData, 20000 /* ProtocolConstants.TimeoutTime */ - timeSinceLastTimeout, 500);
        this._outgoingAckTimeout = setTimeout(() => {
            this._outgoingAckTimeout = null;
            this._recvAckCheck();
        }, minimumTimeUntilTimeout);
    }
    _sendAck() {
        if (this._incomingMsgId <= this._incomingAckId) {
            // nothink to acknowledge
            return;
        }
        this._incomingAckId = this._incomingMsgId;
        const msg = new ProtocolMessage(3 /* ProtocolMessageType.Ack */, 0, this._incomingAckId, getEmptyBuffer());
        this._socketWriter.write(msg);
    }
    _sendKeepAlive() {
        this._incomingAckId = this._incomingMsgId;
        const msg = new ProtocolMessage(9 /* ProtocolMessageType.KeepAlive */, 0, this._incomingAckId, getEmptyBuffer());
        this._socketWriter.write(msg);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm5ldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvaXBjL2NvbW1vbi9pcGMubmV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sMEJBQTBCLENBQUE7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN2RixPQUFPLEVBQXVDLFNBQVMsRUFBRSxNQUFNLFVBQVUsQ0FBQTtBQUV6RSxNQUFNLENBQU4sSUFBa0IsMEJBdUNqQjtBQXZDRCxXQUFrQiwwQkFBMEI7SUFDM0MsaURBQW1CLENBQUE7SUFDbkIsMkNBQWEsQ0FBQTtJQUNiLDZDQUFlLENBQUE7SUFDZiwyQ0FBYSxDQUFBO0lBQ2IsNkNBQWUsQ0FBQTtJQUNmLDZDQUFlLENBQUE7SUFFZiwyRkFBNkQsQ0FBQTtJQUU3RCxpRUFBbUMsQ0FBQTtJQUNuQyx5REFBMkIsQ0FBQTtJQUMzQiwrREFBaUMsQ0FBQTtJQUNqQywyREFBNkIsQ0FBQTtJQUU3QixtRUFBcUMsQ0FBQTtJQUNyQyxpRUFBbUMsQ0FBQTtJQUNuQyxpRkFBbUQsQ0FBQTtJQUNuRCwyRkFBNkQsQ0FBQTtJQUM3RCxtRUFBcUMsQ0FBQTtJQUNyQyw2RUFBK0MsQ0FBQTtJQUMvQyxtRUFBcUMsQ0FBQTtJQUNyQyxpRUFBbUMsQ0FBQTtJQUNuQyxtRUFBcUMsQ0FBQTtJQUNyQyw2RUFBK0MsQ0FBQTtJQUUvQyxtRkFBcUQsQ0FBQTtJQUNyRCxpR0FBbUUsQ0FBQTtJQUNuRSw2RkFBK0QsQ0FBQTtJQUMvRCx5RkFBMkQsQ0FBQTtJQUMzRCxpR0FBbUUsQ0FBQTtJQUNuRSw2RkFBK0QsQ0FBQTtJQUMvRCx5RkFBMkQs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