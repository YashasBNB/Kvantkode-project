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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2x5cGhNYXJnaW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy9nbHlwaE1hcmdpbi9nbHlwaE1hcmdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxtQkFBbUIsQ0FBQTtBQUUxQixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFJMUQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGtCQUFrQjtJQUs5QixZQUNpQixlQUF1QixFQUN2QixhQUFxQixFQUNyQixTQUFpQixFQUNqQixPQUFzQixFQUN0QyxNQUEwQjtRQUpWLG9CQUFlLEdBQWYsZUFBZSxDQUFRO1FBQ3ZCLGtCQUFhLEdBQWIsYUFBYSxDQUFRO1FBQ3JCLGNBQVMsR0FBVCxTQUFTLENBQVE7UUFDakIsWUFBTyxHQUFQLE9BQU8sQ0FBZTtRQVJ2Qiw2QkFBd0IsR0FBUyxTQUFTLENBQUE7UUFXekQsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxDQUFBO0lBQzFCLENBQUM7Q0FDRDtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHNCQUFzQjtJQUNsQyxZQUNpQixTQUFpQixFQUNqQixNQUFjLEVBQ2Qs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