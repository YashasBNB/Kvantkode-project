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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aXZpdHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9hY3Rpdml0eS9jb21tb24vYWN0aXZpdHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBSzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLDRCQUE0QixFQUM1Qiw4QkFBOEIsRUFDOUIsOEJBQThCLEdBQzlCLE1BQU0sd0RBQXdELENBQUE7QUFRL0QsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsZUFBZSxDQUFtQixpQkFBaUIsQ0FBQyxDQUFBO0FBb0RwRixNQUFNLFNBQVM7SUFDZCxZQUNvQixZQUFrQyxFQUNwQyxRQUF3RTtRQUR0RSxpQkFBWSxHQUFaLFlBQVksQ0FBc0I7UUFDcEMsYUFBUSxHQUFSLFFBQVEsQ0FBZ0U7SUFDdkYsQ0FBQztJQUVKLGNBQWM7UUFDYixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDL0IsQ0FBQztJQUVELFNBQVMsQ0FBQyxLQUFrQjtRQUMzQixPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM5QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sV0FBWSxTQUFRLFNBQVM7SUFDekMsWUFDVSxNQUFjLEVBQ3ZCLFlBQXFDO1FBRXJDLEtBQUssQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFIckIsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUt2QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtJQUNyQixDQUFDO0lBRVEsY0FBYztRQUN0QixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3RDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxTQUFVLFNBQVEsU0FBUztJQUN2QyxZQUNVLElBQWUsRUFDeEIsWUFBMEIsRUFDMUIsUUFBMkQ7UUFFM0QsS0FBSyxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUpwQixTQUFJLEdBQUosSUFBSSxDQUFXO0lBS3pCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxhQUFjLFNBQVEsU0FBUztJQUMzQyxZQUFZLFlBQTBCO1FBQ3JDLEtBQUssQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDL0IsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLFlBQWEsU0FBUSxTQUFTO0lBQzFDLFlBQVksWUFBMEI7UUFDckMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLENBQUMsS0FBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM3RCxlQUFlLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsQ0FBQztZQUMvRCxlQUFlLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsQ0FBQztZQUMvRCxXQUFXLEVBQUUsU0FBUztTQUN0QixDQUFDLENBQUMsQ0FBQTtJQUNKLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxVQUFXLFNBQVEsU0FBUztJQUN4QyxZQUFZLFlBQTBCO1FBQ3JDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLFlBQVksRUFBRSxDQUFDLEtBQWtCLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDM0QsZUFBZSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsNEJBQTRCLENBQUM7WUFDN0QsZUFBZSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsNEJBQTRCLENBQUM7WUFDN0QsV0FBVyxFQUFFLFNBQVM7U0FDdEIsQ0FBQyxDQUFDLENBQUE7SUFDSixDQUFDO0NBQ0QifQ==