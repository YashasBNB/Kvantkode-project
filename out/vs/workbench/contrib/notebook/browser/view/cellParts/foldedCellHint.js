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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGVkQ2VsbEhpbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvY2VsbFBhcnRzL2ZvbGRlZENlbGxIaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDekUsT0FBTyxFQUFFLGFBQWEsRUFBcUMsTUFBTSwwQkFBMEIsQ0FBQTtBQUMzRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFHaEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDM0QsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakcsT0FBTyxFQUFFLFFBQVEsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXZFLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWUsU0FBUSxlQUFlO0lBSWxELFlBQ2tCLGVBQWdDLEVBQ2hDLFVBQXVCLEVBRXhDLDhCQUErRTtRQUUvRSxLQUFLLEVBQUUsQ0FBQTtRQUxVLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUNoQyxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBRXZCLG1DQUE4QixHQUE5Qiw4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