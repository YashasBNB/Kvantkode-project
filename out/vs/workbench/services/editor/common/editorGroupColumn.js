/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { preferredSideBySideGroupDirection, } from './editorGroupsService.js';
import { ACTIVE_GROUP, SIDE_GROUP } from './editorService.js';
export function columnToEditorGroup(editorGroupService, configurationService, column = ACTIVE_GROUP) {
    if (column === ACTIVE_GROUP || column === SIDE_GROUP) {
        return column; // return early for when column is well known
    }
    let groupInColumn = editorGroupService.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */)[column];
    // If a column is asked for that does not exist, we create up to 9 columns in accordance
    // to what `ViewColumn` provides and otherwise fallback to `SIDE_GROUP`.
    if (!groupInColumn && column < 9) {
        for (let i = 0; i <= column; i++) {
            const editorGroups = editorGroupService.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */);
            if (!editorGroups[i]) {
                editorGroupService.addGroup(editorGroups[i - 1], preferredSideBySideGroupDirection(configurationService));
            }
        }
        groupInColumn = editorGroupService.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */)[column];
    }
    return groupInColumn?.id ?? SIDE_GROUP; // finally open to the side when group not found
}
export function editorGroupToColumn(editorGroupService, editorGroup) {
    const group = typeof editorGroup === 'number' ? editorGroupService.getGroup(editorGroup) : editorGroup;
    return editorGroupService
        .getGroups(2 /* GroupsOrder.GRID_APPEARANCE */)
        .indexOf(group ?? editorGroupService.activeGroup);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBDb2x1bW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZWRpdG9yL2NvbW1vbi9lZGl0b3JHcm91cENvbHVtbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBSU4saUNBQWlDLEdBQ2pDLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLFlBQVksRUFBcUIsVUFBVSxFQUFtQixNQUFNLG9CQUFvQixDQUFBO0FBU2pHLE1BQU0sVUFBVSxtQkFBbUIsQ0FDbEMsa0JBQXdDLEVBQ3hDLG9CQUEyQyxFQUMzQyxNQUFNLEdBQUcsWUFBWTtJQUVyQixJQUFJLE1BQU0sS0FBSyxZQUFZLElBQUksTUFBTSxLQUFLLFVBQVUsRUFBRSxDQUFDO1FBQ3RELE9BQU8sTUFBTSxDQUFBLENBQUMsNkNBQTZDO0lBQzVELENBQUM7SUFFRCxJQUFJLGFBQWEsR0FBRyxrQkFBa0IsQ0FBQyxTQUFTLHFDQUE2QixDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBRXJGLHdGQUF3RjtJQUN4Rix3RUFBd0U7SUFFeEUsSUFBSSxDQUFDLGFBQWEsSUFBSSxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDbEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sWUFBWSxHQUFHLGtCQUFrQixDQUFDLFNBQVMscUNBQTZCLENBQUE7WUFDOUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN0QixrQkFBa0IsQ0FBQyxRQUFRLENBQzFCLFlBQVksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQ25CLGlDQUFpQyxDQUFDLG9CQUFvQixDQUFDLENBQ3ZELENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELGFBQWEsR0FBRyxrQkFBa0IsQ0FBQyxTQUFTLHFDQUE2QixDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2xGLENBQUM7SUFFRCxPQUFPLGFBQWEsRUFBRSxFQUFFLElBQUksVUFBVSxDQUFBLENBQUMsZ0RBQWdEO0FBQ3hGLENBQUM7QUFFRCxNQUFNLFVBQVUsbUJBQW1CLENBQ2xDLGtCQUF3QyxFQUN4QyxXQUEyQztJQUUzQyxNQUFNLEtBQUssR0FDVixPQUFPLFdBQVcsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFBO0lBRXpGLE9BQU8sa0JBQWtCO1NBQ3ZCLFNBQVMscUNBQTZCO1NBQ3RDLE9BQU8sQ0FBQyxLQUFLLElBQUksa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUE7QUFDbkQsQ0FBQyJ9