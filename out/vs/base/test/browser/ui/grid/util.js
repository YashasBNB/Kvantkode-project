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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9icm93c2VyL3VpL2dyaWQvdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUFZLGdCQUFnQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEYsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLDZCQUE2QixDQUFBO0FBRTVELE1BQU0sT0FBTyxRQUFRO0lBSXBCLElBQUksWUFBWTtRQUNmLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMxQixDQUFDO0lBQ0QsSUFBSSxZQUFZLENBQUMsSUFBWTtRQUM1QixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQTtRQUN6QixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFBO0lBQzFCLENBQUM7SUFDRCxJQUFJLFlBQVksQ0FBQyxJQUFZO1FBQzVCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFBO1FBQ3pCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxJQUFJLGFBQWE7UUFDaEIsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFBO0lBQzNCLENBQUM7SUFDRCxJQUFJLGFBQWEsQ0FBQyxJQUFZO1FBQzdCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFBO1FBQzFCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxJQUFJLGFBQWE7UUFDaEIsT0FBTyxJQUFJLENBQUMsY0FBYyxD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