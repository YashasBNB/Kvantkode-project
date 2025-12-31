/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { forEachAdjacent } from '../../../../../base/common/arrays.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { OffsetRange } from '../../../core/offsetRange.js';
export class DiffAlgorithmResult {
    static trivial(seq1, seq2) {
        return new DiffAlgorithmResult([new SequenceDiff(OffsetRange.ofLength(seq1.length), OffsetRange.ofLength(seq2.length))], false);
    }
    static trivialTimedOut(seq1, seq2) {
        return new DiffAlgorithmResult([new SequenceDiff(OffsetRange.ofLength(seq1.length), OffsetRange.ofLength(seq2.length))], true);
    }
    constructor(diffs, 
    /**
     * Indicates if the time out was reached.
     * In that case, the diffs might be an approximation and the user should be asked to rerun the diff with more time.
     */
    hitTimeout) {
        this.diffs = diffs;
        this.hitTimeout = hitTimeout;
    }
}
export class SequenceDiff {
    static invert(sequenceDiffs, doc1Length) {
        const result = [];
        forEachAdjacent(sequenceDiffs, (a, b) => {
            result.push(SequenceDiff.fromOffsetPairs(a ? a.getEndExclusives() : OffsetPair.zero, b
                ? b.getStarts()
                : new OffsetPair(doc1Length, (a ? a.seq2Range.endExclusive - a.seq1Range.endExclusive : 0) + doc1Length)));
        });
        return result;
    }
    static fromOffsetPairs(start, endExclusive) {
        return new SequenceDiff(new OffsetRange(start.offset1, endExclusive.offset1), new OffsetRange(start.offset2, endExclusive.offset2));
    }
    static assertSorted(sequenceDiffs) {
        let last = undefined;
        for (const cur of sequenceDiffs) {
            if (last) {
                if (!(last.seq1Range.endExclusive <= cur.seq1Range.start &&
                    last.seq2Range.endExclusive <= cur.seq2Range.start)) {
                    throw new BugIndicatingError('Sequence diffs must be sorted');
                }
            }
            last = cur;
        }
    }
    constructor(seq1Range, seq2Range) {
        this.seq1Range = seq1Range;
        this.seq2Range = seq2Range;
    }
    swap() {
        return new SequenceDiff(this.seq2Range, this.seq1Range);
    }
    toString() {
        return `${this.seq1Range} <-> ${this.seq2Range}`;
    }
    join(other) {
        return new SequenceDiff(this.seq1Range.join(other.seq1Range), this.seq2Range.join(other.seq2Range));
    }
    delta(offset) {
        if (offset === 0) {
            return this;
        }
        return new SequenceDiff(this.seq1Range.delta(offset), this.seq2Range.delta(offset));
    }
    deltaStart(offset) {
        if (offset === 0) {
            return this;
        }
        return new SequenceDiff(this.seq1Range.deltaStart(offset), this.seq2Range.deltaStart(offset));
    }
    deltaEnd(offset) {
        if (offset === 0) {
            return this;
        }
        return new SequenceDiff(this.seq1Range.deltaEnd(offset), this.seq2Range.deltaEnd(offset));
    }
    intersectsOrTouches(other) {
        return (this.seq1Range.intersectsOrTouches(other.seq1Range) ||
            this.seq2Range.intersectsOrTouches(other.seq2Range));
    }
    intersect(other) {
        const i1 = this.seq1Range.intersect(other.seq1Range);
        const i2 = this.seq2Range.intersect(other.seq2Range);
        if (!i1 || !i2) {
            return undefined;
        }
        return new SequenceDiff(i1, i2);
    }
    getStarts() {
        return new OffsetPair(this.seq1Range.start, this.seq2Range.start);
    }
    getEndExclusives() {
        return new OffsetPair(this.seq1Range.endExclusive, this.seq2Range.endExclusive);
    }
}
export class OffsetPair {
    static { this.zero = new OffsetPair(0, 0); }
    static { this.max = new OffsetPair(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER); }
    constructor(offset1, offset2) {
        this.offset1 = offset1;
        this.offset2 = offset2;
    }
    toString() {
        return `${this.offset1} <-> ${this.offset2}`;
    }
    delta(offset) {
        if (offset === 0) {
            return this;
        }
        return new OffsetPair(this.offset1 + offset, this.offset2 + offset);
    }
    equals(other) {
        return this.offset1 === other.offset1 && this.offset2 === other.offset2;
    }
}
export class InfiniteTimeout {
    static { this.instance = new InfiniteTimeout(); }
    isValid() {
        return true;
    }
}
export class DateTimeout {
    constructor(timeout) {
        this.timeout = timeout;
        this.startTime = Date.now();
        this.valid = true;
        if (timeout <= 0) {
            throw new BugIndicatingError('timeout must be positive');
        }
    }
    // Recommendation: Set a log-point `{this.disable()}` in the body
    isValid() {
        const valid = Date.now() - this.startTime < this.timeout;
        if (!valid && this.valid) {
            this.valid = false; // timeout reached
        }
        return this.valid;
    }
    disable() {
        this.timeout = Number.MAX_SAFE_INTEGER;
        this.isValid = () => true;
        this.valid = true;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkFsZ29yaXRobS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vZGlmZi9kZWZhdWx0TGluZXNEaWZmQ29tcHV0ZXIvYWxnb3JpdGhtcy9kaWZmQWxnb3JpdGhtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFTMUQsTUFBTSxPQUFPLG1CQUFtQjtJQUMvQixNQUFNLENBQUMsT0FBTyxDQUFDLElBQWUsRUFBRSxJQUFlO1FBQzlDLE9BQU8sSUFBSSxtQkFBbUIsQ0FDN0IsQ0FBQyxJQUFJLFlBQVksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQ3hGLEtBQUssQ0FDTCxDQUFBO0lBQ0YsQ0FBQztJQUVELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBZSxFQUFFLElBQWU7UUFDdEQsT0FBTyxJQUFJLG1CQUFtQixDQUM3QixDQUFDLElBQUksWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFDeEYsSUFBSSxDQUNKLENBQUE7SUFDRixDQUFDO0lBRUQsWUFDaUIsS0FBcUI7SUFDckM7OztPQUdHO0lBQ2EsVUFBbUI7UUFMbkIsVUFBSyxHQUFMLEtBQUssQ0FBZ0I7UUFLckIsZUFBVSxHQUFWLFVBQVUsQ0FBUztJQUNqQyxDQUFDO0NBQ0o7QUFFRCxNQUFNLE9BQU8sWUFBWTtJQUNqQixNQUFNLENBQUMsTUFBTSxDQUFDLGFBQTZCLEVBQUUsVUFBa0I7UUFDckUsTUFBTSxNQUFNLEdBQW1CLEVBQUUsQ0FBQTtRQUNqQyxlQUFlLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3ZDLE1BQU0sQ0FBQyxJQUFJLENBQ1YsWUFBWSxDQUFDLGVBQWUsQ0FDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksRUFDMUMsQ0FBQztnQkFDQSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRTtnQkFDZixDQUFDLENBQUMsSUFBSSxVQUFVLENBQ2QsVUFBVSxFQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUMxRSxDQUNILENBQ0QsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0YsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU0sTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFpQixFQUFFLFlBQXdCO1FBQ3hFLE9BQU8sSUFBSSxZQUFZLENBQ3RCLElBQUksV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLE9BQU8sQ0FBQyxFQUNwRCxJQUFJLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FDcEQsQ0FBQTtJQUNGLENBQUM7SUFFTSxNQUFNLENBQUMsWUFBWSxDQUFDLGFBQTZCO1FBQ3ZELElBQUksSUFBSSxHQUE2QixTQUFTLENBQUE7UUFDOUMsS0FBSyxNQUFNLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNqQyxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUNWLElBQ0MsQ0FBQyxDQUNBLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSztvQkFDbEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQ2xELEVBQ0EsQ0FBQztvQkFDRixNQUFNLElBQUksa0JBQWtCLENBQUMsK0JBQStCLENBQUMsQ0FBQTtnQkFDOUQsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLEdBQUcsR0FBRyxDQUFBO1FBQ1gsQ0FBQztJQUNGLENBQUM7SUFFRCxZQUNpQixTQUFzQixFQUN0QixTQUFzQjtRQUR0QixjQUFTLEdBQVQsU0FBUyxDQUFhO1FBQ3RCLGNBQVMsR0FBVCxTQUFTLENBQWE7SUFDcEMsQ0FBQztJQUVHLElBQUk7UUFDVixPQUFPLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ3hELENBQUM7SUFFTSxRQUFRO1FBQ2QsT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLFFBQVEsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFBO0lBQ2pELENBQUM7SUFFTSxJQUFJLENBQUMsS0FBbUI7UUFDOUIsT0FBTyxJQUFJLFlBQVksQ0FDdEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUNwQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQ3BDLENBQUE7SUFDRixDQUFDO0lBRU0sS0FBSyxDQUFDLE1BQWM7UUFDMUIsSUFBSSxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbEIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsT0FBTyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBQ3BGLENBQUM7SUFFTSxVQUFVLENBQUMsTUFBYztRQUMvQixJQUFJLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNsQixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDOUYsQ0FBQztJQUVNLFFBQVEsQ0FBQyxNQUFjO1FBQzdCLElBQUksTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2xCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUMxRixDQUFDO0lBRU0sbUJBQW1CLENBQUMsS0FBbUI7UUFDN0MsT0FBTyxDQUNOLElBQUksQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQztZQUNuRCxJQUFJLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FDbkQsQ0FBQTtJQUNGLENBQUM7SUFFTSxTQUFTLENBQUMsS0FBbUI7UUFDbkMsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNwRCxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDaEIsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUNELE9BQU8sSUFBSSxZQUFZLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ2hDLENBQUM7SUFFTSxTQUFTO1FBQ2YsT0FBTyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2xFLENBQUM7SUFFTSxnQkFBZ0I7UUFDdEIsT0FBTyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQ2hGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxVQUFVO2FBQ0MsU0FBSSxHQUFHLElBQUksVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTthQUMzQixRQUFHLEdBQUcsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBRTdGLFlBQ2lCLE9BQWUsRUFDZixPQUFlO1FBRGYsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQUNmLFlBQU8sR0FBUCxPQUFPLENBQVE7SUFDN0IsQ0FBQztJQUVHLFFBQVE7UUFDZCxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sUUFBUSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDN0MsQ0FBQztJQUVNLEtBQUssQ0FBQyxNQUFjO1FBQzFCLElBQUksTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2xCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsQ0FBQTtJQUNwRSxDQUFDO0lBRU0sTUFBTSxDQUFDLEtBQWlCO1FBQzlCLE9BQU8sSUFBSSxDQUFDLE9BQU8sS0FBSyxLQUFLLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssS0FBSyxDQUFDLE9BQU8sQ0FBQTtJQUN4RSxDQUFDOztBQTBCRixNQUFNLE9BQU8sZUFBZTthQUNiLGFBQVEsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBRTlDLE9BQU87UUFDTixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7O0FBR0YsTUFBTSxPQUFPLFdBQVc7SUFJdkIsWUFBb0IsT0FBZTtRQUFmLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFIbEIsY0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUMvQixVQUFLLEdBQUcsSUFBSSxDQUFBO1FBR25CLElBQUksT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ2xCLE1BQU0sSUFBSSxrQkFBa0IsQ0FBQywwQkFBMEIsQ0FBQyxDQUFBO1FBQ3pELENBQUM7SUFDRixDQUFDO0lBRUQsaUVBQWlFO0lBQzFELE9BQU87UUFDYixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFBO1FBQ3hELElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBLENBQUMsa0JBQWtCO1FBQ3RDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUE7SUFDbEIsQ0FBQztJQUVNLE9BQU87UUFDYixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQTtRQUN0QyxJQUFJLENBQUMsT0FBTyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQTtRQUN6QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQTtJQUNsQixDQUFDO0NBQ0QifQ==