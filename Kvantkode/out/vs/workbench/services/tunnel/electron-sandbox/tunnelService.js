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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHVubmVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3R1bm5lbC9lbGVjdHJvbi1zYW5kYm94L3R1bm5lbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRTdGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sY0FBYyxFQUNkLHFCQUFxQixFQUVyQixlQUFlLEVBQ2YsZ0JBQWdCLEVBRWhCLGdCQUFnQixHQUNoQixNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUM5RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUMvRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RyxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDeEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBSTNDLFlBQ2tCLEdBQVcsRUFDWCxnQkFBa0MsRUFDbkMsZ0JBQXdCLEVB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