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
import './media/notificationsActions.css';
import { localize } from '../../../../nls.js';
import { Action } from '../../../../base/common/actions.js';
import { CLEAR_NOTIFICATION, EXPAND_NOTIFICATION, COLLAPSE_NOTIFICATION, CLEAR_ALL_NOTIFICATIONS, HIDE_NOTIFICATIONS_CENTER, TOGGLE_DO_NOT_DISTURB_MODE, TOGGLE_DO_NOT_DISTURB_MODE_BY_SOURCE, } from './notificationsCommands.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
const clearIcon = registerIcon('notifications-clear', Codicon.close, localize('clearIcon', 'Icon for the clear action in notifications.'));
const clearAllIcon = registerIcon('notifications-clear-all', Codicon.clearAll, localize('clearAllIcon', 'Icon for the clear all action in notifications.'));
const hideIcon = registerIcon('notifications-hide', Codicon.chevronDown, localize('hideIcon', 'Icon for the hide action in notifications.'));
const expandIcon = registerIcon('notifications-expand', Codicon.chevronUp, localize('expandIcon', 'Icon for the expand action in notifications.'));
const collapseIcon = registerIcon('notifications-collapse', Codicon.chevronDown, localize('collapseIcon', 'Icon for the collapse action in notifications.'));
const configureIcon = registerIcon('notifications-configure', Codicon.gear, localize('configureIcon', 'Icon for the configure action in notifications.'));
const doNotDisturbIcon = registerIcon('notifications-do-not-disturb', Codicon.bellSlash, localize('doNotDisturbIcon', 'Icon for the mute all action in notifications.'));
let ClearNotificationAction = class ClearNotificationAction extends Action {
    static { this.ID = CLEAR_NOTIFICATION; }
    static { this.LABEL = localize('clearNotification', 'Clear Notification'); }
    constructor(id, label, commandService) {
        super(id, label, ThemeIcon.asClassName(clearIcon));
        this.commandService = commandService;
    }
    async run(notification) {
        this.commandService.executeCommand(CLEAR_NOTIFICATION, notification);
    }
};
ClearNotificationAction = __decorate([
    __param(2, ICommandService)
], ClearNotificationAction);
export { ClearNotificationAction };
let ClearAllNotificationsAction = class ClearAllNotificationsAction extends Action {
    static { this.ID = CLEAR_ALL_NOTIFICATIONS; }
    static { this.LABEL = localize('clearNotifications', 'Clear All Notifications'); }
    constructor(id, label, commandService) {
        super(id, label, ThemeIcon.asClassName(clearAllIcon));
        this.commandService = commandService;
    }
    async run() {
        this.commandService.executeCommand(CLEAR_ALL_NOTIFICATIONS);
    }
};
ClearAllNotificationsAction = __decorate([
    __param(2, ICommandService)
], ClearAllNotificationsAction);
export { ClearAllNotificationsAction };
let ToggleDoNotDisturbAction = class ToggleDoNotDisturbAction extends Action {
    static { this.ID = TOGGLE_DO_NOT_DISTURB_MODE; }
    static { this.LABEL = localize('toggleDoNotDisturbMode', 'Toggle Do Not Disturb Mode'); }
    constructor(id, label, commandService) {
        super(id, label, ThemeIcon.asClassName(doNotDisturbIcon));
        this.commandService = commandService;
    }
    async run() {
        this.commandService.executeCommand(TOGGLE_DO_NOT_DISTURB_MODE);
    }
};
ToggleDoNotDisturbAction = __decorate([
    __param(2, ICommandService)
], ToggleDoNotDisturbAction);
export { ToggleDoNotDisturbAction };
let ToggleDoNotDisturbBySourceAction = class ToggleDoNotDisturbBySourceAction extends Action {
    static { this.ID = TOGGLE_DO_NOT_DISTURB_MODE_BY_SOURCE; }
    static { this.LABEL = localize('toggleDoNotDisturbModeBySource', 'Toggle Do Not Disturb Mode By Source...'); }
    constructor(id, label, commandService) {
        super(id, label);
        this.commandService = commandService;
    }
    async run() {
        this.commandService.executeCommand(TOGGLE_DO_NOT_DISTURB_MODE_BY_SOURCE);
    }
};
ToggleDoNotDisturbBySourceAction = __decorate([
    __param(2, ICommandService)
], ToggleDoNotDisturbBySourceAction);
export { ToggleDoNotDisturbBySourceAction };
export class ConfigureDoNotDisturbAction extends Action {
    static { this.ID = 'workbench.action.configureDoNotDisturbMode'; }
    static { this.LABEL = localize('configureDoNotDisturbMode', 'Configure Do Not Disturb...'); }
    constructor(id, label) {
        super(id, label, ThemeIcon.asClassName(doNotDisturbIcon));
    }
}
let HideNotificationsCenterAction = class HideNotificationsCenterAction extends Action {
    static { this.ID = HIDE_NOTIFICATIONS_CENTER; }
    static { this.LABEL = localize('hideNotificationsCenter', 'Hide Notifications'); }
    constructor(id, label, commandService) {
        super(id, label, ThemeIcon.asClassName(hideIcon));
        this.commandService = commandService;
    }
    async run() {
        this.commandService.executeCommand(HIDE_NOTIFICATIONS_CENTER);
    }
};
HideNotificationsCenterAction = __decorate([
    __param(2, ICommandService)
], HideNotificationsCenterAction);
export { HideNotificationsCenterAction };
let ExpandNotificationAction = class ExpandNotificationAction extends Action {
    static { this.ID = EXPAND_NOTIFICATION; }
    static { this.LABEL = localize('expandNotification', 'Expand Notification'); }
    constructor(id, label, commandService) {
        super(id, label, ThemeIcon.asClassName(expandIcon));
        this.commandService = commandService;
    }
    async run(notification) {
        this.commandService.executeCommand(EXPAND_NOTIFICATION, notification);
    }
};
ExpandNotificationAction = __decorate([
    __param(2, ICommandService)
], ExpandNotificationAction);
export { ExpandNotificationAction };
let CollapseNotificationAction = class CollapseNotificationAction extends Action {
    static { this.ID = COLLAPSE_NOTIFICATION; }
    static { this.LABEL = localize('collapseNotification', 'Collapse Notification'); }
    constructor(id, label, commandService) {
        super(id, label, ThemeIcon.asClassName(collapseIcon));
        this.commandService = commandService;
    }
    async run(notification) {
        this.commandService.executeCommand(COLLAPSE_NOTIFICATION, notification);
    }
};
CollapseNotificationAction = __decorate([
    __param(2, ICommandService)
], CollapseNotificationAction);
export { CollapseNotificationAction };
export class ConfigureNotificationAction extends Action {
    static { this.ID = 'workbench.action.configureNotification'; }
    static { this.LABEL = localize('configureNotification', 'More Actions...'); }
    constructor(id, label, notification) {
        super(id, label, ThemeIcon.asClassName(configureIcon));
        this.notification = notification;
    }
}
let CopyNotificationMessageAction = class CopyNotificationMessageAction extends Action {
    static { this.ID = 'workbench.action.copyNotificationMessage'; }
    static { this.LABEL = localize('copyNotification', 'Copy Text'); }
    constructor(id, label, clipboardService) {
        super(id, label);
        this.clipboardService = clipboardService;
    }
    run(notification) {
        return this.clipboardService.writeText(notification.message.raw);
    }
};
CopyNotificationMessageAction = __decorate([
    __param(2, IClipboardService)
], CopyNotificationMessageAction);
export { CopyNotificationMessageAction };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL25vdGlmaWNhdGlvbnMvbm90aWZpY2F0aW9uc0FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxrQ0FBa0MsQ0FBQTtBQUV6QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNELE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsbUJBQW1CLEVBQ25CLHFCQUFxQixFQUNyQix1QkFBdUIsRUFDdkIseUJBQXlCLEVBQ3pCLDBCQUEwQixFQUMxQixvQ0FBb0MsR0FDcEMsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDN0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNoRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFaEUsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUM3QixxQkFBcUIsRUFDckIsT0FBTyxDQUFDLEtBQUssRUFDYixRQUFRLENBQUMsV0FBVyxFQUFFLDZDQUE2QyxDQUFDLENBQ3BFLENBQUE7QUFDRCxNQUFNLFlBQVksR0FBRyxZQUFZLENBQ2hDLHlCQUF5QixFQUN6QixPQUFPLENBQUMsUUFBUSxFQUNoQixRQUFRLENBQUMsY0FBYyxFQUFFLGlEQUFpRCxDQUFDLENBQzNFLENBQUE7QUFDRCxNQUFNLFFBQVEsR0FBRyxZQUFZLENBQzVCLG9CQUFvQixFQUNwQixPQUFPLENBQUMsV0FBVyxFQUNuQixRQUFRLENBQUMsVUFBVSxFQUFFLDRDQUE0QyxDQUFDLENBQ2xFLENBQUE7QUFDRCxNQUFNLFVBQVUsR0FBRyxZQUFZLENBQzlCLHNCQUFzQixFQUN0QixPQUFPLENBQUMsU0FBUyxFQUNqQixRQUFRLENBQUMsWUFBWSxFQUFFLDhDQUE4QyxDQUFDLENBQ3RFLENBQUE7QUFDRCxNQUFNLFlBQVksR0FBRyxZQUFZLENBQ2hDLHdCQUF3QixFQUN4QixPQUFPLENBQUMsV0FBVyxFQUNuQixRQUFRLENBQUMsY0FBYyxFQUFFLGdEQUFnRCxDQUFDLENBQzFFLENBQUE7QUFDRCxNQUFNLGFBQWEsR0FBRyxZQUFZLENBQ2pDLHlCQUF5QixFQUN6QixPQUFPLENBQUMsSUFBSSxFQUNaLFFBQVEsQ0FBQyxlQUFlLEVBQUUsaURBQWlELENBQUMsQ0FDNUUsQ0FBQTtBQUNELE1BQU0sZ0JBQWdCLEdBQUcsWUFBWSxDQUNwQyw4QkFBOEIsRUFDOUIsT0FBTyxDQUFDLFNBQVMsRUFDakIsUUFBUSxDQUFDLGtCQUFrQixFQUFFLGdEQUFnRCxDQUFDLENBQzlFLENBQUE7QUFFTSxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLE1BQU07YUFDbEMsT0FBRSxHQUFHLGtCQUFrQixBQUFyQixDQUFxQjthQUN2QixVQUFLLEdBQUcsUUFBUSxDQUFDLG1CQUFtQixFQUFFLG9CQUFvQixDQUFDLEFBQXRELENBQXNEO0lBRTNFLFlBQ0MsRUFBVSxFQUNWLEtBQWEsRUFDcUIsY0FBK0I7UUFFakUsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBRmhCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtJQUdsRSxDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxZQUFtQztRQUNyRCxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUNyRSxDQUFDOztBQWRXLHVCQUF1QjtJQU9qQyxXQUFBLGVBQWUsQ0FBQTtHQVBMLHVCQUF1QixDQWVuQzs7QUFFTSxJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUE0QixTQUFRLE1BQU07YUFDdEMsT0FBRSxHQUFHLHVCQUF1QixBQUExQixDQUEwQjthQUM1QixVQUFLLEdBQUcsUUFBUSxDQUFDLG9CQUFvQixFQUFFLHlCQUF5QixDQUFDLEFBQTVELENBQTREO0lBRWpGLFlBQ0MsRUFBVSxFQUNWLEtBQWEsRUFDcUIsY0FBK0I7UUFFakUsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBRm5CLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtJQUdsRSxDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUc7UUFDakIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtJQUM1RCxDQUFDOztBQWRXLDJCQUEyQjtJQU9yQyxXQUFBLGVBQWUsQ0FBQTtHQVBMLDJCQUEyQixDQWV2Qzs7QUFFTSxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLE1BQU07YUFDbkMsT0FBRSxHQUFHLDBCQUEwQixBQUE3QixDQUE2QjthQUMvQixVQUFLLEdBQUcsUUFBUSxDQUFDLHdCQUF3QixFQUFFLDRCQUE0QixDQUFDLEFBQW5FLENBQW1FO0lBRXhGLFlBQ0MsRUFBVSxFQUNWLEtBQWEsRUFDcUIsY0FBK0I7UUFFakUsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUE7UUFGdkIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO0lBR2xFLENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRztRQUNqQixJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFBO0lBQy9ELENBQUM7O0FBZFcsd0JBQXdCO0lBT2xDLFdBQUEsZUFBZSxDQUFBO0dBUEwsd0JBQXdCLENBZXBDOztBQUVNLElBQU0sZ0NBQWdDLEdBQXRDLE1BQU0sZ0NBQWlDLFNBQVEsTUFBTTthQUMzQyxPQUFFLEdBQUcsb0NBQW9DLEFBQXZDLENBQXVDO2FBQ3pDLFVBQUssR0FBRyxRQUFRLENBQy9CLGdDQUFnQyxFQUNoQyx5Q0FBeUMsQ0FDekMsQUFIb0IsQ0FHcEI7SUFFRCxZQUNDLEVBQVUsRUFDVixLQUFhLEVBQ3FCLGNBQStCO1FBRWpFLEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFGa0IsbUJBQWMsR0FBZCxjQUFjLENBQWlCO0lBR2xFLENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRztRQUNqQixJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7O0FBakJXLGdDQUFnQztJQVUxQyxXQUFBLGVBQWUsQ0FBQTtHQVZMLGdDQUFnQyxDQWtCNUM7O0FBRUQsTUFBTSxPQUFPLDJCQUE0QixTQUFRLE1BQU07YUFDdEMsT0FBRSxHQUFHLDRDQUE0QyxDQUFBO2FBQ2pELFVBQUssR0FBRyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsNkJBQTZCLENBQUMsQ0FBQTtJQUU1RixZQUFZLEVBQVUsRUFBRSxLQUFhO1FBQ3BDLEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO0lBQzFELENBQUM7O0FBR0ssSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFBOEIsU0FBUSxNQUFNO2FBQ3hDLE9BQUUsR0FBRyx5QkFBeUIsQUFBNUIsQ0FBNEI7YUFDOUIsVUFBSyxHQUFHLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxvQkFBb0IsQ0FBQyxBQUE1RCxDQUE0RDtJQUVqRixZQUNDLEVBQVUsRUFDVixLQUFhLEVBQ3FCLGNBQStCO1FBRWpFLEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUZmLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtJQUdsRSxDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUc7UUFDakIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUM5RCxDQUFDOztBQWRXLDZCQUE2QjtJQU92QyxXQUFBLGVBQWUsQ0FBQTtHQVBMLDZCQUE2QixDQWV6Qzs7QUFFTSxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLE1BQU07YUFDbkMsT0FBRSxHQUFHLG1CQUFtQixBQUF0QixDQUFzQjthQUN4QixVQUFLLEdBQUcsUUFBUSxDQUFDLG9CQUFvQixFQUFFLHFCQUFxQixDQUFDLEFBQXhELENBQXdEO0lBRTdFLFlBQ0MsRUFBVSxFQUNWLEtBQWEsRUFDcUIsY0FBK0I7UUFFakUsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBRmpCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtJQUdsRSxDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxZQUFtQztRQUNyRCxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUN0RSxDQUFDOztBQWRXLHdCQUF3QjtJQU9sQyxXQUFBLGVBQWUsQ0FBQTtHQVBMLHdCQUF3QixDQWVwQzs7QUFFTSxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEyQixTQUFRLE1BQU07YUFDckMsT0FBRSxHQUFHLHFCQUFxQixBQUF4QixDQUF3QjthQUMxQixVQUFLLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixFQUFFLHVCQUF1QixDQUFDLEFBQTVELENBQTREO0lBRWpGLFlBQ0MsRUFBVSxFQUNWLEtBQWEsRUFDcUIsY0FBK0I7UUFFakUsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBRm5CLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtJQUdsRSxDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxZQUFtQztRQUNyRCxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUN4RSxDQUFDOztBQWRXLDBCQUEwQjtJQU9wQyxXQUFBLGVBQWUsQ0FBQTtHQVBMLDBCQUEwQixDQWV0Qzs7QUFFRCxNQUFNLE9BQU8sMkJBQTRCLFNBQVEsTUFBTTthQUN0QyxPQUFFLEdBQUcsd0NBQXdDLENBQUE7YUFDN0MsVUFBSyxHQUFHLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO0lBRTVFLFlBQ0MsRUFBVSxFQUNWLEtBQWEsRUFDSixZQUFtQztRQUU1QyxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUE7UUFGN0MsaUJBQVksR0FBWixZQUFZLENBQXVCO0lBRzdDLENBQUM7O0FBR0ssSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFBOEIsU0FBUSxNQUFNO2FBQ3hDLE9BQUUsR0FBRywwQ0FBMEMsQUFBN0MsQ0FBNkM7YUFDL0MsVUFBSyxHQUFHLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxXQUFXLENBQUMsQUFBNUMsQ0FBNEM7SUFFakUsWUFDQyxFQUFVLEVBQ1YsS0FBYSxFQUN1QixnQkFBbUM7UUFFdkUsS0FBSyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUZvQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO0lBR3hFLENBQUM7SUFFUSxHQUFHLENBQUMsWUFBbUM7UUFDL0MsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDakUsQ0FBQzs7QUFkVyw2QkFBNkI7SUFPdkMsV0FBQSxpQkFBaUIsQ0FBQTtHQVBQLDZCQUE2QixDQWV6QyJ9