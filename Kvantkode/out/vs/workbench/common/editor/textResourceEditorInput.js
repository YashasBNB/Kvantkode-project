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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFJlc291cmNlRWRpdG9ySW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb21tb24vZWRpdG9yL3RleHRSZXNvdXJjZUVkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sMEJBQTBCLEVBRzFCLHFCQUFxQixHQUVyQixNQUFNLGNBQWMsQ0FBQTtBQUVyQixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUV0RSxPQUFPLEVBQ04sZ0JBQWdCLEdBR2hCLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFdEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDbkYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sdUVBQXVFLENBQUE7QUFDbEgsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDaEgsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFcEc7O0dBRUc7QUFDSSxJQUFlLCtCQUErQixHQUE5QyxN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