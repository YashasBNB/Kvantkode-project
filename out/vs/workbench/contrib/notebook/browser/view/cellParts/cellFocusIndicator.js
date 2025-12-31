/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../../../base/browser/dom.js';
import { FastDomNode } from '../../../../../../base/browser/fastDomNode.js';
import { CellContentPart } from '../cellPart.js';
import { CellKind } from '../../../common/notebookCommon.js';
export class CellFocusIndicator extends CellContentPart {
    constructor(notebookEditor, titleToolbar, top, left, right, bottom) {
        super();
        this.notebookEditor = notebookEditor;
        this.titleToolbar = titleToolbar;
        this.top = top;
        this.left = left;
        this.right = right;
        this.bottom = bottom;
        this.codeFocusIndicator = new FastDomNode(DOM.append(this.left.domNode, DOM.$('.codeOutput-focus-indicator-container', undefined, DOM.$('.codeOutput-focus-indicator.code-focus-indicator'))));
        this.outputFocusIndicator = new FastDomNode(DOM.append(this.left.domNode, DOM.$('.codeOutput-focus-indicator-container', undefined, DOM.$('.codeOutput-focus-indicator.output-focus-indicator'))));
        this._register(DOM.addDisposableListener(this.codeFocusIndicator.domNode, DOM.EventType.CLICK, () => {
            if (this.currentCell) {
                this.currentCell.isInputCollapsed = !this.currentCell.isInputCollapsed;
            }
        }));
        this._register(DOM.addDisposableListener(this.outputFocusIndicator.domNode, DOM.EventType.CLICK, () => {
            if (this.currentCell) {
                this.currentCell.isOutputCollapsed = !this.currentCell.isOutputCollapsed;
            }
        }));
        this._register(DOM.addDisposableListener(this.left.domNode, DOM.EventType.DBLCLICK, (e) => {
            if (!this.currentCell || !this.notebookEditor.hasModel()) {
                return;
            }
            if (e.target !== this.left.domNode) {
                // Don't allow dblclick on the codeFocusIndicator/outputFocusIndicator
                return;
            }
            const clickedOnInput = e.offsetY < this.currentCell.layoutInfo.outputContainerOffset;
            if (clickedOnInput) {
                this.currentCell.isInputCollapsed = !this.currentCell.isInputCollapsed;
            }
            else {
                this.currentCell.isOutputCollapsed = !this.currentCell.isOutputCollapsed;
            }
        }));
        this._register(this.titleToolbar.onDidUpdateActions(() => {
            this.updateFocusIndicatorsForTitleMenu();
        }));
    }
    updateInternalLayoutNow(element) {
        if (element.cellKind === CellKind.Markup) {
            const indicatorPostion = this.notebookEditor.notebookOptions.computeIndicatorPosition(element.layoutInfo.totalHeight, element.layoutInfo.foldHintHeight, this.notebookEditor.textModel?.viewType);
            this.bottom.domNode.style.transform = `translateY(${indicatorPostion.bottomIndicatorTop + 6}px)`;
            this.left.setHeight(indicatorPostion.verticalIndicatorHeight);
            this.right.setHeight(indicatorPostion.verticalIndicatorHeight);
            this.codeFocusIndicator.setHeight(indicatorPostion.verticalIndicatorHeight -
                this.getIndicatorTopMargin() * 2 -
                element.layoutInfo.chatHeight);
        }
        else {
            const cell = element;
            const layoutInfo = this.notebookEditor.notebookOptions.getLayoutConfiguration();
            const bottomToolbarDimensions = this.notebookEditor.notebookOptions.computeBottomToolbarDimensions(this.notebookEditor.textModel?.viewType);
            const indicatorHeight = cell.layoutInfo.codeIndicatorHeight +
                cell.layoutInfo.outputIndicatorHeight +
                cell.layoutInfo.commentHeight;
            this.left.setHeight(indicatorHeight);
            this.right.setHeight(indicatorHeight);
            this.codeFocusIndicator.setHeight(cell.layoutInfo.codeIndicatorHeight);
            this.outputFocusIndicator.setHeight(Math.max(cell.layoutInfo.outputIndicatorHeight -
                cell.viewContext.notebookOptions.getLayoutConfiguration().focusIndicatorGap, 0));
            this.bottom.domNode.style.transform = `translateY(${cell.layoutInfo.totalHeight - bottomToolbarDimensions.bottomToolbarGap - layoutInfo.cellBottomMargin}px)`;
        }
        this.updateFocusIndicatorsForTitleMenu();
    }
    updateFocusIndicatorsForTitleMenu() {
        const y = (this.currentCell?.layoutInfo.chatHeight ?? 0) + this.getIndicatorTopMargin();
        this.left.domNode.style.transform = `translateY(${y}px)`;
        this.right.domNode.style.transform = `translateY(${y}px)`;
    }
    getIndicatorTopMargin() {
        const layoutInfo = this.notebookEditor.notebookOptions.getLayoutConfiguration();
        if (this.titleToolbar.hasActions) {
            return layoutInfo.editorToolbarHeight + layoutInfo.cellTopMargin;
        }
        else {
            return layoutInfo.cellTopMargin;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbEZvY3VzSW5kaWNhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L2NlbGxQYXJ0cy9jZWxsRm9jdXNJbmRpY2F0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFNM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBSWhELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU1RCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsZUFBZTtJQUl0RCxZQUNVLGNBQXVDLEVBQ3ZDLFlBQWtDLEVBQ2xDLEdBQTZCLEVBQzdCLElBQThCLEVBQzlCLEtBQStCLEVBQy9CLE1BQWdDO1FBRXpDLEtBQUssRUFBRSxDQUFBO1FBUEUsbUJBQWMsR0FBZCxjQUFjLENBQXlCO1FBQ3ZDLGlCQUFZLEdBQVosWUFBWSxDQUFzQjtRQUNsQyxRQUFHLEdBQUgsR0FBRyxDQUEwQjtRQUM3QixTQUFJLEdBQUosSUFBSSxDQUEwQjtRQUM5QixVQUFLLEdBQUwsS0FBSyxDQUEwQjtRQUMvQixXQUFNLEdBQU4sTUFBTSxDQUEwQjtRQUl6QyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxXQUFXLENBQ3hDLEdBQUcsQ0FBQyxNQUFNLENBQ1QsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQ2pCLEdBQUcsQ0FBQyxDQUFDLENBQ0osdUNBQXVDLEVBQ3ZDLFNBQVMsRUFDVCxHQUFHLENBQUMsQ0FBQyxDQUFDLGtEQUFrRCxDQUFDLENBQ3pELENBQ0QsQ0FDRCxDQUFBO1FBRUQsSUFBSSxDQUFDLG9C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