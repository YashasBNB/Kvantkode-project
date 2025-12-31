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
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import * as nls from '../../../nls.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { DisposableTunnel, TunnelPrivacyId, } from '../../../platform/tunnel/common/tunnel.js';
import { MainContext, } from './extHost.protocol.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import * as types from './extHostTypes.js';
class ExtensionTunnel extends DisposableTunnel {
}
export var TunnelDtoConverter;
(function (TunnelDtoConverter) {
    function fromApiTunnel(tunnel) {
        return {
            remoteAddress: tunnel.remoteAddress,
            localAddress: tunnel.localAddress,
            public: !!tunnel.public,
            privacy: tunnel.privacy ?? (tunnel.public ? TunnelPrivacyId.Public : TunnelPrivacyId.Private),
            protocol: tunnel.protocol,
        };
    }
    TunnelDtoConverter.fromApiTunnel = fromApiTunnel;
    function fromServiceTunnel(tunnel) {
        return {
            remoteAddress: {
                host: tunnel.tunnelRemoteHost,
                port: tunnel.tunnelRemotePort,
            },
            localAddress: tunnel.localAddress,
            public: tunnel.privacy !== TunnelPrivacyId.ConstantPrivate &&
                tunnel.privacy !== TunnelPrivacyId.ConstantPrivate,
            privacy: tunnel.privacy,
            protocol: tunnel.protocol,
        };
    }
    TunnelDtoConverter.fromServiceTunnel = fromServiceTunnel;
})(TunnelDtoConverter || (TunnelDtoConverter = {}));
export const IExtHostTunnelService = createDecorator('IExtHostTunnelService');
let ExtHostTunnelService = class ExtHostTunnelService extends Disposable {
    constructor(extHostRpc, initData, logService) {
        super();
        this.logService = logService;
        this._showCandidatePort = () => {
            return Promise.resolve(true);
        };
        this._extensionTunnels = new Map();
        this._onDidChangeTunnels = new Emitter();
        this.onDidChangeTunnels = this._onDidChangeTunnels.event;
        this._providerHandleCounter = 0;
        this._portAttributesProviders = new Map();
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadTunnelService);
    }
    async openTunnel(extension, forward) {
        this.logService.trace(`ForwardedPorts: (ExtHostTunnelService) ${extension.identifier.value} called openTunnel API for ${forward.remoteAddress.host}:${forward.remoteAddress.port}.`);
        const tunnel = await this._proxy.$openTunnel(forward, extension.displayName);
        if (tunnel) {
            const disposableTunnel = new ExtensionTunnel(tunnel.remoteAddress, tunnel.localAddress, () => {
                return this._proxy.$closeTunnel(tunnel.remoteAddress);
            });
            this._register(disposableTunnel);
            return disposableTunnel;
        }
        return undefined;
    }
    async getTunnels() {
        return this._proxy.$getTunnels();
    }
    nextPortAttributesProviderHandle() {
        return this._providerHandleCounter++;
    }
    registerPortsAttributesProvider(portSelector, provider) {
        if (portSelector.portRange === undefined && portSelector.commandPattern === undefined) {
            this.logService.error('PortAttributesProvider must specify either a portRange or a commandPattern');
        }
        const providerHandle = this.nextPortAttributesProviderHandle();
        this._portAttributesProviders.set(providerHandle, { selector: portSelector, provider });
        this._proxy.$registerPortsAttributesProvider(portSelector, providerHandle);
        return new types.Disposable(() => {
            this._portAttributesProviders.delete(providerHandle);
            this._proxy.$unregisterPortsAttributesProvider(providerHandle);
        });
    }
    async $providePortAttributes(handles, ports, pid, commandLine, cancellationToken) {
        const providedAttributes = [];
        for (const handle of handles) {
            const provider = this._portAttributesProviders.get(handle);
            if (!provider) {
                return [];
            }
            providedAttributes.push(...(await Promise.all(ports.map(async (port) => {
                let providedAttributes;
                try {
                    providedAttributes = await provider.provider.providePortAttributes({ port, pid, commandLine }, cancellationToken);
                }
                catch (e) {
                    // Call with old signature for breaking API change
                    providedAttributes = await provider.provider.providePortAttributes(port, pid, commandLine, cancellationToken);
                }
                return { providedAttributes, port };
            }))));
        }
        const allAttributes = (providedAttributes.filter((attribute) => !!attribute.providedAttributes));
        return allAttributes.length > 0
            ? allAttributes.map((attributes) => {
                return {
                    autoForwardAction: attributes.providedAttributes.autoForwardAction,
                    port: attributes.port,
                };
            })
            : [];
    }
    async $registerCandidateFinder(_enable) { }
    registerTunnelProvider(provider, information) {
        if (this._forwardPortProvider) {
            throw new Error('A tunnel provider has already been registered. Only the first tunnel provider to be registered will be used.');
        }
        this._forwardPortProvider = async (tunnelOptions, tunnelCreationOptions) => {
            const result = await provider.provideTunnel(tunnelOptions, tunnelCreationOptions, CancellationToken.None);
            return result ?? undefined;
        };
        const tunnelFeatures = information.tunnelFeatures
            ? {
                elevation: !!information.tunnelFeatures?.elevation,
                privacyOptions: information.tunnelFeatures?.privacyOptions,
                protocol: information.tunnelFeatures.protocol === undefined
                    ? true
                    : information.tunnelFeatures.protocol,
            }
            : undefined;
        this._proxy.$setTunnelProvider(tunnelFeatures, true);
        return Promise.resolve(toDisposable(() => {
            this._forwardPortProvider = undefined;
            this._proxy.$setTunnelProvider(undefined, false);
        }));
    }
    /**
     * Applies the tunnel metadata and factory found in the remote authority
     * resolver to the tunnel system.
     *
     * `managedRemoteAuthority` should be be passed if the resolver returned on.
     * If this is the case, the tunnel cannot be connected to via a websocket from
     * the share process, so a synethic tunnel factory is used as a default.
     */
    async setTunnelFactory(provider, managedRemoteAuthority) {
        // Do not wait for any of the proxy promises here.
        // It will delay startup and there is nothing that needs to be waited for.
        if (provider) {
            if (provider.candidatePortSource !== undefined) {
                this._proxy.$setCandidatePortSource(provider.candidatePortSource);
            }
            if (provider.showCandidatePort) {
                this._showCandidatePort = provider.showCandidatePort;
                this._proxy.$setCandidateFilter();
            }
            const tunnelFactory = provider.tunnelFactory ??
                (managedRemoteAuthority ? this.makeManagedTunnelFactory(managedRemoteAuthority) : undefined);
            if (tunnelFactory) {
                this._forwardPortProvider = tunnelFactory;
                let privacyOptions = provider.tunnelFeatures?.privacyOptions ?? [];
                if (provider.tunnelFeatures?.public && privacyOptions.length === 0) {
                    privacyOptions = [
                        {
                            id: 'private',
                            label: nls.localize('tunnelPrivacy.private', 'Private'),
                            themeIcon: 'lock',
                        },
                        {
                            id: 'public',
                            label: nls.localize('tunnelPrivacy.public', 'Public'),
                            themeIcon: 'eye',
                        },
                    ];
                }
                const tunnelFeatures = provider.tunnelFeatures
                    ? {
                        elevation: !!provider.tunnelFeatures?.elevation,
                        public: !!provider.tunnelFeatures?.public,
                        privacyOptions,
                        protocol: true,
                    }
                    : undefined;
                this._proxy.$setTunnelProvider(tunnelFeatures, !!provider.tunnelFactory);
            }
        }
        else {
            this._forwardPortProvider = undefined;
        }
        return toDisposable(() => {
            this._forwardPortProvider = undefined;
        });
    }
    makeManagedTunnelFactory(_authority) {
        return undefined; // may be overridden
    }
    async $closeTunnel(remote, silent) {
        if (this._extensionTunnels.has(remote.host)) {
            const hostMap = this._extensionTunnels.get(remote.host);
            if (hostMap.has(remote.port)) {
                if (silent) {
                    hostMap.get(remote.port).disposeListener.dispose();
                }
                await hostMap.get(remote.port).tunnel.dispose();
                hostMap.delete(remote.port);
            }
        }
    }
    async $onDidTunnelsChange() {
        this._onDidChangeTunnels.fire();
    }
    async $forwardPort(tunnelOptions, tunnelCreationOptions) {
        if (this._forwardPortProvider) {
            try {
                this.logService.trace('ForwardedPorts: (ExtHostTunnelService) Getting tunnel from provider.');
                const providedPort = this._forwardPortProvider(tunnelOptions, tunnelCreationOptions);
                this.logService.trace('ForwardedPorts: (ExtHostTunnelService) Got tunnel promise from provider.');
                if (providedPort !== undefined) {
                    const tunnel = await providedPort;
                    this.logService.trace('ForwardedPorts: (ExtHostTunnelService) Successfully awaited tunnel from provider.');
                    if (tunnel === undefined) {
                        this.logService.error('ForwardedPorts: (ExtHostTunnelService) Resolved tunnel is undefined');
                        return undefined;
                    }
                    if (!this._extensionTunnels.has(tunnelOptions.remoteAddress.host)) {
                        this._extensionTunnels.set(tunnelOptions.remoteAddress.host, new Map());
                    }
                    const disposeListener = this._register(tunnel.onDidDispose(() => {
                        this.logService.trace("ForwardedPorts: (ExtHostTunnelService) Extension fired tunnel's onDidDispose.");
                        return this._proxy.$closeTunnel(tunnel.remoteAddress);
                    }));
                    this._extensionTunnels
                        .get(tunnelOptions.remoteAddress.host)
                        .set(tunnelOptions.remoteAddress.port, { tunnel, disposeListener });
                    return TunnelDtoConverter.fromApiTunnel(tunnel);
                }
                else {
                    this.logService.trace('ForwardedPorts: (ExtHostTunnelService) Tunnel is undefined');
                }
            }
            catch (e) {
                this.logService.trace('ForwardedPorts: (ExtHostTunnelService) tunnel provider error');
                if (e instanceof Error) {
                    return e.message;
                }
            }
        }
        return undefined;
    }
    async $applyCandidateFilter(candidates) {
        const filter = await Promise.all(candidates.map((candidate) => this._showCandidatePort(candidate.host, candidate.port, candidate.detail ?? '')));
        const result = candidates.filter((candidate, index) => filter[index]);
        this.logService.trace(`ForwardedPorts: (ExtHostTunnelService) filtered from ${candidates.map((port) => port.port).join(', ')} to ${result.map((port) => port.port).join(', ')}`);
        return result;
    }
};
ExtHostTunnelService = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService),
    __param(2, ILogService)
], ExtHostTunnelService);
export { ExtHostTunnelService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFR1bm5lbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0VHVubmVsU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN6RixPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFBO0FBRXRDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUNOLGdCQUFnQixFQU1oQixlQUFlLEdBQ2YsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNsRCxPQUFPLEVBRU4sV0FBVyxHQUlYLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDckUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDM0QsT0FBTyxLQUFLLEtBQUssTUFBTSxtQkFBbUIsQ0FBQTtBQUkxQyxNQUFNLGVBQWdCLFNBQVEsZ0JBQWdCO0NBQTRCO0FBRTFFLE1BQU0sS0FBVyxrQkFBa0IsQ0F3QmxDO0FBeEJELFdBQWlCLGtCQUFrQjtJQUNsQyxTQUFnQixhQUFhLENBQUMsTUFBcUI7UUFDbEQsT0FBTztZQUNOLGFBQWEsRUFBRSxNQUFNLENBQUMsYUFBYTtZQUNuQyxZQUFZLEVBQUUsTUFBTSxDQUFDLFlBQVk7WUFDakMsTUFB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