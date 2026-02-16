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
import { IWorkingCopyBackupService } from '../common/workingCopyBackup.js';
import { IFilesConfigurationService, } from '../../filesConfiguration/common/filesConfigurationService.js';
import { IWorkingCopyService } from '../common/workingCopyService.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IFileDialogService, IDialogService, getFileNamesMessage, } from '../../../../platform/dialogs/common/dialogs.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { HotExitConfiguration } from '../../../../platform/files/common/files.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { WorkingCopyBackupTracker } from '../common/workingCopyBackupTracker.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { Promises, raceCancellation } from '../../../../base/common/async.js';
import { IWorkingCopyEditorService } from '../common/workingCopyEditorService.js';
import { IEditorGroupsService } from '../../editor/common/editorGroupsService.js';
let NativeWorkingCopyBackupTracker = class NativeWorkingCopyBackupTracker extends WorkingCopyBackupTracker {
    static { this.ID = 'workbench.contrib.nativeWorkingCopyBackupTracker'; }
    constructor(workingCopyBackupService, filesConfigurationService, workingCopyService, lifecycleService, fileDialogService, dialogService, contextService, nativeHostService, logService, environmentService, progressService, workingCopyEditorService, editorService, editorGroupService) {
        super(workingCopyBackupService, workingCopyService, logService, lifecycleService, filesConfigurationService, workingCopyEditorService, editorService, editorGroupService);
        this.fileDialogService = fileDialogService;
        this.dialogService = dialogService;
        this.contextService = contextService;
        this.nativeHostService = nativeHostService;
        this.environmentService = environmentService;
        this.progressService = progressService;
    }
    async onFinalBeforeShutdown(reason) {
        // Important: we are about to shutdown and handle modified working copies
        // and backups. We do not want any pending backup ops to interfer with
        // this because there is a risk of a backup being scheduled after we have
        // acknowledged to shutdown and then might end up with partial backups
        // written to disk, or even empty backups or deletes after writes.
        // (https://github.com/microsoft/vscode/issues/138055)
        this.cancelBackupOperations();
        // For the duration of the shutdown handling, suspend backup operations
        // and only resume after we have handled backups. Similar to above, we
        // do not want to trigger backup tracking during our shutdown handling
        // but we must resume, in case of a veto afterwards.
        const { resume } = this.suspendBackupOperations();
        try {
            // Modified working copies need treatment on shutdown
            const modifiedWorkingCopies = this.workingCopyService.modifiedWorkingCopies;
            if (modifiedWorkingCopies.length) {
                return await this.onBeforeShutdownWithModified(reason, modifiedWorkingCopies);
            }
            // No modified working copies
            else {
                return await this.onBeforeShutdownWithoutModified();
            }
        }
        finally {
            resume();
        }
    }
    async onBeforeShutdownWithModified(reason, modifiedWorkingCopies) {
        // If auto save is enabled, save all non-untitled working copies
        // and then check again for modified copies
        const workingCopiesToAutoSave = modifiedWorkingCopies.filter((wc) => !(wc.capabilities & 2 /* WorkingCopyCapabilities.Untitled */) &&
            this.filesConfigurationService.getAutoSaveMode(wc.resource).mode !== 0 /* AutoSaveMode.OFF */);
        if (workingCopiesToAutoSave.length > 0) {
            // Save all modified working copies that can be auto-saved
            try {
                await this.doSaveAllBeforeShutdown(workingCopiesToAutoSave, 2 /* SaveReason.AUTO */);
            }
            catch (error) {
                this.logService.error(`[backup tracker] error saving modified working copies: ${error}`); // guard against misbehaving saves, we handle remaining modified below
            }
            // If we still have modified working copies, we either have untitled ones or working copies that cannot be saved
            const remainingModifiedWorkingCopies = this.workingCopyService.modifiedWorkingCopies;
            if (remainingModifiedWorkingCopies.length) {
                return this.handleModifiedBeforeShutdown(remainingModifiedWorkingCopies, reason);
            }
            return this.noVeto([...modifiedWorkingCopies]); // no veto (modified auto-saved)
        }
        // Auto save is not enabled
        return this.handleModifiedBeforeShutdown(modifiedWorkingCopies, reason);
    }
    async handleModifiedBeforeShutdown(modifiedWorkingCopies, reason) {
        // Trigger backup if configured and enabled for shutdown reason
        let backups = [];
        let backupError = undefined;
        const modifiedWorkingCopiesToBackup = await this.shouldBackupBeforeShutdown(reason, modifiedWorkingCopies);
        if (modifiedWorkingCopiesToBackup.length > 0) {
            try {
                const backupResult = await this.backupBeforeShutdown(modifiedWorkingCopiesToBackup);
                backups = backupResult.backups;
                backupError = backupResult.error;
                if (backups.length === modifiedWorkingCopies.length) {
                    return false; // no veto (backup was successful for all working copies)
                }
            }
            catch (error) {
                backupError = error;
            }
        }
        const remainingModifiedWorkingCopies = modifiedWorkingCopies.filter((workingCopy) => !backups.includes(workingCopy));
        // We ran a backup but received an error that we show to the user
        if (backupError) {
            if (this.environmentService.isExtensionDevelopment) {
                this.logService.error(`[backup tracker] error creating backups: ${backupError}`);
                return false; // do not block shutdown during extension development (https://github.com/microsoft/vscode/issues/115028)
            }
            return this.showErrorDialog(localize('backupTrackerBackupFailed', 'The following editors with unsaved changes could not be saved to the backup location.'), remainingModifiedWorkingCopies, backupError, reason);
        }
        // Since a backup did not happen, we have to confirm for
        // the working copies that did not successfully backup
        try {
            return await this.confirmBeforeShutdown(remainingModifiedWorkingCopies);
        }
        catch (error) {
            if (this.environmentService.isExtensionDevelopment) {
                this.logService.error(`[backup tracker] error saving or reverting modified working copies: ${error}`);
                return false; // do not block shutdown during extension development (https://github.com/microsoft/vscode/issues/115028)
            }
            return this.showErrorDialog(localize('backupTrackerConfirmFailed', 'The following editors with unsaved changes could not be saved or reverted.'), remainingModifiedWorkingCopies, error, reason);
        }
    }
    async shouldBackupBeforeShutdown(reason, modifiedWorkingCopies) {
        if (!this.filesConfigurationService.isHotExitEnabled) {
            return []; // never backup when hot exit is disabled via settings
        }
        if (this.environmentService.isExtensionDevelopment) {
            return modifiedWorkingCopies; // always backup closing extension development window without asking to speed up debugging
        }
        switch (reason) {
            // Window Close
            case 1 /* ShutdownReason.CLOSE */:
                if (this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */ &&
                    this.filesConfigurationService.hotExitConfiguration ===
                        HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE) {
                    return modifiedWorkingCopies; // backup if a workspace/folder is open and onExitAndWindowClose is configured
                }
                if (isMacintosh || (await this.nativeHostService.getWindowCount()) > 1) {
                    if (this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */) {
                        return modifiedWorkingCopies.filter((modifiedWorkingCopy) => modifiedWorkingCopy.capabilities & 4 /* WorkingCopyCapabilities.Scratchpad */); // backup scratchpads automatically to avoid user confirmation
                    }
                    return []; // do not backup if a window is closed that does not cause quitting of the application
                }
                return modifiedWorkingCopies; // backup if last window is closed on win/linux where the application quits right after
            // Application Quit
            case 2 /* ShutdownReason.QUIT */:
                return modifiedWorkingCopies; // backup because next start we restore all backups
            // Window Reload
            case 3 /* ShutdownReason.RELOAD */:
                return modifiedWorkingCopies; // backup because after window reload, backups restore
            // Workspace Change
            case 4 /* ShutdownReason.LOAD */:
                if (this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */) {
                    if (this.filesConfigurationService.hotExitConfiguration ===
                        HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE) {
                        return modifiedWorkingCopies; // backup if a workspace/folder is open and onExitAndWindowClose is configured
                    }
                    return modifiedWorkingCopies.filter((modifiedWorkingCopy) => modifiedWorkingCopy.capabilities & 4 /* WorkingCopyCapabilities.Scratchpad */); // backup scratchpads automatically to avoid user confirmation
                }
                return []; // do not backup because we are switching contexts with no workspace/folder open
        }
    }
    async showErrorDialog(message, workingCopies, error, reason) {
        this.logService.error(`[backup tracker] ${message}: ${error}`);
        const modifiedWorkingCopies = workingCopies.filter((workingCopy) => workingCopy.isModified());
        const advice = localize('backupErrorDetails', 'Try saving or reverting the editors with unsaved changes first and then try again.');
        const detail = modifiedWorkingCopies.length
            ? `${getFileNamesMessage(modifiedWorkingCopies.map((x) => x.name))}\n${advice}`
            : advice;
        const { result } = await this.dialogService.prompt({
            type: 'error',
            message,
            detail,
            buttons: [
                {
                    label: localize({ key: 'ok', comment: ['&& denotes a mnemonic'] }, '&&OK'),
                    run: () => true, // veto
                },
                {
                    label: this.toForceShutdownLabel(reason),
                    run: () => false, // no veto
                },
            ],
        });
        return result ?? true;
    }
    toForceShutdownLabel(reason) {
        switch (reason) {
            case 1 /* ShutdownReason.CLOSE */:
            case 4 /* ShutdownReason.LOAD */:
                return localize('shutdownForceClose', 'Close Anyway');
            case 2 /* ShutdownReason.QUIT */:
                return localize('shutdownForceQuit', 'Quit Anyway');
            case 3 /* ShutdownReason.RELOAD */:
                return localize('shutdownForceReload', 'Reload Anyway');
        }
    }
    async backupBeforeShutdown(modifiedWorkingCopies) {
        const backups = [];
        let error = undefined;
        await this.withProgressAndCancellation(async (token) => {
            // Perform a backup of all modified working copies unless a backup already exists
            try {
                await Promises.settled(modifiedWorkingCopies.map(async (workingCopy) => {
                    // Backup exists
                    const contentVersion = this.getContentVersion(workingCopy);
                    if (this.workingCopyBackupService.hasBackupSync(workingCopy, contentVersion)) {
                        backups.push(workingCopy);
                    }
                    // Backup does not exist
                    else {
                        const backup = await workingCopy.backup(token);
                        if (token.isCancellationRequested) {
                            return;
                        }
                        await this.workingCopyBackupService.backup(workingCopy, backup.content, contentVersion, backup.meta, token);
                        if (token.isCancellationRequested) {
                            return;
                        }
                        backups.push(workingCopy);
                    }
                }));
            }
            catch (backupError) {
                error = backupError;
            }
        }, localize('backupBeforeShutdownMessage', 'Backing up editors with unsaved changes is taking a bit longer...'), localize('backupBeforeShutdownDetail', "Click 'Cancel' to stop waiting and to save or revert editors with unsaved changes."));
        return { backups, error };
    }
    async confirmBeforeShutdown(modifiedWorkingCopies) {
        // Save
        const confirm = await this.fileDialogService.showSaveConfirm(modifiedWorkingCopies.map((workingCopy) => workingCopy.name));
        if (confirm === 0 /* ConfirmResult.SAVE */) {
            const modifiedCountBeforeSave = this.workingCopyService.modifiedCount;
            try {
                await this.doSaveAllBeforeShutdown(modifiedWorkingCopies, 1 /* SaveReason.EXPLICIT */);
            }
            catch (error) {
                this.logService.error(`[backup tracker] error saving modified working copies: ${error}`); // guard against misbehaving saves, we handle remaining modified below
            }
            const savedWorkingCopies = modifiedCountBeforeSave - this.workingCopyService.modifiedCount;
            if (savedWorkingCopies < modifiedWorkingCopies.length) {
                return true; // veto (save failed or was canceled)
            }
            return this.noVeto(modifiedWorkingCopies); // no veto (modified saved)
        }
        // Don't Save
        else if (confirm === 1 /* ConfirmResult.DONT_SAVE */) {
            try {
                await this.doRevertAllBeforeShutdown(modifiedWorkingCopies);
            }
            catch (error) {
                this.logService.error(`[backup tracker] error reverting modified working copies: ${error}`); // do not block the shutdown on errors from revert
            }
            return this.noVeto(modifiedWorkingCopies); // no veto (modified reverted)
        }
        // Cancel
        return true; // veto (user canceled)
    }
    doSaveAllBeforeShutdown(workingCopies, reason) {
        return this.withProgressAndCancellation(async () => {
            // Skip save participants on shutdown for performance reasons
            const saveOptions = { skipSaveParticipants: true, reason };
            // First save through the editor service if we save all to benefit
            // from some extras like switching to untitled modified editors before saving.
            let result = undefined;
            if (workingCopies.length === this.workingCopyService.modifiedCount) {
                result = (await this.editorService.saveAll({
                    includeUntitled: { includeScratchpad: true },
                    ...saveOptions,
                })).success;
            }
            // If we still have modified working copies, save those directly
            // unless the save was not successful (e.g. cancelled)
            if (result !== false) {
                await Promises.settled(workingCopies.map((workingCopy) => workingCopy.isModified() ? workingCopy.save(saveOptions) : Promise.resolve(true)));
            }
        }, localize('saveBeforeShutdown', 'Saving editors with unsaved changes is taking a bit longer...'), undefined, 
        // Do not pick `Dialog` as location for reporting progress if it is likely
        // that the save operation will itself open a dialog for asking for the
        // location to save to for untitled or scratchpad working copies.
        // https://github.com/microsoft/vscode-internalbacklog/issues/4943
        workingCopies.some((workingCopy) => workingCopy.capabilities & 2 /* WorkingCopyCapabilities.Untitled */ ||
            workingCopy.capabilities & 4 /* WorkingCopyCapabilities.Scratchpad */)
            ? 10 /* ProgressLocation.Window */
            : 20 /* ProgressLocation.Dialog */);
    }
    doRevertAllBeforeShutdown(modifiedWorkingCopies) {
        return this.withProgressAndCancellation(async () => {
            // Soft revert is good enough on shutdown
            const revertOptions = { soft: true };
            // First revert through the editor service if we revert all
            if (modifiedWorkingCopies.length === this.workingCopyService.modifiedCount) {
                await this.editorService.revertAll(revertOptions);
            }
            // If we still have modified working copies, revert those directly
            await Promises.settled(modifiedWorkingCopies.map((workingCopy) => workingCopy.isModified() ? workingCopy.revert(revertOptions) : Promise.resolve()));
        }, localize('revertBeforeShutdown', 'Reverting editors with unsaved changes is taking a bit longer...'));
    }
    onBeforeShutdownWithoutModified() {
        // We are about to shutdown without modified editors
        // and will discard any backups that are still
        // around that have not been handled depending
        // on the window state.
        //
        // Empty window: discard even unrestored backups to
        // prevent empty windows from restoring that cannot
        // be closed (workaround for not having implemented
        // https://github.com/microsoft/vscode/issues/127163
        // and a fix for what users have reported in issue
        // https://github.com/microsoft/vscode/issues/126725)
        //
        // Workspace/Folder window: do not discard unrestored
        // backups to give a chance to restore them in the
        // future. Since we do not restore workspace/folder
        // windows with backups, this is fine.
        return this.noVeto({
            except: this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */
                ? []
                : Array.from(this.unrestoredBackups),
        });
    }
    async noVeto(arg1) {
        // Discard backups from working copies the
        // user either saved or reverted
        await this.discardBackupsBeforeShutdown(arg1);
        return false; // no veto (no modified)
    }
    async discardBackupsBeforeShutdown(arg1) {
        // We never discard any backups before we are ready
        // and have resolved all backups that exist. This
        // is important to not loose backups that have not
        // been handled.
        if (!this.isReady) {
            return;
        }
        await this.withProgressAndCancellation(async () => {
            // When we shutdown either with no modified working copies left
            // or with some handled, we start to discard these backups
            // to free them up. This helps to get rid of stale backups
            // as reported in https://github.com/microsoft/vscode/issues/92962
            //
            // However, we never want to discard backups that we know
            // were not restored in the session.
            try {
                if (Array.isArray(arg1)) {
                    await Promises.settled(arg1.map((workingCopy) => this.workingCopyBackupService.discardBackup(workingCopy)));
                }
                else {
                    await this.workingCopyBackupService.discardBackups(arg1);
                }
            }
            catch (error) {
                this.logService.error(`[backup tracker] error discarding backups: ${error}`);
            }
        }, localize('discardBackupsBeforeShutdown', 'Discarding backups is taking a bit longer...'));
    }
    withProgressAndCancellation(promiseFactory, title, detail, location = 20 /* ProgressLocation.Dialog */) {
        const cts = new CancellationTokenSource();
        return this.progressService.withProgress({
            location, // by default use a dialog to prevent the user from making any more changes now (https://github.com/microsoft/vscode/issues/122774)
            cancellable: true, // allow to cancel (https://github.com/microsoft/vscode/issues/112278)
            delay: 800, // delay so that it only appears when operation takes a long time
            title,
            detail,
        }, () => raceCancellation(promiseFactory(cts.token), cts.token), () => cts.dispose(true));
    }
};
NativeWorkingCopyBackupTracker = __decorate([
    __param(0, IWorkingCopyBackupService),
    __param(1, IFilesConfigurationService),
    __param(2, IWorkingCopyService),
    __param(3, ILifecycleService),
    __param(4, IFileDialogService),
    __param(5, IDialogService),
    __param(6, IWorkspaceContextService),
    __param(7, INativeHostService),
    __param(8, ILogService),
    __param(9, IEnvironmentService),
    __param(10, IProgressService),
    __param(11, IWorkingCopyEditorService),
    __param(12, IEditorService),
    __param(13, IEditorGroupsService)
], NativeWorkingCopyBackupTracker);
export { NativeWorkingCopyBackupTracker };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBUcmFja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvZWxlY3Ryb24tc2FuZGJveC93b3JraW5nQ29weUJhY2t1cFRyYWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRTFFLE9BQU8sRUFDTiwwQkFBMEIsR0FFMUIsTUFBTSw4REFBOEQsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQU1yRSxPQUFPLEVBQUUsaUJBQWlCLEVBQWtCLE1BQU0scUNBQXFDLENBQUE7QUFDdkYsT0FBTyxFQUVOLGtCQUFrQixFQUNsQixjQUFjLEVBQ2QsbUJBQW1CLEdBQ25CLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUVOLHdCQUF3QixHQUN4QixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXJFLE9BQU8sRUFBRSxtQkFBbUIs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