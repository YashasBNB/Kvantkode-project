/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { ProgressBar } from '../../../../../../base/browser/ui/progressbar/progressbar.js';
import { defaultProgressBarStyles } from '../../../../../../platform/theme/browser/defaultStyles.js';
import { CellContentPart } from '../cellPart.js';
import { NotebookCellExecutionState } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService, } from '../../../common/notebookExecutionStateService.js';
let CellProgressBar = class CellProgressBar extends CellContentPart {
    constructor(editorContainer, collapsedInputContainer, _notebookExecutionStateService) {
        super();
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this._progressBar = this._register(new ProgressBar(editorContainer, defaultProgressBarStyles));
        this._progressBar.hide();
        this._collapsedProgressBar = this._register(new ProgressBar(collapsedInputContainer, defaultProgressBarStyles));
        this._collapsedProgressBar.hide();
    }
    didRenderCell(element) {
        this._updateForExecutionState(element);
    }
    updateForExecutionState(element, e) {
        this._updateForExecutionState(element, e);
    }
    updateState(element, e) {
        if (e.metadataChanged || e.internalMetadataChanged) {
            this._updateForExecutionState(element);
        }
        if (e.inputCollapsedChanged) {
            const exeState = this._notebookExecutionStateService.getCellExecution(element.uri);
            if (element.isInputCollapsed) {
                this._progressBar.hide();
                if (exeState?.state === NotebookCellExecutionState.Executing) {
                    this._updateForExecutionState(element);
                }
            }
            else {
                this._collapsedProgressBar.hide();
                if (exeState?.state === NotebookCellExecutionState.Executing) {
                    this._updateForExecutionState(element);
                }
            }
        }
    }
    _updateForExecutionState(element, e) {
        const exeState = e?.changed ?? this._notebookExecutionStateService.getCellExecution(element.uri);
        const progressBar = element.isInputCollapsed ? this._collapsedProgressBar : this._progressBar;
        if (exeState?.state === NotebookCellExecutionState.Executing &&
            (!exeState.didPause || element.isInputCollapsed)) {
            showProgressBar(progressBar);
        }
        else {
            progressBar.hide();
        }
    }
};
CellProgressBar = __decorate([
    __param(2, INotebookExecutionStateService)
], CellProgressBar);
export { CellProgressBar };
function showProgressBar(progressBar) {
    progressBar.infinite().show(500);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbFByb2dyZXNzQmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvY2VsbFBhcnRzL2NlbGxQcm9ncmVzc0Jhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDMUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFHcEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQ2hELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlFLE9BQU8sRUFFTiw4QkFBOEIsR0FDOUIsTUFBTSxrREFBa0QsQ0FBQTtBQUVsRCxJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFnQixTQUFRLGVBQWU7SUFJbkQsWUFDQyxlQUE0QixFQUM1Qix1QkFBb0MsRUFFbkIsOEJBQThEO1FBRS9FLEtBQUssRUFBRSxDQUFBO1FBRlUsbUNBQThCLEdBQTlCLDhCQUE4QixDQUFnQztRQUkvRSxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxXQUFXLENBQUMsZUFBZSxFQUFFLHdCQUF3QixDQUFDLENBQUMsQ0FBQTtRQUM5RixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFBO1FBRXhCLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMxQyxJQUFJLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSx3QkFBd0IsQ0FBQyxDQUNsRSxDQUFBO1FBQ0QsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxDQUFBO0lBQ2xDLENBQUM7SUFFUSxhQUFhLENBQUMsT0FBdUI7UUFDN0MsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFUSx1QkFBdUIsQ0FDL0IsT0FBdUIsRUFDdkIsQ0FBa0M7UUFFbEMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRVEsV0FBVyxDQUFDLE9BQXVCLEVBQUUsQ0FBZ0M7UUFDN0UsSUFBSSxDQUFDLENBQUMsZUFBZSxJQUFJLENBQUMsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQ3BELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN2QyxDQUFDO1FBRUQsSUFBSSxDQUFDLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUM3QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsOEJBQThCLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2xGLElBQUksT0FBTyxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQzlCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBQ3hCLElBQUksUUFBUSxFQUFFLEtBQUssS0FBSywwQkFBMEIsQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFDOUQsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUN2QyxDQUFDO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtnQkFDakMsSUFBSSxRQUFRLEVBQUUsS0FBSyxLQUFLLDBCQUEwQixDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUM5RCxJQUFJLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLENBQUE7Z0JBQ3ZDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyx3QkFBd0IsQ0FDL0IsT0FBdUIsRUFDdkIsQ0FBbUM7UUFFbkMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxFQUFFLE9BQU8sSUFBSSxJQUFJLENBQUMsOEJBQThCLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2hHLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFBO1FBQzdGLElBQ0MsUUFBUSxFQUFFLEtBQUssS0FBSywwQkFBMEIsQ0FBQyxTQUFTO1lBQ3hELENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUMvQyxDQUFDO1lBQ0YsZUFBZSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQzdCLENBQUM7YUFBTSxDQUFDO1lBQ1AsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ25CLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXBFWSxlQUFlO0lBT3pCLFdBQUEsOEJBQThCLENBQUE7R0FQcEIsZUFBZSxDQW9FM0I7O0FBRUQsU0FBUyxlQUFlLENBQUMsV0FBd0I7SUFDaEQsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUNqQyxDQUFDIn0=