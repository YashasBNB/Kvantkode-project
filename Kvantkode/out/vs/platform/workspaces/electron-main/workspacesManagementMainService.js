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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlc01hbmFnZW1lbnRNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd29ya3NwYWNlcy9lbGVjdHJvbi1tYWluL3dvcmtzcGFjZXNNYW5hZ2VtZW50TWFpblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxRQUFRLE1BQU0sVUFBVSxDQUFBO0FBQy9CLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDcEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzVELE9BQU8sRUFDTixRQUFRLEVBQ1IsMEJBQTBCLEVBQzFCLFFBQVEsRUFDUixjQUFjLEdBQ2QsTUFBTSxtQ0FBbUMsQ0FBQTtBQUUxQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMs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