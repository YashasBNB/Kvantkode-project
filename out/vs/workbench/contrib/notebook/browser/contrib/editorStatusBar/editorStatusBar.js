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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU3RhdHVzQmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL2VkaXRvclN0YXR1c0Jhci9lZGl0b3JTdGF0dXNCYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSwwQkFBMEIsQ0FBQTtBQUMvQyxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixpQkFBaUIsR0FDakIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDdkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzFFLE9BQU8sRUFHTiw4QkFBOEIsR0FDOUIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNoRixPQUFPLEVBQW1CLCtCQUErQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFM0YsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDM0UsT0FBTyxFQUFtQixzQkFBc0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFB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