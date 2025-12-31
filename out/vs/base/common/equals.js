/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from './arrays.js';
/**
 * Compares two items for equality using strict equality.
 */
export const strictEquals = (a, b) => a === b;
/**
 * Checks if the items of two arrays are equal.
 * By default, strict equality is used to compare elements, but a custom equality comparer can be provided.
 */
export function itemsEquals(itemEquals = strictEquals) {
    return (a, b) => arrays.equals(a, b, itemEquals);
}
/**
 * Two items are considered equal, if their stringified representations are equal.
 */
export function jsonStringifyEquals() {
    return (a, b) => JSON.stringify(a) === JSON.stringify(b);
}
/**
 * Uses `item.equals(other)` to determine equality.
 */
export function itemEquals() {
    return (a, b) => a.equals(b);
}
export function equalsIfDefined(equalsOrV1, v2, equals) {
    if (equals !== undefined) {
        const v1 = equalsOrV1;
        if (v1 === undefined || v1 === null || v2 === undefined || v2 === null) {
            return v2 === v1;
        }
        return equals(v1, v2);
    }
    else {
        const equals = equalsOrV1;
        return (v1, v2) => {
            if (v1 === undefined || v1 === null || v2 === undefined || v2 === null) {
                return v2 === v1;
            }
            return equals(v1, v2);
        };
    }
}
/**
 * Drills into arrays (items ordered) and objects (keys unordered) and uses strict equality on everything else.
 */
export function structuralEquals(a, b) {
    if (a === b) {
        return true;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (!structuralEquals(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }
    if (a && typeof a === 'object' && b && typeof b === 'object') {
        if (Object.getPrototypeOf(a) === Object.prototype &&
            Object.getPrototypeOf(b) === Object.prototype) {
            const aObj = a;
            const bObj = b;
            const keysA = Object.keys(aObj);
            const keysB = Object.keys(bObj);
            const keysBSet = new Set(keysB);
            if (keysA.length !== keysB.length) {
                return false;
            }
            for (const key of keysA) {
                if (!keysBSet.has(key)) {
                    return false;
                }
                if (!structuralEquals(aObj[key], bObj[key])) {
                    return false;
                }
            }
            return true;
        }
    }
    return false;
}
/**
 * `getStructuralKey(a) === getStructuralKey(b) <=> structuralEquals(a, b)`
 * (assuming that a and b are not cyclic structures and nothing extends globalThis Array).
 */
export function getStructuralKey(t) {
    return JSON.stringify(toNormalizedJsonStructure(t));
}
let objectId = 0;
const objIds = new WeakMap();
function toNormalizedJsonStructure(t) {
    if (Array.isArray(t)) {
        return t.map(toNormalizedJsonStructure);
    }
    if (t && typeof t === 'object') {
        if (Object.getPrototypeOf(t) === Object.prototype) {
            const tObj = t;
            const res = Object.create(null);
            for (const key of Object.keys(tObj).sort()) {
                res[key] = toNormalizedJsonStructure(tObj[key]);
            }
            return res;
        }
        else {
            let objId = objIds.get(t);
            if (objId === undefined) {
                objId = objectId++;
                objIds.set(t, objId);
            }
            // Random string to prevent collisions
            return objId + '----2b76a038c20c4bcc';
        }
    }
    return t;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXF1YWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vZXF1YWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sYUFBYSxDQUFBO0FBSXJDOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUEwQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7QUFFcEU7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLFdBQVcsQ0FDMUIsYUFBa0MsWUFBWTtJQUU5QyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO0FBQ2pELENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxtQkFBbUI7SUFDbEMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUN6RCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsVUFBVTtJQUN6QixPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUM3QixDQUFDO0FBZ0JELE1BQU0sVUFBVSxlQUFlLENBQzlCLFVBQW1DLEVBQ25DLEVBQXlCLEVBQ3pCLE1BQTRCO0lBRTVCLElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQzFCLE1BQU0sRUFBRSxHQUFHLFVBQTJCLENBQUE7UUFDdEMsSUFBSSxFQUFFLEtBQUssU0FBUyxJ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