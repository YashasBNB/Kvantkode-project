/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationTokenSource } from './cancellation.js';
export class Cache {
    constructor(task) {
        this.task = task;
        this.result = null;
    }
    get() {
        if (this.result) {
            return this.result;
        }
        const cts = new CancellationTokenSource();
        const promise = this.task(cts.token);
        this.result = {
            promise,
            dispose: () => {
                this.result = null;
                cts.cancel();
                cts.dispose();
            },
        };
        return this.result;
    }
}
export function identity(t) {
    return t;
}
/**
 * Uses a LRU cache to make a given parametrized function cached.
 * Caches just the last key/value.
 */
export class LRUCachedFunction {
    constructor(arg1, arg2) {
        this.lastCache = undefined;
        this.lastArgKey = undefined;
        if (typeof arg1 === 'function') {
            this._fn = arg1;
            this._computeKey = identity;
        }
        else {
            this._fn = arg2;
            this._computeKey = arg1.getCacheKey;
        }
    }
    get(arg) {
        const key = this._computeKey(arg);
        if (this.lastArgKey !== key) {
            this.lastArgKey = key;
            this.lastCache = this._fn(arg);
        }
        return this.lastCache;
    }
}
/**
 * Uses an unbounded cache to memoize the results of the given function.
 */
export class CachedFunction {
    get cachedValues() {
        return this._map;
    }
    constructor(arg1, arg2) {
        this._map = new Map();
        this._map2 = new Map();
        if (typeof arg1 === 'function') {
            this._fn = arg1;
            this._computeKey = identity;
        }
        else {
            this._fn = arg2;
            this._computeKey = arg1.getCacheKey;
        }
    }
    get(arg) {
        const key = this._computeKey(arg);
        if (this._map2.has(key)) {
            return this._map2.get(key);
        }
        const value = this._fn(arg);
        this._map.set(arg, value);
        this._map2.set(key, value);
        return value;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2NhY2hlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQU85RSxNQUFNLE9BQU8sS0FBSztJQUVqQixZQUFvQixJQUEyQztRQUEzQyxTQUFJLEdBQUosSUFBSSxDQUF1QztRQUR2RCxXQUFNLEdBQTBCLElBQUksQ0FBQTtJQUNzQixDQUFDO0lBRW5FLEdBQUc7UUFDRixJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7UUFDbkIsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUVwQyxJQUFJLENBQUMsTUFBTSxHQUFHO1lBQ2IsT0FBTztZQUNQLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2IsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUE7Z0JBQ2xCLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtnQkFDWixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDZCxDQUFDO1NBQ0QsQ0FBQTtRQUVELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUNuQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLFVBQVUsUUFBUSxDQUFJLENBQUk7SUFDL0IsT0FBTyxDQUFDLENBQUE7QUFDVCxDQUFDO0FBVUQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGlCQUFpQjtJQVM3QixZQUNDLElBQXNELEVBQ3RELElBQStCO1FBVnhCLGNBQVMsR0FBMEIsU0FBUyxDQUFBO1FBQzVDLGVBQVUsR0FBd0IsU0FBUyxDQUFBO1FBV2xELElBQUksT0FBTyxJQUFJLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUE7WUFDZixJQUFJLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQTtRQUM1QixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSyxDQUFBO1lBQ2hCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQTtRQUNwQyxDQUFDO0lBQ0YsQ0FBQztJQUVNLEdBQUcsQ0FBQyxHQUFTO1FBQ25CLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDakMsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFBO1lBQ3JCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMvQixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsU0FBVSxDQUFBO0lBQ3ZCLENBQUM7Q0FDRDtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGNBQWM7SUFHMUIsSUFBVyxZQUFZO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQTtJQUNqQixDQUFDO0lBT0QsWUFDQyxJQUFzRCxFQUN0RCxJQUErQjtRQWJmLFNBQUksR0FBRyxJQUFJLEdBQUcsRUFBbUIsQ0FBQTtRQUNqQyxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQXNCLENBQUE7UUFjckQsSUFBSSxPQUFPLElBQUksS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQTtZQUNmLElBQUksQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFBO1FBQzVCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFLLENBQUE7WUFDaEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFBO1FBQ3BDLENBQUM7SUFDRixDQUFDO0lBRU0sR0FBRyxDQUFDLEdBQVM7UUFDbkIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNqQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDekIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUUsQ0FBQTtRQUM1QixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMzQixJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDekIsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzFCLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztDQUNEIn0=