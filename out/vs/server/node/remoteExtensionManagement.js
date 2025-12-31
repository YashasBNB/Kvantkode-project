/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../base/common/event.js';
import { ProcessTimeRunOnceScheduler } from '../../base/common/async.js';
function printTime(ms) {
    let h = 0;
    let m = 0;
    let s = 0;
    if (ms >= 1000) {
        s = Math.floor(ms / 1000);
        ms -= s * 1000;
    }
    if (s >= 60) {
        m = Math.floor(s / 60);
        s -= m * 60;
    }
    if (m >= 60) {
        h = Math.floor(m / 60);
        m -= h * 60;
    }
    const _h = h ? `${h}h` : ``;
    const _m = m ? `${m}m` : ``;
    const _s = s ? `${s}s` : ``;
    const _ms = ms ? `${ms}ms` : ``;
    return `${_h}${_m}${_s}${_ms}`;
}
export class ManagementConnection {
    constructor(_logService, _reconnectionToken, remoteAddress, protocol) {
        this._logService = _logService;
        this._reconnectionToken = _reconnectionToken;
        this._onClose = new Emitter();
        this.onClose = this._onClose.event;
        this._reconnectionGraceTime = 10800000 /* ProtocolConstants.ReconnectionGraceTime */;
        this._reconnectionShortGraceTime = 300000 /* ProtocolConstants.ReconnectionShortGraceTime */;
        this._remoteAddress = remoteAddress;
        this.protocol = protocol;
        this._disposed = false;
        this._disconnectRunner1 = new ProcessTimeRunOnceScheduler(() => {
            this._log(`The reconnection grace time of ${printTime(this._reconnectionGraceTime)} has expired, so the connection will be disposed.`);
            this._cleanResources();
        }, this._reconnectionGraceTime);
        this._disconnectRunner2 = new ProcessTimeRunOnceScheduler(() => {
            this._log(`The reconnection short grace time of ${printTime(this._reconnectionShortGraceTime)} has expired, so the connection will be disposed.`);
            this._cleanResources();
        }, this._reconnectionShortGraceTime);
        this.protocol.onDidDispose(() => {
            this._log(`The client has disconnected gracefully, so the connection will be disposed.`);
            this._cleanResources();
        });
        this.protocol.onSocketClose(() => {
            this._log(`The client has disconnected, will wait for reconnection ${printTime(this._reconnectionGraceTime)} before disposing...`);
            // The socket has closed, let's give the renderer a certain amount of time to reconnect
            this._disconnectRunner1.schedule();
        });
        this._log(`New connection established.`);
    }
    _log(_str) {
        this._logService.info(`[${this._remoteAddress}][${this._reconnectionToken.substr(0, 8)}][ManagementConnection] ${_str}`);
    }
    shortenReconnectionGraceTimeIfNecessary() {
        if (this._disconnectRunner2.isScheduled()) {
            // we are disconnected and already running the short reconnection timer
            return;
        }
        if (this._disconnectRunner1.isScheduled()) {
            this._log(`Another client has connected, will shorten the wait for reconnection ${printTime(this._reconnectionShortGraceTime)} before disposing...`);
            // we are disconnected and running the long reconnection timer
            this._disconnectRunner2.schedule();
        }
    }
    _cleanResources() {
        if (this._disposed) {
            // already called
            return;
        }
        this._disposed = true;
        this._disconnectRunner1.dispose();
        this._disconnectRunner2.dispose();
        const socket = this.protocol.getSocket();
        this.protocol.sendDisconnect();
        this.protocol.dispose();
        socket.end();
        this._onClose.fire(undefined);
    }
    acceptReconnection(remoteAddress, socket, initialDataChunk) {
        this._remoteAddress = remoteAddress;
        this._log(`The client has reconnected.`);
        this._disconnectRunner1.cancel();
        this._disconnectRunner2.cancel();
        this.protocol.beginAcceptReconnection(socket, initialDataChunk);
        this.protocol.endAcceptReconnection();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uTWFuYWdlbWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3NlcnZlci9ub2RlL3JlbW90ZUV4dGVuc2lvbk1hbmFnZW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFRaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLDRCQUE0QixDQUFBO0FBRTNELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRXhFLFNBQVMsU0FBUyxDQUFDLEVBQVU7SUFDNUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ1QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ1QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ1QsSUFBSSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUM7UUFDaEIsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFBO1FBQ3pCLEVBQUUsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFBO0lBQ2YsQ0FBQztJQUNELElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO1FBQ2IsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBQ3RCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO0lBQ1osQ0FBQztJQUNELElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO1FBQ2IsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBQ3RCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO0lBQ1osQ0FBQztJQUNELE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFD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