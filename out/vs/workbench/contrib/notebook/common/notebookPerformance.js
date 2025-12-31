/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class NotebookPerfMarks {
    constructor() {
        this._marks = {};
    }
    get value() {
        return { ...this._marks };
    }
    mark(name) {
        if (this._marks[name]) {
            console.error(`Skipping overwrite of notebook perf value: ${name}`);
            return;
        }
        this._marks[name] = Date.now();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tQZXJmb3JtYW5jZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2NvbW1vbi9ub3RlYm9va1BlcmZvcm1hbmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBWWhHLE1BQU0sT0FBTyxpQkFBaUI7SUFBOUI7UUFDUyxXQUFNLEdBQW9CLEVBQUUsQ0FBQTtJQWNyQyxDQUFDO0lBWkEsSUFBSSxLQUFLO1FBQ1IsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQzFCLENBQUM7SUFFRCxJQUFJLENBQUMsSUFBYztRQUNsQixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN2QixPQUFPLENBQUMsS0FBSyxDQUFDLDhDQUE4QyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQ25FLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUE7SUFDL0IsQ0FBQztDQUNEIn0=