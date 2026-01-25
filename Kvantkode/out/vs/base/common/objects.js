/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isTypedArray, isObject, isUndefinedOrNull } from './types.js';
export function deepClone(obj) {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof RegExp) {
        return obj;
    }
    const result = Array.isArray(obj) ? [] : {};
    Object.entries(obj).forEach(([key, value]) => {
        result[key] = value && typeof value === 'object' ? deepClone(value) : value;
    });
    return result;
}
export function deepFreeze(obj) {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }
    const stack = [obj];
    while (stack.length > 0) {
        const obj = stack.shift();
        Object.freeze(obj);
        for (const key in obj) {
            if (_hasOwnProperty.call(obj, key)) {
                const prop = obj[key];
                if (typeof prop === 'object' && !Object.isFrozen(prop) && !isTypedArray(prop)) {
                    stack.push(prop);
                }
            }
        }
    }
    return obj;
}
const _hasOwnProperty = Object.prototype.hasOwnProperty;
export function cloneAndChange(obj, changer) {
    return _cloneAndChange(obj, changer, new Set());
}
function _cloneAndChange(obj, changer, seen) {
    if (isUndefinedOrNull(obj)) {
        return obj;
    }
    const changed = changer(obj);
    if (typeof changed !== 'undefined') {
        return changed;
    }
    if (Array.isArray(obj)) {
        const r1 = [];
        for (const e of obj) {
            r1.push(_cloneAndChange(e, changer, seen));
        }
        return r1;
    }
    if (isObject(obj)) {
        if (seen.has(obj)) {
            throw new Error('Cannot clone recursive data-structure');
        }
        seen.add(obj);
        const r2 = {};
        for (const i2 in obj) {
            if (_hasOwnProperty.call(obj, i2)) {
                ;
                r2[i2] = _cloneAndChange(obj[i2], changer, seen);
            }
        }
        seen.delete(obj);
        return r2;
    }
    return obj;
}
/**
 * Copies all properties of source into destination. The optional parameter "overwrite" allows to control
 * if existing properties on the destination should be overwritten or not. Defaults to true (overwrite).
 */
export function mixin(destination, source, overwrite = true) {
    if (!isObject(destination)) {
        return source;
    }
    if (isObject(source)) {
        Object.keys(source).forEach((key) => {
            if (key in destination) {
                if (overwrite) {
                    if (isObject(destination[key]) && isObject(source[key])) {
                        mixin(destination[key], source[key], overwrite);
                    }
                    else {
                        destination[key] = source[key];
                    }
                }
            }
            else {
                destination[key] = source[key];
            }
        });
    }
    return destination;
}
export function equals(one, other) {
    if (one === other) {
        return true;
    }
    if (one === null || one === undefined || other === null || other === undefined) {
        return false;
    }
    if (typeof one !== typeof other) {
        return false;
    }
    if (typeof one !== 'object') {
        return false;
    }
    if (Array.isArray(one) !== Array.isArray(other)) {
        return false;
    }
    let i;
    let key;
    if (Array.isArray(one)) {
        if (one.length !== other.length) {
            return false;
        }
        for (i = 0; i < one.length; i++) {
            if (!equals(one[i], other[i])) {
                return false;
            }
        }
    }
    else {
        const oneKeys = [];
        for (key in one) {
            oneKeys.push(key);
        }
        oneKeys.sort();
        const otherKeys = [];
        for (key in other) {
            otherKeys.push(key);
        }
        otherKeys.sort();
        if (!equals(oneKeys, otherKeys)) {
            return false;
        }
        for (i = 0; i < oneKeys.length; i++) {
            if (!equals(one[oneKeys[i]], other[oneKeys[i]])) {
                return false;
            }
        }
    }
    return true;
}
/**
 * Calls `JSON.Stringify` with a replacer to break apart any circular references.
 * This prevents `JSON`.stringify` from throwing the exception
 *  "Uncaught TypeError: Converting circular structure to JSON"
 */
export function safeStringify(obj) {
    const seen = new Set();
    return JSON.stringify(obj, (key, value) => {
        if (isObject(value) || Array.isArray(value)) {
            if (seen.has(value)) {
                return '[Circular]';
            }
            else {
                seen.add(value);
            }
        }
        if (typeof value === 'bigint') {
            return `[BigInt ${value.toString()}]`;
        }
        return value;
    });
}
/**
 * Returns an object that has keys for each value that is different in the base object. Keys
 * that do not exist in the target but in the base object are not considered.
 *
 * Note: This is not a deep-diffing method, so the values are strictly taken into the resulting
 * object if they differ.
 *
 * @param base the object to diff against
 * @param obj the object to use for diffing
 */
export function distinct(base, target) {
    const result = Object.create(null);
    if (!base || !target) {
        return result;
    }
    const targetKeys = Object.keys(target);
    targetKeys.forEach((k) => {
        const baseValue = base[k];
        const targetValue = target[k];
        if (!equals(baseValue, targetValue)) {
            result[k] = targetValue;
        }
    });
    return result;
}
export function getCaseInsensitive(target, key) {
    const lowercaseKey = key.toLowerCase();
    const equivalentKey = Object.keys(target).find((k) => k.toLowerCase() === lowercaseKey);
    return equivalentKey ? target[equivalentKey] : target[key];
}
export function filter(obj, predicate) {
    const result = Object.create(null);
    for (const [key, value] of Object.entries(obj)) {
        if (predicate(key, value)) {
            result[key] = value;
        }
    }
    return result;
}
export function mapValues(obj, fn) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        result[key] = fn(value, key);
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JqZWN0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUV0RSxNQUFNLFVBQVUsU0FBUyxDQUFJLEdBQU07SUFDbEMsSUFBSSxDQUFDLEdBQUcsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUNyQyxPQUFPLEdBQUcsQ0FBQTtJQUNYLENBQUM7SUFDRCxJQUFJLEdBQUcsWUFBWSxNQUFNLEVBQUUsQ0FBQztRQUMzQixPQUFPLEdBQUcsQ0FBQTtJQUNYLENBQUM7SUFDRCxNQUFNLE1BQU0sR0FBUSxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtJQUNoRCxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUU7UUFDNUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO0lBQzVFLENBQUMsQ0FBQyxDQUFBO0lBQ0YsT0FBTyxNQUFNLENBQUE7QUFDZCxDQUFDO0FBRUQsTUFBTSxVQUFVLFVBQVUsQ0FBSSxHQUFNO0lBQ25DLElBQUksQ0FBQyxHQUFHLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDckMsT0FBTyxHQUFHLENBQUE7SUFDWCxDQUFDO0lB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