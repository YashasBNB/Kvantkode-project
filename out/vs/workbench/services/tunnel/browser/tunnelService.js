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
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { AbstractTunnelService, ITunnelService, isTunnelProvider, } from '../../../../platform/tunnel/common/tunnel.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
let TunnelService = class TunnelService extends AbstractTunnelService {
    constructor(logService, environmentService, configurationService) {
        super(logService, configurationService);
        this.environmentService = environmentService;
    }
    isPortPrivileged(_port) {
        return false;
    }
    retainOrCreateTunnel(tunnelProvider, remoteHost, remotePort, _localHost, localPort, elevateIfNeeded, privacy, protocol) {
        const existing = this.getTunnelFromMap(remoteHost, remotePort);
        if (existing) {
            ++existing.refcount;
            return existing.value;
        }
        if (isTunnelProvider(tunnelProvider)) {
            return this.createWithProvider(tunnelProvider, remoteHost, remotePort, localPort, elevateIfNeeded, privacy, protocol);
        }
        return undefined;
    }
    canTunnel(uri) {
        return super.canTunnel(uri) && !!this.environmentService.remoteAuthority;
    }
};
TunnelService = __decorate([
    __param(0, ILogService),
    __param(1, IWorkbenchEnvironmentService),
    __param(2, IConfigurationService)
], TunnelService);
export { TunnelService };
registerSingleton(ITunnelService, TunnelService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHVubmVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90dW5uZWwvYnJvd3Nlci90dW5uZWxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFcEUsT0FBTyxFQUNOLHFCQUFxQixFQUVyQixjQUFjLEVBRWQsZ0JBQWdCLEdBQ2hCLE1BQU0sOENBQThDLENBQUE7QUFDckQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFdEYsSUFBTSxhQUFhLEdBQW5CLE1BQU0sYUFBYyxTQUFRLHFCQUFxQjtJQUN2RCxZQUNjLFVBQXVCLEVBQ0Usa0JBQWdELEVBQy9ELG9CQUEyQztRQUVsRSxLQUFLLENBQUMsVUFBVSxFQUFFLG9CQUFvQixDQUFDLENBQUE7UUFIRCx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQThCO0lBSXZGLENBQUM7SUFFTSxnQkFBZ0IsQ0FBQyxLQUFhO1FBQ3BDLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVTLG9CQUFvQixDQUM3QixjQUFrRCxFQUNsRCxVQUFrQixFQUNsQixVQUFrQixFQUNsQixVQUFrQixFQUNsQixTQUE2QixFQUM3QixlQUF3QixFQUN4QixPQUFnQixFQUNoQixRQUFpQjtRQUVqQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzlELElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxFQUFFLFFBQVEsQ0FBQyxRQUFRLENBQUE7WUFDbkIsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFBO1FBQ3RCLENBQUM7UUFFRCxJQUFJLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7WUFDdEMsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQzdCLGNBQWMsRUFDZCxVQUFVLEVBQ1YsVUFBVSxFQUNWLFNBQVMsRUFDVCxlQUFlLEVBQ2YsT0FBTyxFQUNQLFFBQVEsQ0FDUixDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFUSxTQUFTLENBQUMsR0FBUTtRQUMxQixPQUFPLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUE7SUFDekUsQ0FBQztDQUNELENBQUE7QUE5Q1ksYUFBYTtJQUV2QixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsNEJBQTRCLENBQUE7SUFDNUIsV0FBQSxxQkFBcUIsQ0FBQTtHQUpYLGFBQWEsQ0E4Q3pCOztBQUVELGlCQUFpQixDQUFDLGNBQWMsRUFBRSxhQUFhLG9DQUE0QixDQUFBIn0=