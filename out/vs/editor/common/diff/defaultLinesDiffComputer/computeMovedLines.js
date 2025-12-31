/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SequenceDiff } from './algorithms/diffAlgorithm.js';
import { LineRangeMapping } from '../rangeMapping.js';
import { pushMany, compareBy, numberComparator, reverseOrder, } from '../../../../base/common/arrays.js';
import { MonotonousArray, findLastMonotonous } from '../../../../base/common/arraysFind.js';
import { SetMap } from '../../../../base/common/map.js';
import { LineRange, LineRangeSet } from '../../core/lineRange.js';
import { LinesSliceCharSequence } from './linesSliceCharSequence.js';
import { LineRangeFragment, isSpace } from './utils.js';
import { MyersDiffAlgorithm } from './algorithms/myersDiffAlgorithm.js';
import { Range } from '../../core/range.js';
export function computeMovedLines(changes, originalLines, modifiedLines, hashedOriginalLines, hashedModifiedLines, timeout) {
    let { moves, excludedChanges } = computeMovesFromSimpleDeletionsToSimpleInsertions(changes, originalLines, modifiedLines, timeout);
    if (!timeout.isValid()) {
        return [];
    }
    const filteredChanges = changes.filter((c) => !excludedChanges.has(c));
    const unchangedMoves = computeUnchangedMoves(filteredChanges, hashedOriginalLines, hashedModifiedLines, originalLines, modifiedLines, timeout);
    pushMany(moves, unchangedMoves);
    moves = joinCloseConsecutiveMoves(moves);
    // Ignore too short moves
    moves = moves.filter((current) => {
        const lines = current.original
            .toOffsetRange()
            .slice(originalLines)
            .map((l) => l.trim());
        const originalText = lines.join('\n');
        return originalText.length >= 15 && countWhere(lines, (l) => l.length >= 2) >= 2;
    });
    moves = removeMovesInSameDiff(changes, moves);
    return moves;
}
function countWhere(arr, predicate) {
    let count = 0;
    for (const t of arr) {
        if (predicate(t)) {
            count++;
        }
    }
    return count;
}
function computeMovesFromSimpleDeletionsToSimpleInsertions(changes, originalLines, modifiedLines, timeout) {
    const moves = [];
    const deletions = changes
        .filter((c) => c.modified.isEmpty && c.original.length >= 3)
        .map((d) => new LineRangeFragment(d.original, originalLines, d));
    const insertions = new Set(changes
        .filter((c) => c.original.isEmpty && c.modified.length >= 3)
        .map((d) => new LineRangeFragment(d.modified, modifiedLines, d)));
    const excludedChanges = new Set();
    for (const deletion of deletions) {
        let highestSimilarity = -1;
        let best;
        for (const insertion of insertions) {
            const similarity = deletion.computeSimilarity(insertion);
            if (similarity > highestSimilarity) {
                highestSimilarity = similarity;
                best = insertion;
            }
        }
        if (highestSimilarity > 0.9 && best) {
            insertions.delete(best);
            moves.push(new LineRangeMapping(deletion.range, best.range));
            excludedChanges.add(deletion.source);
            excludedChanges.add(best.source);
        }
        if (!timeout.isValid()) {
            return { moves, excludedChanges };
        }
    }
    return { moves, excludedChanges };
}
function computeUnchangedMoves(changes, hashedOriginalLines, hashedModifiedLines, originalLines, modifiedLines, timeout) {
    const moves = [];
    const original3LineHashes = new SetMap();
    for (const change of changes) {
        for (let i = change.original.startLineNumber; i < change.original.endLineNumberExclusive - 2; i++) {
            const key = `${hashedOriginalLines[i - 1]}:${hashedOriginalLines[i + 1 - 1]}:${hashedOriginalLines[i + 2 - 1]}`;
            original3LineHashes.add(key, { range: new LineRange(i, i + 3) });
        }
    }
    const possibleMappings = [];
    changes.sort(compareBy((c) => c.modified.startLineNumber, numberComparator));
    for (const change of changes) {
        let lastMappings = [];
        for (let i = change.modified.startLineNumber; i < change.modified.endLineNumberExclusive - 2; i++) {
            const key = `${hashedModifiedLines[i - 1]}:${hashedModifiedLines[i + 1 - 1]}:${hashedModifiedLines[i + 2 - 1]}`;
            const currentModifiedRange = new LineRange(i, i + 3);
            const nextMappings = [];
            original3LineHashes.forEach(key, ({ range }) => {
                for (const lastMapping of lastMappings) {
                    // does this match extend some last match?
                    if (lastMapping.originalLineRange.endLineNumberExclusive + 1 ===
                        range.endLineNumberExclusive &&
                        lastMapping.modifiedLineRange.endLineNumberExclusive + 1 ===
                            currentModifiedRange.endLineNumberExclusive) {
                        lastMapping.originalLineRange = new LineRange(lastMapping.originalLineRange.startLineNumber, range.endLineNumberExclusive);
                        lastMapping.modifiedLineRange = new LineRange(lastMapping.modifiedLineRange.startLineNumber, currentModifiedRange.endLineNumberExclusive);
                        nextMappings.push(lastMapping);
                        return;
                    }
                }
                const mapping = {
                    modifiedLineRange: currentModifiedRange,
                    originalLineRange: range,
                };
                possibleMappings.push(mapping);
                nextMappings.push(mapping);
            });
            lastMappings = nextMappings;
        }
        if (!timeout.isValid()) {
            return [];
        }
    }
    possibleMappings.sort(reverseOrder(compareBy((m) => m.modifiedLineRange.length, numberComparator)));
    const modifiedSet = new LineRangeSet();
    const originalSet = new LineRangeSet();
    for (const mapping of possibleMappings) {
        const diffOrigToMod = mapping.modifiedLineRange.startLineNumber - mapping.originalLineRange.startLineNumber;
        const modifiedSections = modifiedSet.subtractFrom(mapping.modifiedLineRange);
        const originalTranslatedSections = originalSet
            .subtractFrom(mapping.originalLineRange)
            .getWithDelta(diffOrigToMod);
        const modifiedIntersectedSections = modifiedSections.getIntersection(originalTranslatedSections);
        for (const s of modifiedIntersectedSections.ranges) {
            if (s.length < 3) {
                continue;
            }
            const modifiedLineRange = s;
            const originalLineRange = s.delta(-diffOrigToMod);
            moves.push(new LineRangeMapping(originalLineRange, modifiedLineRange));
            modifiedSet.addRange(modifiedLineRange);
            originalSet.addRange(originalLineRange);
        }
    }
    moves.sort(compareBy((m) => m.original.startLineNumber, numberComparator));
    const monotonousChanges = new MonotonousArray(changes);
    for (let i = 0; i < moves.length; i++) {
        const move = moves[i];
        const firstTouchingChangeOrig = monotonousChanges.findLastMonotonous((c) => c.original.startLineNumber <= move.original.startLineNumber);
        const firstTouchingChangeMod = findLastMonotonous(changes, (c) => c.modified.startLineNumber <= move.modified.startLineNumber);
        const linesAbove = Math.max(move.original.startLineNumber - firstTouchingChangeOrig.original.startLineNumber, move.modified.startLineNumber - firstTouchingChangeMod.modified.startLineNumber);
        const lastTouchingChangeOrig = monotonousChanges.findLastMonotonous((c) => c.original.startLineNumber < move.original.endLineNumberExclusive);
        const lastTouchingChangeMod = findLastMonotonous(changes, (c) => c.modified.startLineNumber < move.modified.endLineNumberExclusive);
        const linesBelow = Math.max(lastTouchingChangeOrig.original.endLineNumberExclusive - move.original.endLineNumberExclusive, lastTouchingChangeMod.modified.endLineNumberExclusive - move.modified.endLineNumberExclusive);
        let extendToTop;
        for (extendToTop = 0; extendToTop < linesAbove; extendToTop++) {
            const origLine = move.original.startLineNumber - extendToTop - 1;
            const modLine = move.modified.startLineNumber - extendToTop - 1;
            if (origLine > originalLines.length || modLine > modifiedLines.length) {
                break;
            }
            if (modifiedSet.contains(modLine) || originalSet.contains(origLine)) {
                break;
            }
            if (!areLinesSimilar(originalLines[origLine - 1], modifiedLines[modLine - 1], timeout)) {
                break;
            }
        }
        if (extendToTop > 0) {
            originalSet.addRange(new LineRange(move.original.startLineNumber - extendToTop, move.original.startLineNumber));
            modifiedSet.addRange(new LineRange(move.modified.startLineNumber - extendToTop, move.modified.startLineNumber));
        }
        let extendToBottom;
        for (extendToBottom = 0; extendToBottom < linesBelow; extendToBottom++) {
            const origLine = move.original.endLineNumberExclusive + extendToBottom;
            const modLine = move.modified.endLineNumberExclusive + extendToBottom;
            if (origLine > originalLines.length || modLine > modifiedLines.length) {
                break;
            }
            if (modifiedSet.contains(modLine) || originalSet.contains(origLine)) {
                break;
            }
            if (!areLinesSimilar(originalLines[origLine - 1], modifiedLines[modLine - 1], timeout)) {
                break;
            }
        }
        if (extendToBottom > 0) {
            originalSet.addRange(new LineRange(move.original.endLineNumberExclusive, move.original.endLineNumberExclusive + extendToBottom));
            modifiedSet.addRange(new LineRange(move.modified.endLineNumberExclusive, move.modified.endLineNumberExclusive + extendToBottom));
        }
        if (extendToTop > 0 || extendToBottom > 0) {
            moves[i] = new LineRangeMapping(new LineRange(move.original.startLineNumber - extendToTop, move.original.endLineNumberExclusive + extendToBottom), new LineRange(move.modified.startLineNumber - extendToTop, move.modified.endLineNumberExclusive + extendToBottom));
        }
    }
    return moves;
}
function areLinesSimilar(line1, line2, timeout) {
    if (line1.trim() === line2.trim()) {
        return true;
    }
    if (line1.length > 300 && line2.length > 300) {
        return false;
    }
    const myersDiffingAlgorithm = new MyersDiffAlgorithm();
    const result = myersDiffingAlgorithm.compute(new LinesSliceCharSequence([line1], new Range(1, 1, 1, line1.length), false), new LinesSliceCharSequence([line2], new Range(1, 1, 1, line2.length), false), timeout);
    let commonNonSpaceCharCount = 0;
    const inverted = SequenceDiff.invert(result.diffs, line1.length);
    for (const seq of inverted) {
        seq.seq1Range.forEach((idx) => {
            if (!isSpace(line1.charCodeAt(idx))) {
                commonNonSpaceCharCount++;
            }
        });
    }
    function countNonWsChars(str) {
        let count = 0;
        for (let i = 0; i < line1.length; i++) {
            if (!isSpace(str.charCodeAt(i))) {
                count++;
            }
        }
        return count;
    }
    const longerLineLength = countNonWsChars(line1.length > line2.length ? line1 : line2);
    const r = commonNonSpaceCharCount / longerLineLength > 0.6 && longerLineLength > 10;
    return r;
}
function joinCloseConsecutiveMoves(moves) {
    if (moves.length === 0) {
        return moves;
    }
    moves.sort(compareBy((m) => m.original.startLineNumber, numberComparator));
    const result = [moves[0]];
    for (let i = 1; i < moves.length; i++) {
        const last = result[result.length - 1];
        const current = moves[i];
        const originalDist = current.original.startLineNumber - last.original.endLineNumberExclusive;
        const modifiedDist = current.modified.startLineNumber - last.modified.endLineNumberExclusive;
        const currentMoveAfterLast = originalDist >= 0 && modifiedDist >= 0;
        if (currentMoveAfterLast && originalDist + modifiedDist <= 2) {
            result[result.length - 1] = last.join(current);
            continue;
        }
        result.push(current);
    }
    return result;
}
function removeMovesInSameDiff(changes, moves) {
    const changesMonotonous = new MonotonousArray(changes);
    moves = moves.filter((m) => {
        const diffBeforeEndOfMoveOriginal = changesMonotonous.findLastMonotonous((c) => c.original.startLineNumber < m.original.endLineNumberExclusive) || new LineRangeMapping(new LineRange(1, 1), new LineRange(1, 1));
        const diffBeforeEndOfMoveModified = findLastMonotonous(changes, (c) => c.modified.startLineNumber < m.modified.endLineNumberExclusive);
        const differentDiffs = diffBeforeEndOfMoveOriginal !== diffBeforeEndOfMoveModified;
        return differentDiffs;
    });
    return moves;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHV0ZU1vdmVkTGluZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2RpZmYvZGVmYXVsdExpbmVzRGlmZkNvbXB1dGVyL2NvbXB1dGVNb3ZlZExpbmVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBWSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0RSxPQUFPLEVBQTRCLGdCQUFnQixFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDL0UsT0FBTyxFQUNOLFFBQVEsRUFDUixTQUFTLEVBQ1QsZ0JBQWdCLEVBQ2hCLFlBQVksR0FDWixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMzRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUUzQyxNQUFNLFVBQVUsaUJBQWlCLENBQ2hDLE9BQW1DLEVBQ25DLGFBQXVCLEVBQ3ZCLGFBQXVCLEVBQ3ZCLG1CQUE2QixFQUM3QixtQkFBNkIsRUFDN0IsT0FBaUI7SUFFakIsSUFBSSxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsR0FBRyxpREFBaUQsQ0FDakYsT0FBTyxFQUNQLGFBQWEsRUFDYixhQUFh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