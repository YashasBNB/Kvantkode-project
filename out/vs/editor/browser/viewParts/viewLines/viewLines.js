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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xpbmVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL3ZpZXdMaW5lcy92aWV3TGluZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDekcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUvRCxPQUFPLGlCQUFpQixDQUFBO0FBQ3hCLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGVBQWUsRUFFZixpQkFBaUIsR0FFakIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNoRSxPQUFPLEVBQW1CLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ3BGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFFeEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQU9yRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFHdEQsTUFBTSxnQkFBZ0I7SUFHckI7UUFDQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDbEQsQ0FBQztJ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