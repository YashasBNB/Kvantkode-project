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
import * as nls from '../../../../../../nls.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../../base/common/network.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { registerWorkbenchContribution2, } from '../../../../../common/contributions.js';
import { CENTER_ACTIVE_CELL } from '../navigation/arrow.js';
import { SELECT_KERNEL_ID } from '../../controller/coreActions.js';
import { SELECT_NOTEBOOK_INDENTATION_ID } from '../../controller/editActions.js';
import { getNotebookEditorFromEditorPane } from '../../notebookBrowser.js';
import { NotebookCellsChangeType } from '../../../common/notebookCommon.js';
import { INotebookKernelService } from '../../../common/notebookKernelService.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { IStatusbarService, } from '../../../../../services/statusbar/browser/statusbar.js';
import { IEditorGroupsService, } from '../../../../../services/editor/common/editorGroupsService.js';
import { Event } from '../../../../../../base/common/event.js';
let ImplictKernelSelector = class ImplictKernelSelector {
    constructor(notebook, suggested, notebookKernelService, languageFeaturesService, logService) {
        const disposables = new DisposableStore();
        this.dispose = disposables.dispose.bind(disposables);
        const selectKernel = () => {
            disposables.clear();
            notebookKernelService.selectKernelForNotebook(suggested, notebook);
        };
        // IMPLICITLY select a suggested kernel when the notebook has been changed
        // e.g change cell source, move cells, etc
        disposables.add(notebook.onDidChangeContent((e) => {
            for (const event of e.rawEvents) {
                switch (event.kind) {
                    case NotebookCellsChangeType.ChangeCellContent:
                    case NotebookCellsChangeType.ModelChange:
                    case NotebookCellsChangeType.Move:
                    case NotebookCellsChangeType.ChangeCellLanguage:
                        logService.trace('IMPLICIT kernel selection because of change event', event.kind);
                        selectKernel();
                        break;
                }
            }
        }));
        // IMPLICITLY select a suggested kernel when users start to hover. This should
        // be a strong enough hint that the user wants to interact with the notebook. Maybe
        // add more triggers like goto-providers or completion-providers
        disposables.add(languageFeaturesService.hoverProvider.register({ scheme: Schemas.vscodeNotebookCell, pattern: notebook.uri.path }, {
            provideHover() {
                logService.trace('IMPLICIT kernel selection because of hover');
                selectKernel();
                return undefined;
            },
        }));
    }
};
ImplictKernelSelector = __decorate([
    __param(2, INotebookKernelService),
    __param(3, ILanguageFeaturesService),
    __param(4, ILogService)
], ImplictKernelSelector);
let KernelStatus = class KernelStatus extends Disposable {
    constructor(_editorService, _statusbarService, _notebookKernelService, _instantiationService) {
        super();
        this._editorService = _editorService;
        this._statusbarService = _statusbarService;
        this._notebookKernelService = _notebookKernelService;
        this._instantiationService = _instantiationService;
        this._editorDisposables = this._register(new DisposableStore());
        this._kernelInfoElement = this._register(new DisposableStore());
        this._register(this._editorService.onDidActiveEditorChange(() => this._updateStatusbar()));
        this._updateStatusbar();
    }
    _updateStatusbar() {
        this._editorDisposables.clear();
        const activeEditor = getNotebookEditorFromEditorPane(this._editorService.activeEditorPane);
        if (!activeEditor) {
            // not a notebook -> clean-up, done
            this._kernelInfoElement.clear();
            return;
        }
        const updateStatus = () => {
            if (activeEditor.notebookOptions.getDisplayOptions().globalToolbar) {
                // kernel info rendered in the notebook toolbar already
                this._kernelInfoElement.clear();
                return;
            }
            const notebook = activeEditor.textModel;
            if (notebook) {
                this._showKernelStatus(notebook);
            }
            else {
                this._kernelInfoElement.clear();
            }
        };
        this._editorDisposables.add(this._notebookKernelService.onDidAddKernel(updateStatus));
        this._editorDisposables.add(this._notebookKernelService.onDidChangeSelectedNotebooks(updateStatus));
        this._editorDisposables.add(this._notebookKernelService.onDidChangeNotebookAffinity(updateStatus));
        this._editorDisposables.add(activeEditor.onDidChangeModel(updateStatus));
        this._editorDisposables.add(activeEditor.notebookOptions.onDidChangeOptions(updateStatus));
        updateStatus();
    }
    _showKernelStatus(notebook) {
        this._kernelInfoElement.clear();
        const { selected, suggestions, all } = this._notebookKernelService.getMatchingKernel(notebook);
        const suggested = ((suggestions.length === 1 ? suggestions[0] : undefined) ?? all.length === 1)
            ? all[0]
            : undefined;
        let isSuggested = false;
        if (all.length === 0) {
            // no kernel -> no status
            return;
        }
        else if (selected || suggested) {
            // selected or single kernel
            let kernel = selected;
            if (!kernel) {
                // proceed with suggested kernel - show UI and install handler that selects the kernel
                // when non trivial interactions with the notebook happen.
                kernel = suggested;
                isSuggested = true;
                this._kernelInfoElement.add(this._instantiationService.createInstance(ImplictKernelSelector, notebook, kernel));
            }
            const tooltip = kernel.description ?? kernel.detail ?? kernel.label;
            this._kernelInfoElement.add(this._statusbarService.addEntry({
                name: nls.localize('notebook.info', 'Notebook Kernel Info'),
                text: `$(notebook-kernel-select) ${kernel.label}`,
                ariaLabel: kernel.label,
                tooltip: isSuggested ? nls.localize('tooltop', '{0} (suggestion)', tooltip) : tooltip,
                command: SELECT_KERNEL_ID,
            }, SELECT_KERNEL_ID, 1 /* StatusbarAlignment.RIGHT */, 10));
            this._kernelInfoElement.add(kernel.onDidChange(() => this._showKernelStatus(notebook)));
        }
        else {
            // multiple kernels -> show selection hint
            this._kernelInfoElement.add(this._statusbarService.addEntry({
                name: nls.localize('notebook.select', 'Notebook Kernel Selection'),
                text: nls.localize('kernel.select.label', 'Select Kernel'),
                ariaLabel: nls.localize('kernel.select.label', 'Select Kernel'),
                command: SELECT_KERNEL_ID,
                kind: 'prominent',
            }, SELECT_KERNEL_ID, 1 /* StatusbarAlignment.RIGHT */, 10));
        }
    }
};
KernelStatus = __decorate([
    __param(0, IEditorService),
    __param(1, IStatusbarService),
    __param(2, INotebookKernelService),
    __param(3, IInstantiationService)
], KernelStatus);
let ActiveCellStatus = class ActiveCellStatus extends Disposable {
    constructor(_editorService, _statusbarService) {
        super();
        this._editorService = _editorService;
        this._statusbarService = _statusbarService;
        this._itemDisposables = this._register(new DisposableStore());
        this._accessor = this._register(new MutableDisposable());
        this._register(this._editorService.onDidActiveEditorChange(() => this._update()));
        this._update();
    }
    _update() {
        this._itemDisposables.clear();
        const activeEditor = getNotebookEditorFromEditorPane(this._editorService.activeEditorPane);
        if (activeEditor) {
            this._itemDisposables.add(activeEditor.onDidChangeSelection(() => this._show(activeEditor)));
            this._itemDisposables.add(activeEditor.onDidChangeActiveCell(() => this._show(activeEditor)));
            this._show(activeEditor);
        }
        else {
            this._accessor.clear();
        }
    }
    _show(editor) {
        if (!editor.hasModel()) {
            this._accessor.clear();
            return;
        }
        const newText = this._getSelectionsText(editor);
        if (!newText) {
            this._accessor.clear();
            return;
        }
        const entry = {
            name: nls.localize('notebook.activeCellStatusName', 'Notebook Editor Selections'),
            text: newText,
            ariaLabel: newText,
            command: CENTER_ACTIVE_CELL,
        };
        if (!this._accessor.value) {
            this._accessor.value = this._statusbarService.addEntry(entry, 'notebook.activeCellStatus', 1 /* StatusbarAlignment.RIGHT */, 100);
        }
        else {
            this._accessor.value.update(entry);
        }
    }
    _getSelectionsText(editor) {
        if (!editor.hasModel()) {
            return undefined;
        }
        const activeCell = editor.getActiveCell();
        if (!activeCell) {
            return undefined;
        }
        const idxFocused = editor.getCellIndex(activeCell) + 1;
        const numSelected = editor
            .getSelections()
            .reduce((prev, range) => prev + (range.end - range.start), 0);
        const totalCells = editor.getLength();
        return numSelected > 1
            ? nls.localize('notebook.multiActiveCellIndicator', 'Cell {0} ({1} selected)', idxFocused, numSelected)
            : nls.localize('notebook.singleActiveCellIndicator', 'Cell {0} of {1}', idxFocused, totalCells);
    }
};
ActiveCellStatus = __decorate([
    __param(0, IEditorService),
    __param(1, IStatusbarService)
], ActiveCellStatus);
let NotebookIndentationStatus = class NotebookIndentationStatus extends Disposable {
    static { this.ID = 'selectNotebookIndentation'; }
    constructor(_editorService, _statusbarService, _configurationService) {
        super();
        this._editorService = _editorService;
        this._statusbarService = _statusbarService;
        this._configurationService = _configurationService;
        this._itemDisposables = this._register(new DisposableStore());
        this._accessor = this._register(new MutableDisposable());
        this._register(this._editorService.onDidActiveEditorChange(() => this._update()));
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('editor') || e.affectsConfiguration('notebook')) {
                this._update();
            }
        }));
        this._update();
    }
    _update() {
        this._itemDisposables.clear();
        const activeEditor = getNotebookEditorFromEditorPane(this._editorService.activeEditorPane);
        if (activeEditor) {
            this._show(activeEditor);
            this._itemDisposables.add(activeEditor.onDidChangeSelection(() => {
                this._accessor.clear();
                this._show(activeEditor);
            }));
        }
        else {
            this._accessor.clear();
        }
    }
    _show(editor) {
        if (!editor.hasModel()) {
            this._accessor.clear();
            return;
        }
        const cellOptions = editor.getActiveCell()?.textModel?.getOptions();
        if (!cellOptions) {
            this._accessor.clear();
            return;
        }
        const cellEditorOverridesRaw = editor.notebookOptions.getDisplayOptions().editorOptionsCustomizations;
        const indentSize = cellEditorOverridesRaw?.['editor.indentSize'] ?? cellOptions?.indentSize;
        const insertSpaces = cellEditorOverridesRaw?.['editor.insertSpaces'] ?? cellOptions?.insertSpaces;
        const tabSize = cellEditorOverridesRaw?.['editor.tabSize'] ?? cellOptions?.tabSize;
        const width = typeof indentSize === 'number' ? indentSize : tabSize;
        const message = insertSpaces ? `Spaces: ${width}` : `Tab Size: ${width}`;
        const newText = message;
        if (!newText) {
            this._accessor.clear();
            return;
        }
        const entry = {
            name: nls.localize('notebook.indentation', 'Notebook Indentation'),
            text: newText,
            ariaLabel: newText,
            tooltip: nls.localize('selectNotebookIndentation', 'Select Indentation'),
            command: SELECT_NOTEBOOK_INDENTATION_ID,
        };
        if (!this._accessor.value) {
            this._accessor.value = this._statusbarService.addEntry(entry, 'notebook.status.indentation', 1 /* StatusbarAlignment.RIGHT */, 100.4);
        }
        else {
            this._accessor.value.update(entry);
        }
    }
};
NotebookIndentationStatus = __decorate([
    __param(0, IEditorService),
    __param(1, IStatusbarService),
    __param(2, IConfigurationService)
], NotebookIndentationStatus);
let NotebookEditorStatusContribution = class NotebookEditorStatusContribution extends Disposable {
    static { this.ID = 'notebook.contrib.editorStatus'; }
    constructor(editorGroupService) {
        super();
        this.editorGroupService = editorGroupService;
        for (const part of editorGroupService.parts) {
            this.createNotebookStatus(part);
        }
        this._register(editorGroupService.onDidCreateAuxiliaryEditorPart((part) => this.createNotebookStatus(part)));
    }
    createNotebookStatus(part) {
        const disposables = new DisposableStore();
        Event.once(part.onWillDispose)(() => disposables.dispose());
        const scopedInstantiationService = this.editorGroupService.getScopedInstantiationService(part);
        disposables.add(scopedInstantiationService.createInstance(KernelStatus));
        disposables.add(scopedInstantiationService.createInstance(ActiveCellStatus));
        disposables.add(scopedInstantiationService.createInstance(NotebookIndentationStatus));
    }
};
NotebookEditorStatusContribution = __decorate([
    __param(0, IEditorGroupsService)
], NotebookEditorStatusContribution);
registerWorkbenchContribution2(NotebookEditorStatusContribution.ID, NotebookEditorStatusContribution, 3 /* WorkbenchPhase.AfterRestored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU3RhdHVzQmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvZWRpdG9yU3RhdHVzQmFyL2VkaXRvclN0YXR1c0Jhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLDBCQUEwQixDQUFBO0FBQy9DLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLGlCQUFpQixHQUNqQixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN2RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDMUUsT0FBTyxFQUdOLDhCQUE4QixHQUM5QixNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzNELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2hGLE9BQU8sRUFBbUIsK0JBQStCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUUzRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRSxPQUFPLEVBQW1CLHNCQUFzQixFQUFFLE1BQU0sMENB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