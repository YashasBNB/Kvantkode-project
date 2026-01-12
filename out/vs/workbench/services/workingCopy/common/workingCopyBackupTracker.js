/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Promises } from '../../../../base/common/async.js';
/**
 * The working copy backup tracker deals with:
 * - restoring backups that exist
 * - creating backups for modified working copies
 * - deleting backups for saved working copies
 * - handling backups on shutdown
 */
export class WorkingCopyBackupTracker extends Disposable {
    constructor(workingCopyBackupService, workingCopyService, logService, lifecycleService, filesConfigurationService, workingCopyEditorService, editorService, editorGroupService) {
        super();
        this.workingCopyBackupService = workingCopyBackupService;
        this.workingCopyService = workingCopyService;
        this.logService = logService;
        this.lifecycleService = lifecycleService;
        this.filesConfigurationService = filesConfigurationService;
        this.workingCopyEditorService = workingCopyEditorService;
        this.editorService = editorService;
        this.editorGroupService = editorGroupService;
        // A map from working copy to a version ID we compute on each content
        // change. This version ID allows to e.g. ask if a backup for a specific
        // content has been made before closing.
        this.mapWorkingCopyToContentVersion = new Map();
        // A map of scheduled pending backup operations for working copies
        // Given https://github.com/microsoft/vscode/issues/158038, we explicitly
        // do not store `IWorkingCopy` but the identifier in the map, since it
        // looks like GC is not running for the working copy otherwise.
        this.pendingBackupOperations = new Map();
        this.suspended = false;
        //#endregion
        //#region Backup Restorer
        this.unrestoredBackups = new Set();
        this._isReady = false;
        this.whenReady = this.resolveBackupsToRestore();
        // Fill in initial modified working copies
        for (const workingCopy of this.workingCopyService.modifiedWorkingCopies) {
            this.onDidRegister(workingCopy);
        }
        this.registerListeners();
    }
    registerListeners() {
        // Working Copy events
        this._register(this.workingCopyService.onDidRegister((workingCopy) => this.onDidRegister(workingCopy)));
        this._register(this.workingCopyService.onDidUnregister((workingCopy) => this.onDidUnregister(workingCopy)));
        this._register(this.workingCopyService.onDidChangeDirty((workingCopy) => this.onDidChangeDirty(workingCopy)));
        this._register(this.workingCopyService.onDidChangeContent((workingCopy) => this.onDidChangeContent(workingCopy)));
        // Lifecycle
        this._register(this.lifecycleService.onBeforeShutdown((event) => event.finalVeto(() => this.onFinalBeforeShutdown(event.reason), 'veto.backups')));
        this._register(this.lifecycleService.onWillShutdown(() => this.onWillShutdown()));
        // Once a handler registers, restore backups
        this._register(this.workingCopyEditorService.onDidRegisterHandler((handler) => this.restoreBackups(handler)));
    }
    onWillShutdown() {
        // Here we know that we will shutdown. Any backup operation that is
        // already scheduled or being scheduled from this moment on runs
        // at the risk of corrupting a backup because the backup operation
        // might terminate at any given time now. As such, we need to disable
        // this tracker from performing more backups by cancelling pending
        // operations and suspending the tracker without resuming.
        this.cancelBackupOperations();
        this.suspendBackupOperations();
    }
    //#region Backup Creator
    // Delay creation of backups when content changes to avoid too much
    // load on the backup service when the user is typing into the editor
    // Since we always schedule a backup, even when auto save is on, we
    // have different scheduling delays based on auto save configuration.
    // With 'delayed' we avoid a (not critical but also not really wanted)
    // race between saving (after 1s per default) and making a backup of
    // the working copy.
    static { this.DEFAULT_BACKUP_SCHEDULE_DELAYS = {
        ['default']: 1000,
        ['delayed']: 2000,
    }; }
    onDidRegister(workingCopy) {
        if (this.suspended) {
            this.logService.warn(`[backup tracker] suspended, ignoring register event`, workingCopy.resource.toString(), workingCopy.typeId);
            return;
        }
        if (workingCopy.isModified()) {
            this.scheduleBackup(workingCopy);
        }
    }
    onDidUnregister(workingCopy) {
        // Remove from content version map
        this.mapWorkingCopyToContentVersion.delete(workingCopy);
        // Check suspended
        if (this.suspended) {
            this.logService.warn(`[backup tracker] suspended, ignoring unregister event`, workingCopy.resource.toString(), workingCopy.typeId);
            return;
        }
        // Discard backup
        this.discardBackup(workingCopy);
    }
    onDidChangeDirty(workingCopy) {
        if (this.suspended) {
            this.logService.warn(`[backup tracker] suspended, ignoring dirty change event`, workingCopy.resource.toString(), workingCopy.typeId);
            return;
        }
        if (workingCopy.isDirty()) {
            this.scheduleBackup(workingCopy);
        }
        else {
            this.discardBackup(workingCopy);
        }
    }
    onDidChangeContent(workingCopy) {
        // Increment content version ID
        const contentVersionId = this.getContentVersion(workingCopy);
        this.mapWorkingCopyToContentVersion.set(workingCopy, contentVersionId + 1);
        // Check suspended
        if (this.suspended) {
            this.logService.warn(`[backup tracker] suspended, ignoring content change event`, workingCopy.resource.toString(), workingCopy.typeId);
            return;
        }
        // Schedule backup for modified working copies
        if (workingCopy.isModified()) {
            // this listener will make sure that the backup is
            // pushed out for as long as the user is still changing
            // the content of the working copy.
            this.scheduleBackup(workingCopy);
        }
    }
    scheduleBackup(workingCopy) {
        // Clear any running backup operation
        this.cancelBackupOperation(workingCopy);
        this.logService.trace(`[backup tracker] scheduling backup`, workingCopy.resource.toString(), workingCopy.typeId);
        // Schedule new backup
        const workingCopyIdentifier = { resource: workingCopy.resource, typeId: workingCopy.typeId };
        const cts = new CancellationTokenSource();
        const handle = setTimeout(async () => {
            if (cts.token.isCancellationRequested) {
                return;
            }
            // Backup if modified
            if (workingCopy.isModified()) {
                this.logService.trace(`[backup tracker] creating backup`, workingCopy.resource.toString(), workingCopy.typeId);
                try {
                    const backup = await workingCopy.backup(cts.token);
                    if (cts.token.isCancellationRequested) {
                        return;
                    }
                    if (workingCopy.isModified()) {
                        this.logService.trace(`[backup tracker] storing backup`, workingCopy.resource.toString(), workingCopy.typeId);
                        await this.workingCopyBackupService.backup(workingCopy, backup.content, this.getContentVersion(workingCopy), backup.meta, cts.token);
                    }
                }
                catch (error) {
                    this.logService.error(error);
                }
            }
            // Clear disposable unless we got canceled which would
            // indicate another operation has started meanwhile
            if (!cts.token.isCancellationRequested) {
                this.doClearPendingBackupOperation(workingCopyIdentifier);
            }
        }, this.getBackupScheduleDelay(workingCopy));
        // Keep in map for disposal as needed
        this.pendingBackupOperations.set(workingCopyIdentifier, {
            cancel: () => {
                this.logService.trace(`[backup tracker] clearing pending backup creation`, workingCopy.resource.toString(), workingCopy.typeId);
                cts.cancel();
            },
            disposable: toDisposable(() => {
                cts.dispose();
                clearTimeout(handle);
            }),
        });
    }
    getBackupScheduleDelay(workingCopy) {
        if (typeof workingCopy.backupDelay === 'number') {
            return workingCopy.backupDelay; // respect working copy override
        }
        let backupScheduleDelay;
        if (workingCopy.capabilities & 2 /* WorkingCopyCapabilities.Untitled */) {
            backupScheduleDelay = 'default'; // auto-save is never on for untitled working copies
        }
        else {
            backupScheduleDelay = this.filesConfigurationService.hasShortAutoSaveDelay(workingCopy.resource)
                ? 'delayed'
                : 'default';
        }
        return WorkingCopyBackupTracker.DEFAULT_BACKUP_SCHEDULE_DELAYS[backupScheduleDelay];
    }
    getContentVersion(workingCopy) {
        return this.mapWorkingCopyToContentVersion.get(workingCopy) || 0;
    }
    discardBackup(workingCopy) {
        // Clear any running backup operation
        this.cancelBackupOperation(workingCopy);
        // Schedule backup discard asap
        const workingCopyIdentifier = { resource: workingCopy.resource, typeId: workingCopy.typeId };
        const cts = new CancellationTokenSource();
        this.doDiscardBackup(workingCopyIdentifier, cts);
        // Keep in map for disposal as needed
        this.pendingBackupOperations.set(workingCopyIdentifier, {
            cancel: () => {
                this.logService.trace(`[backup tracker] clearing pending backup discard`, workingCopy.resource.toString(), workingCopy.typeId);
                cts.cancel();
            },
            disposable: cts,
        });
    }
    async doDiscardBackup(workingCopyIdentifier, cts) {
        this.logService.trace(`[backup tracker] discarding backup`, workingCopyIdentifier.resource.toString(), workingCopyIdentifier.typeId);
        // Discard backup
        try {
            await this.workingCopyBackupService.discardBackup(workingCopyIdentifier, cts.token);
        }
        catch (error) {
            this.logService.error(error);
        }
        // Clear disposable unless we got canceled which would
        // indicate another operation has started meanwhile
        if (!cts.token.isCancellationRequested) {
            this.doClearPendingBackupOperation(workingCopyIdentifier);
        }
    }
    cancelBackupOperation(workingCopy) {
        // Given a working copy we want to find the matching
        // identifier in our pending operations map because
        // we cannot use the working copy directly, as the
        // identifier might have different object identity.
        let workingCopyIdentifier = undefined;
        for (const [identifier] of this.pendingBackupOperations) {
            if (identifier.resource.toString() === workingCopy.resource.toString() &&
                identifier.typeId === workingCopy.typeId) {
                workingCopyIdentifier = identifier;
                break;
            }
        }
        if (workingCopyIdentifier) {
            this.doClearPendingBackupOperation(workingCopyIdentifier, { cancel: true });
        }
    }
    doClearPendingBackupOperation(workingCopyIdentifier, options) {
        const pendingBackupOperation = this.pendingBackupOperations.get(workingCopyIdentifier);
        if (!pendingBackupOperation) {
            return;
        }
        if (options?.cancel) {
            pendingBackupOperation.cancel();
        }
        pendingBackupOperation.disposable.dispose();
        this.pendingBackupOperations.delete(workingCopyIdentifier);
    }
    cancelBackupOperations() {
        for (const [, operation] of this.pendingBackupOperations) {
            operation.cancel();
            operation.disposable.dispose();
        }
        this.pendingBackupOperations.clear();
    }
    suspendBackupOperations() {
        this.suspended = true;
        return { resume: () => (this.suspended = false) };
    }
    get isReady() {
        return this._isReady;
    }
    async resolveBackupsToRestore() {
        // Wait for resolving backups until we are restored to reduce startup pressure
        await this.lifecycleService.when(3 /* LifecyclePhase.Restored */);
        // Remember each backup that needs to restore
        for (const backup of await this.workingCopyBackupService.getBackups()) {
            this.unrestoredBackups.add(backup);
        }
        this._isReady = true;
    }
    async restoreBackups(handler) {
        // Wait for backups to be resolved
        await this.whenReady;
        // Figure out already opened editors for backups vs
        // non-opened.
        const openedEditorsForBackups = new Set();
        const nonOpenedEditorsForBackups = new Set();
        // Ensure each backup that can be handled has an
        // associated editor.
        const restoredBackups = new Set();
        for (const unrestoredBackup of this.unrestoredBackups) {
            const canHandleUnrestoredBackup = await handler.handles(unrestoredBackup);
            if (!canHandleUnrestoredBackup) {
                continue;
            }
            // Collect already opened editors for backup
            let hasOpenedEditorForBackup = false;
            for (const { editor } of this.editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)) {
                const isUnrestoredBackupOpened = handler.isOpen(unrestoredBackup, editor);
                if (isUnrestoredBackupOpened) {
                    openedEditorsForBackups.add(editor);
                    hasOpenedEditorForBackup = true;
                }
            }
            // Otherwise, make sure to create at least one editor
            // for the backup to show
            if (!hasOpenedEditorForBackup) {
                nonOpenedEditorsForBackups.add(await handler.createEditor(unrestoredBackup));
            }
            // Remember as (potentially) restored
            restoredBackups.add(unrestoredBackup);
        }
        // Ensure editors are opened for each backup without editor
        // in the background without stealing focus
        if (nonOpenedEditorsForBackups.size > 0) {
            await this.editorGroupService.activeGroup.openEditors([...nonOpenedEditorsForBackups].map((nonOpenedEditorForBackup) => ({
                editor: nonOpenedEditorForBackup,
                options: {
                    pinned: true,
                    preserveFocus: true,
                    inactive: true,
                },
            })));
            for (const nonOpenedEditorForBackup of nonOpenedEditorsForBackups) {
                openedEditorsForBackups.add(nonOpenedEditorForBackup);
            }
        }
        // Then, resolve each opened editor to make sure the working copy
        // is loaded and the modified editor appears properly.
        // We only do that for editors that are not active in a group
        // already to prevent calling `resolve` twice!
        await Promises.settled([...openedEditorsForBackups].map(async (openedEditorForBackup) => {
            if (this.editorService.isVisible(openedEditorForBackup)) {
                return;
            }
            return openedEditorForBackup.resolve();
        }));
        // Finally, remove all handled backups from the list
        for (const restoredBackup of restoredBackups) {
            this.unrestoredBackups.delete(restoredBackup);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBUcmFja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvY29tbW9uL3dvcmtpbmdDb3B5QmFja3VwVHJhY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBVTVGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBR2pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQU0zRDs7Ozs7O0dBTUc7QUFDSCxNQUFNLE9BQWdCLHdCQUF5QixTQUFRLFVBQVU7SUFDaEUsWUFDb0Isd0JBQW1ELEVBQ25ELGtCQUF1QyxFQUN2QyxVQUF1QixFQUN6QixnQkFBbUMsRUFDakMseUJBQXFELEVBQ3ZELHdCQUFtRCxFQUNqRCxhQUE2QixFQUMvQixrQkFBd0M7UUFFekQsS0FBSyxFQUFFLENBQUE7UUFUWSw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTJCO1FBQ25ELHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDdkMsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUN6QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ2pDLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBNEI7UUFDdkQsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUEyQjtRQUNqRCxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDL0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFzQjtRQTRFMUQscUVBQXFFO1FBQ3JFLHdFQUF3RTtRQUN4RSx3Q0FBd0M7UUFDdkIsbUNBQThCLEdBQUcsSUFBSSxHQUFHLEVBQXdCLENBQUE7UUFFakYsa0VBQWtFO1FBQ2xFLHlF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