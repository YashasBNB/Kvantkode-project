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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBDb2x1bW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9lZGl0b3IvY29tbW9uL2VkaXRvckdyb3VwQ29sdW1uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFJTixpQ0FBaUMsR0FDakMsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsWUFBWSxFQUFxQixVQUFVLEVBQW1CLE1BQU0sb0JBQW9CLENBQUE7QUFTakcsTUFBTSxVQUFVLG1CQUFtQixDQUNsQyxrQkFBd0MsRUFDeEMsb0JBQTJDLEVBQzNDLE1BQU0sR0FBRyxZQUFZO0lBRXJCLElBQUksTUFBTSxLQUFLLFlBQVksSUFBSSxNQUFNLEtBQUssVUFBVSxFQUFFLENBQUM7UUFDdEQsT0FBTyxNQUFNLENBQUEsQ0FBQyw2Q0FBNkM7SUFDNUQsQ0FBQztJQUVELElBQUksYUFBYSxHQUFHLGtCQUFrQixDQUFDLFNBQVMscUNBQTZCLENBQUMsTUFBTSxDQUFDLENBQUE7SUFFckYsd0ZBQXdGO0lBQ3hGLHdFQUF3RTtJQUV4RSxJQUFJLENBQUMsYUFBYSxJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUNsQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDbEMsTUFBTSxZQUFZLEdBQUcsa0JBQWtCLENBQUMsU0FBUyxxQ0FBNkIsQ0FBQTtZQUM5RSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RCLGtCQUFrQixDQUFDLFFBQVEsQ0FDMUIsWUFBWSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFDbkIsaUNBQWlDLENBQUMsb0JBQW9CLENBQUMsQ0FDdkQsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsYUFBYSxHQUFHLGtCQUFrQixDQUFDLFNBQVMscUNBQTZCLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDbEYsQ0FBQztJQUVELE9BQU8sYUFBYSxFQUFFLEVBQUUsSUFBSSxVQUFVLENBQUEsQ0FBQyxnREFBZ0Q7QUFDeEYsQ0FBQztBQUVELE1BQU0sVUFBVSxtQkFBbUIsQ0FDbEMsa0JBQXdDLEVBQ3hDLFdBQTJDO0lBRTNDLE1BQU0sS0FBSyxHQUNWLE9BQU8sV0FBVyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUE7SUFFekYsT0FBTyxrQkFBa0I7U0FDdkIsU0FBUyxxQ0FBNkI7U0FDdEMsT0FBTyxDQUFDLEtBQUssSUFBSSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQTtBQUNuRCxDQUFDIn0=