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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uQWNjZXNzaWJsZVZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL25vdGlmaWNhdGlvbnMvbm90aWZpY2F0aW9uQWNjZXNzaWJsZVZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUNOLHNCQUFzQixFQUd0Qix5QkFBeUIsR0FDekIsTUFBTSw4REFBOEQsQ0FBQTtBQUVyRSxPQUFPLEVBQ04sMkJBQTJCLEVBQzNCLG1CQUFtQixHQUNuQixNQUFNLGdGQUFnRixDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVsRixPQUFPLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzlGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3ZFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRzNFLE1BQU0sT0FBTywwQkFBMEI7SUFBdkM7UUFDVSxhQUFRLEdBQUcsRUFBRSxDQUFBO1FBQ2IsU0FBSSxHQUFHLGVBQWUsQ0FBQTtRQUN0QixTQUFJLEdBQUcsMEJBQTBCLENBQUE7UUFDakMsU0FBSSx3Q0FBMEI7SUFnRnhDLENBQUM7SUEvRUEsV0FBVyxDQUFDLFFBQTBCO1FBQ3JDLE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0Is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