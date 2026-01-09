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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbEZvY3VzSW5kaWNhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvY2VsbFBhcnRzL2NlbGxGb2N1c0luZGljYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVDQUF1QyxDQUFBO0FBQzVELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQU0zRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFJaEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTVELE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxlQUFlO0lBSXRELFlBQ1UsY0FBdUMsRUFDdkMsWUFBa0MsRUFDbEMsR0FBNkIsRUFDN0IsSUFBOEIsRUFDOUIsS0FBK0IsRUFDL0IsTUFBZ0M7UUFFekMsS0FBSyxFQUFFLENBQUE7UUFQRSxtQkFBYyxHQUFkLGNBQWMsQ0FBeUI7UUFDdkMsaUJBQVksR0FBWixZQUFZLENBQXNCO1FBQ2xDLFFBQUcsR0FBSCxHQUFHLENBQTBCO1FBQzdCLFNBQUksR0FBSixJQUFJLENBQTBCO1FBQzlCLFVBQUssR0FBTCxLQUFLLENBQTBCO1FBQy9CLFdBQU0sR0FBTixNQUFNLENBQTBCO1FBSXpDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLFdBQVcsQ0FDeEMsR0FBRyxDQUFDLE1BQU0sQ0FDVCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFDakIsR0FBRyxDQUFDLENBQUMsQ0FDSix1Q0FBdUMsRUFDdkMsU0FBUyxFQUNULEdBQUcsQ0FBQyxDQUFDLENBQUMsa0RBQWtELENBQUMsQ0FDekQsQ0FDRCxDQUNE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