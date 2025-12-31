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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL2RvbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGNBQWMsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQzlDLE9BQU8sRUFBa0IscUJBQXFCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUMxRSxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUNqRSxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLGFBQWEsRUFDYixZQUFZLEVBQ1osWUFBWSxHQUVaLE1BQU0sb0JBQW9CLENBQUE7QUFDM0IsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDdkQsT0FBTyxLQUFLLEtBQUssTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQyxPQUFPLFNBQVMsTUFBTSwwQkFBMEIsQ0FBQTtBQUVoRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMvRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDakUsT0FBTyxLQUFLLFFBQVEsTUFBTSx1QkFBdUIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDdEMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ3hDLE9BQU8sRUFBYyxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDdEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDNUQsY0FBYyw0QkFBNEIsQ0FBQTtBQUMxQyxjQUFjLGdC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