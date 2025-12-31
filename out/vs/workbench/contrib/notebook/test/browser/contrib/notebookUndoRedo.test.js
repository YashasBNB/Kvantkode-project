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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tVbmRvUmVkby50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL2NvbnRyaWIvbm90ZWJvb2tVbmRvUmVkby50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNyRyxPQUFPLEVBQWdCLFFBQVEsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRW5GLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFDaEMsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUU3RCxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUs7UUFDbkIsTUFBTSxnQkFBZ0IsQ0FDckI7WUFDQyxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7U0FDN0MsRUFDRCxLQUFLLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQy9DLE1BQU0s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