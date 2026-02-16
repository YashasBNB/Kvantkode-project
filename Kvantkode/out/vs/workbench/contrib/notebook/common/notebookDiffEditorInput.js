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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmRWRpdG9ySW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2NvbW1vbi9ub3RlYm9va0RpZmZFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUdOLHlCQUF5QixHQUV6QixNQUFNLDJCQUEyQixDQUFBO0FBRWxDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUluRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDM0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRWpGLE1BQU0sdUJBQXdCLFNBQVEsV0FBVztJQUNoRCxZQUNVLFFBQXNDLEVBQ3RDLFFBQXNDO1FBRS9DLEtBQUssRUFBRSxDQUFBO1FBSEUsYUFBUSxHQUFSLFFBQVEsQ0FBOEI7UUFDdEMsYUFBUSxHQUFSLFFBQVEsQ0FBOEI7SUFHaEQsQ0FBQztDQUNEO0FBRU0sSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxlQUFlOztJQUMzRCxNQUFNLENBQUMsTUFBTSxDQUNaLG9CQUEyQyxFQUMzQyxRQUFhLEVBQ2IsSUFBd0IsRUFDeEIsV0FBK0IsRUFDL0IsZ0JBQXFCLEVBQ3JCLFFBQWdCO1FBRWhCLE1BQU0sUUFBUSxHQUFHLG1CQUFtQixDQUFDLFdBQVcsQ0FDL0Msb0JBQW9CLEVBQ3BCLGdCQUFnQixFQUNoQixTQUFTLEVBQ1QsUUFBUSxDQUNSLENBQUE7UUFDRCxNQUFNLFFBQVEsR0FBRyxtQkFBbUIsQ0FBQyxXQUFXLENBQy9D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