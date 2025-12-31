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
var NotificationsToasts_1;
import './media/notificationsToasts.css';
import { localize } from '../../../../nls.js';
import { dispose, toDisposable, DisposableStore, } from '../../../../base/common/lifecycle.js';
import { addDisposableListener, EventType, Dimension, scheduleAtNextAnimationFrame, isAncestorOfActiveElement, getWindow, $, } from '../../../../base/browser/dom.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { NotificationsList } from './notificationsList.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { NOTIFICATIONS_TOAST_BORDER, NOTIFICATIONS_BACKGROUND } from '../../../common/theme.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { widgetShadow } from '../../../../platform/theme/common/colorRegistry.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { Severity, NotificationsFilter, NotificationPriority, } from '../../../../platform/notification/common/notification.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IntervalCounter } from '../../../../base/common/async.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { NotificationsToastsVisibleContext } from '../../../common/contextkeys.js';
import { mainWindow } from '../../../../base/browser/window.js';
var ToastVisibility;
(function (ToastVisibility) {
    ToastVisibility[ToastVisibility["HIDDEN_OR_VISIBLE"] = 0] = "HIDDEN_OR_VISIBLE";
    ToastVisibility[ToastVisibility["HIDDEN"] = 1] = "HIDDEN";
    ToastVisibility[ToastVisibility["VISIBLE"] = 2] = "VISIBLE";
})(ToastVisibility || (ToastVisibility = {}));
let NotificationsToasts = class NotificationsToasts extends Themable {
    static { NotificationsToasts_1 = this; }
    static { this.MAX_WIDTH = 450; }
    static { this.MAX_NOTIFICATIONS = 3; }
    static { this.PURGE_TIMEOUT = {
        [Severity.Info]: 15000,
        [Severity.Warning]: 18000,
        [Severity.Error]: 20000,
    }; }
    static { this.SPAM_PROTECTION = {
        // Count for the number of notifications over 800ms...
        interval: 800,
        // ...and ensure we are not showing more than MAX_NOTIFICATIONS
        limit: this.MAX_NOTIFICATIONS,
    }; }
    get isVisible() {
        return !!this._isVisible;
    }
    constructor(container, model, instantiationService, layoutService, themeService, editorGroupService, contextKeyService, lifecycleService, hostService) {
        super(themeService);
        this.container = container;
        this.model = model;
        this.instantiationService = instantiationService;
        this.layoutService = layoutService;
        this.editorGroupService = editorGroupService;
        this.lifecycleService = lifecycleService;
        this.hostService = hostService;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this._isVisible = false;
        this.mapNotificationToToast = new Map();
        this.mapNotificationToDisposable = new Map();
        this.addedToastsIntervalCounter = new IntervalCounter(NotificationsToasts_1.SPAM_PROTECTION.interval);
        this.notificationsToastsVisibleContextKey =
            NotificationsToastsVisibleContext.bindTo(contextKeyService);
        this.registerListeners();
    }
    registerListeners() {
        // Layout
        this._register(this.layoutService.onDidLayoutMainContainer((dimension) => this.layout(Dimension.lift(dimension))));
        // Delay some tasks until after we have restored
        // to reduce UI pressure from the startup phase
        this.lifecycleService.when(3 /* LifecyclePhase.Restored */).then(() => {
            // Show toast for initial notifications if any
            this.model.notifications.forEach((notification) => this.addToast(notification));
            // Update toasts on notification changes
            this._register(this.model.onDidChangeNotification((e) => this.onDidChangeNotification(e)));
        });
        // Filter
        this._register(this.model.onDidChangeFilter(({ global, sources }) => {
            if (global === NotificationsFilter.ERROR) {
                this.hide();
            }
            else if (sources) {
                for (const [notification] of this.mapNotificationToToast) {
                    if (typeof notification.sourceId === 'string' &&
                        sources.get(notification.sourceId) === NotificationsFilter.ERROR &&
                        notification.severity !== Severity.Error &&
                        notification.priority !== NotificationPriority.URGENT) {
                        this.removeToast(notification);
                    }
                }
            }
        }));
    }
    onDidChangeNotification(e) {
        switch (e.kind) {
            case 0 /* NotificationChangeType.ADD */:
                return this.addToast(e.item);
            case 3 /* NotificationChangeType.REMOVE */:
                return this.removeToast(e.item);
        }
    }
    addToast(item) {
        if (this.isNotificationsCenterVisible) {
            return; // do not show toasts while notification center is visible
        }
        if (item.priority === NotificationPriority.SILENT) {
            return; // do not show toasts for silenced notifications
        }
        // Optimization: it is possible that a lot of notifications are being
        // added in a very short time. To prevent this kind of spam, we protect
        // against showing too many notifications at once. Since they can always
        // be accessed from the notification center, a user can always get to
        // them later on.
        // (see also https://github.com/microsoft/vscode/issues/107935)
        if (this.addedToastsIntervalCounter.increment() > NotificationsToasts_1.SPAM_PROTECTION.limit) {
            return;
        }
        // Optimization: showing a notification toast can be expensive
        // because of the associated animation. If the renderer is busy
        // doing actual work, the animation can cause a lot of slowdown
        // As such we use `scheduleAtNextAnimationFrame` to push out
        // the toast until the renderer has time to process it.
        // (see also https://github.com/microsoft/vscode/issues/107935)
        const itemDisposables = new DisposableStore();
        this.mapNotificationToDisposable.set(item, itemDisposables);
        itemDisposables.add(scheduleAtNextAnimationFrame(getWindow(this.container), () => this.doAddToast(item, itemDisposables)));
    }
    doAddToast(item, itemDisposables) {
        // Lazily create toasts containers
        let notificationsToastsContainer = this.notificationsToastsContainer;
        if (!notificationsToastsContainer) {
            notificationsToastsContainer = this.notificationsToastsContainer = $('.notifications-toasts');
            this.container.appendChild(notificationsToastsContainer);
        }
        // Make Visible
        notificationsToastsContainer.classList.add('visible');
        // Container
        const notificationToastContainer = $('.notification-toast-container');
        const firstToast = notificationsToastsContainer.firstChild;
        if (firstToast) {
            notificationsToastsContainer.insertBefore(notificationToastContainer, firstToast); // always first
        }
        else {
            notificationsToastsContainer.appendChild(notificationToastContainer);
        }
        // Toast
        const notificationToast = $('.notification-toast');
        notificationToastContainer.appendChild(notificationToast);
        // Create toast with item and show
        const notificationList = this.instantiationService.createInstance(NotificationsList, notificationToast, {
            verticalScrollMode: 2 /* ScrollbarVisibility.Hidden */,
            widgetAriaLabel: (() => {
                if (!item.source) {
                    return localize('notificationAriaLabel', '{0}, notification', item.message.raw);
                }
                return localize('notificationWithSourceAriaLabel', '{0}, source: {1}, notification', item.message.raw, item.source);
            })(),
        });
        itemDisposables.add(notificationList);
        const toast = {
            item,
            list: notificationList,
            container: notificationToastContainer,
            toast: notificationToast,
        };
        this.mapNotificationToToast.set(item, toast);
        // When disposed, remove as visible
        itemDisposables.add(toDisposable(() => this.updateToastVisibility(toast, false)));
        // Make visible
        notificationList.show();
        // Layout lists
        const maxDimensions = this.computeMaxDimensions();
        this.layoutLists(maxDimensions.width);
        // Show notification
        notificationList.updateNotificationsList(0, 0, [item]);
        // Layout container: only after we show the notification to ensure that
        // the height computation takes the content of it into account!
        this.layoutContainer(maxDimensions.height);
        // Re-draw entire item when expansion changes to reveal or hide details
        itemDisposables.add(item.onDidChangeExpansion(() => {
            notificationList.updateNotificationsList(0, 1, [item]);
        }));
        // Handle content changes
        // - actions: re-draw to properly show them
        // - message: update notification height unless collapsed
        itemDisposables.add(item.onDidChangeContent((e) => {
            switch (e.kind) {
                case 2 /* NotificationViewItemContentChangeKind.ACTIONS */:
                    notificationList.updateNotificationsList(0, 1, [item]);
                    break;
                case 1 /* NotificationViewItemContentChangeKind.MESSAGE */:
                    if (item.expanded) {
                        notificationList.updateNotificationHeight(item);
                    }
                    break;
            }
        }));
        // Remove when item gets closed
        Event.once(item.onDidClose)(() => {
            this.removeToast(item);
        });
        // Automatically purge non-sticky notifications
        this.purgeNotification(item, notificationToastContainer, notificationList, itemDisposables);
        // Theming
        this.updateStyles();
        // Context Key
        this.notificationsToastsVisibleContextKey.set(true);
        // Animate in
        notificationToast.classList.add('notification-fade-in');
        itemDisposables.add(addDisposableListener(notificationToast, 'transitionend', () => {
            notificationToast.classList.remove('notification-fade-in');
            notificationToast.classList.add('notification-fade-in-done');
        }));
        // Mark as visible
        item.updateVisibility(true);
        // Events
        if (!this._isVisible) {
            this._isVisible = true;
            this._onDidChangeVisibility.fire();
        }
    }
    purgeNotification(item, notificationToastContainer, notificationList, disposables) {
        // Track mouse over item
        let isMouseOverToast = false;
        disposables.add(addDisposableListener(notificationToastContainer, EventType.MOUSE_OVER, () => (isMouseOverToast = true)));
        disposables.add(addDisposableListener(notificationToastContainer, EventType.MOUSE_OUT, () => (isMouseOverToast = false)));
        // Install Timers to Purge Notification
        let purgeTimeoutHandle;
        let listener;
        const hideAfterTimeout = () => {
            purgeTimeoutHandle = setTimeout(() => {
                // If the window does not have focus, we wait for the window to gain focus
                // again before triggering the timeout again. This prevents an issue where
                // focussing the window could immediately hide the notification because the
                // timeout was triggered again.
                if (!this.hostService.hasFocus) {
                    if (!listener) {
                        listener = this.hostService.onDidChangeFocus((focus) => {
                            if (focus) {
                                hideAfterTimeout();
                            }
                        });
                        disposables.add(listener);
                    }
                }
                // Otherwise...
                else if (item.sticky || // never hide sticky notifications
                    notificationList.hasFocus() || // never hide notifications with focus
                    isMouseOverToast // never hide notifications under mouse
                ) {
                    hideAfterTimeout();
                }
                else {
                    this.removeToast(item);
                }
            }, NotificationsToasts_1.PURGE_TIMEOUT[item.severity]);
        };
        hideAfterTimeout();
        disposables.add(toDisposable(() => clearTimeout(purgeTimeoutHandle)));
    }
    removeToast(item) {
        let focusEditor = false;
        // UI
        const notificationToast = this.mapNotificationToToast.get(item);
        if (notificationToast) {
            const toastHasDOMFocus = isAncestorOfActiveElement(notificationToast.container);
            if (toastHasDOMFocus) {
                focusEditor = !(this.focusNext() || this.focusPrevious()); // focus next if any, otherwise focus editor
            }
            this.mapNotificationToToast.delete(item);
        }
        // Disposables
        const notificationDisposables = this.mapNotificationToDisposable.get(item);
        if (notificationDisposables) {
            dispose(notificationDisposables);
            this.mapNotificationToDisposable.delete(item);
        }
        // Layout if we still have toasts
        if (this.mapNotificationToToast.size > 0) {
            this.layout(this.workbenchDimensions);
        }
        // Otherwise hide if no more toasts to show
        else {
            this.doHide();
            // Move focus back to editor group as needed
            if (focusEditor) {
                this.editorGroupService.activeGroup.focus();
            }
        }
    }
    removeToasts() {
        // Toast
        this.mapNotificationToToast.clear();
        // Disposables
        this.mapNotificationToDisposable.forEach((disposable) => dispose(disposable));
        this.mapNotificationToDisposable.clear();
        this.doHide();
    }
    doHide() {
        this.notificationsToastsContainer?.classList.remove('visible');
        // Context Key
        this.notificationsToastsVisibleContextKey.set(false);
        // Events
        if (this._isVisible) {
            this._isVisible = false;
            this._onDidChangeVisibility.fire();
        }
    }
    hide() {
        const focusEditor = this.notificationsToastsContainer
            ? isAncestorOfActiveElement(this.notificationsToastsContainer)
            : false;
        this.removeToasts();
        if (focusEditor) {
            this.editorGroupService.activeGroup.focus();
        }
    }
    focus() {
        const toasts = this.getToasts(ToastVisibility.VISIBLE);
        if (toasts.length > 0) {
            toasts[0].list.focusFirst();
            return true;
        }
        return false;
    }
    focusNext() {
        const toasts = this.getToasts(ToastVisibility.VISIBLE);
        for (let i = 0; i < toasts.length; i++) {
            const toast = toasts[i];
            if (toast.list.hasFocus()) {
                const nextToast = toasts[i + 1];
                if (nextToast) {
                    nextToast.list.focusFirst();
                    return true;
                }
                break;
            }
        }
        return false;
    }
    focusPrevious() {
        const toasts = this.getToasts(ToastVisibility.VISIBLE);
        for (let i = 0; i < toasts.length; i++) {
            const toast = toasts[i];
            if (toast.list.hasFocus()) {
                const previousToast = toasts[i - 1];
                if (previousToast) {
                    previousToast.list.focusFirst();
                    return true;
                }
                break;
            }
        }
        return false;
    }
    focusFirst() {
        const toast = this.getToasts(ToastVisibility.VISIBLE)[0];
        if (toast) {
            toast.list.focusFirst();
            return true;
        }
        return false;
    }
    focusLast() {
        const toasts = this.getToasts(ToastVisibility.VISIBLE);
        if (toasts.length > 0) {
            toasts[toasts.length - 1].list.focusFirst();
            return true;
        }
        return false;
    }
    update(isCenterVisible) {
        if (this.isNotificationsCenterVisible !== isCenterVisible) {
            this.isNotificationsCenterVisible = isCenterVisible;
            // Hide all toasts when the notificationcenter gets visible
            if (this.isNotificationsCenterVisible) {
                this.removeToasts();
            }
        }
    }
    updateStyles() {
        this.mapNotificationToToast.forEach(({ toast }) => {
            const backgroundColor = this.getColor(NOTIFICATIONS_BACKGROUND);
            toast.style.background = backgroundColor ? backgroundColor : '';
            const widgetShadowColor = this.getColor(widgetShadow);
            toast.style.boxShadow = widgetShadowColor ? `0 0 8px 2px ${widgetShadowColor}` : '';
            const borderColor = this.getColor(NOTIFICATIONS_TOAST_BORDER);
            toast.style.border = borderColor ? `1px solid ${borderColor}` : '';
        });
    }
    getToasts(state) {
        const notificationToasts = [];
        this.mapNotificationToToast.forEach((toast) => {
            switch (state) {
                case ToastVisibility.HIDDEN_OR_VISIBLE:
                    notificationToasts.push(toast);
                    break;
                case ToastVisibility.HIDDEN:
                    if (!this.isToastInDOM(toast)) {
                        notificationToasts.push(toast);
                    }
                    break;
                case ToastVisibility.VISIBLE:
                    if (this.isToastInDOM(toast)) {
                        notificationToasts.push(toast);
                    }
                    break;
            }
        });
        return notificationToasts.reverse(); // from newest to oldest
    }
    layout(dimension) {
        this.workbenchDimensions = dimension;
        const maxDimensions = this.computeMaxDimensions();
        // Hide toasts that exceed height
        if (maxDimensions.height) {
            this.layoutContainer(maxDimensions.height);
        }
        // Layout all lists of toasts
        this.layoutLists(maxDimensions.width);
    }
    computeMaxDimensions() {
        const maxWidth = NotificationsToasts_1.MAX_WIDTH;
        let availableWidth = maxWidth;
        let availableHeight;
        if (this.workbenchDimensions) {
            // Make sure notifications are not exceding available width
            availableWidth = this.workbenchDimensions.width;
            availableWidth -= 2 * 8; // adjust for paddings left and right
            // Make sure notifications are not exceeding available height
            availableHeight = this.workbenchDimensions.height;
            if (this.layoutService.isVisible("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, mainWindow)) {
                availableHeight -= 22; // adjust for status bar
            }
            if (this.layoutService.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, mainWindow)) {
                availableHeight -= 22; // adjust for title bar
            }
            availableHeight -= 2 * 12; // adjust for paddings top and bottom
        }
        availableHeight =
            typeof availableHeight === 'number'
                ? Math.round(availableHeight * 0.618) // try to not cover the full height for stacked toasts
                : 0;
        return new Dimension(Math.min(maxWidth, availableWidth), availableHeight);
    }
    layoutLists(width) {
        this.mapNotificationToToast.forEach(({ list }) => list.layout(width));
    }
    layoutContainer(heightToGive) {
        let visibleToasts = 0;
        for (const toast of this.getToasts(ToastVisibility.HIDDEN_OR_VISIBLE)) {
            // In order to measure the client height, the element cannot have display: none
            toast.container.style.opacity = '0';
            this.updateToastVisibility(toast, true);
            heightToGive -= toast.container.offsetHeight;
            let makeVisible = false;
            if (visibleToasts === NotificationsToasts_1.MAX_NOTIFICATIONS) {
                makeVisible = false; // never show more than MAX_NOTIFICATIONS
            }
            else if (heightToGive >= 0) {
                makeVisible = true; // hide toast if available height is too little
            }
            // Hide or show toast based on context
            this.updateToastVisibility(toast, makeVisible);
            toast.container.style.opacity = '';
            if (makeVisible) {
                visibleToasts++;
            }
        }
    }
    updateToastVisibility(toast, visible) {
        if (this.isToastInDOM(toast) === visible) {
            return;
        }
        // Update visibility in DOM
        const notificationsToastsContainer = assertIsDefined(this.notificationsToastsContainer);
        if (visible) {
            notificationsToastsContainer.appendChild(toast.container);
        }
        else {
            toast.container.remove();
        }
        // Update visibility in model
        toast.item.updateVisibility(visible);
    }
    isToastInDOM(toast) {
        return !!toast.container.parentElement;
    }
};
NotificationsToasts = NotificationsToasts_1 = __decorate([
    __param(2, IInstantiationService),
    __param(3, IWorkbenchLayoutService),
    __param(4, IThemeService),
    __param(5, IEditorGroupsService),
    __param(6, IContextKeyService),
    __param(7, ILifecycleService),
    __param(8, IHostService)
], NotificationsToasts);
export { NotificationsToasts };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc1RvYXN0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL25vdGlmaWNhdGlvbnMvbm90aWZpY2F0aW9uc1RvYXN0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFRN0MsT0FBTyxFQUVOLE9BQU8sRUFDUCxZQUFZLEVBQ1osZUFBZSxHQUNmLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixTQUFTLEVBQ1QsU0FBUyxFQUNULDRCQUE0QixFQUM1Qix5QkFBeUIsRUFDekIsU0FBUyxFQUNULENBQUMsR0FDRCxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzFELE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLHVCQUF1QixFQUFTLE1BQU0sbURBQW1ELENBQUE7QUFDbEcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLHdCQUF3QixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDL0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDakYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFFN0YsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxD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