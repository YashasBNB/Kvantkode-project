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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9jYWNoZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFPOUUsTUFBTSxPQUFPLEtBQUs7SUFFakIsWUFBb0IsSUFBMkM7UUFBM0MsU0FBSSxHQUFKLElBQUksQ0FBdUM7UUFEdkQsV0FBTSxHQUEwQixJQUFJLENBQUE7SUFDc0IsQ0FBQztJQUVuRSxHQUFHO1FBQ0YsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO1FBQ25CLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUE7UUFDekMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFcEMsSUFBSSxDQUFDLE1BQU0sR0FBRztZQUNiLE9BQU87WUFDUCxPQUFPLEVBQUUsR0FBRyxFQUFFO2dCQUNiLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFBO2dCQUNsQixHQUFHLENBQUMsTUFBTSxFQUFFLENBQUE7Z0JBQ1osR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ2QsQ0FBQztTQUNELENBQUE7UUFFRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDbkIsQ0FBQztDQUNEO0FBRUQsTUFBTSxVQUFVLFFBQVEsQ0FBSSxDQUFJO0lBQy9CLE9BQU8sQ0FBQyxDQUFBO0FBQ1QsQ0FBQztBQVVEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxpQkFBaUI7SUFTN0IsWUFDQyxJQUFzRCxFQUN0RCxJQUErQjtRQVZ4QixjQUFTLEdBQTBCLFNBQVMsQ0FBQTtRQUM1QyxlQUFVLEdBQXdCLFNBQVMsQ0FBQTtRQVdsRCxJQUFJLE9BQU8sSUFBSSxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFBO1lBQ2YsSUFBSSxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUE7UUFDNUIsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUssQ0FBQTtZQUNoQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUE7UUFDcEMsQ0FBQztJQUNGLENBQUM7SUFFTSxHQUFHLENBQUMsR0FBUztRQUNuQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2pDLElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQTtZQUNyQixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDL0IsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFNBQVUsQ0FBQTtJQUN2QixDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxjQUFjO0lBRzFCLElBQVcsWUFBWTtRQUN0QixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUE7SUFDakIsQ0FBQztJQU9ELFlBQ0MsSUFBc0QsRUFDdEQsSUFBK0I7UUFiZixTQUFJLEdBQUcsSUFBSSxHQUFHLEVBQW1CLENBQUE7UUFDakMsVUFBSyxHQUFHLElBQUksR0FBRyxFQUFzQixDQUFBO1FBY3JELElBQUksT0FBTyxJQUFJLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUE7WUFDZixJQUFJLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQTtRQUM1QixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSyxDQUFBO1lBQ2hCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQTtRQUNwQyxDQUFDO0lBQ0YsQ0FBQztJQUVNLEdBQUcsQ0FBQyxHQUFTO1FBQ25CLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDakMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3pCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFFLENBQUE7UUFDNUIsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDM0IsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3pCLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMxQixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7Q0FDRCJ9