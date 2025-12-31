/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { forEachWithNeighbors } from '../../../../base/common/arrays.js';
import { OffsetRange } from '../../core/offsetRange.js';
import { OffsetPair, SequenceDiff } from './algorithms/diffAlgorithm.js';
export function optimizeSequenceDiffs(sequence1, sequence2, sequenceDiffs) {
    let result = sequenceDiffs;
    result = joinSequenceDiffsByShifting(sequence1, sequence2, result);
    // Sometimes, calling this function twice improves the result.
    // Uncomment the second invocation and run the tests to see the difference.
    result = joinSequenceDiffsByShifting(sequence1, sequence2, result);
    result = shiftSequenceDiffs(sequence1, sequence2, result);
    return result;
}
/**
 * This function fixes issues like this:
 * ```
 * import { Baz, Bar } from "foo";
 * ```
 * <->
 * ```
 * import { Baz, Bar, Foo } from "foo";
 * ```
 * Computed diff: [ {Add "," after Bar}, {Add "Foo " after space} }
 * Improved diff: [{Add ", Foo" after Bar}]
 */
function joinSequenceDiffsByShifting(sequence1, sequence2, sequenceDiffs) {
    if (sequenceDiffs.length === 0) {
        return sequenceDiffs;
    }
    const result = [];
    result.push(sequenceDiffs[0]);
    // First move them all to the left as much as possible and join them if possible
    for (let i = 1; i < sequenceDiffs.length; i++) {
        const prevResult = result[result.length - 1];
        let cur = sequenceDiffs[i];
        if (cur.seq1Range.isEmpty || cur.seq2Range.isEmpty) {
            const length = cur.seq1Range.start - prevResult.seq1Range.endExclusive;
            let d;
            for (d = 1; d <= length; d++) {
                if (sequence1.getElement(cur.seq1Range.start - d) !==
                    sequence1.getElement(cur.seq1Range.endExclusive - d) ||
                    sequence2.getElement(cur.seq2Range.start - d) !==
                        sequence2.getElement(cur.seq2Range.endExclusive - d)) {
                    break;
                }
            }
            d--;
            if (d === length) {
                // Merge previous and current diff
                result[result.length - 1] = new SequenceDiff(new OffsetRange(prevResult.seq1Range.start, cur.seq1Range.endExclusive - length), new OffsetRange(prevResult.seq2Range.start, cur.seq2Range.endExclusive - length));
                continue;
            }
            cur = cur.delta(-d);
        }
        result.push(cur);
    }
    const result2 = [];
    // Then move them all to the right and join them again if possible
    for (let i = 0; i < result.length - 1; i++) {
        const nextResult = result[i + 1];
        let cur = result[i];
        if (cur.seq1Range.isEmpty || cur.seq2Range.isEmpty) {
            const length = nextResult.seq1Range.start - cur.seq1Range.endExclusive;
            let d;
            for (d = 0; d < length; d++) {
                if (!sequence1.isStronglyEqual(cur.seq1Range.start + d, cur.seq1Range.endExclusive + d) ||
                    !sequence2.isStronglyEqual(cur.seq2Range.start + d, cur.seq2Range.endExclusive + d)) {
                    break;
                }
            }
            if (d === length) {
                // Merge previous and current diff, write to result!
                result[i + 1] = new SequenceDiff(new OffsetRange(cur.seq1Range.start + length, nextResult.seq1Range.endExclusive), new OffsetRange(cur.seq2Range.start + length, nextResult.seq2Range.endExclusive));
                continue;
            }
            if (d > 0) {
                cur = cur.delta(d);
            }
        }
        result2.push(cur);
    }
    if (result.length > 0) {
        result2.push(result[result.length - 1]);
    }
    return result2;
}
// align character level diffs at whitespace characters
// import { IBar } from "foo";
// import { I[Arr, I]Bar } from "foo";
// ->
// import { [IArr, ]IBar } from "foo";
// import { ITransaction, observableValue, transaction } from 'vs/base/common/observable';
// import { ITransaction, observable[FromEvent, observable]Value, transaction } from 'vs/base/common/observable';
// ->
// import { ITransaction, [observableFromEvent, ]observableValue, transaction } from 'vs/base/common/observable';
// collectBrackets(level + 1, levelPerBracketType);
// collectBrackets(level + 1, levelPerBracket[ + 1, levelPerBracket]Type);
// ->
// collectBrackets(level + 1, [levelPerBracket + 1, ]levelPerBracketType);
function shiftSequenceDiffs(sequence1, sequence2, sequenceDiffs) {
    if (!sequence1.getBoundaryScore || !sequence2.getBoundaryScore) {
        return sequenceDiffs;
    }
    for (let i = 0; i < sequenceDiffs.length; i++) {
        const prevDiff = i > 0 ? sequenceDiffs[i - 1] : undefined;
        const diff = sequenceDiffs[i];
        const nextDiff = i + 1 < sequenceDiffs.length ? sequenceDiffs[i + 1] : undefined;
        const seq1ValidRange = new OffsetRange(prevDiff ? prevDiff.seq1Range.endExclusive + 1 : 0, nextDiff ? nextDiff.seq1Range.start - 1 : sequence1.length);
        const seq2ValidRange = new OffsetRange(prevDiff ? prevDiff.seq2Range.endExclusive + 1 : 0, nextDiff ? nextDiff.seq2Range.start - 1 : sequence2.length);
        if (diff.seq1Range.isEmpty) {
            sequenceDiffs[i] = shiftDiffToBetterPosition(diff, sequence1, sequence2, seq1ValidRange, seq2ValidRange);
        }
        else if (diff.seq2Range.isEmpty) {
            sequenceDiffs[i] = shiftDiffToBetterPosition(diff.swap(), sequence2, sequence1, seq2ValidRange, seq1ValidRange).swap();
        }
    }
    return sequenceDiffs;
}
function shiftDiffToBetterPosition(diff, sequence1, sequence2, seq1ValidRange, seq2ValidRange) {
    const maxShiftLimit = 100; // To prevent performance issues
    // don't touch previous or next!
    let deltaBefore = 1;
    while (diff.seq1Range.start - deltaBefore >= seq1ValidRange.start &&
        diff.seq2Range.start - deltaBefore >= seq2ValidRange.start &&
        sequence2.isStronglyEqual(diff.seq2Range.start - deltaBefore, diff.seq2Range.endExclusive - deltaBefore) &&
        deltaBefore < maxShiftLimit) {
        deltaBefore++;
    }
    deltaBefore--;
    let deltaAfter = 0;
    while (diff.seq1Range.start + deltaAfter < seq1ValidRange.endExclusive &&
        diff.seq2Range.endExclusive + deltaAfter < seq2ValidRange.endExclusive &&
        sequence2.isStronglyEqual(diff.seq2Range.start + deltaAfter, diff.seq2Range.endExclusive + deltaAfter) &&
        deltaAfter < maxShiftLimit) {
        deltaAfter++;
    }
    if (deltaBefore === 0 && deltaAfter === 0) {
        return diff;
    }
    // Visualize `[sequence1.text, diff.seq1Range.start + deltaAfter]`
    // and `[sequence2.text, diff.seq2Range.start + deltaAfter, diff.seq2Range.endExclusive + deltaAfter]`
    let bestDelta = 0;
    let bestScore = -1;
    // find best scored delta
    for (let delta = -deltaBefore; delta <= deltaAfter; delta++) {
        const seq2OffsetStart = diff.seq2Range.start + delta;
        const seq2OffsetEndExclusive = diff.seq2Range.endExclusive + delta;
        const seq1Offset = diff.seq1Range.start + delta;
        const score = sequence1.getBoundaryScore(seq1Offset) +
            sequence2.getBoundaryScore(seq2OffsetStart) +
            sequence2.getBoundaryScore(seq2OffsetEndExclusive);
        if (score > bestScore) {
            bestScore = score;
            bestDelta = delta;
        }
    }
    return diff.delta(bestDelta);
}
export function removeShortMatches(sequence1, sequence2, sequenceDiffs) {
    const result = [];
    for (const s of sequenceDiffs) {
        const last = result[result.length - 1];
        if (!last) {
            result.push(s);
            continue;
        }
        if (s.seq1Range.start - last.seq1Range.endExclusive <= 2 ||
            s.seq2Range.start - last.seq2Range.endExclusive <= 2) {
            result[result.length - 1] = new SequenceDiff(last.seq1Range.join(s.seq1Range), last.seq2Range.join(s.seq2Range));
        }
        else {
            result.push(s);
        }
    }
    return result;
}
export function extendDiffsToEntireWordIfAppropriate(sequence1, sequence2, sequenceDiffs, findParent, force = false) {
    const equalMappings = SequenceDiff.invert(sequenceDiffs, sequence1.length);
    const additional = [];
    let lastPoint = new OffsetPair(0, 0);
    function scanWord(pair, equalMapping) {
        if (pair.offset1 < lastPoint.offset1 || pair.offset2 < lastPoint.offset2) {
            return;
        }
        const w1 = findParent(sequence1, pair.offset1);
        const w2 = findParent(sequence2, pair.offset2);
        if (!w1 || !w2) {
            return;
        }
        let w = new SequenceDiff(w1, w2);
        const equalPart = w.intersect(equalMapping);
        let equalChars1 = equalPart.seq1Range.length;
        let equalChars2 = equalPart.seq2Range.length;
        // The words do not touch previous equals mappings, as we would have processed them already.
        // But they might touch the next ones.
        while (equalMappings.length > 0) {
            const next = equalMappings[0];
            const intersects = next.seq1Range.intersects(w.seq1Range) || next.seq2Range.intersects(w.seq2Range);
            if (!intersects) {
                break;
            }
            const v1 = findParent(sequence1, next.seq1Range.start);
            const v2 = findParent(sequence2, next.seq2Range.start);
            // Because there is an intersection, we know that the words are not empty.
            const v = new SequenceDiff(v1, v2);
            const equalPart = v.intersect(next);
            equalChars1 += equalPart.seq1Range.length;
            equalChars2 += equalPart.seq2Range.length;
            w = w.join(v);
            if (w.seq1Range.endExclusive >= next.seq1Range.endExclusive) {
                // The word extends beyond the next equal mapping.
                equalMappings.shift();
            }
            else {
                break;
            }
        }
        if ((force && equalChars1 + equalChars2 < w.seq1Range.length + w.seq2Range.length) ||
            equalChars1 + equalChars2 < ((w.seq1Range.length + w.seq2Range.length) * 2) / 3) {
            additional.push(w);
        }
        lastPoint = w.getEndExclusives();
    }
    while (equalMappings.length > 0) {
        const next = equalMappings.shift();
        if (next.seq1Range.isEmpty) {
            continue;
        }
        scanWord(next.getStarts(), next);
        // The equal parts are not empty, so -1 gives us a character that is equal in both parts.
        scanWord(next.getEndExclusives().delta(-1), next);
    }
    const merged = mergeSequenceDiffs(sequenceDiffs, additional);
    return merged;
}
function mergeSequenceDiffs(sequenceDiffs1, sequenceDiffs2) {
    const result = [];
    while (sequenceDiffs1.length > 0 || sequenceDiffs2.length > 0) {
        const sd1 = sequenceDiffs1[0];
        const sd2 = sequenceDiffs2[0];
        let next;
        if (sd1 && (!sd2 || sd1.seq1Range.start < sd2.seq1Range.start)) {
            next = sequenceDiffs1.shift();
        }
        else {
            next = sequenceDiffs2.shift();
        }
        if (result.length > 0 &&
            result[result.length - 1].seq1Range.endExclusive >= next.seq1Range.start) {
            result[result.length - 1] = result[result.length - 1].join(next);
        }
        else {
            result.push(next);
        }
    }
    return result;
}
export function removeVeryShortMatchingLinesBetweenDiffs(sequence1, _sequence2, sequenceDiffs) {
    let diffs = sequenceDiffs;
    if (diffs.length === 0) {
        return diffs;
    }
    let counter = 0;
    let shouldRepeat;
    do {
        shouldRepeat = false;
        const result = [diffs[0]];
        for (let i = 1; i < diffs.length; i++) {
            const cur = diffs[i];
            const lastResult = result[result.length - 1];
            function shouldJoinDiffs(before, after) {
                const unchangedRange = new OffsetRange(lastResult.seq1Range.endExclusive, cur.seq1Range.start);
                const unchangedText = sequence1.getText(unchangedRange);
                const unchangedTextWithoutWs = unchangedText.replace(/\s/g, '');
                if (unchangedTextWithoutWs.length <= 4 &&
                    (before.seq1Range.length + before.seq2Range.length > 5 ||
                        after.seq1Range.length + after.seq2Range.length > 5)) {
                    return true;
                }
                return false;
            }
            const shouldJoin = shouldJoinDiffs(lastResult, cur);
            if (shouldJoin) {
                shouldRepeat = true;
                result[result.length - 1] = result[result.length - 1].join(cur);
            }
            else {
                result.push(cur);
            }
        }
        diffs = result;
    } while (counter++ < 10 && shouldRepeat);
    return diffs;
}
export function removeVeryShortMatchingTextBetweenLongDiffs(sequence1, sequence2, sequenceDiffs) {
    let diffs = sequenceDiffs;
    if (diffs.length === 0) {
        return diffs;
    }
    let counter = 0;
    let shouldRepeat;
    do {
        shouldRepeat = false;
        const result = [diffs[0]];
        for (let i = 1; i < diffs.length; i++) {
            const cur = diffs[i];
            const lastResult = result[result.length - 1];
            function shouldJoinDiffs(before, after) {
                const unchangedRange = new OffsetRange(lastResult.seq1Range.endExclusive, cur.seq1Range.start);
                const unchangedLineCount = sequence1.countLinesIn(unchangedRange);
                if (unchangedLineCount > 5 || unchangedRange.length > 500) {
                    return false;
                }
                const unchangedText = sequence1.getText(unchangedRange).trim();
                if (unchangedText.length > 20 || unchangedText.split(/\r\n|\r|\n/).length > 1) {
                    return false;
                }
                const beforeLineCount1 = sequence1.countLinesIn(before.seq1Range);
                const beforeSeq1Length = before.seq1Range.length;
                const beforeLineCount2 = sequence2.countLinesIn(before.seq2Range);
                const beforeSeq2Length = before.seq2Range.length;
                const afterLineCount1 = sequence1.countLinesIn(after.seq1Range);
                const afterSeq1Length = after.seq1Range.length;
                const afterLineCount2 = sequence2.countLinesIn(after.seq2Range);
                const afterSeq2Length = after.seq2Range.length;
                // TODO: Maybe a neural net can be used to derive the result from these numbers
                const max = 2 * 40 + 50;
                function cap(v) {
                    return Math.min(v, max);
                }
                if (Math.pow(Math.pow(cap(beforeLineCount1 * 40 + beforeSeq1Length), 1.5) +
                    Math.pow(cap(beforeLineCount2 * 40 + beforeSeq2Length), 1.5), 1.5) +
                    Math.pow(Math.pow(cap(afterLineCount1 * 40 + afterSeq1Length), 1.5) +
                        Math.pow(cap(afterLineCount2 * 40 + afterSeq2Length), 1.5), 1.5) >
                    (max ** 1.5) ** 1.5 * 1.3) {
                    return true;
                }
                return false;
            }
            const shouldJoin = shouldJoinDiffs(lastResult, cur);
            if (shouldJoin) {
                shouldRepeat = true;
                result[result.length - 1] = result[result.length - 1].join(cur);
            }
            else {
                result.push(cur);
            }
        }
        diffs = result;
    } while (counter++ < 10 && shouldRepeat);
    const newDiffs = [];
    // Remove short suffixes/prefixes
    forEachWithNeighbors(diffs, (prev, cur, next) => {
        let newDiff = cur;
        function shouldMarkAsChanged(text) {
            return (text.length > 0 &&
                text.trim().length <= 3 &&
                cur.seq1Range.length + cur.seq2Range.length > 100);
        }
        const fullRange1 = sequence1.extendToFullLines(cur.seq1Range);
        const prefix = sequence1.getText(new OffsetRange(fullRange1.start, cur.seq1Range.start));
        if (shouldMarkAsChanged(prefix)) {
            newDiff = newDiff.deltaStart(-prefix.length);
        }
        const suffix = sequence1.getText(new OffsetRange(cur.seq1Range.endExclusive, fullRange1.endExclusive));
        if (shouldMarkAsChanged(suffix)) {
            newDiff = newDiff.deltaEnd(suffix.length);
        }
        const availableSpace = SequenceDiff.fromOffsetPairs(prev ? prev.getEndExclusives() : OffsetPair.zero, next ? next.getStarts() : OffsetPair.max);
        const result = newDiff.intersect(availableSpace);
        if (newDiffs.length > 0 &&
            result.getStarts().equals(newDiffs[newDiffs.length - 1].getEndExclusives())) {
            newDiffs[newDiffs.length - 1] = newDiffs[newDiffs.length - 1].join(result);
        }
        else {
            newDiffs.push(result);
        }
    });
    return newDiffs;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGV1cmlzdGljU2VxdWVuY2VPcHRpbWl6YXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9kaWZmL2RlZmF1bHRMaW5lc0RpZmZDb21wdXRlci9oZXVyaXN0aWNTZXF1ZW5jZU9wdGltaXphdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3ZELE9BQU8sRUFBYSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFJbkYsTUFBTSxVQUFVLHFCQUFxQixDQUNwQyxTQUFvQixFQUNwQixTQUFvQixFQUNwQixhQUE2QjtJQUU3QixJQUFJLE1BQU0sR0FBRyxhQUFhLENBQUE7SUFDMUIsTUFBTSxHQUFHLDJCQUEyQixDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDbEUsOERBQThEO0lBQzlELDJFQUEyRTtJQUMzRSxNQUFNLEdBQUcsMkJBQTJCLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUNsRSxNQUFNLEdBQUcsa0JBQWtCLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUN6RCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7R0FXRztBQUNILFNBQVMsMkJBQTJCLENBQ25DLFNBQW9CLEVBQ3BCLFNBQW9CLEVBQ3BCLGFBQTZCO0lBRTdCLElBQUksYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNoQyxPQUFPLGFBQWEsQ0FBQTtJQUNyQixDQUFDO0lBRUQsTUFBTSxNQUFNLEdBQW1CLEVBQUUsQ0FBQTtJQUNqQyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBRTdCLGdGQUFnRjtJQUNoRixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQy9DLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzVDLElBQUksR0FBRyxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUUxQixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDcEQsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUE7WUFDdEUsSUFBSSxDQUFDLENBQUE7WUFDTCxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUM5QixJQUNDLFNBQVMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO29CQUM1QyxTQUFTLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQztvQkFDckQsU0FBUyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7d0JBQzVDLFNBQVMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLEVBQ3BELENBQUM7b0JBQ0YsTUFBSztnQkFDTixDQUFDO1lBQ0YsQ0FBQztZQUNELENBQUMsRUFBRSxDQUFBO1lBRUgsSUFBSSxDQUFDLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQ2xCLGtDQUFrQztnQkFDbEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxZQUFZLENBQzNDLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxFQUNoRixJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFlBQVksR0FBRyxNQUFNLENBQUMsQ0FDaEYsQ0FBQTtnQkFDRCxTQUFRO1lBQ1QsQ0FBQztZQUVELEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEIsQ0FBQztRQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDakIsQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFtQixFQUFFLENBQUE7SUFDbEMsa0VBQWtFO0lBQ2xFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzVDLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDaEMsSUFBSSxHQUFHLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRW5CLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxPQUFPLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNwRCxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQTtZQUN0RSxJQUFJLENBQUMsQ0FBQTtZQUNMLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzdCLElBQ0MsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUM7b0JBQ25GLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLEVBQ2xGLENBQUM7b0JBQ0YsTUFBSztnQkFDTixDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksQ0FBQyxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUNsQixvREFBb0Q7Z0JBQ3BELE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxZQUFZLENBQy9CLElBQUksV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLE1BQU0sRUFBRSxVQUFVLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxFQUNoRixJQUFJLFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxNQUFNLEVBQUUsVUFBVSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FDaEYsQ0FBQTtnQkFDRCxTQUFRO1lBQ1QsQ0FBQztZQUVELElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNYLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ25CLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNsQixDQUFDO0lBRUQsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3ZCLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0lBRUQsT0FBTyxPQUFPLENBQUE7QUFDZixDQUFDO0FBRUQsdURBQXVEO0FBQ3ZELDhCQUE4QjtBQUM5QixzQ0FBc0M7QUFDdEMsS0FBSztBQUNMLHNDQUFzQztBQUV0QywwRkFBMEY7QUFDMUYsaUhBQWlIO0FBQ2pILEtBQUs7QUFDTCxpSEFBaUg7QUFFakgsbURBQW1EO0FBQ25ELDBFQUEwRTtBQUMxRSxLQUFLO0FBQ0wsMEVBQTBFO0FBRTFFLFNBQVMsa0JBQWtCLENBQzFCLFNBQW9CLEVBQ3BCLFNBQW9CLEVBQ3BCLGFBQTZCO0lBRTdCLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNoRSxPQUFPLGFBQWEsQ0FBQTtJQUNyQixDQUFDO0lBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUMvQyxNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFDekQsTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzdCLE1BQU0sUUFBUSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1FBRWhGLE1BQU0sY0FBYyxHQUFHLElBQUksV0FBVyxDQUNyQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNsRCxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FDMUQsQ0FBQTtRQUNELE1BQU0sY0FBYyxHQUFHLElBQUksV0FBVyxDQUNyQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNsRCxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FDMUQsQ0FBQTtRQUVELElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM1QixhQUFhLENBQUMsQ0FBQyxDQUFDLEdBQUcseUJBQXlCLENBQzNDLElBQUksRUFDSixTQUFTLEVBQ1QsU0FBUyxFQUNULGNBQWMsRUFDZCxjQUFjLENBQ2QsQ0FBQTtRQUNGLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkMsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLHlCQUF5QixDQUMzQyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQ1gsU0FBUyxFQUNULFNBQVMsRUFDVCxjQUFjLEVBQ2QsY0FBYyxDQUNkLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDVCxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sYUFBYSxDQUFBO0FBQ3JCLENBQUM7QUFFRCxTQUFTLHlCQUF5QixDQUNqQyxJQUFrQixFQUNsQixTQUFvQixFQUNwQixTQUFvQixFQUNwQixjQUEyQixFQUMzQixjQUEyQjtJQUUzQixNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUEsQ0FBQyxnQ0FBZ0M7SUFFMUQsZ0NBQWdDO0lBQ2hDLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQTtJQUNuQixPQUNDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLFdBQVcsSUFBSSxjQUFjLENBQUMsS0FBSztRQUMxRCxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxXQUFXLElBQUksY0FBYyxDQUFDLEtBQUs7UUFDMUQsU0FBUyxDQUFDLGVBQWUsQ0FDeEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsV0FBVyxFQUNsQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksR0FBRyxXQUFXLENBQ3pDO1FBQ0QsV0FBVyxHQUFHLGFBQWEsRUFDMUIsQ0FBQztRQUNGLFdBQVcsRUFBRSxDQUFBO0lBQ2QsQ0FBQztJQUNELFdBQVcsRUFBRSxDQUFBO0lBRWIsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFBO0lBQ2xCLE9BQ0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsVUFBVSxHQUFHLGNBQWMsQ0FBQyxZQUFZO1FBQy9ELElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLFVBQVUsR0FBRyxjQUFjLENBQUMsWUFBWTtRQUN0RSxTQUFTLENBQUMsZUFBZSxDQUN4QixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxVQUFVLEVBQ2pDLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLFVBQVUsQ0FDeEM7UUFDRCxVQUFVLEdBQUcsYUFBYSxFQUN6QixDQUFDO1FBQ0YsVUFBVSxFQUFFLENBQUE7SUFDYixDQUFDO0lBRUQsSUFBSSxXQUFXLEtBQUssQ0FBQyxJQUFJLFVBQVUsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUMzQyxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxrRUFBa0U7SUFDbEUsc0dBQXNHO0lBRXRHLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtJQUNqQixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNsQix5QkFBeUI7SUFDekIsS0FBSyxJQUFJLEtBQUssR0FBRyxDQUFDLFdBQVcsRUFBRSxLQUFLLElBQUksVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7UUFDN0QsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ3BELE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFBO1FBQ2xFLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUUvQyxNQUFNLEtBQUssR0FDVixTQUFTLENBQUMsZ0JBQWlCLENBQUMsVUFBVSxDQUFDO1lBQ3ZDLFNBQVMsQ0FBQyxnQkFBaUIsQ0FBQyxlQUFlLENBQUM7WUFDNUMsU0FBUyxDQUFDLGdCQUFpQixDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFDcEQsSUFBSSxLQUFLLEdBQUcsU0FBUyxFQUFFLENBQUM7WUFDdkIsU0FBUyxHQUFHLEtBQUssQ0FBQTtZQUNqQixTQUFTLEdBQUcsS0FBSyxDQUFBO1FBQ2xCLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0FBQzdCLENBQUM7QUFFRCxNQUFNLFVBQVUsa0JBQWtCLENBQ2pDLFNBQW9CLEVBQ3BCLFNBQW9CLEVBQ3BCLGFBQTZCO0lBRTdCLE1BQU0sTUFBTSxHQUFtQixFQUFFLENBQUE7SUFDakMsS0FBSyxNQUFNLENBQUMsSUFBSSxhQUFhLEVBQUUsQ0FBQztRQUMvQixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUN0QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2QsU0FBUTtRQUNULENBQUM7UUFFRCxJQUNDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxJQUFJLENBQUM7WUFDcEQsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLElBQUksQ0FBQyxFQUNuRCxDQUFDO1lBQ0YsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxZQUFZLENBQzNDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFDaEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUNoQyxDQUFBO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2YsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUM7QUFFRCxNQUFNLFVBQVUsb0NBQW9DLENBQ25ELFNBQWlDLEVBQ2pDLFNBQWlDLEVBQ2pDLGFBQTZCLEVBQzdCLFVBQWlGLEVBQ2pGLFFBQWlCLEtBQUs7SUFFdEIsTUFBTSxhQUFhLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBRTFFLE1BQU0sVUFBVSxHQUFtQixFQUFFLENBQUE7SUFFckMsSUFBSSxTQUFTLEdBQUcsSUFBSSxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBRXBDLFNBQVMsUUFBUSxDQUFDLElBQWdCLEVBQUUsWUFBMEI7UUFDN0QsSUFBSSxJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDMUUsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLEVBQUUsR0FBRyxVQUFVLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUM5QyxNQUFNLEVBQUUsR0FBRyxVQUFVLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUM5QyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDaEIsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLENBQUMsR0FBRyxJQUFJLFlBQVksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDaEMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUUsQ0FBQTtRQUU1QyxJQUFJLFdBQVcsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQTtRQUM1QyxJQUFJLFdBQVcsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQTtRQUU1Qyw0RkFBNEY7UUFDNUYsc0NBQXNDO1FBRXRDLE9BQU8sYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxNQUFNLElBQUksR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDN0IsTUFBTSxVQUFVLEdBQ2YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNqRixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ2pCLE1BQUs7WUFDTixDQUFDO1lBRUQsTUFBTSxFQUFFLEdBQUcsVUFBVSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3RELE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUN0RCwwRUFBMEU7WUFDMUUsTUFBTSxDQUFDLEdBQUcsSUFBSSxZQUFZLENBQUMsRUFBRyxFQUFFLEVBQUcsQ0FBQyxDQUFBO1lBQ3BDLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFFLENBQUE7WUFFcEMsV0FBVyxJQUFJLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFBO1lBQ3pDLFdBQVcsSUFBSSxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQTtZQUV6QyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUViLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDN0Qsa0RBQWtEO2dCQUNsRCxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDdEIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQUs7WUFDTixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQ0MsQ0FBQyxLQUFLLElBQUksV0FBVyxHQUFHLFdBQVcsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQztZQUM5RSxXQUFXLEdBQUcsV0FBVyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFDOUUsQ0FBQztZQUNGLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkIsQ0FBQztRQUVELFNBQVMsR0FBRyxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsT0FBTyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ2pDLE1BQU0sSUFBSSxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUcsQ0FBQTtRQUNuQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDNUIsU0FBUTtRQUNULENBQUM7UUFDRCxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hDLHlGQUF5RjtRQUN6RixRQUFRLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVELE1BQU0sTUFBTSxHQUFHLGtCQUFrQixDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUM1RCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUMxQixjQUE4QixFQUM5QixjQUE4QjtJQUU5QixNQUFNLE1BQU0sR0FBbUIsRUFBRSxDQUFBO0lBRWpDLE9BQU8sY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUMvRCxNQUFNLEdBQUcsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDN0IsTUFBTSxHQUFHLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTdCLElBQUksSUFBa0IsQ0FBQTtRQUN0QixJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNoRSxJQUFJLEdBQUcsY0FBYyxDQUFDLEtBQUssRUFBRyxDQUFBO1FBQy9CLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxHQUFHLGNBQWMsQ0FBQyxLQUFLLEVBQUcsQ0FBQTtRQUMvQixDQUFDO1FBRUQsSUFDQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUM7WUFDakIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFDdkUsQ0FBQztZQUNGLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNqRSxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDbEIsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUM7QUFFRCxNQUFNLFVBQVUsd0NBQXdDLENBQ3ZELFNBQXVCLEVBQ3ZCLFVBQXdCLEVBQ3hCLGFBQTZCO0lBRTdCLElBQUksS0FBSyxHQUFHLGFBQWEsQ0FBQTtJQUN6QixJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDeEIsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFBO0lBQ2YsSUFBSSxZQUFxQixDQUFBO0lBQ3pCLEdBQUcsQ0FBQztRQUNILFlBQVksR0FBRyxLQUFLLENBQUE7UUFFcEIsTUFBTSxNQUFNLEdBQW1CLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFekMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN2QyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDcEIsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFFNUMsU0FBUyxlQUFlLENBQUMsTUFBb0IsRUFBRSxLQUFtQjtnQkFDakUsTUFBTSxjQUFjLEdBQUcsSUFBSSxXQUFXLENBQ3JDLFVBQVUsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUNqQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FDbkIsQ0FBQTtnQkFFRCxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFBO2dCQUN2RCxNQUFNLHNCQUFzQixHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO2dCQUMvRCxJQUNDLHNCQUFzQixDQUFDLE1BQU0sSUFBSSxDQUFDO29CQUNsQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUM7d0JBQ3JELEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUNwRCxDQUFDO29CQUNGLE9BQU8sSUFBSSxDQUFBO2dCQUNaLENBQUM7Z0JBRUQsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1lBRUQsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUNuRCxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNoQixZQUFZLEdBQUcsSUFBSSxDQUFBO2dCQUNuQixNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDaEUsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDakIsQ0FBQztRQUNGLENBQUM7UUFFRCxLQUFLLEdBQUcsTUFBTSxDQUFBO0lBQ2YsQ0FBQyxRQUFRLE9BQU8sRUFBRSxHQUFHLEVBQUUsSUFBSSxZQUFZLEVBQUM7SUFFeEMsT0FBTyxLQUFLLENBQUE7QUFDYixDQUFDO0FBRUQsTUFBTSxVQUFVLDJDQUEyQyxDQUMxRCxTQUFpQyxFQUNqQyxTQUFpQyxFQUNqQyxhQUE2QjtJQUU3QixJQUFJLEtBQUssR0FBRyxhQUFhLENBQUE7SUFDekIsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3hCLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQTtJQUNmLElBQUksWUFBcUIsQ0FBQTtJQUN6QixHQUFHLENBQUM7UUFDSCxZQUFZLEdBQUcsS0FBSyxDQUFBO1FBRXBCLE1BQU0sTUFBTSxHQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXpDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdkMsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3BCLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBRTVDLFNBQVMsZUFBZSxDQUFDLE1BQW9CLEVBQUUsS0FBbUI7Z0JBQ2pFLE1BQU0sY0FBYyxHQUFHLElBQUksV0FBVyxDQUNyQyxVQUFVLENBQUMsU0FBUyxDQUFDLFlBQVksRUFDakMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQ25CLENBQUE7Z0JBRUQsTUFBTSxrQkFBa0IsR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFBO2dCQUNqRSxJQUFJLGtCQUFrQixHQUFHLENBQUMsSUFBSSxjQUFjLENBQUMsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDO29CQUMzRCxPQUFPLEtBQUssQ0FBQTtnQkFDYixDQUFDO2dCQUVELE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBQzlELElBQUksYUFBYSxDQUFDLE1BQU0sR0FBRyxFQUFFLElBQUksYUFBYSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQy9FLE9BQU8sS0FBSyxDQUFBO2dCQUNiLENBQUM7Z0JBRUQsTUFBTSxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDakUsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQTtnQkFDaEQsTUFBTSxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDakUsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQTtnQkFFaEQsTUFBTSxlQUFlLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQy9ELE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFBO2dCQUM5QyxNQUFNLGVBQWUsR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDL0QsTUFBTSxlQUFlLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUE7Z0JBRTlDLCtFQUErRTtnQkFFL0UsTUFBTSxHQUFHLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUE7Z0JBQ3ZCLFNBQVMsR0FBRyxDQUFDLENBQVM7b0JBQ3JCLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0JBQ3hCLENBQUM7Z0JBRUQsSUFDQyxJQUFJLENBQUMsR0FBRyxDQUNQLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLGdCQUFnQixHQUFHLEVBQUUsR0FBRyxnQkFBZ0IsQ0FBQyxFQUFFLEdBQUcsQ0FBQztvQkFDM0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEdBQUcsRUFBRSxHQUFHLGdCQUFnQixDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQzdELEdBQUcsQ0FDSDtvQkFDQSxJQUFJLENBQUMsR0FBRyxDQUNQLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLGVBQWUsR0FBRyxFQUFFLEdBQUcsZUFBZSxDQUFDLEVBQUUsR0FBRyxDQUFDO3dCQUN6RCxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEdBQUcsRUFBRSxHQUFHLGVBQWUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUMzRCxHQUFHLENBQ0g7b0JBQ0YsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsRUFDeEIsQ0FBQztvQkFDRixPQUFPLElBQUksQ0FBQTtnQkFDWixDQUFDO2dCQUNELE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztZQUVELE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDbkQsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDaEIsWUFBWSxHQUFHLElBQUksQ0FBQTtnQkFDbkIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2hFLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2pCLENBQUM7UUFDRixDQUFDO1FBRUQsS0FBSyxHQUFHLE1BQU0sQ0FBQTtJQUNmLENBQUMsUUFBUSxPQUFPLEVBQUUsR0FBRyxFQUFFLElBQUksWUFBWSxFQUFDO0lBRXhDLE1BQU0sUUFBUSxHQUFtQixFQUFFLENBQUE7SUFFbkMsaUNBQWlDO0lBQ2pDLG9CQUFvQixDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDL0MsSUFBSSxPQUFPLEdBQUcsR0FBRyxDQUFBO1FBRWpCLFNBQVMsbUJBQW1CLENBQUMsSUFBWTtZQUN4QyxPQUFPLENBQ04sSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDO2dCQUNmLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLElBQUksQ0FBQztnQkFDdkIsR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUNqRCxDQUFBO1FBQ0YsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDN0QsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUN4RixJQUFJLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDakMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDN0MsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQy9CLElBQUksV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FDcEUsQ0FBQTtRQUNELElBQUksbUJBQW1CLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNqQyxPQUFPLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDMUMsQ0FBQztRQUVELE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxlQUFlLENBQ2xELElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQ2hELElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUN4QyxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUUsQ0FBQTtRQUNqRCxJQUNDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUNuQixNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLENBQUMsRUFDMUUsQ0FBQztZQUNGLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMzRSxDQUFDO2FBQU0sQ0FBQztZQUNQLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdEIsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsT0FBTyxRQUFRLENBQUE7QUFDaEIsQ0FBQyJ9