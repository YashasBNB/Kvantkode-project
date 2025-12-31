/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { IAccessibleViewService, AccessibleContentProvider, } from '../../../../platform/accessibility/browser/accessibleView.js';
import { IAccessibilitySignalService, AccessibilitySignal, } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IListService, WorkbenchList } from '../../../../platform/list/browser/listService.js';
import { getNotificationFromContext } from './notificationsCommands.js';
import { NotificationFocusedContext } from '../../../common/contextkeys.js';
export class NotificationAccessibleView {
    constructor() {
        this.priority = 90;
        this.name = 'notifications';
        this.when = NotificationFocusedContext;
        this.type = "view" /* AccessibleViewType.View */;
    }
    getProvider(accessor) {
        const accessibleViewService = accessor.get(IAccessibleViewService);
        const listService = accessor.get(IListService);
        const commandService = accessor.get(ICommandService);
        const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
        function getProvider() {
            const notification = getNotificationFromContext(listService);
            if (!notification) {
                return;
            }
            commandService.executeCommand('notifications.showList');
            let notificationIndex;
            const list = listService.lastFocusedList;
            if (list instanceof WorkbenchList) {
                notificationIndex = list.indexOf(notification);
            }
            if (notificationIndex === undefined) {
                return;
            }
            function focusList() {
                commandService.executeCommand('notifications.showList');
                if (list && notificationIndex !== undefined) {
                    list.domFocus();
                    try {
                        list.setFocus([notificationIndex]);
                    }
                    catch { }
                }
            }
            function getContentForNotification() {
                const notification = getNotificationFromContext(listService);
                const message = notification?.message.original.toString();
                if (!notification) {
                    return;
                }
                return notification.source
                    ? localize('notification.accessibleViewSrc', '{0} Source: {1}', message, notification.source)
                    : localize('notification.accessibleView', '{0}', message);
            }
            const content = getContentForNotification();
            if (!content) {
                return;
            }
            notification.onDidClose(() => accessibleViewService.next());
            return new AccessibleContentProvider("notification" /* AccessibleViewProviderId.Notification */, { type: "view" /* AccessibleViewType.View */ }, () => content, () => focusList(), 'accessibility.verbosity.notification', undefined, getActionsFromNotification(notification, accessibilitySignalService), () => {
                if (!list) {
                    return;
                }
                focusList();
                list.focusNext();
                return getContentForNotification();
            }, () => {
                if (!list) {
                    return;
                }
                focusList();
                list.focusPrevious();
                return getContentForNotification();
            });
        }
        return getProvider();
    }
}
function getActionsFromNotification(notification, accessibilitySignalService) {
    let actions = undefined;
    if (notification.actions) {
        actions = [];
        if (notification.actions.primary) {
            actions.push(...notification.actions.primary);
        }
        if (notification.actions.secondary) {
            actions.push(...notification.actions.secondary);
        }
    }
    if (actions) {
        for (const action of actions) {
            action.class = ThemeIcon.asClassName(Codicon.bell);
            const initialAction = action.run;
            action.run = () => {
                initialAction();
                notification.close();
            };
        }
    }
    const manageExtension = actions?.find((a) => a.label.includes('Manage Extension'));
    if (manageExtension) {
        manageExtension.class = ThemeIcon.asClassName(Codicon.gear);
    }
    if (actions) {
        actions.push({
            id: 'clearNotification',
            label: localize('clearNotification', 'Clear Notification'),
            tooltip: localize('clearNotification', 'Clear Notification'),
            run: () => {
                notification.close();
                accessibilitySignalService.playSignal(AccessibilitySignal.clear);
            },
            enabled: true,
            class: ThemeIcon.asClassName(Codicon.clearAll),
        });
    }
    return actions;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uQWNjZXNzaWJsZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9ub3RpZmljYXRpb25zL25vdGlmaWNhdGlvbkFjY2Vzc2libGVWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFDTixzQkFBc0IsRUFHdEIseUJBQXlCLEdBQ3pCLE1BQU0sOERBQThELENBQUE7QUFFckUsT0FBTyxFQUNOLDJCQUEyQixFQUMzQixtQkFBbUIsR0FDbkIsTUFBTSxnRkFBZ0YsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFbEYsT0FBTyxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUM5RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUczRSxNQUFNLE9BQU8sMEJBQTBCO0lBQXZDO1FBQ1UsYUFBUSxHQUFHLEVBQUUsQ0FBQTtRQUNiLFNBQUksR0FBRyxlQUFlLENBQUE7UUFDdEIsU0FBSSxHQUFHLDBCQUEwQixDQUFBO1FBQ2pDLFNBQUksd0NBQTBCO0lBZ0Z4QyxDQUFDO0lBL0VBLFdBQVcsQ0FBQyxRQUEwQjtRQUNyQyxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtRQUNsRSxNQUFNLFdB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