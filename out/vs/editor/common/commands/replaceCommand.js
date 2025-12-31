/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { Selection } from '../core/selection.js';
export class ReplaceCommand {
    constructor(range, text, insertsAutoWhitespace = false) {
        this._range = range;
        this._text = text;
        this.insertsAutoWhitespace = insertsAutoWhitespace;
    }
    getEditOperations(model, builder) {
        builder.addTrackedEditOperation(this._range, this._text);
    }
    computeCursorState(model, helper) {
        const inverseEditOperations = helper.getInverseEditOperations();
        const srcRange = inverseEditOperations[0].range;
        return Selection.fromPositions(srcRange.getEndPosition());
    }
}
export class ReplaceOvertypeCommand {
    constructor(range, text, insertsAutoWhitespace = false) {
        this._range = range;
        this._text = text;
        this.insertsAutoWhitespace = insertsAutoWhitespace;
    }
    getEditOperations(model, builder) {
        const intialStartPosition = this._range.getStartPosition();
        const initialEndPosition = this._range.getEndPosition();
        const initialEndLineNumber = initialEndPosition.lineNumber;
        const offsetDelta = this._text.length + (this._range.isEmpty() ? 0 : -1);
        let endPosition = addPositiveOffsetToModelPosition(model, initialEndPosition, offsetDelta);
        if (endPosition.lineNumber > initialEndLineNumber) {
            endPosition = new Position(initialEndLineNumber, model.getLineMaxColumn(initialEndLineNumber));
        }
        const replaceRange = Range.fromPositions(intialStartPosition, endPosition);
        builder.addTrackedEditOperation(replaceRange, this._text);
    }
    computeCursorState(model, helper) {
        const inverseEditOperations = helper.getInverseEditOperations();
        const srcRange = inverseEditOperations[0].range;
        return Selection.fromPositions(srcRange.getEndPosition());
    }
}
export class ReplaceCommandThatSelectsText {
    constructor(range, text) {
        this._range = range;
        this._text = text;
    }
    getEditOperations(model, builder) {
        builder.addTrackedEditOperation(this._range, this._text);
    }
    computeCursorState(model, helper) {
        const inverseEditOperations = helper.getInverseEditOperations();
        const srcRange = inverseEditOperations[0].range;
        return Selection.fromRange(srcRange, 0 /* SelectionDirection.LTR */);
    }
}
export class ReplaceCommandWithoutChangingPosition {
    constructor(range, text, insertsAutoWhitespace = false) {
        this._range = range;
        this._text = text;
        this.insertsAutoWhitespace = insertsAutoWhitespace;
    }
    getEditOperations(model, builder) {
        builder.addTrackedEditOperation(this._range, this._text);
    }
    computeCursorState(model, helper) {
        const inverseEditOperations = helper.getInverseEditOperations();
        const srcRange = inverseEditOperations[0].range;
        return Selection.fromPositions(srcRange.getStartPosition());
    }
}
export class ReplaceCommandWithOffsetCursorState {
    constructor(range, text, lineNumberDeltaOffset, columnDeltaOffset, insertsAutoWhitespace = false) {
        this._range = range;
        this._text = text;
        this._columnDeltaOffset = columnDeltaOffset;
        this._lineNumberDeltaOffset = lineNumberDeltaOffset;
        this.insertsAutoWhitespace = insertsAutoWhitespace;
    }
    getEditOperations(model, builder) {
        builder.addTrackedEditOperation(this._range, this._text);
    }
    computeCursorState(model, helper) {
        const inverseEditOperations = helper.getInverseEditOperations();
        const srcRange = inverseEditOperations[0].range;
        return Selection.fromPositions(srcRange.getEndPosition().delta(this._lineNumberDeltaOffset, this._columnDeltaOffset));
    }
}
export class ReplaceOvertypeCommandOnCompositionEnd {
    constructor(range) {
        this._range = range;
    }
    getEditOperations(model, builder) {
        const text = model.getValueInRange(this._range);
        const initialEndPosition = this._range.getEndPosition();
        const initialEndLineNumber = initialEndPosition.lineNumber;
        let endPosition = addPositiveOffsetToModelPosition(model, initialEndPosition, text.length);
        if (endPosition.lineNumber > initialEndLineNumber) {
            endPosition = new Position(initialEndLineNumber, model.getLineMaxColumn(initialEndLineNumber));
        }
        const replaceRange = Range.fromPositions(initialEndPosition, endPosition);
        builder.addTrackedEditOperation(replaceRange, '');
    }
    computeCursorState(model, helper) {
        const inverseEditOperations = helper.getInverseEditOperations();
        const srcRange = inverseEditOperations[0].range;
        return Selection.fromPositions(srcRange.getEndPosition());
    }
}
export class ReplaceCommandThatPreservesSelection {
    constructor(editRange, text, initialSelection, forceMoveMarkers = false) {
        this._range = editRange;
        this._text = text;
        this._initialSelection = initialSelection;
        this._forceMoveMarkers = forceMoveMarkers;
        this._selectionId = null;
    }
    getEditOperations(model, builder) {
        builder.addTrackedEditOperation(this._range, this._text, this._forceMoveMarkers);
        this._selectionId = builder.trackSelection(this._initialSelection);
    }
    computeCursorState(model, helper) {
        return helper.getTrackedSelection(this._selectionId);
    }
}
function addPositiveOffsetToModelPosition(model, position, offset) {
    if (offset < 0) {
        throw new Error('Unexpected negative delta');
    }
    const lineCount = model.getLineCount();
    let endPosition = new Position(lineCount, model.getLineMaxColumn(lineCount));
    for (let lineNumber = position.lineNumber; lineNumber <= lineCount; lineNumber++) {
        if (lineNumber === position.lineNumber) {
            const futureOffset = offset - model.getLineMaxColumn(position.lineNumber) + position.column;
            if (futureOffset <= 0) {
                endPosition = new Position(position.lineNumber, position.column + offset);
                break;
            }
            offset = futureOffset;
        }
        else {
            const futureOffset = offset - model.getLineMaxColumn(lineNumber);
            if (futureOffset <= 0) {
                endPosition = new Position(lineNumber, offset);
                break;
            }
            offset = futureOffset;
        }
    }
    return endPosition;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZUNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvbW1hbmRzL3JlcGxhY2VDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDeEMsT0FBTyxFQUFFLFNBQVMsRUFBc0IsTUFBTSxzQkFBc0IsQ0FBQTtBQUlwRSxNQUFNLE9BQU8sY0FBYztJQUsxQixZQUFZLEtBQVksRUFBRSxJQUFZLEVBQUUsd0JBQWlDLEtBQUs7UUFDN0UsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDbkIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFDakIsSUFBSSxDQUFDLHFCQUFxQixHQUFHLHFCQUFxQixDQUFBO0lBQ25ELENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxLQUFpQixFQUFFLE9BQThCO1FBQ3pFLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN6RCxDQUFDO0lBRU0sa0JBQWtCLENBQUMsS0FBaUIsRUFBRSxNQUFnQztRQUM1RSxNQUFNLHFCQUFxQixHQUFHLE1BQU0sQ0FBQyx3QkFBd0IsRUFBRSxDQUFBO1FBQy9ELE1BQU0sUUFBUSxHQUFHLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtRQUMvQyxPQUFPLFNBQVMsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUE7SUFDMUQsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHNCQUFzQjtJQUtsQyxZQUFZLEtBQVksRUFBRSxJQUFZLEVB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