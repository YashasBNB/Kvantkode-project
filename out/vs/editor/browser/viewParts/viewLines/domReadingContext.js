/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class DomReadingContext {
    get didDomLayout() {
        return this._didDomLayout;
    }
    readClientRect() {
        if (!this._clientRectRead) {
            this._clientRectRead = true;
            const rect = this._domNode.getBoundingClientRect();
            this.markDidDomLayout();
            this._clientRectDeltaLeft = rect.left;
            this._clientRectScale = rect.width / this._domNode.offsetWidth;
        }
    }
    get clientRectDeltaLeft() {
        if (!this._clientRectRead) {
            this.readClientRect();
        }
        return this._clientRectDeltaLeft;
    }
    get clientRectScale() {
        if (!this._clientRectRead) {
            this.readClientRect();
        }
        return this._clientRectScale;
    }
    constructor(_domNode, endNode) {
        this._domNode = _domNode;
        this.endNode = endNode;
        this._didDomLayout = false;
        this._clientRectDeltaLeft = 0;
        this._clientRectScale = 1;
        this._clientRectRead = false;
    }
    markDidDomLayout() {
        this._didDomLayout = true;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tUmVhZGluZ0NvbnRleHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvdmlld0xpbmVzL2RvbVJlYWRpbmdDb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE1BQU0sT0FBTyxpQkFBaUI7SUFNN0IsSUFBVyxZQUFZO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMxQixDQUFDO0lBRU8sY0FBYztRQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFBO1lBQzNCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtZQUNsRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtZQUN2QixJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQTtZQUNyQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQTtRQUMvRCxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQVcsbUJBQW1CO1FBQzdCLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDM0IsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ3RCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsSUFBVyxlQUFlO1FBQ3pCLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDM0IsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ3RCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtJQUM3QixDQUFDO0lBRUQsWUFDa0IsUUFBcUIsRUFDdEIsT0FBb0I7UUFEbkIsYUFBUSxHQUFSLFFBQVEsQ0FBYTtRQUN0QixZQUFPLEdBQVAsT0FBTyxDQUFhO1FBbkM3QixrQkFBYSxHQUFZLEtBQUssQ0FBQTtRQUM5Qix5QkFBb0IsR0FBVyxDQUFDLENBQUE7UUFDaEMscUJBQWdCLEdBQVcsQ0FBQyxDQUFBO1FBQzVCLG9CQUFlLEdBQVksS0FBSyxDQUFBO0lBaUNyQyxDQUFDO0lBRUcsZ0JBQWdCO1FBQ3RCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFBO0lBQzFCLENBQUM7Q0FDRCJ9