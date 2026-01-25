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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy90ZXN0L2Jyb3dzZXIvaW5saW5lQ29tcGxldGlvbnNNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDakYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsS0FBSyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtJQUNuQyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQywyQkFBMkIsRUFBRSxLQUFLO1FBQ3RDLE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBQyxDQUFDLGVBQWUsRUFBRSxlQUFlLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNoRixNQUFNLFNBQVMsR0FBRyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1RCxNQUFNLFdBQVcsR0FBRyxJQUFJLGNBQWMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUs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