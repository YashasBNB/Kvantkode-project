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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbERpYWdub3N0aWNFZGl0b3JDb250cmliLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL2NlbGxEaWFnbm9zdGljcy9jZWxsRGlhZ25vc3RpY0VkaXRvckNvbnRyaWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDbEcsT0FBTyxFQUFlLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRWxHLE9BQU8sRUFHTiw4QkFBOEIsRUFDOUIscUJBQXFCLEdBQ3JCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU3RSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZ0IsU0FBUSxVQUFVOzthQUN2QyxPQUFFLEdBQVcsb0NBQW9DLEFBQS9DLENBQStDO0lBTXhELFlBQ2tCLGNBQStCLEVBRWhELDZCQUE4RSxFQUM5RCxhQUE4QyxFQUMzQyxnQkFBb0QsRUFDaEQsb0JBQTREO1FBRW5GLEtBQUssRUFBRSxDQUFBO1FBUFUsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBRS9CLGtDQUE2QixHQUE3Qiw2QkFBNkIsQ0FBZ0M7UUFDN0Msa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQzFCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFDL0IseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQVY1RSxZQUFPLEdBQUcsS0FBSyxDQUFBO1FBQ2YsY0FBUyxHQUFHLEtBQUssQ0FBQTtRQUNqQix3QkFBbUIsR0FBK0IsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQVlsRSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7UUFFcEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlFLElBQUksQ0FBQyxTQUFTLENBQ2Isb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNuRCxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxlQUFlLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDO2dCQUNwRSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7WUFDckIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU8sZ0JBQWdCO1FBQ3ZCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtRQUNoRCxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO0lBQ3RGLENBQUM7SUFFTyxhQUFhO1FBQ3BCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQ3hELGVBQWUsQ0FBQyxzQkFBc0IsQ0FDdEMsQ0FBQTtRQUNELElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsY0FBYyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ25FLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFBO1lBQ3BCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNoQixDQUFDO2FBQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksY0FBYyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUM7WUFDdkUsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUE7WUFDbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDckIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUE7Z0JBQ3JCLElBQUksQ0FBQyxTQUFTLENBQ2IsS0FBSyxDQUFDLFVBQVUsQ0FDZixJQUFJLENBQUMsNkJBQTZCLENBQUMsb0JBQW9CLEVBQ3ZELEdBQUcsQ0FDSCxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDNUMsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLDBCQUEwQixDQUNqQyxPQUEwRTtRQUUxRSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQTtRQUNqQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ25DLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQTtZQUN0RCxJQUNDLENBQUMsQ0FBQyxJQUFJLEtBQUsscUJBQXFCLENBQUMsSUFBSTtnQkFDckMsV0FBVztnQkFDWCxDQUFDLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQztnQkFDOUIsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFDekIsQ0FBQztnQkFDRixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDekIsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNqQixrQkFBa0I7b0JBQ2xCLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUN6QixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQ2xDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxRQUFRO1FBQ2YsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUN0RCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ25CLENBQUM7SUFDRixDQUFDO0lBRU0sS0FBSyxDQUFDLFVBQWtCO1FBQzlCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDNUQsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixLQUFLLE1BQU0sVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUN0QyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDckIsQ0FBQztZQUNELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDNUMsQ0FBQztJQUNGLENBQUM7SUFFTyxjQUFjLENBQUMsVUFBa0I7UUFDeEMsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDOUMsc0RBQXNEO1lBQ3RELE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDNUQsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM5QyxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUE7UUFDNUMsSUFDQyxJQUFJLFlBQVksaUJBQWlCO1lBQ2pDLENBQUMsUUFBUSxDQUFDLGNBQWM7WUFDeEIsUUFBUSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQ3hCLENBQUM7WUFDRixNQUFNLFdBQVcsR0FBa0IsRUFBRSxDQUFBO1lBQ3JDLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSTtnQkFDckMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUU7Z0JBQ3JELENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQTtZQUN6QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDekUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsaUJBQWUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDcEUsV0FBVyxDQUFDLElBQUksQ0FDZixZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsaUJBQWUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUNsRixDQUFBO1lBQ0QsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzVELFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM3RixXQUFXLENBQUMsSUFBSSxDQUNmLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFO2dCQUNsQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDckMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDdkIsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFDRCxXQUFXLENBQUMsSUFBSSxDQUNmLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFO2dCQUNsQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ3ZCLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFDRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUN0RCxDQUFDO0lBQ0YsQ0FBQztJQUVPLGdCQUFnQixDQUFDLE9BQWUsRUFBRSxRQUFnQjtRQUN6RCxPQUFPO1lBQ04sUUFBUSxFQUFFLENBQUM7WUFDWCxPQUFPLEVBQUUsT0FBTztZQUNoQixlQUFlLEVBQUUsUUFBUSxDQUFDLGVBQWUsR0FBRyxDQUFDO1lBQzdDLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxHQUFHLENBQUM7WUFDckMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxhQUFhLEdBQUcsQ0FBQztZQUN6QyxTQUFTLEVBQUUsUUFBUSxDQUFDLFNBQVMsR0FBRyxDQUFDO1lBQ2pDLE1BQU0sRUFBRSxzQkFBc0I7U0FDOUIsQ0FBQTtJQUNGLENBQUM7SUFFUSxPQUFPO1FBQ2YsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2YsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQ2hCLENBQUM7O0FBN0pXLGVBQWU7SUFTekIsV0FBQSw4QkFBOEIsQ0FBQTtJQUU5QixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxxQkFBcUIsQ0FBQTtHQWJYLGVBQWUsQ0E4SjNCOztBQUVELDRCQUE0QixDQUFDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsZUFBZSxDQUFDLENBQUEifQ==