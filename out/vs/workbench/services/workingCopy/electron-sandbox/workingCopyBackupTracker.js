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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBUcmFja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L2VsZWN0cm9uLXNhbmRib3gvd29ya2luZ0NvcHlCYWNrdXBUcmFja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUUxRSxPQUFPLEVBQ04sMEJBQTBCLEdBRTFCLE1BQU0sOERBQThELENBQUE7QUFDckUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFNckUsT0FBTyxFQUFFLGlCQUFpQixFQUFrQixNQUFNLHFDQUFxQyxDQUFBO0FBQ3ZGLE9BQU8sRUFFTixrQkFBa0IsRUFDbEIsY0FBYyxFQUNkLG1CQUFtQixHQUNuQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFFTix3QkFBd0IsR0FDeEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDakYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDaEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtB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