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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0aW9uRWRpdG9yUHJvZ3Jlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvZXhlY3V0ZS9leGVjdXRpb25FZGl0b3JQcm9ncmVzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDdEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRTFGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlFLE9BQU8sRUFFTiw4QkFBOEIsR0FDOUIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQTtBQUVsRyxJQUFNLGlDQUFpQyxHQUF2QyxNQUFNLGlDQUNaLFNBQVEsVUFBVTthQUdYLE9BQUUsR0FBVyw0Q0FBNEMsQUFBdkQsQ0FBdUQ7SUFJaEUsWUFDa0IsZUFBZ0MsRUFFakQsOEJBQStFLEVBQ3pELGFBQW9EO1FBRTFFLEtBQUssRUFBRSxDQUFBO1FBTFUsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBRWhDLG1DQUE4QixHQUE5Qiw4QkFBOEIsQ0FBZ0M7UUFDeEMsa0JBQWEsR0FBYixhQUFhLENBQXNCO1FBTjFELG1CQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQTtRQVV4RSxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8s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