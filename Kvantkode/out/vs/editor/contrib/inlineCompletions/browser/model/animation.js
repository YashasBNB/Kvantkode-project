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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5pbWF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL21vZGVsL2FuaW1hdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDcEUsT0FBTyxFQUVOLGVBQWUsRUFHZixnQkFBZ0IsR0FDaEIsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVqRCxNQUFNLE9BQU8sYUFBYTtJQUNsQixNQUFNLENBQUMsS0FBSyxDQUFDLEtBQWE7UUFDaEMsT0FBTyxJQUFJLGFBQWEsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFJRCxZQUNpQixVQUFrQixFQUNsQixRQUFnQixFQUNoQixVQUFrQixFQUNqQix5QkFBZ0QsV0FBVztRQUg1RCxlQUFVLEdBQVYsVUFBVSxDQUFRO1FBQ2xCLGFBQVEsR0FBUixRQUFRLENBQVE7UUFDaEIsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUNqQiwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXFDO1FBTjdELGdCQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBUXZDLElBQUksVUFBVSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFBO1FBQ3BCLENBQUM7SUFDRixDQUFDO0lBRUQsVUFBVTtRQUNULE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQTtJQUN4RCxDQUFDO0lBRUQsUUFBUTtRQUNQLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENB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