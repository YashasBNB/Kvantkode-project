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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zdG9yYWdlL2VsZWN0cm9uLXNhbmRib3gvc3RvcmFnZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFLNUYsTUFBTSxPQUFPLDZCQUE4QixTQUFRLG9CQUFvQjtJQUN0RSxZQUNDLFNBQThDLEVBQzdCLHNCQUErQyxFQUNoRSx1QkFBaUQsRUFDakQsa0JBQXVDLEVBQ3ZDLGtCQUF1QztRQUV2QyxLQUFLLENBQ0osU0FBUyxFQUNUO1lBQ0MsY0FBYyxFQUFFLHNCQUFzQixDQUFDLGNBQWM7WUFDckQsY0FBYyxFQUFFLHVCQUF1QixDQUFDLGNBQWM7U0FDdEQsRUFDRCxrQkFBa0IsRUFDbEIsa0JBQWtCLENBQ2xCLENBQUE7UUFiZ0IsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF5QjtRQWVoRSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHNCQUFzQixDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDM0QsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUN2QyxDQUNELENBQUE7SUFDRixDQUFDO0NBQ0QifQ==