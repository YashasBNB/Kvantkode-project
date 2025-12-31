/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { language } from '../../../../base/common/platform.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { safeIntl } from '../../../../base/common/date.js';
let localHistoryDateFormatter = undefined;
export function getLocalHistoryDateFormatter() {
    if (!localHistoryDateFormatter) {
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        };
        const formatter = safeIntl.DateTimeFormat(language, options);
        localHistoryDateFormatter = {
            format: (date) => formatter.format(date),
        };
    }
    return localHistoryDateFormatter;
}
export const LOCAL_HISTORY_MENU_CONTEXT_VALUE = 'localHistory:item';
export const LOCAL_HISTORY_MENU_CONTEXT_KEY = ContextKeyExpr.equals('timelineItem', LOCAL_HISTORY_MENU_CONTEXT_VALUE);
export const LOCAL_HISTORY_ICON_ENTRY = registerIcon('localHistory-icon', Codicon.circleOutline, localize('localHistoryIcon', 'Icon for a local history entry in the timeline view.'));
export const LOCAL_HISTORY_ICON_RESTORE = registerIcon('localHistory-restore', Codicon.check, localize('localHistoryRestore', 'Icon for restoring contents of a local history entry.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxIaXN0b3J5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbG9jYWxIaXN0b3J5L2Jyb3dzZXIvbG9jYWxIaXN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDaEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBTTFELElBQUkseUJBQXlCLEdBQTJDLFNBQVMsQ0FBQTtBQUVqRixNQUFNLFVBQVUsNEJBQTRCO0lBQzNDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sT0FBTyxHQUErQjtZQUMzQyxJQUFJLEVBQUUsU0FBUztZQUNmLEtBQUssRUFBRSxNQUFNO1lBQ2IsR0FBRyxFQUFFLFNBQVM7WUFDZCxJQUFJLEVBQUUsU0FBUztZQUNmLE1BQU0sRUFBRSxTQUFTO1NBQ2pCLENBQUE7UUFDRCxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUM1RCx5QkFBeUIsR0FBRztZQUMzQixNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1NBQ3hDLENBQUE7SUFDRixDQUFDO0lBRUQsT0FBTyx5QkFBeUIsQ0FBQTtBQUNqQyxDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sZ0NBQWdDLEdBQUcsbUJBQW1CLENBQUE7QUFDbkUsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FDbEUsY0FBYyxFQUNkLGdDQUFnQyxDQUNoQyxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsWUFBWSxDQUNuRCxtQkFBbUIsRUFDbkIsT0FBTyxDQUFDLGFBQWEsRUFDckIsUUFBUSxDQUFDLGtCQUFrQixFQUFFLHNEQUFzRCxDQUFDLENBQ3BGLENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxZQUFZLENBQ3JELHNCQUFzQixFQUN0QixPQUFPLENBQUMsS0FBSyxFQUNiLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSx1REFBdUQsQ0FBQyxDQUN4RixDQUFBIn0=