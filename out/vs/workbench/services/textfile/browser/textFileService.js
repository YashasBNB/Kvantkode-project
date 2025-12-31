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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRmaWxlL2Jyb3dzZXIvdGV4dEZpbGVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQVFOLGtCQUFrQixFQUNsQixzQkFBc0IsRUFLdEIsZ0JBQWdCLEdBSWhCLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUFrQixrQkFBa0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzlFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3ZFLE9BQU8sRUFDTixZQUFZLEdBTVosTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sSUFBSSxXQUFXLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM3RixPQUFPLEVBQ04sMEJBQTBCLEdBRTFCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDMUYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFDTixtQ0FBbUMsRUFDbkMsaUNBQWlDLEdBQ2pDLE1BQU0sOENBQThDLENBQUE7QUFDckQs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