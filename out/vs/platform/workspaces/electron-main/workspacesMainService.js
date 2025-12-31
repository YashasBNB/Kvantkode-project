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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlc01haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd29ya3NwYWNlcy9lbGVjdHJvbi1tYWluL3dvcmtzcGFjZXNNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQVM1RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUloRixJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFxQjtJQVVqQyxZQUVrQiwrQkFBaUUsRUFDNUMsa0JBQXVDLEVBRTVELDRCQUEyRCxFQUN2QyxpQkFBcUM7UUFKekQsb0NBQStCLEdBQS9CLCtCQUErQixDQUFrQztRQUM1Qyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBRTVELGlDQUE0QixHQUE1Qiw0QkFBNEIsQ0FBK0I7UUFDdkMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUUxRSxJQUFJLENBQUMseUJBQXlCLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLHlCQUF5QixDQUFBO0lBQzdGLENBQUM7SUFFRCw4QkFBOEI7SUFFOUIsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFnQixFQUFFLElBQVM7UUFDL0MsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUM5RCxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osT0FBTyxJQUFJLENBQUMsK0JBQStCLENBQUMsY0FBYyxDQUN6RCxNQUFNLEVBQ04sSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxFQUNwQyxJQUFJLENBQ0osQ0FBQTtRQUNGLENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsdUJBQXVCLENBQ3RCLFFBQWdCLEVBQ2hCLE9BQXdDLEVBQ3hDLGVBQXdCO1FBRXhCLE9BQU8sSUFBSSxDQUFDLCtCQUErQixDQUFDLHVCQUF1QixDQUFDLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQTtJQUM5RixDQUFDO0lBRUQsdUJBQXVCLENBQUMsUUFBZ0IsRUFBRSxTQUErQjtRQUN4RSxPQUFPLElBQUksQ0FBQywrQkFBK0IsQ0FBQyx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUMvRSxDQUFDO0lBRUQsc0JBQXNCLENBQUMsUUFBZ0IsRUFBRSxhQUFrQjtRQUMxRCxPQUFPLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUNsRixDQUFDO0lBUUQsaUJBQWlCLENBQUMsUUFBZ0I7UUFDakMsT0FBTyxJQUFJLENBQUMsNEJBQTRCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtJQUM3RCxDQUFDO0lBRUQsaUJBQWlCLENBQUMsUUFBZ0IsRUFBRSxPQUFrQjtRQUNyRCxPQUFPLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNwRSxDQUFDO0lBRUQsb0JBQW9CLENBQUMsUUFBZ0IsRUFBRSxLQUFZO1FBQ2xELE9BQU8sSUFBSSxDQUFDLDRCQUE0QixDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3JFLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxRQUFnQjtRQUNuQyxPQUFPLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO0lBQy9ELENBQUM7SUFFRCxZQUFZO0lBRVosMEJBQTBCO0lBRTFCLEtBQUssQ0FBQyxrQkFBa0I7UUFDdkIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtJQUNuRCxDQUFDO0NBR0QsQ0FBQTtBQW5GWSxxQkFBcUI7SUFXL0IsV0FBQSxnQ0FBZ0MsQ0FBQTtJQUVoQyxXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsNkJBQTZCLENBQUE7SUFFN0IsV0FBQSxrQkFBa0IsQ0FBQTtHQWhCUixxQkFBcUIsQ0FtRmpDIn0=