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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tUmVhZGluZ0NvbnRleHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy92aWV3TGluZXMvZG9tUmVhZGluZ0NvbnRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsTUFBTSxPQUFPLGlCQUFpQjtJQU03QixJQUFXLFlBQVk7UUFDdEIsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFBO0lBQzFCLENBQUM7SUFFTyxjQUFjO1FBQ3JCLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDM0IsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUE7WUFDM0IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO1lBQ2xELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1lBQ3ZCLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFBO1lBQ3JDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFBO1FBQy9ELENBQUM7SUFDRixDQUFDO0lBRUQsSUFBVyxtQkFBbUI7UUFDN0IsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDdEIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFBO0lBQ2pDLENBQUM7SUFFRCxJQUFXLGVBQWU7UUFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDdEIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFBO0lBQzdCLENBQUM7SUFFRCxZQUNrQixRQUFxQixFQUN0QixPQUFvQjtRQURuQixhQUFRLEdBQVIsUUFBUSxDQUFhO1FBQ3RCLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFuQzdCLGtCQUFhLEdBQVksS0FBSyxDQUFBO1FBQzlCLHlCQUFvQixHQUFXLENBQUMsQ0FBQTtRQUNoQyxxQkFBZ0IsR0FBVyxDQUFDLENBQUE7UUFDNUIsb0JBQWUsR0FBWSxLQUFLLENBQUE7SUFpQ3JDLENBQUM7SUFFRyxnQkFBZ0I7UUFDdEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUE7SUFDMUIsQ0FBQztDQUNEIn0=