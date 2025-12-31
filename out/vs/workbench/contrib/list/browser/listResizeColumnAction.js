/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TableColumnResizeQuickPick } from './tableColumnResizeQuickPick.js';
import { Table } from '../../../../base/browser/ui/table/tableWidget.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IListService, WorkbenchListFocusContextKey, } from '../../../../platform/list/browser/listService.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { localize } from '../../../../nls.js';
export class ListResizeColumnAction extends Action2 {
    constructor() {
        super({
            id: 'list.resizeColumn',
            title: { value: localize('list.resizeColumn', 'Resize Column'), original: 'Resize Column' },
            category: { value: localize('list', 'List'), original: 'List' },
            precondition: WorkbenchListFocusContextKey,
            f1: true,
        });
    }
    async run(accessor) {
        const listService = accessor.get(IListService);
        const instantiationService = accessor.get(IInstantiationService);
        const list = listService.lastFocusedList;
        if (list instanceof Table) {
            await instantiationService.createInstance(TableColumnResizeQuickPick, list).show();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdFJlc2l6ZUNvbHVtbkFjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2xpc3QvYnJvd3Nlci9saXN0UmVzaXplQ29sdW1uQWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUN4RSxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUNOLFlBQVksRUFDWiw0QkFBNEIsR0FDNUIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxPQUFPO0lBQ2xEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLG1CQUFtQjtZQUN2QixLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLG1CQUFtQixFQUFFLGVBQWUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUU7WUFDM0YsUUFBUSxFQUFFLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRTtZQUMvRCxZQUFZLEVBQUUsNEJBQTRCO1lBQzFDLEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM5QyxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUVoRSxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsZUFBZSxDQUFBO1FBQ3hDLElBQUksSUFBSSxZQUFZLEtBQUssRUFBRSxDQUFDO1lBQzNCLE1BQU0sb0JBQW9CLENBQUMsY0FBYyxDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ25GLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==