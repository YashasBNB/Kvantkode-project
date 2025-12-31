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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVFZGl0b3JNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0ZmlsZS9jb21tb24vdGV4dEZpbGVFZGl0b3JNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2xFLE9BQU8sRUFFTixnQkFBZ0IsR0FTaEIsTUFBTSxnQkFBZ0IsQ0FBQTtBQUN2QixPQUFPLEVBQThCLGtCQUFrQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDMUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDL0UsT0FBTyxFQUNOLHlCQUF5QixHQUV6QixNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFDTixZQUFZLEVBTVosYUFBYSxFQUNiLGtDQUFrQyxHQUNsQyxNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFOUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsbUJBQW1C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