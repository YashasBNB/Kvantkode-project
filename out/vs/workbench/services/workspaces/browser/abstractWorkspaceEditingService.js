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
import { localize } from '../../../../nls.js';
import { hasWorkspaceFileExtension, isSavedWorkspace, isUntitledWorkspace, isWorkspaceIdentifier, IWorkspaceContextService, toWorkspaceIdentifier, WORKSPACE_EXTENSION, WORKSPACE_FILTER, } from '../../../../platform/workspace/common/workspace.js';
import { IJSONEditingService, } from '../../configuration/common/jsonEditing.js';
import { IWorkspacesService, rewriteWorkspaceFileForNewLocation, } from '../../../../platform/workspaces/common/workspaces.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { distinct } from '../../../../base/common/arrays.js';
import { basename, isEqual, isEqualAuthority, joinPath, removeTrailingPathSeparator, } from '../../../../base/common/resources.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IFileDialogService, IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { IHostService } from '../../host/browser/host.js';
import { Schemas } from '../../../../base/common/network.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IWorkbenchConfigurationService } from '../../configuration/common/configuration.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
let AbstractWorkspaceEditingService = class AbstractWorkspaceEditingService extends Disposable {
    constructor(jsonEditingService, contextService, configurationService, notificationService, commandService, fileService, textFileService, workspacesService, environmentService, fileDialogService, dialogService, hostService, uriIdentityService, workspaceTrustManagementService, userDataProfilesService, userDataProfileService) {
        super();
        this.jsonEditingService = jsonEditingService;
        this.contextService = contextService;
        this.configurationService = configurationService;
        this.notificationService = notificationService;
        this.commandService = commandService;
        this.fileService = fileService;
        this.textFileService = textFileService;
        this.workspacesService = workspacesService;
        this.environmentService = environmentService;
        this.fileDialogService = fileDialogService;
        this.dialogService = dialogService;
        this.hostService = hostService;
        this.uriIdentityService = uriIdentityService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.userDataProfilesService = userDataProfilesService;
        this.userDataProfileService = userDataProfileService;
    }
    async pickNewWorkspacePath() {
        const availableFileSystems = [Schemas.file];
        if (this.environmentService.remoteAuthority) {
            availableFileSystems.unshift(Schemas.vscodeRemote);
        }
        let workspacePath = await this.fileDialogService.showSaveDialog({
            saveLabel: localize('save', 'Save'),
            title: localize('saveWorkspace', 'Save Workspace'),
            filters: WORKSPACE_FILTER,
            defaultUri: joinPath(await this.fileDialogService.defaultWorkspacePath(), this.getNewWorkspaceName()),
            availableFileSystems,
        });
        if (!workspacePath) {
            return; // canceled
        }
        if (!hasWorkspaceFileExtension(workspacePath)) {
            // Always ensure we have workspace file extension
            // (see https://github.com/microsoft/vscode/issues/84818)
            workspacePath = workspacePath.with({ path: `${workspacePath.path}.${WORKSPACE_EXTENSION}` });
        }
        return workspacePath;
    }
    getNewWorkspaceName() {
        // First try with existing workspace name
        const configPathURI = this.getCurrentWorkspaceIdentifier()?.configPath;
        if (configPathURI && isSavedWorkspace(configPathURI, this.environmentService)) {
            return basename(configPathURI);
        }
        // Then fallback to first folder if any
        const folder = this.contextService.getWorkspace().folders.at(0);
        if (folder) {
            return `${basename(folder.uri)}.${WORKSPACE_EXTENSION}`;
        }
        // Finally pick a good default
        return `workspace.${WORKSPACE_EXTENSION}`;
    }
    async updateFolders(index, deleteCount, foldersToAddCandidates, donotNotifyError) {
        const folders = this.contextService.getWorkspace().folders;
        let foldersToDelete = [];
        if (typeof deleteCount === 'number') {
            foldersToDelete = folders.slice(index, index + deleteCount).map((folder) => folder.uri);
        }
        let foldersToAdd = [];
        if (Array.isArray(foldersToAddCandidates)) {
            foldersToAdd = foldersToAddCandidates.map((folderToAdd) => ({
                uri: removeTrailingPathSeparator(folderToAdd.uri),
                name: folderToAdd.name,
            })); // Normalize
        }
        const wantsToDelete = foldersToDelete.length > 0;
        const wantsToAdd = foldersToAdd.length > 0;
        if (!wantsToAdd && !wantsToDelete) {
            return; // return early if there is nothing to do
        }
        // Add Folders
        if (wantsToAdd && !wantsToDelete) {
            return this.doAddFolders(foldersToAdd, index, donotNotifyError);
        }
        // Delete Folders
        if (wantsToDelete && !wantsToAdd) {
            return this.removeFolders(foldersToDelete);
        }
        // Add & Delete Folders
        else {
            // if we are in single-folder state and the folder is replaced with
            // other folders, we handle this specially and just enter workspace
            // mode with the folders that are being added.
            if (this.includesSingleFolderWorkspace(foldersToDelete)) {
                return this.createAndEnterWorkspace(foldersToAdd);
            }
            // if we are not in workspace-state, we just add the folders
            if (this.contextService.getWorkbenchState() !== 3 /* WorkbenchState.WORKSPACE */) {
                return this.doAddFolders(foldersToAdd, index, donotNotifyError);
            }
            // finally, update folders within the workspace
            return this.doUpdateFolders(foldersToAdd, foldersToDelete, index, donotNotifyError);
        }
    }
    async doUpdateFolders(foldersToAdd, foldersToDelete, index, donotNotifyError = false) {
        try {
            await this.contextService.updateFolders(foldersToAdd, foldersToDelete, index);
        }
        catch (error) {
            if (donotNotifyError) {
                throw error;
            }
            this.handleWorkspaceConfigurationEditingError(error);
        }
    }
    addFolders(foldersToAddCandidates, donotNotifyError = false) {
        // Normalize
        const foldersToAdd = foldersToAddCandidates.map((folderToAdd) => ({
            uri: removeTrailingPathSeparator(folderToAdd.uri),
            name: folderToAdd.name,
        }));
        return this.doAddFolders(foldersToAdd, undefined, donotNotifyError);
    }
    async doAddFolders(foldersToAdd, index, donotNotifyError = false) {
        const state = this.contextService.getWorkbenchState();
        const remoteAuthority = this.environmentService.remoteAuthority;
        if (remoteAuthority) {
            // https://github.com/microsoft/vscode/issues/94191
            foldersToAdd = foldersToAdd.filter((folder) => folder.uri.scheme !== Schemas.file &&
                (folder.uri.scheme !== Schemas.vscodeRemote ||
                    isEqualAuthority(folder.uri.authority, remoteAuthority)));
        }
        // If we are in no-workspace or single-folder workspace, adding folders has to
        // enter a workspace.
        if (state !== 3 /* WorkbenchState.WORKSPACE */) {
            let newWorkspaceFolders = this.contextService
                .getWorkspace()
                .folders.map((folder) => ({ uri: folder.uri }));
            newWorkspaceFolders.splice(typeof index === 'number' ? index : newWorkspaceFolders.length, 0, ...foldersToAdd);
            newWorkspaceFolders = distinct(newWorkspaceFolders, (folder) => this.uriIdentityService.extUri.getComparisonKey(folder.uri));
            if ((state === 1 /* WorkbenchState.EMPTY */ && newWorkspaceFolders.length === 0) ||
                (state === 2 /* WorkbenchState.FOLDER */ && newWorkspaceFolders.length === 1)) {
                return; // return if the operation is a no-op for the current state
            }
            return this.createAndEnterWorkspace(newWorkspaceFolders);
        }
        // Delegate addition of folders to workspace service otherwise
        try {
            await this.contextService.addFolders(foldersToAdd, index);
        }
        catch (error) {
            if (donotNotifyError) {
                throw error;
            }
            this.handleWorkspaceConfigurationEditingError(error);
        }
    }
    async removeFolders(foldersToRemove, donotNotifyError = false) {
        // If we are in single-folder state and the opened folder is to be removed,
        // we create an empty workspace and enter it.
        if (this.includesSingleFolderWorkspace(foldersToRemove)) {
            return this.createAndEnterWorkspace([]);
        }
        // Delegate removal of folders to workspace service otherwise
        try {
            await this.contextService.removeFolders(foldersToRemove);
        }
        catch (error) {
            if (donotNotifyError) {
                throw error;
            }
            this.handleWorkspaceConfigurationEditingError(error);
        }
    }
    includesSingleFolderWorkspace(folders) {
        if (this.contextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
            const workspaceFolder = this.contextService.getWorkspace().folders[0];
            return folders.some((folder) => this.uriIdentityService.extUri.isEqual(folder, workspaceFolder.uri));
        }
        return false;
    }
    async createAndEnterWorkspace(folders, path) {
        if (path && !(await this.isValidTargetWorkspacePath(path))) {
            return;
        }
        const remoteAuthority = this.environmentService.remoteAuthority;
        const untitledWorkspace = await this.workspacesService.createUntitledWorkspace(folders, remoteAuthority);
        if (path) {
            try {
                await this.saveWorkspaceAs(untitledWorkspace, path);
            }
            finally {
                await this.workspacesService.deleteUntitledWorkspace(untitledWorkspace); // https://github.com/microsoft/vscode/issues/100276
            }
        }
        else {
            path = untitledWorkspace.configPath;
            if (!this.userDataProfileService.currentProfile.isDefault) {
                await this.userDataProfilesService.setProfileForWorkspace(untitledWorkspace, this.userDataProfileService.currentProfile);
            }
        }
        return this.enterWorkspace(path);
    }
    async saveAndEnterWorkspace(workspaceUri) {
        const workspaceIdentifier = this.getCurrentWorkspaceIdentifier();
        if (!workspaceIdentifier) {
            return;
        }
        // Allow to save the workspace of the current window
        // if we have an identical match on the path
        if (isEqual(workspaceIdentifier.configPath, workspaceUri)) {
            return this.saveWorkspace(workspaceIdentifier);
        }
        // From this moment on we require a valid target that is not opened already
        if (!(await this.isValidTargetWorkspacePath(workspaceUri))) {
            return;
        }
        await this.saveWorkspaceAs(workspaceIdentifier, workspaceUri);
        return this.enterWorkspace(workspaceUri);
    }
    async isValidTargetWorkspacePath(workspaceUri) {
        return true; // OK
    }
    async saveWorkspaceAs(workspace, targetConfigPathURI) {
        const configPathURI = workspace.configPath;
        const isNotUntitledWorkspace = !isUntitledWorkspace(targetConfigPathURI, this.environmentService);
        if (isNotUntitledWorkspace && !this.userDataProfileService.currentProfile.isDefault) {
            const newWorkspace = await this.workspacesService.getWorkspaceIdentifier(targetConfigPathURI);
            await this.userDataProfilesService.setProfileForWorkspace(newWorkspace, this.userDataProfileService.currentProfile);
        }
        // Return early if target is same as source
        if (this.uriIdentityService.extUri.isEqual(configPathURI, targetConfigPathURI)) {
            return;
        }
        const isFromUntitledWorkspace = isUntitledWorkspace(configPathURI, this.environmentService);
        // Read the contents of the workspace file, update it to new location and save it.
        const raw = await this.fileService.readFile(configPathURI);
        const newRawWorkspaceContents = rewriteWorkspaceFileForNewLocation(raw.value.toString(), configPathURI, isFromUntitledWorkspace, targetConfigPathURI, this.uriIdentityService.extUri);
        await this.textFileService.create([
            {
                resource: targetConfigPathURI,
                value: newRawWorkspaceContents,
                options: { overwrite: true },
            },
        ]);
        // Set trust for the workspace file
        await this.trustWorkspaceConfiguration(targetConfigPathURI);
    }
    async saveWorkspace(workspace) {
        const configPathURI = workspace.configPath;
        // First: try to save any existing model as it could be dirty
        const existingModel = this.textFileService.files.get(configPathURI);
        if (existingModel) {
            await existingModel.save({ force: true, reason: 1 /* SaveReason.EXPLICIT */ });
            return;
        }
        // Second: if the file exists on disk, simply return
        const workspaceFileExists = await this.fileService.exists(configPathURI);
        if (workspaceFileExists) {
            return;
        }
        // Finally, we need to re-create the file as it was deleted
        const newWorkspace = { folders: [] };
        const newRawWorkspaceContents = rewriteWorkspaceFileForNewLocation(JSON.stringify(newWorkspace, null, '\t'), configPathURI, false, configPathURI, this.uriIdentityService.extUri);
        await this.textFileService.create([{ resource: configPathURI, value: newRawWorkspaceContents }]);
    }
    handleWorkspaceConfigurationEditingError(error) {
        switch (error.code) {
            case 0 /* JSONEditingErrorCode.ERROR_INVALID_FILE */:
                this.onInvalidWorkspaceConfigurationFileError();
                break;
            default:
                this.notificationService.error(error.message);
        }
    }
    onInvalidWorkspaceConfigurationFileError() {
        const message = localize('errorInvalidTaskConfiguration', 'Unable to write into workspace configuration file. Please open the file to correct errors/warnings in it and try again.');
        this.askToOpenWorkspaceConfigurationFile(message);
    }
    askToOpenWorkspaceConfigurationFile(message) {
        this.notificationService.prompt(Severity.Error, message, [
            {
                label: localize('openWorkspaceConfigurationFile', 'Open Workspace Configuration'),
                run: () => this.commandService.executeCommand('workbench.action.openWorkspaceConfigFile'),
            },
        ]);
    }
    async doEnterWorkspace(workspaceUri) {
        if (!!this.environmentService.extensionTestsLocationURI) {
            throw new Error('Entering a new workspace is not possible in tests.');
        }
        const workspace = await this.workspacesService.getWorkspaceIdentifier(workspaceUri);
        // Settings migration (only if we come from a folder workspace)
        if (this.contextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
            await this.migrateWorkspaceSettings(workspace);
        }
        await this.configurationService.initialize(workspace);
        return this.workspacesService.enterWorkspace(workspaceUri);
    }
    migrateWorkspaceSettings(toWorkspace) {
        return this.doCopyWorkspaceSettings(toWorkspace, (setting) => setting.scope === 4 /* ConfigurationScope.WINDOW */);
    }
    copyWorkspaceSettings(toWorkspace) {
        return this.doCopyWorkspaceSettings(toWorkspace);
    }
    doCopyWorkspaceSettings(toWorkspace, filter) {
        const configurationProperties = Registry.as(ConfigurationExtensions.Configuration).getConfigurationProperties();
        const targetWorkspaceConfiguration = {};
        for (const key of this.configurationService.keys().workspace) {
            if (configurationProperties[key]) {
                if (filter && !filter(configurationProperties[key])) {
                    continue;
                }
                targetWorkspaceConfiguration[key] = this.configurationService.inspect(key).workspaceValue;
            }
        }
        return this.jsonEditingService.write(toWorkspace.configPath, [{ path: ['settings'], value: targetWorkspaceConfiguration }], true);
    }
    async trustWorkspaceConfiguration(configPathURI) {
        if (this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */ &&
            this.workspaceTrustManagementService.isWorkspaceTrusted()) {
            await this.workspaceTrustManagementService.setUrisTrust([configPathURI], true);
        }
    }
    getCurrentWorkspaceIdentifier() {
        const identifier = toWorkspaceIdentifier(this.contextService.getWorkspace());
        if (isWorkspaceIdentifier(identifier)) {
            return identifier;
        }
        return undefined;
    }
};
AbstractWorkspaceEditingService = __decorate([
    __param(0, IJSONEditingService),
    __param(1, IWorkspaceContextService),
    __param(2, IWorkbenchConfigurationService),
    __param(3, INotificationService),
    __param(4, ICommandService),
    __param(5, IFileService),
    __param(6, ITextFileService),
    __param(7, IWorkspacesService),
    __param(8, IWorkbenchEnvironmentService),
    __param(9, IFileDialogService),
    __param(10, IDialogService),
    __param(11, IHostService),
    __param(12, IUriIdentityService),
    __param(13, IWorkspaceTrustManagementService),
    __param(14, IUserDataProfilesService),
    __param(15, IUserDataProfileService)
], AbstractWorkspaceEditingService);
export { AbstractWorkspaceEditingService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RXb3Jrc3BhY2VFZGl0aW5nU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3Jrc3BhY2VzL2Jyb3dzZXIvYWJzdHJhY3RXb3Jrc3BhY2VFZGl0aW5nU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUNOLHlCQUF5QixFQUN6QixnQkFBZ0IsRUFDaEIsbUJBQW1CLEVBQ25CLHFCQUFxQixFQUNyQix3QkFBd0IsRUFFeEIscUJBQXFCLEVBRXJCLG1CQUFtQixFQUNuQixnQkFBZ0IsR0FDaEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sbUJBQW1CLEdBR25CLE1BQU0sMkNBQTJDLENBQUE7QUFDbEQsT0FBTyxFQUVOLGtCQUFrQixFQUNsQixrQ0FBa0MsR0FHbEMsTUFBTSxzREFBc0QsQ0FBQTtBQUU3RCxPQUFPLEVBR04sVUFBVSxJQUFJLHVCQUF1QixHQUVyQyxNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFDTixRQUFRLEVBQ1IsT0FBTyxFQUNQLGdCQUFnQixFQUNoQixRQUFRLEVBQ1IsMkJBQTJCLEdBQzNCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixRQUFRLEdBQ1IsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0s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