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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbFByb2dyZXNzQmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L2NlbGxQYXJ0cy9jZWxsUHJvZ3Jlc3NCYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQzFGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBR3BHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RSxPQUFPLEVBRU4sOEJBQThCLEdBQzlCLE1BQU0sa0RBQWtELENBQUE7QUFFbEQsSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZ0IsU0FBUSxlQUFlO0lBSW5ELFlBQ0MsZUFBNEIsRUFDNUIsdUJBQW9DLEVBRW5CLDhCQUE4RDtRQUUvRSxLQUFLLEVBQUUsQ0FBQTtRQUZVLG1DQUE4QixHQUE5Qiw4QkFBOEIsQ0FBZ0M7UUFJL0UsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksV0FBVyxDQUFDLGVBQWUsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDLENBQUE7UUFDOUYsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUV4QixJQUFJLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDMUMsSUFBSSxXQUFXLENBQUMsdUJBQXVCLEVBQUUsd0JBQXdCLENBQUMsQ0FDbEUsQ0FBQTtRQUNELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUNsQyxDQUFDO0lBRVEsYUFBYSxDQUFDLE9BQXVCO1FBQzdDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRVEsdUJBQXVCLENBQy9CLE9BQXVCLEVBQ3ZCLENBQWtDO1FBRWxDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDMUMsQ0FBQztJQUVRLFdBQVcsQ0FBQyxPQUF1QixFQUFFLENBQWdDO1FBQzdFLElBQUksQ0FBQyxDQUFDLGVBQWUsSUFBSSxDQUFDLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNwRCxJQUFJLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDdkMsQ0FBQztRQUVELElBQUksQ0FBQyxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDN0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLDhCQUE4QixDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNsRixJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUM5QixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFBO2dCQUN4QixJQUFJLFFBQVEsRUFBRSxLQUFLLEtBQUssMEJBQTBCLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQzlELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDdkMsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBQ2pDLElBQUksUUFBUSxFQUFFLEtBQUssS0FBSywwQkFBMEIsQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFDOUQsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUN2QyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sd0JBQXdCLENBQy9CLE9BQXVCLEVBQ3ZCLENBQW1DO1FBRW5DLE1BQU0sUUFBUSxHQUFHLENBQUMsRUFBRSxPQUFPLElBQUksSUFBSSxDQUFDLDhCQUE4QixDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNoRyxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQTtRQUM3RixJQUNDLFFBQVEsRUFBRSxLQUFLLEtBQUssMEJBQTBCLENBQUMsU0FBUztZQUN4RCxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFDL0MsQ0FBQztZQUNGLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM3QixDQUFDO2FBQU0sQ0FBQztZQUNQLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNuQixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFwRVksZUFBZTtJQU96QixXQUFBLDhCQUE4QixDQUFBO0dBUHBCLGVBQWUsQ0FvRTNCOztBQUVELFNBQVMsZUFBZSxDQUFDLFdBQXdCO0lBQ2hELFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDakMsQ0FBQyJ9