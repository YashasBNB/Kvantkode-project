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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0aW9uU3RhdHVzQmFySXRlbUNvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9jZWxsU3RhdHVzQmFyL2V4ZWN1dGlvblN0YXR1c0Jhckl0ZW1Db250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM1RixPQUFPLEVBQ04sVUFBVSxFQUNWLE9BQU8sRUFFUCxpQkFBaUIsR0FDakIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ25ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN0RSxPQUFPLEVBRU4sMkJBQTJCLEdBQzNCLE1BQU0sa0NBQWtDLENBQUE7QUFPekMsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDMUYsT0FBTyxFQUNOLGNBQWMsRUFDZCxrQkFBa0IsRUFDbEIsZ0JBQWdCLEVBQ2hCLGdCQUFnQixHQUNoQixN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