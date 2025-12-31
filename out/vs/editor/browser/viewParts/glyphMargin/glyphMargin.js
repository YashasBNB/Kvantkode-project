/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { ArrayQueue } from '../../../../base/common/arrays.js';
import './glyphMargin.css';
import { DynamicViewOverlay } from '../../view/dynamicViewOverlay.js';
import { ViewPart } from '../../view/viewPart.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { GlyphMarginLane } from '../../../common/model.js';
/**
 * Represents a decoration that should be shown along the lines from `startLineNumber` to `endLineNumber`.
 * This can end up producing multiple `LineDecorationToRender`.
 */
export class DecorationToRender {
    constructor(startLineNumber, endLineNumber, className, tooltip, zIndex) {
        this.startLineNumber = startLineNumber;
        this.endLineNumber = endLineNumber;
        this.className = className;
        this.tooltip = tooltip;
        this._decorationToRenderBrand = undefined;
        this.zIndex = zIndex ?? 0;
    }
}
/**
 * A decoration that should be shown along a line.
 */
export class LineDecorationToRender {
    constructor(className, zIndex, tooltip) {
        this.className = className;
        this.zIndex = zIndex;
        this.tooltip = tooltip;
    }
}
/**
 * Decorations to render on a visible line.
 */
export class VisibleLineDecorationsToRender {
    constructor() {
        this.decorations = [];
    }
    add(decoration) {
        this.decorations.push(decoration);
    }
    getDecorations() {
        return this.decorations;
    }
}
export class DedupOverlay extends DynamicViewOverlay {
    /**
     * Returns an array with an element for each visible line number.
     */
    _render(visibleStartLineNumber, visibleEndLineNumber, decorations) {
        const output = [];
        for (let lineNumber = visibleStartLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
            const lineIndex = lineNumber - visibleStartLineNumber;
            output[lineIndex] = new VisibleLineDecorationsToRender();
        }
        if (decorations.length === 0) {
            return output;
        }
        // Sort decorations by className, then by startLineNumber and then by endLineNumber
        decorations.sort((a, b) => {
            if (a.className === b.className) {
                if (a.startLineNumber === b.startLineNumber) {
                    return a.endLineNumber - b.endLineNumber;
                }
                return a.startLineNumber - b.startLineNumber;
            }
            return a.className < b.className ? -1 : 1;
        });
        let prevClassName = null;
        let prevEndLineIndex = 0;
        for (let i = 0, len = decorations.length; i < len; i++) {
            const d = decorations[i];
            const className = d.className;
            const zIndex = d.zIndex;
            let startLineIndex = Math.max(d.startLineNumber, visibleStartLineNumber) - visibleStartLineNumber;
            const endLineIndex = Math.min(d.endLineNumber, visibleEndLineNumber) - visibleStartLineNumber;
            if (prevClassName === className) {
                // Here we avoid rendering the same className multiple times on the same line
                startLineIndex = Math.max(prevEndLineIndex + 1, startLineIndex);
                prevEndLineIndex = Math.max(prevEndLineIndex, endLineIndex);
            }
            else {
                prevClassName = className;
                prevEndLineIndex = endLineIndex;
            }
            for (let i = startLineIndex; i <= prevEndLineIndex; i++) {
                output[i].add(new LineDecorationToRender(className, zIndex, d.tooltip));
            }
        }
        return output;
    }
}
export class GlyphMarginWidgets extends ViewPart {
    constructor(context) {
        super(context);
        this._widgets = {};
        this._context = context;
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this.domNode = createFastDomNode(document.createElement('div'));
        this.domNode.setClassName('glyph-margin-widgets');
        this.domNode.setPosition('absolute');
        this.domNode.setTop(0);
        this._lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this._glyphMargin = options.get(59 /* EditorOption.glyphMargin */);
        this._glyphMarginLeft = layoutInfo.glyphMarginLeft;
        this._glyphMarginWidth = layoutInfo.glyphMarginWidth;
        this._glyphMarginDecorationLaneCount = layoutInfo.glyphMarginDecorationLaneCount;
        this._managedDomNodes = [];
        this._decorationGlyphsToRender = [];
    }
    dispose() {
        this._managedDomNodes = [];
        this._decorationGlyphsToRender = [];
        this._widgets = {};
        super.dispose();
    }
    getWidgets() {
        return Object.values(this._widgets);
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this._glyphMargin = options.get(59 /* EditorOption.glyphMargin */);
        this._glyphMarginLeft = layoutInfo.glyphMarginLeft;
        this._glyphMarginWidth = layoutInfo.glyphMarginWidth;
        this._glyphMarginDecorationLaneCount = layoutInfo.glyphMarginDecorationLaneCount;
        return true;
    }
    onDecorationsChanged(e) {
        return true;
    }
    onFlushed(e) {
        return true;
    }
    onLinesChanged(e) {
        return true;
    }
    onLinesDeleted(e) {
        return true;
    }
    onLinesInserted(e) {
        return true;
    }
    onScrollChanged(e) {
        return e.scrollTopChanged;
    }
    onZonesChanged(e) {
        return true;
    }
    // --- end event handlers
    // --- begin widget management
    addWidget(widget) {
        const domNode = createFastDomNode(widget.getDomNode());
        this._widgets[widget.getId()] = {
            widget: widget,
            preference: widget.getPosition(),
            domNode: domNode,
            renderInfo: null,
        };
        domNode.setPosition('absolute');
        domNode.setDisplay('none');
        domNode.setAttribute('widgetId', widget.getId());
        this.domNode.appendChild(domNode);
        this.setShouldRender();
    }
    setWidgetPosition(widget, preference) {
        const myWidget = this._widgets[widget.getId()];
        if (myWidget.preference.lane === preference.lane &&
            myWidget.preference.zIndex === preference.zIndex &&
            Range.equalsRange(myWidget.preference.range, preference.range)) {
            return false;
        }
        myWidget.preference = preference;
        this.setShouldRender();
        return true;
    }
    removeWidget(widget) {
        const widgetId = widget.getId();
        if (this._widgets[widgetId]) {
            const widgetData = this._widgets[widgetId];
            const domNode = widgetData.domNode.domNode;
            delete this._widgets[widgetId];
            domNode.remove();
            this.setShouldRender();
        }
    }
    // --- end widget management
    _collectDecorationBasedGlyphRenderRequest(ctx, requests) {
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        const visibleEndLineNumber = ctx.visibleRange.endLineNumber;
        const decorations = ctx.getDecorationsInViewport();
        for (const d of decorations) {
            const glyphMarginClassName = d.options.glyphMarginClassName;
            if (!glyphMarginClassName) {
                continue;
            }
            const startLineNumber = Math.max(d.range.startLineNumber, visibleStartLineNumber);
            const endLineNumber = Math.min(d.range.endLineNumber, visibleEndLineNumber);
            const lane = d.options.glyphMargin?.position ?? GlyphMarginLane.Center;
            const zIndex = d.options.zIndex ?? 0;
            for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
                const modelPosition = this._context.viewModel.coordinatesConverter.convertViewPositionToModelPosition(new Position(lineNumber, 0));
                const laneIndex = this._context.viewModel.glyphLanes
                    .getLanesAtLine(modelPosition.lineNumber)
                    .indexOf(lane);
                requests.push(new DecorationBasedGlyphRenderRequest(lineNumber, laneIndex, zIndex, glyphMarginClassName));
            }
        }
    }
    _collectWidgetBasedGlyphRenderRequest(ctx, requests) {
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        const visibleEndLineNumber = ctx.visibleRange.endLineNumber;
        for (const widget of Object.values(this._widgets)) {
            const range = widget.preference.range;
            const { startLineNumber, endLineNumber } = this._context.viewModel.coordinatesConverter.convertModelRangeToViewRange(Range.lift(range));
            if (!startLineNumber ||
                !endLineNumber ||
                endLineNumber < visibleStartLineNumber ||
                startLineNumber > visibleEndLineNumber) {
                // The widget is not in the viewport
                continue;
            }
            // The widget is in the viewport, find a good line for it
            const widgetLineNumber = Math.max(startLineNumber, visibleStartLineNumber);
            const modelPosition = this._context.viewModel.coordinatesConverter.convertViewPositionToModelPosition(new Position(widgetLineNumber, 0));
            const laneIndex = this._context.viewModel.glyphLanes
                .getLanesAtLine(modelPosition.lineNumber)
                .indexOf(widget.preference.lane);
            requests.push(new WidgetBasedGlyphRenderRequest(widgetLineNumber, laneIndex, widget.preference.zIndex, widget));
        }
    }
    _collectSortedGlyphRenderRequests(ctx) {
        const requests = [];
        this._collectDecorationBasedGlyphRenderRequest(ctx, requests);
        this._collectWidgetBasedGlyphRenderRequest(ctx, requests);
        // sort requests by lineNumber ASC, lane  ASC, zIndex DESC, type DESC (widgets first), className ASC
        // don't change this sort unless you understand `prepareRender` below.
        requests.sort((a, b) => {
            if (a.lineNumber === b.lineNumber) {
                if (a.laneIndex === b.laneIndex) {
                    if (a.zIndex === b.zIndex) {
                        if (b.type === a.type) {
                            if (a.type === 0 /* GlyphRenderRequestType.Decoration */ &&
                                b.type === 0 /* GlyphRenderRequestType.Decoration */) {
                                return a.className < b.className ? -1 : 1;
                            }
                            return 0;
                        }
                        return b.type - a.type;
                    }
                    return b.zIndex - a.zIndex;
                }
                return a.laneIndex - b.laneIndex;
            }
            return a.lineNumber - b.lineNumber;
        });
        return requests;
    }
    /**
     * Will store render information in each widget's renderInfo and in `_decorationGlyphsToRender`.
     */
    prepareRender(ctx) {
        if (!this._glyphMargin) {
            this._decorationGlyphsToRender = [];
            return;
        }
        for (const widget of Object.values(this._widgets)) {
            widget.renderInfo = null;
        }
        const requests = new ArrayQueue(this._collectSortedGlyphRenderRequests(ctx));
        const decorationGlyphsToRender = [];
        while (requests.length > 0) {
            const first = requests.peek();
            if (!first) {
                // not possible
                break;
            }
            // Requests are sorted by lineNumber and lane, so we read all requests for this particular location
            const requestsAtLocation = requests.takeWhile((el) => el.lineNumber === first.lineNumber && el.laneIndex === first.laneIndex);
            if (!requestsAtLocation || requestsAtLocation.length === 0) {
                // not possible
                break;
            }
            const winner = requestsAtLocation[0];
            if (winner.type === 0 /* GlyphRenderRequestType.Decoration */) {
                // combine all decorations with the same z-index
                const classNames = [];
                // requests are sorted by zIndex, type, and className so we can dedup className by looking at the previous one
                for (const request of requestsAtLocation) {
                    if (request.zIndex !== winner.zIndex || request.type !== winner.type) {
                        break;
                    }
                    if (classNames.length === 0 || classNames[classNames.length - 1] !== request.className) {
                        classNames.push(request.className);
                    }
                }
                decorationGlyphsToRender.push(winner.accept(classNames.join(' '))); // TODO@joyceerhl Implement overflow for remaining decorations
            }
            else {
                // widgets cannot be combined
                winner.widget.renderInfo = {
                    lineNumber: winner.lineNumber,
                    laneIndex: winner.laneIndex,
                };
            }
        }
        this._decorationGlyphsToRender = decorationGlyphsToRender;
    }
    render(ctx) {
        if (!this._glyphMargin) {
            for (const widget of Object.values(this._widgets)) {
                widget.domNode.setDisplay('none');
            }
            while (this._managedDomNodes.length > 0) {
                const domNode = this._managedDomNodes.pop();
                domNode?.domNode.remove();
            }
            return;
        }
        const width = Math.round(this._glyphMarginWidth / this._glyphMarginDecorationLaneCount);
        // Render widgets
        for (const widget of Object.values(this._widgets)) {
            if (!widget.renderInfo) {
                // this widget is not visible
                widget.domNode.setDisplay('none');
            }
            else {
                const top = ctx.viewportData.relativeVerticalOffset[widget.renderInfo.lineNumber - ctx.viewportData.startLineNumber];
                const left = this._glyphMarginLeft + widget.renderInfo.laneIndex * this._lineHeight;
                widget.domNode.setDisplay('block');
                widget.domNode.setTop(top);
                widget.domNode.setLeft(left);
                widget.domNode.setWidth(width);
                widget.domNode.setHeight(this._lineHeight);
            }
        }
        // Render decorations, reusing previous dom nodes as possible
        for (let i = 0; i < this._decorationGlyphsToRender.length; i++) {
            const dec = this._decorationGlyphsToRender[i];
            const top = ctx.viewportData.relativeVerticalOffset[dec.lineNumber - ctx.viewportData.startLineNumber];
            const left = this._glyphMarginLeft + dec.laneIndex * this._lineHeight;
            let domNode;
            if (i < this._managedDomNodes.length) {
                domNode = this._managedDomNodes[i];
            }
            else {
                domNode = createFastDomNode(document.createElement('div'));
                this._managedDomNodes.push(domNode);
                this.domNode.appendChild(domNode);
            }
            domNode.setClassName(`cgmr codicon ` + dec.combinedClassName);
            domNode.setPosition(`absolute`);
            domNode.setTop(top);
            domNode.setLeft(left);
            domNode.setWidth(width);
            domNode.setHeight(this._lineHeight);
        }
        // remove extra dom nodes
        while (this._managedDomNodes.length > this._decorationGlyphsToRender.length) {
            const domNode = this._managedDomNodes.pop();
            domNode?.domNode.remove();
        }
    }
}
var GlyphRenderRequestType;
(function (GlyphRenderRequestType) {
    GlyphRenderRequestType[GlyphRenderRequestType["Decoration"] = 0] = "Decoration";
    GlyphRenderRequestType[GlyphRenderRequestType["Widget"] = 1] = "Widget";
})(GlyphRenderRequestType || (GlyphRenderRequestType = {}));
/**
 * A request to render a decoration in the glyph margin at a certain location.
 */
class DecorationBasedGlyphRenderRequest {
    constructor(lineNumber, laneIndex, zIndex, className) {
        this.lineNumber = lineNumber;
        this.laneIndex = laneIndex;
        this.zIndex = zIndex;
        this.className = className;
        this.type = 0 /* GlyphRenderRequestType.Decoration */;
    }
    accept(combinedClassName) {
        return new DecorationBasedGlyph(this.lineNumber, this.laneIndex, combinedClassName);
    }
}
/**
 * A request to render a widget in the glyph margin at a certain location.
 */
class WidgetBasedGlyphRenderRequest {
    constructor(lineNumber, laneIndex, zIndex, widget) {
        this.lineNumber = lineNumber;
        this.laneIndex = laneIndex;
        this.zIndex = zIndex;
        this.widget = widget;
        this.type = 1 /* GlyphRenderRequestType.Widget */;
    }
}
class DecorationBasedGlyph {
    constructor(lineNumber, laneIndex, combinedClassName) {
        this.lineNumber = lineNumber;
        this.laneIndex = laneIndex;
        this.combinedClassName = combinedClassName;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2x5cGhNYXJnaW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvZ2x5cGhNYXJnaW4vZ2x5cGhNYXJnaW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDeEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sbUJBQW1CLENBQUE7QUFFMUIsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRWpELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBSTFEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxrQkFBa0I7SUFLOUIsWUFDaUIsZUFBdUIsRUFDdkIsYUFBcUIsRUFDckIsU0FBaUIsRUFDakIsT0FBc0IsRUFDdEMsTUFBMEI7UUFKVixvQkFBZSxHQUFmLGVBQWUsQ0FBUTtRQUN2QixrQkFBYSxHQUFiLGFBQWEsQ0FBUTtRQUNyQixjQUFTLEdBQVQsU0FBUyxDQUFRO1FBQ2pCLFlBQU8sR0FBUCxPQUFPLENBQWU7UUFSdkIsNkJBQXdCLEdBQVMsU0FBUyxDQUFBO1FBV3pELElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsQ0FBQTtJQUMxQixDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxzQkFBc0I7SUFDbEMsWUFDaUIsU0FBaUIsRUFDakIsTUFBYyxFQUNkLE9BQXNC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