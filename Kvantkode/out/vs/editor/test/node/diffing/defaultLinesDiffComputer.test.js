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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdExpbmVzRGlmZkNvbXB1dGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L25vZGUvZGlmZmluZy9kZWZhdWx0TGluZXNEaWZmQ29tcHV0ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFDaEgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0ZBQWdGLENBQUE7QUFDbkgsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sdUZBQXVGLENBQUE7QUFDakksT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTVELEtBQUssQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO0lBQ25CLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUU7UUFDZCxNQUFNLEVBQUUsR0FBRyxJQUFJLHNCQUFzQixDQUNwQyxDQUFDLGFBQWEsQ0FBQyxFQUNmLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUMzQyxJQUFJLENBQ0osQ0FBQTtRQUNELE1BQU0sRUFB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