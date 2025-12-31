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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbm90aWZpY2F0aW9uL2NvbW1vbi9ub3RpZmljYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXJELE9BQU8sWUFBWSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUU3RSxNQUFNLEtBQVEsUUFBUSxHQUFHLFlBQVksQ0FBQTtBQUVyQyxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQXVCLHFCQUFxQixDQUFDLENBQUE7QUFJaEcsTUFBTSxDQUFOLElBQVksb0JBZVg7QUFmRCxXQUFZLG9CQUFvQjtJQUMvQjs7T0FFRztJQUNILHFFQUFPLENBQUE7SUFFUDs7T0FFRztJQUNILG1FQUFNLENBQUE7SUFFTjs7T0FFRztJQUNILG1FQUFNLENBQUE7QUFDUCxDQUFDLEVBZlcsb0JBQW9CLEtBQXBCLG9CQUFvQixRQWUvQjtBQXdCRCxNQUFNLENBQU4sSUFBWSxtQkFpQlg7QUFqQkQsV0FBWSxtQkFBbUI7SUFDOUI7O09BRUc7SUFDSCx1RUFBUyxDQUFBO0lBRVQ7OztPQUdHO0lBQ0gsbUVBQU8sQ0FBQTtJQUVQOzs7T0FHRztJQUNILDJFQUFXLENBQUE7QUFDWixDQUFDLEVBakJXLG1CQUFtQixLQUFuQixtQkFBbUIsUUFpQjlCO0FBa0NELE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxLQUFjO0lBQ2xELElBQUksS0FBSyxFQUFFLENBQUM7UUFDWCxNQUFNLFNBQVMsR0FBRyxLQUE0QixDQUFBO1FBRTlDLE9BQU8sT0FBTyxTQUFTLENBQUMsRUFBRSxLQUFLLFFBQVEsSUFBSSxPQUFPLFNBQVMsQ0FBQyxLQUFLLEtBQUssUUFBUSxDQUFBO0lBQy9FLENBQUM7SUFFRCxPQUFPLEtBQUssQ0FBQTtBQUNiLENBQUM7QUE2TUQsTUFBTSxDQUFOLElBQVksbUJBVVg7QUFWRCxXQUFZLG1CQUFtQjtJQUM5Qjs7T0FFRztJQUNILDJEQUFHLENBQUE7SUFFSDs7T0FFRztJQUNILCtEQUFLLENBQUE7QUFDTixDQUFDLEVBVlcsbUJBQW1CLEtBQW5CLG1CQUFtQixRQVU5QjtBQThHRCxNQUFNLE9BQU8sZ0JBQWdCO0lBQTdCO1FBQ1UsYUFBUSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUE7UUFFN0IsZUFBVSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDdkIsMEJBQXFCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtJQU81QyxDQUFDO0lBTEEsY0FBYyxDQUFDLFFBQWtCLElBQVMsQ0FBQztJQUMzQyxhQUFhLENBQUMsT0FBNEIsSUFBUyxDQUFDO0lBQ3BELGFBQWEsQ0FBQyxPQUE4QixJQUFTLENBQUM7SUFFdEQsS0FBSyxLQUFVLENBQUM7Q0FDaEI7QUFFRCxNQUFNLE9BQU8sWUFBWTtJQUN4QixRQUFRLEtBQVUsQ0FBQztJQUNuQixJQUFJLEtBQVUsQ0FBQztJQUNmLEtBQUssQ0FBQyxLQUFhLElBQVMsQ0FBQztJQUM3QixNQUFNLENBQUMsS0FBYSxJQUFTLENBQUM7Q0FDOUIifQ==