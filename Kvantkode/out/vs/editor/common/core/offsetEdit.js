/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from '../../../base/common/errors.js';
import { OffsetRange } from './offsetRange.js';
/**
 * Describes an edit to a (0-based) string.
 * Use `TextEdit` to describe edits for a 1-based line/column text.
 */
export class OffsetEdit {
    static { this.empty = new OffsetEdit([]); }
    static fromJson(data) {
        return new OffsetEdit(data.map(SingleOffsetEdit.fromJson));
    }
    static replace(range, newText) {
        return new OffsetEdit([new SingleOffsetEdit(range, newText)]);
    }
    static insert(offset, insertText) {
        return OffsetEdit.replace(OffsetRange.emptyAt(offset), insertText);
    }
    constructor(edits) {
        this.edits = edits;
        let lastEndEx = -1;
        for (const edit of edits) {
            if (!(edit.replaceRange.start >= lastEndEx)) {
                throw new BugIndicatingError(`Edits must be disjoint and sorted. Found ${edit} after ${lastEndEx}`);
            }
            lastEndEx = edit.replaceRange.endExclusive;
        }
    }
    normalize() {
        const edits = [];
        let lastEdit;
        for (const edit of this.edits) {
            if (edit.newText.length === 0 && edit.replaceRange.length === 0) {
                continue;
            }
            if (lastEdit && lastEdit.replaceRange.endExclusive === edit.replaceRange.start) {
                lastEdit = new SingleOffsetEdit(lastEdit.replaceRange.join(edit.replaceRange), lastEdit.newText + edit.newText);
            }
            else {
                if (lastEdit) {
                    edits.push(lastEdit);
                }
                lastEdit = edit;
            }
        }
        if (lastEdit) {
            edits.push(lastEdit);
        }
        return new OffsetEdit(edits);
    }
    toString() {
        const edits = this.edits.map((e) => e.toString()).join(', ');
        return `[${edits}]`;
    }
    apply(str) {
        const resultText = [];
        let pos = 0;
        for (const edit of this.edits) {
            resultText.push(str.substring(pos, edit.replaceRange.start));
            resultText.push(edit.newText);
            pos = edit.replaceRange.endExclusive;
        }
        resultText.push(str.substring(pos));
        return resultText.join('');
    }
    compose(other) {
        return joinEdits(this, other);
    }
    /**
     * Creates an edit that reverts this edit.
     */
    inverse(originalStr) {
        const edits = [];
        let offset = 0;
        for (const e of this.edits) {
            edits.push(new SingleOffsetEdit(OffsetRange.ofStartAndLength(e.replaceRange.start + offset, e.newText.length), originalStr.substring(e.replaceRange.start, e.replaceRange.endExclusive)));
            offset += e.newText.length - e.replaceRange.length;
        }
        return new OffsetEdit(edits);
    }
    getNewTextRanges() {
        const ranges = [];
        let offset = 0;
        for (const e of this.edits) {
            ranges.push(OffsetRange.ofStartAndLength(e.replaceRange.start + offset, e.newText.length));
            offset += e.newText.length - e.replaceRange.length;
        }
        return ranges;
    }
    get isEmpty() {
        return this.edits.length === 0;
    }
    tryRebase(base, noOverlap) {
        const newEdits = [];
        let baseIdx = 0;
        let ourIdx = 0;
        let offset = 0;
        while (ourIdx < this.edits.length || baseIdx < base.edits.length) {
            // take the edit that starts first
            const baseEdit = base.edits[baseIdx];
            const ourEdit = this.edits[ourIdx];
            if (!ourEdit) {
                // We processed all our edits
                break;
            }
            else if (!baseEdit) {
                // no more edits from base
                newEdits.push(new SingleOffsetEdit(ourEdit.replaceRange.delta(offset), ourEdit.newText));
                ourIdx++;
            }
            else if (ourEdit.replaceRange.intersectsOrTouches(baseEdit.replaceRange)) {
                ourIdx++; // Don't take our edit, as it is conflicting -> skip
                if (noOverlap) {
                    return undefined;
                }
            }
            else if (ourEdit.replaceRange.start < baseEdit.replaceRange.start) {
                // Our edit starts first
                newEdits.push(new SingleOffsetEdit(ourEdit.replaceRange.delta(offset), ourEdit.newText));
                ourIdx++;
            }
            else {
                baseIdx++;
                offset += baseEdit.newText.length - baseEdit.replaceRange.length;
            }
        }
        return new OffsetEdit(newEdits);
    }
    applyToOffset(originalOffset) {
        let accumulatedDelta = 0;
        for (const edit of this.edits) {
            if (edit.replaceRange.start <= originalOffset) {
                if (originalOffset < edit.replaceRange.endExclusive) {
                    // the offset is in the replaced range
                    return edit.replaceRange.start + accumulatedDelta;
                }
                accumulatedDelta += edit.newText.length - edit.replaceRange.length;
            }
            else {
                break;
            }
        }
        return originalOffset + accumulatedDelta;
    }
    applyToOffsetRange(originalRange) {
        return new OffsetRange(this.applyToOffset(originalRange.start), this.applyToOffset(originalRange.endExclusive));
    }
    applyInverseToOffset(postEditsOffset) {
        let accumulatedDelta = 0;
        for (const edit of this.edits) {
            const editLength = edit.newText.length;
            if (edit.replaceRange.start <= postEditsOffset - accumulatedDelta) {
                if (postEditsOffset - accumulatedDelta < edit.replaceRange.start + editLength) {
                    // the offset is in the replaced range
                    return edit.replaceRange.start;
                }
                accumulatedDelta += editLength - edit.replaceRange.length;
            }
            else {
                break;
            }
        }
        return postEditsOffset - accumulatedDelta;
    }
    equals(other) {
        if (this.edits.length !== other.edits.length) {
            return false;
        }
        for (let i = 0; i < this.edits.length; i++) {
            if (!this.edits[i].equals(other.edits[i])) {
                return false;
            }
        }
        return true;
    }
}
export class SingleOffsetEdit {
    static fromJson(data) {
        return new SingleOffsetEdit(OffsetRange.ofStartAndLength(data.pos, data.len), data.txt);
    }
    static insert(offset, text) {
        return new SingleOffsetEdit(OffsetRange.emptyAt(offset), text);
    }
    static replace(range, text) {
        return new SingleOffsetEdit(range, text);
    }
    constructor(replaceRange, newText) {
        this.replaceRange = replaceRange;
        this.newText = newText;
    }
    toString() {
        return `${this.replaceRange} -> "${this.newText}"`;
    }
    get isEmpty() {
        return this.newText.length === 0 && this.replaceRange.length === 0;
    }
    apply(str) {
        return (str.substring(0, this.replaceRange.start) +
            this.newText +
            str.substring(this.replaceRange.endExclusive));
    }
    getRangeAfterApply() {
        return new OffsetRange(this.replaceRange.start, this.replaceRange.start + this.newText.length);
    }
    equals(other) {
        return this.replaceRange.equals(other.replaceRange) && this.newText === other.newText;
    }
}
/**
 * Invariant:
 * ```
 * edits2.apply(edits1.apply(str)) = join(edits1, edits2).apply(str)
 * ```
 */
function joinEdits(edits1, edits2) {
    edits1 = edits1.normalize();
    edits2 = edits2.normalize();
    if (edits1.isEmpty) {
        return edits2;
    }
    if (edits2.isEmpty) {
        return edits1;
    }
    const edit1Queue = [...edits1.edits];
    const result = [];
    let edit1ToEdit2 = 0;
    for (const edit2 of edits2.edits) {
        // Copy over edit1 unmodified until it touches edit2.
        while (true) {
            const edit1 = edit1Queue[0];
            if (!edit1 ||
                edit1.replaceRange.start + edit1ToEdit2 + edit1.newText.length >= edit2.replaceRange.start) {
                break;
            }
            edit1Queue.shift();
            result.push(edit1);
            edit1ToEdit2 += edit1.newText.length - edit1.replaceRange.length;
        }
        const firstEdit1ToEdit2 = edit1ToEdit2;
        let firstIntersecting; // or touching
        let lastIntersecting; // or touching
        while (true) {
            const edit1 = edit1Queue[0];
            if (!edit1 || edit1.replaceRange.start + edit1ToEdit2 > edit2.replaceRange.endExclusive) {
                break;
            }
            // else we intersect, because the new end of edit1 is after or equal to our start
            if (!firstIntersecting) {
                firstIntersecting = edit1;
            }
            lastIntersecting = edit1;
            edit1Queue.shift();
            edit1ToEdit2 += edit1.newText.length - edit1.replaceRange.length;
        }
        if (!firstIntersecting) {
            result.push(new SingleOffsetEdit(edit2.replaceRange.delta(-edit1ToEdit2), edit2.newText));
        }
        else {
            let prefix = '';
            const prefixLength = edit2.replaceRange.start - (firstIntersecting.replaceRange.start + firstEdit1ToEdit2);
            if (prefixLength > 0) {
                prefix = firstIntersecting.newText.slice(0, prefixLength);
            }
            const suffixLength = lastIntersecting.replaceRange.endExclusive + edit1ToEdit2 - edit2.replaceRange.endExclusive;
            if (suffixLength > 0) {
                const e = new SingleOffsetEdit(OffsetRange.ofStartAndLength(lastIntersecting.replaceRange.endExclusive, 0), lastIntersecting.newText.slice(-suffixLength));
                edit1Queue.unshift(e);
                edit1ToEdit2 -= e.newText.length - e.replaceRange.length;
            }
            const newText = prefix + edit2.newText;
            const newReplaceRange = new OffsetRange(Math.min(firstIntersecting.replaceRange.start, edit2.replaceRange.start - firstEdit1ToEdit2), edit2.replaceRange.endExclusive - edit1ToEdit2);
            result.push(new SingleOffsetEdit(newReplaceRange, newText));
        }
    }
    while (true) {
        const item = edit1Queue.shift();
        if (!item) {
            break;
        }
        result.push(item);
    }
    return new OffsetEdit(result).normalize();
}
export function applyEditsToRanges(sortedRanges, edits) {
    sortedRanges = sortedRanges.slice();
    // treat edits as deletion of the replace range and then as insertion that extends the first range
    const result = [];
    let offset = 0;
    for (const e of edits.edits) {
        while (true) {
            // ranges before the current edit
            const r = sortedRanges[0];
            if (!r || r.endExclusive >= e.replaceRange.start) {
                break;
            }
            sortedRanges.shift();
            result.push(r.delta(offset));
        }
        const intersecting = [];
        while (true) {
            const r = sortedRanges[0];
            if (!r || !r.intersectsOrTouches(e.replaceRange)) {
                break;
            }
            sortedRanges.shift();
            intersecting.push(r);
        }
        for (let i = intersecting.length - 1; i >= 0; i--) {
            let r = intersecting[i];
            const overlap = r.intersect(e.replaceRange).length;
            r = r.deltaEnd(-overlap + (i === 0 ? e.newText.length : 0));
            const rangeAheadOfReplaceRange = r.start - e.replaceRange.start;
            if (rangeAheadOfReplaceRange > 0) {
                r = r.delta(-rangeAheadOfReplaceRange);
            }
            if (i !== 0) {
                r = r.delta(e.newText.length);
            }
            // We already took our offset into account.
            // Because we add r back to the queue (which then adds offset again),
            // we have to remove it here.
            r = r.delta(-(e.newText.length - e.replaceRange.length));
            sortedRanges.unshift(r);
        }
        offset += e.newText.length - e.replaceRange.length;
    }
    while (true) {
        const r = sortedRanges[0];
        if (!r) {
            break;
        }
        sortedRanges.shift();
        result.push(r.delta(offset));
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2Zmc2V0RWRpdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb3JlL29mZnNldEVkaXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBRTlDOzs7R0FHRztBQUNILE1BQU0sT0FBTyxVQUFVO2FBQ0MsVUFBSyxHQUFHLElBQUksVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBRTFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBaUI7UUFDdkMsT0FBTyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7SUFDM0QsQ0FBQztJQUVNLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBa0IsRUFBRSxPQUFlO1FBQ3hELE9BQU8sSUFBSSxVQUFVLENBQUMsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDOUQsQ0FBQztJQUVNLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBYyxFQUFFLFVBQWtCO1FBQ3RELE9BQU8sVUFBVSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQ25FLENBQUM7SUFFRCxZQUE0QixLQUFrQztRQUFsQyxVQUFLLEdBQUwsS0FBSyxDQUE2QjtRQUM3RCxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNsQixLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZ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