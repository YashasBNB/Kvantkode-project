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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZVJhbmdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci9tb2RlbC9saW5lUmFuZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFjLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXpFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUdsRSxNQUFNLE9BQU8sU0FBUzthQUNFLG1CQUFjLEdBQTBCLFNBQVMsQ0FDdkUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQ3hCLGdCQUFnQixDQUNoQixDQUFBO0lBRU0sTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFtQjtRQUNyQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELElBQUksZUFBZSxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQTtRQUM3QyxJQUFJLGFBQWEsR0FBRyxDQUFDLENBQUE7UUFDckIsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUM1QixlQUFlLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQ2xFLGFBQWEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsZUFBZSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNqRixDQUFDO1FBQ0QsT0FBTyxJQUFJLFNBQVMsQ0FBQyxlQUFlLEVBQUUsYUFBYSxH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