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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc0NlbnRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL25vdGlmaWNhdGlvbnMvbm90aWZpY2F0aW9uc0NlbnRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFDTixzQ0FBc0MsRUFDdEMsc0NBQXNDLEVBQ3RDLDJCQUEyQixHQUMzQixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFPM0YsT0FBTyxFQUFFLHVCQUF1QixFQUFTLE1BQU0sbURBQW1ELENBQUE7QUFDbEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFFTix3QkFBd0IsR0FDeEIsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMxRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9E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