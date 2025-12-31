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
import { AbstractRequestService, IRequestService, } from '../../../../platform/request/common/request.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { request } from '../../../../base/parts/request/common/requestImpl.js';
import { ILoggerService } from '../../../../platform/log/common/log.js';
import { localize } from '../../../../nls.js';
import { windowLogGroup } from '../../log/common/logConstants.js';
import { LogService } from '../../../../platform/log/common/logService.js';
let NativeRequestService = class NativeRequestService extends AbstractRequestService {
    constructor(nativeHostService, configurationService, loggerService) {
        const logger = loggerService.createLogger(`network`, {
            name: localize('network', 'Network'),
            group: windowLogGroup,
        });
        const logService = new LogService(logger);
        super(logService);
        this.nativeHostService = nativeHostService;
        this.configurationService = configurationService;
        this._register(logger);
        this._register(logService);
    }
    async request(options, token) {
        if (!options.proxyAuthorization) {
            options.proxyAuthorization =
                this.configurationService.inspect('http.proxyAuthorization').userLocalValue;
        }
        return this.logAndRequest(options, () => request(options, token, () => navigator.onLine));
    }
    async resolveProxy(url) {
        return this.nativeHostService.resolveProxy(url);
    }
    async lookupAuthorization(authInfo) {
        return this.nativeHostService.lookupAuthorization(authInfo);
    }
    async lookupKerberosAuthorization(url) {
        return this.nativeHostService.lookupKerberosAuthorization(url);
    }
    async loadCertificates() {
        return this.nativeHostService.loadCertificates();
    }
};
NativeRequestService = __decorate([
    __param(0, INativeHostService),
    __param(1, IConfigurationService),
    __param(2, ILoggerService)
], NativeRequestService);
export { NativeRequestService };
registerSingleton(IRequestService, NativeRequestService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcmVxdWVzdC9lbGVjdHJvbi1zYW5kYm94L3JlcXVlc3RTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sc0JBQXNCLEVBR3RCLGVBQWUsR0FDZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBR2pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFFbkUsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxzQkFBc0I7SUFHL0QsWUFDc0MsaUJBQXFDLEVBQ2xDLG9CQUEyQyxFQUNuRSxhQUE2QjtRQUU3QyxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRTtZQUNwRCxJQUFJLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUM7WUFDcEMsS0FBSyxFQUFFLGNBQWM7U0FDckIsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxVQUFVLEdBQUcsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDekMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBVG9CLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDbEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQVNuRixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3RCLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBd0IsRUFBRSxLQUF3QjtRQUMvRCxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDakMsT0FBTyxDQUFDLGtCQUFrQjtnQkFDekIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBUyx5QkFBeUIsQ0FBQyxDQUFDLGNBQWMsQ0FBQTtRQUNyRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUMxRixDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FBQyxHQUFXO1FBQzdCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0lBRUQsS0FBSyxDQUFDLG1CQUFtQixDQUFDLFFBQWtCO1FBQzNDLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQzVELENBQUM7SUFFRCxLQUFLLENBQUMsMkJBQTJCLENBQUMsR0FBVztRQUM1QyxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUMvRCxDQUFDO0lBRUQsS0FBSyxDQUFDLGdCQUFnQjtRQUNyQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO0lBQ2pELENBQUM7Q0FDRCxDQUFBO0FBekNZLG9CQUFvQjtJQUk5QixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxjQUFjLENBQUE7R0FOSixvQkFBb0IsQ0F5Q2hDOztBQUVELGlCQUFpQixDQUFDLGVBQWUsRUFBRSxvQkFBb0Isb0NBQTRCLENBQUEifQ==