/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CellFocusMode } from '../notebookBrowser.js';
import { CellKind, NotebookCellExecutionState, NotebookSetting, } from '../../common/notebookCommon.js';
export class NotebookCellAnchor {
    constructor(notebookExecutionStateService, configurationService, scrollEvent) {
        this.notebookExecutionStateService = notebookExecutionStateService;
        this.configurationService = configurationService;
        this.scrollEvent = scrollEvent;
        this.stopAnchoring = false;
    }
    shouldAnchor(cellListView, focusedIndex, heightDelta, executingCellUri) {
        if (cellListView.element(focusedIndex).focusMode === CellFocusMode.Editor) {
            return true;
        }
        if (this.stopAnchoring) {
            return false;
        }
        const newFocusBottom = cellListView.elementTop(focusedIndex) + cellListView.elementHeight(focusedIndex) + heightDelta;
        const viewBottom = cellListView.renderHeight + cellListView.getScrollTop();
        const focusStillVisible = viewBottom > newFocusBottom;
        const allowScrolling = this.configurationService.getValue(NotebookSetting.scrollToRevealCell) !== 'none';
        const growing = heightDelta > 0;
        const autoAnchor = allowScrolling && growing && !focusStillVisible;
        if (autoAnchor) {
            this.watchAchorDuringExecution(executingCellUri);
            return true;
        }
        return false;
    }
    watchAchorDuringExecution(executingCell) {
        // anchor while the cell is executing unless the user scrolls up.
        if (!this.executionWatcher && executingCell.cellKind === CellKind.Code) {
            const executionState = this.notebookExecutionStateService.getCellExecution(executingCell.uri);
            if (executionState && executionState.state === NotebookCellExecutionState.Executing) {
                this.executionWatcher = executingCell.onDidStopExecution(() => {
                    this.executionWatcher?.dispose();
                    this.executionWatcher = undefined;
                    this.scrollWatcher?.dispose();
                    this.stopAnchoring = false;
                });
                this.scrollWatcher = this.scrollEvent((scrollEvent) => {
                    if (scrollEvent.scrollTop < scrollEvent.oldScrollTop) {
                        this.stopAnchoring = true;
                        this.scrollWatcher?.dispose();
                    }
                });
            }
        }
    }
    dispose() {
        this.executionWatcher?.dispose();
        this.scrollWatcher?.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsQW5jaG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvbm90ZWJvb2tDZWxsQW5jaG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxhQUFhLEVBQWtCLE1BQU0sdUJBQXVCLENBQUE7QUFFckUsT0FBTyxFQUNOLFFBQVEsRUFDUiwwQkFBMEIsRUFDMUIsZUFBZSxHQUNmLE1BQU0sZ0NBQWdDLENBQUE7QUFRdkMsTUFBTSxPQUFPLGtCQUFrQjtJQUs5QixZQUNrQiw2QkFBNkQsRUFDN0Qsb0JBQTJDLEVBQzNDLFdBQStCO1FBRi9CLGtDQUE2QixHQUE3Qiw2QkFBNkIsQ0FBZ0M7UUFDN0QseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUMzQyxnQkFBVyxHQUFYLFdBQVcsQ0FBb0I7UUFQekMsa0JBQWEsR0FBRyxLQUFLLENBQUE7SUFRMUIsQ0FBQztJQUVHLFlBQVksQ0FDbEIsWUFBc0MsRUFDdEMsWUFBb0IsRUFDcEIsV0FBbUIsRUFDbkIsZ0JBQWdDO1FBRWhDLElBQUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxTQUFTLEtBQUssYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzNFLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELE1BQU0sY0FBYyxHQUNuQixZQUFZLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxHQUFHLFlBQVksQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLEdBQUcsV0FBVyxDQUFBO1FBQy9GLE1BQU0sVUFBVSxHQUFHLFlBQVksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQzFFLE1BQU0saUJBQWlCLEdBQUcsVUFBVSxHQUFHLGNBQWMsQ0FBQTtRQUNyRCxNQUFNLGNBQWMsR0FDbkIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLENBQUMsS0FBSyxNQUFNLENBQUE7UUFDbEYsTUFBTSxPQUFPLEdBQUcsV0FBVyxHQUFHLENBQUMsQ0FBQTtRQUMvQixNQUFNLFVBQVUsR0FBRyxjQUFjLElBQUksT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUE7UUFFbEUsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMseUJBQXlCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtZQUNoRCxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTSx5QkFBeUIsQ0FBQyxhQUE2QjtRQUM3RCxpRUFBaUU7UUFDakUsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxhQUFhLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN4RSxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQzdGLElBQUksY0FBYyxJQUFJLGNBQWMsQ0FBQyxLQUFLLEtBQUssMEJBQTBCLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3JGLElBQUksQ0FBQyxnQkFBZ0IsR0FBSSxhQUFtQyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRTtvQkFDcEYsSUFBSSxDQUFDLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxDQUFBO29CQUNoQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsU0FBUyxDQUFBO29CQUNqQyxJQUFJLENBQUMsYUFBYSxFQUFFLE9BQU8sRUFBRSxDQUFBO29CQUM3QixJQUFJLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQTtnQkFDM0IsQ0FBQyxDQUFDLENBQUE7Z0JBQ0YsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUU7b0JBQ3JELElBQUksV0FBVyxDQUFDLFNBQVMsR0FBRyxXQUFXLENBQUMsWUFBWSxFQUFFLENBQUM7d0JBQ3RELElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFBO3dCQUN6QixJQUFJLENBQUMsYUFBYSxFQUFFLE9BQU8sRUFBRSxDQUFBO29CQUM5QixDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsQ0FBQTtRQUNoQyxJQUFJLENBQUMsYUFBYSxFQUFFLE9BQU8sRUFBRSxDQUFBO0lBQzlCLENBQUM7Q0FDRCJ9