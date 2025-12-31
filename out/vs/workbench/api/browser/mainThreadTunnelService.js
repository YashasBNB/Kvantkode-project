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
import * as nls from '../../../nls.js';
import { MainContext, ExtHostContext, CandidatePortSource, } from '../common/extHost.protocol.js';
import { TunnelDtoConverter } from '../common/extHostTunnelService.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { IRemoteExplorerService, PORT_AUTO_FORWARD_SETTING, PORT_AUTO_SOURCE_SETTING, PORT_AUTO_SOURCE_SETTING_HYBRID, PORT_AUTO_SOURCE_SETTING_OUTPUT, PortsEnablement, } from '../../services/remote/common/remoteExplorerService.js';
import { ITunnelService, TunnelProtocol, } from '../../../platform/tunnel/common/tunnel.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { INotificationService, Severity, } from '../../../platform/notification/common/notification.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IRemoteAgentService } from '../../services/remote/common/remoteAgentService.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions, } from '../../../platform/configuration/common/configurationRegistry.js';
import { IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
import { TunnelCloseReason, TunnelSource, forwardedPortsFeaturesEnabled, makeAddress, } from '../../services/remote/common/tunnelModel.js';
let MainThreadTunnelService = class MainThreadTunnelService extends Disposable {
    constructor(extHostContext, remoteExplorerService, tunnelService, notificationService, configurationService, logService, remoteAgentService, contextKeyService) {
        super();
        this.remoteExplorerService = remoteExplorerService;
        this.tunnelService = tunnelService;
        this.notificationService = notificationService;
        this.configurationService = configurationService;
        this.logService = logService;
        this.remoteAgentService = remoteAgentService;
        this.contextKeyService = contextKeyService;
        this.elevateionRetry = false;
        this.portsAttributesProviders = new Map();
        this._alreadyRegistered = false;
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostTunnelService);
        this._register(tunnelService.onTunnelOpened(() => this._proxy.$onDidTunnelsChange()));
        this._register(tunnelService.onTunnelClosed(() => this._proxy.$onDidTunnelsChange()));
    }
    processFindingEnabled() {
        return ((!!this.configurationService.getValue(PORT_AUTO_FORWARD_SETTING) ||
            this.tunnelService.hasTunnelProvider) &&
            this.configurationService.getValue(PORT_AUTO_SOURCE_SETTING) !==
                PORT_AUTO_SOURCE_SETTING_OUTPUT);
    }
    async $setRemoteTunnelService(processId) {
        this.remoteExplorerService.namedProcesses.set(processId, 'Code Extension Host');
        if (this.remoteExplorerService.portsFeaturesEnabled === PortsEnablement.AdditionalFeatures) {
            this._proxy.$registerCandidateFinder(this.processFindingEnabled());
        }
        else {
            this._register(this.remoteExplorerService.onEnabledPortsFeatures(() => this._proxy.$registerCandidateFinder(this.processFindingEnabled())));
        }
        this._register(this.configurationService.onDidChangeConfiguration(async (e) => {
            if (this.remoteExplorerService.portsFeaturesEnabled === PortsEnablement.AdditionalFeatures &&
                (e.affectsConfiguration(PORT_AUTO_FORWARD_SETTING) ||
                    e.affectsConfiguration(PORT_AUTO_SOURCE_SETTING))) {
                return this._proxy.$registerCandidateFinder(this.processFindingEnabled());
            }
        }));
        this._register(this.tunnelService.onAddedTunnelProvider(async () => {
            if (this.remoteExplorerService.portsFeaturesEnabled === PortsEnablement.AdditionalFeatures) {
                return this._proxy.$registerCandidateFinder(this.processFindingEnabled());
            }
        }));
    }
    async $registerPortsAttributesProvider(selector, providerHandle) {
        this.portsAttributesProviders.set(providerHandle, selector);
        if (!this._alreadyRegistered) {
            this.remoteExplorerService.tunnelModel.addAttributesProvider(this);
            this._alreadyRegistered = true;
        }
    }
    async $unregisterPortsAttributesProvider(providerHandle) {
        this.portsAttributesProviders.delete(providerHandle);
    }
    async providePortAttributes(ports, pid, commandLine, token) {
        if (this.portsAttributesProviders.size === 0) {
            return [];
        }
        // Check all the selectors to make sure it's worth going to the extension host.
        const appropriateHandles = Array.from(this.portsAttributesProviders.entries())
            .filter((entry) => {
            const selector = entry[1];
            const portRange = typeof selector.portRange === 'number'
                ? [selector.portRange, selector.portRange + 1]
                : selector.portRange;
            const portInRange = portRange
                ? ports.some((port) => portRange[0] <= port && port < portRange[1])
                : true;
            const commandMatches = !selector.commandPattern || (commandLine && commandLine.match(selector.commandPattern));
            return portInRange && commandMatches;
        })
            .map((entry) => entry[0]);
        if (appropriateHandles.length === 0) {
            return [];
        }
        return this._proxy.$providePortAttributes(appropriateHandles, ports, pid, commandLine, token);
    }
    async $openTunnel(tunnelOptions, source) {
        const tunnel = await this.remoteExplorerService.forward({
            remote: tunnelOptions.remoteAddress,
            local: tunnelOptions.localAddressPort,
            name: tunnelOptions.label,
            source: {
                source: TunnelSource.Extension,
                description: source,
            },
            elevateIfNeeded: false,
        });
        if (!tunnel || typeof tunnel === 'string') {
            return undefined;
        }
        if (!this.elevateionRetry &&
            tunnelOptions.localAddressPort !== undefined &&
            tunnel.tunnelLocalPort !== undefined &&
            this.tunnelService.isPortPrivileged(tunnelOptions.localAddressPort) &&
            tunnel.tunnelLocalPort !== tunnelOptions.localAddressPort &&
            this.tunnelService.canElevate) {
            this.elevationPrompt(tunnelOptions, tunnel, source);
        }
        return TunnelDtoConverter.fromServiceTunnel(tunnel);
    }
    async elevationPrompt(tunnelOptions, tunnel, source) {
        return this.notificationService.prompt(Severity.Info, nls.localize('remote.tunnel.openTunnel', "The extension {0} has forwarded port {1}. You'll need to run as superuser to use port {2} locally.", source, tunnelOptions.remoteAddress.port, tunnelOptions.localAddressPort), [
            {
                label: nls.localize('remote.tunnelsView.elevationButton', 'Use Port {0} as Sudo...', tunnel.tunnelRemotePort),
                run: async () => {
                    this.elevateionRetry = true;
                    await this.remoteExplorerService.close({ host: tunnel.tunnelRemoteHost, port: tunnel.tunnelRemotePort }, TunnelCloseReason.Other);
                    await this.remoteExplorerService.forward({
                        remote: tunnelOptions.remoteAddress,
                        local: tunnelOptions.localAddressPort,
                        name: tunnelOptions.label,
                        source: {
                            source: TunnelSource.Extension,
                            description: source,
                        },
                        elevateIfNeeded: true,
                    });
                    this.elevateionRetry = false;
                },
            },
        ]);
    }
    async $closeTunnel(remote) {
        return this.remoteExplorerService.close(remote, TunnelCloseReason.Other);
    }
    async $getTunnels() {
        return (await this.tunnelService.tunnels).map((tunnel) => {
            return {
                remoteAddress: { port: tunnel.tunnelRemotePort, host: tunnel.tunnelRemoteHost },
                localAddress: tunnel.localAddress,
                privacy: tunnel.privacy,
                protocol: tunnel.protocol,
            };
        });
    }
    async $onFoundNewCandidates(candidates) {
        this.remoteExplorerService.onFoundNewCandidates(candidates);
    }
    async $setTunnelProvider(features, isResolver) {
        const tunnelProvider = {
            forwardPort: (tunnelOptions, tunnelCreationOptions) => {
                const forward = this._proxy.$forwardPort(tunnelOptions, tunnelCreationOptions);
                return forward.then((tunnelOrError) => {
                    if (!tunnelOrError) {
                        return undefined;
                    }
                    else if (typeof tunnelOrError === 'string') {
                        return tunnelOrError;
                    }
                    const tunnel = tunnelOrError;
                    this.logService.trace(`ForwardedPorts: (MainThreadTunnelService) New tunnel established by tunnel provider: ${tunnel?.remoteAddress.host}:${tunnel?.remoteAddress.port}`);
                    return {
                        tunnelRemotePort: tunnel.remoteAddress.port,
                        tunnelRemoteHost: tunnel.remoteAddress.host,
                        localAddress: typeof tunnel.localAddress === 'string'
                            ? tunnel.localAddress
                            : makeAddress(tunnel.localAddress.host, tunnel.localAddress.port),
                        tunnelLocalPort: typeof tunnel.localAddress !== 'string' ? tunnel.localAddress.port : undefined,
                        public: tunnel.public,
                        privacy: tunnel.privacy,
                        protocol: tunnel.protocol ?? TunnelProtocol.Http,
                        dispose: async (silent) => {
                            this.logService.trace(`ForwardedPorts: (MainThreadTunnelService) Closing tunnel from tunnel provider: ${tunnel?.remoteAddress.host}:${tunnel?.remoteAddress.port}`);
                            return this._proxy.$closeTunnel({ host: tunnel.remoteAddress.host, port: tunnel.remoteAddress.port }, silent);
                        },
                    };
                });
            },
        };
        if (features) {
            this.tunnelService.setTunnelFeatures(features);
        }
        this.tunnelService.setTunnelProvider(tunnelProvider);
        // At this point we clearly want the ports view/features since we have a tunnel factory
        if (isResolver) {
            this.contextKeyService.createKey(forwardedPortsFeaturesEnabled.key, true);
        }
    }
    async $setCandidateFilter() {
        this.remoteExplorerService.setCandidateFilter((candidates) => {
            return this._proxy.$applyCandidateFilter(candidates);
        });
    }
    async $setCandidatePortSource(source) {
        // Must wait for the remote environment before trying to set settings there.
        this.remoteAgentService
            .getEnvironment()
            .then(() => {
            switch (source) {
                case CandidatePortSource.None: {
                    Registry.as(ConfigurationExtensions.Configuration).registerDefaultConfigurations([{ overrides: { 'remote.autoForwardPorts': false } }]);
                    break;
                }
                case CandidatePortSource.Output: {
                    Registry.as(ConfigurationExtensions.Configuration).registerDefaultConfigurations([
                        { overrides: { 'remote.autoForwardPortsSource': PORT_AUTO_SOURCE_SETTING_OUTPUT } },
                    ]);
                    break;
                }
                case CandidatePortSource.Hybrid: {
                    Registry.as(ConfigurationExtensions.Configuration).registerDefaultConfigurations([
                        { overrides: { 'remote.autoForwardPortsSource': PORT_AUTO_SOURCE_SETTING_HYBRID } },
                    ]);
                    break;
                }
                default: // Do nothing, the defaults for these settings should be used.
            }
        })
            .catch(() => {
            // The remote failed to get setup. Errors from that area will already be surfaced to the user.
        });
    }
};
MainThreadTunnelService = __decorate([
    extHostNamedCustomer(MainContext.MainThreadTunnelService),
    __param(1, IRemoteExplorerService),
    __param(2, ITunnelService),
    __param(3, INotificationService),
    __param(4, IConfigurationService),
    __param(5, ILogService),
    __param(6, IRemoteAgentService),
    __param(7, IContextKeyService)
], MainThreadTunnelService);
export { MainThreadTunnelService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFR1bm5lbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFR1bm5lbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQTtBQUN0QyxPQUFPLEVBRU4sV0FBVyxFQUNYLGNBQWMsRUFFZCxtQkFBbUIsR0FHbkIsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN0RSxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUNOLHNCQUFzQixFQUN0Qix5QkFBeUIsRUFDekIsd0JBQXdCLEVBQ3hCLCtCQUErQixFQUMvQiwrQkFBK0IsRUFDL0IsZUFBZSxHQUNmLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUVOLGNBQWMsRUFPZCxjQUFjLEdBQ2QsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFOUQsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixRQUFRLEdBQ1IsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFeEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hFLE9BQU8sRUFFTixVQUFVLElBQUksdUJBQXVCLEdBQ3JDLE1BQU0saUVB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