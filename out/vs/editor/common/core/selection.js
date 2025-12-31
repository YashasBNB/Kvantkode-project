/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Position } from './position.js';
import { Range } from './range.js';
/**
 * The direction of a selection.
 */
export var SelectionDirection;
(function (SelectionDirection) {
    /**
     * The selection starts above where it ends.
     */
    SelectionDirection[SelectionDirection["LTR"] = 0] = "LTR";
    /**
     * The selection starts below where it ends.
     */
    SelectionDirection[SelectionDirection["RTL"] = 1] = "RTL";
})(SelectionDirection || (SelectionDirection = {}));
/**
 * A selection in the editor.
 * The selection is a range that has an orientation.
 */
export class Selection extends Range {
    constructor(selectionStartLineNumber, selectionStartColumn, positionLineNumber, positionColumn) {
        super(selectionStartLineNumber, selectionStartColumn, positionLineNumber, positionColumn);
        this.selectionStartLineNumber = selectionStartLineNumber;
        this.selectionStartColumn = selectionStartColumn;
        this.positionLineNumber = positionLineNumber;
        this.positionColumn = positionColumn;
    }
    /**
     * Transform to a human-readable representation.
     */
    toString() {
        return ('[' +
            this.selectionStartLineNumber +
            ',' +
            this.selectionStartColumn +
            ' -> ' +
            this.positionLineNumber +
            ',' +
            this.positionColumn +
            ']');
    }
    /**
     * Test if equals other selection.
     */
    equalsSelection(other) {
        return Selection.selectionsEqual(this, other);
    }
    /**
     * Test if the two selections are equal.
     */
    static selectionsEqual(a, b) {
        return (a.selectionStartLineNumber === b.selectionStartLineNumber &&
            a.selectionStartColumn === b.selectionStartColumn &&
            a.positionLineNumber === b.positionLineNumber &&
            a.positionColumn === b.positionColumn);
    }
    /**
     * Get directions (LTR or RTL).
     */
    getDirection() {
        if (this.selectionStartLineNumber === this.startLineNumber &&
            this.selectionStartColumn === this.startColumn) {
            return 0 /* SelectionDirection.LTR */;
        }
        return 1 /* SelectionDirection.RTL */;
    }
    /**
     * Create a new selection with a different `positionLineNumber` and `positionColumn`.
     */
    setEndPosition(endLineNumber, endColumn) {
        if (this.getDirection() === 0 /* SelectionDirection.LTR */) {
            return new Selection(this.startLineNumber, this.startColumn, endLineNumber, endColumn);
        }
        return new Selection(endLineNumber, endColumn, this.startLineNumber, this.startColumn);
    }
    /**
     * Get the position at `positionLineNumber` and `positionColumn`.
     */
    getPosition() {
        return new Position(this.positionLineNumber, this.positionColumn);
    }
    /**
     * Get the position at the start of the selection.
     */
    getSelectionStart() {
        return new Position(this.selectionStartLineNumber, this.selectionStartColumn);
    }
    /**
     * Create a new selection with a different `selectionStartLineNumber` and `selectionStartColumn`.
     */
    setStartPosition(startLineNumber, startColumn) {
        if (this.getDirection() === 0 /* SelectionDirection.LTR */) {
            return new Selection(startLineNumber, startColumn, this.endLineNumber, this.endColumn);
        }
        return new Selection(this.endLineNumber, this.endColumn, startLineNumber, startColumn);
    }
    // ----
    /**
     * Create a `Selection` from one or two positions
     */
    static fromPositions(start, end = start) {
        return new Selection(start.lineNumber, start.column, end.lineNumber, end.column);
    }
    /**
     * Creates a `Selection` from a range, given a direction.
     */
    static fromRange(range, direction) {
        if (direction === 0 /* SelectionDirection.LTR */) {
            return new Selection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
        }
        else {
            return new Selection(range.endLineNumber, range.endColumn, range.startLineNumber, range.startColumn);
        }
    }
    /**
     * Create a `Selection` from an `ISelection`.
     */
    static liftSelection(sel) {
        return new Selection(sel.selectionStartLineNumber, sel.selectionStartColumn, sel.positionLineNumber, sel.positionColumn);
    }
    /**
     * `a` equals `b`.
     */
    static selectionsArrEqual(a, b) {
        if ((a && !b) || (!a && b)) {
            return false;
        }
        if (!a && !b) {
            return true;
        }
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0, len = a.length; i < len; i++) {
            if (!this.selectionsEqual(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }
    /**
     * Test if `obj` is an `ISelection`.
     */
    static isISelection(obj) {
        return (obj &&
            typeof obj.selectionStartLineNumber === 'number' &&
            typeof obj.selectionStartColumn === 'number' &&
            typeof obj.positionLineNumber === 'number' &&
            typeof obj.positionColumn === 'number');
    }
    /**
     * Create with a direction.
     */
    static createWithDirection(startLineNumber, startColumn, endLineNumber, endColumn, direction) {
        if (direction === 0 /* SelectionDirection.LTR */) {
            return new Selection(startLineNumber, startColumn, endLineNumber, endColumn);
        }
        return new Selection(endLineNumber, endColumn, startLineNumber, startColumn);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb3JlL3NlbGVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ25ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUE7QUF5QmxDOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLGtCQVNqQjtBQVRELFdBQWtCLGtCQUFrQjtJQUNuQzs7T0FFRztJQUNILHlEQUFHLENBQUE7SUFDSDs7T0FFRztJQUNILHlEQUFHLENBQUE7QUFDSixDQUFDLEVBVGlCLGtCQUFrQixLQUFsQixrQkFBa0IsUUFTbkM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sU0FBVSxTQUFRLEtBQUs7SUFrQm5DLFlBQ0Msd0JBQWdDLEVBQ2hDLG9CQUE0QixFQUM1QixrQkFBMEIsRUFDMUIsY0FBc0I7UUFFdEIsS0FBSyxDQUFDLHdCQUF3QixFQUFFLG9CQUFvQixFQUFFLGtCQUFrQixFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQ3pGLElBQUksQ0FBQyx3QkFBd0IsR0FBRyx3QkFBd0IsQ0FBQTtRQUN4RCxJQUFJLENBQUMsb0JBQW9CLEdBQUcsb0JBQW9CLENBQUE7UUFDaEQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLGtCQUFrQixDQUFBO1FBQzVDLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFBO0lBQ3JDLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxDQUNOLEdBQUc7WUFDSCxJQUFJLENBQUMsd0JBQXdCO1lBQzdCLEdBQUc7WUFDSCxJQUFJLENBQUMsb0JBQW9CO1lBQ3pCLE1BQU07WUFDTixJQUFJLENBQUMsa0JBQWtCO1lBQ3ZCLEdBQUc7WUFDSCxJ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