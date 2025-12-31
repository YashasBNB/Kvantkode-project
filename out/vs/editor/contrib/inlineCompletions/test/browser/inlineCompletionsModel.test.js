/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Position } from '../../../../common/core/position.js';
import { getSecondaryEdits } from '../../browser/model/inlineCompletionsModel.js';
import { SingleTextEdit } from '../../../../common/core/textEdit.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { Range } from '../../../../common/core/range.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('inlineCompletionModel', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('getSecondaryEdits - basic', async function () {
        const textModel = createTextModel(['function fib(', 'function fib('].join('\n'));
        const positions = [new Position(1, 14), new Position(2, 14)];
        const primaryEdit = new SingleTextEdit(new Range(1, 1, 1, 14), 'function fib() {');
        const secondaryEdits = getSecondaryEdits(textModel, positions, primaryEdit);
        assert.deepStrictEqual(secondaryEdits, [new SingleTextEdit(new Range(2, 14, 2, 14), ') {')]);
        textModel.dispose();
    });
    test('getSecondaryEdits - cursor not on same line as primary edit 1', async function () {
        const textModel = createTextModel(['function fib(', '', 'function fib(', ''].join('\n'));
        const positions = [new Position(2, 1), new Position(4, 1)];
        const primaryEdit = new SingleTextEdit(new Range(1, 1, 2, 1), ['function fib() {', '	return 0;', '}'].join('\n'));
        const secondaryEdits = getSecondaryEdits(textModel, positions, primaryEdit);
        assert.deepStrictEqual(secondaryEdits, [
            new SingleTextEdit(new Range(4, 1, 4, 1), ['	return 0;', '}'].join('\n')),
        ]);
        textModel.dispose();
    });
    test('getSecondaryEdits - cursor not on same line as primary edit 2', async function () {
        const textModel = createTextModel(['class A {', '', 'class B {', '', 'function f() {}'].join('\n'));
        const positions = [new Position(2, 1), new Position(4, 1)];
        const primaryEdit = new SingleTextEdit(new Range(1, 1, 2, 1), ['class A {', '	public x: number = 0;', '   public y: number = 0;', '}'].join('\n'));
        const secondaryEdits = getSecondaryEdits(textModel, positions, primaryEdit);
        assert.deepStrictEqual(secondaryEdits, [
            new SingleTextEdit(new Range(4, 1, 4, 1), ['	public x: number = 0;', '   public y: number = 0;', '}'].join('\n')),
        ]);
        textModel.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvdGVzdC9icm93c2VyL2lubGluZUNvbXBsZXRpb25zTW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDMUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7SUFDbkMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsMkJBQTJCLEVBQUUsS0FBSztRQUN0QyxNQUFNLFNBQVMsR0FBRyxlQUFlLENBQUMsQ0FBQyxlQUFlLEVBQUUsZUFBZSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDaEYsTUFBTSxTQUFTLEdBQUcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDNUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxjQUFjLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMs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