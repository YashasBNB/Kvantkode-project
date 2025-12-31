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
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
export const ITunnelService = createDecorator('tunnelService');
export const ISharedTunnelsService = createDecorator('sharedTunnelsService');
export var TunnelProtocol;
(function (TunnelProtocol) {
    TunnelProtocol["Http"] = "http";
    TunnelProtocol["Https"] = "https";
})(TunnelProtocol || (TunnelProtocol = {}));
export var TunnelPrivacyId;
(function (TunnelPrivacyId) {
    TunnelPrivacyId["ConstantPrivate"] = "constantPrivate";
    TunnelPrivacyId["Private"] = "private";
    TunnelPrivacyId["Public"] = "public";
})(TunnelPrivacyId || (TunnelPrivacyId = {}));
export function isTunnelProvider(addressOrTunnelProvider) {
    return !!addressOrTunnelProvider.forwardPort;
}
export var ProvidedOnAutoForward;
(function (ProvidedOnAutoForward) {
    ProvidedOnAutoForward[ProvidedOnAutoForward["Notify"] = 1] = "Notify";
    ProvidedOnAutoForward[ProvidedOnAutoForward["OpenBrowser"] = 2] = "OpenBrowser";
    ProvidedOnAutoForward[ProvidedOnAutoForward["OpenPreview"] = 3] = "OpenPreview";
    ProvidedOnAutoForward[ProvidedOnAutoForward["Silent"] = 4] = "Silent";
    ProvidedOnAutoForward[ProvidedOnAutoForward["Ignore"] = 5] = "Ignore";
    ProvidedOnAutoForward[ProvidedOnAutoForward["OpenBrowserOnce"] = 6] = "OpenBrowserOnce";
})(ProvidedOnAutoForward || (ProvidedOnAutoForward = {}));
export function extractLocalHostUriMetaDataForPortMapping(uri) {
    if (uri.scheme !== 'http' && uri.scheme !== 'https') {
        return undefined;
    }
    const localhostMatch = /^(localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)$/.exec(uri.authority);
    if (!localhostMatch) {
        return undefined;
    }
    return {
        address: localhostMatch[1],
        port: +localhostMatch[2],
    };
}
export function extractQueryLocalHostUriMetaDataForPortMapping(uri) {
    if ((uri.scheme !== 'http' && uri.scheme !== 'https') || !uri.query) {
        return undefined;
    }
    const keyvalues = uri.query.split('&');
    for (const keyvalue of keyvalues) {
        const value = keyvalue.split('=')[1];
        if (/^https?:/.exec(value)) {
            const result = extractLocalHostUriMetaDataForPortMapping(URI.parse(value));
            if (result) {
                return result;
            }
        }
    }
    return undefined;
}
export const LOCALHOST_ADDRESSES = ['localhost', '127.0.0.1', '0:0:0:0:0:0:0:1', '::1'];
export function isLocalhost(host) {
    return LOCALHOST_ADDRESSES.indexOf(host) >= 0;
}
export const ALL_INTERFACES_ADDRESSES = ['0.0.0.0', '0:0:0:0:0:0:0:0', '::'];
export function isAllInterfaces(host) {
    return ALL_INTERFACES_ADDRESSES.indexOf(host) >= 0;
}
export function isPortPrivileged(port, host, os, osRelease) {
    if (os === 1 /* OperatingSystem.Windows */) {
        return false;
    }
    if (os === 2 /* OperatingSystem.Macintosh */) {
        if (isAllInterfaces(host)) {
            const osVersion = /(\d+)\.(\d+)\.(\d+)/g.exec(osRelease);
            if (osVersion?.length === 4) {
                const major = parseInt(osVersion[1]);
                if (major >= 18 /* since macOS Mojave, darwin version 18.0.0 */) {
                    return false;
                }
            }
        }
    }
    return port < 1024;
}
export class DisposableTunnel {
    constructor(remoteAddress, localAddress, _dispose) {
        this.remoteAddress = remoteAddress;
        this.localAddress = localAddress;
        this._dispose = _dispose;
        this._onDispose = new Emitter();
        this.onDidDispose = this._onDispose.event;
    }
    dispose() {
        this._onDispose.fire();
        return this._dispose();
    }
}
let AbstractTunnelService = class AbstractTunnelService extends Disposable {
    constructor(logService, configurationService) {
        super();
        this.logService = logService;
        this.configurationService = configurationService;
        this._onTunnelOpened = new Emitter();
        this.onTunnelOpened = this._onTunnelOpened.event;
        this._onTunnelClosed = new Emitter();
        this.onTunnelClosed = this._onTunnelClosed.event;
        this._onAddedTunnelProvider = new Emitter();
        this.onAddedTunnelProvider = this._onAddedTunnelProvider.event;
        this._tunnels = new Map();
        this._canElevate = false;
        this._canChangeProtocol = true;
        this._privacyOptions = [];
        this._factoryInProgress = new Set();
    }
    get hasTunnelProvider() {
        return !!this._tunnelProvider;
    }
    get defaultTunnelHost() {
        const settingValue = this.configurationService.getValue('remote.localPortHost');
        return !settingValue || settingValue === 'localhost' ? '127.0.0.1' : '0.0.0.0';
    }
    setTunnelProvider(provider) {
        this._tunnelProvider = provider;
        if (!provider) {
            // clear features
            this._canElevate = false;
            this._privacyOptions = [];
            this._onAddedTunnelProvider.fire();
            return {
                dispose: () => { },
            };
        }
        this._onAddedTunnelProvider.fire();
        return {
            dispose: () => {
                this._tunnelProvider = undefined;
                this._canElevate = false;
                this._privacyOptions = [];
            },
        };
    }
    setTunnelFeatures(features) {
        this._canElevate = features.elevation;
        this._privacyOptions = features.privacyOptions;
        this._canChangeProtocol = features.protocol;
    }
    get canChangeProtocol() {
        return this._canChangeProtocol;
    }
    get canElevate() {
        return this._canElevate;
    }
    get canChangePrivacy() {
        return this._privacyOptions.length > 0;
    }
    get privacyOptions() {
        return this._privacyOptions;
    }
    get tunnels() {
        return this.getTunnels();
    }
    async getTunnels() {
        const tunnels = [];
        const tunnelArray = Array.from(this._tunnels.values());
        for (const portMap of tunnelArray) {
            const portArray = Array.from(portMap.values());
            for (const x of portArray) {
                const tunnelValue = await x.value;
                if (tunnelValue && typeof tunnelValue !== 'string') {
                    tunnels.push(tunnelValue);
                }
            }
        }
        return tunnels;
    }
    async dispose() {
        super.dispose();
        for (const portMap of this._tunnels.values()) {
            for (const { value } of portMap.values()) {
                await value.then((tunnel) => (typeof tunnel !== 'string' ? tunnel?.dispose() : undefined));
            }
            portMap.clear();
        }
        this._tunnels.clear();
    }
    setEnvironmentTunnel(remoteHost, remotePort, localAddress, privacy, protocol) {
        this.addTunnelToMap(remoteHost, remotePort, Promise.resolve({
            tunnelRemoteHost: remoteHost,
            tunnelRemotePort: remotePort,
            localAddress,
            privacy,
            protocol,
            dispose: () => Promise.resolve(),
        }));
    }
    async getExistingTunnel(remoteHost, remotePort) {
        if (isAllInterfaces(remoteHost) || isLocalhost(remoteHost)) {
            remoteHost = LOCALHOST_ADDRESSES[0];
        }
        const existing = this.getTunnelFromMap(remoteHost, remotePort);
        if (existing) {
            ++existing.refcount;
            return existing.value;
        }
        return undefined;
    }
    openTunnel(addressProvider, remoteHost, remotePort, localHost, localPort, elevateIfNeeded = false, privacy, protocol) {
        this.logService.trace(`ForwardedPorts: (TunnelService) openTunnel request for ${remoteHost}:${remotePort} on local port ${localPort}.`);
        const addressOrTunnelProvider = this._tunnelProvider ?? addressProvider;
        if (!addressOrTunnelProvider) {
            return undefined;
        }
        if (!remoteHost) {
            remoteHost = 'localhost';
        }
        if (!localHost) {
            localHost = this.defaultTunnelHost;
        }
        // Prevent tunnel factories from calling openTunnel from within the factory
        if (this._tunnelProvider && this._factoryInProgress.has(remotePort)) {
            this.logService.debug(`ForwardedPorts: (TunnelService) Another call to create a tunnel with the same address has occurred before the last one completed. This call will be ignored.`);
            return;
        }
        const resolvedTunnel = this.retainOrCreateTunnel(addressOrTunnelProvider, remoteHost, remotePort, localHost, localPort, elevateIfNeeded, privacy, protocol);
        if (!resolvedTunnel) {
            this.logService.trace(`ForwardedPorts: (TunnelService) Tunnel was not created.`);
            return resolvedTunnel;
        }
        return resolvedTunnel.then((tunnel) => {
            if (!tunnel) {
                this.logService.trace('ForwardedPorts: (TunnelService) New tunnel is undefined.');
                this.removeEmptyOrErrorTunnelFromMap(remoteHost, remotePort);
                return undefined;
            }
            else if (typeof tunnel === 'string') {
                this.logService.trace('ForwardedPorts: (TunnelService) The tunnel provider returned an error when creating the tunnel.');
                this.removeEmptyOrErrorTunnelFromMap(remoteHost, remotePort);
                return tunnel;
            }
            this.logService.trace('ForwardedPorts: (TunnelService) New tunnel established.');
            const newTunnel = this.makeTunnel(tunnel);
            if (tunnel.tunnelRemoteHost !== remoteHost || tunnel.tunnelRemotePort !== remotePort) {
                this.logService.warn('ForwardedPorts: (TunnelService) Created tunnel does not match requirements of requested tunnel. Host or port mismatch.');
            }
            if (privacy && tunnel.privacy !== privacy) {
                this.logService.warn('ForwardedPorts: (TunnelService) Created tunnel does not match requirements of requested tunnel. Privacy mismatch.');
            }
            this._onTunnelOpened.fire(newTunnel);
            return newTunnel;
        });
    }
    makeTunnel(tunnel) {
        return {
            tunnelRemotePort: tunnel.tunnelRemotePort,
            tunnelRemoteHost: tunnel.tunnelRemoteHost,
            tunnelLocalPort: tunnel.tunnelLocalPort,
            localAddress: tunnel.localAddress,
            privacy: tunnel.privacy,
            protocol: tunnel.protocol,
            dispose: async () => {
                this.logService.trace(`ForwardedPorts: (TunnelService) dispose request for ${tunnel.tunnelRemoteHost}:${tunnel.tunnelRemotePort} `);
                const existingHost = this._tunnels.get(tunnel.tunnelRemoteHost);
                if (existingHost) {
                    const existing = existingHost.get(tunnel.tunnelRemotePort);
                    if (existing) {
                        existing.refcount--;
                        await this.tryDisposeTunnel(tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort, existing);
                    }
                }
            },
        };
    }
    async tryDisposeTunnel(remoteHost, remotePort, tunnel) {
        if (tunnel.refcount <= 0) {
            this.logService.trace(`ForwardedPorts: (TunnelService) Tunnel is being disposed ${remoteHost}:${remotePort}.`);
            const disposePromise = tunnel.value.then(async (tunnel) => {
                if (tunnel && typeof tunnel !== 'string') {
                    await tunnel.dispose(true);
                    this._onTunnelClosed.fire({
                        host: tunnel.tunnelRemoteHost,
                        port: tunnel.tunnelRemotePort,
                    });
                }
            });
            if (this._tunnels.has(remoteHost)) {
                this._tunnels.get(remoteHost).delete(remotePort);
            }
            return disposePromise;
        }
    }
    async closeTunnel(remoteHost, remotePort) {
        this.logService.trace(`ForwardedPorts: (TunnelService) close request for ${remoteHost}:${remotePort} `);
        const portMap = this._tunnels.get(remoteHost);
        if (portMap && portMap.has(remotePort)) {
            const value = portMap.get(remotePort);
            value.refcount = 0;
            await this.tryDisposeTunnel(remoteHost, remotePort, value);
        }
    }
    addTunnelToMap(remoteHost, remotePort, tunnel) {
        if (!this._tunnels.has(remoteHost)) {
            this._tunnels.set(remoteHost, new Map());
        }
        this._tunnels.get(remoteHost).set(remotePort, { refcount: 1, value: tunnel });
    }
    async removeEmptyOrErrorTunnelFromMap(remoteHost, remotePort) {
        const hostMap = this._tunnels.get(remoteHost);
        if (hostMap) {
            const tunnel = hostMap.get(remotePort);
            const tunnelResult = tunnel ? await tunnel.value : undefined;
            if (!tunnelResult || typeof tunnelResult === 'string') {
                hostMap.delete(remotePort);
            }
            if (hostMap.size === 0) {
                this._tunnels.delete(remoteHost);
            }
        }
    }
    getTunnelFromMap(remoteHost, remotePort) {
        const hosts = [remoteHost];
        // Order matters. We want the original host to be first.
        if (isLocalhost(remoteHost)) {
            hosts.push(...LOCALHOST_ADDRESSES);
            // For localhost, we add the all interfaces hosts because if the tunnel is already available at all interfaces,
            // then of course it is available at localhost.
            hosts.push(...ALL_INTERFACES_ADDRESSES);
        }
        else if (isAllInterfaces(remoteHost)) {
            hosts.push(...ALL_INTERFACES_ADDRESSES);
        }
        const existingPortMaps = hosts.map((host) => this._tunnels.get(host));
        for (const map of existingPortMaps) {
            const existingTunnel = map?.get(remotePort);
            if (existingTunnel) {
                return existingTunnel;
            }
        }
        return undefined;
    }
    canTunnel(uri) {
        return !!extractLocalHostUriMetaDataForPortMapping(uri);
    }
    createWithProvider(tunnelProvider, remoteHost, remotePort, localPort, elevateIfNeeded, privacy, protocol) {
        this.logService.trace(`ForwardedPorts: (TunnelService) Creating tunnel with provider ${remoteHost}:${remotePort} on local port ${localPort}.`);
        const key = remotePort;
        this._factoryInProgress.add(key);
        const preferredLocalPort = localPort === undefined ? remotePort : localPort;
        const creationInfo = {
            elevationRequired: elevateIfNeeded ? this.isPortPrivileged(preferredLocalPort) : false,
        };
        const tunnelOptions = {
            remoteAddress: { host: remoteHost, port: remotePort },
            localAddressPort: localPort,
            privacy,
            public: privacy ? privacy !== TunnelPrivacyId.Private : undefined,
            protocol,
        };
        const tunnel = tunnelProvider.forwardPort(tunnelOptions, creationInfo);
        if (tunnel) {
            this.addTunnelToMap(remoteHost, remotePort, tunnel);
            tunnel.finally(() => {
                this.logService.trace('ForwardedPorts: (TunnelService) Tunnel created by provider.');
                this._factoryInProgress.delete(key);
            });
        }
        else {
            this._factoryInProgress.delete(key);
        }
        return tunnel;
    }
};
AbstractTunnelService = __decorate([
    __param(0, ILogService),
    __param(1, IConfigurationService)
], AbstractTunnelService);
export { AbstractTunnelService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHVubmVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdHVubmVsL2NvbW1vbi90dW5uZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBZSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUlyRCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsZUFBZSxDQUFpQixlQUFlLENBQUMsQ0FBQTtBQUM5RSxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxlQUFlLENBQXdCLHNCQUFzQixDQUFDLENBQUE7QUFxQm5HLE1BQU0sQ0FBTixJQUFZLGNBR1g7QUFIRCxXQUFZLGNBQWM7SUFDekIsK0JBQWEsQ0FBQTtJQUNiLGlDQUFlLENBQUE7QUFDaEIsQ0FBQyxFQUhXLGNBQWMsS0FBZCxjQUFjLFFBR3pCO0FBRUQsTUFBTSxDQUFOLElBQVksZUFJWDtBQUpELFdBQVksZUFBZTtJQUMxQixzREFBbUMsQ0FBQTtJQUNuQyxzQ0FBbUIsQ0FBQTtJQUNuQixvQ0FBaUIsQ0FBQTtBQUNsQixDQUFDLEVBSlcsZUFBZSxLQUFmLGVBQWUsUUFJMUI7QUF1QkQsTUFBTSxVQUFVLGdCQUFnQixDQUMvQix1QkFBMkQ7SUFFM0QsT0FBTyxDQUFDLENBQUUsdUJBQTJDLENBQUMsV0FBVyxDQUFBO0FBQ2xFLENBQUM7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