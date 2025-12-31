/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createHash } from 'crypto';
import { createServer, createConnection } from 'net';
import { tmpdir } from 'os';
import { createDeflateRaw, createInflateRaw } from 'zlib';
import { VSBuffer } from '../../../common/buffer.js';
import { onUnexpectedError } from '../../../common/errors.js';
import { Emitter, Event } from '../../../common/event.js';
import { Disposable } from '../../../common/lifecycle.js';
import { join } from '../../../common/path.js';
import { platform } from '../../../common/platform.js';
import { generateUuid } from '../../../common/uuid.js';
import { IPCServer } from '../common/ipc.js';
import { ChunkStream, Client, Protocol, SocketDiagnostics, } from '../common/ipc.net.js';
/**
 * Maximum time to wait for a 'close' event to fire after the socket stream
 * ends. For unix domain sockets, the close event may not fire consistently
 * due to what appears to be a Node.js bug.
 *
 * @see https://github.com/microsoft/vscode/issues/211462#issuecomment-2155471996
 */
const socketEndTimeoutMs = 30_000;
export class NodeSocket {
    traceSocketEvent(type, data) {
        SocketDiagnostics.traceSocketEvent(this.socket, this.debugLabel, type, data);
    }
    constructor(socket, debugLabel = '') {
        this._canWrite = true;
        this.debugLabel = debugLabel;
        this.socket = socket;
        this.traceSocketEvent("created" /* SocketDiagnosticsEventType.Created */, { type: 'NodeSocket' });
        this._errorListener = (err) => {
            this.traceSocketEvent("error" /* SocketDiagnosticsEventType.Error */, {
                code: err?.code,
                message: err?.message,
            });
            if (err) {
                if (err.code === 'EPIPE') {
                    // An EPIPE exception at the wrong time can lead to a renderer process crash
                    // so ignore the error since the socket will fire the close event soon anyways:
                    // > https://nodejs.org/api/errors.html#errors_common_system_errors
                    // > EPIPE (Broken pipe): A write on a pipe, socket, or FIFO for which there is no
                    // > process to read the data. Commonly encountered at the net and http layers,
                    // > indicative that the remote side of the stream being written to has been closed.
                    return;
                }
                onUnexpectedError(err);
            }
        };
        this.socket.on('error', this._errorListener);
        let endTimeoutHandle;
        this._closeListener = (hadError) => {
            this.traceSocketEvent("close" /* SocketDiagnosticsEventType.Close */, { hadError });
            this._canWrite = false;
            if (endTimeoutHandle) {
                clearTimeout(endTimeoutHandle);
            }
        };
        this.socket.on('close', this._closeListener);
        this._endListener = () => {
            this.traceSocketEvent("nodeEndReceived" /* SocketDiagnosticsEventType.NodeEndReceived */);
            this._canWrite = false;
            endTimeoutHandle = setTimeout(() => socket.destroy(), socketEndTimeoutMs);
        };
        this.socket.on('end', this._endListener);
    }
    dispose() {
        this.socket.off('error', this._errorListener);
        this.socket.off('close', this._closeListener);
        this.socket.off('end', this._endListener);
        this.socket.destroy();
    }
    onData(_listener) {
        const listener = (buff) => {
            this.traceSocketEvent("read" /* SocketDiagnosticsEventType.Read */, buff);
            _listener(VSBuffer.wrap(buff));
        };
        this.socket.on('data', listener);
        return {
            dispose: () => this.socket.off('data', listener),
        };
    }
    onClose(listener) {
        const adapter = (hadError) => {
            listener({
                type: 0 /* SocketCloseEventType.NodeSocketCloseEvent */,
                hadError: hadError,
                error: undefined,
            });
        };
        this.socket.on('close', adapter);
        return {
            dispose: () => this.socket.off('close', adapter),
        };
    }
    onEnd(listener) {
        const adapter = () => {
            listener();
        };
        this.socket.on('end', adapter);
        return {
            dispose: () => this.socket.off('end', adapter),
        };
    }
    write(buffer) {
        // return early if socket has been destroyed in the meantime
        if (this.socket.destroyed || !this._canWrite) {
            return;
        }
        // we ignore the returned value from `write` because we would have to cached the data
        // anyways and nodejs is already doing that for us:
        // > https://nodejs.org/api/stream.html#stream_writable_write_chunk_encoding_callback
        // > However, the false return value is only advisory and the writable stream will unconditionally
        // > accept and buffer chunk even if it has not been allowed to drain.
        try {
            this.traceSocketEvent("write" /* SocketDiagnosticsEventType.Write */, buffer);
            this.socket.write(buffer.buffer, (err) => {
                if (err) {
                    if (err.code === 'EPIPE') {
                        // An EPIPE exception at the wrong time can lead to a renderer process crash
                        // so ignore the error since the socket will fire the close event soon anyways:
                        // > https://nodejs.org/api/errors.html#errors_common_system_errors
                        // > EPIPE (Broken pipe): A write on a pipe, socket, or FIFO for which there is no
                        // > process to read the data. Commonly encountered at the net and http layers,
                        // > indicative that the remote side of the stream being written to has been closed.
                        return;
                    }
                    onUnexpectedError(err);
                }
            });
        }
        catch (err) {
            if (err.code === 'EPIPE') {
                // An EPIPE exception at the wrong time can lead to a renderer process crash
                // so ignore the error since the socket will fire the close event soon anyways:
                // > https://nodejs.org/api/errors.html#errors_common_system_errors
                // > EPIPE (Broken pipe): A write on a pipe, socket, or FIFO for which there is no
                // > process to read the data. Commonly encountered at the net and http layers,
                // > indicative that the remote side of the stream being written to has been closed.
                return;
            }
            onUnexpectedError(err);
        }
    }
    end() {
        this.traceSocketEvent("nodeEndSent" /* SocketDiagnosticsEventType.NodeEndSent */);
        this.socket.end();
    }
    drain() {
        this.traceSocketEvent("nodeDrainBegin" /* SocketDiagnosticsEventType.NodeDrainBegin */);
        return new Promise((resolve, reject) => {
            if (this.socket.bufferSize === 0) {
                this.traceSocketEvent("nodeDrainEnd" /* SocketDiagnosticsEventType.NodeDrainEnd */);
                resolve();
                return;
            }
            const finished = () => {
                this.socket.off('close', finished);
                this.socket.off('end', finished);
                this.socket.off('error', finished);
                this.socket.off('timeout', finished);
                this.socket.off('drain', finished);
                this.traceSocketEvent("nodeDrainEnd" /* SocketDiagnosticsEventType.NodeDrainEnd */);
                resolve();
            };
            this.socket.on('close', finished);
            this.socket.on('end', finished);
            this.socket.on('error', finished);
            this.socket.on('timeout', finished);
            this.socket.on('drain', finished);
        });
    }
}
var Constants;
(function (Constants) {
    Constants[Constants["MinHeaderByteSize"] = 2] = "MinHeaderByteSize";
    /**
     * If we need to write a large buffer, we will split it into 256KB chunks and
     * send each chunk as a websocket message. This is to prevent that the sending
     * side is stuck waiting for the entire buffer to be compressed before writing
     * to the underlying socket or that the receiving side is stuck waiting for the
     * entire message to be received before processing the bytes.
     */
    Constants[Constants["MaxWebSocketMessageLength"] = 262144] = "MaxWebSocketMessageLength";
})(Constants || (Constants = {}));
var ReadState;
(function (ReadState) {
    ReadState[ReadState["PeekHeader"] = 1] = "PeekHeader";
    ReadState[ReadState["ReadHeader"] = 2] = "ReadHeader";
    ReadState[ReadState["ReadBody"] = 3] = "ReadBody";
    ReadState[ReadState["Fin"] = 4] = "Fin";
})(ReadState || (ReadState = {}));
/**
 * See https://tools.ietf.org/html/rfc6455#section-5.2
 */
export class WebSocketNodeSocket extends Disposable {
    get permessageDeflate() {
        return this._flowManager.permessageDeflate;
    }
    get recordedInflateBytes() {
        return this._flowManager.recordedInflateBytes;
    }
    traceSocketEvent(type, data) {
        this.socket.traceSocketEvent(type, data);
    }
    /**
     * Create a socket which can communicate using WebSocket frames.
     *
     * **NOTE**: When using the permessage-deflate WebSocket extension, if parts of inflating was done
     *  in a different zlib instance, we need to pass all those bytes into zlib, otherwise the inflate
     *  might hit an inflated portion referencing a distance too far back.
     *
     * @param socket The underlying socket
     * @param permessageDeflate Use the permessage-deflate WebSocket extension
     * @param inflateBytes "Seed" zlib inflate with these bytes.
     * @param recordInflateBytes Record all bytes sent to inflate
     */
    constructor(socket, permessageDeflate, inflateBytes, recordInflateBytes) {
        super();
        this._onData = this._register(new Emitter());
        this._onClose = this._register(new Emitter());
        this._isEnded = false;
        this._state = {
            state: 1 /* ReadState.PeekHeader */,
            readLen: 2 /* Constants.MinHeaderByteSize */,
            fin: 0,
            compressed: false,
            firstFrameOfMessage: true,
            mask: 0,
            opcode: 0,
        };
        this.socket = socket;
        this.traceSocketEvent("created" /* SocketDiagnosticsEventType.Created */, {
            type: 'WebSocketNodeSocket',
            permessageDeflate,
            inflateBytesLength: inflateBytes?.byteLength || 0,
            recordInflateBytes,
        });
        this._flowManager = this._register(new WebSocketFlowManager(this, permessageDeflate, inflateBytes, recordInflateBytes, this._onData, (data, options) => this._write(data, options)));
        this._register(this._flowManager.onError((err) => {
            // zlib errors are fatal, since we have no idea how to recover
            console.error(err);
            onUnexpectedError(err);
            this._onClose.fire({
                type: 0 /* SocketCloseEventType.NodeSocketCloseEvent */,
                hadError: true,
                error: err,
            });
        }));
        this._incomingData = new ChunkStream();
        this._register(this.socket.onData((data) => this._acceptChunk(data)));
        this._register(this.socket.onClose(async (e) => {
            // Delay surfacing the close event until the async inflating is done
            // and all data has been emitted
            if (this._flowManager.isProcessingReadQueue()) {
                await Event.toPromise(this._flowManager.onDidFinishProcessingReadQueue);
            }
            this._onClose.fire(e);
        }));
    }
    dispose() {
        if (this._flowManager.isProcessingWriteQueue()) {
            // Wait for any outstanding writes to finish before disposing
            this._register(this._flowManager.onDidFinishProcessingWriteQueue(() => {
                this.dispose();
            }));
        }
        else {
            this.socket.dispose();
            super.dispose();
        }
    }
    onData(listener) {
        return this._onData.event(listener);
    }
    onClose(listener) {
        return this._onClose.event(listener);
    }
    onEnd(listener) {
        return this.socket.onEnd(listener);
    }
    write(buffer) {
        // If we write many logical messages (let's say 1000 messages of 100KB) during a single process tick, we do
        // this thing where we install a process.nextTick timer and group all of them together and we then issue a
        // single WebSocketNodeSocket.write with a 100MB buffer.
        //
        // The first problem is that the actual writing to the underlying node socket will only happen after all of
        // the 100MB have been deflated (due to waiting on zlib flush). The second problem is on the reading side,
        // where we will get a single WebSocketNodeSocket.onData event fired when all the 100MB have arrived,
        // delaying processing the 1000 received messages until all have arrived, instead of processing them as each
        // one arrives.
        //
        // We therefore split the buffer into chunks, and issue a write for each chunk.
        let start = 0;
        while (start < buffer.byteLength) {
            this._flowManager.writeMessage(buffer.slice(start, Math.min(start + 262144 /* Constants.MaxWebSocketMessageLength */, buffer.byteLength)), { compressed: true, opcode: 0x02 /* Binary frame */ });
            start += 262144 /* Constants.MaxWebSocketMessageLength */;
        }
    }
    _write(buffer, { compressed, opcode }) {
        if (this._isEnded) {
            // Avoid ERR_STREAM_WRITE_AFTER_END
            return;
        }
        this.traceSocketEvent("webSocketNodeSocketWrite" /* SocketDiagnosticsEventType.WebSocketNodeSocketWrite */, buffer);
        let headerLen = 2 /* Constants.MinHeaderByteSize */;
        if (buffer.byteLength < 126) {
            headerLen += 0;
        }
        else if (buffer.byteLength < 2 ** 16) {
            headerLen += 2;
        }
        else {
            headerLen += 8;
        }
        const header = VSBuffer.alloc(headerLen);
        // The RSV1 bit indicates a compressed frame
        const compressedFlag = compressed ? 0b01000000 : 0;
        const opcodeFlag = opcode & 0b00001111;
        header.writeUInt8(0b10000000 | compressedFlag | opcodeFlag, 0);
        if (buffer.byteLength < 126) {
            header.writeUInt8(buffer.byteLength, 1);
        }
        else if (buffer.byteLength < 2 ** 16) {
            header.writeUInt8(126, 1);
            let offset = 1;
            header.writeUInt8((buffer.byteLength >>> 8) & 0b11111111, ++offset);
            header.writeUInt8((buffer.byteLength >>> 0) & 0b11111111, ++offset);
        }
        else {
            header.writeUInt8(127, 1);
            let offset = 1;
            header.writeUInt8(0, ++offset);
            header.writeUInt8(0, ++offset);
            header.writeUInt8(0, ++offset);
            header.writeUInt8(0, ++offset);
            header.writeUInt8((buffer.byteLength >>> 24) & 0b11111111, ++offset);
            header.writeUInt8((buffer.byteLength >>> 16) & 0b11111111, ++offset);
            header.writeUInt8((buffer.byteLength >>> 8) & 0b11111111, ++offset);
            header.writeUInt8((buffer.byteLength >>> 0) & 0b11111111, ++offset);
        }
        this.socket.write(VSBuffer.concat([header, buffer]));
    }
    end() {
        this._isEnded = true;
        this.socket.end();
    }
    _acceptChunk(data) {
        if (data.byteLength === 0) {
            return;
        }
        this._incomingData.acceptChunk(data);
        while (this._incomingData.byteLength >= this._state.readLen) {
            if (this._state.state === 1 /* ReadState.PeekHeader */) {
                // peek to see if we can read the entire header
                const peekHeader = this._incomingData.peek(this._state.readLen);
                const firstByte = peekHeader.readUInt8(0);
                const finBit = (firstByte & 0b10000000) >>> 7;
                const rsv1Bit = (firstByte & 0b01000000) >>> 6;
                const opcode = firstByte & 0b00001111;
                const secondByte = peekHeader.readUInt8(1);
                const hasMask = (secondByte & 0b10000000) >>> 7;
                const len = secondByte & 0b01111111;
                this._state.state = 2 /* ReadState.ReadHeader */;
                this._state.readLen =
                    2 /* Constants.MinHeaderByteSize */ +
                        (hasMask ? 4 : 0) +
                        (len === 126 ? 2 : 0) +
                        (len === 127 ? 8 : 0);
                this._state.fin = finBit;
                if (this._state.firstFrameOfMessage) {
                    // if the frame is compressed, the RSV1 bit is set only for the first frame of the message
                    this._state.compressed = Boolean(rsv1Bit);
                }
                this._state.firstFrameOfMessage = Boolean(finBit);
                this._state.mask = 0;
                this._state.opcode = opcode;
                this.traceSocketEvent("webSocketNodeSocketPeekedHeader" /* SocketDiagnosticsEventType.WebSocketNodeSocketPeekedHeader */, {
                    headerSize: this._state.readLen,
                    compressed: this._state.compressed,
                    fin: this._state.fin,
                    opcode: this._state.opcode,
                });
            }
            else if (this._state.state === 2 /* ReadState.ReadHeader */) {
                // read entire header
                const header = this._incomingData.read(this._state.readLen);
                const secondByte = header.readUInt8(1);
                const hasMask = (secondByte & 0b10000000) >>> 7;
                let len = secondByte & 0b01111111;
                let offset = 1;
                if (len === 126) {
                    len = header.readUInt8(++offset) * 2 ** 8 + header.readUInt8(++offset);
                }
                else if (len === 127) {
                    len =
                        header.readUInt8(++offset) * 0 +
                            header.readUInt8(++offset) * 0 +
                            header.readUInt8(++offset) * 0 +
                            header.readUInt8(++offset) * 0 +
                            header.readUInt8(++offset) * 2 ** 24 +
                            header.readUInt8(++offset) * 2 ** 16 +
                            header.readUInt8(++offset) * 2 ** 8 +
                            header.readUInt8(++offset);
                }
                let mask = 0;
                if (hasMask) {
                    mask =
                        header.readUInt8(++offset) * 2 ** 24 +
                            header.readUInt8(++offset) * 2 ** 16 +
                            header.readUInt8(++offset) * 2 ** 8 +
                            header.readUInt8(++offset);
                }
                this._state.state = 3 /* ReadState.ReadBody */;
                this._state.readLen = len;
                this._state.mask = mask;
                this.traceSocketEvent("webSocketNodeSocketPeekedHeader" /* SocketDiagnosticsEventType.WebSocketNodeSocketPeekedHeader */, {
                    bodySize: this._state.readLen,
                    compressed: this._state.compressed,
                    fin: this._state.fin,
                    mask: this._state.mask,
                    opcode: this._state.opcode,
                });
            }
            else if (this._state.state === 3 /* ReadState.ReadBody */) {
                // read body
                const body = this._incomingData.read(this._state.readLen);
                this.traceSocketEvent("webSocketNodeSocketReadData" /* SocketDiagnosticsEventType.WebSocketNodeSocketReadData */, body);
                unmask(body, this._state.mask);
                this.traceSocketEvent("webSocketNodeSocketUnmaskedData" /* SocketDiagnosticsEventType.WebSocketNodeSocketUnmaskedData */, body);
                this._state.state = 1 /* ReadState.PeekHeader */;
                this._state.readLen = 2 /* Constants.MinHeaderByteSize */;
                this._state.mask = 0;
                if (this._state.opcode <= 0x02 /* Continuation frame or Text frame or binary frame */) {
                    this._flowManager.acceptFrame(body, this._state.compressed, !!this._state.fin);
                }
                else if (this._state.opcode === 0x09 /* Ping frame */) {
                    // Ping frames could be send by some browsers e.g. Firefox
                    this._flowManager.writeMessage(body, { compressed: false, opcode: 0x0a /* Pong frame */ });
                }
            }
        }
    }
    async drain() {
        this.traceSocketEvent("webSocketNodeSocketDrainBegin" /* SocketDiagnosticsEventType.WebSocketNodeSocketDrainBegin */);
        if (this._flowManager.isProcessingWriteQueue()) {
            await Event.toPromise(this._flowManager.onDidFinishProcessingWriteQueue);
        }
        await this.socket.drain();
        this.traceSocketEvent("webSocketNodeSocketDrainEnd" /* SocketDiagnosticsEventType.WebSocketNodeSocketDrainEnd */);
    }
}
class WebSocketFlowManager extends Disposable {
    get permessageDeflate() {
        return Boolean(this._zlibInflateStream && this._zlibDeflateStream);
    }
    get recordedInflateBytes() {
        if (this._zlibInflateStream) {
            return this._zlibInflateStream.recordedInflateBytes;
        }
        return VSBuffer.alloc(0);
    }
    constructor(_tracer, permessageDeflate, inflateBytes, recordInflateBytes, _onData, _writeFn) {
        super();
        this._tracer = _tracer;
        this._onData = _onData;
        this._writeFn = _writeFn;
        this._onError = this._register(new Emitter());
        this.onError = this._onError.event;
        this._writeQueue = [];
        this._readQueue = [];
        this._onDidFinishProcessingReadQueue = this._register(new Emitter());
        this.onDidFinishProcessingReadQueue = this._onDidFinishProcessingReadQueue.event;
        this._onDidFinishProcessingWriteQueue = this._register(new Emitter());
        this.onDidFinishProcessingWriteQueue = this._onDidFinishProcessingWriteQueue.event;
        this._isProcessingWriteQueue = false;
        this._isProcessingReadQueue = false;
        if (permessageDeflate) {
            // See https://tools.ietf.org/html/rfc7692#page-16
            // To simplify our logic, we don't negotiate the window size
            // and simply dedicate (2^15) / 32kb per web socket
            this._zlibInflateStream = this._register(new ZlibInflateStream(this._tracer, recordInflateBytes, inflateBytes, { windowBits: 15 }));
            this._zlibDeflateStream = this._register(new ZlibDeflateStream(this._tracer, { windowBits: 15 }));
            this._register(this._zlibInflateStream.onError((err) => this._onError.fire(err)));
            this._register(this._zlibDeflateStream.onError((err) => this._onError.fire(err)));
        }
        else {
            this._zlibInflateStream = null;
            this._zlibDeflateStream = null;
        }
    }
    writeMessage(data, options) {
        this._writeQueue.push({ data, options });
        this._processWriteQueue();
    }
    async _processWriteQueue() {
        if (this._isProcessingWriteQueue) {
            return;
        }
        this._isProcessingWriteQueue = true;
        while (this._writeQueue.length > 0) {
            const { data, options } = this._writeQueue.shift();
            if (this._zlibDeflateStream && options.compressed) {
                const compressedData = await this._deflateMessage(this._zlibDeflateStream, data);
                this._writeFn(compressedData, options);
            }
            else {
                this._writeFn(data, { ...options, compressed: false });
            }
        }
        this._isProcessingWriteQueue = false;
        this._onDidFinishProcessingWriteQueue.fire();
    }
    isProcessingWriteQueue() {
        return this._isProcessingWriteQueue;
    }
    /**
     * Subsequent calls should wait for the previous `_deflateBuffer` call to complete.
     */
    _deflateMessage(zlibDeflateStream, buffer) {
        return new Promise((resolve, reject) => {
            zlibDeflateStream.write(buffer);
            zlibDeflateStream.flush((data) => resolve(data));
        });
    }
    acceptFrame(data, isCompressed, isLastFrameOfMessage) {
        this._readQueue.push({ data, isCompressed, isLastFrameOfMessage });
        this._processReadQueue();
    }
    async _processReadQueue() {
        if (this._isProcessingReadQueue) {
            return;
        }
        this._isProcessingReadQueue = true;
        while (this._readQueue.length > 0) {
            const frameInfo = this._readQueue.shift();
            if (this._zlibInflateStream && frameInfo.isCompressed) {
                // See https://datatracker.ietf.org/doc/html/rfc7692#section-9.2
                // Even if permessageDeflate is negotiated, it is possible
                // that the other side might decide to send uncompressed messages
                // So only decompress messages that have the RSV 1 bit set
                const data = await this._inflateFrame(this._zlibInflateStream, frameInfo.data, frameInfo.isLastFrameOfMessage);
                this._onData.fire(data);
            }
            else {
                this._onData.fire(frameInfo.data);
            }
        }
        this._isProcessingReadQueue = false;
        this._onDidFinishProcessingReadQueue.fire();
    }
    isProcessingReadQueue() {
        return this._isProcessingReadQueue;
    }
    /**
     * Subsequent calls should wait for the previous `transformRead` call to complete.
     */
    _inflateFrame(zlibInflateStream, buffer, isLastFrameOfMessage) {
        return new Promise((resolve, reject) => {
            // See https://tools.ietf.org/html/rfc7692#section-7.2.2
            zlibInflateStream.write(buffer);
            if (isLastFrameOfMessage) {
                zlibInflateStream.write(VSBuffer.fromByteArray([0x00, 0x00, 0xff, 0xff]));
            }
            zlibInflateStream.flush((data) => resolve(data));
        });
    }
}
class ZlibInflateStream extends Disposable {
    get recordedInflateBytes() {
        if (this._recordInflateBytes) {
            return VSBuffer.concat(this._recordedInflateBytes);
        }
        return VSBuffer.alloc(0);
    }
    constructor(_tracer, _recordInflateBytes, inflateBytes, options) {
        super();
        this._tracer = _tracer;
        this._recordInflateBytes = _recordInflateBytes;
        this._onError = this._register(new Emitter());
        this.onError = this._onError.event;
        this._recordedInflateBytes = [];
        this._pendingInflateData = [];
        this._zlibInflate = createInflateRaw(options);
        this._zlibInflate.on('error', (err) => {
            this._tracer.traceSocketEvent("zlibInflateError" /* SocketDiagnosticsEventType.zlibInflateError */, {
                message: err?.message,
                code: err?.code,
            });
            this._onError.fire(err);
        });
        this._zlibInflate.on('data', (data) => {
            this._tracer.traceSocketEvent("zlibInflateData" /* SocketDiagnosticsEventType.zlibInflateData */, data);
            this._pendingInflateData.push(VSBuffer.wrap(data));
        });
        if (inflateBytes) {
            this._tracer.traceSocketEvent("zlibInflateInitialWrite" /* SocketDiagnosticsEventType.zlibInflateInitialWrite */, inflateBytes.buffer);
            this._zlibInflate.write(inflateBytes.buffer);
            this._zlibInflate.flush(() => {
                this._tracer.traceSocketEvent("zlibInflateInitialFlushFired" /* SocketDiagnosticsEventType.zlibInflateInitialFlushFired */);
                this._pendingInflateData.length = 0;
            });
        }
    }
    write(buffer) {
        if (this._recordInflateBytes) {
            this._recordedInflateBytes.push(buffer.clone());
        }
        this._tracer.traceSocketEvent("zlibInflateWrite" /* SocketDiagnosticsEventType.zlibInflateWrite */, buffer);
        this._zlibInflate.write(buffer.buffer);
    }
    flush(callback) {
        this._zlibInflate.flush(() => {
            this._tracer.traceSocketEvent("zlibInflateFlushFired" /* SocketDiagnosticsEventType.zlibInflateFlushFired */);
            const data = VSBuffer.concat(this._pendingInflateData);
            this._pendingInflateData.length = 0;
            callback(data);
        });
    }
}
class ZlibDeflateStream extends Disposable {
    constructor(_tracer, options) {
        super();
        this._tracer = _tracer;
        this._onError = this._register(new Emitter());
        this.onError = this._onError.event;
        this._pendingDeflateData = [];
        this._zlibDeflate = createDeflateRaw({
            windowBits: 15,
        });
        this._zlibDeflate.on('error', (err) => {
            this._tracer.traceSocketEvent("zlibDeflateError" /* SocketDiagnosticsEventType.zlibDeflateError */, {
                message: err?.message,
                code: err?.code,
            });
            this._onError.fire(err);
        });
        this._zlibDeflate.on('data', (data) => {
            this._tracer.traceSocketEvent("zlibDeflateData" /* SocketDiagnosticsEventType.zlibDeflateData */, data);
            this._pendingDeflateData.push(VSBuffer.wrap(data));
        });
    }
    write(buffer) {
        this._tracer.traceSocketEvent("zlibDeflateWrite" /* SocketDiagnosticsEventType.zlibDeflateWrite */, buffer.buffer);
        this._zlibDeflate.write(buffer.buffer);
    }
    flush(callback) {
        // See https://zlib.net/manual.html#Constants
        this._zlibDeflate.flush(/*Z_SYNC_FLUSH*/ 2, () => {
            this._tracer.traceSocketEvent("zlibDeflateFlushFired" /* SocketDiagnosticsEventType.zlibDeflateFlushFired */);
            let data = VSBuffer.concat(this._pendingDeflateData);
            this._pendingDeflateData.length = 0;
            // See https://tools.ietf.org/html/rfc7692#section-7.2.1
            data = data.slice(0, data.byteLength - 4);
            callback(data);
        });
    }
}
function unmask(buffer, mask) {
    if (mask === 0) {
        return;
    }
    const cnt = buffer.byteLength >>> 2;
    for (let i = 0; i < cnt; i++) {
        const v = buffer.readUInt32BE(i * 4);
        buffer.writeUInt32BE(v ^ mask, i * 4);
    }
    const offset = cnt * 4;
    const bytesLeft = buffer.byteLength - offset;
    const m3 = (mask >>> 24) & 0b11111111;
    const m2 = (mask >>> 16) & 0b11111111;
    const m1 = (mask >>> 8) & 0b11111111;
    if (bytesLeft >= 1) {
        buffer.writeUInt8(buffer.readUInt8(offset) ^ m3, offset);
    }
    if (bytesLeft >= 2) {
        buffer.writeUInt8(buffer.readUInt8(offset + 1) ^ m2, offset + 1);
    }
    if (bytesLeft >= 3) {
        buffer.writeUInt8(buffer.readUInt8(offset + 2) ^ m1, offset + 2);
    }
}
// Read this before there's any chance it is overwritten
// Related to https://github.com/microsoft/vscode/issues/30624
export const XDG_RUNTIME_DIR = process.env['XDG_RUNTIME_DIR'];
const safeIpcPathLengths = {
    [2 /* Platform.Linux */]: 107,
    [1 /* Platform.Mac */]: 103,
};
export function createRandomIPCHandle() {
    const randomSuffix = generateUuid();
    // Windows: use named pipe
    if (process.platform === 'win32') {
        return `\\\\.\\pipe\\vscode-ipc-${randomSuffix}-sock`;
    }
    // Mac & Unix: Use socket file
    // Unix: Prefer XDG_RUNTIME_DIR over user data path
    const basePath = process.platform !== 'darwin' && XDG_RUNTIME_DIR ? XDG_RUNTIME_DIR : tmpdir();
    const result = join(basePath, `vscode-ipc-${randomSuffix}.sock`);
    // Validate length
    validateIPCHandleLength(result);
    return result;
}
export function createStaticIPCHandle(directoryPath, type, version) {
    const scope = createHash('sha256').update(directoryPath).digest('hex');
    const scopeForSocket = scope.substr(0, 8);
    // Windows: use named pipe
    if (process.platform === 'win32') {
        return `\\\\.\\pipe\\${scopeForSocket}-${version}-${type}-sock`;
    }
    // Mac & Unix: Use socket file
    // Unix: Prefer XDG_RUNTIME_DIR over user data path, unless portable
    // Trim the version and type values for the socket to prevent too large
    // file names causing issues: https://unix.stackexchange.com/q/367008
    const versionForSocket = version.substr(0, 4);
    const typeForSocket = type.substr(0, 6);
    let result;
    if (process.platform !== 'darwin' && XDG_RUNTIME_DIR && !process.env['VSCODE_PORTABLE']) {
        result = join(XDG_RUNTIME_DIR, `vscode-${scopeForSocket}-${versionForSocket}-${typeForSocket}.sock`);
    }
    else {
        result = join(directoryPath, `${versionForSocket}-${typeForSocket}.sock`);
    }
    // Validate length
    validateIPCHandleLength(result);
    return result;
}
function validateIPCHandleLength(handle) {
    const limit = safeIpcPathLengths[platform];
    if (typeof limit === 'number' && handle.length >= limit) {
        // https://nodejs.org/api/net.html#net_identifying_paths_for_ipc_connections
        console.warn(`WARNING: IPC handle "${handle}" is longer than ${limit} chars, try a shorter --user-data-dir`);
    }
}
export class Server extends IPCServer {
    static toClientConnectionEvent(server) {
        const onConnection = Event.fromNodeEventEmitter(server, 'connection');
        return Event.map(onConnection, (socket) => ({
            protocol: new Protocol(new NodeSocket(socket, 'ipc-server-connection')),
            onDidClientDisconnect: Event.once(Event.fromNodeEventEmitter(socket, 'close')),
        }));
    }
    constructor(server) {
        super(Server.toClientConnectionEvent(server));
        this.server = server;
    }
    dispose() {
        super.dispose();
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}
export function serve(hook) {
    return new Promise((c, e) => {
        const server = createServer();
        server.on('error', e);
        server.listen(hook, () => {
            server.removeListener('error', e);
            c(new Server(server));
        });
    });
}
export function connect(hook, clientId) {
    return new Promise((c, e) => {
        const socket = createConnection(hook, () => {
            socket.removeListener('error', e);
            c(Client.fromSocket(new NodeSocket(socket, `ipc-client${clientId}`), clientId));
        });
        socket.once('error', e);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm5ldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvaXBjL25vZGUvaXBjLm5ldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQ25DLE9BQU8sRUFBK0IsWUFBWSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sS0FBSyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDM0IsT0FBTyxFQUFFLGdCQUFnQixFQUF1QyxnQkFBZ0IsRUFBRSxNQUFNLE1BQU0sQ0FBQTtBQUM5RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDcEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sOEJBQThCLENBQUE7QUFDdEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzlDLE9BQU8sRUFBWSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDdEQsT0FBTyxFQUF5QixTQUFTLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sV0FBVyxFQUNYLE1BQU0sRUFFTixRQUFRLEVBR1IsaUJBQWlCLEdBRWpCLE1BQU0sc0JBQXNCLENBQUE7QUFFN0I7Ozs7OztHQU1HO0FBQ0gsTUFBTSxrQkFBa0IsR0FBRyxNQUFNLENBQUE7QUFFakMsTUFBTSxPQUFPLFVBQVU7SUFRZixnQkFBZ0IsQ0FDdEIsSUFBZ0MsRUFDaEMsSUFBa0U7UUFFbEUsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUM3RSxDQUFDO0lBRUQsWUFBWSxNQUFjLEVBQUUsYUFBcUIsRUFBRTtRQVQzQyxjQUFTLEdBQUcsSUFBSSxDQUFBO1FBVXZCLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFBO1FBQzVCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO1FBQ3BCLElBQUksQ0FBQyxnQkFBZ0IscURBQXFDLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUE7UUFDakYsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLEdBQVEsRUFBRSxFQUFFO1lBQ2xDLElBQUksQ0FBQyxnQkFBZ0IsaURBQW1DO2dCQUN2RCxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUk7Z0JBQ2YsT0FBTyxFQUFFLEdBQUcsRUFBRSxPQUFPO2FBQ3JCLENBQUMsQ0FBQTtZQUNGLElBQUksR0FBRyxFQUFFLENBQUM7Z0JBQ1QsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDO29CQUMxQiw0RUFBNEU7b0JBQzVFLCtFQUErRTtvQkFDL0UsbUVBQW1FO29CQUNuRSxrRkFBa0Y7b0JBQ2xGLCtFQUErRTtvQkFDL0Usb0ZBQW9GO29CQUNwRixPQUFNO2dCQUNQLENBQUM7Z0JBQ0QsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDdkIsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUE7UUFFNUMsSUFBSSxnQkFBNEMsQ0FBQTtRQUNoRCxJQUFJLENBQUMsY0FBYyxHQUFHLENBQUMsUUFBaUIsRUFBRSxFQUFFO1lBQzNDLElBQUksQ0FBQyxnQkFBZ0IsaURBQW1DLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQTtZQUNyRSxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQTtZQUN0QixJQUFJLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3RCLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1lBQy9CLENBQUM7UUFDRixDQUFDLENBQUE7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBRTVDLElBQUksQ0FBQyxZQUFZLEdBQUcsR0FBRyxFQUFFO1lBQ3hCLElBQUksQ0FBQyxnQkFBZ0Isb0VBQTRDLENBQUE7WUFDakUsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUE7WUFDdEIsZ0JBQWdCLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBQzFFLENBQUMsQ0FBQTtRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDekMsQ0FBQztJQUVNLE9BQU87UUFDYixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQzdDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDN0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUN6QyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3RCLENBQUM7SUFFTSxNQUFNLENBQUMsU0FBZ0M7UUFDN0MsTUFBTSxRQUFRLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRTtZQUNqQyxJQUFJLENBQUMsZ0JBQWdCLCtDQUFrQyxJQUFJLENBQUMsQ0FBQTtZQUM1RCxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQy9CLENBQUMsQ0FBQTtRQUNELElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNoQyxPQUFPO1lBQ04sT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUM7U0FDaEQsQ0FBQTtJQUNGLENBQUM7SUFFTSxPQUFPLENBQUMsUUFBdUM7UUFDckQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxRQUFpQixFQUFFLEVBQUU7WUFDckMsUUFBUSxDQUFDO2dCQUNSLElBQUksbURBQTJDO2dCQUMvQyxRQUFRLEVBQUUsUUFBUTtnQkFDbEIsS0FBSyxFQUFFLFNBQVM7YUFDaEIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFBO1FBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ2hDLE9BQU87WUFDTixPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQztTQUNoRCxDQUFBO0lBQ0YsQ0FBQztJQUVNLEtBQUssQ0FBQyxRQUFvQjtRQUNoQyxNQUFNLE9BQU8sR0FBRyxHQUFHLEVBQUU7WUFDcEIsUUFBUSxFQUFFLENBQUE7UUFDWCxDQUFDLENBQUE7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDOUIsT0FBTztZQUNOLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDO1NBQzlDLENBQUE7SUFDRixDQUFDO0lBRU0sS0FBSyxDQUFDLE1BQWdCO1FBQzVCLDREQUE0RDtRQUM1RCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzlDLE9BQU07UUFDUCxDQUFDO1FBRUQscUZBQXFGO1FBQ3JGLG1EQUFtRDtRQUNuRCxxRkFBcUY7UUFDckYsa0dBQWtHO1FBQ2xHLHNFQUFzRTtRQUN0RSxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsZ0JBQWdCLGlEQUFtQyxNQUFNLENBQUMsQ0FBQTtZQUMvRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBUSxFQUFFLEVBQUU7Z0JBQzdDLElBQUksR0FBRyxFQUFFLENBQUM7b0JBQ1QsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDO3dCQUMxQiw0RUFBNEU7d0JBQzVFLCtFQUErRTt3QkFDL0UsbUVBQW1FO3dCQUNuRSxrRkFBa0Y7d0JBQ2xGLCtFQUErRTt3QkFDL0Usb0ZBQW9GO3dCQUNwRixPQUFNO29CQUNQLENBQUM7b0JBQ0QsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ3ZCLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDO2dCQUMxQiw0RUFBNEU7Z0JBQzVFLCtFQUErRTtnQkFDL0UsbUVBQW1FO2dCQUNuRSxrRkFBa0Y7Z0JBQ2xGLCtFQUErRTtnQkFDL0Usb0ZBQW9GO2dCQUNwRixPQUFNO1lBQ1AsQ0FBQztZQUNELGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3ZCLENBQUM7SUFDRixDQUFDO0lBRU0sR0FBRztRQUNULElBQUksQ0FBQyxnQkFBZ0IsNERBQXdDLENBQUE7UUFDN0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQTtJQUNsQixDQUFDO0lBRU0sS0FBSztRQUNYLElBQUksQ0FBQyxnQkFBZ0Isa0VBQTJDLENBQUE7UUFDaEUsT0FBTyxJQUFJLE9BQU8sQ0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUM1QyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNsQyxJQUFJLENBQUMsZ0JBQWdCLDhEQUF5QyxDQUFBO2dCQUM5RCxPQUFPLEVBQUUsQ0FBQTtnQkFDVCxPQUFNO1lBQ1AsQ0FBQztZQUNELE1BQU0sUUFBUSxHQUFHLEdBQUcsRUFBRTtnQkFDckIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFBO2dCQUNsQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7Z0JBQ2hDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQTtnQkFDbEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFBO2dCQUNwQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUE7Z0JBQ2xDLElBQUksQ0FBQyxnQkFBZ0IsOERBQXlDLENBQUE7Z0JBQzlELE9BQU8sRUFBRSxDQUFBO1lBQ1YsQ0FBQyxDQUFBO1lBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQ2pDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUMvQixJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDakMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQ25DLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNsQyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRDtBQUVELElBQVcsU0FVVjtBQVZELFdBQVcsU0FBUztJQUNuQixtRUFBcUIsQ0FBQTtJQUNyQjs7Ozs7O09BTUc7SUFDSCx3RkFBc0MsQ0FBQTtBQUN2QyxDQUFDLEVBVlUsU0FBUyxLQUFULFNBQVMsUUFVbkI7QUFFRCxJQUFXLFNBS1Y7QUFMRCxXQUFXLFNBQVM7SUFDbkIscURBQWMsQ0FBQTtJQUNkLHFEQUFjLENBQUE7SUFDZCxpREFBWSxDQUFBO0lBQ1osdUNBQU8sQ0FBQTtBQUNSLENBQUMsRUFMVSxTQUFTLEtBQVQsU0FBUyxRQUtuQjtBQWNEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLG1CQUFvQixTQUFRLFVBQVU7SUFrQmxELElBQVcsaUJBQWlCO1FBQzNCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsSUFBVyxvQkFBb0I7UUFDOUIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLG9CQUFvQixDQUFBO0lBQzlDLENBQUM7SUFFTSxnQkFBZ0IsQ0FDdEIsSUFBZ0MsRUFDaEMsSUFBa0U7UUFFbEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDekMsQ0FBQztJQUVEOzs7Ozs7Ozs7OztPQVdHO0lBQ0gsWUFDQyxNQUFrQixFQUNsQixpQkFBMEIsRUFDMUIsWUFBNkIsRUFDN0Isa0JBQTJCO1FBRTNCLEtBQUssRUFBRSxDQUFBO1FBL0NTLFlBQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFZLENBQUMsQ0FBQTtRQUNqRCxhQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBb0IsQ0FBQyxDQUFBO1FBQ25FLGFBQVEsR0FBWSxLQUFLLENBQUE7UUFFaEIsV0FBTSxHQUFHO1lBQ3pCLEtBQUssOEJBQXNCO1lBQzNCLE9BQU8scUNBQTZCO1lBQ3BDLEdBQUcsRUFBRSxDQUFDO1lBQ04sVUFBVSxFQUFFLEtBQUs7WUFDakIsbUJBQW1CLEVBQUUsSUFBSTtZQUN6QixJQUFJLEVBQUUsQ0FBQztZQUNQLE1BQU0sRUFBRSxDQUFDO1NBQ1QsQ0FBQTtRQW9DQSxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtRQUNwQixJQUFJLENBQUMsZ0JBQWdCLHFEQUFxQztZQUN6RCxJQUFJLEVBQUUscUJBQXFCO1lBQzNCLGlCQUFpQjtZQUNqQixrQkFBa0IsRUFBRSxZQUFZLEVBQUUsVUFBVSxJQUFJLENBQUM7WUFDakQsa0JBQWtCO1NBQ2xCLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDakMsSUFBSSxvQkFBb0IsQ0FDdkIsSUFBSSxFQUNKLGlCQUFpQixFQUNqQixZQUFZLEVBQ1osa0JBQWtCLEVBQ2xCLElBQUksQ0FBQyxPQUFPLEVBQ1osQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FDN0MsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ2pDLDhEQUE4RDtZQUM5RCxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2xCLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3RCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO2dCQUNsQixJQUFJLG1EQUEyQztnQkFDL0MsUUFBUSxFQUFFLElBQUk7Z0JBQ2QsS0FBSyxFQUFFLEdBQUc7YUFDVixDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFBO1FBQ3RDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JFLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQy9CLG9FQUFvRTtZQUNwRSxnQ0FBZ0M7WUFDaEMsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLHFCQUFxQixFQUFFLEVBQUUsQ0FBQztnQkFDL0MsTUFBTSxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsOEJBQThCLENBQUMsQ0FBQTtZQUN4RSxDQUFDO1lBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdEIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFZSxPQUFPO1FBQ3RCLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxzQkFBc0IsRUFBRSxFQUFFLENBQUM7WUFDaEQsNkRBQTZEO1lBQzdELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFlBQVksQ0FBQywrQkFBK0IsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3RELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNmLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDckIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2hCLENBQUM7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLFFBQStCO1FBQzVDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVNLE9BQU8sQ0FBQyxRQUF1QztRQUNyRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFTSxLQUFLLENBQUMsUUFBb0I7UUFDaEMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRU0sS0FBSyxDQUFDLE1BQWdCO1FBQzVCLDJHQUEyRztRQUMzRywwR0FBMEc7UUFDMUcsd0RBQXdEO1FBQ3hELEVBQUU7UUFDRiwyR0FBMkc7UUFDM0csMEdBQTBHO1FBQzFHLHFHQUFxRztRQUNyRyw0R0FBNEc7UUFDNUcsZUFBZTtRQUNmLEVBQUU7UUFDRiwrRUFBK0U7UUFFL0UsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFBO1FBQ2IsT0FBTyxLQUFLLEdBQUcsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2xDLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUM3QixNQUFNLENBQUMsS0FBSyxDQUNYLEtBQUssRUFDTCxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssbURBQXNDLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUN4RSxFQUNELEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQ3JELENBQUE7WUFDRCxLQUFLLG9EQUF1QyxDQUFBO1FBQzdDLENBQUM7SUFDRixDQUFDO0lBRU8sTUFBTSxDQUFDLE1BQWdCLEVBQUUsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFnQjtRQUNwRSxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuQixtQ0FBbUM7WUFDbkMsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsZ0JBQWdCLHVGQUFzRCxNQUFNLENBQUMsQ0FBQTtRQUNsRixJQUFJLFNBQVMsc0NBQThCLENBQUE7UUFDM0MsSUFBSSxNQUFNLENBQUMsVUFBVSxHQUFHLEdBQUcsRUFBRSxDQUFDO1lBQzdCLFNBQVMsSUFBSSxDQUFDLENBQUE7UUFDZixDQUFDO2FBQU0sSUFBSSxNQUFNLENBQUMsVUFBVSxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUN4QyxTQUFTLElBQUksQ0FBQyxDQUFBO1FBQ2YsQ0FBQzthQUFNLENBQUM7WUFDUCxTQUFTLElBQUksQ0FBQyxDQUFBO1FBQ2YsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFeEMsNENBQTRDO1FBQzVDLE1BQU0sY0FBYyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEQsTUFBTSxVQUFVLEdBQUcsTUFBTSxHQUFHLFVBQVUsQ0FBQTtRQUN0QyxNQUFNLENBQUMsVUFBVSxDQUFDLFVBQVUsR0FBRyxjQUFjLEdBQUcsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlELElBQUksTUFBTSxDQUFDLFVBQVUsR0FBRyxHQUFHLEVBQUUsQ0FBQztZQUM3QixNQUFNLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsQ0FBQzthQUFNLElBQUksTUFBTSxDQUFDLFVBQVUsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7WUFDeEMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDekIsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFBO1lBQ2QsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEtBQUssQ0FBQyxDQUFDLEdBQUcsVUFBVSxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDbkUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEtBQUssQ0FBQyxDQUFDLEdBQUcsVUFBVSxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDcEUsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN6QixJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUE7WUFDZCxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQzlCLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDOUIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUM5QixNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQzlCLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxLQUFLLEVBQUUsQ0FBQyxHQUFHLFVBQVUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3BFLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxLQUFLLEVBQUUsQ0FBQyxHQUFHLFVBQVUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3BFLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxLQUFLLENBQUMsQ0FBQyxHQUFHLFVBQVUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ25FLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxLQUFLLENBQUMsQ0FBQyxHQUFHLFVBQVUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3BFLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNyRCxDQUFDO0lBRU0sR0FBRztRQUNULElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFBO1FBQ3BCLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUE7SUFDbEIsQ0FBQztJQUVPLFlBQVksQ0FBQyxJQUFjO1FBQ2xDLElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMzQixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXBDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM3RCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxpQ0FBeUIsRUFBRSxDQUFDO2dCQUNoRCwrQ0FBK0M7Z0JBQy9DLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7Z0JBQy9ELE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ3pDLE1BQU0sTUFBTSxHQUFHLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDN0MsTUFBTSxPQUFPLEdBQUcsQ0FBQyxTQUFTLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUM5QyxNQUFNLE1BQU0sR0FBRyxTQUFTLEdBQUcsVUFBVSxDQUFBO2dCQUVyQyxNQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLE9BQU8sR0FBRyxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQy9DLE1BQU0sR0FBRyxHQUFHLFVBQVUsR0FBRyxVQUFVLENBQUE7Z0JBRW5DLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSywrQkFBdUIsQ0FBQTtnQkFDeEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPO29CQUNsQjt3QkFDQSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ2pCLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3JCLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDdEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFBO2dCQUN4QixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztvQkFDckMsMEZBQTBGO29CQUMxRixJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7Z0JBQzFDLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ2pELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtnQkFDcEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO2dCQUUzQixJQUFJLENBQUMsZ0JBQWdCLHFHQUE2RDtvQkFDakYsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTztvQkFDL0IsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVTtvQkFDbEMsR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRztvQkFDcEIsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTTtpQkFDMUIsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztpQkFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxpQ0FBeUIsRUFBRSxDQUFDO2dCQUN2RCxxQkFBcUI7Z0JBQ3JCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7Z0JBQzNELE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ3RDLE1BQU0sT0FBTyxHQUFHLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDL0MsSUFBSSxHQUFHLEdBQUcsVUFBVSxHQUFHLFVBQVUsQ0FBQTtnQkFFakMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFBO2dCQUNkLElBQUksR0FBRyxLQUFLLEdBQUcsRUFBRSxDQUFDO29CQUNqQixHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO2dCQUN2RSxDQUFDO3FCQUFNLElBQUksR0FBRyxLQUFLLEdBQUcsRUFBRSxDQUFDO29CQUN4QixHQUFHO3dCQUNGLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDOzRCQUM5QixNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQzs0QkFDOUIsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUM7NEJBQzlCLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDOzRCQUM5QixNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUU7NEJBQ3BDLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTs0QkFDcEMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDOzRCQUNuQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7Z0JBQzVCLENBQUM7Z0JBRUQsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFBO2dCQUNaLElBQUksT0FBTyxFQUFFLENBQUM7b0JBQ2IsSUFBSTt3QkFDSCxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUU7NEJBQ3BDLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTs0QkFDcEMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDOzRCQUNuQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7Z0JBQzVCLENBQUM7Z0JBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLDZCQUFxQixDQUFBO2dCQUN0QyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUE7Z0JBQ3pCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtnQkFFdkIsSUFBSSxDQUFDLGdCQUFnQixxR0FBNkQ7b0JBQ2pGLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU87b0JBQzdCLFVBQVUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVU7b0JBQ2xDLEdBQUcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUc7b0JBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUk7b0JBQ3RCLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU07aUJBQzFCLENBQUMsQ0FBQTtZQUNILENBQUM7aUJBQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssK0JBQXVCLEVBQUUsQ0FBQztnQkFDckQsWUFBWTtnQkFFWixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUN6RCxJQUFJLENBQUMsZ0JBQWdCLDZGQUF5RCxJQUFJLENBQUMsQ0FBQTtnQkFFbkYsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUM5QixJQUFJLENBQUMsZ0JBQWdCLHFHQUE2RCxJQUFJLENBQUMsQ0FBQTtnQkFFdkYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLCtCQUF1QixDQUFBO2dCQUN4QyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sc0NBQThCLENBQUE7Z0JBQ2pELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtnQkFFcEIsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsc0RBQXNELEVBQUUsQ0FBQztvQkFDdkYsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUMvRSxDQUFDO3FCQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7b0JBQ3pELDBEQUEwRDtvQkFDMUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQTtnQkFDM0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVNLEtBQUssQ0FBQyxLQUFLO1FBQ2pCLElBQUksQ0FBQyxnQkFBZ0IsZ0dBQTBELENBQUE7UUFDL0UsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLHNCQUFzQixFQUFFLEVBQUUsQ0FBQztZQUNoRCxNQUFNLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO1FBQ3pFLENBQUM7UUFDRCxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDekIsSUFBSSxDQUFDLGdCQUFnQiw0RkFBd0QsQ0FBQTtJQUM5RSxDQUFDO0NBQ0Q7QUFFRCxNQUFNLG9CQUFxQixTQUFRLFVBQVU7SUFtQjVDLElBQVcsaUJBQWlCO1FBQzNCLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtJQUNuRSxDQUFDO0lBRUQsSUFBVyxvQkFBb0I7UUFDOUIsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUM3QixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxvQkFBb0IsQ0FBQTtRQUNwRCxDQUFDO1FBQ0QsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3pCLENBQUM7SUFFRCxZQUNrQixPQUFzQixFQUN2QyxpQkFBMEIsRUFDMUIsWUFBNkIsRUFDN0Isa0JBQTJCLEVBQ1YsT0FBMEIsRUFDMUIsUUFBeUQ7UUFFMUUsS0FBSyxFQUFFLENBQUE7UUFQVSxZQUFPLEdBQVAsT0FBTyxDQUFlO1FBSXRCLFlBQU8sR0FBUCxPQUFPLENBQW1CO1FBQzFCLGFBQVEsR0FBUixRQUFRLENBQWlEO1FBbkMxRCxhQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUyxDQUFDLENBQUE7UUFDaEQsWUFBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFBO1FBSTVCLGdCQUFXLEdBQWdELEVBQUUsQ0FBQTtRQUM3RCxlQUFVLEdBSXJCLEVBQUUsQ0FBQTtRQUVTLG9DQUErQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ3RFLG1DQUE4QixHQUFHLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxLQUFLLENBQUE7UUFFMUUscUNBQWdDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDdkUsb0NBQStCLEdBQUcsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLEtBQUssQ0FBQTtRQTZDckYsNEJBQXVCLEdBQUcsS0FBSyxDQUFBO1FBeUMvQiwyQkFBc0IsR0FBRyxLQUFLLENBQUE7UUFoRXJDLElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUN2QixrREFBa0Q7WUFDbEQsNERBQTREO1lBQzVELG1EQUFtRDtZQUNuRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDdkMsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFlBQVksRUFBRSxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUN6RixDQUFBO1lBQ0QsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3ZDLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUN2RCxDQUFBO1lBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDakYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEYsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFBO1lBQzlCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUE7UUFDL0IsQ0FBQztJQUNGLENBQUM7SUFFTSxZQUFZLENBQUMsSUFBYyxFQUFFLE9BQXFCO1FBQ3hELElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUE7UUFDeEMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUE7SUFDMUIsQ0FBQztJQUdPLEtBQUssQ0FBQyxrQkFBa0I7UUFDL0IsSUFBSSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNsQyxPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLENBQUE7UUFDbkMsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxNQUFNLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFHLENBQUE7WUFDbkQsSUFBSSxJQUFJLENBQUMsa0JBQWtCLElBQUksT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNuRCxNQUFNLGNBQWMsR0FBRyxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxDQUFBO2dCQUNoRixJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUN2QyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxHQUFHLE9BQU8sRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUN2RCxDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyx1QkFBdUIsR0FBRyxLQUFLLENBQUE7UUFDcEMsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLElBQUksRUFBRSxDQUFBO0lBQzdDLENBQUM7SUFFTSxzQkFBc0I7UUFDNUIsT0FBTyxJQUFJLENBQUMsdUJBQXVCLENBQUE7SUFDcEMsQ0FBQztJQUVEOztPQUVHO0lBQ0ssZUFBZSxDQUN0QixpQkFBb0MsRUFDcEMsTUFBZ0I7UUFFaEIsT0FBTyxJQUFJLE9BQU8sQ0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUNoRCxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDL0IsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNqRCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTSxXQUFXLENBQUMsSUFBYyxFQUFFLFlBQXFCLEVBQUUsb0JBQTZCO1FBQ3RGLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxvQkFBb0IsRUFBRSxDQUFDLENBQUE7UUFDbEUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDekIsQ0FBQztJQUdPLEtBQUssQ0FBQyxpQkFBaUI7UUFDOUIsSUFBSSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUNqQyxPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUE7UUFDbEMsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRyxDQUFBO1lBQzFDLElBQUksSUFBSSxDQUFDLGtCQUFrQixJQUFJLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDdkQsZ0VBQWdFO2dCQUNoRSwwREFBMEQ7Z0JBQzFELGlFQUFpRTtnQkFDakUsMERBQTBEO2dCQUMxRCxNQUFNLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQ3BDLElBQUksQ0FBQyxrQkFBa0IsRUFDdkIsU0FBUyxDQUFDLElBQUksRUFDZCxTQUFTLENBQUMsb0JBQW9CLENBQzlCLENBQUE7Z0JBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDeEIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNsQyxDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxLQUFLLENBQUE7UUFDbkMsSUFBSSxDQUFDLCtCQUErQixDQUFDLElBQUksRUFBRSxDQUFBO0lBQzVDLENBQUM7SUFFTSxxQkFBcUI7UUFDM0IsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUE7SUFDbkMsQ0FBQztJQUVEOztPQUVHO0lBQ0ssYUFBYSxDQUNwQixpQkFBb0MsRUFDcEMsTUFBZ0IsRUFDaEIsb0JBQTZCO1FBRTdCLE9BQU8sSUFBSSxPQUFPLENBQVcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDaEQsd0RBQXdEO1lBQ3hELGlCQUFpQixDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUMvQixJQUFJLG9CQUFvQixFQUFFLENBQUM7Z0JBQzFCLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzFFLENBQUM7WUFDRCxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ2pELENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNEO0FBRUQsTUFBTSxpQkFBa0IsU0FBUSxVQUFVO0lBUXpDLElBQVcsb0JBQW9CO1FBQzlCLElBQUksSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDOUIsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQ25ELENBQUM7UUFDRCxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDekIsQ0FBQztJQUVELFlBQ2tCLE9BQXNCLEVBQ3RCLG1CQUE0QixFQUM3QyxZQUE2QixFQUM3QixPQUFvQjtRQUVwQixLQUFLLEVBQUUsQ0FBQTtRQUxVLFlBQU8sR0FBUCxPQUFPLENBQWU7UUFDdEIsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFTO1FBaEI3QixhQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUyxDQUFDLENBQUE7UUFDaEQsWUFBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFBO1FBRzVCLDBCQUFxQixHQUFlLEVBQUUsQ0FBQTtRQUN0Qyx3QkFBbUIsR0FBZSxFQUFFLENBQUE7UUFnQnBELElBQUksQ0FBQyxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDN0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDckMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsdUVBQThDO2dCQUMxRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE9BQU87Z0JBQ3JCLElBQUksRUFBUSxHQUFJLEVBQUUsSUFBSTthQUN0QixDQUFDLENBQUE7WUFDRixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN4QixDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQVksRUFBRSxFQUFFO1lBQzdDLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLHFFQUE2QyxJQUFJLENBQUMsQ0FBQTtZQUMvRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNuRCxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksWUFBWSxFQUFFLENBQUM7WUFDbEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IscUZBRTVCLFlBQVksQ0FBQyxNQUFNLENBQ25CLENBQUE7WUFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDNUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFO2dCQUM1QixJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQiw4RkFBeUQsQ0FBQTtnQkFDdEYsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7WUFDcEMsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUVNLEtBQUssQ0FBQyxNQUFnQjtRQUM1QixJQUFJLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDaEQsQ0FBQztRQUNELElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLHVFQUE4QyxNQUFNLENBQUMsQ0FBQTtRQUNsRixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVNLEtBQUssQ0FBQyxRQUFrQztRQUM5QyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUU7WUFDNUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsZ0ZBQWtELENBQUE7WUFDL0UsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtZQUN0RCxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtZQUNuQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDZixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRDtBQUVELE1BQU0saUJBQWtCLFNBQVEsVUFBVTtJQU96QyxZQUNrQixPQUFzQixFQUN2QyxPQUFvQjtRQUVwQixLQUFLLEVBQUUsQ0FBQTtRQUhVLFlBQU8sR0FBUCxPQUFPLENBQWU7UUFQdkIsYUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVMsQ0FBQyxDQUFBO1FBQ2hELFlBQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQTtRQUc1Qix3QkFBbUIsR0FBZSxFQUFFLENBQUE7UUFRcEQsSUFBSSxDQUFDLFlBQVksR0FBRyxnQkFBZ0IsQ0FBQztZQUNwQyxVQUFVLEVBQUUsRUFBRTtTQUNkLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ3JDLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLHVFQUE4QztnQkFDMUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxPQUFPO2dCQUNyQixJQUFJLEVBQVEsR0FBSSxFQUFFLElBQUk7YUFDdEIsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDeEIsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBRTtZQUM3QyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixxRUFBNkMsSUFBSSxDQUFDLENBQUE7WUFDL0UsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDbkQsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU0sS0FBSyxDQUFDLE1BQWdCO1FBQzVCLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLHVFQUE4QyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDekYsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQVMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFFTSxLQUFLLENBQUMsUUFBa0M7UUFDOUMsNkNBQTZDO1FBQzdDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUU7WUFDaEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsZ0ZBQWtELENBQUE7WUFFL0UsSUFBSSxJQUFJLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtZQUNwRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtZQUVuQyx3REFBd0Q7WUFDeEQsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFFekMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxTQUFTLE1BQU0sQ0FBQyxNQUFnQixFQUFFLElBQVk7SUFDN0MsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDaEIsT0FBTTtJQUNQLENBQUM7SUFDRCxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsVUFBVSxLQUFLLENBQUMsQ0FBQTtJQUNuQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDOUIsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0lBQ0QsTUFBTSxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQTtJQUN0QixNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQTtJQUM1QyxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsR0FBRyxVQUFVLENBQUE7SUFDckMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLEdBQUcsVUFBVSxDQUFBO0lBQ3JDLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQTtJQUNwQyxJQUFJLFNBQVMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNwQixNQUFNLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ3pELENBQUM7SUFDRCxJQUFJLFNBQVMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNwQixNQUFNLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDakUsQ0FBQztJQUNELElBQUksU0FBUyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3BCLE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNqRSxDQUFDO0FBQ0YsQ0FBQztBQUVELHdEQUF3RDtBQUN4RCw4REFBOEQ7QUFDOUQsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUF1QixPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7QUFFakYsTUFBTSxrQkFBa0IsR0FBbUM7SUFDMUQsd0JBQWdCLEVBQUUsR0FBRztJQUNyQixzQkFBYyxFQUFFLEdBQUc7Q0FDbkIsQ0FBQTtBQUVELE1BQU0sVUFBVSxxQkFBcUI7SUFDcEMsTUFBTSxZQUFZLEdBQUcsWUFBWSxFQUFFLENBQUE7SUFFbkMsMEJBQTBCO0lBQzFCLElBQUksT0FBTyxDQUFDLFFBQVEsS0FBSyxPQUFPLEVBQUUsQ0FBQztRQUNsQyxPQUFPLDJCQUEyQixZQUFZLE9BQU8sQ0FBQTtJQUN0RCxDQUFDO0lBRUQsOEJBQThCO0lBQzlCLG1EQUFtRDtJQUNuRCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxLQUFLLFFBQVEsSUFBSSxlQUFlLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDOUYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxjQUFjLFlBQVksT0FBTyxDQUFDLENBQUE7SUFFaEUsa0JBQWtCO0lBQ2xCLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBRS9CLE9BQU8sTUFBTSxDQUFBO0FBQ2QsQ0FBQztBQUVELE1BQU0sVUFBVSxxQkFBcUIsQ0FDcEMsYUFBcUIsRUFDckIsSUFBWSxFQUNaLE9BQWU7SUFFZixNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN0RSxNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUV6QywwQkFBMEI7SUFDMUIsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sRUFBRSxDQUFDO1FBQ2xDLE9BQU8sZ0JBQWdCLGNBQWMsSUFBSSxPQUFPLElBQUksSUFBSSxPQUFPLENBQUE7SUFDaEUsQ0FBQztJQUVELDhCQUE4QjtJQUM5QixvRUFBb0U7SUFDcEUsdUVBQXVFO0lBQ3ZFLHFFQUFxRTtJQUVyRSxNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzdDLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBRXZDLElBQUksTUFBYyxDQUFBO0lBQ2xCLElBQUksT0FBTyxDQUFDLFFBQVEsS0FBSyxRQUFRLElBQUksZUFBZSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7UUFDekYsTUFBTSxHQUFHLElBQUksQ0FDWixlQUFlLEVBQ2YsVUFBVSxjQUFjLElBQUksZ0JBQWdCLElBQUksYUFBYSxPQUFPLENBQ3BFLENBQUE7SUFDRixDQUFDO1NBQU0sQ0FBQztRQUNQLE1BQU0sR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsZ0JBQWdCLElBQUksYUFBYSxPQUFPLENBQUMsQ0FBQTtJQUMxRSxDQUFDO0lBRUQsa0JBQWtCO0lBQ2xCLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBRS9CLE9BQU8sTUFBTSxDQUFBO0FBQ2QsQ0FBQztBQUVELFNBQVMsdUJBQXVCLENBQUMsTUFBYztJQUM5QyxNQUFNLEtBQUssR0FBRyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUMxQyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ3pELDRFQUE0RTtRQUM1RSxPQUFPLENBQUMsSUFBSSxDQUNYLHdCQUF3QixNQUFNLG9CQUFvQixLQUFLLHVDQUF1QyxDQUM5RixDQUFBO0lBQ0YsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLE9BQU8sTUFBTyxTQUFRLFNBQVM7SUFDNUIsTUFBTSxDQUFDLHVCQUF1QixDQUFDLE1BQWlCO1FBQ3ZELE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxvQkFBb0IsQ0FBUyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFFN0UsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztZQUMzQyxRQUFRLEVBQUUsSUFBSSxRQUFRLENBQUMsSUFBSSxVQUFVLENBQUMsTUFBTSxFQUFFLHVCQUF1QixDQUFDLENBQUM7WUFDdkUscUJBQXFCLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQU8sTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQ3BGLENBQUMsQ0FBQyxDQUFBO0lBQ0osQ0FBQztJQUlELFlBQVksTUFBaUI7UUFDNUIsS0FBSyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQzdDLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO0lBQ3JCLENBQUM7SUFFUSxPQUFPO1FBQ2YsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2YsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUNuQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQTtRQUNuQixDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBSUQsTUFBTSxVQUFVLEtBQUssQ0FBQyxJQUFTO0lBQzlCLE9BQU8sSUFBSSxPQUFPLENBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDbkMsTUFBTSxNQUFNLEdBQUcsWUFBWSxFQUFFLENBQUE7UUFFN0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFO1lBQ3hCLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2pDLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ3RCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDO0FBS0QsTUFBTSxVQUFVLE9BQU8sQ0FBQyxJQUFTLEVBQUUsUUFBZ0I7SUFDbEQsT0FBTyxJQUFJLE9BQU8sQ0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUNuQyxNQUFNLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFO1lBQzFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2pDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksVUFBVSxDQUFDLE1BQU0sRUFBRSxhQUFhLFFBQVEsRUFBRSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUNoRixDQUFDLENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3hCLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyJ9