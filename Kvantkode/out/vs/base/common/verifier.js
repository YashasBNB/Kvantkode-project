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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyaWZpZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3ZlcmlmaWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFNckMsTUFBZSxRQUFRO0lBQ3RCLFlBQStCLFlBQWU7UUFBZixpQkFBWSxHQUFaLFlBQVksQ0FBRztJQUFHLENBQUM7SUFFbEQsTUFBTSxDQUFDLEtBQWM7UUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN6QixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUE7UUFDekIsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztDQUdEO0FBRUQsTUFBTSxPQUFPLGVBQWdCLFNBQVEsUUFBaUI7SUFDM0MsTUFBTSxDQUFDLEtBQWM7UUFDOUIsT0FBTyxPQUFPLEtBQUssS0FBSyxTQUFTLENBQUE7SUFDbEMsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGNBQWUsU0FBUSxRQUFnQjtJQUN6QyxNQUFNLENBQUMsS0FBYztRQUM5QixPQUFPLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQTtJQUNqQyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sV0FBZSxTQUFRLFFBQWdCO0lBQ3pDLE1BQU0sQ0FBQyxLQUFjO1FBQzlCLE9BQU8sS0FBSyxZQUFZLEdBQUcsQ0FBQTtJQUM1QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sWUFBZ0IsU0FBUSxRQUFXO0lBRy9DLFlBQVksWUFBZSxFQUFFLGFBQStCO1FBQzNELEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNuQixJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQTtJQUNuQyxDQUFDO0lBRVMsTUFBTSxDQUFDLEtBQWM7UUFDOUIsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxLQUFVLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sY0FBaUMsU0FBUSxRQUFXO0lBQ2hFLFlBQ0MsWUFBZSxFQUNFLFFBQTZDO1FBRTlELEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUZGLGFBQVEsR0FBUixRQUFRLENBQXFDO0lBRy9ELENBQUM7SUFFUSxNQUFNLENBQUMsS0FBYztRQUM3QixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3pCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQTtRQUN6QixDQUFDO1FBQ0QsT0FBTyxZQUFZLENBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRVMsTUFBTSxDQUFDLEtBQWM7UUFDOUIsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDdkIsQ0FBQztDQUNEO0FBRUQsTUFBTSxVQUFVLFlBQVksQ0FDM0IsU0FBOEMsRUFDOUMsS0FBYTtJQUViLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7SUFFbEMsS0FBSyxNQUFNLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQztRQUM3QixJQUFJLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2hELE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUMvQixNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBRSxLQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNuRCxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sTUFBTSxDQUFBO0FBQ2QsQ0FBQyJ9