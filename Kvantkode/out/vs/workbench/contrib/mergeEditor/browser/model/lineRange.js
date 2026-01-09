/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy, numberComparator } from '../../../../../base/common/arrays.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { Range } from '../../../../../editor/common/core/range.js';
export class LineRange {
    static { this.compareByStart = compareBy((l) => l.startLineNumber, numberComparator); }
    static join(ranges) {
        if (ranges.length === 0) {
            return undefined;
        }
        let startLineNumber = Number.MAX_SAFE_INTEGER;
        let endLineNumber = 0;
        for (const range of ranges) {
            startLineNumber = Math.min(startLineNumber, range.startLineNumber);
            endLineNumber = Math.max(endLineNumber, range.startLineNumber + range.lineCount);
        }
        return new LineRange(startLineNumber, endLineNumber - startLineNumber);
    }
    static fromLineNumbers(startLineNumber, endExclusiveLineNumber) {
        return new LineRange(startLineNumber, endExclusiveLineNumber - startLineNumber);
    }
    constructor(startLineNumber, lineCount) {
        this.startLineNumber = startLineNumber;
        this.lineCount = lineCount;
        if (lineCount < 0) {
            throw new BugIndicatingError();
        }
    }
    join(other) {
        return new LineRange(Math.min(this.startLineNumber, other.startLineNumber), Math.max(this.endLineNumberExclusive, other.endLineNumberExclusive) - this.startLineNumber);
    }
    get endLineNumberExclusive() {
        return this.startLineNumber + this.lineCount;
    }
    get isEmpty() {
        return this.lineCount === 0;
    }
    /**
     * Returns false if there is at least one line between `this` and `other`.
     */
    touches(other) {
        return (this.endLineNumberExclusive >= other.startLineNumber &&
            other.endLineNumberExclusive >= this.startLineNumber);
    }
    isAfter(range) {
        return this.startLineNumber >= range.endLineNumberExclusive;
    }
    isBefore(range) {
        return range.startLineNumber >= this.endLineNumberExclusive;
    }
    delta(lineDelta) {
        return new LineRange(this.startLineNumber + lineDelta, this.lineCount);
    }
    toString() {
        return `[${this.startLineNumber},${this.endLineNumberExclusive})`;
    }
    equals(originalRange) {
        return (this.startLineNumber === originalRange.startLineNumber &&
            this.lineCount === originalRange.lineCount);
    }
    contains(lineNumber) {
        return this.startLineNumber <= lineNumber && lineNumber < this.endLineNumberExclusive;
    }
    deltaEnd(delta) {
        return new LineRange(this.startLineNumber, this.lineCount + delta);
    }
    deltaStart(lineDelta) {
        return new LineRange(this.startLineNumber + lineDelta, this.lineCount - lineDelta);
    }
    getLines(model) {
        const result = new Array(this.lineCount);
        for (let i = 0; i < this.lineCount; i++) {
            result[i] = model.getLineContent(this.startLineNumber + i);
        }
        return result;
    }
    containsRange(range) {
        return (this.startLineNumber <= range.startLineNumber &&
            range.endLineNumberExclusive <= this.endLineNumberExclusive);
    }
    toRange() {
        return new Range(this.startLineNumber, 1, this.endLineNumberExclusive, 1);
    }
    toInclusiveRange() {
        if (this.isEmpty) {
            return undefined;
        }
        return new Range(this.startLineNumber, 1, this.endLineNumberExclusive - 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
    }
    toInclusiveRangeOrEmpty() {
        if (this.isEmpty) {
            return new Range(this.startLineNumber, 1, this.startLineNumber, 1);
        }
        return new Range(this.startLineNumber, 1, this.endLineNumberExclusive - 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
    }
    intersects(lineRange) {
        return (this.startLineNumber <= lineRange.endLineNumberExclusive &&
            lineRange.startLineNumber <= this.endLineNumberExclusive);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZVJhbmdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL21vZGVsL2xpbmVSYW5nZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWMsU0FBUyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFekUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBR2xFLE1BQU0sT0FBTyxTQUFTO2FBQ0UsbUJBQWMsR0FBMEIsU0FBUyxDQUN2RSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFDeEIsZ0JBQWdCLENBQ2hCLENBQUE7SUFFTSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQW1CO1FBQ3JDLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN6QixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsSUFBSSxlQUFlLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFBO1FBQzdDLElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQTtRQUNyQixLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQzVCLGVBQWUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7WUFDbEUsYUFBYSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2pGLENBQUM7UUFDRCxPQUFPLElBQUksU0FB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