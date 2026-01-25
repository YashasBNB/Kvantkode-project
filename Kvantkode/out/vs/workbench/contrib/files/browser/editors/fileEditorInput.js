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
var FileEditorInput_1;
import { DEFAULT_EDITOR_ASSOCIATION, findViewStateForEditor, isResourceEditorInput, } from '../../../../common/editor.js';
import { AbstractTextResourceEditorInput } from '../../../../common/editor/textResourceEditorInput.js';
import { BinaryEditorModel } from '../../../../common/editor/binaryEditorModel.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ITextFileService, } from '../../../../services/textfile/common/textfiles.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { dispose, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { FILE_EDITOR_INPUT_ID, TEXT_FILE_EDITOR_ID, BINARY_FILE_EDITOR_ID, } from '../../common/files.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { Event } from '../../../../../base/common/event.js';
import { Schemas } from '../../../../../base/common/network.js';
import { createTextBufferFactory } from '../../../../../editor/common/model/textModel.js';
import { IPathService } from '../../../../services/path/common/pathService.js';
import { ITextResourceConfigurationService } from '../../../../../editor/common/services/textResourceConfiguration.js';
import { ICustomEditorLabelService } from '../../../../services/editor/common/customEditorLabelService.js';
var ForceOpenAs;
(function (ForceOpenAs) {
    ForceOpenAs[ForceOpenAs["None"] = 0] = "None";
    ForceOpenAs[ForceOpenAs["Text"] = 1] = "Text";
    ForceOpenAs[ForceOpenAs["Binary"] = 2] = "Binary";
})(ForceOpenAs || (ForceOpenAs = {}));
/**
 * A file editor input is the input type for the file editor of file system resources.
 */
let FileEditorInput = FileEditorInput_1 = class FileEditorInput extends AbstractTextResourceEditorInput {
    get typeId() {
        return FILE_EDITOR_INPUT_ID;
    }
    get editorId() {
        return DEFAULT_EDITOR_ASSOCIATION.id;
    }
    get capabilities() {
        let capabilities = 32 /* EditorInputCapabilities.CanSplitInGroup */;
        if (this.model) {
            if (this.model.isReadonly()) {
                capabilities |= 2 /* EditorInputCapabilities.Readonly */;
            }
        }
        else {
            if (this.fileService.hasProvider(this.resource)) {
                if (this.filesConfigurationService.isReadonly(this.resource)) {
                    capabilities |= 2 /* EditorInputCapabilities.Readonly */;
                }
            }
            else {
                capabilities |= 4 /* EditorInputCapabilities.Untitled */;
            }
        }
        if (!(capabilities & 2 /* EditorInputCapabilities.Readonly */)) {
            capabilities |= 128 /* EditorInputCapabilities.CanDropIntoEditor */;
        }
        return capabilities;
    }
    constructor(resource, preferredResource, preferredName, preferredDescription, preferredEncoding, preferredLanguageId, preferredContents, instantiationService, textFileService, textModelService, labelService, fileService, filesConfigurationService, editorService, pathService, textResourceConfigurationService, customEditorLabelService) {
        super(resource, preferredResource, editorService, textFileService, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService);
        this.instantiationService = instantiationService;
        this.textModelService = textModelService;
        this.pathService = pathService;
        this.forceOpenAs = 0 /* ForceOpenAs.None */;
        this.model = undefined;
        this.cachedTextFileModelReference = undefined;
        this.modelListeners = this._register(new DisposableStore());
        this.model = this.textFileService.files.get(resource);
        if (preferredName) {
            this.setPreferredName(preferredName);
        }
        if (preferredDescription) {
            this.setPreferredDescription(preferredDescription);
        }
        if (preferredEncoding) {
            this.setPreferredEncoding(preferredEncoding);
        }
        if (preferredLanguageId) {
            this.setPreferredLanguageId(preferredLanguageId);
        }
        if (typeof preferredContents === 'string') {
            this.setPreferredContents(preferredContents);
        }
        // Attach to model that matches our resource once created
        this._register(this.textFileService.files.onDidCreate((model) => this.onDidCreateTextFileModel(model)));
        // If a file model already exists, make sure to wire it in
        if (this.model) {
            this.registerModelListeners(this.model);
        }
    }
    onDidCreateTextFileModel(model) {
        // Once the text file model is created, we keep it inside
        // the input to be able to implement some methods properly
        if (isEqual(model.resource, this.resource)) {
            this.model = model;
            this.registerModelListeners(model);
        }
    }
    registerModelListeners(model) {
        // Clear any old
        this.modelListeners.clear();
        // re-emit some events from the model
        this.modelListeners.add(model.onDidChangeDirty(() => this._onDidChangeDirty.fire()));
        this.modelListeners.add(model.onDidChangeReadonly(() => this._onDidChangeCapabilities.fire()));
        // important: treat save errors as potential dirty change because
        // a file that is in save conflict or error will report dirty even
        // if auto save is turned on.
        this.modelListeners.add(model.onDidSaveError(() => this._onDidChangeDirty.fire()));
        // remove model association once it gets disposed
        this.modelListeners.add(Event.once(model.onWillDispose)(() => {
            this.modelListeners.clear();
            this.model = undefined;
        }));
    }
    getName() {
        return this.preferredName || super.getName();
    }
    setPreferredName(name) {
        if (!this.allowLabelOverride()) {
            return; // block for specific schemes we consider to be owning
        }
        if (this.preferredName !== name) {
            this.preferredName = name;
            this._onDidChangeLabel.fire();
        }
    }
    allowLabelOverride() {
        return (this.resource.scheme !== this.pathService.defaultUriScheme &&
            this.resource.scheme !== Schemas.vscodeUserData &&
            this.resource.scheme !== Schemas.file &&
            this.resource.scheme !== Schemas.vscodeRemote);
    }
    getPreferredName() {
        return this.preferredName;
    }
    isReadonly() {
        return this.model
            ? this.model.isReadonly()
            : this.filesConfigurationService.isReadonly(this.resource);
    }
    getDescription(verbosity) {
        return this.preferredDescription || super.getDescription(verbosity);
    }
    setPreferredDescription(description) {
        if (!this.allowLabelOverride()) {
            return; // block for specific schemes we consider to be owning
        }
        if (this.preferredDescription !== description) {
            this.preferredDescription = description;
            this._onDidChangeLabel.fire();
        }
    }
    getPreferredDescription() {
        return this.preferredDescription;
    }
    getTitle(verbosity) {
        let title = super.getTitle(verbosity);
        const preferredTitle = this.getPreferredTitle();
        if (preferredTitle) {
            title = `${preferredTitle} (${title})`;
        }
        return title;
    }
    getPreferredTitle() {
        if (this.preferredName && this.preferredDescription) {
            return `${this.preferredName} ${this.preferredDescription}`;
        }
        if (this.preferredName || this.preferredDescription) {
            return this.preferredName ?? this.preferredDescription;
        }
        return undefined;
    }
    getEncoding() {
        if (this.model) {
            return this.model.getEncoding();
        }
        return this.preferredEncoding;
    }
    getPreferredEncoding() {
        return this.preferredEncoding;
    }
    async setEncoding(encoding, mode) {
        this.setPreferredEncoding(encoding);
        return this.model?.setEncoding(encoding, mode);
    }
    setPreferredEncoding(encoding) {
        this.preferredEncoding = encoding;
        // encoding is a good hint to open the file as text
        this.setForceOpenAsText();
    }
    getLanguageId() {
        if (this.model) {
            return this.model.getLanguageId();
        }
        return this.preferredLanguageId;
    }
    getPreferredLanguageId() {
        return this.preferredLanguageId;
    }
    setLanguageId(languageId, source) {
        this.setPreferredLanguageId(languageId);
        this.model?.setLanguageId(languageId, source);
    }
    setPreferredLanguageId(languageId) {
        this.preferredLanguageId = languageId;
        // languages are a good hint to open the file as text
        this.setForceOpenAsText();
    }
    setPreferredContents(contents) {
        this.preferredContents = contents;
        // contents is a good hint to open the file as text
        this.setForceOpenAsText();
    }
    setForceOpenAsText() {
        this.forceOpenAs = 1 /* ForceOpenAs.Text */;
    }
    setForceOpenAsBinary() {
        this.forceOpenAs = 2 /* ForceOpenAs.Binary */;
    }
    isDirty() {
        return !!this.model?.isDirty();
    }
    isSaving() {
        if (this.model?.hasState(0 /* TextFileEditorModelState.SAVED */) ||
            this.model?.hasState(3 /* TextFileEditorModelState.CONFLICT */) ||
            this.model?.hasState(5 /* TextFileEditorModelState.ERROR */)) {
            return false; // require the model to be dirty and not in conflict or error state
        }
        // Note: currently not checking for ModelState.PENDING_SAVE for a reason
        // because we currently miss an event for this state change on editors
        // and it could result in bad UX where an editor can be closed even though
        // it shows up as dirty and has not finished saving yet.
        if (this.filesConfigurationService.hasShortAutoSaveDelay(this)) {
            return true; // a short auto save is configured, treat this as being saved
        }
        return super.isSaving();
    }
    prefersEditorPane(editorPanes) {
        if (this.forceOpenAs === 2 /* ForceOpenAs.Binary */) {
            return editorPanes.find((editorPane) => editorPane.typeId === BINARY_FILE_EDITOR_ID);
        }
        return editorPanes.find((editorPane) => editorPane.typeId === TEXT_FILE_EDITOR_ID);
    }
    resolve(options) {
        // Resolve as binary
        if (this.forceOpenAs === 2 /* ForceOpenAs.Binary */) {
            return this.doResolveAsBinary();
        }
        // Resolve as text
        return this.doResolveAsText(options);
    }
    async doResolveAsText(options) {
        try {
            // Unset preferred contents after having applied it once
            // to prevent this property to stick. We still want future
            // `resolve` calls to fetch the contents from disk.
            const preferredContents = this.preferredContents;
            this.preferredContents = undefined;
            // Resolve resource via text file service and only allow
            // to open binary files if we are instructed so
            await this.textFileService.files.resolve(this.resource, {
                languageId: this.preferredLanguageId,
                encoding: this.preferredEncoding,
                contents: typeof preferredContents === 'string'
                    ? createTextBufferFactory(preferredContents)
                    : undefined,
                reload: { async: true }, // trigger a reload of the model if it exists already but do not wait to show the model
                allowBinary: this.forceOpenAs === 1 /* ForceOpenAs.Text */,
                reason: 1 /* TextFileResolveReason.EDITOR */,
                limits: this.ensureLimits(options),
            });
            // This is a bit ugly, because we first resolve the model and then resolve a model reference. the reason being that binary
            // or very large files do not resolve to a text file model but should be opened as binary files without text. First calling into
            // resolve() ensures we are not creating model references for these kind of resources.
            // In addition we have a bit of payload to take into account (encoding, reload) that the text resolver does not handle yet.
            if (!this.cachedTextFileModelReference) {
                this.cachedTextFileModelReference = (await this.textModelService.createModelReference(this.resource));
            }
            const model = this.cachedTextFileModelReference.object;
            // It is possible that this input was disposed before the model
            // finished resolving. As such, we need to make sure to dispose
            // the model reference to not leak it.
            if (this.isDisposed()) {
                this.disposeModelReference();
            }
            return model;
        }
        catch (error) {
            // Handle binary files with binary model
            if (error.textFileOperationResult ===
                0 /* TextFileOperationResult.FILE_IS_BINARY */) {
                return this.doResolveAsBinary();
            }
            // Bubble any other error up
            throw error;
        }
    }
    async doResolveAsBinary() {
        const model = this.instantiationService.createInstance(BinaryEditorModel, this.preferredResource, this.getName());
        await model.resolve();
        return model;
    }
    isResolved() {
        return !!this.model;
    }
    async rename(group, target) {
        return {
            editor: {
                resource: target,
                encoding: this.getEncoding(),
                options: {
                    viewState: findViewStateForEditor(this, group, this.editorService),
                },
            },
        };
    }
    toUntyped(options) {
        const untypedInput = {
            resource: this.preferredResource,
            forceFile: true,
            options: {
                override: this.editorId,
            },
        };
        if (typeof options?.preserveViewState === 'number') {
            untypedInput.encoding = this.getEncoding();
            untypedInput.languageId = this.getLanguageId();
            untypedInput.contents = (() => {
                const model = this.textFileService.files.get(this.resource);
                if (model?.isDirty() && !model.textEditorModel.isTooLargeForHeapOperation()) {
                    return model.textEditorModel.getValue(); // only if dirty and not too large
                }
                return undefined;
            })();
            untypedInput.options = {
                ...untypedInput.options,
                viewState: findViewStateForEditor(this, options.preserveViewState, this.editorService),
            };
        }
        return untypedInput;
    }
    matches(otherInput) {
        if (this === otherInput) {
            return true;
        }
        if (otherInput instanceof FileEditorInput_1) {
            return isEqual(otherInput.resource, this.resource);
        }
        if (isResourceEditorInput(otherInput)) {
            return super.matches(otherInput);
        }
        return false;
    }
    dispose() {
        // Model
        this.model = undefined;
        // Model reference
        this.disposeModelReference();
        super.dispose();
    }
    disposeModelReference() {
        dispose(this.cachedTextFileModelReference);
        this.cachedTextFileModelReference = undefined;
    }
};
FileEditorInput = FileEditorInput_1 = __decorate([
    __param(7, IInstantiationService),
    __param(8, ITextFileService),
    __param(9, ITextModelService),
    __param(10, ILabelService),
    __param(11, IFileService),
    __param(12, IFilesConfigurationService),
    __param(13, IEditorService),
    __param(14, IPathService),
    __param(15, ITextResourceConfigurationService),
    __param(16, ICustomEditorLabelService)
], FileEditorInput);
export { FileEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUVkaXRvcklucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL2VkaXRvcnMvZmlsZUVkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBU04sMEJBQTBCLEVBRTFCLHNCQUFzQixFQUN0QixxQkFBcUIsR0FFckIsTUFBTSw4QkFBOEIsQ0FBQTtBQUVyQyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUV0RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDNUUsT0FBTyxFQUNOLGdCQUFnQixHQU9oQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBYyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDNUYsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixtQkFBbUIsRUFDbkIscUJBQXFCLEdBQ3JCLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZFQUE2RSxDQUFBO0FBQ3hILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFN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