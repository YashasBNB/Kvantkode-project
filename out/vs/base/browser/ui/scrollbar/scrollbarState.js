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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsYmFyU3RhdGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvc2Nyb2xsYmFyL3Njcm9sbGJhclN0YXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOztHQUVHO0FBQ0gsTUFBTSxtQkFBbUIsR0FBRyxFQUFFLENBQUE7QUFFOUIsTUFBTSxPQUFPLGNBQWM7SUFxRDFCLFlBQ0MsU0FBaUIsRUFDakIsYUFBcUIsRUFDckIscUJBQTZCLEVBQzdCLFdBQW1CLEVBQ25CLFVBQWtCLEVBQ2xCLGNBQXNCO1FBRXRCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUMvQyxJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQy9ELElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUV2QyxJQUFJLENBQUMsWUFBWSxHQUFHLFdBQVcsQ0FBQTtRQUMvQixJQUFJLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQTtRQUM3QixJQUFJLENBQUMsZUFBZSxHQUFHLGNBQWMsQ0FBQTtRQUVyQyxJQUFJLENBQUMsc0JBQXNCLEdBQUcsQ0FBQyxDQUFBO1FBQy9CLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxLQUFLLENBQUE7UUFDOUIsSUFBSSxDQUFDLG1CQUFtQixHQUFHLENBQUMsQ0FBQTtRQUM1QixJQUFJLENBQUMsb0JBQW9CLEdBQUcsQ0FBQyxDQUFBO1FBQzdCLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxDQUFDLENBQUE7UUFFaEMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUE7SUFDOUIsQ0FBQztJQUVNLEtBQUs7UUFDWCxPQUFPLElBQUksY0FB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