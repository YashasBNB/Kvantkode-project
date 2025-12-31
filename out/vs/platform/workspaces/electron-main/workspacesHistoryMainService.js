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
var WorkspacesHistoryMainService_1;
import { app } from 'electron';
import { coalesce } from '../../../base/common/arrays.js';
import { ThrottledDelayer } from '../../../base/common/async.js';
import { Emitter } from '../../../base/common/event.js';
import { normalizeDriveLetter, splitRecentLabel } from '../../../base/common/labels.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { isMacintosh, isWindows } from '../../../base/common/platform.js';
import { basename, extUriBiasedIgnorePathCase, originalFSPath, } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { Promises } from '../../../base/node/pfs.js';
import { localize } from '../../../nls.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILifecycleMainService, } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { IApplicationStorageMainService } from '../../storage/electron-main/storageMainService.js';
import { isRecentFile, isRecentFolder, isRecentWorkspace, restoreRecentlyOpened, toStoreData, } from '../common/workspaces.js';
import { WORKSPACE_EXTENSION } from '../../workspace/common/workspace.js';
import { IWorkspacesManagementMainService } from './workspacesManagementMainService.js';
import { ResourceMap } from '../../../base/common/map.js';
import { IDialogMainService } from '../../dialogs/electron-main/dialogMainService.js';
export const IWorkspacesHistoryMainService = createDecorator('workspacesHistoryMainService');
let WorkspacesHistoryMainService = class WorkspacesHistoryMainService extends Disposable {
    static { WorkspacesHistoryMainService_1 = this; }
    static { this.MAX_TOTAL_RECENT_ENTRIES = 500; }
    static { this.RECENTLY_OPENED_STORAGE_KEY = 'history.recentlyOpenedPathsList'; }
    constructor(logService, workspacesManagementMainService, lifecycleMainService, applicationStorageMainService, dialogMainService) {
        super();
        this.logService = logService;
        this.workspacesManagementMainService = workspacesManagementMainService;
        this.lifecycleMainService = lifecycleMainService;
        this.applicationStorageMainService = applicationStorageMainService;
        this.dialogMainService = dialogMainService;
        this._onDidChangeRecentlyOpened = this._register(new Emitter());
        this.onDidChangeRecentlyOpened = this._onDidChangeRecentlyOpened.event;
        this.macOSRecentDocumentsUpdater = this._register(new ThrottledDelayer(800));
        this.registerListeners();
    }
    registerListeners() {
        // Install window jump list delayed after opening window
        // because perf measurements have shown this to be slow
        this.lifecycleMainService
            .when(4 /* LifecycleMainPhase.Eventually */)
            .then(() => this.handleWindowsJumpList());
        // Add to history when entering workspace
        this._register(this.workspacesManagementMainService.onDidEnterWorkspace((event) => this.addRecentlyOpened([
            { workspace: event.workspace, remoteAuthority: event.window.remoteAuthority },
        ])));
    }
    //#region Workspaces History
    async addRecentlyOpened(recentToAdd) {
        let workspaces = [];
        let files = [];
        for (const recent of recentToAdd) {
            // Workspace
            if (isRecentWorkspace(recent)) {
                if (!this.workspacesManagementMainService.isUntitledWorkspace(recent.workspace) &&
                    !this.containsWorkspace(workspaces, recent.workspace)) {
                    workspaces.push(recent);
                }
            }
            // Folder
            else if (isRecentFolder(recent)) {
                if (!this.containsFolder(workspaces, recent.folderUri)) {
                    workspaces.push(recent);
                }
            }
            // File
            else {
                const alreadyExistsInHistory = this.containsFile(files, recent.fileUri);
                const shouldBeFiltered = recent.fileUri.scheme === Schemas.file &&
                    WorkspacesHistoryMainService_1.COMMON_FILES_FILTER.indexOf(basename(recent.fileUri)) >= 0;
                if (!alreadyExistsInHistory && !shouldBeFiltered) {
                    files.push(recent);
                    // Add to recent documents (Windows only, macOS later)
                    if (isWindows && recent.fileUri.scheme === Schemas.file) {
                        app.addRecentDocument(recent.fileUri.fsPath);
                    }
                }
            }
        }
        const mergedEntries = await this.mergeEntriesFromStorage({ workspaces, files });
        workspaces = mergedEntries.workspaces;
        files = mergedEntries.files;
        if (workspaces.length > WorkspacesHistoryMainService_1.MAX_TOTAL_RECENT_ENTRIES) {
            workspaces.length = WorkspacesHistoryMainService_1.MAX_TOTAL_RECENT_ENTRIES;
        }
        if (files.length > WorkspacesHistoryMainService_1.MAX_TOTAL_RECENT_ENTRIES) {
            files.length = WorkspacesHistoryMainService_1.MAX_TOTAL_RECENT_ENTRIES;
        }
        await this.saveRecentlyOpened({ workspaces, files });
        this._onDidChangeRecentlyOpened.fire();
        // Schedule update to recent documents on macOS dock
        if (isMacintosh) {
            this.macOSRecentDocumentsUpdater.trigger(() => this.updateMacOSRecentDocuments());
        }
    }
    async removeRecentlyOpened(recentToRemove) {
        const keep = (recent) => {
            const uri = this.location(recent);
            for (const resourceToRemove of recentToRemove) {
                if (extUriBiasedIgnorePathCase.isEqual(resourceToRemove, uri)) {
                    return false;
                }
            }
            return true;
        };
        const mru = await this.getRecentlyOpened();
        const workspaces = mru.workspaces.filter(keep);
        const files = mru.files.filter(keep);
        if (workspaces.length !== mru.workspaces.length || files.length !== mru.files.length) {
            await this.saveRecentlyOpened({ files, workspaces });
            this._onDidChangeRecentlyOpened.fire();
            // Schedule update to recent documents on macOS dock
            if (isMacintosh) {
                this.macOSRecentDocumentsUpdater.trigger(() => this.updateMacOSRecentDocuments());
            }
        }
    }
    async clearRecentlyOpened(options) {
        if (options?.confirm) {
            const { response } = await this.dialogMainService.showMessageBox({
                type: 'warning',
                buttons: [
                    localize({ key: 'clearButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Clear'),
                    localize({ key: 'cancel', comment: ['&& denotes a mnemonic'] }, '&&Cancel'),
                ],
                message: localize('confirmClearRecentsMessage', 'Do you want to clear all recently opened files and workspaces?'),
                detail: localize('confirmClearDetail', 'This action is irreversible!'),
                cancelId: 1,
            });
            if (response !== 0) {
                return;
            }
        }
        await this.saveRecentlyOpened({ workspaces: [], files: [] });
        app.clearRecentDocuments();
        // Event
        this._onDidChangeRecentlyOpened.fire();
    }
    async getRecentlyOpened() {
        return this.mergeEntriesFromStorage();
    }
    async mergeEntriesFromStorage(existingEntries) {
        // Build maps for more efficient lookup of existing entries that
        // are passed in by storing based on workspace/file identifier
        const mapWorkspaceIdToWorkspace = new ResourceMap((uri) => extUriBiasedIgnorePathCase.getComparisonKey(uri));
        if (existingEntries?.workspaces) {
            for (const workspace of existingEntries.workspaces) {
                mapWorkspaceIdToWorkspace.set(this.location(workspace), workspace);
            }
        }
        const mapFileIdToFile = new ResourceMap((uri) => extUriBiasedIgnorePathCase.getComparisonKey(uri));
        if (existingEntries?.files) {
            for (const file of existingEntries.files) {
                mapFileIdToFile.set(this.location(file), file);
            }
        }
        // Merge in entries from storage, preserving existing known entries
        const recentFromStorage = await this.getRecentlyOpenedFromStorage();
        for (const recentWorkspaceFromStorage of recentFromStorage.workspaces) {
            const existingRecentWorkspace = mapWorkspaceIdToWorkspace.get(this.location(recentWorkspaceFromStorage));
            if (existingRecentWorkspace) {
                existingRecentWorkspace.label =
                    existingRecentWorkspace.label ?? recentWorkspaceFromStorage.label;
            }
            else {
                mapWorkspaceIdToWorkspace.set(this.location(recentWorkspaceFromStorage), recentWorkspaceFromStorage);
            }
        }
        for (const recentFileFromStorage of recentFromStorage.files) {
            const existingRecentFile = mapFileIdToFile.get(this.location(recentFileFromStorage));
            if (existingRecentFile) {
                existingRecentFile.label = existingRecentFile.label ?? recentFileFromStorage.label;
            }
            else {
                mapFileIdToFile.set(this.location(recentFileFromStorage), recentFileFromStorage);
            }
        }
        return {
            workspaces: [...mapWorkspaceIdToWorkspace.values()],
            files: [...mapFileIdToFile.values()],
        };
    }
    async getRecentlyOpenedFromStorage() {
        // Wait for global storage to be ready
        await this.applicationStorageMainService.whenReady;
        let storedRecentlyOpened = undefined;
        // First try with storage service
        const storedRecentlyOpenedRaw = this.applicationStorageMainService.get(WorkspacesHistoryMainService_1.RECENTLY_OPENED_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
        if (typeof storedRecentlyOpenedRaw === 'string') {
            try {
                storedRecentlyOpened = JSON.parse(storedRecentlyOpenedRaw);
            }
            catch (error) {
                this.logService.error('Unexpected error parsing opened paths list', error);
            }
        }
        return restoreRecentlyOpened(storedRecentlyOpened, this.logService);
    }
    async saveRecentlyOpened(recent) {
        // Wait for global storage to be ready
        await this.applicationStorageMainService.whenReady;
        // Store in global storage (but do not sync since this is mainly local paths)
        this.applicationStorageMainService.store(WorkspacesHistoryMainService_1.RECENTLY_OPENED_STORAGE_KEY, JSON.stringify(toStoreData(recent)), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    location(recent) {
        if (isRecentFolder(recent)) {
            return recent.folderUri;
        }
        if (isRecentFile(recent)) {
            return recent.fileUri;
        }
        return recent.workspace.configPath;
    }
    containsWorkspace(recents, candidate) {
        return !!recents.find((recent) => isRecentWorkspace(recent) && recent.workspace.id === candidate.id);
    }
    containsFolder(recents, candidate) {
        return !!recents.find((recent) => isRecentFolder(recent) && extUriBiasedIgnorePathCase.isEqual(recent.folderUri, candidate));
    }
    containsFile(recents, candidate) {
        return !!recents.find((recent) => extUriBiasedIgnorePathCase.isEqual(recent.fileUri, candidate));
    }
    //#endregion
    //#region macOS Dock / Windows JumpList
    static { this.MAX_MACOS_DOCK_RECENT_WORKSPACES = 7; } // prefer higher number of workspaces...
    static { this.MAX_MACOS_DOCK_RECENT_ENTRIES_TOTAL = 10; } // ...over number of files
    static { this.MAX_WINDOWS_JUMP_LIST_ENTRIES = 7; }
    // Exclude some very common files from the dock/taskbar
    static { this.COMMON_FILES_FILTER = ['COMMIT_EDITMSG', 'MERGE_MSG', 'git-rebase-todo']; }
    async handleWindowsJumpList() {
        if (!isWindows) {
            return; // only on windows
        }
        await this.updateWindowsJumpList();
        this._register(this.onDidChangeRecentlyOpened(() => this.updateWindowsJumpList()));
    }
    async updateWindowsJumpList() {
        if (!isWindows) {
            return; // only on windows
        }
        const jumpList = [];
        // Tasks
        jumpList.push({
            type: 'tasks',
            items: [
                {
                    type: 'task',
                    title: localize('newWindow', 'New Window'),
                    description: localize('newWindowDesc', 'Opens a new window'),
                    program: process.execPath,
                    args: '-n', // force new window
                    iconPath: process.execPath,
                    iconIndex: 0,
                },
            ],
        });
        // Recent Workspaces
        if ((await this.getRecentlyOpened()).workspaces.length > 0) {
            // The user might have meanwhile removed items from the jump list and we have to respect that
            // so we need to update our list of recent paths with the choice of the user to not add them again
            // Also: Windows will not show our custom category at all if there is any entry which was removed
            // by the user! See https://github.com/microsoft/vscode/issues/15052
            const toRemove = [];
            for (const item of app.getJumpListSettings().removedItems) {
                const args = item.args;
                if (args) {
                    const match = /^--(folder|file)-uri\s+"([^"]+)"$/.exec(args);
                    if (match) {
                        toRemove.push(URI.parse(match[2]));
                    }
                }
            }
            await this.removeRecentlyOpened(toRemove);
            // Add entries
            let hasWorkspaces = false;
            const items = coalesce((await this.getRecentlyOpened()).workspaces
                .slice(0, WorkspacesHistoryMainService_1.MAX_WINDOWS_JUMP_LIST_ENTRIES)
                .map((recent) => {
                const workspace = isRecentWorkspace(recent) ? recent.workspace : recent.folderUri;
                const { title, description } = this.getWindowsJumpListLabel(workspace, recent.label);
                let args;
                if (URI.isUri(workspace)) {
                    args = `--folder-uri "${workspace.toString()}"`;
                }
                else {
                    hasWorkspaces = true;
                    args = `--file-uri "${workspace.configPath.toString()}"`;
                }
                return {
                    type: 'task',
                    title: title.substr(0, 255), // Windows seems to be picky around the length of entries
                    description: description.substr(0, 255), // (see https://github.com/microsoft/vscode/issues/111177)
                    program: process.execPath,
                    args,
                    iconPath: 'explorer.exe', // simulate folder icon
                    iconIndex: 0,
                };
            }));
            if (items.length > 0) {
                jumpList.push({
                    type: 'custom',
                    name: hasWorkspaces
                        ? localize('recentFoldersAndWorkspaces', 'Recent Folders & Workspaces')
                        : localize('recentFolders', 'Recent Folders'),
                    items,
                });
            }
        }
        // Recent
        jumpList.push({
            type: 'recent', // this enables to show files in the "recent" category
        });
        try {
            const res = app.setJumpList(jumpList);
            if (res && res !== 'ok') {
                this.logService.warn(`updateWindowsJumpList#setJumpList unexpected result: ${res}`);
            }
        }
        catch (error) {
            this.logService.warn('updateWindowsJumpList#setJumpList', error); // since setJumpList is relatively new API, make sure to guard for errors
        }
    }
    getWindowsJumpListLabel(workspace, recentLabel) {
        // Prefer recent label
        if (recentLabel) {
            return { title: splitRecentLabel(recentLabel).name, description: recentLabel };
        }
        // Single Folder
        if (URI.isUri(workspace)) {
            return {
                title: basename(workspace),
                description: this.renderJumpListPathDescription(workspace),
            };
        }
        // Workspace: Untitled
        if (this.workspacesManagementMainService.isUntitledWorkspace(workspace)) {
            return { title: localize('untitledWorkspace', 'Untitled (Workspace)'), description: '' };
        }
        // Workspace: normal
        let filename = basename(workspace.configPath);
        if (filename.endsWith(WORKSPACE_EXTENSION)) {
            filename = filename.substr(0, filename.length - WORKSPACE_EXTENSION.length - 1);
        }
        return {
            title: localize('workspaceName', '{0} (Workspace)', filename),
            description: this.renderJumpListPathDescription(workspace.configPath),
        };
    }
    renderJumpListPathDescription(uri) {
        return uri.scheme === 'file' ? normalizeDriveLetter(uri.fsPath) : uri.toString();
    }
    async updateMacOSRecentDocuments() {
        if (!isMacintosh) {
            return;
        }
        // We clear all documents first to ensure an up-to-date view on the set. Since entries
        // can get deleted on disk, this ensures that the list is always valid
        app.clearRecentDocuments();
        const mru = await this.getRecentlyOpened();
        // Collect max-N recent workspaces that are known to exist
        const workspaceEntries = [];
        let entries = 0;
        for (let i = 0; i < mru.workspaces.length &&
            entries < WorkspacesHistoryMainService_1.MAX_MACOS_DOCK_RECENT_WORKSPACES; i++) {
            const loc = this.location(mru.workspaces[i]);
            if (loc.scheme === Schemas.file) {
                const workspacePath = originalFSPath(loc);
                if (await Promises.exists(workspacePath)) {
                    workspaceEntries.push(workspacePath);
                    entries++;
                }
            }
        }
        // Collect max-N recent files that are known to exist
        const fileEntries = [];
        for (let i = 0; i < mru.files.length &&
            entries < WorkspacesHistoryMainService_1.MAX_MACOS_DOCK_RECENT_ENTRIES_TOTAL; i++) {
            const loc = this.location(mru.files[i]);
            if (loc.scheme === Schemas.file) {
                const filePath = originalFSPath(loc);
                if (WorkspacesHistoryMainService_1.COMMON_FILES_FILTER.includes(basename(loc)) || // skip some well known file entries
                    workspaceEntries.includes(filePath) // prefer a workspace entry over a file entry (e.g. for .code-workspace)
                ) {
                    continue;
                }
                if (await Promises.exists(filePath)) {
                    fileEntries.push(filePath);
                    entries++;
                }
            }
        }
        // The apple guidelines (https://developer.apple.com/design/human-interface-guidelines/macos/menus/menu-anatomy/)
        // explain that most recent entries should appear close to the interaction by the user (e.g. close to the
        // mouse click). Most native macOS applications that add recent documents to the dock, show the most recent document
        // to the bottom (because the dock menu is not appearing from top to bottom, but from the bottom to the top). As such
        // we fill in the entries in reverse order so that the most recent shows up at the bottom of the menu.
        //
        // On top of that, the maximum number of documents can be configured by the user (defaults to 10). To ensure that
        // we are not failing to show the most recent entries, we start by adding files first (in reverse order of recency)
        // and then add folders (in reverse order of recency). Given that strategy, we can ensure that the most recent
        // N folders are always appearing, even if the limit is low (https://github.com/microsoft/vscode/issues/74788)
        fileEntries.reverse().forEach((fileEntry) => app.addRecentDocument(fileEntry));
        workspaceEntries.reverse().forEach((workspaceEntry) => app.addRecentDocument(workspaceEntry));
    }
};
WorkspacesHistoryMainService = WorkspacesHistoryMainService_1 = __decorate([
    __param(0, ILogService),
    __param(1, IWorkspacesManagementMainService),
    __param(2, ILifecycleMainService),
    __param(3, IApplicationStorageMainService),
    __param(4, IDialogMainService)
], WorkspacesHistoryMainService);
export { WorkspacesHistoryMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlc0hpc3RvcnlNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dvcmtzcGFjZXMvZWxlY3Ryb24tbWFpbi93b3Jrc3BhY2VzSGlzdG9yeU1haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFrQyxNQUFNLFVBQVUsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBd0IsTUFBTSwrQkFBK0IsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDekUsT0FBTyxFQUNOLFFBQVEsRUFDUiwwQkFBMEIsRUFDMUIsY0FBYyxHQUNkLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSx1REFBdUQsQ0FBQTtB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