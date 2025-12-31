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
var StoredFileWorkingCopy_1;
import { localize } from '../../../../nls.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { ETAG_DISABLED, IFileService, NotModifiedSinceFileOperationError, } from '../../../../platform/files/common/files.js';
import { IWorkingCopyService } from './workingCopyService.js';
import { raceCancellation, TaskSequentializer, timeout } from '../../../../base/common/async.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { IWorkingCopyFileService } from './workingCopyFileService.js';
import { IFilesConfigurationService } from '../../filesConfiguration/common/filesConfigurationService.js';
import { IWorkingCopyBackupService } from './workingCopyBackup.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { hash } from '../../../../base/common/hash.js';
import { isErrorWithActions, toErrorMessage } from '../../../../base/common/errorMessage.js';
import { toAction } from '../../../../base/common/actions.js';
import { isWindows } from '../../../../base/common/platform.js';
import { IWorkingCopyEditorService } from './workingCopyEditorService.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IElevatedFileService } from '../../files/common/elevatedFileService.js';
import { ResourceWorkingCopy } from './resourceWorkingCopy.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { isCancellationError } from '../../../../base/common/errors.js';
/**
 * States the stored file working copy can be in.
 */
export var StoredFileWorkingCopyState;
(function (StoredFileWorkingCopyState) {
    /**
     * A stored file working copy is saved.
     */
    StoredFileWorkingCopyState[StoredFileWorkingCopyState["SAVED"] = 0] = "SAVED";
    /**
     * A stored file working copy is dirty.
     */
    StoredFileWorkingCopyState[StoredFileWorkingCopyState["DIRTY"] = 1] = "DIRTY";
    /**
     * A stored file working copy is currently being saved but
     * this operation has not completed yet.
     */
    StoredFileWorkingCopyState[StoredFileWorkingCopyState["PENDING_SAVE"] = 2] = "PENDING_SAVE";
    /**
     * A stored file working copy is in conflict mode when changes
     * cannot be saved because the underlying file has changed.
     * Stored file working copies in conflict mode are always dirty.
     */
    StoredFileWorkingCopyState[StoredFileWorkingCopyState["CONFLICT"] = 3] = "CONFLICT";
    /**
     * A stored file working copy is in orphan state when the underlying
     * file has been deleted.
     */
    StoredFileWorkingCopyState[StoredFileWorkingCopyState["ORPHAN"] = 4] = "ORPHAN";
    /**
     * Any error that happens during a save that is not causing
     * the `StoredFileWorkingCopyState.CONFLICT` state.
     * Stored file working copies in error mode are always dirty.
     */
    StoredFileWorkingCopyState[StoredFileWorkingCopyState["ERROR"] = 5] = "ERROR";
})(StoredFileWorkingCopyState || (StoredFileWorkingCopyState = {}));
export function isStoredFileWorkingCopySaveEvent(e) {
    const candidate = e;
    return !!candidate.stat;
}
let StoredFileWorkingCopy = class StoredFileWorkingCopy extends ResourceWorkingCopy {
    static { StoredFileWorkingCopy_1 = this; }
    get model() {
        return this._model;
    }
    //#endregion
    constructor(typeId, resource, name, modelFactory, externalResolver, fileService, logService, workingCopyFileService, filesConfigurationService, workingCopyBackupService, workingCopyService, notificationService, workingCopyEditorService, editorService, elevatedFileService, progressService) {
        super(resource, fileService);
        this.typeId = typeId;
        this.name = name;
        this.modelFactory = modelFactory;
        this.externalResolver = externalResolver;
        this.logService = logService;
        this.workingCopyFileService = workingCopyFileService;
        this.filesConfigurationService = filesConfigurationService;
        this.workingCopyBackupService = workingCopyBackupService;
        this.notificationService = notificationService;
        this.workingCopyEditorService = workingCopyEditorService;
        this.editorService = editorService;
        this.elevatedFileService = elevatedFileService;
        this.progressService = progressService;
        this.capabilities = 0 /* WorkingCopyCapabilities.None */;
        this._model = undefined;
        //#region events
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._onDidResolve = this._register(new Emitter());
        this.onDidResolve = this._onDidResolve.event;
        this._onDidChangeDirty = this._register(new Emitter());
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this._onDidSaveError = this._register(new Emitter());
        this.onDidSaveError = this._onDidSaveError.event;
        this._onDidSave = this._register(new Emitter());
        this.onDidSave = this._onDidSave.event;
        this._onDidRevert = this._register(new Emitter());
        this.onDidRevert = this._onDidRevert.event;
        this._onDidChangeReadonly = this._register(new Emitter());
        this.onDidChangeReadonly = this._onDidChangeReadonly.event;
        //#region Dirty
        this.dirty = false;
        this.ignoreDirtyOnModelContentChange = false;
        //#endregion
        //#region Save
        this.versionId = 0;
        this.lastContentChangeFromUndoRedo = undefined;
        this.saveSequentializer = new TaskSequentializer();
        this.ignoreSaveFromSaveParticipants = false;
        //#endregion
        //#region State
        this.inConflictMode = false;
        this.inErrorMode = false;
        // Make known to working copy service
        this._register(workingCopyService.registerWorkingCopy(this));
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.filesConfigurationService.onDidChangeReadonly(() => this._onDidChangeReadonly.fire()));
    }
    isDirty() {
        return this.dirty;
    }
    markModified() {
        this.setDirty(true); // stored file working copy tracks modified via dirty
    }
    setDirty(dirty) {
        if (!this.isResolved()) {
            return; // only resolved working copies can be marked dirty
        }
        // Track dirty state and version id
        const wasDirty = this.dirty;
        this.doSetDirty(dirty);
        // Emit as Event if dirty changed
        if (dirty !== wasDirty) {
            this._onDidChangeDirty.fire();
        }
    }
    doSetDirty(dirty) {
        const wasDirty = this.dirty;
        const wasInConflictMode = this.inConflictMode;
        const wasInErrorMode = this.inErrorMode;
        const oldSavedVersionId = this.savedVersionId;
        if (!dirty) {
            this.dirty = false;
            this.inConflictMode = false;
            this.inErrorMode = false;
            // we remember the models alternate version id to remember when the version
            // of the model matches with the saved version on disk. we need to keep this
            // in order to find out if the model changed back to a saved version (e.g.
            // when undoing long enough to reach to a version that is saved and then to
            // clear the dirty flag)
            if (this.isResolved()) {
                this.savedVersionId = this.model.versionId;
            }
        }
        else {
            this.dirty = true;
        }
        // Return function to revert this call
        return () => {
            this.dirty = wasDirty;
            this.inConflictMode = wasInConflictMode;
            this.inErrorMode = wasInErrorMode;
            this.savedVersionId = oldSavedVersionId;
        };
    }
    isResolved() {
        return !!this.model;
    }
    async resolve(options) {
        this.trace('resolve() - enter');
        // Return early if we are disposed
        if (this.isDisposed()) {
            this.trace('resolve() - exit - without resolving because file working copy is disposed');
            return;
        }
        // Unless there are explicit contents provided, it is important that we do not
        // resolve a working copy that is dirty or is in the process of saving to prevent
        // data loss.
        if (!options?.contents && (this.dirty || this.saveSequentializer.isRunning())) {
            this.trace('resolve() - exit - without resolving because file working copy is dirty or being saved');
            return;
        }
        return this.doResolve(options);
    }
    async doResolve(options) {
        // First check if we have contents to use for the working copy
        if (options?.contents) {
            return this.resolveFromBuffer(options.contents);
        }
        // Second, check if we have a backup to resolve from (only for new working copies)
        const isNew = !this.isResolved();
        if (isNew) {
            const resolvedFromBackup = await this.resolveFromBackup();
            if (resolvedFromBackup) {
                return;
            }
        }
        // Finally, resolve from file resource
        return this.resolveFromFile(options);
    }
    async resolveFromBuffer(buffer) {
        this.trace('resolveFromBuffer()');
        // Try to resolve metdata from disk
        let mtime;
        let ctime;
        let size;
        let etag;
        try {
            const metadata = await this.fileService.stat(this.resource);
            mtime = metadata.mtime;
            ctime = metadata.ctime;
            size = metadata.size;
            etag = metadata.etag;
            // Clear orphaned state when resolving was successful
            this.setOrphaned(false);
        }
        catch (error) {
            // Put some fallback values in error case
            mtime = Date.now();
            ctime = Date.now();
            size = 0;
            etag = ETAG_DISABLED;
            // Apply orphaned state based on error code
            this.setOrphaned(error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */);
        }
        // Resolve with buffer
        return this.resolveFromContent({
            resource: this.resource,
            name: this.name,
            mtime,
            ctime,
            size,
            etag,
            value: buffer,
            readonly: false,
            locked: false,
        }, true /* dirty (resolved from buffer) */);
    }
    async resolveFromBackup() {
        // Resolve backup if any
        const backup = await this.workingCopyBackupService.resolve(this);
        // Abort if someone else managed to resolve the working copy by now
        const isNew = !this.isResolved();
        if (!isNew) {
            this.trace('resolveFromBackup() - exit - withoutresolving because previously new file working copy got created meanwhile');
            return true; // imply that resolving has happened in another operation
        }
        // Try to resolve from backup if we have any
        if (backup) {
            await this.doResolveFromBackup(backup);
            return true;
        }
        // Otherwise signal back that resolving did not happen
        return false;
    }
    async doResolveFromBackup(backup) {
        this.trace('doResolveFromBackup()');
        // Resolve with backup
        await this.resolveFromContent({
            resource: this.resource,
            name: this.name,
            mtime: backup.meta ? backup.meta.mtime : Date.now(),
            ctime: backup.meta ? backup.meta.ctime : Date.now(),
            size: backup.meta ? backup.meta.size : 0,
            etag: backup.meta ? backup.meta.etag : ETAG_DISABLED, // etag disabled if unknown!
            value: backup.value,
            readonly: false,
            locked: false,
        }, true /* dirty (resolved from backup) */);
        // Restore orphaned flag based on state
        if (backup.meta && backup.meta.orphaned) {
            this.setOrphaned(true);
        }
    }
    async resolveFromFile(options) {
        this.trace('resolveFromFile()');
        const forceReadFromFile = options?.forceReadFromFile;
        // Decide on etag
        let etag;
        if (forceReadFromFile) {
            etag = ETAG_DISABLED; // disable ETag if we enforce to read from disk
        }
        else if (this.lastResolvedFileStat) {
            etag = this.lastResolvedFileStat.etag; // otherwise respect etag to support caching
        }
        // Remember current version before doing any long running operation
        // to ensure we are not changing a working copy that was changed
        // meanwhile
        const currentVersionId = this.versionId;
        // Resolve Content
        try {
            const content = await this.fileService.readFileStream(this.resource, {
                etag,
                limits: options?.limits,
            });
            // Clear orphaned state when resolving was successful
            this.setOrphaned(false);
            // Return early if the working copy content has changed
            // meanwhile to prevent loosing any changes
            if (currentVersionId !== this.versionId) {
                this.trace('resolveFromFile() - exit - without resolving because file working copy content changed');
                return;
            }
            await this.resolveFromContent(content, false /* not dirty (resolved from file) */);
        }
        catch (error) {
            const result = error.fileOperationResult;
            // Apply orphaned state based on error code
            this.setOrphaned(result === 1 /* FileOperationResult.FILE_NOT_FOUND */);
            // NotModified status is expected and can be handled gracefully
            // if we are resolved. We still want to update our last resolved
            // stat to e.g. detect changes to the file's readonly state
            if (this.isResolved() && result === 2 /* FileOperationResult.FILE_NOT_MODIFIED_SINCE */) {
                if (error instanceof NotModifiedSinceFileOperationError) {
                    this.updateLastResolvedFileStat(error.stat);
                }
                return;
            }
            // Unless we are forced to read from the file, ignore when a working copy has
            // been resolved once and the file was deleted meanwhile. Since we already have
            // the working copy resolved, we can return to this state and update the orphaned
            // flag to indicate that this working copy has no version on disk anymore.
            if (this.isResolved() &&
                result === 1 /* FileOperationResult.FILE_NOT_FOUND */ &&
                !forceReadFromFile) {
                return;
            }
            // Otherwise bubble up the error
            throw error;
        }
    }
    async resolveFromContent(content, dirty) {
        this.trace('resolveFromContent() - enter');
        // Return early if we are disposed
        if (this.isDisposed()) {
            this.trace('resolveFromContent() - exit - because working copy is disposed');
            return;
        }
        // Update our resolved disk stat
        this.updateLastResolvedFileStat({
            resource: this.resource,
            name: content.name,
            mtime: content.mtime,
            ctime: content.ctime,
            size: content.size,
            etag: content.etag,
            readonly: content.readonly,
            locked: content.locked,
            isFile: true,
            isDirectory: false,
            isSymbolicLink: false,
            children: undefined,
        });
        // Update existing model if we had been resolved
        if (this.isResolved()) {
            await this.doUpdateModel(content.value);
        }
        // Create new model otherwise
        else {
            await this.doCreateModel(content.value);
        }
        // Update working copy dirty flag. This is very important to call
        // in both cases of dirty or not because it conditionally updates
        // the `savedVersionId` to determine the version when to consider
        // the working copy as saved again (e.g. when undoing back to the
        // saved state)
        this.setDirty(!!dirty);
        // Emit as event
        this._onDidResolve.fire();
    }
    async doCreateModel(contents) {
        this.trace('doCreateModel()');
        // Create model and dispose it when we get disposed
        this._model = this._register(await this.modelFactory.createModel(this.resource, contents, CancellationToken.None));
        // Model listeners
        this.installModelListeners(this._model);
    }
    async doUpdateModel(contents) {
        this.trace('doUpdateModel()');
        // Update model value in a block that ignores content change events for dirty tracking
        this.ignoreDirtyOnModelContentChange = true;
        try {
            await this.model?.update(contents, CancellationToken.None);
        }
        finally {
            this.ignoreDirtyOnModelContentChange = false;
        }
    }
    installModelListeners(model) {
        // See https://github.com/microsoft/vscode/issues/30189
        // This code has been extracted to a different method because it caused a memory leak
        // where `value` was captured in the content change listener closure scope.
        // Content Change
        this._register(model.onDidChangeContent((e) => this.onModelContentChanged(model, e.isUndoing || e.isRedoing)));
        // Lifecycle
        this._register(model.onWillDispose(() => this.dispose()));
    }
    onModelContentChanged(model, isUndoingOrRedoing) {
        this.trace(`onModelContentChanged() - enter`);
        // In any case increment the version id because it tracks the content state of the model at all times
        this.versionId++;
        this.trace(`onModelContentChanged() - new versionId ${this.versionId}`);
        // Remember when the user changed the model through a undo/redo operation.
        // We need this information to throttle save participants to fix
        // https://github.com/microsoft/vscode/issues/102542
        if (isUndoingOrRedoing) {
            this.lastContentChangeFromUndoRedo = Date.now();
        }
        // We mark check for a dirty-state change upon model content change, unless:
        // - explicitly instructed to ignore it (e.g. from model.resolve())
        // - the model is readonly (in that case we never assume the change was done by the user)
        if (!this.ignoreDirtyOnModelContentChange && !this.isReadonly()) {
            // The contents changed as a matter of Undo and the version reached matches the saved one
            // In this case we clear the dirty flag and emit a SAVED event to indicate this state.
            if (model.versionId === this.savedVersionId) {
                this.trace('onModelContentChanged() - model content changed back to last saved version');
                // Clear flags
                const wasDirty = this.dirty;
                this.setDirty(false);
                // Emit revert event if we were dirty
                if (wasDirty) {
                    this._onDidRevert.fire();
                }
            }
            // Otherwise the content has changed and we signal this as becoming dirty
            else {
                this.trace('onModelContentChanged() - model content changed and marked as dirty');
                // Mark as dirty
                this.setDirty(true);
            }
        }
        // Emit as event
        this._onDidChangeContent.fire();
    }
    async forceResolveFromFile() {
        if (this.isDisposed()) {
            return; // return early when the working copy is invalid
        }
        // We go through the resolver to make
        // sure this kind of `resolve` is properly
        // running in sequence with any other running
        // `resolve` if any, including subsequent runs
        // that are triggered right after.
        await this.externalResolver({
            forceReadFromFile: true,
        });
    }
    //#endregion
    //#region Backup
    get backupDelay() {
        return this.model?.configuration?.backupDelay;
    }
    async backup(token) {
        // Fill in metadata if we are resolved
        let meta = undefined;
        if (this.lastResolvedFileStat) {
            meta = {
                mtime: this.lastResolvedFileStat.mtime,
                ctime: this.lastResolvedFileStat.ctime,
                size: this.lastResolvedFileStat.size,
                etag: this.lastResolvedFileStat.etag,
                orphaned: this.isOrphaned(),
            };
        }
        // Fill in content if we are resolved
        let content = undefined;
        if (this.isResolved()) {
            content = await raceCancellation(this.model.snapshot(2 /* SnapshotContext.Backup */, token), token);
        }
        return { meta, content };
    }
    static { this.UNDO_REDO_SAVE_PARTICIPANTS_AUTO_SAVE_THROTTLE_THRESHOLD = 500; }
    async save(options = Object.create(null)) {
        if (!this.isResolved()) {
            return false;
        }
        if (this.isReadonly()) {
            this.trace('save() - ignoring request for readonly resource');
            return false; // if working copy is readonly we do not attempt to save at all
        }
        if ((this.hasState(3 /* StoredFileWorkingCopyState.CONFLICT */) ||
            this.hasState(5 /* StoredFileWorkingCopyState.ERROR */)) &&
            (options.reason === 2 /* SaveReason.AUTO */ ||
                options.reason === 3 /* SaveReason.FOCUS_CHANGE */ ||
                options.reason === 4 /* SaveReason.WINDOW_CHANGE */)) {
            this.trace('save() - ignoring auto save request for file working copy that is in conflict or error');
            return false; // if working copy is in save conflict or error, do not save unless save reason is explicit
        }
        // Actually do save
        this.trace('save() - enter');
        await this.doSave(options);
        this.trace('save() - exit');
        return this.hasState(0 /* StoredFileWorkingCopyState.SAVED */);
    }
    async doSave(options) {
        if (typeof options.reason !== 'number') {
            options.reason = 1 /* SaveReason.EXPLICIT */;
        }
        const versionId = this.versionId;
        this.trace(`doSave(${versionId}) - enter with versionId ${versionId}`);
        // Return early if saved from within save participant to break recursion
        //
        // Scenario: a save participant triggers a save() on the working copy
        if (this.ignoreSaveFromSaveParticipants) {
            this.trace(`doSave(${versionId}) - exit - refusing to save() recursively from save participant`);
            return;
        }
        // Lookup any running save for this versionId and return it if found
        //
        // Scenario: user invoked the save action multiple times quickly for the same contents
        //           while the save was not yet finished to disk
        //
        if (this.saveSequentializer.isRunning(versionId)) {
            this.trace(`doSave(${versionId}) - exit - found a running save for versionId ${versionId}`);
            return this.saveSequentializer.running;
        }
        // Return early if not dirty (unless forced)
        //
        // Scenario: user invoked save action even though the working copy is not dirty
        if (!options.force && !this.dirty) {
            this.trace(`doSave(${versionId}) - exit - because not dirty and/or versionId is different (this.isDirty: ${this.dirty}, this.versionId: ${this.versionId})`);
            return;
        }
        // Return if currently saving by storing this save request as the next save that should happen.
        // Never ever must 2 saves execute at the same time because this can lead to dirty writes and race conditions.
        //
        // Scenario A: auto save was triggered and is currently busy saving to disk. this takes long enough that another auto save
        //             kicks in.
        // Scenario B: save is very slow (e.g. network share) and the user manages to change the working copy and trigger another save
        //             while the first save has not returned yet.
        //
        if (this.saveSequentializer.isRunning()) {
            this.trace(`doSave(${versionId}) - exit - because busy saving`);
            // Indicate to the save sequentializer that we want to
            // cancel the running operation so that ours can run
            // before the running one finishes.
            // Currently this will try to cancel running save
            // participants and running snapshots from the
            // save operation, but not the actual save which does
            // not support cancellation yet.
            this.saveSequentializer.cancelRunning();
            // Queue this as the upcoming save and return
            return this.saveSequentializer.queue(() => this.doSave(options));
        }
        // Push all edit operations to the undo stack so that the user has a chance to
        // Ctrl+Z back to the saved version.
        if (this.isResolved()) {
            this.model.pushStackElement();
        }
        const saveCancellation = new CancellationTokenSource();
        return this.progressService
            .withProgress({
            title: localize('saveParticipants', "Saving '{0}'", this.name),
            location: 10 /* ProgressLocation.Window */,
            cancellable: true,
            delay: this.isDirty() ? 3000 : 5000,
        }, (progress) => {
            return this.doSaveSequential(versionId, options, progress, saveCancellation);
        }, () => {
            saveCancellation.cancel();
        })
            .finally(() => {
            saveCancellation.dispose();
        });
    }
    doSaveSequential(versionId, options, progress, saveCancellation) {
        return this.saveSequentializer.run(versionId, (async () => {
            // A save participant can still change the working copy now
            // and since we are so close to saving we do not want to trigger
            // another auto save or similar, so we block this
            // In addition we update our version right after in case it changed
            // because of a working copy change
            // Save participants can also be skipped through API.
            if (this.isResolved() &&
                !options.skipSaveParticipants &&
                this.workingCopyFileService.hasSaveParticipants) {
                try {
                    // Measure the time it took from the last undo/redo operation to this save. If this
                    // time is below `UNDO_REDO_SAVE_PARTICIPANTS_THROTTLE_THRESHOLD`, we make sure to
                    // delay the save participant for the remaining time if the reason is auto save.
                    //
                    // This fixes the following issue:
                    // - the user has configured auto save with delay of 100ms or shorter
                    // - the user has a save participant enabled that modifies the file on each save
                    // - the user types into the file and the file gets saved
                    // - the user triggers undo operation
                    // - this will undo the save participant change but trigger the save participant right after
                    // - the user has no chance to undo over the save participant
                    //
                    // Reported as: https://github.com/microsoft/vscode/issues/102542
                    if (options.reason === 2 /* SaveReason.AUTO */ &&
                        typeof this.lastContentChangeFromUndoRedo === 'number') {
                        const timeFromUndoRedoToSave = Date.now() - this.lastContentChangeFromUndoRedo;
                        if (timeFromUndoRedoToSave <
                            StoredFileWorkingCopy_1.UNDO_REDO_SAVE_PARTICIPANTS_AUTO_SAVE_THROTTLE_THRESHOLD) {
                            await timeout(StoredFileWorkingCopy_1.UNDO_REDO_SAVE_PARTICIPANTS_AUTO_SAVE_THROTTLE_THRESHOLD -
                                timeFromUndoRedoToSave);
                        }
                    }
                    // Run save participants unless save was cancelled meanwhile
                    if (!saveCancellation.token.isCancellationRequested) {
                        this.ignoreSaveFromSaveParticipants = true;
                        try {
                            await this.workingCopyFileService.runSaveParticipants(this, { reason: options.reason ?? 1 /* SaveReason.EXPLICIT */, savedFrom: options.from }, progress, saveCancellation.token);
                        }
                        catch (err) {
                            if (isCancellationError(err) && !saveCancellation.token.isCancellationRequested) {
                                // participant wants to cancel this operation
                                saveCancellation.cancel();
                            }
                        }
                        finally {
                            this.ignoreSaveFromSaveParticipants = false;
                        }
                    }
                }
                catch (error) {
                    this.logService.error(`[stored file working copy] runSaveParticipants(${versionId}) - resulted in an error: ${error.toString()}`, this.resource.toString(), this.typeId);
                }
            }
            // It is possible that a subsequent save is cancelling this
            // running save. As such we return early when we detect that.
            if (saveCancellation.token.isCancellationRequested) {
                return;
            }
            // We have to protect against being disposed at this point. It could be that the save() operation
            // was triggerd followed by a dispose() operation right after without waiting. Typically we cannot
            // be disposed if we are dirty, but if we are not dirty, save() and dispose() can still be triggered
            // one after the other without waiting for the save() to complete. If we are disposed(), we risk
            // saving contents to disk that are stale (see https://github.com/microsoft/vscode/issues/50942).
            // To fix this issue, we will not store the contents to disk when we got disposed.
            if (this.isDisposed()) {
                return;
            }
            // We require a resolved working copy from this point on, since we are about to write data to disk.
            if (!this.isResolved()) {
                return;
            }
            // update versionId with its new value (if pre-save changes happened)
            versionId = this.versionId;
            // Clear error flag since we are trying to save again
            this.inErrorMode = false;
            // Save to Disk. We mark the save operation as currently running with
            // the latest versionId because it might have changed from a save
            // participant triggering
            progress.report({ message: localize('saveTextFile', 'Writing into file...') });
            this.trace(`doSave(${versionId}) - before write()`);
            const lastResolvedFileStat = assertIsDefined(this.lastResolvedFileStat);
            const resolvedFileWorkingCopy = this;
            return this.saveSequentializer.run(versionId, (async () => {
                try {
                    const writeFileOptions = {
                        mtime: lastResolvedFileStat.mtime,
                        etag: options.ignoreModifiedSince ||
                            !this.filesConfigurationService.preventSaveConflicts(lastResolvedFileStat.resource)
                            ? ETAG_DISABLED
                            : lastResolvedFileStat.etag,
                        unlock: options.writeUnlock,
                    };
                    let stat;
                    // Delegate to working copy model save method if any
                    if (typeof resolvedFileWorkingCopy.model.save === 'function') {
                        try {
                            stat = await resolvedFileWorkingCopy.model.save(writeFileOptions, saveCancellation.token);
                        }
                        catch (error) {
                            if (saveCancellation.token.isCancellationRequested) {
                                return undefined; // save was cancelled
                            }
                            throw error;
                        }
                    }
                    // Otherwise ask for a snapshot and save via file services
                    else {
                        // Snapshot working copy model contents
                        const snapshot = await raceCancellation(resolvedFileWorkingCopy.model.snapshot(1 /* SnapshotContext.Save */, saveCancellation.token), saveCancellation.token);
                        // It is possible that a subsequent save is cancelling this
                        // running save. As such we return early when we detect that
                        // However, we do not pass the token into the file service
                        // because that is an atomic operation currently without
                        // cancellation support, so we dispose the cancellation if
                        // it was not cancelled yet.
                        if (saveCancellation.token.isCancellationRequested) {
                            return;
                        }
                        else {
                            saveCancellation.dispose();
                        }
                        // Write them to disk
                        if (options?.writeElevated &&
                            this.elevatedFileService.isSupported(lastResolvedFileStat.resource)) {
                            stat = await this.elevatedFileService.writeFileElevated(lastResolvedFileStat.resource, assertIsDefined(snapshot), writeFileOptions);
                        }
                        else {
                            stat = await this.fileService.writeFile(lastResolvedFileStat.resource, assertIsDefined(snapshot), writeFileOptions);
                        }
                    }
                    this.handleSaveSuccess(stat, versionId, options);
                }
                catch (error) {
                    this.handleSaveError(error, versionId, options);
                }
            })(), () => saveCancellation.cancel());
        })(), () => saveCancellation.cancel());
    }
    handleSaveSuccess(stat, versionId, options) {
        // Updated resolved stat with updated stat
        this.updateLastResolvedFileStat(stat);
        // Update dirty state unless working copy has changed meanwhile
        if (versionId === this.versionId) {
            this.trace(`handleSaveSuccess(${versionId}) - setting dirty to false because versionId did not change`);
            this.setDirty(false);
        }
        else {
            this.trace(`handleSaveSuccess(${versionId}) - not setting dirty to false because versionId did change meanwhile`);
        }
        // Update orphan state given save was successful
        this.setOrphaned(false);
        // Emit Save Event
        this._onDidSave.fire({ reason: options.reason, stat, source: options.source });
    }
    handleSaveError(error, versionId, options) {
        ;
        (options.ignoreErrorHandler ? this.logService.trace : this.logService.error).apply(this.logService, [
            `[stored file working copy] handleSaveError(${versionId}) - exit - resulted in a save error: ${error.toString()}`,
            this.resource.toString(),
            this.typeId,
        ]);
        // Return early if the save() call was made asking to
        // handle the save error itself.
        if (options.ignoreErrorHandler) {
            throw error;
        }
        // In any case of an error, we mark the working copy as dirty to prevent data loss
        // It could be possible that the write corrupted the file on disk (e.g. when
        // an error happened after truncating the file) and as such we want to preserve
        // the working copy contents to prevent data loss.
        this.setDirty(true);
        // Flag as error state
        this.inErrorMode = true;
        // Look out for a save conflict
        if (error.fileOperationResult === 3 /* FileOperationResult.FILE_MODIFIED_SINCE */) {
            this.inConflictMode = true;
        }
        // Show save error to user for handling
        this.doHandleSaveError(error, options);
        // Emit as event
        this._onDidSaveError.fire();
    }
    doHandleSaveError(error, options) {
        const fileOperationError = error;
        const primaryActions = [];
        let message;
        // Dirty write prevention
        if (fileOperationError.fileOperationResult === 3 /* FileOperationResult.FILE_MODIFIED_SINCE */) {
            message = localize('staleSaveError', "Failed to save '{0}': The content of the file is newer. Do you want to overwrite the file with your changes?", this.name);
            primaryActions.push(toAction({
                id: 'fileWorkingCopy.overwrite',
                label: localize('overwrite', 'Overwrite'),
                run: () => this.save({ ...options, ignoreModifiedSince: true, reason: 1 /* SaveReason.EXPLICIT */ }),
            }));
            primaryActions.push(toAction({
                id: 'fileWorkingCopy.revert',
                label: localize('revert', 'Revert'),
                run: () => this.revert(),
            }));
        }
        // Any other save error
        else {
            const isWriteLocked = fileOperationError.fileOperationResult === 5 /* FileOperationResult.FILE_WRITE_LOCKED */;
            const triedToUnlock = isWriteLocked && fileOperationError.options?.unlock;
            const isPermissionDenied = fileOperationError.fileOperationResult === 6 /* FileOperationResult.FILE_PERMISSION_DENIED */;
            const canSaveElevated = this.elevatedFileService.isSupported(this.resource);
            // Error with Actions
            if (isErrorWithActions(error)) {
                primaryActions.push(...error.actions);
            }
            // Save Elevated
            if (canSaveElevated && (isPermissionDenied || triedToUnlock)) {
                primaryActions.push(toAction({
                    id: 'fileWorkingCopy.saveElevated',
                    label: triedToUnlock
                        ? isWindows
                            ? localize('overwriteElevated', 'Overwrite as Admin...')
                            : localize('overwriteElevatedSudo', 'Overwrite as Sudo...')
                        : isWindows
                            ? localize('saveElevated', 'Retry as Admin...')
                            : localize('saveElevatedSudo', 'Retry as Sudo...'),
                    run: () => {
                        this.save({
                            ...options,
                            writeElevated: true,
                            writeUnlock: triedToUnlock,
                            reason: 1 /* SaveReason.EXPLICIT */,
                        });
                    },
                }));
            }
            // Unlock
            else if (isWriteLocked) {
                primaryActions.push(toAction({
                    id: 'fileWorkingCopy.unlock',
                    label: localize('overwrite', 'Overwrite'),
                    run: () => this.save({ ...options, writeUnlock: true, reason: 1 /* SaveReason.EXPLICIT */ }),
                }));
            }
            // Retry
            else {
                primaryActions.push(toAction({
                    id: 'fileWorkingCopy.retry',
                    label: localize('retry', 'Retry'),
                    run: () => this.save({ ...options, reason: 1 /* SaveReason.EXPLICIT */ }),
                }));
            }
            // Save As
            primaryActions.push(toAction({
                id: 'fileWorkingCopy.saveAs',
                label: localize('saveAs', 'Save As...'),
                run: async () => {
                    const editor = this.workingCopyEditorService.findEditor(this);
                    if (editor) {
                        const result = await this.editorService.save(editor, {
                            saveAs: true,
                            reason: 1 /* SaveReason.EXPLICIT */,
                        });
                        if (!result.success) {
                            this.doHandleSaveError(error, options); // show error again given the operation failed
                        }
                    }
                },
            }));
            // Revert
            primaryActions.push(toAction({
                id: 'fileWorkingCopy.revert',
                label: localize('revert', 'Revert'),
                run: () => this.revert(),
            }));
            // Message
            if (isWriteLocked) {
                if (triedToUnlock && canSaveElevated) {
                    message = isWindows
                        ? localize('readonlySaveErrorAdmin', "Failed to save '{0}': File is read-only. Select 'Overwrite as Admin' to retry as administrator.", this.name)
                        : localize('readonlySaveErrorSudo', "Failed to save '{0}': File is read-only. Select 'Overwrite as Sudo' to retry as superuser.", this.name);
                }
                else {
                    message = localize('readonlySaveError', "Failed to save '{0}': File is read-only. Select 'Overwrite' to attempt to make it writeable.", this.name);
                }
            }
            else if (canSaveElevated && isPermissionDenied) {
                message = isWindows
                    ? localize('permissionDeniedSaveError', "Failed to save '{0}': Insufficient permissions. Select 'Retry as Admin' to retry as administrator.", this.name)
                    : localize('permissionDeniedSaveErrorSudo', "Failed to save '{0}': Insufficient permissions. Select 'Retry as Sudo' to retry as superuser.", this.name);
            }
            else {
                message = localize({
                    key: 'genericSaveError',
                    comment: ['{0} is the resource that failed to save and {1} the error message'],
                }, "Failed to save '{0}': {1}", this.name, toErrorMessage(error, false));
            }
        }
        // Show to the user as notification
        const handle = this.notificationService.notify({
            id: `${hash(this.resource.toString())}`,
            severity: Severity.Error,
            message,
            actions: { primary: primaryActions },
        });
        // Remove automatically when we get saved/reverted
        const listener = this._register(Event.once(Event.any(this.onDidSave, this.onDidRevert))(() => handle.close()));
        this._register(Event.once(handle.onDidClose)(() => listener.dispose()));
    }
    updateLastResolvedFileStat(newFileStat) {
        const oldReadonly = this.isReadonly();
        // First resolve - just take
        if (!this.lastResolvedFileStat) {
            this.lastResolvedFileStat = newFileStat;
        }
        // Subsequent resolve - make sure that we only assign it if the mtime
        // is equal or has advanced.
        // This prevents race conditions from resolving and saving. If a save
        // comes in late after a revert was called, the mtime could be out of
        // sync.
        else if (this.lastResolvedFileStat.mtime <= newFileStat.mtime) {
            this.lastResolvedFileStat = newFileStat;
        }
        // In all other cases update only the readonly and locked flags
        else {
            this.lastResolvedFileStat = {
                ...this.lastResolvedFileStat,
                readonly: newFileStat.readonly,
                locked: newFileStat.locked,
            };
        }
        // Signal that the readonly state changed
        if (this.isReadonly() !== oldReadonly) {
            this._onDidChangeReadonly.fire();
        }
    }
    //#endregion
    //#region Revert
    async revert(options) {
        if (!this.isResolved() || (!this.dirty && !options?.force)) {
            return; // ignore if not resolved or not dirty and not enforced
        }
        this.trace('revert()');
        // Unset flags
        const wasDirty = this.dirty;
        const undoSetDirty = this.doSetDirty(false);
        // Force read from disk unless reverting soft
        const softUndo = options?.soft;
        if (!softUndo) {
            try {
                await this.forceResolveFromFile();
            }
            catch (error) {
                // FileNotFound means the file got deleted meanwhile, so ignore it
                if (error.fileOperationResult !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                    // Set flags back to previous values, we are still dirty if revert failed
                    undoSetDirty();
                    throw error;
                }
            }
        }
        // Emit file change event
        this._onDidRevert.fire();
        // Emit dirty change event
        if (wasDirty) {
            this._onDidChangeDirty.fire();
        }
    }
    hasState(state) {
        switch (state) {
            case 3 /* StoredFileWorkingCopyState.CONFLICT */:
                return this.inConflictMode;
            case 1 /* StoredFileWorkingCopyState.DIRTY */:
                return this.dirty;
            case 5 /* StoredFileWorkingCopyState.ERROR */:
                return this.inErrorMode;
            case 4 /* StoredFileWorkingCopyState.ORPHAN */:
                return this.isOrphaned();
            case 2 /* StoredFileWorkingCopyState.PENDING_SAVE */:
                return this.saveSequentializer.isRunning();
            case 0 /* StoredFileWorkingCopyState.SAVED */:
                return !this.dirty;
        }
    }
    async joinState(state) {
        return this.saveSequentializer.running;
    }
    //#endregion
    //#region Utilities
    isReadonly() {
        return this.filesConfigurationService.isReadonly(this.resource, this.lastResolvedFileStat);
    }
    trace(msg) {
        this.logService.trace(`[stored file working copy] ${msg}`, this.resource.toString(), this.typeId);
    }
    //#endregion
    //#region Dispose
    dispose() {
        this.trace('dispose()');
        // State
        this.inConflictMode = false;
        this.inErrorMode = false;
        // Free up model for GC
        this._model = undefined;
        super.dispose();
    }
};
StoredFileWorkingCopy = StoredFileWorkingCopy_1 = __decorate([
    __param(5, IFileService),
    __param(6, ILogService),
    __param(7, IWorkingCopyFileService),
    __param(8, IFilesConfigurationService),
    __param(9, IWorkingCopyBackupService),
    __param(10, IWorkingCopyService),
    __param(11, INotificationService),
    __param(12, IWorkingCopyEditorService),
    __param(13, IEditorService),
    __param(14, IElevatedFileService),
    __param(15, IProgressService)
], StoredFileWorkingCopy);
export { StoredFileWorkingCopy };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmVkRmlsZVdvcmtpbmdDb3B5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L2NvbW1vbi9zdG9yZWRGaWxlV29ya2luZ0NvcHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BHLE9BQU8sRUFDTixhQUFhLEVBSWIsWUFBWSxFQUlaLGtDQUFrQyxHQUNsQyxNQUFNLDRDQUE0QyxDQUFBO0FBRW5ELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBTzdELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRXJFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3pHLE9BQU8sRUFBRSx5QkFBeUIsRUFBOEIsTUFBTSx3QkFBd0IsQ0FBQTtBQUM5RixPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLFFBQVEsR0FDUixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVB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