/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assert } from './assert.js';
/**
 * @returns whether the provided parameter is a JavaScript String or not.
 */
export function isString(str) {
    return typeof str === 'string';
}
/**
 * @returns whether the provided parameter is a JavaScript Array and each element in the array is a string.
 */
export function isStringArray(value) {
    return Array.isArray(value) && value.every((elem) => isString(elem));
}
/**
 * @returns whether the provided parameter is of type `object` but **not**
 *	`null`, an `array`, a `regexp`, nor a `date`.
 */
export function isObject(obj) {
    // The method can't do a type cast since there are type (like strings) which
    // are subclasses of any put not positvely matched by the function. Hence type
    // narrowing results in wrong results.
    return (typeof obj === 'object' &&
        obj !== null &&
        !Array.isArray(obj) &&
        !(obj instanceof RegExp) &&
        !(obj instanceof Date));
}
/**
 * @returns whether the provided parameter is of type `Buffer` or Uint8Array dervived type
 */
export function isTypedArray(obj) {
    const TypedArray = Object.getPrototypeOf(Uint8Array);
    return typeof obj === 'object' && obj instanceof TypedArray;
}
/**
 * In **contrast** to just checking `typeof` this will return `false` for `NaN`.
 * @returns whether the provided parameter is a JavaScript Number or not.
 */
export function isNumber(obj) {
    return typeof obj === 'number' && !isNaN(obj);
}
/**
 * @returns whether the provided parameter is an Iterable, casting to the given generic
 */
export function isIterable(obj) {
    return !!obj && typeof obj[Symbol.iterator] === 'function';
}
/**
 * @returns whether the provided parameter is a JavaScript Boolean or not.
 */
export function isBoolean(obj) {
    return obj === true || obj === false;
}
/**
 * @returns whether the provided parameter is undefined.
 */
export function isUndefined(obj) {
    return typeof obj === 'undefined';
}
/**
 * @returns whether the provided parameter is defined.
 */
export function isDefined(arg) {
    return !isUndefinedOrNull(arg);
}
/**
 * @returns whether the provided parameter is undefined or null.
 */
export function isUndefinedOrNull(obj) {
    return isUndefined(obj) || obj === null;
}
export function assertType(condition, type) {
    if (!condition) {
        throw new Error(type ? `Unexpected type, expected '${type}'` : 'Unexpected type');
    }
}
/**
 * Asserts that the argument passed in is neither undefined nor null.
 *
 * @see {@link assertDefined} for a similar utility that leverages TS assertion functions to narrow down the type of `arg` to be non-nullable.
 */
export function assertIsDefined(arg) {
    assert(arg !== null && arg !== undefined, 'Argument is `undefined` or `null`.');
    return arg;
}
/**
 * Asserts that a provided `value` is `defined` - not `null` or `undefined`,
 * throwing an error with the provided error or error message, while also
 * narrowing down the type of the `value` to be `NonNullable` using TS
 * assertion functions.
 *
 * @throws if the provided `value` is `null` or `undefined`.
 *
 * ## Examples
 *
 * ```typescript
 * // an assert with an error message
 * assertDefined('some value', 'String constant is not defined o_O.');
 *
 * // `throws!` the provided error
 * assertDefined(null, new Error('Should throw this error.'));
 *
 * // narrows down the type of `someValue` to be non-nullable
 * const someValue: string | undefined | null = blackbox();
 * assertDefined(someValue, 'Some value must be defined.');
 * console.log(someValue.length); // now type of `someValue` is `string`
 * ```
 *
 * @see {@link assertIsDefined} for a similar utility but without assertion.
 * @see {@link https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions typescript-3-7.html#assertion-functions}
 */
export function assertDefined(value, error) {
    if (value === null || value === undefined) {
        const errorToThrow = typeof error === 'string' ? new Error(error) : error;
        throw errorToThrow;
    }
}
export function assertAllDefined(...args) {
    const result = [];
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (isUndefinedOrNull(arg)) {
            throw new Error(`Assertion Failed: argument at index ${i} is undefined or null`);
        }
        result.push(arg);
    }
    return result;
}
/**
 * Asserts that the provided `item` is one of the items in the `list`.
 * Helps to narrow down broader `TType` of the `item` to the more
 * specific `TSubtype` type.
 *
 * ## Examples
 *
 * ```typescript
 * // note! item type is a `subset of string`
 * type TItem = ':' | '.' | '/';
 *
 * // note! item is type of `string` here
 * const item: string = ':';
 * // list of the items to check against
 * const list: TItem[] = [':', '.'];
 *
 * // ok
 * assertOneOf(
 *   item,
 *   list,
 *   'Must succeed',
 * );
 *
 * // `item` is of `TItem` type now
 * ```
 */
export function assertOneOf(item, list, errorPrefix) {
    // note! it's ok to type cast here because `TSubtype` is a subtype of `TType`
    assert(list.includes(item), `${errorPrefix}: Expected '${item}' to be one of [${list.join(', ')}].`);
}
/**
 * Compile-time type check of a variable.
 */
export function typeCheck(_thing) { }
const hasOwnProperty = Object.prototype.hasOwnProperty;
/**
 * @returns whether the provided parameter is an empty JavaScript Object or not.
 */
export function isEmptyObject(obj) {
    if (!isObject(obj)) {
        return false;
    }
    for (const key in obj) {
        if (hasOwnProperty.call(obj, key)) {
            return false;
        }
    }
    return true;
}
/**
 * @returns whether the provided parameter is a JavaScript Function or not.
 */
export function isFunction(obj) {
    return typeof obj === 'function';
}
/**
 * @returns whether the provided parameters is are JavaScript Function or not.
 */
export function areFunctions(...objects) {
    return objects.length > 0 && objects.every(isFunction);
}
export function validateConstraints(args, constraints) {
    const len = Math.min(args.length, constraints.length);
    for (let i = 0; i < len; i++) {
        validateConstraint(args[i], constraints[i]);
    }
}
export function validateConstraint(arg, constraint) {
    if (isString(constraint)) {
        if (typeof arg !== constraint) {
            throw new Error(`argument does not match constraint: typeof ${constraint}`);
        }
    }
    else if (isFunction(constraint)) {
        try {
            if (arg instanceof constraint) {
                return;
            }
        }
        catch {
            // ignore
        }
        if (!isUndefinedOrNull(arg) && arg.constructor === constraint) {
            return;
        }
        if (constraint.length === 1 && constraint.call(undefined, arg) === true) {
            return;
        }
        throw new Error(`argument does not match one of these constraints: arg instanceof constraint, arg.constructor === constraint, nor constraint(arg) === true`);
    }
}
/**
 * Helper type assertion that safely upcasts a type to a supertype.
 *
 * This can be used to make sure the argument correctly conforms to the subtype while still being able to pass it
 * to contexts that expects the supertype.
 */
export function upcast(x) {
    return x;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi90eXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBRXBDOztHQUVHO0FBQ0gsTUFBTSxVQUFVLFFBQVEsQ0FBQyxHQUFZO0lBQ3BDLE9BQU8sT0FBTyxHQUFHLEtBQUssUUFBUSxDQUFBO0FBQy9CLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxhQUFhLENBQUMsS0FBYztJQUMzQyxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQWdCLEtBQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0FBQ2xGLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsUUFBUSxDQUFDLEdBQVk7SUFDcEMsNEVBQTRFO0lBQzVFLDhFQUE4RTtJQUM5RSxzQ0FBc0M7SUFDdEMsT0FBTyxDQUNOLE9BQU8sR0FBRyxLQUFLLFFBQVE7UUFDdkIsR0FBRyxLQUFLLElBQUk7UUFDWixDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO1FBQ25CLENBQUMsQ0FBQyxHQUFHLFlBQVksTUFBTSxDQUFDO1FBQ3hCLENBQUMsQ0FBQyxHQUFHLFlBQVksSUFBSSxDQUFDLENBQ3RCLENBQUE7QUFDRixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsWUFBWSxDQUFDLEdBQVk7SUFDeEMsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUNwRCxPQUFPLE9BQU8sR0FBRyxLQUFLLFFBQVEsSUFBSSxHQUFHLFlBQVksVUFBVSxDQUFBO0FBQzVE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