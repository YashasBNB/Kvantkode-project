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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9ub3RpZmljYXRpb25zL25vdGlmaWNhdGlvbnNBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sa0NBQWtDLENBQUE7QUFFekMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLG1CQUFtQixFQUNuQixxQkFBcUIsRUFDckIsdUJBQXVCLEVBQ3ZCLHlCQUF5QixFQUN6QiwwQkFBMEIsRUFDMUIsb0NBQW9DLEdBQ3BDLE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDaEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWhFLE1BQU0sU0FBUyxHQUFHLFlBQVksQ0FDN0IscUJBQXFCLEVBQ3JCLE9BQU8sQ0FBQyxLQUFLLEVBQ2IsUUFBUSxDQUFDLFdBQVcsRUFBRSw2Q0FBNkMsQ0FBQyxDQUNwRSxDQUFBO0FBQ0QsTUFBTSxZQUFZLEdBQUcsWUFBWSxDQUNoQyx5QkFBeUIsRUFDekIsT0FBTyxDQUFDLFFBQVEsRUFDaEIsUUFBUSxDQUFDLGNBQWMsRUFBRSxpREFBaUQsQ0FBQyxDQUMzRSxDQUFBO0FB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