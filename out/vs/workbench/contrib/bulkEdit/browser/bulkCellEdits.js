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
import { groupBy } from '../../../../base/common/arrays.js';
import { compare } from '../../../../base/common/strings.js';
import { isObject } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { ResourceEdit } from '../../../../editor/browser/services/bulkEditService.js';
import { getNotebookEditorFromEditorPane } from '../../notebook/browser/notebookBrowser.js';
import { CellUri, SelectionStateType, } from '../../notebook/common/notebookCommon.js';
import { INotebookEditorModelResolverService } from '../../notebook/common/notebookEditorModelResolverService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
export class ResourceNotebookCellEdit extends ResourceEdit {
    static is(candidate) {
        if (candidate instanceof ResourceNotebookCellEdit) {
            return true;
        }
        return (URI.isUri(candidate.resource) &&
            isObject(candidate.cellEdit));
    }
    static lift(edit) {
        if (edit instanceof ResourceNotebookCellEdit) {
            return edit;
        }
        return new ResourceNotebookCellEdit(edit.resource, edit.cellEdit, edit.notebookVersionId, edit.metadata);
    }
    constructor(resource, cellEdit, notebookVersionId = undefined, metadata) {
        super(metadata);
        this.resource = resource;
        this.cellEdit = cellEdit;
        this.notebookVersionId = notebookVersionId;
    }
}
let BulkCellEdits = class BulkCellEdits {
    constructor(_undoRedoGroup, undoRedoSource, _progress, _token, _edits, _editorService, _notebookModelService) {
        this._undoRedoGroup = _undoRedoGroup;
        this._progress = _progress;
        this._token = _token;
        this._edits = _edits;
        this._editorService = _editorService;
        this._notebookModelService = _notebookModelService;
        this._edits = this._edits.map((e) => {
            if (e.resource.scheme === CellUri.scheme) {
                const uri = CellUri.parse(e.resource)?.notebook;
                if (!uri) {
                    throw new Error(`Invalid notebook URI: ${e.resource}`);
                }
                return new ResourceNotebookCellEdit(uri, e.cellEdit, e.notebookVersionId, e.metadata);
            }
            else {
                return e;
            }
        });
    }
    async apply() {
        const resources = [];
        const editsByNotebook = groupBy(this._edits, (a, b) => compare(a.resource.toString(), b.resource.toString()));
        for (const group of editsByNotebook) {
            if (this._token.isCancellationRequested) {
                break;
            }
            const [first] = group;
            const ref = await this._notebookModelService.resolve(first.resource);
            // check state
            if (typeof first.notebookVersionId === 'number' &&
                ref.object.notebook.versionId !== first.notebookVersionId) {
                ref.dispose();
                throw new Error(`Notebook '${first.resource}' has changed in the meantime`);
            }
            // apply edits
            const edits = group.map((entry) => entry.cellEdit);
            const computeUndo = !ref.object.isReadonly();
            const editor = getNotebookEditorFromEditorPane(this._editorService.activeEditorPane);
            const initialSelectionState = editor?.textModel?.uri.toString() === ref.object.notebook.uri.toString()
                ? {
                    kind: SelectionStateType.Index,
                    focus: editor.getFocus(),
                    selections: editor.getSelections(),
                }
                : undefined;
            ref.object.notebook.applyEdits(edits, true, initialSelectionState, () => undefined, this._undoRedoGroup, computeUndo);
            ref.dispose();
            this._progress.report(undefined);
            resources.push(first.resource);
        }
        return resources;
    }
};
BulkCellEdits = __decorate([
    __param(5, IEditorService),
    __param(6, INotebookEditorModelResolverService)
], BulkCellEdits);
export { BulkCellEdits };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0NlbGxFZGl0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2J1bGtFZGl0L2Jyb3dzZXIvYnVsa0NlbGxFZGl0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBSXJGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzNGLE9BQU8sRUFDTixPQUFPLEVBTVAsa0JBQWtCLEdBQ2xCLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDakgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRWpGLE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxZQUFZO0lBQ3pELE1BQU0sQ0FBQyxFQUFFLENBQUMsU0FBYztRQUN2QixJQUFJLFNBQVMsWUFBWSx3QkFBd0IsRUFBRSxDQUFDO1lBQ25ELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sQ0FDTixHQUFHLENBQUMsS0FBSyxDQUE4QixTQUFVLENBQUMsUUFBUSxDQUFDO1lBQzNELFFBQVEsQ0FBOEIsU0FBVSxDQUFDLFFBQVEsQ0FBQyxDQUMxRCxDQUFBO0lBQ0YsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBZ0M7UUFD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