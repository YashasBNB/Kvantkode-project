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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFeGVjdXRpb25TdGF0ZVNlcnZpY2VJbXBsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3NlcnZpY2VzL25vdGVib29rRXhlY3V0aW9uU3RhdGVTZXJ2aWNlSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixVQUFVLEdBRVYsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLDJCQUEyQixHQUMzQixNQUFNLG1GQUFtRixDQUFBO0FBQzFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUV2RSxPQUFPLEVBRU4sT0FBTyxFQUVQLDBCQUEwQixFQUUxQixzQkFBc0IsR0FFdEIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLHlCQUF5QixHQUN6QixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFTTiw4QkFBOEIsRUFFOUIscUJBQXFCLEdBQ3JCLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGdCQUFnQixF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