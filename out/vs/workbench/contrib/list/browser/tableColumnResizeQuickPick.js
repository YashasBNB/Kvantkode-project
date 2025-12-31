/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
let TableColumnResizeQuickPick = class TableColumnResizeQuickPick extends Disposable {
    constructor(_table, _quickInputService) {
        super();
        this._table = _table;
        this._quickInputService = _quickInputService;
    }
    async show() {
        const items = [];
        this._table.getColumnLabels().forEach((label, index) => {
            if (label) {
                items.push({ label, index });
            }
        });
        const column = await this._quickInputService.pick(items, {
            placeHolder: localize('table.column.selection', 'Select the column to resize, type to filter.'),
        });
        if (!column) {
            return;
        }
        const value = await this._quickInputService.input({
            placeHolder: localize('table.column.resizeValue.placeHolder', 'i.e. 20, 60, 100...'),
            prompt: localize('table.column.resizeValue.prompt', "Please enter a width in percentage for the '{0}' column.", column.label),
            validateInput: (input) => this._validateColumnResizeValue(input),
        });
        const percentageValue = value ? Number.parseInt(value) : undefined;
        if (!percentageValue) {
            return;
        }
        this._table.resizeColumn(column.index, percentageValue);
    }
    async _validateColumnResizeValue(input) {
        const percentage = Number.parseInt(input);
        if (input && !Number.isInteger(percentage)) {
            return localize('table.column.resizeValue.invalidType', 'Please enter an integer.');
        }
        else if (percentage < 0 || percentage > 100) {
            return localize('table.column.resizeValue.invalidRange', 'Please enter a number greater than 0 and less than or equal to 100.');
        }
        return null;
    }
};
TableColumnResizeQuickPick = __decorate([
    __param(1, IQuickInputService)
], TableColumnResizeQuickPick);
export { TableColumnResizeQuickPick };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFibGVDb2x1bW5SZXNpemVRdWlja1BpY2suanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9saXN0L2Jyb3dzZXIvdGFibGVDb2x1bW5SZXNpemVRdWlja1BpY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQ04sa0JBQWtCLEdBRWxCLE1BQU0sc0RBQXNELENBQUE7QUFNdEQsSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMkIsU0FBUSxVQUFVO0lBQ3pELFlBQ2tCLE1BQWtCLEVBQ0Usa0JBQXNDO1FBRTNFLEtBQUssRUFBRSxDQUFBO1FBSFUsV0FBTSxHQUFOLE1BQU0sQ0FBWTtRQUNFLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7SUFHNUUsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJO1FBQ1QsTUFBTSxLQUFLLEdBQWlDLEVBQUUsQ0FBQTtRQUM5QyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUN0RCxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUM3QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQTZCLEtBQUssRUFBRTtZQUNwRixXQUFXLEVBQUUsUUFBUSxDQUNwQix3QkFBd0IsRUFDeEIsOENBQThDLENBQzlDO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7WUFDakQsV0FBVyxFQUFFLFFBQVEsQ0FBQyxzQ0FBc0MsRUFBRSxxQkFBcUIsQ0FBQztZQUNwRixNQUFNLEVBQUUsUUFBUSxDQUNmLGlDQUFpQyxFQUNqQywwREFBMEQsRUFDMUQsTUFBTSxDQUFDLEtBQUssQ0FDWjtZQUNELGFBQWEsRUFBRSxDQUFDLEtBQWEsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQztTQUN4RSxDQUFDLENBQUE7UUFDRixNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtRQUNsRSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDdEIsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFBO0lBQ3hELENBQUM7SUFFTyxLQUFLLENBQUMsMEJBQTBCLENBQ3ZDLEtBQWE7UUFFYixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3pDLElBQUksS0FBSyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQzVDLE9BQU8sUUFBUSxDQUFDLHNDQUFzQyxFQUFFLDBCQUEwQixDQUFDLENBQUE7UUFDcEYsQ0FBQzthQUFNLElBQUksVUFBVSxHQUFHLENBQUMsSUFBSSxVQUFVLEdBQUcsR0FBRyxFQUFFLENBQUM7WUFDL0MsT0FBTyxRQUFRLENBQ2QsdUNBQXVDLEVBQ3ZDLHFFQUFxRSxDQUNyRSxDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztDQUNELENBQUE7QUF0RFksMEJBQTBCO0lBR3BDLFdBQUEsa0JBQWtCLENBQUE7R0FIUiwwQkFBMEIsQ0FzRHRDIn0=