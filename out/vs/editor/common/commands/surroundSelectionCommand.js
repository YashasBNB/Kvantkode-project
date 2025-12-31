/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../core/range.js';
import { Selection } from '../core/selection.js';
export class SurroundSelectionCommand {
    constructor(range, charBeforeSelection, charAfterSelection) {
        this._range = range;
        this._charBeforeSelection = charBeforeSelection;
        this._charAfterSelection = charAfterSelection;
    }
    getEditOperations(model, builder) {
        builder.addTrackedEditOperation(new Range(this._range.startLineNumber, this._range.startColumn, this._range.startLineNumber, this._range.startColumn), this._charBeforeSelection);
        builder.addTrackedEditOperation(new Range(this._range.endLineNumber, this._range.endColumn, this._range.endLineNumber, this._range.endColumn), this._charAfterSelection);
    }
    computeCursorState(model, helper) {
        const inverseEditOperations = helper.getInverseEditOperations();
        const firstOperationRange = inverseEditOperations[0].range;
        const secondOperationRange = inverseEditOperations[1].range;
        return new Selection(firstOperationRange.endLineNumber, firstOperationRange.endColumn, secondOperationRange.endLineNumber, secondOperationRange.endColumn - this._charAfterSelection.length);
    }
}
/**
 * A surround selection command that runs after composition finished.
 */
export class CompositionSurroundSelectionCommand {
    constructor(_position, _text, _charAfter) {
        this._position = _position;
        this._text = _text;
        this._charAfter = _charAfter;
    }
    getEditOperations(model, builder) {
        builder.addTrackedEditOperation(new Range(this._position.lineNumber, this._position.column, this._position.lineNumber, this._position.column), this._text + this._charAfter);
    }
    computeCursorState(model, helper) {
        const inverseEditOperations = helper.getInverseEditOperations();
        const opRange = inverseEditOperations[0].range;
        return new Selection(opRange.endLineNumber, opRange.startColumn, opRange.endLineNumber, opRange.endColumn - this._charAfter.length);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3Vycm91bmRTZWxlY3Rpb25Db21tYW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb21tYW5kcy9zdXJyb3VuZFNlbGVjdGlvbkNvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBRXhDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUloRCxNQUFNLE9BQU8sd0JBQXdCO0lBS3BDLFlBQVksS0FBZ0IsRUFBRSxtQkFBMkIsRUFBRSxrQkFBMEI7UUFDcEYsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDbkIsSUFBSSxDQUFDLG9CQUFvQixHQUFHLG1CQUFtQixDQUFBO1FBQy9DLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxrQkFBa0IsQ0FBQTtJQUM5QyxDQUFDO0lBRU0saUJBQWlCLENBQUMsS0FBaUIsRUFBRSxPQUE4QjtRQUN6RSxPQUFPLENBQUMsdUJBQXVCLENBQzlCLElBQUksS0FBSyxDQUNSLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUMzQixJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFDdkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQzNCLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUN2QixFQUNELElBQUksQ0FBQyxvQkFBb0IsQ0FDekIsQ0FBQTtRQUVELE9BQU8sQ0FBQyx1QkFBdUIsQ0FDOUIsSUFBSSxLQUFLLENBQ1IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQ3pCLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUNyQixJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFDekIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQ3JCLEVBQ0QsSUFBSSxDQUFDLG1CQUFtQixDQUN4QixDQUFBO0lBQ0YsQ0FBQztJQUVNLGtCQUFrQixDQUFDLEtBQWlCLEVBQUUsTUFBZ0M7UUFDNUUsTUFBTSxxQkFBcUIsR0FBRyxNQUFNLENBQUMsd0JBQXdCLEVBQUUsQ0FBQTtRQUMvRCxNQUFNLG1CQUFtQixHQUFHLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtRQUMxRCxNQUFNLG9CQUFvQixHQUFHLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtRQUUzRCxPQUFPLElBQUksU0FBUyxDQUNuQixtQkFBbUIsQ0FBQyxhQUFhLEVBQ2pDLG1CQUFtQixDQUFDLFNBQVMsRUFDN0Isb0JBQW9CLENBQUMsYUFBYSxFQUNsQyxvQkFBb0IsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FDaEUsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLG1DQUFtQztJQUMvQyxZQUNrQixTQUFtQixFQUNuQixLQUFhLEVBQ2IsVUFBa0I7UUFGbEIsY0FBUyxHQUFULFNBQVMsQ0FBVTtRQUNuQixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2IsZUFBVSxHQUFWLFVBQVUsQ0FBUTtJQUNqQyxDQUFDO0lBRUcsaUJBQWlCLENBQUMsS0FBaUIsRUFBRSxPQUE4QjtRQUN6RSxPQUFPLENBQUMsdUJBQXVCLENBQzlCLElBQUksS0FBSyxDQUNSLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUN6QixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFDckIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQ3pCLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUNyQixFQUNELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FDNUIsQ0FBQTtJQUNGLENBQUM7SUFFTSxrQkFBa0IsQ0FBQyxLQUFpQixFQUFFLE1BQWdDO1FBQzVFLE1BQU0scUJBQXFCLEdBQUcsTUFBTSxDQUFDLHdCQUF3QixFQUFFLENBQUE7UUFDL0QsTUFBTSxPQUFPLEdBQUcscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO1FBRTlDLE9BQU8sSUFBSSxTQUFTLENBQ25CLE9BQU8sQ0FBQyxhQUFhLEVBQ3JCLE9BQU8sQ0FBQyxXQUFXLEVBQ25CLE9BQU8sQ0FBQyxhQUFhLEVBQ3JCLE9BQU8sQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQzFDLENBQUE7SUFDRixDQUFDO0NBQ0QifQ==