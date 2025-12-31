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
import * as DomUtils from './dom.js';
import { mainWindow } from './window.js';
import { memoize } from '../common/decorators.js';
import { Event as EventUtils } from '../common/event.js';
import { Disposable, markAsSingleton, toDisposable } from '../common/lifecycle.js';
import { LinkedList } from '../common/linkedList.js';
export var EventType;
(function (EventType) {
    EventType.Tap = '-monaco-gesturetap';
    EventType.Change = '-monaco-gesturechange';
    EventType.Start = '-monaco-gesturestart';
    EventType.End = '-monaco-gesturesend';
    EventType.Contextmenu = '-monaco-gesturecontextmenu';
})(EventType || (EventType = {}));
export class Gesture extends Disposable {
    static { this.SCROLL_FRICTION = -0.005; }
    static { this.HOLD_DELAY = 700; }
    static { this.CLEAR_TAP_COUNT_TIME = 400; } // ms
    constructor() {
        super();
        this.dispatched = false;
        this.targets = new LinkedList();
        this.ignoreTargets = new LinkedList();
        this.activeTouches = {};
        this.handle = null;
        this._lastSetTapCountTime = 0;
        this._register(EventUtils.runAndSubscribe(DomUtils.onDidRegisterWindow, ({ window, disposables }) => {
            disposables.add(DomUtils.addDisposableListener(window.document, 'touchstart', (e) => this.onTouchStart(e), { passive: false }));
            disposables.add(DomUtils.addDisposableListener(window.document, 'touchend', (e) => this.onTouchEnd(window, e)));
            disposables.add(DomUtils.addDisposableListener(window.document, 'touchmove', (e) => this.onTouchMove(e), { passive: false }));
        }, { window: mainWindow, disposables: this._store }));
    }
    static addTarget(element) {
        if (!Gesture.isTouchDevice()) {
            return Disposable.None;
        }
        if (!Gesture.INSTANCE) {
            Gesture.INSTANCE = markAsSingleton(new Gesture());
        }
        const remove = Gesture.INSTANCE.targets.push(element);
        return toDisposable(remove);
    }
    static ignoreTarget(element) {
        if (!Gesture.isTouchDevice()) {
            return Disposable.None;
        }
        if (!Gesture.INSTANCE) {
            Gesture.INSTANCE = markAsSingleton(new Gesture());
        }
        const remove = Gesture.INSTANCE.ignoreTargets.push(element);
        return toDisposable(remove);
    }
    static isTouchDevice() {
        // `'ontouchstart' in window` always evaluates to true with typescript's modern typings. This causes `window` to be
        // `never` later in `window.navigator`. That's why we need the explicit `window as Window` cast
        return 'ontouchstart' in mainWindow || navigator.maxTouchPoints > 0;
    }
    dispose() {
        if (this.handle) {
            this.handle.dispose();
            this.handle = null;
        }
        super.dispose();
    }
    onTouchStart(e) {
        const timestamp = Date.now(); // use Date.now() because on FF e.timeStamp is not epoch based.
        if (this.handle) {
            this.handle.dispose();
            this.handle = null;
        }
        for (let i = 0, len = e.targetTouches.length; i < len; i++) {
            const touch = e.targetTouches.item(i);
            this.activeTouches[touch.identifier] = {
                id: touch.identifier,
                initialTarget: touch.target,
                initialTimeStamp: timestamp,
                initialPageX: touch.pageX,
                initialPageY: touch.pageY,
                rollingTimestamps: [timestamp],
                rollingPageX: [touch.pageX],
                rollingPageY: [touch.pageY],
            };
            const evt = this.newGestureEvent(EventType.Start, touch.target);
            evt.pageX = touch.pageX;
            evt.pageY = touch.pageY;
            this.dispatchEvent(evt);
        }
        if (this.dispatched) {
            e.preventDefault();
            e.stopPropagation();
            this.dispatched = false;
        }
    }
    onTouchEnd(targetWindow, e) {
        const timestamp = Date.now(); // use Date.now() because on FF e.timeStamp is not epoch based.
        const activeTouchCount = Object.keys(this.activeTouches).length;
        for (let i = 0, len = e.changedTouches.length; i < len; i++) {
            const touch = e.changedTouches.item(i);
            if (!this.activeTouches.hasOwnProperty(String(touch.identifier))) {
                console.warn('move of an UNKNOWN touch', touch);
                continue;
            }
            const data = this.activeTouches[touch.identifier], holdTime = Date.now() - data.initialTimeStamp;
            if (holdTime < Gesture.HOLD_DELAY &&
                Math.abs(data.initialPageX - data.rollingPageX.at(-1)) < 30 &&
                Math.abs(data.initialPageY - data.rollingPageY.at(-1)) < 30) {
                const evt = this.newGestureEvent(EventType.Tap, data.initialTarget);
                evt.pageX = data.rollingPageX.at(-1);
                evt.pageY = data.rollingPageY.at(-1);
                this.dispatchEvent(evt);
            }
            else if (holdTime >= Gesture.HOLD_DELAY &&
                Math.abs(data.initialPageX - data.rollingPageX.at(-1)) < 30 &&
                Math.abs(data.initialPageY - data.rollingPageY.at(-1)) < 30) {
                const evt = this.newGestureEvent(EventType.Contextmenu, data.initialTarget);
                evt.pageX = data.rollingPageX.at(-1);
                evt.pageY = data.rollingPageY.at(-1);
                this.dispatchEvent(evt);
            }
            else if (activeTouchCount === 1) {
                const finalX = data.rollingPageX.at(-1);
                const finalY = data.rollingPageY.at(-1);
                const deltaT = data.rollingTimestamps.at(-1) - data.rollingTimestamps[0];
                const deltaX = finalX - data.rollingPageX[0];
                const deltaY = finalY - data.rollingPageY[0];
                // We need to get all the dispatch targets on the start of the inertia event
                const dispatchTo = [...this.targets].filter((t) => data.initialTarget instanceof Node && t.contains(data.initialTarget));
                this.inertia(targetWindow, dispatchTo, timestamp, // time now
                Math.abs(deltaX) / deltaT, // speed
                deltaX > 0 ? 1 : -1, // x direction
                finalX, // x now
                Math.abs(deltaY) / deltaT, // y speed
                deltaY > 0 ? 1 : -1, // y direction
                finalY);
            }
            this.dispatchEvent(this.newGestureEvent(EventType.End, data.initialTarget));
            // forget about this touch
            delete this.activeTouches[touch.identifier];
        }
        if (this.dispatched) {
            e.preventDefault();
            e.stopPropagation();
            this.dispatched = false;
        }
    }
    newGestureEvent(type, initialTarget) {
        const event = document.createEvent('CustomEvent');
        event.initEvent(type, false, true);
        event.initialTarget = initialTarget;
        event.tapCount = 0;
        return event;
    }
    dispatchEvent(event) {
        if (event.type === EventType.Tap) {
            const currentTime = new Date().getTime();
            let setTapCount = 0;
            if (currentTime - this._lastSetTapCountTime > Gesture.CLEAR_TAP_COUNT_TIME) {
                setTapCount = 1;
            }
            else {
                setTapCount = 2;
            }
            this._lastSetTapCountTime = currentTime;
            event.tapCount = setTapCount;
        }
        else if (event.type === EventType.Change || event.type === EventType.Contextmenu) {
            // tap is canceled by scrolling or context menu
            this._lastSetTapCountTime = 0;
        }
        if (event.initialTarget instanceof Node) {
            for (const ignoreTarget of this.ignoreTargets) {
                if (ignoreTarget.contains(event.initialTarget)) {
                    return;
                }
            }
            const targets = [];
            for (const target of this.targets) {
                if (target.contains(event.initialTarget)) {
                    let depth = 0;
                    let now = event.initialTarget;
                    while (now && now !== target) {
                        depth++;
                        now = now.parentElement;
                    }
                    targets.push([depth, target]);
                }
            }
            targets.sort((a, b) => a[0] - b[0]);
            for (const [_, target] of targets) {
                target.dispatchEvent(event);
                this.dispatched = true;
            }
        }
    }
    inertia(targetWindow, dispatchTo, t1, vX, dirX, x, vY, dirY, y) {
        this.handle = DomUtils.scheduleAtNextAnimationFrame(targetWindow, () => {
            const now = Date.now();
            // velocity: old speed + accel_over_time
            const deltaT = now - t1;
            let delta_pos_x = 0, delta_pos_y = 0;
            let stopped = true;
            vX += Gesture.SCROLL_FRICTION * deltaT;
            vY += Gesture.SCROLL_FRICTION * deltaT;
            if (vX > 0) {
                stopped = false;
                delta_pos_x = dirX * vX * deltaT;
            }
            if (vY > 0) {
                stopped = false;
                delta_pos_y = dirY * vY * deltaT;
            }
            // dispatch translation event
            const evt = this.newGestureEvent(EventType.Change);
            evt.translationX = delta_pos_x;
            evt.translationY = delta_pos_y;
            dispatchTo.forEach((d) => d.dispatchEvent(evt));
            if (!stopped) {
                this.inertia(targetWindow, dispatchTo, now, vX, dirX, x + delta_pos_x, vY, dirY, y + delta_pos_y);
            }
        });
    }
    onTouchMove(e) {
        const timestamp = Date.now(); // use Date.now() because on FF e.timeStamp is not epoch based.
        for (let i = 0, len = e.changedTouches.length; i < len; i++) {
            const touch = e.changedTouches.item(i);
            if (!this.activeTouches.hasOwnProperty(String(touch.identifier))) {
                console.warn('end of an UNKNOWN touch', touch);
                continue;
            }
            const data = this.activeTouches[touch.identifier];
            const evt = this.newGestureEvent(EventType.Change, data.initialTarget);
            evt.translationX = touch.pageX - data.rollingPageX.at(-1);
            evt.translationY = touch.pageY - data.rollingPageY.at(-1);
            evt.pageX = touch.pageX;
            evt.pageY = touch.pageY;
            this.dispatchEvent(evt);
            // only keep a few data points, to average the final speed
            if (data.rollingPageX.length > 3) {
                data.rollingPageX.shift();
                data.rollingPageY.shift();
                data.rollingTimestamps.shift();
            }
            data.rollingPageX.push(touch.pageX);
            data.rollingPageY.push(touch.pageY);
            data.rollingTimestamps.push(timestamp);
        }
        if (this.dispatched) {
            e.preventDefault();
            e.stopPropagation();
            this.dispatched = false;
        }
    }
}
__decorate([
    memoize
], Gesture, "isTouchDevice", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG91Y2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdG91Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLFFBQVEsTUFBTSxVQUFVLENBQUE7QUFDcEMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDakQsT0FBTyxFQUFFLEtBQUssSUFBSSxVQUFVLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFlLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMvRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFcEQsTUFBTSxLQUFXLFNBQVMsQ0FNekI7QUFORCxXQUFpQixTQUFTO0lBQ1osYUFBRyxHQUFHLG9CQUFvQixDQUFBO0lBQzFCLGdCQUFNLEdBQUcsdUJBQXVCLENBQUE7SUFDaEMsZUFBSyxHQUFHLHNCQUFzQixDQUFBO0lBQzlCLGFBQUcsR0FBRyxxQkFBcUIsQ0FBQTtJQUMzQixxQkFBVyxHQUFHLDRCQUE0QixDQUFBO0FBQ3hELENBQUMsRUFOZ0IsU0FBUyxLQUFULFNBQVMsUUFNekI7QUFrREQsTUFBTSxPQUFPLE9BQVEsU0FBUSxVQUFVO2FBQ2Qsb0JBQWUsR0FBRyxDQUFDLEtBQUssQUFBVCxDQUFTO2FBRXhCLGVBQVUsR0FBRyxHQUFHLEFBQU4sQ0FBTTthQVdoQix5QkFBb0IsR0FBRyxHQUFHLEFBQU4sQ0FBTSxHQUFDLEtBQUs7SUFFeEQ7UUFDQyxLQUFLLEVBQUUsQ0FBQTtRQVpBLGVBQVUsR0FBRyxLQUFLLENBQUE7UUFDVCxZQUFPLEdBQUcsSUFBSSxVQUFVLEVBQWUsQ0FB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