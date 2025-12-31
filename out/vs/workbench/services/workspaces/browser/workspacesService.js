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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya3NwYWNlcy9icm93c2VyL3dvcmtzcGFjZXNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUNOLGtCQUFrQixFQUlsQixxQkFBcUIsRUFFckIsWUFBWSxFQUNaLGNBQWMsRUFDZCxXQUFXLEVBRVgsd0JBQXdCLEVBRXhCLGlCQUFpQixHQUNqQixNQUFNLHNEQUFzRCxDQUFBO0FBRTdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUNOLG9CQUFvQixFQUNwQix3QkFBd0IsRUFJeEIsbUJBQW1CLEdBQ25CLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sWUFBWSxHQUdaLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDN0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUs1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