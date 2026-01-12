/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SelectionStateType, } from '../../common/notebookCommon.js';
import { CellFocusMode } from '../notebookBrowser.js';
export class JoinCellEdit {
    constructor(resource, index, direction, cell, selections, inverseRange, insertContent, removedCell, editingDelegate) {
        this.resource = resource;
        this.index = index;
        this.direction = direction;
        this.cell = cell;
        this.selections = selections;
        this.inverseRange = inverseRange;
        this.insertContent = insertContent;
        this.removedCell = removedCell;
        this.editingDelegate = editingDelegate;
        this.type = 0 /* UndoRedoElementType.Resource */;
        this.label = 'Join Cell';
        this.code = 'undoredo.textBufferEdit';
        this._deletedRawCell = this.removedCell.model;
    }
    async undo() {
        if (!this.editingDelegate.insertCell || !this.editingDelegate.createCellViewModel) {
            throw new Error('Notebook Insert Cell not implemented for Undo/Redo');
        }
        await this.cell.resolveTextModel();
        this.cell.textModel?.applyEdits([{ range: this.inverseRange, text: '' }]);
        this.cell.setSelections(this.selections);
        const cell = this.editingDelegate.createCellViewModel(this._deletedRawCell);
        if (this.direction === 'above') {
            this.editingDelegate.insertCell(this.index, this._deletedRawCell, {
                kind: SelectionStateType.Handle,
                primary: cell.handle,
                selections: [cell.handle],
            });
            cell.focusMode = CellFocusMode.Editor;
        }
        else {
            this.editingDelegate.insertCell(this.index, cell.model, {
                kind: SelectionStateType.Handle,
                primary: this.cell.handle,
                selections: [this.cell.handle],
            });
            this.cell.focusMode = CellFocusMode.Editor;
        }
    }
    async redo() {
        if (!this.editingDelegate.deleteCell) {
            throw new Error('Notebook Delete Cell not implemented for Undo/Redo');
        }
        await this.cell.resolveTextModel();
        this.cell.textModel?.applyEdits([{ range: this.inverseRange, text: this.insertContent }]);
        this.editingDelegate.deleteCell(this.index, {
            kind: SelectionStateType.Handle,
            primary: this.cell.handle,
            selections: [this.cell.handle],
        });
        this.cell.focusMode = CellFocusMode.Editor;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbEVkaXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlld01vZGVsL2NlbGxFZGl0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFJTixrQkFBa0IsR0FDbEIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQU92QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFnQnJELE1BQU0sT0FBTyxZQUFZO0lBS3hCLFlBQ1EsUUFBYSxFQUNaLEtBQWEsRUFDYixTQUE0QixFQUM1QixJQUF1QixFQUN2QixVQUF1QixFQUN2QixZQUFtQixFQUNuQixhQUFxQixFQUNyQixXQUE4QixFQUM5QixlQUF5QztRQVIxQyxhQUFRLEdBQVIsUUFBUSxDQUFLO1FBQ1osVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNiLGNBQVMsR0FBVCxTQUFTLENBQW1CO1FBQzVCLFNBQUksR0FBSixJQUFJLENBQW1CO1FBQ3ZCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDdkIsaUJBQVksR0FBWixZQUFZLENBQU87UUFDbkIsa0JBQWEsR0FBYixhQUFhLENBQVE7UUFDckIsZ0JBQVcsR0FBWCxXQUFXLENBQW1CO1FBQzlCLG9CQUFlLEdBQWYsZUFBZSxDQUEwQjtRQWJsRCxTQUFJLHdDQUE2RDtRQUNqRSxVQUFLLEdBQVcsV0FBVyxDQUFBO1FBQzNCLFNBQUksR0FBVyx5QkFBeUIsQ0FBQTtRQWF2QyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFBO0lBQzlDLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSTtRQUNULElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMs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