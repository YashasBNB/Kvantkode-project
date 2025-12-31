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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzYmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3N0YXR1c2Jhci9icm93c2VyL3N0YXR1c2Jhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFlNUYsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsZUFBZSxDQUFvQixrQkFBa0IsQ0FBQyxDQUFBO0FBeUJ2RixNQUFNLENBQU4sSUFBa0Isa0JBR2pCO0FBSEQsV0FBa0Isa0JBQWtCO0lBQ25DLDJEQUFJLENBQUE7SUFDSiw2REFBSyxDQUFBO0FBQ04sQ0FBQyxFQUhpQixrQkFBa0IsS0FBbEIsa0JBQWtCLFFBR25DO0FBMkJELE1BQU0sVUFBVSx3QkFBd0IsQ0FBQyxLQUFjO0lBQ3RELE1BQU0sU0FBUyxHQUFHLEtBQTRDLENBQUE7SUFFOUQsT0FBTyxPQUFPLFNBQVMsRUFBRSxRQUFRLEVBQUUsRUFBRSxLQUFLLFFBQVEsSUFBSSxPQUFPLFNBQVMsQ0FBQyxTQUFTLEtBQUssUUFBUSxDQUFBO0FBQzlGLENBQUM7QUF3QkQsTUFBTSxVQUFVLHdCQUF3QixDQUFDLEtBQWM7SUFDdEQsTUFBTSxTQUFTLEdBQUcsS0FBNEMsQ0FBQTtJQUU5RCxPQUFPLENBQ04sQ0FBQyxPQUFPLFNBQVMsRUFBRSxPQUFPLEtBQUssUUFBUSxJQUFJLHdCQUF3QixDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN4RixPQUFPLFNBQVMsRUFBRSxTQUFTLEtBQUssUUFBUSxDQUN4QyxDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFZO0lBQzFDLEVBQUUsRUFBRSw2QkFBNkI7SUFDakMsS0FBSyxFQUFFLEVBQUU7Q0FDVCxDQUFBO0FBZ0JELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUF5QjtJQUN4RCxVQUFVO0lBQ1YsU0FBUztJQUNULE9BQU87SUFDUCxXQUFXO0lBQ1gsUUFBUTtJQUNSLFNBQVM7Q0FDVCxDQUFBO0FBY0QsTUFBTSxVQUFVLHFCQUFxQixDQUFDLEtBQWM7SUFDbkQsTUFBTSxTQUFTLEdBQUcsS0FBeUMsQ0FBQTtJQUUzRCxPQUFPLENBQUMsQ0FBQyxTQUFTLEVBQUUsT0FBTyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0FBQ2xFLENBQUMifQ==