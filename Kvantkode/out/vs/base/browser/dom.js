/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as browser from './browser.js';
import { BrowserFeatures } from './canIUse.js';
import { StandardKeyboardEvent } from './keyboardEvent.js';
import { StandardMouseEvent } from './mouseEvent.js';
import { AbstractIdleValue, IntervalTimer, TimeoutTimer, _runWhenIdle, } from '../common/async.js';
import { onUnexpectedError } from '../common/errors.js';
import * as event from '../common/event.js';
import dompurify from './dompurify/dompurify.js';
import { Disposable, DisposableStore, toDisposable } from '../common/lifecycle.js';
import { RemoteAuthorities, Schemas } from '../common/network.js';
import * as platform from '../common/platform.js';
import { URI } from '../common/uri.js';
import { hash } from '../common/hash.js';
import { ensureCodeWindow, mainWindow } from './window.js';
import { isPointWithinTriangle } from '../common/numbers.js';
export * from './domImpl/domObservable.js';
export * from './domImpl/n.js';
//# region Multi-Window Support Utilities
export const { registerWindow, getWindow, getDocument, getWindows, getWindowsCount, getWindowId, getWindowById, hasWindow, onDidRegisterWindow, onWillUnregisterWindow, onDidUnregisterWindow, } = (function () {
    const windows = new Map();
    ensureCodeWindow(mainWindow, 1);
    const mainWindowRegistration = { window: mainWindow, disposables: new DisposableStore() };
    windows.set(mainWindow.vscodeWindowId, mainWindowRegistration);
    const onDidRegisterWindow = new event.Emitter();
    const onDidUnregisterWindow = new event.Emitter();
    const onWillUnregisterWindow = new event.Emitter();
    function getWindowById(windowId, fallbackToMain) {
        const window = typeof windowId === 'number' ? windows.get(windowId) : undefined;
        return window ?? (fallbackToMain ? mainWindowRegistration : undefined);
    }
    return {
        onDidRegisterWindow: onDidRegisterWindow.event,
        onWillUnregisterWindow: onWillUnregisterWindow.event,
        onDidUnregisterWindow: onDidUnregisterWindow.event,
        registerWindow(window) {
            if (windows.has(window.vscodeWindowId)) {
                return Disposable.None;
            }
            const disposables = new DisposableStore();
            const registeredWindow = {
                window,
                disposables: disposables.add(new DisposableStore()),
            };
            windows.set(window.vscodeWindowId, registeredWindow);
            disposables.add(toDisposable(() => {
                windows.delete(window.vscodeWindowId);
                onDidUnregisterWindow.fire(window);
            }));
            disposables.add(addDisposableListener(window, EventType.BEFORE_UNLOAD, () => {
                onWillUnregisterWindow.fire(window);
            }));
            onDidRegisterWindow.fire(registeredWindow);
            return disposables;
        },
        getWindows() {
            return windows.values();
        },
        getWindowsCount() {
            return windows.size;
        },
        getWindowId(targetWindow) {
            return targetWindow.vscodeWindowId;
        },
        hasWindow(windowId) {
            return windows.has(windowId);
        },
        getWindowById,
        getWindow(e) {
            const candidateNode = e;
            if (candidateNode?.ownerDocument?.defaultView) {
                return candidateNode.ownerDocument.defaultView.window;
            }
            const candidateEvent = e;
            if (candidateEvent?.view) {
                return candidateEvent.view.window;
            }
            return mainWindow;
        },
        getDocument(e) {
            const candidateNode = e;
            return getWindow(candidateNode).document;
        },
    };
})();
//#endregion
export function clearNode(node) {
    while (node.firstChild) {
        node.firstChild.remove();
    }
}
class DomListener {
    constructor(node, type, handler, options) {
        this._node = node;
        this._type = type;
        this._handler = handler;
        this._options = options || false;
        this._node.addEventListener(this._type, this._handler, this._options);
    }
    dispose() {
        if (!this._handler) {
            // Already disposed
            return;
        }
        this._node.removeEventListener(this._type, this._handler, this._options);
        // Prevent leakers from holding on to the dom or handler func
        this._node = null;
        this._handler = null;
    }
}
export function addDisposableListener(node, type, handler, useCaptureOrOptions) {
    return new DomListener(node, type, handler, useCaptureOrOptions);
}
function _wrapAsStandardMouseEvent(targetWindow, handler) {
    return function (e) {
        return handler(new StandardMouseEvent(targetWindow, e));
    };
}
function _wrapAsStandardKeyboardEvent(handler) {
    return function (e) {
        return handler(new StandardKeyboardEvent(e));
    };
}
export const addStandardDisposableListener = function addStandardDisposableListener(node, type, handler, useCapture) {
    let wrapHandler = handler;
    if (type === 'click' || type === 'mousedown' || type === 'contextmenu') {
        wrapHandler = _wrapAsStandardMouseEvent(getWindow(node), handler);
    }
    else if (type === 'keydown' || type === 'keypress' || type === 'keyup') {
        wrapHandler = _wrapAsStandardKeyboardEvent(handler);
    }
    return addDisposableListener(node, type, wrapHandler, useCapture);
};
export const addStandardDisposableGenericMouseDownListener = function addStandardDisposableListener(node, handler, useCapture) {
    const wrapHandler = _wrapAsStandardMouseEvent(getWindow(node), handler);
    return addDisposableGenericMouseDownListener(node, wrapHandler, useCapture);
};
export const addStandardDisposableGenericMouseUpListener = function addStandardDisposableListener(node, handler, useCapture) {
    const wrapHandler = _wrapAsStandardMouseEvent(getWindow(node), handler);
    return addDisposableGenericMouseUpListener(node, wrapHandler, useCapture);
};
export function addDisposableGenericMouseDownListener(node, handler, useCapture) {
    return addDisposableListener(node, platform.isIOS && BrowserFeatures.pointerEvents ? EventType.POINTER_DOWN : EventType.MOUSE_DOWN, handler, useCapture);
}
export function addDisposableGenericMouseMoveListener(node, handler, useCapture) {
    return addDisposableListener(node, platform.isIOS && BrowserFeatures.pointerEvents ? EventType.POINTER_MOVE : EventType.MOUSE_MOVE, handler, useCapture);
}
export function addDisposableGenericMouseUpListener(node, handler, useCapture) {
    return addDisposableListener(node, platform.isIOS && BrowserFeatures.pointerEvents ? EventType.POINTER_UP : EventType.MOUSE_UP, handler, useCapture);
}
/**
 * Execute the callback the next time the browser is idle, returning an
 * {@link IDisposable} that will cancel the callback when disposed. This wraps
 * [requestIdleCallback] so it will fallback to [setTimeout] if the environment
 * doesn't support it.
 *
 * @param targetWindow The window for which to run the idle callback
 * @param callback The callback to run when idle, this includes an
 * [IdleDeadline] that provides the time alloted for the idle callback by the
 * browser. Not respecting this deadline will result in a degraded user
 * experience.
 * @param timeout A timeout at which point to queue no longer wait for an idle
 * callback but queue it on the regular event loop (like setTimeout). Typically
 * this should not be used.
 *
 * [IdleDeadline]: https://developer.mozilla.org/en-US/docs/Web/API/IdleDeadline
 * [requestIdleCallback]: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback
 * [setTimeout]: https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout
 */
export function runWhenWindowIdle(targetWindow, callback, timeout) {
    return _runWhenIdle(targetWindow, callback, timeout);
}
/**
 * An implementation of the "idle-until-urgent"-strategy as introduced
 * here: https://philipwalton.com/articles/idle-until-urgent/
 */
export class WindowIdleValue extends AbstractIdleValue {
    constructor(targetWindow, executor) {
        super(targetWindow, executor);
    }
}
/**
 * Schedule a callback to be run at the next animation frame.
 * This allows multiple parties to register callbacks that should run at the next animation frame.
 * If currently in an animation frame, `runner` will be executed immediately.
 * @return token that can be used to cancel the scheduled runner (only if `runner` was not executed immediately).
 */
export let runAtThisOrScheduleAtNextAnimationFrame;
/**
 * Schedule a callback to be run at the next animation frame.
 * This allows multiple parties to register callbacks that should run at the next animation frame.
 * If currently in an animation frame, `runner` will be executed at the next animation frame.
 * @return token that can be used to cancel the scheduled runner.
 */
export let scheduleAtNextAnimationFrame;
export function disposableWindowInterval(targetWindow, handler, interval, iterations) {
    let iteration = 0;
    const timer = targetWindow.setInterval(() => {
        iteration++;
        if ((typeof iterations === 'number' && iteration >= iterations) || handler() === true) {
            disposable.dispose();
        }
    }, interval);
    const disposable = toDisposable(() => {
        targetWindow.clearInterval(timer);
    });
    return disposable;
}
export class WindowIntervalTimer extends IntervalTimer {
    /**
     *
     * @param node The optional node from which the target window is determined
     */
    constructor(node) {
        super();
        this.defaultTarget = node && getWindow(node);
    }
    cancelAndSet(runner, interval, targetWindow) {
        return super.cancelAndSet(runner, interval, targetWindow ?? this.defaultTarget);
    }
}
class AnimationFrameQueueItem {
    constructor(runner, priority = 0) {
        this._runner = runner;
        this.priority = priority;
        this._canceled = false;
    }
    dispose() {
        this._canceled = true;
    }
    execute() {
        if (this._canceled) {
            return;
        }
        try {
            this._runner();
        }
        catch (e) {
            onUnexpectedError(e);
        }
    }
    // Sort by priority (largest to lowest)
    static sort(a, b) {
        return b.priority - a.priority;
    }
}
;
(function () {
    /**
     * The runners scheduled at the next animation frame
     */
    const NEXT_QUEUE = new Map();
    /**
     * The runners scheduled at the current animation frame
     */
    const CURRENT_QUEUE = new Map();
    /**
     * A flag to keep track if the native requestAnimationFrame was already called
     */
    const animFrameRequested = new Map();
    /**
     * A flag to indicate if currently handling a native requestAnimationFrame callback
     */
    const inAnimationFrameRunner = new Map();
    const animationFrameRunner = (targetWindowId) => {
        animFrameRequested.set(targetWindowId, false);
        const currentQueue = NEXT_QUEUE.get(targetWindowId) ?? [];
        CURRENT_QUEUE.set(targetWindowId, currentQueue);
        NEXT_QUEUE.set(targetWindowId, []);
        inAnimationFrameRunner.set(targetWindowId, true);
        while (currentQueue.length > 0) {
            currentQueue.sort(AnimationFrameQueueItem.sort);
            const top = currentQueue.shift();
            top.execute();
        }
        inAnimationFrameRunner.set(targetWindowId, false);
    };
    scheduleAtNextAnimationFrame = (targetWindow, runner, priority = 0) => {
        const targetWindowId = getWindowId(targetWindow);
        const item = new AnimationFrameQueueItem(runner, priority);
        let nextQueue = NEXT_QUEUE.get(targetWindowId);
        if (!nextQueue) {
            nextQueue = [];
            NEXT_QUEUE.set(targetWindowId, nextQueue);
        }
        nextQueue.push(item);
        if (!animFrameRequested.get(targetWindowId)) {
            animFrameRequested.set(targetWindowId, true);
            targetWindow.requestAnimationFrame(() => animationFrameRunner(targetWindowId));
        }
        return item;
    };
    runAtThisOrScheduleAtNextAnimationFrame = (targetWindow, runner, priority) => {
        const targetWindowId = getWindowId(targetWindow);
        if (inAnimationFrameRunner.get(targetWindowId)) {
            const item = new AnimationFrameQueueItem(runner, priority);
            let currentQueue = CURRENT_QUEUE.get(targetWindowId);
            if (!currentQueue) {
                currentQueue = [];
                CURRENT_QUEUE.set(targetWindowId, currentQueue);
            }
            currentQueue.push(item);
            return item;
        }
        else {
            return scheduleAtNextAnimationFrame(targetWindow, runner, priority);
        }
    };
})();
export function measure(targetWindow, callback) {
    return scheduleAtNextAnimationFrame(targetWindow, callback, 10000 /* must be early */);
}
export function modify(targetWindow, callback) {
    return scheduleAtNextAnimationFrame(targetWindow, callback, -10000 /* must be late */);
}
const MINIMUM_TIME_MS = 8;
const DEFAULT_EVENT_MERGER = function (lastEvent, currentEvent) {
    return currentEvent;
};
class TimeoutThrottledDomListener extends Disposable {
    constructor(node, type, handler, eventMerger = DEFAULT_EVENT_MERGER, minimumTimeMs = MINIMUM_TIME_MS) {
        super();
        let lastEvent = null;
        let lastHandlerTime = 0;
        const timeout = this._register(new TimeoutTimer());
        const invokeHandler = () => {
            lastHandlerTime = new Date().getTime();
            handler(lastEvent);
            lastEvent = null;
        };
        this._register(addDisposableListener(node, type, (e) => {
            lastEvent = eventMerger(lastEvent, e);
            const elapsedTime = new Date().getTime() - lastHandlerTime;
            if (elapsedTime >= minimumTimeMs) {
                timeout.cancel();
                invokeHandler();
            }
            else {
                timeout.setIfNotSet(invokeHandler, minimumTimeMs - elapsedTime);
            }
        }));
    }
}
export function addDisposableThrottledListener(node, type, handler, eventMerger, minimumTimeMs) {
    return new TimeoutThrottledDomListener(node, type, handler, eventMerger, minimumTimeMs);
}
export function getComputedStyle(el) {
    return getWindow(el).getComputedStyle(el, null);
}
export function getClientArea(element, defaultValue, fallbackElement) {
    const elWindow = getWindow(element);
    const elDocument = elWindow.document;
    // Try with DOM clientWidth / clientHeight
    if (element !== elDocument.body) {
        return new Dimension(element.clientWidth, element.clientHeight);
    }
    // If visual view port exits and it's on mobile, it should be used instead of window innerWidth / innerHeight, or document.body.clientWidth / document.body.clientHeight
    if (platform.isIOS && elWindow?.visualViewport) {
        return new Dimension(elWindow.visualViewport.width, elWindow.visualViewport.height);
    }
    // Try innerWidth / innerHeight
    if (elWindow?.innerWidth && elWindow.innerHeight) {
        return new Dimension(elWindow.innerWidth, elWindow.innerHeight);
    }
    // Try with document.body.clientWidth / document.body.clientHeight
    if (elDocument.body && elDocument.body.clientWidth && elDocument.body.clientHeight) {
        return new Dimension(elDocument.body.clientWidth, elDocument.body.clientHeight);
    }
    // Try with document.documentElement.clientWidth / document.documentElement.clientHeight
    if (elDocument.documentElement &&
        elDocument.documentElement.clientWidth &&
        elDocument.documentElement.clientHeight) {
        return new Dimension(elDocument.documentElement.clientWidth, elDocument.documentElement.clientHeight);
    }
    if (fallbackElement) {
        return getClientArea(fallbackElement, defaultValue);
    }
    if (defaultValue) {
        return defaultValue;
    }
    throw new Error('Unable to figure out browser width and height');
}
class SizeUtils {
    // Adapted from WinJS
    // Converts a CSS positioning string for the specified element to pixels.
    static convertToPixels(element, value) {
        return parseFloat(value) || 0;
    }
    static getDimension(element, cssPropertyName) {
        const computedStyle = getComputedStyle(element);
        const value = computedStyle ? computedStyle.getPropertyValue(cssPropertyName) : '0';
        return SizeUtils.convertToPixels(element, value);
    }
    static getBorderLeftWidth(element) {
        return SizeUtils.getDimension(element, 'border-left-width');
    }
    static getBorderRightWidth(element) {
        return SizeUtils.getDimension(element, 'border-right-width');
    }
    static getBorderTopWidth(element) {
        return SizeUtils.getDimension(element, 'border-top-width');
    }
    static getBorderBottomWidth(element) {
        return SizeUtils.getDimension(element, 'border-bottom-width');
    }
    static getPaddingLeft(element) {
        return SizeUtils.getDimension(element, 'padding-left');
    }
    static getPaddingRight(element) {
        return SizeUtils.getDimension(element, 'padding-right');
    }
    static getPaddingTop(element) {
        return SizeUtils.getDimension(element, 'padding-top');
    }
    static getPaddingBottom(element) {
        return SizeUtils.getDimension(element, 'padding-bottom');
    }
    static getMarginLeft(element) {
        return SizeUtils.getDimension(element, 'margin-left');
    }
    static getMarginTop(element) {
        return SizeUtils.getDimension(element, 'margin-top');
    }
    static getMarginRight(element) {
        return SizeUtils.getDimension(element, 'margin-right');
    }
    static getMarginBottom(element) {
        return SizeUtils.getDimension(element, 'margin-bottom');
    }
}
export class Dimension {
    static { this.None = new Dimension(0, 0); }
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }
    with(width = this.width, height = this.height) {
        if (width !== this.width || height !== this.height) {
            return new Dimension(width, height);
        }
        else {
            return this;
        }
    }
    static is(obj) {
        return (typeof obj === 'object' &&
            typeof obj.height === 'number' &&
            typeof obj.width === 'number');
    }
    static lift(obj) {
        if (obj instanceof Dimension) {
            return obj;
        }
        else {
            return new Dimension(obj.width, obj.height);
        }
    }
    static equals(a, b) {
        if (a === b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return a.width === b.width && a.height === b.height;
    }
}
export function getTopLeftOffset(element) {
    // Adapted from WinJS.Utilities.getPosition
    // and added borders to the mix
    let offsetParent = element.offsetParent;
    let top = element.offsetTop;
    let left = element.offsetLeft;
    while ((element = element.parentNode) !== null &&
        element !== element.ownerDocument.body &&
        element !== element.ownerDocument.documentElement) {
        top -= element.scrollTop;
        const c = isShadowRoot(element) ? null : getComputedStyle(element);
        if (c) {
            left -= c.direction !== 'rtl' ? element.scrollLeft : -element.scrollLeft;
        }
        if (element === offsetParent) {
            left += SizeUtils.getBorderLeftWidth(element);
            top += SizeUtils.getBorderTopWidth(element);
            top += element.offsetTop;
            left += element.offsetLeft;
            offsetParent = element.offsetParent;
        }
    }
    return {
        left: left,
        top: top,
    };
}
export function size(element, width, height) {
    if (typeof width === 'number') {
        element.style.width = `${width}px`;
    }
    if (typeof height === 'number') {
        element.style.height = `${height}px`;
    }
}
export function position(element, top, right, bottom, left, position = 'absolute') {
    if (typeof top === 'number') {
        element.style.top = `${top}px`;
    }
    if (typeof right === 'number') {
        element.style.right = `${right}px`;
    }
    if (typeof bottom === 'number') {
        element.style.bottom = `${bottom}px`;
    }
    if (typeof left === 'number') {
        element.style.left = `${left}px`;
    }
    element.style.position = position;
}
/**
 * Returns the position of a dom node relative to the entire page.
 */
export function getDomNodePagePosition(domNode) {
    const bb = domNode.getBoundingClientRect();
    const window = getWindow(domNode);
    return {
        left: bb.left + window.scrollX,
        top: bb.top + window.scrollY,
        width: bb.width,
        height: bb.height,
    };
}
/**
 * Returns the effective zoom on a given element before window zoom level is applied
 */
export function getDomNodeZoomLevel(domNode) {
    let testElement = domNode;
    let zoom = 1.0;
    do {
        const elementZoomLevel = getComputedStyle(testElement).zoom;
        if (elementZoomLevel !== null && elementZoomLevel !== undefined && elementZoomLevel !== '1') {
            zoom *= elementZoomLevel;
        }
        testElement = testElement.parentElement;
    } while (testElement !== null && testElement !== testElement.ownerDocument.documentElement);
    return zoom;
}
// Adapted from WinJS
// Gets the width of the element, including margins.
export function getTotalWidth(element) {
    const margin = SizeUtils.getMarginLeft(element) + SizeUtils.getMarginRight(element);
    return element.offsetWidth + margin;
}
export function getContentWidth(element) {
    const border = SizeUtils.getBorderLeftWidth(element) + SizeUtils.getBorderRightWidth(element);
    const padding = SizeUtils.getPaddingLeft(element) + SizeUtils.getPaddingRight(element);
    return element.offsetWidth - border - padding;
}
export function getTotalScrollWidth(element) {
    const margin = SizeUtils.getMarginLeft(element) + SizeUtils.getMarginRight(element);
    return element.scrollWidth + margin;
}
// Adapted from WinJS
// Gets the height of the content of the specified element. The content height does not include borders or padding.
export function getContentHeight(element) {
    const border = SizeUtils.getBorderTopWidth(element) + SizeUtils.getBorderBottomWidth(element);
    const padding = SizeUtils.getPaddingTop(element) + SizeUtils.getPaddingBottom(element);
    return element.offsetHeight - border - padding;
}
// Adapted from WinJS
// Gets the height of the element, including its margins.
export function getTotalHeight(element) {
    const margin = SizeUtils.getMarginTop(element) + SizeUtils.getMarginBottom(element);
    return element.offsetHeight + margin;
}
// Gets the left coordinate of the specified element relative to the specified parent.
function getRelativeLeft(element, parent) {
    if (element === null) {
        return 0;
    }
    const elementPosition = getTopLeftOffset(element);
    const parentPosition = getTopLeftOffset(parent);
    return elementPosition.left - parentPosition.left;
}
export function getLargestChildWidth(parent, children) {
    const childWidths = children.map((child) => {
        return (Math.max(getTotalScrollWidth(child), getTotalWidth(child)) + getRelativeLeft(child, parent) ||
            0);
    });
    const maxWidth = Math.max(...childWidths);
    return maxWidth;
}
// ----------------------------------------------------------------------------------------
export function isAncestor(testChild, testAncestor) {
    return Boolean(testAncestor?.contains(testChild));
}
const parentFlowToDataKey = 'parentFlowToElementId';
/**
 * Set an explicit parent to use for nodes that are not part of the
 * regular dom structure.
 */
export function setParentFlowTo(fromChildElement, toParentElement) {
    fromChildElement.dataset[parentFlowToDataKey] = toParentElement.id;
}
function getParentFlowToElement(node) {
    const flowToParentId = node.dataset[parentFlowToDataKey];
    if (typeof flowToParentId === 'string') {
        return node.ownerDocument.getElementById(flowToParentId);
    }
    return null;
}
/**
 * Check if `testAncestor` is an ancestor of `testChild`, observing the explicit
 * parents set by `setParentFlowTo`.
 */
export function isAncestorUsingFlowTo(testChild, testAncestor) {
    let node = testChild;
    while (node) {
        if (node === testAncestor) {
            return true;
        }
        if (isHTMLElement(node)) {
            const flowToParentElement = getParentFlowToElement(node);
            if (flowToParentElement) {
                node = flowToParentElement;
                continue;
            }
        }
        node = node.parentNode;
    }
    return false;
}
export function findParentWithClass(node, clazz, stopAtClazzOrNode) {
    while (node && node.nodeType === node.ELEMENT_NODE) {
        if (node.classList.contains(clazz)) {
            return node;
        }
        if (stopAtClazzOrNode) {
            if (typeof stopAtClazzOrNode === 'string') {
                if (node.classList.contains(stopAtClazzOrNode)) {
                    return null;
                }
            }
            else {
                if (node === stopAtClazzOrNode) {
                    return null;
                }
            }
        }
        node = node.parentNode;
    }
    return null;
}
export function hasParentWithClass(node, clazz, stopAtClazzOrNode) {
    return !!findParentWithClass(node, clazz, stopAtClazzOrNode);
}
export function isShadowRoot(node) {
    return node && !!node.host && !!node.mode;
}
export function isInShadowDOM(domNode) {
    return !!getShadowRoot(domNode);
}
export function getShadowRoot(domNode) {
    while (domNode.parentNode) {
        if (domNode === domNode.ownerDocument?.body) {
            // reached the body
            return null;
        }
        domNode = domNode.parentNode;
    }
    return isShadowRoot(domNode) ? domNode : null;
}
/**
 * Returns the active element across all child windows
 * based on document focus. Falls back to the main
 * window if no window has focus.
 */
export function getActiveElement() {
    let result = getActiveDocument().activeElement;
    while (result?.shadowRoot) {
        result = result.shadowRoot.activeElement;
    }
    return result;
}
/**
 * Returns true if the focused window active element matches
 * the provided element. Falls back to the main window if no
 * window has focus.
 */
export function isActiveElement(element) {
    return getActiveElement() === element;
}
/**
 * Returns true if the focused window active element is contained in
 * `ancestor`. Falls back to the main window if no window has focus.
 */
export function isAncestorOfActiveElement(ancestor) {
    return isAncestor(getActiveElement(), ancestor);
}
/**
 * Returns whether the element is in the active `document`. The active
 * document has focus or will be the main windows document.
 */
export function isActiveDocument(element) {
    return element.ownerDocument === getActiveDocument();
}
/**
 * Returns the active document across main and child windows.
 * Prefers the window with focus, otherwise falls back to
 * the main windows document.
 */
export function getActiveDocument() {
    if (getWindowsCount() <= 1) {
        return mainWindow.document;
    }
    const documents = Array.from(getWindows()).map(({ window }) => window.document);
    return documents.find((doc) => doc.hasFocus()) ?? mainWindow.document;
}
/**
 * Returns the active window across main and child windows.
 * Prefers the window with focus, otherwise falls back to
 * the main window.
 */
export function getActiveWindow() {
    const document = getActiveDocument();
    return (document.defaultView?.window ?? mainWindow);
}
export const sharedMutationObserver = new (class {
    constructor() {
        this.mutationObservers = new Map();
    }
    observe(target, disposables, options) {
        let mutationObserversPerTarget = this.mutationObservers.get(target);
        if (!mutationObserversPerTarget) {
            mutationObserversPerTarget = new Map();
            this.mutationObservers.set(target, mutationObserversPerTarget);
        }
        const optionsHash = hash(options);
        let mutationObserverPerOptions = mutationObserversPerTarget.get(optionsHash);
        if (!mutationObserverPerOptions) {
            const onDidMutate = new event.Emitter();
            const observer = new MutationObserver((mutations) => onDidMutate.fire(mutations));
            observer.observe(target, options);
            const resolvedMutationObserverPerOptions = (mutationObserverPerOptions = {
                users: 1,
                observer,
                onDidMutate: onDidMutate.event,
            });
            disposables.add(toDisposable(() => {
                resolvedMutationObserverPerOptions.users -= 1;
                if (resolvedMutationObserverPerOptions.users === 0) {
                    onDidMutate.dispose();
                    observer.disconnect();
                    mutationObserversPerTarget?.delete(optionsHash);
                    if (mutationObserversPerTarget?.size === 0) {
                        this.mutationObservers.delete(target);
                    }
                }
            }));
            mutationObserversPerTarget.set(optionsHash, mutationObserverPerOptions);
        }
        else {
            mutationObserverPerOptions.users += 1;
        }
        return mutationObserverPerOptions.onDidMutate;
    }
})();
export function createMetaElement(container = mainWindow.document.head) {
    return createHeadElement('meta', container);
}
export function createLinkElement(container = mainWindow.document.head) {
    return createHeadElement('link', container);
}
function createHeadElement(tagName, container = mainWindow.document.head) {
    const element = document.createElement(tagName);
    container.appendChild(element);
    return element;
}
export function isHTMLElement(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof HTMLElement || e instanceof getWindow(e).HTMLElement;
}
export function isHTMLAnchorElement(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof HTMLAnchorElement || e instanceof getWindow(e).HTMLAnchorElement;
}
export function isHTMLSpanElement(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof HTMLSpanElement || e instanceof getWindow(e).HTMLSpanElement;
}
export function isHTMLTextAreaElement(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof HTMLTextAreaElement || e instanceof getWindow(e).HTMLTextAreaElement;
}
export function isHTMLInputElement(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof HTMLInputElement || e instanceof getWindow(e).HTMLInputElement;
}
export function isHTMLButtonElement(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof HTMLButtonElement || e instanceof getWindow(e).HTMLButtonElement;
}
export function isHTMLDivElement(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof HTMLDivElement || e instanceof getWindow(e).HTMLDivElement;
}
export function isSVGElement(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof SVGElement || e instanceof getWindow(e).SVGElement;
}
export function isMouseEvent(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof MouseEvent || e instanceof getWindow(e).MouseEvent;
}
export function isKeyboardEvent(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof KeyboardEvent || e instanceof getWindow(e).KeyboardEvent;
}
export function isPointerEvent(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof PointerEvent || e instanceof getWindow(e).PointerEvent;
}
export function isDragEvent(e) {
    // eslint-disable-next-line no-restricted-syntax
    return e instanceof DragEvent || e instanceof getWindow(e).DragEvent;
}
export const EventType = {
    // Mouse
    CLICK: 'click',
    AUXCLICK: 'auxclick',
    DBLCLICK: 'dblclick',
    MOUSE_UP: 'mouseup',
    MOUSE_DOWN: 'mousedown',
    MOUSE_OVER: 'mouseover',
    MOUSE_MOVE: 'mousemove',
    MOUSE_OUT: 'mouseout',
    MOUSE_ENTER: 'mouseenter',
    MOUSE_LEAVE: 'mouseleave',
    MOUSE_WHEEL: 'wheel',
    POINTER_UP: 'pointerup',
    POINTER_DOWN: 'pointerdown',
    POINTER_MOVE: 'pointermove',
    POINTER_LEAVE: 'pointerleave',
    CONTEXT_MENU: 'contextmenu',
    WHEEL: 'wheel',
    // Keyboard
    KEY_DOWN: 'keydown',
    KEY_PRESS: 'keypress',
    KEY_UP: 'keyup',
    // HTML Document
    LOAD: 'load',
    BEFORE_UNLOAD: 'beforeunload',
    UNLOAD: 'unload',
    PAGE_SHOW: 'pageshow',
    PAGE_HIDE: 'pagehide',
    PASTE: 'paste',
    ABORT: 'abort',
    ERROR: 'error',
    RESIZE: 'resize',
    SCROLL: 'scroll',
    FULLSCREEN_CHANGE: 'fullscreenchange',
    WK_FULLSCREEN_CHANGE: 'webkitfullscreenchange',
    // Form
    SELECT: 'select',
    CHANGE: 'change',
    SUBMIT: 'submit',
    RESET: 'reset',
    FOCUS: 'focus',
    FOCUS_IN: 'focusin',
    FOCUS_OUT: 'focusout',
    BLUR: 'blur',
    INPUT: 'input',
    // Local Storage
    STORAGE: 'storage',
    // Drag
    DRAG_START: 'dragstart',
    DRAG: 'drag',
    DRAG_ENTER: 'dragenter',
    DRAG_LEAVE: 'dragleave',
    DRAG_OVER: 'dragover',
    DROP: 'drop',
    DRAG_END: 'dragend',
    // Animation
    ANIMATION_START: browser.isWebKit ? 'webkitAnimationStart' : 'animationstart',
    ANIMATION_END: browser.isWebKit ? 'webkitAnimationEnd' : 'animationend',
    ANIMATION_ITERATION: browser.isWebKit ? 'webkitAnimationIteration' : 'animationiteration',
};
export function isEventLike(obj) {
    const candidate = obj;
    return !!(candidate &&
        typeof candidate.preventDefault === 'function' &&
        typeof candidate.stopPropagation === 'function');
}
export const EventHelper = {
    stop: (e, cancelBubble) => {
        e.preventDefault();
        if (cancelBubble) {
            e.stopPropagation();
        }
        return e;
    },
};
export function saveParentsScrollTop(node) {
    const r = [];
    for (let i = 0; node && node.nodeType === node.ELEMENT_NODE; i++) {
        r[i] = node.scrollTop;
        node = node.parentNode;
    }
    return r;
}
export function restoreParentsScrollTop(node, state) {
    for (let i = 0; node && node.nodeType === node.ELEMENT_NODE; i++) {
        if (node.scrollTop !== state[i]) {
            node.scrollTop = state[i];
        }
        node = node.parentNode;
    }
}
class FocusTracker extends Disposable {
    static hasFocusWithin(element) {
        if (isHTMLElement(element)) {
            const shadowRoot = getShadowRoot(element);
            const activeElement = shadowRoot
                ? shadowRoot.activeElement
                : element.ownerDocument.activeElement;
            return isAncestor(activeElement, element);
        }
        else {
            const window = element;
            return isAncestor(window.document.activeElement, window.document);
        }
    }
    constructor(element) {
        super();
        this._onDidFocus = this._register(new event.Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidBlur = this._register(new event.Emitter());
        this.onDidBlur = this._onDidBlur.event;
        let hasFocus = FocusTracker.hasFocusWithin(element);
        let loosingFocus = false;
        const onFocus = () => {
            loosingFocus = false;
            if (!hasFocus) {
                hasFocus = true;
                this._onDidFocus.fire();
            }
        };
        const onBlur = () => {
            if (hasFocus) {
                loosingFocus = true;
                (isHTMLElement(element) ? getWindow(element) : element).setTimeout(() => {
                    if (loosingFocus) {
                        loosingFocus = false;
                        hasFocus = false;
                        this._onDidBlur.fire();
                    }
                }, 0);
            }
        };
        this._refreshStateHandler = () => {
            const currentNodeHasFocus = FocusTracker.hasFocusWithin(element);
            if (currentNodeHasFocus !== hasFocus) {
                if (hasFocus) {
                    onBlur();
                }
                else {
                    onFocus();
                }
            }
        };
        this._register(addDisposableListener(element, EventType.FOCUS, onFocus, true));
        this._register(addDisposableListener(element, EventType.BLUR, onBlur, true));
        if (isHTMLElement(element)) {
            this._register(addDisposableListener(element, EventType.FOCUS_IN, () => this._refreshStateHandler()));
            this._register(addDisposableListener(element, EventType.FOCUS_OUT, () => this._refreshStateHandler()));
        }
    }
    refreshState() {
        this._refreshStateHandler();
    }
}
/**
 * Creates a new `IFocusTracker` instance that tracks focus changes on the given `element` and its descendants.
 *
 * @param element The `HTMLElement` or `Window` to track focus changes on.
 * @returns An `IFocusTracker` instance.
 */
export function trackFocus(element) {
    return new FocusTracker(element);
}
export function after(sibling, child) {
    sibling.after(child);
    return child;
}
export function append(parent, ...children) {
    parent.append(...children);
    if (children.length === 1 && typeof children[0] !== 'string') {
        return children[0];
    }
}
export function prepend(parent, child) {
    parent.insertBefore(child, parent.firstChild);
    return child;
}
/**
 * Removes all children from `parent` and appends `children`
 */
export function reset(parent, ...children) {
    parent.innerText = '';
    append(parent, ...children);
}
const SELECTOR_REGEX = /([\w\-]+)?(#([\w\-]+))?((\.([\w\-]+))*)/;
export var Namespace;
(function (Namespace) {
    Namespace["HTML"] = "http://www.w3.org/1999/xhtml";
    Namespace["SVG"] = "http://www.w3.org/2000/svg";
})(Namespace || (Namespace = {}));
function _$(namespace, description, attrs, ...children) {
    const match = SELECTOR_REGEX.exec(description);
    if (!match) {
        throw new Error('Bad use of emmet');
    }
    const tagName = match[1] || 'div';
    let result;
    if (namespace !== Namespace.HTML) {
        result = document.createElementNS(namespace, tagName);
    }
    else {
        result = document.createElement(tagName);
    }
    if (match[3]) {
        result.id = match[3];
    }
    if (match[4]) {
        result.className = match[4].replace(/\./g, ' ').trim();
    }
    if (attrs) {
        Object.entries(attrs).forEach(([name, value]) => {
            if (typeof value === 'undefined') {
                return;
            }
            if (/^on\w+$/.test(name)) {
                ;
                result[name] = value;
            }
            else if (name === 'selected') {
                if (value) {
                    result.setAttribute(name, 'true');
                }
            }
            else {
                result.setAttribute(name, value);
            }
        });
    }
    result.append(...children);
    return result;
}
export function $(description, attrs, ...children) {
    return _$(Namespace.HTML, description, attrs, ...children);
}
$.SVG = function (description, attrs, ...children) {
    return _$(Namespace.SVG, description, attrs, ...children);
};
export function join(nodes, separator) {
    const result = [];
    nodes.forEach((node, index) => {
        if (index > 0) {
            if (separator instanceof Node) {
                result.push(separator.cloneNode());
            }
            else {
                result.push(document.createTextNode(separator));
            }
        }
        result.push(node);
    });
    return result;
}
export function setVisibility(visible, ...elements) {
    if (visible) {
        show(...elements);
    }
    else {
        hide(...elements);
    }
}
export function show(...elements) {
    for (const element of elements) {
        element.style.display = '';
        element.removeAttribute('aria-hidden');
    }
}
export function hide(...elements) {
    for (const element of elements) {
        element.style.display = 'none';
        element.setAttribute('aria-hidden', 'true');
    }
}
function findParentWithAttribute(node, attribute) {
    while (node && node.nodeType === node.ELEMENT_NODE) {
        if (isHTMLElement(node) && node.hasAttribute(attribute)) {
            return node;
        }
        node = node.parentNode;
    }
    return null;
}
export function removeTabIndexAndUpdateFocus(node) {
    if (!node || !node.hasAttribute('tabIndex')) {
        return;
    }
    // If we are the currently focused element and tabIndex is removed,
    // standard DOM behavior is to move focus to the <body> element. We
    // typically never want that, rather put focus to the closest element
    // in the hierarchy of the parent DOM nodes.
    if (node.ownerDocument.activeElement === node) {
        const parentFocusable = findParentWithAttribute(node.parentElement, 'tabIndex');
        parentFocusable?.focus();
    }
    node.removeAttribute('tabindex');
}
export function finalHandler(fn) {
    return (e) => {
        e.preventDefault();
        e.stopPropagation();
        fn(e);
    };
}
export function domContentLoaded(targetWindow) {
    return new Promise((resolve) => {
        const readyState = targetWindow.document.readyState;
        if (readyState === 'complete' ||
            (targetWindow.document && targetWindow.document.body !== null)) {
            resolve(undefined);
        }
        else {
            const listener = () => {
                targetWindow.window.removeEventListener('DOMContentLoaded', listener, false);
                resolve();
            };
            targetWindow.window.addEventListener('DOMContentLoaded', listener, false);
        }
    });
}
/**
 * Find a value usable for a dom node size such that the likelihood that it would be
 * displayed with constant screen pixels size is as high as possible.
 *
 * e.g. We would desire for the cursors to be 2px (CSS px) wide. Under a devicePixelRatio
 * of 1.25, the cursor will be 2.5 screen pixels wide. Depending on how the dom node aligns/"snaps"
 * with the screen pixels, it will sometimes be rendered with 2 screen pixels, and sometimes with 3 screen pixels.
 */
export function computeScreenAwareSize(window, cssPx) {
    const screenPx = window.devicePixelRatio * cssPx;
    return Math.max(1, Math.floor(screenPx)) / window.devicePixelRatio;
}
/**
 * Open safely a new window. This is the best way to do so, but you cannot tell
 * if the window was opened or if it was blocked by the browser's popup blocker.
 * If you want to tell if the browser blocked the new window, use {@link windowOpenWithSuccess}.
 *
 * See https://github.com/microsoft/monaco-editor/issues/601
 * To protect against malicious code in the linked site, particularly phishing attempts,
 * the window.opener should be set to null to prevent the linked site from having access
 * to change the location of the current page.
 * See https://mathiasbynens.github.io/rel-noopener/
 */
export function windowOpenNoOpener(url) {
    // By using 'noopener' in the `windowFeatures` argument, the newly created window will
    // not be able to use `window.opener` to reach back to the current page.
    // See https://stackoverflow.com/a/46958731
    // See https://developer.mozilla.org/en-US/docs/Web/API/Window/open#noopener
    // However, this also doesn't allow us to realize if the browser blocked
    // the creation of the window.
    mainWindow.open(url, '_blank', 'noopener');
}
/**
 * Open a new window in a popup. This is the best way to do so, but you cannot tell
 * if the window was opened or if it was blocked by the browser's popup blocker.
 * If you want to tell if the browser blocked the new window, use {@link windowOpenWithSuccess}.
 *
 * Note: this does not set {@link window.opener} to null. This is to allow the opened popup to
 * be able to use {@link window.close} to close itself. Because of this, you should only use
 * this function on urls that you trust.
 *
 * In otherwords, you should almost always use {@link windowOpenNoOpener} instead of this function.
 */
const popupWidth = 780, popupHeight = 640;
export function windowOpenPopup(url) {
    const left = Math.floor(mainWindow.screenLeft + mainWindow.innerWidth / 2 - popupWidth / 2);
    const top = Math.floor(mainWindow.screenTop + mainWindow.innerHeight / 2 - popupHeight / 2);
    mainWindow.open(url, '_blank', `width=${popupWidth},height=${popupHeight},top=${top},left=${left}`);
}
/**
 * Attempts to open a window and returns whether it succeeded. This technique is
 * not appropriate in certain contexts, like for example when the JS context is
 * executing inside a sandboxed iframe. If it is not necessary to know if the
 * browser blocked the new window, use {@link windowOpenNoOpener}.
 *
 * See https://github.com/microsoft/monaco-editor/issues/601
 * See https://github.com/microsoft/monaco-editor/issues/2474
 * See https://mathiasbynens.github.io/rel-noopener/
 *
 * @param url the url to open
 * @param noOpener whether or not to set the {@link window.opener} to null. You should leave the default
 * (true) unless you trust the url that is being opened.
 * @returns boolean indicating if the {@link window.open} call succeeded
 */
export function windowOpenWithSuccess(url, noOpener = true) {
    const newTab = mainWindow.open();
    if (newTab) {
        if (noOpener) {
            // see `windowOpenNoOpener` for details on why this is important
            ;
            newTab.opener = null;
        }
        newTab.location.href = url;
        return true;
    }
    return false;
}
export function animate(targetWindow, fn) {
    const step = () => {
        fn();
        stepDisposable = scheduleAtNextAnimationFrame(targetWindow, step);
    };
    let stepDisposable = scheduleAtNextAnimationFrame(targetWindow, step);
    return toDisposable(() => stepDisposable.dispose());
}
RemoteAuthorities.setPreferredWebSchema(/^https:/.test(mainWindow.location.href) ? 'https' : 'http');
export function triggerDownload(dataOrUri, name) {
    // If the data is provided as Buffer, we create a
    // blob URL out of it to produce a valid link
    let url;
    if (URI.isUri(dataOrUri)) {
        url = dataOrUri.toString(true);
    }
    else {
        const blob = new Blob([dataOrUri]);
        url = URL.createObjectURL(blob);
        // Ensure to free the data from DOM eventually
        setTimeout(() => URL.revokeObjectURL(url));
    }
    // In order to download from the browser, the only way seems
    // to be creating a <a> element with download attribute that
    // points to the file to download.
    // See also https://developers.google.com/web/updates/2011/08/Downloading-resources-in-HTML5-a-download
    const activeWindow = getActiveWindow();
    const anchor = document.createElement('a');
    activeWindow.document.body.appendChild(anchor);
    anchor.download = name;
    anchor.href = url;
    anchor.click();
    // Ensure to remove the element from DOM eventually
    setTimeout(() => anchor.remove());
}
export function triggerUpload() {
    return new Promise((resolve) => {
        // In order to upload to the browser, create a
        // input element of type `file` and click it
        // to gather the selected files
        const activeWindow = getActiveWindow();
        const input = document.createElement('input');
        activeWindow.document.body.appendChild(input);
        input.type = 'file';
        input.multiple = true;
        // Resolve once the input event has fired once
        event.Event.once(event.Event.fromDOMEventEmitter(input, 'input'))(() => {
            resolve(input.files ?? undefined);
        });
        input.click();
        // Ensure to remove the element from DOM eventually
        setTimeout(() => input.remove());
    });
}
export var DetectedFullscreenMode;
(function (DetectedFullscreenMode) {
    /**
     * The document is fullscreen, e.g. because an element
     * in the document requested to be fullscreen.
     */
    DetectedFullscreenMode[DetectedFullscreenMode["DOCUMENT"] = 1] = "DOCUMENT";
    /**
     * The browser is fullscreen, e.g. because the user enabled
     * native window fullscreen for it.
     */
    DetectedFullscreenMode[DetectedFullscreenMode["BROWSER"] = 2] = "BROWSER";
})(DetectedFullscreenMode || (DetectedFullscreenMode = {}));
export function detectFullscreen(targetWindow) {
    // Browser fullscreen: use DOM APIs to detect
    if (targetWindow.document.fullscreenElement ||
        targetWindow.document.webkitFullscreenElement ||
        targetWindow.document.webkitIsFullScreen) {
        return { mode: DetectedFullscreenMode.DOCUMENT, guess: false };
    }
    // There is no standard way to figure out if the browser
    // is using native fullscreen. Via checking on screen
    // height and comparing that to window height, we can guess
    // it though.
    if (targetWindow.innerHeight === targetWindow.screen.height) {
        // if the height of the window matches the screen height, we can
        // safely assume that the browser is fullscreen because no browser
        // chrome is taking height away (e.g. like toolbars).
        return { mode: DetectedFullscreenMode.BROWSER, guess: false };
    }
    if (platform.isMacintosh || platform.isLinux) {
        // macOS and Linux do not properly report `innerHeight`, only Windows does
        if (targetWindow.outerHeight === targetWindow.screen.height &&
            targetWindow.outerWidth === targetWindow.screen.width) {
            // if the height of the browser matches the screen height, we can
            // only guess that we are in fullscreen. It is also possible that
            // the user has turned off taskbars in the OS and the browser is
            // simply able to span the entire size of the screen.
            return { mode: DetectedFullscreenMode.BROWSER, guess: true };
        }
    }
    // Not in fullscreen
    return null;
}
// -- sanitize and trusted html
/**
 * Hooks dompurify using `afterSanitizeAttributes` to check that all `href` and `src`
 * attributes are valid.
 */
export function hookDomPurifyHrefAndSrcSanitizer(allowedProtocols, allowDataImages = false) {
    // https://github.com/cure53/DOMPurify/blob/main/demos/hooks-scheme-allowlist.html
    // build an anchor to map URLs to
    const anchor = document.createElement('a');
    dompurify.addHook('afterSanitizeAttributes', (node) => {
        // check all href/src attributes for validity
        for (const attr of ['href', 'src']) {
            if (node.hasAttribute(attr)) {
                const attrValue = node.getAttribute(attr);
                if (attr === 'href' && attrValue.startsWith('#')) {
                    // Allow fragment links
                    continue;
                }
                anchor.href = attrValue;
                if (!allowedProtocols.includes(anchor.protocol.replace(/:$/, ''))) {
                    if (allowDataImages && attr === 'src' && anchor.href.startsWith('data:')) {
                        continue;
                    }
                    node.removeAttribute(attr);
                }
            }
        }
    });
    return toDisposable(() => {
        dompurify.removeHook('afterSanitizeAttributes');
    });
}
const defaultSafeProtocols = [Schemas.http, Schemas.https, Schemas.command];
/**
 * List of safe, non-input html tags.
 */
export const basicMarkupHtmlTags = Object.freeze([
    'a',
    'abbr',
    'b',
    'bdo',
    'blockquote',
    'br',
    'caption',
    'cite',
    'code',
    'col',
    'colgroup',
    'dd',
    'del',
    'details',
    'dfn',
    'div',
    'dl',
    'dt',
    'em',
    'figcaption',
    'figure',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'i',
    'img',
    'input',
    'ins',
    'kbd',
    'label',
    'li',
    'mark',
    'ol',
    'p',
    'pre',
    'q',
    'rp',
    'rt',
    'ruby',
    'samp',
    'small',
    'small',
    'source',
    'span',
    'strike',
    'strong',
    'sub',
    'summary',
    'sup',
    'table',
    'tbody',
    'td',
    'tfoot',
    'th',
    'thead',
    'time',
    'tr',
    'tt',
    'u',
    'ul',
    'var',
    'video',
    'wbr',
]);
const defaultDomPurifyConfig = Object.freeze({
    ALLOWED_TAGS: [
        'a',
        'button',
        'blockquote',
        'code',
        'div',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'hr',
        'input',
        'label',
        'li',
        'p',
        'pre',
        'select',
        'small',
        'span',
        'strong',
        'textarea',
        'ul',
        'ol',
    ],
    ALLOWED_ATTR: [
        'href',
        'data-href',
        'data-command',
        'target',
        'title',
        'name',
        'src',
        'alt',
        'class',
        'id',
        'role',
        'tabindex',
        'style',
        'data-code',
        'width',
        'height',
        'align',
        'x-dispatch',
        'required',
        'checked',
        'placeholder',
        'type',
        'start',
    ],
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: true,
});
/**
 * Sanitizes the given `value` and reset the given `node` with it.
 */
export function safeInnerHtml(node, value, extraDomPurifyConfig) {
    const hook = hookDomPurifyHrefAndSrcSanitizer(defaultSafeProtocols);
    try {
        const html = dompurify.sanitize(value, { ...defaultDomPurifyConfig, ...extraDomPurifyConfig });
        node.innerHTML = html;
    }
    finally {
        hook.dispose();
    }
}
/**
 * Convert a Unicode string to a string in which each 16-bit unit occupies only one byte
 *
 * From https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/btoa
 */
function toBinary(str) {
    const codeUnits = new Uint16Array(str.length);
    for (let i = 0; i < codeUnits.length; i++) {
        codeUnits[i] = str.charCodeAt(i);
    }
    let binary = '';
    const uint8array = new Uint8Array(codeUnits.buffer);
    for (let i = 0; i < uint8array.length; i++) {
        binary += String.fromCharCode(uint8array[i]);
    }
    return binary;
}
/**
 * Version of the global `btoa` function that handles multi-byte characters instead
 * of throwing an exception.
 */
export function multibyteAwareBtoa(str) {
    return btoa(toBinary(str));
}
export class ModifierKeyEmitter extends event.Emitter {
    constructor() {
        super();
        this._subscriptions = new DisposableStore();
        this._keyStatus = {
            altKey: false,
            shiftKey: false,
            ctrlKey: false,
            metaKey: false,
        };
        this._subscriptions.add(event.Event.runAndSubscribe(onDidRegisterWindow, ({ window, disposables }) => this.registerListeners(window, disposables), { window: mainWindow, disposables: this._subscriptions }));
    }
    registerListeners(window, disposables) {
        disposables.add(addDisposableListener(window, 'keydown', (e) => {
            if (e.defaultPrevented) {
                return;
            }
            const event = new StandardKeyboardEvent(e);
            // If Alt-key keydown event is repeated, ignore it #112347
            // Only known to be necessary for Alt-Key at the moment #115810
            if (event.keyCode === 6 /* KeyCode.Alt */ && e.repeat) {
                return;
            }
            if (e.altKey && !this._keyStatus.altKey) {
                this._keyStatus.lastKeyPressed = 'alt';
            }
            else if (e.ctrlKey && !this._keyStatus.ctrlKey) {
                this._keyStatus.lastKeyPressed = 'ctrl';
            }
            else if (e.metaKey && !this._keyStatus.metaKey) {
                this._keyStatus.lastKeyPressed = 'meta';
            }
            else if (e.shiftKey && !this._keyStatus.shiftKey) {
                this._keyStatus.lastKeyPressed = 'shift';
            }
            else if (event.keyCode !== 6 /* KeyCode.Alt */) {
                this._keyStatus.lastKeyPressed = undefined;
            }
            else {
                return;
            }
            this._keyStatus.altKey = e.altKey;
            this._keyStatus.ctrlKey = e.ctrlKey;
            this._keyStatus.metaKey = e.metaKey;
            this._keyStatus.shiftKey = e.shiftKey;
            if (this._keyStatus.lastKeyPressed) {
                this._keyStatus.event = e;
                this.fire(this._keyStatus);
            }
        }, true));
        disposables.add(addDisposableListener(window, 'keyup', (e) => {
            if (e.defaultPrevented) {
                return;
            }
            if (!e.altKey && this._keyStatus.altKey) {
                this._keyStatus.lastKeyReleased = 'alt';
            }
            else if (!e.ctrlKey && this._keyStatus.ctrlKey) {
                this._keyStatus.lastKeyReleased = 'ctrl';
            }
            else if (!e.metaKey && this._keyStatus.metaKey) {
                this._keyStatus.lastKeyReleased = 'meta';
            }
            else if (!e.shiftKey && this._keyStatus.shiftKey) {
                this._keyStatus.lastKeyReleased = 'shift';
            }
            else {
                this._keyStatus.lastKeyReleased = undefined;
            }
            if (this._keyStatus.lastKeyPressed !== this._keyStatus.lastKeyReleased) {
                this._keyStatus.lastKeyPressed = undefined;
            }
            this._keyStatus.altKey = e.altKey;
            this._keyStatus.ctrlKey = e.ctrlKey;
            this._keyStatus.metaKey = e.metaKey;
            this._keyStatus.shiftKey = e.shiftKey;
            if (this._keyStatus.lastKeyReleased) {
                this._keyStatus.event = e;
                this.fire(this._keyStatus);
            }
        }, true));
        disposables.add(addDisposableListener(window.document.body, 'mousedown', () => {
            this._keyStatus.lastKeyPressed = undefined;
        }, true));
        disposables.add(addDisposableListener(window.document.body, 'mouseup', () => {
            this._keyStatus.lastKeyPressed = undefined;
        }, true));
        disposables.add(addDisposableListener(window.document.body, 'mousemove', (e) => {
            if (e.buttons) {
                this._keyStatus.lastKeyPressed = undefined;
            }
        }, true));
        disposables.add(addDisposableListener(window, 'blur', () => {
            this.resetKeyStatus();
        }));
    }
    get keyStatus() {
        return this._keyStatus;
    }
    get isModifierPressed() {
        return (this._keyStatus.altKey ||
            this._keyStatus.ctrlKey ||
            this._keyStatus.metaKey ||
            this._keyStatus.shiftKey);
    }
    /**
     * Allows to explicitly reset the key status based on more knowledge (#109062)
     */
    resetKeyStatus() {
        this.doResetKeyStatus();
        this.fire(this._keyStatus);
    }
    doResetKeyStatus() {
        this._keyStatus = {
            altKey: false,
            shiftKey: false,
            ctrlKey: false,
            metaKey: false,
        };
    }
    static getInstance() {
        if (!ModifierKeyEmitter.instance) {
            ModifierKeyEmitter.instance = new ModifierKeyEmitter();
        }
        return ModifierKeyEmitter.instance;
    }
    dispose() {
        super.dispose();
        this._subscriptions.dispose();
    }
}
export function getCookieValue(name) {
    const match = document.cookie.match('(^|[^;]+)\\s*' + name + '\\s*=\\s*([^;]+)'); // See https://stackoverflow.com/a/25490531
    return match ? match.pop() : undefined;
}
export class DragAndDropObserver extends Disposable {
    constructor(element, callbacks) {
        super();
        this.element = element;
        this.callbacks = callbacks;
        // A helper to fix issues with repeated DRAG_ENTER / DRAG_LEAVE
        // calls see https://github.com/microsoft/vscode/issues/14470
        // when the element has child elements where the events are fired
        // repeadedly.
        this.counter = 0;
        // Allows to measure the duration of the drag operation.
        this.dragStartTime = 0;
        this.registerListeners();
    }
    registerListeners() {
        if (this.callbacks.onDragStart) {
            this._register(addDisposableListener(this.element, EventType.DRAG_START, (e) => {
                this.callbacks.onDragStart?.(e);
            }));
        }
        if (this.callbacks.onDrag) {
            this._register(addDisposableListener(this.element, EventType.DRAG, (e) => {
                this.callbacks.onDrag?.(e);
            }));
        }
        this._register(addDisposableListener(this.element, EventType.DRAG_ENTER, (e) => {
            this.counter++;
            this.dragStartTime = e.timeStamp;
            this.callbacks.onDragEnter?.(e);
        }));
        this._register(addDisposableListener(this.element, EventType.DRAG_OVER, (e) => {
            e.preventDefault(); // needed so that the drop event fires (https://stackoverflow.com/questions/21339924/drop-event-not-firing-in-chrome)
            this.callbacks.onDragOver?.(e, e.timeStamp - this.dragStartTime);
        }));
        this._register(addDisposableListener(this.element, EventType.DRAG_LEAVE, (e) => {
            this.counter--;
            if (this.counter === 0) {
                this.dragStartTime = 0;
                this.callbacks.onDragLeave?.(e);
            }
        }));
        this._register(addDisposableListener(this.element, EventType.DRAG_END, (e) => {
            this.counter = 0;
            this.dragStartTime = 0;
            this.callbacks.onDragEnd?.(e);
        }));
        this._register(addDisposableListener(this.element, EventType.DROP, (e) => {
            this.counter = 0;
            this.dragStartTime = 0;
            this.callbacks.onDrop?.(e);
        }));
    }
}
const H_REGEX = /(?<tag>[\w\-]+)?(?:#(?<id>[\w\-]+))?(?<class>(?:\.(?:[\w\-]+))*)(?:@(?<name>(?:[\w\_])+))?/;
export function h(tag, ...args) {
    let attributes;
    let children;
    if (Array.isArray(args[0])) {
        attributes = {};
        children = args[0];
    }
    else {
        attributes = args[0] || {};
        children = args[1];
    }
    const match = H_REGEX.exec(tag);
    if (!match || !match.groups) {
        throw new Error('Bad use of h');
    }
    const tagName = match.groups['tag'] || 'div';
    const el = document.createElement(tagName);
    if (match.groups['id']) {
        el.id = match.groups['id'];
    }
    const classNames = [];
    if (match.groups['class']) {
        for (const className of match.groups['class'].split('.')) {
            if (className !== '') {
                classNames.push(className);
            }
        }
    }
    if (attributes.className !== undefined) {
        for (const className of attributes.className.split('.')) {
            if (className !== '') {
                classNames.push(className);
            }
        }
    }
    if (classNames.length > 0) {
        el.className = classNames.join(' ');
    }
    const result = {};
    if (match.groups['name']) {
        result[match.groups['name']] = el;
    }
    if (children) {
        for (const c of children) {
            if (isHTMLElement(c)) {
                el.appendChild(c);
            }
            else if (typeof c === 'string') {
                el.append(c);
            }
            else if ('root' in c) {
                Object.assign(result, c);
                el.appendChild(c.root);
            }
        }
    }
    for (const [key, value] of Object.entries(attributes)) {
        if (key === 'className') {
            continue;
        }
        else if (key === 'style') {
            for (const [cssKey, cssValue] of Object.entries(value)) {
                el.style.setProperty(camelCaseToHyphenCase(cssKey), typeof cssValue === 'number' ? cssValue + 'px' : '' + cssValue);
            }
        }
        else if (key === 'tabIndex') {
            el.tabIndex = value;
        }
        else {
            el.setAttribute(camelCaseToHyphenCase(key), value.toString());
        }
    }
    result['root'] = el;
    return result;
}
/** @deprecated This is a duplication of the h function. Needs cleanup. */
export function svgElem(tag, ...args) {
    let attributes;
    let children;
    if (Array.isArray(args[0])) {
        attributes = {};
        children = args[0];
    }
    else {
        attributes = args[0] || {};
        children = args[1];
    }
    const match = H_REGEX.exec(tag);
    if (!match || !match.groups) {
        throw new Error('Bad use of h');
    }
    const tagName = match.groups['tag'] || 'div';
    const el = document.createElementNS('http://www.w3.org/2000/svg', tagName);
    if (match.groups['id']) {
        el.id = match.groups['id'];
    }
    const classNames = [];
    if (match.groups['class']) {
        for (const className of match.groups['class'].split('.')) {
            if (className !== '') {
                classNames.push(className);
            }
        }
    }
    if (attributes.className !== undefined) {
        for (const className of attributes.className.split('.')) {
            if (className !== '') {
                classNames.push(className);
            }
        }
    }
    if (classNames.length > 0) {
        el.className = classNames.join(' ');
    }
    const result = {};
    if (match.groups['name']) {
        result[match.groups['name']] = el;
    }
    if (children) {
        for (const c of children) {
            if (isHTMLElement(c)) {
                el.appendChild(c);
            }
            else if (typeof c === 'string') {
                el.append(c);
            }
            else if ('root' in c) {
                Object.assign(result, c);
                el.appendChild(c.root);
            }
        }
    }
    for (const [key, value] of Object.entries(attributes)) {
        if (key === 'className') {
            continue;
        }
        else if (key === 'style') {
            for (const [cssKey, cssValue] of Object.entries(value)) {
                el.style.setProperty(camelCaseToHyphenCase(cssKey), typeof cssValue === 'number' ? cssValue + 'px' : '' + cssValue);
            }
        }
        else if (key === 'tabIndex') {
            el.tabIndex = value;
        }
        else {
            el.setAttribute(camelCaseToHyphenCase(key), value.toString());
        }
    }
    result['root'] = el;
    return result;
}
function camelCaseToHyphenCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
export function copyAttributes(from, to, filter) {
    for (const { name, value } of from.attributes) {
        if (!filter || filter.includes(name)) {
            to.setAttribute(name, value);
        }
    }
}
function copyAttribute(from, to, name) {
    const value = from.getAttribute(name);
    if (value) {
        to.setAttribute(name, value);
    }
    else {
        to.removeAttribute(name);
    }
}
export function trackAttributes(from, to, filter) {
    copyAttributes(from, to, filter);
    const disposables = new DisposableStore();
    disposables.add(sharedMutationObserver.observe(from, disposables, {
        attributes: true,
        attributeFilter: filter,
    })((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName) {
                copyAttribute(from, to, mutation.attributeName);
            }
        }
    }));
    return disposables;
}
export function isEditableElement(element) {
    return (element.tagName.toLowerCase() === 'input' ||
        element.tagName.toLowerCase() === 'textarea' ||
        (isHTMLElement(element) && !!element.editContext));
}
/**
 * Helper for calculating the "safe triangle" occluded by hovers to avoid early dismissal.
 * @see https://www.smashingmagazine.com/2023/08/better-context-menus-safe-triangles/ for example
 */
export class SafeTriangle {
    constructor(originX, originY, target) {
        this.originX = originX;
        this.originY = originY;
        // 4 points (x, y), 8 length
        this.points = new Int16Array(8);
        const { top, left, right, bottom } = target.getBoundingClientRect();
        const t = this.points;
        let i = 0;
        t[i++] = left;
        t[i++] = top;
        t[i++] = right;
        t[i++] = top;
        t[i++] = left;
        t[i++] = bottom;
        t[i++] = right;
        t[i++] = bottom;
    }
    contains(x, y) {
        const { points, originX, originY } = this;
        for (let i = 0; i < 4; i++) {
            const p1 = 2 * i;
            const p2 = 2 * ((i + 1) % 4);
            if (isPointWithinTriangle(x, y, originX, originY, points[p1], points[p1 + 1], points[p2], points[p2 + 1])) {
                return true;
            }
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvZG9tLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0sY0FBYyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDOUMsT0FBTyxFQUFrQixxQkFBcUIsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzFFLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQ2pFLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsYUFBYSxFQUNiLFlBQVksRUFDWixZQUFZLEdBRVosTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN2RCxPQUFPLEtBQUssS0FBSyxNQUFNLG9CQUFvQixDQUFBO0FBQzNDLE9BQU8sU0FBUyxNQUFNLDBCQUEwQixDQUFBO0FBRWhELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQy9GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUNqRSxPQUFPLEtBQUssUUFBUSxNQUFNLHVCQUF1QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDeEMsT0FBTyxFQUFjLGdCQUFnQixFQUFFLFVBQVUsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUN0RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUM1RCxjQUFjLDRCQUE0QixDQUFBO0FBQzFDLGNB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