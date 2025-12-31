/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var _a;
/**
 * Groups the collection into a dictionary based on the provided
 * group function.
 */
export function groupBy(data, groupFn) {
    const result = Object.create(null);
    for (const element of data) {
        const key = groupFn(element);
        let target = result[key];
        if (!target) {
            target = result[key] = [];
        }
        target.push(element);
    }
    return result;
}
export function diffSets(before, after) {
    const removed = [];
    const added = [];
    for (const element of before) {
        if (!after.has(element)) {
            removed.push(element);
        }
    }
    for (const element of after) {
        if (!before.has(element)) {
            added.push(element);
        }
    }
    return { removed, added };
}
export function diffMaps(before, after) {
    const removed = [];
    const added = [];
    for (const [index, value] of before) {
        if (!after.has(index)) {
            removed.push(value);
        }
    }
    for (const [index, value] of after) {
        if (!before.has(index)) {
            added.push(value);
        }
    }
    return { removed, added };
}
/**
 * Computes the intersection of two sets.
 *
 * @param setA - The first set.
 * @param setB - The second iterable.
 * @returns A new set containing the elements that are in both `setA` and `setB`.
 */
export function intersection(setA, setB) {
    const result = new Set();
    for (const elem of setB) {
        if (setA.has(elem)) {
            result.add(elem);
        }
    }
    return result;
}
export class SetWithKey {
    static { _a = Symbol.toStringTag; }
    constructor(values, toKey) {
        this.toKey = toKey;
        this._map = new Map();
        this[_a] = 'SetWithKey';
        for (const value of values) {
            this.add(value);
        }
    }
    get size() {
        return this._map.size;
    }
    add(value) {
        const key = this.toKey(value);
        this._map.set(key, value);
        return this;
    }
    delete(value) {
        return this._map.delete(this.toKey(value));
    }
    has(value) {
        return this._map.has(this.toKey(value));
    }
    *entries() {
        for (const entry of this._map.values()) {
            yield [entry, entry];
        }
    }
    keys() {
        return this.values();
    }
    *values() {
        for (const entry of this._map.values()) {
            yield entry;
        }
    }
    clear() {
        this._map.clear();
    }
    forEach(callbackfn, thisArg) {
        this._map.forEach((entry) => callbackfn.call(thisArg, entry, entry, this));
    }
    [Symbol.iterator]() {
        return this.values();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9jb2xsZWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7QUFjaEc7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLE9BQU8sQ0FDdEIsSUFBUyxFQUNULE9BQTBCO0lBRTFCLE1BQU0sTUFBTSxHQUFtQixNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2xELEtBQUssTUFBTSxPQUFPLElBQUksSUFBSSxFQUFFLENBQUM7UUFDNUIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzVCLElBQUksTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN4QixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixNQUFNLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUMxQixDQUFDO1FBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNyQixDQUFDO0lBQ0QsT0FBTyxNQUFNLENBQUE7QUFDZCxDQUFDO0FBRUQsTUFBTSxVQUFVLFFBQVEsQ0FDdkIsTUFBc0IsRUFDdEIsS0FBcUI7SUFFckIsTUFBTSxPQUFPLEdBQVEsRUFBRSxDQUFBO0lBQ3ZCLE1BQU0sS0FBSyxHQUFRLEVBQUUsQ0FBQTtJQUNyQixLQUFLLE1BQU0sT0FBTyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDekIsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN0QixDQUFDO0lBQ0YsQ0FBQztJQUNELEtBQUssTUFBTSxPQUFPLElBQUksS0FBSyxFQUFFLENB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