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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsQW5jaG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9ub3RlYm9va0NlbGxBbmNob3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU3RCxPQUFPLEVBQ04sUUFBUSxFQUNSLDBCQUEwQixFQUMxQixlQUFlLEdBQ2YsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV2QyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUdsRyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFDdkQsSUFBSSxXQUE4QixDQUFBO0lBQ2xDLElBQUksTUFBZ0MsQ0FBQTtJQUNwQyxJQUFJLFdBQWlDLENBQUE7SUFDckMsSUFBSSxrQkFBaUMsQ0FBQTtJQUNyQyxJQUFJLFlBQStCLENBQUE7SUFFbkMsSUFBSSxVQUE4QixDQUFBO0lBRWxDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixNQUFNLEdBQUcsSUFBSSx3QkFBd0IsRUFBRSxDQUFBO1FBQ3ZDLFdBQVcsR0FBRyxJQUFJLE9BQU8sRUFBZSxDQUFBO1FBQ3hDLGtCQUFrQixHQUFHLElBQUksT0FBTyxFQUFRLENBQUE7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