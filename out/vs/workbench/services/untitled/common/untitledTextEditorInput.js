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
var UntitledTextEditorInput_1;
import { DEFAULT_EDITOR_ASSOCIATION, findViewStateForEditor, isUntitledResourceEditorInput, } from '../../../common/editor.js';
import { AbstractTextResourceEditorInput } from '../../../common/editor/textResourceEditorInput.js';
import { ITextFileService, } from '../../textfile/common/textfiles.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { isEqual, toLocalResource } from '../../../../base/common/resources.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IPathService } from '../../path/common/pathService.js';
import { IFilesConfigurationService } from '../../filesConfiguration/common/filesConfigurationService.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { ICustomEditorLabelService } from '../../editor/common/customEditorLabelService.js';
/**
 * An editor input to be used for untitled text buffers.
 */
let UntitledTextEditorInput = class UntitledTextEditorInput extends AbstractTextResourceEditorInput {
    static { UntitledTextEditorInput_1 = this; }
    static { this.ID = 'workbench.editors.untitledEditorInput'; }
    get typeId() {
        return UntitledTextEditorInput_1.ID;
    }
    get editorId() {
        return DEFAULT_EDITOR_ASSOCIATION.id;
    }
    constructor(model, textFileService, labelService, editorService, fileService, environmentService, pathService, filesConfigurationService, textModelService, textResourceConfigurationService, customEditorLabelService) {
        super(model.resource, undefined, editorService, textFileService, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService);
        this.model = model;
        this.environmentService = environmentService;
        this.pathService = pathService;
        this.textModelService = textModelService;
        this.modelResolve = undefined;
        this.modelDisposables = this._register(new DisposableStore());
        this.cachedUntitledTextEditorModelReference = undefined;
        this.registerModelListeners(model);
        this._register(this.textFileService.untitled.onDidCreate((model) => this.onDidCreateUntitledModel(model)));
    }
    registerModelListeners(model) {
        this.modelDisposables.clear();
        // re-emit some events from the model
        this.modelDisposables.add(model.onDidChangeDirty(() => this._onDidChangeDirty.fire()));
        this.modelDisposables.add(model.onDidChangeName(() => this._onDidChangeLabel.fire()));
        // a reverted untitled text editor model renders this input disposed
        this.modelDisposables.add(model.onDidRevert(() => this.dispose()));
    }
    onDidCreateUntitledModel(model) {
        if (isEqual(model.resource, this.model.resource) && model !== this.model) {
            // Ensure that we keep our model up to date with
            // the actual model from the service so that we
            // never get out of sync with the truth.
            this.model = model;
            this.registerModelListeners(model);
        }
    }
    getName() {
        return this.model.name;
    }
    getDescription(verbosity = 1 /* Verbosity.MEDIUM */) {
        // Without associated path: only use if name and description differ
        if (!this.model.hasAssociatedFilePath) {
            const descriptionCandidate = this.resource.path;
            if (descriptionCandidate !== this.getName()) {
                return descriptionCandidate;
            }
            return undefined;
        }
        // With associated path: delegate to parent
        return super.getDescription(verbosity);
    }
    getTitle(verbosity) {
        // Without associated path: check if name and description differ to decide
        // if description should appear besides the name to distinguish better
        if (!this.model.hasAssociatedFilePath) {
            const name = this.getName();
            const description = this.getDescription();
            if (description && description !== name) {
                return `${name} • ${description}`;
            }
            return name;
        }
        // With associated path: delegate to parent
        return super.getTitle(verbosity);
    }
    isDirty() {
        return this.model.isDirty();
    }
    getEncoding() {
        return this.model.getEncoding();
    }
    setEncoding(encoding, mode /* ignored, we only have Encode */) {
        return this.model.setEncoding(encoding);
    }
    get hasLanguageSetExplicitly() {
        return this.model.hasLanguageSetExplicitly;
    }
    get hasAssociatedFilePath() {
        return this.model.hasAssociatedFilePath;
    }
    setLanguageId(languageId, source) {
        this.model.setLanguageId(languageId, source);
    }
    getLanguageId() {
        return this.model.getLanguageId();
    }
    async resolve() {
        if (!this.modelResolve) {
            this.modelResolve = (async () => {
                // Acquire a model reference
                this.cachedUntitledTextEditorModelReference =
                    (await this.textModelService.createModelReference(this.resource));
            })();
        }
        await this.modelResolve;
        // It is possible that this input was disposed before the model
        // finished resolving. As such, we need to make sure to dispose
        // the model reference to not leak it.
        if (this.isDisposed()) {
            this.disposeModelReference();
        }
        return this.model;
    }
    toUntyped(options) {
        const untypedInput = {
            resource: this.model.hasAssociatedFilePath
                ? toLocalResource(this.model.resource, this.environmentService.remoteAuthority, this.pathService.defaultUriScheme)
                : this.resource,
            forceUntitled: true,
            options: {
                override: this.editorId,
            },
        };
        if (typeof options?.preserveViewState === 'number') {
            untypedInput.encoding = this.getEncoding();
            untypedInput.languageId = this.getLanguageId();
            untypedInput.contents = this.model.isModified()
                ? this.model.textEditorModel?.getValue()
                : undefined;
            untypedInput.options.viewState = findViewStateForEditor(this, options.preserveViewState, this.editorService);
            if (typeof untypedInput.contents === 'string' &&
                !this.model.hasAssociatedFilePath &&
                !options.preserveResource) {
                // Given how generic untitled resources in the system are, we
                // need to be careful not to set our resource into the untyped
                // editor if we want to transport contents too, because of
                // issue https://github.com/microsoft/vscode/issues/140898
                // The workaround is to simply remove the resource association
                // if we have contents and no associated resource.
                // In that case we can ensure that a new untitled resource is
                // being created and the contents can be restored properly.
                untypedInput.resource = undefined;
            }
        }
        return untypedInput;
    }
    matches(otherInput) {
        if (this === otherInput) {
            return true;
        }
        if (otherInput instanceof UntitledTextEditorInput_1) {
            return isEqual(otherInput.resource, this.resource);
        }
        if (isUntitledResourceEditorInput(otherInput)) {
            return super.matches(otherInput);
        }
        return false;
    }
    dispose() {
        // Model
        this.modelResolve = undefined;
        // Model reference
        this.disposeModelReference();
        super.dispose();
    }
    disposeModelReference() {
        dispose(this.cachedUntitledTextEditorModelReference);
        this.cachedUntitledTextEditorModelReference = undefined;
    }
};
UntitledTextEditorInput = UntitledTextEditorInput_1 = __decorate([
    __param(1, ITextFileService),
    __param(2, ILabelService),
    __param(3, IEditorService),
    __param(4, IFileService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, IPathService),
    __param(7, IFilesConfigurationService),
    __param(8, ITextModelService),
    __param(9, ITextResourceConfigurationService),
    __param(10, ICustomEditorLabelService)
], UntitledTextEditorInput);
export { UntitledTextEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRUZXh0RWRpdG9ySW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91bnRpdGxlZC9jb21tb24vdW50aXRsZWRUZXh0RWRpdG9ySW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsc0JBQXNCLEVBQ3RCLDZCQUE2QixHQUk3QixNQUFNLDJCQUEyQixDQUFBO0FBRWxDLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRW5HLE9BQU8sRUFJTixnQkFBZ0IsR0FDaEIsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBYyxNQUFNLHNDQUFzQyxDQUFBO0FBQzNGLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ25ILE9BQU8sRUFBRSx5QkFB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