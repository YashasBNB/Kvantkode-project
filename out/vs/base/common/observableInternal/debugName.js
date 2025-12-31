/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class DebugNameData {
    constructor(owner, debugNameSource, referenceFn) {
        this.owner = owner;
        this.debugNameSource = debugNameSource;
        this.referenceFn = referenceFn;
    }
    getDebugName(target) {
        return getDebugName(target, this);
    }
}
const countPerName = new Map();
const cachedDebugName = new WeakMap();
export function getDebugName(target, data) {
    const cached = cachedDebugName.get(target);
    if (cached) {
        return cached;
    }
    const dbgName = computeDebugName(target, data);
    if (dbgName) {
        let count = countPerName.get(dbgName) ?? 0;
        count++;
        countPerName.set(dbgName, count);
        const result = count === 1 ? dbgName : `${dbgName}#${count}`;
        cachedDebugName.set(target, result);
        return result;
    }
    return undefined;
}
function computeDebugName(self, data) {
    const cached = cachedDebugName.get(self);
    if (cached) {
        return cached;
    }
    const ownerStr = data.owner ? formatOwner(data.owner) + `.` : '';
    let result;
    const debugNameSource = data.debugNameSource;
    if (debugNameSource !== undefined) {
        if (typeof debugNameSource === 'function') {
            result = debugNameSource();
            if (result !== undefined) {
                return ownerStr + result;
            }
        }
        else {
            return ownerStr + debugNameSource;
        }
    }
    const referenceFn = data.referenceFn;
    if (referenceFn !== undefined) {
        result = getFunctionName(referenceFn);
        if (result !== undefined) {
            return ownerStr + result;
        }
    }
    if (data.owner !== undefined) {
        const key = findKey(data.owner, self);
        if (key !== undefined) {
            return ownerStr + key;
        }
    }
    return undefined;
}
function findKey(obj, value) {
    for (const key in obj) {
        if (obj[key] === value) {
            return key;
        }
    }
    return undefined;
}
const countPerClassName = new Map();
const ownerId = new WeakMap();
function formatOwner(owner) {
    const id = ownerId.get(owner);
    if (id) {
        return id;
    }
    const className = getClassName(owner) ?? 'Object';
    let count = countPerClassName.get(className) ?? 0;
    count++;
    countPerClassName.set(className, count);
    const result = count === 1 ? className : `${className}#${count}`;
    ownerId.set(owner, result);
    return result;
}
export function getClassName(obj) {
    const ctor = obj.constructor;
    if (ctor) {
        if (ctor.name === 'Object') {
            return undefined;
        }
        return ctor.name;
    }
    return undefined;
}
export function getFunctionName(fn) {
    const fnSrc = fn.toString();
    // Pattern: /** @description ... */
    const regexp = /\/\*\*\s*@description\s*([^*]*)\*\//;
    const match = regexp.exec(fnSrc);
    const result = match ? match[1] : undefined;
    return result?.trim();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdOYW1lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JzZXJ2YWJsZUludGVybmFsL2RlYnVnTmFtZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQXNCaEcsTUFBTSxPQUFPLGFBQWE7SUFDekIsWUFDaUIsS0FBNkIsRUFDN0IsZUFBNEMsRUFDNUMsV0FBaUM7UUFGakMsVUFBSyxHQUFMLEtBQUssQ0FBd0I7UUFDN0Isb0JBQWUsR0FBZixlQUFlLENBQTZCO1FBQzVDLGdCQUFXLEdBQVgsV0FBVyxDQUFzQjtJQUMvQyxDQUFDO0lBRUcsWUFBWSxDQUFDLE1BQWM7UUFDakMsT0FBTyxZQUFZLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ2xDLENBQUM7Q0FDRDtBQVNELE1BQU0sWUFBWSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFBO0FBQzlDLE1BQU0sZUFBZSxHQUFHLElBQUksT0FBTyxFQUFrQixDQUFBO0FBRXJELE1BQU0sVUFBVSxZQUFZLENBQUMsTUFBYyxFQUFFLElBQW1CO0lBQy9ELE1BQU0sTUFBTSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDMUMsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUNaLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFHLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUM5QyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ2IsSUFBSSxLQUFLLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDMUMsS0FBSyxFQUFFLENBQUE7UUFDUCxZQUFZLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoQyxNQUFN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