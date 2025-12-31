/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { activityErrorBadgeBackground, activityErrorBadgeForeground, activityWarningBadgeBackground, activityWarningBadgeForeground, } from '../../../../platform/theme/common/colors/miscColors.js';
export const IActivityService = createDecorator('activityService');
class BaseBadge {
    constructor(descriptorFn, stylesFn) {
        this.descriptorFn = descriptorFn;
        this.stylesFn = stylesFn;
    }
    getDescription() {
        return this.descriptorFn(null);
    }
    getColors(theme) {
        return this.stylesFn?.(theme);
    }
}
export class NumberBadge extends BaseBadge {
    constructor(number, descriptorFn) {
        super(descriptorFn, undefined);
        this.number = number;
        this.number = number;
    }
    getDescription() {
        return this.descriptorFn(this.number);
    }
}
export class IconBadge extends BaseBadge {
    constructor(icon, descriptorFn, stylesFn) {
        super(descriptorFn, stylesFn);
        this.icon = icon;
    }
}
export class ProgressBadge extends BaseBadge {
    constructor(descriptorFn) {
        super(descriptorFn, undefined);
    }
}
export class WarningBadge extends IconBadge {
    constructor(descriptorFn) {
        super(Codicon.warning, descriptorFn, (theme) => ({
            badgeBackground: theme.getColor(activityWarningBadgeBackground),
            badgeForeground: theme.getColor(activityWarningBadgeForeground),
            badgeBorder: undefined,
        }));
    }
}
export class ErrorBadge extends IconBadge {
    constructor(descriptorFn) {
        super(Codicon.error, descriptorFn, (theme) => ({
            badgeBackground: theme.getColor(activityErrorBadgeBackground),
            badgeForeground: theme.getColor(activityErrorBadgeForeground),
            badgeBorder: undefined,
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aXZpdHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvYWN0aXZpdHkvY29tbW9uL2FjdGl2aXR5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUs3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUNOLDRCQUE0QixFQUM1Qiw0QkFBNEIsRUFDNUIsOEJBQThCLEVBQzlCLDhCQUE4QixHQUM5QixNQUFNLHdEQUF3RCxDQUFBO0FBUS9ELE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLGVBQWUsQ0FBbUIsaUJBQWlCLENBQUMsQ0FBQTtBQW9EcEYsTUFBTSxTQUFTO0lBQ2QsWUFDb0IsWUFBa0MsRUFDcEMsUUFBd0U7UUFEdEUsaUJBQVksR0FBWixZQUFZLENBQXNCO1FBQ3BDLGFBQVEsR0FBUixRQUFRLENBQWdFO0lBQ3ZGLENBQUM7SUFFSixjQUFjO1FBQ2IsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQy9CLENBQUM7SUFFRCxTQUFTLENBQUMsS0FBa0I7UUFDM0IsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDOUIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLFdBQVksU0FBUSxTQUFTO0lBQ3pDLFlBQ1UsTUFBYyxFQUN2QixZQUFxQztRQUVyQyxLQUFLLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBSHJCLFdBQU0sR0FBTixNQUFNLENBQVE7UUFLdkIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUE7SUFDckIsQ0FBQztJQUVRLGNBQWM7UUFDdEIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sU0FBVSxTQUFRLFNBQVM7SUFDdkMsWUFDVSxJQUFlLEVBQ3hCLFlBQTBCLEVBQzFCLFFBQTJEO1FBRTNELEtBQUssQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFKcEIsU0FBSSxHQUFKLElBQUksQ0FBVztJQUt6QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sYUFBYyxTQUFRLFNBQVM7SUFDM0MsWUFBWSxZQUEwQjtRQUNyQyxLQUFLLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQy9CLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxZQUFhLFNBQVEsU0FBUztJQUMxQyxZQUFZLFlBQTBCO1FBQ3JDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxDQUFDLEtBQWtCLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDN0QsZUFBZSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsOEJBQThCLENBQUM7WUFDL0QsZUFBZSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsOEJBQThCLENBQUM7WUFDL0QsV0FBVyxFQUFFLFNBQVM7U0FDdEIsQ0FBQyxDQUFDLENBQUE7SUFDSixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sVUFBVyxTQUFRLFNBQVM7SUFDeEMsWUFBWSxZQUEwQjtRQUNyQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxZQUFZLEVBQUUsQ0FBQyxLQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzNELGVBQWUsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLDRCQUE0QixDQUFDO1lBQzdELGVBQWUsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLDRCQUE0QixDQUFDO1lBQzdELFdBQVcsRUFBRSxTQUFTO1NBQ3RCLENBQUMsQ0FBQyxDQUFBO0lBQ0osQ0FBQztDQUNEIn0=