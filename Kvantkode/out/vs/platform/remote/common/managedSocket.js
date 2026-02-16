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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlZFNvY2tldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcmVtb3RlL2NvbW1vbi9tYW5hZ2VkU29ja2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBUyxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2hGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0UsT0FBTyxFQUdOLGlCQUFpQixHQUVqQixNQUFNLDJDQUEyQyxDQUFBO0FBRWxELE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLENBQUMsSUFBWSxFQUFFLEtBQWEsRUFBRSxVQUFrQixFQUFFLEVBQUU7SUFDdkYsZ0RBQWdEO0lBQ2hELE1BQU0sTUFBTSxHQUFHLElBQUksVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ2pDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUM3QixNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUNELE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFFakQsTUFBTSxPQUFPLEdBQUc7UUFDZixxQkFBcUIsSUFBSSxJQUFJLEtBQUssb0NBQW9DO1FBQ3RFLHFCQUFxQjtRQUNyQixvQkFBb0I7UUFDcEIsc0JB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