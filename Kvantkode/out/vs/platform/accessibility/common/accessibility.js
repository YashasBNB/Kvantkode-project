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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYWNjZXNzaWJpbGl0eS9jb21tb24vYWNjZXNzaWJpbGl0eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRTdFLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGVBQWUsQ0FBd0Isc0JBQXNCLENBQUMsQ0FBQTtBQWlCbkcsTUFBTSxDQUFOLElBQWtCLG9CQVNqQjtBQVRELFdBQWtCLG9CQUFvQjtJQUNyQzs7T0FFRztJQUNILHFFQUFXLENBQUE7SUFFWCx1RUFBWSxDQUFBO0lBRVoscUVBQVcsQ0FBQTtBQUNaLENBQUMsRUFUaUIsb0JBQW9CLEtBQXBCLG9CQUFvQixRQVNyQztBQUVELE1BQU0sQ0FBQyxNQUFNLGtDQUFrQyxHQUFHLElBQUksYUFBYSxDQUNsRSwwQkFBMEIsRUFDMUIsS0FBSyxDQUNMLENBQUE7QUFPRCxNQUFNLFVBQVUsMEJBQTBCLENBQUMsR0FBUTtJQUNsRCxPQUFPLENBQ04sR0FBRztRQUNILE9BQU8sR0FBRyxLQUFLLFFBQVE7UUFDdkIsT0FBTyxHQUFHLENBQUMsS0FBSyxLQUFLLFFBQVE7UUFDN0IsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxJQUFJLEtBQUssV0FBVyxJQUFJLE9BQU8sR0FBRyxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsQ0FDakUsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSxvQ0FBb0MsR0FBRyx3QkFBd0IsQ0FBQSJ9