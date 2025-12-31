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
var ExecutionStateCellStatusBarItem_1, TimerCellStatusBarItem_1;
import { disposableTimeout, RunOnceScheduler } from '../../../../../../base/common/async.js';
import { Disposable, dispose, MutableDisposable, } from '../../../../../../base/common/lifecycle.js';
import { language } from '../../../../../../base/common/platform.js';
import { localize } from '../../../../../../nls.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { themeColorFromId } from '../../../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { NotebookVisibleCellObserver, } from './notebookVisibleCellObserver.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
import { cellStatusIconError, cellStatusIconSuccess } from '../../notebookEditorWidget.js';
import { errorStateIcon, executingStateIcon, pendingStateIcon, successStateIcon, } from '../../notebookIcons.js';
import { NotebookCellExecutionState, NotebookSetting, } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService, NotebookExecutionType, } from '../../../common/notebookExecutionStateService.js';
import { INotebookService } from '../../../common/notebookService.js';
export function formatCellDuration(duration, showMilliseconds = true) {
    if (showMilliseconds && duration < 1000) {
        return `${duration}ms`;
    }
    const minutes = Math.floor(duration / 1000 / 60);
    const seconds = Math.floor(duration / 1000) % 60;
    const tenths = Math.floor((duration % 1000) / 100);
    if (minutes > 0) {
        return `${minutes}m ${seconds}.${tenths}s`;
    }
    else {
        return `${seconds}.${tenths}s`;
    }
}
export class NotebookStatusBarController extends Disposable {
    constructor(_notebookEditor, _itemFactory) {
        super();
        this._notebookEditor = _notebookEditor;
        this._itemFactory = _itemFactory;
        this._visibleCells = new Map();
        this._observer = this._register(new NotebookVisibleCellObserver(this._notebookEditor));
        this._register(this._observer.onDidChangeVisibleCells(this._updateVisibleCells, this));
        this._updateEverything();
    }
    _updateEverything() {
        this._visibleCells.forEach(dispose);
        this._visibleCells.clear();
        this._updateVisibleCells({ added: this._observer.visibleCells, removed: [] });
    }
    _updateVisibleCells(e) {
        const vm = this._notebookEditor.getViewModel();
        if (!vm) {
            return;
        }
        for (const oldCell of e.removed) {
            this._visibleCells.get(oldCell.handle)?.dispose();
            this._visibleCells.delete(oldCell.handle);
        }
        for (const newCell of e.added) {
            this._visibleCells.set(newCell.handle, this._itemFactory(vm, newCell));
        }
    }
    dispose() {
        super.dispose();
        this._visibleCells.forEach(dispose);
        this._visibleCells.clear();
    }
}
let ExecutionStateCellStatusBarContrib = class ExecutionStateCellStatusBarContrib extends Disposable {
    static { this.id = 'workbench.notebook.statusBar.execState'; }
    constructor(notebookEditor, instantiationService) {
        super();
        this._register(new NotebookStatusBarController(notebookEditor, (vm, cell) => instantiationService.createInstance(ExecutionStateCellStatusBarItem, vm, cell)));
    }
};
ExecutionStateCellStatusBarContrib = __decorate([
    __param(1, IInstantiationService)
], ExecutionStateCellStatusBarContrib);
export { ExecutionStateCellStatusBarContrib };
registerNotebookContribution(ExecutionStateCellStatusBarContrib.id, ExecutionStateCellStatusBarContrib);
/**
 * Shows the cell's execution state in the cell status bar. When the "executing" state is shown, it will be shown for a minimum brief time.
 */
let ExecutionStateCellStatusBarItem = class ExecutionStateCellStatusBarItem extends Disposable {
    static { ExecutionStateCellStatusBarItem_1 = this; }
    static { this.MIN_SPINNER_TIME = 500; }
    constructor(_notebookViewModel, _cell, _executionStateService) {
        super();
        this._notebookViewModel = _notebookViewModel;
        this._cell = _cell;
        this._executionStateService = _executionStateService;
        this._currentItemIds = [];
        this._clearExecutingStateTimer = this._register(new MutableDisposable());
        this._update();
        this._register(this._executionStateService.onDidChangeExecution((e) => {
            if (e.type === NotebookExecutionType.cell && e.affectsCell(this._cell.uri)) {
                this._update();
            }
        }));
        this._register(this._cell.model.onDidChangeInternalMetadata(() => this._update()));
    }
    async _update() {
        const items = this._getItemsForCell();
        if (Array.isArray(items)) {
            this._currentItemIds = this._notebookViewModel.deltaCellStatusBarItems(this._currentItemIds, [
                { handle: this._cell.handle, items },
            ]);
        }
    }
    /**
     *	Returns undefined if there should be no change, and an empty array if all items should be removed.
     */
    _getItemsForCell() {
        const runState = this._executionStateService.getCellExecution(this._cell.uri);
        // Show the execution spinner for a minimum time
        if (runState?.state === NotebookCellExecutionState.Executing &&
            typeof this._showedExecutingStateTime !== 'number') {
            this._showedExecutingStateTime = Date.now();
        }
        else if (runState?.state !== NotebookCellExecutionState.Executing &&
            typeof this._showedExecutingStateTime === 'number') {
            const timeUntilMin = ExecutionStateCellStatusBarItem_1.MIN_SPINNER_TIME -
                (Date.now() - this._showedExecutingStateTime);
            if (timeUntilMin > 0) {
                if (!this._clearExecutingStateTimer.value) {
                    this._clearExecutingStateTimer.value = disposableTimeout(() => {
                        this._showedExecutingStateTime = undefined;
                        this._clearExecutingStateTimer.clear();
                        this._update();
                    }, timeUntilMin);
                }
                return undefined;
            }
            else {
                this._showedExecutingStateTime = undefined;
            }
        }
        const items = this._getItemForState(runState, this._cell.internalMetadata);
        return items;
    }
    _getItemForState(runState, internalMetadata) {
        const state = runState?.state;
        const { lastRunSuccess } = internalMetadata;
        if (!state && lastRunSuccess) {
            return [
                {
                    text: `$(${successStateIcon.id})`,
                    color: themeColorFromId(cellStatusIconSuccess),
                    tooltip: localize('notebook.cell.status.success', 'Success'),
                    alignment: 1 /* CellStatusbarAlignment.Left */,
                    priority: Number.MAX_SAFE_INTEGER,
                },
            ];
        }
        else if (!state && lastRunSuccess === false) {
            return [
                {
                    text: `$(${errorStateIcon.id})`,
                    color: themeColorFromId(cellStatusIconError),
                    tooltip: localize('notebook.cell.status.failed', 'Failed'),
                    alignment: 1 /* CellStatusbarAlignment.Left */,
                    priority: Number.MAX_SAFE_INTEGER,
                },
            ];
        }
        else if (state === NotebookCellExecutionState.Pending ||
            state === NotebookCellExecutionState.Unconfirmed) {
            return [
                {
                    text: `$(${pendingStateIcon.id})`,
                    tooltip: localize('notebook.cell.status.pending', 'Pending'),
                    alignment: 1 /* CellStatusbarAlignment.Left */,
                    priority: Number.MAX_SAFE_INTEGER,
                },
            ];
        }
        else if (state === NotebookCellExecutionState.Executing) {
            const icon = runState?.didPause
                ? executingStateIcon
                : ThemeIcon.modify(executingStateIcon, 'spin');
            return [
                {
                    text: `$(${icon.id})`,
                    tooltip: localize('notebook.cell.status.executing', 'Executing'),
                    alignment: 1 /* CellStatusbarAlignment.Left */,
                    priority: Number.MAX_SAFE_INTEGER,
                },
            ];
        }
        return [];
    }
    dispose() {
        super.dispose();
        this._notebookViewModel.deltaCellStatusBarItems(this._currentItemIds, [
            { handle: this._cell.handle, items: [] },
        ]);
    }
};
ExecutionStateCellStatusBarItem = ExecutionStateCellStatusBarItem_1 = __decorate([
    __param(2, INotebookExecutionStateService)
], ExecutionStateCellStatusBarItem);
let TimerCellStatusBarContrib = class TimerCellStatusBarContrib extends Disposable {
    static { this.id = 'workbench.notebook.statusBar.execTimer'; }
    constructor(notebookEditor, instantiationService) {
        super();
        this._register(new NotebookStatusBarController(notebookEditor, (vm, cell) => instantiationService.createInstance(TimerCellStatusBarItem, vm, cell)));
    }
};
TimerCellStatusBarContrib = __decorate([
    __param(1, IInstantiationService)
], TimerCellStatusBarContrib);
export { TimerCellStatusBarContrib };
registerNotebookContribution(TimerCellStatusBarContrib.id, TimerCellStatusBarContrib);
const UPDATE_TIMER_GRACE_PERIOD = 200;
let TimerCellStatusBarItem = class TimerCellStatusBarItem extends Disposable {
    static { TimerCellStatusBarItem_1 = this; }
    static { this.UPDATE_INTERVAL = 100; }
    constructor(_notebookViewModel, _cell, _executionStateService, _notebookService, _configurationService) {
        super();
        this._notebookViewModel = _notebookViewModel;
        this._cell = _cell;
        this._executionStateService = _executionStateService;
        this._notebookService = _notebookService;
        this._configurationService = _configurationService;
        this._currentItemIds = [];
        this._isVerbose =
            this._configurationService.getValue(NotebookSetting.cellExecutionTimeVerbosity) === 'verbose';
        this._scheduler = this._register(new RunOnceScheduler(() => this._update(), TimerCellStatusBarItem_1.UPDATE_INTERVAL));
        this._update();
        this._register(this._cell.model.onDidChangeInternalMetadata(() => this._update()));
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(NotebookSetting.cellExecutionTimeVerbosity)) {
                this._isVerbose =
                    this._configurationService.getValue(NotebookSetting.cellExecutionTimeVerbosity) ===
                        'verbose';
                this._update();
            }
        }));
    }
    async _update() {
        let timerItem;
        const runState = this._executionStateService.getCellExecution(this._cell.uri);
        const state = runState?.state;
        const startTime = this._cell.internalMetadata.runStartTime;
        const adjustment = this._cell.internalMetadata.runStartTimeAdjustment ?? 0;
        const endTime = this._cell.internalMetadata.runEndTime;
        if (runState?.didPause) {
            timerItem = undefined;
        }
        else if (state === NotebookCellExecutionState.Executing) {
            if (typeof startTime === 'number') {
                timerItem = this._getTimeItem(startTime, Date.now(), adjustment);
                this._scheduler.schedule();
            }
        }
        else if (!state) {
            if (typeof startTime === 'number' && typeof endTime === 'number') {
                const timerDuration = Date.now() - startTime + adjustment;
                const executionDuration = endTime - startTime;
                const renderDuration = this._cell.internalMetadata.renderDuration ?? {};
                timerItem = this._getTimeItem(startTime, endTime, undefined, {
                    timerDuration,
                    executionDuration,
                    renderDuration,
                });
            }
        }
        const items = timerItem ? [timerItem] : [];
        if (!items.length && !!runState) {
            if (!this._deferredUpdate) {
                this._deferredUpdate = disposableTimeout(() => {
                    this._deferredUpdate = undefined;
                    this._currentItemIds = this._notebookViewModel.deltaCellStatusBarItems(this._currentItemIds, [{ handle: this._cell.handle, items }]);
                }, UPDATE_TIMER_GRACE_PERIOD, this._store);
            }
        }
        else {
            this._deferredUpdate?.dispose();
            this._deferredUpdate = undefined;
            this._currentItemIds = this._notebookViewModel.deltaCellStatusBarItems(this._currentItemIds, [
                { handle: this._cell.handle, items },
            ]);
        }
    }
    _getTimeItem(startTime, endTime, adjustment = 0, runtimeInformation) {
        const duration = endTime - startTime + adjustment;
        let tooltip;
        const lastExecution = new Date(endTime).toLocaleTimeString(language);
        if (runtimeInformation) {
            const { renderDuration, executionDuration, timerDuration } = runtimeInformation;
            let renderTimes = '';
            for (const key in renderDuration) {
                const rendererInfo = this._notebookService.getRendererInfo(key);
                const args = encodeURIComponent(JSON.stringify({
                    extensionId: rendererInfo?.extensionId.value ?? '',
                    issueBody: `Auto-generated text from notebook cell performance. The duration for the renderer, ${rendererInfo?.displayName ?? key}, is slower than expected.\n` +
                        `Execution Time: ${formatCellDuration(executionDuration)}\n` +
                        `Renderer Duration: ${formatCellDuration(renderDuration[key])}\n`,
                }));
                renderTimes += `- [${rendererInfo?.displayName ?? key}](command:workbench.action.openIssueReporter?${args}) ${formatCellDuration(renderDuration[key])}\n`;
            }
            renderTimes += `\n*${localize('notebook.cell.statusBar.timerTooltip.reportIssueFootnote', 'Use the links above to file an issue using the issue reporter.')}*\n`;
            tooltip = {
                value: localize('notebook.cell.statusBar.timerTooltip', '**Last Execution** {0}\n\n**Execution Time** {1}\n\n**Overhead Time** {2}\n\n**Render Times**\n\n{3}', lastExecution, formatCellDuration(executionDuration), formatCellDuration(timerDuration - executionDuration), renderTimes),
                isTrusted: true,
            };
        }
        const executionText = this._isVerbose
            ? localize('notebook.cell.statusBar.timerVerbose', 'Last Execution: {0}, Duration: {1}', lastExecution, formatCellDuration(duration, false))
            : formatCellDuration(duration, false);
        return {
            text: executionText,
            alignment: 1 /* CellStatusbarAlignment.Left */,
            priority: Number.MAX_SAFE_INTEGER - 5,
            tooltip,
        };
    }
    dispose() {
        super.dispose();
        this._deferredUpdate?.dispose();
        this._notebookViewModel.deltaCellStatusBarItems(this._currentItemIds, [
            { handle: this._cell.handle, items: [] },
        ]);
    }
};
TimerCellStatusBarItem = TimerCellStatusBarItem_1 = __decorate([
    __param(2, INotebookExecutionStateService),
    __param(3, INotebookService),
    __param(4, IConfigurationService)
], TimerCellStatusBarItem);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0aW9uU3RhdHVzQmFySXRlbUNvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvY2VsbFN0YXR1c0Jhci9leGVjdXRpb25TdGF0dXNCYXJJdGVtQ29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDNUYsT0FBTyxFQUNOLFVBQVUsRUFDVixPQUFPLEVBRVAsaUJBQWlCLEdBQ2pCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdEUsT0FBTyxFQUVOLDJCQUEyQixHQUMzQixNQUFNLGtDQUFrQyxDQUFBO0FBT3pDLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzFGLE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEVBQ2xCLGdCQUFnQixFQUNoQixnQkFBZ0IsR0FDaEIsTUFBTSx3QkFBd0IsQ0FBQTtBQUMvQixP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