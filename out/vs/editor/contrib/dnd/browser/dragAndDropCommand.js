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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJhZ0FuZERyb3BDb21tYW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9kbmQvYnJvd3Nlci9kcmFnQW5kRHJvcENvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQVE3RCxNQUFNLE9BQU8sa0JBQWtCO0lBTTlCLFlBQVksU0FBb0IsRUFBRSxjQUF3QixFQUFFLElBQWE7UUFDeEUsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7UUFDMUIsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUE7UUFDcEMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUE7UUFDaEIsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUE7SUFDNUIsQ0FBQztJQUVNLGlCQUFpQixDQUFDLEtBQWlCLEVBQUUsT0FBOEI7UUFDekUsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDbEQsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvQyxDQUFDO1FBQ0QsT0FBTyxDQUFDLGdCQUFnQixDQUN2QixJQUFJLEtBQUssQ0FDUixJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFDOUIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQzFCLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUM5QixJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FDMUIsRUFD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