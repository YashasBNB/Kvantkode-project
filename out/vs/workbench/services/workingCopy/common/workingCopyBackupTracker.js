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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBUcmFja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L2NvbW1vbi93b3JraW5nQ29weUJhY2t1cFRyYWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQVU1RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUdqRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFNM0Q7Ozs7OztHQU1HO0FBQ0gsTUFBTSxPQUFnQix3QkFBeUIsU0FBUSxVQUFVO0lBQ2hFLFlBQ29CLHdCQUFtRCxFQUNuRCxrQkFBdUMsRUFDdkMsVUFBdUIsRUFDekIsZ0JBQW1DLEVBQ2pDLHlCQUFxRCxFQUN2RCx3QkFBbUQsRUFDakQsYUFBNkIsRUFDL0Isa0JBQXdDO1FBRXpELEtBQUssRUFBRSxDQUFBO1FBVFksNkJBQXdCLEdBQXhCLHdCQUF3QixDQUEyQjtRQUNuRCx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3ZDLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDekIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUNqQyw4QkFBeUIsR0FBekIseUJBQXlCLENBQTRCO1FBQ3ZELDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMkI7UUFDakQsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQy9CLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBc0I7UUE0RTFELHFFQUFxRTtRQUNyRSx3RUFBd0U7UUFDeEUsd0NBQXdDO1FBQ3ZCLG1DQUE4QixHQUFHLElBQUksR0FBRyxFQUF3QixDQUFBO1FBRWpGLGtFQUFrRTtRQUNsRSx5RUFBeUU7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