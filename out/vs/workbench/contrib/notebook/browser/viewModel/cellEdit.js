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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbEVkaXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdNb2RlbC9jZWxsRWRpdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBSU4sa0JBQWtCLEdBQ2xCLE1BQU0sZ0NBQWdDLENBQUE7QUFPdkMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBZ0JyRCxNQUFNLE9BQU8sWUFBWTtJQUt4QixZQUNRLFFBQWEsRUFDWixLQUFhLEVBQ2IsU0FBNEIsRUFDNUIsSUFBdUIsRUFDdkIsVUFBdUIsRUFDdkIsWUFBbUIsRUFDbkIsYUFBcUIsRUFDckIsV0FBOEIsRUFDOUIsZUFBeUM7UUFSMUMsYUFBUSxHQUFSLFFBQVEsQ0FBSztRQUNaLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDYixjQUFTLEdBQVQsU0FBUyxDQUFtQjtRQUM1QixTQUFJLEdBQUosSUFBSSxDQUFtQjtRQUN2QixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ3ZCLGlCQUFZLEdBQVosWUFBWSxDQUFPO1FBQ25CLGtCQUFhLEdBQWIsYUFBYSxDQUFRO1FBQ3JCLGdCQUFXLEdBQVgsV0FBVyxDQUFtQjtRQUM5QixvQkFBZSxHQUFmLGVBQWUsQ0FBMEI7UUFibEQsU0FBSSx3Q0FBNkQ7UUFDakUsVUFBSyxHQUFXLFdBQVcsQ0FBQTtRQUMzQixTQUFJLEdBQVcseUJBQXlCLENBQUE7UUFhdkMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQTtJQUM5QyxDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUk7UUFDVCxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLG1CQUFt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