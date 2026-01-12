/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IUserDataSyncEnablementService, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { UserDataSyncEnablementService } from './userDataSyncEnablementService.js';
export class WebUserDataSyncEnablementService extends UserDataSyncEnablementService {
    constructor() {
        super(...arguments);
        this.enabled = undefined;
    }
    canToggleEnablement() {
        return this.isTrusted() && super.canToggleEnablement();
    }
    isEnabled() {
        if (!this.isTrusted()) {
            return false;
        }
        if (this.enabled === undefined) {
            this.enabled = this.workbenchEnvironmentService.options?.settingsSyncOptions?.enabled;
        }
        if (this.enabled === undefined) {
            this.enabled = super.isEnabled();
        }
        return this.enabled;
    }
    setEnablement(enabled) {
        if (enabled && !this.canToggleEnablement()) {
            return;
        }
        if (this.enabled !== enabled) {
            this.enabled = enabled;
            super.setEnablement(enabled);
        }
    }
    getResourceSyncStateVersion(resource) {
        return resource === "extensions" /* SyncResource.Extensions */
            ? this.workbenchEnvironmentService.options?.settingsSyncOptions?.extensionsSyncStateVersion
            : undefined;
    }
    isTrusted() {
        return !!this.workbenchEnvironmentService.options?.workspaceProvider?.trusted;
    }
}
registerSingleton(IUserDataSyncEnablementService, WebUserDataSyncEnablementService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViVXNlckRhdGFTeW5jRW5hYmxlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVN5bmMvYnJvd3Nlci93ZWJVc2VyRGF0YVN5bmNFbmFibGVtZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUNOLDhCQUE4QixHQUU5QixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRWxGLE1BQU0sT0FBTyxnQ0FDWixTQUFRLDZCQUE2QjtJQUR0Qzs7UUFJUyxZQUFPLEdBQXdCLFNBQVMsQ0FBQTtJQXNDakQsQ0FBQztJQXBDUyxtQkFBbUI7UUFDM0IsT0FBTyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksS0FBSyxDQUFDLG1CQUFtQixFQUFFLENBQUE7SUFDdkQsQ0FBQztJQUVRLFNBQVM7UUFDakIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDO1lBQ3ZCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsT0FBTyxDQUFBO1FBQ3RGLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUE7UUFDakMsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQTtJQUNwQixDQUFDO0lBRVEsYUFBYSxDQUFDLE9BQWdCO1FBQ3RDLElBQUksT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQztZQUM1QyxPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQTtZQUN0QixLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzdCLENBQUM7SUFDRixDQUFDO0lBRVEsMkJBQTJCLENBQUMsUUFBc0I7UUFDMUQsT0FBTyxRQUFRLCtDQUE0QjtZQUMxQyxDQUFDLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSwwQkFBMEI7WUFDM0YsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtJQUNiLENBQUM7SUFFTyxTQUFTO1FBQ2hCLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxDQUFBO0lBQzlFLENBQUM7Q0FDRDtBQUVELGlCQUFpQixDQUNoQiw4QkFBOEIsRUFDOUIsZ0NBQWdDLG9DQUVoQyxDQUFBIn0=