/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
export class DragAndDropCommand {
    constructor(selection, targetPosition, copy) {
        this.selection = selection;
        this.targetPosition = targetPosition;
        this.copy = copy;
        this.targetSelection = null;
    }
    getEditOperations(model, builder) {
        const text = model.getValueInRange(this.selection);
        if (!this.copy) {
            builder.addEditOperation(this.selection, null);
        }
        builder.addEditOperation(new Range(this.targetPosition.lineNumber, this.targetPosition.column, this.targetPosition.lineNumber, this.targetPosition.column), text);
        if (this.selection.containsPosition(this.targetPosition) &&
            !((this.copy &&
                (this.selection.getEndPosition().equals(this.targetPosition) ||
                    this.selection.getStartPosition().equals(this.targetPosition))) // we allow users to paste content beside the selection
            )) {
            this.targetSelection = this.selection;
            return;
        }
        if (this.copy) {
            this.targetSelection = new Selection(this.targetPosition.lineNumber, this.targetPosition.column, this.selection.endLineNumber -
                this.selection.startLineNumber +
                this.targetPosition.lineNumber, this.selection.startLineNumber === this.selection.endLineNumber
                ? this.targetPosition.column + this.selection.endColumn - this.selection.startColumn
                : this.selection.endColumn);
            return;
        }
        if (this.targetPosition.lineNumber > this.selection.endLineNumber) {
            // Drag the selection downwards
            this.targetSelection = new Selection(this.targetPosition.lineNumber -
                this.selection.endLineNumber +
                this.selection.startLineNumber, this.targetPosition.column, this.targetPosition.lineNumber, this.selection.startLineNumber === this.selection.endLineNumber
                ? this.targetPosition.column + this.selection.endColumn - this.selection.startColumn
                : this.selection.endColumn);
            return;
        }
        if (this.targetPosition.lineNumber < this.selection.endLineNumber) {
            // Drag the selection upwards
            this.targetSelection = new Selection(this.targetPosition.lineNumber, this.targetPosition.column, this.targetPosition.lineNumber +
                this.selection.endLineNumber -
                this.selection.startLineNumber, this.selection.startLineNumber === this.selection.endLineNumber
                ? this.targetPosition.column + this.selection.endColumn - this.selection.startColumn
                : this.selection.endColumn);
            return;
        }
        // The target position is at the same line as the selection's end position.
        if (this.selection.endColumn <= this.targetPosition.column) {
            // The target position is after the selection's end position
            this.targetSelection = new Selection(this.targetPosition.lineNumber -
                this.selection.endLineNumber +
                this.selection.startLineNumber, this.selection.startLineNumber === this.selection.endLineNumber
                ? this.targetPosition.column - this.selection.endColumn + this.selection.startColumn
                : this.targetPosition.column - this.selection.endColumn + this.selection.startColumn, this.targetPosition.lineNumber, this.selection.startLineNumber === this.selection.endLineNumber
                ? this.targetPosition.column
                : this.selection.endColumn);
        }
        else {
            // The target position is before the selection's end position. Since the selection doesn't contain the target position, the selection is one-line and target position is before this selection.
            this.targetSelection = new Selection(this.targetPosition.lineNumber -
                this.selection.endLineNumber +
                this.selection.startLineNumber, this.targetPosition.column, this.targetPosition.lineNumber, this.targetPosition.column + this.selection.endColumn - this.selection.startColumn);
        }
    }
    computeCursorState(model, helper) {
        return this.targetSelection;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJhZ0FuZERyb3BDb21tYW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZG5kL2Jyb3dzZXIvZHJhZ0FuZERyb3BDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFRN0QsTUFBTSxPQUFPLGtCQUFrQjtJQU05QixZQUFZLFNBQW9CLEVBQUUsY0FBd0IsRUFBRSxJQUFhO1FBQ3hFLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO1FBQzFCLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFBO1FBQ3BDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO1FBQ2hCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFBO0lBQzVCLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxLQUFpQixFQUFFLE9BQThCO1FBQ3pFLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2xELElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDL0MsQ0FBQztRQUNELE9BQU8sQ0FBQyxnQkFBZ0IsQ0FDdkIsSUFBSSxLQUFLLENBQ1IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQzlCLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUMxQixJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFDOUIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQzFCLEVBQ0QsSUFB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