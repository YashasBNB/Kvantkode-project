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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZURlY29yYXRpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vdmlld0xheW91dC9saW5lRGVjb3JhdGlvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFDTixpQkFBaUIsRUFDakIsY0FBYyxFQUNkLHlCQUF5QixHQUN6QixNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxnQkFBZ0IsRUFBd0IsTUFBTSw4QkFBOEIsQ0FBQTtBQUVyRixLQUFLLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO0lBQy9DLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLG9GQUFvRixFQUFFLEdBQUcsRUFBRTtRQUMvRixNQUFNLE1BQU0sR0FBRyx5QkFBeUIsQ0FBQyxTQUFTLENBQUMsZ0NBQWdDLEVBQUU7WUFDcEYsSUFBSSxjQUFjLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLHVDQUErQjtZQUM3RCxJQUFJLGNBQWMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksdUNBQStCO1NBQzVELENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFO1lBQzlCLElBQUksaUJBQWlCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ3BDLElBQUksaUJBQWlCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZDLElBQUksaUJB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