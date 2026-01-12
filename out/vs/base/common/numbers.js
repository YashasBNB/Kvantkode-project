/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assert } from './assert.js';
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
export function rot(index, modulo) {
    return (modulo + (index % modulo)) % modulo;
}
export class Counter {
    constructor() {
        this._next = 0;
    }
    getNext() {
        return this._next++;
    }
}
export class MovingAverage {
    constructor() {
        this._n = 1;
        this._val = 0;
    }
    update(value) {
        this._val = this._val + (value - this._val) / this._n;
        this._n += 1;
        return this._val;
    }
    get value() {
        return this._val;
    }
}
export class SlidingWindowAverage {
    constructor(size) {
        this._n = 0;
        this._val = 0;
        this._values = [];
        this._index = 0;
        this._sum = 0;
        this._values = new Array(size);
        this._values.fill(0, 0, size);
    }
    update(value) {
        const oldValue = this._values[this._index];
        this._values[this._index] = value;
        this._index = (this._index + 1) % this._values.length;
        this._sum -= oldValue;
        this._sum += value;
        if (this._n < this._values.length) {
            this._n += 1;
        }
        this._val = this._sum / this._n;
        return this._val;
    }
    get value() {
        return this._val;
    }
}
/** Returns whether the point is within the triangle formed by the following 6 x/y point pairs */
export function isPointWithinTriangle(x, y, ax, ay, bx, by, cx, cy) {
    const v0x = cx - ax;
    const v0y = cy - ay;
    const v1x = bx - ax;
    const v1y = by - ay;
    const v2x = x - ax;
    const v2y = y - ay;
    const dot00 = v0x * v0x + v0y * v0y;
    const dot01 = v0x * v1x + v0y * v1y;
    const dot02 = v0x * v2x + v0y * v2y;
    const dot11 = v1x * v1x + v1y * v1y;
    const dot12 = v1x * v2x + v1y * v2y;
    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
    return u >= 0 && v >= 0 && u + v < 1;
}
/**
 * Function to get a (pseudo)random integer from a provided `max`...[`min`] range.
 * Both `min` and `max` values are inclusive. The `min` value is optional and defaults
 * to `0` if not explicitly specified.
 *
 * @throws in the next cases:
 * 	- if provided `min` or `max` is not a number
 *  - if provided `min` or `max` is not finite
 *  - if provided `min` is larger than `max` value
 *
 * ## Examples
 *
 * Specifying a `max` value only uses `0` as the `min` value by default:
 *
 * ```typescript
 * // get a random integer between 0 and 10
 * const randomInt = randomInt(10);
 *
 * assert(
 *   randomInt >= 0,
 *   'Should be greater than or equal to 0.',
 * );
 *
 * assert(
 *   randomInt <= 10,
 *   'Should be less than or equal to 10.',
 * );
 * ```
 * * Specifying both `max` and `min` values:
 *
 * ```typescript
 * // get a random integer between 5 and 8
 * const randomInt = randomInt(8, 5);
 *
 * assert(
 *   randomInt >= 5,
 *   'Should be greater than or equal to 5.',
 * );
 *
 * assert(
 *   randomInt <= 8,
 *   'Should be less than or equal to 8.',
 * );
 * ```
 */
export const randomInt = (max, min = 0) => {
    assert(!isNaN(min), '"min" param is not a number.');
    assert(!isNaN(max), '"max" param is not a number.');
    assert(isFinite(max), '"max" param is not finite.');
    assert(isFinite(min), '"min" param is not finite.');
    assert(max > min, `"max"(${max}) param should be greater than "min"(${min}).`);
    const delta = max - min;
    const randomFloat = delta * Math.random();
    return Math.round(min + randomFloat);
};
export function randomChance(p) {
    assert(p >= 0 && p <= 1, 'p must be between 0 and 1');
    return Math.random() < p;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnVtYmVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vbnVtYmVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBRXBDLE1BQU0sVUFBVSxLQUFLLENBQUMsS0FBYSxFQUFFLEdBQVcsRUFBRSxHQUFXO0lBQzVELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtBQUMzQyxDQUFDO0FBRUQsTUFBTSxVQUFVLEdBQUcsQ0FBQyxLQUFhLEVBQUUsTUFBYztJQUNoRCxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFBO0FBQzVDLENBQUM7QUFFRCxNQUFNLE9BQU8sT0FBTztJQUFwQjtRQUNTLFVBQUssR0FBRyxDQUFDLENBQUE7SUFLbEIsQ0FBQztJQUhBLE9BQU87UUFDTixPQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNwQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sYUFBYTtJQUExQjtRQUNTLE9BQUUsR0FBRyxDQUFDLENBQUE7UUFDTixTQUFJLEdBQUcsQ0FBQyxDQUFBO0lBV2pCLENBQUM7SUFUQSxNQUFNLENBQUMsS0FBYTtRQUNuQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUE7UUFDckQsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDWixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUE7SUFDakIs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