/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { isNotificationViewItem, } from '../../../common/notifications.js';
import { MenuRegistry, MenuId } from '../../../../platform/actions/common/actions.js';
import { localize, localize2 } from '../../../../nls.js';
import { IListService, WorkbenchList } from '../../../../platform/list/browser/listService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { NotificationFocusedContext, NotificationsCenterVisibleContext, NotificationsToastsVisibleContext, } from '../../../common/contextkeys.js';
import { INotificationService, NotificationsFilter, } from '../../../../platform/notification/common/notification.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ActionRunner, } from '../../../../base/common/actions.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
// Center
export const SHOW_NOTIFICATIONS_CENTER = 'notifications.showList';
export const HIDE_NOTIFICATIONS_CENTER = 'notifications.hideList';
const TOGGLE_NOTIFICATIONS_CENTER = 'notifications.toggleList';
// Toasts
export const HIDE_NOTIFICATION_TOAST = 'notifications.hideToasts';
const FOCUS_NOTIFICATION_TOAST = 'notifications.focusToasts';
const FOCUS_NEXT_NOTIFICATION_TOAST = 'notifications.focusNextToast';
const FOCUS_PREVIOUS_NOTIFICATION_TOAST = 'notifications.focusPreviousToast';
const FOCUS_FIRST_NOTIFICATION_TOAST = 'notifications.focusFirstToast';
const FOCUS_LAST_NOTIFICATION_TOAST = 'notifications.focusLastToast';
// Notification
export const COLLAPSE_NOTIFICATION = 'notification.collapse';
export const EXPAND_NOTIFICATION = 'notification.expand';
export const ACCEPT_PRIMARY_ACTION_NOTIFICATION = 'notification.acceptPrimaryAction';
const TOGGLE_NOTIFICATION = 'notification.toggle';
export const CLEAR_NOTIFICATION = 'notification.clear';
export const CLEAR_ALL_NOTIFICATIONS = 'notifications.clearAll';
export const TOGGLE_DO_NOT_DISTURB_MODE = 'notifications.toggleDoNotDisturbMode';
export const TOGGLE_DO_NOT_DISTURB_MODE_BY_SOURCE = 'notifications.toggleDoNotDisturbModeBySource';
export function getNotificationFromContext(listService, context) {
    if (isNotificationViewItem(context)) {
        return context;
    }
    const list = listService.lastFocusedList;
    if (list instanceof WorkbenchList) {
        let element = list.getFocusedElements()[0];
        if (!isNotificationViewItem(element)) {
            if (list.isDOMFocused()) {
                // the notification list might have received focus
                // via keyboard and might not have a focused element.
                // in that case just return the first element
                // https://github.com/microsoft/vscode/issues/191705
                element = list.element(0);
            }
        }
        if (isNotificationViewItem(element)) {
            return element;
        }
    }
    return undefined;
}
export function registerNotificationCommands(center, toasts, model) {
    // Show Notifications Cneter
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: SHOW_NOTIFICATIONS_CENTER,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 44 /* KeyCode.KeyN */),
        handler: () => {
            toasts.hide();
            center.show();
        },
    });
    // Hide Notifications Center
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: HIDE_NOTIFICATIONS_CENTER,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
        when: NotificationsCenterVisibleContext,
        primary: 9 /* KeyCode.Escape */,
        handler: () => center.hide(),
    });
    // Toggle Notifications Center
    CommandsRegistry.registerCommand(TOGGLE_NOTIFICATIONS_CENTER, () => {
        if (center.isVisible) {
            center.hide();
        }
        else {
            toasts.hide();
            center.show();
        }
    });
    // Clear Notification
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: CLEAR_NOTIFICATION,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: NotificationFocusedContext,
        primary: 20 /* KeyCode.Delete */,
        mac: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
        },
        handler: (accessor, args) => {
            const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
            const notification = getNotificationFromContext(accessor.get(IListService), args);
            if (notification && !notification.hasProgress) {
                notification.close();
                accessibilitySignalService.playSignal(AccessibilitySignal.clear);
            }
        },
    });
    // Expand Notification
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: EXPAND_NOTIFICATION,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: NotificationFocusedContext,
        primary: 17 /* KeyCode.RightArrow */,
        handler: (accessor, args) => {
            const notification = getNotificationFromContext(accessor.get(IListService), args);
            notification?.expand();
        },
    });
    // Accept Primary Action
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: ACCEPT_PRIMARY_ACTION_NOTIFICATION,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: ContextKeyExpr.or(NotificationFocusedContext, NotificationsToastsVisibleContext),
        primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */,
        handler: (accessor) => {
            const actionRunner = accessor
                .get(IInstantiationService)
                .createInstance(NotificationActionRunner);
            const notification = getNotificationFromContext(accessor.get(IListService)) || model.notifications.at(0);
            if (!notification) {
                return;
            }
            const primaryAction = notification.actions?.primary
                ? notification.actions.primary.at(0)
                : undefined;
            if (!primaryAction) {
                return;
            }
            actionRunner.run(primaryAction, notification);
            notification.close();
            actionRunner.dispose();
        },
    });
    // Collapse Notification
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: COLLAPSE_NOTIFICATION,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: NotificationFocusedContext,
        primary: 15 /* KeyCode.LeftArrow */,
        handler: (accessor, args) => {
            const notification = getNotificationFromContext(accessor.get(IListService), args);
            notification?.collapse();
        },
    });
    // Toggle Notification
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: TOGGLE_NOTIFICATION,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: NotificationFocusedContext,
        primary: 10 /* KeyCode.Space */,
        secondary: [3 /* KeyCode.Enter */],
        handler: (accessor) => {
            const notification = getNotificationFromContext(accessor.get(IListService));
            notification?.toggle();
        },
    });
    // Hide Toasts
    CommandsRegistry.registerCommand(HIDE_NOTIFICATION_TOAST, (accessor) => {
        toasts.hide();
    });
    KeybindingsRegistry.registerKeybindingRule({
        id: HIDE_NOTIFICATION_TOAST,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ - 50, // lower when not focused (e.g. let editor suggest win over this command)
        when: NotificationsToastsVisibleContext,
        primary: 9 /* KeyCode.Escape */,
    });
    KeybindingsRegistry.registerKeybindingRule({
        id: HIDE_NOTIFICATION_TOAST,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 100, // higher when focused
        when: ContextKeyExpr.and(NotificationsToastsVisibleContext, NotificationFocusedContext),
        primary: 9 /* KeyCode.Escape */,
    });
    // Focus Toasts
    CommandsRegistry.registerCommand(FOCUS_NOTIFICATION_TOAST, () => toasts.focus());
    // Focus Next Toast
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: FOCUS_NEXT_NOTIFICATION_TOAST,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: ContextKeyExpr.and(NotificationFocusedContext, NotificationsToastsVisibleContext),
        primary: 18 /* KeyCode.DownArrow */,
        handler: () => {
            toasts.focusNext();
        },
    });
    // Focus Previous Toast
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: FOCUS_PREVIOUS_NOTIFICATION_TOAST,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: ContextKeyExpr.and(NotificationFocusedContext, NotificationsToastsVisibleContext),
        primary: 16 /* KeyCode.UpArrow */,
        handler: () => {
            toasts.focusPrevious();
        },
    });
    // Focus First Toast
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: FOCUS_FIRST_NOTIFICATION_TOAST,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: ContextKeyExpr.and(NotificationFocusedContext, NotificationsToastsVisibleContext),
        primary: 11 /* KeyCode.PageUp */,
        secondary: [14 /* KeyCode.Home */],
        handler: () => {
            toasts.focusFirst();
        },
    });
    // Focus Last Toast
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: FOCUS_LAST_NOTIFICATION_TOAST,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: ContextKeyExpr.and(NotificationFocusedContext, NotificationsToastsVisibleContext),
        primary: 12 /* KeyCode.PageDown */,
        secondary: [13 /* KeyCode.End */],
        handler: () => {
            toasts.focusLast();
        },
    });
    // Clear All Notifications
    CommandsRegistry.registerCommand(CLEAR_ALL_NOTIFICATIONS, () => center.clearAll());
    // Toggle Do Not Disturb Mode
    CommandsRegistry.registerCommand(TOGGLE_DO_NOT_DISTURB_MODE, (accessor) => {
        const notificationService = accessor.get(INotificationService);
        notificationService.setFilter(notificationService.getFilter() === NotificationsFilter.ERROR
            ? NotificationsFilter.OFF
            : NotificationsFilter.ERROR);
    });
    // Configure Do Not Disturb by Source
    CommandsRegistry.registerCommand(TOGGLE_DO_NOT_DISTURB_MODE_BY_SOURCE, (accessor) => {
        const notificationService = accessor.get(INotificationService);
        const quickInputService = accessor.get(IQuickInputService);
        const sortedFilters = notificationService
            .getFilters()
            .sort((a, b) => a.label.localeCompare(b.label));
        const disposables = new DisposableStore();
        const picker = disposables.add(quickInputService.createQuickPick());
        picker.items = sortedFilters.map((source) => ({
            id: source.id,
            label: source.label,
            tooltip: `${source.label} (${source.id})`,
            filter: source.filter,
        }));
        picker.canSelectMany = true;
        picker.placeholder = localize('selectSources', 'Select sources to enable all notifications from');
        picker.selectedItems = picker.items.filter((item) => item.filter === NotificationsFilter.OFF);
        picker.show();
        disposables.add(picker.onDidAccept(async () => {
            for (const item of picker.items) {
                notificationService.setFilter({
                    id: item.id,
                    label: item.label,
                    filter: picker.selectedItems.includes(item)
                        ? NotificationsFilter.OFF
                        : NotificationsFilter.ERROR,
                });
            }
            picker.hide();
        }));
        disposables.add(picker.onDidHide(() => disposables.dispose()));
    });
    // Commands for Command Palette
    const category = localize2('notifications', 'Notifications');
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
        command: {
            id: SHOW_NOTIFICATIONS_CENTER,
            title: localize2('showNotifications', 'Show Notifications'),
            category,
        },
    });
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
        command: {
            id: HIDE_NOTIFICATIONS_CENTER,
            title: localize2('hideNotifications', 'Hide Notifications'),
            category,
        },
        when: NotificationsCenterVisibleContext,
    });
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
        command: {
            id: CLEAR_ALL_NOTIFICATIONS,
            title: localize2('clearAllNotifications', 'Clear All Notifications'),
            category,
        },
    });
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
        command: {
            id: ACCEPT_PRIMARY_ACTION_NOTIFICATION,
            title: localize2('acceptNotificationPrimaryAction', 'Accept Notification Primary Action'),
            category,
        },
    });
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
        command: {
            id: TOGGLE_DO_NOT_DISTURB_MODE,
            title: localize2('toggleDoNotDisturbMode', 'Toggle Do Not Disturb Mode'),
            category,
        },
    });
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
        command: {
            id: TOGGLE_DO_NOT_DISTURB_MODE_BY_SOURCE,
            title: localize2('toggleDoNotDisturbModeBySource', 'Toggle Do Not Disturb Mode By Source...'),
            category,
        },
    });
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
        command: {
            id: FOCUS_NOTIFICATION_TOAST,
            title: localize2('focusNotificationToasts', 'Focus Notification Toast'),
            category,
        },
        when: NotificationsToastsVisibleContext,
    });
}
let NotificationActionRunner = class NotificationActionRunner extends ActionRunner {
    constructor(telemetryService, notificationService) {
        super();
        this.telemetryService = telemetryService;
        this.notificationService = notificationService;
    }
    async runAction(action, context) {
        this.telemetryService.publicLog2('workbenchActionExecuted', { id: action.id, from: 'message' });
        // Run and make sure to notify on any error again
        try {
            await super.runAction(action, context);
        }
        catch (error) {
            this.notificationService.error(error);
        }
    }
};
NotificationActionRunner = __decorate([
    __param(0, ITelemetryService),
    __param(1, INotificationService)
], NotificationActionRunner);
export { NotificationActionRunner };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc0NvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvbm90aWZpY2F0aW9ucy9ub3RpZmljYXRpb25zQ29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLHFDQUFxQyxDQUFBO0FBQy9FLE9BQU8sRUFFTixzQkFBc0IsR0FFdEIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUM5RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLGlDQUFpQyxFQUNqQyxpQ0FBaUMsR0FDakMsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQ04sb0JBQW9CLEVBRXBCLG1CQUFtQixHQUNuQixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTixZQUFZLEdBSVosTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQ04sa0JB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