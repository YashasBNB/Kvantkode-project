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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsYWJsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3Njcm9sbGFibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLFlBQVksQ0FBQTtBQUMzQyxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sZ0JBQWdCLENBQUE7QUFFeEQsTUFBTSxDQUFOLElBQWtCLG1CQUlqQjtBQUpELFdBQWtCLG1CQUFtQjtJQUNwQyw2REFBUSxDQUFBO0lBQ1IsaUVBQVUsQ0FBQTtJQUNWLG1FQUFXLENBQUE7QUFDWixDQUFDLEVBSmlCLG1CQUFtQixLQUFuQixtQkFBbUIsUUFJcEM7QUE4QkQsTUFBTSxPQUFPLFdBQVc7SUFhdkIsWUFDa0IsbUJBQTRCLEVBQzdDLEtBQWEsRUFDYixXQUFtQixFQUNuQixVQUFrQixFQUNsQixNQUFjLEVBQ2QsWUFBb0IsRUFDcEIsU0FBaUI7UUFOQSx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQVM7UUFiOUMsc0JBQWlCLEdBQVMsU0FBUyxDQUFBO1FBcUJsQyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzlCLEtBQUssR0FBRyxLQUFLLEdBQUcsQ0FBQyxDQUFBO1lBQ2pCLFdBQVcsR0FBRyxXQUFXLEdBQUcsQ0FBQyxDQUFBO1lBQzdCLFVBQVUsR0FBRyxVQUFVLEdBQUcsQ0FBQyxDQUFBO1lBQzNCLE1BQU0sR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1lBQ25CLFlBQVksR0FBRyxZQUFZLEdBQUcsQ0FBQyxDQUFBO1lBQy9CLFNBQVMsR0FBRyxTQUFTLEdBQUcsQ0FBQyxDQUFBO1FBQzFCLENBQUM7UUFFRCxJQUFJLENBQUMsYUFBYSxHQUFHLFVBQVUsQ0FBQSxDQUFDLG9CQUFvQjtRQUNwRCxJQUFJLENBQUMsWUFBWSxH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