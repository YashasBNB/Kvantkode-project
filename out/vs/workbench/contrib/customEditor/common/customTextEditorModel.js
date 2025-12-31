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
var CustomTextEditorModel_1;
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { basename } from '../../../../base/common/path.js';
import { isEqual } from '../../../../base/common/resources.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../nls.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IExtensionService } from '../../../../workbench/services/extensions/common/extensions.js';
import { ITextFileService, } from '../../../services/textfile/common/textfiles.js';
let CustomTextEditorModel = CustomTextEditorModel_1 = class CustomTextEditorModel extends Disposable {
    static async create(instantiationService, viewType, resource) {
        return instantiationService.invokeFunction(async (accessor) => {
            const textModelResolverService = accessor.get(ITextModelService);
            const model = await textModelResolverService.createModelReference(resource);
            return instantiationService.createInstance(CustomTextEditorModel_1, viewType, resource, model);
        });
    }
    constructor(viewType, _resource, _model, textFileService, _labelService, extensionService) {
        super();
        this.viewType = viewType;
        this._resource = _resource;
        this._model = _model;
        this.textFileService = textFileService;
        this._labelService = _labelService;
        this._onDidChangeOrphaned = this._register(new Emitter());
        this.onDidChangeOrphaned = this._onDidChangeOrphaned.event;
        this._onDidChangeReadonly = this._register(new Emitter());
        this.onDidChangeReadonly = this._onDidChangeReadonly.event;
        this._onDidChangeDirty = this._register(new Emitter());
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._register(_model);
        this._textFileModel = this.textFileService.files.get(_resource);
        if (this._textFileModel) {
            this._register(this._textFileModel.onDidChangeOrphaned(() => this._onDidChangeOrphaned.fire()));
            this._register(this._textFileModel.onDidChangeReadonly(() => this._onDidChangeReadonly.fire()));
        }
        this._register(this.textFileService.files.onDidChangeDirty((e) => {
            if (isEqual(this.resource, e.resource)) {
                this._onDidChangeDirty.fire();
                this._onDidChangeContent.fire();
            }
        }));
        this._register(extensionService.onWillStop((e) => {
            e.veto(true, localize('vetoExtHostRestart', "An extension provided text editor for '{0}' is still open that would close otherwise.", this.name));
        }));
    }
    get resource() {
        return this._resource;
    }
    get name() {
        return basename(this._labelService.getUriLabel(this._resource));
    }
    isReadonly() {
        return this._model.object.isReadonly();
    }
    get backupId() {
        return undefined;
    }
    get canHotExit() {
        return true; // ensured via backups from text file models
    }
    isDirty() {
        return this.textFileService.isDirty(this.resource);
    }
    isOrphaned() {
        return !!this._textFileModel?.hasState(4 /* TextFileEditorModelState.ORPHAN */);
    }
    async revert(options) {
        return this.textFileService.revert(this.resource, options);
    }
    saveCustomEditor(options) {
        return this.textFileService.save(this.resource, options);
    }
    async saveCustomEditorAs(resource, targetResource, options) {
        return !!(await this.textFileService.saveAs(resource, targetResource, options));
    }
};
CustomTextEditorModel = CustomTextEditorModel_1 = __decorate([
    __param(3, ITextFileService),
    __param(4, ILabelService),
    __param(5, IExtensionService)
], CustomTextEditorModel);
export { CustomTextEditorModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tVGV4dEVkaXRvck1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY3VzdG9tRWRpdG9yL2NvbW1vbi9jdXN0b21UZXh0RWRpdG9yTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsVUFBVSxFQUFjLE1BQU0sc0NBQXNDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU5RCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUcxRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUNsRyxPQUFPLEVBRU4sZ0JBQWdCLEdBRWhCLE1BQU0sZ0RBQWdELENBQUE7QUFFaEQsSUFBTSxxQkFBcUIsNkJBQTNCLE1BQU0scUJBQXNCLFNBQVEsVUFBVTtJQUM3QyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FDekIsb0JBQTJDLEVBQzNDLFFBQWdCLEVBQ2hCLFFBQWE7UUFFYixPQUFPLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDN0QsTUFBTSx3QkFBd0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7WUFDaEUsTUFBTSxLQUFLLEdBQUcsTUFBTSx3QkFBd0IsQ0FBQyxv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