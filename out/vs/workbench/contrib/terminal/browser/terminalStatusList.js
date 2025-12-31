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
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import Severity from '../../../../base/common/severity.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { listErrorForeground, listWarningForeground, } from '../../../../platform/theme/common/colorRegistry.js';
import { spinningLoading } from '../../../../platform/theme/common/iconRegistry.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { mainWindow } from '../../../../base/browser/window.js';
/**
 * The set of _internal_ terminal statuses, other components building on the terminal should put
 * their statuses within their component.
 */
export var TerminalStatus;
(function (TerminalStatus) {
    TerminalStatus["Bell"] = "bell";
    TerminalStatus["Disconnected"] = "disconnected";
    TerminalStatus["RelaunchNeeded"] = "relaunch-needed";
    TerminalStatus["EnvironmentVariableInfoChangesActive"] = "env-var-info-changes-active";
    TerminalStatus["ShellIntegrationInfo"] = "shell-integration-info";
    TerminalStatus["ShellIntegrationAttentionNeeded"] = "shell-integration-attention-needed";
})(TerminalStatus || (TerminalStatus = {}));
let TerminalStatusList = class TerminalStatusList extends Disposable {
    get onDidAddStatus() {
        return this._onDidAddStatus.event;
    }
    get onDidRemoveStatus() {
        return this._onDidRemoveStatus.event;
    }
    get onDidChangePrimaryStatus() {
        return this._onDidChangePrimaryStatus.event;
    }
    constructor(_configurationService) {
        super();
        this._configurationService = _configurationService;
        this._statuses = new Map();
        this._statusTimeouts = new Map();
        this._onDidAddStatus = this._register(new Emitter());
        this._onDidRemoveStatus = this._register(new Emitter());
        this._onDidChangePrimaryStatus = this._register(new Emitter());
    }
    get primary() {
        let result;
        for (const s of this._statuses.values()) {
            if (!result || s.severity >= result.severity) {
                if (s.icon || !result?.icon) {
                    result = s;
                }
            }
        }
        return result;
    }
    get statuses() {
        return Array.from(this._statuses.values());
    }
    add(status, duration) {
        status = this._applyAnimationSetting(status);
        const outTimeout = this._statusTimeouts.get(status.id);
        if (outTimeout) {
            mainWindow.clearTimeout(outTimeout);
            this._statusTimeouts.delete(status.id);
        }
        if (duration && duration > 0) {
            const timeout = mainWindow.setTimeout(() => this.remove(status), duration);
            this._statusTimeouts.set(status.id, timeout);
        }
        const existingStatus = this._statuses.get(status.id);
        if (existingStatus && existingStatus !== status) {
            this._onDidRemoveStatus.fire(existingStatus);
            this._statuses.delete(existingStatus.id);
        }
        if (!this._statuses.has(status.id)) {
            const oldPrimary = this.primary;
            this._statuses.set(status.id, status);
            this._onDidAddStatus.fire(status);
            const newPrimary = this.primary;
            if (oldPrimary !== newPrimary) {
                this._onDidChangePrimaryStatus.fire(newPrimary);
            }
        }
    }
    remove(statusOrId) {
        const status = typeof statusOrId === 'string' ? this._statuses.get(statusOrId) : statusOrId;
        // Verify the status is the same as the one passed in
        if (status && this._statuses.get(status.id)) {
            const wasPrimary = this.primary?.id === status.id;
            this._statuses.delete(status.id);
            this._onDidRemoveStatus.fire(status);
            if (wasPrimary) {
                this._onDidChangePrimaryStatus.fire(this.primary);
            }
        }
    }
    toggle(status, value) {
        if (value) {
            this.add(status);
        }
        else {
            this.remove(status);
        }
    }
    _applyAnimationSetting(status) {
        if (!status.icon ||
            ThemeIcon.getModifier(status.icon) !== 'spin' ||
            this._configurationService.getValue("terminal.integrated.tabs.enableAnimation" /* TerminalSettingId.TabsEnableAnimation */)) {
            return status;
        }
        let icon;
        // Loading without animation is just a curved line that doesn't mean anything
        if (status.icon.id === spinningLoading.id) {
            icon = Codicon.play;
        }
        else {
            icon = ThemeIcon.modify(status.icon, undefined);
        }
        // Clone the status when changing the icon so that setting changes are applied without a
        // reload being needed
        return {
            ...status,
            icon,
        };
    }
};
TerminalStatusList = __decorate([
    __param(0, IConfigurationService)
], TerminalStatusList);
export { TerminalStatusList };
export function getColorForSeverity(severity) {
    switch (severity) {
        case Severity.Error:
            return listErrorForeground;
        case Severity.Warning:
            return listWarningForeground;
        default:
            return '';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdGF0dXNMaXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbFN0YXR1c0xpc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixxQkFBcUIsR0FDckIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDbkYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWhFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUvRDs7O0dBR0c7QUFDSCxNQUFNLENBQU4sSUFBa0IsY0FPakI7QUFQRCxXQUFrQixjQUFjO0lBQy9CLCtCQUFhLENBQUE7SUFDYiwrQ0FBNkIsQ0FBQTtJQUM3QixvREFBa0MsQ0FBQTtJQUNsQyxzRkFBb0UsQ0FBQTtJQUNwRSxpRUFBK0MsQ0FBQTtJQUMvQyx3RkFBc0UsQ0FBQTtBQUN2RSxDQUFDLEVBUGlCLGNBQWMsS0FBZCxjQUFjLFFBTy9CO0FBeUJNLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsVUFBVTtJQUtqRCxJQUFJLGNBQWM7UUFDakIsT0FBTyxJQUFJLENB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