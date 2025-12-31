/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function findLast(array, predicate, fromIndex = array.length - 1) {
    const idx = findLastIdx(array, predicate, fromIndex);
    if (idx === -1) {
        return undefined;
    }
    return array[idx];
}
export function findLastIdx(array, predicate, fromIndex = array.length - 1) {
    for (let i = fromIndex; i >= 0; i--) {
        const element = array[i];
        if (predicate(element)) {
            return i;
        }
    }
    return -1;
}
/**
 * Finds the last item where predicate is true using binary search.
 * `predicate` must be monotonous, i.e. `arr.map(predicate)` must be like `[true, ..., true, false, ..., false]`!
 *
 * @returns `undefined` if no item matches, otherwise the last item that matches the predicate.
 */
export function findLastMonotonous(array, predicate) {
    const idx = findLastIdxMonotonous(array, predicate);
    return idx === -1 ? undefined : array[idx];
}
/**
 * Finds the last item where predicate is true using binary search.
 * `predicate` must be monotonous, i.e. `arr.map(predicate)` must be like `[true, ..., true, false, ..., false]`!
 *
 * @returns `startIdx - 1` if predicate is false for all items, otherwise the index of the last item that matches the predicate.
 */
export function findLastIdxMonotonous(array, predicate, startIdx = 0, endIdxEx = array.length) {
    let i = startIdx;
    let j = endIdxEx;
    while (i < j) {
        const k = Math.floor((i + j) / 2);
        if (predicate(array[k])) {
            i = k + 1;
        }
        else {
            j = k;
        }
    }
    return i - 1;
}
/**
 * Finds the first item where predicate is true using binary search.
 * `predicate` must be monotonous, i.e. `arr.map(predicate)` must be like `[false, ..., false, true, ..., true]`!
 *
 * @returns `undefined` if no item matches, otherwise the first item that matches the predicate.
 */
export function findFirstMonotonous(array, predicate) {
    const idx = findFirstIdxMonotonousOrArrLen(array, predicate);
    return idx === array.length ? undefined : array[idx];
}
/**
 * Finds the first item where predicate is true using binary search.
 * `predicate` must be monotonous, i.e. `arr.map(predicate)` must be like `[false, ..., false, true, ..., true]`!
 *
 * @returns `endIdxEx` if predicate is false for all items, otherwise the index of the first item that matches the predicate.
 */
export function findFirstIdxMonotonousOrArrLen(array, predicate, startIdx = 0, endIdxEx = array.length) {
    let i = startIdx;
    let j = endIdxEx;
    while (i < j) {
        const k = Math.floor((i + j) / 2);
        if (predicate(array[k])) {
            j = k;
        }
        else {
            i = k + 1;
        }
    }
    return i;
}
export function findFirstIdxMonotonous(array, predicate, startIdx = 0, endIdxEx = array.length) {
    const idx = findFirstIdxMonotonousOrArrLen(array, predicate, startIdx, endIdxEx);
    return idx === array.length ? -1 : idx;
}
/**
 * Use this when
 * * You have a sorted array
 * * You query this array with a monotonous predicate to find the last item that has a certain property.
 * * You query this array multiple times with monotonous predicates that get weaker and weaker.
 */
export class MonotonousArray {
    static { this.assertInvariants = false; }
    constructor(_array) {
        this._array = _array;
        this._findLastMonotonousLastIdx = 0;
    }
    /**
     * The predicate must be monotonous, i.e. `arr.map(predicate)` must be like `[true, ..., true, false, ..., false]`!
     * For subsequent calls, current predicate must be weaker than (or equal to) the previous predicate, i.e. more entries must be `true`.
     */
    findLastMonotonous(predicate) {
        if (MonotonousArray.assertInvariants) {
            if (this._prevFindLastPredicate) {
                for (const item of this._array) {
                    if (this._prevFindLastPredicate(item) && !predicate(item)) {
                        throw new Error('MonotonousArray: current predicate must be weaker than (or equal to) the previous predicate.');
                    }
                }
            }
            this._prevFindLastPredicate = predicate;
        }
        const idx = findLastIdxMonotonous(this._array, predicate, this._findLastMonotonousLastIdx);
        this._findLastMonotonousLastIdx = idx + 1;
        return idx === -1 ? undefined : this._array[idx];
    }
}
/**
 * Returns the first item that is equal to or greater than every other item.
 */
export function findFirstMax(array, comparator) {
    if (array.length === 0) {
        return undefined;
    }
    let max = array[0];
    for (let i = 1; i < array.length; i++) {
        const item = array[i];
        if (comparator(item, max) > 0) {
            max = item;
        }
    }
    return max;
}
/**
 * Returns the last item that is equal to or greater than every other item.
 */
export function findLastMax(array, comparator) {
    if (array.length === 0) {
        return undefined;
    }
    let max = array[0];
    for (let i = 1; i < array.length; i++) {
        const item = array[i];
        if (comparator(item, max) >= 0) {
            max = item;
        }
    }
    return max;
}
/**
 * Returns the first item that is equal to or less than every other item.
 */
export function findFirstMin(array, comparator) {
    return findFirstMax(array, (a, b) => -comparator(a, b));
}
export function findMaxIdx(array, comparator) {
    if (array.length === 0) {
        return -1;
    }
    let maxIdx = 0;
    for (let i = 1; i < array.length; i++) {
        const item = array[i];
        if (comparator(item, array[maxIdx]) > 0) {
            maxIdx = i;
        }
    }
    return maxIdx;
}
/**
 * Returns the first mapped value of the array which is not undefined.
 */
export function mapFindFirst(items, mapFn) {
    for (const value of items) {
        const mapped = mapFn(value);
        if (mapped !== undefined) {
            return mapped;
        }
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJyYXlzRmluZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2FycmF5c0ZpbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsTUFBTSxVQUFVLFFBQVEsQ0FDdkIsS0FBbUIsRUFDbkIsU0FBK0IsRUFDL0IsU0FBUyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQztJQUU1QixNQUFNLEdBQUcsR0FBRyxXQUFXLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUNwRCxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2hCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxPQUFPLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUNsQixDQUFDO0FBRUQsTUFBTSxVQUFVLFdBQVcsQ0FDMUIsS0FBbUIsRUFDbkIsU0FBK0IsRUFDL0IsU0FBUyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQztJQUU1QixLQUFLLElBQUksQ0FBQyxHQUFHLFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDckMsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXhCLElBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDeEIsT0FBTyxDQUFDLENBQUE7UUFDVCxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sQ0FBQyxDQUFDLENBQUE7QUFDVixDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsa0JBQWtCLENBQ2pDLEtBQW1CLEVBQ25CLFNBQStCO0lBRS9CLE1BQU0sR0FBRyxHQUFHLHFCQUFxQixDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUNuRCxPQUFP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