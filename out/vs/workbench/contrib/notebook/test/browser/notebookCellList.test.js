/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { CellKind, NotebookSetting } from '../../common/notebookCommon.js';
import { createNotebookCellList, setupInstantiationService, withTestNotebook, } from './testNotebookEditor.js';
suite('NotebookCellList', () => {
    let testDisposables;
    let instantiationService;
    teardown(() => {
        testDisposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    let config;
    setup(() => {
        testDisposables = new DisposableStore();
        instantiationService = setupInstantiationService(testDisposables);
        config = new TestConfigurationService();
        instantiationService.stub(IConfigurationService, config);
    });
    test('revealElementsInView: reveal fully visible cell should not scroll', async function () {
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
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(210, 100);
            // scroll a bit, scrollTop to bottom: 5, 215
            cellList.scrollTop = 5;
            // init scrollTop and scrollBottom
            assert.deepStrictEqual(cellList.scrollTop, 5);
            assert.deepStrictEqual(cellList.getViewScrollBottom(), 215);
            // reveal cell 1, top 50, bottom 150, which is fully visible in the viewport
            cellList.revealCells({ start: 1, end: 2 });
            assert.deepStrictEqual(cellList.scrollTop, 5);
            assert.deepStrictEqual(cellList.getViewScrollBottom(), 215);
            // reveal cell 2, top 150, bottom 200, which is fully visible in the viewport
            cellList.revealCells({ start: 2, end: 3 });
            assert.deepStrictEqual(cellList.scrollTop, 5);
            assert.deepStrictEqual(cellList.getViewScrollBottom(), 215);
            // reveal cell 3, top 200, bottom 300, which is partially visible in the viewport
            cellList.revealCells({ start: 3, end: 4 });
            assert.deepStrictEqual(cellList.scrollTop, 90);
        });
    });
    test('revealElementsInView: reveal partially visible cell', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['# header c', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, disposables) => {
            viewModel.restoreEditorViewState({
                editingCells: [false, false, false, false, false],
                editorViewStates: [null, null, null, null, null],
                cellTotalHeights: [50, 100, 50, 100, 50],
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = createNotebookCellList(instantiationService, disposables);
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(210, 100);
            // init scrollTop and scrollBottom
            assert.deepStrictEqual(cellList.scrollTop, 0);
            assert.deepStrictEqual(cellList.getViewScrollBottom(), 210);
            // reveal cell 3, top 200, bottom 300, which is partially visible in the viewport
            cellList.revealCells({ start: 3, end: 4 });
            assert.deepStrictEqual(cellList.scrollTop, 90);
            // scroll to 5
            cellList.scrollTop = 5;
            assert.deepStrictEqual(cellList.scrollTop, 5);
            assert.deepStrictEqual(cellList.getViewScrollBottom(), 215);
            // reveal cell 0, top 0, bottom 50
            cellList.revealCells({ start: 0, end: 1 });
            assert.deepStrictEqual(cellList.scrollTop, 0);
        });
    });
    test('revealElementsInView: reveal cell out of viewport', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['# header c', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, disposables) => {
            viewModel.restoreEditorViewState({
                editingCells: [false, false, false, false, false],
                editorViewStates: [null, null, null, null, null],
                cellTotalHeights: [50, 100, 50, 100, 50],
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = createNotebookCellList(instantiationService, disposables);
            // without paddingBottom, the last 20 px will always be hidden due to `topInsertToolbarHeight`
            cellList.updateOptions({ paddingBottom: 100 });
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(210, 100);
            // init scrollTop and scrollBottom
            assert.deepStrictEqual(cellList.scrollTop, 0);
            assert.deepStrictEqual(cellList.getViewScrollBottom(), 210);
            cellList.revealCells({ start: 4, end: 5 });
            assert.deepStrictEqual(cellList.scrollTop, 140);
            // assert.deepStrictEqual(cellList.getViewScrollBottom(), 330);
        });
    });
    test('updateElementHeight', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['# header c', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, disposables) => {
            viewModel.restoreEditorViewState({
                editingCells: [false, false, false, false, false],
                editorViewStates: [null, null, null, null, null],
                cellTotalHeights: [50, 100, 50, 100, 50],
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = createNotebookCellList(instantiationService, disposables);
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(210, 100);
            // init scrollTop and scrollBottom
            assert.deepStrictEqual(cellList.scrollTop, 0);
            assert.deepStrictEqual(cellList.getViewScrollBottom(), 210);
            cellList.updateElementHeight(0, 60);
            assert.deepStrictEqual(cellList.scrollTop, 0);
            // scroll to 5
            cellList.scrollTop = 5;
            assert.deepStrictEqual(cellList.scrollTop, 5);
            assert.deepStrictEqual(cellList.getViewScrollBottom(), 215);
            cellList.updateElementHeight(0, 80);
            assert.deepStrictEqual(cellList.scrollTop, 5);
        });
    });
    test('updateElementHeight with anchor', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['# header c', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, disposables) => {
            viewModel.restoreEditorViewState({
                editingCells: [false, false, false, false, false],
                editorViewStates: [null, null, null, null, null],
                cellTotalHeights: [50, 100, 50, 100, 50],
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = createNotebookCellList(instantiationService, disposables);
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(210, 100);
            // init scrollTop and scrollBottom
            assert.deepStrictEqual(cellList.scrollTop, 0);
            assert.deepStrictEqual(cellList.getViewScrollBottom(), 210);
            // scroll to 5
            cellList.updateElementHeight2(viewModel.cellAt(0), 50);
            cellList.scrollTop = 5;
            assert.deepStrictEqual(cellList.scrollTop, 5);
            assert.deepStrictEqual(cellList.getViewScrollBottom(), 215);
            cellList.setFocus([1]);
            cellList.updateElementHeight2(viewModel.cellAt(0), 100);
            assert.deepStrictEqual(cellList.scrollHeight, 400);
            // the first cell grows, and the focused cell will remain fully visible, so we don't scroll
            assert.deepStrictEqual(cellList.scrollTop, 5);
            assert.deepStrictEqual(cellList.getViewScrollBottom(), 215);
            cellList.updateElementHeight2(viewModel.cellAt(0), 150);
            // the first cell grows, and the focused cell will be pushed out of view, so we scroll down
            assert.deepStrictEqual(cellList.scrollTop, 55);
            assert.deepStrictEqual(cellList.getViewScrollBottom(), 265);
            // We don't anchor to the focused cell when cells shrink
            cellList.updateElementHeight2(viewModel.cellAt(0), 50);
            assert.deepStrictEqual(cellList.scrollTop, 55);
            assert.deepStrictEqual(cellList.getViewScrollBottom(), 265);
            // focus won't be visible after cell 0 grow to 250, so let's try to keep the focused cell visible
            cellList.updateElementHeight2(viewModel.cellAt(0), 250);
            assert.deepStrictEqual(cellList.scrollTop, 250 + 100 - cellList.renderHeight);
            assert.deepStrictEqual(cellList.getViewScrollBottom(), 250 + 100 - cellList.renderHeight + 210);
        });
    });
    test('updateElementHeight with no scrolling', async function () {
        config.setUserConfiguration(NotebookSetting.scrollToRevealCell, 'none');
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['# header c', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, disposables) => {
            viewModel.restoreEditorViewState({
                editingCells: [false, false, false, false, false],
                editorViewStates: [null, null, null, null, null],
                cellTotalHeights: [50, 100, 50, 100, 50],
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = createNotebookCellList(instantiationService, disposables);
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(210, 100);
            // init scrollTop and scrollBottom
            assert.deepStrictEqual(cellList.scrollTop, 0);
            assert.deepStrictEqual(cellList.getViewScrollBottom(), 210);
            // scroll to 5
            cellList.updateElementHeight2(viewModel.cellAt(0), 50);
            cellList.scrollTop = 5;
            assert.deepStrictEqual(cellList.scrollTop, 5);
            assert.deepStrictEqual(cellList.getViewScrollBottom(), 215);
            cellList.setFocus([1]);
            cellList.updateElementHeight2(viewModel.cellAt(0), 100);
            assert.deepStrictEqual(cellList.scrollHeight, 400);
            // Any change in cell size should not affect the scroll height with scrollToReveal set to none
            assert.deepStrictEqual(cellList.scrollTop, 5);
            cellList.updateElementHeight2(viewModel.cellAt(0), 50);
            assert.deepStrictEqual(cellList.scrollTop, 5);
            cellList.updateElementHeight2(viewModel.cellAt(0), 250);
            assert.deepStrictEqual(cellList.scrollTop, 5);
        });
    });
    test('updateElementHeight with no scroll setting and cell editor focused', async function () {
        config.setUserConfiguration(NotebookSetting.scrollToRevealCell, 'none');
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['# header c', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, disposables) => {
            viewModel.restoreEditorViewState({
                editingCells: [false, false, false, false, false],
                editorViewStates: [null, null, null, null, null],
                cellTotalHeights: [50, 100, 50, 100, 50],
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = createNotebookCellList(instantiationService, disposables);
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(210, 100);
            // init scrollTop and scrollBottom
            assert.deepStrictEqual(cellList.scrollTop, 0);
            assert.deepStrictEqual(cellList.getViewScrollBottom(), 210);
            cellList.setFocus([1]);
            editor.focusNotebookCell(cellList.viewModel?.cellAt(1), 'editor');
            cellList.updateElementHeight2(viewModel.cellAt(0), 100);
            assert.deepStrictEqual(cellList.scrollHeight, 400);
            // We have the cell editor focused, so we should anchor to that cell
            assert.deepStrictEqual(cellList.scrollTop, 50);
            cellList.updateElementHeight2(viewModel.cellAt(0), 50);
            assert.deepStrictEqual(cellList.scrollTop, 0);
            cellList.updateElementHeight2(viewModel.cellAt(0), 250);
            assert.deepStrictEqual(cellList.scrollTop, 250 + 100 - cellList.renderHeight);
        });
    });
    test('updateElementHeight with focused element out of viewport', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['# header c', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, disposables) => {
            viewModel.restoreEditorViewState({
                editingCells: [false, false, false, false, false],
                editorViewStates: [null, null, null, null, null],
                cellTotalHeights: [50, 100, 50, 100, 50],
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = createNotebookCellList(instantiationService, disposables);
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(210, 100);
            // init scrollTop and scrollBottom
            assert.deepStrictEqual(cellList.scrollTop, 0);
            assert.deepStrictEqual(cellList.getViewScrollBottom(), 210);
            cellList.setFocus([4]);
            cellList.updateElementHeight2(viewModel.cellAt(1), 130);
            // the focus cell is not in the viewport, the scrolltop should not change at all
            assert.deepStrictEqual(cellList.scrollTop, 0);
        });
    });
    test('updateElementHeight of cells out of viewport should not trigger scroll #121140', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var b = 2;', 'javascript', CellKind.Code, [], {}],
            ['# header c', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, disposables) => {
            viewModel.restoreEditorViewState({
                editingCells: [false, false, false, false, false],
                editorViewStates: [null, null, null, null, null],
                cellTotalHeights: [50, 100, 50, 100, 50],
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = createNotebookCellList(instantiationService, disposables);
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(210, 100);
            // init scrollTop and scrollBottom
            assert.deepStrictEqual(cellList.scrollTop, 0);
            assert.deepStrictEqual(cellList.getViewScrollBottom(), 210);
            cellList.setFocus([1]);
            cellList.scrollTop = 80;
            assert.deepStrictEqual(cellList.scrollTop, 80);
            cellList.updateElementHeight2(viewModel.cellAt(0), 30);
            assert.deepStrictEqual(cellList.scrollTop, 60);
        });
    });
    test('visibleRanges should be exclusive of end', async function () {
        await withTestNotebook([], async (editor, viewModel, disposables) => {
            const cellList = createNotebookCellList(instantiationService, disposables);
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(100, 100);
            assert.deepStrictEqual(cellList.visibleRanges, []);
        });
    });
    test('visibleRanges should be exclusive of end 2', async function () {
        await withTestNotebook([['# header a', 'markdown', CellKind.Markup, [], {}]], async (editor, viewModel, disposables) => {
            viewModel.restoreEditorViewState({
                editingCells: [false],
                editorViewStates: [null],
                cellTotalHeights: [50],
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = createNotebookCellList(instantiationService, disposables);
            cellList.attachViewModel(viewModel);
            // render height 210, it can render 3 full cells and 1 partial cell
            cellList.layout(100, 100);
            assert.deepStrictEqual(cellList.visibleRanges, [{ start: 0, end: 1 }]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsTGlzdC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL25vdGVib29rQ2VsbExpc3QudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBRXhILE9BQU8sRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDMUUsT0FBTyxFQUNOLHNCQUFzQixFQUN0Qix5QkFBeUIsRUFDekIsZ0JBQWdCLEdBQ2hCLE1BQU0seUJBQXlCLENBQUE7QUFFaEMsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUM5QixJQUFJLGVBQWdDLENBQUE7SUFDcEMsSUFBSSxvQkFBOEMsQ0FBQTtJQUVsRCxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQzFCLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLE1BQWdDLENBQUE7SUFDcEMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ3ZDLG9CQUFvQixHQUFHLHlCQUF5QixDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sR0FBRyxJQUFJLHdCQUF3QixF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