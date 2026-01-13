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
import { RunOnceScheduler } from '../../../../../../base/common/async.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../../base/common/uri.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../../../common/contributions.js';
import { IDebugService } from '../../../../debug/common/debug.js';
import { CellUri } from '../../../common/notebookCommon.js';
import { CellExecutionUpdateType } from '../../../common/notebookExecutionService.js';
import { INotebookExecutionStateService } from '../../../common/notebookExecutionStateService.js';
let NotebookCellPausing = class NotebookCellPausing extends Disposable {
    constructor(_debugService, _notebookExecutionStateService) {
        super();
        this._debugService = _debugService;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this._pausedCells = new Set();
        this._register(_debugService.getModel().onDidChangeCallStack(() => {
            // First update using the stale callstack if the real callstack is empty, to reduce blinking while stepping.
            // After not pausing for 2s, update again with the latest callstack.
            this.onDidChangeCallStack(true);
            this._scheduler.schedule();
        }));
        this._scheduler = this._register(new RunOnceScheduler(() => this.onDidChangeCallStack(false), 2000));
    }
    async onDidChangeCallStack(fallBackOnStaleCallstack) {
        const newPausedCells = new Set();
        for (const session of this._debugService.getModel().getSessions()) {
            for (const thread of session.getAllThreads()) {
                let callStack = thread.getCallStack();
                if (fallBackOnStaleCallstack && !callStack.length) {
                    callStack = thread.getStaleCallStack();
                }
                callStack.forEach((sf) => {
                    const parsed = CellUri.parse(sf.source.uri);
                    if (parsed) {
                        newPausedCells.add(sf.source.uri.toString());
                        this.editIsPaused(sf.source.uri, true);
                    }
                });
            }
        }
        for (const uri of this._pausedCells) {
            if (!newPausedCells.has(uri)) {
                this.editIsPaused(URI.parse(uri), false);
                this._pausedCells.delete(uri);
            }
        }
        newPausedCells.forEach((cell) => this._pausedCells.add(cell));
    }
    editIsPaused(cellUri, isPaused) {
        const parsed = CellUri.parse(cellUri);
        if (parsed) {
            const exeState = this._notebookExecutionStateService.getCellExecution(cellUri);
            if (exeState && (exeState.isPaused !== isPaused || !exeState.didPause)) {
                exeState.update([
                    {
                        editType: CellExecutionUpdateType.ExecutionState,
                        didPause: true,
                        isPaused,
                    },
                ]);
            }
        }
    }
};
NotebookCellPausing = __decorate([
    __param(0, IDebugService),
    __param(1, INotebookExecutionStateService)
], NotebookCellPausing);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(NotebookCellPausing, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsUGF1c2luZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL2RlYnVnL25vdGVib29rQ2VsbFBhdXNpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDekUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDakYsT0FBTyxFQUNOLFVBQVUsSUFBSSxtQkFBbUIsR0FHakMsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBR2pHLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQUszQyxZQUNnQixhQUE2QyxFQUU1RCw4QkFBK0U7UUFFL0UsS0FBSyxFQUFFLENBQUE7UUFKeUIsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFFM0MsbUNBQThCLEdBQTlCLDhCQUE4QixDQUFnQztRQVAvRCxpQkFBWSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUE7UUFXaEQsSUFBSSxDQUFDLFNBQVMsQ0FDYixhQUFhLENBQUMs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