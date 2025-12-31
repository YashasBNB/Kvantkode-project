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
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../../base/common/observable.js';
import { localize } from '../../../../../../nls.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { OPEN_CELL_FAILURE_ACTIONS_COMMAND_ID } from './cellDiagnosticsActions.js';
import { NotebookStatusBarController } from '../cellStatusBar/executionStatusBarItemController.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
import { CodeCellViewModel } from '../../viewModel/codeCellViewModel.js';
import { IChatAgentService } from '../../../../chat/common/chatAgents.js';
import { ChatAgentLocation } from '../../../../chat/common/constants.js';
let DiagnosticCellStatusBarContrib = class DiagnosticCellStatusBarContrib extends Disposable {
    static { this.id = 'workbench.notebook.statusBar.diagtnostic'; }
    constructor(notebookEditor, instantiationService) {
        super();
        this._register(new NotebookStatusBarController(notebookEditor, (vm, cell) => cell instanceof CodeCellViewModel
            ? instantiationService.createInstance(DiagnosticCellStatusBarItem, vm, cell)
            : Disposable.None));
    }
};
DiagnosticCellStatusBarContrib = __decorate([
    __param(1, IInstantiationService)
], DiagnosticCellStatusBarContrib);
export { DiagnosticCellStatusBarContrib };
registerNotebookContribution(DiagnosticCellStatusBarContrib.id, DiagnosticCellStatusBarContrib);
let DiagnosticCellStatusBarItem = class DiagnosticCellStatusBarItem extends Disposable {
    constructor(_notebookViewModel, cell, keybindingService, chatAgentService) {
        super();
        this._notebookViewModel = _notebookViewModel;
        this.cell = cell;
        this.keybindingService = keybindingService;
        this.chatAgentService = chatAgentService;
        this._currentItemIds = [];
        this._register(autorun((reader) => this.updateSparkleItem(reader.readObservable(cell.executionErrorDiagnostic))));
    }
    hasNotebookAgent() {
        const agents = this.chatAgentService.getAgents();
        return !!agents.find((agent) => agent.locations.includes(ChatAgentLocation.Notebook));
    }
    async updateSparkleItem(error) {
        let item;
        if (error?.location && this.hasNotebookAgent()) {
            const keybinding = this.keybindingService
                .lookupKeybinding(OPEN_CELL_FAILURE_ACTIONS_COMMAND_ID)
                ?.getLabel();
            const tooltip = localize('notebook.cell.status.diagnostic', 'Quick Actions {0}', `(${keybinding})`);
            item = {
                text: `$(sparkle)`,
                tooltip,
                alignment: 1 /* CellStatusbarAlignment.Left */,
                command: OPEN_CELL_FAILURE_ACTIONS_COMMAND_ID,
                priority: Number.MAX_SAFE_INTEGER - 1,
            };
        }
        const items = item ? [item] : [];
        this._currentItemIds = this._notebookViewModel.deltaCellStatusBarItems(this._currentItemIds, [
            { handle: this.cell.handle, items },
        ]);
    }
    dispose() {
        super.dispose();
        this._notebookViewModel.deltaCellStatusBarItems(this._currentItemIds, [
            { handle: this.cell.handle, items: [] },
        ]);
    }
};
DiagnosticCellStatusBarItem = __decorate([
    __param(2, IKeybindingService),
    __param(3, IChatAgentService)
], DiagnosticCellStatusBarItem);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY0NlbGxTdGF0dXNCYXJDb250cmliLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL2NlbGxEaWFnbm9zdGljcy9kaWFnbm9zdGljQ2VsbFN0YXR1c0JhckNvbnRyaWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDL0YsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDbEYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFNbEcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFNeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFDWixTQUFRLFVBQVU7YUFHWCxPQUFFLEdBQVcsMENBQTBDLEFBQXJELENBQXFEO0lBRTlELFlBQ0MsY0FBK0IsRUFDUixvQkFBMkM7UUFFbEUsS0FBSyxFQUFFLENBQUE7UUFDUCxJQUFJ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