/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toUint8 } from '../../../base/common/uint.js';
/**
 * A fast character classifier that uses a compact array for ASCII values.
 */
export class CharacterClassifier {
    constructor(_defaultValue) {
        const defaultValue = toUint8(_defaultValue);
        this._defaultValue = defaultValue;
        this._asciiMap = CharacterClassifier._createAsciiMap(defaultValue);
        this._map = new Map();
    }
    static _createAsciiMap(defaultValue) {
        const asciiMap = new Uint8Array(256);
        asciiMap.fill(defaultValue);
        return asciiMap;
    }
    set(charCode, _value) {
        const value = toUint8(_value);
        if (charCode >= 0 && charCode < 256) {
            this._asciiMap[charCode] = value;
        }
        else {
            this._map.set(charCode, value);
        }
    }
    get(charCode) {
        if (charCode >= 0 && charCode < 256) {
            return this._asciiMap[charCode];
        }
        else {
            return (this._map.get(charCode) || this._defaultValue);
        }
    }
    clear() {
        this._asciiMap.fill(this._defaultValue);
        this._map.clear();
    }
}
var Boolean;
(function (Boolean) {
    Boolean[Boolean["False"] = 0] = "False";
    Boolean[Boolean["True"] = 1] = "True";
})(Boolean || (Boolean = {}));
export class CharacterSet {
    constructor() {
        this._actual = new CharacterClassifier(0 /* Boolean.False */);
    }
    add(charCode) {
        this._actual.set(charCode, 1 /* Boolean.True */);
    }
    has(charCode) {
        return this._actual.get(charCode) === 1 /* Boolean.True */;
    }
    clear() {
        return this._actual.clear();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcmFjdGVyQ2xhc3NpZmllci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29yZS9jaGFyYWN0ZXJDbGFzc2lmaWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUV0RDs7R0FFRztBQUNILE1BQU0sT0FBTyxtQkFBbUI7SUFhL0IsWUFBWSxhQUFnQjtRQUMzQixNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUE7UUFFM0MsSUFBSSxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUE7UUFDakMsSUFBSSxDQUFDLFNBQVMsR0FBRyxtQkFBbUIsQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDbEUsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQTtJQUN0QyxDQUFDO0lBRU8sTUFBTSxDQUFDLGVBQWUsQ0FBQyxZQUFvQjtRQUNsRCxNQUFNLFFBQVEsR0FBRyxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNwQyxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzNCLE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7SUFFTSxHQUFHLENBQUMsUUFBZ0IsRUFBRSxNQUFTO1FBQ3JDLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUU3QixJQUFJLFFBQVEsSUFBSSxDQUFDLElBQUksUUFBUSxHQUFHLEdBQUcsRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsS0FBSyxDQUFBO1FBQ2pDLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQy9CLENBQUM7SUFDRixDQUFDO0lBRU0sR0FBRyxDQUFDLFFBQWdCO1FBQzFCLElBQUksUUFBUSxJQUFJLENBQUMsSUFBSSxRQUFRLEdBQUcsR0FBRyxFQUFFLENBQUM7WUFDckMsT0FBVSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ25DLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUMxRCxDQUFDO0lBQ0YsQ0FBQztJQUVNLEtBQUs7UUFDWCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDdkMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNsQixDQUFDO0NBQ0Q7QUFFRCxJQUFXLE9BR1Y7QUFIRCxXQUFXLE9BQU87SUFDakIsdUNBQVMsQ0FBQTtJQUNULHFDQUFRLENBQUE7QUFDVCxDQUFDLEVBSFUsT0FBTyxLQUFQLE9BQU8sUUFHakI7QUFFRCxNQUFNLE9BQU8sWUFBWTtJQUd4QjtRQUNDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxtQkFBbUIsdUJBQXdCLENBQUE7SUFDL0QsQ0FBQztJQUVNLEdBQUcsQ0FBQyxRQUFnQjtRQUMxQixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLHVCQUFlLENBQUE7SUFDekMsQ0FBQztJQUVNLEdBQUcsQ0FBQyxRQUFnQjtRQUMxQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyx5QkFBaUIsQ0FBQTtJQUNuRCxDQUFDO0lBRU0sS0FBSztRQUNYLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUM1QixDQUFDO0NBQ0QifQ==