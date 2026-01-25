/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * A position in the editor.
 */
export class Position {
    constructor(lineNumber, column) {
        this.lineNumber = lineNumber;
        this.column = column;
    }
    /**
     * Create a new position from this position.
     *
     * @param newLineNumber new line number
     * @param newColumn new column
     */
    with(newLineNumber = this.lineNumber, newColumn = this.column) {
        if (newLineNumber === this.lineNumber && newColumn === this.column) {
            return this;
        }
        else {
            return new Position(newLineNumber, newColumn);
        }
    }
    /**
     * Derive a new position from this position.
     *
     * @param deltaLineNumber line number delta
     * @param deltaColumn column delta
     */
    delta(deltaLineNumber = 0, deltaColumn = 0) {
        return this.with(Math.max(1, this.lineNumber + deltaLineNumber), Math.max(1, this.column + deltaColumn));
    }
    /**
     * Test if this position equals other position
     */
    equals(other) {
        return Position.equals(this, other);
    }
    /**
     * Test if position `a` equals position `b`
     */
    static equals(a, b) {
        if (!a && !b) {
            return true;
        }
        return !!a && !!b && a.lineNumber === b.lineNumber && a.column === b.column;
    }
    /**
     * Test if this position is before other position.
     * If the two positions are equal, the result will be false.
     */
    isBefore(other) {
        return Position.isBefore(this, other);
    }
    /**
     * Test if position `a` is before position `b`.
     * If the two positions are equal, the result will be false.
     */
    static isBefore(a, b) {
        if (a.lineNumber < b.lineNumber) {
            return true;
        }
        if (b.lineNumber < a.lineNumber) {
            return false;
        }
        return a.column < b.column;
    }
    /**
     * Test if this position is before other position.
     * If the two positions are equal, the result will be true.
     */
    isBeforeOrEqual(other) {
        return Position.isBeforeOrEqual(this, other);
    }
    /**
     * Test if position `a` is before position `b`.
     * If the two positions are equal, the result will be true.
     */
    static isBeforeOrEqual(a, b) {
        if (a.lineNumber < b.lineNumber) {
            return true;
        }
        if (b.lineNumber < a.lineNumber) {
            return false;
        }
        return a.column <= b.column;
    }
    /**
     * A function that compares positions, useful for sorting
     */
    static compare(a, b) {
        const aLineNumber = a.lineNumber | 0;
        const bLineNumber = b.lineNumber | 0;
        if (aLineNumber === bLineNumber) {
            const aColumn = a.column | 0;
            const bColumn = b.column | 0;
            return aColumn - bColumn;
        }
        return aLineNumber - bLineNumber;
    }
    /**
     * Clone this position.
     */
    clone() {
        return new Position(this.lineNumber, this.column);
    }
    /**
     * Convert to a human-readable representation.
     */
    toString() {
        return '(' + this.lineNumber + ',' + this.column + ')';
    }
    // ---
    /**
     * Create a `Position` from an `IPosition`.
     */
    static lift(pos) {
        return new Position(pos.lineNumber, pos.column);
    }
    /**
     * Test if `obj` is an `IPosition`.
     */
    static isIPosition(obj) {
        return obj && typeof obj.lineNumber === 'number' && typeof obj.column === 'number';
    }
    toJSON() {
        return {
            lineNumber: this.lineNumber,
            column: this.column,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9zaXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29yZS9wb3NpdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQWdCaEc7O0dBRUc7QUFDSCxNQUFNLE9BQU8sUUFBUTtJQVVwQixZQUFZLFVBQWtCLEVBQUUsTUFBYztRQUM3QyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtRQUM1QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtJQUNyQixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxJQUFJLENBQUMsZ0JBQXdCLElBQUksQ0FBQyxVQUFVLEVBQUUsWUFBb0IsSUFBSSxDQUFDLE1BQU07UUFDNUUsSUFBSSxhQUFhLEtBQUssSUFBSSxDQUFDLFVBQVUsSUFBSSxTQUFTLEtBQUssSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BFLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLElBQUksUUFBUSxDQUFDLGFBQWEsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUM5QyxDQUFDO0lBQ0YsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsS0FBSyxDQUFDLGtCQUEwQixDQUFDLEVBQUUsY0FBc0IsQ0FBQztRQUN6RCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQ2YsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFVBQVUsR0FBRyxlQUFlLENBQUMsRUFDOUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsQ0FDdEMsQ0FBQTtJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNJLE1BQU0sQ0FBQyxLQUFnQjtRQUM3QixPQUFPLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFF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