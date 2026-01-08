/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Range } from '../../../common/core/range.js';
import { DecorationSegment, LineDecoration, LineDecorationsNormalizer, } from '../../../common/viewLayout/lineDecorations.js';
import { InlineDecoration } from '../../../common/viewModel.js';
suite('Editor ViewLayout - ViewLineParts', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Bug 9827:Overlapping inline decorations can cause wrong inline class to be applied', () => {
        const result = LineDecorationsNormalizer.normalize('abcabcabcabcabcabcabcabcabcabc', [
            new LineDecoration(1, 11, 'c1', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(3, 4, 'c2', 0 /* InlineDecorationType.Regular */),
        ]);
        assert.deepStrictEqual(result, [
            new DecorationSegment(0, 1, 'c1', 0),
            new DecorationSegment(2, 2, 'c2 c1', 0),
            new DecorationSegment(3, 9, 'c1', 0),
        ]);
    });
    test('issue #3462: no whitespace shown at the end of a decorated line', () => {
        const result = LineDecorationsNormalizer.normalize('abcabcabcabcabcabcabcabcabcabc', [
            new LineDecoration(15, 21, 'mtkw', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(20, 21, 'inline-folded', 0 /* InlineDecorationType.Regular */),
        ]);
        assert.deepStrictEqual(result, [
            new DecorationSegment(14, 18, 'mtkw', 0),
            new DecorationSegment(19, 19, 'mtkw inline-folded', 0),
        ]);
    });
    test('issue #3661: Link decoration bleeds to next line when wrapping', () => {
        const result = LineDecoration.filter([
            new InlineDecoration(new Range(2, 12, 3, 30), 'detected-link', 0 /* InlineDecorationType.Regular */),
        ], 3, 12, 500);
        assert.deepStrictEqual(result, [
            new LineDecoration(12, 30, 'detected-link', 0 /* InlineDecorationType.Regular */),
        ]);
    });
    test('issue #37401: Allow both before and after decorations on empty line', () => {
        const result = LineDecoration.filter([
            new InlineDecoration(new Range(4, 1, 4, 2), 'before', 1 /* InlineDecorationType.Before */),
            new InlineDecoration(new Range(4, 0, 4, 1), 'after', 2 /* InlineDecorationType.After */),
        ], 4, 1, 500);
        assert.deepStrictEqual(result, [
            new LineDecoration(1, 2, 'before', 1 /* InlineDecorationType.Before */),
            new LineDecoration(0, 1, 'after', 2 /* InlineDecorationType.After */),
        ]);
    });
    test('ViewLineParts', () => {
        assert.deepStrictEqual(LineDecorationsNormalizer.normalize('abcabcabcabcabcabcabcabcabcabc', [
            new LineDecoration(1, 2, 'c1', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(3, 4, 'c2', 0 /* InlineDecorationType.Regular */),
        ]), [new DecorationSegment(0, 0, 'c1', 0), new DecorationSegment(2, 2, 'c2', 0)]);
        assert.deepStrictEqual(LineDecorationsNormalizer.normalize('abcabcabcabcabcabcabcabcabcabc', [
            new LineDecoration(1, 3, 'c1', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(3, 4, 'c2', 0 /* InlineDecorationType.Regular */),
        ]), [new DecorationSegment(0, 1, 'c1', 0), new DecorationSegment(2, 2, 'c2', 0)]);
        assert.deepStrictEqual(LineDecorationsNormalizer.normalize('abcabcabcabcabcabcabcabcabcabc', [
            new LineDecoration(1, 4, 'c1', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(3, 4, 'c2', 0 /* InlineDecorationType.Regular */),
        ]), [new DecorationSegment(0, 1, 'c1', 0), new DecorationSegment(2, 2, 'c1 c2', 0)]);
        assert.deepStrictEqual(LineDecorationsNormalizer.normalize('abcabcabcabcabcabcabcabcabcabc', [
            new LineDecoration(1, 4, 'c1', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(1, 4, 'c1*', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(3, 4, 'c2', 0 /* InlineDecorationType.Regular */),
        ]), [new DecorationSegment(0, 1, 'c1 c1*', 0), new DecorationSegment(2, 2, 'c1 c1* c2', 0)]);
        assert.deepStrictEqual(LineDecorationsNormalizer.normalize('abcabcabcabcabcabcabcabcabcabc', [
            new LineDecoration(1, 4, 'c1', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(1, 4, 'c1*', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(1, 4, 'c1**', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(3, 4, 'c2', 0 /* InlineDecorationType.Regular */),
        ]), [
            new DecorationSegment(0, 1, 'c1 c1* c1**', 0),
            new DecorationSegment(2, 2, 'c1 c1* c1** c2', 0),
        ]);
        assert.deepStrictEqual(LineDecorationsNormalizer.normalize('abcabcabcabcabcabcabcabcabcabc', [
            new LineDecoration(1, 4, 'c1', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(1, 4, 'c1*', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(1, 4, 'c1**', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(3, 4, 'c2', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(3, 4, 'c2*', 0 /* InlineDecorationType.Regular */),
        ]), [
            new DecorationSegment(0, 1, 'c1 c1* c1**', 0),
            new DecorationSegment(2, 2, 'c1 c1* c1** c2 c2*', 0),
        ]);
        assert.deepStrictEqual(LineDecorationsNormalizer.normalize('abcabcabcabcabcabcabcabcabcabc', [
            new LineDecoration(1, 4, 'c1', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(1, 4, 'c1*', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(1, 4, 'c1**', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(3, 4, 'c2', 0 /* InlineDecorationType.Regular */),
            new LineDecoration(3, 5, 'c2*', 0 /* InlineDecorationType.Regular */),
        ]), [
            new DecorationSegment(0, 1, 'c1 c1* c1**', 0),
            new DecorationSegment(2, 2, 'c1 c1* c1** c2 c2*', 0),
            new DecorationSegment(3, 3, 'c2*', 0),
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZURlY29yYXRpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi92aWV3TGF5b3V0L2xpbmVEZWNvcmF0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUNOLGlCQUFpQixFQUNqQixjQUFjLEVBQ2QseUJBQXlCLEdBQ3pCLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUFFLGdCQUFnQixFQUF3QixNQUFNLDhCQUE4QixDQUFBO0FBRXJGLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7SUFDL0MsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsb0ZBQW9GLEVBQUUsR0FBRyxFQUFFO1FBQy9GLE1BQU0sTUFBTSxHQUFHLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxnQ0FBZ0MsRUFBRTtZQUNwRixJQUFJLGNBQWMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUksdUNBQStCO1lBQzdELElBQUksY0FBYyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSx1Q0FBK0I7U0FDNUQsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUU7WUFDOUIsSUFBSSxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDcEMsSUFBSSxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDdkMsSUFB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