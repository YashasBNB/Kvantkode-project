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
var MergeEditorInput_1;
import { assertFn } from '../../../../base/common/assert.js';
import { autorun } from '../../../../base/common/observable.js';
import { isEqual } from '../../../../base/common/resources.js';
import { isDefined } from '../../../../base/common/types.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { DEFAULT_EDITOR_ASSOCIATION, isResourceMergeEditorInput, } from '../../../common/editor.js';
import { ICustomEditorLabelService } from '../../../services/editor/common/customEditorLabelService.js';
import { AbstractTextResourceEditorInput } from '../../../common/editor/textResourceEditorInput.js';
import { TempFileMergeEditorModeFactory, WorkspaceMergeEditorModeFactory, } from './mergeEditorInputModel.js';
import { MergeEditorTelemetry } from './telemetry.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { ITextFileService, } from '../../../services/textfile/common/textfiles.js';
export class MergeEditorInputData {
    constructor(uri, title, detail, description) {
        this.uri = uri;
        this.title = title;
        this.detail = detail;
        this.description = description;
    }
}
let MergeEditorInput = class MergeEditorInput extends AbstractTextResourceEditorInput {
    static { MergeEditorInput_1 = this; }
    static { this.ID = 'mergeEditor.Input'; }
    get useWorkingCopy() {
        return this.configurationService.getValue('mergeEditor.useWorkingCopy') ?? false;
    }
    constructor(base, input1, input2, result, _instaService, editorService, textFileService, labelService, fileService, configurationService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService) {
        super(result, undefined, editorService, textFileService, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService);
        this.base = base;
        this.input1 = input1;
        this.input2 = input2;
        this.result = result;
        this._instaService = _instaService;
        this.configurationService = configurationService;
        this.closeHandler = {
            showConfirm: () => this._inputModel?.shouldConfirmClose() ?? false,
            confirm: async (editors) => {
                assertFn(() => editors.every((e) => e.editor instanceof MergeEditorInput_1));
                const inputModels = editors
                    .map((e) => e.editor._inputModel)
                    .filter(isDefined);
                return await this._inputModel.confirmClose(inputModels);
            },
        };
        this.mergeEditorModeFactory = this._instaService.createInstance(this.useWorkingCopy ? TempFileMergeEditorModeFactory : WorkspaceMergeEditorModeFactory, this._instaService.createInstance(MergeEditorTelemetry));
    }
    dispose() {
        super.dispose();
    }
    get typeId() {
        return MergeEditorInput_1.ID;
    }
    get editorId() {
        return DEFAULT_EDITOR_ASSOCIATION.id;
    }
    get capabilities() {
        let capabilities = super.capabilities | 256 /* EditorInputCapabilities.MultipleEditors */;
        if (this.useWorkingCopy) {
            capabilities |= 4 /* EditorInputCapabilities.Untitled */;
        }
        return capabilities;
    }
    getName() {
        return localize('name', 'Merging: {0}', super.getName());
    }
    async resolve() {
        if (!this._inputModel) {
            const inputModel = this._register(await this.mergeEditorModeFactory.createInputModel({
                base: this.base,
                input1: this.input1,
                input2: this.input2,
                result: this.result,
            }));
            this._inputModel = inputModel;
            this._register(autorun((reader) => {
                /** @description fire dirty event */
                inputModel.isDirty.read(reader);
                this._onDidChangeDirty.fire();
            }));
            await this._inputModel.model.onInitialized;
        }
        return this._inputModel;
    }
    async accept() {
        await this._inputModel?.accept();
    }
    async save(group, options) {
        await this._inputModel?.save(options);
        return undefined;
    }
    toUntyped() {
        return {
            input1: {
                resource: this.input1.uri,
                label: this.input1.title,
                description: this.input1.description,
                detail: this.input1.detail,
            },
            input2: {
                resource: this.input2.uri,
                label: this.input2.title,
                description: this.input2.description,
                detail: this.input2.detail,
            },
            base: { resource: this.base },
            result: { resource: this.result },
            options: {
                override: this.typeId,
            },
        };
    }
    matches(otherInput) {
        if (this === otherInput) {
            return true;
        }
        if (otherInput instanceof MergeEditorInput_1) {
            return (isEqual(this.base, otherInput.base) &&
                isEqual(this.input1.uri, otherInput.input1.uri) &&
                isEqual(this.input2.uri, otherInput.input2.uri) &&
                isEqual(this.result, otherInput.result));
        }
        if (isResourceMergeEditorInput(otherInput)) {
            return ((this.editorId === otherInput.options?.override ||
                otherInput.options?.override === undefined) &&
                isEqual(this.base, otherInput.base.resource) &&
                isEqual(this.input1.uri, otherInput.input1.resource) &&
                isEqual(this.input2.uri, otherInput.input2.resource) &&
                isEqual(this.result, otherInput.result.resource));
        }
        return false;
    }
    async revert(group, options) {
        return this._inputModel?.revert(options);
    }
    // ---- FileEditorInput
    isDirty() {
        return this._inputModel?.isDirty.get() ?? false;
    }
    setLanguageId(languageId, source) {
        this._inputModel?.model.setLanguageId(languageId, source);
    }
};
MergeEditorInput = MergeEditorInput_1 = __decorate([
    __param(4, IInstantiationService),
    __param(5, IEditorService),
    __param(6, ITextFileService),
    __param(7, ILabelService),
    __param(8, IFileService),
    __param(9, IConfigurationService),
    __param(10, IFilesConfigurationService),
    __param(11, ITextResourceConfigurationService),
    __param(12, ICustomEditorLabelService)
], MergeEditorInput);
export { MergeEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvbWVyZ2VFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTVELE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ25ILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFDTiwwQkFBMEIsRUFJMUIsMEJBQTBCLEdBRTFCLE1BQU0sMkJBQTJCLENBQUE7QUFFbEMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDdkcsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDbkcsT0FBTyxFQUVOLDhCQUE4QixFQUM5QiwrQkFBK0IsR0FDL0IsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFB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