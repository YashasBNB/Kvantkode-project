/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Scrollable, } from '../../../base/common/scrollable.js';
import { LinesLayout } from './linesLayout.js';
import { Viewport, } from '../viewModel.js';
import { ContentSizeChangedEvent } from '../viewModelEventDispatcher.js';
const SMOOTH_SCROLLING_TIME = 125;
class EditorScrollDimensions {
    constructor(width, contentWidth, height, contentHeight) {
        width = width | 0;
        contentWidth = contentWidth | 0;
        height = height | 0;
        contentHeight = contentHeight | 0;
        if (width < 0) {
            width = 0;
        }
        if (contentWidth < 0) {
            contentWidth = 0;
        }
        if (height < 0) {
            height = 0;
        }
        if (contentHeight < 0) {
            contentHeight = 0;
        }
        this.width = width;
        this.contentWidth = contentWidth;
        this.scrollWidth = Math.max(width, contentWidth);
        this.height = height;
        this.contentHeight = contentHeight;
        this.scrollHeight = Math.max(height, contentHeight);
    }
    equals(other) {
        return (this.width === other.width &&
            this.contentWidth === other.contentWidth &&
            this.height === other.height &&
            this.contentHeight === other.contentHeight);
    }
}
class EditorScrollable extends Disposable {
    constructor(smoothScrollDuration, scheduleAtNextAnimationFrame) {
        super();
        this._onDidContentSizeChange = this._register(new Emitter());
        this.onDidContentSizeChange = this._onDidContentSizeChange.event;
        this._dimensions = new EditorScrollDimensions(0, 0, 0, 0);
        this._scrollable = this._register(new Scrollable({
            forceIntegerValues: true,
            smoothScrollDuration,
            scheduleAtNextAnimationFrame,
        }));
        this.onDidScroll = this._scrollable.onScroll;
    }
    getScrollable() {
        return this._scrollable;
    }
    setSmoothScrollDuration(smoothScrollDuration) {
        this._scrollable.setSmoothScrollDuration(smoothScrollDuration);
    }
    validateScrollPosition(scrollPosition) {
        return this._scrollable.validateScrollPosition(scrollPosition);
    }
    getScrollDimensions() {
        return this._dimensions;
    }
    setScrollDimensions(dimensions) {
        if (this._dimensions.equals(dimensions)) {
            return;
        }
        const oldDimensions = this._dimensions;
        this._dimensions = dimensions;
        this._scrollable.setScrollDimensions({
            width: dimensions.width,
            scrollWidth: dimensions.scrollWidth,
            height: dimensions.height,
            scrollHeight: dimensions.scrollHeight,
        }, true);
        const contentWidthChanged = oldDimensions.contentWidth !== dimensions.contentWidth;
        const contentHeightChanged = oldDimensions.contentHeight !== dimensions.contentHeight;
        if (contentWidthChanged || contentHeightChanged) {
            this._onDidContentSizeChange.fire(new ContentSizeChangedEvent(oldDimensions.contentWidth, oldDimensions.contentHeight, dimensions.contentWidth, dimensions.contentHeight));
        }
    }
    getFutureScrollPosition() {
        return this._scrollable.getFutureScrollPosition();
    }
    getCurrentScrollPosition() {
        return this._scrollable.getCurrentScrollPosition();
    }
    setScrollPositionNow(update) {
        this._scrollable.setScrollPositionNow(update);
    }
    setScrollPositionSmooth(update) {
        this._scrollable.setScrollPositionSmooth(update);
    }
    hasPendingScrollAnimation() {
        return this._scrollable.hasPendingScrollAnimation();
    }
}
export class ViewLayout extends Disposable {
    constructor(configuration, lineCount, scheduleAtNextAnimationFrame) {
        super();
        this._configuration = configuration;
        const options = this._configuration.options;
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        const padding = options.get(88 /* EditorOption.padding */);
        this._linesLayout = new LinesLayout(lineCount, options.get(68 /* EditorOption.lineHeight */), padding.top, padding.bottom);
        this._maxLineWidth = 0;
        this._overlayWidgetsMinWidth = 0;
        this._scrollable = this._register(new EditorScrollable(0, scheduleAtNextAnimationFrame));
        this._configureSmoothScrollDuration();
        this._scrollable.setScrollDimensions(new EditorScrollDimensions(layoutInfo.contentWidth, 0, layoutInfo.height, 0));
        this.onDidScroll = this._scrollable.onDidScroll;
        this.onDidContentSizeChange = this._scrollable.onDidContentSizeChange;
        this._updateHeight();
    }
    dispose() {
        super.dispose();
    }
    getScrollable() {
        return this._scrollable.getScrollable();
    }
    onHeightMaybeChanged() {
        this._updateHeight();
    }
    _configureSmoothScrollDuration() {
        this._scrollable.setSmoothScrollDuration(this._configuration.options.get(119 /* EditorOption.smoothScrolling */) ? SMOOTH_SCROLLING_TIME : 0);
    }
    // ---- begin view event handlers
    onConfigurationChanged(e) {
        const options = this._configuration.options;
        if (e.hasChanged(68 /* EditorOption.lineHeight */)) {
            this._linesLayout.setLineHeight(options.get(68 /* EditorOption.lineHeight */));
        }
        if (e.hasChanged(88 /* EditorOption.padding */)) {
            const padding = options.get(88 /* EditorOption.padding */);
            this._linesLayout.setPadding(padding.top, padding.bottom);
        }
        if (e.hasChanged(151 /* EditorOption.layoutInfo */)) {
            const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
            const width = layoutInfo.contentWidth;
            const height = layoutInfo.height;
            const scrollDimensions = this._scrollable.getScrollDimensions();
            const contentWidth = scrollDimensions.contentWidth;
            this._scrollable.setScrollDimensions(new EditorScrollDimensions(width, scrollDimensions.contentWidth, height, this._getContentHeight(width, height, contentWidth)));
        }
        else {
            this._updateHeight();
        }
        if (e.hasChanged(119 /* EditorOption.smoothScrolling */)) {
            this._configureSmoothScrollDuration();
        }
    }
    onFlushed(lineCount) {
        this._linesLayout.onFlushed(lineCount);
    }
    onLinesDeleted(fromLineNumber, toLineNumber) {
        this._linesLayout.onLinesDeleted(fromLineNumber, toLineNumber);
    }
    onLinesInserted(fromLineNumber, toLineNumber) {
        this._linesLayout.onLinesInserted(fromLineNumber, toLineNumber);
    }
    // ---- end view event handlers
    _getHorizontalScrollbarHeight(width, scrollWidth) {
        const options = this._configuration.options;
        const scrollbar = options.get(108 /* EditorOption.scrollbar */);
        if (scrollbar.horizontal === 2 /* ScrollbarVisibility.Hidden */) {
            // horizontal scrollbar not visible
            return 0;
        }
        if (width >= scrollWidth) {
            // horizontal scrollbar not visible
            return 0;
        }
        return scrollbar.horizontalScrollbarSize;
    }
    _getContentHeight(width, height, contentWidth) {
        const options = this._configuration.options;
        let result = this._linesLayout.getLinesTotalHeight();
        if (options.get(110 /* EditorOption.scrollBeyondLastLine */)) {
            result += Math.max(0, height - options.get(68 /* EditorOption.lineHeight */) - options.get(88 /* EditorOption.padding */).bottom);
        }
        else if (!options.get(108 /* EditorOption.scrollbar */).ignoreHorizontalScrollbarInContentHeight) {
            result += this._getHorizontalScrollbarHeight(width, contentWidth);
        }
        return result;
    }
    _updateHeight() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        const width = scrollDimensions.width;
        const height = scrollDimensions.height;
        const contentWidth = scrollDimensions.contentWidth;
        this._scrollable.setScrollDimensions(new EditorScrollDimensions(width, scrollDimensions.contentWidth, height, this._getContentHeight(width, height, contentWidth)));
    }
    // ---- Layouting logic
    getCurrentViewport() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        const currentScrollPosition = this._scrollable.getCurrentScrollPosition();
        return new Viewport(currentScrollPosition.scrollTop, currentScrollPosition.scrollLeft, scrollDimensions.width, scrollDimensions.height);
    }
    getFutureViewport() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        const currentScrollPosition = this._scrollable.getFutureScrollPosition();
        return new Viewport(currentScrollPosition.scrollTop, currentScrollPosition.scrollLeft, scrollDimensions.width, scrollDimensions.height);
    }
    _computeContentWidth() {
        const options = this._configuration.options;
        const maxLineWidth = this._maxLineWidth;
        const wrappingInfo = options.get(152 /* EditorOption.wrappingInfo */);
        const fontInfo = options.get(52 /* EditorOption.fontInfo */);
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        if (wrappingInfo.isViewportWrapping) {
            const minimap = options.get(74 /* EditorOption.minimap */);
            if (maxLineWidth > layoutInfo.contentWidth + fontInfo.typicalHalfwidthCharacterWidth) {
                // This is a case where viewport wrapping is on, but the line extends above the viewport
                if (minimap.enabled && minimap.side === 'right') {
                    // We need to accomodate the scrollbar width
                    return maxLineWidth + layoutInfo.verticalScrollbarWidth;
                }
            }
            return maxLineWidth;
        }
        else {
            const extraHorizontalSpace = options.get(109 /* EditorOption.scrollBeyondLastColumn */) * fontInfo.typicalHalfwidthCharacterWidth;
            const whitespaceMinWidth = this._linesLayout.getWhitespaceMinWidth();
            return Math.max(maxLineWidth + extraHorizontalSpace + layoutInfo.verticalScrollbarWidth, whitespaceMinWidth, this._overlayWidgetsMinWidth);
        }
    }
    setMaxLineWidth(maxLineWidth) {
        this._maxLineWidth = maxLineWidth;
        this._updateContentWidth();
    }
    setOverlayWidgetsMinWidth(maxMinWidth) {
        this._overlayWidgetsMinWidth = maxMinWidth;
        this._updateContentWidth();
    }
    _updateContentWidth() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        this._scrollable.setScrollDimensions(new EditorScrollDimensions(scrollDimensions.width, this._computeContentWidth(), scrollDimensions.height, scrollDimensions.contentHeight));
        // The height might depend on the fact that there is a horizontal scrollbar or not
        this._updateHeight();
    }
    // ---- view state
    saveState() {
        const currentScrollPosition = this._scrollable.getFutureScrollPosition();
        const scrollTop = currentScrollPosition.scrollTop;
        const firstLineNumberInViewport = this._linesLayout.getLineNumberAtOrAfterVerticalOffset(scrollTop);
        const whitespaceAboveFirstLine = this._linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumber(firstLineNumberInViewport);
        return {
            scrollTop: scrollTop,
            scrollTopWithoutViewZones: scrollTop - whitespaceAboveFirstLine,
            scrollLeft: currentScrollPosition.scrollLeft,
        };
    }
    // ----
    changeWhitespace(callback) {
        const hadAChange = this._linesLayout.changeWhitespace(callback);
        if (hadAChange) {
            this.onHeightMaybeChanged();
        }
        return hadAChange;
    }
    getVerticalOffsetForLineNumber(lineNumber, includeViewZones = false) {
        return this._linesLayout.getVerticalOffsetForLineNumber(lineNumber, includeViewZones);
    }
    getVerticalOffsetAfterLineNumber(lineNumber, includeViewZones = false) {
        return this._linesLayout.getVerticalOffsetAfterLineNumber(lineNumber, includeViewZones);
    }
    isAfterLines(verticalOffset) {
        return this._linesLayout.isAfterLines(verticalOffset);
    }
    isInTopPadding(verticalOffset) {
        return this._linesLayout.isInTopPadding(verticalOffset);
    }
    isInBottomPadding(verticalOffset) {
        return this._linesLayout.isInBottomPadding(verticalOffset);
    }
    getLineNumberAtVerticalOffset(verticalOffset) {
        return this._linesLayout.getLineNumberAtOrAfterVerticalOffset(verticalOffset);
    }
    getWhitespaceAtVerticalOffset(verticalOffset) {
        return this._linesLayout.getWhitespaceAtVerticalOffset(verticalOffset);
    }
    getLinesViewportData() {
        const visibleBox = this.getCurrentViewport();
        return this._linesLayout.getLinesViewportData(visibleBox.top, visibleBox.top + visibleBox.height);
    }
    getLinesViewportDataAtScrollTop(scrollTop) {
        // do some minimal validations on scrollTop
        const scrollDimensions = this._scrollable.getScrollDimensions();
        if (scrollTop + scrollDimensions.height > scrollDimensions.scrollHeight) {
            scrollTop = scrollDimensions.scrollHeight - scrollDimensions.height;
        }
        if (scrollTop < 0) {
            scrollTop = 0;
        }
        return this._linesLayout.getLinesViewportData(scrollTop, scrollTop + scrollDimensions.height);
    }
    getWhitespaceViewportData() {
        const visibleBox = this.getCurrentViewport();
        return this._linesLayout.getWhitespaceViewportData(visibleBox.top, visibleBox.top + visibleBox.height);
    }
    getWhitespaces() {
        return this._linesLayout.getWhitespaces();
    }
    // ----
    getContentWidth() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        return scrollDimensions.contentWidth;
    }
    getScrollWidth() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        return scrollDimensions.scrollWidth;
    }
    getContentHeight() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        return scrollDimensions.contentHeight;
    }
    getScrollHeight() {
        const scrollDimensions = this._scrollable.getScrollDimensions();
        return scrollDimensions.scrollHeight;
    }
    getCurrentScrollLeft() {
        const currentScrollPosition = this._scrollable.getCurrentScrollPosition();
        return currentScrollPosition.scrollLeft;
    }
    getCurrentScrollTop() {
        const currentScrollPosition = this._scrollable.getCurrentScrollPosition();
        return currentScrollPosition.scrollTop;
    }
    validateScrollPosition(scrollPosition) {
        return this._scrollable.validateScrollPosition(scrollPosition);
    }
    setScrollPosition(position, type) {
        if (type === 1 /* ScrollType.Immediate */) {
            this._scrollable.setScrollPositionNow(position);
        }
        else {
            this._scrollable.setScrollPositionSmooth(position);
        }
    }
    hasPendingScrollAnimation() {
        return this._scrollable.hasPendingScrollAnimation();
    }
    deltaScrollNow(deltaScrollLeft, deltaScrollTop) {
        const currentScrollPosition = this._scrollable.getCurrentScrollPosition();
        this._scrollable.setScrollPositionNow({
            scrollLeft: currentScrollPosition.scrollLeft + deltaScrollLeft,
            scrollTop: currentScrollPosition.scrollTop + deltaScrollTop,
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xheW91dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdmlld0xheW91dC92aWV3TGF5b3V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFDM0UsT0FBTyxFQUdOLFVBQVUsR0FHVixNQUFNLG9DQUFvQyxDQUFBO0FBSTNDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUM5QyxPQUFPLEVBTU4sUUFBUSxHQUNSLE1BQU0saUJBQWlCLENBQUE7QUFDeEIsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFeEUsTUFBTSxxQkFBcUIsR0FBRyxHQUFHLENBQUE7QUFFakMsTUFBTSxzQkFBc0I7SUFTM0IsWUFBWSxLQUFhLEVBQUUsWUFBb0IsRUFBRSxNQUFjLEVBQUUsYUFBcUI7UUFDckYsS0FBSyxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUE7UUFDakIsWUFBWSxHQUFHLFlBQVksR0FBRyxDQUFDLENBQUE7UUFDL0IsTUFBTSxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFDbkIsYUFBYSxHQUFHLGFBQWEsR0FBRyxDQUFDLENBQUE7UUFFakMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDZixLQUFLLEdBQUcsQ0FBQyxDQUFBO1FBQ1YsQ0FBQztRQUNELElBQUksWUFBWSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3RCLFlBQVksR0FBRyxDQUFDLENBQUE7UUFDakIsQ0FBQztRQUVELElBQUksTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2hCLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFD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