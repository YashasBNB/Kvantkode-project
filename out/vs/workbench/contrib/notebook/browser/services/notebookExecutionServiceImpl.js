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
import { toDisposable } from '../../../../../base/common/lifecycle.js';
import * as nls from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IWorkspaceTrustRequestService } from '../../../../../platform/workspace/common/workspaceTrust.js';
import { KernelPickerMRUStrategy } from '../viewParts/notebookKernelQuickPickStrategy.js';
import { CellKind, NotebookCellExecutionState, } from '../../common/notebookCommon.js';
import { INotebookExecutionStateService, } from '../../common/notebookExecutionStateService.js';
import { INotebookKernelHistoryService, INotebookKernelService, } from '../../common/notebookKernelService.js';
import { INotebookLoggingService } from '../../common/notebookLoggingService.js';
let NotebookExecutionService = class NotebookExecutionService {
    constructor(_commandService, _notebookKernelService, _notebookKernelHistoryService, _workspaceTrustRequestService, _logService, _notebookExecutionStateService) {
        this._commandService = _commandService;
        this._notebookKernelService = _notebookKernelService;
        this._notebookKernelHistoryService = _notebookKernelHistoryService;
        this._workspaceTrustRequestService = _workspaceTrustRequestService;
        this._logService = _logService;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this.cellExecutionParticipants = new Set();
    }
    async executeNotebookCells(notebook, cells, contextKeyService) {
        const cellsArr = Array.from(cells).filter((c) => c.cellKind === CellKind.Code);
        if (!cellsArr.length) {
            return;
        }
        this._logService.debug(`Execution`, `${JSON.stringify(cellsArr.map((c) => c.handle))}`);
        const message = nls.localize('notebookRunTrust', 'Executing a notebook cell will run code from this workspace.');
        const trust = await this._workspaceTrustRequestService.requestWorkspaceTrust({ message });
        if (!trust) {
            return;
        }
        // create cell executions
        const cellExecutions = [];
        for (const cell of cellsArr) {
            const cellExe = this._notebookExecutionStateService.getCellExecution(cell.uri);
            if (!!cellExe) {
                continue;
            }
            cellExecutions.push([
                cell,
                this._notebookExecutionStateService.createCellExecution(notebook.uri, cell.handle),
            ]);
        }
        const kernel = await KernelPickerMRUStrategy.resolveKernel(notebook, this._notebookKernelService, this._notebookKernelHistoryService, this._commandService);
        if (!kernel) {
            // clear all pending cell executions
            cellExecutions.forEach((cellExe) => cellExe[1].complete({}));
            return;
        }
        this._notebookKernelHistoryService.addMostRecentKernel(kernel);
        // filter cell executions based on selected kernel
        const validCellExecutions = [];
        for (const [cell, cellExecution] of cellExecutions) {
            if (!kernel.supportedLanguages.includes(cell.language)) {
                cellExecution.complete({});
            }
            else {
                validCellExecutions.push(cellExecution);
            }
        }
        // request execution
        if (validCellExecutions.length > 0) {
            await this.runExecutionParticipants(validCellExecutions);
            this._notebookKernelService.selectKernelForNotebook(kernel, notebook);
            await kernel.executeNotebookCellsRequest(notebook.uri, validCellExecutions.map((c) => c.cellHandle));
            // the connecting state can change before the kernel resolves executeNotebookCellsRequest
            const unconfirmed = validCellExecutions.filter((exe) => exe.state === NotebookCellExecutionState.Unconfirmed);
            if (unconfirmed.length) {
                this._logService.debug(`Execution`, `Completing unconfirmed executions ${JSON.stringify(unconfirmed.map((exe) => exe.cellHandle))}`);
                unconfirmed.forEach((exe) => exe.complete({}));
            }
            this._logService.debug(`Execution`, `Completed executions ${JSON.stringify(validCellExecutions.map((exe) => exe.cellHandle))}`);
        }
    }
    async cancelNotebookCellHandles(notebook, cells) {
        const cellsArr = Array.from(cells);
        this._logService.debug(`Execution`, `CancelNotebookCellHandles ${JSON.stringify(cellsArr)}`);
        const kernel = this._notebookKernelService.getSelectedOrSuggestedKernel(notebook);
        if (kernel) {
            await kernel.cancelNotebookCellExecution(notebook.uri, cellsArr);
        }
    }
    async cancelNotebookCells(notebook, cells) {
        this.cancelNotebookCellHandles(notebook, Array.from(cells, (cell) => cell.handle));
    }
    registerExecutionParticipant(participant) {
        this.cellExecutionParticipants.add(participant);
        return toDisposable(() => this.cellExecutionParticipants.delete(participant));
    }
    async runExecutionParticipants(executions) {
        for (const participant of this.cellExecutionParticipants) {
            await participant.onWillExecuteCell(executions);
        }
        return;
    }
    dispose() {
        this._activeProxyKernelExecutionToken?.dispose(true);
    }
};
NotebookExecutionService = __decorate([
    __param(0, ICommandService),
    __param(1, INotebookKernelService),
    __param(2, INotebookKernelHistoryService),
    __param(3, IWorkspaceTrustRequestService),
    __param(4, INotebookLoggingService),
    __param(5, INotebookExecutionStateService)
], NotebookExecutionService);
export { NotebookExecutionService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFeGVjdXRpb25TZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvc2VydmljZXMvbm90ZWJvb2tFeGVjdXRpb25TZXJ2aWNlSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkYsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFFckYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDMUcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFFekYsT0FBTyxFQUNOLFFBQVEsRUFFUiwwQkFBMEIsR0FDMUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUt2QyxPQUFPLEVBRU4sOEJBQThCLEdBQzlCLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUNOLDZCQUE2QixFQUM3QixzQkFBc0IsR0FDdEIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUV6RSxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF3QjtJQUlwQyxZQUNrQixlQUFpRCxFQUMxQyxzQkFBK0QsRUFFdkYsNkJBQTZFLEVBRTdFLDZCQUE2RSxFQUNwRCxXQUFxRCxFQUU5RSw4QkFBK0U7UUFSN0Msb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQ3pCLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBd0I7UUFFdEUsa0NBQTZCLEdBQTdCLDZCQUE2QixDQUErQjtRQUU1RCxrQ0FBNkIsR0FB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