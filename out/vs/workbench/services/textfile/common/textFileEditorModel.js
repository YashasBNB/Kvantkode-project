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
var TextFileEditorModel_1;
import { localize } from '../../../../nls.js';
import { Emitter } from '../../../../base/common/event.js';
import { mark } from '../../../../base/common/performance.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { ITextFileService, } from './textfiles.js';
import { SaveSourceRegistry } from '../../../common/editor.js';
import { BaseTextEditorModel } from '../../../common/editor/textEditorModel.js';
import { IWorkingCopyBackupService, } from '../../workingCopy/common/workingCopyBackup.js';
import { IFileService, ETAG_DISABLED, NotModifiedSinceFileOperationError, } from '../../../../platform/files/common/files.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { timeout, TaskSequentializer } from '../../../../base/common/async.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { basename } from '../../../../base/common/path.js';
import { IWorkingCopyService } from '../../workingCopy/common/workingCopyService.js';
import { NO_TYPE_ID, } from '../../workingCopy/common/workingCopy.js';
import { IFilesConfigurationService } from '../../filesConfiguration/common/filesConfigurationService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { UTF16be, UTF16le, UTF8, UTF8_with_bom } from './encoding.js';
import { createTextBufferFactoryFromStream } from '../../../../editor/common/model/textModel.js';
import { ILanguageDetectionService } from '../../languageDetection/common/languageDetectionWorkerService.js';
import { IPathService } from '../../path/common/pathService.js';
import { extUri } from '../../../../base/common/resources.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { isCancellationError } from '../../../../base/common/errors.js';
/**
 * The text file editor model listens to changes to its underlying code editor model and saves these changes through the file service back to the disk.
 */
let TextFileEditorModel = class TextFileEditorModel extends BaseTextEditorModel {
    static { TextFileEditorModel_1 = this; }
    static { this.TEXTFILE_SAVE_ENCODING_SOURCE = SaveSourceRegistry.registerSource('textFileEncoding.source', localize('textFileCreate.source', 'File Encoding Changed')); }
    static { this.UNDO_REDO_SAVE_PARTICIPANTS_AUTO_SAVE_THROTTLE_THRESHOLD = 500; }
    constructor(resource, preferredEncoding, // encoding as chosen by the user
    preferredLanguageId, languageService, modelService, fileService, textFileService, workingCopyBackupService, logService, workingCopyService, filesConfigurationService, labelService, languageDetectionService, accessibilityService, pathService, extensionService, progressService) {
        super(modelService, languageService, languageDetectionService, accessibilityService);
        this.resource = resource;
        this.preferredEncoding = preferredEncoding;
        this.preferredLanguageId = preferredLanguageId;
        this.fileService = fileService;
        this.textFileService = textFileService;
        this.workingCopyBackupService = workingCopyBackupService;
        this.logService = logService;
        this.workingCopyService = workingCopyService;
        this.filesConfigurationService = filesConfigurationService;
        this.labelService = labelService;
        this.pathService = pathService;
        this.extensionService = extensionService;
        this.progressService = progressService;
        //#region Events
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
        this._onDidChangeEncoding = this._register(new Emitter());
        this.onDidChangeEncoding = this._onDidChangeEncoding.event;
        this._onDidChangeOrphaned = this._register(new Emitter());
        this.onDidChangeOrphaned = this._onDidChangeOrphaned.event;
        this._onDidChangeReadonly = this._register(new Emitter());
        this.onDidChangeReadonly = this._onDidChangeReadonly.event;
        //#endregion
        this.typeId = NO_TYPE_ID; // IMPORTANT: never change this to not break existing assumptions (e.g. backups)
        this.capabilities = 0 /* WorkingCopyCapabilities.None */;
        this.versionId = 0;
        this.ignoreDirtyOnModelContentChange = false;
        this.ignoreSaveFromSaveParticipants = false;
        this.lastModelContentChangeFromUndoRedo = undefined;
        this.saveSequentializer = new TaskSequentializer();
        this.dirty = false;
        this.inConflictMode = false;
        this.inOrphanMode = false;
        this.inErrorMode = false;
        this.hasEncodingSetExplicitly = false;
        this.name = basename(this.labelService.getUriLabel(this.resource));
        this.resourceHasExtension = !!extUri.extname(this.resource);
        // Make known to working copy service
        this._register(this.workingCopyService.registerWorkingCopy(this));
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.fileService.onDidFilesChange((e) => this.onDidFilesChange(e)));
        this._register(this.filesConfigurationService.onDidChangeFilesAssociation(() => this.onDidChangeFilesAssociation()));
        this._register(this.filesConfigurationService.onDidChangeReadonly(() => this._onDidChangeReadonly.fire()));
    }
    async onDidFilesChange(e) {
        let fileEventImpactsModel = false;
        let newInOrphanModeGuess;
        // If we are currently orphaned, we check if the model file was added back
        if (this.inOrphanMode) {
            const modelFileAdded = e.contains(this.resource, 1 /* FileChangeType.ADDED */);
            if (modelFileAdded) {
                newInOrphanModeGuess = false;
                fileEventImpactsModel = true;
            }
        }
        // Otherwise we check if the model file was deleted
        else {
            const modelFileDeleted = e.contains(this.resource, 2 /* FileChangeType.DELETED */);
            if (modelFileDeleted) {
                newInOrphanModeGuess = true;
                fileEventImpactsModel = true;
            }
        }
        if (fileEventImpactsModel && this.inOrphanMode !== newInOrphanModeGuess) {
            let newInOrphanModeValidated = false;
            if (newInOrphanModeGuess) {
                // We have received reports of users seeing delete events even though the file still
                // exists (network shares issue: https://github.com/microsoft/vscode/issues/13665).
                // Since we do not want to mark the model as orphaned, we have to check if the
                // file is really gone and not just a faulty file event.
                await timeout(100, CancellationToken.None);
                if (this.isDisposed()) {
                    newInOrphanModeValidated = true;
                }
                else {
                    const exists = await this.fileService.exists(this.resource);
                    newInOrphanModeValidated = !exists;
                }
            }
            if (this.inOrphanMode !== newInOrphanModeValidated && !this.isDisposed()) {
                this.setOrphaned(newInOrphanModeValidated);
            }
        }
    }
    setOrphaned(orphaned) {
        if (this.inOrphanMode !== orphaned) {
            this.inOrphanMode = orphaned;
            this._onDidChangeOrphaned.fire();
        }
    }
    onDidChangeFilesAssociation() {
        if (!this.isResolved()) {
            return;
        }
        const firstLineText = this.getFirstLineText(this.textEditorModel);
        const languageSelection = this.getOrCreateLanguage(this.resource, this.languageService, this.preferredLanguageId, firstLineText);
        this.textEditorModel.setLanguage(languageSelection);
    }
    setLanguageId(languageId, source) {
        super.setLanguageId(languageId, source);
        this.preferredLanguageId = languageId;
    }
    //#region Backup
    async backup(token) {
        // Fill in metadata if we are resolved
        let meta = undefined;
        if (this.lastResolvedFileStat) {
            meta = {
                mtime: this.lastResolvedFileStat.mtime,
                ctime: this.lastResolvedFileStat.ctime,
                size: this.lastResolvedFileStat.size,
                etag: this.lastResolvedFileStat.etag,
                orphaned: this.inOrphanMode,
            };
        }
        // Fill in content the same way we would do when
        // saving the file via the text file service
        // encoding support (hardcode UTF-8)
        const content = await this.textFileService.getEncodedReadable(this.resource, this.createSnapshot() ?? undefined, { encoding: UTF8 });
        return { meta, content };
    }
    //#endregion
    //#region Revert
    async revert(options) {
        if (!this.isResolved()) {
            return;
        }
        // Unset flags
        const wasDirty = this.dirty;
        const undo = this.doSetDirty(false);
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
                    undo();
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
    //#endregion
    //#region Resolve
    async resolve(options) {
        this.trace('resolve() - enter');
        mark('code/willResolveTextFileEditorModel');
        // Return early if we are disposed
        if (this.isDisposed()) {
            this.trace('resolve() - exit - without resolving because model is disposed');
            return;
        }
        // Unless there are explicit contents provided, it is important that we do not
        // resolve a model that is dirty or is in the process of saving to prevent data
        // loss.
        if (!options?.contents && (this.dirty || this.saveSequentializer.isRunning())) {
            this.trace('resolve() - exit - without resolving because model is dirty or being saved');
            return;
        }
        // Resolve either from backup or from file
        await this.doResolve(options);
        mark('code/didResolveTextFileEditorModel');
    }
    async doResolve(options) {
        // First check if we have contents to use for the model
        if (options?.contents) {
            return this.resolveFromBuffer(options.contents, options);
        }
        // Second, check if we have a backup to resolve from (only for new models)
        const isNewModel = !this.isResolved();
        if (isNewModel) {
            const resolvedFromBackup = await this.resolveFromBackup(options);
            if (resolvedFromBackup) {
                return;
            }
        }
        // Finally, resolve from file resource
        return this.resolveFromFile(options);
    }
    async resolveFromBuffer(buffer, options) {
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
        const preferredEncoding = await this.textFileService.encoding.getPreferredWriteEncoding(this.resource, this.preferredEncoding);
        // Resolve with buffer
        this.resolveFromContent({
            resource: this.resource,
            name: this.name,
            mtime,
            ctime,
            size,
            etag,
            value: buffer,
            encoding: preferredEncoding.encoding,
            readonly: false,
            locked: false,
        }, true /* dirty (resolved from buffer) */, options);
    }
    async resolveFromBackup(options) {
        // Resolve backup if any
        const backup = await this.workingCopyBackupService.resolve(this);
        // Resolve preferred encoding if we need it
        let encoding = UTF8;
        if (backup) {
            encoding = (await this.textFileService.encoding.getPreferredWriteEncoding(this.resource, this.preferredEncoding)).encoding;
        }
        // Abort if someone else managed to resolve the model by now
        const isNewModel = !this.isResolved();
        if (!isNewModel) {
            this.trace('resolveFromBackup() - exit - without resolving because previously new model got created meanwhile');
            return true; // imply that resolving has happened in another operation
        }
        // Try to resolve from backup if we have any
        if (backup) {
            await this.doResolveFromBackup(backup, encoding, options);
            return true;
        }
        // Otherwise signal back that resolving did not happen
        return false;
    }
    async doResolveFromBackup(backup, encoding, options) {
        this.trace('doResolveFromBackup()');
        // Resolve with backup
        this.resolveFromContent({
            resource: this.resource,
            name: this.name,
            mtime: backup.meta ? backup.meta.mtime : Date.now(),
            ctime: backup.meta ? backup.meta.ctime : Date.now(),
            size: backup.meta ? backup.meta.size : 0,
            etag: backup.meta ? backup.meta.etag : ETAG_DISABLED, // etag disabled if unknown!
            value: await createTextBufferFactoryFromStream(await this.textFileService.getDecodedStream(this.resource, backup.value, {
                encoding: UTF8,
            })),
            encoding,
            readonly: false,
            locked: false,
        }, true /* dirty (resolved from backup) */, options);
        // Restore orphaned flag based on state
        if (backup.meta?.orphaned) {
            this.setOrphaned(true);
        }
    }
    async resolveFromFile(options) {
        this.trace('resolveFromFile()');
        const forceReadFromFile = options?.forceReadFromFile;
        const allowBinary = this.isResolved() /* always allow if we resolved previously */ || options?.allowBinary;
        // Decide on etag
        let etag;
        if (forceReadFromFile) {
            etag = ETAG_DISABLED; // disable ETag if we enforce to read from disk
        }
        else if (this.lastResolvedFileStat) {
            etag = this.lastResolvedFileStat.etag; // otherwise respect etag to support caching
        }
        // Remember current version before doing any long running operation
        // to ensure we are not changing a model that was changed meanwhile
        const currentVersionId = this.versionId;
        // Resolve Content
        try {
            const content = await this.textFileService.readStream(this.resource, {
                acceptTextOnly: !allowBinary,
                etag,
                encoding: this.preferredEncoding,
                limits: options?.limits,
            });
            // Clear orphaned state when resolving was successful
            this.setOrphaned(false);
            // Return early if the model content has changed
            // meanwhile to prevent loosing any changes
            if (currentVersionId !== this.versionId) {
                this.trace('resolveFromFile() - exit - without resolving because model content changed');
                return;
            }
            return this.resolveFromContent(content, false /* not dirty (resolved from file) */, options);
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
            // Unless we are forced to read from the file, Ignore when a model has been resolved once
            // and the file was deleted meanwhile. Since we already have the model resolved, we can return
            // to this state and update the orphaned flag to indicate that this model has no version on
            // disk anymore.
            if (this.isResolved() &&
                result === 1 /* FileOperationResult.FILE_NOT_FOUND */ &&
                !forceReadFromFile) {
                return;
            }
            // Otherwise bubble up the error
            throw error;
        }
    }
    resolveFromContent(content, dirty, options) {
        this.trace('resolveFromContent() - enter');
        // Return early if we are disposed
        if (this.isDisposed()) {
            this.trace('resolveFromContent() - exit - because model is disposed');
            return;
        }
        // Update our resolved disk stat model
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
        // Keep the original encoding to not loose it when saving
        const oldEncoding = this.contentEncoding;
        this.contentEncoding = content.encoding;
        // Handle events if encoding changed
        if (this.preferredEncoding) {
            this.updatePreferredEncoding(this.contentEncoding); // make sure to reflect the real encoding of the file (never out of sync)
        }
        else if (oldEncoding !== this.contentEncoding) {
            this._onDidChangeEncoding.fire();
        }
        // Update Existing Model
        if (this.textEditorModel) {
            this.doUpdateTextModel(content.value);
        }
        // Create New Model
        else {
            this.doCreateTextModel(content.resource, content.value);
        }
        // Update model dirty flag. This is very important to call
        // in both cases of dirty or not because it conditionally
        // updates the `bufferSavedVersionId` to determine the
        // version when to consider the model as saved again (e.g.
        // when undoing back to the saved state)
        this.setDirty(!!dirty);
        // Emit as event
        this._onDidResolve.fire(options?.reason ?? 3 /* TextFileResolveReason.OTHER */);
    }
    doCreateTextModel(resource, value) {
        this.trace('doCreateTextModel()');
        // Create model
        const textModel = this.createTextEditorModel(value, resource, this.preferredLanguageId);
        // Model Listeners
        this.installModelListeners(textModel);
        // Detect language from content
        this.autoDetectLanguage();
    }
    doUpdateTextModel(value) {
        this.trace('doUpdateTextModel()');
        // Update model value in a block that ignores content change events for dirty tracking
        this.ignoreDirtyOnModelContentChange = true;
        try {
            this.updateTextEditorModel(value, this.preferredLanguageId);
        }
        finally {
            this.ignoreDirtyOnModelContentChange = false;
        }
    }
    installModelListeners(model) {
        // See https://github.com/microsoft/vscode/issues/30189
        // This code has been extracted to a different method because it caused a memory leak
        // where `value` was captured in the content change listener closure scope.
        this._register(model.onDidChangeContent((e) => this.onModelContentChanged(model, e.isUndoing || e.isRedoing)));
        this._register(model.onDidChangeLanguage(() => this.onMaybeShouldChangeEncoding())); // detect possible encoding change via language specific settings
        super.installModelListeners(model);
    }
    onModelContentChanged(model, isUndoingOrRedoing) {
        this.trace(`onModelContentChanged() - enter`);
        // In any case increment the version id because it tracks the textual content state of the model at all times
        this.versionId++;
        this.trace(`onModelContentChanged() - new versionId ${this.versionId}`);
        // Remember when the user changed the model through a undo/redo operation.
        // We need this information to throttle save participants to fix
        // https://github.com/microsoft/vscode/issues/102542
        if (isUndoingOrRedoing) {
            this.lastModelContentChangeFromUndoRedo = Date.now();
        }
        // We mark check for a dirty-state change upon model content change, unless:
        // - explicitly instructed to ignore it (e.g. from model.resolve())
        // - the model is readonly (in that case we never assume the change was done by the user)
        if (!this.ignoreDirtyOnModelContentChange && !this.isReadonly()) {
            // The contents changed as a matter of Undo and the version reached matches the saved one
            // In this case we clear the dirty flag and emit a SAVED event to indicate this state.
            if (model.getAlternativeVersionId() === this.bufferSavedVersionId) {
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
        // Detect language from content
        this.autoDetectLanguage();
    }
    async autoDetectLanguage() {
        // Wait to be ready to detect language
        await this.extensionService?.whenInstalledExtensionsRegistered();
        // Only perform language detection conditionally
        const languageId = this.getLanguageId();
        if (this.resource.scheme === this.pathService.defaultUriScheme && // make sure to not detect language for non-user visible documents
            (!languageId || languageId === PLAINTEXT_LANGUAGE_ID) && // only run on files with plaintext language set or no language set at all
            !this.resourceHasExtension // only run if this particular file doesn't have an extension
        ) {
            return super.autoDetectLanguage();
        }
    }
    async forceResolveFromFile() {
        if (this.isDisposed()) {
            return; // return early when the model is invalid
        }
        // We go through the text file service to make
        // sure this kind of `resolve` is properly
        // running in sequence with any other running
        // `resolve` if any, including subsequent runs
        // that are triggered right after.
        await this.textFileService.files.resolve(this.resource, {
            reload: { async: false },
            forceReadFromFile: true,
        });
    }
    //#endregion
    //#region Dirty
    isDirty() {
        return this.dirty;
    }
    isModified() {
        return this.isDirty();
    }
    setDirty(dirty) {
        if (!this.isResolved()) {
            return; // only resolved models can be marked dirty
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
        const oldBufferSavedVersionId = this.bufferSavedVersionId;
        if (!dirty) {
            this.dirty = false;
            this.inConflictMode = false;
            this.inErrorMode = false;
            this.updateSavedVersionId();
        }
        else {
            this.dirty = true;
        }
        // Return function to revert this call
        return () => {
            this.dirty = wasDirty;
            this.inConflictMode = wasInConflictMode;
            this.inErrorMode = wasInErrorMode;
            this.bufferSavedVersionId = oldBufferSavedVersionId;
        };
    }
    //#endregion
    //#region Save
    async save(options = Object.create(null)) {
        if (!this.isResolved()) {
            return false;
        }
        if (this.isReadonly()) {
            this.trace('save() - ignoring request for readonly resource');
            return false; // if model is readonly we do not attempt to save at all
        }
        if ((this.hasState(3 /* TextFileEditorModelState.CONFLICT */) ||
            this.hasState(5 /* TextFileEditorModelState.ERROR */)) &&
            (options.reason === 2 /* SaveReason.AUTO */ ||
                options.reason === 3 /* SaveReason.FOCUS_CHANGE */ ||
                options.reason === 4 /* SaveReason.WINDOW_CHANGE */)) {
            this.trace('save() - ignoring auto save request for model that is in conflict or error');
            return false; // if model is in save conflict or error, do not save unless save reason is explicit
        }
        // Actually do save and log
        this.trace('save() - enter');
        await this.doSave(options);
        this.trace('save() - exit');
        return this.hasState(0 /* TextFileEditorModelState.SAVED */);
    }
    async doSave(options) {
        if (typeof options.reason !== 'number') {
            options.reason = 1 /* SaveReason.EXPLICIT */;
        }
        const versionId = this.versionId;
        this.trace(`doSave(${versionId}) - enter with versionId ${versionId}`);
        // Return early if saved from within save participant to break recursion
        //
        // Scenario: a save participant triggers a save() on the model
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
        // Scenario: user invoked save action even though the model is not dirty
        if (!options.force && !this.dirty) {
            this.trace(`doSave(${versionId}) - exit - because not dirty and/or versionId is different (this.isDirty: ${this.dirty}, this.versionId: ${this.versionId})`);
            return;
        }
        // Return if currently saving by storing this save request as the next save that should happen.
        // Never ever must 2 saves execute at the same time because this can lead to dirty writes and race conditions.
        //
        // Scenario A: auto save was triggered and is currently busy saving to disk. this takes long enough that another auto save
        //             kicks in.
        // Scenario B: save is very slow (e.g. network share) and the user manages to change the buffer and trigger another save
        //             while the first save has not returned yet.
        //
        if (this.saveSequentializer.isRunning()) {
            this.trace(`doSave(${versionId}) - exit - because busy saving`);
            // Indicate to the save sequentializer that we want to
            // cancel the running operation so that ours can run
            // before the running one finishes.
            // Currently this will try to cancel running save
            // participants but never a running save.
            this.saveSequentializer.cancelRunning();
            // Queue this as the upcoming save and return
            return this.saveSequentializer.queue(() => this.doSave(options));
        }
        // Push all edit operations to the undo stack so that the user has a chance to
        // Ctrl+Z back to the saved version.
        if (this.isResolved()) {
            this.textEditorModel.pushStackElement();
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
            // A save participant can still change the model now and since we are so close to saving
            // we do not want to trigger another auto save or similar, so we block this
            // In addition we update our version right after in case it changed because of a model change
            //
            // Save participants can also be skipped through API.
            if (this.isResolved() && !options.skipSaveParticipants) {
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
                        typeof this.lastModelContentChangeFromUndoRedo === 'number') {
                        const timeFromUndoRedoToSave = Date.now() - this.lastModelContentChangeFromUndoRedo;
                        if (timeFromUndoRedoToSave <
                            TextFileEditorModel_1.UNDO_REDO_SAVE_PARTICIPANTS_AUTO_SAVE_THROTTLE_THRESHOLD) {
                            await timeout(TextFileEditorModel_1.UNDO_REDO_SAVE_PARTICIPANTS_AUTO_SAVE_THROTTLE_THRESHOLD -
                                timeFromUndoRedoToSave);
                        }
                    }
                    // Run save participants unless save was cancelled meanwhile
                    if (!saveCancellation.token.isCancellationRequested) {
                        this.ignoreSaveFromSaveParticipants = true;
                        try {
                            await this.textFileService.files.runSaveParticipants(this, { reason: options.reason ?? 1 /* SaveReason.EXPLICIT */, savedFrom: options.from }, progress, saveCancellation.token);
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
                    this.logService.error(`[text file model] runSaveParticipants(${versionId}) - resulted in an error: ${error.toString()}`, this.resource.toString());
                }
            }
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
            // We have to protect against being disposed at this point. It could be that the save() operation
            // was triggerd followed by a dispose() operation right after without waiting. Typically we cannot
            // be disposed if we are dirty, but if we are not dirty, save() and dispose() can still be triggered
            // one after the other without waiting for the save() to complete. If we are disposed(), we risk
            // saving contents to disk that are stale (see https://github.com/microsoft/vscode/issues/50942).
            // To fix this issue, we will not store the contents to disk when we got disposed.
            if (this.isDisposed()) {
                return;
            }
            // We require a resolved model from this point on, since we are about to write data to disk.
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
            const resolvedTextFileEditorModel = this;
            return this.saveSequentializer.run(versionId, (async () => {
                try {
                    const stat = await this.textFileService.write(lastResolvedFileStat.resource, resolvedTextFileEditorModel.createSnapshot(), {
                        mtime: lastResolvedFileStat.mtime,
                        encoding: this.getEncoding(),
                        etag: options.ignoreModifiedSince ||
                            !this.filesConfigurationService.preventSaveConflicts(lastResolvedFileStat.resource, resolvedTextFileEditorModel.getLanguageId())
                            ? ETAG_DISABLED
                            : lastResolvedFileStat.etag,
                        unlock: options.writeUnlock,
                        writeElevated: options.writeElevated,
                    });
                    this.handleSaveSuccess(stat, versionId, options);
                }
                catch (error) {
                    this.handleSaveError(error, versionId, options);
                }
            })());
        })(), () => saveCancellation.cancel());
    }
    handleSaveSuccess(stat, versionId, options) {
        // Updated resolved stat with updated stat
        this.updateLastResolvedFileStat(stat);
        // Update dirty state unless model has changed meanwhile
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
            `[text file model] handleSaveError(${versionId}) - exit - resulted in a save error: ${error.toString()}`,
            this.resource.toString(),
        ]);
        // Return early if the save() call was made asking to
        // handle the save error itself.
        if (options.ignoreErrorHandler) {
            throw error;
        }
        // In any case of an error, we mark the model as dirty to prevent data loss
        // It could be possible that the write corrupted the file on disk (e.g. when
        // an error happened after truncating the file) and as such we want to preserve
        // the model contents to prevent data loss.
        this.setDirty(true);
        // Flag as error state in the model
        this.inErrorMode = true;
        // Look out for a save conflict
        if (error.fileOperationResult === 3 /* FileOperationResult.FILE_MODIFIED_SINCE */) {
            this.inConflictMode = true;
        }
        // Show to user
        this.textFileService.files.saveErrorHandler.onSaveError(error, this, options);
        // Emit as event
        this._onDidSaveError.fire();
    }
    updateSavedVersionId() {
        // we remember the models alternate version id to remember when the version
        // of the model matches with the saved version on disk. we need to keep this
        // in order to find out if the model changed back to a saved version (e.g.
        // when undoing long enough to reach to a version that is saved and then to
        // clear the dirty flag)
        if (this.isResolved()) {
            this.bufferSavedVersionId = this.textEditorModel.getAlternativeVersionId();
        }
    }
    updateLastResolvedFileStat(newFileStat) {
        const oldReadonly = this.isReadonly();
        // First resolve - just take
        if (!this.lastResolvedFileStat) {
            this.lastResolvedFileStat = newFileStat;
        }
        // Subsequent resolve - make sure that we only assign it if the mtime is equal or has advanced.
        // This prevents race conditions from resolving and saving. If a save comes in late after a revert
        // was called, the mtime could be out of sync.
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
    hasState(state) {
        switch (state) {
            case 3 /* TextFileEditorModelState.CONFLICT */:
                return this.inConflictMode;
            case 1 /* TextFileEditorModelState.DIRTY */:
                return this.dirty;
            case 5 /* TextFileEditorModelState.ERROR */:
                return this.inErrorMode;
            case 4 /* TextFileEditorModelState.ORPHAN */:
                return this.inOrphanMode;
            case 2 /* TextFileEditorModelState.PENDING_SAVE */:
                return this.saveSequentializer.isRunning();
            case 0 /* TextFileEditorModelState.SAVED */:
                return !this.dirty;
        }
    }
    async joinState(state) {
        return this.saveSequentializer.running;
    }
    getLanguageId() {
        if (this.textEditorModel) {
            return this.textEditorModel.getLanguageId();
        }
        return this.preferredLanguageId;
    }
    //#region Encoding
    async onMaybeShouldChangeEncoding() {
        // This is a bit of a hack but there is a narrow case where
        // per-language configured encodings are not working:
        //
        // On startup we may not yet have all languages resolved so
        // we pick a wrong encoding. We never used to re-apply the
        // encoding when the language was then resolved, because that
        // is an operation that is will have to fetch the contents
        // again from disk.
        //
        // To mitigate this issue, when we detect the model language
        // changes, we see if there is a specific encoding configured
        // for the new language and apply it, only if the model is
        // not dirty and only if the encoding was not explicitly set.
        //
        // (see https://github.com/microsoft/vscode/issues/127936)
        if (this.hasEncodingSetExplicitly) {
            this.trace('onMaybeShouldChangeEncoding() - ignoring because encoding was set explicitly');
            return; // never change the user's choice of encoding
        }
        if (this.contentEncoding === UTF8_with_bom ||
            this.contentEncoding === UTF16be ||
            this.contentEncoding === UTF16le) {
            this.trace('onMaybeShouldChangeEncoding() - ignoring because content encoding has a BOM');
            return; // never change an encoding that we can detect 100% via BOMs
        }
        const { encoding } = await this.textFileService.encoding.getPreferredReadEncoding(this.resource);
        if (typeof encoding !== 'string' || !this.isNewEncoding(encoding)) {
            this.trace(`onMaybeShouldChangeEncoding() - ignoring because preferred encoding ${encoding} is not new`);
            return; // return early if encoding is invalid or did not change
        }
        if (this.isDirty()) {
            this.trace('onMaybeShouldChangeEncoding() - ignoring because model is dirty');
            return; // return early to prevent accident saves in this case
        }
        this.logService.info(`Adjusting encoding based on configured language override to '${encoding}' for ${this.resource.toString(true)}.`);
        // Force resolve to pick up the new encoding
        return this.forceResolveFromFile();
    }
    setEncoding(encoding, mode) {
        // Remember that an explicit encoding was set
        this.hasEncodingSetExplicitly = true;
        return this.setEncodingInternal(encoding, mode);
    }
    async setEncodingInternal(encoding, mode) {
        // Encode: Save with encoding
        if (mode === 0 /* EncodingMode.Encode */) {
            this.updatePreferredEncoding(encoding);
            // Save
            if (!this.isDirty()) {
                this.versionId++; // needs to increment because we change the model potentially
                this.setDirty(true);
            }
            if (!this.inConflictMode) {
                await this.save({ source: TextFileEditorModel_1.TEXTFILE_SAVE_ENCODING_SOURCE });
            }
        }
        // Decode: Resolve with encoding
        else {
            if (!this.isNewEncoding(encoding)) {
                return; // return early if the encoding is already the same
            }
            if (this.isDirty() && !this.inConflictMode) {
                await this.save();
            }
            this.updatePreferredEncoding(encoding);
            await this.forceResolveFromFile();
        }
    }
    updatePreferredEncoding(encoding) {
        if (!this.isNewEncoding(encoding)) {
            return;
        }
        this.preferredEncoding = encoding;
        // Emit
        this._onDidChangeEncoding.fire();
    }
    isNewEncoding(encoding) {
        if (this.preferredEncoding === encoding) {
            return false; // return early if the encoding is already the same
        }
        if (!this.preferredEncoding && this.contentEncoding === encoding) {
            return false; // also return if we don't have a preferred encoding but the content encoding is already the same
        }
        return true;
    }
    getEncoding() {
        return this.preferredEncoding || this.contentEncoding;
    }
    //#endregion
    trace(msg) {
        this.logService.trace(`[text file model] ${msg}`, this.resource.toString());
    }
    isResolved() {
        return !!this.textEditorModel;
    }
    isReadonly() {
        return this.filesConfigurationService.isReadonly(this.resource, this.lastResolvedFileStat);
    }
    dispose() {
        this.trace('dispose()');
        this.inConflictMode = false;
        this.inOrphanMode = false;
        this.inErrorMode = false;
        super.dispose();
    }
};
TextFileEditorModel = TextFileEditorModel_1 = __decorate([
    __param(3, ILanguageService),
    __param(4, IModelService),
    __param(5, IFileService),
    __param(6, ITextFileService),
    __param(7, IWorkingCopyBackupService),
    __param(8, ILogService),
    __param(9, IWorkingCopyService),
    __param(10, IFilesConfigurationService),
    __param(11, ILabelService),
    __param(12, ILanguageDetectionService),
    __param(13, IAccessibilityService),
    __param(14, IPathService),
    __param(15, IExtensionService),
    __param(16, IProgressService)
], TextFileEditorModel);
export { TextFileEditorModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVFZGl0b3JNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRmaWxlL2NvbW1vbi90ZXh0RmlsZUVkaXRvck1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTFELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbEUsT0FBTyxFQUVOLGdCQUFnQixHQVNoQixNQUFNLGdCQUFnQixDQUFBO0FBQ3ZCLE9BQU8sRUFBOEIsa0JBQWtCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUMxRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMvRSxPQUFPLEVBQ04seUJBQXlCLEdBRXpCLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUNOLFlBQVksRUFNWixhQUFhLEVBQ2Isa0NBQWtDLEdBQ2xDLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUU5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxt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