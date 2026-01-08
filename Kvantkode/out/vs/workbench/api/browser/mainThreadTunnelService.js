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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFR1bm5lbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkVHVubmVsU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFBO0FBQ3RDLE9BQU8sRUFFTixXQUFXLEVBQ1gsY0FBYyxFQUVkLG1CQUFtQixHQUduQixNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLHlCQUF5QixFQUN6Qix3QkFBd0IsRUFDeEIsK0JBQStCLEVBQy9CLCtCQUErQixFQUMvQixlQUFlLEdBQ2YsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBRU4sY0FBYyxFQU9kLGNBQWMsR0FDZCxNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU5RCxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLFFBQVEsR0FDUixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUV4RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDeEUsT0FBTyxFQUVOLFVBQVUsSUFBSSx1QkFBdUIsR0FDckMsTUFB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