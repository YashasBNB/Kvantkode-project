/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from './event.js';
import { Disposable } from './lifecycle.js';
export var ScrollbarVisibility;
(function (ScrollbarVisibility) {
    ScrollbarVisibility[ScrollbarVisibility["Auto"] = 1] = "Auto";
    ScrollbarVisibility[ScrollbarVisibility["Hidden"] = 2] = "Hidden";
    ScrollbarVisibility[ScrollbarVisibility["Visible"] = 3] = "Visible";
})(ScrollbarVisibility || (ScrollbarVisibility = {}));
export class ScrollState {
    constructor(_forceIntegerValues, width, scrollWidth, scrollLeft, height, scrollHeight, scrollTop) {
        this._forceIntegerValues = _forceIntegerValues;
        this._scrollStateBrand = undefined;
        if (this._forceIntegerValues) {
            width = width | 0;
            scrollWidth = scrollWidth | 0;
            scrollLeft = scrollLeft | 0;
            height = height | 0;
            scrollHeight = scrollHeight | 0;
            scrollTop = scrollTop | 0;
        }
        this.rawScrollLeft = scrollLeft; // before validation
        this.rawScrollTop = scrollTop; // before validation
        if (width < 0) {
            width = 0;
        }
        if (scrollLeft + width > scrollWidth) {
            scrollLeft = scrollWidth - width;
        }
        if (scrollLeft < 0) {
            scrollLeft = 0;
        }
        if (height < 0) {
            height = 0;
        }
        if (scrollTop + height > scrollHeight) {
            scrollTop = scrollHeight - height;
        }
        if (scrollTop < 0) {
            scrollTop = 0;
        }
        this.width = width;
        this.scrollWidth = scrollWidth;
        this.scrollLeft = scrollLeft;
        this.height = height;
        this.scrollHeight = scrollHeight;
        this.scrollTop = scrollTop;
    }
    equals(other) {
        return (this.rawScrollLeft === other.rawScrollLeft &&
            this.rawScrollTop === other.rawScrollTop &&
            this.width === other.width &&
            this.scrollWidth === other.scrollWidth &&
            this.scrollLeft === other.scrollLeft &&
            this.height === other.height &&
            this.scrollHeight === other.scrollHeight &&
            this.scrollTop === other.scrollTop);
    }
    withScrollDimensions(update, useRawScrollPositions) {
        return new ScrollState(this._forceIntegerValues, typeof update.width !== 'undefined' ? update.width : this.width, typeof update.scrollWidth !== 'undefined' ? update.scrollWidth : this.scrollWidth, useRawScrollPositions ? this.rawScrollLeft : this.scrollLeft, typeof update.height !== 'undefined' ? update.height : this.height, typeof update.scrollHeight !== 'undefined' ? update.scrollHeight : this.scrollHeight, useRawScrollPositions ? this.rawScrollTop : this.scrollTop);
    }
    withScrollPosition(update) {
        return new ScrollState(this._forceIntegerValues, this.width, this.scrollWidth, typeof update.scrollLeft !== 'undefined' ? update.scrollLeft : this.rawScrollLeft, this.height, this.scrollHeight, typeof update.scrollTop !== 'undefined' ? update.scrollTop : this.rawScrollTop);
    }
    createScrollEvent(previous, inSmoothScrolling) {
        const widthChanged = this.width !== previous.width;
        const scrollWidthChanged = this.scrollWidth !== previous.scrollWidth;
        const scrollLeftChanged = this.scrollLeft !== previous.scrollLeft;
        const heightChanged = this.height !== previous.height;
        const scrollHeightChanged = this.scrollHeight !== previous.scrollHeight;
        const scrollTopChanged = this.scrollTop !== previous.scrollTop;
        return {
            inSmoothScrolling: inSmoothScrolling,
            oldWidth: previous.width,
            oldScrollWidth: previous.scrollWidth,
            oldScrollLeft: previous.scrollLeft,
            width: this.width,
            scrollWidth: this.scrollWidth,
            scrollLeft: this.scrollLeft,
            oldHeight: previous.height,
            oldScrollHeight: previous.scrollHeight,
            oldScrollTop: previous.scrollTop,
            height: this.height,
            scrollHeight: this.scrollHeight,
            scrollTop: this.scrollTop,
            widthChanged: widthChanged,
            scrollWidthChanged: scrollWidthChanged,
            scrollLeftChanged: scrollLeftChanged,
            heightChanged: heightChanged,
            scrollHeightChanged: scrollHeightChanged,
            scrollTopChanged: scrollTopChanged,
        };
    }
}
export class Scrollable extends Disposable {
    constructor(options) {
        super();
        this._scrollableBrand = undefined;
        this._onScroll = this._register(new Emitter());
        this.onScroll = this._onScroll.event;
        this._smoothScrollDuration = options.smoothScrollDuration;
        this._scheduleAtNextAnimationFrame = options.scheduleAtNextAnimationFrame;
        this._state = new ScrollState(options.forceIntegerValues, 0, 0, 0, 0, 0, 0);
        this._smoothScrolling = null;
    }
    dispose() {
        if (this._smoothScrolling) {
            this._smoothScrolling.dispose();
            this._smoothScrolling = null;
        }
        super.dispose();
    }
    setSmoothScrollDuration(smoothScrollDuration) {
        this._smoothScrollDuration = smoothScrollDuration;
    }
    validateScrollPosition(scrollPosition) {
        return this._state.withScrollPosition(scrollPosition);
    }
    getScrollDimensions() {
        return this._state;
    }
    setScrollDimensions(dimensions, useRawScrollPositions) {
        const newState = this._state.withScrollDimensions(dimensions, useRawScrollPositions);
        this._setState(newState, Boolean(this._smoothScrolling));
        // Validate outstanding animated scroll position target
        this._smoothScrolling?.acceptScrollDimensions(this._state);
    }
    /**
     * Returns the final scroll position that the instance will have once the smooth scroll animation concludes.
     * If no scroll animation is occurring, it will return the current scroll position instead.
     */
    getFutureScrollPosition() {
        if (this._smoothScrolling) {
            return this._smoothScrolling.to;
        }
        return this._state;
    }
    /**
     * Returns the current scroll position.
     * Note: This result might be an intermediate scroll position, as there might be an ongoing smooth scroll animation.
     */
    getCurrentScrollPosition() {
        return this._state;
    }
    setScrollPositionNow(update) {
        // no smooth scrolling requested
        const newState = this._state.withScrollPosition(update);
        // Terminate any outstanding smooth scrolling
        if (this._smoothScrolling) {
            this._smoothScrolling.dispose();
            this._smoothScrolling = null;
        }
        this._setState(newState, false);
    }
    setScrollPositionSmooth(update, reuseAnimation) {
        if (this._smoothScrollDuration === 0) {
            // Smooth scrolling not supported.
            return this.setScrollPositionNow(update);
        }
        if (this._smoothScrolling) {
            // Combine our pending scrollLeft/scrollTop with incoming scrollLeft/scrollTop
            update = {
                scrollLeft: typeof update.scrollLeft === 'undefined'
                    ? this._smoothScrolling.to.scrollLeft
                    : update.scrollLeft,
                scrollTop: typeof update.scrollTop === 'undefined'
                    ? this._smoothScrolling.to.scrollTop
                    : update.scrollTop,
            };
            // Validate `update`
            const validTarget = this._state.withScrollPosition(update);
            if (this._smoothScrolling.to.scrollLeft === validTarget.scrollLeft &&
                this._smoothScrolling.to.scrollTop === validTarget.scrollTop) {
                // No need to interrupt or extend the current animation since we're going to the same place
                return;
            }
            let newSmoothScrolling;
            if (reuseAnimation) {
                newSmoothScrolling = new SmoothScrollingOperation(this._smoothScrolling.from, validTarget, this._smoothScrolling.startTime, this._smoothScrolling.duration);
            }
            else {
                newSmoothScrolling = this._smoothScrolling.combine(this._state, validTarget, this._smoothScrollDuration);
            }
            this._smoothScrolling.dispose();
            this._smoothScrolling = newSmoothScrolling;
        }
        else {
            // Validate `update`
            const validTarget = this._state.withScrollPosition(update);
            this._smoothScrolling = SmoothScrollingOperation.start(this._state, validTarget, this._smoothScrollDuration);
        }
        // Begin smooth scrolling animation
        this._smoothScrolling.animationFrameDisposable = this._scheduleAtNextAnimationFrame(() => {
            if (!this._smoothScrolling) {
                return;
            }
            this._smoothScrolling.animationFrameDisposable = null;
            this._performSmoothScrolling();
        });
    }
    hasPendingScrollAnimation() {
        return Boolean(this._smoothScrolling);
    }
    _performSmoothScrolling() {
        if (!this._smoothScrolling) {
            return;
        }
        const update = this._smoothScrolling.tick();
        const newState = this._state.withScrollPosition(update);
        this._setState(newState, true);
        if (!this._smoothScrolling) {
            // Looks like someone canceled the smooth scrolling
            // from the scroll event handler
            return;
        }
        if (update.isDone) {
            this._smoothScrolling.dispose();
            this._smoothScrolling = null;
            return;
        }
        // Continue smooth scrolling animation
        this._smoothScrolling.animationFrameDisposable = this._scheduleAtNextAnimationFrame(() => {
            if (!this._smoothScrolling) {
                return;
            }
            this._smoothScrolling.animationFrameDisposable = null;
            this._performSmoothScrolling();
        });
    }
    _setState(newState, inSmoothScrolling) {
        const oldState = this._state;
        if (oldState.equals(newState)) {
            // no change
            return;
        }
        this._state = newState;
        this._onScroll.fire(this._state.createScrollEvent(oldState, inSmoothScrolling));
    }
}
export class SmoothScrollingUpdate {
    constructor(scrollLeft, scrollTop, isDone) {
        this.scrollLeft = scrollLeft;
        this.scrollTop = scrollTop;
        this.isDone = isDone;
    }
}
function createEaseOutCubic(from, to) {
    const delta = to - from;
    return function (completion) {
        return from + delta * easeOutCubic(completion);
    };
}
function createComposed(a, b, cut) {
    return function (completion) {
        if (completion < cut) {
            return a(completion / cut);
        }
        return b((completion - cut) / (1 - cut));
    };
}
export class SmoothScrollingOperation {
    constructor(from, to, startTime, duration) {
        this.from = from;
        this.to = to;
        this.duration = duration;
        this.startTime = startTime;
        this.animationFrameDisposable = null;
        this._initAnimations();
    }
    _initAnimations() {
        this.scrollLeft = this._initAnimation(this.from.scrollLeft, this.to.scrollLeft, this.to.width);
        this.scrollTop = this._initAnimation(this.from.scrollTop, this.to.scrollTop, this.to.height);
    }
    _initAnimation(from, to, viewportSize) {
        const delta = Math.abs(from - to);
        if (delta > 2.5 * viewportSize) {
            let stop1, stop2;
            if (from < to) {
                // scroll to 75% of the viewportSize
                stop1 = from + 0.75 * viewportSize;
                stop2 = to - 0.75 * viewportSize;
            }
            else {
                stop1 = from - 0.75 * viewportSize;
                stop2 = to + 0.75 * viewportSize;
            }
            return createComposed(createEaseOutCubic(from, stop1), createEaseOutCubic(stop2, to), 0.33);
        }
        return createEaseOutCubic(from, to);
    }
    dispose() {
        if (this.animationFrameDisposable !== null) {
            this.animationFrameDisposable.dispose();
            this.animationFrameDisposable = null;
        }
    }
    acceptScrollDimensions(state) {
        this.to = state.withScrollPosition(this.to);
        this._initAnimations();
    }
    tick() {
        return this._tick(Date.now());
    }
    _tick(now) {
        const completion = (now - this.startTime) / this.duration;
        if (completion < 1) {
            const newScrollLeft = this.scrollLeft(completion);
            const newScrollTop = this.scrollTop(completion);
            return new SmoothScrollingUpdate(newScrollLeft, newScrollTop, false);
        }
        return new SmoothScrollingUpdate(this.to.scrollLeft, this.to.scrollTop, true);
    }
    combine(from, to, duration) {
        return SmoothScrollingOperation.start(from, to, duration);
    }
    static start(from, to, duration) {
        // +10 / -10 : pretend the animation already started for a quicker response to a scroll request
        duration = duration + 10;
        const startTime = Date.now() - 10;
        return new SmoothScrollingOperation(from, to, startTime, duration);
    }
}
function easeInCubic(t) {
    return Math.pow(t, 3);
}
function easeOutCubic(t) {
    return 1 - easeInCubic(1 - t);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsYWJsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vc2Nyb2xsYWJsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sWUFBWSxDQUFBO0FBQzNDLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUV4RCxNQUFNLENBQU4sSUFBa0IsbUJBSWpCO0FBSkQsV0FBa0IsbUJBQW1CO0lBQ3BDLDZEQUFRLENBQUE7SUFDUixpRUFBVSxDQUFBO0lBQ1YsbUVBQVcsQ0FBQTtBQUNaLENBQUMsRUFKaUIsbUJBQW1CLEtBQW5CLG1CQUFtQixRQUlwQztBQThCRCxNQUFNLE9BQU8sV0FBVztJQWF2QixZQUNrQixtQkFBNEIsRUFDN0MsS0FBYSxFQUNiLFdBQW1CLEVBQ25CLFVBQWtCLEVBQ2xCLE1BQWMsRUFDZCxZQUFvQixFQUNwQixTQUFpQjtRQU5BLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBUztRQWI5QyxzQkFBaUIsR0FBUyxTQUFTLENBQUE7UUFxQmxDLElBQUksSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDOUIsS0FBSyxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUE7WUFDakIsV0FBVyxHQUFHLFdBQVcsR0FBRyxDQUFDLENBQUE7WUFDN0IsVUFBVSxHQUFHLFVBQVUsR0FBRyxDQUFDLENBQUE7WUFDM0IsTUFBTSxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUE7WUFDbkIsWUFBWSxHQUFHLFlBQVksR0FBRyxDQUFDLENBQUE7WUFDL0IsU0FBUyxHQUFHLFNBQVMsR0FBRyxDQUFDLENBQUE7UUFDMUIsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLEdBQUcsVUFBVSxDQUFBLENBQUMsb0JBQW9CO1FBQ3BELElBQUksQ0FBQyxZ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