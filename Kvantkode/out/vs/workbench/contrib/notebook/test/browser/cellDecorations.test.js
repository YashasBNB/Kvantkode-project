/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CellKind } from '../../common/notebookCommon.js';
import { withTestNotebook } from './testNotebookEditor.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Event } from '../../../../../base/common/event.js';
suite('CellDecorations', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Add and remove a cell decoration', async function () {
        await withTestNotebook([['# header a', 'markdown', CellKind.Markup, [], {}]], async (editor, viewModel) => {
            const cell = viewModel.cellAt(0);
            assert.ok(cell);
            let added = false;
            Event.once(cell.onCellDecorationsChanged)((e) => (added = !!e.added.find((decoration) => decoration.className === 'style1')));
            const decorationIds = cell.deltaCellDecorations([], [{ className: 'style1' }]);
            assert.ok(cell.getCellDecorations().find((dec) => dec.className === 'style1'));
            let removed = false;
            Event.once(cell.onCellDecorationsChanged)((e) => (removed = !!e.removed.find((decoration) => decoration.className === 'style1')));
            cell.deltaCellDecorations(decorationIds, []);
            assert.ok(!cell.getCellDecorations().find((dec) => dec.className === 'style1'));
            assert.ok(added);
            assert.ok(removed);
        });
    });
    test('Removing one cell decoration should not remove all', async function () {
        await withTestNotebook([['# header a', 'markdown', CellKind.Markup, [], {}]], async (editor, viewModel) => {
            const cell = viewModel.cellAt(0);
            assert.ok(cell);
            const decorationIds = cell.deltaCellDecorations([], [{ className: 'style1', outputClassName: 'style1' }]);
            cell.deltaCellDecorations([], [{ className: 'style1' }]);
            let styleRemoved = false;
            let outputStyleRemoved = false;
            Event.once(cell.onCellDecorationsChanged)((e) => {
                styleRemoved = !!e.removed.find((decoration) => decoration.className === 'style1');
                outputStyleRemoved = !!e.removed.find((decoration) => decoration.outputClassName === 'style1');
            });
            // remove the first style added, which should only remove the output class
            cell.deltaCellDecorations(decorationIds, []);
            assert.ok(!cell.getCellDecorations().find((dec) => dec.outputClassName === 'style1'));
            assert.ok(cell.getCellDecorations().find((dec) => dec.className === 'style1'));
            assert.ok(!styleRemoved);
            assert.ok(outputStyleRemoved);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbERlY29yYXRpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9jZWxsRGVjb3JhdGlvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzFELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUzRCxLQUFLLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO0lBQzdCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLEtBQUs7UUFDN0MsTUFBTSxnQkFBZ0IsQ0FDckIsQ0FBQyxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFDckQsS0FBSyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUMzQixNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2hDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUE7WUFFZixJQUFJLEtBQUssR0FBRyxLQUFLLENBQUE7WUFDakIsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FDeEMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUNsRixDQUFBO1lBRUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM5RSxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFBO1lBRTlFLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQTtZQUNuQixLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUN4QyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQ3RGLENBQUE7WUFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBRTVDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQTtZQUMvRSxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ2hCLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDbkIsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvREFBb0QsRUFBRSxLQUFLO1FBQy9ELE1BQU0sZ0JBQWdCLENBQ3JCLENBQUMsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQ3JELEtBQUssRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDM0IsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNoQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBRWYsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUM5QyxFQUFFLEVBQ0YsQ0FBQyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQ3BELENBQUE7WUFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRXhELElBQUksWUFBWSxHQUFHLEtBQUssQ0FBQTtZQUN4QixJQUFJLGtCQUFrQixHQUFHLEtBQUssQ0FBQTtZQUM5QixLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQy9DLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEtBQUssUUFBUSxDQUFDLENBQUE7Z0JBQ2xGLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FDcEMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxlQUFlLEtBQUssUUFBUSxDQUN2RCxDQUFBO1lBQ0YsQ0FBQyxDQUFDLENBQUE7WUFDRiwwRUFBMEU7WUFDMUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUU1QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsZUFBZSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUE7WUFDckYsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQTtZQUM5RSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDeEIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQzlCLENBQUMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9