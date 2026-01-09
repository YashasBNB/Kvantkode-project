/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IStatusbarService = createDecorator('statusbarService');
export var StatusbarAlignment;
(function (StatusbarAlignment) {
    StatusbarAlignment[StatusbarAlignment["LEFT"] = 0] = "LEFT";
    StatusbarAlignment[StatusbarAlignment["RIGHT"] = 1] = "RIGHT";
})(StatusbarAlignment || (StatusbarAlignment = {}));
export function isStatusbarEntryLocation(thing) {
    const candidate = thing;
    return typeof candidate?.location?.id === 'string' && typeof candidate.alignment === 'number';
}
export function isStatusbarEntryPriority(thing) {
    const candidate = thing;
    return ((typeof candidate?.primary === 'number' || isStatusbarEntryLocation(candidate?.primary)) &&
        typeof candidate?.secondary === 'number');
}
export const ShowTooltipCommand = {
    id: 'statusBar.entry.showTooltip',
    title: '',
};
export const StatusbarEntryKinds = [
    'standard',
    'warning',
    'error',
    'prominent',
    'remote',
    'offline',
];
export function isTooltipWithCommands(thing) {
    const candidate = thing;
    return !!candidate?.content && Array.isArray(candidate?.commands);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzYmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc3RhdHVzYmFyL2Jyb3dzZXIvc3RhdHVzYmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQWU1RixNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxlQUFlLENBQW9CLGtCQUFrQixDQUFDLENBQUE7QUF5QnZGLE1BQU0sQ0FBTixJQUFrQixrQkFHakI7QUFIRCxXQUFrQixrQkFBa0I7SUFDbkMsMkRBQUksQ0FBQTtJQUNKLDZEQUFLLENBQUE7QUFDTixDQUFDLEVBSGlCLGtCQUFrQixLQUFsQixrQkFBa0IsUUFHbkM7QUEyQkQsTUFBTSxVQUFVLHdCQUF3QixDQUFDLEtBQWM7SUFDdEQsTUFBTSxTQUFTLEdBQUcsS0FBNEMsQ0FBQTtJQUU5RCxPQUFPLE9BQU8sU0FBUyxFQUFFLFFBQVEsRUFBRSxFQUFFLEtBQUssUUFBUSxJQUFJLE9BQU8sU0FBUyxDQUFDLFNBQVMsS0FBSyxRQUFRLENBQUE7QUFDOUYsQ0FBQztBQXdCRCxNQUFNLFVBQVUsd0JBQXdCLENBQUMsS0FBYztJQUN0RCxNQUFNLFNBQVMsR0FBRyxLQUE0QyxDQUFBO0lBRTlELE9BQU8sQ0FDTixDQUFDLE9BQU8sU0FBUyxFQUFFLE9BQU8sS0FBSyxRQUFRLElBQUksd0JBQXdCLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3hGLE9BQU8sU0FBUyxFQUFFLFNBQVMsS0FBSyxRQUFRLENBQ3hDLENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQVk7SUFDMUMsRUFBRSxFQUFFLDZCQUE2QjtJQUNqQyxLQUFLLEVBQUUsRUFBRTtDQUNULENBQUE7QUFnQkQsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQXlCO0lBQ3hELFVBQVU7SUFDVixTQUFTO0lBQ1QsT0FBTztJQUNQLFdBQVc7SUFDWCxRQUFRO0lBQ1IsU0FBUztDQUNULENBQUE7QUFjRCxNQUFNLFVBQVUscUJBQXFCLENBQUMsS0FBYztJQUNuRCxNQUFNLFNBQVMsR0FBRyxLQUF5QyxDQUFBO0lBRTNELE9BQU8sQ0FBQyxDQUFDLFNBQVMsRUFBRSxPQUFPLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUE7QUFDbEUsQ0FBQyJ9