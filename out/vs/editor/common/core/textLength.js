/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LineRange } from './lineRange.js';
import { Position } from './position.js';
import { Range } from './range.js';
/**
 * Represents a non-negative length of text in terms of line and column count.
 */
export class TextLength {
    static { this.zero = new TextLength(0, 0); }
    static lengthDiffNonNegative(start, end) {
        if (end.isLessThan(start)) {
            return TextLength.zero;
        }
        if (start.lineCount === end.lineCount) {
            return new TextLength(0, end.columnCount - start.columnCount);
        }
        else {
            return new TextLength(end.lineCount - start.lineCount, end.columnCount);
        }
    }
    static betweenPositions(position1, position2) {
        if (position1.lineNumber === position2.lineNumber) {
            return new TextLength(0, position2.column - position1.column);
        }
        else {
            return new TextLength(position2.lineNumber - position1.lineNumber, position2.column - 1);
        }
    }
    static fromPosition(pos) {
        return new TextLength(pos.lineNumber - 1, pos.column - 1);
    }
    static ofRange(range) {
        return TextLength.betweenPositions(range.getStartPosition(), range.getEndPosition());
    }
    static ofText(text) {
        let line = 0;
        let column = 0;
        for (const c of text) {
            if (c === '\n') {
                line++;
                column = 0;
            }
            else {
                column++;
            }
        }
        return new TextLength(line, column);
    }
    constructor(lineCount, columnCount) {
        this.lineCount = lineCount;
        this.columnCount = columnCount;
    }
    isZero() {
        return this.lineCount === 0 && this.columnCount === 0;
    }
    isLessThan(other) {
        if (this.lineCount !== other.lineCount) {
            return this.lineCount < other.lineCount;
        }
        return this.columnCount < other.columnCount;
    }
    isGreaterThan(other) {
        if (this.lineCount !== other.lineCount) {
            return this.lineCount > other.lineCount;
        }
        return this.columnCount > other.columnCount;
    }
    isGreaterThanOrEqualTo(other) {
        if (this.lineCount !== other.lineCount) {
            return this.lineCount > other.lineCount;
        }
        return this.columnCount >= other.columnCount;
    }
    equals(other) {
        return this.lineCount === other.lineCount && this.columnCount === other.columnCount;
    }
    compare(other) {
        if (this.lineCount !== other.lineCount) {
            return this.lineCount - other.lineCount;
        }
        return this.columnCount - other.columnCount;
    }
    add(other) {
        if (other.lineCount === 0) {
            return new TextLength(this.lineCount, this.columnCount + other.columnCount);
        }
        else {
            return new TextLength(this.lineCount + other.lineCount, other.columnCount);
        }
    }
    createRange(startPosition) {
        if (this.lineCount === 0) {
            return new Range(startPosition.lineNumber, startPosition.column, startPosition.lineNumber, startPosition.column + this.columnCount);
        }
        else {
            return new Range(startPosition.lineNumber, startPosition.column, startPosition.lineNumber + this.lineCount, this.columnCount + 1);
        }
    }
    toRange() {
        return new Range(1, 1, this.lineCount + 1, this.columnCount + 1);
    }
    toLineRange() {
        return LineRange.ofLength(1, this.lineCount + 1);
    }
    addToPosition(position) {
        if (this.lineCount === 0) {
            return new Position(position.lineNumber, position.column + this.columnCount);
        }
        else {
            return new Position(position.lineNumber + this.lineCount, this.columnCount + 1);
        }
    }
    addToRange(range) {
        return Range.fromPositions(this.addToPosition(range.getStartPosition()), this.addToPosition(range.getEndPosition()));
    }
    toString() {
        return `${this.lineCount},${this.columnCount}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dExlbmd0aC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29yZS90ZXh0TGVuZ3RoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFbEM7O0dBRUc7QUFDSCxNQUFNLE9BQU8sVUFBVTthQUNSLFNBQUksR0FBRyxJQUFJLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFFbEMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLEtBQWlCLEVBQUUsR0FBZTtRQUNyRSxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMzQixPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUE7UUFDdkIsQ0FBQztRQUNELElBQUksS0FBSyxDQUFDLFNBQVMsS0FBSyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDdkMsT0FBTyxJQUFJLFVBQVUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDOUQsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDeEUsQ0FBQztJQUNGLENBQUM7SUFFTSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsU0FBbUIsRUFBRSxTQUFtQjtRQUN0RSxJQUFJLFNBQVMsQ0FBQyxVQUFVLEtBQUssU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFD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