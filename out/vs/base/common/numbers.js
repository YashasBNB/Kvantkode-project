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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnVtYmVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL251bWJlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUVwQyxNQUFNLFVBQVUsS0FBSyxDQUFDLEtBQWEsRUFBRSxHQUFXLEVBQUUsR0FBVztJQUM1RCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7QUFDM0MsQ0FBQztBQUVELE1BQU0sVUFBVSxHQUFHLENBQUMsS0FBYSxFQUFFLE1BQWM7SUFDaEQsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQTtBQUM1QyxDQUFDO0FBRUQsTUFBTSxPQUFPLE9BQU87SUFBcEI7UUFDUyxVQUFLLEdBQUcsQ0FBQyxDQUFBO0lBS2xCLENBQUM7SUFIQSxPQUFPO1FBQ04sT0FBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDcEIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGFBQWE7SUFBMUI7UUFDUyxPQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ04sU0FBSSxHQUFHLENBQUMsQ0FBQTtJQVdqQixDQUFDO0lBVEEsTUFBTSxDQUFDLEtBQWE7UUFDbkIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFBO1FBQ3JELElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ1osT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFBO0lBQ2pCLENBQUM7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