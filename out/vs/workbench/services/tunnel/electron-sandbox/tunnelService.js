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
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ITunnelService, AbstractTunnelService, TunnelPrivacyId, isPortPrivileged, isTunnelProvider, } from '../../../../platform/tunnel/common/tunnel.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ISharedProcessTunnelService } from '../../../../platform/remote/common/sharedProcessTunnelService.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { OS } from '../../../../base/common/platform.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
let SharedProcessTunnel = class SharedProcessTunnel extends Disposable {
    constructor(_id, _addressProvider, tunnelRemoteHost, tunnelRemotePort, tunnelLocalPort, localAddress, _onBeforeDispose, _sharedProcessTunnelService, _remoteAuthorityResolverService) {
        super();
        this._id = _id;
        this._addressProvider = _addressProvider;
        this.tunnelRemoteHost = tunnelRemoteHost;
        this.tunnelRemotePort = tunnelRemotePort;
        this.tunnelLocalPort = tunnelLocalPort;
        this.localAddress = localAddress;
        this._onBeforeDispose = _onBeforeDispose;
        this._sharedProcessTunnelService = _sharedProcessTunnelService;
        this._remoteAuthorityResolverService = _remoteAuthorityResolverService;
        this.privacy = TunnelPrivacyId.Private;
        this.protocol = undefined;
        this._updateAddress();
        this._register(this._remoteAuthorityResolverService.onDidChangeConnectionData(() => this._updateAddress()));
    }
    _updateAddress() {
        this._addressProvider.getAddress().then((address) => {
            this._sharedProcessTunnelService.setAddress(this._id, address);
        });
    }
    async dispose() {
        this._onBeforeDispose();
        super.dispose();
        await this._sharedProcessTunnelService.destroyTunnel(this._id);
    }
};
SharedProcessTunnel = __decorate([
    __param(7, ISharedProcessTunnelService),
    __param(8, IRemoteAuthorityResolverService)
], SharedProcessTunnel);
let TunnelService = class TunnelService extends AbstractTunnelService {
    constructor(logService, _environmentService, _sharedProcessTunnelService, _instantiationService, lifecycleService, _nativeWorkbenchEnvironmentService, configurationService) {
        super(logService, configurationService);
        this._environmentService = _environmentService;
        this._sharedProcessTunnelService = _sharedProcessTunnelService;
        this._instantiationService = _instantiationService;
        this._nativeWorkbenchEnvironmentService = _nativeWorkbenchEnvironmentService;
        this._activeSharedProcessTunnels = new Set();
        // Destroy any shared process tunnels that might still be active
        this._register(lifecycleService.onDidShutdown(() => {
            this._activeSharedProcessTunnels.forEach((id) => {
                this._sharedProcessTunnelService.destroyTunnel(id);
            });
        }));
    }
    isPortPrivileged(port) {
        return isPortPrivileged(port, this.defaultTunnelHost, OS, this._nativeWorkbenchEnvironmentService.os.release);
    }
    retainOrCreateTunnel(addressOrTunnelProvider, remoteHost, remotePort, localHost, localPort, elevateIfNeeded, privacy, protocol) {
        const existing = this.getTunnelFromMap(remoteHost, remotePort);
        if (existing) {
            ++existing.refcount;
            return existing.value;
        }
        if (isTunnelProvider(addressOrTunnelProvider)) {
            return this.createWithProvider(addressOrTunnelProvider, remoteHost, remotePort, localPort, elevateIfNeeded, privacy, protocol);
        }
        else {
            this.logService.trace(`ForwardedPorts: (TunnelService) Creating tunnel without provider ${remoteHost}:${remotePort} on local port ${localPort}.`);
            const tunnel = this._createSharedProcessTunnel(addressOrTunnelProvider, remoteHost, remotePort, localHost, localPort, elevateIfNeeded);
            this.logService.trace('ForwardedPorts: (TunnelService) Tunnel created without provider.');
            this.addTunnelToMap(remoteHost, remotePort, tunnel);
            return tunnel;
        }
    }
    async _createSharedProcessTunnel(addressProvider, tunnelRemoteHost, tunnelRemotePort, tunnelLocalHost, tunnelLocalPort, elevateIfNeeded) {
        const { id } = await this._sharedProcessTunnelService.createTunnel();
        this._activeSharedProcessTunnels.add(id);
        const authority = this._environmentService.remoteAuthority;
        const result = await this._sharedProcessTunnelService.startTunnel(authority, id, tunnelRemoteHost, tunnelRemotePort, tunnelLocalHost, tunnelLocalPort, elevateIfNeeded);
        const tunnel = this._instantiationService.createInstance(SharedProcessTunnel, id, addressProvider, tunnelRemoteHost, tunnelRemotePort, result.tunnelLocalPort, result.localAddress, () => {
            this._activeSharedProcessTunnels.delete(id);
        });
        return tunnel;
    }
    canTunnel(uri) {
        return super.canTunnel(uri) && !!this._environmentService.remoteAuthority;
    }
};
TunnelService = __decorate([
    __param(0, ILogService),
    __param(1, IWorkbenchEnvironmentService),
    __param(2, ISharedProcessTunnelService),
    __param(3, IInstantiationService),
    __param(4, ILifecycleService),
    __param(5, INativeWorkbenchEnvironmentService),
    __param(6, IConfigurationService)
], TunnelService);
export { TunnelService };
registerSingleton(ITunnelService, TunnelService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHVubmVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90dW5uZWwvZWxlY3Ryb24tc2FuZGJveC90dW5uZWxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUU3RixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUNOLGNBQWMsRUFDZCxxQkFBcUIsRUFFckIsZUFBZSxFQUNmLGdCQUFnQixFQUVoQixnQkFBZ0IsR0FDaEIsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDOUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdkUsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDL0csT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0csT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWxHLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQUkzQyxZQUNrQixHQUFXLEVBQ1gsZ0JBQWtDLEVBQ25DLGdCQUF3QixFQUN4Qixn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