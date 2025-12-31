/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer, encodeBase64 } from '../../../base/common/buffer.js';
import { Emitter, PauseableEmitter } from '../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { SocketDiagnostics, } from '../../../base/parts/ipc/common/ipc.net.js';
export const makeRawSocketHeaders = (path, query, deubgLabel) => {
    // https://tools.ietf.org/html/rfc6455#section-4
    const buffer = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
        buffer[i] = Math.round(Math.random() * 256);
    }
    const nonce = encodeBase64(VSBuffer.wrap(buffer));
    const headers = [
        `GET ws://localhost${path}?${query}&skipWebSocketFrames=true HTTP/1.1`,
        `Connection: Upgrade`,
        `Upgrade: websocket`,
        `Sec-WebSocket-Key: ${nonce}`,
    ];
    return headers.join('\r\n') + '\r\n\r\n';
};
export const socketRawEndHeaderSequence = VSBuffer.fromString('\r\n\r\n');
/** Should be called immediately after making a ManagedSocket to make it ready for data flow. */
export async function connectManagedSocket(socket, path, query, debugLabel, half) {
    socket.write(VSBuffer.fromString(makeRawSocketHeaders(path, query, debugLabel)));
    const d = new DisposableStore();
    try {
        return await new Promise((resolve, reject) => {
            let dataSoFar;
            d.add(socket.onData((d_1) => {
                if (!dataSoFar) {
                    dataSoFar = d_1;
                }
                else {
                    dataSoFar = VSBuffer.concat([dataSoFar, d_1], dataSoFar.byteLength + d_1.byteLength);
                }
                const index = dataSoFar.indexOf(socketRawEndHeaderSequence);
                if (index === -1) {
                    return;
                }
                resolve(socket);
                // pause data events until the socket consumer is hooked up. We may
                // immediately emit remaining data, but if not there may still be
                // microtasks queued which would fire data into the abyss.
                socket.pauseData();
                const rest = dataSoFar.slice(index + socketRawEndHeaderSequence.byteLength);
                if (rest.byteLength) {
                    half.onData.fire(rest);
                }
            }));
            d.add(socket.onClose((err) => reject(err ?? new Error('socket closed'))));
            d.add(socket.onEnd(() => reject(new Error('socket ended'))));
        });
    }
    catch (e) {
        socket.dispose();
        throw e;
    }
    finally {
        d.dispose();
    }
}
export class ManagedSocket extends Disposable {
    constructor(debugLabel, half) {
        super();
        this.debugLabel = debugLabel;
        this.pausableDataEmitter = this._register(new PauseableEmitter());
        this.onData = (...args) => {
            if (this.pausableDataEmitter.isPaused) {
                queueMicrotask(() => this.pausableDataEmitter.resume());
            }
            return this.pausableDataEmitter.event(...args);
        };
        this.didDisposeEmitter = this._register(new Emitter());
        this.onDidDispose = this.didDisposeEmitter.event;
        this.ended = false;
        this._register(half.onData);
        this._register(half.onData.event((data) => this.pausableDataEmitter.fire(data)));
        this.onClose = this._register(half.onClose).event;
        this.onEnd = this._register(half.onEnd).event;
    }
    /** Pauses data events until a new listener comes in onData() */
    pauseData() {
        this.pausableDataEmitter.pause();
    }
    /** Flushes data to the socket. */
    drain() {
        return Promise.resolve();
    }
    /** Ends the remote socket. */
    end() {
        this.ended = true;
        this.closeRemote();
    }
    traceSocketEvent(type, data) {
        SocketDiagnostics.traceSocketEvent(this, this.debugLabel, type, data);
    }
    dispose() {
        if (!this.ended) {
            this.closeRemote();
        }
        this.didDisposeEmitter.fire();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlZFNvY2tldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3JlbW90ZS9jb21tb24vbWFuYWdlZFNvY2tldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxPQUFPLEVBQVMsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNoRixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9FLE9BQU8sRUFHTixpQkFBaUIsR0FFakIsTUFBTSwyQ0FBMkMsQ0FBQTtBQUVsRCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLElBQVksRUFBRSxLQUFhLEVBQUUsVUFBa0IsRUFBRSxFQUFFO0lBQ3ZGLGdEQUFnRDtJQUNoRCxNQUFNLE1BQU0sR0FBRyxJQUFJLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUNqQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDN0IsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFBO0lBQzVDLENBQUM7SUFDRCxNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBRWpELE1BQU0sT0FBTyxHQUFHO1FBQ2YscUJBQXFCLElBQUksSUFBSSxLQUFLLG9DQUFvQztRQUN0RSxxQkFBcUI7UUFDckIsb0JBQW9CO1FBQ3BCLHNCQUFzQixLQUFLLEVBQUU7S0FDN0IsQ0FB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