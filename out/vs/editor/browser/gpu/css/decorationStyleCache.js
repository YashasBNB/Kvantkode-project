/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { NKeyMap } from '../../../../base/common/map.js';
export class DecorationStyleCache {
    constructor() {
        this._nextId = 1;
        this._cacheById = new Map();
        this._cacheByStyle = new NKeyMap();
    }
    getOrCreateEntry(color, bold, opacity) {
        if (color === undefined && bold === undefined && opacity === undefined) {
            return 0;
        }
        const result = this._cacheByStyle.get(color ?? 0, bold ? 1 : 0, opacity === undefined ? '' : opacity.toFixed(2));
        if (result) {
            return result.id;
        }
        const id = this._nextId++;
        const entry = {
            id,
            color,
            bold,
            opacity,
        };
        this._cacheById.set(id, entry);
        this._cacheByStyle.set(entry, color ?? 0, bold ? 1 : 0, opacity === undefined ? '' : opacity.toFixed(2));
        return id;
    }
    getStyleSet(id) {
        if (id === 0) {
            return undefined;
        }
        return this._cacheById.get(id);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvblN0eWxlQ2FjaGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9ncHUvY3NzL2RlY29yYXRpb25TdHlsZUNhY2hlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQXdCeEQsTUFBTSxPQUFPLG9CQUFvQjtJQUFqQztRQUNTLFlBQU8sR0FBRyxDQUFDLENBQUE7UUFFRixlQUFVLEdBQUcsSUFBSSxHQUFHLEVBQXNDLENBQUE7UUFDMUQsa0JBQWEsR0FBRyxJQUFJLE9BQU8sRUFHekMsQ0FBQTtJQXlDSixDQUFDO0lBdkNBLGdCQUFnQixDQUNmLEtBQXlCLEVBQ3pCLElBQXlCLEVBQ3pCLE9BQTJCO1FBRTNCLElBQUksS0FBSyxLQUFLLFNBQVMsSUFBSSxJQUFJLEtBQUssU0FBUyxJQUFJLE9BQU8sS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN4RSxPQUFPLENBQUMsQ0FBQTtRQUNULENBQUM7UUFDRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FDcEMsS0FBSyxJQUFJLENBQUMsRUFDVixJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNaLE9BQU8sS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FDL0MsQ0FBQTtRQUNELElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixPQUFPLE1BQU0sQ0FBQyxFQUFFLENBQUE7UUFDakIsQ0FBQztRQUNELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN6QixNQUFNLEtBQUssR0FBRztZQUNiLEVBQUU7WUFDRixLQUFLO1lBQ0wsSUFBSTtZQUNKLE9BQU87U0FDUCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzlCLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUNyQixLQUFLLEVBQ0wsS0FBSyxJQUFJLENBQUMsRUFDVixJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNaLE9BQU8sS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FDL0MsQ0FBQTtRQUNELE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVELFdBQVcsQ0FBQyxFQUFVO1FBQ3JCLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2QsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDL0IsQ0FBQztDQUNEIn0=