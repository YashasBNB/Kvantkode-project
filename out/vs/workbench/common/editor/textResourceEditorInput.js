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
var TextResourceEditorInput_1;
import { DEFAULT_EDITOR_ASSOCIATION, isResourceEditorInput, } from '../editor.js';
import { AbstractResourceEditorInput } from './resourceEditorInput.js';
import { ITextFileService, } from '../../services/textfile/common/textfiles.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { Schemas } from '../../../base/common/network.js';
import { isEqual } from '../../../base/common/resources.js';
import { ITextModelService, } from '../../../editor/common/services/resolverService.js';
import { TextResourceEditorModel } from './textResourceEditorModel.js';
import { createTextBufferFactory } from '../../../editor/common/model/textModel.js';
import { IFilesConfigurationService } from '../../services/filesConfiguration/common/filesConfigurationService.js';
import { ITextResourceConfigurationService } from '../../../editor/common/services/textResourceConfiguration.js';
import { ICustomEditorLabelService } from '../../services/editor/common/customEditorLabelService.js';
/**
 * The base class for all editor inputs that open in text editors.
 */
let AbstractTextResourceEditorInput = class AbstractTextResourceEditorInput extends AbstractResourceEditorInput {
    constructor(resource, preferredResource, editorService, textFileService, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService) {
        super(resource, preferredResource, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService);
        this.editorService = editorService;
        this.textFileService = textFileService;
    }
    save(group, options) {
        // If this is neither an `untitled` resource, nor a resource
        // we can handle with the file service, we can only "Save As..."
        if (this.resource.scheme !== Schemas.untitled && !this.fileService.hasProvider(this.resource)) {
            return this.saveAs(group, options);
        }
        // Normal save
        return this.doSave(options, false, group);
    }
    saveAs(group, options) {
        return this.doSave(options, true, group);
    }
    async doSave(options, saveAs, group) {
        // Save / Save As
        let target;
        if (saveAs) {
            target = await this.textFileService.saveAs(this.resource, undefined, {
                ...options,
                suggestedTarget: this.preferredResource,
            });
        }
        else {
            target = await this.textFileService.save(this.resource, options);
        }
        if (!target) {
            return undefined; // save cancelled
        }
        return { resource: target };
    }
    async revert(group, options) {
        await this.textFileService.revert(this.resource, options);
    }
};
AbstractTextResourceEditorInput = __decorate([
    __param(2, IEditorService),
    __param(3, ITextFileService),
    __param(4, ILabelService),
    __param(5, IFileService),
    __param(6, IFilesConfigurationService),
    __param(7, ITextResourceConfigurationService),
    __param(8, ICustomEditorLabelService)
], AbstractTextResourceEditorInput);
export { AbstractTextResourceEditorInput };
/**
 * A read-only text editor input whos contents are made of the provided resource that points to an existing
 * code editor model.
 */
let TextResourceEditorInput = class TextResourceEditorInput extends AbstractTextResourceEditorInput {
    static { TextResourceEditorInput_1 = this; }
    static { this.ID = 'workbench.editors.resourceEditorInput'; }
    get typeId() {
        return TextResourceEditorInput_1.ID;
    }
    get editorId() {
        return DEFAULT_EDITOR_ASSOCIATION.id;
    }
    constructor(resource, name, description, preferredLanguageId, preferredContents, textModelService, textFileService, editorService, fileService, labelService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService) {
        super(resource, undefined, editorService, textFileService, labelService, fileService, filesConfigurationService, textResourceConfigurationService, customEditorLabelService);
        this.name = name;
        this.description = description;
        this.preferredLanguageId = preferredLanguageId;
        this.preferredContents = preferredContents;
        this.textModelService = textModelService;
        this.cachedModel = undefined;
        this.modelReference = undefined;
    }
    getName() {
        return this.name || super.getName();
    }
    setName(name) {
        if (this.name !== name) {
            this.name = name;
            this._onDidChangeLabel.fire();
        }
    }
    getDescription() {
        return this.description;
    }
    setDescription(description) {
        if (this.description !== description) {
            this.description = description;
            this._onDidChangeLabel.fire();
        }
    }
    setLanguageId(languageId, source) {
        this.setPreferredLanguageId(languageId);
        this.cachedModel?.setLanguageId(languageId, source);
    }
    setPreferredLanguageId(languageId) {
        this.preferredLanguageId = languageId;
    }
    setPreferredContents(contents) {
        this.preferredContents = contents;
    }
    async resolve() {
        // Unset preferred contents and language after resolving
        // once to prevent these properties to stick. We still
        // want the user to change the language in the editor
        // and want to show updated contents (if any) in future
        // `resolve` calls.
        const preferredContents = this.preferredContents;
        const preferredLanguageId = this.preferredLanguageId;
        this.preferredContents = undefined;
        this.preferredLanguageId = undefined;
        if (!this.modelReference) {
            this.modelReference = this.textModelService.createModelReference(this.resource);
        }
        const ref = await this.modelReference;
        // Ensure the resolved model is of expected type
        const model = ref.object;
        if (!(model instanceof TextResourceEditorModel)) {
            ref.dispose();
            this.modelReference = undefined;
            throw new Error(`Unexpected model for TextResourceEditorInput: ${this.resource}`);
        }
        this.cachedModel = model;
        // Set contents and language if preferred
        if (typeof preferredContents === 'string' || typeof preferredLanguageId === 'string') {
            model.updateTextEditorModel(typeof preferredContents === 'string'
                ? createTextBufferFactory(preferredContents)
                : undefined, preferredLanguageId);
        }
        return model;
    }
    matches(otherInput) {
        if (this === otherInput) {
            return true;
        }
        if (otherInput instanceof TextResourceEditorInput_1) {
            return isEqual(otherInput.resource, this.resource);
        }
        if (isResourceEditorInput(otherInput)) {
            return super.matches(otherInput);
        }
        return false;
    }
    dispose() {
        if (this.modelReference) {
            this.modelReference.then((ref) => ref.dispose());
            this.modelReference = undefined;
        }
        this.cachedModel = undefined;
        super.dispose();
    }
};
TextResourceEditorInput = TextResourceEditorInput_1 = __decorate([
    __param(5, ITextModelService),
    __param(6, ITextFileService),
    __param(7, IEditorService),
    __param(8, IFileService),
    __param(9, ILabelService),
    __param(10, IFilesConfigurationService),
    __param(11, ITextResourceConfigurationService),
    __param(12, ICustomEditorLabelService)
], TextResourceEditorInput);
export { TextResourceEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFJlc291cmNlRWRpdG9ySW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL2VkaXRvci90ZXh0UmVzb3VyY2VFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLDBCQUEwQixFQUcxQixxQkFBcUIsR0FFckIsTUFBTSxjQUFjLENBQUE7QUFFckIsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFdEUsT0FBTyxFQUNOLGdCQUFnQixHQUdoQixNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRXRFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHVFQUF1RSxDQUFBO0FBQ2xILE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ2hILE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRXBHOztHQUVHO0FBQ0ksSUFBZSwrQkFBK0IsR0FBOUMsTUFBZSwr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