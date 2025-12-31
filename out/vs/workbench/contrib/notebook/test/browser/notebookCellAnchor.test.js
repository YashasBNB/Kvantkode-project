/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { CellFocusMode } from '../../browser/notebookBrowser.js';
import { NotebookCellAnchor } from '../../browser/view/notebookCellAnchor.js';
import { Emitter } from '../../../../../base/common/event.js';
import { CellKind, NotebookCellExecutionState, NotebookSetting, } from '../../common/notebookCommon.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('NotebookCellAnchor', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let focusedCell;
    let config;
    let scrollEvent;
    let onDidStopExecution;
    let resizingCell;
    let cellAnchor;
    setup(() => {
        config = new TestConfigurationService();
        scrollEvent = new Emitter();
        onDidStopExecution = new Emitter();
        const executionService = {
            getCellExecution: () => {
                return { state: NotebookCellExecutionState.Executing };
            },
        };
        resizingCell = {
            cellKind: CellKind.Code,
            onDidStopExecution: onDidStopExecution.event,
        };
        focusedCell = {
            focusMode: CellFocusMode.Container,
        };
        cellAnchor = store.add(new NotebookCellAnchor(executionService, config, scrollEvent.event));
    });
    // for the current implementation the code under test only cares about the focused cell
    // initial setup with focused cell at the bottom of the view
    class MockListView {
        constructor() {
            this.focusedCellTop = 100;
            this.focusedCellHeight = 50;
            this.renderTop = 0;
            this.renderHeight = 150;
        }
        element(_index) {
            return focusedCell;
        }
        elementTop(_index) {
            return this.focusedCellTop;
        }
        elementHeight(_index) {
            return this.focusedCellHeight;
        }
        getScrollTop() {
            return this.renderTop;
        }
    }
    test('Basic anchoring', async function () {
        focusedCell.focusMode = CellFocusMode.Editor;
        const listView = new MockListView();
        assert(cellAnchor.shouldAnchor(listView, 1, -10, resizingCell), 'should anchor if cell editor is focused');
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'should anchor if cell editor is focused');
        config.setUserConfiguration(NotebookSetting.scrollToRevealCell, 'none');
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'should anchor if cell editor is focused');
        config.setUserConfiguration(NotebookSetting.scrollToRevealCell, 'fullCell');
        focusedCell.focusMode = CellFocusMode.Container;
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'should anchor if cell is growing');
        focusedCell.focusMode = CellFocusMode.Output;
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'should anchor if cell is growing');
        assert(!cellAnchor.shouldAnchor(listView, 1, -10, resizingCell), 'should not anchor if not growing and editor not focused');
        config.setUserConfiguration(NotebookSetting.scrollToRevealCell, 'none');
        assert(!cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'should not anchor if scroll on execute is disabled');
    });
    test('Anchor during execution until user scrolls up', async function () {
        const listView = new MockListView();
        const scrollDown = { oldScrollTop: 100, scrollTop: 150 };
        const scrollUp = { oldScrollTop: 200, scrollTop: 150 };
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell));
        scrollEvent.fire(scrollDown);
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'cell should still be anchored after scrolling down');
        scrollEvent.fire(scrollUp);
        assert(!cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'cell should not be anchored after scrolling up');
        focusedCell.focusMode = CellFocusMode.Editor;
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'cell should anchor again if the editor is focused');
        focusedCell.focusMode = CellFocusMode.Container;
        onDidStopExecution.fire();
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'cell should anchor for new execution');
    });
    test('Only anchor during when the focused cell will be pushed out of view', async function () {
        const mockListView = new MockListView();
        mockListView.focusedCellTop = 50;
        const listView = mockListView;
        assert(!cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'should not anchor if focused cell will still be fully visible after resize');
        focusedCell.focusMode = CellFocusMode.Editor;
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'cell should always anchor if the editor is focused');
        // fully visible focused cell would be pushed partially out of view
        assert(cellAnchor.shouldAnchor(listView, 1, 150, resizingCell), 'cell should be anchored if focused cell will be pushed out of view');
        mockListView.focusedCellTop = 110;
        // partially visible focused cell would be pushed further out of view
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'cell should be anchored if focused cell will be pushed out of view');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsQW5jaG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvbm90ZWJvb2tDZWxsQW5jaG9yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFN0QsT0FBTyxFQUNOLFFBQVEsRUFDUiwwQkFBMEIsRUFDMUIsZUFBZSxHQUNmLE1BQU0sZ0NBQWdDLENBQUE7QUFFdkMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFHbEcsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtJQUNoQyxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBQ3ZELElBQUksV0FBOEIsQ0FBQTtJQUNsQyxJQUFJLE1BQWdDLENBQUE7SUFDcEMsSUFBSSxXQUFpQyxDQUFBO0lBQ3JDLElBQUksa0JBQWlDLENBQUE7SUFDckMsSUFBSSxZQUErQixDQUFBO0lBRW5DLElBQUksVUFBOEIsQ0FBQTtJQUVsQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsTUFBTSxHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQTtRQUN2QyxXQUFXLEdBQUcsSUFBSSxPQUFPLEVBQWUsQ0FBQTtRQUN4QyxrQkFBa0IsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFBO1FBRXhD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