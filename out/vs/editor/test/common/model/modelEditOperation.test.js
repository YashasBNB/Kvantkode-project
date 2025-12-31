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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxFZGl0T3BlcmF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZWwvbW9kZWxFZGl0T3BlcmF0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVyRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFFckQsS0FBSyxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtJQUNqRCxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUE7SUFDN0IsTUFBTSxLQUFLLEdBQUcsb0JBQW9CLENBQUE7SUFDbEMsTUFBTSxLQUFLLEdBQUcsZ0JBQWdCLENBQUE7SUFDOUIsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFBO0lBQ2hCLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQTtJQUVqQixJQUFJLEtBQWdCLENBQUE7SUFFcEIsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLE1BQU0sSUFBSSxHQUFHLEtBQUssR0FBRyxNQUFNLEdBQUcsS0FBSyxHQUFHLElBQUksR0FBRyxLQUFLLEdBQUcsSUFBSSxHQUFHLEtBQUssR0FBRyxNQUFNLEdBQUcsS0FBSyxDQUFBO1FBQ2xGLEtBQUssR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDOUIsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxTQUFTLGtCQUFrQixDQUMxQixJQUFZLEVBQ1osa0JBQTBCLEVBQzFCLGNBQXNCLEVBQ3RCLHNCQUE4QixrQkFBa0IsRUFDaEQsa0JBQTBCLGNBQWM7UUFFeEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQ3RCLG1CQUFtQixFQUNuQixlQUFlLEVBQ2Ysa0JBQWtCLEVBQ2xCLGNBQWMsQ0FDZCxDQUFBO1FBRUQsT0FBTztZQUNOLEtBQUssRUFBRSxLQUFLO1lBQ1osSUFBSSxFQUFFLElBQUk7WUFDVixnQkFBZ0IsRUFBRSxLQUFLO1NBQ3ZCLENBQUE7SUFDRixDQUFDO0lBRUQsU0FBUyxrQkFBa0IsQ0FBQyxZQUFrQyxFQUFFLFdBQXFCO1FBQ3BGLE1BQU0sTUFBTSxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7UUFFN0IsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEVBQUUsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNoRSxDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVsRCxNQUFNLFlBQVksR0FBRyxDQUFDLElBQTBCLEVBQUUsRUFBRTtZQUNuRCxPQUFPO2dCQUNOLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztnQkFDakIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO2dCQUNmLGdCQUFnQixFQUFFLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxLQUFLO2FBQ2hELENBQUE7UUFDRixDQUFDLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO0lBQy9FLENBQUM7SUFFRCxJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUMxQixrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQ2pELGdCQUFnQjtZQUNoQixLQUFLO1lBQ0wsS0FBSztZQUNMLEtBQUs7WUFDTCxLQUFLO1NBQ0wsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO1FBQ3BDLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLHFCQUFxQixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtZQUNuRSxrQ0FBa0M7WUFDbEMsS0FBSztZQUNMLEtBQUs7WUFDTCxLQUFLO1lBQ0wsS0FBSztTQUNMLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtRQUNwQyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUU7WUFDdkUscUNBQXFDO1lBQ3JDLEtBQUs7WUFDTCxLQUFLO1lBQ0wsS0FBSztZQUNMLEtBQUs7U0FDTCxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7UUFDcEMsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUU7WUFDekUsb0JBQW9CO1lBQ3BCLEtBQUs7WUFDTCxLQUFLO1lBQ0wsS0FBSztZQUNMLEtBQUs7U0FDTCxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7UUFDeEMsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUU7WUFDekUsb0JBQW9CO1lBQ3BCLEtBQUs7WUFDTCxLQUFLO1NBQ0wsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO1FBQ3hDLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLG9CQUFvQixFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQ3pFLHFCQUFxQjtZQUNyQixLQUFLO1lBQ0wsS0FBSztTQUNMLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtRQUN4QyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtZQUN4RSxrQ0FBa0M7WUFDbEMsS0FBSztZQUNMLEtBQUs7U0FDTCxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7UUFDekMsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsY0FBYyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtZQUM1RCxHQUFHO1lBQ0gsR0FBRztZQUNILEdBQUc7WUFDSCxHQUFHO1lBQ0gsS0FBSztZQUNMLEtBQUs7WUFDTCxLQUFLO1lBQ0wsS0FBSztZQUNMLEtBQUs7U0FDTCxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=