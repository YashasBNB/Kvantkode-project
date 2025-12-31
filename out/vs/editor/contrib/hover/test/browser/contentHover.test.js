/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { RenderedContentHover } from '../../browser/contentHoverRendered.js';
import { withTestCodeEditor, } from '../../../../test/browser/testCodeEditor.js';
suite('Content Hover', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #151235: Gitlens hover shows up in the wrong place', () => {
        const text = 'just some text';
        withTestCodeEditor(text, {}, (editor) => {
            const actual = RenderedContentHover.computeHoverPositions(editor, new Range(5, 5, 5, 5), [
                { range: new Range(4, 1, 5, 6) },
            ]);
            assert.deepStrictEqual(actual, {
                showAtPosition: new Position(5, 5),
                showAtSecondaryPosition: new Position(5, 5),
            });
        });
    });
    test('issue #95328: Hover placement with word-wrap', () => {
        const text = 'just some text';
        const opts = {
            wordWrap: 'wordWrapColumn',
            wordWrapColumn: 6,
        };
        withTestCodeEditor(text, opts, (editor) => {
            const actual = RenderedContentHover.computeHoverPositions(editor, new Range(1, 8, 1, 8), [
                { range: new Range(1, 1, 1, 15) },
            ]);
            assert.deepStrictEqual(actual, {
                showAtPosition: new Position(1, 8),
                showAtSecondaryPosition: new Position(1, 6),
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudEhvdmVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9ob3Zlci90ZXN0L2Jyb3dzZXIvY29udGVudEhvdmVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFNUUsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLDRDQUE0QyxDQUFBO0FBRW5ELEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzNCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLDBEQUEwRCxFQUFFLEdBQUcsRUFBRTtRQUNyRSxNQUFNLElBQUksR0FBRyxnQkFBZ0IsQ0FBQTtRQUM3QixrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDdkMsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMscUJBQXFCLENBQUMsTUFBTSxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFO2dCQUM1RSxFQUFFLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTthQUM1QyxDQUFDLENBQUE7WUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRTtnQkFDOUIsY0FBYyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ2xDLHVCQUF1QixFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDM0MsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxHQUFHLEVBQUU7UUFDekQsTUFBTSxJQUFJLEdBQUcsZ0JBQWdCLENBQUE7UUFDN0IsTUFBTSxJQUFJLEdBQXVDO1lBQ2hELFFBQVEsRUFBRSxnQkFBZ0I7WUFDMUIsY0FBYyxFQUFFLENBQUM7U0FDakIsQ0FBQTtRQUNELGtCQUFrQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUN6QyxNQUFNLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7Z0JBQzVFLEVBQUUsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFO2FBQzdDLENBQUMsQ0FBQTtZQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFO2dCQUM5QixjQUFjLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbEMsdUJBQXVCLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUMzQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==