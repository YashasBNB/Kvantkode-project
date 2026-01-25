/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
function createDecorator(mapFn) {
    return (_target, key, descriptor) => {
        let fnKey = null;
        let fn = null;
        if (typeof descriptor.value === 'function') {
            fnKey = 'value';
            fn = descriptor.value;
        }
        else if (typeof descriptor.get === 'function') {
            fnKey = 'get';
            fn = descriptor.get;
        }
        if (!fn || typeof key === 'symbol') {
            throw new Error('not supported');
        }
        descriptor[fnKey] = mapFn(fn, key);
    };
}
export function memoize(_target, key, descriptor) {
    let fnKey = null;
    let fn = null;
    if (typeof descriptor.value === 'function') {
        fnKey = 'value';
        fn = descriptor.value;
        if (fn.length !== 0) {
            console.warn('Memoize should only be used in functions with zero parameters');
        }
    }
    else if (typeof descriptor.get === 'function') {
        fnKey = 'get';
        fn = descriptor.get;
    }
    if (!fn) {
        throw new Error('not supported');
    }
    const memoizeKey = `$memoize$${key}`;
    descriptor[fnKey] = function (...args) {
        if (!this.hasOwnProperty(memoizeKey)) {
            Object.defineProperty(this, memoizeKey, {
                configurable: false,
                enumerable: false,
                writable: false,
                value: fn.apply(this, args),
            });
        }
        return this[memoizeKey];
    };
}
export function debounce(delay, reducer, initialValueProvider) {
    return createDecorator((fn, key) => {
        const timerKey = `$debounce$${key}`;
        const resultKey = `$debounce$result$${key}`;
        return function (...args) {
            if (!this[resultKey]) {
                this[resultKey] = initialValueProvider ? initialValueProvider() : undefined;
            }
            clearTimeout(this[timerKey]);
            if (reducer) {
                this[resultKey] = reducer(this[resultKey], ...args);
                args = [this[resultKey]];
            }
            this[timerKey] = setTimeout(() => {
                fn.apply(this, args);
                this[resultKey] = initialValueProvider ? initialValueProvider() : undefined;
            }, delay);
        };
    });
}
export function throttle(delay, reducer, initialValueProvider) {
    return createDecorator((fn, key) => {
        const timerKey = `$throttle$timer$${key}`;
        const resultKey = `$throttle$result$${key}`;
        const lastRunKey = `$throttle$lastRun$${key}`;
        const pendingKey = `$throttle$pending$${key}`;
        return function (...args) {
            if (!this[resultKey]) {
                this[resultKey] = initialValueProvider ? initialValueProvider() : undefined;
            }
            if (this[lastRunKey] === null || this[lastRunKey] === undefined) {
                this[lastRunKey] = -Number.MAX_VALUE;
            }
            if (reducer) {
                this[resultKey] = reducer(this[resultKey], ...args);
            }
            if (this[pendingKey]) {
                return;
            }
            const nextTime = this[lastRunKey] + delay;
            if (nextTime <= Date.now()) {
                this[lastRunKey] = Date.now();
                fn.apply(this, [this[resultKey]]);
                this[resultKey] = initialValueProvider ? initialValueProvider() : undefined;
            }
            else {
                this[pendingKey] = true;
                this[timerKey] = setTimeout(() => {
                    this[pendingKey] = false;
                    this[lastRunKey] = Date.now();
                    fn.apply(this, [this[resultKey]]);
                    this[resultKey] = initialValueProvider ? initialValueProvider() : undefined;
                }, nextTime - Date.now());
            }
        };
    });
}
export { cancelPreviousCalls } from './decorators/cancelPreviousCalls.js';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vZGVjb3JhdG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxTQUFTLGVBQWUsQ0FBQyxLQUE4QztJQUN0RSxPQUFPLENBQUMsT0FBZSxFQUFFLEdBQW9CLEVBQUUsVUFBd0MsRUFBRSxFQUFFO1FBQzFGLElBQUksS0FBSyxHQUEyQixJQUFJLENBQUE7UUFDeEMsSUFBSSxFQUFFLEdBQW9CLElBQUksQ0FBQTtRQUU5QixJQUFJLE9BQU8sVUFBVSxDQUFDLEtBQUssS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUM1QyxLQUFLLEdBQUcsT0FBTyxDQUFBO1lBQ2YsRUFBRSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUE7UUFDdEIsQ0FBQzthQUFNLElBQUksT0FBTyxVQUFVLENBQUMsR0FBRyxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ2pELEtBQUssR0FBRyxLQUFLLENBQUE7WUFDYixFQUFFLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQTtRQUNwQixDQUFDO1FBRUQsSUFBSSxDQUFDLEVBQUUsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNwQyxNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ2pDLENBQUM7UUFFRCxVQUFVLENBQUMsS0FBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUNwQyxDQUFDLENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLE9BQU8sQ0FBQyxPQUFlLEVBQUUsR0FBVyxFQUFFLFVBQThCO0lBQ25GLElBQUksS0FBSyxHQUEyQixJQUFJLENBQUE7SUFDeEMsSUFBSSxFQUFFLEdBQW9CLElBQUksQ0FBQTtJQUU5QixJQUFJLE9BQU8s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