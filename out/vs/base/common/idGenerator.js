/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class IdGenerator {
    constructor(prefix) {
        this._prefix = prefix;
        this._lastId = 0;
    }
    nextId() {
        return this._prefix + ++this._lastId;
    }
}
export const defaultGenerator = new IdGenerator('id#');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWRHZW5lcmF0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9pZEdlbmVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxNQUFNLE9BQU8sV0FBVztJQUl2QixZQUFZLE1BQWM7UUFDekIsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFDckIsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUE7SUFDakIsQ0FBQztJQUVNLE1BQU07UUFDWixPQUFPLElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFBO0lBQ3JDLENBQUM7Q0FDRDtBQUVELE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLElBQUksV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBIn0=