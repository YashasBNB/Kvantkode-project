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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja1NlYXJjaFRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC90ZXN0L2Jyb3dzZXIvbW9ja1NlYXJjaFRyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBSTdELE1BQU0sU0FBUyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFBO0FBRXJDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGNBQWM7SUFDMUIsSUFBSSxnQkFBZ0I7UUFDbkIsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELElBQUksb0JBQW9CO1FBQ3ZCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxJQUFJLFNBQVM7UUFDWixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELElBQUksZUFBZTtRQUNsQixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBQ0QsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxJQUFJLFNBQVM7UUFDWixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBQ0QsSUFBSSxPQUFPO1FBQ1YsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELElBQUksVUFBVTtRQUNiLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDYixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBQ0QsSUFBSSxTQUFTO1FBQ1osT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELElBQUksd0JBQXdCO1FBQzNCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxJQUFJLDBCQUEwQjtRQUM3QixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELElBQUksa0JBQWtCO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsWUFBb0IsUUFBZTtRQUFmLGFBQVEsR0FBUixRQUFRLENBQU87SUFBRyxDQUFDO0lBRXZDLFFBQVEsS0FBVSxDQUFDO0lBRW5CLFFBQVEsQ0FBQyxRQUFjLEVBQUUsWUFBcUIsS0FBSztRQUNsRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxNQUFNLENBQUMsUUFBYyxFQUFFLFlBQXFCLEtBQUs7UUFDaEQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsUUFBUSxDQUFDLEtBQVk7UUFDcEIsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1FBRWpFLE9BQU8sSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsSUFBcUI7UUFDckMsT0FBTyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDckIsQ0FBQztJQUVELE9BQU8sS0FBVSxDQUFDO0NBQ2xCO0FBRUQsTUFBTSxjQUFjO0lBQ25CLFlBQ1MsUUFBYSxFQUNiLFFBQVEsQ0FBQztRQURULGFBQVEsR0FBUixRQUFRLENBQUs7UUFDYixVQUFLLEdBQUwsS0FBSyxDQUFJO0lBQ2YsQ0FBQztJQUVKLE9BQU87UUFDTixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxRQUFRO1FBQ1AsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUE7UUFDZCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxJQUFJO1FBQ0gsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFDckMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsSUFBSTtRQUNILE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0NBQ0QifQ==