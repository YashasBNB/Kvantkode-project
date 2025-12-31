/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isObject } from './types.js';
class Verifier {
    constructor(defaultValue) {
        this.defaultValue = defaultValue;
    }
    verify(value) {
        if (!this.isType(value)) {
            return this.defaultValue;
        }
        return value;
    }
}
export class BooleanVerifier extends Verifier {
    isType(value) {
        return typeof value === 'boolean';
    }
}
export class NumberVerifier extends Verifier {
    isType(value) {
        return typeof value === 'number';
    }
}
export class SetVerifier extends Verifier {
    isType(value) {
        return value instanceof Set;
    }
}
export class EnumVerifier extends Verifier {
    constructor(defaultValue, allowedValues) {
        super(defaultValue);
        this.allowedValues = allowedValues;
    }
    isType(value) {
        return this.allowedValues.includes(value);
    }
}
export class ObjectVerifier extends Verifier {
    constructor(defaultValue, verifier) {
        super(defaultValue);
        this.verifier = verifier;
    }
    verify(value) {
        if (!this.isType(value)) {
            return this.defaultValue;
        }
        return verifyObject(this.verifier, value);
    }
    isType(value) {
        return isObject(value);
    }
}
export function verifyObject(verifiers, value) {
    const result = Object.create(null);
    for (const key in verifiers) {
        if (Object.hasOwnProperty.call(verifiers, key)) {
            const verifier = verifiers[key];
            result[key] = verifier.verify(value[key]);
        }
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyaWZpZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi92ZXJpZmllci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBTXJDLE1BQWUsUUFBUTtJQUN0QixZQUErQixZQUFlO1FBQWYsaUJBQVksR0FBWixZQUFZLENBQUc7SUFBRyxDQUFDO0lBRWxELE1BQU0sQ0FBQyxLQUFjO1FBQ3BCLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFBO1FBQ3pCLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7Q0FHRDtBQUVELE1BQU0sT0FBTyxlQUFnQixTQUFRLFFBQWlCO0lBQzNDLE1BQU0sQ0FBQyxLQUFjO1FBQzlCLE9BQU8sT0FBTyxLQUFLLEtBQUssU0FBUyxDQUFBO0lBQ2xDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxjQUFlLFNBQVEsUUFBZ0I7SUFDekMsTUFBTSxDQUFDLEtBQWM7UUFDOUIsT0FBTyxPQUFPLEtBQUssS0FBSyxRQUFRLENBQUE7SUFDakMsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLFdBQWUsU0FBUSxRQUFnQjtJQUN6QyxNQUFNLENBQUMsS0FBYztRQUM5QixPQUFPLEtBQUssWUFBWSxHQUFHLENBQUE7SUFDNUIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLFlBQWdCLFNBQVEsUUFBVztJQUcvQyxZQUFZLFlBQWUsRUFBRSxhQUErQjtRQUMzRCxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDbkIsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUE7SUFDbkMsQ0FBQztJQUVTLE1BQU0sQ0FBQyxLQUFjO1FBQzlCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsS0FBVSxDQUFDLENBQUE7SUFDL0MsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGNBQWlDLFNBQVEsUUFBVztJQUNoRSxZQUNDLFlBQWUsRUFDRSxRQUE2QztRQUU5RCxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUE7UUFGRixhQUFRLEdBQVIsUUFBUSxDQUFxQztJQUcvRCxDQUFDO0lBRVEsTUFBTSxDQUFDLEtBQWM7UUFDN0IsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN6QixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUE7UUFDekIsQ0FBQztRQUNELE9BQU8sWUFBWSxDQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDN0MsQ0FBQztJQUVTLE1BQU0sQ0FBQyxLQUFjO1FBQzlCLE9BQU8sUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3ZCLENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVSxZQUFZLENBQzNCLFNBQThDLEVBQzlDLEtBQWE7SUFFYixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBRWxDLEtBQUssTUFBTSxHQUFHLElBQUksU0FBUyxFQUFFLENBQUM7UUFDN0IsSUFBSSxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNoRCxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDL0IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUUsS0FBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDbkQsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUMifQ==