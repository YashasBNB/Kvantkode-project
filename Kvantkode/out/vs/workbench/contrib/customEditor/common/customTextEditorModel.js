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
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tVGV4dEVkaXRvck1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jdXN0b21FZGl0b3IvY29tbW9uL2N1c3RvbVRleHRFZGl0b3JNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxVQUFVLEVBQWMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRTlELE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRzFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3JGLE9BQU8sRUFFTixnQkFBZ0IsR0FFaEIsTUFBTSxnREFBZ0QsQ0FBQTtBQUVoRCxJQUFNLHFCQUFxQiw2QkFBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVO0lBQzdDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUN6QixvQkFBMkMsRUFDM0MsUUFBZ0IsRUFDaEIsUUFBYTtRQUViLE9BQU8sb0JBQW9CLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBRTtZQUM3RCxNQUFNLHdCQUF3QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtZQUNoRSxNQUFNLEtBQUssR0FBRyxNQUFNLHdCQUF3QixD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