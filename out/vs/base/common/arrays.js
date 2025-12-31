/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { findFirstIdxMonotonousOrArrLen } from './arraysFind.js';
import { CancellationError } from './errors.js';
/**
 * Returns the last entry and the initial N-1 entries of the array, as a tuple of [rest, last].
 *
 * The array must have at least one element.
 *
 * @param arr The input array
 * @returns A tuple of [rest, last] where rest is all but the last element and last is the last element
 * @throws Error if the array is empty
 */
export function tail(arr) {
    if (arr.length === 0) {
        throw new Error('Invalid tail call');
    }
    return [arr.slice(0, arr.length - 1), arr[arr.length - 1]];
}
export function equals(one, other, itemEquals = (a, b) => a === b) {
    if (one === other) {
        return true;
    }
    if (!one || !other) {
        return false;
    }
    if (one.length !== other.length) {
        return false;
    }
    for (let i = 0, len = one.length; i < len; i++) {
        if (!itemEquals(one[i], other[i])) {
            return false;
        }
    }
    return true;
}
/**
 * Remove the element at `index` by replacing it with the last element. This is faster than `splice`
 * but changes the order of the array
 */
export function removeFastWithoutKeepingOrder(array, index) {
    const last = array.length - 1;
    if (index < last) {
        array[index] = array[last];
    }
    array.pop();
}
/**
 * Performs a binary search algorithm over a sorted array.
 *
 * @param array The array being searched.
 * @param key The value we search for.
 * @param comparator A function that takes two array elements and returns zero
 *   if they are equal, a negative number if the first element precedes the
 *   second one in the sorting order, or a positive number if the second element
 *   precedes the first one.
 * @return See {@link binarySearch2}
 */
export function binarySearch(array, key, comparator) {
    return binarySearch2(array.length, (i) => comparator(array[i], key));
}
/**
 * Performs a binary search algorithm over a sorted collection. Useful for cases
 * when we need to perform a binary search over something that isn't actually an
 * array, and converting data to an array would defeat the use of binary search
 * in the first place.
 *
 * @param length The collection length.
 * @param compareToKey A function that takes an index of an element in the
 *   collection and returns zero if the value at this index is equal to the
 *   search key, a negative number if the value precedes the search key in the
 *   sorting order, or a positive number if the search key precedes the value.
 * @return A non-negative index of an element, if found. If not found, the
 *   result is -(n+1) (or ~n, using bitwise notation), where n is the index
 *   where the key should be inserted to maintain the sorting order.
 */
export function binarySearch2(length, compareToKey) {
    let low = 0, high = length - 1;
    while (low <= high) {
        const mid = ((low + high) / 2) | 0;
        const comp = compareToKey(mid);
        if (comp < 0) {
            low = mid + 1;
        }
        else if (comp > 0) {
            high = mid - 1;
        }
        else {
            return mid;
        }
    }
    return -(low + 1);
}
export function quickSelect(nth, data, compare) {
    nth = nth | 0;
    if (nth >= data.length) {
        throw new TypeError('invalid index');
    }
    const pivotValue = data[Math.floor(data.length * Math.random())];
    const lower = [];
    const higher = [];
    const pivots = [];
    for (const value of data) {
        const val = compare(value, pivotValue);
        if (val < 0) {
            lower.push(value);
        }
        else if (val > 0) {
            higher.push(value);
        }
        else {
            pivots.push(value);
        }
    }
    if (nth < lower.length) {
        return quickSelect(nth, lower, compare);
    }
    else if (nth < lower.length + pivots.length) {
        return pivots[0];
    }
    else {
        return quickSelect(nth - (lower.length + pivots.length), higher, compare);
    }
}
export function groupBy(data, compare) {
    const result = [];
    let currentGroup = undefined;
    for (const element of data.slice(0).sort(compare)) {
        if (!currentGroup || compare(currentGroup[0], element) !== 0) {
            currentGroup = [element];
            result.push(currentGroup);
        }
        else {
            currentGroup.push(element);
        }
    }
    return result;
}
/**
 * Splits the given items into a list of (non-empty) groups.
 * `shouldBeGrouped` is used to decide if two consecutive items should be in the same group.
 * The order of the items is preserved.
 */
export function* groupAdjacentBy(items, shouldBeGrouped) {
    let currentGroup;
    let last;
    for (const item of items) {
        if (last !== undefined && shouldBeGrouped(last, item)) {
            currentGroup.push(item);
        }
        else {
            if (currentGroup) {
                yield currentGroup;
            }
            currentGroup = [item];
        }
        last = item;
    }
    if (currentGroup) {
        yield currentGroup;
    }
}
export function forEachAdjacent(arr, f) {
    for (let i = 0; i <= arr.length; i++) {
        f(i === 0 ? undefined : arr[i - 1], i === arr.length ? undefined : arr[i]);
    }
}
export function forEachWithNeighbors(arr, f) {
    for (let i = 0; i < arr.length; i++) {
        f(i === 0 ? undefined : arr[i - 1], arr[i], i + 1 === arr.length ? undefined : arr[i + 1]);
    }
}
/**
 * Diffs two *sorted* arrays and computes the splices which apply the diff.
 */
export function sortedDiff(before, after, compare) {
    const result = [];
    function pushSplice(start, deleteCount, toInsert) {
        if (deleteCount === 0 && toInsert.length === 0) {
            return;
        }
        const latest = result[result.length - 1];
        if (latest && latest.start + latest.deleteCount === start) {
            latest.deleteCount += deleteCount;
            latest.toInsert.push(...toInsert);
        }
        else {
            result.push({ start, deleteCount, toInsert });
        }
    }
    let beforeIdx = 0;
    let afterIdx = 0;
    while (true) {
        if (beforeIdx === before.length) {
            pushSplice(beforeIdx, 0, after.slice(afterIdx));
            break;
        }
        if (afterIdx === after.length) {
            pushSplice(beforeIdx, before.length - beforeIdx, []);
            break;
        }
        const beforeElement = before[beforeIdx];
        const afterElement = after[afterIdx];
        const n = compare(beforeElement, afterElement);
        if (n === 0) {
            // equal
            beforeIdx += 1;
            afterIdx += 1;
        }
        else if (n < 0) {
            // beforeElement is smaller -> before element removed
            pushSplice(beforeIdx, 1, []);
            beforeIdx += 1;
        }
        else if (n > 0) {
            // beforeElement is greater -> after element added
            pushSplice(beforeIdx, 0, [afterElement]);
            afterIdx += 1;
        }
    }
    return result;
}
/**
 * Takes two *sorted* arrays and computes their delta (removed, added elements).
 * Finishes in `Math.min(before.length, after.length)` steps.
 */
export function delta(before, after, compare) {
    const splices = sortedDiff(before, after, compare);
    const removed = [];
    const added = [];
    for (const splice of splices) {
        removed.push(...before.slice(splice.start, splice.start + splice.deleteCount));
        added.push(...splice.toInsert);
    }
    return { removed, added };
}
/**
 * Returns the top N elements from the array.
 *
 * Faster than sorting the entire array when the array is a lot larger than N.
 *
 * @param array The unsorted array.
 * @param compare A sort function for the elements.
 * @param n The number of elements to return.
 * @return The first n elements from array when sorted with compare.
 */
export function top(array, compare, n) {
    if (n === 0) {
        return [];
    }
    const result = array.slice(0, n).sort(compare);
    topStep(array, compare, result, n, array.length);
    return result;
}
/**
 * Asynchronous variant of `top()` allowing for splitting up work in batches between which the event loop can run.
 *
 * Returns the top N elements from the array.
 *
 * Faster than sorting the entire array when the array is a lot larger than N.
 *
 * @param array The unsorted array.
 * @param compare A sort function for the elements.
 * @param n The number of elements to return.
 * @param batch The number of elements to examine before yielding to the event loop.
 * @return The first n elements from array when sorted with compare.
 */
export function topAsync(array, compare, n, batch, token) {
    if (n === 0) {
        return Promise.resolve([]);
    }
    return new Promise((resolve, reject) => {
        ;
        (async () => {
            const o = array.length;
            const result = array.slice(0, n).sort(compare);
            for (let i = n, m = Math.min(n + batch, o); i < o; i = m, m = Math.min(m + batch, o)) {
                if (i > n) {
                    await new Promise((resolve) => setTimeout(resolve)); // any other delay function would starve I/O
                }
                if (token && token.isCancellationRequested) {
                    throw new CancellationError();
                }
                topStep(array, compare, result, i, m);
            }
            return result;
        })().then(resolve, reject);
    });
}
function topStep(array, compare, result, i, m) {
    for (const n = result.length; i < m; i++) {
        const element = array[i];
        if (compare(element, result[n - 1]) < 0) {
            result.pop();
            const j = findFirstIdxMonotonousOrArrLen(result, (e) => compare(element, e) < 0);
            result.splice(j, 0, element);
        }
    }
}
/**
 * @returns New array with all falsy values removed. The original array IS NOT modified.
 */
export function coalesce(array) {
    return array.filter((e) => !!e);
}
/**
 * Remove all falsy values from `array`. The original array IS modified.
 */
export function coalesceInPlace(array) {
    let to = 0;
    for (let i = 0; i < array.length; i++) {
        if (!!array[i]) {
            array[to] = array[i];
            to += 1;
        }
    }
    array.length = to;
}
/**
 * @deprecated Use `Array.copyWithin` instead
 */
export function move(array, from, to) {
    array.splice(to, 0, array.splice(from, 1)[0]);
}
/**
 * @returns false if the provided object is an array and not empty.
 */
export function isFalsyOrEmpty(obj) {
    return !Array.isArray(obj) || obj.length === 0;
}
export function isNonEmptyArray(obj) {
    return Array.isArray(obj) && obj.length > 0;
}
/**
 * Removes duplicates from the given array. The optional keyFn allows to specify
 * how elements are checked for equality by returning an alternate value for each.
 */
export function distinct(array, keyFn = (value) => value) {
    const seen = new Set();
    return array.filter((element) => {
        const key = keyFn(element);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}
export function uniqueFilter(keyFn) {
    const seen = new Set();
    return (element) => {
        const key = keyFn(element);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    };
}
export function commonPrefixLength(one, other, equals = (a, b) => a === b) {
    let result = 0;
    for (let i = 0, len = Math.min(one.length, other.length); i < len && equals(one[i], other[i]); i++) {
        result++;
    }
    return result;
}
export function range(arg, to) {
    let from = typeof to === 'number' ? arg : 0;
    if (typeof to === 'number') {
        from = arg;
    }
    else {
        from = 0;
        to = arg;
    }
    const result = [];
    if (from <= to) {
        for (let i = from; i < to; i++) {
            result.push(i);
        }
    }
    else {
        for (let i = from; i > to; i--) {
            result.push(i);
        }
    }
    return result;
}
export function index(array, indexer, mapper) {
    return array.reduce((r, t) => {
        r[indexer(t)] = mapper ? mapper(t) : t;
        return r;
    }, Object.create(null));
}
/**
 * Inserts an element into an array. Returns a function which, when
 * called, will remove that element from the array.
 *
 * @deprecated In almost all cases, use a `Set<T>` instead.
 */
export function insert(array, element) {
    array.push(element);
    return () => remove(array, element);
}
/**
 * Removes an element from an array if it can be found.
 *
 * @deprecated In almost all cases, use a `Set<T>` instead.
 */
export function remove(array, element) {
    const index = array.indexOf(element);
    if (index > -1) {
        array.splice(index, 1);
        return element;
    }
    return undefined;
}
/**
 * Insert `insertArr` inside `target` at `insertIndex`.
 * Please don't touch unless you understand https://jsperf.com/inserting-an-array-within-an-array
 */
export function arrayInsert(target, insertIndex, insertArr) {
    const before = target.slice(0, insertIndex);
    const after = target.slice(insertIndex);
    return before.concat(insertArr, after);
}
/**
 * Uses Fisher-Yates shuffle to shuffle the given array
 */
export function shuffle(array, _seed) {
    let rand;
    if (typeof _seed === 'number') {
        let seed = _seed;
        // Seeded random number generator in JS. Modified from:
        // https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
        rand = () => {
            const x = Math.sin(seed++) * 179426549; // throw away most significant digits and reduce any potential bias
            return x - Math.floor(x);
        };
    }
    else {
        rand = Math.random;
    }
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rand() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}
/**
 * Pushes an element to the start of the array, if found.
 */
export function pushToStart(arr, value) {
    const index = arr.indexOf(value);
    if (index > -1) {
        arr.splice(index, 1);
        arr.unshift(value);
    }
}
/**
 * Pushes an element to the end of the array, if found.
 */
export function pushToEnd(arr, value) {
    const index = arr.indexOf(value);
    if (index > -1) {
        arr.splice(index, 1);
        arr.push(value);
    }
}
export function pushMany(arr, items) {
    for (const item of items) {
        arr.push(item);
    }
}
export function mapArrayOrNot(items, fn) {
    return Array.isArray(items) ? items.map(fn) : fn(items);
}
export function asArray(x) {
    return Array.isArray(x) ? x : [x];
}
export function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
/**
 * Insert the new items in the array.
 * @param array The original array.
 * @param start The zero-based location in the array from which to start inserting elements.
 * @param newItems The items to be inserted
 */
export function insertInto(array, start, newItems) {
    const startIdx = getActualStartIndex(array, start);
    const originalLength = array.length;
    const newItemsLength = newItems.length;
    array.length = originalLength + newItemsLength;
    // Move the items after the start index, start from the end so that we don't overwrite any value.
    for (let i = originalLength - 1; i >= startIdx; i--) {
        array[i + newItemsLength] = array[i];
    }
    for (let i = 0; i < newItemsLength; i++) {
        array[i + startIdx] = newItems[i];
    }
}
/**
 * Removes elements from an array and inserts new elements in their place, returning the deleted elements. Alternative to the native Array.splice method, it
 * can only support limited number of items due to the maximum call stack size limit.
 * @param array The original array.
 * @param start The zero-based location in the array from which to start removing elements.
 * @param deleteCount The number of elements to remove.
 * @returns An array containing the elements that were deleted.
 */
export function splice(array, start, deleteCount, newItems) {
    const index = getActualStartIndex(array, start);
    let result = array.splice(index, deleteCount);
    if (result === undefined) {
        // see https://bugs.webkit.org/show_bug.cgi?id=261140
        result = [];
    }
    insertInto(array, index, newItems);
    return result;
}
/**
 * Determine the actual start index (same logic as the native splice() or slice())
 * If greater than the length of the array, start will be set to the length of the array. In this case, no element will be deleted but the method will behave as an adding function, adding as many element as item[n*] provided.
 * If negative, it will begin that many elements from the end of the array. (In this case, the origin -1, meaning -n is the index of the nth last element, and is therefore equivalent to the index of array.length - n.) If array.length + start is less than 0, it will begin from index 0.
 * @param array The target array.
 * @param start The operation index.
 */
function getActualStartIndex(array, start) {
    return start < 0 ? Math.max(start + array.length, 0) : Math.min(start, array.length);
}
/**
 * Utility that helps to pick a property from an object.
 *
 * ## Examples
 *
 * ```typescript
 * interface IObject = {
 *   a: number,
 *   b: string,
 * };
 *
 * const list: IObject[] = [
 *   { a: 1, b: 'foo' },
 *   { a: 2, b: 'bar' },
 * ];
 *
 * assert.deepStrictEqual(
 *   list.map(pick('a')),
 *   [1, 2],
 * );
 * ```
 */
export const pick = (key) => {
    return (obj) => {
        return obj[key];
    };
};
export var CompareResult;
(function (CompareResult) {
    function isLessThan(result) {
        return result < 0;
    }
    CompareResult.isLessThan = isLessThan;
    function isLessThanOrEqual(result) {
        return result <= 0;
    }
    CompareResult.isLessThanOrEqual = isLessThanOrEqual;
    function isGreaterThan(result) {
        return result > 0;
    }
    CompareResult.isGreaterThan = isGreaterThan;
    function isNeitherLessOrGreaterThan(result) {
        return result === 0;
    }
    CompareResult.isNeitherLessOrGreaterThan = isNeitherLessOrGreaterThan;
    CompareResult.greaterThan = 1;
    CompareResult.lessThan = -1;
    CompareResult.neitherLessOrGreaterThan = 0;
})(CompareResult || (CompareResult = {}));
export function compareBy(selector, comparator) {
    return (a, b) => comparator(selector(a), selector(b));
}
export function tieBreakComparators(...comparators) {
    return (item1, item2) => {
        for (const comparator of comparators) {
            const result = comparator(item1, item2);
            if (!CompareResult.isNeitherLessOrGreaterThan(result)) {
                return result;
            }
        }
        return CompareResult.neitherLessOrGreaterThan;
    };
}
/**
 * The natural order on numbers.
 */
export const numberComparator = (a, b) => a - b;
export const booleanComparator = (a, b) => numberComparator(a ? 1 : 0, b ? 1 : 0);
export function reverseOrder(comparator) {
    return (a, b) => -comparator(a, b);
}
/**
 * Returns a new comparator that treats `undefined` as the smallest value.
 * All other values are compared using the given comparator.
 */
export function compareUndefinedSmallest(comparator) {
    return (a, b) => {
        if (a === undefined) {
            return b === undefined ? CompareResult.neitherLessOrGreaterThan : CompareResult.lessThan;
        }
        else if (b === undefined) {
            return CompareResult.greaterThan;
        }
        return comparator(a, b);
    };
}
export class ArrayQueue {
    /**
     * Constructs a queue that is backed by the given array. Runtime is O(1).
     */
    constructor(items) {
        this.items = items;
        this.firstIdx = 0;
        this.lastIdx = this.items.length - 1;
    }
    get length() {
        return this.lastIdx - this.firstIdx + 1;
    }
    /**
     * Consumes elements from the beginning of the queue as long as the predicate returns true.
     * If no elements were consumed, `null` is returned. Has a runtime of O(result.length).
     */
    takeWhile(predicate) {
        // P(k) := k <= this.lastIdx && predicate(this.items[k])
        // Find s := min { k | k >= this.firstIdx && !P(k) } and return this.data[this.firstIdx...s)
        let startIdx = this.firstIdx;
        while (startIdx < this.items.length && predicate(this.items[startIdx])) {
            startIdx++;
        }
        const result = startIdx === this.firstIdx ? null : this.items.slice(this.firstIdx, startIdx);
        this.firstIdx = startIdx;
        return result;
    }
    /**
     * Consumes elements from the end of the queue as long as the predicate returns true.
     * If no elements were consumed, `null` is returned.
     * The result has the same order as the underlying array!
     */
    takeFromEndWhile(predicate) {
        // P(k) := this.firstIdx >= k && predicate(this.items[k])
        // Find s := max { k | k <= this.lastIdx && !P(k) } and return this.data(s...this.lastIdx]
        let endIdx = this.lastIdx;
        while (endIdx >= 0 && predicate(this.items[endIdx])) {
            endIdx--;
        }
        const result = endIdx === this.lastIdx ? null : this.items.slice(endIdx + 1, this.lastIdx + 1);
        this.lastIdx = endIdx;
        return result;
    }
    peek() {
        if (this.length === 0) {
            return undefined;
        }
        return this.items[this.firstIdx];
    }
    peekLast() {
        if (this.length === 0) {
            return undefined;
        }
        return this.items[this.lastIdx];
    }
    dequeue() {
        const result = this.items[this.firstIdx];
        this.firstIdx++;
        return result;
    }
    removeLast() {
        const result = this.items[this.lastIdx];
        this.lastIdx--;
        return result;
    }
    takeCount(count) {
        const result = this.items.slice(this.firstIdx, this.firstIdx + count);
        this.firstIdx += count;
        return result;
    }
}
/**
 * This class is faster than an iterator and array for lazy computed data.
 */
export class CallbackIterable {
    static { this.empty = new CallbackIterable((_callback) => { }); }
    constructor(
    /**
     * Calls the callback for every item.
     * Stops when the callback returns false.
     */
    iterate) {
        this.iterate = iterate;
    }
    forEach(handler) {
        this.iterate((item) => {
            handler(item);
            return true;
        });
    }
    toArray() {
        const result = [];
        this.iterate((item) => {
            result.push(item);
            return true;
        });
        return result;
    }
    filter(predicate) {
        return new CallbackIterable((cb) => this.iterate((item) => (predicate(item) ? cb(item) : true)));
    }
    map(mapFn) {
        return new CallbackIterable((cb) => this.iterate((item) => cb(mapFn(item))));
    }
    some(predicate) {
        let result = false;
        this.iterate((item) => {
            result = predicate(item);
            return !result;
        });
        return result;
    }
    findFirst(predicate) {
        let result;
        this.iterate((item) => {
            if (predicate(item)) {
                result = item;
                return false;
            }
            return true;
        });
        return result;
    }
    findLast(predicate) {
        let result;
        this.iterate((item) => {
            if (predicate(item)) {
                result = item;
            }
            return true;
        });
        return result;
    }
    findLastMaxBy(comparator) {
        let result;
        let first = true;
        this.iterate((item) => {
            if (first || CompareResult.isGreaterThan(comparator(item, result))) {
                first = false;
                result = item;
            }
            return true;
        });
        return result;
    }
}
/**
 * Represents a re-arrangement of items in an array.
 */
export class Permutation {
    constructor(_indexMap) {
        this._indexMap = _indexMap;
    }
    /**
     * Returns a permutation that sorts the given array according to the given compare function.
     */
    static createSortPermutation(arr, compareFn) {
        const sortIndices = Array.from(arr.keys()).sort((index1, index2) => compareFn(arr[index1], arr[index2]));
        return new Permutation(sortIndices);
    }
    /**
     * Returns a new array with the elements of the given array re-arranged according to this permutation.
     */
    apply(arr) {
        return arr.map((_, index) => arr[this._indexMap[index]]);
    }
    /**
     * Returns a new permutation that undoes the re-arrangement of this permutation.
     */
    inverse() {
        const inverseIndexMap = this._indexMap.slice();
        for (let i = 0; i < this._indexMap.length; i++) {
            inverseIndexMap[this._indexMap[i]] = i;
        }
        return new Permutation(inverseIndexMap);
    }
}
/**
 * Asynchronous variant of `Array.find()`, returning the first element in
 * the array for which the predicate returns true.
 *
 * This implementation does not bail early and waits for all promises to
 * resolve before returning.
 */
export async function findAsync(array, predicate) {
    const results = await Promise.all(array.map(async (element, index) => ({ element, ok: await predicate(element, index) })));
    return results.find((r) => r.ok)?.element;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJyYXlzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vYXJyYXlzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRWhFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUcvQzs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sVUFBVSxJQUFJLENBQUksR0FBUTtJQUMvQixJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDdEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQzNELENBQUM7QUFFRCxNQUFNLFVBQVUsTUFBTSxDQUNyQixHQUFpQyxFQUNqQyxLQUFtQyxFQUNuQyxhQUFzQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDO0lBRXZELElBQUksR0FBRyxLQUFLLEtBQUssRUFBRSxDQUFDO1FBQ25CLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNwQixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2pDLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELEtBQUssSUFBSSxDQUFD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