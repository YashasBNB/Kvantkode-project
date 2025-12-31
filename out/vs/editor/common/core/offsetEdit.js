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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2Zmc2V0RWRpdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29yZS9vZmZzZXRFZGl0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUU5Qzs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sVUFBVTthQUNDLFVBQUssR0FBRyxJQUFJLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUUxQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQWlCO1FBQ3ZDLE9BQU8sSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO0lBQzNELENBQUM7SUFFTSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQWtCLEVBQUUsT0FBZTtRQUN4RCxPQUFPLElBQUksVUFBVSxDQUFDLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzlELENBQUM7SUFFTSxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQWMsRUFBRSxVQUFrQjtRQUN0RCxPQUFPLFVBQVUsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUNuRSxDQUFDO0lBRUQsWUFBNEIsS0FBa0M7UUFBbEMsVUFBSyxHQUFMLEtBQUssQ0FBNkI7UUFDN0QsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDbEIsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFD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