/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
const someEvent = new Emitter().event;
/**
 * Add stub methods as needed
 */
export class MockObjectTree {
    get onDidChangeFocus() {
        return someEvent;
    }
    get onDidChangeSelection() {
        return someEvent;
    }
    get onDidOpen() {
        return someEvent;
    }
    get onMouseClick() {
        return someEvent;
    }
    get onMouseDblClick() {
        return someEvent;
    }
    get onContextMenu() {
        return someEvent;
    }
    get onKeyDown() {
        return someEvent;
    }
    get onKeyUp() {
        return someEvent;
    }
    get onKeyPress() {
        return someEvent;
    }
    get onDidFocus() {
        return someEvent;
    }
    get onDidBlur() {
        return someEvent;
    }
    get onDidChangeCollapseState() {
        return someEvent;
    }
    get onDidChangeRenderNodeCount() {
        return someEvent;
    }
    get onDidDispose() {
        return someEvent;
    }
    get lastVisibleElement() {
        return this.elements[this.elements.length - 1];
    }
    constructor(elements) {
        this.elements = elements;
    }
    domFocus() { }
    collapse(location, recursive = false) {
        return true;
    }
    expand(location, recursive = false) {
        return true;
    }
    navigate(start) {
        const startIdx = start ? this.elements.indexOf(start) : undefined;
        return new ArrayNavigator(this.elements, startIdx);
    }
    getParentElement(elem) {
        return elem.parent();
    }
    dispose() { }
}
class ArrayNavigator {
    constructor(elements, index = 0) {
        this.elements = elements;
        this.index = index;
    }
    current() {
        return this.elements[this.index];
    }
    previous() {
        return this.elements[--this.index];
    }
    first() {
        this.index = 0;
        return this.elements[this.index];
    }
    last() {
        this.index = this.elements.length - 1;
        return this.elements[this.index];
    }
    next() {
        return this.elements[++this.index];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja1NlYXJjaFRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvdGVzdC9icm93c2VyL21vY2tTZWFyY2hUcmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUk3RCxNQUFNLFNBQVMsR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FBQTtBQUVyQzs7R0FFRztBQUNILE1BQU0sT0FBTyxjQUFjO0lBQzFCLElBQUksZ0JBQWdCO1FBQ25CLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxJQUFJLG9CQUFvQjtRQUN2QixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBQ0QsSUFBSSxTQUFTO1FBQ1osT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELElBQUksWUFBWTtRQUNmLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxJQUFJLGVBQWU7UUFDbEIsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELElBQUksYUFBYTtRQUNoQixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsSUFBSSxTQUFTO1FBQ1osT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELElBQUksT0FBTztRQUNWLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxJQUFJLFVBQVU7UUFDYixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELElBQUksU0FBUztRQUNaLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxJQUFJLHdCQUF3QjtRQUMzQixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBQ0QsSUFBSSwwQkFBMEI7UUFDN0IsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELElBQUksWUFBWTtRQUNmLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxJQUFJLGtCQUFrQjtRQUNyQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELFlBQW9CLFFBQWU7UUFBZixhQUFRLEdBQVIsUUFBUSxDQUFPO0lBQUcsQ0FBQztJQUV2QyxRQUFRLEtBQVUsQ0FBQztJQUVuQixRQUFRLENBQUMsUUFBYyxFQUFFLFlBQXFCLEtBQUs7UUFDbEQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsTUFBTSxDQUFDLFFBQWMsRUFBRSxZQUFxQixLQUFLO1FBQ2hELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELFFBQVEsQ0FBQyxLQUFZO1FBQ3BCLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtRQUVqRSxPQUFPLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDbkQsQ0FBQztJQUVELGdCQUFnQixDQUFDLElBQXFCO1FBQ3JDLE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ3JCLENBQUM7SUFFRCxPQUFPLEtBQVUsQ0FBQztDQUNsQjtBQUVELE1BQU0sY0FBYztJQUNuQixZQUNTLFFBQWEsRUFDYixRQUFRLENBQUM7UUFEVCxhQUFRLEdBQVIsUUFBUSxDQUFLO1FBQ2IsVUFBSyxHQUFMLEtBQUssQ0FBSTtJQUNmLENBQUM7SUFFSixPQUFPO1FBQ04sT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsS0FBSztRQUNKLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFBO1FBQ2QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsSUFBSTtRQUNILElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1FBQ3JDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVELElBQUk7UUFDSCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDbkMsQ0FBQztDQUNEIn0=