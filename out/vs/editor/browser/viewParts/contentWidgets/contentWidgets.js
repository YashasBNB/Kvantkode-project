/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { PartFingerprints, ViewPart } from '../../view/viewPart.js';
/**
 * This view part is responsible for rendering the content widgets, which are
 * used for rendering elements that are associated to an editor position,
 * such as suggestions or the parameter hints.
 */
export class ViewContentWidgets extends ViewPart {
    constructor(context, viewDomNode) {
        super(context);
        this._viewDomNode = viewDomNode;
        this._widgets = {};
        this.domNode = createFastDomNode(document.createElement('div'));
        PartFingerprints.write(this.domNode, 1 /* PartFingerprint.ContentWidgets */);
        this.domNode.setClassName('contentWidgets');
        this.domNode.setPosition('absolute');
        this.domNode.setTop(0);
        this.overflowingContentWidgetsDomNode = createFastDomNode(document.createElement('div'));
        PartFingerprints.write(this.overflowingContentWidgetsDomNode, 2 /* PartFingerprint.OverflowingContentWidgets */);
        this.overflowingContentWidgetsDomNode.setClassName('overflowingContentWidgets');
    }
    dispose() {
        super.dispose();
        this._widgets = {};
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        const keys = Object.keys(this._widgets);
        for (const widgetId of keys) {
            this._widgets[widgetId].onConfigurationChanged(e);
        }
        return true;
    }
    onDecorationsChanged(e) {
        // true for inline decorations that can end up relayouting text
        return true;
    }
    onFlushed(e) {
        return true;
    }
    onLineMappingChanged(e) {
        this._updateAnchorsViewPositions();
        return true;
    }
    onLinesChanged(e) {
        this._updateAnchorsViewPositions();
        return true;
    }
    onLinesDeleted(e) {
        this._updateAnchorsViewPositions();
        return true;
    }
    onLinesInserted(e) {
        this._updateAnchorsViewPositions();
        return true;
    }
    onScrollChanged(e) {
        return true;
    }
    onZonesChanged(e) {
        return true;
    }
    // ---- end view event handlers
    _updateAnchorsViewPositions() {
        const keys = Object.keys(this._widgets);
        for (const widgetId of keys) {
            this._widgets[widgetId].updateAnchorViewPosition();
        }
    }
    addWidget(_widget) {
        const myWidget = new Widget(this._context, this._viewDomNode, _widget);
        this._widgets[myWidget.id] = myWidget;
        if (myWidget.allowEditorOverflow) {
            this.overflowingContentWidgetsDomNode.appendChild(myWidget.domNode);
        }
        else {
            this.domNode.appendChild(myWidget.domNode);
        }
        this.setShouldRender();
    }
    setWidgetPosition(widget, primaryAnchor, secondaryAnchor, preference, affinity) {
        const myWidget = this._widgets[widget.getId()];
        myWidget.setPosition(primaryAnchor, secondaryAnchor, preference, affinity);
        this.setShouldRender();
    }
    removeWidget(widget) {
        const widgetId = widget.getId();
        if (this._widgets.hasOwnProperty(widgetId)) {
            const myWidget = this._widgets[widgetId];
            delete this._widgets[widgetId];
            const domNode = myWidget.domNode.domNode;
            domNode.remove();
            domNode.removeAttribute('monaco-visible-content-widget');
            this.setShouldRender();
        }
    }
    shouldSuppressMouseDownOnWidget(widgetId) {
        if (this._widgets.hasOwnProperty(widgetId)) {
            return this._widgets[widgetId].suppressMouseDown;
        }
        return false;
    }
    onBeforeRender(viewportData) {
        const keys = Object.keys(this._widgets);
        for (const widgetId of keys) {
            this._widgets[widgetId].onBeforeRender(viewportData);
        }
    }
    prepareRender(ctx) {
        const keys = Object.keys(this._widgets);
        for (const widgetId of keys) {
            this._widgets[widgetId].prepareRender(ctx);
        }
    }
    render(ctx) {
        const keys = Object.keys(this._widgets);
        for (const widgetId of keys) {
            this._widgets[widgetId].render(ctx);
        }
    }
}
class Widget {
    constructor(context, viewDomNode, actual) {
        this._primaryAnchor = new PositionPair(null, null);
        this._secondaryAnchor = new PositionPair(null, null);
        this._context = context;
        this._viewDomNode = viewDomNode;
        this._actual = actual;
        this.domNode = createFastDomNode(this._actual.getDomNode());
        this.id = this._actual.getId();
        this.allowEditorOverflow = this._actual.allowEditorOverflow || false;
        this.suppressMouseDown = this._actual.suppressMouseDown || false;
        const options = this._context.configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        this._fixedOverflowWidgets = options.get(44 /* EditorOption.fixedOverflowWidgets */);
        this._contentWidth = layoutInfo.contentWidth;
        this._contentLeft = layoutInfo.contentLeft;
        this._lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this._affinity = null;
        this._preference = [];
        this._cachedDomNodeOffsetWidth = -1;
        this._cachedDomNodeOffsetHeight = -1;
        this._maxWidth = this._getMaxWidth();
        this._isVisible = false;
        this._renderData = null;
        this.domNode.setPosition(this._fixedOverflowWidgets && this.allowEditorOverflow ? 'fixed' : 'absolute');
        this.domNode.setDisplay('none');
        this.domNode.setVisibility('hidden');
        this.domNode.setAttribute('widgetId', this.id);
        this.domNode.setMaxWidth(this._maxWidth);
    }
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        this._lineHeight = options.get(68 /* EditorOption.lineHeight */);
        if (e.hasChanged(151 /* EditorOption.layoutInfo */)) {
            const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
            this._contentLeft = layoutInfo.contentLeft;
            this._contentWidth = layoutInfo.contentWidth;
            this._maxWidth = this._getMaxWidth();
        }
    }
    updateAnchorViewPosition() {
        this._setPosition(this._affinity, this._primaryAnchor.modelPosition, this._secondaryAnchor.modelPosition);
    }
    _setPosition(affinity, primaryAnchor, secondaryAnchor) {
        this._affinity = affinity;
        this._primaryAnchor = getValidPositionPair(primaryAnchor, this._context.viewModel, this._affinity);
        this._secondaryAnchor = getValidPositionPair(secondaryAnchor, this._context.viewModel, this._affinity);
        function getValidPositionPair(position, viewModel, affinity) {
            if (!position) {
                return new PositionPair(null, null);
            }
            // Do not trust that widgets give a valid position
            const validModelPosition = viewModel.model.validatePosition(position);
            if (viewModel.coordinatesConverter.modelPositionIsVisible(validModelPosition)) {
                const viewPosition = viewModel.coordinatesConverter.convertModelPositionToViewPosition(validModelPosition, affinity ?? undefined);
                return new PositionPair(position, viewPosition);
            }
            return new PositionPair(position, null);
        }
    }
    _getMaxWidth() {
        const elDocument = this.domNode.domNode.ownerDocument;
        const elWindow = elDocument.defaultView;
        return this.allowEditorOverflow
            ? elWindow?.innerWidth ||
                elDocument.documentElement.offsetWidth ||
                elDocument.body.offsetWidth
            : this._contentWidth;
    }
    setPosition(primaryAnchor, secondaryAnchor, preference, affinity) {
        this._setPosition(affinity, primaryAnchor, secondaryAnchor);
        this._preference = preference;
        if (this._primaryAnchor.viewPosition && this._preference && this._preference.length > 0) {
            // this content widget would like to be visible if possible
            // we change it from `display:none` to `display:block` even if it
            // might be outside the viewport such that we can measure its size
            // in `prepareRender`
            this.domNode.setDisplay('block');
        }
        else {
            this.domNode.setDisplay('none');
        }
        this._cachedDomNodeOffsetWidth = -1;
        this._cachedDomNodeOffsetHeight = -1;
    }
    _layoutBoxInViewport(anchor, width, height, ctx) {
        // Our visible box is split horizontally by the current line => 2 boxes
        // a) the box above the line
        const aboveLineTop = anchor.top;
        const heightAvailableAboveLine = aboveLineTop;
        // b) the box under the line
        const underLineTop = anchor.top + anchor.height;
        const heightAvailableUnderLine = ctx.viewportHeight - underLineTop;
        const aboveTop = aboveLineTop - height;
        const fitsAbove = heightAvailableAboveLine >= height;
        const belowTop = underLineTop;
        const fitsBelow = heightAvailableUnderLine >= height;
        // And its left
        let left = anchor.left;
        if (left + width > ctx.scrollLeft + ctx.viewportWidth) {
            left = ctx.scrollLeft + ctx.viewportWidth - width;
        }
        if (left < ctx.scrollLeft) {
            left = ctx.scrollLeft;
        }
        return { fitsAbove, aboveTop, fitsBelow, belowTop, left };
    }
    _layoutHorizontalSegmentInPage(windowSize, domNodePosition, left, width) {
        // Leave some clearance to the left/right
        const LEFT_PADDING = 15;
        const RIGHT_PADDING = 15;
        // Initially, the limits are defined as the dom node limits
        const MIN_LIMIT = Math.max(LEFT_PADDING, domNodePosition.left - width);
        const MAX_LIMIT = Math.min(domNodePosition.left + domNodePosition.width + width, windowSize.width - RIGHT_PADDING);
        const elDocument = this._viewDomNode.domNode.ownerDocument;
        const elWindow = elDocument.defaultView;
        let absoluteLeft = domNodePosition.left + left - (elWindow?.scrollX ?? 0);
        if (absoluteLeft + width > MAX_LIMIT) {
            const delta = absoluteLeft - (MAX_LIMIT - width);
            absoluteLeft -= delta;
            left -= delta;
        }
        if (absoluteLeft < MIN_LIMIT) {
            const delta = absoluteLeft - MIN_LIMIT;
            absoluteLeft -= delta;
            left -= delta;
        }
        return [left, absoluteLeft];
    }
    _layoutBoxInPage(anchor, width, height, ctx) {
        const aboveTop = anchor.top - height;
        const belowTop = anchor.top + anchor.height;
        const domNodePosition = dom.getDomNodePagePosition(this._viewDomNode.domNode);
        const elDocument = this._viewDomNode.domNode.ownerDocument;
        const elWindow = elDocument.defaultView;
        const absoluteAboveTop = domNodePosition.top + aboveTop - (elWindow?.scrollY ?? 0);
        const absoluteBelowTop = domNodePosition.top + belowTop - (elWindow?.scrollY ?? 0);
        const windowSize = dom.getClientArea(elDocument.body);
        const [left, absoluteAboveLeft] = this._layoutHorizontalSegmentInPage(windowSize, domNodePosition, anchor.left - ctx.scrollLeft + this._contentLeft, width);
        // Leave some clearance to the top/bottom
        const TOP_PADDING = 22;
        const BOTTOM_PADDING = 22;
        const fitsAbove = absoluteAboveTop >= TOP_PADDING;
        const fitsBelow = absoluteBelowTop + height <= windowSize.height - BOTTOM_PADDING;
        if (this._fixedOverflowWidgets) {
            return {
                fitsAbove,
                aboveTop: Math.max(absoluteAboveTop, TOP_PADDING),
                fitsBelow,
                belowTop: absoluteBelowTop,
                left: absoluteAboveLeft,
            };
        }
        return { fitsAbove, aboveTop, fitsBelow, belowTop, left };
    }
    _prepareRenderWidgetAtExactPositionOverflowing(topLeft) {
        return new Coordinate(topLeft.top, topLeft.left + this._contentLeft);
    }
    /**
     * Compute the coordinates above and below the primary and secondary anchors.
     * The content widget *must* touch the primary anchor.
     * The content widget should touch if possible the secondary anchor.
     */
    _getAnchorsCoordinates(ctx) {
        const primary = getCoordinates(this._primaryAnchor.viewPosition, this._affinity, this._lineHeight);
        const secondaryViewPosition = this._secondaryAnchor.viewPosition?.lineNumber ===
            this._primaryAnchor.viewPosition?.lineNumber
            ? this._secondaryAnchor.viewPosition
            : null;
        const secondary = getCoordinates(secondaryViewPosition, this._affinity, this._lineHeight);
        return { primary, secondary };
        function getCoordinates(position, affinity, lineHeight) {
            if (!position) {
                return null;
            }
            const horizontalPosition = ctx.visibleRangeForPosition(position);
            if (!horizontalPosition) {
                return null;
            }
            // Left-align widgets that should appear :before content
            const left = position.column === 1 && affinity === 3 /* PositionAffinity.LeftOfInjectedText */
                ? 0
                : horizontalPosition.left;
            const top = ctx.getVerticalOffsetForLineNumber(position.lineNumber) - ctx.scrollTop;
            return new AnchorCoordinate(top, left, lineHeight);
        }
    }
    _reduceAnchorCoordinates(primary, secondary, width) {
        if (!secondary) {
            return primary;
        }
        const fontInfo = this._context.configuration.options.get(52 /* EditorOption.fontInfo */);
        let left = secondary.left;
        if (left < primary.left) {
            left = Math.max(left, primary.left - width + fontInfo.typicalFullwidthCharacterWidth);
        }
        else {
            left = Math.min(left, primary.left + width - fontInfo.typicalFullwidthCharacterWidth);
        }
        return new AnchorCoordinate(primary.top, left, primary.height);
    }
    _prepareRenderWidget(ctx) {
        if (!this._preference || this._preference.length === 0) {
            return null;
        }
        const { primary, secondary } = this._getAnchorsCoordinates(ctx);
        if (!primary) {
            return {
                kind: 'offViewport',
                preserveFocus: this.domNode.domNode.contains(this.domNode.domNode.ownerDocument.activeElement),
            };
            // return null;
        }
        if (this._cachedDomNodeOffsetWidth === -1 || this._cachedDomNodeOffsetHeight === -1) {
            let preferredDimensions = null;
            if (typeof this._actual.beforeRender === 'function') {
                preferredDimensions = safeInvoke(this._actual.beforeRender, this._actual);
            }
            if (preferredDimensions) {
                this._cachedDomNodeOffsetWidth = preferredDimensions.width;
                this._cachedDomNodeOffsetHeight = preferredDimensions.height;
            }
            else {
                const domNode = this.domNode.domNode;
                const clientRect = domNode.getBoundingClientRect();
                this._cachedDomNodeOffsetWidth = Math.round(clientRect.width);
                this._cachedDomNodeOffsetHeight = Math.round(clientRect.height);
            }
        }
        const anchor = this._reduceAnchorCoordinates(primary, secondary, this._cachedDomNodeOffsetWidth);
        let placement;
        if (this.allowEditorOverflow) {
            placement = this._layoutBoxInPage(anchor, this._cachedDomNodeOffsetWidth, this._cachedDomNodeOffsetHeight, ctx);
        }
        else {
            placement = this._layoutBoxInViewport(anchor, this._cachedDomNodeOffsetWidth, this._cachedDomNodeOffsetHeight, ctx);
        }
        // Do two passes, first for perfect fit, second picks first option
        for (let pass = 1; pass <= 2; pass++) {
            for (const pref of this._preference) {
                // placement
                if (pref === 1 /* ContentWidgetPositionPreference.ABOVE */) {
                    if (!placement) {
                        // Widget outside of viewport
                        return null;
                    }
                    if (pass === 2 || placement.fitsAbove) {
                        return {
                            kind: 'inViewport',
                            coordinate: new Coordinate(placement.aboveTop, placement.left),
                            position: 1 /* ContentWidgetPositionPreference.ABOVE */,
                        };
                    }
                }
                else if (pref === 2 /* ContentWidgetPositionPreference.BELOW */) {
                    if (!placement) {
                        // Widget outside of viewport
                        return null;
                    }
                    if (pass === 2 || placement.fitsBelow) {
                        return {
                            kind: 'inViewport',
                            coordinate: new Coordinate(placement.belowTop, placement.left),
                            position: 2 /* ContentWidgetPositionPreference.BELOW */,
                        };
                    }
                }
                else {
                    if (this.allowEditorOverflow) {
                        return {
                            kind: 'inViewport',
                            coordinate: this._prepareRenderWidgetAtExactPositionOverflowing(new Coordinate(anchor.top, anchor.left)),
                            position: 0 /* ContentWidgetPositionPreference.EXACT */,
                        };
                    }
                    else {
                        return {
                            kind: 'inViewport',
                            coordinate: new Coordinate(anchor.top, anchor.left),
                            position: 0 /* ContentWidgetPositionPreference.EXACT */,
                        };
                    }
                }
            }
        }
        return null;
    }
    /**
     * On this first pass, we ensure that the content widget (if it is in the viewport) has the max width set correctly.
     */
    onBeforeRender(viewportData) {
        if (!this._primaryAnchor.viewPosition || !this._preference) {
            return;
        }
        if (this._primaryAnchor.viewPosition.lineNumber < viewportData.startLineNumber ||
            this._primaryAnchor.viewPosition.lineNumber > viewportData.endLineNumber) {
            // Outside of viewport
            return;
        }
        this.domNode.setMaxWidth(this._maxWidth);
    }
    prepareRender(ctx) {
        this._renderData = this._prepareRenderWidget(ctx);
    }
    render(ctx) {
        if (!this._renderData || this._renderData.kind === 'offViewport') {
            // This widget should be invisible
            if (this._isVisible) {
                this.domNode.removeAttribute('monaco-visible-content-widget');
                this._isVisible = false;
                if (this._renderData?.kind === 'offViewport' && this._renderData.preserveFocus) {
                    // widget wants to be shown, but it is outside of the viewport and it
                    // has focus which we need to preserve
                    this.domNode.setTop(-1000);
                }
                else {
                    this.domNode.setVisibility('hidden');
                }
            }
            if (typeof this._actual.afterRender === 'function') {
                safeInvoke(this._actual.afterRender, this._actual, null, null);
            }
            return;
        }
        // This widget should be visible
        if (this.allowEditorOverflow) {
            this.domNode.setTop(this._renderData.coordinate.top);
            this.domNode.setLeft(this._renderData.coordinate.left);
        }
        else {
            this.domNode.setTop(this._renderData.coordinate.top + ctx.scrollTop - ctx.bigNumbersDelta);
            this.domNode.setLeft(this._renderData.coordinate.left);
        }
        if (!this._isVisible) {
            this.domNode.setVisibility('inherit');
            this.domNode.setAttribute('monaco-visible-content-widget', 'true');
            this._isVisible = true;
        }
        if (typeof this._actual.afterRender === 'function') {
            safeInvoke(this._actual.afterRender, this._actual, this._renderData.position, this._renderData.coordinate);
        }
    }
}
class PositionPair {
    constructor(modelPosition, viewPosition) {
        this.modelPosition = modelPosition;
        this.viewPosition = viewPosition;
    }
}
class Coordinate {
    constructor(top, left) {
        this.top = top;
        this.left = left;
        this._coordinateBrand = undefined;
    }
}
class AnchorCoordinate {
    constructor(top, left, height) {
        this.top = top;
        this.left = left;
        this.height = height;
        this._anchorCoordinateBrand = undefined;
    }
}
function safeInvoke(fn, thisArg, ...args) {
    try {
        return fn.call(thisArg, ...args);
    }
    catch {
        // ignore
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudFdpZGdldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvY29udGVudFdpZGdldHMvY29udGVudFdpZGdldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQU14RixPQUFPLEVBQW1CLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBV3BGOzs7O0dBSUc7QUFDSCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsUUFBUTtJQU8vQyxZQUFZLE9BQW9CLEVBQUUsV0FBcUM7UUFDdEUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ2QsSUFBSSxDQUFDLFlBQVksR0FBRyxXQUFXLENBQUE7UUFDL0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUE7UUFFbEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDL0QsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLHlDQUFpQyxDQUFBO1FBQ3BFLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDM0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDcEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFdEIsSUFBSSxDQUFDLGdDQUFnQyxHQUFHLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUN4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