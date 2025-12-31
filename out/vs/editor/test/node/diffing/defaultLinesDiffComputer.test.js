/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../common/core/range.js';
import { getLineRangeMapping, RangeMapping } from '../../../common/diff/rangeMapping.js';
import { OffsetRange } from '../../../common/core/offsetRange.js';
import { LinesSliceCharSequence } from '../../../common/diff/defaultLinesDiffComputer/linesSliceCharSequence.js';
import { MyersDiffAlgorithm } from '../../../common/diff/defaultLinesDiffComputer/algorithms/myersDiffAlgorithm.js';
import { DynamicProgrammingDiffing } from '../../../common/diff/defaultLinesDiffComputer/algorithms/dynamicProgrammingDiffing.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ArrayText } from '../../../common/core/textEdit.js';
suite('myers', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('1', () => {
        const s1 = new LinesSliceCharSequence(['hello world'], new Range(1, 1, 1, Number.MAX_SAFE_INTEGER), true);
        const s2 = new LinesSliceCharSequence(['hallo welt'], new Range(1, 1, 1, Number.MAX_SAFE_INTEGER), true);
        const a = true ? new MyersDiffAlgorithm() : new DynamicProgrammingDiffing();
        a.compute(s1, s2);
    });
});
suite('lineRangeMapping', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Simple', () => {
        assert.deepStrictEqual(getLineRangeMapping(new RangeMapping(new Range(2, 1, 3, 1), new Range(2, 1, 2, 1)), new ArrayText(['const abc = "helloworld".split("");', '', '']), new ArrayText(['const asciiLower = "helloworld".split("");', ''])).toString(), '{[2,3)->[2,2)}');
    });
    test('Empty Lines', () => {
        assert.deepStrictEqual(getLineRangeMapping(new RangeMapping(new Range(2, 1, 2, 1), new Range(2, 1, 4, 1)), new ArrayText(['', '']), new ArrayText(['', '', '', ''])).toString(), '{[2,2)->[2,4)}');
    });
});
suite('LinesSliceCharSequence', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const sequence = new LinesSliceCharSequence(['line1: foo', 'line2: fizzbuzz', 'line3: barr', 'line4: hello world', 'line5: bazz'], new Range(2, 1, 5, 1), true);
    test('translateOffset', () => {
        assert.deepStrictEqual({
            result: OffsetRange.ofLength(sequence.length).map((offset) => sequence.translateOffset(offset).toString()),
        }, {
            result: [
                '(2,1)',
                '(2,2)',
                '(2,3)',
                '(2,4)',
                '(2,5)',
                '(2,6)',
                '(2,7)',
                '(2,8)',
                '(2,9)',
                '(2,10)',
                '(2,11)',
                '(2,12)',
                '(2,13)',
                '(2,14)',
                '(2,15)',
                '(2,16)',
                '(3,1)',
                '(3,2)',
                '(3,3)',
                '(3,4)',
                '(3,5)',
                '(3,6)',
                '(3,7)',
                '(3,8)',
                '(3,9)',
                '(3,10)',
                '(3,11)',
                '(3,12)',
                '(4,1)',
                '(4,2)',
                '(4,3)',
                '(4,4)',
                '(4,5)',
                '(4,6)',
                '(4,7)',
                '(4,8)',
                '(4,9)',
                '(4,10)',
                '(4,11)',
                '(4,12)',
                '(4,13)',
                '(4,14)',
                '(4,15)',
                '(4,16)',
                '(4,17)',
                '(4,18)',
                '(4,19)',
            ],
        });
    });
    test('extendToFullLines', () => {
        assert.deepStrictEqual({ result: sequence.getText(sequence.extendToFullLines(new OffsetRange(20, 25))) }, { result: 'line3: barr\n' });
        assert.deepStrictEqual({ result: sequence.getText(sequence.extendToFullLines(new OffsetRange(20, 45))) }, { result: 'line3: barr\nline4: hello world\n' });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdExpbmVzRGlmZkNvbXB1dGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9ub2RlL2RpZmZpbmcvZGVmYXVsdExpbmVzRGlmZkNvbXB1dGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBQ2hILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdGQUFnRixDQUFBO0FBQ25ILE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHVGQUF1RixDQUFBO0FBQ2pJLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUU1RCxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtJQUNuQix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFO1FBQ2QsTUFBTSxFQUFFLEdBQUcsSUFBSSxzQkFBc0IsQ0FDcEMsQ0FBQyxhQUFhLENBQUMsRUFDZixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsRUFDM0MsSUFBSSxDQUNKLENBQUE7UUFDRCxNQUFNLEVBQUUsR0FBRyxJQUFJLHNCQUFzQixDQUNw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