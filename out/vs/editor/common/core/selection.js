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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvcmUvc2VsZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDbkQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLFlBQVksQ0FBQTtBQXlCbEM7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0Isa0JBU2pCO0FBVEQsV0FBa0Isa0JBQWtCO0lBQ25DOztPQUVHO0lBQ0gseURBQUcsQ0FBQTtJQUNIOztPQUVHO0lBQ0gseURBQUcsQ0FBQTtBQUNKLENBQUMsRUFUaUIsa0JBQWtCLEtBQWxCLGtCQUFrQixRQVNuQztBQUVEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxTQUFVLFNBQVEsS0FBSztJQWtCbkMsWUFDQyx3QkFBZ0MsRUFDaEMsb0JBQTRCLEVBQzVCLGtCQUEwQixFQUMxQixjQUFzQjtRQUV0QixLQUFLLENBQUMsd0JBQXdCLEVBQUUsb0JBQW9CLEVBQUUsa0JBQWtCLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDekYsSUFBSSxDQUFDLHdCQUF3QixHQUFHLHdCQUF3QixDQUFBO1FBQ3hELElBQUksQ0FBQyxvQkFBb0IsR0FBRyxvQkFBb0IsQ0FBQTtRQUNoRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsa0JBQWtCLENBQUE7UUFDNUMsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUE7SUFDckMsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLENBQ04sR0FBRztZQUNILElBQUksQ0FBQyx3QkFBd0I7WUFDN0IsR0FBRztZQUNILElBQUksQ0FBQyxvQkFBb0I7WUFDekIsTUFBTTtZQUNOLElBQUksQ0FBQyxrQkFBa0I7WUFDdkIsR0FBRztZQUNILElBQUksQ0FBQyxjQUFjO1lBQ25CLEdBQUcsQ0FDSCxDQUFBO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ksZUFBZSxDQUFDLEtBQWlCO1FBQ3ZDLE9BQU8sU0FBUyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDOUMsQ0FBQztJQUVEOztPQUVHO0lBQ0ksTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFhLEVBQUUsQ0FBYTtRQUN6RCxPQUFPLENBQ04sQ0FBQyxDQUFDLHdCQUF3QixLQUFLLENBQUMsQ0FBQyx3QkFBd0I7WUFDekQsQ0FBQyxDQUFDLG9CQUFvQixLQUFLLENBQUMsQ0FBQyxvQkFBb0I7WUFDakQsQ0FBQyxDQUFDLGtCQUFrQixLQUFLLENBQUMsQ0FBQyxrQkFBa0I7WUFDN0MsQ0FBQyxDQUFDLGNBQWMsS0FBSyxDQUFDLENBQUMsY0FBYyxDQUNyQyxDQUFBO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ksWUFBWTtRQUNsQixJQUNDLElBQUksQ0FBQyx3QkFBd0IsS0FBSyxJQUFJLENBQUMsZUFBZTtZQUN0RCxJQUFJLENBQUMsb0JBQW9CLEtBQUssSUFBSSxDQUFDLFdBQVcsRUFDN0MsQ0FBQztZQUNGLHNDQUE2QjtRQUM5QixDQUFDO1FBQ0Qsc0NBQTZCO0lBQzlCLENBQUM7SUFFRDs7T0FFRztJQUNhLGNBQWMsQ0FBQyxhQUFxQixFQUFFLFNBQWlCO1FBQ3RFLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxtQ0FBMkIsRUFBRSxDQUFDO1lBQ3BELE9BQU8sSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLGFBQWEsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUN2RixDQUFDO1FBQ0QsT0FBTyxJQUFJLFNBQVMsQ0FBQyxhQUFhLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQ3ZGLENBQUM7SUFFRDs7T0FFRztJQUNJLFdBQVc7UUFDakIsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFBO0lBQ2xFLENBQUM7SUFFRDs7T0FFRztJQUNJLGlCQUFpQjtRQUN2QixPQUFPLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtJQUM5RSxDQUFDO0lBRUQ7O09BRUc7SUFDYSxnQkFBZ0IsQ0FBQyxlQUF1QixFQUFFLFdBQW1CO1FBQzVFLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxtQ0FBMkIsRUFBRSxDQUFDO1lBQ3BELE9BQU8sSUFBSSxTQUFTLENBQUMsZUFBZSxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN2RixDQUFDO1FBQ0QsT0FBTyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsZUFBZSxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQ3ZGLENBQUM7SUFFRCxPQUFPO0lBRVA7O09BRUc7SUFDSSxNQUFNLENBQVUsYUFBYSxDQUFDLEtBQWdCLEVBQUUsTUFBaUIsS0FBSztRQUM1RSxPQUFPLElBQUksU0FBUyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNqRixDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQUMsU0FBUyxDQUFDLEtBQVksRUFBRSxTQUE2QjtRQUNsRSxJQUFJLFNBQVMsbUNBQTJCLEVBQUUsQ0FBQztZQUMxQyxPQUFPLElBQUksU0FBUyxDQUNuQixLQUFLLENBQUMsZUFBZSxFQUNyQixLQUFLLENBQUMsV0FBVyxFQUNqQixLQUFLLENBQUMsYUFBYSxFQUNuQixLQUFLLENBQUMsU0FBUyxDQUNmLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sSUFBSSxTQUFTLENBQ25CLEtBQUssQ0FBQyxhQUFhLEVBQ25CLEtBQUssQ0FBQyxTQUFTLEVBQ2YsS0FBSyxDQUFDLGVBQWUsRUFDckIsS0FBSyxDQUFDLFdBQVcsQ0FDakIsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQUMsYUFBYSxDQUFDLEdBQWU7UUFDMUMsT0FBTyxJQUFJLFNBQVMsQ0FDbkIsR0FBRyxDQUFDLHdCQUF3QixFQUM1QixHQUFHLENBQUMsb0JBQW9CLEVBQ3hCLEdBQUcsQ0FBQyxrQkFBa0IsRUFDdEIsR0FBRyxDQUFDLGNBQWMsQ0FDbEIsQ0FBQTtJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNJLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFlLEVBQUUsQ0FBZTtRQUNoRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzVCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNkLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDM0IsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzlDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN2QyxPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQVE7UUFDbEMsT0FBTyxDQUNOLEdBQUc7WUFDSCxPQUFPLEdBQUcsQ0FBQyx3QkFBd0IsS0FBSyxRQUFRO1lBQ2hELE9BQU8sR0FBRyxDQUFDLG9CQUFvQixLQUFLLFFBQVE7WUFDNUMsT0FBTyxHQUFHLENBQUMsa0JBQWtCLEtBQUssUUFBUTtZQUMxQyxPQUFPLEdBQUcsQ0FBQyxjQUFjLEtBQUssUUFBUSxDQUN0QyxDQUFBO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ksTUFBTSxDQUFDLG1CQUFtQixDQUNoQyxlQUF1QixFQUN2QixXQUFtQixFQUNuQixhQUFxQixFQUNyQixTQUFpQixFQUNqQixTQUE2QjtRQUU3QixJQUFJLFNBQVMsbUNBQTJCLEVBQUUsQ0FBQztZQUMxQyxPQUFPLElBQUksU0FBUyxDQUFDLGVBQWUsRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzdFLENBQUM7UUFFRCxPQUFPLElBQUksU0FBUyxDQUFDLGFBQWEsRUFBRSxTQUFTLEVBQUUsZUFBZSxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQzdFLENBQUM7Q0FDRCJ9