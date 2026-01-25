/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const emptyArr = [];
/**
 * Represents an immutable set that works best for a small number of elements (less than 32).
 * It uses bits to encode element membership efficiently.
 */
export class SmallImmutableSet {
    static { this.cache = new Array(129); }
    static create(items, additionalItems) {
        if (items <= 128 && additionalItems.length === 0) {
            // We create a cache of 128=2^7 elements to cover all sets with up to 7 (dense) elements.
            let cached = SmallImmutableSet.cache[items];
            if (!cached) {
                cached = new SmallImmutableSet(items, additionalItems);
                SmallImmutableSet.cache[items] = cached;
            }
            return cached;
        }
        return new SmallImmutableSet(items, additionalItems);
    }
    static { this.empty = SmallImmutableSet.create(0, emptyArr); }
    static getEmpty() {
        return this.empty;
    }
    constructor(items, additionalItems) {
        this.items = items;
        this.additionalItems = additionalItems;
    }
    add(value, keyProvider) {
        const key = keyProvider.getKey(value);
        let idx = key >> 5; // divided by 32
        if (idx === 0) {
            // fast path
            const newItem = (1 << key) | this.items;
            if (newItem === this.items) {
                return this;
            }
            return SmallImmutableSet.create(newItem, this.additionalItems);
        }
        idx--;
        const newItems = this.additionalItems.slice(0);
        while (newItems.length < idx) {
            newItems.push(0);
        }
        newItems[idx] |= 1 << (key & 31);
        return SmallImmutableSet.create(this.items, newItems);
    }
    has(value, keyProvider) {
        const key = keyProvider.getKey(value);
        let idx = key >> 5; // divided by 32
        if (idx === 0) {
            // fast path
            return (this.items & (1 << key)) !== 0;
        }
        idx--;
        return ((this.additionalItems[idx] || 0) & (1 << (key & 31))) !== 0;
    }
    merge(other) {
        const merged = this.items | other.items;
        if (this.additionalItems === emptyArr && other.additionalItems === emptyArr) {
            // fast path
            if (merged === this.items) {
                return this;
            }
            if (merged === other.items) {
                return other;
            }
            return SmallImmutableSet.create(merged, emptyArr);
        }
        // This can be optimized, but it's not a common case
        const newItems = [];
        for (let i = 0; i < Math.max(this.additionalItems.length, other.additionalItems.length); i++) {
            const item1 = this.additionalItems[i] || 0;
            const item2 = other.additionalItems[i] || 0;
            newItems.push(item1 | item2);
        }
        return SmallImmutableSet.create(merged, newItems);
    }
    intersects(other) {
        if ((this.items & other.items) !== 0) {
            return true;
        }
        for (let i = 0; i < Math.min(this.additionalItems.length, other.additionalItems.length); i++) {
            if ((this.additionalItems[i] & other.additionalItems[i]) !== 0) {
                return true;
            }
        }
        return false;
    }
    equals(other) {
        if (this.items !== other.items) {
            return false;
        }
        if (this.additionalItems.length !== other.additionalItems.length) {
            return false;
        }
        for (let i = 0; i < this.additionalItems.length; i++) {
            if (this.additionalItems[i] !== other.additionalItems[i]) {
                return false;
            }
        }
        return true;
    }
}
export const identityKeyProvider = {
    getKey(value) {
        return value;
    },
};
/**
 * Assigns values a unique incrementing key.
 */
export class DenseKeyProvider {
    constructor() {
        this.items = new Map();
    }
    getKey(value) {
        let existing = this.items.get(value);
        if (existing === undefined) {
            existing = this.items.size;
            this.items.set(value, existing);
        }
        return existing;
    }
    reverseLookup(value) {
        return [...this.items].find(([_key, v]) => v === value)?.[0];
    }
    reverseLookupSet(set) {
        const result = [];
        for (const [key] of this.items) {
            if (set.has(key, this)) {
                result.push(key);
            }
        }
        return result;
    }
    keys() {
        return this.items.keys();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic21hbGxJbW11dGFibGVTZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvYnJhY2tldFBhaXJzVGV4dE1vZGVsUGFydC9icmFja2V0UGFpcnNUcmVlL3NtYWxsSW1tdXRhYmxlU2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE1BQU0sUUFBUSxHQUFhLEVBQUUsQ0FBQTtBQUU3Qjs7O0dBR0c7QUFDSCxNQUFNLE9BQU8saUJBQWlCO2FBQ2QsVUFBSyxHQUFHLElBQUksS0FBSyxDQUF5QixHQUFHLENBQUMsQ0FBQTtJQUVyRCxNQUFNLENBQUMsTUFBTSxDQUNwQixLQUFhLEVBQ2IsZUFBa0M7UUFFbEMsSUFBSSxLQUFLLElBQUksR0FBRyxJQUFJLGVBQWUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbEQseUZBQXlGO1lBQ3pGLElBQUksTUFBTSxHQUFHLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMzQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2IsTUFBTSxHQUFHLElBQUksaUJBQWlCLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFBO2dCQUN0RCxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsTUFBTSxDQUFBO1lBQ3hDLENBQUM7WUFDRCxPQUFPLE1BQU0sQ0FBQTtRQUNkLENBQUM7UUFFRCxPQUFPLElBQUksaUJBQWlCLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFBO0lBQ3JELENBQUM7YUFFYyxVQUFLLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFNLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUMxRCxNQUFNLENBQUMsUUFBUTtRQUNyQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUE7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