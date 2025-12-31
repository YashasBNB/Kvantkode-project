/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy } from '../../../../../base/common/arrays.js';
import { assertFn, checkAdjacentItems } from '../../../../../base/common/assert.js';
import { isDefined } from '../../../../../base/common/types.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { TextLength } from '../../../../../editor/common/core/textLength.js';
import { RangeMapping } from '../model/mapping.js';
import { addLength, lengthBetweenPositions, lengthOfRange } from '../model/rangeUtils.js';
export function getAlignments(m) {
    const equalRanges1 = toEqualRangeMappings(m.input1Diffs.flatMap((d) => d.rangeMappings), m.baseRange.toRange(), m.input1Range.toRange());
    const equalRanges2 = toEqualRangeMappings(m.input2Diffs.flatMap((d) => d.rangeMappings), m.baseRange.toRange(), m.input2Range.toRange());
    const commonRanges = splitUpCommonEqualRangeMappings(equalRanges1, equalRanges2);
    let result = [];
    result.push([
        m.input1Range.startLineNumber - 1,
        m.baseRange.startLineNumber - 1,
        m.input2Range.startLineNumber - 1,
    ]);
    function isFullSync(lineAlignment) {
        return lineAlignment.every((i) => i !== undefined);
    }
    // One base line has either up to one full sync or up to two half syncs.
    for (const m of commonRanges) {
        const lineAlignment = [
            m.output1Pos?.lineNumber,
            m.inputPos.lineNumber,
            m.output2Pos?.lineNumber,
        ];
        const alignmentIsFullSync = isFullSync(lineAlignment);
        let shouldAdd = true;
        if (alignmentIsFullSync) {
            const isNewFullSyncAlignment = !result.some((r) => isFullSync(r) && r.some((v, idx) => v !== undefined && v === lineAlignment[idx]));
            if (isNewFullSyncAlignment) {
                // Remove half syncs
                result = result.filter((r) => !r.some((v, idx) => v !== undefined && v === lineAlignment[idx]));
            }
            shouldAdd = isNewFullSyncAlignment;
        }
        else {
            const isNew = !result.some((r) => r.some((v, idx) => v !== undefined && v === lineAlignment[idx]));
            shouldAdd = isNew;
        }
        if (shouldAdd) {
            result.push(lineAlignment);
        }
        else {
            if (m.length.isGreaterThan(new TextLength(1, 0))) {
                result.push([
                    m.output1Pos ? m.output1Pos.lineNumber + 1 : undefined,
                    m.inputPos.lineNumber + 1,
                    m.output2Pos ? m.output2Pos.lineNumber + 1 : undefined,
                ]);
            }
        }
    }
    const finalLineAlignment = [
        m.input1Range.endLineNumberExclusive,
        m.baseRange.endLineNumberExclusive,
        m.input2Range.endLineNumberExclusive,
    ];
    result = result.filter((r) => r.every((v, idx) => v !== finalLineAlignment[idx]));
    result.push(finalLineAlignment);
    assertFn(() => checkAdjacentItems(result.map((r) => r[0]).filter(isDefined), (a, b) => a < b) &&
        checkAdjacentItems(result.map((r) => r[1]).filter(isDefined), (a, b) => a <= b) &&
        checkAdjacentItems(result.map((r) => r[2]).filter(isDefined), (a, b) => a < b) &&
        result.every((alignment) => alignment.filter(isDefined).length >= 2));
    return result;
}
function toEqualRangeMappings(diffs, inputRange, outputRange) {
    const result = [];
    let equalRangeInputStart = inputRange.getStartPosition();
    let equalRangeOutputStart = outputRange.getStartPosition();
    for (const d of diffs) {
        const equalRangeMapping = new RangeMapping(Range.fromPositions(equalRangeInputStart, d.inputRange.getStartPosition()), Range.fromPositions(equalRangeOutputStart, d.outputRange.getStartPosition()));
        assertFn(() => lengthOfRange(equalRangeMapping.inputRange).equals(lengthOfRange(equalRangeMapping.outputRange)));
        if (!equalRangeMapping.inputRange.isEmpty()) {
            result.push(equalRangeMapping);
        }
        equalRangeInputStart = d.inputRange.getEndPosition();
        equalRangeOutputStart = d.outputRange.getEndPosition();
    }
    const equalRangeMapping = new RangeMapping(Range.fromPositions(equalRangeInputStart, inputRange.getEndPosition()), Range.fromPositions(equalRangeOutputStart, outputRange.getEndPosition()));
    assertFn(() => lengthOfRange(equalRangeMapping.inputRange).equals(lengthOfRange(equalRangeMapping.outputRange)));
    if (!equalRangeMapping.inputRange.isEmpty()) {
        result.push(equalRangeMapping);
    }
    return result;
}
/**
 * It is `result[i][0].inputRange.equals(result[i][1].inputRange)`.
 */
function splitUpCommonEqualRangeMappings(equalRangeMappings1, equalRangeMappings2) {
    const result = [];
    const events = [];
    for (const [input, rangeMappings] of [
        [0, equalRangeMappings1],
        [1, equalRangeMappings2],
    ]) {
        for (const rangeMapping of rangeMappings) {
            events.push({
                input: input,
                start: true,
                inputPos: rangeMapping.inputRange.getStartPosition(),
                outputPos: rangeMapping.outputRange.getStartPosition(),
            });
            events.push({
                input: input,
                start: false,
                inputPos: rangeMapping.inputRange.getEndPosition(),
                outputPos: rangeMapping.outputRange.getEndPosition(),
            });
        }
    }
    events.sort(compareBy((m) => m.inputPos, Position.compare));
    const starts = [undefined, undefined];
    let lastInputPos;
    for (const event of events) {
        if (lastInputPos && starts.some((s) => !!s)) {
            const length = lengthBetweenPositions(lastInputPos, event.inputPos);
            if (!length.isZero()) {
                result.push({
                    inputPos: lastInputPos,
                    length,
                    output1Pos: starts[0],
                    output2Pos: starts[1],
                });
                if (starts[0]) {
                    starts[0] = addLength(starts[0], length);
                }
                if (starts[1]) {
                    starts[1] = addLength(starts[1], length);
                }
            }
        }
        starts[event.input] = event.start ? event.outputPos : undefined;
        lastInputPos = event.inputPos;
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZUFsaWdubWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvdmlldy9saW5lQWxpZ25tZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbkYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzVFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUVsRCxPQUFPLEVBQUUsU0FBUyxFQUFFLHNCQUFzQixFQUFFLGFBQWEsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBUXpGLE1BQU0sVUFBVSxhQUFhLENBQUMsQ0FBb0I7SUFDakQsTUFBTSxZQUFZLEdBQUcsb0JBQW9CLENBQ3hDLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEVBQzdDLENBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLEVBQ3JCLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQ3ZCLENBQUE7SUFDRCxNQUFNLFlBQVksR0FBRyxvQkFBb0IsQ0FDeEMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxD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