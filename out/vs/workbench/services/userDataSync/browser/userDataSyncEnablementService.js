/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IUserDataSyncEnablementService, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { UserDataSyncEnablementService as BaseUserDataSyncEnablementService } from '../../../../platform/userDataSync/common/userDataSyncEnablementService.js';
export class UserDataSyncEnablementService extends BaseUserDataSyncEnablementService {
    get workbenchEnvironmentService() {
        return this.environmentService;
    }
    getResourceSyncStateVersion(resource) {
        return resource === "extensions" /* SyncResource.Extensions */
            ? this.workbenchEnvironmentService.options?.settingsSyncOptions?.extensionsSyncStateVersion
            : undefined;
    }
}
registerSingleton(IUserDataSyncEnablementService, UserDataSyncEnablementService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jRW5hYmxlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckRhdGFTeW5jL2Jyb3dzZXIvdXNlckRhdGFTeW5jRW5hYmxlbWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFDTiw4QkFBOEIsR0FFOUIsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsNkJBQTZCLElBQUksaUNBQWlDLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQTtBQUc5SixNQUFNLE9BQU8sNkJBQ1osU0FBUSxpQ0FBaUM7SUFHekMsSUFBYywyQkFBMkI7UUFDeEMsT0FBNEMsSUFBSSxDQUFDLGtCQUFrQixDQUFBO0lBQ3BFLENBQUM7SUFFUSwyQkFBMkIsQ0FBQyxRQUFzQjtRQUMxRCxPQUFPLFFBQVEsK0NBQTRCO1lBQzFDLENBQUMsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLDBCQUEwQjtZQUMzRixDQUFDLENBQUMsU0FBUyxDQUFBO0lBQ2IsQ0FBQztDQUNEO0FBRUQsaUJBQWlCLENBQ2hCLDhCQUE4QixFQUM5Qiw2QkFBNkIsb0NBRTdCLENBQUEifQ==