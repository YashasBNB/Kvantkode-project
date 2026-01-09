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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZUFsaWdubWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci92aWV3L2xpbmVBbGlnbm1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNuRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDNUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRWxELE9BQU8sRUFBRSxTQUFTLEVBQUUsc0JBQXNCLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFRekYsTUFBTSxVQUFVLGFBQWEsQ0FBQyxDQUFvQjtJQUNqRCxNQUFNLFlBQVksR0FBRyxvQkFBb0IsQ0FDeEMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsRUFDN0MsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFDckIsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FDdkIsQ0FBQTtJQUNELE1BQU0sWUFBWSxHQUFHLG9CQUFvQixDQUN4QyxDQUFDLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FB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