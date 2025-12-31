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
var BackupMainService_1;
import { createHash } from 'crypto';
import { isEqual } from '../../../base/common/extpath.js';
import { Schemas } from '../../../base/common/network.js';
import { join } from '../../../base/common/path.js';
import { isLinux } from '../../../base/common/platform.js';
import { extUriBiasedIgnorePathCase } from '../../../base/common/resources.js';
import { Promises, RimRafMode } from '../../../base/node/pfs.js';
import { isEmptyWindowBackupInfo, deserializeWorkspaceInfos, deserializeFolderInfos, } from '../node/backup.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { IStateService } from '../../state/node/state.js';
import { HotExitConfiguration } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
import { isFolderBackupInfo } from '../common/backup.js';
import { isWorkspaceIdentifier } from '../../workspace/common/workspace.js';
import { createEmptyWorkspaceIdentifier } from '../../workspaces/node/workspaces.js';
let BackupMainService = class BackupMainService {
    static { BackupMainService_1 = this; }
    static { this.backupWorkspacesMetadataStorageKey = 'backupWorkspaces'; }
    constructor(environmentMainService, configurationService, logService, stateService) {
        this.configurationService = configurationService;
        this.logService = logService;
        this.stateService = stateService;
        this.workspaces = [];
        this.folders = [];
        this.emptyWindows = [];
        // Comparers for paths and resources that will
        // - ignore path casing on Windows/macOS
        // - respect path casing on Linux
        this.backupUriComparer = extUriBiasedIgnorePathCase;
        this.backupPathComparer = {
            isEqual: (pathA, pathB) => isEqual(pathA, pathB, !isLinux),
        };
        this.backupHome = environmentMainService.backupHome;
    }
    async initialize() {
        // read backup workspaces
        const serializedBackupWorkspaces = this.stateService.getItem(BackupMainService_1.backupWorkspacesMetadataStorageKey) ?? { workspaces: [], folders: [], emptyWindows: [] };
        // validate empty workspaces backups first
        this.emptyWindows = await this.validateEmptyWorkspaces(serializedBackupWorkspaces.emptyWindows);
        // validate workspace backups
        this.workspaces = await this.validateWorkspaces(deserializeWorkspaceInfos(serializedBackupWorkspaces));
        // validate folder backups
        this.folders = await this.validateFolders(deserializeFolderInfos(serializedBackupWorkspaces));
        // store metadata in case some workspaces or folders have been removed
        this.storeWorkspacesMetadata();
    }
    getWorkspaceBackups() {
        if (this.isHotExitOnExitAndWindowClose()) {
            // Only non-folder windows are restored on main process launch when
            // hot exit is configured as onExitAndWindowClose.
            return [];
        }
        return this.workspaces.slice(0); // return a copy
    }
    getFolderBackups() {
        if (this.isHotExitOnExitAndWindowClose()) {
            // Only non-folder windows are restored on main process launch when
            // hot exit is configured as onExitAndWindowClose.
            return [];
        }
        return this.folders.slice(0); // return a copy
    }
    isHotExitEnabled() {
        return this.getHotExitConfig() !== HotExitConfiguration.OFF;
    }
    isHotExitOnExitAndWindowClose() {
        return this.getHotExitConfig() === HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE;
    }
    getHotExitConfig() {
        const config = this.configurationService.getValue();
        return config?.files?.hotExit || HotExitConfiguration.ON_EXIT;
    }
    getEmptyWindowBackups() {
        return this.emptyWindows.slice(0); // return a copy
    }
    registerWorkspaceBackup(workspaceInfo, migrateFrom) {
        if (!this.workspaces.some((workspace) => workspaceInfo.workspace.id === workspace.workspace.id)) {
            this.workspaces.push(workspaceInfo);
            this.storeWorkspacesMetadata();
        }
        const backupPath = join(this.backupHome, workspaceInfo.workspace.id);
        if (migrateFrom) {
            return this.moveBackupFolder(backupPath, migrateFrom).then(() => backupPath);
        }
        return backupPath;
    }
    async moveBackupFolder(backupPath, moveFromPath) {
        // Target exists: make sure to convert existing backups to empty window backups
        if (await Promises.exists(backupPath)) {
            await this.convertToEmptyWindowBackup(backupPath);
        }
        // When we have data to migrate from, move it over to the target location
        if (await Promises.exists(moveFromPath)) {
            try {
                await Promises.rename(moveFromPath, backupPath, false /* no retry */);
            }
            catch (error) {
                this.logService.error(`Backup: Could not move backup folder to new location: ${error.toString()}`);
            }
        }
    }
    registerFolderBackup(folderInfo) {
        if (!this.folders.some((folder) => this.backupUriComparer.isEqual(folderInfo.folderUri, folder.folderUri))) {
            this.folders.push(folderInfo);
            this.storeWorkspacesMetadata();
        }
        return join(this.backupHome, this.getFolderHash(folderInfo));
    }
    registerEmptyWindowBackup(emptyWindowInfo) {
        if (!this.emptyWindows.some((emptyWindow) => !!emptyWindow.backupFolder &&
            this.backupPathComparer.isEqual(emptyWindow.backupFolder, emptyWindowInfo.backupFolder))) {
            this.emptyWindows.push(emptyWindowInfo);
            this.storeWorkspacesMetadata();
        }
        return join(this.backupHome, emptyWindowInfo.backupFolder);
    }
    async validateWorkspaces(rootWorkspaces) {
        if (!Array.isArray(rootWorkspaces)) {
            return [];
        }
        const seenIds = new Set();
        const result = [];
        // Validate Workspaces
        for (const workspaceInfo of rootWorkspaces) {
            const workspace = workspaceInfo.workspace;
            if (!isWorkspaceIdentifier(workspace)) {
                return []; // wrong format, skip all entries
            }
            if (!seenIds.has(workspace.id)) {
                seenIds.add(workspace.id);
                const backupPath = join(this.backupHome, workspace.id);
                const hasBackups = await this.doHasBackups(backupPath);
                // If the workspace has no backups, ignore it
                if (hasBackups) {
                    if (workspace.configPath.scheme !== Schemas.file ||
                        (await Promises.exists(workspace.configPath.fsPath))) {
                        result.push(workspaceInfo);
                    }
                    else {
                        // If the workspace has backups, but the target workspace is missing, convert backups to empty ones
                        await this.convertToEmptyWindowBackup(backupPath);
                    }
                }
                else {
                    await this.deleteStaleBackup(backupPath);
                }
            }
        }
        return result;
    }
    async validateFolders(folderWorkspaces) {
        if (!Array.isArray(folderWorkspaces)) {
            return [];
        }
        const result = [];
        const seenIds = new Set();
        for (const folderInfo of folderWorkspaces) {
            const folderURI = folderInfo.folderUri;
            const key = this.backupUriComparer.getComparisonKey(folderURI);
            if (!seenIds.has(key)) {
                seenIds.add(key);
                const backupPath = join(this.backupHome, this.getFolderHash(folderInfo));
                const hasBackups = await this.doHasBackups(backupPath);
                // If the folder has no backups, ignore it
                if (hasBackups) {
                    if (folderURI.scheme !== Schemas.file || (await Promises.exists(folderURI.fsPath))) {
                        result.push(folderInfo);
                    }
                    else {
                        // If the folder has backups, but the target workspace is missing, convert backups to empty ones
                        await this.convertToEmptyWindowBackup(backupPath);
                    }
                }
                else {
                    await this.deleteStaleBackup(backupPath);
                }
            }
        }
        return result;
    }
    async validateEmptyWorkspaces(emptyWorkspaces) {
        if (!Array.isArray(emptyWorkspaces)) {
            return [];
        }
        const result = [];
        const seenIds = new Set();
        // Validate Empty Windows
        for (const backupInfo of emptyWorkspaces) {
            const backupFolder = backupInfo.backupFolder;
            if (typeof backupFolder !== 'string') {
                return [];
            }
            if (!seenIds.has(backupFolder)) {
                seenIds.add(backupFolder);
                const backupPath = join(this.backupHome, backupFolder);
                if (await this.doHasBackups(backupPath)) {
                    result.push(backupInfo);
                }
                else {
                    await this.deleteStaleBackup(backupPath);
                }
            }
        }
        return result;
    }
    async deleteStaleBackup(backupPath) {
        try {
            await Promises.rm(backupPath, RimRafMode.MOVE);
        }
        catch (error) {
            this.logService.error(`Backup: Could not delete stale backup: ${error.toString()}`);
        }
    }
    prepareNewEmptyWindowBackup() {
        // We are asked to prepare a new empty window backup folder.
        // Empty windows backup folders are derived from a workspace
        // identifier, so we generate a new empty workspace identifier
        // until we found a unique one.
        let emptyWorkspaceIdentifier = createEmptyWorkspaceIdentifier();
        while (this.emptyWindows.some((emptyWindow) => !!emptyWindow.backupFolder &&
            this.backupPathComparer.isEqual(emptyWindow.backupFolder, emptyWorkspaceIdentifier.id))) {
            emptyWorkspaceIdentifier = createEmptyWorkspaceIdentifier();
        }
        return { backupFolder: emptyWorkspaceIdentifier.id };
    }
    async convertToEmptyWindowBackup(backupPath) {
        const newEmptyWindowBackupInfo = this.prepareNewEmptyWindowBackup();
        // Rename backupPath to new empty window backup path
        const newEmptyWindowBackupPath = join(this.backupHome, newEmptyWindowBackupInfo.backupFolder);
        try {
            await Promises.rename(backupPath, newEmptyWindowBackupPath, false /* no retry */);
        }
        catch (error) {
            this.logService.error(`Backup: Could not rename backup folder: ${error.toString()}`);
            return false;
        }
        this.emptyWindows.push(newEmptyWindowBackupInfo);
        return true;
    }
    async getDirtyWorkspaces() {
        const dirtyWorkspaces = [];
        // Workspaces with backups
        for (const workspace of this.workspaces) {
            if (await this.hasBackups(workspace)) {
                dirtyWorkspaces.push(workspace);
            }
        }
        // Folders with backups
        for (const folder of this.folders) {
            if (await this.hasBackups(folder)) {
                dirtyWorkspaces.push(folder);
            }
        }
        return dirtyWorkspaces;
    }
    hasBackups(backupLocation) {
        let backupPath;
        // Empty
        if (isEmptyWindowBackupInfo(backupLocation)) {
            backupPath = join(this.backupHome, backupLocation.backupFolder);
        }
        // Folder
        else if (isFolderBackupInfo(backupLocation)) {
            backupPath = join(this.backupHome, this.getFolderHash(backupLocation));
        }
        // Workspace
        else {
            backupPath = join(this.backupHome, backupLocation.workspace.id);
        }
        return this.doHasBackups(backupPath);
    }
    async doHasBackups(backupPath) {
        try {
            const backupSchemas = await Promises.readdir(backupPath);
            for (const backupSchema of backupSchemas) {
                try {
                    const backupSchemaChildren = await Promises.readdir(join(backupPath, backupSchema));
                    if (backupSchemaChildren.length > 0) {
                        return true;
                    }
                }
                catch (error) {
                    // invalid folder
                }
            }
        }
        catch (error) {
            // backup path does not exist
        }
        return false;
    }
    storeWorkspacesMetadata() {
        const serializedBackupWorkspaces = {
            workspaces: this.workspaces.map(({ workspace, remoteAuthority }) => {
                const serializedWorkspaceBackupInfo = {
                    id: workspace.id,
                    configURIPath: workspace.configPath.toString(),
                };
                if (remoteAuthority) {
                    serializedWorkspaceBackupInfo.remoteAuthority = remoteAuthority;
                }
                return serializedWorkspaceBackupInfo;
            }),
            folders: this.folders.map(({ folderUri, remoteAuthority }) => {
                const serializedFolderBackupInfo = {
                    folderUri: folderUri.toString(),
                };
                if (remoteAuthority) {
                    serializedFolderBackupInfo.remoteAuthority = remoteAuthority;
                }
                return serializedFolderBackupInfo;
            }),
            emptyWindows: this.emptyWindows.map(({ backupFolder, remoteAuthority }) => {
                const serializedEmptyWindowBackupInfo = {
                    backupFolder,
                };
                if (remoteAuthority) {
                    serializedEmptyWindowBackupInfo.remoteAuthority = remoteAuthority;
                }
                return serializedEmptyWindowBackupInfo;
            }),
        };
        this.stateService.setItem(BackupMainService_1.backupWorkspacesMetadataStorageKey, serializedBackupWorkspaces);
    }
    getFolderHash(folder) {
        const folderUri = folder.folderUri;
        let key;
        if (folderUri.scheme === Schemas.file) {
            key = isLinux ? folderUri.fsPath : folderUri.fsPath.toLowerCase(); // for backward compatibility, use the fspath as key
        }
        else {
            key = folderUri.toString().toLowerCase();
        }
        return createHash('md5').update(key).digest('hex'); // CodeQL [SM04514] Using MD5 to convert a file path to a fixed length
    }
};
BackupMainService = BackupMainService_1 = __decorate([
    __param(0, IEnvironmentMainService),
    __param(1, IConfigurationService),
    __param(2, ILogService),
    __param(3, IStateService)
], BackupMainService);
export { BackupMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja3VwTWFpblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9iYWNrdXAvZWxlY3Ryb24tbWFpbi9iYWNrdXBNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUVoRSxPQUFPLEVBR04sdUJBQXVCLEVBQ3ZCLHlCQUF5QixFQUN6QixzQkFBc0IsR0FJdEIsTUFBTSxtQkFBbUIsQ0FBQTtBQUMxQixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDekQsT0FBTyxFQUFFLG9CQUFvQixFQUF1QixNQUFNLDZCQUE2QixDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRCxPQUFPLEVBQXFCLGtCQUFrQixFQUF3QixNQUFNLHFCQUFxQixDQUFBO0FBQ2pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxN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