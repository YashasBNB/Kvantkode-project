/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * The minimal size of the slider (such that it can still be clickable) -- it is artificially enlarged.
 */
const MINIMUM_SLIDER_SIZE = 20;
export class ScrollbarState {
    constructor(arrowSize, scrollbarSize, oppositeScrollbarSize, visibleSize, scrollSize, scrollPosition) {
        this._scrollbarSize = Math.round(scrollbarSize);
        this._oppositeScrollbarSize = Math.round(oppositeScrollbarSize);
        this._arrowSize = Math.round(arrowSize);
        this._visibleSize = visibleSize;
        this._scrollSize = scrollSize;
        this._scrollPosition = scrollPosition;
        this._computedAvailableSize = 0;
        this._computedIsNeeded = false;
        this._computedSliderSize = 0;
        this._computedSliderRatio = 0;
        this._computedSliderPosition = 0;
        this._refreshComputedValues();
    }
    clone() {
        return new ScrollbarState(this._arrowSize, this._scrollbarSize, this._oppositeScrollbarSize, this._visibleSize, this._scrollSize, this._scrollPosition);
    }
    setVisibleSize(visibleSize) {
        const iVisibleSize = Math.round(visibleSize);
        if (this._visibleSize !== iVisibleSize) {
            this._visibleSize = iVisibleSize;
            this._refreshComputedValues();
            return true;
        }
        return false;
    }
    setScrollSize(scrollSize) {
        const iScrollSize = Math.round(scrollSize);
        if (this._scrollSize !== iScrollSize) {
            this._scrollSize = iScrollSize;
            this._refreshComputedValues();
            return true;
        }
        return false;
    }
    setScrollPosition(scrollPosition) {
        const iScrollPosition = Math.round(scrollPosition);
        if (this._scrollPosition !== iScrollPosition) {
            this._scrollPosition = iScrollPosition;
            this._refreshComputedValues();
            return true;
        }
        return false;
    }
    setScrollbarSize(scrollbarSize) {
        this._scrollbarSize = Math.round(scrollbarSize);
    }
    setOppositeScrollbarSize(oppositeScrollbarSize) {
        this._oppositeScrollbarSize = Math.round(oppositeScrollbarSize);
    }
    static _computeValues(oppositeScrollbarSize, arrowSize, visibleSize, scrollSize, scrollPosition) {
        const computedAvailableSize = Math.max(0, visibleSize - oppositeScrollbarSize);
        const computedRepresentableSize = Math.max(0, computedAvailableSize - 2 * arrowSize);
        const computedIsNeeded = scrollSize > 0 && scrollSize > visibleSize;
        if (!computedIsNeeded) {
            // There is no need for a slider
            return {
                computedAvailableSize: Math.round(computedAvailableSize),
                computedIsNeeded: computedIsNeeded,
                computedSliderSize: Math.round(computedRepresentableSize),
                computedSliderRatio: 0,
                computedSliderPosition: 0,
            };
        }
        // We must artificially increase the size of the slider if needed, since the slider would be too small to grab with the mouse otherwise
        const computedSliderSize = Math.round(Math.max(MINIMUM_SLIDER_SIZE, Math.floor((visibleSize * computedRepresentableSize) / scrollSize)));
        // The slider can move from 0 to `computedRepresentableSize` - `computedSliderSize`
        // in the same way `scrollPosition` can move from 0 to `scrollSize` - `visibleSize`.
        const computedSliderRatio = (computedRepresentableSize - computedSliderSize) / (scrollSize - visibleSize);
        const computedSliderPosition = scrollPosition * computedSliderRatio;
        return {
            computedAvailableSize: Math.round(computedAvailableSize),
            computedIsNeeded: computedIsNeeded,
            computedSliderSize: Math.round(computedSliderSize),
            computedSliderRatio: computedSliderRatio,
            computedSliderPosition: Math.round(computedSliderPosition),
        };
    }
    _refreshComputedValues() {
        const r = ScrollbarState._computeValues(this._oppositeScrollbarSize, this._arrowSize, this._visibleSize, this._scrollSize, this._scrollPosition);
        this._computedAvailableSize = r.computedAvailableSize;
        this._computedIsNeeded = r.computedIsNeeded;
        this._computedSliderSize = r.computedSliderSize;
        this._computedSliderRatio = r.computedSliderRatio;
        this._computedSliderPosition = r.computedSliderPosition;
    }
    getArrowSize() {
        return this._arrowSize;
    }
    getScrollPosition() {
        return this._scrollPosition;
    }
    getRectangleLargeSize() {
        return this._computedAvailableSize;
    }
    getRectangleSmallSize() {
        return this._scrollbarSize;
    }
    isNeeded() {
        return this._computedIsNeeded;
    }
    getSliderSize() {
        return this._computedSliderSize;
    }
    getSliderPosition() {
        return this._computedSliderPosition;
    }
    /**
     * Compute a desired `scrollPosition` such that `offset` ends up in the center of the slider.
     * `offset` is based on the same coordinate system as the `sliderPosition`.
     */
    getDesiredScrollPositionFromOffset(offset) {
        if (!this._computedIsNeeded) {
            // no need for a slider
            return 0;
        }
        const desiredSliderPosition = offset - this._arrowSize - this._computedSliderSize / 2;
        return Math.round(desiredSliderPosition / this._computedSliderRatio);
    }
    /**
     * Compute a desired `scrollPosition` from if offset is before or after the slider position.
     * If offset is before slider, treat as a page up (or left).  If after, page down (or right).
     * `offset` and `_computedSliderPosition` are based on the same coordinate system.
     * `_visibleSize` corresponds to a "page" of lines in the returned coordinate system.
     */
    getDesiredScrollPositionFromOffsetPaged(offset) {
        if (!this._computedIsNeeded) {
            // no need for a slider
            return 0;
        }
        const correctedOffset = offset - this._arrowSize; // compensate if has arrows
        let desiredScrollPosition = this._scrollPosition;
        if (correctedOffset < this._computedSliderPosition) {
            desiredScrollPosition -= this._visibleSize; // page up/left
        }
        else {
            desiredScrollPosition += this._visibleSize; // page down/right
        }
        return desiredScrollPosition;
    }
    /**
     * Compute a desired `scrollPosition` such that the slider moves by `delta`.
     */
    getDesiredScrollPositionFromDelta(delta) {
        if (!this._computedIsNeeded) {
            // no need for a slider
            return 0;
        }
        const desiredSliderPosition = this._computedSliderPosition + delta;
        return Math.round(desiredSliderPosition / this._computedSliderRatio);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsYmFyU3RhdGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9zY3JvbGxiYXIvc2Nyb2xsYmFyU3RhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7O0dBRUc7QUFDSCxNQUFNLG1CQUFtQixHQUFHLEVBQUUsQ0FBQTtBQUU5QixNQUFNLE9BQU8sY0FBYztJQXFEMUIsWUFDQyxTQUFpQixFQUNqQixhQUFxQixFQUNyQixxQkFBNkIsRUFDN0IsV0FBbUIsRUFDbkIsVUFBa0IsRUFDbEIsY0FBc0I7UUFFdEIsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQy9DLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDL0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRXZDLElBQUksQ0FBQyxZQUFZLEdBQUcsV0FBVyxDQUFBO1FBQy9CLElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFBO1FBQzdCLElBQUksQ0FBQyxlQUFlLEdBQUcsY0FBYyxDQUFBO1FBRXJDLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxDQUFDLENBQUE7UUFDL0IsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEtBQUssQ0FBQTtRQUM5QixJQUFJLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxDQUFBO1FBQzVCLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxDQUFDLENBQUE7UUFDN0IsSUFBSSxDQUFDLHVCQUF1QixHQUFHLENBQUMsQ0FBQTtRQUVoQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtJQUM5QixDQUFDO0lBRU0sS0FBSztRQUNYLE9BQU8sSUFB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