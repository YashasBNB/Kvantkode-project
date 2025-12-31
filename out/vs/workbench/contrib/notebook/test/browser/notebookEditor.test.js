/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { mock } from '../../../../../base/test/common/mock.js';
import { FoldingModel, updateFoldingStateAtIndex } from '../../browser/viewModel/foldingModel.js';
import { expandCellRangesWithHiddenCells } from '../../browser/notebookBrowser.js';
import { CellKind } from '../../common/notebookCommon.js';
import { createNotebookCellList, setupInstantiationService, withTestNotebook, } from './testNotebookEditor.js';
import { ListViewInfoAccessor } from '../../browser/view/notebookCellList.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
suite('ListViewInfoAccessor', () => {
    let disposables;
    let instantiationService;
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = setupInstantiationService(disposables);
    });
    test('basics', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3;', 'javascript', CellKind.Code, [], {}],
        ], (editor, viewModel, ds) => {
            const foldingModel = ds.add(new FoldingModel());
            foldingModel.attachViewModel(viewModel);
            const cellList = ds.add(createNotebookCellList(instantiationService, ds));
            cellList.attachViewModel(viewModel);
            const listViewInfoAccessor = ds.add(new ListViewInfoAccessor(cellList));
            assert.strictEqual(listViewInfoAccessor.getViewIndex(viewModel.cellAt(0)), 0);
            assert.strictEqual(listViewInfoAccessor.getViewIndex(viewModel.cellAt(1)), 1);
            assert.strictEqual(listViewInfoAccessor.getViewIndex(viewModel.cellAt(2)), 2);
            assert.strictEqual(listViewInfoAccessor.getViewIndex(viewModel.cellAt(3)), 3);
            assert.strictEqual(listViewInfoAccessor.getViewIndex(viewModel.cellAt(4)), 4);
            assert.deepStrictEqual(listViewInfoAccessor.getCellRangeFromViewRange(0, 1), {
                start: 0,
                end: 1,
            });
            assert.deepStrictEqual(listViewInfoAccessor.getCellRangeFromViewRange(1, 2), {
                start: 1,
                end: 2,
            });
            updateFoldingStateAtIndex(foldingModel, 0, true);
            updateFoldingStateAtIndex(foldingModel, 2, true);
            viewModel.updateFoldingRanges(foldingModel.regions);
            cellList.setHiddenAreas(viewModel.getHiddenRanges(), true);
            assert.strictEqual(listViewInfoAccessor.getViewIndex(viewModel.cellAt(0)), 0);
            assert.strictEqual(listViewInfoAccessor.getViewIndex(viewModel.cellAt(1)), -1);
            assert.strictEqual(listViewInfoAccessor.getViewIndex(viewModel.cellAt(2)), 1);
            assert.strictEqual(listViewInfoAccessor.getViewIndex(viewModel.cellAt(3)), -1);
            assert.strictEqual(listViewInfoAccessor.getViewIndex(viewModel.cellAt(4)), -1);
            assert.deepStrictEqual(listViewInfoAccessor.getCellRangeFromViewRange(0, 1), {
                start: 0,
                end: 2,
            });
            assert.deepStrictEqual(listViewInfoAccessor.getCellRangeFromViewRange(1, 2), {
                start: 2,
                end: 5,
            });
            assert.deepStrictEqual(listViewInfoAccessor.getCellsFromViewRange(0, 1), viewModel.getCellsInRange({ start: 0, end: 2 }));
            assert.deepStrictEqual(listViewInfoAccessor.getCellsFromViewRange(1, 2), viewModel.getCellsInRange({ start: 2, end: 5 }));
            const notebookEditor = new (class extends mock() {
                getViewIndexByModelIndex(index) {
                    return listViewInfoAccessor.getViewIndex(viewModel.viewCells[index]);
                }
                getCellRangeFromViewRange(startIndex, endIndex) {
                    return listViewInfoAccessor.getCellRangeFromViewRange(startIndex, endIndex);
                }
                cellAt(index) {
                    return viewModel.cellAt(index);
                }
            })();
            assert.deepStrictEqual(expandCellRangesWithHiddenCells(notebookEditor, [{ start: 0, end: 1 }]), [{ start: 0, end: 2 }]);
            assert.deepStrictEqual(expandCellRangesWithHiddenCells(notebookEditor, [{ start: 2, end: 3 }]), [{ start: 2, end: 5 }]);
            assert.deepStrictEqual(expandCellRangesWithHiddenCells(notebookEditor, [
                { start: 0, end: 1 },
                { start: 2, end: 3 },
            ]), [{ start: 0, end: 5 }]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9ub3RlYm9va0VkaXRvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFOUQsT0FBTyxFQUFFLFlBQVksRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSwrQkFBK0IsRUFBbUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUNOLHNCQUFzQixFQUN0Qix5QkFBeUIsRUFDekIsZ0JBQWdCLEdBQ2hCLE1BQU0seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDN0UsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXpFLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7SUFDbEMsSUFBSSxXQUE0QixDQUFBO0lBQ2hDLElBQUksb0JBQThDLENBQUE7SUFFbEQsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN0QixDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ25DLG9CQUFv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