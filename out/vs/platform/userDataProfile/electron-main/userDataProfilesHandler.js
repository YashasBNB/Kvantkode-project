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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlc0hhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVByb2ZpbGUvZWxlY3Ryb24tbWFpbi91c2VyRGF0YVByb2ZpbGVzSGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFFN0YsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDbkUsT0FBTyxFQUEyQixxQkFBcUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXJFLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsVUFBVTtJQUN0RCxZQUN3QixvQkFBMkMsRUFFakQsdUJBQXFELEVBQ2hDLGtCQUF1QztRQUU3RSxLQUFLLEVBQUUsQ0FBQTtRQUhVLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBOEI7UUFDaEMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUc3RSxJQUFJLENBQUMsU0FBUyxDQUNiLG9CQUFvQixDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDM0MsSUFBSSxDQUFDLENBQUMsTUFBTSw0QkFBb0IsRUFBRSxDQUFDO2dCQUNsQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3hDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixvQkFBb0IsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQzNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FDNUYsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUNiLENBQUM7SUFFTyxLQUFLLENBQUMsd0JBQXdCLENBQUMsTUFBbUI7UUFDekQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMzQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsc0JBQXNCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDOUUsSUFBSSxPQUFPLEVBQUUsV0FBVyxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLHVCQUF1QixDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQzNFLElBQUksT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN6QixNQUFNLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyx3QkFBd0IsRUFBRSxDQUFBO1lBQzlELENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLFlBQVksQ0FBQyxNQUFtQjtRQUN2QyxPQUFPLENBQ04sTUFBTSxDQUFDLGVBQWU7WUFDdEIscUJBQXFCLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsMEJBQTBCLENBQUMsQ0FDM0UsQ0FBQTtJQUNGLENBQUM7SUFFTyw4QkFBOEI7UUFDckMsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMseUJBQXlCLEVBQUUsQ0FBQTtRQUN2RixJQUFJLHNCQUFzQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN6QyxPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQjthQUM5QyxVQUFVLEVBQUU7YUFDWixHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUM1QyxLQUFLLE1BQU0scUJBQXFCLElBQUksc0JBQXNCLEVBQUUsQ0FBQztZQUM1RCxJQUNDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsZUFBZSxDQUFDLEVBQUUsS0FBSyxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsRUFDMUYsQ0FBQztnQkFDRixTQUFRO1lBQ1QsQ0FBQztZQUNELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxjQUFjLENBQUMscUJBQXFCLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDMUUsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBMURZLHVCQUF1QjtJQUVqQyxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsNEJBQTRCLENBQUE7SUFFNUIsV0FBQSxtQkFBbUIsQ0FBQTtHQUxULHVCQUF1QixDQTBEbkMifQ==