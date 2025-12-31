/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RawContextKey } from '../../contextkey/common/contextkey.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IAccessibilityService = createDecorator('accessibilityService');
export var AccessibilitySupport;
(function (AccessibilitySupport) {
    /**
     * This should be the browser case where it is not known if a screen reader is attached or no.
     */
    AccessibilitySupport[AccessibilitySupport["Unknown"] = 0] = "Unknown";
    AccessibilitySupport[AccessibilitySupport["Disabled"] = 1] = "Disabled";
    AccessibilitySupport[AccessibilitySupport["Enabled"] = 2] = "Enabled";
})(AccessibilitySupport || (AccessibilitySupport = {}));
export const CONTEXT_ACCESSIBILITY_MODE_ENABLED = new RawContextKey('accessibilityModeEnabled', false);
export function isAccessibilityInformation(obj) {
    return (obj &&
        typeof obj === 'object' &&
        typeof obj.label === 'string' &&
        (typeof obj.role === 'undefined' || typeof obj.role === 'string'));
}
export const ACCESSIBLE_VIEW_SHOWN_STORAGE_PREFIX = 'ACCESSIBLE_VIEW_SHOWN_';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2FjY2Vzc2liaWxpdHkvY29tbW9uL2FjY2Vzc2liaWxpdHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUU3RSxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxlQUFlLENBQXdCLHNCQUFzQixDQUFDLENBQUE7QUFpQm5HLE1BQU0sQ0FBTixJQUFrQixvQkFTakI7QUFURCxXQUFrQixvQkFBb0I7SUFDckM7O09BRUc7SUFDSCxxRUFBVyxDQUFBO0lBRVgsdUVBQVksQ0FBQTtJQUVaLHFFQUFXLENBQUE7QUFDWixDQUFDLEVBVGlCLG9CQUFvQixLQUFwQixvQkFBb0IsUUFTckM7QUFFRCxNQUFNLENBQUMsTUFBTSxrQ0FBa0MsR0FBRyxJQUFJLGFBQWEsQ0FDbEUsMEJBQTBCLEVBQzFCLEtBQUssQ0FDTCxDQUFBO0FBT0QsTUFBTSxVQUFVLDBCQUEwQixDQUFDLEdBQVE7SUFDbEQsT0FBTyxDQUNOLEdBQUc7UUFDSCxPQUFPLEdBQUcsS0FBSyxRQUFRO1FBQ3ZCLE9BQU8sR0FBRyxDQUFDLEtBQUssS0FBSyxRQUFRO1FBQzdCLENBQUMsT0FBTyxHQUFHLENBQUMsSUFBSSxLQUFLLFdBQVcsSUFBSSxPQUFPLEdBQUcsQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLENBQ2pFLENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQUcsd0JBQXdCLENBQUEifQ==