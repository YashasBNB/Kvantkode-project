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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFR1bm5lbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RUdW5uZWxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3pGLE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUE7QUFFdEMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sZ0JBQWdCLEVBTWhCLGVBQWUsR0FDZixNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFFTixXQUFXLEdBSVgsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMzRCxPQUFPLEtBQUssS0FBSyxNQUFNLG1CQUFtQixDQUFBO0FBSTFDLE1BQU0sZUFBZ0IsU0FBUSxnQkFBZ0I7Q0FBNEI7QUFFMUUsTUFBTSxLQUFXLGtCQUFrQixDQXdCbEM7QUF4QkQsV0FBaUIsa0JBQWtCO0lBQ2xDLFNBQWdCLGFBQWEsQ0FBQyxNQUFxQjtRQUNsRCxPQUFPO1lBQ04sYUFBYSxFQUFFLE1BQU0sQ0FBQyxhQUFhO1lBQ25DLFlBQVksRUFBRSxNQUFNLENBQUMsWUFBWTtZQUNq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