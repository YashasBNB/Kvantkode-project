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
import { IBackupMainService } from '../../backup/electron-main/backup.js';
import { IWindowsMainService } from '../../windows/electron-main/windows.js';
import { IWorkspacesHistoryMainService } from './workspacesHistoryMainService.js';
import { IWorkspacesManagementMainService } from './workspacesManagementMainService.js';
let WorkspacesMainService = class WorkspacesMainService {
    constructor(workspacesManagementMainService, windowsMainService, workspacesHistoryMainService, backupMainService) {
        this.workspacesManagementMainService = workspacesManagementMainService;
        this.windowsMainService = windowsMainService;
        this.workspacesHistoryMainService = workspacesHistoryMainService;
        this.backupMainService = backupMainService;
        this.onDidChangeRecentlyOpened = this.workspacesHistoryMainService.onDidChangeRecentlyOpened;
    }
    //#region Workspace Management
    async enterWorkspace(windowId, path) {
        const window = this.windowsMainService.getWindowById(windowId);
        if (window) {
            return this.workspacesManagementMainService.enterWorkspace(window, this.windowsMainService.getWindows(), path);
        }
        return undefined;
    }
    createUntitledWorkspace(windowId, folders, remoteAuthority) {
        return this.workspacesManagementMainService.createUntitledWorkspace(folders, remoteAuthority);
    }
    deleteUntitledWorkspace(windowId, workspace) {
        return this.workspacesManagementMainService.deleteUntitledWorkspace(workspace);
    }
    getWorkspaceIdentifier(windowId, workspacePath) {
        return this.workspacesManagementMainService.getWorkspaceIdentifier(workspacePath);
    }
    getRecentlyOpened(windowId) {
        return this.workspacesHistoryMainService.getRecentlyOpened();
    }
    addRecentlyOpened(windowId, recents) {
        return this.workspacesHistoryMainService.addRecentlyOpened(recents);
    }
    removeRecentlyOpened(windowId, paths) {
        return this.workspacesHistoryMainService.removeRecentlyOpened(paths);
    }
    clearRecentlyOpened(windowId) {
        return this.workspacesHistoryMainService.clearRecentlyOpened();
    }
    //#endregion
    //#region Dirty Workspaces
    async getDirtyWorkspaces() {
        return this.backupMainService.getDirtyWorkspaces();
    }
};
WorkspacesMainService = __decorate([
    __param(0, IWorkspacesManagementMainService),
    __param(1, IWindowsMainService),
    __param(2, IWorkspacesHistoryMainService),
    __param(3, IBackupMainService)
], WorkspacesMainService);
export { WorkspacesMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlc01haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93b3Jrc3BhY2VzL2VsZWN0cm9uLW1haW4vd29ya3NwYWNlc01haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBUzVFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBSWhGLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXFCO0lBVWpDLFlBRWtCLCtCQUFpRSxFQUM1QyxrQkFBdUMsRUFFNUQsNEJBQTJELEVBQ3ZDLGlCQUFxQztRQUp6RCxvQ0FBK0IsR0FBL0IsK0JBQStCLENBQWtDO1FBQzVDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFFNUQsaUNBQTRCLEdBQTVCLDRCQUE0QixDQUErQjtRQUN2QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBRTFFLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMseUJBQXlCLENBQUE7SUFDN0YsQ0FBQztJQUVELDhCQUE4QjtJQUU5QixLQUFLLENBQUMsY0FBYyxDQUFDLFFBQWdCLEVBQUUsSUFBUztRQUMvQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzlELElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixPQUFPLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxjQUFjLENBQ3pELE1BQU0sRUFDTixJQUFJLENBQUMsa0JBQWtCLENBQUMsVUFBVSxFQUFFLEVBQ3BDLElBQUksQ0FDSixDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCx1QkFBdUIsQ0FDdEIsUUFBZ0IsRUFDaEIsT0FBd0MsRUFDeEMsZUFBd0I7UUFFeEIsT0FBTyxJQUFJLENBQUMsK0JBQStCLENBQUMsdUJBQXVCLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFBO0lBQzlGLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxRQUFnQixFQUFFLFNBQStCO1FBQ3hFLE9BQU8sSUFBSSxDQUFDLCtCQUErQixDQUFDLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQy9FLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxRQUFnQixFQUFFLGFBQWtCO1FBQzFELE9BQU8sSUFBSSxDQUFDLCtCQUErQixDQUFDLHNCQUFzQixDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQ2xGLENBQUM7SUFRRCxpQkFBaUIsQ0FBQyxRQUFnQjtRQUNqQyxPQUFPLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQzdELENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxRQUFnQixFQUFFLE9BQWtCO1FBQ3JELE9BQU8sSUFBSSxDQUFDLDRCQUE0QixDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3BFLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxRQUFnQixFQUFFLEtBQVk7UUFDbEQsT0FBTyxJQUFJLENBQUMsNEJBQTRCLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDckUsQ0FBQztJQUVELG1CQUFtQixDQUFDLFFBQWdCO1FBQ25DLE9BQU8sSUFBSSxDQUFDLDRCQUE0QixDQUFDLG1CQUFtQixFQUFFLENBQUE7SUFDL0QsQ0FBQztJQUVELFlBQVk7SUFFWiwwQkFBMEI7SUFFMUIsS0FBSyxDQUFDLGtCQUFrQjtRQUN2QixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO0lBQ25ELENBQUM7Q0FHRCxDQUFBO0FBbkZZLHFCQUFxQjtJQVcvQixXQUFBLGdDQUFnQyxDQUFBO0lBRWhDLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSw2QkFBNkIsQ0FBQTtJQUU3QixXQUFBLGtCQUFrQixDQUFBO0dBaEJSLHFCQUFxQixDQW1GakMifQ==