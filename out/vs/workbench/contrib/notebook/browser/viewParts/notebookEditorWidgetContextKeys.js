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
import * as DOM from '../../../../../base/browser/dom.js';
import { DisposableStore, dispose } from '../../../../../base/common/lifecycle.js';
import { IContextKeyService, } from '../../../../../platform/contextkey/common/contextkey.js';
import { KERNEL_EXTENSIONS } from '../notebookBrowser.js';
import { KERNEL_HAS_VARIABLE_PROVIDER, NOTEBOOK_CELL_TOOLBAR_LOCATION, NOTEBOOK_HAS_OUTPUTS, NOTEBOOK_HAS_RUNNING_CELL, NOTEBOOK_HAS_SOMETHING_RUNNING, NOTEBOOK_INTERRUPTIBLE_KERNEL, NOTEBOOK_KERNEL, NOTEBOOK_KERNEL_COUNT, NOTEBOOK_KERNEL_SELECTED, NOTEBOOK_KERNEL_SOURCE_COUNT, NOTEBOOK_LAST_CELL_FAILED, NOTEBOOK_MISSING_KERNEL_EXTENSION, NOTEBOOK_USE_CONSOLIDATED_OUTPUT_BUTTON, NOTEBOOK_VIEW_TYPE, } from '../../common/notebookContextKeys.js';
import { INotebookExecutionStateService, NotebookExecutionType, } from '../../common/notebookExecutionStateService.js';
import { INotebookKernelService } from '../../common/notebookKernelService.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
let NotebookEditorContextKeys = class NotebookEditorContextKeys {
    constructor(_editor, _notebookKernelService, contextKeyService, _extensionService, _notebookExecutionStateService) {
        this._editor = _editor;
        this._notebookKernelService = _notebookKernelService;
        this._extensionService = _extensionService;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this._disposables = new DisposableStore();
        this._viewModelDisposables = new DisposableStore();
        this._cellOutputsListeners = [];
        this._selectedKernelDisposables = new DisposableStore();
        this._notebookKernel = NOTEBOOK_KERNEL.bindTo(contextKeyService);
        this._notebookKernelCount = NOTEBOOK_KERNEL_COUNT.bindTo(contextKeyService);
        this._notebookKernelSelected = NOTEBOOK_KERNEL_SELECTED.bindTo(contextKeyService);
        this._interruptibleKernel = NOTEBOOK_INTERRUPTIBLE_KERNEL.bindTo(contextKeyService);
        this._hasVariableProvider = KERNEL_HAS_VARIABLE_PROVIDER.bindTo(contextKeyService);
        this._someCellRunning = NOTEBOOK_HAS_RUNNING_CELL.bindTo(contextKeyService);
        this._kernelRunning = NOTEBOOK_HAS_SOMETHING_RUNNING.bindTo(contextKeyService);
        this._useConsolidatedOutputButton =
            NOTEBOOK_USE_CONSOLIDATED_OUTPUT_BUTTON.bindTo(contextKeyService);
        this._hasOutputs = NOTEBOOK_HAS_OUTPUTS.bindTo(contextKeyService);
        this._viewType = NOTEBOOK_VIEW_TYPE.bindTo(contextKeyService);
        this._missingKernelExtension = NOTEBOOK_MISSING_KERNEL_EXTENSION.bindTo(contextKeyService);
        this._notebookKernelSourceCount = NOTEBOOK_KERNEL_SOURCE_COUNT.bindTo(contextKeyService);
        this._cellToolbarLocation = NOTEBOOK_CELL_TOOLBAR_LOCATION.bindTo(contextKeyService);
        this._lastCellFailed = NOTEBOOK_LAST_CELL_FAILED.bindTo(contextKeyService);
        this._handleDidChangeModel();
        this._updateForNotebookOptions();
        this._disposables.add(_editor.onDidChangeModel(this._handleDidChangeModel, this));
        this._disposables.add(_notebookKernelService.onDidAddKernel(this._updateKernelContext, this));
        this._disposables.add(_notebookKernelService.onDidChangeSelectedNotebooks(this._updateKernelContext, this));
        this._disposables.add(_notebookKernelService.onDidChangeSourceActions(this._updateKernelContext, this));
        this._disposables.add(_editor.notebookOptions.onDidChangeOptions(this._updateForNotebookOptions, this));
        this._disposables.add(_extensionService.onDidChangeExtensions(this._updateForInstalledExtension, this));
        this._disposables.add(_notebookExecutionStateService.onDidChangeExecution(this._updateForExecution, this));
        this._disposables.add(_notebookExecutionStateService.onDidChangeLastRunFailState(this._updateForLastRunFailState, this));
    }
    dispose() {
        this._disposables.dispose();
        this._viewModelDisposables.dispose();
        this._selectedKernelDisposables.dispose();
        this._notebookKernelCount.reset();
        this._notebookKernelSourceCount.reset();
        this._interruptibleKernel.reset();
        this._hasVariableProvider.reset();
        this._someCellRunning.reset();
        this._kernelRunning.reset();
        this._viewType.reset();
        dispose(this._cellOutputsListeners);
        this._cellOutputsListeners.length = 0;
    }
    _handleDidChangeModel() {
        this._updateKernelContext();
        this._updateForNotebookOptions();
        this._viewModelDisposables.clear();
        dispose(this._cellOutputsListeners);
        this._cellOutputsListeners.length = 0;
        if (!this._editor.hasModel()) {
            return;
        }
        const recomputeOutputsExistence = () => {
            let hasOutputs = false;
            if (this._editor.hasModel()) {
                for (let i = 0; i < this._editor.getLength(); i++) {
                    if (this._editor.cellAt(i).outputsViewModels.length > 0) {
                        hasOutputs = true;
                        break;
                    }
                }
            }
            this._hasOutputs.set(hasOutputs);
        };
        const layoutDisposable = this._viewModelDisposables.add(new DisposableStore());
        const addCellOutputsListener = (c) => {
            return c.model.onDidChangeOutputs(() => {
                layoutDisposable.clear();
                layoutDisposable.add(DOM.scheduleAtNextAnimationFrame(DOM.getWindow(this._editor.getDomNode()), () => {
                    recomputeOutputsExistence();
                }));
            });
        };
        for (let i = 0; i < this._editor.getLength(); i++) {
            const cell = this._editor.cellAt(i);
            this._cellOutputsListeners.push(addCellOutputsListener(cell));
        }
        recomputeOutputsExistence();
        this._updateForInstalledExtension();
        this._viewModelDisposables.add(this._editor.onDidChangeViewCells((e) => {
            ;
            [...e.splices].reverse().forEach((splice) => {
                const [start, deleted, newCells] = splice;
                const deletedCellOutputStates = this._cellOutputsListeners.splice(start, deleted, ...newCells.map(addCellOutputsListener));
                dispose(deletedCellOutputStates);
            });
        }));
        this._viewType.set(this._editor.textModel.viewType);
    }
    _updateForExecution(e) {
        if (this._editor.textModel) {
            const notebookExe = this._notebookExecutionStateService.getExecution(this._editor.textModel.uri);
            const notebookCellExe = this._notebookExecutionStateService.getCellExecutionsForNotebook(this._editor.textModel.uri);
            this._kernelRunning.set(notebookCellExe.length > 0 || !!notebookExe);
            if (e.type === NotebookExecutionType.cell) {
                this._someCellRunning.set(notebookCellExe.length > 0);
            }
        }
        else {
            this._kernelRunning.set(false);
            if (e.type === NotebookExecutionType.cell) {
                this._someCellRunning.set(false);
            }
        }
    }
    _updateForLastRunFailState(e) {
        if (e.notebook === this._editor.textModel?.uri) {
            this._lastCellFailed.set(e.visible);
        }
    }
    async _updateForInstalledExtension() {
        if (!this._editor.hasModel()) {
            return;
        }
        const viewType = this._editor.textModel.viewType;
        const kernelExtensionId = KERNEL_EXTENSIONS.get(viewType);
        this._missingKernelExtension.set(!!kernelExtensionId && !(await this._extensionService.getExtension(kernelExtensionId)));
    }
    _updateKernelContext() {
        if (!this._editor.hasModel()) {
            this._notebookKernelCount.reset();
            this._notebookKernelSourceCount.reset();
            this._interruptibleKernel.reset();
            this._hasVariableProvider.reset();
            return;
        }
        const { selected, all } = this._notebookKernelService.getMatchingKernel(this._editor.textModel);
        const sourceActions = this._notebookKernelService.getSourceActions(this._editor.textModel, this._editor.scopedContextKeyService);
        this._notebookKernelCount.set(all.length);
        this._notebookKernelSourceCount.set(sourceActions.length);
        this._interruptibleKernel.set(selected?.implementsInterrupt ?? false);
        this._hasVariableProvider.set(selected?.hasVariableProvider ?? false);
        this._notebookKernelSelected.set(Boolean(selected));
        this._notebookKernel.set(selected?.id ?? '');
        this._selectedKernelDisposables.clear();
        if (selected) {
            this._selectedKernelDisposables.add(selected.onDidChange(() => {
                this._interruptibleKernel.set(selected?.implementsInterrupt ?? false);
            }));
        }
    }
    _updateForNotebookOptions() {
        const layout = this._editor.notebookOptions.getDisplayOptions();
        this._useConsolidatedOutputButton.set(layout.consolidatedOutputButton);
        this._cellToolbarLocation.set(this._editor.notebookOptions.computeCellToolbarLocation(this._editor.textModel?.viewType));
    }
};
NotebookEditorContextKeys = __decorate([
    __param(1, INotebookKernelService),
    __param(2, IContextKeyService),
    __param(3, IExtensionService),
    __param(4, INotebookExecutionStateService)
], NotebookEditorContextKeys);
export { NotebookEditorContextKeys };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JXaWRnZXRDb250ZXh0S2V5cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3UGFydHMvbm90ZWJvb2tFZGl0b3JXaWRnZXRDb250ZXh0S2V5cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLE1BQU0seUNBQXlDLENBQUE7QUFDL0YsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBMkMsaUJBQWlCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLDhCQUE4QixFQUM5QixvQkFBb0IsRUFDcEIseUJBQXlCLEVBQ3pCLDhCQUE4QixFQUM5Qiw2QkFBNkIsRUFDN0IsZUFBZSxFQUNmLHFCQUFxQixFQUNyQix3QkFBd0IsRUFDeEIsNEJBQTRCLEVBQzVCLHlCQUF5QixFQUN6QixpQ0FBaUMsRUFDakMsdUNBQXVDLEVBQ3ZDLGtCQUFrQixHQUNsQixNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFHTiw4QkFBOEIsRUFFOUIscUJBQXFCLEdBQ3JCLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFakYsSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBeUI7SUFxQnJDLFlBQ2tCLE9BQWdDLEVBQ3pCLHNCQUErRCxFQUNu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