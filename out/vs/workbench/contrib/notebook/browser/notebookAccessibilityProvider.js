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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tBY2Nlc3NpYmlsaXR5UHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL25vdGVib29rQWNjZXNzaWJpbGl0eVByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzNFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFJekYsT0FBTyxFQUFFLFFBQVEsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2xGLE9BQU8sRUFHTiw4QkFBOEIsRUFDOUIscUJBQXFCLEdBQ3JCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBSXpELElBQU0sNkJBQTZCLEdBQW5DLE1BQU0sNkJBQ1osU0FBUSxVQUFVO0lBTWxCLFlBQ2tCLFNBQThDLEVBQzlDLGFBQXNCLEVBRXZDLDZCQUE4RSxFQUMxRCxpQkFBc0QsRUFDbkQsb0JBQTRELEVBQzVELG9CQUE0RDtRQUVuRixLQUFL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