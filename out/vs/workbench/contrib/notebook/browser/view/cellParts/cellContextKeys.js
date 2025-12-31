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
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../../base/common/observable.js';
import { IContextKeyService, } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { NotebookChatController } from '../../controller/chat/notebookChatController.js';
import { CellEditState, CellFocusMode, } from '../../notebookBrowser.js';
import { CellContentPart } from '../cellPart.js';
import { CodeCellViewModel } from '../../viewModel/codeCellViewModel.js';
import { MarkupCellViewModel } from '../../viewModel/markupCellViewModel.js';
import { NotebookCellExecutionState } from '../../../common/notebookCommon.js';
import { NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_EDITOR_FOCUSED, NOTEBOOK_CELL_EXECUTING, NOTEBOOK_CELL_EXECUTION_STATE, NOTEBOOK_CELL_FOCUSED, NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_CELL_INPUT_COLLAPSED, NOTEBOOK_CELL_LINE_NUMBERS, NOTEBOOK_CELL_MARKDOWN_EDIT_MODE, NOTEBOOK_CELL_OUTPUT_COLLAPSED, NOTEBOOK_CELL_RESOURCE, NOTEBOOK_CELL_TYPE, NOTEBOOK_CELL_GENERATED_BY_CHAT, NOTEBOOK_CELL_HAS_ERROR_DIAGNOSTICS, } from '../../../common/notebookContextKeys.js';
import { INotebookExecutionStateService, NotebookExecutionType, } from '../../../common/notebookExecutionStateService.js';
let CellContextKeyPart = class CellContextKeyPart extends CellContentPart {
    constructor(notebookEditor, instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this.cellContextKeyManager = this._register(this.instantiationService.createInstance(CellContextKeyManager, notebookEditor, undefined));
    }
    didRenderCell(element) {
        this.cellContextKeyManager.updateForElement(element);
    }
};
CellContextKeyPart = __decorate([
    __param(1, IInstantiationService)
], CellContextKeyPart);
export { CellContextKeyPart };
let CellContextKeyManager = class CellContextKeyManager extends Disposable {
    constructor(notebookEditor, element, _contextKeyService, _notebookExecutionStateService) {
        super();
        this.notebookEditor = notebookEditor;
        this.element = element;
        this._contextKeyService = _contextKeyService;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this.elementDisposables = this._register(new DisposableStore());
        this._contextKeyService.bufferChangeEvents(() => {
            this.cellType = NOTEBOOK_CELL_TYPE.bindTo(this._contextKeyService);
            this.cellEditable = NOTEBOOK_CELL_EDITABLE.bindTo(this._contextKeyService);
            this.cellFocused = NOTEBOOK_CELL_FOCUSED.bindTo(this._contextKeyService);
            this.cellEditorFocused = NOTEBOOK_CELL_EDITOR_FOCUSED.bindTo(this._contextKeyService);
            this.markdownEditMode = NOTEBOOK_CELL_MARKDOWN_EDIT_MODE.bindTo(this._contextKeyService);
            this.cellRunState = NOTEBOOK_CELL_EXECUTION_STATE.bindTo(this._contextKeyService);
            this.cellExecuting = NOTEBOOK_CELL_EXECUTING.bindTo(this._contextKeyService);
            this.cellHasOutputs = NOTEBOOK_CELL_HAS_OUTPUTS.bindTo(this._contextKeyService);
            this.cellContentCollapsed = NOTEBOOK_CELL_INPUT_COLLAPSED.bindTo(this._contextKeyService);
            this.cellOutputCollapsed = NOTEBOOK_CELL_OUTPUT_COLLAPSED.bindTo(this._contextKeyService);
            this.cellLineNumbers = NOTEBOOK_CELL_LINE_NUMBERS.bindTo(this._contextKeyService);
            this.cellGeneratedByChat = NOTEBOOK_CELL_GENERATED_BY_CHAT.bindTo(this._contextKeyService);
            this.cellResource = NOTEBOOK_CELL_RESOURCE.bindTo(this._contextKeyService);
            this.cellHasErrorDiagnostics = NOTEBOOK_CELL_HAS_ERROR_DIAGNOSTICS.bindTo(this._contextKeyService);
            if (element) {
                this.updateForElement(element);
            }
        });
        this._register(this._notebookExecutionStateService.onDidChangeExecution((e) => {
            if (e.type === NotebookExecutionType.cell &&
                this.element &&
                e.affectsCell(this.element.uri)) {
                this.updateForExecutionState();
            }
        }));
    }
    updateForElement(element) {
        this.elementDisposables.clear();
        this.element = element;
        if (!element) {
            return;
        }
        this.elementDisposables.add(element.onDidChangeState((e) => this.onDidChangeState(e)));
        if (element instanceof CodeCellViewModel) {
            this.elementDisposables.add(element.onDidChangeOutputs(() => this.updateForOutputs()));
            this.elementDisposables.add(autorun((reader) => {
                this.cellHasErrorDiagnostics.set(!!reader.readObservable(element.executionErrorDiagnostic));
            }));
        }
        this.elementDisposables.add(this.notebookEditor.onDidChangeActiveCell(() => this.updateForFocusState()));
        if (this.element instanceof MarkupCellViewModel) {
            this.cellType.set('markup');
        }
        else if (this.element instanceof CodeCellViewModel) {
            this.cellType.set('code');
        }
        this._contextKeyService.bufferChangeEvents(() => {
            this.updateForFocusState();
            this.updateForExecutionState();
            this.updateForEditState();
            this.updateForCollapseState();
            this.updateForOutputs();
            this.updateForChat();
            this.cellLineNumbers.set(this.element.lineNumbers);
            this.cellResource.set(this.element.uri.toString());
        });
        const chatController = NotebookChatController.get(this.notebookEditor);
        if (chatController) {
            this.elementDisposables.add(chatController.onDidChangePromptCache((e) => {
                if (e.cell.toString() === this.element.uri.toString()) {
                    this.updateForChat();
                }
            }));
        }
    }
    onDidChangeState(e) {
        this._contextKeyService.bufferChangeEvents(() => {
            if (e.internalMetadataChanged) {
                this.updateForExecutionState();
            }
            if (e.editStateChanged) {
                this.updateForEditState();
            }
            if (e.focusModeChanged) {
                this.updateForFocusState();
            }
            if (e.cellLineNumberChanged) {
                this.cellLineNumbers.set(this.element.lineNumbers);
            }
            if (e.inputCollapsedChanged || e.outputCollapsedChanged) {
                this.updateForCollapseState();
            }
        });
    }
    updateForFocusState() {
        if (!this.element) {
            return;
        }
        const activeCell = this.notebookEditor.getActiveCell();
        this.cellFocused.set(this.notebookEditor.getActiveCell() === this.element);
        if (activeCell === this.element) {
            this.cellEditorFocused.set(this.element.focusMode === CellFocusMode.Editor);
        }
        else {
            this.cellEditorFocused.set(false);
        }
    }
    updateForExecutionState() {
        if (!this.element) {
            return;
        }
        const internalMetadata = this.element.internalMetadata;
        this.cellEditable.set(!this.notebookEditor.isReadOnly);
        const exeState = this._notebookExecutionStateService.getCellExecution(this.element.uri);
        if (this.element instanceof MarkupCellViewModel) {
            this.cellRunState.reset();
            this.cellExecuting.reset();
        }
        else if (exeState?.state === NotebookCellExecutionState.Executing) {
            this.cellRunState.set('executing');
            this.cellExecuting.set(true);
        }
        else if (exeState?.state === NotebookCellExecutionState.Pending ||
            exeState?.state === NotebookCellExecutionState.Unconfirmed) {
            this.cellRunState.set('pending');
            this.cellExecuting.set(true);
        }
        else if (internalMetadata.lastRunSuccess === true) {
            this.cellRunState.set('succeeded');
            this.cellExecuting.set(false);
        }
        else if (internalMetadata.lastRunSuccess === false) {
            this.cellRunState.set('failed');
            this.cellExecuting.set(false);
        }
        else {
            this.cellRunState.set('idle');
            this.cellExecuting.set(false);
        }
    }
    updateForEditState() {
        if (!this.element) {
            return;
        }
        if (this.element instanceof MarkupCellViewModel) {
            this.markdownEditMode.set(this.element.getEditState() === CellEditState.Editing);
        }
        else {
            this.markdownEditMode.set(false);
        }
    }
    updateForCollapseState() {
        if (!this.element) {
            return;
        }
        this.cellContentCollapsed.set(!!this.element.isInputCollapsed);
        this.cellOutputCollapsed.set(!!this.element.isOutputCollapsed);
    }
    updateForOutputs() {
        if (this.element instanceof CodeCellViewModel) {
            this.cellHasOutputs.set(this.element.outputsViewModels.length > 0);
        }
        else {
            this.cellHasOutputs.set(false);
        }
    }
    updateForChat() {
        const chatController = NotebookChatController.get(this.notebookEditor);
        if (!chatController || !this.element) {
            this.cellGeneratedByChat.set(false);
            return;
        }
        this.cellGeneratedByChat.set(chatController.isCellGeneratedByChat(this.element));
    }
};
CellContextKeyManager = __decorate([
    __param(2, IContextKeyService),
    __param(3, INotebookExecutionStateService)
], CellContextKeyManager);
export { CellContextKeyManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbENvbnRleHRLZXlzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L2NlbGxQYXJ0cy9jZWxsQ29udGV4dEtleXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDckUsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3hGLE9BQU8sRUFDTixhQUFhLEVBQ2IsYUFBYSxHQUdiLE1BQU0sMEJBQTBCLENBQUE7QUFFakMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQ2hELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzVFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlFLE9BQU8sRUFFTixzQkFBc0IsRUFDdEIsNEJBQTRCLEVBQzVCLHVCQUF1QixFQUN2Qiw2QkFBNkIsRUFDN0IscUJBQXFCLEVBQ3JCLHlCQUF5QixFQUN6Qiw2QkFBNkIsRUFDN0IsMEJBQTBCLEVBQzFCLGdDQUFnQyxFQUNoQyw4QkFBOEIsRUFDOUIsc0JBQXNCLEVBQ3RCLGtCQUFrQixFQUNsQiwrQkFBK0IsRUFDL0IsbUNBQW1DLEdBQ25DLE1BQU0s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