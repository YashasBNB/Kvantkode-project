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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFeGVjdXRpb25TZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9zZXJ2aWNlcy9ub3RlYm9va0V4ZWN1dGlvblNlcnZpY2VJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNuRixPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFBO0FBQzVDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUVyRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUMxRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUV6RixPQUFPLEVBQ04sUUFBUSxFQUVSLDBCQUEwQixHQUMxQixNQUFNLGdDQUFnQyxDQUFBO0FBS3ZDLE9BQU8sRUFFTiw4QkFBOEIsR0FDOUIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLHNCQUFzQixHQUN0QixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXpFLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXdCO0lBSXBDLFlBQ2tCLGVBQWlELEVBQzFDLHNCQUErRCxFQUV2Riw2QkFBNkUsRUFFN0UsNkJBQTZFLEVBQ3BELFdBQXFELEVBRTlFLDhCQUErRTtRQVI3QyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDekIsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF3QjtRQUV0RSxrQ0FBNkIsR0FBN0IsNkJBQTZCLENBQStCO1FBRTVELGtDQUE2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