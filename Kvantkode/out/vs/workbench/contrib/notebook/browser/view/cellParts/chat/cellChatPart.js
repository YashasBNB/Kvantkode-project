/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CellContentPart } from '../../cellPart.js';
export class CellChatPart extends CellContentPart {
    // private _controller: NotebookCellChatController | undefined;
    get activeCell() {
        return this.currentCell;
    }
    constructor(_notebookEditor, _partContainer) {
        super();
    }
    didRenderCell(element) {
        super.didRenderCell(element);
    }
    unrenderCell(element) {
        super.unrenderCell(element);
    }
    updateInternalLayoutNow(element) { }
    dispose() {
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbENoYXRQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvY2VsbFBhcnRzL2NoYXQvY2VsbENoYXRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUVuRCxNQUFNLE9BQU8sWUFBYSxTQUFRLGVBQWU7SUFDaEQsK0RBQStEO0lBRS9ELElBQUksVUFBVTtRQUNiLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQTtJQUN4QixDQUFDO0lBRUQsWUFBWSxlQUF3QyxFQUFFLGNBQTJCO1FBQ2hGLEtBQUssRUFBRSxDQUFBO0lBQ1IsQ0FBQztJQUVRLGFBQWEsQ0FBQyxPQUF1QjtRQUM3QyxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQzdCLENBQUM7SUFFUSxZQUFZLENBQUMsT0FBdUI7UUFDNUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUM1QixDQUFDO0lBRVEsdUJBQXVCLENBQUMsT0FBdUIsSUFBUyxDQUFDO0lBRXpELE9BQU87UUFDZixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQztDQUNEIn0=