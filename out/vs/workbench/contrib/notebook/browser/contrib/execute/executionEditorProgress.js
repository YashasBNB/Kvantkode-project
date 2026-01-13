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
import { throttle } from '../../../../../../base/common/decorators.js';
import { Disposable, MutableDisposable } from '../../../../../../base/common/lifecycle.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
import { NotebookCellExecutionState } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService, } from '../../../common/notebookExecutionStateService.js';
import { IUserActivityService } from '../../../../../services/userActivity/common/userActivityService.js';
let ExecutionEditorProgressController = class ExecutionEditorProgressController extends Disposable {
    static { this.id = 'workbench.notebook.executionEditorProgress'; }
    constructor(_notebookEditor, _notebookExecutionStateService, _userActivity) {
        super();
        this._notebookEditor = _notebookEditor;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this._userActivity = _userActivity;
        this._activityMutex = this._register(new MutableDisposable());
        this._register(_notebookEditor.onDidScroll(() => this._update()));
        this._register(_notebookExecutionStateService.onDidChangeExecution((e) => {
            if (e.notebook.toString() !== this._notebookEditor.textModel?.uri.toString()) {
                return;
            }
            this._update();
        }));
        this._register(_notebookEditor.onDidChangeModel(() => this._update()));
    }
    _update() {
        if (!this._notebookEditor.hasModel()) {
            return;
        }
        const cellExecutions = this._notebookExecutionStateService
            .getCellExecutionsForNotebook(this._notebookEditor.textModel?.uri)
            .filter((exe) => exe.state === NotebookCellExecutionState.Executing);
        const notebookExecution = this._notebookExecutionStateService.getExecution(this._notebookEditor.textModel?.uri);
        const executionIsVisible = (exe) => {
            for (const range of this._notebookEditor.visibleRanges) {
                for (const cell of this._notebookEditor.getCellsInRange(range)) {
                    if (cell.handle === exe.cellHandle) {
                        const top = this._notebookEditor.getAbsoluteTopOfElement(cell);
                        if (this._notebookEditor.scrollTop < top + 5) {
                            return true;
                        }
                    }
                }
            }
            return false;
        };
        const hasAnyExecution = cellExecutions.length || notebookExecution;
        if (hasAnyExecution && !this._activityMutex.value) {
            this._activityMutex.value = this._userActivity.markActive();
        }
        else if (!hasAnyExecution && this._activityMutex.value) {
            this._activityMutex.clear();
        }
        const shouldShowEditorProgressbarForCellExecutions = cellExecutions.length &&
            !cellExecutions.some(executionIsVisible) &&
            !cellExecutions.some((e) => e.isPaused);
        const showEditorProgressBar = !!notebookExecution || shouldShowEditorProgressbarForCellExecutions;
        if (showEditorProgressBar) {
            this._notebookEditor.showProgress();
        }
        else {
            this._notebookEditor.hideProgress();
        }
    }
};
__decorate([
    throttle(100)
], ExecutionEditorProgressController.prototype, "_update", null);
ExecutionEditorProgressController = __decorate([
    __param(1, INotebookExecutionStateService),
    __param(2, IUserActivityService)
], ExecutionEditorProgressController);
export { ExecutionEditorProgressController };
registerNotebookContribution(ExecutionEditorProgressController.id, ExecutionEditorProgressController);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0aW9uRWRpdG9yUHJvZ3Jlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9leGVjdXRlL2V4ZWN1dGlvbkVkaXRvclByb2dyZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFMUYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUUsT0FBTyxFQUVOLDhCQUE4QixHQUM5QixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBRWxHLElBQU0saUNBQWlDLEdBQXZDLE1BQU0saUNBQ1osU0FBUSxVQUFVO2FBR1gsT0FBRSxHQUFXLDRDQUE0QyxBQUF2RCxDQUF1RDtJQUloRSxZQUNrQixlQUFnQyxFQUVqRCw4QkFBK0UsRUFDekQsYUFBb0Q7UUFFMUUsS0FBSyxFQUFFLENBQUE7UUFMVSxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFFaEMsbUNBQThCLEdBQTlCLDhCQUE4QixDQUFnQztRQUN4QyxrQkFBYSxHQUFiLGFBQWEsQ0FBc0I7UUFOMUQsbUJBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFBO1FBVXhFLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVB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