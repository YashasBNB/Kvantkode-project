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
var BrowserWorkspacesService_1;
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IWorkspacesService, restoreRecentlyOpened, isRecentFile, isRecentFolder, toStoreData, getStoredWorkspaceFolder, isRecentWorkspace, } from '../../../../platform/workspaces/common/workspaces.js';
import { Emitter } from '../../../../base/common/event.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { isTemporaryWorkspace, IWorkspaceContextService, WORKSPACE_EXTENSION, } from '../../../../platform/workspace/common/workspace.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { getWorkspaceIdentifier } from './workspaces.js';
import { IFileService, } from '../../../../platform/files/common/files.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { joinPath } from '../../../../base/common/resources.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { Schemas } from '../../../../base/common/network.js';
let BrowserWorkspacesService = class BrowserWorkspacesService extends Disposable {
    static { BrowserWorkspacesService_1 = this; }
    static { this.RECENTLY_OPENED_KEY = 'recently.opened'; }
    constructor(storageService, contextService, logService, fileService, environmentService, uriIdentityService) {
        super();
        this.storageService = storageService;
        this.contextService = contextService;
        this.logService = logService;
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.uriIdentityService = uriIdentityService;
        this._onRecentlyOpenedChange = this._register(new Emitter());
        this.onDidChangeRecentlyOpened = this._onRecentlyOpenedChange.event;
        // Opening a workspace should push it as most
        // recently used to the workspaces history
        this.addWorkspaceToRecentlyOpened();
        this.registerListeners();
    }
    registerListeners() {
        // Storage
        this._register(this.storageService.onDidChangeValue(-1 /* StorageScope.APPLICATION */, BrowserWorkspacesService_1.RECENTLY_OPENED_KEY, this._store)(() => this._onRecentlyOpenedChange.fire()));
        // Workspace
        this._register(this.contextService.onDidChangeWorkspaceFolders((e) => this.onDidChangeWorkspaceFolders(e)));
    }
    onDidChangeWorkspaceFolders(e) {
        if (!isTemporaryWorkspace(this.contextService.getWorkspace())) {
            return;
        }
        // When in a temporary workspace, make sure to track folder changes
        // in the history so that these can later be restored.
        for (const folder of e.added) {
            this.addRecentlyOpened([{ folderUri: folder.uri }]);
        }
    }
    addWorkspaceToRecentlyOpened() {
        const workspace = this.contextService.getWorkspace();
        const remoteAuthority = this.environmentService.remoteAuthority;
        switch (this.contextService.getWorkbenchState()) {
            case 2 /* WorkbenchState.FOLDER */:
                this.addRecentlyOpened([{ folderUri: workspace.folders[0].uri, remoteAuthority }]);
                break;
            case 3 /* WorkbenchState.WORKSPACE */:
                this.addRecentlyOpened([
                    {
                        workspace: { id: workspace.id, configPath: workspace.configuration },
                        remoteAuthority,
                    },
                ]);
                break;
        }
    }
    //#region Workspaces History
    async getRecentlyOpened() {
        const recentlyOpenedRaw = this.storageService.get(BrowserWorkspacesService_1.RECENTLY_OPENED_KEY, -1 /* StorageScope.APPLICATION */);
        if (recentlyOpenedRaw) {
            const recentlyOpened = restoreRecentlyOpened(JSON.parse(recentlyOpenedRaw), this.logService);
            recentlyOpened.workspaces = recentlyOpened.workspaces.filter((recent) => {
                // In web, unless we are in a temporary workspace, we cannot support
                // to switch to local folders because this would require a window
                // reload and local file access only works with explicit user gesture
                // from the current session.
                if (isRecentFolder(recent) &&
                    recent.folderUri.scheme === Schemas.file &&
                    !isTemporaryWorkspace(this.contextService.getWorkspace())) {
                    return false;
                }
                // Never offer temporary workspaces in the history
                if (isRecentWorkspace(recent) && isTemporaryWorkspace(recent.workspace.configPath)) {
                    return false;
                }
                return true;
            });
            return recentlyOpened;
        }
        return { workspaces: [], files: [] };
    }
    async addRecentlyOpened(recents) {
        const recentlyOpened = await this.getRecentlyOpened();
        for (const recent of recents) {
            if (isRecentFile(recent)) {
                this.doRemoveRecentlyOpened(recentlyOpened, [recent.fileUri]);
                recentlyOpened.files.unshift(recent);
            }
            else if (isRecentFolder(recent)) {
                this.doRemoveRecentlyOpened(recentlyOpened, [recent.folderUri]);
                recentlyOpened.workspaces.unshift(recent);
            }
            else {
                this.doRemoveRecentlyOpened(recentlyOpened, [recent.workspace.configPath]);
                recentlyOpened.workspaces.unshift(recent);
            }
        }
        return this.saveRecentlyOpened(recentlyOpened);
    }
    async removeRecentlyOpened(paths) {
        const recentlyOpened = await this.getRecentlyOpened();
        this.doRemoveRecentlyOpened(recentlyOpened, paths);
        return this.saveRecentlyOpened(recentlyOpened);
    }
    doRemoveRecentlyOpened(recentlyOpened, paths) {
        recentlyOpened.files = recentlyOpened.files.filter((file) => {
            return !paths.some((path) => path.toString() === file.fileUri.toString());
        });
        recentlyOpened.workspaces = recentlyOpened.workspaces.filter((workspace) => {
            return !paths.some((path) => path.toString() ===
                (isRecentFolder(workspace)
                    ? workspace.folderUri.toString()
                    : workspace.workspace.configPath.toString()));
        });
    }
    async saveRecentlyOpened(data) {
        return this.storageService.store(BrowserWorkspacesService_1.RECENTLY_OPENED_KEY, JSON.stringify(toStoreData(data)), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    async clearRecentlyOpened() {
        this.storageService.remove(BrowserWorkspacesService_1.RECENTLY_OPENED_KEY, -1 /* StorageScope.APPLICATION */);
    }
    //#endregion
    //#region Workspace Management
    async enterWorkspace(workspaceUri) {
        return { workspace: await this.getWorkspaceIdentifier(workspaceUri) };
    }
    async createUntitledWorkspace(folders, remoteAuthority) {
        const randomId = (Date.now() + Math.round(Math.random() * 1000)).toString();
        const newUntitledWorkspacePath = joinPath(this.environmentService.untitledWorkspacesHome, `Untitled-${randomId}.${WORKSPACE_EXTENSION}`);
        // Build array of workspace folders to store
        const storedWorkspaceFolder = [];
        if (folders) {
            for (const folder of folders) {
                storedWorkspaceFolder.push(getStoredWorkspaceFolder(folder.uri, true, folder.name, this.environmentService.untitledWorkspacesHome, this.uriIdentityService.extUri));
            }
        }
        // Store at untitled workspaces location
        const storedWorkspace = { folders: storedWorkspaceFolder, remoteAuthority };
        await this.fileService.writeFile(newUntitledWorkspacePath, VSBuffer.fromString(JSON.stringify(storedWorkspace, null, '\t')));
        return this.getWorkspaceIdentifier(newUntitledWorkspacePath);
    }
    async deleteUntitledWorkspace(workspace) {
        try {
            await this.fileService.del(workspace.configPath);
        }
        catch (error) {
            if (error.fileOperationResult !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                throw error; // re-throw any other error than file not found which is OK
            }
        }
    }
    async getWorkspaceIdentifier(workspaceUri) {
        return getWorkspaceIdentifier(workspaceUri);
    }
    //#endregion
    //#region Dirty Workspaces
    async getDirtyWorkspaces() {
        return []; // Currently not supported in web
    }
};
BrowserWorkspacesService = BrowserWorkspacesService_1 = __decorate([
    __param(0, IStorageService),
    __param(1, IWorkspaceContextService),
    __param(2, ILogService),
    __param(3, IFileService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, IUriIdentityService)
], BrowserWorkspacesService);
export { BrowserWorkspacesService };
registerSingleton(IWorkspacesService, BrowserWorkspacesService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3Jrc3BhY2VzL2Jyb3dzZXIvd29ya3NwYWNlc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sa0JBQWtCLEVBSWxCLHFCQUFxQixFQUVyQixZQUFZLEVBQ1osY0FBYyxFQUNkLFdBQVcsRUFFWCx3QkFBd0IsRUFFeEIsaUJBQWlCLEdBQ2pCLE1BQU0sc0RBQXNELENBQUE7QUFFN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLHdCQUF3QixFQUl4QixtQkFBbUIsR0FDbkIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQ3hELE9BQU8sRUFDTixZQUFZLEdBR1osTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxtQkFBbUIsRUFB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