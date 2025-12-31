/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy, numberComparator } from '../../../../../base/common/arrays.js';
import { findLast } from '../../../../../base/common/arraysFind.js';
import { assertFn, checkAdjacentItems } from '../../../../../base/common/assert.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { concatArrays } from '../utils.js';
import { LineRangeEdit } from './editing.js';
import { LineRange } from './lineRange.js';
import { addLength, lengthBetweenPositions, rangeContainsPosition, rangeIsBeforeOrTouching, } from './rangeUtils.js';
/**
 * Represents a mapping of an input line range to an output line range.
 */
export class LineRangeMapping {
    static join(mappings) {
        return mappings.reduce((acc, cur) => (acc ? acc.join(cur) : cur), undefined);
    }
    constructor(inputRange, outputRange) {
        this.inputRange = inputRange;
        this.outputRange = outputRange;
    }
    extendInputRange(extendedInputRange) {
        if (!extendedInputRange.containsRange(this.inputRange)) {
            throw new BugIndicatingError();
        }
        const startDelta = extendedInputRange.startLineNumber - this.inputRange.startLineNumber;
        const endDelta = extendedInputRange.endLineNumberExclusive - this.inputRange.endLineNumberExclusive;
        return new LineRangeMapping(extendedInputRange, new LineRange(this.outputRange.startLineNumber + startDelta, this.outputRange.lineCount - startDelta + endDelta));
    }
    join(other) {
        return new LineRangeMapping(this.inputRange.join(other.inputRange), this.outputRange.join(other.outputRange));
    }
    get resultingDeltaFromOriginalToModified() {
        return this.outputRange.endLineNumberExclusive - this.inputRange.endLineNumberExclusive;
    }
    toString() {
        return `${this.inputRange.toString()} -> ${this.outputRange.toString()}`;
    }
    addOutputLineDelta(delta) {
        return new LineRangeMapping(this.inputRange, this.outputRange.delta(delta));
    }
    addInputLineDelta(delta) {
        return new LineRangeMapping(this.inputRange.delta(delta), this.outputRange);
    }
    reverse() {
        return new LineRangeMapping(this.outputRange, this.inputRange);
    }
}
/**
 * Represents a total monotonous mapping of line ranges in one document to another document.
 */
export class DocumentLineRangeMap {
    static betweenOutputs(inputToOutput1, inputToOutput2, inputLineCount) {
        const alignments = MappingAlignment.compute(inputToOutput1, inputToOutput2);
        const mappings = alignments.map((m) => new LineRangeMapping(m.output1Range, m.output2Range));
        return new DocumentLineRangeMap(mappings, inputLineCount);
    }
    constructor(
    /**
     * The line range mappings that define this document mapping.
     * The space between two input ranges must equal the space between two output ranges.
     * These holes act as dense sequence of 1:1 line mappings.
     */
    lineRangeMappings, inputLineCount) {
        this.lineRangeMappings = lineRangeMappings;
        this.inputLineCount = inputLineCount;
        assertFn(() => {
            return checkAdjacentItems(lineRangeMappings, (m1, m2) => m1.inputRange.isBefore(m2.inputRange) &&
                m1.outputRange.isBefore(m2.outputRange) &&
                m2.inputRange.startLineNumber - m1.inputRange.endLineNumberExclusive ===
                    m2.outputRange.startLineNumber - m1.outputRange.endLineNumberExclusive);
        });
    }
    project(lineNumber) {
        const lastBefore = findLast(this.lineRangeMappings, (r) => r.inputRange.startLineNumber <= lineNumber);
        if (!lastBefore) {
            return new LineRangeMapping(new LineRange(lineNumber, 1), new LineRange(lineNumber, 1));
        }
        if (lastBefore.inputRange.contains(lineNumber)) {
            return lastBefore;
        }
        const containingRange = new LineRange(lineNumber, 1);
        const mappedRange = new LineRange(lineNumber +
            lastBefore.outputRange.endLineNumberExclusive -
            lastBefore.inputRange.endLineNumberExclusive, 1);
        return new LineRangeMapping(containingRange, mappedRange);
    }
    get outputLineCount() {
        const last = this.lineRangeMappings.at(-1);
        const diff = last
            ? last.outputRange.endLineNumberExclusive - last.inputRange.endLineNumberExclusive
            : 0;
        return this.inputLineCount + diff;
    }
    reverse() {
        return new DocumentLineRangeMap(this.lineRangeMappings.map((r) => r.reverse()), this.outputLineCount);
    }
}
/**
 * Aligns two mappings with a common input range.
 */
export class MappingAlignment {
    static compute(fromInputToOutput1, fromInputToOutput2) {
        const compareByStartLineNumber = compareBy((d) => d.inputRange.startLineNumber, numberComparator);
        const combinedDiffs = concatArrays(fromInputToOutput1.map((diff) => ({ source: 0, diff })), fromInputToOutput2.map((diff) => ({ source: 1, diff }))).sort(compareBy((d) => d.diff, compareByStartLineNumber));
        const currentDiffs = [new Array(), new Array()];
        const deltaFromBaseToInput = [0, 0];
        const alignments = new Array();
        function pushAndReset(inputRange) {
            const mapping1 = LineRangeMapping.join(currentDiffs[0]) ||
                new LineRangeMapping(inputRange, inputRange.delta(deltaFromBaseToInput[0]));
            const mapping2 = LineRangeMapping.join(currentDiffs[1]) ||
                new LineRangeMapping(inputRange, inputRange.delta(deltaFromBaseToInput[1]));
            alignments.push(new MappingAlignment(currentInputRange, mapping1.extendInputRange(currentInputRange).outputRange, currentDiffs[0], mapping2.extendInputRange(currentInputRange).outputRange, currentDiffs[1]));
            currentDiffs[0] = [];
            currentDiffs[1] = [];
        }
        let currentInputRange;
        for (const diff of combinedDiffs) {
            const range = diff.diff.inputRange;
            if (currentInputRange && !currentInputRange.touches(range)) {
                pushAndReset(currentInputRange);
                currentInputRange = undefined;
            }
            deltaFromBaseToInput[diff.source] = diff.diff.resultingDeltaFromOriginalToModified;
            currentInputRange = currentInputRange ? currentInputRange.join(range) : range;
            currentDiffs[diff.source].push(diff.diff);
        }
        if (currentInputRange) {
            pushAndReset(currentInputRange);
        }
        return alignments;
    }
    constructor(inputRange, output1Range, output1LineMappings, output2Range, output2LineMappings) {
        this.inputRange = inputRange;
        this.output1Range = output1Range;
        this.output1LineMappings = output1LineMappings;
        this.output2Range = output2Range;
        this.output2LineMappings = output2LineMappings;
    }
    toString() {
        return `${this.output1Range} <- ${this.inputRange} -> ${this.output2Range}`;
    }
}
/**
 * A line range mapping with inner range mappings.
 */
export class DetailedLineRangeMapping extends LineRangeMapping {
    static join(mappings) {
        return mappings.reduce((acc, cur) => (acc ? acc.join(cur) : cur), undefined);
    }
    constructor(inputRange, inputTextModel, outputRange, outputTextModel, rangeMappings) {
        super(inputRange, outputRange);
        this.inputTextModel = inputTextModel;
        this.outputTextModel = outputTextModel;
        this.rangeMappings = rangeMappings || [
            new RangeMapping(this.inputRange.toRange(), this.outputRange.toRange()),
        ];
    }
    addOutputLineDelta(delta) {
        return new DetailedLineRangeMapping(this.inputRange, this.inputTextModel, this.outputRange.delta(delta), this.outputTextModel, this.rangeMappings.map((d) => d.addOutputLineDelta(delta)));
    }
    addInputLineDelta(delta) {
        return new DetailedLineRangeMapping(this.inputRange.delta(delta), this.inputTextModel, this.outputRange, this.outputTextModel, this.rangeMappings.map((d) => d.addInputLineDelta(delta)));
    }
    join(other) {
        return new DetailedLineRangeMapping(this.inputRange.join(other.inputRange), this.inputTextModel, this.outputRange.join(other.outputRange), this.outputTextModel);
    }
    getLineEdit() {
        return new LineRangeEdit(this.inputRange, this.getOutputLines());
    }
    getReverseLineEdit() {
        return new LineRangeEdit(this.outputRange, this.getInputLines());
    }
    getOutputLines() {
        return this.outputRange.getLines(this.outputTextModel);
    }
    getInputLines() {
        return this.inputRange.getLines(this.inputTextModel);
    }
}
/**
 * Represents a mapping of an input range to an output range.
 */
export class RangeMapping {
    constructor(inputRange, outputRange) {
        this.inputRange = inputRange;
        this.outputRange = outputRange;
    }
    toString() {
        function rangeToString(range) {
            // TODO@hediet make this the default Range.toString
            return `[${range.startLineNumber}:${range.startColumn}, ${range.endLineNumber}:${range.endColumn})`;
        }
        return `${rangeToString(this.inputRange)} -> ${rangeToString(this.outputRange)}`;
    }
    addOutputLineDelta(deltaLines) {
        return new RangeMapping(this.inputRange, new Range(this.outputRange.startLineNumber + deltaLines, this.outputRange.startColumn, this.outputRange.endLineNumber + deltaLines, this.outputRange.endColumn));
    }
    addInputLineDelta(deltaLines) {
        return new RangeMapping(new Range(this.inputRange.startLineNumber + deltaLines, this.inputRange.startColumn, this.inputRange.endLineNumber + deltaLines, this.inputRange.endColumn), this.outputRange);
    }
    reverse() {
        return new RangeMapping(this.outputRange, this.inputRange);
    }
}
/**
 * Represents a total monotonous mapping of ranges in one document to another document.
 */
export class DocumentRangeMap {
    constructor(
    /**
     * The line range mappings that define this document mapping.
     * Can have holes.
     */
    rangeMappings, inputLineCount) {
        this.rangeMappings = rangeMappings;
        this.inputLineCount = inputLineCount;
        assertFn(() => checkAdjacentItems(rangeMappings, (m1, m2) => rangeIsBeforeOrTouching(m1.inputRange, m2.inputRange) &&
            rangeIsBeforeOrTouching(m1.outputRange, m2.outputRange) /*&&
    lengthBetweenPositions(m1.inputRange.getEndPosition(), m2.inputRange.getStartPosition()).equals(
        lengthBetweenPositions(m1.outputRange.getEndPosition(), m2.outputRange.getStartPosition())
    )*/));
    }
    project(position) {
        const lastBefore = findLast(this.rangeMappings, (r) => r.inputRange.getStartPosition().isBeforeOrEqual(position));
        if (!lastBefore) {
            return new RangeMapping(Range.fromPositions(position, position), Range.fromPositions(position, position));
        }
        if (rangeContainsPosition(lastBefore.inputRange, position)) {
            return lastBefore;
        }
        const dist = lengthBetweenPositions(lastBefore.inputRange.getEndPosition(), position);
        const outputPos = addLength(lastBefore.outputRange.getEndPosition(), dist);
        return new RangeMapping(Range.fromPositions(position), Range.fromPositions(outputPos));
    }
    projectRange(range) {
        const start = this.project(range.getStartPosition());
        const end = this.project(range.getEndPosition());
        return new RangeMapping(start.inputRange.plusRange(end.inputRange), start.outputRange.plusRange(end.outputRange));
    }
    get outputLineCount() {
        const last = this.rangeMappings.at(-1);
        const diff = last ? last.outputRange.endLineNumber - last.inputRange.endLineNumber : 0;
        return this.inputLineCount + diff;
    }
    reverse() {
        return new DocumentRangeMap(this.rangeMappings.map((m) => m.reverse()), this.outputLineCount);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwcGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvbW9kZWwvbWFwcGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNuRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV6RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFbEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQzVDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUMxQyxPQUFPLEVBQ04sU0FBUyxFQUNULHNCQUFzQixFQUN0QixxQkFBcUIsRUFDckIsdUJBQXVCLEdBQ3ZCLE1BQU0saUJBQWlCLENBQUE7QUFFeEI7O0dBRUc7QUFDSCxNQUFNLE9BQU8sZ0JBQWdCO0lBQ3JCLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBcUM7UUFDdkQsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUNyQixDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFDekMsU0FBUyxDQUNULENBQUE7SUFDRixDQUFDO0lBQ0Qs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