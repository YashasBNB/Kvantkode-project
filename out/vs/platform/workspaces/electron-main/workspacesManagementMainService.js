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
import * as fs from 'fs';
import electron from 'electron';
import { Emitter } from '../../../base/common/event.js';
import { parse } from '../../../base/common/json.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { dirname, join } from '../../../base/common/path.js';
import { basename, extUriBiasedIgnorePathCase, joinPath, originalFSPath, } from '../../../base/common/resources.js';
import { Promises } from '../../../base/node/pfs.js';
import { localize } from '../../../nls.js';
import { IBackupMainService } from '../../backup/electron-main/backup.js';
import { IDialogMainService } from '../../dialogs/electron-main/dialogMainService.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IUserDataProfilesMainService } from '../../userDataProfile/electron-main/userDataProfile.js';
import { findWindowOnWorkspaceOrFolder } from '../../windows/electron-main/windowsFinder.js';
import { isWorkspaceIdentifier, hasWorkspaceFileExtension, UNTITLED_WORKSPACE_NAME, isUntitledWorkspace, } from '../../workspace/common/workspace.js';
import { getStoredWorkspaceFolder, isStoredWorkspaceFolder, toWorkspaceFolders, } from '../common/workspaces.js';
import { getWorkspaceIdentifier } from '../node/workspaces.js';
export const IWorkspacesManagementMainService = createDecorator('workspacesManagementMainService');
let WorkspacesManagementMainService = class WorkspacesManagementMainService extends Disposable {
    constructor(environmentMainService, logService, userDataProfilesMainService, backupMainService, dialogMainService) {
        super();
        this.environmentMainService = environmentMainService;
        this.logService = logService;
        this.userDataProfilesMainService = userDataProfilesMainService;
        this.backupMainService = backupMainService;
        this.dialogMainService = dialogMainService;
        this._onDidDeleteUntitledWorkspace = this._register(new Emitter());
        this.onDidDeleteUntitledWorkspace = this._onDidDeleteUntitledWorkspace.event;
        this._onDidEnterWorkspace = this._register(new Emitter());
        this.onDidEnterWorkspace = this._onDidEnterWorkspace.event;
        this.untitledWorkspaces = [];
        this.untitledWorkspacesHome = this.environmentMainService.untitledWorkspacesHome;
    }
    async initialize() {
        // Reset
        this.untitledWorkspaces = [];
        // Resolve untitled workspaces
        try {
            const untitledWorkspacePaths = (await Promises.readdir(this.untitledWorkspacesHome.with({ scheme: Schemas.file }).fsPath)).map((folder) => joinPath(this.untitledWorkspacesHome, folder, UNTITLED_WORKSPACE_NAME));
            for (const untitledWorkspacePath of untitledWorkspacePaths) {
                const workspace = getWorkspaceIdentifier(untitledWorkspacePath);
                const resolvedWorkspace = await this.resolveLocalWorkspace(untitledWorkspacePath);
                if (!resolvedWorkspace) {
                    await this.deleteUntitledWorkspace(workspace);
                }
                else {
                    this.untitledWorkspaces.push({
                        workspace,
                        remoteAuthority: resolvedWorkspace.remoteAuthority,
                    });
                }
            }
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                this.logService.warn(`Unable to read folders in ${this.untitledWorkspacesHome} (${error}).`);
            }
        }
    }
    resolveLocalWorkspace(uri) {
        return this.doResolveLocalWorkspace(uri, (path) => fs.promises.readFile(path, 'utf8'));
    }
    doResolveLocalWorkspace(uri, contentsFn) {
        if (!this.isWorkspacePath(uri)) {
            return undefined; // does not look like a valid workspace config file
        }
        if (uri.scheme !== Schemas.file) {
            return undefined;
        }
        try {
            const contents = contentsFn(uri.fsPath);
            if (contents instanceof Promise) {
                return contents.then((value) => this.doResolveWorkspace(uri, value), (error) => undefined /* invalid workspace */);
            }
            else {
                return this.doResolveWorkspace(uri, contents);
            }
        }
        catch {
            return undefined; // invalid workspace
        }
    }
    isWorkspacePath(uri) {
        return isUntitledWorkspace(uri, this.environmentMainService) || hasWorkspaceFileExtension(uri);
    }
    doResolveWorkspace(path, contents) {
        try {
            const workspace = this.doParseStoredWorkspace(path, contents);
            const workspaceIdentifier = getWorkspaceIdentifier(path);
            return {
                id: workspaceIdentifier.id,
                configPath: workspaceIdentifier.configPath,
                folders: toWorkspaceFolders(workspace.folders, workspaceIdentifier.configPath, extUriBiasedIgnorePathCase),
                remoteAuthority: workspace.remoteAuthority,
                transient: workspace.transient,
            };
        }
        catch (error) {
            this.logService.warn(error.toString());
        }
        return undefined;
    }
    doParseStoredWorkspace(path, contents) {
        // Parse workspace file
        const storedWorkspace = parse(contents); // use fault tolerant parser
        // Filter out folders which do not have a path or uri set
        if (storedWorkspace && Array.isArray(storedWorkspace.folders)) {
            storedWorkspace.folders = storedWorkspace.folders.filter((folder) => isStoredWorkspaceFolder(folder));
        }
        else {
            throw new Error(`${path.toString(true)} looks like an invalid workspace file.`);
        }
        return storedWorkspace;
    }
    async createUntitledWorkspace(folders, remoteAuthority) {
        const { workspace, storedWorkspace } = this.newUntitledWorkspace(folders, remoteAuthority);
        const configPath = workspace.configPath.fsPath;
        await fs.promises.mkdir(dirname(configPath), { recursive: true });
        await Promises.writeFile(configPath, JSON.stringify(storedWorkspace, null, '\t'));
        this.untitledWorkspaces.push({ workspace, remoteAuthority });
        return workspace;
    }
    newUntitledWorkspace(folders = [], remoteAuthority) {
        const randomId = (Date.now() + Math.round(Math.random() * 1000)).toString();
        const untitledWorkspaceConfigFolder = joinPath(this.untitledWorkspacesHome, randomId);
        const untitledWorkspaceConfigPath = joinPath(untitledWorkspaceConfigFolder, UNTITLED_WORKSPACE_NAME);
        const storedWorkspaceFolder = [];
        for (const folder of folders) {
            storedWorkspaceFolder.push(getStoredWorkspaceFolder(folder.uri, true, folder.name, untitledWorkspaceConfigFolder, extUriBiasedIgnorePathCase));
        }
        return {
            workspace: getWorkspaceIdentifier(untitledWorkspaceConfigPath),
            storedWorkspace: { folders: storedWorkspaceFolder, remoteAuthority },
        };
    }
    async getWorkspaceIdentifier(configPath) {
        return getWorkspaceIdentifier(configPath);
    }
    isUntitledWorkspace(workspace) {
        return isUntitledWorkspace(workspace.configPath, this.environmentMainService);
    }
    async deleteUntitledWorkspace(workspace) {
        if (!this.isUntitledWorkspace(workspace)) {
            return; // only supported for untitled workspaces
        }
        // Delete from disk
        await this.doDeleteUntitledWorkspace(workspace);
        // unset workspace from profiles
        this.userDataProfilesMainService.unsetWorkspace(workspace);
        // Event
        this._onDidDeleteUntitledWorkspace.fire(workspace);
    }
    async doDeleteUntitledWorkspace(workspace) {
        const configPath = originalFSPath(workspace.configPath);
        try {
            // Delete Workspace
            await Promises.rm(dirname(configPath));
            // Mark Workspace Storage to be deleted
            const workspaceStoragePath = join(this.environmentMainService.workspaceStorageHome.with({ scheme: Schemas.file }).fsPath, workspace.id);
            if (await Promises.exists(workspaceStoragePath)) {
                await Promises.writeFile(join(workspaceStoragePath, 'obsolete'), '');
            }
            // Remove from list
            this.untitledWorkspaces = this.untitledWorkspaces.filter((untitledWorkspace) => untitledWorkspace.workspace.id !== workspace.id);
        }
        catch (error) {
            this.logService.warn(`Unable to delete untitled workspace ${configPath} (${error}).`);
        }
    }
    getUntitledWorkspaces() {
        return this.untitledWorkspaces;
    }
    async enterWorkspace(window, windows, path) {
        if (!window || !window.win || !window.isReady) {
            return undefined; // return early if the window is not ready or disposed
        }
        const isValid = await this.isValidTargetWorkspacePath(window, windows, path);
        if (!isValid) {
            return undefined; // return early if the workspace is not valid
        }
        const result = await this.doEnterWorkspace(window, getWorkspaceIdentifier(path));
        if (!result) {
            return undefined;
        }
        // Emit as event
        this._onDidEnterWorkspace.fire({ window, workspace: result.workspace });
        return result;
    }
    async isValidTargetWorkspacePath(window, windows, workspacePath) {
        if (!workspacePath) {
            return true;
        }
        if (isWorkspaceIdentifier(window.openedWorkspace) &&
            extUriBiasedIgnorePathCase.isEqual(window.openedWorkspace.configPath, workspacePath)) {
            return false; // window is already opened on a workspace with that path
        }
        // Prevent overwriting a workspace that is currently opened in another window
        if (findWindowOnWorkspaceOrFolder(windows, workspacePath)) {
            await this.dialogMainService.showMessageBox({
                type: 'info',
                buttons: [localize({ key: 'ok', comment: ['&& denotes a mnemonic'] }, '&&OK')],
                message: localize('workspaceOpenedMessage', "Unable to save workspace '{0}'", basename(workspacePath)),
                detail: localize('workspaceOpenedDetail', 'The workspace is already opened in another window. Please close that window first and then try again.'),
            }, electron.BrowserWindow.getFocusedWindow() ?? undefined);
            return false;
        }
        return true; // OK
    }
    async doEnterWorkspace(window, workspace) {
        if (!window.config) {
            return undefined;
        }
        window.focus();
        // Register window for backups and migrate current backups over
        let backupPath;
        if (!window.config.extensionDevelopmentPath) {
            if (window.config.backupPath) {
                backupPath = await this.backupMainService.registerWorkspaceBackup({ workspace, remoteAuthority: window.remoteAuthority }, window.config.backupPath);
            }
            else {
                backupPath = this.backupMainService.registerWorkspaceBackup({
                    workspace,
                    remoteAuthority: window.remoteAuthority,
                });
            }
        }
        // if the window was opened on an untitled workspace, delete it.
        if (isWorkspaceIdentifier(window.openedWorkspace) &&
            this.isUntitledWorkspace(window.openedWorkspace)) {
            await this.deleteUntitledWorkspace(window.openedWorkspace);
        }
        // Update window configuration properly based on transition to workspace
        window.config.workspace = workspace;
        window.config.backupPath = backupPath;
        return { workspace, backupPath };
    }
};
WorkspacesManagementMainService = __decorate([
    __param(0, IEnvironmentMainService),
    __param(1, ILogService),
    __param(2, IUserDataProfilesMainService),
    __param(3, IBackupMainService),
    __param(4, IDialogMainService)
], WorkspacesManagementMainService);
export { WorkspacesManagementMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlc01hbmFnZW1lbnRNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dvcmtzcGFjZXMvZWxlY3Ryb24tbWFpbi93b3Jrc3BhY2VzTWFuYWdlbWVudE1haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sUUFBUSxNQUFNLFVBQVUsQ0FBQTtBQUMvQixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3BELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM1RCxPQUFPLEVBQ04sUUFBUSxFQUNSLDBCQUEwQixFQUMxQixRQUFRLEVBQ1IsY0FBYyxHQUNkLE1BQU0sbUNBQW1DLENBQUE7QUFFMUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3BELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBRXJHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzVGLE9BQU8sRUFDTixxQkFBcUIsRUFHckIseUJBQXlCLEVBQ3pCLHVCQUF1QixFQUN2QixtQkFBbUIsR0FDbkIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBQ04sd0JBQXdCLEVBRXhCLHVCQUF1QixFQUt2QixrQkFBa0IsR0FDbEIsTUFBTSx5QkFBeUIsQ0FBQTtBQUNoQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUU5RCxNQUFNLENBQUMsTUFBTSxnQ0FBZ0MsR0FBRyxlQUFlLENBQzlELGlDQUFpQyxDQUNqQyxDQUFBO0FBa0NNLElBQU0sK0JBQStCLEdBQXJDLE1BQU0sK0JBQ1osU0FBUSxVQUFVO0lBa0JsQixZQUMwQixzQkFBZ0UsRUFDNUUsVUFBd0MsRUFFckQsMkJBQTBFLEVBQ3RELGlCQUFzRCxFQUN0RCxpQkFBc0Q7UUFFMUUsS0FBSyxFQUFFLENBQUE7UUFQbUMsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF5QjtRQUMzRCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBRXBDLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBOEI7UUFDckMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUNyQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBbkIxRCxrQ0FBNkIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM5RCxJQUFJLE9BQU8sRUFBd0IsQ0FDbkMsQ0FBQTtRQUNRLGlDQUE0QixHQUNwQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsS0FBSyxDQUFBO1FBRXhCLHlCQUFvQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQTBCLENBQUMsQ0FBQTtRQUNwRix3QkFBbUIsR0FBa0MsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQTtRQUlyRix1QkFBa0IsR0FBNkIsRUFBRSxDQUFBO1FBWXhELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsc0JBQXNCLENBQUE7SUFDakYsQ0FBQztJQUVELEtBQUssQ0FBQyxVQUFVO1FBQ2YsUUFBUTtRQUNSLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxFQUFFLENBQUE7UUFFNUIsOEJBQThCO1FBQzlCLElBQUksQ0FBQztZQUNKLE1BQU0sc0JBQXNCLEdBQUcsQ0FDOUIsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQ3pGLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLE1BQU0sRUFBRSx1QkFBdUIsQ0FBQyxDQUFDLENBQUE7WUFDekYsS0FBSyxNQUFNLHFCQUFxQixJQUFJLHNCQUFzQixFQUFFLENBQUM7Z0JBQzVELE1BQU0sU0FBUyxHQUFHLHNCQUFzQixDQUFDLHFCQUFxQixDQUFDLENBQUE7Z0JBQy9ELE1BQU0saUJBQWlCLEdBQUcsTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMscUJBQXFCLENBQUMsQ0FBQTtnQkFDakYsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7b0JBQ3hCLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUM5QyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQzt3QkFDNUIsU0FBUzt3QkFDVCxlQUFlLEVBQUUsaUJBQWlCLENBQUMsZUFBZTtxQkFDbEQsQ0FBQyxDQUFBO2dCQUNILENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUM3QixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyw2QkFBNkIsSUFBSSxDQUFDLHNCQUFzQixLQUFLLEtBQUssSUFBSSxDQUFDLENBQUE7WUFDN0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQscUJBQXFCLENBQUMsR0FBUTtRQUM3QixPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBQ3ZGLENBQUM7SUFVTyx1QkFBdUIsQ0FDOUIsR0FBUSxFQUNSLFVBQXNEO1FBRXRELElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDaEMsT0FBTyxTQUFTLENBQUEsQ0FBQyxtREFBbUQ7UUFDckUsQ0FBQztRQUVELElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDakMsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDdkMsSUFBSSxRQUFRLFlBQVksT0FBTyxFQUFFLENBQUM7Z0JBQ2pDLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FDbkIsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQzlDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQzVDLENBQUE7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQzlDLENBQUM7UUFDRixDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1IsT0FBTyxTQUFTLENBQUEsQ0FBQyxvQkFBb0I7UUFDdEMsQ0FBQztJQUNGLENBQUM7SUFFTyxlQUFlLENBQUMsR0FBUTtRQUMvQixPQUFPLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUMvRixDQUFDO0lBRU8sa0JBQWtCLENBQUMsSUFBUyxFQUFFLFFBQWdCO1FBQ3JELElBQUksQ0FBQztZQUNKLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDN0QsTUFBTSxtQkFBbUIsR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUN4RCxPQUFPO2dCQUNOLEVBQUUsRUFBRSxtQkFBbUIsQ0FBQyxFQUFFO2dCQUMxQixVQUFVLEVBQUUsbUJBQW1CLENBQUMsVUFBVTtnQkFDMUMsT0FBTyxFQUFFLGtCQUFrQixDQUMxQixTQUFTLENBQUMsT0FBTyxFQUNqQixtQkFBbUIsQ0FBQyxVQUFVLEVBQzlCLDBCQUEwQixDQUMxQjtnQkFDRCxlQUFlLEVBQUUsU0FBUyxDQUFDLGVBQWU7Z0JBQzFDLFNBQVMsRUFBRSxTQUFTLENBQUMsU0FBUzthQUM5QixDQUFBO1FBQ0YsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFDdkMsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTyxzQkFBc0IsQ0FBQyxJQUFTLEVBQUUsUUFBZ0I7UUFDekQsdUJBQXVCO1FBQ3ZCLE1BQU0sZUFBZSxHQUFxQixLQUFLLENBQUMsUUFBUSxDQUFDLENBQUEsQ0FBQyw0QkFBNEI7UUFFdEYseURBQXlEO1FBQ3pELElBQUksZUFBZSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDL0QsZUFBZSxDQUFDLE9BQU8sR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQ25FLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxDQUMvQixDQUFBO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsd0NBQXdDLENBQUMsQ0FBQTtRQUNoRixDQUFDO1FBRUQsT0FBTyxlQUFlLENBQUE7SUFDdkIsQ0FBQztJQUVELEtBQUssQ0FBQyx1QkFBdUIsQ0FDNUIsT0FBd0MsRUFDeEMsZUFBd0I7UUFFeEIsTUFBTSxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUUsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQzFGLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFBO1FBRTlDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDakUsTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUVqRixJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUE7UUFFNUQsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVPLG9CQUFvQixDQUMzQixVQUEwQyxFQUFFLEVBQzVDLGVBQXdCO1FBRXhCLE1BQU0sUUFBUSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDM0UsTUFBTSw2QkFBNkIsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sMkJBQTJCLEdBQUcsUUFBUSxDQUMzQyw2QkFBNkIsRUFDN0IsdUJBQXVCLENBQ3ZCLENBQUE7UUFFRCxNQUFNLHFCQUFxQixHQUE2QixFQUFFLENBQUE7UUFFMUQsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUM5QixxQkFBcUIsQ0FBQyxJQUFJLENBQ3pCLHdCQUF3QixDQUN2QixNQUFNLENBQUMsR0FBRyxFQUNWLElBQUksRUFDSixNQUFNLENBQUMsSUFBSSxFQUNYLDZCQUE2QixFQUM3QiwwQkFBMEIsQ0FDMUIsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU87WUFDTixTQUFTLEVBQUUsc0JBQXNCLENBQUMsMkJBQTJCLENBQUM7WUFDOUQsZUFBZSxFQUFFLEVBQUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGVBQWUsRUFBRTtTQUNwRSxDQUFBO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxVQUFlO1FBQzNDLE9BQU8sc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDMUMsQ0FBQztJQUVELG1CQUFtQixDQUFDLFNBQStCO1FBQ2xELE9BQU8sbUJBQW1CLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtJQUM5RSxDQUFDO0lBRUQsS0FBSyxDQUFDLHVCQUF1QixDQUFDLFNBQStCO1FBQzVELElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUMxQyxPQUFNLENBQUMseUNBQXlDO1FBQ2pELENBQUM7UUFFRCxtQkFBbUI7UUFDbkIsTUFBTSxJQUFJLENBQUMseUJBQXlCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFL0MsZ0NBQWdDO1FBQ2hDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFMUQsUUFBUTtRQUNSLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDbkQsQ0FBQztJQUVPLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxTQUErQjtRQUN0RSxNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3ZELElBQUksQ0FBQztZQUNKLG1CQUFtQjtZQUNuQixNQUFNLFFBQVEsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7WUFFdEMsdUNBQXVDO1lBQ3ZDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUNoQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFDdEYsU0FBUyxDQUFDLEVBQUUsQ0FDWixDQUFBO1lBQ0QsSUFBSSxNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDO2dCQUNqRCxNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ3JFLENBQUM7WUFFRCxtQkFBbUI7WUFDbkIsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQ3ZELENBQUMsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssU0FBUyxDQUFDLEVBQUUsQ0FDdEUsQ0FBQTtRQUNGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLHVDQUF1QyxVQUFVLEtBQUssS0FBSyxJQUFJLENBQUMsQ0FBQTtRQUN0RixDQUFDO0lBQ0YsQ0FBQztJQUVELHFCQUFxQjtRQUNwQixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQTtJQUMvQixDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FDbkIsTUFBbUIsRUFDbkIsT0FBc0IsRUFDdEIsSUFBUztRQUVULElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQy9DLE9BQU8sU0FBUyxDQUFBLENBQUMsc0RBQXNEO1FBQ3hFLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzVFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU8sU0FBUyxDQUFBLENBQUMsNkNBQTZDO1FBQy9ELENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNoRixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsZ0JBQWdCO1FBQ2hCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFBO1FBRXZFLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVPLEtBQUssQ0FBQywwQkFBMEIsQ0FDdkMsTUFBbUIsRUFDbkIsT0FBc0IsRUFDdEIsYUFBbUI7UUFFbkIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELElBQ0MscUJBQXFCLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQztZQUM3QywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsYUFBYSxDQUFDLEVBQ25GLENBQUM7WUFDRixPQUFPLEtBQUssQ0FBQSxDQUFDLHlEQUF5RDtRQUN2RSxDQUFDO1FBRUQsNkVBQTZFO1FBQzdFLElBQUksNkJBQTZCLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxFQUFFLENBQUM7WUFDM0QsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsY0FBYyxDQUMxQztnQkFDQyxJQUFJLEVBQUUsTUFBTTtnQkFDWixPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDOUUsT0FBTyxFQUFFLFFBQVEsQ0FDaEIsd0JBQXdCLEVBQ3hCLGdDQUFnQyxFQUNoQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQ3ZCO2dCQUNELE1BQU0sRUFBRSxRQUFRLENBQ2YsdUJBQXVCLEVBQ3ZCLHVHQUF1RyxDQUN2RzthQUNELEVBQ0QsUUFBUSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLFNBQVMsQ0FDdEQsQ0FBQTtZQUVELE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFBLENBQUMsS0FBSztJQUNsQixDQUFDO0lBRU8sS0FBSyxDQUFDLGdCQUFnQixDQUM3QixNQUFtQixFQUNuQixTQUErQjtRQUUvQixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFZCwrREFBK0Q7UUFDL0QsSUFBSSxVQUE4QixDQUFBO1FBQ2xDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDN0MsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUM5QixVQUFVLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLENBQ2hFLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRSxNQUFNLENBQUMsZUFBZSxFQUFFLEVBQ3RELE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUN4QixDQUFBO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFVBQVUsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLENBQUM7b0JBQzNELFNBQVM7b0JBQ1QsZUFBZSxFQUFFLE1BQU0sQ0FBQyxlQUFlO2lCQUN2QyxDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQztRQUVELGdFQUFnRTtRQUNoRSxJQUNDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUM7WUFDN0MsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsRUFDL0MsQ0FBQztZQUNGLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUMzRCxDQUFDO1FBRUQsd0VBQXdFO1FBQ3hFLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtRQUNuQyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUE7UUFFckMsT0FBTyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsQ0FBQTtJQUNqQyxDQUFDO0NBQ0QsQ0FBQTtBQXhWWSwrQkFBK0I7SUFvQnpDLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLDRCQUE0QixDQUFBO0lBRTVCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxrQkFBa0IsQ0FBQTtHQXpCUiwrQkFBK0IsQ0F3VjNDIn0=