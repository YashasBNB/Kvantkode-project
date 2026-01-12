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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jRW5hYmxlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVN5bmMvYnJvd3Nlci91c2VyRGF0YVN5bmNFbmFibGVtZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUNOLDhCQUE4QixHQUU5QixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSw2QkFBNkIsSUFBSSxpQ0FBaUMsRUFBRSxNQUFNLDJFQUEyRSxDQUFBO0FBRzlKLE1BQU0sT0FBTyw2QkFDWixTQUFRLGlDQUFpQztJQUd6QyxJQUFjLDJCQUEyQjtRQUN4QyxPQUE0QyxJQUFJLENBQUMsa0JBQWtCLENBQUE7SUFDcEUsQ0FBQztJQUVRLDJCQUEyQixDQUFDLFFBQXNCO1FBQzFELE9BQU8sUUFBUSwrQ0FBNEI7WUFDMUMsQ0FBQyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsMEJBQTBCO1lBQzNGLENBQUMsQ0FBQyxTQUFTLENBQUE7SUFDYixDQUFDO0NBQ0Q7QUFFRCxpQkFBaUIsQ0FDaEIsOEJBQThCLEVBQzlCLDZCQUE2QixvQ0FFN0IsQ0FBQSJ9