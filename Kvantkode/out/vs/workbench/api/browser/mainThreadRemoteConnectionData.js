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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFJlbW90ZUNvbm5lY3Rpb25EYXRhLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFJlbW90ZUNvbm5lY3Rpb25EYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixlQUFlLEdBRWYsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsY0FBYyxFQUFnQyxNQUFNLCtCQUErQixDQUFBO0FBQzVGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUcvRixJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUErQixTQUFRLFVBQVU7SUFHN0QsWUFDQyxjQUErQixFQUVaLG1CQUFpRCxFQUVwRSw4QkFBK0Q7UUFFL0QsS0FBSyxFQUFFLENBQUE7UUFKWSx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQThCO1FBS3BFLElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtRQUU3RSxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsZUFBZSxDQUFBO1FBQ2hFLElBQUksZUFBZSxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLFNBQVMsQ0FDYiw4QkFBOEIsQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLEVBQUU7Z0JBQzdELE1BQU0sY0FBYyxHQUFHLDhCQUE4QixDQUFDLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxDQUFBO2dCQUN4RixJQUFJLGNBQWMsRUFBRSxDQUFDO29CQUNwQixJQUFJLENBQUMsTUFBTSxDQUFDLDJCQUEyQixDQUFDLGNBQWMsQ0FBQyxDQUFBO2dCQUN4RCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXpCWSw4QkFBOEI7SUFEMUMsZUFBZTtJQU1iLFdBQUEsNEJBQTRCLENBQUE7SUFFNUIsV0FBQSwrQkFBK0IsQ0FBQTtHQVByQiw4QkFBOEIsQ0F5QjFDIn0=