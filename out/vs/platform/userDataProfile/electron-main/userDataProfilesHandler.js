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
import { Disposable } from '../../../base/common/lifecycle.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { IUserDataProfilesMainService } from './userDataProfile.js';
import { toWorkspaceIdentifier } from '../../workspace/common/workspace.js';
import { RunOnceScheduler } from '../../../base/common/async.js';
import { IWindowsMainService } from '../../windows/electron-main/windows.js';
let UserDataProfilesHandler = class UserDataProfilesHandler extends Disposable {
    constructor(lifecycleMainService, userDataProfilesService, windowsMainService) {
        super();
        this.userDataProfilesService = userDataProfilesService;
        this.windowsMainService = windowsMainService;
        this._register(lifecycleMainService.onWillLoadWindow((e) => {
            if (e.reason === 2 /* LoadReason.LOAD */) {
                this.unsetProfileForWorkspace(e.window);
            }
        }));
        this._register(lifecycleMainService.onBeforeCloseWindow((window) => this.unsetProfileForWorkspace(window)));
        this._register(new RunOnceScheduler(() => this.cleanUpEmptyWindowAssociations(), 30 * 1000 /* after 30s */)).schedule();
    }
    async unsetProfileForWorkspace(window) {
        const workspace = this.getWorkspace(window);
        const profile = this.userDataProfilesService.getProfileForWorkspace(workspace);
        if (profile?.isTransient) {
            this.userDataProfilesService.unsetWorkspace(workspace, profile.isTransient);
            if (profile.isTransient) {
                await this.userDataProfilesService.cleanUpTransientProfiles();
            }
        }
    }
    getWorkspace(window) {
        return (window.openedWorkspace ??
            toWorkspaceIdentifier(window.backupPath, window.isExtensionDevelopmentHost));
    }
    cleanUpEmptyWindowAssociations() {
        const associatedEmptyWindows = this.userDataProfilesService.getAssociatedEmptyWindows();
        if (associatedEmptyWindows.length === 0) {
            return;
        }
        const openedWorkspaces = this.windowsMainService
            .getWindows()
            .map((window) => this.getWorkspace(window));
        for (const associatedEmptyWindow of associatedEmptyWindows) {
            if (openedWorkspaces.some((openedWorkspace) => openedWorkspace.id === associatedEmptyWindow.id)) {
                continue;
            }
            this.userDataProfilesService.unsetWorkspace(associatedEmptyWindow, false);
        }
    }
};
UserDataProfilesHandler = __decorate([
    __param(0, ILifecycleMainService),
    __param(1, IUserDataProfilesMainService),
    __param(2, IWindowsMainService)
], UserDataProfilesHandler);
export { UserDataProfilesHandler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlc0hhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhUHJvZmlsZS9lbGVjdHJvbi1tYWluL3VzZXJEYXRhUHJvZmlsZXNIYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUU3RixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUNuRSxPQUFPLEVBQTJCLHFCQUFxQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDaEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFckUsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBQ3RELFlBQ3dCLG9CQUEyQyxFQUVqRCx1QkFBcUQsRUFDaEMsa0JBQXVDO1FBRTdFLEtBQUssRUFBRSxDQUFBO1FBSFUsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUE4QjtRQUNoQyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBRzdFLElBQUksQ0FBQyxTQUFTLENBQ2Isb0JBQW9CLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMzQyxJQUFJLENBQUMsQ0FBQyxNQUFNLDRCQUFvQixFQUFFLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDeEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLG9CQUFvQixDQUFDLG1CQUFtQixDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FDM0YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsOEJBQThCLEVBQUUsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUM1RixDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQ2IsQ0FBQztJQUVPLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxNQUFtQjtRQUN6RCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzNDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUM5RSxJQUFJLE9BQU8sRUFBRSxXQUFXLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsdUJBQXVCLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDM0UsSUFBSSxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3pCLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixDQUFDLHdCQUF3QixFQUFFLENBQUE7WUFDOUQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sWUFBWSxDQUFDLE1BQW1CO1FBQ3ZDLE9BQU8sQ0FDTixNQUFNLENBQUMsZUFBZTtZQUN0QixxQkFBcUIsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxDQUMzRSxDQUFBO0lBQ0YsQ0FBQztJQUVPLDhCQUE4QjtRQUNyQyxNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyx5QkFBeUIsRUFBRSxDQUFBO1FBQ3ZGLElBQUksc0JBQXNCLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3pDLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsa0JBQWtCO2FBQzlDLFVBQVUsRUFBRTthQUNaLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQzVDLEtBQUssTUFBTSxxQkFBcUIsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO1lBQzVELElBQ0MsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBRSxLQUFLLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxFQUMxRixDQUFDO2dCQUNGLFNBQVE7WUFDVCxDQUFDO1lBQ0QsSUFBSSxDQUFDLHVCQUF1QixDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMxRSxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUExRFksdUJBQXVCO0lBRWpDLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSw0QkFBNEIsQ0FBQTtJQUU1QixXQUFBLG1CQUFtQixDQUFBO0dBTFQsdUJBQXVCLENBMERuQyJ9