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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2RlY29yYXRvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsU0FBUyxlQUFlLENBQUMsS0FBOEM7SUFDdEUsT0FBTyxDQUFDLE9BQWUsRUFBRSxHQUFvQixFQUFFLFVBQXdDLEVBQUUsRUFBRTtRQUMxRixJQUFJLEtBQUssR0FBMkIsSUFBSSxDQUFBO1FBQ3hDLElBQUksRUFBRSxHQUFvQixJQUFJLENBQUE7UUFFOUIsSUFBSSxPQUFPLFVBQVUsQ0FBQyxLQUFLLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDNUMsS0FBSyxHQUFHLE9BQU8sQ0FBQTtZQUNmLEVBQUUsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFBO1FBQ3RCLENBQUM7YUFBTSxJQUFJLE9BQU8sVUFBVSxDQUFDLEdBQUcsS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUNqRCxLQUFLLEdBQUcsS0FBSyxDQUFBO1lBQ2IsRUFBRSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUE7UUFDcEIsQ0FBQztRQUVELElBQUksQ0FBQyxFQUFFLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDcEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNqQyxDQUFDO1FBRUQsVUFBVSxDQUFDLEtBQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDcEMsQ0FBQyxDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxPQUFPLENBQUMsT0FBZSxFQUFFLEdBQVcsRUFBRSxVQUE4QjtJQUNuRixJQUFJLEtBQUssR0FBMkIsSUFBSSxDQUFBO0lBQ3hDLElBQUksRUFBRSxHQUFvQixJQUFJLENBQUE7SUFFOUIsSUFBSSxPQUFPLFVBQVUsQ0FBQyxLQUFLLEtBQUssVUFBVSxFQUFFLENBQUM7UUFDNUMsS0FBSyxHQUFHLE9BQU8sQ0FBQTtRQUNmLEVBQUUsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFBO1FBRXJCLElBQUksRUFBRyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN0QixPQUFPLENBQUMsSUFBSSxDQUFDLCtEQUErRCxDQUFDLENBQUE7UUFDOUUsQ0FBQztJQUNGLENBQUM7U0FBTSxJQUFJLE9BQU8sVUFBVSxDQUFDLEdBQUcsS0FBSyxVQUFVLEVBQUUsQ0FBQztRQUNqRCxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ2IsRUFBRSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUE7SUFDcEIsQ0FBQztJQUVELElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNULE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVELE1BQU0sVUFBVSxHQUFHLFlBQVksR0FBRyxFQUFFLENBQUE7SUFDcEMsVUFBVSxDQUFDLEtBQU0sQ0FBQyxHQUFHLFVBQVUsR0FBRyxJQUFXO1FBQzVDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDdEMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFO2dCQUN2QyxZQUFZLEVBQUUsS0FBSztnQkFDbkIsVUFBVSxFQUFFLEtBQUs7Z0JBQ2pCLFFBQVEsRUFBRSxLQUFLO2dCQUNmLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7YUFDM0IsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUNELE9BQVEsSUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ2pDLENBQUMsQ0FBQTtBQUNGLENBQUM7QUFNRCxNQUFNLFVBQVUsUUFBUSxDQUN2QixLQUFhLEVBQ2IsT0FBNkIsRUFDN0Isb0JBQThCO0lBRTlCLE9BQU8sZUFBZSxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQ2xDLE1BQU0sUUFBUSxHQUFHLGFBQWEsR0FBRyxFQUFFLENBQUE7UUFDbkMsTUFBTSxTQUFTLEdBQUcsb0JBQW9CLEdBQUcsRUFBRSxDQUFBO1FBRTNDLE9BQU8sVUFBcUIsR0FBRyxJQUFXO1lBQ3pDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDdEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7WUFDNUUsQ0FBQztZQUVELFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtZQUU1QixJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7Z0JBQ25ELElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO1lBQ3pCLENBQUM7WUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRTtnQkFDaEMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7Z0JBQ3BCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1lBQzVFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNWLENBQUMsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQUVELE1BQU0sVUFBVSxRQUFRLENBQ3ZCLEtBQWEsRUFDYixPQUE2QixFQUM3QixvQkFBOEI7SUFFOUIsT0FBTyxlQUFlLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDbEMsTUFBTSxRQUFRLEdBQUcsbUJBQW1CLEdBQUcsRUFBRSxDQUFBO1FBQ3pDLE1BQU0sU0FBUyxHQUFHLG9CQUFvQixHQUFHLEVBQUUsQ0FBQTtRQUMzQyxNQUFNLFVBQVUsR0FBRyxxQkFBcUIsR0FBRyxFQUFFLENBQUE7UUFDN0MsTUFBTSxVQUFVLEdBQUcscUJBQXFCLEdBQUcsRUFBRSxDQUFBO1FBRTdDLE9BQU8sVUFBcUIsR0FBRyxJQUFXO1lBQ3pDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDdEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7WUFDNUUsQ0FBQztZQUNELElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ2pFLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUE7WUFDckMsQ0FBQztZQUVELElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQTtZQUNwRCxDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztnQkFDdEIsT0FBTTtZQUNQLENBQUM7WUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsS0FBSyxDQUFBO1lBQ3pDLElBQUksUUFBUSxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO2dCQUM1QixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO2dCQUM3QixFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ2pDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1lBQzVFLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsSUFBSSxDQUFBO2dCQUN2QixJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRTtvQkFDaEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEtBQUssQ0FBQTtvQkFDeEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtvQkFDN0IsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUNqQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtnQkFDNUUsQ0FBQyxFQUFFLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQTtZQUMxQixDQUFDO1FBQ0YsQ0FBQyxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDO0FBRUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUEifQ==