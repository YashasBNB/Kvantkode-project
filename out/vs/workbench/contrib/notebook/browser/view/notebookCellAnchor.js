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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsQW5jaG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L25vdGVib29rQ2VsbEFuY2hvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsYUFBYSxFQUFrQixNQUFNLHVCQUF1QixDQUFBO0FBRXJFLE9BQU8sRUFDTixRQUFRLEVBQ1IsMEJBQTBCLEVBQzFCLGVBQWUsR0FDZixNQUFNLGdDQUFnQyxDQUFBO0FBUXZDLE1BQU0sT0FBTyxrQkFBa0I7SUFLOUIsWUFDa0IsNkJBQTZELEVBQzdELG9CQUEyQyxFQUMzQyxXQUErQjtRQUYvQixrQ0FBNkIsR0FBN0IsNkJBQTZCLENBQWdDO1FBQzdELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDM0MsZ0JBQVcsR0FBWCxXQUFXLENBQW9CO1FBUHpDLGtCQUFhLEdBQUcsS0FBSyxDQUFBO0lBUTFCLENBQUM7SUFFRyxZQUFZLENBQ2xCLFlBQXNDLEVBQ3RDLFlBQW9CLEVBQ3BCLFdBQW1CLEVBQ25CLGdCQUFnQztRQUVoQyxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsU0FBUyxLQUFLLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMzRSxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FDbkIsWUFBWSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsR0FBRyxZQUFZLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxHQUFHLFdBQVcsQ0FBQTtRQUMvRixNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUMxRSxNQUFNLGlCQUFpQixHQUFHLFVBQVUsR0FBRyxjQUFjLENBQUE7UUFDckQsTUFBTSxjQUFjLEdBQ25CLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLEtBQUssTUFBTSxDQUFBO1FBQ2xGLE1BQU0sT0FBTyxHQUFHLFdBQVcsR0FBRyxDQUFDLENBQUE7UUFDL0IsTUFBTSxVQUFVLEdBQUcsY0FBYyxJQUFJLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFBO1FBRWxFLElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLENBQUE7WUFDaEQsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU0seUJBQXlCLENBQUMsYUFBNkI7UUFDN0QsaUVBQWlFO1FBQ2pFLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLElBQUksYUFBYSxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDeEUsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUM3RixJQUFJLGNBQWMsSUFBSSxjQUFjLENBQUMsS0FBSyxLQUFLLDBCQUEwQixDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNyRixJQUFJLENBQUMsZ0JBQWdCLEdBQUksYUFBbUMsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUU7b0JBQ3BGLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsQ0FBQTtvQkFDaEMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFNBQVMsQ0FBQTtvQkFDakMsSUFBSSxDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsQ0FBQTtvQkFDN0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUE7Z0JBQzNCLENBQUMsQ0FBQyxDQUFBO2dCQUNGLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFO29CQUNyRCxJQUFJLFdBQVcsQ0FBQyxTQUFTLEdBQUcsV0FBVyxDQUFDLFlBQVksRUFBRSxDQUFDO3dCQUN0RCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQTt3QkFDekIsSUFBSSxDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsQ0FBQTtvQkFDOUIsQ0FBQztnQkFDRixDQUFDLENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLENBQUE7UUFDaEMsSUFBSSxDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsQ0FBQTtJQUM5QixDQUFDO0NBQ0QifQ==