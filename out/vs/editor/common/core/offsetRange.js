/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from '../../../base/common/errors.js';
/**
 * A range of offsets (0-based).
 */
export class OffsetRange {
    static fromTo(start, endExclusive) {
        return new OffsetRange(start, endExclusive);
    }
    static addRange(range, sortedRanges) {
        let i = 0;
        while (i < sortedRanges.length && sortedRanges[i].endExclusive < range.start) {
            i++;
        }
        let j = i;
        while (j < sortedRanges.length && sortedRanges[j].start <= range.endExclusive) {
            j++;
        }
        if (i === j) {
            sortedRanges.splice(i, 0, range);
        }
        else {
            const start = Math.min(range.start, sortedRanges[i].start);
            const end = Math.max(range.endExclusive, sortedRanges[j - 1].endExclusive);
            sortedRanges.splice(i, j - i, new OffsetRange(start, end));
        }
    }
    static tryCreate(start, endExclusive) {
        if (start > endExclusive) {
            return undefined;
        }
        return new OffsetRange(start, endExclusive);
    }
    static ofLength(length) {
        return new OffsetRange(0, length);
    }
    static ofStartAndLength(start, length) {
        return new OffsetRange(start, start + length);
    }
    static emptyAt(offset) {
        return new OffsetRange(offset, offset);
    }
    constructor(start, endExclusive) {
        this.start = start;
        this.endExclusive = endExclusive;
        if (start > endExclusive) {
            throw new BugIndicatingError(`Invalid range: ${this.toString()}`);
        }
    }
    get isEmpty() {
        return this.start === this.endExclusive;
    }
    delta(offset) {
        return new OffsetRange(this.start + offset, this.endExclusive + offset);
    }
    deltaStart(offset) {
        return new OffsetRange(this.start + offset, this.endExclusive);
    }
    deltaEnd(offset) {
        return new OffsetRange(this.start, this.endExclusive + offset);
    }
    get length() {
        return this.endExclusive - this.start;
    }
    toString() {
        return `[${this.start}, ${this.endExclusive})`;
    }
    equals(other) {
        return this.start === other.start && this.endExclusive === other.endExclusive;
    }
    containsRange(other) {
        return this.start <= other.start && other.endExclusive <= this.endExclusive;
    }
    contains(offset) {
        return this.start <= offset && offset < this.endExclusive;
    }
    /**
     * for all numbers n: range1.contains(n) or range2.contains(n) => range1.join(range2).contains(n)
     * The joined range is the smallest range that contains both ranges.
     */
    join(other) {
        return new OffsetRange(Math.min(this.start, other.start), Math.max(this.endExclusive, other.endExclusive));
    }
    /**
     * for all numbers n: range1.contains(n) and range2.contains(n) <=> range1.intersect(range2).contains(n)
     *
     * The resulting range is empty if the ranges do not intersect, but touch.
     * If the ranges don't even touch, the result is undefined.
     */
    intersect(other) {
        const start = Math.max(this.start, other.start);
        const end = Math.min(this.endExclusive, other.endExclusive);
        if (start <= end) {
            return new OffsetRange(start, end);
        }
        return undefined;
    }
    intersectionLength(range) {
        const start = Math.max(this.start, range.start);
        const end = Math.min(this.endExclusive, range.endExclusive);
        return Math.max(0, end - start);
    }
    intersects(other) {
        const start = Math.max(this.start, other.start);
        const end = Math.min(this.endExclusive, other.endExclusive);
        return start < end;
    }
    intersectsOrTouches(other) {
        const start = Math.max(this.start, other.start);
        const end = Math.min(this.endExclusive, other.endExclusive);
        return start <= end;
    }
    isBefore(other) {
        return this.endExclusive <= other.start;
    }
    isAfter(other) {
        return this.start >= other.endExclusive;
    }
    slice(arr) {
        return arr.slice(this.start, this.endExclusive);
    }
    substring(str) {
        return str.substring(this.start, this.endExclusive);
    }
    /**
     * Returns the given value if it is contained in this instance, otherwise the closest value that is contained.
     * The range must not be empty.
     */
    clip(value) {
        if (this.isEmpty) {
            throw new BugIndicatingError(`Invalid clipping range: ${this.toString()}`);
        }
        return Math.max(this.start, Math.min(this.endExclusive - 1, value));
    }
    /**
     * Returns `r := value + k * length` such that `r` is contained in this range.
     * The range must not be empty.
     *
     * E.g. `[5, 10).clipCyclic(10) === 5`, `[5, 10).clipCyclic(11) === 6` and `[5, 10).clipCyclic(4) === 9`.
     */
    clipCyclic(value) {
        if (this.isEmpty) {
            throw new BugIndicatingError(`Invalid clipping range: ${this.toString()}`);
        }
        if (value < this.start) {
            return this.endExclusive - ((this.start - value) % this.length);
        }
        if (value >= this.endExclusive) {
            return this.start + ((value - this.start) % this.length);
        }
        return value;
    }
    map(f) {
        const result = [];
        for (let i = this.start; i < this.endExclusive; i++) {
            result.push(f(i));
        }
        return result;
    }
    forEach(f) {
        for (let i = this.start; i < this.endExclusive; i++) {
            f(i);
        }
    }
}
export class OffsetRangeSet {
    constructor() {
        this._sortedRanges = [];
    }
    addRange(range) {
        let i = 0;
        while (i < this._sortedRanges.length && this._sortedRanges[i].endExclusive < range.start) {
            i++;
        }
        let j = i;
        while (j < this._sortedRanges.length && this._sortedRanges[j].start <= range.endExclusive) {
            j++;
        }
        if (i === j) {
            this._sortedRanges.splice(i, 0, range);
        }
        else {
            const start = Math.min(range.start, this._sortedRanges[i].start);
            const end = Math.max(range.endExclusive, this._sortedRanges[j - 1].endExclusive);
            this._sortedRanges.splice(i, j - i, new OffsetRange(start, end));
        }
    }
    toString() {
        return this._sortedRanges.map((r) => r.toString()).join(', ');
    }
    /**
     * Returns of there is a value that is contained in this instance and the given range.
     */
    intersectsStrict(other) {
        // TODO use binary search
        let i = 0;
        while (i < this._sortedRanges.length && this._sortedRanges[i].endExclusive <= other.start) {
            i++;
        }
        return i < this._sortedRanges.length && this._sortedRanges[i].start < other.endExclusive;
    }
    intersectWithRange(other) {
        // TODO use binary search + slice
        const result = new OffsetRangeSet();
        for (const range of this._sortedRanges) {
            const intersection = range.intersect(other);
            if (intersection) {
                result.addRange(intersection);
            }
        }
        return result;
    }
    intersectWithRangeLength(other) {
        return this.intersectWithRange(other).length;
    }
    get length() {
        return this._sortedRanges.reduce((prev, cur) => prev + cur.length, 0);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2Zmc2V0UmFuZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2NvcmUvb2Zmc2V0UmFuZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFPbkU7O0dBRUc7QUFDSCxNQUFNLE9BQU8sV0FBVztJQUNoQixNQUFNLENBQUMsTUFBTSxDQUFDLEtBQWEsRUFBRSxZQUFvQjtRQUN2RCxPQUFPLElBQUksV0FBVyxDQUFDLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRU0sTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFrQixFQUFFLFlBQTJCO1FBQ3JFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNULE9BQU8sQ0FBQyxHQUFHLFlBQVksQ0FBQyxNQUFNLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDOUUsQ0FBQyxFQUFFLENBQUE7UUFDSixDQUFDO1FBQ0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ1QsT0FBTyxDQUFDLEdBQUcsWUFBWSxDQUFDLE1BQU0sSUFBSSxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUMvRSxDQUFDLEVBQUUsQ0FBQTtRQUNKLENBQUM7UUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNiLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNqQyxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtB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