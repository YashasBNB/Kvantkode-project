/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Range } from '../../../common/core/range.js';
import { createTextModel } from '../testTextModel.js';
suite('Editor Model - Model Edit Operation', () => {
    const LINE1 = 'My First Line';
    const LINE2 = '\t\tMy Second Line';
    const LINE3 = '    Third Line';
    const LINE4 = '';
    const LINE5 = '1';
    let model;
    setup(() => {
        const text = LINE1 + '\r\n' + LINE2 + '\n' + LINE3 + '\n' + LINE4 + '\r\n' + LINE5;
        model = createTextModel(text);
    });
    teardown(() => {
        model.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function createSingleEditOp(text, positionLineNumber, positionColumn, selectionLineNumber = positionLineNumber, selectionColumn = positionColumn) {
        const range = new Range(selectionLineNumber, selectionColumn, positionLineNumber, positionColumn);
        return {
            range: range,
            text: text,
            forceMoveMarkers: false,
        };
    }
    function assertSingleEditOp(singleEditOp, editedLines) {
        const editOp = [singleEditOp];
        const inverseEditOp = model.applyEdits(editOp, true);
        assert.strictEqual(model.getLineCount(), editedLines.length);
        for (let i = 0; i < editedLines.length; i++) {
            assert.strictEqual(model.getLineContent(i + 1), editedLines[i]);
        }
        const originalOp = model.applyEdits(inverseEditOp, true);
        assert.strictEqual(model.getLineCount(), 5);
        assert.strictEqual(model.getLineContent(1), LINE1);
        assert.strictEqual(model.getLineContent(2), LINE2);
        assert.strictEqual(model.getLineContent(3), LINE3);
        assert.strictEqual(model.getLineContent(4), LINE4);
        assert.strictEqual(model.getLineContent(5), LINE5);
        const simplifyEdit = (edit) => {
            return {
                range: edit.range,
                text: edit.text,
                forceMoveMarkers: edit.forceMoveMarkers || false,
            };
        };
        assert.deepStrictEqual(originalOp.map(simplifyEdit), editOp.map(simplifyEdit));
    }
    test('Insert inline', () => {
        assertSingleEditOp(createSingleEditOp('a', 1, 1), [
            'aMy First Line',
            LINE2,
            LINE3,
            LINE4,
            LINE5,
        ]);
    });
    test('Replace inline/inline 1', () => {
        assertSingleEditOp(createSingleEditOp(' incredibly awesome', 1, 3), [
            'My incredibly awesome First Line',
            LINE2,
            LINE3,
            LINE4,
            LINE5,
        ]);
    });
    test('Replace inline/inline 2', () => {
        assertSingleEditOp(createSingleEditOp(' with text at the end.', 1, 14), [
            'My First Line with text at the end.',
            LINE2,
            LINE3,
            LINE4,
            LINE5,
        ]);
    });
    test('Replace inline/inline 3', () => {
        assertSingleEditOp(createSingleEditOp('My new First Line.', 1, 1, 1, 14), [
            'My new First Line.',
            LINE2,
            LINE3,
            LINE4,
            LINE5,
        ]);
    });
    test('Replace inline/multi line 1', () => {
        assertSingleEditOp(createSingleEditOp('My new First Line.', 1, 1, 3, 15), [
            'My new First Line.',
            LINE4,
            LINE5,
        ]);
    });
    test('Replace inline/multi line 2', () => {
        assertSingleEditOp(createSingleEditOp('My new First Line.', 1, 2, 3, 15), [
            'MMy new First Line.',
            LINE4,
            LINE5,
        ]);
    });
    test('Replace inline/multi line 3', () => {
        assertSingleEditOp(createSingleEditOp('My new First Line.', 1, 2, 3, 2), [
            'MMy new First Line.   Third Line',
            LINE4,
            LINE5,
        ]);
    });
    test('Replace muli line/multi line', () => {
        assertSingleEditOp(createSingleEditOp('1\n2\n3\n4\n', 1, 1), [
            '1',
            '2',
            '3',
            '4',
            LINE1,
            LINE2,
            LINE3,
            LINE4,
            LINE5,
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxFZGl0T3BlcmF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2RlbC9tb2RlbEVkaXRPcGVyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXJELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUVyRCxLQUFLLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO0lBQ2pELE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQTtJQUM3QixNQUFNLEtBQUssR0FBRyxvQkFBb0IsQ0FBQTtJQUNsQyxNQUFNLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQTtJQUM5QixNQUFNLEtBQUssR0FBRyxFQUFFLENBQUE7SUFDaEIsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFBO0lBRWpCLElBQUksS0FBZ0IsQ0FBQTtJQUVwQixLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsTUFBTSxJQUFJLEdBQUcsS0FBSyxHQUFHLE1BQU0sR0FBRyxLQUFLLEdBQUcsSUFBSSxHQUFHLEtBQUssR0FBRyxJQUFJLEdBQUcsS0FBSyxHQUFHLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDbEYsS0FBSyxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM5QixDQUFDLENBQUMsQ0FBQTtJQUVGLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0lB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