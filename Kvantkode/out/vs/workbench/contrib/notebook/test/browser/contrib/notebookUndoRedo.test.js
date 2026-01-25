/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { CellKind, SelectionStateType } from '../../../common/notebookCommon.js';
import { createNotebookCellList, withTestNotebook } from '../testNotebookEditor.js';
suite('Notebook Undo/Redo', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    test('Basics', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['body', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, _accessor) => {
            assert.strictEqual(viewModel.length, 2);
            assert.strictEqual(viewModel.getVersionId(), 0);
            assert.strictEqual(viewModel.getAlternativeId(), '0_0,1;1,1');
            editor.textModel.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 0,
                    count: 2,
                    cells: [],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(viewModel.length, 0);
            assert.strictEqual(viewModel.getVersionId(), 1);
            assert.strictEqual(viewModel.getAlternativeId(), '1_');
            await viewModel.undo();
            assert.strictEqual(viewModel.length, 2);
            assert.strictEqual(viewModel.getVersionId(), 2);
            assert.strictEqual(viewModel.getAlternativeId(), '0_0,1;1,1');
            await viewModel.redo();
            assert.strictEqual(viewModel.length, 0);
            assert.strictEqual(viewModel.getVersionId(), 3);
            assert.strictEqual(viewModel.getAlternativeId(), '1_');
            editor.textModel.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 0,
                    count: 0,
                    cells: [
                        {
                            source: '# header 3',
                            language: 'markdown',
                            cellKind: CellKind.Markup,
                            outputs: [],
                            mime: undefined,
                        },
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(viewModel.getVersionId(), 4);
            assert.strictEqual(viewModel.getAlternativeId(), '4_2,1');
            await viewModel.undo();
            assert.strictEqual(viewModel.getVersionId(), 5);
            assert.strictEqual(viewModel.getAlternativeId(), '1_');
        });
    });
    test('Invalid replace count should not throw', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['body', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, _viewModel, _ds, _accessor) => {
            editor.textModel.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 0,
                    count: 2,
                    cells: [],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.doesNotThrow(() => {
                editor.textModel.applyEdits([
                    {
                        editType: 1 /* CellEditType.Replace */,
                        index: 0,
                        count: 2,
                        cells: [
                            {
                                source: '# header 2',
                                language: 'markdown',
                                cellKind: CellKind.Markup,
                                outputs: [],
                                mime: undefined,
                            },
                        ],
                    },
                ], true, undefined, () => undefined, undefined, true);
            });
        });
    });
    test('Replace beyond length', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['body', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel) => {
            editor.textModel.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 1,
                    count: 2,
                    cells: [],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.deepStrictEqual(viewModel.length, 1);
            await viewModel.undo();
            assert.deepStrictEqual(viewModel.length, 2);
        });
    });
    test('Invalid replace count should not affect undo/redo', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['body', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, _accessor) => {
            editor.textModel.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 0,
                    count: 2,
                    cells: [],
                },
            ], true, undefined, () => undefined, undefined, true);
            editor.textModel.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 0,
                    count: 2,
                    cells: [
                        {
                            source: '# header 2',
                            language: 'markdown',
                            cellKind: CellKind.Markup,
                            outputs: [],
                            mime: undefined,
                        },
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.deepStrictEqual(viewModel.length, 1);
            await viewModel.undo();
            await viewModel.undo();
            assert.deepStrictEqual(viewModel.length, 2);
            editor.textModel.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 1,
                    count: 2,
                    cells: [],
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.deepStrictEqual(viewModel.length, 1);
        });
    });
    test('Focus/selection update', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['body', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            const cellList = createNotebookCellList(accessor, disposables);
            cellList.attachViewModel(viewModel);
            cellList.setFocus([1]);
            editor.textModel.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 2,
                    count: 0,
                    cells: [
                        {
                            source: '# header 2',
                            language: 'markdown',
                            cellKind: CellKind.Markup,
                            outputs: [],
                            mime: undefined,
                        },
                    ],
                },
            ], true, {
                focus: { start: 1, end: 2 },
                selections: [{ start: 1, end: 2 }],
                kind: SelectionStateType.Index,
            }, () => {
                return {
                    focus: { start: 2, end: 3 },
                    selections: [{ start: 2, end: 3 }],
                    kind: SelectionStateType.Index,
                };
            }, undefined, true);
            assert.strictEqual(viewModel.length, 3);
            assert.strictEqual(viewModel.getVersionId(), 1);
            assert.deepStrictEqual(cellList.getFocus(), [2]);
            assert.deepStrictEqual(cellList.getSelection(), [2]);
            await viewModel.undo();
            assert.strictEqual(viewModel.length, 2);
            assert.strictEqual(viewModel.getVersionId(), 2);
            assert.deepStrictEqual(cellList.getFocus(), [1]);
            assert.deepStrictEqual(cellList.getSelection(), [1]);
            await viewModel.redo();
            assert.strictEqual(viewModel.length, 3);
            assert.strictEqual(viewModel.getVersionId(), 3);
            assert.deepStrictEqual(cellList.getFocus(), [2]);
            assert.deepStrictEqual(cellList.getSelection(), [2]);
        });
    });
    test('Batch edits', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['body', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            editor.textModel.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 2,
                    count: 0,
                    cells: [
                        {
                            source: '# header 2',
                            language: 'markdown',
                            cellKind: CellKind.Markup,
                            outputs: [],
                            mime: undefined,
                        },
                    ],
                },
                {
                    editType: 3 /* CellEditType.Metadata */,
                    index: 0,
                    metadata: { inputCollapsed: false },
                },
            ], true, undefined, () => undefined, undefined, true);
            assert.strictEqual(viewModel.getVersionId(), 1);
            assert.deepStrictEqual(viewModel.cellAt(0)?.metadata, { inputCollapsed: false });
            await viewModel.undo();
            assert.strictEqual(viewModel.length, 2);
            assert.strictEqual(viewModel.getVersionId(), 2);
            assert.deepStrictEqual(viewModel.cellAt(0)?.metadata, {});
            await viewModel.redo();
            assert.strictEqual(viewModel.length, 3);
            assert.strictEqual(viewModel.getVersionId(), 3);
            assert.deepStrictEqual(viewModel.cellAt(0)?.metadata, { inputCollapsed: false });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tVbmRvUmVkby50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvY29udHJpYi9ub3RlYm9va1VuZG9SZWRvLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JHLE9BQU8sRUFBZ0IsUUFBUSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFbkYsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtJQUNoQyxNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRTdELElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSztRQUNuQixNQUFNLGdCQUFnQixDQUNyQjtZQUNDLENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztTQUM3QyxFQUNELEtBQUssRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDL0Ms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