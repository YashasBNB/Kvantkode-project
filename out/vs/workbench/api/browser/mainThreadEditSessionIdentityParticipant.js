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
import { localize } from '../../../nls.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { extHostCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { raceCancellationError } from '../../../base/common/async.js';
import { IEditSessionIdentityService, } from '../../../platform/workspace/common/editSessions.js';
import { ExtHostContext } from '../common/extHost.protocol.js';
class ExtHostEditSessionIdentityCreateParticipant {
    constructor(extHostContext) {
        this.timeout = 10000;
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostWorkspace);
    }
    async participate(workspaceFolder, token) {
        const p = new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error(localize('timeout.onWillCreateEditSessionIdentity', 'Aborted onWillCreateEditSessionIdentity-event after 10000ms'))), this.timeout);
            this._proxy
                .$onWillCreateEditSessionIdentity(workspaceFolder.uri, token, this.timeout)
                .then(resolve, reject);
        });
        return raceCancellationError(p, token);
    }
}
let EditSessionIdentityCreateParticipant = class EditSessionIdentityCreateParticipant {
    constructor(extHostContext, instantiationService, _editSessionIdentityService) {
        this._editSessionIdentityService = _editSessionIdentityService;
        this._saveParticipantDisposable =
            this._editSessionIdentityService.addEditSessionIdentityCreateParticipant(instantiationService.createInstance(ExtHostEditSessionIdentityCreateParticipant, extHostContext));
    }
    dispose() {
        this._saveParticipantDisposable.dispose();
    }
};
EditSessionIdentityCreateParticipant = __decorate([
    extHostCustomer,
    __param(1, IInstantiationService),
    __param(2, IEditSessionIdentityService)
], EditSessionIdentityCreateParticipant);
export { EditSessionIdentityCreateParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEVkaXRTZXNzaW9uSWRlbnRpdHlQYXJ0aWNpcGFudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkRWRpdFNlc3Npb25JZGVudGl0eVBhcnRpY2lwYW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMvRixPQUFPLEVBQ04sZUFBZSxHQUVmLE1BQU0sc0RBQXNELENBQUE7QUFFN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckUsT0FBTyxFQUVOLDJCQUEyQixHQUMzQixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQXlCLE1BQU0sK0JBQStCLENBQUE7QUFHckYsTUFBTSwyQ0FBMkM7SUFJaEQsWUFBWSxjQUErQjtRQUYxQixZQUFPLEdBQUcsS0FBSyxDQUFBO1FBRy9CLElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUN2RSxDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxlQUFnQyxFQUFFLEtBQXdCO1FBQzNFLE1BQU0sQ0FBQyxHQUFHLElBQUksT0FBTyxDQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQzlDLFVBQVUsQ0FDVCxHQUFHLEVBQUUsQ0FDSixNQUFNLENBQ0wsSUFBSSxLQUFLLENBQ1IsUUFBUSxDQUNQLHlDQUF5QyxFQUN6Qyw2REFBNkQsQ0FDN0QsQ0FDRCxDQUNELEVBQ0YsSUFBSSxDQUFDLE9BQU8sQ0FDWixDQUFBO1lBQ0QsSUFBSSxDQUFDLE1BQU07aUJBQ1QsZ0NBQWdDLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQztpQkFDMUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN4QixDQUFDLENBQUMsQ0FBQTtRQUVGLE9BQU8scUJBQXFCLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7Q0FDRDtBQUdNLElBQU0sb0NBQW9DLEdBQTFDLE1BQU0sb0NBQW9DO0lBR2hELFlBQ0MsY0FBK0IsRUFDUixvQkFBMkMsRUFFakQsMkJBQXdEO1FBQXhELGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBNkI7UUFFekUsSUFBSSxDQUFDLDBCQUEwQjtZQUM5QixJQUFJLENBQUMsMkJBQTJCLENBQUMsdUNBQXVDLENBQ3ZFLG9CQUFvQixDQUFDLGNBQWMsQ0FDbEMsMkNBQTJDLEVBQzNDLGNBQWMsQ0FDZCxDQUNELENBQUE7SUFDSCxDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUMxQyxDQUFDO0NBQ0QsQ0FBQTtBQXJCWSxvQ0FBb0M7SUFEaEQsZUFBZTtJQU1iLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSwyQkFBMkIsQ0FBQTtHQU5qQixvQ0FBb0MsQ0FxQmhEIn0=