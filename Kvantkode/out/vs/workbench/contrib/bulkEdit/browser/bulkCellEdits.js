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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0NlbGxFZGl0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYnVsa0VkaXQvYnJvd3Nlci9idWxrQ2VsbEVkaXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFJckYsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDM0YsT0FBTyxFQUNOLE9BQU8sRUFNUCxrQkFBa0IsR0FDbEIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNqSCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFakYsTUFBTSxPQUFPLHdCQUF5QixTQUFRLFlBQVk7SUFDekQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFjO1FBQ3ZCLElBQUksU0FBUyxZQUFZLHdCQUF3QixFQUFFLENBQUM7WUFDbkQsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsT0FBTyxDQUNOLEdBQUcsQ0FBQyxLQUFLLENBQThCLFNBQVUsQ0FBQyxRQUFRLENBQUM7WUFDM0QsUUFBUSxDQUE4QixTQUFVLENBQUMsUUFBUSxDQUFDLENBQzFELENBQUE7SUFDRixDQUFDO0lBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFn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