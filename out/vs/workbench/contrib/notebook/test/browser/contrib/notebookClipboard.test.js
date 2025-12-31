/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { mock } from '../../../../../../base/test/common/mock.js';
import { NotebookClipboardContribution, runCopyCells, runCutCells, } from '../../../browser/contrib/clipboard/notebookClipboard.js';
import { CellKind, NOTEBOOK_EDITOR_ID, SelectionStateType } from '../../../common/notebookCommon.js';
import { withTestNotebook } from '../testNotebookEditor.js';
import { INotebookService } from '../../../common/notebookService.js';
import { FoldingModel, updateFoldingStateAtIndex } from '../../../browser/viewModel/foldingModel.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
suite('Notebook Clipboard', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const createEditorService = (editor) => {
        const visibleEditorPane = new (class extends mock() {
            getId() {
                return NOTEBOOK_EDITOR_ID;
            }
            getControl() {
                return editor;
            }
        })();
        const editorService = new (class extends mock() {
            get activeEditorPane() {
                return visibleEditorPane;
            }
        })();
        return editorService;
    };
    test.skip('Cut multiple selected cells', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 2', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            accessor.stub(INotebookService, new (class extends mock() {
                setToCopy() { }
            })());
            const clipboardContrib = new NotebookClipboardContribution(createEditorService(editor));
            viewModel.updateSelectionsState({
                kind: SelectionStateType.Index,
                focus: { start: 0, end: 2 },
                selections: [{ start: 0, end: 2 }],
            }, 'model');
            assert.ok(clipboardContrib.runCutAction(accessor));
            assert.deepStrictEqual(viewModel.getFocus(), { start: 0, end: 1 });
            assert.strictEqual(viewModel.length, 1);
            assert.strictEqual(viewModel.cellAt(0)?.getText(), 'paragraph 2');
        });
    });
    test.skip('Cut should take folding info into account', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3', 'javascript', CellKind.Markup, [], {}],
            ['# header d', 'markdown', CellKind.Markup, [], {}],
            ['var e = 4;', 'javascript', CellKind.Code, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            const foldingModel = new FoldingModel();
            foldingModel.attachViewModel(viewModel);
            updateFoldingStateAtIndex(foldingModel, 0, true);
            updateFoldingStateAtIndex(foldingModel, 2, true);
            viewModel.updateFoldingRanges(foldingModel.regions);
            editor.setHiddenAreas(viewModel.getHiddenRanges());
            viewModel.updateSelectionsState({
                kind: SelectionStateType.Index,
                focus: { start: 0, end: 1 },
                selections: [{ start: 0, end: 1 }],
            }, 'model');
            accessor.stub(INotebookService, new (class extends mock() {
                setToCopy() { }
            })());
            const clipboardContrib = new NotebookClipboardContribution(createEditorService(editor));
            clipboardContrib.runCutAction(accessor);
            assert.strictEqual(viewModel.length, 5);
            await viewModel.undo();
            assert.strictEqual(viewModel.length, 7);
        });
    });
    test.skip('Copy should take folding info into account', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['var c = 3', 'javascript', CellKind.Markup, [], {}],
            ['# header d', 'markdown', CellKind.Markup, [], {}],
            ['var e = 4;', 'javascript', CellKind.Code, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            const foldingModel = new FoldingModel();
            foldingModel.attachViewModel(viewModel);
            updateFoldingStateAtIndex(foldingModel, 0, true);
            updateFoldingStateAtIndex(foldingModel, 2, true);
            viewModel.updateFoldingRanges(foldingModel.regions);
            editor.setHiddenAreas(viewModel.getHiddenRanges());
            viewModel.updateSelectionsState({
                kind: SelectionStateType.Index,
                focus: { start: 0, end: 1 },
                selections: [{ start: 0, end: 1 }],
            }, 'model');
            let _cells = [];
            accessor.stub(INotebookService, new (class extends mock() {
                setToCopy(cells) {
                    _cells = cells;
                }
                getToCopy() {
                    return { items: _cells, isCopy: true };
                }
            })());
            const clipboardContrib = new NotebookClipboardContribution(createEditorService(editor));
            clipboardContrib.runCopyAction(accessor);
            viewModel.updateSelectionsState({
                kind: SelectionStateType.Index,
                focus: { start: 6, end: 7 },
                selections: [{ start: 6, end: 7 }],
            }, 'model');
            clipboardContrib.runPasteAction(accessor);
            assert.strictEqual(viewModel.length, 9);
            assert.strictEqual(viewModel.cellAt(8)?.getText(), 'var b = 1;');
        });
    });
    test.skip('#119773, cut last item should not focus on the top first cell', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 2', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            accessor.stub(INotebookService, new (class extends mock() {
                setToCopy() { }
            })());
            const clipboardContrib = new NotebookClipboardContribution(createEditorService(editor));
            viewModel.updateSelectionsState({
                kind: SelectionStateType.Index,
                focus: { start: 2, end: 3 },
                selections: [{ start: 2, end: 3 }],
            }, 'model');
            assert.ok(clipboardContrib.runCutAction(accessor));
            // it should be the last cell, other than the first one.
            assert.deepStrictEqual(viewModel.getFocus(), { start: 1, end: 2 });
        });
    });
    test.skip('#119771, undo paste should restore selections', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 2', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            accessor.stub(INotebookService, new (class extends mock() {
                setToCopy() { }
                getToCopy() {
                    return {
                        items: [viewModel.cellAt(0).model],
                        isCopy: true,
                    };
                }
            })());
            const clipboardContrib = new NotebookClipboardContribution(createEditorService(editor));
            viewModel.updateSelectionsState({
                kind: SelectionStateType.Index,
                focus: { start: 2, end: 3 },
                selections: [{ start: 2, end: 3 }],
            }, 'model');
            assert.ok(clipboardContrib.runPasteAction(accessor));
            assert.strictEqual(viewModel.length, 4);
            assert.deepStrictEqual(viewModel.getFocus(), { start: 3, end: 4 });
            assert.strictEqual(viewModel.cellAt(3)?.getText(), '# header 1');
            await viewModel.undo();
            assert.strictEqual(viewModel.length, 3);
            assert.deepStrictEqual(viewModel.getFocus(), { start: 2, end: 3 });
        });
    });
    test('copy cell from ui still works if the target cell is not part of a selection', async () => {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 2', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            let _toCopy = [];
            accessor.stub(INotebookService, new (class extends mock() {
                setToCopy(toCopy) {
                    _toCopy = toCopy;
                }
                getToCopy() {
                    return {
                        items: _toCopy,
                        isCopy: true,
                    };
                }
            })());
            viewModel.updateSelectionsState({
                kind: SelectionStateType.Index,
                focus: { start: 0, end: 1 },
                selections: [{ start: 0, end: 2 }],
            }, 'model');
            assert.ok(runCopyCells(accessor, editor, viewModel.cellAt(0)));
            assert.deepStrictEqual(_toCopy, [viewModel.cellAt(0).model, viewModel.cellAt(1).model]);
            assert.ok(runCopyCells(accessor, editor, viewModel.cellAt(2)));
            assert.deepStrictEqual(_toCopy.length, 1);
            assert.deepStrictEqual(_toCopy, [viewModel.cellAt(2).model]);
        });
    });
    test('cut cell from ui still works if the target cell is not part of a selection', async () => {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 2', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 3', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            accessor.stub(INotebookService, new (class extends mock() {
                setToCopy() { }
                getToCopy() {
                    return { items: [], isCopy: true };
                }
            })());
            viewModel.updateSelectionsState({
                kind: SelectionStateType.Index,
                focus: { start: 0, end: 1 },
                selections: [{ start: 0, end: 2 }],
            }, 'model');
            assert.ok(runCutCells(accessor, editor, viewModel.cellAt(0)));
            assert.strictEqual(viewModel.length, 2);
            await viewModel.undo();
            assert.strictEqual(viewModel.length, 4);
            assert.deepStrictEqual(viewModel.getFocus(), { start: 0, end: 1 });
            assert.deepStrictEqual(viewModel.getSelections(), [{ start: 0, end: 2 }]);
            assert.ok(runCutCells(accessor, editor, viewModel.cellAt(2)));
            assert.strictEqual(viewModel.length, 3);
            assert.deepStrictEqual(viewModel.getFocus(), { start: 0, end: 1 });
            assert.strictEqual(viewModel.cellAt(0)?.getText(), '# header 1');
            assert.strictEqual(viewModel.cellAt(1)?.getText(), 'paragraph 1');
            assert.strictEqual(viewModel.cellAt(2)?.getText(), 'paragraph 3');
            await viewModel.undo();
            assert.strictEqual(viewModel.length, 4);
            viewModel.updateSelectionsState({
                kind: SelectionStateType.Index,
                focus: { start: 2, end: 3 },
                selections: [{ start: 2, end: 4 }],
            }, 'model');
            assert.deepStrictEqual(viewModel.getFocus(), { start: 2, end: 3 });
            assert.ok(runCutCells(accessor, editor, viewModel.cellAt(0)));
            assert.deepStrictEqual(viewModel.getFocus(), { start: 1, end: 2 });
            assert.deepStrictEqual(viewModel.getSelections(), [{ start: 1, end: 3 }]);
        });
    });
    test('cut focus cell still works if the focus is not part of any selection', async () => {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 2', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 3', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            accessor.stub(INotebookService, new (class extends mock() {
                setToCopy() { }
                getToCopy() {
                    return { items: [], isCopy: true };
                }
            })());
            viewModel.updateSelectionsState({
                kind: SelectionStateType.Index,
                focus: { start: 0, end: 1 },
                selections: [{ start: 2, end: 4 }],
            }, 'model');
            assert.ok(runCutCells(accessor, editor, undefined));
            assert.strictEqual(viewModel.length, 3);
            assert.deepStrictEqual(viewModel.getFocus(), { start: 0, end: 1 });
            assert.deepStrictEqual(viewModel.getSelections(), [{ start: 1, end: 3 }]);
        });
    });
    test('cut focus cell still works if the focus is not part of any selection 2', async () => {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 2', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 3', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            accessor.stub(INotebookService, new (class extends mock() {
                setToCopy() { }
                getToCopy() {
                    return { items: [], isCopy: true };
                }
            })());
            viewModel.updateSelectionsState({
                kind: SelectionStateType.Index,
                focus: { start: 3, end: 4 },
                selections: [{ start: 0, end: 2 }],
            }, 'model');
            assert.ok(runCutCells(accessor, editor, undefined));
            assert.strictEqual(viewModel.length, 3);
            assert.deepStrictEqual(viewModel.getFocus(), { start: 2, end: 3 });
            assert.deepStrictEqual(viewModel.getSelections(), [{ start: 0, end: 2 }]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDbGlwYm9hcmQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9jb250cmliL25vdGVib29rQ2xpcGJvYXJkLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLFlBQVksRUFDWixXQUFXLEdBQ1gsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDcEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFJM0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDckUsT0FBTyxFQUFFLFlBQVksRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXBHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRXJHLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFDaEMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxNQUFNLG1CQUFtQixHQUFHLENBQUMsTUFBNkIsRUFBRSxFQUFFO1FBQzdELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLEtBQU0sU0FBUSxJQUFJLEVBQXNCO1lBQzdELEtBQUs7Z0JBQ2IsT0FBTyxrQkFBa0IsQ0FBQTtZQUMxQixDQUFDO1lBQ1EsVUFBVTtnQkFDbEIsT0FBTyxNQUFNLENBQUE7WUFDZCxDQUFDO1NBQ0QsQ0FBQyxFQUFFLENBQUE7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