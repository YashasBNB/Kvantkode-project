/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MOUSE_CURSOR_TEXT_CSS_CLASS_NAME } from '../../../../base/browser/ui/mouseCursor/mouseCursor.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import * as platform from '../../../../base/common/platform.js';
import './viewLines.css';
import { applyFontInfo } from '../../config/domFontInfo.js';
import { HorizontalPosition, HorizontalRange, LineVisibleRanges, } from '../../view/renderingContext.js';
import { VisibleLinesCollection } from '../../view/viewLayer.js';
import { PartFingerprints, ViewPart } from '../../view/viewPart.js';
import { DomReadingContext } from './domReadingContext.js';
import { ViewLine } from './viewLine.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { ViewLineOptions } from './viewLineOptions.js';
class LastRenderedData {
    constructor() {
        this._currentVisibleRange = new Range(1, 1, 1, 1);
    }
    getCurrentVisibleRange() {
        return this._currentVisibleRange;
    }
    setCurrentVisibleRange(currentVisibleRange) {
        this._currentVisibleRange = currentVisibleRange;
    }
}
class HorizontalRevealRangeRequest {
    constructor(minimalReveal, lineNumber, startColumn, endColumn, startScrollTop, stopScrollTop, scrollType) {
        this.minimalReveal = minimalReveal;
        this.lineNumber = lineNumber;
        this.startColumn = startColumn;
        this.endColumn = endColumn;
        this.startScrollTop = startScrollTop;
        this.stopScrollTop = stopScrollTop;
        this.scrollType = scrollType;
        this.type = 'range';
        this.minLineNumber = lineNumber;
        this.maxLineNumber = lineNumber;
    }
}
class HorizontalRevealSelectionsRequest {
    constructor(minimalReveal, selections, startScrollTop, stopScrollTop, scrollType) {
        this.minimalReveal = minimalReveal;
        this.selections = selections;
        this.startScrollTop = startScrollTop;
        this.stopScrollTop = stopScrollTop;
        this.scrollType = scrollType;
        this.type = 'selections';
        let minLineNumber = selections[0].startLineNumber;
        let maxLineNumber = selections[0].endLineNumber;
        for (let i = 1, len = selections.length; i < len; i++) {
            const selection = selections[i];
            minLineNumber = Math.min(minLineNumber, selection.startLineNumber);
            maxLineNumber = Math.max(maxLineNumber, selection.endLineNumber);
        }
        this.minLineNumber = minLineNumber;
        this.maxLineNumber = maxLineNumber;
    }
}
/**
 * The view lines part is responsible for rendering the actual content of a
 * file.
 */
export class ViewLines extends ViewPart {
    /**
     * Adds this amount of pixels to the right of lines (no-one wants to type near the edge of the viewport)
     */
    static { this.HORIZONTAL_EXTRA_PX = 30; }
    constructor(context, viewGpuContext, linesContent) {
        super(context);
        const conf = this._context.configuration;
        const options = this._context.configuration.options;
        const fontInfo = options.get(52 /* EditorOption.fontInfo */);
        const wrappingInfo = options.get(152 /* EditorOption.wrappingInfo */);
        this._lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this._typicalHalfwidthCharacterWidth = fontInfo.typicalHalfwidthCharacterWidth;
        this._isViewportWrapping = wrappingInfo.isViewportWrapping;
        this._revealHorizontalRightPadding = options.get(105 /* EditorOption.revealHorizontalRightPadding */);
        this._cursorSurroundingLines = options.get(29 /* EditorOption.cursorSurroundingLines */);
        this._cursorSurroundingLinesStyle = options.get(30 /* EditorOption.cursorSurroundingLinesStyle */);
        this._canUseLayerHinting = !options.get(32 /* EditorOption.disableLayerHinting */);
        this._viewLineOptions = new ViewLineOptions(conf, this._context.theme.type);
        this._linesContent = linesContent;
        this._textRangeRestingSpot = document.createElement('div');
        this._visibleLines = new VisibleLinesCollection({
            createLine: () => new ViewLine(viewGpuContext, this._viewLineOptions),
        });
        this.domNode = this._visibleLines.domNode;
        PartFingerprints.write(this.domNode, 8 /* PartFingerprint.ViewLines */);
        this.domNode.setClassName(`view-lines ${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME}`);
        applyFontInfo(this.domNode, fontInfo);
        // --- width & height
        this._maxLineWidth = 0;
        this._asyncUpdateLineWidths = new RunOnceScheduler(() => {
            this._updateLineWidthsSlow();
        }, 200);
        this._asyncCheckMonospaceFontAssumptions = new RunOnceScheduler(() => {
            this._checkMonospaceFontAssumptions();
        }, 2000);
        this._lastRenderedData = new LastRenderedData();
        this._horizontalRevealRequest = null;
        // sticky scroll widget
        this._stickyScrollEnabled = options.get(120 /* EditorOption.stickyScroll */).enabled;
        this._maxNumberStickyLines = options.get(120 /* EditorOption.stickyScroll */).maxLineCount;
    }
    dispose() {
        this._asyncUpdateLineWidths.dispose();
        this._asyncCheckMonospaceFontAssumptions.dispose();
        super.dispose();
    }
    getDomNode() {
        return this.domNode;
    }
    // ---- begin view event handlers
    onConfigurationChanged(e) {
        this._visibleLines.onConfigurationChanged(e);
        if (e.hasChanged(152 /* EditorOption.wrappingInfo */)) {
            this._maxLineWidth = 0;
        }
        const options = this._context.configuration.options;
        const fontInfo = options.get(52 /* EditorOption.fontInfo */);
        const wrappingInfo = options.get(152 /* EditorOption.wrappingInfo */);
        this._lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this._typicalHalfwidthCharacterWidth = fontInfo.typicalHalfwidthCharacterWidth;
        this._isViewportWrapping = wrappingInfo.isViewportWrapping;
        this._revealHorizontalRightPadding = options.get(105 /* EditorOption.revealHorizontalRightPadding */);
        this._cursorSurroundingLines = options.get(29 /* EditorOption.cursorSurroundingLines */);
        this._cursorSurroundingLinesStyle = options.get(30 /* EditorOption.cursorSurroundingLinesStyle */);
        this._canUseLayerHinting = !options.get(32 /* EditorOption.disableLayerHinting */);
        // sticky scroll
        this._stickyScrollEnabled = options.get(120 /* EditorOption.stickyScroll */).enabled;
        this._maxNumberStickyLines = options.get(120 /* EditorOption.stickyScroll */).maxLineCount;
        applyFontInfo(this.domNode, fontInfo);
        this._onOptionsMaybeChanged();
        if (e.hasChanged(151 /* EditorOption.layoutInfo */)) {
            this._maxLineWidth = 0;
        }
        return true;
    }
    _onOptionsMaybeChanged() {
        const conf = this._context.configuration;
        const newViewLineOptions = new ViewLineOptions(conf, this._context.theme.type);
        if (!this._viewLineOptions.equals(newViewLineOptions)) {
            this._viewLineOptions = newViewLineOptions;
            const startLineNumber = this._visibleLines.getStartLineNumber();
            const endLineNumber = this._visibleLines.getEndLineNumber();
            for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
                const line = this._visibleLines.getVisibleLine(lineNumber);
                line.onOptionsChanged(this._viewLineOptions);
            }
            return true;
        }
        return false;
    }
    onCursorStateChanged(e) {
        const rendStartLineNumber = this._visibleLines.getStartLineNumber();
        const rendEndLineNumber = this._visibleLines.getEndLineNumber();
        let r = false;
        for (let lineNumber = rendStartLineNumber; lineNumber <= rendEndLineNumber; lineNumber++) {
            r = this._visibleLines.getVisibleLine(lineNumber).onSelectionChanged() || r;
        }
        return r;
    }
    onDecorationsChanged(e) {
        if (true /*e.inlineDecorationsChanged*/) {
            const rendStartLineNumber = this._visibleLines.getStartLineNumber();
            const rendEndLineNumber = this._visibleLines.getEndLineNumber();
            for (let lineNumber = rendStartLineNumber; lineNumber <= rendEndLineNumber; lineNumber++) {
                this._visibleLines.getVisibleLine(lineNumber).onDecorationsChanged();
            }
        }
        return true;
    }
    onFlushed(e) {
        const shouldRender = this._visibleLines.onFlushed(e, this._viewLineOptions.useGpu);
        this._maxLineWidth = 0;
        return shouldRender;
    }
    onLinesChanged(e) {
        return this._visibleLines.onLinesChanged(e);
    }
    onLinesDeleted(e) {
        return this._visibleLines.onLinesDeleted(e);
    }
    onLinesInserted(e) {
        return this._visibleLines.onLinesInserted(e);
    }
    onRevealRangeRequest(e) {
        // Using the future viewport here in order to handle multiple
        // incoming reveal range requests that might all desire to be animated
        const desiredScrollTop = this._computeScrollTopToRevealRange(this._context.viewLayout.getFutureViewport(), e.source, e.minimalReveal, e.range, e.selections, e.verticalType);
        if (desiredScrollTop === -1) {
            // marker to abort the reveal range request
            return false;
        }
        // validate the new desired scroll top
        let newScrollPosition = this._context.viewLayout.validateScrollPosition({
            scrollTop: desiredScrollTop,
        });
        if (e.revealHorizontal) {
            if (e.range && e.range.startLineNumber !== e.range.endLineNumber) {
                // Two or more lines? => scroll to base (That's how you see most of the two lines)
                newScrollPosition = {
                    scrollTop: newScrollPosition.scrollTop,
                    scrollLeft: 0,
                };
            }
            else if (e.range) {
                // We don't necessarily know the horizontal offset of this range since the line might not be in the view...
                this._horizontalRevealRequest = new HorizontalRevealRangeRequest(e.minimalReveal, e.range.startLineNumber, e.range.startColumn, e.range.endColumn, this._context.viewLayout.getCurrentScrollTop(), newScrollPosition.scrollTop, e.scrollType);
            }
            else if (e.selections && e.selections.length > 0) {
                this._horizontalRevealRequest = new HorizontalRevealSelectionsRequest(e.minimalReveal, e.selections, this._context.viewLayout.getCurrentScrollTop(), newScrollPosition.scrollTop, e.scrollType);
            }
        }
        else {
            this._horizontalRevealRequest = null;
        }
        const scrollTopDelta = Math.abs(this._context.viewLayout.getCurrentScrollTop() - newScrollPosition.scrollTop);
        const scrollType = scrollTopDelta <= this._lineHeight ? 1 /* ScrollType.Immediate */ : e.scrollType;
        this._context.viewModel.viewLayout.setScrollPosition(newScrollPosition, scrollType);
        return true;
    }
    onScrollChanged(e) {
        if (this._horizontalRevealRequest && e.scrollLeftChanged) {
            // cancel any outstanding horizontal reveal request if someone else scrolls horizontally.
            this._horizontalRevealRequest = null;
        }
        if (this._horizontalRevealRequest && e.scrollTopChanged) {
            const min = Math.min(this._horizontalRevealRequest.startScrollTop, this._horizontalRevealRequest.stopScrollTop);
            const max = Math.max(this._horizontalRevealRequest.startScrollTop, this._horizontalRevealRequest.stopScrollTop);
            if (e.scrollTop < min || e.scrollTop > max) {
                // cancel any outstanding horizontal reveal request if someone else scrolls vertically.
                this._horizontalRevealRequest = null;
            }
        }
        this.domNode.setWidth(e.scrollWidth);
        return this._visibleLines.onScrollChanged(e) || true;
    }
    onTokensChanged(e) {
        return this._visibleLines.onTokensChanged(e);
    }
    onZonesChanged(e) {
        this._context.viewModel.viewLayout.setMaxLineWidth(this._maxLineWidth);
        return this._visibleLines.onZonesChanged(e);
    }
    onThemeChanged(e) {
        return this._onOptionsMaybeChanged();
    }
    // ---- end view event handlers
    // ----------- HELPERS FOR OTHERS
    getPositionFromDOMInfo(spanNode, offset) {
        const viewLineDomNode = this._getViewLineDomNode(spanNode);
        if (viewLineDomNode === null) {
            // Couldn't find view line node
            return null;
        }
        const lineNumber = this._getLineNumberFor(viewLineDomNode);
        if (lineNumber === -1) {
            // Couldn't find view line node
            return null;
        }
        if (lineNumber < 1 || lineNumber > this._context.viewModel.getLineCount()) {
            // lineNumber is outside range
            return null;
        }
        if (this._context.viewModel.getLineMaxColumn(lineNumber) === 1) {
            // Line is empty
            return new Position(lineNumber, 1);
        }
        const rendStartLineNumber = this._visibleLines.getStartLineNumber();
        const rendEndLineNumber = this._visibleLines.getEndLineNumber();
        if (lineNumber < rendStartLineNumber || lineNumber > rendEndLineNumber) {
            // Couldn't find line
            return null;
        }
        let column = this._visibleLines
            .getVisibleLine(lineNumber)
            .getColumnOfNodeOffset(spanNode, offset);
        const minColumn = this._context.viewModel.getLineMinColumn(lineNumber);
        if (column < minColumn) {
            column = minColumn;
        }
        return new Position(lineNumber, column);
    }
    _getViewLineDomNode(node) {
        while (node && node.nodeType === 1) {
            if (node.className === ViewLine.CLASS_NAME) {
                return node;
            }
            node = node.parentElement;
        }
        return null;
    }
    /**
     * @returns the line number of this view line dom node.
     */
    _getLineNumberFor(domNode) {
        const startLineNumber = this._visibleLines.getStartLineNumber();
        const endLineNumber = this._visibleLines.getEndLineNumber();
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            const line = this._visibleLines.getVisibleLine(lineNumber);
            if (domNode === line.getDomNode()) {
                return lineNumber;
            }
        }
        return -1;
    }
    getLineWidth(lineNumber) {
        const rendStartLineNumber = this._visibleLines.getStartLineNumber();
        const rendEndLineNumber = this._visibleLines.getEndLineNumber();
        if (lineNumber < rendStartLineNumber || lineNumber > rendEndLineNumber) {
            // Couldn't find line
            return -1;
        }
        const context = new DomReadingContext(this.domNode.domNode, this._textRangeRestingSpot);
        const result = this._visibleLines.getVisibleLine(lineNumber).getWidth(context);
        this._updateLineWidthsSlowIfDomDidLayout(context);
        return result;
    }
    linesVisibleRangesForRange(_range, includeNewLines) {
        if (this.shouldRender()) {
            // Cannot read from the DOM because it is dirty
            // i.e. the model & the dom are out of sync, so I'd be reading something stale
            return null;
        }
        const originalEndLineNumber = _range.endLineNumber;
        const range = Range.intersectRanges(_range, this._lastRenderedData.getCurrentVisibleRange());
        if (!range) {
            return null;
        }
        const visibleRanges = [];
        let visibleRangesLen = 0;
        const domReadingContext = new DomReadingContext(this.domNode.domNode, this._textRangeRestingSpot);
        let nextLineModelLineNumber = 0;
        if (includeNewLines) {
            nextLineModelLineNumber =
                this._context.viewModel.coordinatesConverter.convertViewPositionToModelPosition(new Position(range.startLineNumber, 1)).lineNumber;
        }
        const rendStartLineNumber = this._visibleLines.getStartLineNumber();
        const rendEndLineNumber = this._visibleLines.getEndLineNumber();
        for (let lineNumber = range.startLineNumber; lineNumber <= range.endLineNumber; lineNumber++) {
            if (lineNumber < rendStartLineNumber || lineNumber > rendEndLineNumber) {
                continue;
            }
            const startColumn = lineNumber === range.startLineNumber ? range.startColumn : 1;
            const continuesInNextLine = lineNumber !== range.endLineNumber;
            const endColumn = continuesInNextLine
                ? this._context.viewModel.getLineMaxColumn(lineNumber)
                : range.endColumn;
            const visibleRangesForLine = this._visibleLines
                .getVisibleLine(lineNumber)
                .getVisibleRangesForRange(lineNumber, startColumn, endColumn, domReadingContext);
            if (!visibleRangesForLine) {
                continue;
            }
            if (includeNewLines && lineNumber < originalEndLineNumber) {
                const currentLineModelLineNumber = nextLineModelLineNumber;
                nextLineModelLineNumber =
                    this._context.viewModel.coordinatesConverter.convertViewPositionToModelPosition(new Position(lineNumber + 1, 1)).lineNumber;
                if (currentLineModelLineNumber !== nextLineModelLineNumber) {
                    visibleRangesForLine.ranges[visibleRangesForLine.ranges.length - 1].width +=
                        this._typicalHalfwidthCharacterWidth;
                }
            }
            visibleRanges[visibleRangesLen++] = new LineVisibleRanges(visibleRangesForLine.outsideRenderedLine, lineNumber, HorizontalRange.from(visibleRangesForLine.ranges), continuesInNextLine);
        }
        this._updateLineWidthsSlowIfDomDidLayout(domReadingContext);
        if (visibleRangesLen === 0) {
            return null;
        }
        return visibleRanges;
    }
    _visibleRangesForLineRange(lineNumber, startColumn, endColumn) {
        if (this.shouldRender()) {
            // Cannot read from the DOM because it is dirty
            // i.e. the model & the dom are out of sync, so I'd be reading something stale
            return null;
        }
        if (lineNumber < this._visibleLines.getStartLineNumber() ||
            lineNumber > this._visibleLines.getEndLineNumber()) {
            return null;
        }
        const domReadingContext = new DomReadingContext(this.domNode.domNode, this._textRangeRestingSpot);
        const result = this._visibleLines
            .getVisibleLine(lineNumber)
            .getVisibleRangesForRange(lineNumber, startColumn, endColumn, domReadingContext);
        this._updateLineWidthsSlowIfDomDidLayout(domReadingContext);
        return result;
    }
    visibleRangeForPosition(position) {
        const visibleRanges = this._visibleRangesForLineRange(position.lineNumber, position.column, position.column);
        if (!visibleRanges) {
            return null;
        }
        return new HorizontalPosition(visibleRanges.outsideRenderedLine, visibleRanges.ranges[0].left);
    }
    // --- implementation
    updateLineWidths() {
        this._updateLineWidths(false);
    }
    /**
     * Updates the max line width if it is fast to compute.
     * Returns true if all lines were taken into account.
     * Returns false if some lines need to be reevaluated (in a slow fashion).
     */
    _updateLineWidthsFast() {
        return this._updateLineWidths(true);
    }
    _updateLineWidthsSlow() {
        this._updateLineWidths(false);
    }
    /**
     * Update the line widths using DOM layout information after someone else
     * has caused a synchronous layout.
     */
    _updateLineWidthsSlowIfDomDidLayout(domReadingContext) {
        if (!domReadingContext.didDomLayout) {
            // only proceed if we just did a layout
            return;
        }
        if (this._asyncUpdateLineWidths.isScheduled()) {
            // reading widths is not scheduled => widths are up-to-date
            return;
        }
        this._asyncUpdateLineWidths.cancel();
        this._updateLineWidthsSlow();
    }
    _updateLineWidths(fast) {
        const rendStartLineNumber = this._visibleLines.getStartLineNumber();
        const rendEndLineNumber = this._visibleLines.getEndLineNumber();
        let localMaxLineWidth = 1;
        let allWidthsComputed = true;
        for (let lineNumber = rendStartLineNumber; lineNumber <= rendEndLineNumber; lineNumber++) {
            const visibleLine = this._visibleLines.getVisibleLine(lineNumber);
            if (fast && !visibleLine.getWidthIsFast()) {
                // Cannot compute width in a fast way for this line
                allWidthsComputed = false;
                continue;
            }
            localMaxLineWidth = Math.max(localMaxLineWidth, visibleLine.getWidth(null));
        }
        if (allWidthsComputed &&
            rendStartLineNumber === 1 &&
            rendEndLineNumber === this._context.viewModel.getLineCount()) {
            // we know the max line width for all the lines
            this._maxLineWidth = 0;
        }
        this._ensureMaxLineWidth(localMaxLineWidth);
        return allWidthsComputed;
    }
    _checkMonospaceFontAssumptions() {
        // Problems with monospace assumptions are more apparent for longer lines,
        // as small rounding errors start to sum up, so we will select the longest
        // line for a closer inspection
        let longestLineNumber = -1;
        let longestWidth = -1;
        const rendStartLineNumber = this._visibleLines.getStartLineNumber();
        const rendEndLineNumber = this._visibleLines.getEndLineNumber();
        for (let lineNumber = rendStartLineNumber; lineNumber <= rendEndLineNumber; lineNumber++) {
            const visibleLine = this._visibleLines.getVisibleLine(lineNumber);
            if (visibleLine.needsMonospaceFontCheck()) {
                const lineWidth = visibleLine.getWidth(null);
                if (lineWidth > longestWidth) {
                    longestWidth = lineWidth;
                    longestLineNumber = lineNumber;
                }
            }
        }
        if (longestLineNumber === -1) {
            return;
        }
        if (!this._visibleLines.getVisibleLine(longestLineNumber).monospaceAssumptionsAreValid()) {
            for (let lineNumber = rendStartLineNumber; lineNumber <= rendEndLineNumber; lineNumber++) {
                const visibleLine = this._visibleLines.getVisibleLine(lineNumber);
                visibleLine.onMonospaceAssumptionsInvalidated();
            }
        }
    }
    prepareRender() {
        throw new Error('Not supported');
    }
    render() {
        throw new Error('Not supported');
    }
    renderText(viewportData) {
        // (1) render lines - ensures lines are in the DOM
        this._visibleLines.renderLines(viewportData);
        this._lastRenderedData.setCurrentVisibleRange(viewportData.visibleRange);
        this.domNode.setWidth(this._context.viewLayout.getScrollWidth());
        this.domNode.setHeight(Math.min(this._context.viewLayout.getScrollHeight(), 1000000));
        // (2) compute horizontal scroll position:
        //  - this must happen after the lines are in the DOM since it might need a line that rendered just now
        //  - it might change `scrollWidth` and `scrollLeft`
        if (this._horizontalRevealRequest) {
            const horizontalRevealRequest = this._horizontalRevealRequest;
            // Check that we have the line that contains the horizontal range in the viewport
            if (viewportData.startLineNumber <= horizontalRevealRequest.minLineNumber &&
                horizontalRevealRequest.maxLineNumber <= viewportData.endLineNumber) {
                this._horizontalRevealRequest = null;
                // allow `visibleRangesForRange2` to work
                this.onDidRender();
                // compute new scroll position
                const newScrollLeft = this._computeScrollLeftToReveal(horizontalRevealRequest);
                if (newScrollLeft) {
                    if (!this._isViewportWrapping) {
                        // ensure `scrollWidth` is large enough
                        this._ensureMaxLineWidth(newScrollLeft.maxHorizontalOffset);
                    }
                    // set `scrollLeft`
                    this._context.viewModel.viewLayout.setScrollPosition({
                        scrollLeft: newScrollLeft.scrollLeft,
                    }, horizontalRevealRequest.scrollType);
                }
            }
        }
        // Update max line width (not so important, it is just so the horizontal scrollbar doesn't get too small)
        if (!this._updateLineWidthsFast()) {
            // Computing the width of some lines would be slow => delay it
            this._asyncUpdateLineWidths.schedule();
        }
        else {
            this._asyncUpdateLineWidths.cancel();
        }
        if (platform.isLinux && !this._asyncCheckMonospaceFontAssumptions.isScheduled()) {
            const rendStartLineNumber = this._visibleLines.getStartLineNumber();
            const rendEndLineNumber = this._visibleLines.getEndLineNumber();
            for (let lineNumber = rendStartLineNumber; lineNumber <= rendEndLineNumber; lineNumber++) {
                const visibleLine = this._visibleLines.getVisibleLine(lineNumber);
                if (visibleLine.needsMonospaceFontCheck()) {
                    this._asyncCheckMonospaceFontAssumptions.schedule();
                    break;
                }
            }
        }
        // (3) handle scrolling
        this._linesContent.setLayerHinting(this._canUseLayerHinting);
        this._linesContent.setContain('strict');
        const adjustedScrollTop = this._context.viewLayout.getCurrentScrollTop() - viewportData.bigNumbersDelta;
        this._linesContent.setTop(-adjustedScrollTop);
        this._linesContent.setLeft(-this._context.viewLayout.getCurrentScrollLeft());
    }
    // --- width
    _ensureMaxLineWidth(lineWidth) {
        const iLineWidth = Math.ceil(lineWidth);
        if (this._maxLineWidth < iLineWidth) {
            this._maxLineWidth = iLineWidth;
            this._context.viewModel.viewLayout.setMaxLineWidth(this._maxLineWidth);
        }
    }
    _computeScrollTopToRevealRange(viewport, source, minimalReveal, range, selections, verticalType) {
        const viewportStartY = viewport.top;
        const viewportHeight = viewport.height;
        const viewportEndY = viewportStartY + viewportHeight;
        let boxIsSingleRange;
        let boxStartY;
        let boxEndY;
        if (selections && selections.length > 0) {
            let minLineNumber = selections[0].startLineNumber;
            let maxLineNumber = selections[0].endLineNumber;
            for (let i = 1, len = selections.length; i < len; i++) {
                const selection = selections[i];
                minLineNumber = Math.min(minLineNumber, selection.startLineNumber);
                maxLineNumber = Math.max(maxLineNumber, selection.endLineNumber);
            }
            boxIsSingleRange = false;
            boxStartY = this._context.viewLayout.getVerticalOffsetForLineNumber(minLineNumber);
            boxEndY =
                this._context.viewLayout.getVerticalOffsetForLineNumber(maxLineNumber) + this._lineHeight;
        }
        else if (range) {
            boxIsSingleRange = true;
            boxStartY = this._context.viewLayout.getVerticalOffsetForLineNumber(range.startLineNumber);
            boxEndY =
                this._context.viewLayout.getVerticalOffsetForLineNumber(range.endLineNumber) +
                    this._lineHeight;
        }
        else {
            return -1;
        }
        const shouldIgnoreScrollOff = (source === 'mouse' || minimalReveal) && this._cursorSurroundingLinesStyle === 'default';
        let paddingTop = 0;
        let paddingBottom = 0;
        if (!shouldIgnoreScrollOff) {
            const maxLinesInViewport = viewportHeight / this._lineHeight;
            const surroundingLines = Math.max(this._cursorSurroundingLines, this._stickyScrollEnabled ? this._maxNumberStickyLines : 0);
            const context = Math.min(maxLinesInViewport / 2, surroundingLines);
            paddingTop = context * this._lineHeight;
            paddingBottom = Math.max(0, context - 1) * this._lineHeight;
        }
        else {
            if (!minimalReveal) {
                // Reveal one more line above (this case is hit when dragging)
                paddingTop = this._lineHeight;
            }
        }
        if (!minimalReveal) {
            if (verticalType === 0 /* viewEvents.VerticalRevealType.Simple */ ||
                verticalType === 4 /* viewEvents.VerticalRevealType.Bottom */) {
                // Reveal one line more when the last line would be covered by the scrollbar - arrow down case or revealing a line explicitly at bottom
                paddingBottom += this._lineHeight;
            }
        }
        boxStartY -= paddingTop;
        boxEndY += paddingBottom;
        let newScrollTop;
        if (boxEndY - boxStartY > viewportHeight) {
            // the box is larger than the viewport ... scroll to its top
            if (!boxIsSingleRange) {
                // do not reveal multiple cursors if there are more than fit the viewport
                return -1;
            }
            newScrollTop = boxStartY;
        }
        else if (verticalType === 5 /* viewEvents.VerticalRevealType.NearTop */ ||
            verticalType === 6 /* viewEvents.VerticalRevealType.NearTopIfOutsideViewport */) {
            if (verticalType === 6 /* viewEvents.VerticalRevealType.NearTopIfOutsideViewport */ &&
                viewportStartY <= boxStartY &&
                boxEndY <= viewportEndY) {
                // Box is already in the viewport... do nothing
                newScrollTop = viewportStartY;
            }
            else {
                // We want a gap that is 20% of the viewport, but with a minimum of 5 lines
                const desiredGapAbove = Math.max(5 * this._lineHeight, viewportHeight * 0.2);
                // Try to scroll just above the box with the desired gap
                const desiredScrollTop = boxStartY - desiredGapAbove;
                // But ensure that the box is not pushed out of viewport
                const minScrollTop = boxEndY - viewportHeight;
                newScrollTop = Math.max(minScrollTop, desiredScrollTop);
            }
        }
        else if (verticalType === 1 /* viewEvents.VerticalRevealType.Center */ ||
            verticalType === 2 /* viewEvents.VerticalRevealType.CenterIfOutsideViewport */) {
            if (verticalType === 2 /* viewEvents.VerticalRevealType.CenterIfOutsideViewport */ &&
                viewportStartY <= boxStartY &&
                boxEndY <= viewportEndY) {
                // Box is already in the viewport... do nothing
                newScrollTop = viewportStartY;
            }
            else {
                // Box is outside the viewport... center it
                const boxMiddleY = (boxStartY + boxEndY) / 2;
                newScrollTop = Math.max(0, boxMiddleY - viewportHeight / 2);
            }
        }
        else {
            newScrollTop = this._computeMinimumScrolling(viewportStartY, viewportEndY, boxStartY, boxEndY, verticalType === 3 /* viewEvents.VerticalRevealType.Top */, verticalType === 4 /* viewEvents.VerticalRevealType.Bottom */);
        }
        return newScrollTop;
    }
    _computeScrollLeftToReveal(horizontalRevealRequest) {
        const viewport = this._context.viewLayout.getCurrentViewport();
        const layoutInfo = this._context.configuration.options.get(151 /* EditorOption.layoutInfo */);
        const viewportStartX = viewport.left;
        const viewportEndX = viewportStartX + viewport.width - layoutInfo.verticalScrollbarWidth;
        let boxStartX = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
        let boxEndX = 0;
        if (horizontalRevealRequest.type === 'range') {
            const visibleRanges = this._visibleRangesForLineRange(horizontalRevealRequest.lineNumber, horizontalRevealRequest.startColumn, horizontalRevealRequest.endColumn);
            if (!visibleRanges) {
                return null;
            }
            for (const visibleRange of visibleRanges.ranges) {
                boxStartX = Math.min(boxStartX, Math.round(visibleRange.left));
                boxEndX = Math.max(boxEndX, Math.round(visibleRange.left + visibleRange.width));
            }
        }
        else {
            for (const selection of horizontalRevealRequest.selections) {
                if (selection.startLineNumber !== selection.endLineNumber) {
                    return null;
                }
                const visibleRanges = this._visibleRangesForLineRange(selection.startLineNumber, selection.startColumn, selection.endColumn);
                if (!visibleRanges) {
                    return null;
                }
                for (const visibleRange of visibleRanges.ranges) {
                    boxStartX = Math.min(boxStartX, Math.round(visibleRange.left));
                    boxEndX = Math.max(boxEndX, Math.round(visibleRange.left + visibleRange.width));
                }
            }
        }
        if (!horizontalRevealRequest.minimalReveal) {
            boxStartX = Math.max(0, boxStartX - ViewLines.HORIZONTAL_EXTRA_PX);
            boxEndX += this._revealHorizontalRightPadding;
        }
        if (horizontalRevealRequest.type === 'selections' && boxEndX - boxStartX > viewport.width) {
            return null;
        }
        const newScrollLeft = this._computeMinimumScrolling(viewportStartX, viewportEndX, boxStartX, boxEndX);
        return {
            scrollLeft: newScrollLeft,
            maxHorizontalOffset: boxEndX,
        };
    }
    _computeMinimumScrolling(viewportStart, viewportEnd, boxStart, boxEnd, revealAtStart, revealAtEnd) {
        viewportStart = viewportStart | 0;
        viewportEnd = viewportEnd | 0;
        boxStart = boxStart | 0;
        boxEnd = boxEnd | 0;
        revealAtStart = !!revealAtStart;
        revealAtEnd = !!revealAtEnd;
        const viewportLength = viewportEnd - viewportStart;
        const boxLength = boxEnd - boxStart;
        if (boxLength < viewportLength) {
            // The box would fit in the viewport
            if (revealAtStart) {
                return boxStart;
            }
            if (revealAtEnd) {
                return Math.max(0, boxEnd - viewportLength);
            }
            if (boxStart < viewportStart) {
                // The box is above the viewport
                return boxStart;
            }
            else if (boxEnd > viewportEnd) {
                // The box is below the viewport
                return Math.max(0, boxEnd - viewportLength);
            }
        }
        else {
            // The box would not fit in the viewport
            // Reveal the beginning of the box
            return boxStart;
        }
        return viewportStart;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xpbmVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvdmlld0xpbmVzL3ZpZXdMaW5lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBRS9ELE9BQU8saUJBQWlCLENBQUE7QUFDeEIsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzNELE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsZUFBZSxFQUVmLGlCQUFpQixHQUVqQixNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ2hFLE9BQU8sRUFBbUIsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDcEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUV4QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBT3JELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUd0RCxNQUFNLGdCQUFnQjtJQUdyQjtRQUNDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNsRCxD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