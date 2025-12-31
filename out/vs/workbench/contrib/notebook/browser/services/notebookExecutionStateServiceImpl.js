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
import { Emitter } from '../../../../../base/common/event.js';
import { combinedDisposable, Disposable, } from '../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { CellUri, NotebookCellExecutionState, NotebookExecutionState, } from '../../common/notebookCommon.js';
import { CellExecutionUpdateType, INotebookExecutionService, } from '../../common/notebookExecutionService.js';
import { INotebookExecutionStateService, NotebookExecutionType, } from '../../common/notebookExecutionStateService.js';
import { INotebookKernelService } from '../../common/notebookKernelService.js';
import { INotebookService } from '../../common/notebookService.js';
let NotebookExecutionStateService = class NotebookExecutionStateService extends Disposable {
    constructor(_instantiationService, _logService, _notebookService, _accessibilitySignalService) {
        super();
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._notebookService = _notebookService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._executions = new ResourceMap();
        this._notebookExecutions = new ResourceMap();
        this._notebookListeners = new ResourceMap();
        this._cellListeners = new ResourceMap();
        this._lastFailedCells = new ResourceMap();
        this._lastCompletedCellHandles = new ResourceMap();
        this._onDidChangeExecution = this._register(new Emitter());
        this.onDidChangeExecution = this._onDidChangeExecution.event;
        this._onDidChangeLastRunFailState = this._register(new Emitter());
        this.onDidChangeLastRunFailState = this._onDidChangeLastRunFailState.event;
    }
    getLastFailedCellForNotebook(notebook) {
        const failedCell = this._lastFailedCells.get(notebook);
        return failedCell?.visible ? failedCell.cellHandle : undefined;
    }
    getLastCompletedCellForNotebook(notebook) {
        return this._lastCompletedCellHandles.get(notebook);
    }
    forceCancelNotebookExecutions(notebookUri) {
        const notebookCellExecutions = this._executions.get(notebookUri);
        if (notebookCellExecutions) {
            for (const exe of notebookCellExecutions.values()) {
                this._onCellExecutionDidComplete(notebookUri, exe.cellHandle, exe);
            }
        }
        if (this._notebookExecutions.has(notebookUri)) {
            this._onExecutionDidComplete(notebookUri);
        }
    }
    getCellExecution(cellUri) {
        const parsed = CellUri.parse(cellUri);
        if (!parsed) {
            throw new Error(`Not a cell URI: ${cellUri}`);
        }
        const exeMap = this._executions.get(parsed.notebook);
        if (exeMap) {
            return exeMap.get(parsed.handle);
        }
        return undefined;
    }
    getExecution(notebook) {
        return this._notebookExecutions.get(notebook)?.[0];
    }
    getCellExecutionsForNotebook(notebook) {
        const exeMap = this._executions.get(notebook);
        return exeMap ? Array.from(exeMap.values()) : [];
    }
    getCellExecutionsByHandleForNotebook(notebook) {
        const exeMap = this._executions.get(notebook);
        return exeMap ? new Map(exeMap.entries()) : undefined;
    }
    _onCellExecutionDidChange(notebookUri, cellHandle, exe) {
        this._onDidChangeExecution.fire(new NotebookCellExecutionEvent(notebookUri, cellHandle, exe));
    }
    _onCellExecutionDidComplete(notebookUri, cellHandle, exe, lastRunSuccess) {
        const notebookExecutions = this._executions.get(notebookUri);
        if (!notebookExecutions) {
            this._logService.debug(`NotebookExecutionStateService#_onCellExecutionDidComplete - unknown notebook ${notebookUri.toString()}`);
            return;
        }
        exe.dispose();
        const cellUri = CellUri.generate(notebookUri, cellHandle);
        this._cellListeners.get(cellUri)?.dispose();
        this._cellListeners.delete(cellUri);
        notebookExecutions.delete(cellHandle);
        if (notebookExecutions.size === 0) {
            this._executions.delete(notebookUri);
            this._notebookListeners.get(notebookUri)?.dispose();
            this._notebookListeners.delete(notebookUri);
        }
        if (lastRunSuccess !== undefined) {
            if (lastRunSuccess) {
                if (this._executions.size === 0) {
                    this._accessibilitySignalService.playSignal(AccessibilitySignal.notebookCellCompleted);
                }
                this._clearLastFailedCell(notebookUri);
            }
            else {
                this._accessibilitySignalService.playSignal(AccessibilitySignal.notebookCellFailed);
                this._setLastFailedCell(notebookUri, cellHandle);
            }
            this._lastCompletedCellHandles.set(notebookUri, cellHandle);
        }
        this._onDidChangeExecution.fire(new NotebookCellExecutionEvent(notebookUri, cellHandle));
    }
    _onExecutionDidChange(notebookUri, exe) {
        this._onDidChangeExecution.fire(new NotebookExecutionEvent(notebookUri, exe));
    }
    _onExecutionDidComplete(notebookUri) {
        const disposables = this._notebookExecutions.get(notebookUri);
        if (!Array.isArray(disposables)) {
            this._logService.debug(`NotebookExecutionStateService#_onCellExecutionDidComplete - unknown notebook ${notebookUri.toString()}`);
            return;
        }
        this._notebookExecutions.delete(notebookUri);
        this._onDidChangeExecution.fire(new NotebookExecutionEvent(notebookUri));
        disposables.forEach((d) => d.dispose());
    }
    createCellExecution(notebookUri, cellHandle) {
        const notebook = this._notebookService.getNotebookTextModel(notebookUri);
        if (!notebook) {
            throw new Error(`Notebook not found: ${notebookUri.toString()}`);
        }
        let notebookExecutionMap = this._executions.get(notebookUri);
        if (!notebookExecutionMap) {
            const listeners = this._instantiationService.createInstance(NotebookExecutionListeners, notebookUri);
            this._notebookListeners.set(notebookUri, listeners);
            notebookExecutionMap = new Map();
            this._executions.set(notebookUri, notebookExecutionMap);
        }
        let exe = notebookExecutionMap.get(cellHandle);
        if (!exe) {
            exe = this._createNotebookCellExecution(notebook, cellHandle);
            notebookExecutionMap.set(cellHandle, exe);
            exe.initialize();
            this._onDidChangeExecution.fire(new NotebookCellExecutionEvent(notebookUri, cellHandle, exe));
        }
        return exe;
    }
    createExecution(notebookUri) {
        const notebook = this._notebookService.getNotebookTextModel(notebookUri);
        if (!notebook) {
            throw new Error(`Notebook not found: ${notebookUri.toString()}`);
        }
        if (!this._notebookListeners.has(notebookUri)) {
            const listeners = this._instantiationService.createInstance(NotebookExecutionListeners, notebookUri);
            this._notebookListeners.set(notebookUri, listeners);
        }
        let info = this._notebookExecutions.get(notebookUri);
        if (!info) {
            info = this._createNotebookExecution(notebook);
            this._notebookExecutions.set(notebookUri, info);
            this._onDidChangeExecution.fire(new NotebookExecutionEvent(notebookUri, info[0]));
        }
        return info[0];
    }
    _createNotebookCellExecution(notebook, cellHandle) {
        const notebookUri = notebook.uri;
        const exe = this._instantiationService.createInstance(CellExecution, cellHandle, notebook);
        const disposable = combinedDisposable(exe.onDidUpdate(() => this._onCellExecutionDidChange(notebookUri, cellHandle, exe)), exe.onDidComplete((lastRunSuccess) => this._onCellExecutionDidComplete(notebookUri, cellHandle, exe, lastRunSuccess)));
        this._cellListeners.set(CellUri.generate(notebookUri, cellHandle), disposable);
        return exe;
    }
    _createNotebookExecution(notebook) {
        const notebookUri = notebook.uri;
        const exe = this._instantiationService.createInstance(NotebookExecution, notebook);
        const disposable = combinedDisposable(exe.onDidUpdate(() => this._onExecutionDidChange(notebookUri, exe)), exe.onDidComplete(() => this._onExecutionDidComplete(notebookUri)));
        return [exe, disposable];
    }
    _setLastFailedCell(notebookURI, cellHandle) {
        const prevLastFailedCellInfo = this._lastFailedCells.get(notebookURI);
        const notebook = this._notebookService.getNotebookTextModel(notebookURI);
        if (!notebook) {
            return;
        }
        const newLastFailedCellInfo = {
            cellHandle: cellHandle,
            disposable: prevLastFailedCellInfo
                ? prevLastFailedCellInfo.disposable
                : this._getFailedCellListener(notebook),
            visible: true,
        };
        this._lastFailedCells.set(notebookURI, newLastFailedCellInfo);
        this._onDidChangeLastRunFailState.fire({ visible: true, notebook: notebookURI });
    }
    _setLastFailedCellVisibility(notebookURI, visible) {
        const lastFailedCellInfo = this._lastFailedCells.get(notebookURI);
        if (lastFailedCellInfo) {
            this._lastFailedCells.set(notebookURI, {
                cellHandle: lastFailedCellInfo.cellHandle,
                disposable: lastFailedCellInfo.disposable,
                visible: visible,
            });
        }
        this._onDidChangeLastRunFailState.fire({ visible: visible, notebook: notebookURI });
    }
    _clearLastFailedCell(notebookURI) {
        const lastFailedCellInfo = this._lastFailedCells.get(notebookURI);
        if (lastFailedCellInfo) {
            lastFailedCellInfo.disposable?.dispose();
            this._lastFailedCells.delete(notebookURI);
        }
        this._onDidChangeLastRunFailState.fire({ visible: false, notebook: notebookURI });
    }
    _getFailedCellListener(notebook) {
        return notebook.onWillAddRemoveCells((e) => {
            const lastFailedCell = this._lastFailedCells.get(notebook.uri)?.cellHandle;
            if (lastFailedCell !== undefined) {
                const lastFailedCellPos = notebook.cells.findIndex((c) => c.handle === lastFailedCell);
                e.rawEvent.changes.forEach(([start, deleteCount, addedCells]) => {
                    if (deleteCount) {
                        if (lastFailedCellPos >= start && lastFailedCellPos < start + deleteCount) {
                            this._setLastFailedCellVisibility(notebook.uri, false);
                        }
                    }
                    if (addedCells.some((cell) => cell.handle === lastFailedCell)) {
                        this._setLastFailedCellVisibility(notebook.uri, true);
                    }
                });
            }
        });
    }
    dispose() {
        super.dispose();
        this._executions.forEach((executionMap) => {
            executionMap.forEach((execution) => execution.dispose());
            executionMap.clear();
        });
        this._executions.clear();
        this._notebookExecutions.forEach((disposables) => {
            disposables.forEach((d) => d.dispose());
        });
        this._notebookExecutions.clear();
        this._cellListeners.forEach((disposable) => disposable.dispose());
        this._notebookListeners.forEach((disposable) => disposable.dispose());
        this._lastFailedCells.forEach((elem) => elem.disposable.dispose());
    }
};
NotebookExecutionStateService = __decorate([
    __param(0, IInstantiationService),
    __param(1, ILogService),
    __param(2, INotebookService),
    __param(3, IAccessibilitySignalService)
], NotebookExecutionStateService);
export { NotebookExecutionStateService };
class NotebookCellExecutionEvent {
    constructor(notebook, cellHandle, changed) {
        this.notebook = notebook;
        this.cellHandle = cellHandle;
        this.changed = changed;
        this.type = NotebookExecutionType.cell;
    }
    affectsCell(cell) {
        const parsedUri = CellUri.parse(cell);
        return (!!parsedUri &&
            isEqual(this.notebook, parsedUri.notebook) &&
            this.cellHandle === parsedUri.handle);
    }
    affectsNotebook(notebook) {
        return isEqual(this.notebook, notebook);
    }
}
class NotebookExecutionEvent {
    constructor(notebook, changed) {
        this.notebook = notebook;
        this.changed = changed;
        this.type = NotebookExecutionType.notebook;
    }
    affectsNotebook(notebook) {
        return isEqual(this.notebook, notebook);
    }
}
let NotebookExecutionListeners = class NotebookExecutionListeners extends Disposable {
    constructor(notebook, _notebookService, _notebookKernelService, _notebookExecutionService, _notebookExecutionStateService, _logService) {
        super();
        this._notebookService = _notebookService;
        this._notebookKernelService = _notebookKernelService;
        this._notebookExecutionService = _notebookExecutionService;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this._logService = _logService;
        this._logService.debug(`NotebookExecution#ctor ${notebook.toString()}`);
        const notebookModel = this._notebookService.getNotebookTextModel(notebook);
        if (!notebookModel) {
            throw new Error('Notebook not found: ' + notebook);
        }
        this._notebookModel = notebookModel;
        this._register(this._notebookModel.onWillAddRemoveCells((e) => this.onWillAddRemoveCells(e)));
        this._register(this._notebookModel.onWillDispose(() => this.onWillDisposeDocument()));
    }
    cancelAll() {
        this._logService.debug(`NotebookExecutionListeners#cancelAll`);
        const exes = this._notebookExecutionStateService.getCellExecutionsForNotebook(this._notebookModel.uri);
        this._notebookExecutionService.cancelNotebookCellHandles(this._notebookModel, exes.map((exe) => exe.cellHandle));
    }
    onWillDisposeDocument() {
        this._logService.debug(`NotebookExecution#onWillDisposeDocument`);
        this.cancelAll();
    }
    onWillAddRemoveCells(e) {
        const notebookExes = this._notebookExecutionStateService.getCellExecutionsByHandleForNotebook(this._notebookModel.uri);
        const executingDeletedHandles = new Set();
        const pendingDeletedHandles = new Set();
        if (notebookExes) {
            e.rawEvent.changes.forEach(([start, deleteCount]) => {
                if (deleteCount) {
                    const deletedHandles = this._notebookModel.cells
                        .slice(start, start + deleteCount)
                        .map((c) => c.handle);
                    deletedHandles.forEach((h) => {
                        const exe = notebookExes.get(h);
                        if (exe?.state === NotebookCellExecutionState.Executing) {
                            executingDeletedHandles.add(h);
                        }
                        else if (exe) {
                            pendingDeletedHandles.add(h);
                        }
                    });
                }
            });
        }
        if (executingDeletedHandles.size || pendingDeletedHandles.size) {
            const kernel = this._notebookKernelService.getSelectedOrSuggestedKernel(this._notebookModel);
            if (kernel) {
                const implementsInterrupt = kernel.implementsInterrupt;
                const handlesToCancel = implementsInterrupt
                    ? [...executingDeletedHandles]
                    : [...executingDeletedHandles, ...pendingDeletedHandles];
                this._logService.debug(`NotebookExecution#onWillAddRemoveCells, ${JSON.stringify([...handlesToCancel])}`);
                if (handlesToCancel.length) {
                    kernel.cancelNotebookCellExecution(this._notebookModel.uri, handlesToCancel);
                }
            }
        }
    }
};
NotebookExecutionListeners = __decorate([
    __param(1, INotebookService),
    __param(2, INotebookKernelService),
    __param(3, INotebookExecutionService),
    __param(4, INotebookExecutionStateService),
    __param(5, ILogService)
], NotebookExecutionListeners);
function updateToEdit(update, cellHandle) {
    if (update.editType === CellExecutionUpdateType.Output) {
        return {
            editType: 2 /* CellEditType.Output */,
            handle: update.cellHandle,
            append: update.append,
            outputs: update.outputs,
        };
    }
    else if (update.editType === CellExecutionUpdateType.OutputItems) {
        return {
            editType: 7 /* CellEditType.OutputItems */,
            items: update.items,
            append: update.append,
            outputId: update.outputId,
        };
    }
    else if (update.editType === CellExecutionUpdateType.ExecutionState) {
        const newInternalMetadata = {};
        if (typeof update.executionOrder !== 'undefined') {
            newInternalMetadata.executionOrder = update.executionOrder;
        }
        if (typeof update.runStartTime !== 'undefined') {
            newInternalMetadata.runStartTime = update.runStartTime;
        }
        return {
            editType: 9 /* CellEditType.PartialInternalMetadata */,
            handle: cellHandle,
            internalMetadata: newInternalMetadata,
        };
    }
    throw new Error('Unknown cell update type');
}
let CellExecution = class CellExecution extends Disposable {
    get state() {
        return this._state;
    }
    get notebook() {
        return this._notebookModel.uri;
    }
    get didPause() {
        return this._didPause;
    }
    get isPaused() {
        return this._isPaused;
    }
    constructor(cellHandle, _notebookModel, _logService) {
        super();
        this.cellHandle = cellHandle;
        this._notebookModel = _notebookModel;
        this._logService = _logService;
        this._onDidUpdate = this._register(new Emitter());
        this.onDidUpdate = this._onDidUpdate.event;
        this._onDidComplete = this._register(new Emitter());
        this.onDidComplete = this._onDidComplete.event;
        this._state = NotebookCellExecutionState.Unconfirmed;
        this._didPause = false;
        this._isPaused = false;
        this._logService.debug(`CellExecution#ctor ${this.getCellLog()}`);
    }
    initialize() {
        const startExecuteEdit = {
            editType: 9 /* CellEditType.PartialInternalMetadata */,
            handle: this.cellHandle,
            internalMetadata: {
                executionId: generateUuid(),
                runStartTime: null,
                runEndTime: null,
                lastRunSuccess: null,
                executionOrder: null,
                renderDuration: null,
            },
        };
        this._applyExecutionEdits([startExecuteEdit]);
    }
    getCellLog() {
        return `${this._notebookModel.uri.toString()}, ${this.cellHandle}`;
    }
    logUpdates(updates) {
        const updateTypes = updates.map((u) => CellExecutionUpdateType[u.editType]).join(', ');
        this._logService.debug(`CellExecution#updateExecution ${this.getCellLog()}, [${updateTypes}]`);
    }
    confirm() {
        this._logService.debug(`CellExecution#confirm ${this.getCellLog()}`);
        this._state = NotebookCellExecutionState.Pending;
        this._onDidUpdate.fire();
    }
    update(updates) {
        this.logUpdates(updates);
        if (updates.some((u) => u.editType === CellExecutionUpdateType.ExecutionState)) {
            this._state = NotebookCellExecutionState.Executing;
        }
        if (!this._didPause &&
            updates.some((u) => u.editType === CellExecutionUpdateType.ExecutionState && u.didPause)) {
            this._didPause = true;
        }
        const lastIsPausedUpdate = [...updates]
            .reverse()
            .find((u) => u.editType === CellExecutionUpdateType.ExecutionState && typeof u.isPaused === 'boolean');
        if (lastIsPausedUpdate) {
            this._isPaused = lastIsPausedUpdate.isPaused;
        }
        const cellModel = this._notebookModel.cells.find((c) => c.handle === this.cellHandle);
        if (!cellModel) {
            this._logService.debug(`CellExecution#update, updating cell not in notebook: ${this._notebookModel.uri.toString()}, ${this.cellHandle}`);
        }
        else {
            const edits = updates.map((update) => updateToEdit(update, this.cellHandle));
            this._applyExecutionEdits(edits);
        }
        if (updates.some((u) => u.editType === CellExecutionUpdateType.ExecutionState)) {
            this._onDidUpdate.fire();
        }
    }
    complete(completionData) {
        const cellModel = this._notebookModel.cells.find((c) => c.handle === this.cellHandle);
        if (!cellModel) {
            this._logService.debug(`CellExecution#complete, completing cell not in notebook: ${this._notebookModel.uri.toString()}, ${this.cellHandle}`);
        }
        else {
            const edit = {
                editType: 9 /* CellEditType.PartialInternalMetadata */,
                handle: this.cellHandle,
                internalMetadata: {
                    lastRunSuccess: completionData.lastRunSuccess,
                    runStartTime: this._didPause ? null : cellModel.internalMetadata.runStartTime,
                    runEndTime: this._didPause ? null : completionData.runEndTime,
                    error: completionData.error,
                },
            };
            this._applyExecutionEdits([edit]);
        }
        this._onDidComplete.fire(completionData.lastRunSuccess);
    }
    _applyExecutionEdits(edits) {
        this._notebookModel.applyEdits(edits, true, undefined, () => undefined, undefined, false);
    }
};
CellExecution = __decorate([
    __param(2, ILogService)
], CellExecution);
let NotebookExecution = class NotebookExecution extends Disposable {
    get state() {
        return this._state;
    }
    get notebook() {
        return this._notebookModel.uri;
    }
    constructor(_notebookModel, _logService) {
        super();
        this._notebookModel = _notebookModel;
        this._logService = _logService;
        this._onDidUpdate = this._register(new Emitter());
        this.onDidUpdate = this._onDidUpdate.event;
        this._onDidComplete = this._register(new Emitter());
        this.onDidComplete = this._onDidComplete.event;
        this._state = NotebookExecutionState.Unconfirmed;
        this._logService.debug(`NotebookExecution#ctor`);
    }
    debug(message) {
        this._logService.debug(`${message} ${this._notebookModel.uri.toString()}`);
    }
    confirm() {
        this.debug(`Execution#confirm`);
        this._state = NotebookExecutionState.Pending;
        this._onDidUpdate.fire();
    }
    begin() {
        this.debug(`Execution#begin`);
        this._state = NotebookExecutionState.Executing;
        this._onDidUpdate.fire();
    }
    complete() {
        this.debug(`Execution#begin`);
        this._state = NotebookExecutionState.Unconfirmed;
        this._onDidComplete.fire();
    }
};
NotebookExecution = __decorate([
    __param(1, ILogService)
], NotebookExecution);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFeGVjdXRpb25TdGF0ZVNlcnZpY2VJbXBsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9zZXJ2aWNlcy9ub3RlYm9va0V4ZWN1dGlvblN0YXRlU2VydmljZUltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsVUFBVSxHQUVWLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDakUsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiwyQkFBMkIsR0FDM0IsTUFBTSxtRkFBbUYsQ0FBQTtBQUMxRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFFdkUsT0FBTyxFQUVOLE9BQU8sRUFFUCwwQkFBMEIsRUFFMUIsc0JBQXNCLEdBRXRCLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUNOLHVCQUF1QixFQUN2Qix5QkFBeUIsR0FDekIsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBU04sOEJBQThCLEVBRTlCLHFCQUFxQixHQUNyQixNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxN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