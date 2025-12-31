/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from '../../../../base/common/arrays.js';
import { assertFn } from '../../../../base/common/assert.js';
import { LineRange } from '../../core/lineRange.js';
import { OffsetRange } from '../../core/offsetRange.js';
import { Range } from '../../core/range.js';
import { ArrayText } from '../../core/textEdit.js';
import { LinesDiff, MovedText, } from '../linesDiffComputer.js';
import { DetailedLineRangeMapping, LineRangeMapping, lineRangeMappingFromRangeMappings, RangeMapping, } from '../rangeMapping.js';
import { DateTimeout, InfiniteTimeout, SequenceDiff } from './algorithms/diffAlgorithm.js';
import { DynamicProgrammingDiffing } from './algorithms/dynamicProgrammingDiffing.js';
import { MyersDiffAlgorithm } from './algorithms/myersDiffAlgorithm.js';
import { computeMovedLines } from './computeMovedLines.js';
import { extendDiffsToEntireWordIfAppropriate, optimizeSequenceDiffs, removeShortMatches, removeVeryShortMatchingLinesBetweenDiffs, removeVeryShortMatchingTextBetweenLongDiffs, } from './heuristicSequenceOptimizations.js';
import { LineSequence } from './lineSequence.js';
import { LinesSliceCharSequence } from './linesSliceCharSequence.js';
export class DefaultLinesDiffComputer {
    constructor() {
        this.dynamicProgrammingDiffing = new DynamicProgrammingDiffing();
        this.myersDiffingAlgorithm = new MyersDiffAlgorithm();
    }
    computeDiff(originalLines, modifiedLines, options) {
        if (originalLines.length <= 1 && equals(originalLines, modifiedLines, (a, b) => a === b)) {
            return new LinesDiff([], [], false);
        }
        if ((originalLines.length === 1 && originalLines[0].length === 0) ||
            (modifiedLines.length === 1 && modifiedLines[0].length === 0)) {
            return new LinesDiff([
                new DetailedLineRangeMapping(new LineRange(1, originalLines.length + 1), new LineRange(1, modifiedLines.length + 1), [
                    new RangeMapping(new Range(1, 1, originalLines.length, originalLines[originalLines.length - 1].length + 1), new Range(1, 1, modifiedLines.length, modifiedLines[modifiedLines.length - 1].length + 1)),
                ]),
            ], [], false);
        }
        const timeout = options.maxComputationTimeMs === 0
            ? InfiniteTimeout.instance
            : new DateTimeout(options.maxComputationTimeMs);
        const considerWhitespaceChanges = !options.ignoreTrimWhitespace;
        const perfectHashes = new Map();
        function getOrCreateHash(text) {
            let hash = perfectHashes.get(text);
            if (hash === undefined) {
                hash = perfectHashes.size;
                perfectHashes.set(text, hash);
            }
            return hash;
        }
        const originalLinesHashes = originalLines.map((l) => getOrCreateHash(l.trim()));
        const modifiedLinesHashes = modifiedLines.map((l) => getOrCreateHash(l.trim()));
        const sequence1 = new LineSequence(originalLinesHashes, originalLines);
        const sequence2 = new LineSequence(modifiedLinesHashes, modifiedLines);
        const lineAlignmentResult = (() => {
            if (sequence1.length + sequence2.length < 1700) {
                // Use the improved algorithm for small files
                return this.dynamicProgrammingDiffing.compute(sequence1, sequence2, timeout, (offset1, offset2) => originalLines[offset1] === modifiedLines[offset2]
                    ? modifiedLines[offset2].length === 0
                        ? 0.1
                        : 1 + Math.log(1 + modifiedLines[offset2].length)
                    : 0.99);
            }
            return this.myersDiffingAlgorithm.compute(sequence1, sequence2, timeout);
        })();
        let lineAlignments = lineAlignmentResult.diffs;
        let hitTimeout = lineAlignmentResult.hitTimeout;
        lineAlignments = optimizeSequenceDiffs(sequence1, sequence2, lineAlignments);
        lineAlignments = removeVeryShortMatchingLinesBetweenDiffs(sequence1, sequence2, lineAlignments);
        const alignments = [];
        const scanForWhitespaceChanges = (equalLinesCount) => {
            if (!considerWhitespaceChanges) {
                return;
            }
            for (let i = 0; i < equalLinesCount; i++) {
                const seq1Offset = seq1LastStart + i;
                const seq2Offset = seq2LastStart + i;
                if (originalLines[seq1Offset] !== modifiedLines[seq2Offset]) {
                    // This is because of whitespace changes, diff these lines
                    const characterDiffs = this.refineDiff(originalLines, modifiedLines, new SequenceDiff(new OffsetRange(seq1Offset, seq1Offset + 1), new OffsetRange(seq2Offset, seq2Offset + 1)), timeout, considerWhitespaceChanges, options);
                    for (const a of characterDiffs.mappings) {
                        alignments.push(a);
                    }
                    if (characterDiffs.hitTimeout) {
                        hitTimeout = true;
                    }
                }
            }
        };
        let seq1LastStart = 0;
        let seq2LastStart = 0;
        for (const diff of lineAlignments) {
            assertFn(() => diff.seq1Range.start - seq1LastStart === diff.seq2Range.start - seq2LastStart);
            const equalLinesCount = diff.seq1Range.start - seq1LastStart;
            scanForWhitespaceChanges(equalLinesCount);
            seq1LastStart = diff.seq1Range.endExclusive;
            seq2LastStart = diff.seq2Range.endExclusive;
            const characterDiffs = this.refineDiff(originalLines, modifiedLines, diff, timeout, considerWhitespaceChanges, options);
            if (characterDiffs.hitTimeout) {
                hitTimeout = true;
            }
            for (const a of characterDiffs.mappings) {
                alignments.push(a);
            }
        }
        scanForWhitespaceChanges(originalLines.length - seq1LastStart);
        const changes = lineRangeMappingFromRangeMappings(alignments, new ArrayText(originalLines), new ArrayText(modifiedLines));
        let moves = [];
        if (options.computeMoves) {
            moves = this.computeMoves(changes, originalLines, modifiedLines, originalLinesHashes, modifiedLinesHashes, timeout, considerWhitespaceChanges, options);
        }
        // Make sure all ranges are valid
        assertFn(() => {
            function validatePosition(pos, lines) {
                if (pos.lineNumber < 1 || pos.lineNumber > lines.length) {
                    return false;
                }
                const line = lines[pos.lineNumber - 1];
                if (pos.column < 1 || pos.column > line.length + 1) {
                    return false;
                }
                return true;
            }
            function validateRange(range, lines) {
                if (range.startLineNumber < 1 || range.startLineNumber > lines.length + 1) {
                    return false;
                }
                if (range.endLineNumberExclusive < 1 || range.endLineNumberExclusive > lines.length + 1) {
                    return false;
                }
                return true;
            }
            for (const c of changes) {
                if (!c.innerChanges) {
                    return false;
                }
                for (const ic of c.innerChanges) {
                    const valid = validatePosition(ic.modifiedRange.getStartPosition(), modifiedLines) &&
                        validatePosition(ic.modifiedRange.getEndPosition(), modifiedLines) &&
                        validatePosition(ic.originalRange.getStartPosition(), originalLines) &&
                        validatePosition(ic.originalRange.getEndPosition(), originalLines);
                    if (!valid) {
                        return false;
                    }
                }
                if (!validateRange(c.modified, modifiedLines) ||
                    !validateRange(c.original, originalLines)) {
                    return false;
                }
            }
            return true;
        });
        return new LinesDiff(changes, moves, hitTimeout);
    }
    computeMoves(changes, originalLines, modifiedLines, hashedOriginalLines, hashedModifiedLines, timeout, considerWhitespaceChanges, options) {
        const moves = computeMovedLines(changes, originalLines, modifiedLines, hashedOriginalLines, hashedModifiedLines, timeout);
        const movesWithDiffs = moves.map((m) => {
            const moveChanges = this.refineDiff(originalLines, modifiedLines, new SequenceDiff(m.original.toOffsetRange(), m.modified.toOffsetRange()), timeout, considerWhitespaceChanges, options);
            const mappings = lineRangeMappingFromRangeMappings(moveChanges.mappings, new ArrayText(originalLines), new ArrayText(modifiedLines), true);
            return new MovedText(m, mappings);
        });
        return movesWithDiffs;
    }
    refineDiff(originalLines, modifiedLines, diff, timeout, considerWhitespaceChanges, options) {
        const lineRangeMapping = toLineRangeMapping(diff);
        const rangeMapping = lineRangeMapping.toRangeMapping2(originalLines, modifiedLines);
        const slice1 = new LinesSliceCharSequence(originalLines, rangeMapping.originalRange, considerWhitespaceChanges);
        const slice2 = new LinesSliceCharSequence(modifiedLines, rangeMapping.modifiedRange, considerWhitespaceChanges);
        const diffResult = slice1.length + slice2.length < 500
            ? this.dynamicProgrammingDiffing.compute(slice1, slice2, timeout)
            : this.myersDiffingAlgorithm.compute(slice1, slice2, timeout);
        const check = false;
        let diffs = diffResult.diffs;
        if (check) {
            SequenceDiff.assertSorted(diffs);
        }
        diffs = optimizeSequenceDiffs(slice1, slice2, diffs);
        if (check) {
            SequenceDiff.assertSorted(diffs);
        }
        diffs = extendDiffsToEntireWordIfAppropriate(slice1, slice2, diffs, (seq, idx) => seq.findWordContaining(idx));
        if (check) {
            SequenceDiff.assertSorted(diffs);
        }
        if (options.extendToSubwords) {
            diffs = extendDiffsToEntireWordIfAppropriate(slice1, slice2, diffs, (seq, idx) => seq.findSubWordContaining(idx), true);
            if (check) {
                SequenceDiff.assertSorted(diffs);
            }
        }
        diffs = removeShortMatches(slice1, slice2, diffs);
        if (check) {
            SequenceDiff.assertSorted(diffs);
        }
        diffs = removeVeryShortMatchingTextBetweenLongDiffs(slice1, slice2, diffs);
        if (check) {
            SequenceDiff.assertSorted(diffs);
        }
        const result = diffs.map((d) => new RangeMapping(slice1.translateRange(d.seq1Range), slice2.translateRange(d.seq2Range)));
        if (check) {
            RangeMapping.assertSorted(result);
        }
        // Assert: result applied on original should be the same as diff applied to original
        return {
            mappings: result,
            hitTimeout: diffResult.hitTimeout,
        };
    }
}
function toLineRangeMapping(sequenceDiff) {
    return new LineRangeMapping(new LineRange(sequenceDiff.seq1Range.start + 1, sequenceDiff.seq1Range.endExclusive + 1), new LineRange(sequenceDiff.seq2Range.start + 1, sequenceDiff.seq2Range.endExclusive + 1));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdExpbmVzRGlmZkNvbXB1dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9kaWZmL2RlZmF1bHRMaW5lc0RpZmZDb21wdXRlci9kZWZhdWx0TGluZXNEaWZmQ29tcHV0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDbkQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBRXZELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDbEQsT0FBTyxFQUdOLFNBQVMsRUFDVCxTQUFTLEdBQ1QsTUFBTSx5QkFBeUIsQ0FBQTtBQUNoQyxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLGdCQUFnQixFQUNoQixpQ0FBaUMsRUFDakMsWUFBWSxHQUNaLE1BQU0sb0JBQW9CLENBQUE7QUFDM0IsT0FBTyxFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQVksWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDcEcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDckYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDdkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDMUQsT0FBTyxFQUNOLG9DQUFvQyxFQUNwQyxxQkFBcUIsRUFDckIsa0JBQWtCLEVBQ2xCLHdDQUF3QyxFQUN4QywyQ0FB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