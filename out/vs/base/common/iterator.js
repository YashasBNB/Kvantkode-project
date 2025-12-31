/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isIterable } from './types.js';
export var Iterable;
(function (Iterable) {
    function is(thing) {
        return thing && typeof thing === 'object' && typeof thing[Symbol.iterator] === 'function';
    }
    Iterable.is = is;
    const _empty = Object.freeze([]);
    function empty() {
        return _empty;
    }
    Iterable.empty = empty;
    function* single(element) {
        yield element;
    }
    Iterable.single = single;
    function wrap(iterableOrElement) {
        if (is(iterableOrElement)) {
            return iterableOrElement;
        }
        else {
            return single(iterableOrElement);
        }
    }
    Iterable.wrap = wrap;
    function from(iterable) {
        return iterable || _empty;
    }
    Iterable.from = from;
    function* reverse(array) {
        for (let i = array.length - 1; i >= 0; i--) {
            yield array[i];
        }
    }
    Iterable.reverse = reverse;
    function isEmpty(iterable) {
        return !iterable || iterable[Symbol.iterator]().next().done === true;
    }
    Iterable.isEmpty = isEmpty;
    function first(iterable) {
        return iterable[Symbol.iterator]().next().value;
    }
    Iterable.first = first;
    function some(iterable, predicate) {
        let i = 0;
        for (const element of iterable) {
            if (predicate(element, i++)) {
                return true;
            }
        }
        return false;
    }
    Iterable.some = some;
    function find(iterable, predicate) {
        for (const element of iterable) {
            if (predicate(element)) {
                return element;
            }
        }
        return undefined;
    }
    Iterable.find = find;
    function* filter(iterable, predicate) {
        for (const element of iterable) {
            if (predicate(element)) {
                yield element;
            }
        }
    }
    Iterable.filter = filter;
    function* map(iterable, fn) {
        let index = 0;
        for (const element of iterable) {
            yield fn(element, index++);
        }
    }
    Iterable.map = map;
    function* flatMap(iterable, fn) {
        let index = 0;
        for (const element of iterable) {
            yield* fn(element, index++);
        }
    }
    Iterable.flatMap = flatMap;
    function* concat(...iterables) {
        for (const item of iterables) {
            if (isIterable(item)) {
                yield* item;
            }
            else {
                yield item;
            }
        }
    }
    Iterable.concat = concat;
    function reduce(iterable, reducer, initialValue) {
        let value = initialValue;
        for (const element of iterable) {
            value = reducer(value, element);
        }
        return value;
    }
    Iterable.reduce = reduce;
    function length(iterable) {
        let count = 0;
        for (const _ of iterable) {
            count++;
        }
        return count;
    }
    Iterable.length = length;
    /**
     * Returns an iterable slice of the array, with the same semantics as `array.slice()`.
     */
    function* slice(arr, from, to = arr.length) {
        if (from < -arr.length) {
            from = 0;
        }
        if (from < 0) {
            from += arr.length;
        }
        if (to < 0) {
            to += arr.length;
        }
        else if (to > arr.length) {
            to = arr.length;
        }
        for (; from < to; from++) {
            yield arr[from];
        }
    }
    Iterable.slice = slice;
    /**
     * Consumes `atMost` elements from iterable and returns the consumed elements,
     * and an iterable for the rest of the elements.
     */
    function consume(iterable, atMost = Number.POSITIVE_INFINITY) {
        const consumed = [];
        if (atMost === 0) {
            return [consumed, iterable];
        }
        const iterator = iterable[Symbol.iterator]();
        for (let i = 0; i < atMost; i++) {
            const next = iterator.next();
            if (next.done) {
                return [consumed, Iterable.empty()];
            }
            consumed.push(next.value);
        }
        return [
            consumed,
            {
                [Symbol.iterator]() {
                    return iterator;
                },
            },
        ];
    }
    Iterable.consume = consume;
    async function asyncToArray(iterable) {
        const result = [];
        for await (const item of iterable) {
            result.push(item);
        }
        return Promise.resolve(result);
    }
    Iterable.asyncToArray = asyncToArray;
})(Iterable || (Iterable = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXRlcmF0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9pdGVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRXZDLE1BQU0sS0FBVyxRQUFRLENBOEx4QjtBQTlMRCxXQUFpQixRQUFRO0lBQ3hCLFNBQWdCLEVBQUUsQ0FBVSxLQUFVO1FBQ3JDLE9BQU8sS0FBSyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxPQUFPLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssVUFBVSxDQUFBO0lBQzFGLENBQUM7SUFGZSxXQUFFLEtBRWpCLENBQUE7SUFFRCxNQUFNLE1BQU0sR0FBa0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUMvQyxTQUFnQixLQUFLO1FBQ3BCLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUZlLGNBQUssUUFFcEIsQ0FBQTtJQUVELFFBQWUsQ0FBQyxDQUFDLE1BQU0sQ0FBSSxPQUFVO1FBQ3BDLE1BQU0sT0FBTyxDQUFBO0lBQ2QsQ0FBQztJQUZnQixlQUFNLFNBRXRCLENBQUE7SUFFRCxTQUFnQixJQUFJLENBQUksaUJBQWtDO1FBQ3pELElBQUksRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztZQUMzQixPQUFPLGlCQUFpQixDQUFBO1FBQ3pCLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUNqQyxDQUFDO0lBQ0YsQ0FBQztJQU5lLGFBQUksT0FNbkIsQ0FBQTtJQUVELFNBQWdCLElBQUksQ0FBSSxRQUF3QztRQUMvRCxPQUFPLFFBQVEsSUFBSSxNQUFNLENBQUE7SUFDMUIsQ0FBQztJQUZlLGFBQUks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