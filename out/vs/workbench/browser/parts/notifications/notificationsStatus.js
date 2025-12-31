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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc1N0YXR1cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL25vdGlmaWNhdGlvbnMvbm90aWZpY2F0aW9uc1N0YXR1cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQVVoRyxPQUFPLEVBQ04saUJBQWlCLEdBSWpCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBZSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN2RixPQUFPLEVBQUUseUJBQXlCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixtQkFBbUIsR0FDbkIsTUFBTSwwREFBMEQsQ0FBQTtBQUUxRCxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7SUFTbEQsWUFDa0IsS0FBMEIsRUFDeEIsZ0JBQW9ELEVBQ2pELG1CQUEwRDtRQUVoRixLQUFLLEVBQUUsQ0FBQTtRQUpVLFVBQUssR0FBTCxLQUFLLENBQXFCO1FBQ1AscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUNoQyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXNCO1FBVnpFLDBCQUFxQixHQUFHLENBQUMsQ0FBQTtRQUl6QixpQ0FBNEIsR0FBWSxLQUFLLENBQUE7UUFDN0MsaUNBQTRCLEdBQVksS0FBSyxDQUFBO1FBU3BELElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxDQUFBO1FBRTFDLElBQUksS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDN0Ms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