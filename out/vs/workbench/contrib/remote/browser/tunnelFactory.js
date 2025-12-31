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
import * as nls from '../../../../nls.js';
import { ITunnelService, TunnelProtocol, TunnelPrivacyId, } from '../../../../platform/tunnel/common/tunnel.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { URI } from '../../../../base/common/uri.js';
import { IRemoteExplorerService } from '../../../services/remote/common/remoteExplorerService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { forwardedPortsFeaturesEnabled } from '../../../services/remote/common/tunnelModel.js';
let TunnelFactoryContribution = class TunnelFactoryContribution extends Disposable {
    static { this.ID = 'workbench.contrib.tunnelFactory'; }
    constructor(tunnelService, environmentService, openerService, remoteExplorerService, logService, contextKeyService) {
        super();
        this.openerService = openerService;
        const tunnelFactory = environmentService.options?.tunnelProvider?.tunnelFactory;
        if (tunnelFactory) {
            // At this point we clearly want the ports view/features since we have a tunnel factory
            contextKeyService.createKey(forwardedPortsFeaturesEnabled.key, true);
            let privacyOptions = environmentService.options?.tunnelProvider?.features?.privacyOptions ?? [];
            if (environmentService.options?.tunnelProvider?.features?.public &&
                privacyOptions.length === 0) {
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
            this._register(tunnelService.setTunnelProvider({
                forwardPort: async (tunnelOptions, tunnelCreationOptions) => {
                    let tunnelPromise;
                    try {
                        tunnelPromise = tunnelFactory(tunnelOptions, tunnelCreationOptions);
                    }
                    catch (e) {
                        logService.trace('tunnelFactory: tunnel provider error');
                    }
                    if (!tunnelPromise) {
                        return undefined;
                    }
                    let tunnel;
                    try {
                        tunnel = await tunnelPromise;
                    }
                    catch (e) {
                        logService.trace('tunnelFactory: tunnel provider promise error');
                        if (e instanceof Error) {
                            return e.message;
                        }
                        return undefined;
                    }
                    const localAddress = tunnel.localAddress.startsWith('http')
                        ? tunnel.localAddress
                        : `http://${tunnel.localAddress}`;
                    const remoteTunnel = {
                        tunnelRemotePort: tunnel.remoteAddress.port,
                        tunnelRemoteHost: tunnel.remoteAddress.host,
                        // The tunnel factory may give us an inaccessible local address.
                        // To make sure this doesn't happen, resolve the uri immediately.
                        localAddress: await this.resolveExternalUri(localAddress),
                        privacy: tunnel.privacy ??
                            (tunnel.public ? TunnelPrivacyId.Public : TunnelPrivacyId.Private),
                        protocol: tunnel.protocol ?? TunnelProtocol.Http,
                        dispose: async () => {
                            await tunnel.dispose();
                        },
                    };
                    return remoteTunnel;
                },
            }));
            const tunnelInformation = environmentService.options?.tunnelProvider?.features
                ? {
                    features: {
                        elevation: !!environmentService.options?.tunnelProvider?.features?.elevation,
                        public: !!environmentService.options?.tunnelProvider?.features?.public,
                        privacyOptions,
                        protocol: environmentService.options?.tunnelProvider?.features?.protocol === undefined
                            ? true
                            : !!environmentService.options?.tunnelProvider?.features?.protocol,
                    },
                }
                : undefined;
            remoteExplorerService.setTunnelInformation(tunnelInformation);
        }
    }
    async resolveExternalUri(uri) {
        try {
            return (await this.openerService.resolveExternalUri(URI.parse(uri))).resolved.toString();
        }
        catch {
            return uri;
        }
    }
};
TunnelFactoryContribution = __decorate([
    __param(0, ITunnelService),
    __param(1, IBrowserWorkbenchEnvironmentService),
    __param(2, IOpenerService),
    __param(3, IRemoteExplorerService),
    __param(4, ILogService),
    __param(5, IContextKeyService)
], TunnelFactoryContribution);
export { TunnelFactoryContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHVubmVsRmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3JlbW90ZS9icm93c2VyL3R1bm5lbEZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQ04sY0FBYyxFQUtkLGNBQWMsRUFDZCxlQUFlLEdBQ2YsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDakgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFdkYsSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSxVQUFVO2FBQ3hDLE9BQUUsR0FBRyxpQ0FBaUMsQUFBcEMsQ0FBb0M7SUFFdEQsWUFDaUIsYUFBNkIsRUFDUixrQkFBdUQsRUFDcEUsYUFBNkIsRUFDN0IscUJBQTZDLEVBQ3hELFVBQXVCLEVBQ2hCLGlCQUFxQztRQUV6RCxLQUFLLEVBQUUsQ0FBQTtRQUxpQixrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFNckQsTUFBTSxhQUFhLEdBQUcsa0JB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