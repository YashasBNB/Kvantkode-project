/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Position } from './position.js';
/**
 * A range in the editor. (startLineNumber,startColumn) is <= (endLineNumber,endColumn)
 */
export class Range {
    constructor(startLineNumber, startColumn, endLineNumber, endColumn) {
        if (startLineNumber > endLineNumber ||
            (startLineNumber === endLineNumber && startColumn > endColumn)) {
            this.startLineNumber = endLineNumber;
            this.startColumn = endColumn;
            this.endLineNumber = startLineNumber;
            this.endColumn = startColumn;
        }
        else {
            this.startLineNumber = startLineNumber;
            this.startColumn = startColumn;
            this.endLineNumber = endLineNumber;
            this.endColumn = endColumn;
        }
    }
    /**
     * Test if this range is empty.
     */
    isEmpty() {
        return Range.isEmpty(this);
    }
    /**
     * Test if `range` is empty.
     */
    static isEmpty(range) {
        return range.startLineNumber === range.endLineNumber && range.startColumn === range.endColumn;
    }
    /**
     * Test if position is in this range. If the position is at the edges, will return true.
     */
    containsPosition(position) {
        return Range.containsPosition(this, position);
    }
    /**
     * Test if `position` is in `range`. If the position is at the edges, will return true.
     */
    static containsPosition(range, position) {
        if (position.lineNumber < range.startLineNumber || position.lineNumber > range.endLineNumber) {
            return false;
        }
        if (position.lineNumber === range.startLineNumber && position.column < range.startColumn) {
            return false;
        }
        if (position.lineNumber === range.endLineNumber && position.column > range.endColumn) {
            return false;
        }
        return true;
    }
    /**
     * Test if `position` is in `range`. If the position is at the edges, will return false.
     * @internal
     */
    static strictContainsPosition(range, position) {
        if (position.lineNumber < range.startLineNumber || position.lineNumber > range.endLineNumber) {
            return false;
        }
        if (position.lineNumber === range.startLineNumber && position.column <= range.startColumn) {
            return false;
        }
        if (position.lineNumber === range.endLineNumber && position.column >= range.endColumn) {
            return false;
        }
        return true;
    }
    /**
     * Test if range is in this range. If the range is equal to this range, will return true.
     */
    containsRange(range) {
        return Range.containsRange(this, range);
    }
    /**
     * Test if `otherRange` is in `range`. If the ranges are equal, will return true.
     */
    static containsRange(range, otherRange) {
        if (otherRange.startLineNumber < range.startLineNumber ||
            otherRange.endLineNumber < range.startLineNumber) {
            return false;
        }
        if (otherRange.startLineNumber > range.endLineNumber ||
            otherRange.endLineNumber > range.endLineNumber) {
            return false;
        }
        if (otherRange.startLineNumber === range.startLineNumber &&
            otherRange.startColumn < range.startColumn) {
            return false;
        }
        if (otherRange.endLineNumber === range.endLineNumber &&
            otherRange.endColumn > range.endColumn) {
            return false;
        }
        return true;
    }
    /**
     * Test if `range` is strictly in this range. `range` must start after and end before this range for the result to be true.
     */
    strictContainsRange(range) {
        return Range.strictContainsRange(this, range);
    }
    /**
     * Test if `otherRange` is strictly in `range` (must start after, and end before). If the ranges are equal, will return false.
     */
    static strictContainsRange(range, otherRange) {
        if (otherRange.startLineNumber < range.startLineNumber ||
            otherRange.endLineNumber < range.startLineNumber) {
            return false;
        }
        if (otherRange.startLineNumber > range.endLineNumber ||
            otherRange.endLineNumber > range.endLineNumber) {
            return false;
        }
        if (otherRange.startLineNumber === range.startLineNumber &&
            otherRange.startColumn <= range.startColumn) {
            return false;
        }
        if (otherRange.endLineNumber === range.endLineNumber &&
            otherRange.endColumn >= range.endColumn) {
            return false;
        }
        return true;
    }
    /**
     * A reunion of the two ranges.
     * The smallest position will be used as the start point, and the largest one as the end point.
     */
    plusRange(range) {
        return Range.plusRange(this, range);
    }
    /**
     * A reunion of the two ranges.
     * The smallest position will be used as the start point, and the largest one as the end point.
     */
    static plusRange(a, b) {
        let startLineNumber;
        let startColumn;
        let endLineNumber;
        let endColumn;
        if (b.startLineNumber < a.startLineNumber) {
            startLineNumber = b.startLineNumber;
            startColumn = b.startColumn;
        }
        else if (b.startLineNumber === a.startLineNumber) {
            startLineNumber = b.startLineNumber;
            startColumn = Math.min(b.startColumn, a.startColumn);
        }
        else {
            startLineNumber = a.startLineNumber;
            startColumn = a.startColumn;
        }
        if (b.endLineNumber > a.endLineNumber) {
            endLineNumber = b.endLineNumber;
            endColumn = b.endColumn;
        }
        else if (b.endLineNumber === a.endLineNumber) {
            endLineNumber = b.endLineNumber;
            endColumn = Math.max(b.endColumn, a.endColumn);
        }
        else {
            endLineNumber = a.endLineNumber;
            endColumn = a.endColumn;
        }
        return new Range(startLineNumber, startColumn, endLineNumber, endColumn);
    }
    /**
     * A intersection of the two ranges.
     */
    intersectRanges(range) {
        return Range.intersectRanges(this, range);
    }
    /**
     * A intersection of the two ranges.
     */
    static intersectRanges(a, b) {
        let resultStartLineNumber = a.startLineNumber;
        let resultStartColumn = a.startColumn;
        let resultEndLineNumber = a.endLineNumber;
        let resultEndColumn = a.endColumn;
        const otherStartLineNumber = b.startLineNumber;
        const otherStartColumn = b.startColumn;
        const otherEndLineNumber = b.endLineNumber;
        const otherEndColumn = b.endColumn;
        if (resultStartLineNumber < otherStartLineNumber) {
            resultStartLineNumber = otherStartLineNumber;
            resultStartColumn = otherStartColumn;
        }
        else if (resultStartLineNumber === otherStartLineNumber) {
            resultStartColumn = Math.max(resultStartColumn, otherStartColumn);
        }
        if (resultEndLineNumber > otherEndLineNumber) {
            resultEndLineNumber = otherEndLineNumber;
            resultEndColumn = otherEndColumn;
        }
        else if (resultEndLineNumber === otherEndLineNumber) {
            resultEndColumn = Math.min(resultEndColumn, otherEndColumn);
        }
        // Check if selection is now empty
        if (resultStartLineNumber > resultEndLineNumber) {
            return null;
        }
        if (resultStartLineNumber === resultEndLineNumber && resultStartColumn > resultEndColumn) {
            return null;
        }
        return new Range(resultStartLineNumber, resultStartColumn, resultEndLineNumber, resultEndColumn);
    }
    /**
     * Test if this range equals other.
     */
    equalsRange(other) {
        return Range.equalsRange(this, other);
    }
    /**
     * Test if range `a` equals `b`.
     */
    static equalsRange(a, b) {
        if (!a && !b) {
            return true;
        }
        return (!!a &&
            !!b &&
            a.startLineNumber === b.startLineNumber &&
            a.startColumn === b.startColumn &&
            a.endLineNumber === b.endLineNumber &&
            a.endColumn === b.endColumn);
    }
    /**
     * Return the end position (which will be after or equal to the start position)
     */
    getEndPosition() {
        return Range.getEndPosition(this);
    }
    /**
     * Return the end position (which will be after or equal to the start position)
     */
    static getEndPosition(range) {
        return new Position(range.endLineNumber, range.endColumn);
    }
    /**
     * Return the start position (which will be before or equal to the end position)
     */
    getStartPosition() {
        return Range.getStartPosition(this);
    }
    /**
     * Return the start position (which will be before or equal to the end position)
     */
    static getStartPosition(range) {
        return new Position(range.startLineNumber, range.startColumn);
    }
    /**
     * Transform to a user presentable string representation.
     */
    toString() {
        return ('[' +
            this.startLineNumber +
            ',' +
            this.startColumn +
            ' -> ' +
            this.endLineNumber +
            ',' +
            this.endColumn +
            ']');
    }
    /**
     * Create a new range using this range's start position, and using endLineNumber and endColumn as the end position.
     */
    setEndPosition(endLineNumber, endColumn) {
        return new Range(this.startLineNumber, this.startColumn, endLineNumber, endColumn);
    }
    /**
     * Create a new range using this range's end position, and using startLineNumber and startColumn as the start position.
     */
    setStartPosition(startLineNumber, startColumn) {
        return new Range(startLineNumber, startColumn, this.endLineNumber, this.endColumn);
    }
    /**
     * Create a new empty range using this range's start position.
     */
    collapseToStart() {
        return Range.collapseToStart(this);
    }
    /**
     * Create a new empty range using this range's start position.
     */
    static collapseToStart(range) {
        return new Range(range.startLineNumber, range.startColumn, range.startLineNumber, range.startColumn);
    }
    /**
     * Create a new empty range using this range's end position.
     */
    collapseToEnd() {
        return Range.collapseToEnd(this);
    }
    /**
     * Create a new empty range using this range's end position.
     */
    static collapseToEnd(range) {
        return new Range(range.endLineNumber, range.endColumn, range.endLineNumber, range.endColumn);
    }
    /**
     * Moves the range by the given amount of lines.
     */
    delta(lineCount) {
        return new Range(this.startLineNumber + lineCount, this.startColumn, this.endLineNumber + lineCount, this.endColumn);
    }
    isSingleLine() {
        return this.startLineNumber === this.endLineNumber;
    }
    // ---
    static fromPositions(start, end = start) {
        return new Range(start.lineNumber, start.column, end.lineNumber, end.column);
    }
    static lift(range) {
        if (!range) {
            return null;
        }
        return new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
    }
    /**
     * Test if `obj` is an `IRange`.
     */
    static isIRange(obj) {
        return (obj &&
            typeof obj.startLineNumber === 'number' &&
            typeof obj.startColumn === 'number' &&
            typeof obj.endLineNumber === 'number' &&
            typeof obj.endColumn === 'number');
    }
    /**
     * Test if the two ranges are touching in any way.
     */
    static areIntersectingOrTouching(a, b) {
        // Check if `a` is before `b`
        if (a.endLineNumber < b.startLineNumber ||
            (a.endLineNumber === b.startLineNumber && a.endColumn < b.startColumn)) {
            return false;
        }
        // Check if `b` is before `a`
        if (b.endLineNumber < a.startLineNumber ||
            (b.endLineNumber === a.startLineNumber && b.endColumn < a.startColumn)) {
            return false;
        }
        // These ranges must intersect
        return true;
    }
    /**
     * Test if the two ranges are intersecting. If the ranges are touching it returns true.
     */
    static areIntersecting(a, b) {
        // Check if `a` is before `b`
        if (a.endLineNumber < b.startLineNumber ||
            (a.endLineNumber === b.startLineNumber && a.endColumn <= b.startColumn)) {
            return false;
        }
        // Check if `b` is before `a`
        if (b.endLineNumber < a.startLineNumber ||
            (b.endLineNumber === a.startLineNumber && b.endColumn <= a.startColumn)) {
            return false;
        }
        // These ranges must intersect
        return true;
    }
    /**
     * Test if the two ranges are intersecting, but not touching at all.
     */
    static areOnlyIntersecting(a, b) {
        // Check if `a` is before `b`
        if (a.endLineNumber < b.startLineNumber - 1 ||
            (a.endLineNumber === b.startLineNumber && a.endColumn < b.startColumn - 1)) {
            return false;
        }
        // Check if `b` is before `a`
        if (b.endLineNumber < a.startLineNumber - 1 ||
            (b.endLineNumber === a.startLineNumber && b.endColumn < a.startColumn - 1)) {
            return false;
        }
        // These ranges must intersect
        return true;
    }
    /**
     * A function that compares ranges, useful for sorting ranges
     * It will first compare ranges on the startPosition and then on the endPosition
     */
    static compareRangesUsingStarts(a, b) {
        if (a && b) {
            const aStartLineNumber = a.startLineNumber | 0;
            const bStartLineNumber = b.startLineNumber | 0;
            if (aStartLineNumber === bStartLineNumber) {
                const aStartColumn = a.startColumn | 0;
                const bStartColumn = b.startColumn | 0;
                if (aStartColumn === bStartColumn) {
                    const aEndLineNumber = a.endLineNumber | 0;
                    const bEndLineNumber = b.endLineNumber | 0;
                    if (aEndLineNumber === bEndLineNumber) {
                        const aEndColumn = a.endColumn | 0;
                        const bEndColumn = b.endColumn | 0;
                        return aEndColumn - bEndColumn;
                    }
                    return aEndLineNumber - bEndLineNumber;
                }
                return aStartColumn - bStartColumn;
            }
            return aStartLineNumber - bStartLineNumber;
        }
        const aExists = a ? 1 : 0;
        const bExists = b ? 1 : 0;
        return aExists - bExists;
    }
    /**
     * A function that compares ranges, useful for sorting ranges
     * It will first compare ranges on the endPosition and then on the startPosition
     */
    static compareRangesUsingEnds(a, b) {
        if (a.endLineNumber === b.endLineNumber) {
            if (a.endColumn === b.endColumn) {
                if (a.startLineNumber === b.startLineNumber) {
                    return a.startColumn - b.startColumn;
                }
                return a.startLineNumber - b.startLineNumber;
            }
            return a.endColumn - b.endColumn;
        }
        return a.endLineNumber - b.endLineNumber;
    }
    /**
     * Test if the range spans multiple lines.
     */
    static spansMultipleLines(range) {
        return range.endLineNumber > range.startLineNumber;
    }
    toJSON() {
        return this;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvcmUvcmFuZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQXdCbkQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sS0FBSztJQWtCakIsWUFDQyxlQUF1QixFQUN2QixXQUFtQixFQUNuQixhQUFxQixFQUNyQixTQUFpQjtRQUVqQixJQUNDLGVBQWUsR0FBRyxhQUFhO1lBQy9CLENBQUMsZUFBZSxLQUFLLGFBQWEsSUFBSSxXQUFXLEdBQUcsU0FBUyxDQUFDLEVBQzdELENBQUM7WUFDRixJQUFJLENBQUMsZUFBZSxHQUFHLGFBQWEsQ0FBQTtZQUNwQyxJQUFJLENBQUMsV0FBVyxHQUFHLFNBQVMsQ0FBQTtZQUM1QixJQUFJLENBQUMsYUFBYSxHQUFHLGVBQWUsQ0FBQTtZQUNwQyxJQUFJLENBQUMsU0FBUyxHQUFHLFdBQVcsQ0FBQTtRQUM3QixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFBO1lBQ3RDLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFBO1lBQzlCLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFBO1lBQ2xDLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO1FBQzNCLENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSSxPQUFPO1FBQ2IsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzNCLENBQUM7SUFFRDs7T0FFRztJQUNJLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBYTtRQUNsQyxPQUFPLEtBQUssQ0FBQyxlQUFlLEtBQUssS0FBSyxDQUFDLGFBQWEsSUFBSSxLQUFLLENBQUMsV0FB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