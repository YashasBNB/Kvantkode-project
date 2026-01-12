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
var AbstractTextFileService_1;
import { localize } from '../../../../nls.js';
import { toBufferOrReadable, TextFileOperationError, stringToSnapshot, } from '../common/textfiles.js';
import { SaveSourceRegistry } from '../../../common/editor.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IFileService, } from '../../../../platform/files/common/files.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { extname as pathExtname } from '../../../../base/common/path.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IUntitledTextEditorService, } from '../../untitled/common/untitledTextEditorService.js';
import { UntitledTextEditorModel } from '../../untitled/common/untitledTextEditorModel.js';
import { TextFileEditorModelManager } from '../common/textFileEditorModelManager.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Schemas } from '../../../../base/common/network.js';
import { createTextBufferFactoryFromSnapshot, createTextBufferFactoryFromStream, } from '../../../../editor/common/model/textModel.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { joinPath, dirname, basename, toLocalResource, extname, isEqual, } from '../../../../base/common/resources.js';
import { IDialogService, IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { bufferToStream, } from '../../../../base/common/buffer.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { IFilesConfigurationService } from '../../filesConfiguration/common/filesConfigurationService.js';
import { BaseTextEditorModel } from '../../../common/editor/textEditorModel.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { IPathService } from '../../path/common/pathService.js';
import { IWorkingCopyFileService, } from '../../workingCopy/common/workingCopyFileService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService, WORKSPACE_EXTENSION, } from '../../../../platform/workspace/common/workspace.js';
import { UTF8, UTF8_with_bom, UTF16be, UTF16le, encodingExists, toEncodeReadable, toDecodeStream, } from '../common/encoding.js';
import { consumeStream } from '../../../../base/common/stream.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { IElevatedFileService } from '../../files/common/elevatedFileService.js';
import { IDecorationsService, } from '../../decorations/common/decorations.js';
import { Emitter } from '../../../../base/common/event.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { listErrorForeground } from '../../../../platform/theme/common/colorRegistry.js';
let AbstractTextFileService = class AbstractTextFileService extends Disposable {
    static { AbstractTextFileService_1 = this; }
    static { this.TEXTFILE_SAVE_CREATE_SOURCE = SaveSourceRegistry.registerSource('textFileCreate.source', localize('textFileCreate.source', 'File Created')); }
    static { this.TEXTFILE_SAVE_REPLACE_SOURCE = SaveSourceRegistry.registerSource('textFileOverwrite.source', localize('textFileOverwrite.source', 'File Replaced')); }
    constructor(fileService, untitledTextEditorService, lifecycleService, instantiationService, modelService, environmentService, dialogService, fileDialogService, textResourceConfigurationService, filesConfigurationService, codeEditorService, pathService, workingCopyFileService, uriIdentityService, languageService, logService, elevatedFileService, decorationsService) {
        super();
        this.fileService = fileService;
        this.lifecycleService = lifecycleService;
        this.instantiationService = instantiationService;
        this.modelService = modelService;
        this.environmentService = environmentService;
        this.dialogService = dialogService;
        this.fileDialogService = fileDialogService;
        this.textResourceConfigurationService = textResourceConfigurationService;
        this.filesConfigurationService = filesConfigurationService;
        this.codeEditorService = codeEditorService;
        this.pathService = pathService;
        this.workingCopyFileService = workingCopyFileService;
        this.uriIdentityService = uriIdentityService;
        this.languageService = languageService;
        this.logService = logService;
        this.elevatedFileService = elevatedFileService;
        this.decorationsService = decorationsService;
        this.files = this._register(this.instantiationService.createInstance(TextFileEditorModelManager));
        this.untitled = untitledTextEditorService;
        this.provideDecorations();
    }
    //#region decorations
    provideDecorations() {
        // Text file model decorations
        const provider = this._register(new (class extends Disposable {
            constructor(files) {
                super();
                this.files = files;
                this.label = localize('textFileModelDecorations', 'Text File Model Decorations');
                this._onDidChange = this._register(new Emitter());
                this.onDidChange = this._onDidChange.event;
                this.registerListeners();
            }
            registerListeners() {
                // Creates
                this._register(this.files.onDidResolve(({ model }) => {
                    if (model.isReadonly() || model.hasState(4 /* TextFileEditorModelState.ORPHAN */)) {
                        this._onDidChange.fire([model.resource]);
                    }
                }));
                // Removals: once a text file model is no longer
                // under our control, make sure to signal this as
                // decoration change because from this point on we
                // have no way of updating the decoration anymore.
                this._register(this.files.onDidRemove((modelUri) => this._onDidChange.fire([modelUri])));
                // Changes
                this._register(this.files.onDidChangeReadonly((model) => this._onDidChange.fire([model.resource])));
                this._register(this.files.onDidChangeOrphaned((model) => this._onDidChange.fire([model.resource])));
            }
            provideDecorations(uri) {
                const model = this.files.get(uri);
                if (!model || model.isDisposed()) {
                    return undefined;
                }
                const isReadonly = model.isReadonly();
                const isOrphaned = model.hasState(4 /* TextFileEditorModelState.ORPHAN */);
                // Readonly + Orphaned
                if (isReadonly && isOrphaned) {
                    return {
                        color: listErrorForeground,
                        letter: Codicon.lockSmall,
                        strikethrough: true,
                        tooltip: localize('readonlyAndDeleted', 'Deleted, Read-only'),
                    };
                }
                // Readonly
                else if (isReadonly) {
                    return {
                        letter: Codicon.lockSmall,
                        tooltip: localize('readonly', 'Read-only'),
                    };
                }
                // Orphaned
                else if (isOrphaned) {
                    return {
                        color: listErrorForeground,
                        strikethrough: true,
                        tooltip: localize('deleted', 'Deleted'),
                    };
                }
                return undefined;
            }
        })(this.files));
        this._register(this.decorationsService.registerDecorationsProvider(provider));
    }
    get encoding() {
        if (!this._encoding) {
            this._encoding = this._register(this.instantiationService.createInstance(EncodingOracle));
        }
        return this._encoding;
    }
    async read(resource, options) {
        const [bufferStream, decoder] = await this.doRead(resource, {
            ...options,
            // optimization: since we know that the caller does not
            // care about buffering, we indicate this to the reader.
            // this reduces all the overhead the buffered reading
            // has (open, read, close) if the provider supports
            // unbuffered reading.
            preferUnbuffered: true,
        });
        return {
            ...bufferStream,
            encoding: decoder.detected.encoding || UTF8,
            value: await consumeStream(decoder.stream, (strings) => strings.join('')),
        };
    }
    async readStream(resource, options) {
        const [bufferStream, decoder] = await this.doRead(resource, options);
        return {
            ...bufferStream,
            encoding: decoder.detected.encoding || UTF8,
            value: await createTextBufferFactoryFromStream(decoder.stream),
        };
    }
    async doRead(resource, options) {
        const cts = new CancellationTokenSource();
        // read stream raw (either buffered or unbuffered)
        let bufferStream;
        if (options?.preferUnbuffered) {
            const content = await this.fileService.readFile(resource, options, cts.token);
            bufferStream = {
                ...content,
                value: bufferToStream(content.value),
            };
        }
        else {
            bufferStream = await this.fileService.readFileStream(resource, options, cts.token);
        }
        // read through encoding library
        try {
            const decoder = await this.doGetDecodedStream(resource, bufferStream.value, options);
            return [bufferStream, decoder];
        }
        catch (error) {
            // Make sure to cancel reading on error to
            // stop file service activity as soon as
            // possible. When for example a large binary
            // file is read we want to cancel the read
            // instantly.
            // Refs:
            // - https://github.com/microsoft/vscode/issues/138805
            // - https://github.com/microsoft/vscode/issues/132771
            cts.dispose(true);
            // special treatment for streams that are binary
            if (error.decodeStreamErrorKind === 1 /* DecodeStreamErrorKind.STREAM_IS_BINARY */) {
                throw new TextFileOperationError(localize('fileBinaryError', 'File seems to be binary and cannot be opened as text'), 0 /* TextFileOperationResult.FILE_IS_BINARY */, options);
            }
            // re-throw any other error as it is
            else {
                throw error;
            }
        }
    }
    async create(operations, undoInfo) {
        const operationsWithContents = await Promise.all(operations.map(async (operation) => {
            const contents = await this.getEncodedReadable(operation.resource, operation.value);
            return {
                resource: operation.resource,
                contents,
                overwrite: operation.options?.overwrite,
            };
        }));
        return this.workingCopyFileService.create(operationsWithContents, CancellationToken.None, undoInfo);
    }
    async write(resource, value, options) {
        const readable = await this.getEncodedReadable(resource, value, options);
        if (options?.writeElevated && this.elevatedFileService.isSupported(resource)) {
            return this.elevatedFileService.writeFileElevated(resource, readable, options);
        }
        return this.fileService.writeFile(resource, readable, options);
    }
    getEncoding(resource) {
        const model = resource.scheme === Schemas.untitled ? this.untitled.get(resource) : this.files.get(resource);
        return model?.getEncoding() ?? this.encoding.getUnvalidatedEncodingForResource(resource);
    }
    async getEncodedReadable(resource, value, options) {
        // check for encoding
        const { encoding, addBOM } = await this.encoding.getWriteEncoding(resource, options);
        // when encoding is standard skip encoding step
        if (encoding === UTF8 && !addBOM) {
            return typeof value === 'undefined' ? undefined : toBufferOrReadable(value);
        }
        // otherwise create encoded readable
        value = value || '';
        const snapshot = typeof value === 'string' ? stringToSnapshot(value) : value;
        return toEncodeReadable(snapshot, encoding, { addBOM });
    }
    async getDecodedStream(resource, value, options) {
        return (await this.doGetDecodedStream(resource, value, options)).stream;
    }
    doGetDecodedStream(resource, stream, options) {
        // read through encoding library
        return toDecodeStream(stream, {
            acceptTextOnly: options?.acceptTextOnly ?? false,
            guessEncoding: options?.autoGuessEncoding ||
                this.textResourceConfigurationService.getValue(resource, 'files.autoGuessEncoding'),
            candidateGuessEncodings: options?.candidateGuessEncodings ||
                this.textResourceConfigurationService.getValue(resource, 'files.candidateGuessEncodings'),
            overwriteEncoding: async (detectedEncoding) => {
                const { encoding } = await this.encoding.getPreferredReadEncoding(resource, options, detectedEncoding ?? undefined);
                return encoding;
            },
        });
    }
    //#endregion
    //#region save
    async save(resource, options) {
        // Untitled
        if (resource.scheme === Schemas.untitled) {
            const model = this.untitled.get(resource);
            if (model) {
                let targetUri;
                // Untitled with associated file path don't need to prompt
                if (model.hasAssociatedFilePath) {
                    targetUri = await this.suggestSavePath(resource);
                }
                // Otherwise ask user
                else {
                    targetUri = await this.fileDialogService.pickFileToSave(await this.suggestSavePath(resource), options?.availableFileSystems);
                }
                // Save as if target provided
                if (targetUri) {
                    return this.saveAs(resource, targetUri, options);
                }
            }
        }
        // File
        else {
            const model = this.files.get(resource);
            if (model) {
                return (await model.save(options)) ? resource : undefined;
            }
        }
        return undefined;
    }
    async saveAs(source, target, options) {
        // Get to target resource
        if (!target) {
            target = await this.fileDialogService.pickFileToSave(await this.suggestSavePath(options?.suggestedTarget ?? source), options?.availableFileSystems);
        }
        if (!target) {
            return; // user canceled
        }
        // Ensure target is not marked as readonly and prompt otherwise
        if (this.filesConfigurationService.isReadonly(target)) {
            const confirmed = await this.confirmMakeWriteable(target);
            if (!confirmed) {
                return;
            }
            else {
                this.filesConfigurationService.updateReadonly(target, false);
            }
        }
        // Just save if target is same as models own resource
        if (isEqual(source, target)) {
            return this.save(source, {
                ...options,
                force: true /* force to save, even if not dirty (https://github.com/microsoft/vscode/issues/99619) */,
            });
        }
        // If the target is different but of same identity, we
        // move the source to the target, knowing that the
        // underlying file system cannot have both and then save.
        // However, this will only work if the source exists
        // and is not orphaned, so we need to check that too.
        if (this.fileService.hasProvider(source) &&
            this.uriIdentityService.extUri.isEqual(source, target) &&
            (await this.fileService.exists(source))) {
            await this.workingCopyFileService.move([{ file: { source, target } }], CancellationToken.None);
            // At this point we don't know whether we have a
            // model for the source or the target URI so we
            // simply try to save with both resources.
            const success = await this.save(source, options);
            if (!success) {
                await this.save(target, options);
            }
            return target;
        }
        // Do it
        return this.doSaveAs(source, target, options);
    }
    async doSaveAs(source, target, options) {
        let success = false;
        // If the source is an existing text file model, we can directly
        // use that model to copy the contents to the target destination
        const textFileModel = this.files.get(source);
        if (textFileModel?.isResolved()) {
            success = await this.doSaveAsTextFile(textFileModel, source, target, options);
        }
        // Otherwise if the source can be handled by the file service
        // we can simply invoke the copy() function to save as
        else if (this.fileService.hasProvider(source)) {
            await this.fileService.copy(source, target, true);
            success = true;
        }
        // Finally we simply check if we can find a editor model that
        // would give us access to the contents.
        else {
            const textModel = this.modelService.getModel(source);
            if (textModel) {
                success = await this.doSaveAsTextFile(textModel, source, target, options);
            }
        }
        if (!success) {
            return undefined;
        }
        // Revert the source
        try {
            await this.revert(source);
        }
        catch (error) {
            // It is possible that reverting the source fails, for example
            // when a remote is disconnected and we cannot read it anymore.
            // However, this should not interrupt the "Save As" flow, so
            // we gracefully catch the error and just log it.
            this.logService.error(error);
        }
        // Events
        if (source.scheme === Schemas.untitled) {
            this.untitled.notifyDidSave(source, target);
        }
        return target;
    }
    async doSaveAsTextFile(sourceModel, source, target, options) {
        // Find source encoding if any
        let sourceModelEncoding = undefined;
        const sourceModelWithEncodingSupport = sourceModel;
        if (typeof sourceModelWithEncodingSupport.getEncoding === 'function') {
            sourceModelEncoding = sourceModelWithEncodingSupport.getEncoding();
        }
        // Prefer an existing model if it is already resolved for the given target resource
        let targetExists = false;
        let targetModel = this.files.get(target);
        if (targetModel?.isResolved()) {
            targetExists = true;
        }
        // Otherwise create the target file empty if it does not exist already and resolve it from there
        else {
            targetExists = await this.fileService.exists(target);
            // create target file adhoc if it does not exist yet
            if (!targetExists) {
                await this.create([{ resource: target, value: '' }]);
            }
            try {
                targetModel = await this.files.resolve(target, { encoding: sourceModelEncoding });
            }
            catch (error) {
                // if the target already exists and was not created by us, it is possible
                // that we cannot resolve the target as text model if it is binary or too
                // large. in that case we have to delete the target file first and then
                // re-run the operation.
                if (targetExists) {
                    if (error.textFileOperationResult ===
                        0 /* TextFileOperationResult.FILE_IS_BINARY */ ||
                        error.fileOperationResult === 7 /* FileOperationResult.FILE_TOO_LARGE */) {
                        await this.fileService.del(target);
                        return this.doSaveAsTextFile(sourceModel, source, target, options);
                    }
                }
                throw error;
            }
        }
        // Confirm to overwrite if we have an untitled file with associated file where
        // the file actually exists on disk and we are instructed to save to that file
        // path. This can happen if the file was created after the untitled file was opened.
        // See https://github.com/microsoft/vscode/issues/67946
        let write;
        if (sourceModel instanceof UntitledTextEditorModel &&
            sourceModel.hasAssociatedFilePath &&
            targetExists &&
            this.uriIdentityService.extUri.isEqual(target, toLocalResource(sourceModel.resource, this.environmentService.remoteAuthority, this.pathService.defaultUriScheme))) {
            write = await this.confirmOverwrite(target);
        }
        else {
            write = true;
        }
        if (!write) {
            return false;
        }
        let sourceTextModel = undefined;
        if (sourceModel instanceof BaseTextEditorModel) {
            if (sourceModel.isResolved()) {
                sourceTextModel = sourceModel.textEditorModel ?? undefined;
            }
        }
        else {
            sourceTextModel = sourceModel;
        }
        let targetTextModel = undefined;
        if (targetModel.isResolved()) {
            targetTextModel = targetModel.textEditorModel;
        }
        // take over model value, encoding and language (only if more specific) from source model
        if (sourceTextModel && targetTextModel) {
            // encoding
            targetModel.updatePreferredEncoding(sourceModelEncoding);
            // content
            this.modelService.updateModel(targetTextModel, createTextBufferFactoryFromSnapshot(sourceTextModel.createSnapshot()));
            // language
            const sourceLanguageId = sourceTextModel.getLanguageId();
            const targetLanguageId = targetTextModel.getLanguageId();
            if (sourceLanguageId !== PLAINTEXT_LANGUAGE_ID &&
                targetLanguageId === PLAINTEXT_LANGUAGE_ID) {
                targetTextModel.setLanguage(sourceLanguageId); // only use if more specific than plain/text
            }
            // transient properties
            const sourceTransientProperties = this.codeEditorService.getTransientModelProperties(sourceTextModel);
            if (sourceTransientProperties) {
                for (const [key, value] of sourceTransientProperties) {
                    this.codeEditorService.setTransientModelProperty(targetTextModel, key, value);
                }
            }
        }
        // set source options depending on target exists or not
        if (!options?.source) {
            options = {
                ...options,
                source: targetExists
                    ? AbstractTextFileService_1.TEXTFILE_SAVE_REPLACE_SOURCE
                    : AbstractTextFileService_1.TEXTFILE_SAVE_CREATE_SOURCE,
            };
        }
        // save model
        return targetModel.save({
            ...options,
            from: source,
        });
    }
    async confirmOverwrite(resource) {
        const { confirmed } = await this.dialogService.confirm({
            type: 'warning',
            message: localize('confirmOverwrite', "'{0}' already exists. Do you want to replace it?", basename(resource)),
            detail: localize('overwriteIrreversible', "A file or folder with the name '{0}' already exists in the folder '{1}'. Replacing it will overwrite its current contents.", basename(resource), basename(dirname(resource))),
            primaryButton: localize({ key: 'replaceButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Replace'),
        });
        return confirmed;
    }
    async confirmMakeWriteable(resource) {
        const { confirmed } = await this.dialogService.confirm({
            type: 'warning',
            message: localize('confirmMakeWriteable', "'{0}' is marked as read-only. Do you want to save anyway?", basename(resource)),
            detail: localize('confirmMakeWriteableDetail', 'Paths can be configured as read-only via settings.'),
            primaryButton: localize({ key: 'makeWriteableButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Save Anyway'),
        });
        return confirmed;
    }
    async suggestSavePath(resource) {
        // Just take the resource as is if the file service can handle it
        if (this.fileService.hasProvider(resource)) {
            return resource;
        }
        const remoteAuthority = this.environmentService.remoteAuthority;
        const defaultFilePath = await this.fileDialogService.defaultFilePath();
        // Otherwise try to suggest a path that can be saved
        let suggestedFilename = undefined;
        if (resource.scheme === Schemas.untitled) {
            const model = this.untitled.get(resource);
            if (model) {
                // Untitled with associated file path
                if (model.hasAssociatedFilePath) {
                    return toLocalResource(resource, remoteAuthority, this.pathService.defaultUriScheme);
                }
                // Untitled without associated file path: use name
                // of untitled model if it is a valid path name and
                // figure out the file extension from the mode if any.
                let nameCandidate;
                if (await this.pathService.hasValidBasename(joinPath(defaultFilePath, model.name), model.name)) {
                    nameCandidate = model.name;
                }
                else {
                    nameCandidate = basename(resource);
                }
                const languageId = model.getLanguageId();
                if (languageId && languageId !== PLAINTEXT_LANGUAGE_ID) {
                    suggestedFilename = this.suggestFilename(languageId, nameCandidate);
                }
                else {
                    suggestedFilename = nameCandidate;
                }
            }
        }
        // Fallback to basename of resource
        if (!suggestedFilename) {
            suggestedFilename = basename(resource);
        }
        // Try to place where last active file was if any
        // Otherwise fallback to user home
        return joinPath(defaultFilePath, suggestedFilename);
    }
    suggestFilename(languageId, untitledName) {
        const languageName = this.languageService.getLanguageName(languageId);
        if (!languageName) {
            return untitledName; // unknown language, so we cannot suggest a better name
        }
        const untitledExtension = pathExtname(untitledName);
        const extensions = this.languageService.getExtensions(languageId);
        if (extensions.includes(untitledExtension)) {
            return untitledName; // preserve extension if it is compatible with the mode
        }
        const primaryExtension = extensions.at(0);
        if (primaryExtension) {
            if (untitledExtension) {
                return `${untitledName.substring(0, untitledName.indexOf(untitledExtension))}${primaryExtension}`;
            }
            return `${untitledName}${primaryExtension}`;
        }
        const filenames = this.languageService.getFilenames(languageId);
        if (filenames.includes(untitledName)) {
            return untitledName; // preserve name if it is compatible with the mode
        }
        return filenames.at(0) ?? untitledName;
    }
    //#endregion
    //#region revert
    async revert(resource, options) {
        // Untitled
        if (resource.scheme === Schemas.untitled) {
            const model = this.untitled.get(resource);
            if (model) {
                return model.revert(options);
            }
        }
        // File
        else {
            const model = this.files.get(resource);
            if (model && (model.isDirty() || options?.force)) {
                return model.revert(options);
            }
        }
    }
    //#endregion
    //#region dirty
    isDirty(resource) {
        const model = resource.scheme === Schemas.untitled ? this.untitled.get(resource) : this.files.get(resource);
        if (model) {
            return model.isDirty();
        }
        return false;
    }
};
AbstractTextFileService = AbstractTextFileService_1 = __decorate([
    __param(0, IFileService),
    __param(1, IUntitledTextEditorService),
    __param(2, ILifecycleService),
    __param(3, IInstantiationService),
    __param(4, IModelService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, IDialogService),
    __param(7, IFileDialogService),
    __param(8, ITextResourceConfigurationService),
    __param(9, IFilesConfigurationService),
    __param(10, ICodeEditorService),
    __param(11, IPathService),
    __param(12, IWorkingCopyFileService),
    __param(13, IUriIdentityService),
    __param(14, ILanguageService),
    __param(15, ILogService),
    __param(16, IElevatedFileService),
    __param(17, IDecorationsService)
], AbstractTextFileService);
export { AbstractTextFileService };
let EncodingOracle = class EncodingOracle extends Disposable {
    get encodingOverrides() {
        return this._encodingOverrides;
    }
    set encodingOverrides(value) {
        this._encodingOverrides = value;
    }
    constructor(textResourceConfigurationService, environmentService, contextService, uriIdentityService) {
        super();
        this.textResourceConfigurationService = textResourceConfigurationService;
        this.environmentService = environmentService;
        this.contextService = contextService;
        this.uriIdentityService = uriIdentityService;
        this._encodingOverrides = this.getDefaultEncodingOverrides();
        this.registerListeners();
    }
    registerListeners() {
        // Workspace Folder Change
        this._register(this.contextService.onDidChangeWorkspaceFolders(() => (this.encodingOverrides = this.getDefaultEncodingOverrides())));
    }
    getDefaultEncodingOverrides() {
        const defaultEncodingOverrides = [];
        // Global settings
        defaultEncodingOverrides.push({
            parent: this.environmentService.userRoamingDataHome,
            encoding: UTF8,
        });
        // Workspace files (via extension and via untitled workspaces location)
        defaultEncodingOverrides.push({ extension: WORKSPACE_EXTENSION, encoding: UTF8 });
        defaultEncodingOverrides.push({
            parent: this.environmentService.untitledWorkspacesHome,
            encoding: UTF8,
        });
        // Folder Settings
        this.contextService.getWorkspace().folders.forEach((folder) => {
            defaultEncodingOverrides.push({ parent: joinPath(folder.uri, '.vscode'), encoding: UTF8 });
        });
        return defaultEncodingOverrides;
    }
    async getWriteEncoding(resource, options) {
        const { encoding, hasBOM } = await this.getPreferredWriteEncoding(resource, options ? options.encoding : undefined);
        return { encoding, addBOM: hasBOM };
    }
    async getPreferredWriteEncoding(resource, preferredEncoding) {
        const resourceEncoding = await this.getValidatedEncodingForResource(resource, preferredEncoding);
        return {
            encoding: resourceEncoding,
            hasBOM: resourceEncoding === UTF16be ||
                resourceEncoding === UTF16le ||
                resourceEncoding === UTF8_with_bom, // enforce BOM for certain encodings
        };
    }
    async getPreferredReadEncoding(resource, options, detectedEncoding) {
        let preferredEncoding;
        // Encoding passed in as option
        if (options?.encoding) {
            if (detectedEncoding === UTF8_with_bom && options.encoding === UTF8) {
                preferredEncoding = UTF8_with_bom; // indicate the file has BOM if we are to resolve with UTF 8
            }
            else {
                preferredEncoding = options.encoding; // give passed in encoding highest priority
            }
        }
        // Encoding detected
        else if (typeof detectedEncoding === 'string') {
            preferredEncoding = detectedEncoding;
        }
        // Encoding configured
        else if (this.textResourceConfigurationService.getValue(resource, 'files.encoding') === UTF8_with_bom) {
            preferredEncoding = UTF8; // if we did not detect UTF 8 BOM before, this can only be UTF 8 then
        }
        const encoding = await this.getValidatedEncodingForResource(resource, preferredEncoding);
        return {
            encoding,
            hasBOM: encoding === UTF16be || encoding === UTF16le || encoding === UTF8_with_bom, // enforce BOM for certain encodings
        };
    }
    getUnvalidatedEncodingForResource(resource, preferredEncoding) {
        let fileEncoding;
        const override = this.getEncodingOverride(resource);
        if (override) {
            fileEncoding = override; // encoding override always wins
        }
        else if (preferredEncoding) {
            fileEncoding = preferredEncoding; // preferred encoding comes second
        }
        else {
            fileEncoding = this.textResourceConfigurationService.getValue(resource, 'files.encoding'); // and last we check for settings
        }
        return fileEncoding || UTF8;
    }
    async getValidatedEncodingForResource(resource, preferredEncoding) {
        let fileEncoding = this.getUnvalidatedEncodingForResource(resource, preferredEncoding);
        if (fileEncoding !== UTF8 && !(await encodingExists(fileEncoding))) {
            fileEncoding = UTF8;
        }
        return fileEncoding;
    }
    getEncodingOverride(resource) {
        if (resource && this.encodingOverrides?.length) {
            for (const override of this.encodingOverrides) {
                // check if the resource is child of encoding override path
                if (override.parent &&
                    this.uriIdentityService.extUri.isEqualOrParent(resource, override.parent)) {
                    return override.encoding;
                }
                // check if the resource extension is equal to encoding override
                if (override.extension && extname(resource) === `.${override.extension}`) {
                    return override.encoding;
                }
            }
        }
        return undefined;
    }
};
EncodingOracle = __decorate([
    __param(0, ITextResourceConfigurationService),
    __param(1, IWorkbenchEnvironmentService),
    __param(2, IWorkspaceContextService),
    __param(3, IUriIdentityService)
], EncodingOracle);
export { EncodingOracle };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dGZpbGUvYnJvd3Nlci90ZXh0RmlsZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBUU4sa0JBQWtCLEVBQ2xCLHNCQUFzQixFQUt0QixnQkFBZ0IsR0FJaEIsTUFBTSx3QkFBd0IsQ0FBQTtBQUMvQixPQUFPLEVBQWtCLGtCQUFrQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDOUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdkUsT0FBTyxFQUNOLFlBQVksR0FNWixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsT0FBTyxJQUFJLFdBQVcsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzdGLE9BQU8sRUFDTiwwQkFBMEIsR0FFMUIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMxRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUNOLG1DQUFtQyxFQUNuQyxpQ0FBaUMsR0FDakMsTUFBTSw4Q0FBOEMsQ0FBQTtB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