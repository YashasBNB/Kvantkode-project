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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEVkaXRTZXNzaW9uSWRlbnRpdHlQYXJ0aWNpcGFudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRFZGl0U2Vzc2lvbklkZW50aXR5UGFydGljaXBhbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFDTixlQUFlLEdBRWYsTUFBTSxzREFBc0QsQ0FBQTtBQUU3RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRSxPQUFPLEVBRU4sMkJBQTJCLEdBQzNCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLGNBQWMsRUFBeUIsTUFBTSwrQkFBK0IsQ0FBQTtBQUdyRixNQUFNLDJDQUEyQztJQUloRCxZQUFZLGNBQStCO1FBRjFCLFlBQU8sR0FBRyxLQUFLLENBQUE7UUFHL0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQ3ZFLENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVyxDQUFDLGVBQWdDLEVBQUUsS0FBd0I7UUFDM0UsTUFBTSxDQUFDLEdBQUcsSUFBSSxPQUFPLENBQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDOUMsVUFBVSxDQUNULEdBQUcsRUFBRSxDQUNKLE1BQU0sQ0FDTCxJQUFJLEtBQUssQ0FDUixRQUFRLENBQ1AseUNBQXlDLEVBQ3pDLDZEQUE2RCxDQUM3RCxDQUNELENBQ0QsRUFDRixJQUFJLENBQUMsT0FBTyxDQUNaLENBQUE7WUFDRCxJQUFJLENBQUMsTUFBTTtpQkFDVCxnQ0FBZ0MsQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDO2lCQUMxRSxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3hCLENBQUMsQ0FBQyxDQUFBO1FBRUYsT0FBTyxxQkFBcUIsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDdkMsQ0FBQztDQUNEO0FBR00sSUFBTSxvQ0FBb0MsR0FBMUMsTUFBTSxvQ0FBb0M7SUFHaEQsWUFDQyxjQUErQixFQUNSLG9CQUEyQyxFQUVqRCwyQkFBd0Q7UUFBeEQsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUE2QjtRQUV6RSxJQUFJLENBQUMsMEJBQTBCO1lBQzlCLElBQUksQ0FBQywyQkFBMkIsQ0FBQyx1Q0FBdUMsQ0FDdkUsb0JBQW9CLENBQUMsY0FBYyxDQUNsQywyQ0FBMkMsRUFDM0MsY0FBYyxDQUNkLENBQ0QsQ0FBQTtJQUNILENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLDBCQUEwQixDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQzFDLENBQUM7Q0FDRCxDQUFBO0FBckJZLG9DQUFvQztJQURoRCxlQUFlO0lBTWIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLDJCQUEyQixDQUFBO0dBTmpCLG9DQUFvQyxDQXFCaEQifQ==