/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
export class MoveCaretCommand {
    constructor(selection, isMovingLeft) {
        this._selection = selection;
        this._isMovingLeft = isMovingLeft;
    }
    getEditOperations(model, builder) {
        if (this._selection.startLineNumber !== this._selection.endLineNumber ||
            this._selection.isEmpty()) {
            return;
        }
        const lineNumber = this._selection.startLineNumber;
        const startColumn = this._selection.startColumn;
        const endColumn = this._selection.endColumn;
        if (this._isMovingLeft && startColumn === 1) {
            return;
        }
        if (!this._isMovingLeft && endColumn === model.getLineMaxColumn(lineNumber)) {
            return;
        }
        if (this._isMovingLeft) {
            const rangeBefore = new Range(lineNumber, startColumn - 1, lineNumber, startColumn);
            const charBefore = model.getValueInRange(rangeBefore);
            builder.addEditOperation(rangeBefore, null);
            builder.addEditOperation(new Range(lineNumber, endColumn, lineNumber, endColumn), charBefore);
        }
        else {
            const rangeAfter = new Range(lineNumber, endColumn, lineNumber, endColumn + 1);
            const charAfter = model.getValueInRange(rangeAfter);
            builder.addEditOperation(rangeAfter, null);
            builder.addEditOperation(new Range(lineNumber, startColumn, lineNumber, startColumn), charAfter);
        }
    }
    computeCursorState(model, helper) {
        if (this._isMovingLeft) {
            return new Selection(this._selection.startLineNumber, this._selection.startColumn - 1, this._selection.endLineNumber, this._selection.endColumn - 1);
        }
        else {
            return new Selection(this._selection.startLineNumber, this._selection.startColumn + 1, this._selection.endLineNumber, this._selection.endColumn + 1);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW92ZUNhcmV0Q29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NhcmV0T3BlcmF0aW9ucy9icm93c2VyL21vdmVDYXJldENvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQVE3RCxNQUFNLE9BQU8sZ0JBQWdCO0lBSTVCLFlBQVksU0FBb0IsRUFBRSxZQUFxQjtRQUN0RCxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTtRQUMzQixJQUFJLENBQUMsYUFBYSxHQUFHLFlBQVksQ0FBQTtJQUNsQyxDQUFDO0lBRU0saUJBQWlCLENBQUMsS0FBaUIsRUFBRSxPQUE4QjtRQUN6RSxJQUNDLElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxLQUFLLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYTtZQUNqRSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUN4QixDQUFDO1lBQ0YsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQTtRQUNsRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQTtRQUMvQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQTtRQUMzQyxJQUFJLElBQUksQ0FBQyxhQUFhLElBQUksV0FBVyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzdDLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLElBQUksU0FBUyxLQUFLLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQzdFLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsTUFBTSxXQUFXLEdBQUcsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLFdBQVcsR0FBRyxDQUFDLEVBQUUsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQ25GLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDckQsT0FBTyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUMzQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDOUYsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLFVBQVUsR0FBRyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDOUUsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUNuRCxPQUFPLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FDdkIsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsV0FBVyxDQUFDLEVBQzNELFNBQVMsQ0FDVCxDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTSxrQkFBa0IsQ0FBQyxLQUFpQixFQUFFLE1BQWdDO1FBQzVFLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sSUFBSSxTQUFTLENBQ25CLElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxFQUMvQixJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsR0FBRyxDQUFDLEVBQy9CLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUM3QixJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQzdCLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sSUFBSSxTQUFTLENBQ25CLElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxFQUMvQixJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsR0FBRyxDQUFDLEVBQy9CLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUM3QixJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQzdCLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=