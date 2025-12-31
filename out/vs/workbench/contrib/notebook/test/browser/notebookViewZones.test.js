/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { NotebookCellsLayout } from '../../browser/view/notebookCellListView.js';
import { FoldingModel } from '../../browser/viewModel/foldingModel.js';
import { CellKind } from '../../common/notebookCommon.js';
import { createNotebookCellList, setupInstantiationService, withTestNotebook, } from './testNotebookEditor.js';
suite('NotebookRangeMap', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('empty', () => {
        const rangeMap = new NotebookCellsLayout();
        assert.strictEqual(rangeMap.size, 0);
        assert.strictEqual(rangeMap.count, 0);
    });
    const one = { size: 1 };
    const two = { size: 2 };
    const three = { size: 3 };
    const five = { size: 5 };
    const ten = { size: 10 };
    test('length & count', () => {
        const rangeMap = new NotebookCellsLayout();
        rangeMap.splice(0, 0, [one]);
        assert.strictEqual(rangeMap.size, 1);
        assert.strictEqual(rangeMap.count, 1);
    });
    test('length & count #2', () => {
        const rangeMap = new NotebookCellsLayout();
        rangeMap.splice(0, 0, [one, one, one, one, one]);
        assert.strictEqual(rangeMap.size, 5);
        assert.strictEqual(rangeMap.count, 5);
    });
    test('length & count #3', () => {
        const rangeMap = new NotebookCellsLayout();
        rangeMap.splice(0, 0, [five]);
        assert.strictEqual(rangeMap.size, 5);
        assert.strictEqual(rangeMap.count, 1);
    });
    test('length & count #4', () => {
        const rangeMap = new NotebookCellsLayout();
        rangeMap.splice(0, 0, [five, five, five, five, five]);
        assert.strictEqual(rangeMap.size, 25);
        assert.strictEqual(rangeMap.count, 5);
    });
    test('insert', () => {
        const rangeMap = new NotebookCellsLayout();
        rangeMap.splice(0, 0, [five, five, five, five, five]);
        assert.strictEqual(rangeMap.size, 25);
        assert.strictEqual(rangeMap.count, 5);
        rangeMap.splice(0, 0, [five, five, five, five, five]);
        assert.strictEqual(rangeMap.size, 50);
        assert.strictEqual(rangeMap.count, 10);
        rangeMap.splice(5, 0, [ten, ten]);
        assert.strictEqual(rangeMap.size, 70);
        assert.strictEqual(rangeMap.count, 12);
        rangeMap.splice(12, 0, [{ size: 200 }]);
        assert.strictEqual(rangeMap.size, 270);
        assert.strictEqual(rangeMap.count, 13);
    });
    test('delete', () => {
        const rangeMap = new NotebookCellsLayout();
        rangeMap.splice(0, 0, [
            five,
            five,
            five,
            five,
            five,
            five,
            five,
            five,
            five,
            five,
            five,
            five,
            five,
            five,
            five,
            five,
            five,
            five,
            five,
            five,
        ]);
        assert.strictEqual(rangeMap.size, 100);
        assert.strictEqual(rangeMap.count, 20);
        rangeMap.splice(10, 5);
        assert.strictEqual(rangeMap.size, 75);
        assert.strictEqual(rangeMap.count, 15);
        rangeMap.splice(0, 1);
        assert.strictEqual(rangeMap.size, 70);
        assert.strictEqual(rangeMap.count, 14);
        rangeMap.splice(1, 13);
        assert.strictEqual(rangeMap.size, 5);
        assert.strictEqual(rangeMap.count, 1);
        rangeMap.splice(1, 1);
        assert.strictEqual(rangeMap.size, 5);
        assert.strictEqual(rangeMap.count, 1);
    });
    test('insert & delete', () => {
        const rangeMap = new NotebookCellsLayout();
        assert.strictEqual(rangeMap.size, 0);
        assert.strictEqual(rangeMap.count, 0);
        rangeMap.splice(0, 0, [one]);
        assert.strictEqual(rangeMap.size, 1);
        assert.strictEqual(rangeMap.count, 1);
        rangeMap.splice(0, 1);
        assert.strictEqual(rangeMap.size, 0);
        assert.strictEqual(rangeMap.count, 0);
    });
    test('insert & delete #2', () => {
        const rangeMap = new NotebookCellsLayout();
        rangeMap.splice(0, 0, [one, one, one, one, one, one, one, one, one, one]);
        rangeMap.splice(2, 6);
        assert.strictEqual(rangeMap.count, 4);
        assert.strictEqual(rangeMap.size, 4);
    });
    test('insert & delete #3', () => {
        const rangeMap = new NotebookCellsLayout();
        rangeMap.splice(0, 0, [
            one,
            one,
            one,
            one,
            one,
            one,
            one,
            one,
            one,
            one,
            two,
            two,
            two,
            two,
            two,
            two,
            two,
            two,
            two,
            two,
        ]);
        rangeMap.splice(8, 4);
        assert.strictEqual(rangeMap.count, 16);
        assert.strictEqual(rangeMap.size, 24);
    });
    test('insert & delete #4', () => {
        const rangeMap = new NotebookCellsLayout();
        rangeMap.splice(0, 0, [
            one,
            one,
            one,
            one,
            one,
            one,
            one,
            one,
            one,
            one,
            two,
            two,
            two,
            two,
            two,
            two,
            two,
            two,
            two,
            two,
        ]);
        rangeMap.splice(5, 0, [three, three, three, three, three]);
        assert.strictEqual(rangeMap.count, 25);
        assert.strictEqual(rangeMap.size, 45);
        rangeMap.splice(4, 7);
        assert.strictEqual(rangeMap.count, 18);
        assert.strictEqual(rangeMap.size, 28);
    });
    suite('indexAt, positionAt', () => {
        test('empty', () => {
            const rangeMap = new NotebookCellsLayout();
            assert.strictEqual(rangeMap.indexAt(0), 0);
            assert.strictEqual(rangeMap.indexAt(10), 0);
            assert.strictEqual(rangeMap.indexAt(-1), -1);
            assert.strictEqual(rangeMap.positionAt(0), -1);
            assert.strictEqual(rangeMap.positionAt(10), -1);
            assert.strictEqual(rangeMap.positionAt(-1), -1);
        });
        test('simple', () => {
            const rangeMap = new NotebookCellsLayout();
            rangeMap.splice(0, 0, [one]);
            assert.strictEqual(rangeMap.indexAt(0), 0);
            assert.strictEqual(rangeMap.indexAt(1), 1);
            assert.strictEqual(rangeMap.positionAt(0), 0);
            assert.strictEqual(rangeMap.positionAt(1), -1);
        });
        test('simple #2', () => {
            const rangeMap = new NotebookCellsLayout();
            rangeMap.splice(0, 0, [ten]);
            assert.strictEqual(rangeMap.indexAt(0), 0);
            assert.strictEqual(rangeMap.indexAt(5), 0);
            assert.strictEqual(rangeMap.indexAt(9), 0);
            assert.strictEqual(rangeMap.indexAt(10), 1);
            assert.strictEqual(rangeMap.positionAt(0), 0);
            assert.strictEqual(rangeMap.positionAt(1), -1);
        });
        test('insert', () => {
            const rangeMap = new NotebookCellsLayout();
            rangeMap.splice(0, 0, [one, one, one, one, one, one, one, one, one, one]);
            assert.strictEqual(rangeMap.indexAt(0), 0);
            assert.strictEqual(rangeMap.indexAt(1), 1);
            assert.strictEqual(rangeMap.indexAt(5), 5);
            assert.strictEqual(rangeMap.indexAt(9), 9);
            assert.strictEqual(rangeMap.indexAt(10), 10);
            assert.strictEqual(rangeMap.indexAt(11), 10);
            rangeMap.splice(10, 0, [one, one, one, one, one, one, one, one, one, one]);
            assert.strictEqual(rangeMap.indexAt(10), 10);
            assert.strictEqual(rangeMap.indexAt(19), 19);
            assert.strictEqual(rangeMap.indexAt(20), 20);
            assert.strictEqual(rangeMap.indexAt(21), 20);
            assert.strictEqual(rangeMap.positionAt(0), 0);
            assert.strictEqual(rangeMap.positionAt(1), 1);
            assert.strictEqual(rangeMap.positionAt(19), 19);
            assert.strictEqual(rangeMap.positionAt(20), -1);
        });
        test('delete', () => {
            const rangeMap = new NotebookCellsLayout();
            rangeMap.splice(0, 0, [one, one, one, one, one, one, one, one, one, one]);
            rangeMap.splice(2, 6);
            assert.strictEqual(rangeMap.indexAt(0), 0);
            assert.strictEqual(rangeMap.indexAt(1), 1);
            assert.strictEqual(rangeMap.indexAt(3), 3);
            assert.strictEqual(rangeMap.indexAt(4), 4);
            assert.strictEqual(rangeMap.indexAt(5), 4);
            assert.strictEqual(rangeMap.positionAt(0), 0);
            assert.strictEqual(rangeMap.positionAt(1), 1);
            assert.strictEqual(rangeMap.positionAt(3), 3);
            assert.strictEqual(rangeMap.positionAt(4), -1);
        });
        test('delete #2', () => {
            const rangeMap = new NotebookCellsLayout();
            rangeMap.splice(0, 0, [ten, ten, ten, ten, ten, ten, ten, ten, ten, ten]);
            rangeMap.splice(2, 6);
            assert.strictEqual(rangeMap.indexAt(0), 0);
            assert.strictEqual(rangeMap.indexAt(1), 0);
            assert.strictEqual(rangeMap.indexAt(30), 3);
            assert.strictEqual(rangeMap.indexAt(40), 4);
            assert.strictEqual(rangeMap.indexAt(50), 4);
            assert.strictEqual(rangeMap.positionAt(0), 0);
            assert.strictEqual(rangeMap.positionAt(1), 10);
            assert.strictEqual(rangeMap.positionAt(2), 20);
            assert.strictEqual(rangeMap.positionAt(3), 30);
            assert.strictEqual(rangeMap.positionAt(4), -1);
        });
    });
});
suite('NotebookRangeMap with top padding', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('empty', () => {
        const rangeMap = new NotebookCellsLayout(10);
        assert.strictEqual(rangeMap.size, 10);
        assert.strictEqual(rangeMap.count, 0);
    });
    const one = { size: 1 };
    const five = { size: 5 };
    const ten = { size: 10 };
    test('length & count', () => {
        const rangeMap = new NotebookCellsLayout(10);
        rangeMap.splice(0, 0, [one]);
        assert.strictEqual(rangeMap.size, 11);
        assert.strictEqual(rangeMap.count, 1);
    });
    test('length & count #2', () => {
        const rangeMap = new NotebookCellsLayout(10);
        rangeMap.splice(0, 0, [one, one, one, one, one]);
        assert.strictEqual(rangeMap.size, 15);
        assert.strictEqual(rangeMap.count, 5);
    });
    test('length & count #3', () => {
        const rangeMap = new NotebookCellsLayout(10);
        rangeMap.splice(0, 0, [five]);
        assert.strictEqual(rangeMap.size, 15);
        assert.strictEqual(rangeMap.count, 1);
    });
    test('length & count #4', () => {
        const rangeMap = new NotebookCellsLayout(10);
        rangeMap.splice(0, 0, [five, five, five, five, five]);
        assert.strictEqual(rangeMap.size, 35);
        assert.strictEqual(rangeMap.count, 5);
    });
    test('insert', () => {
        const rangeMap = new NotebookCellsLayout(10);
        rangeMap.splice(0, 0, [five, five, five, five, five]);
        assert.strictEqual(rangeMap.size, 35);
        assert.strictEqual(rangeMap.count, 5);
        rangeMap.splice(0, 0, [five, five, five, five, five]);
        assert.strictEqual(rangeMap.size, 60);
        assert.strictEqual(rangeMap.count, 10);
        rangeMap.splice(5, 0, [ten, ten]);
        assert.strictEqual(rangeMap.size, 80);
        assert.strictEqual(rangeMap.count, 12);
        rangeMap.splice(12, 0, [{ size: 200 }]);
        assert.strictEqual(rangeMap.size, 280);
        assert.strictEqual(rangeMap.count, 13);
    });
    suite('indexAt, positionAt', () => {
        test('empty', () => {
            const rangeMap = new NotebookCellsLayout(10);
            assert.strictEqual(rangeMap.indexAt(0), 0);
            assert.strictEqual(rangeMap.indexAt(10), 0);
            assert.strictEqual(rangeMap.indexAt(-1), -1);
            assert.strictEqual(rangeMap.positionAt(0), -1);
            assert.strictEqual(rangeMap.positionAt(10), -1);
            assert.strictEqual(rangeMap.positionAt(-1), -1);
        });
        test('simple', () => {
            const rangeMap = new NotebookCellsLayout(10);
            rangeMap.splice(0, 0, [one]);
            assert.strictEqual(rangeMap.indexAt(0), 0);
            assert.strictEqual(rangeMap.indexAt(1), 0);
            assert.strictEqual(rangeMap.indexAt(10), 0);
            assert.strictEqual(rangeMap.indexAt(11), 1);
            assert.strictEqual(rangeMap.positionAt(0), 10);
            assert.strictEqual(rangeMap.positionAt(1), -1);
        });
    });
});
suite('NotebookRangeMap with whitesspaces', () => {
    let testDisposables;
    let instantiationService;
    let config;
    teardown(() => {
        testDisposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        testDisposables = new DisposableStore();
        instantiationService = setupInstantiationService(testDisposables);
        config = new TestConfigurationService();
        instantiationService.stub(IConfigurationService, config);
    });
    test('simple', () => {
        const rangeMap = new NotebookCellsLayout(0);
        rangeMap.splice(0, 0, [
            { size: 479 },
            { size: 163 },
            { size: 182 },
            { size: 106 },
            { size: 106 },
            { size: 106 },
            { size: 87 },
        ]);
        const start = rangeMap.indexAt(650);
        const end = rangeMap.indexAfter(650 + 890 - 1);
        assert.strictEqual(start, 2);
        assert.strictEqual(end, 7);
        rangeMap.insertWhitespace('1', 0, 18);
        assert.strictEqual(rangeMap.indexAt(650), 1);
    });
    test('Whitespace CRUD', async function () {
        const twenty = { size: 20 };
        const rangeMap = new NotebookCellsLayout(0);
        rangeMap.splice(0, 0, [twenty, twenty, twenty]);
        rangeMap.insertWhitespace('0', 0, 5);
        rangeMap.insertWhitespace('1', 0, 5);
        assert.strictEqual(rangeMap.indexAt(0), 0);
        assert.strictEqual(rangeMap.indexAt(1), 0);
        assert.strictEqual(rangeMap.indexAt(10), 0);
        assert.strictEqual(rangeMap.indexAt(11), 0);
        assert.strictEqual(rangeMap.indexAt(21), 0);
        assert.strictEqual(rangeMap.indexAt(31), 1);
        assert.strictEqual(rangeMap.positionAt(0), 10);
        assert.strictEqual(rangeMap.getWhitespacePosition('0'), 0);
        assert.strictEqual(rangeMap.getWhitespacePosition('1'), 5);
        assert.strictEqual(rangeMap.positionAt(0), 10);
        assert.strictEqual(rangeMap.positionAt(1), 30);
        rangeMap.changeOneWhitespace('0', 0, 10);
        assert.strictEqual(rangeMap.getWhitespacePosition('0'), 0);
        assert.strictEqual(rangeMap.getWhitespacePosition('1'), 10);
        assert.strictEqual(rangeMap.positionAt(0), 15);
        assert.strictEqual(rangeMap.positionAt(1), 35);
        rangeMap.removeWhitespace('1');
        assert.strictEqual(rangeMap.getWhitespacePosition('0'), 0);
        assert.strictEqual(rangeMap.positionAt(0), 10);
        assert.strictEqual(rangeMap.positionAt(1), 30);
    });
    test('Whitespace with editing', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['# header c', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, disposables) => {
            viewModel.restoreEditorViewState({
                editingCells: [false, false, false, false, false],
                cellLineNumberStates: {},
                editorViewStates: [null, null, null, null, null],
                cellTotalHeights: [50, 100, 50, 100, 50],
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = createNotebookCellList(instantiationService, disposables);
            disposables.add(cellList);
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(210, 100);
            assert.strictEqual(cellList.scrollHeight, 350);
            cellList.changeViewZones((accessor) => {
                const id = accessor.addZone({
                    afterModelPosition: 1,
                    heightInPx: 20,
                    domNode: document.createElement('div'),
                });
                accessor.layoutZone(id);
                assert.strictEqual(cellList.scrollHeight, 370);
                assert.strictEqual(cellList.getElementTop(0), 0);
                assert.strictEqual(cellList.getElementTop(1), 70);
                assert.strictEqual(cellList.getElementTop(2), 170);
                const textModel = editor.textModel;
                textModel.applyEdits([{ editType: 1 /* CellEditType.Replace */, index: 0, count: 1, cells: [] }], true, undefined, () => undefined, undefined, true);
                assert.strictEqual(cellList.getElementTop(0), 20);
                assert.strictEqual(cellList.getElementTop(1), 120);
                assert.strictEqual(cellList.getElementTop(2), 170);
                accessor.removeZone(id);
            });
        });
    });
    test('Multiple Whitespaces', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['# header c', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, disposables) => {
            viewModel.restoreEditorViewState({
                editingCells: [false, false, false, false, false],
                cellLineNumberStates: {},
                editorViewStates: [null, null, null, null, null],
                cellTotalHeights: [50, 100, 50, 100, 50],
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = createNotebookCellList(instantiationService, disposables);
            disposables.add(cellList);
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(210, 100);
            assert.strictEqual(cellList.scrollHeight, 350);
            cellList.changeViewZones((accessor) => {
                const first = accessor.addZone({
                    afterModelPosition: 0,
                    heightInPx: 20,
                    domNode: document.createElement('div'),
                });
                accessor.layoutZone(first);
                const second = accessor.addZone({
                    afterModelPosition: 3,
                    heightInPx: 20,
                    domNode: document.createElement('div'),
                });
                accessor.layoutZone(second);
                assert.strictEqual(cellList.scrollHeight, 390);
                assert.strictEqual(cellList.getElementTop(0), 20);
                assert.strictEqual(cellList.getElementTop(1), 70);
                assert.strictEqual(cellList.getElementTop(2), 170);
                assert.strictEqual(cellList.getElementTop(3), 240);
                accessor.removeZone(first);
                assert.strictEqual(cellList.scrollHeight, 370);
                assert.strictEqual(cellList.getElementTop(0), 0);
                assert.strictEqual(cellList.getElementTop(1), 50);
                assert.strictEqual(cellList.getElementTop(2), 150);
                assert.strictEqual(cellList.getElementTop(3), 220);
                accessor.removeZone(second);
                assert.strictEqual(cellList.scrollHeight, 350);
                assert.strictEqual(cellList.getElementTop(3), 200);
            });
        });
    });
    test('Multiple Whitespaces 2', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['# header c', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, disposables) => {
            viewModel.restoreEditorViewState({
                editingCells: [false, false, false, false, false],
                cellLineNumberStates: {},
                editorViewStates: [null, null, null, null, null],
                cellTotalHeights: [50, 100, 50, 100, 50],
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = createNotebookCellList(instantiationService, disposables);
            disposables.add(cellList);
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(210, 100);
            assert.strictEqual(cellList.scrollHeight, 350);
            cellList.changeViewZones((accessor) => {
                const first = accessor.addZone({
                    afterModelPosition: 0,
                    heightInPx: 20,
                    domNode: document.createElement('div'),
                });
                accessor.layoutZone(first);
                const second = accessor.addZone({
                    afterModelPosition: 1,
                    heightInPx: 20,
                    domNode: document.createElement('div'),
                });
                accessor.layoutZone(second);
                assert.strictEqual(cellList.scrollHeight, 390);
                assert.strictEqual(cellList._getView().getWhitespacePosition(first), 0);
                assert.strictEqual(cellList._getView().getWhitespacePosition(second), 70);
                accessor.removeZone(first);
                accessor.removeZone(second);
            });
        });
    });
    test('Multiple Whitespaces 3', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['# header c', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, disposables) => {
            viewModel.restoreEditorViewState({
                editingCells: [false, false, false, false, false],
                cellLineNumberStates: {},
                editorViewStates: [null, null, null, null, null],
                cellTotalHeights: [50, 100, 50, 100, 50],
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = createNotebookCellList(instantiationService, disposables);
            disposables.add(cellList);
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(210, 100);
            assert.strictEqual(cellList.scrollHeight, 350);
            cellList.changeViewZones((accessor) => {
                const first = accessor.addZone({
                    afterModelPosition: 1,
                    heightInPx: 20,
                    domNode: document.createElement('div'),
                });
                accessor.layoutZone(first);
                const second = accessor.addZone({
                    afterModelPosition: 2,
                    heightInPx: 20,
                    domNode: document.createElement('div'),
                });
                accessor.layoutZone(second);
                assert.strictEqual(cellList.scrollHeight, 390);
                assert.strictEqual(cellList._getView().getWhitespacePosition(first), 50);
                assert.strictEqual(cellList._getView().getWhitespacePosition(second), 170);
                accessor.removeZone(first);
                accessor.removeZone(second);
            });
        });
    });
    // test('Multiple Whitespaces 4', async function () {
    // 	await withTestNotebook(
    // 		[
    // 			['# header a', 'markdown', CellKind.Markup, [], {}],
    // 			['var b = 1;', 'javascript', CellKind.Code, [], {}],
    // 			['# header b', 'markdown', CellKind.Markup, [], {}],
    // 			['var b = 2;', 'javascript', CellKind.Code, [], {}],
    // 			['# header c', 'markdown', CellKind.Markup, [], {}]
    // 		],
    // 		async (editor, viewModel, disposables) => {
    // 			viewModel.restoreEditorViewState({
    // 				editingCells: [false, false, false, false, false],
    // 				cellLineNumberStates: {},
    // 				editorViewStates: [null, null, null, null, null],
    // 				cellTotalHeights: [50, 100, 50, 100, 50],
    // 				collapsedInputCells: {},
    // 				collapsedOutputCells: {},
    // 			});
    // 			const cellList = createNotebookCellList(instantiationService, disposables);
    // 			disposables.add(cellList);
    // 			cellList.attachViewModel(viewModel);
    // 			// render height 210, it can render 3 full cells and 1 partial cell
    // 			cellList.layout(210, 100);
    // 			assert.strictEqual(cellList.scrollHeight, 350);
    // 			cellList.changeViewZones(accessor => {
    // 				const first = accessor.addZone({
    // 					afterModelPosition: 1,
    // 					heightInPx: 20,
    // 					domNode: document.createElement('div')
    // 				});
    // 				accessor.layoutZone(first);
    // 				const second = accessor.addZone({
    // 					afterModelPosition: 1,
    // 					heightInPx: 20,
    // 					domNode: document.createElement('div')
    // 				});
    // 				accessor.layoutZone(second);
    // 				const third = accessor.addZone({
    // 					afterModelPosition: 2,
    // 					heightInPx: 20,
    // 					domNode: document.createElement('div')
    // 				});
    // 				accessor.layoutZone(second);
    // 				assert.strictEqual(cellList.scrollHeight, 410);
    // 				assert.strictEqual(cellList._getView().getWhitespacePosition(first), 50);
    // 				assert.strictEqual(cellList._getView().getWhitespacePosition(second), 70);
    // 				assert.strictEqual(cellList._getView().getWhitespacePosition(third), 190);
    // 				accessor.removeZone(first);
    // 				accessor.removeZone(second);
    // 				accessor.removeZone(third);
    // 			});
    // 		});
    // });
    test('Whitespace with folding support', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['# header c', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, disposables) => {
            viewModel.restoreEditorViewState({
                editingCells: [false, false, false, false, false],
                cellLineNumberStates: {},
                editorViewStates: [null, null, null, null, null],
                cellTotalHeights: [50, 100, 50, 100, 50],
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = createNotebookCellList(instantiationService, disposables);
            disposables.add(cellList);
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(210, 100);
            assert.strictEqual(cellList.scrollHeight, 350);
            cellList.changeViewZones((accessor) => {
                const id = accessor.addZone({
                    afterModelPosition: 0,
                    heightInPx: 20,
                    domNode: document.createElement('div'),
                });
                accessor.layoutZone(id);
                assert.strictEqual(cellList.scrollHeight, 370);
                assert.strictEqual(cellList.getElementTop(0), 20);
                assert.strictEqual(cellList.getElementTop(1), 70);
                assert.strictEqual(cellList.getElementTop(2), 170);
                assert.strictEqual(cellList.getElementTop(3), 220);
                assert.strictEqual(cellList.getElementTop(4), 320);
                accessor.removeZone(id);
                assert.strictEqual(cellList.scrollHeight, 350);
            });
            cellList.changeViewZones((accessor) => {
                const id = accessor.addZone({
                    afterModelPosition: 1,
                    heightInPx: 20,
                    domNode: document.createElement('div'),
                });
                accessor.layoutZone(id);
                assert.strictEqual(cellList.scrollHeight, 370);
                assert.strictEqual(cellList.getElementTop(0), 0);
                assert.strictEqual(cellList.getElementTop(1), 70);
                assert.strictEqual(cellList.getElementTop(2), 170);
                assert.strictEqual(cellList.getElementTop(3), 220);
                assert.strictEqual(cellList.getElementTop(4), 320);
                accessor.removeZone(id);
                assert.strictEqual(cellList.scrollHeight, 350);
            });
            // Whitespace should be hidden if it's after the header in a folding region
            cellList.changeViewZones((accessor) => {
                const id = accessor.addZone({
                    afterModelPosition: 3,
                    heightInPx: 20,
                    domNode: document.createElement('div'),
                });
                accessor.layoutZone(id);
                assert.strictEqual(cellList.scrollHeight, 370);
                const foldingModel = disposables.add(new FoldingModel());
                foldingModel.attachViewModel(viewModel);
                foldingModel.applyMemento([{ start: 2, end: 3 }]);
                viewModel.updateFoldingRanges(foldingModel.regions);
                assert.deepStrictEqual(viewModel.getHiddenRanges(), [{ start: 3, end: 3 }]);
                cellList.setHiddenAreas(viewModel.getHiddenRanges(), true);
                assert.strictEqual(cellList.scrollHeight, 250);
                assert.strictEqual(cellList.getElementTop(0), 0);
                assert.strictEqual(cellList.getElementTop(1), 50);
                assert.strictEqual(cellList.getElementTop(2), 150);
                assert.strictEqual(cellList.getElementTop(3), 200);
                cellList.setHiddenAreas([], true);
                assert.strictEqual(cellList.scrollHeight, 370);
                accessor.removeZone(id);
                assert.strictEqual(cellList.scrollHeight, 350);
            });
            // Whitespace should not be hidden if it's after the last cell in a folding region
            cellList.changeViewZones((accessor) => {
                const id = accessor.addZone({
                    afterModelPosition: 4,
                    heightInPx: 20,
                    domNode: document.createElement('div'),
                });
                accessor.layoutZone(id);
                assert.strictEqual(cellList.scrollHeight, 370);
                const foldingModel = disposables.add(new FoldingModel());
                foldingModel.attachViewModel(viewModel);
                foldingModel.applyMemento([{ start: 2, end: 3 }]);
                viewModel.updateFoldingRanges(foldingModel.regions);
                assert.deepStrictEqual(viewModel.getHiddenRanges(), [{ start: 3, end: 3 }]);
                cellList.setHiddenAreas(viewModel.getHiddenRanges(), true);
                assert.strictEqual(cellList.scrollHeight, 270);
                assert.strictEqual(cellList.getElementTop(0), 0);
                assert.strictEqual(cellList.getElementTop(1), 50);
                assert.strictEqual(cellList.getElementTop(2), 150);
                assert.strictEqual(cellList.getElementTop(3), 220);
                cellList.setHiddenAreas([], true);
                assert.strictEqual(cellList.scrollHeight, 370);
                accessor.removeZone(id);
                assert.strictEqual(cellList.scrollHeight, 350);
            });
            // Whitespace move when previous folding regions fold
            cellList.changeViewZones((accessor) => {
                const id = accessor.addZone({
                    afterModelPosition: 4,
                    heightInPx: 20,
                    domNode: document.createElement('div'),
                });
                accessor.layoutZone(id);
                assert.strictEqual(cellList.scrollHeight, 370);
                const foldingModel = disposables.add(new FoldingModel());
                foldingModel.attachViewModel(viewModel);
                foldingModel.applyMemento([{ start: 0, end: 1 }]);
                viewModel.updateFoldingRanges(foldingModel.regions);
                assert.deepStrictEqual(viewModel.getHiddenRanges(), [{ start: 1, end: 1 }]);
                cellList.setHiddenAreas(viewModel.getHiddenRanges(), true);
                assert.strictEqual(cellList.scrollHeight, 270);
                assert.strictEqual(cellList.getElementTop(0), 0);
                assert.strictEqual(cellList.getElementTop(1), 50);
                assert.strictEqual(cellList.getElementTop(2), 100);
                assert.strictEqual(cellList.getElementTop(3), 220);
                cellList.setHiddenAreas([], true);
                assert.strictEqual(cellList.scrollHeight, 370);
                accessor.removeZone(id);
                assert.strictEqual(cellList.scrollHeight, 350);
            });
        });
    });
    test('Whitespace with multiple viewzones at same position', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['# header c', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, disposables) => {
            viewModel.restoreEditorViewState({
                editingCells: [false, false, false, false, false],
                cellLineNumberStates: {},
                editorViewStates: [null, null, null, null, null],
                cellTotalHeights: [50, 100, 50, 100, 50],
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = createNotebookCellList(instantiationService, disposables);
            disposables.add(cellList);
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(210, 100);
            assert.strictEqual(cellList.scrollHeight, 350);
            cellList.changeViewZones((accessor) => {
                const first = accessor.addZone({
                    afterModelPosition: 0,
                    heightInPx: 20,
                    domNode: document.createElement('div'),
                });
                accessor.layoutZone(first);
                assert.strictEqual(cellList.scrollHeight, 370);
                const second = accessor.addZone({
                    afterModelPosition: 0,
                    heightInPx: 20,
                    domNode: document.createElement('div'),
                });
                accessor.layoutZone(second);
                assert.strictEqual(cellList.scrollHeight, 390);
                assert.strictEqual(cellList.getElementTop(0), 40);
                assert.strictEqual(cellList.getElementTop(1), 90);
                assert.strictEqual(cellList.getElementTop(2), 190);
                assert.strictEqual(cellList.getElementTop(3), 240);
                assert.strictEqual(cellList.getElementTop(4), 340);
                accessor.removeZone(first);
                assert.strictEqual(cellList.scrollHeight, 370);
                accessor.removeZone(second);
                assert.strictEqual(cellList.scrollHeight, 350);
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWaWV3Wm9uZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9ub3RlYm9va1ZpZXdab25lcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFFeEgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDaEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3RFLE9BQU8sRUFBZ0IsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkUsT0FBTyxFQUNOLHNCQUFzQixFQUN0Qix5QkFBeUIsRUFDekIsZ0JBQWdCLEdBQ2hCLE1BQU0seUJBQXlCLENBQUE7QUFFaEMsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUM5Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1FBQ2xCLE1BQU0sUUFBUSxHQUFHLElBQUksbUJBQW1CLEVBQUUsQ0FBQTtRQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3RDLENBQUMsQ0FBQyxDQUFBO0lBRUYsTUFBTSxHQUFHLEdBQUcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUE7SUFDdkIsTUFBTSxHQUFHLEdBQUcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUE7SUFDdkIsTUFBTSxLQUFLLEdBQUcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUE7SUFDekIsTUFBTSxJQUFJLEdBQUcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUE7SUFDeEIsTUFBTSxHQUFHLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUE7SUFFeEIsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtRQUMzQixNQUFNLFFBQVEsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUE7UUFDMUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM1QixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3RDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUM5QixNQUFNLFFBQVEsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUE7UUFDMUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN0QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDOUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFBO1FBQzFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDN0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN0QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDOUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFBO1FBQzFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDdEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtRQUNuQixNQUFNLFFBQVEsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUE7UUFDMUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVyQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRXRDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFdEMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDdkMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtRQUNuQixNQUFNLFFBQVEsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUE7UUFDMUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3JCLElBQUk7WUFDSixJQUFJO1lBQ0osSUFBSTtZQUNKLElBQUk7WUFDSixJQUFJO1lBQ0osSUFBSTtZQUNKLElBQUk7WUFDSixJQUFJO1lBQ0osSUFBSTtZQUNKLElBQUk7WUFDSixJQUFJO1lBQ0osSUFBSTtZQUNKLElBQUk7WUFDSixJQUFJO1lBQ0osSUFBSTtZQUNKLElBQUk7WUFDSixJQUFJO1lBQ0osSUFBSTtZQUNKLElBQUk7WUFDSixJQUFJO1NBQ0osQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUV0QyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRXRDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFdEMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVyQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyQixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3RDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtRQUM1QixNQUFNLFFBQVEsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUE7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVyQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzVCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFckMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN0QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7UUFDL0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFBO1FBQzFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFF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QyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBRTVDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2hELENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7WUFDbkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFBO1lBQzFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDekUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFckIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFD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LENBQUMsQ0FBQTtRQUM3QixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3RDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUM5QixNQUFNLFFBQVEsR0FBRyxJQUFJLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzVDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDdEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtRQUNuQixNQUFNLFFBQVEsR0FBRyxJQUFJLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzVDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFckMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUs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V0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRTlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTFELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFOUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUU5QyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDOUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUMvQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxLQUFLO1FBQ3BDLE1BQU0sZ0JBQWdCLENBQ3JCO1lBQ0MsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1NBQ25ELEVBQ0QsS0FBSyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEVBQUU7WUFDeEMsU0FBUyxDQUFDLHNCQUFzQixDQUFDO2dCQUNoQyxZQUFZLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDO2dCQUNqRCxvQkFBb0IsRUFBRSxFQUFFO2dCQUN4QixnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7Z0JBQ2hELGdCQUFnQixFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQztnQkFDeEMsbUJBQW1CLEVBQUUsRUFBRTtnQkFDdkIsb0JBQW9CLEVBQUUsRUFBRTthQUN4QixDQUFDLENBQUE7WUFFRixNQUFNLFFBQVEsR0FBRyxzQkFBc0IsQ0FBQyxvQkFBb0IsRUFBRSxXQUFXLENBQUMsQ0FBQTtZQUMxRSxXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3pCLFFBQVEsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUE7WUFFbkMsbUVBQW1FO1lBQ25FLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUU5QyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7Z0JBQ3JDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7b0JBQzNCLGtCQUFrQixFQUFFLENBQUM7b0JBQ3JCLFVBQVUsRUFBRSxFQUFFO29CQUNkLE9BQU8sRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQztpQkFDdEMsQ0FBQyxDQUFBO2dCQUVGLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7Z0JBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFFOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7Z0JBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFFbEQsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQTtnQkFDbEMsU0FBUyxDQUFDLFVBQVUsQ0FDbkIsQ0FBQyxFQUFFLFFBQVEsOEJBQXNCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUNuRSxJQUFJLEVBQ0osU0FBUyxFQUNULEdBQUcsRUFBRSxDQUFDLFNBQVMsRUFDZixTQUFTLEVBQ1QsSUFBSSxDQUNKLENBQUE7Z0JBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO2dCQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFFbEQsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUN4QixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsc0JBQXNCLEVBQUUsS0FBSztRQUNqQyxNQUFNLGdCQUFnQixDQUNyQjtZQUNDLENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztTQUNuRCxFQUNELEtBQUssRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxFQUFFO1lBQ3hDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQztnQkFDaEMsWUFBWSxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztnQkFDakQsb0JBQW9CLEVBQUUsRUFBRTtnQkFDeEIsZ0JBQWdCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO2dCQUNoRCxnQkFBZ0IsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUM7Z0JBQ3hDLG1CQUFtQixFQUFFLEVBQUU7Z0JBQ3ZCLG9CQUFvQixFQUFFLEVBQUU7YUFDeEIsQ0FBQyxDQUFBO1lBRUYsTUFBTSxRQUFRLEdBQUcsc0JBQXNCLENBQUMsb0JBQW9CLEVBQUUsV0FBVyxDQUFDLENBQUE7WUFDMUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUN6QixRQUFRLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBRW5DLG1FQUFtRTtZQUNuRSxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUN6QixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFFOUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO2dCQUNyQyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO29CQUM5QixrQkFBa0IsRUFBRSxDQUFDO29CQUNyQixVQUFVLEVBQUUsRUFBRTtvQkFDZCxPQUFPLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7aUJBQ3RDLENBQUMsQ0FBQTtnQkFDRixRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUUxQixNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO29CQUMvQixrQkFBa0IsRUFBRSxDQUFDO29CQUNyQixVQUFVLEVBQUUsRUFBRTtvQkFDZCxPQUFPLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7aUJBQ3RDLENBQUMsQ0FBQTtnQkFDRixRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUUzQixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0JBRTlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtnQkFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO2dCQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFFbEQsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFFMUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFBO2dCQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtnQkFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO2dCQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0JBRWxELFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBRTNCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQ25ELENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxLQUFLO1FBQ25DLE1BQU0sZ0JBQWdCLENBQ3JCO1lBQ0MsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1NBQ25ELEVBQ0QsS0FBSyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEVBQUU7WUFDeEMsU0FBUyxDQUFDLHNCQUFzQixDQUFDO2dCQUNoQyxZQUFZLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDO2dCQUNqRCxvQkFBb0IsRUFBRSxFQUFFO2dCQUN4QixnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7Z0JBQ2hELGdCQUFnQixFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQztnQkFDeEMsbUJBQW1CLEVBQUUsRUFBRTtnQkFDdkIsb0JBQW9CLEVBQUUsRUFBRTthQUN4QixDQUFDLENBQUE7WUFFRixNQUFNLFFBQVEsR0FBRyxzQkFBc0IsQ0FBQyxvQkFBb0IsRUFBRSxXQUFXLENBQUMsQ0FBQTtZQUMxRSxXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3pCLFFBQVEsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUE7WUFFbkMsbUVBQW1FO1lBQ25FLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUU5QyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7Z0JBQ3JDLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7b0JBQzlCLGtCQUFrQixFQUFFLENBQUM7b0JBQ3JCLFVBQVUsRUFBRSxFQUFFO29CQUNkLE9BQU8sRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQztpQkFDdEMsQ0FBQyxDQUFBO2dCQUNGLFFBQVEsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBRTFCLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7b0JBQy9CLGtCQUFrQixFQUFFLENBQUM7b0JBQ3JCLFVBQVUsRUFBRSxFQUFFO29CQUNkLE9BQU8sRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQztpQkFDdEMsQ0FBQyxDQUFBO2dCQUNGLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBRTNCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ3ZFLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO2dCQUV6RSxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUMxQixRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzVCLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxLQUFLO1FBQ25DLE1BQU0sZ0JBQWdCLENBQ3JCO1lBQ0MsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1NBQ25ELEVBQ0QsS0FBSyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEVBQUU7WUFDeEMsU0FBUyxDQUFDLHNCQUFzQixDQUFDO2dCQUNoQyxZQUFZLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDO2dCQUNqRCxvQkFBb0IsRUFBRSxFQUFFO2dCQUN4QixnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7Z0JBQ2hELGdCQUFnQixFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQztnQkFDeEMsbUJBQW1CLEVBQUUsRUFBRTtnQkFDdkIsb0JBQW9CLEVBQUUsRUFBRTthQUN4QixDQUFDLENBQUE7WUFFRixNQUFNLFFBQVEsR0FBRyxzQkFBc0IsQ0FBQyxvQkFBb0IsRUFBRSxXQUFXLENBQUMsQ0FBQTtZQUMxRSxXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3pCLFFBQVEsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUE7WUFFbkMsbUVBQW1FO1lBQ25FLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUU5QyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7Z0JBQ3JDLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7b0JBQzlCLGtCQUFrQixFQUFFLENBQUM7b0JBQ3JCLFVBQVUsRUFBRSxFQUFFO29CQUNkLE9BQU8sRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQztpQkFDdEMsQ0FBQyxDQUFBO2dCQUNGLFFBQVEsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBRTFCLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7b0JBQy9CLGtCQUFrQixFQUFFLENBQUM7b0JBQ3JCLFVBQVUsRUFBRSxFQUFFO29CQUNkLE9BQU8sRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQztpQkFDdEMsQ0FBQyxDQUFBO2dCQUNGLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBRTNCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7Z0JBQ3hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO2dCQUUxRSxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUMxQixRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzVCLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLHFEQUFxRDtJQUNyRCwyQkFBMkI7SUFDM0IsTUFBTTtJQUNOLDBEQUEwRDtJQUMxRCwwREFBMEQ7SUFDMUQsMERBQTBEO0lBQzFELDBEQUEwRDtJQUMxRCx5REFBeUQ7SUFDekQsT0FBTztJQUNQLGdEQUFnRDtJQUNoRCx3Q0FBd0M7SUFDeEMseURBQXlEO0lBQ3pELGdDQUFnQztJQUNoQyx3REFBd0Q7SUFDeEQsZ0RBQWdEO0lBQ2hELCtCQUErQjtJQUMvQixnQ0FBZ0M7SUFDaEMsU0FBUztJQUVULGlGQUFpRjtJQUNqRixnQ0FBZ0M7SUFDaEMsMENBQTBDO0lBRTFDLHlFQUF5RTtJQUN6RSxnQ0FBZ0M7SUFDaEMscURBQXFEO0lBRXJELDRDQUE0QztJQUM1Qyx1Q0FBdUM7SUFDdkMsOEJBQThCO0lBQzlCLHVCQUF1QjtJQUN2Qiw4Q0FBOEM7SUFDOUMsVUFBVTtJQUNWLGtDQUFrQztJQUVsQyx3Q0FBd0M7SUFDeEMsOEJBQThCO0lBQzlCLHVCQUF1QjtJQUN2Qiw4Q0FBOEM7SUFDOUMsVUFBVTtJQUNWLG1DQUFtQztJQUVuQyx1Q0FBdUM7SUFDdkMsOEJBQThCO0lBQzlCLHVCQUF1QjtJQUN2Qiw4Q0FBOEM7SUFDOUMsVUFBVTtJQUNWLG1DQUFtQztJQUVuQyxzREFBc0Q7SUFDdEQsZ0ZBQWdGO0lBQ2hGLGlGQUFpRjtJQUNqRixpRkFBaUY7SUFFakYsa0NBQWtDO0lBQ2xDLG1DQUFtQztJQUNuQyxrQ0FBa0M7SUFDbEMsU0FBUztJQUNULFFBQVE7SUFDUixNQUFNO0lBRU4sSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEtBQUs7UUFDNUMsTUFBTSxnQkFBZ0IsQ0FDckI7WUFDQyxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7U0FDbkQsRUFDRCxLQUFLLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsRUFBRTtZQUN4QyxTQUFTLENBQUMsc0JBQXNCLENBQUM7Z0JBQ2hDLFlBQVksRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7Z0JBQ2pELG9CQUFvQixFQUFFLEVBQUU7Z0JBQ3hCLGdCQUFnQixFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztnQkFDaEQsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDO2dCQUN4QyxtQkFBbUIsRUFBRSxFQUFFO2dCQUN2QixvQkFBb0IsRUFBRSxFQUFFO2FBQ3hCLENBQUMsQ0FBQTtZQUVGLE1BQU0sUUFBUSxHQUFHLHNCQUFzQixDQUFDLG9CQUFvQixFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQzFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDekIsUUFBUSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUVuQyxtRUFBbUU7WUFDbkUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBRTlDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtnQkFDckMsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQztvQkFDM0Isa0JBQWtCLEVBQUUsQ0FBQztvQkFDckIsVUFBVSxFQUFFLEVBQUU7b0JBQ2QsT0FBTyxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDO2lCQUN0QyxDQUFDLENBQUE7Z0JBRUYsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFBO2dCQUU5QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7Z0JBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtnQkFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO2dCQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFFbEQsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQy9DLENBQUMsQ0FBQyxDQUFBO1lBRUYsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO2dCQUNyQyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO29CQUMzQixrQkFBa0IsRUFBRSxDQUFDO29CQUNyQixVQUFVLEVBQUUsRUFBRTtvQkFDZCxPQUFPLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7aUJBQ3RDLENBQUMsQ0FBQTtnQkFFRixRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUN2QixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0JBRTlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO2dCQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO2dCQUVsRCxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUN2QixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDL0MsQ0FBQyxDQUFDLENBQUE7WUFFRiwyRUFBMkU7WUFDM0UsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO2dCQUNyQyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO29CQUMzQixrQkFBa0IsRUFBRSxDQUFDO29CQUNyQixVQUFVLEVBQUUsRUFBRTtvQkFDZCxPQUFPLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7aUJBQ3RDLENBQUMsQ0FBQTtnQkFFRixRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUN2QixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0JBRTlDLE1BQU0sWUFBWSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxZQUFZLEVBQUUsQ0FBQyxDQUFBO2dCQUN4RCxZQUFZLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUN2QyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2pELFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUE7Z0JBQ25ELE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQzNFLFFBQVEsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO2dCQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0JBRTlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO2dCQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFFbEQsUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7Z0JBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFDOUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQy9DLENBQUMsQ0FBQyxDQUFBO1lBRUYsa0ZBQWtGO1lBQ2xGLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtnQkFDckMsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQztvQkFDM0Isa0JBQWtCLEVBQUUsQ0FBQztvQkFDckIsVUFBVSxFQUFFLEVBQUU7b0JBQ2QsT0FBTyxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDO2lCQUN0QyxDQUFDLENBQUE7Z0JBRUYsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFBO2dCQUU5QyxNQUFNLFlBQVksR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksWUFBWSxFQUFFLENBQUMsQ0FBQTtnQkFDeEQsWUFBWSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDdkMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNqRCxTQUFTLENBQUMsbUJBQW1CLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUNuRCxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUMzRSxRQUFRLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFBO2dCQUU5QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtnQkFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO2dCQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0JBRWxELFFBQVEsQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO2dCQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0JBQzlDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7Z0JBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUMvQyxDQUFDLENBQUMsQ0FBQTtZQUVGLHFEQUFxRDtZQUNyRCxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7Z0JBQ3JDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7b0JBQzNCLGtCQUFrQixFQUFFLENBQUM7b0JBQ3JCLFVBQVUsRUFBRSxFQUFFO29CQUNkLE9BQU8sRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQztpQkFDdEMsQ0FBQyxDQUFBO2dCQUVGLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUE7Z0JBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFFOUMsTUFBTSxZQUFZLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFlBQVksRUFBRSxDQUFDLENBQUE7Z0JBQ3hELFlBQVksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQ3ZDLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDakQsU0FBUyxDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDbkQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDM0UsUUFBUSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7Z0JBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFFOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7Z0JBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO2dCQUVsRCxRQUFRLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFBO2dCQUM5QyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUN2QixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDL0MsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFEQUFxRCxFQUFFLEtBQUs7UUFDaEUsTUFBTSxnQkFBZ0IsQ0FDckI7WUFDQyxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7U0FDbkQsRUFDRCxLQUFLLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsRUFBRTtZQUN4QyxTQUFTLENBQUMsc0JBQXNCLENBQUM7Z0JBQ2hDLFlBQVksRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7Z0JBQ2pELG9CQUFvQixFQUFFLEVBQUU7Z0JBQ3hCLGdCQUFnQixFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztnQkFDaEQsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDO2dCQUN4QyxtQkFBbUIsRUFBRSxFQUFFO2dCQUN2QixvQkFBb0IsRUFBRSxFQUFFO2FBQ3hCLENBQUMsQ0FBQTtZQUVGLE1BQU0sUUFBUSxHQUFHLHNCQUFzQixDQUFDLG9CQUFvQixFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQzFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDekIsUUFBUSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUVuQyxtRUFBbUU7WUFDbkUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBRTlDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtnQkFDckMsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQztvQkFDOUIsa0JBQWtCLEVBQUUsQ0FBQztvQkFDckIsVUFBVSxFQUFFLEVBQUU7b0JBQ2QsT0FBTyxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDO2lCQUN0QyxDQUFDLENBQUE7Z0JBRUYsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDMUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFBO2dCQUU5QyxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO29CQUMvQixrQkFBa0IsRUFBRSxDQUFDO29CQUNyQixVQUFVLEVBQUUsRUFBRTtvQkFDZCxPQUFPLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7aUJBQ3RDLENBQUMsQ0FBQTtnQkFDRixRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUMzQixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0JBRTlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtnQkFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO2dCQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0JBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO2dCQUVsRCxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUMxQixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0JBQzlDLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQzNCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUMvQyxDQUFDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9