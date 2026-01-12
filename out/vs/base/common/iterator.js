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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXRlcmF0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2l0ZXJhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFdkMsTUFBTSxLQUFXLFFBQVEsQ0E4THhCO0FBOUxELFdBQWlCLFFBQVE7SUFDeEIsU0FBZ0IsRUFBRSxDQUFVLEtBQVU7UUFDckMsT0FBTyxLQUFLLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxVQUFVLENBQUE7SUFDMUYsQ0FBQztJQUZlLFdBQUUsS0FFakIsQ0FBQTtJQUVELE1BQU0sTUFBTSxHQUFrQixNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQy9DLFNBQWdCLEtBQUs7UUFDcEIsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRmUsY0FBSyxRQUVwQixDQUFBO0lBRUQsUUFBZSxDQUFDLENBQUMsTUFBTSxDQUFJLE9BQVU7UUFDcEMsTUFBTSxPQUFPLENBQUE7SUFDZCxDQUFDO0lBRmdCLGVBQU0sU0FFdEIsQ0FBQTtJQUVELFNBQWdCLElBQUksQ0FBSSxpQkFBa0M7UUFDekQsSUFBSSxFQUFFLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDO1lBQzNCLE9BQU8saUJBQWlCLENBQUE7UUFDekIsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ2pDLENBQUM7SUFDRixDQUFDO0lBTmUsYUFBSSxPQU1uQixDQUFBO0lBRUQsU0FBZ0IsSUFBSSxDQUFJLFFBQXdDO1FBQy9ELE9BQU8sUUFBUSxJQUFJLE1BQU0sQ0FBQTtJQUMxQixDQUFDO0lBRmUs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