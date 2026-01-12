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
var CellDiagnostics_1;
import { Disposable, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { IMarkerService } from '../../../../../../platform/markers/common/markers.js';
import { INotebookExecutionStateService, NotebookExecutionType, } from '../../../common/notebookExecutionStateService.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { CellKind, NotebookSetting } from '../../../common/notebookCommon.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
import { CodeCellViewModel } from '../../viewModel/codeCellViewModel.js';
import { Event } from '../../../../../../base/common/event.js';
import { IChatAgentService } from '../../../../chat/common/chatAgents.js';
import { ChatAgentLocation } from '../../../../chat/common/constants.js';
let CellDiagnostics = class CellDiagnostics extends Disposable {
    static { CellDiagnostics_1 = this; }
    static { this.ID = 'workbench.notebook.cellDiagnostics'; }
    constructor(notebookEditor, notebookExecutionStateService, markerService, chatAgentService, configurationService) {
        super();
        this.notebookEditor = notebookEditor;
        this.notebookExecutionStateService = notebookExecutionStateService;
        this.markerService = markerService;
        this.chatAgentService = chatAgentService;
        this.configurationService = configurationService;
        this.enabled = false;
        this.listening = false;
        this.diagnosticsByHandle = new Map();
        this.updateEnabled();
        this._register(chatAgentService.onDidChangeAgents(() => this.updateEnabled()));
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(NotebookSetting.cellFailureDiagnostics)) {
                this.updateEnabled();
            }
        }));
    }
    hasNotebookAgent() {
        const agents = this.chatAgentService.getAgents();
        return !!agents.find((agent) => agent.locations.includes(ChatAgentLocation.Notebook));
    }
    updateEnabled() {
        const settingEnabled = this.configurationService.getValue(NotebookSetting.cellFailureDiagnostics);
        if (this.enabled && (!settingEnabled || !this.hasNotebookAgent())) {
            this.enabled = false;
            this.clearAll();
        }
        else if (!this.enabled && settingEnabled && this.hasNotebookAgent()) {
            this.enabled = true;
            if (!this.listening) {
                this.listening = true;
                this._register(Event.accumulate(this.notebookExecutionStateService.onDidChangeExecution, 200)((e) => this.handleChangeExecutionState(e)));
            }
        }
    }
    handleChangeExecutionState(changes) {
        if (!this.enabled) {
            return;
        }
        const handled = new Set();
        for (const e of changes.reverse()) {
            const notebookUri = this.notebookEditor.textModel?.uri;
            if (e.type === NotebookExecutionType.cell &&
                notebookUri &&
                e.affectsNotebook(notebookUri) &&
                !handled.has(e.cellHandle)) {
                handled.add(e.cellHandle);
                if (!!e.changed) {
                    // cell is running
                    this.clear(e.cellHandle);
                }
                else {
                    this.setDiagnostics(e.cellHandle);
                }
            }
        }
    }
    clearAll() {
        for (const handle of this.diagnosticsByHandle.keys()) {
            this.clear(handle);
        }
    }
    clear(cellHandle) {
        const disposables = this.diagnosticsByHandle.get(cellHandle);
        if (disposables) {
            for (const disposable of disposables) {
                disposable.dispose();
            }
            this.diagnosticsByHandle.delete(cellHandle);
        }
    }
    setDiagnostics(cellHandle) {
        if (this.diagnosticsByHandle.has(cellHandle)) {
            // multiple diagnostics per cell not supported for now
            return;
        }
        const cell = this.notebookEditor.getCellByHandle(cellHandle);
        if (!cell || cell.cellKind !== CellKind.Code) {
            return;
        }
        const metadata = cell.model.internalMetadata;
        if (cell instanceof CodeCellViewModel &&
            !metadata.lastRunSuccess &&
            metadata?.error?.location) {
            const disposables = [];
            const errorLabel = metadata.error.name
                ? `${metadata.error.name}: ${metadata.error.message}`
                : metadata.error.message;
            const marker = this.createMarkerData(errorLabel, metadata.error.location);
            this.markerService.changeOne(CellDiagnostics_1.ID, cell.uri, [marker]);
            disposables.push(toDisposable(() => this.markerService.changeOne(CellDiagnostics_1.ID, cell.uri, [])));
            cell.executionErrorDiagnostic.set(metadata.error, undefined);
            disposables.push(toDisposable(() => cell.executionErrorDiagnostic.set(undefined, undefined)));
            disposables.push(cell.model.onDidChangeOutputs(() => {
                if (cell.model.outputs.length === 0) {
                    this.clear(cellHandle);
                }
            }));
            disposables.push(cell.model.onDidChangeContent(() => {
                this.clear(cellHandle);
            }));
            this.diagnosticsByHandle.set(cellHandle, disposables);
        }
    }
    createMarkerData(message, location) {
        return {
            severity: 8,
            message: message,
            startLineNumber: location.startLineNumber + 1,
            startColumn: location.startColumn + 1,
            endLineNumber: location.endLineNumber + 1,
            endColumn: location.endColumn + 1,
            source: 'Cell Execution Error',
        };
    }
    dispose() {
        super.dispose();
        this.clearAll();
    }
};
CellDiagnostics = CellDiagnostics_1 = __decorate([
    __param(1, INotebookExecutionStateService),
    __param(2, IMarkerService),
    __param(3, IChatAgentService),
    __param(4, IConfigurationService)
], CellDiagnostics);
export { CellDiagnostics };
registerNotebookContribution(CellDiagnostics.ID, CellDiagnostics);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbERpYWdub3N0aWNFZGl0b3JDb250cmliLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvY2VsbERpYWdub3N0aWNzL2NlbGxEaWFnbm9zdGljRWRpdG9yQ29udHJpYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNsRyxPQUFPLEVBQWUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFbEcsT0FBTyxFQUdOLDhCQUE4QixFQUM5QixxQkFBcUIsR0FDckIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTdFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFnQixTQUFRLFVBQVU7O2FBQ3ZDLE9BQUUsR0FBVyxvQ0FBb0MsQUFBL0MsQ0FBK0M7SUFNeEQsWUFDa0IsY0FBK0IsRUFFaEQsNkJBQThFLEVBQzlELGFBQThDLEVBQzNDLGdCQUFvRCxFQUNoRCxvQkFBNEQ7UUFF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