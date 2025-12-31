/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class MoveCellEdit {
    get label() {
        return this.length === 1 ? 'Move Cell' : 'Move Cells';
    }
    constructor(resource, fromIndex, length, toIndex, editingDelegate, beforedSelections, endSelections) {
        this.resource = resource;
        this.fromIndex = fromIndex;
        this.length = length;
        this.toIndex = toIndex;
        this.editingDelegate = editingDelegate;
        this.beforedSelections = beforedSelections;
        this.endSelections = endSelections;
        this.type = 0 /* UndoRedoElementType.Resource */;
        this.code = 'undoredo.textBufferEdit';
    }
    undo() {
        if (!this.editingDelegate.moveCell) {
            throw new Error('Notebook Move Cell not implemented for Undo/Redo');
        }
        this.editingDelegate.moveCell(this.toIndex, this.length, this.fromIndex, this.endSelections, this.beforedSelections);
    }
    redo() {
        if (!this.editingDelegate.moveCell) {
            throw new Error('Notebook Move Cell not implemented for Undo/Redo');
        }
        this.editingDelegate.moveCell(this.fromIndex, this.length, this.toIndex, this.beforedSelections, this.endSelections);
    }
}
export class SpliceCellsEdit {
    get label() {
        // Compute the most appropriate labels
        if (this.diffs.length === 1 && this.diffs[0][1].length === 0) {
            return this.diffs[0][2].length > 1 ? 'Insert Cells' : 'Insert Cell';
        }
        if (this.diffs.length === 1 && this.diffs[0][2].length === 0) {
            return this.diffs[0][1].length > 1 ? 'Delete Cells' : 'Delete Cell';
        }
        // Default to Insert Cell
        return 'Insert Cell';
    }
    constructor(resource, diffs, editingDelegate, beforeHandles, endHandles) {
        this.resource = resource;
        this.diffs = diffs;
        this.editingDelegate = editingDelegate;
        this.beforeHandles = beforeHandles;
        this.endHandles = endHandles;
        this.type = 0 /* UndoRedoElementType.Resource */;
        this.code = 'undoredo.textBufferEdit';
    }
    undo() {
        if (!this.editingDelegate.replaceCell) {
            throw new Error('Notebook Replace Cell not implemented for Undo/Redo');
        }
        this.diffs.forEach((diff) => {
            this.editingDelegate.replaceCell(diff[0], diff[2].length, diff[1], this.beforeHandles);
        });
    }
    redo() {
        if (!this.editingDelegate.replaceCell) {
            throw new Error('Notebook Replace Cell not implemented for Undo/Redo');
        }
        this.diffs.reverse().forEach((diff) => {
            this.editingDelegate.replaceCell(diff[0], diff[1].length, diff[2], this.endHandles);
        });
    }
}
export class CellMetadataEdit {
    constructor(resource, index, oldMetadata, newMetadata, editingDelegate) {
        this.resource = resource;
        this.index = index;
        this.oldMetadata = oldMetadata;
        this.newMetadata = newMetadata;
        this.editingDelegate = editingDelegate;
        this.type = 0 /* UndoRedoElementType.Resource */;
        this.label = 'Update Cell Metadata';
        this.code = 'undoredo.textBufferEdit';
    }
    undo() {
        if (!this.editingDelegate.updateCellMetadata) {
            return;
        }
        this.editingDelegate.updateCellMetadata(this.index, this.oldMetadata);
    }
    redo() {
        if (!this.editingDelegate.updateCellMetadata) {
            return;
        }
        this.editingDelegate.updateCellMetadata(this.index, this.newMetadata);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbEVkaXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9jb21tb24vbW9kZWwvY2VsbEVkaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFnQ2hHLE1BQU0sT0FBTyxZQUFZO0lBRXhCLElBQUksS0FBSztRQUNSLE9BQU8sSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFBO0lBQ3RELENBQUM7SUFHRCxZQUNRLFFBQWEsRUFDWixTQUFpQixFQUNqQixNQUFjLEVBQ2QsT0FBZSxFQUNmLGVBQXlDLEVBQ3pDLGlCQUE4QyxFQUM5QyxhQUEwQztRQU4zQyxhQUFRLEdBQVIsUUFBUSxDQUFLO1FBQ1osY0FBUyxHQUFULFNBQVMsQ0FBUTtRQUNqQixXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQ2QsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQUNmLG9CQUFlLEdBQWYsZUFBZSxDQUEwQjtRQUN6QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQTZCO1FBQzlDLGtCQUFhLEdBQWIsYUFBYSxDQUE2QjtRQWJuRCxTQUFJLHdDQUE2RDtRQUlqRSxTQUFJLEdBQVcseUJBQXlCLENBQUE7SUFVckMsQ0FBQztJQUVKLElBQUk7UUFDSCxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNwQyxNQUFNLElBQUksS0FBSyxDQUFDLGtEQUFrRCxDQUFDLENBQUE7UUFDcEUsQ0FBQztRQUVELElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUM1QixJQUFJLENBQUMsT0FBTyxFQUNaLElBQUksQ0FBQyxNQUFNLEVBQ1gsSUFBSSxDQUFDLFNBQVMsRUFDZCxJQUFJLENBQUMsYUFBYSxFQUNsQixJQUFJLENBQUMs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