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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xheW91dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi92aWV3TGF5b3V0L3ZpZXdMYXlvdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRSxPQUFPLEVBR04sVUFBVSxHQUdWLE1BQU0sb0NBQW9DLENBQUE7QUFJM0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQzlDLE9BQU8sRUFNTixRQUFRLEdBQ1IsTUFBTSxpQkFBaUIsQ0FBQTtBQUN4QixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV4RSxNQUFNLHFCQUFxQixHQUFHLEdBQUcsQ0FBQTtBQUVqQyxNQUFNLHNCQUFzQjtJQVMzQixZQUFZLEtBQWEsRUFBRSxZQUFvQixFQUFFLE1BQWMsRUFBRSxhQUFxQjtRQUNyRixLQUFLLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBQTtRQUNqQixZQUFZLEdBQUcsWUFBWSxHQUFHLENBQUMsQ0FBQTtRQUMvQixNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUNuQixhQUFhLEdBQUcsYUFBYSxHQUFHLENBQUMsQ0FBQTtRQUVqQyxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNmLEtBQUssR0FBRyxDQUFDLENBQUE7UUFDVixDQUFDO1FBQ0QsSUFBSSxZQUFZLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdEIsWUFBWSxHQUFHLENBQUMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsSUFBSSxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDaEIsTUFBTSxHQUFHLENBQUMsQ0FB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