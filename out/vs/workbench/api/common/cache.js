/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class Cache {
    static { this.enableDebugLogging = false; }
    constructor(id) {
        this.id = id;
        this._data = new Map();
        this._idPool = 1;
    }
    add(item) {
        const id = this._idPool++;
        this._data.set(id, item);
        this.logDebugInfo();
        return id;
    }
    get(pid, id) {
        return this._data.has(pid) ? this._data.get(pid)[id] : undefined;
    }
    delete(id) {
        this._data.delete(id);
        this.logDebugInfo();
    }
    logDebugInfo() {
        if (!Cache.enableDebugLogging) {
            return;
        }
        console.log(`${this.id} cache size - ${this._data.size}`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9jYWNoZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxNQUFNLE9BQU8sS0FBSzthQUNPLHVCQUFrQixHQUFHLEtBQUssQUFBUixDQUFRO0lBS2xELFlBQTZCLEVBQVU7UUFBVixPQUFFLEdBQUYsRUFBRSxDQUFRO1FBSHRCLFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBd0IsQ0FBQTtRQUNoRCxZQUFPLEdBQUcsQ0FBQyxDQUFBO0lBRXVCLENBQUM7SUFFM0MsR0FBRyxDQUFDLElBQWtCO1FBQ3JCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN6QixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDeEIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ25CLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVELEdBQUcsQ0FBQyxHQUFXLEVBQUUsRUFBVTtRQUMxQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQ2xFLENBQUM7SUFFRCxNQUFNLENBQUMsRUFBVTtRQUNoQixJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNyQixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7SUFDcEIsQ0FBQztJQUVPLFlBQVk7UUFDbkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQy9CLE9BQU07UUFDUCxDQUFDO1FBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLGlCQUFpQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7SUFDMUQsQ0FBQyJ9