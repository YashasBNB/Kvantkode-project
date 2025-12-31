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
import { extHostCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext } from '../common/extHost.protocol.js';
import { IRemoteAuthorityResolverService } from '../../../platform/remote/common/remoteAuthorityResolver.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
let MainThreadRemoteConnectionData = class MainThreadRemoteConnectionData extends Disposable {
    constructor(extHostContext, _environmentService, remoteAuthorityResolverService) {
        super();
        this._environmentService = _environmentService;
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostExtensionService);
        const remoteAuthority = this._environmentService.remoteAuthority;
        if (remoteAuthority) {
            this._register(remoteAuthorityResolverService.onDidChangeConnectionData(() => {
                const connectionData = remoteAuthorityResolverService.getConnectionData(remoteAuthority);
                if (connectionData) {
                    this._proxy.$updateRemoteConnectionData(connectionData);
                }
            }));
        }
    }
};
MainThreadRemoteConnectionData = __decorate([
    extHostCustomer,
    __param(1, IWorkbenchEnvironmentService),
    __param(2, IRemoteAuthorityResolverService)
], MainThreadRemoteConnectionData);
export { MainThreadRemoteConnectionData };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFJlbW90ZUNvbm5lY3Rpb25EYXRhLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRSZW1vdGVDb25uZWN0aW9uRGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sZUFBZSxHQUVmLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFBZ0MsTUFBTSwrQkFBK0IsQ0FBQTtBQUM1RixPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0seURBQXlELENBQUE7QUFHL0YsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBK0IsU0FBUSxVQUFVO0lBRzdELFlBQ0MsY0FBK0IsRUFFWixtQkFBaUQsRUFFcEUsOEJBQStEO1FBRS9ELEtBQUssRUFBRSxDQUFBO1FBSlksd0JBQW1CLEdBQW5CLG1CQUFtQixDQUE4QjtRQUtwRSxJQUFJLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLENBQUE7UUFFN0UsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQTtRQUNoRSxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxTQUFTLENBQ2IsOEJBQThCLENBQUMseUJBQXlCLENBQUMsR0FBRyxFQUFFO2dCQUM3RCxNQUFNLGNBQWMsR0FBRyw4QkFBOEIsQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsQ0FBQTtnQkFDeEYsSUFBSSxjQUFjLEVBQUUsQ0FBQztvQkFDcEIsSUFBSSxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQyxjQUFjLENBQUMsQ0FBQTtnQkFDeEQsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUF6QlksOEJBQThCO0lBRDFDLGVBQWU7SUFNYixXQUFBLDRCQUE0QixDQUFBO0lBRTVCLFdBQUEsK0JBQStCLENBQUE7R0FQckIsOEJBQThCLENBeUIxQyJ9