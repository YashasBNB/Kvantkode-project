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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SharedProcessTunnelService_1;
import { ILogService } from '../../log/common/log.js';
import { ISharedTunnelsService } from '../common/tunnel.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { canceled } from '../../../base/common/errors.js';
import { DeferredPromise } from '../../../base/common/async.js';
class TunnelData extends Disposable {
    constructor() {
        super();
        this._address = null;
        this._addressPromise = null;
    }
    async getAddress() {
        if (this._address) {
            // address is resolved
            return this._address;
        }
        if (!this._addressPromise) {
            this._addressPromise = new DeferredPromise();
        }
        return this._addressPromise.p;
    }
    setAddress(address) {
        this._address = address;
        if (this._addressPromise) {
            this._addressPromise.complete(address);
            this._addressPromise = null;
        }
    }
    setTunnel(tunnel) {
        this._register(tunnel);
    }
}
let SharedProcessTunnelService = class SharedProcessTunnelService extends Disposable {
    static { SharedProcessTunnelService_1 = this; }
    static { this._lastId = 0; }
    constructor(_tunnelService, _logService) {
        super();
        this._tunnelService = _tunnelService;
        this._logService = _logService;
        this._tunnels = new Map();
        this._disposedTunnels = new Set();
    }
    dispose() {
        super.dispose();
        this._tunnels.forEach((tunnel) => tunnel.dispose());
    }
    async createTunnel() {
        const id = String(++SharedProcessTunnelService_1._lastId);
        return { id };
    }
    async startTunnel(authority, id, tunnelRemoteHost, tunnelRemotePort, tunnelLocalHost, tunnelLocalPort, elevateIfNeeded) {
        const tunnelData = new TunnelData();
        const tunnel = await Promise.resolve(this._tunnelService.openTunnel(authority, tunnelData, tunnelRemoteHost, tunnelRemotePort, tunnelLocalHost, tunnelLocalPort, elevateIfNeeded));
        if (!tunnel || typeof tunnel === 'string') {
            this._logService.info(`[SharedProcessTunnelService] Could not create a tunnel to ${tunnelRemoteHost}:${tunnelRemotePort} (remote).`);
            tunnelData.dispose();
            throw new Error(`Could not create tunnel`);
        }
        if (this._disposedTunnels.has(id)) {
            // This tunnel was disposed in the meantime
            this._disposedTunnels.delete(id);
            tunnelData.dispose();
            await tunnel.dispose();
            throw canceled();
        }
        tunnelData.setTunnel(tunnel);
        this._tunnels.set(id, tunnelData);
        this._logService.info(`[SharedProcessTunnelService] Created tunnel ${id}: ${tunnel.localAddress} (local) to ${tunnelRemoteHost}:${tunnelRemotePort} (remote).`);
        const result = {
            tunnelLocalPort: tunnel.tunnelLocalPort,
            localAddress: tunnel.localAddress,
        };
        return result;
    }
    async setAddress(id, address) {
        const tunnel = this._tunnels.get(id);
        if (!tunnel) {
            return;
        }
        tunnel.setAddress(address);
    }
    async destroyTunnel(id) {
        const tunnel = this._tunnels.get(id);
        if (tunnel) {
            this._logService.info(`[SharedProcessTunnelService] Disposing tunnel ${id}.`);
            this._tunnels.delete(id);
            await tunnel.dispose();
            return;
        }
        // Looks like this tunnel is still starting, mark the id as disposed
        this._disposedTunnels.add(id);
    }
};
SharedProcessTunnelService = SharedProcessTunnelService_1 = __decorate([
    __param(0, ISharedTunnelsService),
    __param(1, ILogService)
], SharedProcessTunnelService);
export { SharedProcessTunnelService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkUHJvY2Vzc1R1bm5lbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90dW5uZWwvbm9kZS9zaGFyZWRQcm9jZXNzVHVubmVsU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBS3JELE9BQU8sRUFBRSxxQkFBcUIsRUFBZ0IsTUFBTSxxQkFBcUIsQ0FBQTtBQUV6RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUUvRCxNQUFNLFVBQVcsU0FBUSxVQUFVO0lBSWxDO1FBQ0MsS0FBSyxFQUFFLENBQUE7UUFDUCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQTtRQUNwQixJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQTtJQUM1QixDQUFDO0lBRUQsS0FBSyxDQUFDLFVBQVU7UUFDZixJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuQixzQkFBc0I7WUFDdEIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO1FBQ3JCLENBQUM7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQVksQ0FBQTtRQUN2RCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQTtJQUM5QixDQUFDO0lBRUQsVUFBVSxDQUFDLE9BQWlCO1FBQzNCLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFBO1FBQ3ZC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