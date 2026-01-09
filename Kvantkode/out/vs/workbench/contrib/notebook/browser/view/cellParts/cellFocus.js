/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../../../base/browser/dom.js';
import { CellContentPart } from '../cellPart.js';
export class CellFocusPart extends CellContentPart {
    constructor(containerElement, focusSinkElement, notebookEditor) {
        super();
        this._register(DOM.addDisposableListener(containerElement, DOM.EventType.FOCUS, () => {
            if (this.currentCell) {
                notebookEditor.focusElement(this.currentCell);
            }
        }, true));
        if (focusSinkElement) {
            this._register(DOM.addDisposableListener(focusSinkElement, DOM.EventType.FOCUS, () => {
                if (this.currentCell &&
                    this.currentCell.outputsViewModels.length) {
                    notebookEditor.focusNotebookCell(this.currentCell, 'output');
                }
            }));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbEZvY3VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvY2VsbFBhcnRzL2NlbGxGb2N1cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVDQUF1QyxDQUFBO0FBRTVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUdoRCxNQUFNLE9BQU8sYUFBYyxTQUFRLGVBQWU7SUFDakQsWUFDQyxnQkFBNkIsRUFDN0IsZ0JBQXlDLEVBQ3pDLGNBQStCO1FBRS9CLEtBQUssRUFBRSxDQUFBO1FBRVAsSUFBSSxDQUFDLFNBQVMsQ0FDYixHQUFHLENBQUMscUJBQXFCLENBQ3hCLGdCQUFnQixFQUNoQixHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFDbkIsR0FBRyxFQUFFO1lBQ0osSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3RCLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQzlDLENBQUM7UUFDRixDQUFDLEVBQ0QsSUFBSSxDQUNKLENBQ0QsQ0FBQTtRQUVELElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsU0FBUyxDQUNiLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUU7Z0JBQ3JFLElBQ0MsSUFBSSxDQUFDLFdBQVc7b0JBQ2YsSUFBSSxDQUFDLFdBQWlDLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUMvRCxDQUFDO29CQUNGLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFBO2dCQUM3RCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==