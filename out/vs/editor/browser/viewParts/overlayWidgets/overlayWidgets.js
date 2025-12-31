/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './overlayWidgets.css';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { PartFingerprints, ViewPart } from '../../view/viewPart.js';
import * as dom from '../../../../base/browser/dom.js';
/*
 * This view part for rendering the overlay widgets, which are
 * floating widgets positioned based on the editor's viewport,
 * such as the find widget.
 */
export class ViewOverlayWidgets extends ViewPart {
    constructor(context, viewDomNode) {
        super(context);
        this._viewDomNode = viewDomNode;
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._widgets = {};
        this._verticalScrollbarWidth = layoutInfo.verticalScrollbarWidth;
        this._minimapWidth = layoutInfo.minimap.minimapWidth;
        this._horizontalScrollbarHeight = layoutInfo.horizontalScrollbarHeight;
        this._editorHeight = layoutInfo.height;
        this._editorWidth = layoutInfo.width;
        this._viewDomNodeRect = { top: 0, left: 0, width: 0, height: 0 };
        this._domNode = createFastDomNode(document.createElement('div'));
        PartFingerprints.write(this._domNode, 4 /* PartFingerprint.OverlayWidgets */);
        this._domNode.setClassName('overlayWidgets');
        this.overflowingOverlayWidgetsDomNode = createFastDomNode(document.createElement('div'));
        PartFingerprints.write(this.overflowingOverlayWidgetsDomNode, 5 /* PartFingerprint.OverflowingOverlayWidgets */);
        this.overflowingOverlayWidgetsDomNode.setClassName('overflowingOverlayWidgets');
    }
    dispose() {
        super.dispose();
        this._widgets = {};
    }
    getDomNode() {
        return this._domNode;
    }
    // ---- begin view event handlers
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._verticalScrollbarWidth = layoutInfo.verticalScrollbarWidth;
        this._minimapWidth = layoutInfo.minimap.minimapWidth;
        this._horizontalScrollbarHeight = layoutInfo.horizontalScrollbarHeight;
        this._editorHeight = layoutInfo.height;
        this._editorWidth = layoutInfo.width;
        return true;
    }
    // ---- end view event handlers
    addWidget(widget) {
        const domNode = createFastDomNode(widget.getDomNode());
        this._widgets[widget.getId()] = {
            widget: widget,
            preference: null,
            domNode: domNode,
        };
        // This is sync because a widget wants to be in the dom
        domNode.setPosition('absolute');
        domNode.setAttribute('widgetId', widget.getId());
        if (widget.allowEditorOverflow) {
            this.overflowingOverlayWidgetsDomNode.appendChild(domNode);
        }
        else {
            this._domNode.appendChild(domNode);
        }
        this.setShouldRender();
        this._updateMaxMinWidth();
    }
    setWidgetPosition(widget, position) {
        const widgetData = this._widgets[widget.getId()];
        const preference = position ? position.preference : null;
        const stack = position?.stackOridinal;
        if (widgetData.preference === preference && widgetData.stack === stack) {
            this._updateMaxMinWidth();
            return false;
        }
        widgetData.preference = preference;
        widgetData.stack = stack;
        this.setShouldRender();
        this._updateMaxMinWidth();
        return true;
    }
    removeWidget(widget) {
        const widgetId = widget.getId();
        if (this._widgets.hasOwnProperty(widgetId)) {
            const widgetData = this._widgets[widgetId];
            const domNode = widgetData.domNode.domNode;
            delete this._widgets[widgetId];
            domNode.remove();
            this.setShouldRender();
            this._updateMaxMinWidth();
        }
    }
    _updateMaxMinWidth() {
        let maxMinWidth = 0;
        const keys = Object.keys(this._widgets);
        for (let i = 0, len = keys.length; i < len; i++) {
            const widgetId = keys[i];
            const widget = this._widgets[widgetId];
            const widgetMinWidthInPx = widget.widget.getMinContentWidthInPx?.();
            if (typeof widgetMinWidthInPx !== 'undefined') {
                maxMinWidth = Math.max(maxMinWidth, widgetMinWidthInPx);
            }
        }
        this._context.viewLayout.setOverlayWidgetsMinWidth(maxMinWidth);
    }
    _renderWidget(widgetData, stackCoordinates) {
        const domNode = widgetData.domNode;
        if (widgetData.preference === null) {
            domNode.setTop('');
            return;
        }
        const maxRight = 2 * this._verticalScrollbarWidth + this._minimapWidth;
        if (widgetData.preference === 0 /* OverlayWidgetPositionPreference.TOP_RIGHT_CORNER */ ||
            widgetData.preference === 1 /* OverlayWidgetPositionPreference.BOTTOM_RIGHT_CORNER */) {
            if (widgetData.preference === 1 /* OverlayWidgetPositionPreference.BOTTOM_RIGHT_CORNER */) {
                const widgetHeight = domNode.domNode.clientHeight;
                domNode.setTop(this._editorHeight - widgetHeight - 2 * this._horizontalScrollbarHeight);
            }
            else {
                domNode.setTop(0);
            }
            if (widgetData.stack !== undefined) {
                domNode.setTop(stackCoordinates[widgetData.preference]);
                stackCoordinates[widgetData.preference] += domNode.domNode.clientWidth;
            }
            else {
                domNode.setRight(maxRight);
            }
        }
        else if (widgetData.preference === 2 /* OverlayWidgetPositionPreference.TOP_CENTER */) {
            domNode.domNode.style.right = '50%';
            if (widgetData.stack !== undefined) {
                domNode.setTop(stackCoordinates[2 /* OverlayWidgetPositionPreference.TOP_CENTER */]);
                stackCoordinates[2 /* OverlayWidgetPositionPreference.TOP_CENTER */] += domNode.domNode.clientHeight;
            }
            else {
                domNode.setTop(0);
            }
        }
        else {
            const { top, left } = widgetData.preference;
            const fixedOverflowWidgets = this._context.configuration.options.get(44 /* EditorOption.fixedOverflowWidgets */);
            if (fixedOverflowWidgets && widgetData.widget.allowEditorOverflow) {
                // top, left are computed relative to the editor and we need them relative to the page
                const editorBoundingBox = this._viewDomNodeRect;
                domNode.setTop(top + editorBoundingBox.top);
                domNode.setLeft(left + editorBoundingBox.left);
                domNode.setPosition('fixed');
            }
            else {
                domNode.setTop(top);
                domNode.setLeft(left);
                domNode.setPosition('absolute');
            }
        }
    }
    prepareRender(ctx) {
        this._viewDomNodeRect = dom.getDomNodePagePosition(this._viewDomNode.domNode);
    }
    render(ctx) {
        this._domNode.setWidth(this._editorWidth);
        const keys = Object.keys(this._widgets);
        const stackCoordinates = Array.from({ length: 2 /* OverlayWidgetPositionPreference.TOP_CENTER */ + 1 }, () => 0);
        keys.sort((a, b) => (this._widgets[a].stack || 0) - (this._widgets[b].stack || 0));
        for (let i = 0, len = keys.length; i < len; i++) {
            const widgetId = keys[i];
            this._renderWidget(this._widgets[widgetId], stackCoordinates);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcmxheVdpZGdldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvb3ZlcmxheVdpZGdldHMvb3ZlcmxheVdpZGdldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxzQkFBc0IsQ0FBQTtBQUM3QixPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQU94RixPQUFPLEVBQW1CLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBS3BGLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFhdEQ7Ozs7R0FJRztBQUNILE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxRQUFRO0lBWS9DLFlBQVksT0FBb0IsRUFBRSxXQUFxQztRQUN0RSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDZCxJQUFJLENBQUMsWUFBWSxHQUFHLFdBQVcsQ0FBQTtRQUUvQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUE7UUFDbkQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsbUNBQXlCLENBQUE7UUFFdkQsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUE7UUFDbEIsSUFBSSxDQUFDLHVCQUF1QixHQUFHLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQTtRQUNoRSxJQUFJLENBQUMsYUFBYSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFBO1FBQ3BELElBQUksQ0FBQywwQkFBMEIsR0FBRyxVQUFVLENBQUMseUJBQXlCLENBQUE7UUFDdEUsSUFBSSxDQUFDLGFBQWEsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFBO1FBQ3RDLElBQUksQ0FBQyxZQUFZLEdBQUcsVUFBVSxDQUFDLEtB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