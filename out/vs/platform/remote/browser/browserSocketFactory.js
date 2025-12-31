/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../base/browser/dom.js';
import { RunOnceScheduler } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { SocketDiagnostics, } from '../../../base/parts/ipc/common/ipc.net.js';
import { RemoteAuthorityResolverError, RemoteAuthorityResolverErrorCode, } from '../common/remoteAuthorityResolver.js';
import { mainWindow } from '../../../base/browser/window.js';
class BrowserWebSocket extends Disposable {
    traceSocketEvent(type, data) {
        SocketDiagnostics.traceSocketEvent(this._socket, this._debugLabel, type, data);
    }
    constructor(url, debugLabel) {
        super();
        this._onData = new Emitter();
        this.onData = this._onData.event;
        this._onOpen = this._register(new Emitter());
        this.onOpen = this._onOpen.event;
        this._onClose = this._register(new Emitter());
        this.onClose = this._onClose.event;
        this._onError = this._register(new Emitter());
        this.onError = this._onError.event;
        this._debugLabel = debugLabel;
        this._socket = new WebSocket(url);
        this.traceSocketEvent("created" /* SocketDiagnosticsEventType.Created */, { type: 'BrowserWebSocket', url });
        this._fileReader = new FileReader();
        this._queue = [];
        this._isReading = false;
        this._isClosed = false;
        this._fileReader.onload = (event) => {
            this._isReading = false;
            const buff = event.target.result;
            this.traceSocketEvent("read" /* SocketDiagnosticsEventType.Read */, buff);
            this._onData.fire(buff);
            if (this._queue.length > 0) {
                enqueue(this._queue.shift());
            }
        };
        const enqueue = (blob) => {
            if (this._isReading) {
                this._queue.push(blob);
                return;
            }
            this._isReading = true;
            this._fileReader.readAsArrayBuffer(blob);
        };
        this._socketMessageListener = (ev) => {
            const blob = ev.data;
            this.traceSocketEvent("browserWebSocketBlobReceived" /* SocketDiagnosticsEventType.BrowserWebSocketBlobReceived */, {
                type: blob.type,
                size: blob.size,
            });
            enqueue(blob);
        };
        this._socket.addEventListener('message', this._socketMessageListener);
        this._register(dom.addDisposableListener(this._socket, 'open', (e) => {
            this.traceSocketEvent("open" /* SocketDiagnosticsEventType.Open */);
            this._onOpen.fire();
        }));
        // WebSockets emit error events that do not contain any real information
        // Our only chance of getting to the root cause of an error is to
        // listen to the close event which gives out some real information:
        // - https://www.w3.org/TR/websockets/#closeevent
        // - https://tools.ietf.org/html/rfc6455#section-11.7
        //
        // But the error event is emitted before the close event, so we therefore
        // delay the error event processing in the hope of receiving a close event
        // with more information
        let pendingErrorEvent = null;
        const sendPendingErrorNow = () => {
            const err = pendingErrorEvent;
            pendingErrorEvent = null;
            this._onError.fire(err);
        };
        const errorRunner = this._register(new RunOnceScheduler(sendPendingErrorNow, 0));
        const sendErrorSoon = (err) => {
            errorRunner.cancel();
            pendingErrorEvent = err;
            errorRunner.schedule();
        };
        const sendErrorNow = (err) => {
            errorRunner.cancel();
            pendingErrorEvent = err;
            sendPendingErrorNow();
        };
        this._register(dom.addDisposableListener(this._socket, 'close', (e) => {
            this.traceSocketEvent("close" /* SocketDiagnosticsEventType.Close */, {
                code: e.code,
                reason: e.reason,
                wasClean: e.wasClean,
            });
            this._isClosed = true;
            if (pendingErrorEvent) {
                if (!navigator.onLine) {
                    // The browser is offline => this is a temporary error which might resolve itself
                    sendErrorNow(new RemoteAuthorityResolverError('Browser is offline', RemoteAuthorityResolverErrorCode.TemporarilyNotAvailable, e));
                }
                else {
                    // An error event is pending
                    // The browser appears to be online...
                    if (!e.wasClean) {
                        // Let's be optimistic and hope that perhaps the server could not be reached or something
                        sendErrorNow(new RemoteAuthorityResolverError(e.reason || `WebSocket close with status code ${e.code}`, RemoteAuthorityResolverErrorCode.TemporarilyNotAvailable, e));
                    }
                    else {
                        // this was a clean close => send existing error
                        errorRunner.cancel();
                        sendPendingErrorNow();
                    }
                }
            }
            this._onClose.fire({ code: e.code, reason: e.reason, wasClean: e.wasClean, event: e });
        }));
        this._register(dom.addDisposableListener(this._socket, 'error', (err) => {
            this.traceSocketEvent("error" /* SocketDiagnosticsEventType.Error */, { message: err?.message });
            sendErrorSoon(err);
        }));
    }
    send(data) {
        if (this._isClosed) {
            // Refuse to write data to closed WebSocket...
            return;
        }
        this.traceSocketEvent("write" /* SocketDiagnosticsEventType.Write */, data);
        this._socket.send(data);
    }
    close() {
        this._isClosed = true;
        this.traceSocketEvent("close" /* SocketDiagnosticsEventType.Close */);
        this._socket.close();
        this._socket.removeEventListener('message', this._socketMessageListener);
        this.dispose();
    }
}
const defaultWebSocketFactory = new (class {
    create(url, debugLabel) {
        return new BrowserWebSocket(url, debugLabel);
    }
})();
class BrowserSocket {
    traceSocketEvent(type, data) {
        if (typeof this.socket.traceSocketEvent === 'function') {
            this.socket.traceSocketEvent(type, data);
        }
        else {
            SocketDiagnostics.traceSocketEvent(this.socket, this.debugLabel, type, data);
        }
    }
    constructor(socket, debugLabel) {
        this.socket = socket;
        this.debugLabel = debugLabel;
    }
    dispose() {
        this.socket.close();
    }
    onData(listener) {
        return this.socket.onData((data) => listener(VSBuffer.wrap(new Uint8Array(data))));
    }
    onClose(listener) {
        const adapter = (e) => {
            if (typeof e === 'undefined') {
                listener(e);
            }
            else {
                listener({
                    type: 1 /* SocketCloseEventType.WebSocketCloseEvent */,
                    code: e.code,
                    reason: e.reason,
                    wasClean: e.wasClean,
                    event: e.event,
                });
            }
        };
        return this.socket.onClose(adapter);
    }
    onEnd(listener) {
        return Disposable.None;
    }
    write(buffer) {
        this.socket.send(buffer.buffer);
    }
    end() {
        this.socket.close();
    }
    drain() {
        return Promise.resolve();
    }
}
export class BrowserSocketFactory {
    constructor(webSocketFactory) {
        this._webSocketFactory = webSocketFactory || defaultWebSocketFactory;
    }
    supports(connectTo) {
        return true;
    }
    connect({ host, port }, path, query, debugLabel) {
        return new Promise((resolve, reject) => {
            const webSocketSchema = /^https:/.test(mainWindow.location.href) ? 'wss' : 'ws';
            const socket = this._webSocketFactory.create(`${webSocketSchema}://${/:/.test(host) && !/\[/.test(host) ? `[${host}]` : host}:${port}${path}?${query}&skipWebSocketFrames=false`, debugLabel);
            const errorListener = socket.onError(reject);
            socket.onOpen(() => {
                errorListener.dispose();
                resolve(new BrowserSocket(socket, debugLabel));
            });
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3NlclNvY2tldEZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZW1vdGUvYnJvd3Nlci9icm93c2VyU29ja2V0RmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNFLE9BQU8sRUFJTixpQkFBaUIsR0FFakIsTUFBTSwyQ0FBMkMsQ0FBQTtBQUVsRCxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLGdDQUFnQyxHQUdoQyxNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQXVDNUQsTUFBTSxnQkFBaUIsU0FBUSxVQUFVO0lBc0JqQyxnQkFBZ0IsQ0FDdEIsSUFBZ0MsRUFDaEMsSUFBa0U7UUFFbEUsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUMvRSxDQUFDO0lBRUQsWUFBWSxHQUFXLEVBQUUsVUFBa0I7UUFDMUMsS0FBSyxFQUFFLENBQUE7UUE3QlMsWUFBTyxHQUFHLElBQUksT0FBTyxFQUFlLENBQUE7UUFDckMsV0FBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFBO1FBRTFCLFlBQU8sR0FBRyxJQUFJLENBQUMsU0FB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