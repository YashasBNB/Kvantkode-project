/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RemoteStorageService } from '../../../../platform/storage/common/storageService.js';
export class NativeWorkbenchStorageService extends RemoteStorageService {
    constructor(workspace, userDataProfileService, userDataProfilesService, mainProcessService, environmentService) {
        super(workspace, {
            currentProfile: userDataProfileService.currentProfile,
            defaultProfile: userDataProfilesService.defaultProfile,
        }, mainProcessService, environmentService);
        this.userDataProfileService = userDataProfileService;
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.userDataProfileService.onDidChangeCurrentProfile((e) => e.join(this.switchToProfile(e.profile))));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc3RvcmFnZS9lbGVjdHJvbi1zYW5kYm94L3N0b3JhZ2VTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBSzVGLE1BQU0sT0FBTyw2QkFBOEIsU0FBUSxvQkFBb0I7SUFDdEUsWUFDQyxTQUE4QyxFQUM3QixzQkFBK0MsRUFDaEUsdUJBQWlELEVBQ2pELGtCQUF1QyxFQUN2QyxrQkFBdUM7UUFFdkMsS0FBSyxDQUNKLFNBQVMsRUFDVDtZQUNDLGNBQWMsRUFBRSxzQkFBc0IsQ0FBQyxjQUFjO1lBQ3JELGNBQWMsRUFBRSx1QkFBdUIsQ0FBQyxjQUFjO1NBQ3RELEVBQ0Qsa0JBQWtCLEVBQ2xCLGtCQUFrQixDQUNsQixDQUFBO1FBYmdCLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBeUI7UUFlaEUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQzNELENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FDdkMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztDQUNEIn0=