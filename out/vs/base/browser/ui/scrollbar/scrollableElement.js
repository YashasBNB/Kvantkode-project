/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getZoomFactor, isChrome } from '../../browser.js';
import * as dom from '../../dom.js';
import { createFastDomNode } from '../../fastDomNode.js';
import { StandardWheelEvent } from '../../mouseEvent.js';
import { HorizontalScrollbar } from './horizontalScrollbar.js';
import { VerticalScrollbar } from './verticalScrollbar.js';
import { Widget } from '../widget.js';
import { TimeoutTimer } from '../../../common/async.js';
import { Emitter } from '../../../common/event.js';
import { dispose } from '../../../common/lifecycle.js';
import * as platform from '../../../common/platform.js';
import { Scrollable, } from '../../../common/scrollable.js';
import './media/scrollbars.css';
const HIDE_TIMEOUT = 500;
const SCROLL_WHEEL_SENSITIVITY = 50;
const SCROLL_WHEEL_SMOOTH_SCROLL_ENABLED = true;
class MouseWheelClassifierItem {
    constructor(timestamp, deltaX, deltaY) {
        this.timestamp = timestamp;
        this.deltaX = deltaX;
        this.deltaY = deltaY;
        this.score = 0;
    }
}
export class MouseWheelClassifier {
    static { this.INSTANCE = new MouseWheelClassifier(); }
    constructor() {
        this._capacity = 5;
        this._memory = [];
        this._front = -1;
        this._rear = -1;
    }
    isPhysicalMouseWheel() {
        if (this._front === -1 && this._rear === -1) {
            // no elements
            return false;
        }
        // 0.5 * last + 0.25 * 2nd last + 0.125 * 3rd last + ...
        let remainingInfluence = 1;
        let score = 0;
        let iteration = 1;
        let index = this._rear;
        do {
            const influence = index === this._front ? remainingInfluence : Math.pow(2, -iteration);
            remainingInfluence -= influence;
            score += this._memory[index].score * influence;
            if (index === this._front) {
                break;
            }
            index = (this._capacity + index - 1) % this._capacity;
            iteration++;
        } while (true);
        return score <= 0.5;
    }
    acceptStandardWheelEvent(e) {
        if (isChrome) {
            const targetWindow = dom.getWindow(e.browserEvent);
            const pageZoomFactor = getZoomFactor(targetWindow);
            // On Chrome, the incoming delta events are multiplied with the OS zoom factor.
            // The OS zoom factor can be reverse engineered by using the device pixel ratio and the configured zoom factor into account.
            this.accept(Date.now(), e.deltaX * pageZoomFactor, e.deltaY * pageZoomFactor);
        }
        else {
            this.accept(Date.now(), e.deltaX, e.deltaY);
        }
    }
    accept(timestamp, deltaX, deltaY) {
        let previousItem = null;
        const item = new MouseWheelClassifierItem(timestamp, deltaX, deltaY);
        if (this._front === -1 && this._rear === -1) {
            this._memory[0] = item;
            this._front = 0;
            this._rear = 0;
        }
        else {
            previousItem = this._memory[this._rear];
            this._rear = (this._rear + 1) % this._capacity;
            if (this._rear === this._front) {
                // Drop oldest
                this._front = (this._front + 1) % this._capacity;
            }
            this._memory[this._rear] = item;
        }
        item.score = this._computeScore(item, previousItem);
    }
    /**
     * A score between 0 and 1 for `item`.
     *  - a score towards 0 indicates that the source appears to be a physical mouse wheel
     *  - a score towards 1 indicates that the source appears to be a touchpad or magic mouse, etc.
     */
    _computeScore(item, previousItem) {
        if (Math.abs(item.deltaX) > 0 && Math.abs(item.deltaY) > 0) {
            // both axes exercised => definitely not a physical mouse wheel
            return 1;
        }
        let score = 0.5;
        if (!this._isAlmostInt(item.deltaX) || !this._isAlmostInt(item.deltaY)) {
            // non-integer deltas => indicator that this is not a physical mouse wheel
            score += 0.25;
        }
        // Non-accelerating scroll => indicator that this is a physical mouse wheel
        // These can be identified by seeing whether they are the module of one another.
        if (previousItem) {
            const absDeltaX = Math.abs(item.deltaX);
            const absDeltaY = Math.abs(item.deltaY);
            const absPreviousDeltaX = Math.abs(previousItem.deltaX);
            const absPreviousDeltaY = Math.abs(previousItem.deltaY);
            // Min 1 to avoid division by zero, module 1 will still be 0.
            const minDeltaX = Math.max(Math.min(absDeltaX, absPreviousDeltaX), 1);
            const minDeltaY = Math.max(Math.min(absDeltaY, absPreviousDeltaY), 1);
            const maxDeltaX = Math.max(absDeltaX, absPreviousDeltaX);
            const maxDeltaY = Math.max(absDeltaY, absPreviousDeltaY);
            const isSameModulo = maxDeltaX % minDeltaX === 0 && maxDeltaY % minDeltaY === 0;
            if (isSameModulo) {
                score -= 0.5;
            }
        }
        return Math.min(Math.max(score, 0), 1);
    }
    _isAlmostInt(value) {
        const delta = Math.abs(Math.round(value) - value);
        return delta < 0.01;
    }
}
export class AbstractScrollableElement extends Widget {
    get options() {
        return this._options;
    }
    constructor(element, options, scrollable) {
        super();
        this._onScroll = this._register(new Emitter());
        this.onScroll = this._onScroll.event;
        this._onWillScroll = this._register(new Emitter());
        this.onWillScroll = this._onWillScroll.event;
        element.style.overflow = 'hidden';
        this._options = resolveOptions(options);
        this._scrollable = scrollable;
        this._register(this._scrollable.onScroll((e) => {
            this._onWillScroll.fire(e);
            this._onDidScroll(e);
            this._onScroll.fire(e);
        }));
        const scrollbarHost = {
            onMouseWheel: (mouseWheelEvent) => this._onMouseWheel(mouseWheelEvent),
            onDragStart: () => this._onDragStart(),
            onDragEnd: () => this._onDragEnd(),
        };
        this._verticalScrollbar = this._register(new VerticalScrollbar(this._scrollable, this._options, scrollbarHost));
        this._horizontalScrollbar = this._register(new HorizontalScrollbar(this._scrollable, this._options, scrollbarHost));
        this._domNode = document.createElement('div');
        this._domNode.className = 'monaco-scrollable-element ' + this._options.className;
        this._domNode.setAttribute('role', 'presentation');
        this._domNode.style.position = 'relative';
        this._domNode.style.overflow = 'hidden';
        this._domNode.appendChild(element);
        this._domNode.appendChild(this._horizontalScrollbar.domNode.domNode);
        this._domNode.appendChild(this._verticalScrollbar.domNode.domNode);
        if (this._options.useShadows) {
            this._leftShadowDomNode = createFastDomNode(document.createElement('div'));
            this._leftShadowDomNode.setClassName('shadow');
            this._domNode.appendChild(this._leftShadowDomNode.domNode);
            this._topShadowDomNode = createFastDomNode(document.createElement('div'));
            this._topShadowDomNode.setClassName('shadow');
            this._domNode.appendChild(this._topShadowDomNode.domNode);
            this._topLeftShadowDomNode = createFastDomNode(document.createElement('div'));
            this._topLeftShadowDomNode.setClassName('shadow');
            this._domNode.appendChild(this._topLeftShadowDomNode.domNode);
        }
        else {
            this._leftShadowDomNode = null;
            this._topShadowDomNode = null;
            this._topLeftShadowDomNode = null;
        }
        this._listenOnDomNode = this._options.listenOnDomNode || this._domNode;
        this._mouseWheelToDispose = [];
        this._setListeningToMouseWheel(this._options.handleMouseWheel);
        this.onmouseover(this._listenOnDomNode, (e) => this._onMouseOver(e));
        this.onmouseleave(this._listenOnDomNode, (e) => this._onMouseLeave(e));
        this._hideTimeout = this._register(new TimeoutTimer());
        this._isDragging = false;
        this._mouseIsOver = false;
        this._shouldRender = true;
        this._revealOnScroll = true;
    }
    dispose() {
        this._mouseWheelToDispose = dispose(this._mouseWheelToDispose);
        super.dispose();
    }
    /**
     * Get the generated 'scrollable' dom node
     */
    getDomNode() {
        return this._domNode;
    }
    getOverviewRulerLayoutInfo() {
        return {
            parent: this._domNode,
            insertBefore: this._verticalScrollbar.domNode.domNode,
        };
    }
    /**
     * Delegate a pointer down event to the vertical scrollbar.
     * This is to help with clicking somewhere else and having the scrollbar react.
     */
    delegateVerticalScrollbarPointerDown(browserEvent) {
        this._verticalScrollbar.delegatePointerDown(browserEvent);
    }
    getScrollDimensions() {
        return this._scrollable.getScrollDimensions();
    }
    setScrollDimensions(dimensions) {
        this._scrollable.setScrollDimensions(dimensions, false);
    }
    /**
     * Update the class name of the scrollable element.
     */
    updateClassName(newClassName) {
        this._options.className = newClassName;
        // Defaults are different on Macs
        if (platform.isMacintosh) {
            this._options.className += ' mac';
        }
        this._domNode.className = 'monaco-scrollable-element ' + this._options.className;
    }
    /**
     * Update configuration options for the scrollbar.
     */
    updateOptions(newOptions) {
        if (typeof newOptions.handleMouseWheel !== 'undefined') {
            this._options.handleMouseWheel = newOptions.handleMouseWheel;
            this._setListeningToMouseWheel(this._options.handleMouseWheel);
        }
        if (typeof newOptions.mouseWheelScrollSensitivity !== 'undefined') {
            this._options.mouseWheelScrollSensitivity = newOptions.mouseWheelScrollSensitivity;
        }
        if (typeof newOptions.fastScrollSensitivity !== 'undefined') {
            this._options.fastScrollSensitivity = newOptions.fastScrollSensitivity;
        }
        if (typeof newOptions.scrollPredominantAxis !== 'undefined') {
            this._options.scrollPredominantAxis = newOptions.scrollPredominantAxis;
        }
        if (typeof newOptions.horizontal !== 'undefined') {
            this._options.horizontal = newOptions.horizontal;
        }
        if (typeof newOptions.vertical !== 'undefined') {
            this._options.vertical = newOptions.vertical;
        }
        if (typeof newOptions.horizontalScrollbarSize !== 'undefined') {
            this._options.horizontalScrollbarSize = newOptions.horizontalScrollbarSize;
        }
        if (typeof newOptions.verticalScrollbarSize !== 'undefined') {
            this._options.verticalScrollbarSize = newOptions.verticalScrollbarSize;
        }
        if (typeof newOptions.scrollByPage !== 'undefined') {
            this._options.scrollByPage = newOptions.scrollByPage;
        }
        this._horizontalScrollbar.updateOptions(this._options);
        this._verticalScrollbar.updateOptions(this._options);
        if (!this._options.lazyRender) {
            this._render();
        }
    }
    setRevealOnScroll(value) {
        this._revealOnScroll = value;
    }
    delegateScrollFromMouseWheelEvent(browserEvent) {
        this._onMouseWheel(new StandardWheelEvent(browserEvent));
    }
    // -------------------- mouse wheel scrolling --------------------
    _setListeningToMouseWheel(shouldListen) {
        const isListening = this._mouseWheelToDispose.length > 0;
        if (isListening === shouldListen) {
            // No change
            return;
        }
        // Stop listening (if necessary)
        this._mouseWheelToDispose = dispose(this._mouseWheelToDispose);
        // Start listening (if necessary)
        if (shouldListen) {
            const onMouseWheel = (browserEvent) => {
                this._onMouseWheel(new StandardWheelEvent(browserEvent));
            };
            this._mouseWheelToDispose.push(dom.addDisposableListener(this._listenOnDomNode, dom.EventType.MOUSE_WHEEL, onMouseWheel, {
                passive: false,
            }));
        }
    }
    _onMouseWheel(e) {
        if (e.browserEvent?.defaultPrevented) {
            return;
        }
        const classifier = MouseWheelClassifier.INSTANCE;
        if (SCROLL_WHEEL_SMOOTH_SCROLL_ENABLED) {
            classifier.acceptStandardWheelEvent(e);
        }
        // useful for creating unit tests:
        // console.log(`${Date.now()}, ${e.deltaY}, ${e.deltaX}`);
        let didScroll = false;
        if (e.deltaY || e.deltaX) {
            let deltaY = e.deltaY * this._options.mouseWheelScrollSensitivity;
            let deltaX = e.deltaX * this._options.mouseWheelScrollSensitivity;
            if (this._options.scrollPredominantAxis) {
                if (this._options.scrollYToX && deltaX + deltaY === 0) {
                    // when configured to map Y to X and we both see
                    // no dominant axis and X and Y are competing with
                    // identical values into opposite directions, we
                    // ignore the delta as we cannot make a decision then
                    deltaX = deltaY = 0;
                }
                else if (Math.abs(deltaY) >= Math.abs(deltaX)) {
                    deltaX = 0;
                }
                else {
                    deltaY = 0;
                }
            }
            if (this._options.flipAxes) {
                ;
                [deltaY, deltaX] = [deltaX, deltaY];
            }
            // Convert vertical scrolling to horizontal if shift is held, this
            // is handled at a higher level on Mac
            const shiftConvert = !platform.isMacintosh && e.browserEvent && e.browserEvent.shiftKey;
            if ((this._options.scrollYToX || shiftConvert) && !deltaX) {
                deltaX = deltaY;
                deltaY = 0;
            }
            if (e.browserEvent && e.browserEvent.altKey) {
                // fastScrolling
                deltaX = deltaX * this._options.fastScrollSensitivity;
                deltaY = deltaY * this._options.fastScrollSensitivity;
            }
            const futureScrollPosition = this._scrollable.getFutureScrollPosition();
            let desiredScrollPosition = {};
            if (deltaY) {
                const deltaScrollTop = SCROLL_WHEEL_SENSITIVITY * deltaY;
                // Here we convert values such as -0.3 to -1 or 0.3 to 1, otherwise low speed scrolling will never scroll
                const desiredScrollTop = futureScrollPosition.scrollTop -
                    (deltaScrollTop < 0 ? Math.floor(deltaScrollTop) : Math.ceil(deltaScrollTop));
                this._verticalScrollbar.writeScrollPosition(desiredScrollPosition, desiredScrollTop);
            }
            if (deltaX) {
                const deltaScrollLeft = SCROLL_WHEEL_SENSITIVITY * deltaX;
                // Here we convert values such as -0.3 to -1 or 0.3 to 1, otherwise low speed scrolling will never scroll
                const desiredScrollLeft = futureScrollPosition.scrollLeft -
                    (deltaScrollLeft < 0 ? Math.floor(deltaScrollLeft) : Math.ceil(deltaScrollLeft));
                this._horizontalScrollbar.writeScrollPosition(desiredScrollPosition, desiredScrollLeft);
            }
            // Check that we are scrolling towards a location which is valid
            desiredScrollPosition = this._scrollable.validateScrollPosition(desiredScrollPosition);
            if (futureScrollPosition.scrollLeft !== desiredScrollPosition.scrollLeft ||
                futureScrollPosition.scrollTop !== desiredScrollPosition.scrollTop) {
                const canPerformSmoothScroll = SCROLL_WHEEL_SMOOTH_SCROLL_ENABLED &&
                    this._options.mouseWheelSmoothScroll &&
                    classifier.isPhysicalMouseWheel();
                if (canPerformSmoothScroll) {
                    this._scrollable.setScrollPositionSmooth(desiredScrollPosition);
                }
                else {
                    this._scrollable.setScrollPositionNow(desiredScrollPosition);
                }
                didScroll = true;
            }
        }
        let consumeMouseWheel = didScroll;
        if (!consumeMouseWheel && this._options.alwaysConsumeMouseWheel) {
            consumeMouseWheel = true;
        }
        if (!consumeMouseWheel &&
            this._options.consumeMouseWheelIfScrollbarIsNeeded &&
            (this._verticalScrollbar.isNeeded() || this._horizontalScrollbar.isNeeded())) {
            consumeMouseWheel = true;
        }
        if (consumeMouseWheel) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
    _onDidScroll(e) {
        this._shouldRender = this._horizontalScrollbar.onDidScroll(e) || this._shouldRender;
        this._shouldRender = this._verticalScrollbar.onDidScroll(e) || this._shouldRender;
        if (this._options.useShadows) {
            this._shouldRender = true;
        }
        if (this._revealOnScroll) {
            this._reveal();
        }
        if (!this._options.lazyRender) {
            this._render();
        }
    }
    /**
     * Render / mutate the DOM now.
     * Should be used together with the ctor option `lazyRender`.
     */
    renderNow() {
        if (!this._options.lazyRender) {
            throw new Error('Please use `lazyRender` together with `renderNow`!');
        }
        this._render();
    }
    _render() {
        if (!this._shouldRender) {
            return;
        }
        this._shouldRender = false;
        this._horizontalScrollbar.render();
        this._verticalScrollbar.render();
        if (this._options.useShadows) {
            const scrollState = this._scrollable.getCurrentScrollPosition();
            const enableTop = scrollState.scrollTop > 0;
            const enableLeft = scrollState.scrollLeft > 0;
            const leftClassName = enableLeft ? ' left' : '';
            const topClassName = enableTop ? ' top' : '';
            const topLeftClassName = enableLeft || enableTop ? ' top-left-corner' : '';
            this._leftShadowDomNode.setClassName(`shadow${leftClassName}`);
            this._topShadowDomNode.setClassName(`shadow${topClassName}`);
            this._topLeftShadowDomNode.setClassName(`shadow${topLeftClassName}${topClassName}${leftClassName}`);
        }
    }
    // -------------------- fade in / fade out --------------------
    _onDragStart() {
        this._isDragging = true;
        this._reveal();
    }
    _onDragEnd() {
        this._isDragging = false;
        this._hide();
    }
    _onMouseLeave(e) {
        this._mouseIsOver = false;
        this._hide();
    }
    _onMouseOver(e) {
        this._mouseIsOver = true;
        this._reveal();
    }
    _reveal() {
        this._verticalScrollbar.beginReveal();
        this._horizontalScrollbar.beginReveal();
        this._scheduleHide();
    }
    _hide() {
        if (!this._mouseIsOver && !this._isDragging) {
            this._verticalScrollbar.beginHide();
            this._horizontalScrollbar.beginHide();
        }
    }
    _scheduleHide() {
        if (!this._mouseIsOver && !this._isDragging) {
            this._hideTimeout.cancelAndSet(() => this._hide(), HIDE_TIMEOUT);
        }
    }
}
export class ScrollableElement extends AbstractScrollableElement {
    constructor(element, options) {
        options = options || {};
        options.mouseWheelSmoothScroll = false;
        const scrollable = new Scrollable({
            forceIntegerValues: true,
            smoothScrollDuration: 0,
            scheduleAtNextAnimationFrame: (callback) => dom.scheduleAtNextAnimationFrame(dom.getWindow(element), callback),
        });
        super(element, options, scrollable);
        this._register(scrollable);
    }
    setScrollPosition(update) {
        this._scrollable.setScrollPositionNow(update);
    }
    getScrollPosition() {
        return this._scrollable.getCurrentScrollPosition();
    }
}
export class SmoothScrollableElement extends AbstractScrollableElement {
    constructor(element, options, scrollable) {
        super(element, options, scrollable);
    }
    setScrollPosition(update) {
        if (update.reuseAnimation) {
            this._scrollable.setScrollPositionSmooth(update, update.reuseAnimation);
        }
        else {
            this._scrollable.setScrollPositionNow(update);
        }
    }
    getScrollPosition() {
        return this._scrollable.getCurrentScrollPosition();
    }
}
export class DomScrollableElement extends AbstractScrollableElement {
    constructor(element, options) {
        options = options || {};
        options.mouseWheelSmoothScroll = false;
        const scrollable = new Scrollable({
            forceIntegerValues: false, // See https://github.com/microsoft/vscode/issues/139877
            smoothScrollDuration: 0,
            scheduleAtNextAnimationFrame: (callback) => dom.scheduleAtNextAnimationFrame(dom.getWindow(element), callback),
        });
        super(element, options, scrollable);
        this._register(scrollable);
        this._element = element;
        this._register(this.onScroll((e) => {
            if (e.scrollTopChanged) {
                this._element.scrollTop = e.scrollTop;
            }
            if (e.scrollLeftChanged) {
                this._element.scrollLeft = e.scrollLeft;
            }
        }));
        this.scanDomNode();
    }
    setScrollPosition(update) {
        this._scrollable.setScrollPositionNow(update);
    }
    getScrollPosition() {
        return this._scrollable.getCurrentScrollPosition();
    }
    scanDomNode() {
        // width, scrollLeft, scrollWidth, height, scrollTop, scrollHeight
        this.setScrollDimensions({
            width: this._element.clientWidth,
            scrollWidth: this._element.scrollWidth,
            height: this._element.clientHeight,
            scrollHeight: this._element.scrollHeight,
        });
        this.setScrollPosition({
            scrollLeft: this._element.scrollLeft,
            scrollTop: this._element.scrollTop,
        });
    }
}
function resolveOptions(opts) {
    const result = {
        lazyRender: typeof opts.lazyRender !== 'undefined' ? opts.lazyRender : false,
        className: typeof opts.className !== 'undefined' ? opts.className : '',
        useShadows: typeof opts.useShadows !== 'undefined' ? opts.useShadows : true,
        handleMouseWheel: typeof opts.handleMouseWheel !== 'undefined' ? opts.handleMouseWheel : true,
        flipAxes: typeof opts.flipAxes !== 'undefined' ? opts.flipAxes : false,
        consumeMouseWheelIfScrollbarIsNeeded: typeof opts.consumeMouseWheelIfScrollbarIsNeeded !== 'undefined'
            ? opts.consumeMouseWheelIfScrollbarIsNeeded
            : false,
        alwaysConsumeMouseWheel: typeof opts.alwaysConsumeMouseWheel !== 'undefined' ? opts.alwaysConsumeMouseWheel : false,
        scrollYToX: typeof opts.scrollYToX !== 'undefined' ? opts.scrollYToX : false,
        mouseWheelScrollSensitivity: typeof opts.mouseWheelScrollSensitivity !== 'undefined'
            ? opts.mouseWheelScrollSensitivity
            : 1,
        fastScrollSensitivity: typeof opts.fastScrollSensitivity !== 'undefined' ? opts.fastScrollSensitivity : 5,
        scrollPredominantAxis: typeof opts.scrollPredominantAxis !== 'undefined' ? opts.scrollPredominantAxis : true,
        mouseWheelSmoothScroll: typeof opts.mouseWheelSmoothScroll !== 'undefined' ? opts.mouseWheelSmoothScroll : true,
        arrowSize: typeof opts.arrowSize !== 'undefined' ? opts.arrowSize : 11,
        listenOnDomNode: typeof opts.listenOnDomNode !== 'undefined' ? opts.listenOnDomNode : null,
        horizontal: typeof opts.horizontal !== 'undefined' ? opts.horizontal : 1 /* ScrollbarVisibility.Auto */,
        horizontalScrollbarSize: typeof opts.horizontalScrollbarSize !== 'undefined' ? opts.horizontalScrollbarSize : 10,
        horizontalSliderSize: typeof opts.horizontalSliderSize !== 'undefined' ? opts.horizontalSliderSize : 0,
        horizontalHasArrows: typeof opts.horizontalHasArrows !== 'undefined' ? opts.horizontalHasArrows : false,
        vertical: typeof opts.vertical !== 'undefined' ? opts.vertical : 1 /* ScrollbarVisibility.Auto */,
        verticalScrollbarSize: typeof opts.verticalScrollbarSize !== 'undefined' ? opts.verticalScrollbarSize : 10,
        verticalHasArrows: typeof opts.verticalHasArrows !== 'undefined' ? opts.verticalHasArrows : false,
        verticalSliderSize: typeof opts.verticalSliderSize !== 'undefined' ? opts.verticalSliderSize : 0,
        scrollByPage: typeof opts.scrollByPage !== 'undefined' ? opts.scrollByPage : false,
    };
    result.horizontalSliderSize =
        typeof opts.horizontalSliderSize !== 'undefined'
            ? opts.horizontalSliderSize
            : result.horizontalScrollbarSize;
    result.verticalSliderSize =
        typeof opts.verticalSliderSize !== 'undefined'
            ? opts.verticalSliderSize
            : result.verticalScrollbarSize;
    // Defaults are different on Macs
    if (platform.isMacintosh) {
        result.className += ' mac';
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsYWJsZUVsZW1lbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvc2Nyb2xsYmFyL3Njcm9sbGFibGVFbGVtZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDMUQsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUE7QUFDbkMsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDckUsT0FBTyxFQUFpQyxrQkFBa0IsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRXZGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBTTlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzFELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDckMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwwQkFBMEIsQ0FBQTtBQUN6RCxPQUFPLEVBQWUsT0FBTyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbkUsT0FBTyxLQUFLLFFBQVEsTUFBTSw2QkFBNkIsQ0FBQTtBQUN2RCxPQUFPLEVBTU4sVUFBVSxHQUVWLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyx3QkFBd0IsQ0FBQTtBQUUvQixNQUFNLFlBQVksR0FBRyxHQUFHLENBQUE7QUFDeEIsTUFBTSx3QkFBd0IsR0FBRyxFQUFFLENBQUE7QUFDbkMsTUFBTSxrQ0FBa0MsR0FBRyxJQUFJLENBQUE7QUFPL0MsTUFBTSx3QkFBd0I7SUFNN0IsWUFBWSxTQUFpQixFQUFFLE1BQWMsRUFBRSxNQUFj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