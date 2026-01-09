/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../base/common/event.js';
import BaseSeverity from '../../../base/common/severity.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export var Severity = BaseSeverity;
export const INotificationService = createDecorator('notificationService');
export var NotificationPriority;
(function (NotificationPriority) {
    /**
     * Default priority: notification will be visible unless do not disturb mode is enabled.
     */
    NotificationPriority[NotificationPriority["DEFAULT"] = 0] = "DEFAULT";
    /**
     * Silent priority: notification will only be visible from the notifications center.
     */
    NotificationPriority[NotificationPriority["SILENT"] = 1] = "SILENT";
    /**
     * Urgent priority: notification will be visible even when do not disturb mode is enabled.
     */
    NotificationPriority[NotificationPriority["URGENT"] = 2] = "URGENT";
})(NotificationPriority || (NotificationPriority = {}));
export var NeverShowAgainScope;
(function (NeverShowAgainScope) {
    /**
     * Will never show this notification on the current workspace again.
     */
    NeverShowAgainScope[NeverShowAgainScope["WORKSPACE"] = 0] = "WORKSPACE";
    /**
     * Will never show this notification on any workspace of the same
     * profile again.
     */
    NeverShowAgainScope[NeverShowAgainScope["PROFILE"] = 1] = "PROFILE";
    /**
     * Will never show this notification on any workspace across all
     * profiles again.
     */
    NeverShowAgainScope[NeverShowAgainScope["APPLICATION"] = 2] = "APPLICATION";
})(NeverShowAgainScope || (NeverShowAgainScope = {}));
export function isNotificationSource(thing) {
    if (thing) {
        const candidate = thing;
        return typeof candidate.id === 'string' && typeof candidate.label === 'string';
    }
    return false;
}
export var NotificationsFilter;
(function (NotificationsFilter) {
    /**
     * No filter is enabled.
     */
    NotificationsFilter[NotificationsFilter["OFF"] = 0] = "OFF";
    /**
     * All notifications are silent except error notifications.
     */
    NotificationsFilter[NotificationsFilter["ERROR"] = 1] = "ERROR";
})(NotificationsFilter || (NotificationsFilter = {}));
export class NoOpNotification {
    constructor() {
        this.progress = new NoOpProgress();
        this.onDidClose = Event.None;
        this.onDidChangeVisibility = Event.None;
    }
    updateSeverity(severity) { }
    updateMessage(message) { }
    updateActions(actions) { }
    close() { }
}
export class NoOpProgress {
    infinite() { }
    done() { }
    total(value) { }
    worked(value) { }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9ub3RpZmljYXRpb24vY29tbW9uL25vdGlmaWNhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFckQsT0FBTyxZQUFZLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRTdFLE1BQU0sS0FBUSxRQUFRLEdBQUcsWUFBWSxDQUFBO0FBRXJDLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLGVBQWUsQ0FBdUIscUJBQXFCLENBQUMsQ0FBQTtBQUloRyxNQUFNLENBQU4sSUFBWSxvQkFlWDtBQWZELFdBQVksb0JBQW9CO0lBQy9COztPQUVHO0lBQ0gscUVBQU8sQ0FBQTtJQUVQOztPQUVHO0lBQ0gsbUVBQU0sQ0FBQTtJQUVOOztPQUVHO0lBQ0gsbUVBQU0sQ0FBQTtBQUNQLENBQUMsRUFmVyxvQkFBb0IsS0FBcEIsb0JBQW9CLFFBZS9CO0FBd0JELE1BQU0sQ0FBTixJQUFZLG1CQWlCWDtBQWpCRCxXQUFZLG1CQUFtQjtJQUM5Qjs7T0FFRztJQUNILHVFQUFTLENBQUE7SUFFVDs7O09BR0c7SUFDSCxtRUFBTyxDQUFBO0lBRVA7OztPQUdHO0lBQ0gsMkVBQVcsQ0FBQTtBQUNaLENBQUMsRUFqQlcsbUJBQW1CLEtBQW5CLG1CQUFtQixRQWlCOUI7QUFrQ0QsTUFBTSxVQUFVLG9CQUFvQixDQUFDLEtBQWM7SUFDbEQsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUNYLE1BQU0sU0FBUyxHQUFHLEtBQTRCLENBQUE7UUFFOUMsT0FBTyxPQUFPLFNBQVMsQ0FBQyxFQUFFLEtBQUssUUFBUSxJQUFJLE9BQU8sU0FBUyxDQUFDLEtBQUssS0FBSyxRQUFRLENBQUE7SUFDL0UsQ0FBQztJQUVELE9BQU8sS0FBSyxDQUFBO0FBQ2IsQ0FBQztBQTZNRCxNQUFNLENBQU4sSUFBWSxtQkFVWDtBQVZELFdBQVksbUJBQW1CO0lBQzlCOztPQUVHO0lBQ0gsMkRBQUcsQ0FBQTtJQUVIOztPQUVHO0lBQ0gsK0RBQUssQ0FBQTtBQUNOLENBQUMsRUFWVyxtQkFBbUIsS0FBbkIsbUJBQW1CLFFBVTlCO0FBOEdELE1BQU0sT0FBTyxnQkFBZ0I7SUFBN0I7UUFDVSxhQUFRLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQTtRQUU3QixlQUFVLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUN2QiwwQkFBcUIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO0lBTzVDLENBQUM7SUFMQSxjQUFjLENBQUMsUUFBa0IsSUFBUyxDQUFDO0lBQzNDLGFBQWEsQ0FBQyxPQUE0QixJQUFTLENBQUM7SUFDcEQsYUFBYSxDQUFDLE9BQThCLElBQVMsQ0FBQztJQUV0RCxLQUFLLEtBQVUsQ0FBQztDQUNoQjtBQUVELE1BQU0sT0FBTyxZQUFZO0lBQ3hCLFFBQVEsS0FBVSxDQUFDO0lBQ25CLElBQUksS0FBVSxDQUFDO0lBQ2YsS0FBSyxDQUFDLEtBQWEsSUFBUyxDQUFDO0lBQzdCLE1BQU0sQ0FBQyxLQUFhLElBQVMsQ0FBQztDQUM5QiJ9