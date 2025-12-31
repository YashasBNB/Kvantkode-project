/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { arrayInsert } from '../../../base/common/arrays.js';
/**
 * An array that avoids being sparse by always
 * filling up unused indices with a default value.
 */
export class FixedArray {
    constructor(_default) {
        this._default = _default;
        this._store = [];
    }
    get(index) {
        if (index < this._store.length) {
            return this._store[index];
        }
        return this._default;
    }
    set(index, value) {
        while (index >= this._store.length) {
            this._store[this._store.length] = this._default;
        }
        this._store[index] = value;
    }
    replace(index, oldLength, newLength) {
        if (index >= this._store.length) {
            return;
        }
        if (oldLength === 0) {
            this.insert(index, newLength);
            return;
        }
        else if (newLength === 0) {
            this.delete(index, oldLength);
            return;
        }
        const before = this._store.slice(0, index);
        const after = this._store.slice(index + oldLength);
        const insertArr = arrayFill(newLength, this._default);
        this._store = before.concat(insertArr, after);
    }
    delete(deleteIndex, deleteCount) {
        if (deleteCount === 0 || deleteIndex >= this._store.length) {
            return;
        }
        this._store.splice(deleteIndex, deleteCount);
    }
    insert(insertIndex, insertCount) {
        if (insertCount === 0 || insertIndex >= this._store.length) {
            return;
        }
        const arr = [];
        for (let i = 0; i < insertCount; i++) {
            arr[i] = this._default;
        }
        this._store = arrayInsert(this._store, insertIndex, arr);
    }
}
function arrayFill(length, value) {
    const arr = [];
    for (let i = 0; i < length; i++) {
        arr[i] = value;
    }
    return arr;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZml4ZWRBcnJheS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvZml4ZWRBcnJheS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFNUQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLFVBQVU7SUFHdEIsWUFBNkIsUUFBVztRQUFYLGFBQVEsR0FBUixRQUFRLENBQUc7UUFGaEMsV0FBTSxHQUFRLEVBQUUsQ0FBQTtJQUVtQixDQUFDO0lBRXJDLEdBQUcsQ0FBQyxLQUFhO1FBQ3ZCLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDaEMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzFCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUVNLEdBQUcsQ0FBQyxLQUFhLEVBQUUsS0FBUTtRQUNqQyxPQUFPLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFBO1FBQ2hELENBQUM7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQTtJQUMzQixDQUFDO0lBRU0sT0FBTyxDQUFDLEtBQWEsRUFBRSxTQUFpQixFQUFFLFNBQWlCO1FBQ2pFLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakMsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLFNBQVMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUM3QixPQUFNO1FBQ1AsQ0FBQzthQUFNLElBQUksU0FBUyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzdCLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzFDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUMsQ0FBQTtRQUNsRCxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNyRCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFFTSxNQUFNLENBQUMsV0FBbUIsRUFBRSxXQUFtQjtRQUNyRCxJQUFJLFdBQVcsS0FBSyxDQUFDLElBQUksV0FBVyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDNUQsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDN0MsQ0FBQztJQUVNLE1BQU0sQ0FBQyxXQUFtQixFQUFFLFdBQW1CO1FBQ3JELElBQUksV0FBVyxLQUFLLENBQUMsSUFBSSxXQUFXLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM1RCxPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sR0FBRyxHQUFRLEVBQUUsQ0FBQTtRQUNuQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUE7UUFDdkIsQ0FBQztRQUNELElBQUksQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQ3pELENBQUM7Q0FDRDtBQUVELFNBQVMsU0FBUyxDQUFJLE1BQWMsRUFBRSxLQUFRO0lBQzdDLE1BQU0sR0FBRyxHQUFRLEVBQUUsQ0FBQTtJQUNuQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDakMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQTtJQUNmLENBQUM7SUFDRCxPQUFPLEdBQUcsQ0FBQTtBQUNYLENBQUMifQ==