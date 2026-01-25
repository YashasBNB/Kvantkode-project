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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dExlbmd0aC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb3JlL3RleHRMZW5ndGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDeEMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUVsQzs7R0FFRztBQUNILE1BQU0sT0FBTyxVQUFVO2FBQ1IsU0FBSSxHQUFHLElBQUksVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUVsQyxNQUFNLENBQUMscUJBQXFCLENBQUMsS0FBaUIsRUFBRSxHQUFlO1FBQ3JFLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzNCLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQTtRQUN2QixDQUFDO1FBQ0QsSUFBSSxLQUFLLENBQUMsU0FBUyxLQUFLLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN2QyxPQUFPLElBQUksVUFBVSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM5RCxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUN4RSxDQUFDO0lBQ0YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFtQixFQUFFLFNBQW1CO1FBQ3RFLElBQUksU0FBUyxDQUFDLFVBQVUsS0FBSyxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDbkQsT0FBTyxJQUFJLFVBQVUsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDOUQsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLElBQUksVUFBVSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3pGLENBQUM7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLFlBQVksQ0FBQyxHQUFhO1FBQ3ZDLE9BQU8sSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0lBRU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFZO1FBQ2pDLE9BQU8sVUFBVSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFBO0lBQ3JGLENBQUM7SUFFTSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQVk7UUFDaEMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFBO1FBQ1osSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFBO1FBQ2QsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDaEIsSUFBSSxFQUFFLENBQUE7Z0JBQ04sTUFBTSxHQUFHLENBQUMsQ0FBQTtZQUNYLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLEVBQUUsQ0FBQTtZQUNULENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVELFlBQ2lCLFNBQWlCLEVBQ2pCLFdBQW1CO1FBRG5CLGNBQVMsR0FBVCxTQUFTLENBQVE7UUFDakIsZ0JBQVcsR0FBWCxXQUFXLENBQVE7SUFDakMsQ0FBQztJQUVHLE1BQU07UUFDWixPQUFPLElBQUksQ0FBQyxTQUFTLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxXQUFXLEtBQUssQ0FBQyxDQUFBO0lBQ3RELENBQUM7SUFFTSxVQUFVLENBQUMsS0FBaUI7UUFDbEMsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN4QyxPQUFPLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQTtRQUN4QyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUE7SUFDNUMsQ0FBQztJQUVNLGFBQWEsQ0FBQyxLQUFpQjtRQUNyQyxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3hDLE9BQU8sSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFBO1FBQ3hDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQTtJQUM1QyxDQUFDO0lBRU0sc0JBQXNCLENBQUMsS0FBaUI7UUFDOUMsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN4QyxPQUFPLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQTtRQUN4QyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsV0FBVyxJQUFJLEtBQUssQ0FBQyxXQUFXLENBQUE7SUFDN0MsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUFpQjtRQUM5QixPQUFPLElBQUksQ0FBQyxTQUFTLEtBQUssS0FBSyxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxLQUFLLEtBQUssQ0FBQyxXQUFXLENBQUE7SUFDcEYsQ0FBQztJQUVNLE9BQU8sQ0FBQyxLQUFpQjtRQUMvQixJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3hDLE9BQU8sSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFBO1FBQ3hDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQTtJQUM1QyxDQUFDO0lBRU0sR0FBRyxDQUFDLEtBQWlCO1FBQzNCLElBQUksS0FBSyxDQUFDLFNBQVMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMzQixPQUFPLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDNUUsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDM0UsQ0FBQztJQUNGLENBQUM7SUFFTSxXQUFXLENBQUMsYUFBdUI7UUFDekMsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzFCLE9BQU8sSUFBSSxLQUFLLENBQ2YsYUFBYSxDQUFDLFVBQVUsRUFDeEIsYUFBYSxDQUFDLE1BQU0sRUFDcEIsYUFBYSxDQUFDLFVBQVUsRUFDeEIsYUFBYSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUN2QyxDQUFBO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLElBQUksS0FBSyxDQUNmLGFBQWEsQ0FBQyxVQUFVLEVBQ3hCLGFBQWEsQ0FBQyxNQUFNLEVBQ3BCLGFBQWEsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFDekMsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQ3BCLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVNLE9BQU87UUFDYixPQUFPLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNqRSxDQUFDO0lBRU0sV0FBVztRQUNqQixPQUFPLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDakQsQ0FBQztJQUVNLGFBQWEsQ0FBQyxRQUFrQjtRQUN0QyxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDMUIsT0FBTyxJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQzdFLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNoRixDQUFDO0lBQ0YsQ0FBQztJQUVNLFVBQVUsQ0FBQyxLQUFZO1FBQzdCLE9BQU8sS0FBSyxDQUFDLGFBQWEsQ0FDekIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxFQUM1QyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUMxQyxDQUFBO0lBQ0YsQ0FBQztJQUVELFFBQVE7UUFDUCxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7SUFDL0MsQ0FBQyJ9