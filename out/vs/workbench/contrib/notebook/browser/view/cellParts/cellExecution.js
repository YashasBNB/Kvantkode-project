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
import { disposableTimeout } from '../../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { clamp } from '../../../../../../base/common/numbers.js';
import { CellContentPart } from '../cellPart.js';
import { CodeCellViewModel } from '../../viewModel/codeCellViewModel.js';
import { INotebookExecutionStateService } from '../../../common/notebookExecutionStateService.js';
const UPDATE_EXECUTION_ORDER_GRACE_PERIOD = 200;
let CellExecutionPart = class CellExecutionPart extends CellContentPart {
    constructor(_notebookEditor, _executionOrderLabel, _notebookExecutionStateService) {
        super();
        this._notebookEditor = _notebookEditor;
        this._executionOrderLabel = _executionOrderLabel;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this.kernelDisposables = this._register(new DisposableStore());
        this._register(this._notebookEditor.onDidChangeActiveKernel(() => {
            if (this.currentCell) {
                this.kernelDisposables.clear();
                if (this._notebookEditor.activeKernel) {
                    this.kernelDisposables.add(this._notebookEditor.activeKernel.onDidChange(() => {
                        if (this.currentCell) {
                            this.updateExecutionOrder(this.currentCell.internalMetadata);
                        }
                    }));
                }
                this.updateExecutionOrder(this.currentCell.internalMetadata);
            }
        }));
        this._register(this._notebookEditor.onDidScroll(() => {
            this._updatePosition();
        }));
    }
    didRenderCell(element) {
        this.updateExecutionOrder(element.internalMetadata, true);
    }
    updateExecutionOrder(internalMetadata, forceClear = false) {
        if (this._notebookEditor.activeKernel?.implementsExecutionOrder ||
            (!this._notebookEditor.activeKernel && typeof internalMetadata.executionOrder === 'number')) {
            // If the executionOrder was just cleared, and the cell is executing, wait just a bit before clearing the view to avoid flashing
            if (typeof internalMetadata.executionOrder !== 'number' &&
                !forceClear &&
                !!this._notebookExecutionStateService.getCellExecution(this.currentCell.uri)) {
                const renderingCell = this.currentCell;
                disposableTimeout(() => {
                    if (this.currentCell === renderingCell) {
                        this.updateExecutionOrder(this.currentCell.internalMetadata, true);
                    }
                }, UPDATE_EXECUTION_ORDER_GRACE_PERIOD, this.cellDisposables);
                return;
            }
            const executionOrderLabel = typeof internalMetadata.executionOrder === 'number'
                ? `[${internalMetadata.executionOrder}]`
                : '[ ]';
            this._executionOrderLabel.innerText = executionOrderLabel;
        }
        else {
            this._executionOrderLabel.innerText = '';
        }
    }
    updateState(element, e) {
        if (e.internalMetadataChanged) {
            this.updateExecutionOrder(element.internalMetadata);
        }
    }
    updateInternalLayoutNow(element) {
        this._updatePosition();
    }
    _updatePosition() {
        if (this.currentCell) {
            if (this.currentCell.isInputCollapsed) {
                DOM.hide(this._executionOrderLabel);
            }
            else {
                DOM.show(this._executionOrderLabel);
                let top = this.currentCell.layoutInfo.editorHeight -
                    22 +
                    this.currentCell.layoutInfo.statusBarHeight;
                if (this.currentCell instanceof CodeCellViewModel) {
                    const elementTop = this._notebookEditor.getAbsoluteTopOfElement(this.currentCell);
                    const editorBottom = elementTop + this.currentCell.layoutInfo.outputContainerOffset;
                    // another approach to avoid the flicker caused by sticky scroll is manually calculate the scrollBottom:
                    // const scrollBottom = this._notebookEditor.scrollTop + this._notebookEditor.getLayoutInfo().height - 26 - this._notebookEditor.getLayoutInfo().stickyHeight;
                    const scrollBottom = this._notebookEditor.scrollBottom;
                    const lineHeight = 22;
                    if (scrollBottom <= editorBottom) {
                        const offset = editorBottom - scrollBottom;
                        top -= offset;
                        top = clamp(top, lineHeight + 12, // line height + padding for single line
                        this.currentCell.layoutInfo.editorHeight -
                            lineHeight +
                            this.currentCell.layoutInfo.statusBarHeight);
                    }
                }
                this._executionOrderLabel.style.top = `${top}px`;
            }
        }
    }
};
CellExecutionPart = __decorate([
    __param(2, INotebookExecutionStateService)
], CellExecutionPart);
export { CellExecutionPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbEV4ZWN1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9jZWxsUGFydHMvY2VsbEV4ZWN1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVDQUF1QyxDQUFBO0FBQzVELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFHaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQ2hELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXhFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRWpHLE1BQU0sbUNBQW1DLEdBQUcsR0FBRyxDQUFBO0FBRXhDLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWtCLFNBQVEsZUFBZTtJQUdyRCxZQUNrQixlQUF3QyxFQUN4QyxvQkFBaUMsRUFFbEQsOEJBQStFO1FBRS9FLEtBQUssRUFBRSxDQUFBO1FBTFUsb0JBQWUsR0FBZixlQUFlLENBQXlCO1FBQ3hDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBYTtRQUVqQyxtQ0FBOEIsR0FBOUIsOEJBQThCLENBQWdDO1FBTi9ELHNCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFBO1FBVXpFLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGVBQWUsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUU7WUFD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