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
import * as DOM from '../../../../../../base/browser/dom.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { localize } from '../../../../../../nls.js';
import { FoldingController } from '../../controller/foldingController.js';
import { CellEditState } from '../../notebookBrowser.js';
import { CellContentPart } from '../cellPart.js';
import { executingStateIcon } from '../../notebookIcons.js';
import { INotebookExecutionStateService } from '../../../common/notebookExecutionStateService.js';
import { CellKind, NotebookCellExecutionState } from '../../../common/notebookCommon.js';
import { MutableDisposable } from '../../../../../../base/common/lifecycle.js';
let FoldedCellHint = class FoldedCellHint extends CellContentPart {
    constructor(_notebookEditor, _container, _notebookExecutionStateService) {
        super();
        this._notebookEditor = _notebookEditor;
        this._container = _container;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this._runButtonListener = this._register(new MutableDisposable());
        this._cellExecutionListener = this._register(new MutableDisposable());
    }
    didRenderCell(element) {
        this.update(element);
    }
    update(element) {
        if (!this._notebookEditor.hasModel()) {
            this._cellExecutionListener.clear();
            this._runButtonListener.clear();
            return;
        }
        if (element.isInputCollapsed || element.getEditState() === CellEditState.Editing) {
            this._cellExecutionListener.clear();
            this._runButtonListener.clear();
            DOM.hide(this._container);
        }
        else if (element.foldingState === 2 /* CellFoldingState.Collapsed */) {
            const idx = this._notebookEditor.getViewModel().getCellIndex(element);
            const length = this._notebookEditor.getViewModel().getFoldedLength(idx);
            const runSectionButton = this.getRunFoldedSectionButton({ start: idx, end: idx + length + 1 });
            if (!runSectionButton) {
                DOM.reset(this._container, this.getHiddenCellsLabel(length), this.getHiddenCellHintButton(element));
            }
            else {
                DOM.reset(this._container, runSectionButton, this.getHiddenCellsLabel(length), this.getHiddenCellHintButton(element));
            }
            DOM.show(this._container);
            const foldHintTop = element.layoutInfo.previewHeight;
            this._container.style.top = `${foldHintTop}px`;
        }
        else {
            this._cellExecutionListener.clear();
            this._runButtonListener.clear();
            DOM.hide(this._container);
        }
    }
    getHiddenCellsLabel(num) {
        const label = num === 1
            ? localize('hiddenCellsLabel', '1 cell hidden')
            : localize('hiddenCellsLabelPlural', '{0} cells hidden', num);
        return DOM.$('span.notebook-folded-hint-label', undefined, label);
    }
    getHiddenCellHintButton(element) {
        const expandIcon = DOM.$('span.cell-expand-part-button');
        expandIcon.classList.add(...ThemeIcon.asClassNameArray(Codicon.more));
        this._register(DOM.addDisposableListener(expandIcon, DOM.EventType.CLICK, () => {
            const controller = this._notebookEditor.getContribution(FoldingController.id);
            const idx = this._notebookEditor.getCellIndex(element);
            if (typeof idx === 'number') {
                controller.setFoldingStateDown(idx, 1 /* CellFoldingState.Expanded */, 1);
            }
        }));
        return expandIcon;
    }
    getRunFoldedSectionButton(range) {
        const runAllContainer = DOM.$('span.folded-cell-run-section-button');
        const cells = this._notebookEditor.getCellsInRange(range);
        // Check if any cells are code cells, if not, we won't show the run button
        const hasCodeCells = cells.some((cell) => cell.cellKind === CellKind.Code);
        if (!hasCodeCells) {
            return undefined;
        }
        const isRunning = cells.some((cell) => {
            const cellExecution = this._notebookExecutionStateService.getCellExecution(cell.uri);
            return cellExecution && cellExecution.state === NotebookCellExecutionState.Executing;
        });
        const runAllIcon = isRunning ? ThemeIcon.modify(executingStateIcon, 'spin') : Codicon.play;
        runAllContainer.classList.add(...ThemeIcon.asClassNameArray(runAllIcon));
        this._runButtonListener.value = DOM.addDisposableListener(runAllContainer, DOM.EventType.CLICK, () => {
            this._notebookEditor.executeNotebookCells(cells);
        });
        this._cellExecutionListener.value = this._notebookExecutionStateService.onDidChangeExecution(() => {
            const isRunning = cells.some((cell) => {
                const cellExecution = this._notebookExecutionStateService.getCellExecution(cell.uri);
                return cellExecution && cellExecution.state === NotebookCellExecutionState.Executing;
            });
            const runAllIcon = isRunning ? ThemeIcon.modify(executingStateIcon, 'spin') : Codicon.play;
            runAllContainer.className = '';
            runAllContainer.classList.add('folded-cell-run-section-button', ...ThemeIcon.asClassNameArray(runAllIcon));
        });
        return runAllContainer;
    }
    updateInternalLayoutNow(element) {
        this.update(element);
    }
};
FoldedCellHint = __decorate([
    __param(2, INotebookExecutionStateService)
], FoldedCellHint);
export { FoldedCellHint };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGVkQ2VsbEhpbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9jZWxsUGFydHMvZm9sZGVkQ2VsbEhpbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsYUFBYSxFQUFxQyxNQUFNLDBCQUEwQixDQUFBO0FBQzNGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUdoRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsUUFBUSxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFdkUsSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBZSxTQUFRLGVBQWU7SUFJbEQsWUFDa0IsZUFBZ0MsRUFDaEMsVUFBdUIsRUFFeEMsOEJBQStFO1FBRS9FLEtBQUssRUFBRSxDQUFBO1FBTFUsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQ2hDLGVBQVUsR0FBVixVQUFVLENBQWE7UUFFdkIsbUNBQThCLEdB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