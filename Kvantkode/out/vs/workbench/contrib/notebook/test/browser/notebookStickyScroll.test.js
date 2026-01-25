/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../../../../editor/common/services/languageFeaturesService.js';
import { NotebookCellOutline } from '../../browser/contrib/outline/notebookOutline.js';
import { computeContent, } from '../../browser/viewParts/notebookEditorStickyScroll.js';
import { CellKind } from '../../common/notebookCommon.js';
import { createNotebookCellList, setupInstantiationService, withTestNotebook, } from './testNotebookEditor.js';
suite('NotebookEditorStickyScroll', () => {
    let disposables;
    let instantiationService;
    const domNode = document.createElement('div');
    teardown(() => {
        disposables.dispose();
    });
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = setupInstantiationService(disposables);
        instantiationService.set(ILanguageFeaturesService, new LanguageFeaturesService());
    });
    function getOutline(editor) {
        if (!editor.hasModel()) {
            assert.ok(false, 'MUST have active text editor');
        }
        const outline = store.add(instantiationService.createInstance(NotebookCellOutline, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidChangeModel = Event.None;
                this.onDidChangeSelection = Event.None;
            }
            getControl() {
                return editor;
            }
        })(), 4 /* OutlineTarget.QuickPick */));
        return outline;
    }
    function nbStickyTestHelper(domNode, notebookEditor, notebookCellList, notebookOutlineEntries, disposables) {
        const output = computeContent(notebookEditor, notebookCellList, notebookOutlineEntries, 0);
        for (const stickyLine of output.values()) {
            disposables.add(stickyLine.line);
        }
        return createStickyTestElement(output.values());
    }
    function createStickyTestElement(stickyLines) {
        const outputElements = [];
        for (const stickyLine of stickyLines) {
            if (stickyLine.rendered) {
                outputElements.unshift(stickyLine.line.element.innerText);
            }
        }
        return outputElements;
    }
    test('test0: should render empty, 	scrollTop at 0', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['## header aa', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var c = 2;', 'javascript', CellKind.Code, [], {}],
        ], async (editor, viewModel) => {
            viewModel.restoreEditorViewState({
                editingCells: Array.from({ length: 8 }, () => false),
                editorViewStates: Array.from({ length: 8 }, () => null),
                cellTotalHeights: Array.from({ length: 8 }, () => 50),
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = disposables.add(createNotebookCellList(instantiationService, disposables));
            cellList.attachViewModel(viewModel);
            cellList.layout(400, 100);
            editor.setScrollTop(0);
            editor.visibleRanges = [{ start: 0, end: 8 }];
            const outline = getOutline(editor);
            const notebookOutlineEntries = outline.entries;
            const resultingMap = nbStickyTestHelper(domNode, editor, cellList, notebookOutlineEntries, disposables);
            await assertSnapshot(resultingMap);
            outline.dispose();
        });
    });
    test('test1: should render 0->1, 	visible range 3->8', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}], // 0
            ['## header aa', 'markdown', CellKind.Markup, [], {}], // 50
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 100
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 150
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 200
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 250
            ['# header b', 'markdown', CellKind.Markup, [], {}], // 300
            ['var c = 2;', 'javascript', CellKind.Code, [], {}], // 350
        ], async (editor, viewModel, ds) => {
            viewModel.restoreEditorViewState({
                editingCells: Array.from({ length: 8 }, () => false),
                editorViewStates: Array.from({ length: 8 }, () => null),
                cellTotalHeights: Array.from({ length: 8 }, () => 50),
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = ds.add(createNotebookCellList(instantiationService, ds));
            cellList.attachViewModel(viewModel);
            cellList.layout(400, 100);
            editor.setScrollTop(175);
            editor.visibleRanges = [{ start: 3, end: 8 }];
            const outline = getOutline(editor);
            const notebookOutlineEntries = outline.entries;
            const resultingMap = nbStickyTestHelper(domNode, editor, cellList, notebookOutlineEntries, ds);
            await assertSnapshot(resultingMap);
            outline.dispose();
        });
    });
    test('test2: should render 0, 		visible range 6->9 so collapsing next 2 against following section', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}], // 0
            ['## header aa', 'markdown', CellKind.Markup, [], {}], // 50
            ['### header aaa', 'markdown', CellKind.Markup, [], {}], // 100
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 150
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 200
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 250
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 300
            ['# header b', 'markdown', CellKind.Markup, [], {}], // 350
            ['var c = 2;', 'javascript', CellKind.Code, [], {}], // 400
        ], async (editor, viewModel, ds) => {
            viewModel.restoreEditorViewState({
                editingCells: Array.from({ length: 9 }, () => false),
                editorViewStates: Array.from({ length: 9 }, () => null),
                cellTotalHeights: Array.from({ length: 9 }, () => 50),
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = ds.add(createNotebookCellList(instantiationService, ds));
            cellList.attachViewModel(viewModel);
            cellList.layout(400, 100);
            editor.setScrollTop(325); // room for a single header
            editor.visibleRanges = [{ start: 6, end: 9 }];
            const outline = getOutline(editor);
            const notebookOutlineEntries = outline.entries;
            const resultingMap = nbStickyTestHelper(domNode, editor, cellList, notebookOutlineEntries, ds);
            await assertSnapshot(resultingMap);
            outline.dispose();
        });
    });
    test('test3: should render 0->2, 	collapsing against equivalent level header', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}], // 0
            ['## header aa', 'markdown', CellKind.Markup, [], {}], // 50
            ['### header aaa', 'markdown', CellKind.Markup, [], {}], // 100
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 150
            ['### header aab', 'markdown', CellKind.Markup, [], {}], // 200
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 250
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 300
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], // 350
            ['# header b', 'markdown', CellKind.Markup, [], {}], // 400
            ['var c = 2;', 'javascript', CellKind.Code, [], {}], // 450
        ], async (editor, viewModel, ds) => {
            viewModel.restoreEditorViewState({
                editingCells: Array.from({ length: 10 }, () => false),
                editorViewStates: Array.from({ length: 10 }, () => null),
                cellTotalHeights: Array.from({ length: 10 }, () => 50),
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = ds.add(createNotebookCellList(instantiationService, ds));
            cellList.attachViewModel(viewModel);
            cellList.layout(400, 100);
            editor.setScrollTop(175); // room for a single header
            editor.visibleRanges = [{ start: 3, end: 10 }];
            const outline = getOutline(editor);
            const notebookOutlineEntries = outline.entries;
            const resultingMap = nbStickyTestHelper(domNode, editor, cellList, notebookOutlineEntries, ds);
            await assertSnapshot(resultingMap);
            outline.dispose();
        });
    });
    // outdated/improper behavior
    test('test4: should render 0, 		scrolltop halfway through cell 0', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['## header aa', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var c = 2;', 'javascript', CellKind.Code, [], {}],
        ], async (editor, viewModel, ds) => {
            viewModel.restoreEditorViewState({
                editingCells: Array.from({ length: 8 }, () => false),
                editorViewStates: Array.from({ length: 8 }, () => null),
                cellTotalHeights: Array.from({ length: 8 }, () => 50),
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = ds.add(createNotebookCellList(instantiationService, ds));
            cellList.attachViewModel(viewModel);
            cellList.layout(400, 100);
            editor.setScrollTop(50);
            editor.visibleRanges = [{ start: 0, end: 8 }];
            const outline = getOutline(editor);
            const notebookOutlineEntries = outline.entries;
            const resultingMap = nbStickyTestHelper(domNode, editor, cellList, notebookOutlineEntries, ds);
            await assertSnapshot(resultingMap);
            outline.dispose();
        });
    });
    test('test5: should render 0->2, 	scrolltop halfway through cell 2', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['## header aa', 'markdown', CellKind.Markup, [], {}],
            ['### header aaa', 'markdown', CellKind.Markup, [], {}],
            ['#### header aaaa', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['var c = 2;', 'javascript', CellKind.Code, [], {}],
        ], async (editor, viewModel, ds) => {
            viewModel.restoreEditorViewState({
                editingCells: Array.from({ length: 10 }, () => false),
                editorViewStates: Array.from({ length: 10 }, () => null),
                cellTotalHeights: Array.from({ length: 10 }, () => 50),
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = ds.add(createNotebookCellList(instantiationService, ds));
            cellList.attachViewModel(viewModel);
            cellList.layout(400, 100);
            editor.setScrollTop(125);
            editor.visibleRanges = [{ start: 2, end: 10 }];
            const outline = getOutline(editor);
            const notebookOutlineEntries = outline.entries;
            const resultingMap = nbStickyTestHelper(domNode, editor, cellList, notebookOutlineEntries, ds);
            await assertSnapshot(resultingMap);
            outline.dispose();
        });
    });
    test('test6: should render 6->7, 	scrolltop halfway through cell 7', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
            ['## header aa', 'markdown', CellKind.Markup, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header b', 'markdown', CellKind.Markup, [], {}],
            ['## header bb', 'markdown', CellKind.Markup, [], {}],
            ['### header bbb', 'markdown', CellKind.Markup, [], {}],
            ['var c = 2;', 'javascript', CellKind.Code, [], {}],
        ], async (editor, viewModel, ds) => {
            viewModel.restoreEditorViewState({
                editingCells: Array.from({ length: 10 }, () => false),
                editorViewStates: Array.from({ length: 10 }, () => null),
                cellTotalHeights: Array.from({ length: 10 }, () => 50),
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = ds.add(createNotebookCellList(instantiationService, ds));
            cellList.attachViewModel(viewModel);
            cellList.layout(400, 100);
            editor.setScrollTop(375);
            editor.visibleRanges = [{ start: 7, end: 10 }];
            const outline = getOutline(editor);
            const notebookOutlineEntries = outline.entries;
            const resultingMap = nbStickyTestHelper(domNode, editor, cellList, notebookOutlineEntries, ds);
            await assertSnapshot(resultingMap);
            outline.dispose();
        });
    });
    test('test7: should render 0->1, 	collapsing against next section', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}], //0
            ['## header aa', 'markdown', CellKind.Markup, [], {}], //50
            ['### header aaa', 'markdown', CellKind.Markup, [], {}], //100
            ['#### header aaaa', 'markdown', CellKind.Markup, [], {}], //150
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], //200
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], //250
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], //300
            ['var b = 1;', 'javascript', CellKind.Code, [], {}], //350
            ['# header b', 'markdown', CellKind.Markup, [], {}], //400
            ['## header bb', 'markdown', CellKind.Markup, [], {}], //450
            ['### header bbb', 'markdown', CellKind.Markup, [], {}],
            ['var c = 2;', 'javascript', CellKind.Code, [], {}],
        ], async (editor, viewModel, ds) => {
            viewModel.restoreEditorViewState({
                editingCells: Array.from({ length: 12 }, () => false),
                editorViewStates: Array.from({ length: 12 }, () => null),
                cellTotalHeights: Array.from({ length: 12 }, () => 50),
                cellLineNumberStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            });
            const cellList = ds.add(createNotebookCellList(instantiationService, ds));
            cellList.attachViewModel(viewModel);
            cellList.layout(400, 100);
            editor.setScrollTop(350);
            editor.visibleRanges = [{ start: 7, end: 12 }];
            const outline = getOutline(editor);
            const notebookOutlineEntries = outline.entries;
            const resultingMap = nbStickyTestHelper(domNode, editor, cellList, notebookOutlineEntries, ds);
            await assertSnapshot(resultingMap);
            outline.dispose();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTdGlja3lTY3JvbGwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL25vdGVib29rU3RpY2t5U2Nyb2xsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUcxRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUl0RixPQUFPLEVBRU4sY0FBYyxHQUNkLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFDTixzQkFBc0IsRUFDdEIseUJBQXlCLEVBQ3pCLGdCQUFnQixHQUNoQixNQUFNLHlCQUF5QixDQUFBO0FBR2hDLEtBQUssQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7SUFDeEMsSUFBSSxXQUE0QixDQUFBO0lBQ2hDLElBQUksb0JBQThDLENBQUE7SUFFbEQsTUFBTSxPQUFPLEdBQWdCLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7SUFFMUQsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN0QixDQUFDLENBQUMsQ0FBQTtJQUVGLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFdkQsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ25DLG9CQUFvQixHQUFHLHlCQUF5QixDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQzdELG9CQUFvQixDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLHVCQUF1QixFQUFFLENBQUMsQ0FBQTtJQUNsRixDQUFDLENBQUMsQ0FBQTtJQUVGLFNBQVMsVUFBVSxDQUFDLE1BQVc7UUFDOUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3hCLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLDhCQUE4QixDQUFDLENBQUE7UUFDakQsQ0FBQztRQUNELE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQ3hCLG9CQUFvQixDQUFDLGNBQWMsQ0FDbEMsbUJBQW1CLEVBQ25CLElBQUksQ0FBQyxLQUFNLFNBQVEsSUFBSSxFQUF1QjtZQUF6Qzs7Z0JBSUsscUJBQWdCLEdBQWdCLEtBQUssQ0FBQyxJQUFJLENBQUE7Z0JBQzFDLHlCQUFvQixHQUEyQyxLQUFLLENBQUMsSUFBSSxDQUFBO1lBQ25GLENBQUM7WUFMUyxVQUFVO2dCQUNsQixPQUFPLE1BQU0sQ0FBQTtZQUNkLENBQUM7U0FHRCxDQUFDLEVBQUUsa0NBRUosQ0FDRCxDQUFBO1FBQ0QsT0FBTyxPQUFPLENBQUE7SUFDZixDQUFDO0lBRUQsU0FBUyxrQkFBa0IsQ0FDMUIsT0FBb0IsRUFDcEIsY0FBK0IsRUFDL0IsZ0JBQW1DLEVBQ25DLHNCQUFzQyxFQUN0QyxXQUF5QztRQUV6QyxNQUFNLE1BQU0sR0FBRyxjQUFjLENBQUMsY0FBYyxFQUFFLGdCQUFnQixFQUFFLHNCQUFzQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFGLEtBQUssTUFBTSxVQUFVLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7WUFDMUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDakMsQ0FBQztRQUNELE9BQU8sdUJBQXVCLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDaEQsQ0FBQztJQUVELFNBQVMsdUJBQXVCLENBQy9CLFdBQThFO1FBRTlFLE1BQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQTtRQUN6QixLQUFLLE1BQU0sVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ3RDLElBQUksVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUN6QixjQUFjLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzFELENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxjQUFjLENBQUE7SUFDdEIsQ0FBQztJQUVELElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxLQUFLO1FBQ3hELE1BQU0sZ0JBQWdCLENBQ3JCO1lBQ0MsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLGNBQWMsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ3JELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1NBQ25ELEVBQ0QsS0FBSyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUMzQixTQUFTLENBQUMsc0JBQXNCLENBQUM7Z0JBQ2hDLFlBQVksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQztnQkFDcEQsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUM7Z0JBQ3ZELGdCQUFnQixFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUNyRCxvQkFBb0IsRUFBRSxFQUFFO2dCQUN4QixtQkFBbUIsRUFBRSxFQUFFO2dCQUN2QixvQkFBb0IsRUFBRSxFQUFFO2FBQ3hCLENBQUMsQ0FBQTtZQUVGLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsb0JBQW9CLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQTtZQUMzRixRQUFRLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ25DLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBRXpCLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdEIsTUFBTSxDQUFDLGFBQWEsR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUU3QyxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDbEMsTUFBTSxzQkFBc0IsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFBO1lBQzlDLE1BQU0sWUFBWSxHQUFHLGtCQUFrQixDQUN0QyxPQUFPLEVBQ1AsTUFBTSxFQUNOLFFBQVEsRUFDUixzQkFBc0IsRUFDdEIsV0FBVyxDQUNYLENBQUE7WUFDRCxNQUFNLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUNsQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDbEIsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnREFBZ0QsRUFBRSxLQUFLO1FBQzNELE1BQU0sZ0JBQWdCLENBQ3JCO1lBQ0MsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUk7WUFDekQsQ0FBQyxjQUFjLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEtBQUs7WUFDNUQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU07WUFDM0QsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU07WUFDM0QsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU07WUFDM0QsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU07WUFDM0QsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU07WUFDM0QsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU07U0FDM0QsRUFDRCxLQUFLLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRTtZQUMvQixTQUFTLENBQUMsc0JBQXNCLENBQUM7Z0JBQ2hDLFlBQVksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQztnQkFDcEQsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUM7Z0JBQ3ZELGdCQUFnQixFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUNyRCxvQkFBb0IsRUFBRSxFQUFFO2dCQUN4QixtQkFBbUIsRUFBRSxFQUFFO2dCQUN2QixvQkFBb0IsRUFBRSxFQUFFO2FBQ3hCLENBQUMsQ0FBQTtZQUVGLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN6RSxRQUFRLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ25DLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBRXpCLE1BQU0sQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDeEIsTUFBTSxDQUFDLGFBQWEsR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUU3QyxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDbEMsTUFBTSxzQkFBc0IsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFBO1lBQzlDLE1BQU0sWUFBWSxHQUFHLGtCQUFrQixDQUN0QyxPQUFPLEVBQ1AsTUFBTSxFQUNOLFFBQVEsRUFDUixzQkFBc0IsRUFDdEIsRUFBRSxDQUNGLENBQUE7WUFFRCxNQUFNLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUNsQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDbEIsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2RkFBNkYsRUFBRSxLQUFLO1FBQ3hHLE1BQU0sZ0JBQWdCLENBQ3JCO1lBQ0MsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUk7WUFDekQsQ0FBQyxjQUFjLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEtBQUs7WUFDNUQsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsTUFBTTtZQUMvRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsTUFBTTtZQUMzRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsTUFBTTtZQUMzRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsTUFBTTtZQUMzRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsTUFBTTtZQUMzRCxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsTUFBTTtZQUMzRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsTUFBTTtTQUMzRCxFQUNELEtBQUssRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxFQUFFO1lBQy9CLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQztnQkFDaEMsWUFBWSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDO2dCQUNwRCxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQztnQkFDdkQsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JELG9CQUFvQixFQUFFLEVBQUU7Z0JBQ3hCLG1CQUFtQixFQUFFLEVBQUU7Z0JBQ3ZCLG9CQUFvQixFQUFFLEVBQUU7YUFDeEIsQ0FBQyxDQUFBO1lBRUYsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pFLFFBQVEsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDbkMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFFekIsTUFBTSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQSxDQUFDLDJCQUEyQjtZQUNwRCxNQUFNLENBQUMsYUFBYSxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBRTdDLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNsQyxNQUFNLHNCQUFzQixHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUE7WUFDOUMsTUFBTSxZQUFZLEdBQUcsa0JBQWtCLENBQ3RDLE9BQU8sRUFDUCxNQUFNLEVBQ04sUUFBUSxFQUNSLHNCQUFzQixFQUN0QixFQUFFLENBQ0YsQ0FBQTtZQUVELE1BQU0sY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQ2xDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNsQixDQUFDLENBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdFQUF3RSxFQUFFLEtBQUs7UUFDbkYsTUFBTSxnQkFBZ0IsQ0FDckI7WUFDQyxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSTtZQUN6RCxDQUFDLGNBQWMsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsS0FBSztZQUM1RCxDQUFDLGdCQUFnQixFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxNQUFNO1lBQy9ELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxNQUFNO1lBQzNELENBQUMsZ0JBQWdCLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU07WUFDL0QsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU07WUFDM0QsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU07WUFDM0QsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU07WUFDM0QsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU07WUFDM0QsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU07U0FDM0QsRUFDRCxLQUFLLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRTtZQUMvQixTQUFTLENBQUMsc0JBQXNCLENBQUM7Z0JBQ2hDLFlBQVksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQztnQkFDckQsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUM7Z0JBQ3hELGdCQUFnQixFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUN0RCxvQkFBb0IsRUFBRSxFQUFFO2dCQUN4QixtQkFBbUIsRUFBRSxFQUFFO2dCQUN2QixvQkFBb0IsRUFBRSxFQUFFO2FBQ3hCLENBQUMsQ0FBQTtZQUVGLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN6RSxRQUFRLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ25DLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBRXpCLE1BQU0sQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUEsQ0FBQywyQkFBMkI7WUFDcEQsTUFBTSxDQUFDLGFBQWEsR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUU5QyxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDbEMsTUFBTSxzQkFBc0IsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFBO1lBQzlDLE1BQU0sWUFBWSxHQUFHLGtCQUFrQixDQUN0QyxPQUFPLEVBQ1AsTUFBTSxFQUNOLFFBQVEsRUFDUixzQkFBc0IsRUFDdEIsRUFBRSxDQUNGLENBQUE7WUFFRCxNQUFNLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUNsQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDbEIsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLDZCQUE2QjtJQUM3QixJQUFJLENBQUMsNERBQTRELEVBQUUsS0FBSztRQUN2RSxNQUFNLGdCQUFnQixDQUNyQjtZQUNDLENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxjQUFjLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNyRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztTQUNuRCxFQUNELEtBQUssRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxFQUFFO1lBQy9CLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQztnQkFDaEMsWUFBWSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDO2dCQUNwRCxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQztnQkFDdkQsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JELG9CQUFvQixFQUFFLEVBQUU7Z0JBQ3hCLG1CQUFtQixFQUFFLEVBQUU7Z0JBQ3ZCLG9CQUFvQixFQUFFLEVBQUU7YUFDeEIsQ0FBQyxDQUFBO1lBRUYsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pFLFFBQVEsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDbkMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFFekIsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUN2QixNQUFNLENBQUMsYUFBYSxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBRTdDLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNsQyxNQUFNLHNCQUFzQixHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUE7WUFDOUMsTUFBTSxZQUFZLEdBQUcsa0JBQWtCLENBQ3RDLE9BQU8sRUFDUCxNQUFNLEVBQ04sUUFBUSxFQUNSLHNCQUFzQixFQUN0QixFQUFFLENBQ0YsQ0FBQTtZQUVELE1BQU0sY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQ2xDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNsQixDQUFDLENBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDhEQUE4RCxFQUFFLEtBQUs7UUFDekUsTUFBTSxnQkFBZ0IsQ0FDckI7WUFDQyxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsY0FBYyxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDckQsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ3ZELENBQUMsa0JBQWtCLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUN6RCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztTQUNuRCxFQUNELEtBQUssRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxFQUFFO1lBQy9CLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQztnQkFDaEMsWUFBWSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDO2dCQUNyRCxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQztnQkFDeEQsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RELG9CQUFvQixFQUFFLEVBQUU7Z0JBQ3hCLG1CQUFtQixFQUFFLEVBQUU7Z0JBQ3ZCLG9CQUFvQixFQUFFLEVBQUU7YUFDeEIsQ0FBQyxDQUFBO1lBRUYsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pFLFFBQVEsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDbkMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFFekIsTUFBTSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUN4QixNQUFNLENBQUMsYUFBYSxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBRTlDLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNsQyxNQUFNLHNCQUFzQixHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUE7WUFDOUMsTUFBTSxZQUFZLEdBQUcsa0JBQWtCLENBQ3RDLE9BQU8sRUFDUCxNQUFNLEVBQ04sUUFBUSxFQUNSLHNCQUFzQixFQUN0QixFQUFFLENBQ0YsQ0FBQTtZQUVELE1BQU0sY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQ2xDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNsQixDQUFDLENBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDhEQUE4RCxFQUFFLEtBQUs7UUFDekUsTUFBTSxnQkFBZ0IsQ0FDckI7WUFDQyxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsY0FBYyxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDckQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsY0FBYyxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDckQsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ3ZELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7U0FDbkQsRUFDRCxLQUFLLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRTtZQUMvQixTQUFTLENBQUMsc0JBQXNCLENBQUM7Z0JBQ2hDLFlBQVksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQztnQkFDckQsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUM7Z0JBQ3hELGdCQUFnQixFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUN0RCxvQkFBb0IsRUFBRSxFQUFFO2dCQUN4QixtQkFBbUIsRUFBRSxFQUFFO2dCQUN2QixvQkFBb0IsRUFBRSxFQUFFO2FBQ3hCLENBQUMsQ0FBQTtZQUVGLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN6RSxRQUFRLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ25DLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBRXpCLE1BQU0sQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDeEIsTUFBTSxDQUFDLGFBQWEsR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUU5QyxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDbEMsTUFBTSxzQkFBc0IsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFBO1lBQzlDLE1BQU0sWUFBWSxHQUFHLGtCQUFrQixDQUN0QyxPQUFPLEVBQ1AsTUFBTSxFQUNOLFFBQVEsRUFDUixzQkFBc0IsRUFDdEIsRUFBRSxDQUNGLENBQUE7WUFFRCxNQUFNLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUNsQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDbEIsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2REFBNkQsRUFBRSxLQUFLO1FBQ3hFLE1BQU0sZ0JBQWdCLENBQ3JCO1lBQ0MsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUc7WUFDeEQsQ0FBQyxjQUFjLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUk7WUFDM0QsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsS0FBSztZQUM5RCxDQUFDLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLO1lBQ2hFLENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLO1lBQzFELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLO1lBQzFELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLO1lBQzFELENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLO1lBQzFELENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLO1lBQzFELENBQUMsY0FBYyxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLO1lBQzVELENBQUMsZ0JBQWdCLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUN2RCxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1NBQ25ELEVBQ0QsS0FBSyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLEVBQUU7WUFDL0IsU0FBUyxDQUFDLHNCQUFzQixDQUFDO2dCQUNoQyxZQUFZLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUM7Z0JBQ3JELGdCQUFnQixFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDO2dCQUN4RCxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQztnQkFDdEQsb0JBQW9CLEVBQUUsRUFBRTtnQkFDeEIsbUJBQW1CLEVBQUUsRUFBRTtnQkFDdkIsb0JBQW9CLEVBQUUsRUFBRTthQUN4QixDQUFDLENBQUE7WUFFRixNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLG9CQUFvQixFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDekUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNuQyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUV6QixNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3hCLE1BQU0sQ0FBQyxhQUFhLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFFOUMsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ2xDLE1BQU0sc0JBQXNCLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQTtZQUM5QyxNQUFNLFlBQVksR0FBRyxrQkFBa0IsQ0FDdEMsT0FBTyxFQUNQLE1BQU0sRUFDTixRQUFRLEVBQ1Isc0JBQXNCLEVBQ3RCLEVBQUUsQ0FDRixDQUFBO1lBRUQsTUFBTSxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDbEMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2xCLENBQUMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9