/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator, } from '../../../../platform/instantiation/common/instantiation.js';
import { isEditorInput, } from '../../../common/editor.js';
export const IEditorGroupsService = createDecorator('editorGroupsService');
export var GroupDirection;
(function (GroupDirection) {
    GroupDirection[GroupDirection["UP"] = 0] = "UP";
    GroupDirection[GroupDirection["DOWN"] = 1] = "DOWN";
    GroupDirection[GroupDirection["LEFT"] = 2] = "LEFT";
    GroupDirection[GroupDirection["RIGHT"] = 3] = "RIGHT";
})(GroupDirection || (GroupDirection = {}));
export var GroupOrientation;
(function (GroupOrientation) {
    GroupOrientation[GroupOrientation["HORIZONTAL"] = 0] = "HORIZONTAL";
    GroupOrientation[GroupOrientation["VERTICAL"] = 1] = "VERTICAL";
})(GroupOrientation || (GroupOrientation = {}));
export var GroupLocation;
(function (GroupLocation) {
    GroupLocation[GroupLocation["FIRST"] = 0] = "FIRST";
    GroupLocation[GroupLocation["LAST"] = 1] = "LAST";
    GroupLocation[GroupLocation["NEXT"] = 2] = "NEXT";
    GroupLocation[GroupLocation["PREVIOUS"] = 3] = "PREVIOUS";
})(GroupLocation || (GroupLocation = {}));
export var GroupsArrangement;
(function (GroupsArrangement) {
    /**
     * Make the current active group consume the entire
     * editor area.
     */
    GroupsArrangement[GroupsArrangement["MAXIMIZE"] = 0] = "MAXIMIZE";
    /**
     * Make the current active group consume the maximum
     * amount of space possible.
     */
    GroupsArrangement[GroupsArrangement["EXPAND"] = 1] = "EXPAND";
    /**
     * Size all groups evenly.
     */
    GroupsArrangement[GroupsArrangement["EVEN"] = 2] = "EVEN";
})(GroupsArrangement || (GroupsArrangement = {}));
export var MergeGroupMode;
(function (MergeGroupMode) {
    MergeGroupMode[MergeGroupMode["COPY_EDITORS"] = 0] = "COPY_EDITORS";
    MergeGroupMode[MergeGroupMode["MOVE_EDITORS"] = 1] = "MOVE_EDITORS";
})(MergeGroupMode || (MergeGroupMode = {}));
export function isEditorReplacement(replacement) {
    const candidate = replacement;
    return isEditorInput(candidate?.editor) && isEditorInput(candidate?.replacement);
}
export var GroupsOrder;
(function (GroupsOrder) {
    /**
     * Groups sorted by creation order (oldest one first)
     */
    GroupsOrder[GroupsOrder["CREATION_TIME"] = 0] = "CREATION_TIME";
    /**
     * Groups sorted by most recent activity (most recent active first)
     */
    GroupsOrder[GroupsOrder["MOST_RECENTLY_ACTIVE"] = 1] = "MOST_RECENTLY_ACTIVE";
    /**
     * Groups sorted by grid widget order
     */
    GroupsOrder[GroupsOrder["GRID_APPEARANCE"] = 2] = "GRID_APPEARANCE";
})(GroupsOrder || (GroupsOrder = {}));
export var OpenEditorContext;
(function (OpenEditorContext) {
    OpenEditorContext[OpenEditorContext["NEW_EDITOR"] = 1] = "NEW_EDITOR";
    OpenEditorContext[OpenEditorContext["MOVE_EDITOR"] = 2] = "MOVE_EDITOR";
    OpenEditorContext[OpenEditorContext["COPY_EDITOR"] = 3] = "COPY_EDITOR";
})(OpenEditorContext || (OpenEditorContext = {}));
export function isEditorGroup(obj) {
    const group = obj;
    return !!group && typeof group.id === 'number' && Array.isArray(group.editors);
}
//#region Editor Group Helpers
export function preferredSideBySideGroupDirection(configurationService) {
    const openSideBySideDirection = configurationService.getValue('workbench.editor.openSideBySideDirection');
    if (openSideBySideDirection === 'down') {
        return 1 /* GroupDirection.DOWN */;
    }
    return 3 /* GroupDirection.RIGHT */;
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2VkaXRvci9jb21tb24vZWRpdG9yR3JvdXBzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBRU4sZUFBZSxHQUNmLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQVdOLGFBQWEsR0FNYixNQUFNLDJCQUEyQixDQUFBO0FBaUJsQyxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQXVCLHFCQUFxQixDQUFDLENBQUE7QUFFaEcsTUFBTSxDQUFOLElBQWtCLGNBS2pCO0FBTEQsV0FBa0IsY0FBYztJQUMvQiwrQ0FBRSxDQUFBO0lBQ0YsbURBQUksQ0FBQTtJQUNKLG1EQUFJLENBQUE7SUFDSixxREFBSyxDQUFBO0FBQ04sQ0FBQyxFQUxpQixjQUFjLEtBQWQsY0FBYyxRQUsvQjtBQUVELE1BQU0sQ0FBTixJQUFrQixnQkFHakI7QUFIRCxXQUFrQixnQkFBZ0I7SUFDakMsbUVBQVUsQ0FBQTtJQUNWLCtEQUFRLENBQUE7QUFDVCxDQUFDLEVBSGlCLGdCQUFnQixLQUFoQixnQkFBZ0IsUUFHakM7QUFFRCxNQUFNLENBQU4sSUFBa0IsYUFLakI7QUFMRCxXQUFrQixhQUFhO0lBQzlCLG1EQUFLLENBQUE7SUFDTCxpREFBSSxDQUFBO0lBQ0osaURBQUksQ0FBQTtJQUNKLHlEQUFRLENBQUE7QUFDVCxDQUFDLEVBTGlCLGFBQWEsS0FBYixhQUFhLFFBSzlCO0FBT0QsTUFBTSxDQUFOLElBQWtCLGlCQWlCakI7QUFqQkQsV0FBa0IsaUJBQWlCO0lBQ2xDOzs7T0FHRztJQUNILGlFQUFRLENBQUE7SUFFUjs7O09BR0c7SUFDSCw2REFBTSxDQUFBO0lBRU47O09BRUc7SUFDSCx5REFBSSxDQUFBO0FBQ0wsQ0FBQyxFQWpCaUIsaUJBQWlCLEtBQWpCLGlCQUFpQixRQWlCbEM7QUE4QkQsTUFBTSxDQUFOLElBQWtCLGNBR2pCO0FBSEQsV0FBa0IsY0FBYztJQUMvQixtRUFBWSxDQUFBO0lBQ1osbUVBQVksQ0FBQTtBQUNiLENBQUMsRUFIaUIsY0FBYyxLQUFkLGNBQWMsUUFHL0I7QUEwQ0QsTUFBTSxVQUFVLG1CQUFtQixDQUFDLFdBQW9CO0lBQ3ZELE1BQU0sU0FBUyxHQUFHLFdBQTZDLENBQUE7SUFFL0QsT0FBTyxhQUFhLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxJQUFJLGFBQWEsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUE7QUFDakYsQ0FBQztBQUVELE1BQU0sQ0FBTixJQUFrQixXQWVqQjtBQWZELFdBQWtCLFdBQVc7SUFDNUI7O09BRUc7SUFDSCwrREFBYSxDQUFBO0lBRWI7O09BRUc7SUFDSCw2RUFBb0IsQ0FBQTtJQUVwQjs7T0FFRztJQUNILG1FQUFlLENBQUE7QUFDaEIsQ0FBQyxFQWZpQixXQUFXLEtBQVgsV0FBVyxRQWU1QjtBQWtkRCxNQUFNLENBQU4sSUFBa0IsaUJBSWpCO0FBSkQsV0FBa0IsaUJBQWlCO0lBQ2xDLHFFQUFjLENBQUE7SUFDZCx1RUFBZSxDQUFBO0lBQ2YsdUVBQWUsQ0FBQTtBQUNoQixDQUFDLEVBSmlCLGlCQUFpQixLQUFqQixpQkFBaUIsUUFJbEM7QUEyVkQsTUFBTSxVQUFVLGFBQWEsQ0FBQyxHQUFZO0lBQ3pDLE1BQU0sS0FBSyxHQUFHLEdBQStCLENBQUE7SUFFN0MsT0FBTyxDQUFDLENBQUMsS0FBSyxJQUFJLE9BQU8sS0FBSyxDQUFDLEVBQUUsS0FBSyxRQUFRLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7QUFDL0UsQ0FBQztBQUVELDhCQUE4QjtBQUU5QixNQUFNLFVBQVUsaUNBQWlDLENBQ2hELG9CQUEyQztJQUUzQyxNQUFNLHVCQUF1QixHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FDNUQsMENBQTBDLENBQzFDLENBQUE7SUFFRCxJQUFJLHVCQUF1QixLQUFLLE1BQU0sRUFBRSxDQUFDO1FBQ3hDLG1DQUEwQjtJQUMzQixDQUFDO0lBRUQsb0NBQTJCO0FBQzVCLENBQUM7QUFFRCxZQUFZIn0=