/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var _a, _b, _c;
export function getOrSet(map, key, value) {
    let result = map.get(key);
    if (result === undefined) {
        result = value;
        map.set(key, result);
    }
    return result;
}
export function mapToString(map) {
    const entries = [];
    map.forEach((value, key) => {
        entries.push(`${key} => ${value}`);
    });
    return `Map(${map.size}) {${entries.join(', ')}}`;
}
export function setToString(set) {
    const entries = [];
    set.forEach((value) => {
        entries.push(value);
    });
    return `Set(${set.size}) {${entries.join(', ')}}`;
}
class ResourceMapEntry {
    constructor(uri, value) {
        this.uri = uri;
        this.value = value;
    }
}
function isEntries(arg) {
    return Array.isArray(arg);
}
export class ResourceMap {
    static { this.defaultToKey = (resource) => resource.toString(); }
    constructor(arg, toKey) {
        this[_a] = 'ResourceMap';
        if (arg instanceof ResourceMap) {
            this.map = new Map(arg.map);
            this.toKey = toKey ?? ResourceMap.defaultToKey;
        }
        else if (isEntries(arg)) {
            this.map = new Map();
            this.toKey = toKey ?? ResourceMap.defaultToKey;
            for (const [resource, value] of arg) {
                this.set(resource, value);
            }
        }
        else {
            this.map = new Map();
            this.toKey = arg ?? ResourceMap.defaultToKey;
        }
    }
    set(resource, value) {
        this.map.set(this.toKey(resource), new ResourceMapEntry(resource, value));
        return this;
    }
    get(resource) {
        return this.map.get(this.toKey(resource))?.value;
    }
    has(resource) {
        return this.map.has(this.toKey(resource));
    }
    get size() {
        return this.map.size;
    }
    clear() {
        this.map.clear();
    }
    delete(resource) {
        return this.map.delete(this.toKey(resource));
    }
    forEach(clb, thisArg) {
        if (typeof thisArg !== 'undefined') {
            clb = clb.bind(thisArg);
        }
        for (const [_, entry] of this.map) {
            clb(entry.value, entry.uri, this);
        }
    }
    *values() {
        for (const entry of this.map.values()) {
            yield entry.value;
        }
    }
    *keys() {
        for (const entry of this.map.values()) {
            yield entry.uri;
        }
    }
    *entries() {
        for (const entry of this.map.values()) {
            yield [entry.uri, entry.value];
        }
    }
    *[(_a = Symbol.toStringTag, Symbol.iterator)]() {
        for (const [, entry] of this.map) {
            yield [entry.uri, entry.value];
        }
    }
}
export class ResourceSet {
    constructor(entriesOrKey, toKey) {
        this[_b] = 'ResourceSet';
        if (!entriesOrKey || typeof entriesOrKey === 'function') {
            this._map = new ResourceMap(entriesOrKey);
        }
        else {
            this._map = new ResourceMap(toKey);
            entriesOrKey.forEach(this.add, this);
        }
    }
    get size() {
        return this._map.size;
    }
    add(value) {
        this._map.set(value, value);
        return this;
    }
    clear() {
        this._map.clear();
    }
    delete(value) {
        return this._map.delete(value);
    }
    forEach(callbackfn, thisArg) {
        this._map.forEach((_value, key) => callbackfn.call(thisArg, key, key, this));
    }
    has(value) {
        return this._map.has(value);
    }
    entries() {
        return this._map.entries();
    }
    keys() {
        return this._map.keys();
    }
    values() {
        return this._map.keys();
    }
    [(_b = Symbol.toStringTag, Symbol.iterator)]() {
        return this.keys();
    }
}
export var Touch;
(function (Touch) {
    Touch[Touch["None"] = 0] = "None";
    Touch[Touch["AsOld"] = 1] = "AsOld";
    Touch[Touch["AsNew"] = 2] = "AsNew";
})(Touch || (Touch = {}));
export class LinkedMap {
    constructor() {
        this[_c] = 'LinkedMap';
        this._map = new Map();
        this._head = undefined;
        this._tail = undefined;
        this._size = 0;
        this._state = 0;
    }
    clear() {
        this._map.clear();
        this._head = undefined;
        this._tail = undefined;
        this._size = 0;
        this._state++;
    }
    isEmpty() {
        return !this._head && !this._tail;
    }
    get size() {
        return this._size;
    }
    get first() {
        return this._head?.value;
    }
    get last() {
        return this._tail?.value;
    }
    has(key) {
        return this._map.has(key);
    }
    get(key, touch = 0 /* Touch.None */) {
        const item = this._map.get(key);
        if (!item) {
            return undefined;
        }
        if (touch !== 0 /* Touch.None */) {
            this.touch(item, touch);
        }
        return item.value;
    }
    set(key, value, touch = 0 /* Touch.None */) {
        let item = this._map.get(key);
        if (item) {
            item.value = value;
            if (touch !== 0 /* Touch.None */) {
                this.touch(item, touch);
            }
        }
        else {
            item = { key, value, next: undefined, previous: undefined };
            switch (touch) {
                case 0 /* Touch.None */:
                    this.addItemLast(item);
                    break;
                case 1 /* Touch.AsOld */:
                    this.addItemFirst(item);
                    break;
                case 2 /* Touch.AsNew */:
                    this.addItemLast(item);
                    break;
                default:
                    this.addItemLast(item);
                    break;
            }
            this._map.set(key, item);
            this._size++;
        }
        return this;
    }
    delete(key) {
        return !!this.remove(key);
    }
    remove(key) {
        const item = this._map.get(key);
        if (!item) {
            return undefined;
        }
        this._map.delete(key);
        this.removeItem(item);
        this._size--;
        return item.value;
    }
    shift() {
        if (!this._head && !this._tail) {
            return undefined;
        }
        if (!this._head || !this._tail) {
            throw new Error('Invalid list');
        }
        const item = this._head;
        this._map.delete(item.key);
        this.removeItem(item);
        this._size--;
        return item.value;
    }
    forEach(callbackfn, thisArg) {
        const state = this._state;
        let current = this._head;
        while (current) {
            if (thisArg) {
                callbackfn.bind(thisArg)(current.value, current.key, this);
            }
            else {
                callbackfn(current.value, current.key, this);
            }
            if (this._state !== state) {
                throw new Error(`LinkedMap got modified during iteration.`);
            }
            current = current.next;
        }
    }
    keys() {
        const map = this;
        const state = this._state;
        let current = this._head;
        const iterator = {
            [Symbol.iterator]() {
                return iterator;
            },
            next() {
                if (map._state !== state) {
                    throw new Error(`LinkedMap got modified during iteration.`);
                }
                if (current) {
                    const result = { value: current.key, done: false };
                    current = current.next;
                    return result;
                }
                else {
                    return { value: undefined, done: true };
                }
            },
        };
        return iterator;
    }
    values() {
        const map = this;
        const state = this._state;
        let current = this._head;
        const iterator = {
            [Symbol.iterator]() {
                return iterator;
            },
            next() {
                if (map._state !== state) {
                    throw new Error(`LinkedMap got modified during iteration.`);
                }
                if (current) {
                    const result = { value: current.value, done: false };
                    current = current.next;
                    return result;
                }
                else {
                    return { value: undefined, done: true };
                }
            },
        };
        return iterator;
    }
    entries() {
        const map = this;
        const state = this._state;
        let current = this._head;
        const iterator = {
            [Symbol.iterator]() {
                return iterator;
            },
            next() {
                if (map._state !== state) {
                    throw new Error(`LinkedMap got modified during iteration.`);
                }
                if (current) {
                    const result = {
                        value: [current.key, current.value],
                        done: false,
                    };
                    current = current.next;
                    return result;
                }
                else {
                    return { value: undefined, done: true };
                }
            },
        };
        return iterator;
    }
    [(_c = Symbol.toStringTag, Symbol.iterator)]() {
        return this.entries();
    }
    trimOld(newSize) {
        if (newSize >= this.size) {
            return;
        }
        if (newSize === 0) {
            this.clear();
            return;
        }
        let current = this._head;
        let currentSize = this.size;
        while (current && currentSize > newSize) {
            this._map.delete(current.key);
            current = current.next;
            currentSize--;
        }
        this._head = current;
        this._size = currentSize;
        if (current) {
            current.previous = undefined;
        }
        this._state++;
    }
    trimNew(newSize) {
        if (newSize >= this.size) {
            return;
        }
        if (newSize === 0) {
            this.clear();
            return;
        }
        let current = this._tail;
        let currentSize = this.size;
        while (current && currentSize > newSize) {
            this._map.delete(current.key);
            current = current.previous;
            currentSize--;
        }
        this._tail = current;
        this._size = currentSize;
        if (current) {
            current.next = undefined;
        }
        this._state++;
    }
    addItemFirst(item) {
        // First time Insert
        if (!this._head && !this._tail) {
            this._tail = item;
        }
        else if (!this._head) {
            throw new Error('Invalid list');
        }
        else {
            item.next = this._head;
            this._head.previous = item;
        }
        this._head = item;
        this._state++;
    }
    addItemLast(item) {
        // First time Insert
        if (!this._head && !this._tail) {
            this._head = item;
        }
        else if (!this._tail) {
            throw new Error('Invalid list');
        }
        else {
            item.previous = this._tail;
            this._tail.next = item;
        }
        this._tail = item;
        this._state++;
    }
    removeItem(item) {
        if (item === this._head && item === this._tail) {
            this._head = undefined;
            this._tail = undefined;
        }
        else if (item === this._head) {
            // This can only happen if size === 1 which is handled
            // by the case above.
            if (!item.next) {
                throw new Error('Invalid list');
            }
            item.next.previous = undefined;
            this._head = item.next;
        }
        else if (item === this._tail) {
            // This can only happen if size === 1 which is handled
            // by the case above.
            if (!item.previous) {
                throw new Error('Invalid list');
            }
            item.previous.next = undefined;
            this._tail = item.previous;
        }
        else {
            const next = item.next;
            const previous = item.previous;
            if (!next || !previous) {
                throw new Error('Invalid list');
            }
            next.previous = previous;
            previous.next = next;
        }
        item.next = undefined;
        item.previous = undefined;
        this._state++;
    }
    touch(item, touch) {
        if (!this._head || !this._tail) {
            throw new Error('Invalid list');
        }
        if (touch !== 1 /* Touch.AsOld */ && touch !== 2 /* Touch.AsNew */) {
            return;
        }
        if (touch === 1 /* Touch.AsOld */) {
            if (item === this._head) {
                return;
            }
            const next = item.next;
            const previous = item.previous;
            // Unlink the item
            if (item === this._tail) {
                // previous must be defined since item was not head but is tail
                // So there are more than on item in the map
                previous.next = undefined;
                this._tail = previous;
            }
            else {
                // Both next and previous are not undefined since item was neither head nor tail.
                next.previous = previous;
                previous.next = next;
            }
            // Insert the node at head
            item.previous = undefined;
            item.next = this._head;
            this._head.previous = item;
            this._head = item;
            this._state++;
        }
        else if (touch === 2 /* Touch.AsNew */) {
            if (item === this._tail) {
                return;
            }
            const next = item.next;
            const previous = item.previous;
            // Unlink the item.
            if (item === this._head) {
                // next must be defined since item was not tail but is head
                // So there are more than on item in the map
                next.previous = undefined;
                this._head = next;
            }
            else {
                // Both next and previous are not undefined since item was neither head nor tail.
                next.previous = previous;
                previous.next = next;
            }
            item.next = undefined;
            item.previous = this._tail;
            this._tail.next = item;
            this._tail = item;
            this._state++;
        }
    }
    toJSON() {
        const data = [];
        this.forEach((value, key) => {
            data.push([key, value]);
        });
        return data;
    }
    fromJSON(data) {
        this.clear();
        for (const [key, value] of data) {
            this.set(key, value);
        }
    }
}
class Cache extends LinkedMap {
    constructor(limit, ratio = 1) {
        super();
        this._limit = limit;
        this._ratio = Math.min(Math.max(0, ratio), 1);
    }
    get limit() {
        return this._limit;
    }
    set limit(limit) {
        this._limit = limit;
        this.checkTrim();
    }
    get ratio() {
        return this._ratio;
    }
    set ratio(ratio) {
        this._ratio = Math.min(Math.max(0, ratio), 1);
        this.checkTrim();
    }
    get(key, touch = 2 /* Touch.AsNew */) {
        return super.get(key, touch);
    }
    peek(key) {
        return super.get(key, 0 /* Touch.None */);
    }
    set(key, value) {
        super.set(key, value, 2 /* Touch.AsNew */);
        return this;
    }
    checkTrim() {
        if (this.size > this._limit) {
            this.trim(Math.round(this._limit * this._ratio));
        }
    }
}
export class LRUCache extends Cache {
    constructor(limit, ratio = 1) {
        super(limit, ratio);
    }
    trim(newSize) {
        this.trimOld(newSize);
    }
    set(key, value) {
        super.set(key, value);
        this.checkTrim();
        return this;
    }
}
export class MRUCache extends Cache {
    constructor(limit, ratio = 1) {
        super(limit, ratio);
    }
    trim(newSize) {
        this.trimNew(newSize);
    }
    set(key, value) {
        if (this._limit <= this.size && !this.has(key)) {
            this.trim(Math.round(this._limit * this._ratio) - 1);
        }
        super.set(key, value);
        return this;
    }
}
export class CounterSet {
    constructor() {
        this.map = new Map();
    }
    add(value) {
        this.map.set(value, (this.map.get(value) || 0) + 1);
        return this;
    }
    delete(value) {
        let counter = this.map.get(value) || 0;
        if (counter === 0) {
            return false;
        }
        counter--;
        if (counter === 0) {
            this.map.delete(value);
        }
        else {
            this.map.set(value, counter);
        }
        return true;
    }
    has(value) {
        return this.map.has(value);
    }
}
/**
 * A map that allows access both by keys and values.
 * **NOTE**: values need to be unique.
 */
export class BidirectionalMap {
    constructor(entries) {
        this._m1 = new Map();
        this._m2 = new Map();
        if (entries) {
            for (const [key, value] of entries) {
                this.set(key, value);
            }
        }
    }
    clear() {
        this._m1.clear();
        this._m2.clear();
    }
    set(key, value) {
        this._m1.set(key, value);
        this._m2.set(value, key);
    }
    get(key) {
        return this._m1.get(key);
    }
    getKey(value) {
        return this._m2.get(value);
    }
    delete(key) {
        const value = this._m1.get(key);
        if (value === undefined) {
            return false;
        }
        this._m1.delete(key);
        this._m2.delete(value);
        return true;
    }
    forEach(callbackfn, thisArg) {
        this._m1.forEach((value, key) => {
            callbackfn.call(thisArg, value, key, this);
        });
    }
    keys() {
        return this._m1.keys();
    }
    values() {
        return this._m1.values();
    }
}
export class SetMap {
    constructor() {
        this.map = new Map();
    }
    add(key, value) {
        let values = this.map.get(key);
        if (!values) {
            values = new Set();
            this.map.set(key, values);
        }
        values.add(value);
    }
    delete(key, value) {
        const values = this.map.get(key);
        if (!values) {
            return;
        }
        values.delete(value);
        if (values.size === 0) {
            this.map.delete(key);
        }
    }
    forEach(key, fn) {
        const values = this.map.get(key);
        if (!values) {
            return;
        }
        values.forEach(fn);
    }
    get(key) {
        const values = this.map.get(key);
        if (!values) {
            return new Set();
        }
        return values;
    }
}
export function mapsStrictEqualIgnoreOrder(a, b) {
    if (a === b) {
        return true;
    }
    if (a.size !== b.size) {
        return false;
    }
    for (const [key, value] of a) {
        if (!b.has(key) || b.get(key) !== value) {
            return false;
        }
    }
    for (const [key] of b) {
        if (!a.has(key)) {
            return false;
        }
    }
    return true;
}
/**
 * A map that is addressable with an arbitrary number of keys. This is useful in high performance
 * scenarios where creating a composite key whenever the data is accessed is too expensive. For
 * example for a very hot function, constructing a string like `first-second-third` for every call
 * will cause a significant hit to performance.
 */
export class NKeyMap {
    constructor() {
        this._data = new Map();
    }
    /**
     * Sets a value on the map. Note that unlike a standard `Map`, the first argument is the value.
     * This is because the spread operator is used for the keys and must be last..
     * @param value The value to set.
     * @param keys The keys for the value.
     */
    set(value, ...keys) {
        let currentMap = this._data;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!currentMap.has(keys[i])) {
                currentMap.set(keys[i], new Map());
            }
            currentMap = currentMap.get(keys[i]);
        }
        currentMap.set(keys[keys.length - 1], value);
    }
    get(...keys) {
        let currentMap = this._data;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!currentMap.has(keys[i])) {
                return undefined;
            }
            currentMap = currentMap.get(keys[i]);
        }
        return currentMap.get(keys[keys.length - 1]);
    }
    clear() {
        this._data.clear();
    }
    *values() {
        function* iterate(map) {
            for (const value of map.values()) {
                if (value instanceof Map) {
                    yield* iterate(value);
                }
                else {
                    yield value;
                }
            }
        }
        yield* iterate(this._data);
    }
    /**
     * Get a textual representation of the map for debugging purposes.
     */
    toString() {
        const printMap = (map, depth) => {
            let result = '';
            for (const [key, value] of map) {
                result += `${'  '.repeat(depth)}${key}: `;
                if (value instanceof Map) {
                    result += '\n' + printMap(value, depth + 1);
                }
                else {
                    result += `${value}\n`;
                }
            }
            return result;
        };
        return printMap(this._data, 0);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vbWFwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOztBQUloRyxNQUFNLFVBQVUsUUFBUSxDQUFPLEdBQWMsRUFBRSxHQUFNLEVBQUUsS0FBUTtJQUM5RCxJQUFJLE1BQU0sR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3pCLElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQzFCLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDZCxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUNyQixDQUFDO0lBRUQsT0FBTyxNQUFNLENBQUE7QUFDZCxDQUFDO0FBRUQsTUFBTSxVQUFVLFdBQVcsQ0FBTyxHQUFjO0lBQy9DLE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQTtJQUM1QixHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQzFCLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLE9BQU8sS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUNuQyxDQUFDLENBQUMsQ0FBQTtJQUVGLE9BQU8sT0FBTyxHQUFHLENBQUMsSUFBSSxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQTtBQUNsRCxDQUFDO0FBRUQsTUFBTSxVQUFVLFdBQVcsQ0FBSSxHQUFXO0lBQ3pDLE1BQU0sT0FBTyxHQUFRLEVBQUUsQ0FBQTtJQUN2QixHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7UUFDckIsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNwQixDQUFDLENBQUMsQ0FBQTtJQUVGLE9BQU8sT0FBTyxHQUFHLENB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