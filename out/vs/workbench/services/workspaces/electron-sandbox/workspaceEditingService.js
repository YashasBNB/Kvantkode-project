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
import { IWorkspaceEditingService } from '../common/workspaceEditing.js';
import { URI } from '../../../../base/common/uri.js';
import { hasWorkspaceFileExtension, isUntitledWorkspace, isWorkspaceIdentifier, IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { IJSONEditingService } from '../../configuration/common/jsonEditing.js';
import { IWorkspacesService } from '../../../../platform/workspaces/common/workspaces.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IWorkingCopyBackupService } from '../../workingCopy/common/workingCopyBackup.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { basename } from '../../../../base/common/resources.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IFileDialogService, IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { IHostService } from '../../host/browser/host.js';
import { AbstractWorkspaceEditingService } from '../browser/abstractWorkspaceEditingService.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { WorkingCopyBackupService } from '../../workingCopy/common/workingCopyBackupService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IWorkbenchConfigurationService } from '../../configuration/common/configuration.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
let NativeWorkspaceEditingService = class NativeWorkspaceEditingService extends AbstractWorkspaceEditingService {
    constructor(jsonEditingService, contextService, nativeHostService, configurationService, storageService, extensionService, workingCopyBackupService, notificationService, commandService, fileService, textFileService, workspacesService, environmentService, fileDialogService, dialogService, lifecycleService, labelService, hostService, uriIdentityService, workspaceTrustManagementService, userDataProfilesService, userDataProfileService) {
        super(jsonEditingService, contextService, configurationService, notificationService, commandService, fileService, textFileService, workspacesService, environmentService, fileDialogService, dialogService, hostService, uriIdentityService, workspaceTrustManagementService, userDataProfilesService, userDataProfileService);
        this.nativeHostService = nativeHostService;
        this.storageService = storageService;
        this.extensionService = extensionService;
        this.workingCopyBackupService = workingCopyBackupService;
        this.lifecycleService = lifecycleService;
        this.labelService = labelService;
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.lifecycleService.onBeforeShutdown((e) => {
            const saveOperation = this.saveUntitledBeforeShutdown(e.reason);
            e.veto(saveOperation, 'veto.untitledWorkspace');
        }));
    }
    async saveUntitledBeforeShutdown(reason) {
        if (reason !== 4 /* ShutdownReason.LOAD */ && reason !== 1 /* ShutdownReason.CLOSE */) {
            return false; // only interested when window is closing or loading
        }
        const workspaceIdentifier = this.getCurrentWorkspaceIdentifier();
        if (!workspaceIdentifier ||
            !isUntitledWorkspace(workspaceIdentifier.configPath, this.environmentService)) {
            return false; // only care about untitled workspaces to ask for saving
        }
        const windowCount = await this.nativeHostService.getWindowCount();
        if (reason === 1 /* ShutdownReason.CLOSE */ && !isMacintosh && windowCount === 1) {
            return false; // Windows/Linux: quits when last window is closed, so do not ask then
        }
        const confirmSaveUntitledWorkspace = this.configurationService.getValue('window.confirmSaveUntitledWorkspace') !== false;
        if (!confirmSaveUntitledWorkspace) {
            await this.workspacesService.deleteUntitledWorkspace(workspaceIdentifier);
            return false; // no confirmation configured
        }
        let canceled = false;
        const { result, checkboxChecked } = await this.dialogService.prompt({
            type: Severity.Warning,
            message: localize('saveWorkspaceMessage', 'Do you want to save your workspace configuration as a file?'),
            detail: localize('saveWorkspaceDetail', 'Save your workspace if you plan to open it again.'),
            buttons: [
                {
                    label: localize({ key: 'save', comment: ['&& denotes a mnemonic'] }, '&&Save'),
                    run: async () => {
                        const newWorkspacePath = await this.pickNewWorkspacePath();
                        if (!newWorkspacePath || !hasWorkspaceFileExtension(newWorkspacePath)) {
                            return true; // keep veto if no target was provided
                        }
                        try {
                            await this.saveWorkspaceAs(workspaceIdentifier, newWorkspacePath);
                            // Make sure to add the new workspace to the history to find it again
                            const newWorkspaceIdentifier = await this.workspacesService.getWorkspaceIdentifier(newWorkspacePath);
                            await this.workspacesService.addRecentlyOpened([
                                {
                                    label: this.labelService.getWorkspaceLabel(newWorkspaceIdentifier, {
                                        verbose: 2 /* Verbosity.LONG */,
                                    }),
                                    workspace: newWorkspaceIdentifier,
                                    remoteAuthority: this.environmentService.remoteAuthority, // remember whether this was a remote window
                                },
                            ]);
                            // Delete the untitled one
                            await this.workspacesService.deleteUntitledWorkspace(workspaceIdentifier);
                        }
                        catch (error) {
                            // ignore
                        }
                        return false;
                    },
                },
                {
                    label: localize({ key: 'doNotSave', comment: ['&& denotes a mnemonic'] }, "Do&&n't Save"),
                    run: async () => {
                        await this.workspacesService.deleteUntitledWorkspace(workspaceIdentifier);
                        return false;
                    },
                },
            ],
            cancelButton: {
                run: () => {
                    canceled = true;
                    return true; // veto
                },
            },
            checkbox: {
                label: localize('doNotAskAgain', 'Always discard untitled workspaces without asking'),
            },
        });
        if (!canceled && checkboxChecked) {
            await this.configurationService.updateValue('window.confirmSaveUntitledWorkspace', false, 2 /* ConfigurationTarget.USER */);
        }
        return result;
    }
    async isValidTargetWorkspacePath(workspaceUri) {
        const windows = await this.nativeHostService.getWindows({ includeAuxiliaryWindows: false });
        // Prevent overwriting a workspace that is currently opened in another window
        if (windows.some((window) => isWorkspaceIdentifier(window.workspace) &&
            this.uriIdentityService.extUri.isEqual(window.workspace.configPath, workspaceUri))) {
            await this.dialogService.info(localize('workspaceOpenedMessage', "Unable to save workspace '{0}'", basename(workspaceUri)), localize('workspaceOpenedDetail', 'The workspace is already opened in another window. Please close that window first and then try again.'));
            return false;
        }
        return true; // OK
    }
    async enterWorkspace(workspaceUri) {
        const stopped = await this.extensionService.stopExtensionHosts(localize('restartExtensionHost.reason', 'Opening a multi-root workspace'));
        if (!stopped) {
            return;
        }
        const result = await this.doEnterWorkspace(workspaceUri);
        if (result) {
            // Migrate storage to new workspace
            await this.storageService.switch(result.workspace, true /* preserve data */);
            // Reinitialize backup service
            if (this.workingCopyBackupService instanceof WorkingCopyBackupService) {
                const newBackupWorkspaceHome = result.backupPath
                    ? URI.file(result.backupPath).with({
                        scheme: this.environmentService.userRoamingDataHome.scheme,
                    })
                    : undefined;
                this.workingCopyBackupService.reinitialize(newBackupWorkspaceHome);
            }
        }
        // TODO@aeschli: workaround until restarting works
        if (this.environmentService.remoteAuthority) {
            this.hostService.reload();
        }
        // Restart the extension host: entering a workspace means a new location for
        // storage and potentially a change in the workspace.rootPath property.
        else {
            this.extensionService.startExtensionHosts();
        }
    }
};
NativeWorkspaceEditingService = __decorate([
    __param(0, IJSONEditingService),
    __param(1, IWorkspaceContextService),
    __param(2, INativeHostService),
    __param(3, IWorkbenchConfigurationService),
    __param(4, IStorageService),
    __param(5, IExtensionService),
    __param(6, IWorkingCopyBackupService),
    __param(7, INotificationService),
    __param(8, ICommandService),
    __param(9, IFileService),
    __param(10, ITextFileService),
    __param(11, IWorkspacesService),
    __param(12, INativeWorkbenchEnvironmentService),
    __param(13, IFileDialogService),
    __param(14, IDialogService),
    __param(15, ILifecycleService),
    __param(16, ILabelService),
    __param(17, IHostService),
    __param(18, IUriIdentityService),
    __param(19, IWorkspaceTrustManagementService),
    __param(20, IUserDataProfilesService),
    __param(21, IUserDataProfileService)
], NativeWorkspaceEditingService);
export { NativeWorkspaceEditingService };
registerSingleton(IWorkspaceEditingService, NativeWorkspaceEditingService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlRWRpdGluZ1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya3NwYWNlcy9lbGVjdHJvbi1zYW5kYm94L3dvcmtzcGFjZUVkaXRpbmdTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUNOLHlCQUF5QixFQUN6QixtQkFBbUIsRUFDbkIscUJBQXFCLEVBQ3JCLHdCQUF3QixHQUN4QixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXpGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN6RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsUUFBUSxHQUNSLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxN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