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
var NotebookDiffEditorInput_1;
import { isResourceDiffEditorInput, } from '../../../common/editor.js';
import { EditorModel } from '../../../common/editor/editorModel.js';
import { DiffEditorInput } from '../../../common/editor/diffEditorInput.js';
import { NotebookEditorInput } from './notebookEditorInput.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
class NotebookDiffEditorModel extends EditorModel {
    constructor(original, modified) {
        super();
        this.original = original;
        this.modified = modified;
    }
}
let NotebookDiffEditorInput = class NotebookDiffEditorInput extends DiffEditorInput {
    static { NotebookDiffEditorInput_1 = this; }
    static create(instantiationService, resource, name, description, originalResource, viewType) {
        const original = NotebookEditorInput.getOrCreate(instantiationService, originalResource, undefined, viewType);
        const modified = NotebookEditorInput.getOrCreate(instantiationService, resource, undefined, viewType);
        return instantiationService.createInstance(NotebookDiffEditorInput_1, name, description, original, modified, viewType);
    }
    static { this.ID = 'workbench.input.diffNotebookInput'; }
    get resource() {
        return this.modified.resource;
    }
    get editorId() {
        return this.viewType;
    }
    constructor(name, description, original, modified, viewType, editorService) {
        super(name, description, original, modified, undefined, editorService);
        this.original = original;
        this.modified = modified;
        this.viewType = viewType;
        this._modifiedTextModel = null;
        this._originalTextModel = null;
        this._cachedModel = undefined;
    }
    get typeId() {
        return NotebookDiffEditorInput_1.ID;
    }
    async resolve() {
        const [originalEditorModel, modifiedEditorModel] = await Promise.all([
            this.original.resolve(),
            this.modified.resolve(),
        ]);
        this._cachedModel?.dispose();
        // TODO@rebornix check how we restore the editor in text diff editor
        if (!modifiedEditorModel) {
            throw new Error(`Fail to resolve modified editor model for resource ${this.modified.resource} with notebookType ${this.viewType}`);
        }
        if (!originalEditorModel) {
            throw new Error(`Fail to resolve original editor model for resource ${this.original.resource} with notebookType ${this.viewType}`);
        }
        this._originalTextModel = originalEditorModel;
        this._modifiedTextModel = modifiedEditorModel;
        this._cachedModel = new NotebookDiffEditorModel(this._originalTextModel, this._modifiedTextModel);
        return this._cachedModel;
    }
    toUntyped() {
        const original = { resource: this.original.resource };
        const modified = { resource: this.resource };
        return {
            original,
            modified,
            primary: modified,
            secondary: original,
            options: {
                override: this.viewType,
            },
        };
    }
    matches(otherInput) {
        if (this === otherInput) {
            return true;
        }
        if (otherInput instanceof NotebookDiffEditorInput_1) {
            return (this.modified.matches(otherInput.modified) &&
                this.original.matches(otherInput.original) &&
                this.viewType === otherInput.viewType);
        }
        if (isResourceDiffEditorInput(otherInput)) {
            return (this.modified.matches(otherInput.modified) &&
                this.original.matches(otherInput.original) &&
                this.editorId !== undefined &&
                (this.editorId === otherInput.options?.override ||
                    otherInput.options?.override === undefined));
        }
        return false;
    }
    dispose() {
        super.dispose();
        this._cachedModel?.dispose();
        this._cachedModel = undefined;
        this.original.dispose();
        this.modified.dispose();
        this._originalTextModel = null;
        this._modifiedTextModel = null;
    }
};
NotebookDiffEditorInput = NotebookDiffEditorInput_1 = __decorate([
    __param(5, IEditorService)
], NotebookDiffEditorInput);
export { NotebookDiffEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmRWRpdG9ySW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9jb21tb24vbm90ZWJvb2tEaWZmRWRpdG9ySW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFHTix5QkFBeUIsR0FFekIsTUFBTSwyQkFBMkIsQ0FBQTtBQUVsQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFJbkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVqRixNQUFNLHVCQUF3QixTQUFRLFdBQVc7SUFDaEQsWUFDVSxRQUFzQyxFQUN0QyxRQUFzQztRQUUvQyxLQUFLLEVBQUUsQ0FBQTtRQUhFLGFBQVEsR0FBUixRQUFRLENBQThCO1FBQ3RDLGFBQVEsR0FBUixRQUFRLENBQThCO0lBR2hELENBQUM7Q0FDRDtBQUVNLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsZUFBZTs7SUFDM0QsTUFBTSxDQUFDLE1BQU0sQ0FDWixvQkFBMkMsRUFDM0MsUUFBYSxFQUNiLElBQXdCLEVBQ3hCLFdBQStCLEVBQy9CLGdCQUFxQixFQUNyQixRQUFnQjtRQUVoQixNQUFNLFFBQVEsR0FBRyxtQkFBbUIsQ0FBQyxXQUFXLENBQy9DLG9CQUFvQixFQUNwQixnQkFBZ0IsRUFDaEIsU0FBUyxFQUNULFFBQVEsQ0FDUixDQUFBO1FBQ0QsTUFBTSxRQUFRLEdBQUcsbUJBQW1CLENBQUMsV0FBVyxDQUMvQyxvQkFBb0IsRUFDcEIsUUFBUSxFQUNS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