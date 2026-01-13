/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { isGridBranchNode } from '../../../../browser/ui/grid/gridview.js';
import { Emitter } from '../../../../common/event.js';
export class TestView {
    get minimumWidth() {
        return this._minimumWidth;
    }
    set minimumWidth(size) {
        this._minimumWidth = size;
        this._onDidChange.fire(undefined);
    }
    get maximumWidth() {
        return this._maximumWidth;
    }
    set maximumWidth(size) {
        this._maximumWidth = size;
        this._onDidChange.fire(undefined);
    }
    get minimumHeight() {
        return this._minimumHeight;
    }
    set minimumHeight(size) {
        this._minimumHeight = size;
        this._onDidChange.fire(undefined);
    }
    get maximumHeight() {
        return this._maximumHeight;
    }
    set maximumHeight(size) {
        this._maximumHeight = size;
        this._onDidChange.fire(undefined);
    }
    get element() {
        this._onDidGetElement.fire();
        return this._element;
    }
    get width() {
        return this._width;
    }
    get height() {
        return this._height;
    }
    get top() {
        return this._top;
    }
    get left() {
        return this._left;
    }
    get size() {
        return [this.width, this.height];
    }
    constructor(_minimumWidth, _maximumWidth, _minimumHeight, _maximumHeight) {
        this._minimumWidth = _minimumWidth;
        this._maximumWidth = _maximumWidth;
        this._minimumHeight = _minimumHeight;
        this._maximumHeight = _maximumHeight;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._element = document.createElement('div');
        this._onDidGetElement = new Emitter();
        this.onDidGetElement = this._onDidGetElement.event;
        this._width = 0;
        this._height = 0;
        this._top = 0;
        this._left = 0;
        this._onDidLayout = new Emitter();
        this.onDidLayout = this._onDidLayout.event;
        this._onDidFocus = new Emitter();
        this.onDidFocus = this._onDidFocus.event;
        assert(_minimumWidth <= _maximumWidth, 'gridview view minimum width must be <= maximum width');
        assert(_minimumHeight <= _maximumHeight, 'gridview view minimum height must be <= maximum height');
    }
    layout(width, height, top, left) {
        this._width = width;
        this._height = height;
        this._top = top;
        this._left = left;
        this._onDidLayout.fire({ width, height, top, left });
    }
    focus() {
        this._onDidFocus.fire();
    }
    dispose() {
        this._onDidChange.dispose();
        this._onDidGetElement.dispose();
        this._onDidLayout.dispose();
        this._onDidFocus.dispose();
    }
}
export function nodesToArrays(node) {
    if (isGridBranchNode(node)) {
        return node.children.map(nodesToArrays);
    }
    else {
        return node.view;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2Jyb3dzZXIvdWkvZ3JpZC91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQVksZ0JBQWdCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sNkJBQTZCLENBQUE7QUFFNUQsTUFBTSxPQUFPLFFBQVE7SUFJcEIsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFBO0lBQzFCLENBQUM7SUFDRCxJQUFJLFlBQVksQ0FBQyxJQUFZO1FBQzVCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFBO1FBQ3pCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxJQUFJLFlBQVk7UUFDZixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUE7SUFDMUIsQ0FBQztJQUNELElBQUksWUFBWSxDQUFDLElBQVk7UUFDNUIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUE7UUFDekIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVELElBQUksYUFBYTtRQUNoQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUE7SUFDM0IsQ0FBQztJQUNELElBQUksYUFBYSxDQUFDLElBQVk7UUFDN0IsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUE7UUFDMUIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVELElBQUksYUFBYTtRQUNo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