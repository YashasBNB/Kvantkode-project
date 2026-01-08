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
import { IStatusbarService, } from '../../../services/statusbar/browser/statusbar.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { HIDE_NOTIFICATIONS_CENTER, SHOW_NOTIFICATIONS_CENTER } from './notificationsCommands.js';
import { localize } from '../../../../nls.js';
import { INotificationService, NotificationsFilter, } from '../../../../platform/notification/common/notification.js';
let NotificationsStatus = class NotificationsStatus extends Disposable {
    constructor(model, statusbarService, notificationService) {
        super();
        this.model = model;
        this.statusbarService = statusbarService;
        this.notificationService = notificationService;
        this.newNotificationsCount = 0;
        this.isNotificationsCenterVisible = false;
        this.isNotificationsToastsVisible = false;
        this.updateNotificationsCenterStatusItem();
        if (model.statusMessage) {
            this.doSetStatusMessage(model.statusMessage);
        }
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.model.onDidChangeNotification((e) => this.onDidChangeNotification(e)));
        this._register(this.model.onDidChangeStatusMessage((e) => this.onDidChangeStatusMessage(e)));
        this._register(this.notificationService.onDidChangeFilter(() => this.updateNotificationsCenterStatusItem()));
    }
    onDidChangeNotification(e) {
        // Consider a notification as unread as long as it only
        // appeared as toast and not in the notification center
        if (!this.isNotificationsCenterVisible) {
            if (e.kind === 0 /* NotificationChangeType.ADD */) {
                this.newNotificationsCount++;
            }
            else if (e.kind === 3 /* NotificationChangeType.REMOVE */ && this.newNotificationsCount > 0) {
                this.newNotificationsCount--;
            }
        }
        // Update in status bar
        this.updateNotificationsCenterStatusItem();
    }
    updateNotificationsCenterStatusItem() {
        // Figure out how many notifications have progress only if neither
        // toasts are visible nor center is visible. In that case we still
        // want to give a hint to the user that something is running.
        let notificationsInProgress = 0;
        if (!this.isNotificationsCenterVisible && !this.isNotificationsToastsVisible) {
            for (const notification of this.model.notifications) {
                if (notification.hasProgress) {
                    notificationsInProgress++;
                }
            }
        }
        // Show the status bar entry depending on do not disturb setting
        let statusProperties = {
            name: localize('status.notifications', 'Notifications'),
            text: `${notificationsInProgress > 0 || this.newNotificationsCount > 0 ? '$(bell-dot)' : '$(bell)'}`,
            ariaLabel: localize('status.notifications', 'Notifications'),
            command: this.isNotificationsCenterVisible
                ? HIDE_NOTIFICATIONS_CENTER
                : SHOW_NOTIFICATIONS_CENTER,
            tooltip: this.getTooltip(notificationsInProgress),
            showBeak: this.isNotificationsCenterVisible,
        };
        if (this.notificationService.getFilter() === NotificationsFilter.ERROR) {
            statusProperties = {
                ...statusProperties,
                text: `${notificationsInProgress > 0 || this.newNotificationsCount > 0 ? '$(bell-slash-dot)' : '$(bell-slash)'}`,
                ariaLabel: localize('status.doNotDisturb', 'Do Not Disturb'),
                tooltip: localize('status.doNotDisturbTooltip', 'Do Not Disturb Mode is Enabled'),
            };
        }
        if (!this.notificationsCenterStatusItem) {
            this.notificationsCenterStatusItem = this.statusbarService.addEntry(statusProperties, 'status.notifications', 1 /* StatusbarAlignment.RIGHT */, Number.NEGATIVE_INFINITY /* last entry */);
        }
        else {
            this.notificationsCenterStatusItem.update(statusProperties);
        }
    }
    getTooltip(notificationsInProgress) {
        if (this.isNotificationsCenterVisible) {
            return localize('hideNotifications', 'Hide Notifications');
        }
        if (this.model.notifications.length === 0) {
            return localize('zeroNotifications', 'No Notifications');
        }
        if (notificationsInProgress === 0) {
            if (this.newNotificationsCount === 0) {
                return localize('noNotifications', 'No New Notifications');
            }
            if (this.newNotificationsCount === 1) {
                return localize('oneNotification', '1 New Notification');
            }
            return localize({ key: 'notifications', comment: ['{0} will be replaced by a number'] }, '{0} New Notifications', this.newNotificationsCount);
        }
        if (this.newNotificationsCount === 0) {
            return localize({ key: 'noNotificationsWithProgress', comment: ['{0} will be replaced by a number'] }, 'No New Notifications ({0} in progress)', notificationsInProgress);
        }
        if (this.newNotificationsCount === 1) {
            return localize({ key: 'oneNotificationWithProgress', comment: ['{0} will be replaced by a number'] }, '1 New Notification ({0} in progress)', notificationsInProgress);
        }
        return localize({ key: 'notificationsWithProgress', comment: ['{0} and {1} will be replaced by a number'] }, '{0} New Notifications ({1} in progress)', this.newNotificationsCount, notificationsInProgress);
    }
    update(isCenterVisible, isToastsVisible) {
        let updateNotificationsCenterStatusItem = false;
        if (this.isNotificationsCenterVisible !== isCenterVisible) {
            this.isNotificationsCenterVisible = isCenterVisible;
            this.newNotificationsCount = 0; // Showing the notification center resets the unread counter to 0
            updateNotificationsCenterStatusItem = true;
        }
        if (this.isNotificationsToastsVisible !== isToastsVisible) {
            this.isNotificationsToastsVisible = isToastsVisible;
            updateNotificationsCenterStatusItem = true;
        }
        // Update in status bar as needed
        if (updateNotificationsCenterStatusItem) {
            this.updateNotificationsCenterStatusItem();
        }
    }
    onDidChangeStatusMessage(e) {
        const statusItem = e.item;
        switch (e.kind) {
            // Show status notification
            case 0 /* StatusMessageChangeType.ADD */:
                this.doSetStatusMessage(statusItem);
                break;
            // Hide status notification (if its still the current one)
            case 1 /* StatusMessageChangeType.REMOVE */:
                if (this.currentStatusMessage && this.currentStatusMessage[0] === statusItem) {
                    dispose(this.currentStatusMessage[1]);
                    this.currentStatusMessage = undefined;
                }
                break;
        }
    }
    doSetStatusMessage(item) {
        const message = item.message;
        const showAfter = item.options && typeof item.options.showAfter === 'number' ? item.options.showAfter : 0;
        const hideAfter = item.options && typeof item.options.hideAfter === 'number' ? item.options.hideAfter : -1;
        // Dismiss any previous
        if (this.currentStatusMessage) {
            dispose(this.currentStatusMessage[1]);
        }
        // Create new
        let statusMessageEntry;
        let showHandle = setTimeout(() => {
            statusMessageEntry = this.statusbarService.addEntry({
                name: localize('status.message', 'Status Message'),
                text: message,
                ariaLabel: message,
            }, 'status.message', 0 /* StatusbarAlignment.LEFT */, Number.NEGATIVE_INFINITY /* last entry */);
            showHandle = null;
        }, showAfter);
        // Dispose function takes care of timeouts and actual entry
        let hideHandle;
        const statusMessageDispose = {
            dispose: () => {
                if (showHandle) {
                    clearTimeout(showHandle);
                }
                if (hideHandle) {
                    clearTimeout(hideHandle);
                }
                statusMessageEntry?.dispose();
            },
        };
        if (hideAfter > 0) {
            hideHandle = setTimeout(() => statusMessageDispose.dispose(), hideAfter);
        }
        // Remember as current status message
        this.currentStatusMessage = [item, statusMessageDispose];
    }
};
NotificationsStatus = __decorate([
    __param(1, IStatusbarService),
    __param(2, INotificationService)
], NotificationsStatus);
export { NotificationsStatus };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc1N0YXR1cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvbm90aWZpY2F0aW9ucy9ub3RpZmljYXRpb25zU3RhdHVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBVWhHLE9BQU8sRUFDTixpQkFBaUIsR0FJakIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ2pHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLG1CQUFtQixHQUNuQixNQUFNLDBEQUEwRCxDQUFBO0FBRTFELElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQVNsRCxZQUNrQixLQUEwQixFQUN4QixnQkFBb0QsRUFDakQsbUJBQTBEO1FBRWhGLEtBQUssRUFBRSxDQUFBO1FBSlUsVUFBSyxHQUFMLEtBQUssQ0FBcUI7UUFDUCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ2hDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFWekUsMEJBQXFCLEdBQUcsQ0FBQyxDQUFBO1FBSXpCLGlDQUE0QixHQUFZLEtBQUssQ0FBQTtRQUM3QyxpQ0FBNEIsR0FBWSxLQUFLLENBQUE7UUFTcEQsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLENBQUE7UUFFMUMsSUFBSSxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQTtR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