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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRUZXh0RWRpdG9ySW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdW50aXRsZWQvY29tbW9uL3VudGl0bGVkVGV4dEVkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLHNCQUFzQixFQUN0Qiw2QkFBNkIsR0FJN0IsTUFBTSwyQkFBMkIsQ0FBQTtBQUVsQyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVuRyxPQUFPLEVBSU4sZ0JBQWdCLEdBQ2hCLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFL0QsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDekcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRixPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUNuSCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpREFBaUQsQ0FB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