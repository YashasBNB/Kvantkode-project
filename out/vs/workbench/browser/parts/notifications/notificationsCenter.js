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
var NotificationsCenter_1;
import './media/notificationsCenter.css';
import './media/notificationsActions.css';
import { NOTIFICATIONS_CENTER_HEADER_FOREGROUND, NOTIFICATIONS_CENTER_HEADER_BACKGROUND, NOTIFICATIONS_CENTER_BORDER, } from '../../../common/theme.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { Emitter } from '../../../../base/common/event.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { NotificationActionRunner, } from './notificationsCommands.js';
import { NotificationsList } from './notificationsList.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { $, Dimension, isAncestorOfActiveElement } from '../../../../base/browser/dom.js';
import { widgetShadow } from '../../../../platform/theme/common/colorRegistry.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { localize } from '../../../../nls.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { ClearAllNotificationsAction, ConfigureDoNotDisturbAction, ToggleDoNotDisturbBySourceAction, HideNotificationsCenterAction, ToggleDoNotDisturbAction, } from './notificationsActions.js';
import { Separator, toAction } from '../../../../base/common/actions.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { assertAllDefined, assertIsDefined } from '../../../../base/common/types.js';
import { NotificationsCenterVisibleContext } from '../../../common/contextkeys.js';
import { INotificationService, NotificationsFilter, } from '../../../../platform/notification/common/notification.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { DropdownMenuActionViewItem } from '../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
let NotificationsCenter = class NotificationsCenter extends Themable {
    static { NotificationsCenter_1 = this; }
    static { this.MAX_DIMENSIONS = new Dimension(450, 400); }
    static { this.MAX_NOTIFICATION_SOURCES = 10; } // maximum number of notification sources to show in configure dropdown
    constructor(container, model, themeService, instantiationService, layoutService, contextKeyService, editorGroupService, keybindingService, notificationService, accessibilitySignalService, contextMenuService) {
        super(themeService);
        this.container = container;
        this.model = model;
        this.instantiationService = instantiationService;
        this.layoutService = layoutService;
        this.editorGroupService = editorGroupService;
        this.keybindingService = keybindingService;
        this.notificationService = notificationService;
        this.accessibilitySignalService = accessibilitySignalService;
        this.contextMenuService = contextMenuService;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this.notificationsCenterVisibleContextKey =
            NotificationsCenterVisibleContext.bindTo(contextKeyService);
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.model.onDidChangeNotification((e) => this.onDidChangeNotification(e)));
        this._register(this.layoutService.onDidLayoutMainContainer((dimension) => this.layout(Dimension.lift(dimension))));
        this._register(this.notificationService.onDidChangeFilter(() => this.onDidChangeFilter()));
    }
    onDidChangeFilter() {
        if (this.notificationService.getFilter() === NotificationsFilter.ERROR) {
            this.hide(); // hide the notification center when we have a error filter enabled
        }
    }
    get isVisible() {
        return !!this._isVisible;
    }
    show() {
        if (this._isVisible) {
            const notificationsList = assertIsDefined(this.notificationsList);
            // Make visible
            notificationsList.show();
            // Focus first
            notificationsList.focusFirst();
            return; // already visible
        }
        // Lazily create if showing for the first time
        if (!this.notificationsCenterContainer) {
            this.create();
        }
        // Title
        this.updateTitle();
        // Make visible
        const [notificationsList, notificationsCenterContainer] = assertAllDefined(this.notificationsList, this.notificationsCenterContainer);
        this._isVisible = true;
        notificationsCenterContainer.classList.add('visible');
        notificationsList.show();
        // Layout
        this.layout(this.workbenchDimensions);
        // Show all notifications that are present now
        notificationsList.updateNotificationsList(0, 0, this.model.notifications);
        // Focus first
        notificationsList.focusFirst();
        // Theming
        this.updateStyles();
        // Mark as visible
        this.model.notifications.forEach((notification) => notification.updateVisibility(true));
        // Context Key
        this.notificationsCenterVisibleContextKey.set(true);
        // Event
        this._onDidChangeVisibility.fire();
    }
    updateTitle() {
        const [notificationsCenterTitle, clearAllAction] = assertAllDefined(this.notificationsCenterTitle, this.clearAllAction);
        if (this.model.notifications.length === 0) {
            notificationsCenterTitle.textContent = localize('notificationsEmpty', 'No new notifications');
            clearAllAction.enabled = false;
        }
        else {
            notificationsCenterTitle.textContent = localize('notifications', 'Notifications');
            clearAllAction.enabled = this.model.notifications.some((notification) => !notification.hasProgress);
        }
    }
    create() {
        // Container
        this.notificationsCenterContainer = $('.notifications-center');
        // Header
        this.notificationsCenterHeader = $('.notifications-center-header');
        this.notificationsCenterContainer.appendChild(this.notificationsCenterHeader);
        // Header Title
        this.notificationsCenterTitle = $('span.notifications-center-header-title');
        this.notificationsCenterHeader.appendChild(this.notificationsCenterTitle);
        // Header Toolbar
        const toolbarContainer = $('.notifications-center-header-toolbar');
        this.notificationsCenterHeader.appendChild(toolbarContainer);
        const actionRunner = this._register(this.instantiationService.createInstance(NotificationActionRunner));
        const that = this;
        const notificationsToolBar = this._register(new ActionBar(toolbarContainer, {
            ariaLabel: localize('notificationsToolbar', 'Notification Center Actions'),
            actionRunner,
            actionViewItemProvider: (action, options) => {
                if (action.id === ConfigureDoNotDisturbAction.ID) {
                    return this._register(this.instantiationService.createInstance(DropdownMenuActionViewItem, action, {
                        getActions() {
                            const actions = [
                                toAction({
                                    id: ToggleDoNotDisturbAction.ID,
                                    label: that.notificationService.getFilter() === NotificationsFilter.OFF
                                        ? localize('turnOnNotifications', 'Enable Do Not Disturb Mode')
                                        : localize('turnOffNotifications', 'Disable Do Not Disturb Mode'),
                                    run: () => that.notificationService.setFilter(that.notificationService.getFilter() === NotificationsFilter.OFF
                                        ? NotificationsFilter.ERROR
                                        : NotificationsFilter.OFF),
                                }),
                            ];
                            const sortedFilters = that.notificationService
                                .getFilters()
                                .sort((a, b) => a.label.localeCompare(b.label));
                            for (const source of sortedFilters.slice(0, NotificationsCenter_1.MAX_NOTIFICATION_SOURCES)) {
                                if (actions.length === 1) {
                                    actions.push(new Separator());
                                }
                                actions.push(toAction({
                                    id: `${ToggleDoNotDisturbAction.ID}.${source.id}`,
                                    label: source.label,
                                    checked: source.filter !== NotificationsFilter.ERROR,
                                    run: () => that.notificationService.setFilter({
                                        ...source,
                                        filter: source.filter === NotificationsFilter.ERROR
                                            ? NotificationsFilter.OFF
                                            : NotificationsFilter.ERROR,
                                    }),
                                }));
                            }
                            if (sortedFilters.length > NotificationsCenter_1.MAX_NOTIFICATION_SOURCES) {
                                actions.push(new Separator());
                                actions.push(that._register(that.instantiationService.createInstance(ToggleDoNotDisturbBySourceAction, ToggleDoNotDisturbBySourceAction.ID, localize('moreSources', 'More…'))));
                            }
                            return actions;
                        },
                    }, this.contextMenuService, {
                        ...options,
                        actionRunner,
                        classNames: action.class,
                        keybindingProvider: (action) => this.keybindingService.lookupKeybinding(action.id),
                    }));
                }
                return undefined;
            },
        }));
        this.clearAllAction = this._register(this.instantiationService.createInstance(ClearAllNotificationsAction, ClearAllNotificationsAction.ID, ClearAllNotificationsAction.LABEL));
        notificationsToolBar.push(this.clearAllAction, {
            icon: true,
            label: false,
            keybinding: this.getKeybindingLabel(this.clearAllAction),
        });
        this.configureDoNotDisturbAction = this._register(this.instantiationService.createInstance(ConfigureDoNotDisturbAction, ConfigureDoNotDisturbAction.ID, ConfigureDoNotDisturbAction.LABEL));
        notificationsToolBar.push(this.configureDoNotDisturbAction, { icon: true, label: false });
        const hideAllAction = this._register(this.instantiationService.createInstance(HideNotificationsCenterAction, HideNotificationsCenterAction.ID, HideNotificationsCenterAction.LABEL));
        notificationsToolBar.push(hideAllAction, {
            icon: true,
            label: false,
            keybinding: this.getKeybindingLabel(hideAllAction),
        });
        // Notifications List
        this.notificationsList = this.instantiationService.createInstance(NotificationsList, this.notificationsCenterContainer, {
            widgetAriaLabel: localize('notificationsCenterWidgetAriaLabel', 'Notifications Center'),
        });
        this.container.appendChild(this.notificationsCenterContainer);
    }
    getKeybindingLabel(action) {
        const keybinding = this.keybindingService.lookupKeybinding(action.id);
        return keybinding ? keybinding.getLabel() : null;
    }
    onDidChangeNotification(e) {
        if (!this._isVisible) {
            return; // only if visible
        }
        let focusEditor = false;
        // Update notifications list based on event kind
        const [notificationsList, notificationsCenterContainer] = assertAllDefined(this.notificationsList, this.notificationsCenterContainer);
        switch (e.kind) {
            case 0 /* NotificationChangeType.ADD */:
                notificationsList.updateNotificationsList(e.index, 0, [e.item]);
                e.item.updateVisibility(true);
                break;
            case 1 /* NotificationChangeType.CHANGE */:
                // Handle content changes
                // - actions: re-draw to properly show them
                // - message: update notification height unless collapsed
                switch (e.detail) {
                    case 2 /* NotificationViewItemContentChangeKind.ACTIONS */:
                        notificationsList.updateNotificationsList(e.index, 1, [e.item]);
                        break;
                    case 1 /* NotificationViewItemContentChangeKind.MESSAGE */:
                        if (e.item.expanded) {
                            notificationsList.updateNotificationHeight(e.item);
                        }
                        break;
                }
                break;
            case 2 /* NotificationChangeType.EXPAND_COLLAPSE */:
                // Re-draw entire item when expansion changes to reveal or hide details
                notificationsList.updateNotificationsList(e.index, 1, [e.item]);
                break;
            case 3 /* NotificationChangeType.REMOVE */:
                focusEditor = isAncestorOfActiveElement(notificationsCenterContainer);
                notificationsList.updateNotificationsList(e.index, 1);
                e.item.updateVisibility(false);
                break;
        }
        // Update title
        this.updateTitle();
        // Hide if no more notifications to show
        if (this.model.notifications.length === 0) {
            this.hide();
            // Restore focus to editor group if we had focus
            if (focusEditor) {
                this.editorGroupService.activeGroup.focus();
            }
        }
    }
    hide() {
        if (!this._isVisible || !this.notificationsCenterContainer || !this.notificationsList) {
            return; // already hidden
        }
        const focusEditor = isAncestorOfActiveElement(this.notificationsCenterContainer);
        // Hide
        this._isVisible = false;
        this.notificationsCenterContainer.classList.remove('visible');
        this.notificationsList.hide();
        // Mark as hidden
        this.model.notifications.forEach((notification) => notification.updateVisibility(false));
        // Context Key
        this.notificationsCenterVisibleContextKey.set(false);
        // Event
        this._onDidChangeVisibility.fire();
        // Restore focus to editor group if we had focus
        if (focusEditor) {
            this.editorGroupService.activeGroup.focus();
        }
    }
    updateStyles() {
        if (this.notificationsCenterContainer && this.notificationsCenterHeader) {
            const widgetShadowColor = this.getColor(widgetShadow);
            this.notificationsCenterContainer.style.boxShadow = widgetShadowColor
                ? `0 0 8px 2px ${widgetShadowColor}`
                : '';
            const borderColor = this.getColor(NOTIFICATIONS_CENTER_BORDER);
            this.notificationsCenterContainer.style.border = borderColor ? `1px solid ${borderColor}` : '';
            const headerForeground = this.getColor(NOTIFICATIONS_CENTER_HEADER_FOREGROUND);
            this.notificationsCenterHeader.style.color = headerForeground ?? '';
            const headerBackground = this.getColor(NOTIFICATIONS_CENTER_HEADER_BACKGROUND);
            this.notificationsCenterHeader.style.background = headerBackground ?? '';
        }
    }
    layout(dimension) {
        this.workbenchDimensions = dimension;
        if (this._isVisible && this.notificationsCenterContainer) {
            const maxWidth = NotificationsCenter_1.MAX_DIMENSIONS.width;
            const maxHeight = NotificationsCenter_1.MAX_DIMENSIONS.height;
            let availableWidth = maxWidth;
            let availableHeight = maxHeight;
            if (this.workbenchDimensions) {
                // Make sure notifications are not exceding available width
                availableWidth = this.workbenchDimensions.width;
                availableWidth -= 2 * 8; // adjust for paddings left and right
                // Make sure notifications are not exceeding available height
                availableHeight = this.workbenchDimensions.height - 35; /* header */
                if (this.layoutService.isVisible("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, mainWindow)) {
                    availableHeight -= 22; // adjust for status bar
                }
                if (this.layoutService.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, mainWindow)) {
                    availableHeight -= 22; // adjust for title bar
                }
                availableHeight -= 2 * 12; // adjust for paddings top and bottom
            }
            // Apply to list
            const notificationsList = assertIsDefined(this.notificationsList);
            notificationsList.layout(Math.min(maxWidth, availableWidth), Math.min(maxHeight, availableHeight));
        }
    }
    clearAll() {
        // Hide notifications center first
        this.hide();
        // Close all
        for (const notification of [
            ...this.model.notifications,
        ] /* copy array since we modify it from closing */) {
            if (!notification.hasProgress) {
                notification.close();
            }
            this.accessibilitySignalService.playSignal(AccessibilitySignal.clear);
        }
    }
};
NotificationsCenter = NotificationsCenter_1 = __decorate([
    __param(2, IThemeService),
    __param(3, IInstantiationService),
    __param(4, IWorkbenchLayoutService),
    __param(5, IContextKeyService),
    __param(6, IEditorGroupsService),
    __param(7, IKeybindingService),
    __param(8, INotificationService),
    __param(9, IAccessibilitySignalService),
    __param(10, IContextMenuService)
], NotificationsCenter);
export { NotificationsCenter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc0NlbnRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvbm90aWZpY2F0aW9ucy9ub3RpZmljYXRpb25zQ2VudGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUNOLHNDQUFzQyxFQUN0QyxzQ0FBc0MsRUFDdEMsMkJBQTJCLEdBQzNCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQU8zRixPQUFPLEVBQUUsdUJBQXVCLEVBQVMsTUFBTSxtREFBbUQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUVOLHdCQUF3QixHQUN4QixNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzFELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLHlCQUF5QixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1B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