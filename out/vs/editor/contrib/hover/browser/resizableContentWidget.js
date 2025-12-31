/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ResizableHTMLElement } from '../../../../base/browser/ui/resizable/resizable.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Position } from '../../../common/core/position.js';
import * as dom from '../../../../base/browser/dom.js';
const TOP_HEIGHT = 30;
const BOTTOM_HEIGHT = 24;
export class ResizableContentWidget extends Disposable {
    constructor(_editor, minimumSize = new dom.Dimension(10, 10)) {
        super();
        this._editor = _editor;
        this.allowEditorOverflow = true;
        this.suppressMouseDown = false;
        this._resizableNode = this._register(new ResizableHTMLElement());
        this._contentPosition = null;
        this._isResizing = false;
        this._resizableNode.domNode.style.position = 'absolute';
        this._resizableNode.minSize = dom.Dimension.lift(minimumSize);
        this._resizableNode.layout(minimumSize.height, minimumSize.width);
        this._resizableNode.enableSashes(true, true, true, true);
        this._register(this._resizableNode.onDidResize((e) => {
            this._resize(new dom.Dimension(e.dimension.width, e.dimension.height));
            if (e.done) {
                this._isResizing = false;
            }
        }));
        this._register(this._resizableNode.onDidWillResize(() => {
            this._isResizing = true;
        }));
    }
    get isResizing() {
        return this._isResizing;
    }
    getDomNode() {
        return this._resizableNode.domNode;
    }
    getPosition() {
        return this._contentPosition;
    }
    get position() {
        return this._contentPosition?.position
            ? Position.lift(this._contentPosition.position)
            : undefined;
    }
    _availableVerticalSpaceAbove(position) {
        const editorDomNode = this._editor.getDomNode();
        const mouseBox = this._editor.getScrolledVisiblePosition(position);
        if (!editorDomNode || !mouseBox) {
            return;
        }
        const editorBox = dom.getDomNodePagePosition(editorDomNode);
        return editorBox.top + mouseBox.top - TOP_HEIGHT;
    }
    _availableVerticalSpaceBelow(position) {
        const editorDomNode = this._editor.getDomNode();
        const mouseBox = this._editor.getScrolledVisiblePosition(position);
        if (!editorDomNode || !mouseBox) {
            return;
        }
        const editorBox = dom.getDomNodePagePosition(editorDomNode);
        const bodyBox = dom.getClientArea(editorDomNode.ownerDocument.body);
        const mouseBottom = editorBox.top + mouseBox.top + mouseBox.height;
        return bodyBox.height - mouseBottom - BOTTOM_HEIGHT;
    }
    _findPositionPreference(widgetHeight, showAtPosition) {
        const maxHeightBelow = Math.min(this._availableVerticalSpaceBelow(showAtPosition) ?? Infinity, widgetHeight);
        const maxHeightAbove = Math.min(this._availableVerticalSpaceAbove(showAtPosition) ?? Infinity, widgetHeight);
        const maxHeight = Math.min(Math.max(maxHeightAbove, maxHeightBelow), widgetHeight);
        const height = Math.min(widgetHeight, maxHeight);
        let renderingAbove;
        if (this._editor.getOption(62 /* EditorOption.hover */).above) {
            renderingAbove =
                height <= maxHeightAbove
                    ? 1 /* ContentWidgetPositionPreference.ABOVE */
                    : 2 /* ContentWidgetPositionPreference.BELOW */;
        }
        else {
            renderingAbove =
                height <= maxHeightBelow
                    ? 2 /* ContentWidgetPositionPreference.BELOW */
                    : 1 /* ContentWidgetPositionPreference.ABOVE */;
        }
        if (renderingAbove === 1 /* ContentWidgetPositionPreference.ABOVE */) {
            this._resizableNode.enableSashes(true, true, false, false);
        }
        else {
            this._resizableNode.enableSashes(false, true, true, false);
        }
        return renderingAbove;
    }
    _resize(dimension) {
        this._resizableNode.layout(dimension.height, dimension.width);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzaXphYmxlQ29udGVudFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2hvdmVyL2Jyb3dzZXIvcmVzaXphYmxlQ29udGVudFdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFRakUsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3RFLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFFdEQsTUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFBO0FBQ3JCLE1BQU0sYUFBYSxHQUFHLEVBQUUsQ0FBQTtBQUV4QixNQUFNLE9BQWdCLHNCQUF1QixTQUFRLFVBQVU7SUFTOUQsWUFDb0IsT0FBb0IsRUFDdkMsY0FBOEIsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUM7UUFFdkQsS0FBSyxFQUFFLENBQUE7UUFIWSxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBVC9CLHdCQUFtQixHQUFZLElBQUksQ0FBQTtRQUNuQyxzQkFBaUIsR0FBWSxLQUFLLENBQUE7UUFFeEIsbUJBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksb0JBQW9CLEVBQUUsQ0FBQyxDQUFBO1FBQ3BFLHFCQUFnQixHQUFrQyxJQUFJLENBQUE7UUFFeEQsZ0JBQVcsR0FBWSxLQUFLLENBQUE7UUFPbkMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUE7UUFDdkQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FB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