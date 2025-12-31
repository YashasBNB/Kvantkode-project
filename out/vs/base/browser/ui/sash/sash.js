/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { $, append, EventHelper, getWindow, isHTMLElement } from '../../dom.js';
import { createStyleSheet } from '../../domStylesheets.js';
import { DomEmitter } from '../../event.js';
import { EventType, Gesture } from '../../touch.js';
import { Delayer } from '../../../common/async.js';
import { memoize } from '../../../common/decorators.js';
import { Emitter } from '../../../common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../common/lifecycle.js';
import { isMacintosh } from '../../../common/platform.js';
import './sash.css';
/**
 * Allow the sashes to be visible at runtime.
 * @remark Use for development purposes only.
 */
const DEBUG = false;
export var OrthogonalEdge;
(function (OrthogonalEdge) {
    OrthogonalEdge["North"] = "north";
    OrthogonalEdge["South"] = "south";
    OrthogonalEdge["East"] = "east";
    OrthogonalEdge["West"] = "west";
})(OrthogonalEdge || (OrthogonalEdge = {}));
export var Orientation;
(function (Orientation) {
    Orientation[Orientation["VERTICAL"] = 0] = "VERTICAL";
    Orientation[Orientation["HORIZONTAL"] = 1] = "HORIZONTAL";
})(Orientation || (Orientation = {}));
export var SashState;
(function (SashState) {
    /**
     * Disable any UI interaction.
     */
    SashState[SashState["Disabled"] = 0] = "Disabled";
    /**
     * Allow dragging down or to the right, depending on the sash orientation.
     *
     * Some OSs allow customizing the mouse cursor differently whenever
     * some resizable component can't be any smaller, but can be larger.
     */
    SashState[SashState["AtMinimum"] = 1] = "AtMinimum";
    /**
     * Allow dragging up or to the left, depending on the sash orientation.
     *
     * Some OSs allow customizing the mouse cursor differently whenever
     * some resizable component can't be any larger, but can be smaller.
     */
    SashState[SashState["AtMaximum"] = 2] = "AtMaximum";
    /**
     * Enable dragging.
     */
    SashState[SashState["Enabled"] = 3] = "Enabled";
})(SashState || (SashState = {}));
let globalSize = 4;
const onDidChangeGlobalSize = new Emitter();
export function setGlobalSashSize(size) {
    globalSize = size;
    onDidChangeGlobalSize.fire(size);
}
let globalHoverDelay = 300;
const onDidChangeHoverDelay = new Emitter();
export function setGlobalHoverDelay(size) {
    globalHoverDelay = size;
    onDidChangeHoverDelay.fire(size);
}
class MouseEventFactory {
    constructor(el) {
        this.el = el;
        this.disposables = new DisposableStore();
    }
    get onPointerMove() {
        return this.disposables.add(new DomEmitter(getWindow(this.el), 'mousemove')).event;
    }
    get onPointerUp() {
        return this.disposables.add(new DomEmitter(getWindow(this.el), 'mouseup')).event;
    }
    dispose() {
        this.disposables.dispose();
    }
}
__decorate([
    memoize
], MouseEventFactory.prototype, "onPointerMove", null);
__decorate([
    memoize
], MouseEventFactory.prototype, "onPointerUp", null);
class GestureEventFactory {
    get onPointerMove() {
        return this.disposables.add(new DomEmitter(this.el, EventType.Change)).event;
    }
    get onPointerUp() {
        return this.disposables.add(new DomEmitter(this.el, EventType.End)).event;
    }
    constructor(el) {
        this.el = el;
        this.disposables = new DisposableStore();
    }
    dispose() {
        this.disposables.dispose();
    }
}
__decorate([
    memoize
], GestureEventFactory.prototype, "onPointerMove", null);
__decorate([
    memoize
], GestureEventFactory.prototype, "onPointerUp", null);
class OrthogonalPointerEventFactory {
    get onPointerMove() {
        return this.factory.onPointerMove;
    }
    get onPointerUp() {
        return this.factory.onPointerUp;
    }
    constructor(factory) {
        this.factory = factory;
    }
    dispose() {
        // noop
    }
}
__decorate([
    memoize
], OrthogonalPointerEventFactory.prototype, "onPointerMove", null);
__decorate([
    memoize
], OrthogonalPointerEventFactory.prototype, "onPointerUp", null);
const PointerEventsDisabledCssClass = 'pointer-events-disabled';
/**
 * The {@link Sash} is the UI component which allows the user to resize other
 * components. It's usually an invisible horizontal or vertical line which, when
 * hovered, becomes highlighted and can be dragged along the perpendicular dimension
 * to its direction.
 *
 * Features:
 * - Touch event handling
 * - Corner sash support
 * - Hover with different mouse cursor support
 * - Configurable hover size
 * - Linked sash support, for 2x2 corner sashes
 */
export class Sash extends Disposable {
    get state() {
        return this._state;
    }
    get orthogonalStartSash() {
        return this._orthogonalStartSash;
    }
    get orthogonalEndSash() {
        return this._orthogonalEndSash;
    }
    /**
     * The state of a sash defines whether it can be interacted with by the user
     * as well as what mouse cursor to use, when hovered.
     */
    set state(state) {
        if (this._state === state) {
            return;
        }
        this.el.classList.toggle('disabled', state === 0 /* SashState.Disabled */);
        this.el.classList.toggle('minimum', state === 1 /* SashState.AtMinimum */);
        this.el.classList.toggle('maximum', state === 2 /* SashState.AtMaximum */);
        this._state = state;
        this.onDidEnablementChange.fire(state);
    }
    /**
     * A reference to another sash, perpendicular to this one, which
     * aligns at the start of this one. A corner sash will be created
     * automatically at that location.
     *
     * The start of a horizontal sash is its left-most position.
     * The start of a vertical sash is its top-most position.
     */
    set orthogonalStartSash(sash) {
        if (this._orthogonalStartSash === sash) {
            return;
        }
        this.orthogonalStartDragHandleDisposables.clear();
        this.orthogonalStartSashDisposables.clear();
        if (sash) {
            const onChange = (state) => {
                this.orthogonalStartDragHandleDisposables.clear();
                if (state !== 0 /* SashState.Disabled */) {
                    this._orthogonalStartDragHandle = append(this.el, $('.orthogonal-drag-handle.start'));
                    this.orthogonalStartDragHandleDisposables.add(toDisposable(() => this._orthogonalStartDragHandle.remove()));
                    this.orthogonalStartDragHandleDisposables
                        .add(new DomEmitter(this._orthogonalStartDragHandle, 'mouseenter'))
                        .event(() => Sash.onMouseEnter(sash), undefined, this.orthogonalStartDragHandleDisposables);
                    this.orthogonalStartDragHandleDisposables
                        .add(new DomEmitter(this._orthogonalStartDragHandle, 'mouseleave'))
                        .event(() => Sash.onMouseLeave(sash), undefined, this.orthogonalStartDragHandleDisposables);
                }
            };
            this.orthogonalStartSashDisposables.add(sash.onDidEnablementChange.event(onChange, this));
            onChange(sash.state);
        }
        this._orthogonalStartSash = sash;
    }
    /**
     * A reference to another sash, perpendicular to this one, which
     * aligns at the end of this one. A corner sash will be created
     * automatically at that location.
     *
     * The end of a horizontal sash is its right-most position.
     * The end of a vertical sash is its bottom-most position.
     */
    set orthogonalEndSash(sash) {
        if (this._orthogonalEndSash === sash) {
            return;
        }
        this.orthogonalEndDragHandleDisposables.clear();
        this.orthogonalEndSashDisposables.clear();
        if (sash) {
            const onChange = (state) => {
                this.orthogonalEndDragHandleDisposables.clear();
                if (state !== 0 /* SashState.Disabled */) {
                    this._orthogonalEndDragHandle = append(this.el, $('.orthogonal-drag-handle.end'));
                    this.orthogonalEndDragHandleDisposables.add(toDisposable(() => this._orthogonalEndDragHandle.remove()));
                    this.orthogonalEndDragHandleDisposables
                        .add(new DomEmitter(this._orthogonalEndDragHandle, 'mouseenter'))
                        .event(() => Sash.onMouseEnter(sash), undefined, this.orthogonalEndDragHandleDisposables);
                    this.orthogonalEndDragHandleDisposables
                        .add(new DomEmitter(this._orthogonalEndDragHandle, 'mouseleave'))
                        .event(() => Sash.onMouseLeave(sash), undefined, this.orthogonalEndDragHandleDisposables);
                }
            };
            this.orthogonalEndSashDisposables.add(sash.onDidEnablementChange.event(onChange, this));
            onChange(sash.state);
        }
        this._orthogonalEndSash = sash;
    }
    constructor(container, layoutProvider, options) {
        super();
        this.hoverDelay = globalHoverDelay;
        this.hoverDelayer = this._register(new Delayer(this.hoverDelay));
        this._state = 3 /* SashState.Enabled */;
        this.onDidEnablementChange = this._register(new Emitter());
        this._onDidStart = this._register(new Emitter());
        this._onDidChange = this._register(new Emitter());
        this._onDidReset = this._register(new Emitter());
        this._onDidEnd = this._register(new Emitter());
        this.orthogonalStartSashDisposables = this._register(new DisposableStore());
        this.orthogonalStartDragHandleDisposables = this._register(new DisposableStore());
        this.orthogonalEndSashDisposables = this._register(new DisposableStore());
        this.orthogonalEndDragHandleDisposables = this._register(new DisposableStore());
        /**
         * An event which fires whenever the user starts dragging this sash.
         */
        this.onDidStart = this._onDidStart.event;
        /**
         * An event which fires whenever the user moves the mouse while
         * dragging this sash.
         */
        this.onDidChange = this._onDidChange.event;
        /**
         * An event which fires whenever the user double clicks this sash.
         */
        this.onDidReset = this._onDidReset.event;
        /**
         * An event which fires whenever the user stops dragging this sash.
         */
        this.onDidEnd = this._onDidEnd.event;
        /**
         * A linked sash will be forwarded the same user interactions and events
         * so it moves exactly the same way as this sash.
         *
         * Useful in 2x2 grids. Not meant for widespread usage.
         */
        this.linkedSash = undefined;
        this.el = append(container, $('.monaco-sash'));
        if (options.orthogonalEdge) {
            this.el.classList.add(`orthogonal-edge-${options.orthogonalEdge}`);
        }
        if (isMacintosh) {
            this.el.classList.add('mac');
        }
        const onMouseDown = this._register(new DomEmitter(this.el, 'mousedown')).event;
        this._register(onMouseDown((e) => this.onPointerStart(e, new MouseEventFactory(container)), this));
        const onMouseDoubleClick = this._register(new DomEmitter(this.el, 'dblclick')).event;
        this._register(onMouseDoubleClick(this.onPointerDoublePress, this));
        const onMouseEnter = this._register(new DomEmitter(this.el, 'mouseenter')).event;
        this._register(onMouseEnter(() => Sash.onMouseEnter(this)));
        const onMouseLeave = this._register(new DomEmitter(this.el, 'mouseleave')).event;
        this._register(onMouseLeave(() => Sash.onMouseLeave(this)));
        this._register(Gesture.addTarget(this.el));
        const onTouchStart = this._register(new DomEmitter(this.el, EventType.Start)).event;
        this._register(onTouchStart((e) => this.onPointerStart(e, new GestureEventFactory(this.el)), this));
        const onTap = this._register(new DomEmitter(this.el, EventType.Tap)).event;
        let doubleTapTimeout = undefined;
        this._register(onTap((event) => {
            if (doubleTapTimeout) {
                clearTimeout(doubleTapTimeout);
                doubleTapTimeout = undefined;
                this.onPointerDoublePress(event);
                return;
            }
            clearTimeout(doubleTapTimeout);
            doubleTapTimeout = setTimeout(() => (doubleTapTimeout = undefined), 250);
        }, this));
        if (typeof options.size === 'number') {
            this.size = options.size;
            if (options.orientation === 0 /* Orientation.VERTICAL */) {
                this.el.style.width = `${this.size}px`;
            }
            else {
                this.el.style.height = `${this.size}px`;
            }
        }
        else {
            this.size = globalSize;
            this._register(onDidChangeGlobalSize.event((size) => {
                this.size = size;
                this.layout();
            }));
        }
        this._register(onDidChangeHoverDelay.event((delay) => (this.hoverDelay = delay)));
        this.layoutProvider = layoutProvider;
        this.orthogonalStartSash = options.orthogonalStartSash;
        this.orthogonalEndSash = options.orthogonalEndSash;
        this.orientation = options.orientation || 0 /* Orientation.VERTICAL */;
        if (this.orientation === 1 /* Orientation.HORIZONTAL */) {
            this.el.classList.add('horizontal');
            this.el.classList.remove('vertical');
        }
        else {
            this.el.classList.remove('horizontal');
            this.el.classList.add('vertical');
        }
        this.el.classList.toggle('debug', DEBUG);
        this.layout();
    }
    onPointerStart(event, pointerEventFactory) {
        EventHelper.stop(event);
        let isMultisashResize = false;
        if (!event.__orthogonalSashEvent) {
            const orthogonalSash = this.getOrthogonalSash(event);
            if (orthogonalSash) {
                isMultisashResize = true;
                event.__orthogonalSashEvent = true;
                orthogonalSash.onPointerStart(event, new OrthogonalPointerEventFactory(pointerEventFactory));
            }
        }
        if (this.linkedSash && !event.__linkedSashEvent) {
            ;
            event.__linkedSashEvent = true;
            this.linkedSash.onPointerStart(event, new OrthogonalPointerEventFactory(pointerEventFactory));
        }
        if (!this.state) {
            return;
        }
        const iframes = this.el.ownerDocument.getElementsByTagName('iframe');
        for (const iframe of iframes) {
            iframe.classList.add(PointerEventsDisabledCssClass); // disable mouse events on iframes as long as we drag the sash
        }
        const startX = event.pageX;
        const startY = event.pageY;
        const altKey = event.altKey;
        const startEvent = { startX, currentX: startX, startY, currentY: startY, altKey };
        this.el.classList.add('active');
        this._onDidStart.fire(startEvent);
        // fix https://github.com/microsoft/vscode/issues/21675
        const style = createStyleSheet(this.el);
        const updateStyle = () => {
            let cursor = '';
            if (isMultisashResize) {
                cursor = 'all-scroll';
            }
            else if (this.orientation === 1 /* Orientation.HORIZONTAL */) {
                if (this.state === 1 /* SashState.AtMinimum */) {
                    cursor = 's-resize';
                }
                else if (this.state === 2 /* SashState.AtMaximum */) {
                    cursor = 'n-resize';
                }
                else {
                    cursor = isMacintosh ? 'row-resize' : 'ns-resize';
                }
            }
            else {
                if (this.state === 1 /* SashState.AtMinimum */) {
                    cursor = 'e-resize';
                }
                else if (this.state === 2 /* SashState.AtMaximum */) {
                    cursor = 'w-resize';
                }
                else {
                    cursor = isMacintosh ? 'col-resize' : 'ew-resize';
                }
            }
            style.textContent = `* { cursor: ${cursor} !important; }`;
        };
        const disposables = new DisposableStore();
        updateStyle();
        if (!isMultisashResize) {
            this.onDidEnablementChange.event(updateStyle, null, disposables);
        }
        const onPointerMove = (e) => {
            EventHelper.stop(e, false);
            const event = { startX, currentX: e.pageX, startY, currentY: e.pageY, altKey };
            this._onDidChange.fire(event);
        };
        const onPointerUp = (e) => {
            EventHelper.stop(e, false);
            style.remove();
            this.el.classList.remove('active');
            this._onDidEnd.fire();
            disposables.dispose();
            for (const iframe of iframes) {
                iframe.classList.remove(PointerEventsDisabledCssClass);
            }
        };
        pointerEventFactory.onPointerMove(onPointerMove, null, disposables);
        pointerEventFactory.onPointerUp(onPointerUp, null, disposables);
        disposables.add(pointerEventFactory);
    }
    onPointerDoublePress(e) {
        const orthogonalSash = this.getOrthogonalSash(e);
        if (orthogonalSash) {
            orthogonalSash._onDidReset.fire();
        }
        if (this.linkedSash) {
            this.linkedSash._onDidReset.fire();
        }
        this._onDidReset.fire();
    }
    static onMouseEnter(sash, fromLinkedSash = false) {
        if (sash.el.classList.contains('active')) {
            sash.hoverDelayer.cancel();
            sash.el.classList.add('hover');
        }
        else {
            sash.hoverDelayer
                .trigger(() => sash.el.classList.add('hover'), sash.hoverDelay)
                .then(undefined, () => { });
        }
        if (!fromLinkedSash && sash.linkedSash) {
            Sash.onMouseEnter(sash.linkedSash, true);
        }
    }
    static onMouseLeave(sash, fromLinkedSash = false) {
        sash.hoverDelayer.cancel();
        sash.el.classList.remove('hover');
        if (!fromLinkedSash && sash.linkedSash) {
            Sash.onMouseLeave(sash.linkedSash, true);
        }
    }
    /**
     * Forcefully stop any user interactions with this sash.
     * Useful when hiding a parent component, while the user is still
     * interacting with the sash.
     */
    clearSashHoverState() {
        Sash.onMouseLeave(this);
    }
    /**
     * Layout the sash. The sash will size and position itself
     * based on its provided {@link ISashLayoutProvider layout provider}.
     */
    layout() {
        if (this.orientation === 0 /* Orientation.VERTICAL */) {
            const verticalProvider = this.layoutProvider;
            this.el.style.left = verticalProvider.getVerticalSashLeft(this) - this.size / 2 + 'px';
            if (verticalProvider.getVerticalSashTop) {
                this.el.style.top = verticalProvider.getVerticalSashTop(this) + 'px';
            }
            if (verticalProvider.getVerticalSashHeight) {
                this.el.style.height = verticalProvider.getVerticalSashHeight(this) + 'px';
            }
        }
        else {
            const horizontalProvider = this.layoutProvider;
            this.el.style.top = horizontalProvider.getHorizontalSashTop(this) - this.size / 2 + 'px';
            if (horizontalProvider.getHorizontalSashLeft) {
                this.el.style.left = horizontalProvider.getHorizontalSashLeft(this) + 'px';
            }
            if (horizontalProvider.getHorizontalSashWidth) {
                this.el.style.width = horizontalProvider.getHorizontalSashWidth(this) + 'px';
            }
        }
    }
    getOrthogonalSash(e) {
        const target = e.initialTarget ?? e.target;
        if (!target || !isHTMLElement(target)) {
            return undefined;
        }
        if (target.classList.contains('orthogonal-drag-handle')) {
            return target.classList.contains('start') ? this.orthogonalStartSash : this.orthogonalEndSash;
        }
        return undefined;
    }
    dispose() {
        super.dispose();
        this.el.remove();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2FzaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9zYXNoL3Nhc2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFhLFNBQVMsRUFBRSxhQUFhLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDMUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQzNDLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDbkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2xELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sMEJBQTBCLENBQUE7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDeEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3pELE9BQU8sWUFBWSxDQUFBO0FBRW5COzs7R0FHRztBQUNILE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQTtBQStCbkIsTUFBTSxDQUFOLElBQVksY0FLWDtBQUxELFdBQVksY0FBYztJQUN6QixpQ0FBZSxDQUFBO0lBQ2YsaUNBQWUsQ0FBQTtJQUNmLCtCQUFhLENBQUE7SUFDYiwrQkFBYSxDQUFBO0FBQ2QsQ0FBQyxFQUxXLGNBQWMsS0FBZCxjQUFjLFFBS3pCO0FBdURELE1BQU0sQ0FBTixJQUFrQixXQUdqQjtBQUhELFdBQWtCLFdBQVc7SUFDNUIscURBQVEs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