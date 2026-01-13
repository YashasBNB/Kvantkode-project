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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHVubmVsRmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcmVtb3RlL2Jyb3dzZXIvdHVubmVsRmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFDTixjQUFjLEVBS2QsY0FBYyxFQUNkLGVBQWUsR0FDZixNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNqSCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUV2RixJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUEwQixTQUFRLFVBQVU7YUFDeEMsT0FBRSxHQUFHLGlDQUFpQyxBQUFwQyxDQUFvQztJQUV0RCxZQUNpQixhQUE2QixFQUNSLGtCQUF1RCxFQUNwRSxhQUE2QixFQUM3QixxQkFBNkMsRUFDeEQsVUFBdUIsRUFDaEIsaUJBQXFDO1FBRXpELEtBQUssRUFBRSxDQUFBO1FBTGlCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtR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