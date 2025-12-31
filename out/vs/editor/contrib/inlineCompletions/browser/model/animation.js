/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getActiveWindow } from '../../../../../base/browser/dom.js';
import { observableValue, observableSignal, } from '../../../../../base/common/observable.js';
export class AnimatedValue {
    static const(value) {
        return new AnimatedValue(value, value, 0);
    }
    constructor(startValue, endValue, durationMs, _interpolationFunction = easeOutExpo) {
        this.startValue = startValue;
        this.endValue = endValue;
        this.durationMs = durationMs;
        this._interpolationFunction = _interpolationFunction;
        this.startTimeMs = Date.now();
        if (startValue === endValue) {
            this.durationMs = 0;
        }
    }
    isFinished() {
        return Date.now() >= this.startTimeMs + this.durationMs;
    }
    getValue() {
        const timePassed = Date.now() - this.startTimeMs;
        if (timePassed >= this.durationMs) {
            return this.endValue;
        }
        const value = this._interpolationFunction(timePassed, this.startValue, this.endValue - this.startValue, this.durationMs);
        return value;
    }
}
export function easeOutExpo(passedTime, start, length, totalDuration) {
    return passedTime === totalDuration
        ? start + length
        : length * (-Math.pow(2, (-10 * passedTime) / totalDuration) + 1) + start;
}
export function easeOutCubic(passedTime, start, length, totalDuration) {
    return (length * ((passedTime = passedTime / totalDuration - 1) * passedTime * passedTime + 1) + start);
}
export function linear(passedTime, start, length, totalDuration) {
    return (length * passedTime) / totalDuration + start;
}
export class ObservableAnimatedValue {
    static const(value) {
        return new ObservableAnimatedValue(AnimatedValue.const(value));
    }
    constructor(initialValue) {
        this._value = observableValue(this, initialValue);
    }
    setAnimation(value, tx) {
        this._value.set(value, tx);
    }
    changeAnimation(fn, tx) {
        const value = fn(this._value.get());
        this._value.set(value, tx);
    }
    getValue(reader) {
        const value = this._value.read(reader);
        if (!value.isFinished()) {
            Scheduler.instance.invalidateOnNextAnimationFrame(reader);
        }
        return value.getValue();
    }
}
class Scheduler {
    constructor() {
        this._counter = observableSignal(this);
        this._isScheduled = false;
    }
    static { this.instance = new Scheduler(); }
    invalidateOnNextAnimationFrame(reader) {
        this._counter.read(reader);
        if (!this._isScheduled) {
            this._isScheduled = true;
            getActiveWindow().requestAnimationFrame(() => {
                this._isScheduled = false;
                this._update();
            });
        }
    }
    _update() {
        this._counter.trigger(undefined);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5pbWF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9tb2RlbC9hbmltYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3BFLE9BQU8sRUFFTixlQUFlLEVBR2YsZ0JBQWdCLEdBQ2hCLE1BQU0sMENBQTBDLENBQUE7QUFFakQsTUFBTSxPQUFPLGFBQWE7SUFDbEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFhO1FBQ2hDLE9BQU8sSUFBSSxhQUFhLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBSUQsWUFDaUIsVUFBa0IsRUFDbEIsUUFBZ0IsRUFDaEIsVUFBa0IsRUFDakIseUJBQWdELFdBQVc7UUFINUQsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUNsQixhQUFRLEdBQVIsUUFBUSxDQUFRO1FBQ2hCLGVBQVUsR0FBVixVQUFVLENBQVE7UUFDakIsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUFxQztRQU43RCxnQkFBVyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQVF2QyxJQUFJLFVBQVUsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQTtRQUNwQixDQUFDO0lBQ0YsQ0FBQztJQUVELFVBQVU7UUFDVCxPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUE7SUFDeEQsQ0FBQztJQUVELFFBQVE7UUFDUCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLFdB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