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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZVJhbmdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvcmUvbGluZVJhbmdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQ2xDLE9BQU8sRUFDTiw4QkFBOEIsRUFDOUIscUJBQXFCLEVBQ3JCLGtCQUFrQixHQUNsQixNQUFNLG9DQUFvQyxDQUFBO0FBRTNDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFNBQVM7SUFDZCxNQUFNLENBQUMsU0FBUyxDQUFDLEtBQVk7UUFDbkMsT0FBTyxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUNqRSxDQUFDO0lBRU0sTUFBTSxDQUFDLGtCQUFrQixDQUFDLEtBQVk7UUFDNUMsT0FBTyxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDckUsQ0FBQztJQUVNLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBWSxFQUFFLENBQXdCO1FBQzVELElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNSLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNYLENBQUM7UUFDRCxJQUNDLENBQUMsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDLGVBQWU7WUFDckMsQ0FBQyxDQUFDLHNCQUFzQixHQUFHLENBQUMsQ0FBQyxzQkFBc0IsRUFDbEQsQ0FBQztZQUNGLE9BQU87Z0JB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