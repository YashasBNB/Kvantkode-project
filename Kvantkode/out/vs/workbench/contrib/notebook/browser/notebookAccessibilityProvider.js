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
import { Event, Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { observableFromEvent } from '../../../../base/common/observable.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { CellKind, NotebookCellExecutionState } from '../common/notebookCommon.js';
import { INotebookExecutionStateService, NotebookExecutionType, } from '../common/notebookExecutionStateService.js';
import { getAllOutputsText } from './viewModel/cellOutputTextHelper.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
let NotebookAccessibilityProvider = class NotebookAccessibilityProvider extends Disposable {
    constructor(viewModel, isReplHistory, notebookExecutionStateService, keybindingService, configurationService, accessibilityService) {
        super();
        this.viewModel = viewModel;
        this.isReplHistory = isReplHistory;
        this.notebookExecutionStateService = notebookExecutionStateService;
        this.keybindingService = keybindingService;
        this.configurationService = configurationService;
        this.accessibilityService = accessibilityService;
        this._onDidAriaLabelChange = new Emitter();
        this.onDidAriaLabelChange = this._onDidAriaLabelChange.event;
        this._register(Event.debounce(this.notebookExecutionStateService.onDidChangeExecution, (last, e) => this.mergeEvents(last, e), 100)((updates) => {
            if (!updates.length) {
                return;
            }
            const viewModel = this.viewModel();
            if (viewModel) {
                for (const update of updates) {
                    const cellModel = viewModel.getCellByHandle(update.cellHandle);
                    if (cellModel) {
                        this._onDidAriaLabelChange.fire(cellModel);
                    }
                }
                const lastUpdate = updates[updates.length - 1];
                if (this.shouldReadCellOutputs(lastUpdate.state)) {
                    const cell = viewModel.getCellByHandle(lastUpdate.cellHandle);
                    if (cell && cell.outputsViewModels.length) {
                        const text = getAllOutputsText(viewModel.notebookDocument, cell, true);
                        alert(text);
                    }
                }
            }
        }, this));
    }
    shouldReadCellOutputs(state) {
        return (state === undefined && // execution completed
            this.isReplHistory &&
            this.accessibilityService.isScreenReaderOptimized() &&
            this.configurationService.getValue('accessibility.replEditor.readLastExecutionOutput'));
    }
    get verbositySettingId() {
        return this.isReplHistory
            ? "accessibility.verbosity.replEditor" /* AccessibilityVerbositySettingId.ReplEditor */
            : "accessibility.verbosity.notebook" /* AccessibilityVerbositySettingId.Notebook */;
    }
    getAriaLabel(element) {
        const event = Event.filter(this.onDidAriaLabelChange, (e) => e === element);
        return observableFromEvent(this, event, () => {
            const viewModel = this.viewModel();
            if (!viewModel) {
                return '';
            }
            const index = viewModel.getCellIndex(element);
            if (index >= 0) {
                return this.getLabel(element);
            }
            return '';
        });
    }
    createItemLabel(executionLabel, cellKind) {
        return this.isReplHistory
            ? `cell${executionLabel}`
            : `${cellKind === CellKind.Markup ? 'markdown' : 'code'} cell${executionLabel}`;
    }
    getLabel(element) {
        const executionState = this.notebookExecutionStateService.getCellExecution(element.uri)?.state;
        const executionLabel = executionState === NotebookCellExecutionState.Executing
            ? ', executing'
            : executionState === NotebookCellExecutionState.Pending
                ? ', pending'
                : '';
        return this.createItemLabel(executionLabel, element.cellKind);
    }
    get widgetAriaLabelName() {
        return this.isReplHistory
            ? nls.localize('replHistoryTreeAriaLabel', 'REPL Editor History')
            : nls.localize('notebookTreeAriaLabel', 'Notebook');
    }
    getWidgetAriaLabel() {
        const keybinding = this.keybindingService
            .lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)
            ?.getLabel();
        if (this.configurationService.getValue(this.verbositySettingId)) {
            return keybinding
                ? nls.localize('notebookTreeAriaLabelHelp', '{0}\nUse {1} for accessibility help', this.widgetAriaLabelName, keybinding)
                : nls.localize('notebookTreeAriaLabelHelpNoKb', '{0}\nRun the Open Accessibility Help command for more information', this.widgetAriaLabelName);
        }
        return this.widgetAriaLabelName;
    }
    mergeEvents(last, e) {
        const viewModel = this.viewModel();
        const result = last || [];
        if (viewModel && e.type === NotebookExecutionType.cell && e.affectsNotebook(viewModel.uri)) {
            const index = result.findIndex((update) => update.cellHandle === e.cellHandle);
            if (index >= 0) {
                result.splice(index, 1);
            }
            result.push({ cellHandle: e.cellHandle, state: e.changed?.state });
        }
        return result;
    }
};
NotebookAccessibilityProvider = __decorate([
    __param(2, INotebookExecutionStateService),
    __param(3, IKeybindingService),
    __param(4, IConfigurationService),
    __param(5, IAccessibilityService)
], NotebookAccessibilityProvider);
export { NotebookAccessibilityProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tBY2Nlc3NpYmlsaXR5UHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvbm90ZWJvb2tBY2Nlc3NpYmlsaXR5UHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDM0UsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUl6RixPQUFPLEVBQUUsUUFBUSxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDbEYsT0FBTyxFQUdOLDhCQUE4QixFQUM5QixxQkFBcUIsR0FDckIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFJekQsSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFDWixTQUFRLFVBQVU7SUFNbEIsWUFDa0IsU0FBOEMsRUFDOUMsYUFBc0IsRUFFdkMsNkJBQThFLEVBQzFELGlCQUFzRCxFQUNuRCxvQkFBNEQs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