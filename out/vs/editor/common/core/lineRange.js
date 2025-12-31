/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from '../../../base/common/errors.js';
import { OffsetRange } from './offsetRange.js';
import { Range } from './range.js';
import { findFirstIdxMonotonousOrArrLen, findLastIdxMonotonous, findLastMonotonous, } from '../../../base/common/arraysFind.js';
/**
 * A range of lines (1-based).
 */
export class LineRange {
    static fromRange(range) {
        return new LineRange(range.startLineNumber, range.endLineNumber);
    }
    static fromRangeInclusive(range) {
        return new LineRange(range.startLineNumber, range.endLineNumber + 1);
    }
    static subtract(a, b) {
        if (!b) {
            return [a];
        }
        if (a.startLineNumber < b.startLineNumber &&
            b.endLineNumberExclusive < a.endLineNumberExclusive) {
            return [
                new LineRange(a.startLineNumber, b.startLineNumber),
                new LineRange(b.endLineNumberExclusive, a.endLineNumberExclusive),
            ];
        }
        else if (b.startLineNumber <= a.startLineNumber &&
            a.endLineNumberExclusive <= b.endLineNumberExclusive) {
            return [];
        }
        else if (b.endLineNumberExclusive < a.endLineNumberExclusive) {
            return [
                new LineRange(Math.max(b.endLineNumberExclusive, a.startLineNumber), a.endLineNumberExclusive),
            ];
        }
        else {
            return [
                new LineRange(a.startLineNumber, Math.min(b.startLineNumber, a.endLineNumberExclusive)),
            ];
        }
    }
    /**
     * @param lineRanges An array of sorted line ranges.
     */
    static joinMany(lineRanges) {
        if (lineRanges.length === 0) {
            return [];
        }
        let result = new LineRangeSet(lineRanges[0].slice());
        for (let i = 1; i < lineRanges.length; i++) {
            result = result.getUnion(new LineRangeSet(lineRanges[i].slice()));
        }
        return result.ranges;
    }
    static join(lineRanges) {
        if (lineRanges.length === 0) {
            throw new BugIndicatingError('lineRanges cannot be empty');
        }
        let startLineNumber = lineRanges[0].startLineNumber;
        let endLineNumberExclusive = lineRanges[0].endLineNumberExclusive;
        for (let i = 1; i < lineRanges.length; i++) {
            startLineNumber = Math.min(startLineNumber, lineRanges[i].startLineNumber);
            endLineNumberExclusive = Math.max(endLineNumberExclusive, lineRanges[i].endLineNumberExclusive);
        }
        return new LineRange(startLineNumber, endLineNumberExclusive);
    }
    static ofLength(startLineNumber, length) {
        return new LineRange(startLineNumber, startLineNumber + length);
    }
    /**
     * @internal
     */
    static deserialize(lineRange) {
        return new LineRange(lineRange[0], lineRange[1]);
    }
    constructor(startLineNumber, endLineNumberExclusive) {
        if (startLineNumber > endLineNumberExclusive) {
            throw new BugIndicatingError(`startLineNumber ${startLineNumber} cannot be after endLineNumberExclusive ${endLineNumberExclusive}`);
        }
        this.startLineNumber = startLineNumber;
        this.endLineNumberExclusive = endLineNumberExclusive;
    }
    /**
     * Indicates if this line range contains the given line number.
     */
    contains(lineNumber) {
        return this.startLineNumber <= lineNumber && lineNumber < this.endLineNumberExclusive;
    }
    /**
     * Indicates if this line range is empty.
     */
    get isEmpty() {
        return this.startLineNumber === this.endLineNumberExclusive;
    }
    /**
     * Moves this line range by the given offset of line numbers.
     */
    delta(offset) {
        return new LineRange(this.startLineNumber + offset, this.endLineNumberExclusive + offset);
    }
    deltaLength(offset) {
        return new LineRange(this.startLineNumber, this.endLineNumberExclusive + offset);
    }
    /**
     * The number of lines this line range spans.
     */
    get length() {
        return this.endLineNumberExclusive - this.startLineNumber;
    }
    /**
     * Creates a line range that combines this and the given line range.
     */
    join(other) {
        return new LineRange(Math.min(this.startLineNumber, other.startLineNumber), Math.max(this.endLineNumberExclusive, other.endLineNumberExclusive));
    }
    toString() {
        return `[${this.startLineNumber},${this.endLineNumberExclusive})`;
    }
    /**
     * The resulting range is empty if the ranges do not intersect, but touch.
     * If the ranges don't even touch, the result is undefined.
     */
    intersect(other) {
        const startLineNumber = Math.max(this.startLineNumber, other.startLineNumber);
        const endLineNumberExclusive = Math.min(this.endLineNumberExclusive, other.endLineNumberExclusive);
        if (startLineNumber <= endLineNumberExclusive) {
            return new LineRange(startLineNumber, endLineNumberExclusive);
        }
        return undefined;
    }
    intersectsStrict(other) {
        return (this.startLineNumber < other.endLineNumberExclusive &&
            other.startLineNumber < this.endLineNumberExclusive);
    }
    overlapOrTouch(other) {
        return (this.startLineNumber <= other.endLineNumberExclusive &&
            other.startLineNumber <= this.endLineNumberExclusive);
    }
    equals(b) {
        return (this.startLineNumber === b.startLineNumber &&
            this.endLineNumberExclusive === b.endLineNumberExclusive);
    }
    toInclusiveRange() {
        if (this.isEmpty) {
            return null;
        }
        return new Range(this.startLineNumber, 1, this.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER);
    }
    /**
     * @deprecated Using this function is discouraged because it might lead to bugs: The end position is not guaranteed to be a valid position!
     */
    toExclusiveRange() {
        return new Range(this.startLineNumber, 1, this.endLineNumberExclusive, 1);
    }
    mapToLineArray(f) {
        const result = [];
        for (let lineNumber = this.startLineNumber; lineNumber < this.endLineNumberExclusive; lineNumber++) {
            result.push(f(lineNumber));
        }
        return result;
    }
    forEach(f) {
        for (let lineNumber = this.startLineNumber; lineNumber < this.endLineNumberExclusive; lineNumber++) {
            f(lineNumber);
        }
    }
    /**
     * @internal
     */
    serialize() {
        return [this.startLineNumber, this.endLineNumberExclusive];
    }
    includes(lineNumber) {
        return this.startLineNumber <= lineNumber && lineNumber < this.endLineNumberExclusive;
    }
    /**
     * Converts this 1-based line range to a 0-based offset range (subtracts 1!).
     * @internal
     */
    toOffsetRange() {
        return new OffsetRange(this.startLineNumber - 1, this.endLineNumberExclusive - 1);
    }
    distanceToRange(other) {
        if (this.endLineNumberExclusive <= other.startLineNumber) {
            return other.startLineNumber - this.endLineNumberExclusive;
        }
        if (other.endLineNumberExclusive <= this.startLineNumber) {
            return this.startLineNumber - other.endLineNumberExclusive;
        }
        return 0;
    }
    distanceToLine(lineNumber) {
        if (this.contains(lineNumber)) {
            return 0;
        }
        if (lineNumber < this.startLineNumber) {
            return this.startLineNumber - lineNumber;
        }
        return lineNumber - this.endLineNumberExclusive;
    }
    addMargin(marginTop, marginBottom) {
        return new LineRange(this.startLineNumber - marginTop, this.endLineNumberExclusive + marginBottom);
    }
}
export class LineRangeSet {
    constructor(
    /**
     * Sorted by start line number.
     * No two line ranges are touching or intersecting.
     */
    _normalizedRanges = []) {
        this._normalizedRanges = _normalizedRanges;
    }
    get ranges() {
        return this._normalizedRanges;
    }
    addRange(range) {
        if (range.length === 0) {
            return;
        }
        // Idea: Find joinRange such that:
        // replaceRange = _normalizedRanges.replaceRange(joinRange, range.joinAll(joinRange.map(idx => this._normalizedRanges[idx])))
        // idx of first element that touches range or that is after range
        const joinRangeStartIdx = findFirstIdxMonotonousOrArrLen(this._normalizedRanges, (r) => r.endLineNumberExclusive >= range.startLineNumber);
        // idx of element after { last element that touches range or that is before range }
        const joinRangeEndIdxExclusive = findLastIdxMonotonous(this._normalizedRanges, (r) => r.startLineNumber <= range.endLineNumberExclusive) + 1;
        if (joinRangeStartIdx === joinRangeEndIdxExclusive) {
            // If there is no element that touches range, then joinRangeStartIdx === joinRangeEndIdxExclusive and that value is the index of the element after range
            this._normalizedRanges.splice(joinRangeStartIdx, 0, range);
        }
        else if (joinRangeStartIdx === joinRangeEndIdxExclusive - 1) {
            // Else, there is an element that touches range and in this case it is both the first and last element. Thus we can replace it
            const joinRange = this._normalizedRanges[joinRangeStartIdx];
            this._normalizedRanges[joinRangeStartIdx] = joinRange.join(range);
        }
        else {
            // First and last element are different - we need to replace the entire range
            const joinRange = this._normalizedRanges[joinRangeStartIdx]
                .join(this._normalizedRanges[joinRangeEndIdxExclusive - 1])
                .join(range);
            this._normalizedRanges.splice(joinRangeStartIdx, joinRangeEndIdxExclusive - joinRangeStartIdx, joinRange);
        }
    }
    contains(lineNumber) {
        const rangeThatStartsBeforeEnd = findLastMonotonous(this._normalizedRanges, (r) => r.startLineNumber <= lineNumber);
        return (!!rangeThatStartsBeforeEnd && rangeThatStartsBeforeEnd.endLineNumberExclusive > lineNumber);
    }
    intersects(range) {
        const rangeThatStartsBeforeEnd = findLastMonotonous(this._normalizedRanges, (r) => r.startLineNumber < range.endLineNumberExclusive);
        return (!!rangeThatStartsBeforeEnd &&
            rangeThatStartsBeforeEnd.endLineNumberExclusive > range.startLineNumber);
    }
    getUnion(other) {
        if (this._normalizedRanges.length === 0) {
            return other;
        }
        if (other._normalizedRanges.length === 0) {
            return this;
        }
        const result = [];
        let i1 = 0;
        let i2 = 0;
        let current = null;
        while (i1 < this._normalizedRanges.length || i2 < other._normalizedRanges.length) {
            let next = null;
            if (i1 < this._normalizedRanges.length && i2 < other._normalizedRanges.length) {
                const lineRange1 = this._normalizedRanges[i1];
                const lineRange2 = other._normalizedRanges[i2];
                if (lineRange1.startLineNumber < lineRange2.startLineNumber) {
                    next = lineRange1;
                    i1++;
                }
                else {
                    next = lineRange2;
                    i2++;
                }
            }
            else if (i1 < this._normalizedRanges.length) {
                next = this._normalizedRanges[i1];
                i1++;
            }
            else {
                next = other._normalizedRanges[i2];
                i2++;
            }
            if (current === null) {
                current = next;
            }
            else {
                if (current.endLineNumberExclusive >= next.startLineNumber) {
                    // merge
                    current = new LineRange(current.startLineNumber, Math.max(current.endLineNumberExclusive, next.endLineNumberExclusive));
                }
                else {
                    // push
                    result.push(current);
                    current = next;
                }
            }
        }
        if (current !== null) {
            result.push(current);
        }
        return new LineRangeSet(result);
    }
    /**
     * Subtracts all ranges in this set from `range` and returns the result.
     */
    subtractFrom(range) {
        // idx of first element that touches range or that is after range
        const joinRangeStartIdx = findFirstIdxMonotonousOrArrLen(this._normalizedRanges, (r) => r.endLineNumberExclusive >= range.startLineNumber);
        // idx of element after { last element that touches range or that is before range }
        const joinRangeEndIdxExclusive = findLastIdxMonotonous(this._normalizedRanges, (r) => r.startLineNumber <= range.endLineNumberExclusive) + 1;
        if (joinRangeStartIdx === joinRangeEndIdxExclusive) {
            return new LineRangeSet([range]);
        }
        const result = [];
        let startLineNumber = range.startLineNumber;
        for (let i = joinRangeStartIdx; i < joinRangeEndIdxExclusive; i++) {
            const r = this._normalizedRanges[i];
            if (r.startLineNumber > startLineNumber) {
                result.push(new LineRange(startLineNumber, r.startLineNumber));
            }
            startLineNumber = r.endLineNumberExclusive;
        }
        if (startLineNumber < range.endLineNumberExclusive) {
            result.push(new LineRange(startLineNumber, range.endLineNumberExclusive));
        }
        return new LineRangeSet(result);
    }
    toString() {
        return this._normalizedRanges.map((r) => r.toString()).join(', ');
    }
    getIntersection(other) {
        const result = [];
        let i1 = 0;
        let i2 = 0;
        while (i1 < this._normalizedRanges.length && i2 < other._normalizedRanges.length) {
            const r1 = this._normalizedRanges[i1];
            const r2 = other._normalizedRanges[i2];
            const i = r1.intersect(r2);
            if (i && !i.isEmpty) {
                result.push(i);
            }
            if (r1.endLineNumberExclusive < r2.endLineNumberExclusive) {
                i1++;
            }
            else {
                i2++;
            }
        }
        return new LineRangeSet(result);
    }
    getWithDelta(value) {
        return new LineRangeSet(this._normalizedRanges.map((r) => r.delta(value)));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZVJhbmdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb3JlL2xpbmVSYW5nZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUNsQyxPQUFPLEVBQ04sOEJBQThCLEVBQzlCLHFCQUFxQixFQUNyQixrQkFBa0IsR0FDbEIsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUzQzs7R0FFRztBQUNILE1BQU0sT0FBTyxTQUFTO0lBQ2QsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFZO1FBQ25DLE9BQU8sSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDakUsQ0FBQztJQUVNLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxLQUFZO1FBQzVDLE9BQU8sSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ3JFLENBQUM7SUFFTSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQVksRUFBRSxDQUF3QjtRQUM1RCxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDUixPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDWCxDQUFDO1FBQ0QsSUFDQyxDQUFDLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQyxlQUFlO1lBQ3JDLENBQUMsQ0FBQyxzQkFBc0IsR0FBRyxDQUFDLENBQUMsc0JBQXNCLEVBQ2xELENBQUM7WUFDRixPQUFPO2dCQUNOLElBQUksU0FBUyxDQUFDLENBQUMs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