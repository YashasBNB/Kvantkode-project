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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUVkaXRvcklucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci9lZGl0b3JzL2ZpbGVFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQVNOLDBCQUEwQixFQUUxQixzQkFBc0IsRUFDdEIscUJBQXFCLEdBRXJCLE1BQU0sOEJBQThCLENBQUE7QUFFckMsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFdEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzVFLE9BQU8sRUFDTixnQkFBZ0IsR0FPaEIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQWMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzlGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzVGLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsbUJBQW1CLEVBQ25CLHFCQUFxQixHQUNyQixNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDcEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDekYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBRXRILE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBRTFHLElBQVcsV0FJVjtBQUpELFdBQVcsV0FBVztJQUNyQiw2Q0FBSSxDQUFBO0lBQ0osNkNBQUksQ0FBQTtJQUNKLGlEQUFNLENBQUE7QUFDUCxDQUFDLEVBSlUsV0FBVyxLQUFYLFdBQVcsUUFJckI7QUFFRDs7R0FFRztBQUNJLElBQU0sZUFBZSx1QkFBckIsTUFBTSxlQUFnQixTQUFRLCtCQUErQjtJQUNuRSxJQUFhLE1BQU07UUFDbEIsT0FBTyxvQkFBb0IsQ0FBQTtJQUM1QixDQUFDO0lBRUQsSUFBYSxRQUFRO1FBQ3BCLE9BQU8sMEJBQTBCLENBQUMsRUFBRSxDQUFBO0lBQ3JDLENBQUM7SUFFRCxJQUFhLFlBQVk7UUFDeEIsSUFBSSxZQUFZLG1EQUEwQyxDQUFBO1FBRTFELElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO2dCQUM3QixZQUFZLDRDQUFvQyxDQUFBO1lBQ2pELENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pELElBQUksSUFBSSxDQUFDLHlCQUF5QixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztvQkFDOUQsWUFBWSw0Q0FBb0MsQ0FBQTtnQkFDakQsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxZQUFZLDRDQUFvQyxDQUFBO1lBQ2pELENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLENBQUMsWUFBWSwyQ0FBbUMsQ0FBQyxFQUFFLENBQUM7WUFDeEQsWUFBWSx1REFBNkMsQ0FBQTtRQUMxRCxDQUFDO1FBRUQsT0FBTyxZQUFZLENBQUE7SUFDcEIsQ0FBQztJQWVELFlBQ0MsUUFBYSxFQUNiLGlCQUFrQyxFQUNsQyxhQUFpQyxFQUNqQyxvQkFBd0MsRUFDeEMsaUJBQXFDLEVBQ3JDLG1CQUF1QyxFQUN2QyxpQkFBcUMsRUFDZCxvQkFBNEQsRUFDakUsZUFBaUMsRUFDaEMsZ0JBQW9ELEVBQ3hELFlBQTJCLEVBQzVCLFdBQXlCLEVBQ1gseUJBQXFELEVBQ2pFLGFBQTZCLEVBQy9CLFdBQTBDLEVBRXhELGdDQUFtRSxFQUN4Qyx3QkFBbUQ7UUFFOUUsS0FBSyxDQUNKLFFBQVEsRUFDUixpQkFBaUIsRUFDakIsYUFBYSxFQUNiLGVBQWUsRUFDZixZQUFZLEVBQ1osV0FBVyxFQUNYLHlCQUF5QixFQUN6QixnQ0FBZ0MsRUFDaEMsd0JBQXdCLENBQ3hCLENBQUE7UUF0QnVDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFFL0MscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUt4QyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQXRCakQsZ0JBQVcsNEJBQWdDO1FBRTNDLFVBQUssR0FBcUMsU0FBUyxDQUFBO1FBQ25ELGlDQUE0QixHQUFpRCxTQUFTLENBQUE7UUFFN0UsbUJBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQTtRQWtDdEUsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFckQsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDckMsQ0FBQztRQUVELElBQUksb0JBQW9CLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsdUJBQXVCLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUNuRCxDQUFDO1FBRUQsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQzdDLENBQUM7UUFFRCxJQUFJLG1CQUFtQixFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLHNCQUFzQixDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDakQsQ0FBQztRQUVELElBQUksT0FBTyxpQkFBaUIsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMzQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUM3QyxDQUFDO1FBRUQseURBQXlEO1FBQ3pELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FDdkYsQ0FBQTtRQUVELDBEQUEwRDtRQUMxRCxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3hDLENBQUM7SUFDRixDQUFDO0lBRU8sd0JBQXdCLENBQUMsS0FBMkI7UUFDM0QseURBQXlEO1FBQ3pELDBEQUEwRDtRQUMxRCxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQzVDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1lBRWxCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNuQyxDQUFDO0lBQ0YsQ0FBQztJQUVPLHNCQUFzQixDQUFDLEtBQTJCO1FBQ3pELGdCQUFnQjtRQUNoQixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBRTNCLHFDQUFxQztRQUNyQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRixJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU5RixpRUFBaUU7UUFDakUsa0VBQWtFO1FBQ2xFLDZCQUE2QjtRQUM3QixJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFbEYsaURBQWlEO1FBQ2pELElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUN0QixLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLEVBQUU7WUFDcEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUMzQixJQUFJLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQTtRQUN2QixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVRLE9BQU87UUFDZixPQUFPLElBQUksQ0FBQyxhQUFhLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQzdDLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxJQUFZO1FBQzVCLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDO1lBQ2hDLE9BQU0sQ0FBQyxzREFBc0Q7UUFDOUQsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLGFBQWEsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQTtZQUV6QixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDOUIsQ0FBQztJQUNGLENBQUM7SUFFTyxrQkFBa0I7UUFDekIsT0FBTyxDQUNOLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCO1lBQzFELElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxjQUFjO1lBQy9DLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJO1lBQ3JDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxZQUFZLENBQzdDLENBQUE7SUFDRixDQUFDO0lBRUQsZ0JBQWdCO1FBQ2YsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFBO0lBQzFCLENBQUM7SUFFUSxVQUFVO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLEtBQUs7WUFDaEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFO1lBQ3pCLENBQUMsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUM1RCxDQUFDO0lBRVEsY0FBYyxDQUFDLFNBQXFCO1FBQzVDLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixJQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDcEUsQ0FBQztJQUVELHVCQUF1QixDQUFDLFdBQW1CO1FBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDO1lBQ2hDLE9BQU0sQ0FBQyxzREFBc0Q7UUFDOUQsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLG9CQUFvQixLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQy9DLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxXQUFXLENBQUE7WUFFdkMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFBO1FBQzlCLENBQUM7SUFDRixDQUFDO0lBRUQsdUJBQXVCO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFBO0lBQ2pDLENBQUM7SUFFUSxRQUFRLENBQUMsU0FBcUI7UUFDdEMsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUVyQyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUMvQyxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLEtBQUssR0FBRyxHQUFHLGNBQWMsS0FBSyxLQUFLLEdBQUcsQ0FBQTtRQUN2QyxDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRVMsaUJBQWlCO1FBQzFCLElBQUksSUFBSSxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUNyRCxPQUFPLEdBQUcsSUFBSSxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtRQUM1RCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQ3JELE9BQU8sSUFBSSxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUE7UUFDdkQsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxXQUFXO1FBQ1YsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDaEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ2hDLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQTtJQUM5QixDQUFDO0lBRUQsb0JBQW9CO1FBQ25CLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFBO0lBQzlCLENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQWdCLEVBQUUsSUFBa0I7UUFDckQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRW5DLE9BQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxRQUFnQjtRQUNwQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsUUFBUSxDQUFBO1FBRWpDLG1EQUFtRDtRQUNuRCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtJQUMxQixDQUFDO0lBRUQsYUFBYTtRQUNaLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUNsQyxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUE7SUFDaEMsQ0FBQztJQUVELHNCQUFzQjtRQUNyQixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsYUFBYSxDQUFDLFVBQWtCLEVBQUUsTUFBZTtRQUNoRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFdkMsSUFBSSxDQUFDLEtBQUssRUFBRSxhQUFhLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxVQUFrQjtRQUN4QyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsVUFBVSxDQUFBO1FBRXJDLHFEQUFxRDtRQUNyRCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtJQUMxQixDQUFDO0lBRUQsb0JBQW9CLENBQUMsUUFBZ0I7UUFDcEMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFFBQVEsQ0FBQTtRQUVqQyxtREFBbUQ7UUFDbkQsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUE7SUFDMUIsQ0FBQztJQUVELGtCQUFrQjtRQUNqQixJQUFJLENBQUMsV0FBVywyQkFBbUIsQ0FBQTtJQUNwQyxDQUFDO0lBRUQsb0JBQW9CO1FBQ25CLElBQUksQ0FBQyxXQUFXLDZCQUFxQixDQUFBO0lBQ3RDLENBQUM7SUFFUSxPQUFPO1FBQ2YsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQTtJQUMvQixDQUFDO0lBRVEsUUFBUTtRQUNoQixJQUNDLElBQUksQ0FBQyxLQUFLLEVBQUUsUUFBUSx3Q0FBZ0M7WUFDcEQsSUFBSSxDQUFDLEtBQUssRUFBRSxRQUFRLDJDQUFtQztZQUN2RCxJQUFJLENBQUMsS0FBSyxFQUFFLFFBQVEsd0NBQWdDLEVBQ25ELENBQUM7WUFDRixPQUFPLEtBQUssQ0FBQSxDQUFDLG1FQUFtRTtRQUNqRixDQUFDO1FBRUQsd0VBQXdFO1FBQ3hFLHNFQUFzRTtRQUN0RSwwRUFBMEU7UUFDMUUsd0RBQXdEO1FBRXhELElBQUksSUFBSSxDQUFDLHlCQUF5QixDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDaEUsT0FBTyxJQUFJLENBQUEsQ0FBQyw2REFBNkQ7UUFDMUUsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQ3hCLENBQUM7SUFFUSxpQkFBaUIsQ0FDekIsV0FBZ0I7UUFFaEIsSUFBSSxJQUFJLENBQUMsV0FBVywrQkFBdUIsRUFBRSxDQUFDO1lBQzdDLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxxQkFBcUIsQ0FBQyxDQUFBO1FBQ3JGLENBQUM7UUFFRCxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssbUJBQW1CLENBQUMsQ0FBQTtJQUNuRixDQUFDO0lBRVEsT0FBTyxDQUNmLE9BQWlDO1FBRWpDLG9CQUFvQjtRQUNwQixJQUFJLElBQUksQ0FBQyxXQUFXLCtCQUF1QixFQUFFLENBQUM7WUFDN0MsT0FBTyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUNoQyxDQUFDO1FBRUQsa0JBQWtCO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRU8sS0FBSyxDQUFDLGVBQWUsQ0FDNUIsT0FBaUM7UUFFakMsSUFBSSxDQUFDO1lBQ0osd0RBQXdEO1lBQ3hELDBEQUEwRDtZQUMxRCxtREFBbUQ7WUFDbkQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUE7WUFDaEQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFNBQVMsQ0FBQTtZQUVsQyx3REFBd0Q7WUFDeEQsK0NBQStDO1lBQy9DLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUU7Z0JBQ3ZELFVBQVUsRUFBRSxJQUFJLENBQUMsbUJBQW1CO2dCQUNwQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGlCQUFpQjtnQkFDaEMsUUFBUSxFQUNQLE9BQU8saUJBQWlCLEtBQUssUUFBUTtvQkFDcEMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLGlCQUFpQixDQUFDO29CQUM1QyxDQUFDLENBQUMsU0FBUztnQkFDYixNQUFNLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsdUZBQXVGO2dCQUNoSCxXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVcsNkJBQXFCO2dCQUNsRCxNQUFNLHNDQUE4QjtnQkFDcEMsTUFBTSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDO2FBQ2xDLENBQUMsQ0FBQTtZQUVGLDBIQUEwSDtZQUMxSCxnSUFBZ0k7WUFDaEksc0ZBQXNGO1lBQ3RGLDJIQUEySDtZQUMzSCxJQUFJLENBQUMsSUFBSSxDQUFDLDRCQUE0QixFQUFFLENBQUM7Z0JBQ3hDLElBQUksQ0FBQyw0QkFBNEIsR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUNwRixJQUFJLENBQUMsUUFBUSxDQUNiLENBQXFDLENBQUE7WUFDdkMsQ0FBQztZQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxNQUFNLENBQUE7WUFFdEQsK0RBQStEO1lBQy9ELCtEQUErRDtZQUMvRCxzQ0FBc0M7WUFDdEMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztnQkFDdkIsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUE7WUFDN0IsQ0FBQztZQUVELE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsd0NBQXdDO1lBQ3hDLElBQzBCLEtBQU0sQ0FBQyx1QkFBdUI7OERBQ2pCLEVBQ3JDLENBQUM7Z0JBQ0YsT0FBTyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtZQUNoQyxDQUFDO1lBRUQsNEJBQTRCO1lBQzVCLE1BQU0sS0FBSyxDQUFBO1FBQ1osQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsaUJBQWlCO1FBQzlCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3JELGlCQUFpQixFQUNqQixJQUFJLENBQUMsaUJBQWlCLEVBQ3RCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FDZCxDQUFBO1FBQ0QsTUFBTSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7UUFFckIsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsVUFBVTtRQUNULE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUE7SUFDcEIsQ0FBQztJQUVRLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBc0IsRUFBRSxNQUFXO1FBQ3hELE9BQU87WUFDTixNQUFNLEVBQUU7Z0JBQ1AsUUFBUSxFQUFFLE1BQU07Z0JBQ2hCLFFBQVEsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUM1QixPQUFPLEVBQUU7b0JBQ1IsU0FBUyxFQUFFLHNCQUFzQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQztpQkFDbEU7YUFDRDtTQUNELENBQUE7SUFDRixDQUFDO0lBRVEsU0FBUyxDQUFDLE9BQStCO1FBQ2pELE1BQU0sWUFBWSxHQUE0QjtZQUM3QyxRQUFRLEVBQUUsSUFBSSxDQUFDLGlCQUFpQjtZQUNoQyxTQUFTLEVBQUUsSUFBSTtZQUNmLE9BQU8sRUFBRTtnQkFDUixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7YUFDdkI7U0FDRCxDQUFBO1FBRUQsSUFBSSxPQUFPLE9BQU8sRUFBRSxpQkFBaUIsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNwRCxZQUFZLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtZQUMxQyxZQUFZLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtZQUM5QyxZQUFZLENBQUMsUUFBUSxHQUFHLENBQUMsR0FBRyxFQUFFO2dCQUM3QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUMzRCxJQUFJLEtBQUssRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsMEJBQTBCLEVBQUUsRUFBRSxDQUFDO29CQUM3RSxPQUFPLEtBQUssQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUEsQ0FBQyxrQ0FBa0M7Z0JBQzNFLENBQUM7Z0JBRUQsT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtZQUVKLFlBQVksQ0FBQyxPQUFPLEdBQUc7Z0JBQ3RCLEdBQUcsWUFBWSxDQUFDLE9BQU87Z0JBQ3ZCLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxhQUFhLENBQUM7YUFDdEYsQ0FBQTtRQUNGLENBQUM7UUFFRCxPQUFPLFlBQVksQ0FBQTtJQUNwQixDQUFDO0lBRVEsT0FBTyxDQUFDLFVBQTZDO1FBQzdELElBQUksSUFBSSxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ3pCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELElBQUksVUFBVSxZQUFZLGlCQUFlLEVBQUUsQ0FBQztZQUMzQyxPQUFPLE9BQU8sQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNuRCxDQUFDO1FBRUQsSUFBSSxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNqQyxDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRVEsT0FBTztRQUNmLFFBQVE7UUFDUixJQUFJLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQTtRQUV0QixrQkFBa0I7UUFDbEIsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUE7UUFFNUIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFTyxxQkFBcUI7UUFDNUIsT0FBTyxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO1FBQzFDLElBQUksQ0FBQyw0QkFBNEIsR0FBRyxTQUFTLENBQUE7SUFDOUMsQ0FBQztDQUNELENBQUE7QUEvZFksZUFBZTtJQXNEekIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsWUFBQSxhQUFhLENBQUE7SUFDYixZQUFBLFlBQVksQ0FBQTtJQUNaLFlBQUEsMEJBQTBCLENBQUE7SUFDMUIsWUFBQSxjQUFjLENBQUE7SUFDZCxZQUFBLFlBQVksQ0FBQTtJQUNaLFlBQUEsaUNBQWlDLENBQUE7SUFFakMsWUFBQSx5QkFBeUIsQ0FBQTtHQWhFZixlQUFlLENBK2QzQiJ9