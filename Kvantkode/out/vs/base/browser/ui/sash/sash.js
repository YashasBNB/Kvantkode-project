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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2FzaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL3Nhc2gvc2FzaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQWEsU0FBUyxFQUFFLGFBQWEsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUMxRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDM0MsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwwQkFBMEIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN4RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDekQsT0FBTyxZQUFZLENBQUE7QUFFbkI7OztHQUdHO0FBQ0gsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFBO0FBK0JuQixNQUFNLENBQU4sSUFBWSxjQUtYO0FBTEQsV0FBWSxjQUFjO0lBQ3pCLGlDQUFlLENBQUE7SUFDZixpQ0FBZSxDQUFBO0lBQ2YsK0JBQWEsQ0FBQTtJQUNiLCtCQUFhLENBQUE7QUFDZCxDQUFDLEVBTFcsY0FBYyxLQUFkLGNBQWMsUUFLekI7QUF1REQsTUFBTSxDQUFOLElBQWtCLFdBR2pCO0FBSEQsV0FBa0IsV0FBVztJQUM1Qixx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