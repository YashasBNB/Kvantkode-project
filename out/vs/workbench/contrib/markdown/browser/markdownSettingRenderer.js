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
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { Schemas } from '../../../../base/common/network.js';
import * as nls from '../../../../nls.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { settingKeyToDisplayFormat } from '../../preferences/browser/settingsTreeModels.js';
let SimpleSettingRenderer = class SimpleSettingRenderer {
    constructor(_configurationService, _contextMenuService, _preferencesService, _telemetryService, _clipboardService) {
        this._configurationService = _configurationService;
        this._contextMenuService = _contextMenuService;
        this._preferencesService = _preferencesService;
        this._telemetryService = _telemetryService;
        this._clipboardService = _clipboardService;
        this._updatedSettings = new Map(); // setting ID to user's original setting value
        this._encounteredSettings = new Map(); // setting ID to setting
        this._featuredSettings = new Map(); // setting ID to feature value
        this.codeSettingAnchorRegex = new RegExp(`^<a (href)=".*code.*://settings/([^\\s"]+)"(?:\\s*codesetting="([^"]+)")?>`);
        this.codeSettingSimpleRegex = new RegExp(`^setting\\(([^\\s:)]+)(?::([^)]+))?\\)$`);
    }
    get featuredSettingStates() {
        const result = new Map();
        for (const [settingId, value] of this._featuredSettings) {
            result.set(settingId, this._configurationService.getValue(settingId) === value);
        }
        return result;
    }
    replaceAnchor(raw) {
        const match = this.codeSettingAnchorRegex.exec(raw);
        if (match && match.length === 4) {
            const settingId = match[2];
            const rendered = this.render(settingId, match[3]);
            if (rendered) {
                return raw.replace(this.codeSettingAnchorRegex, rendered);
            }
        }
        return undefined;
    }
    replaceSimple(raw) {
        const match = this.codeSettingSimpleRegex.exec(raw);
        if (match && match.length === 3) {
            const settingId = match[1];
            const rendered = this.render(settingId, match[2]);
            if (rendered) {
                return raw.replace(this.codeSettingSimpleRegex, rendered);
            }
        }
        return undefined;
    }
    getHtmlRenderer() {
        return ({ raw }) => {
            const replacedAnchor = this.replaceAnchor(raw);
            if (replacedAnchor) {
                raw = replacedAnchor;
            }
            return raw;
        };
    }
    getCodeSpanRenderer() {
        return ({ text }) => {
            const replacedSimple = this.replaceSimple(text);
            if (replacedSimple) {
                return replacedSimple;
            }
            return `<code>${text}</code>`;
        };
    }
    settingToUriString(settingId, value) {
        return `${Schemas.codeSetting}://${settingId}${value ? `/${value}` : ''}`;
    }
    getSetting(settingId) {
        if (this._encounteredSettings.has(settingId)) {
            return this._encounteredSettings.get(settingId);
        }
        return this._preferencesService.getSetting(settingId);
    }
    parseValue(settingId, value) {
        if (value === 'undefined' || value === '') {
            return undefined;
        }
        const setting = this.getSetting(settingId);
        if (!setting) {
            return value;
        }
        switch (setting.type) {
            case 'boolean':
                return value === 'true';
            case 'number':
                return parseInt(value, 10);
            case 'string':
            default:
                return value;
        }
    }
    render(settingId, newValue) {
        const setting = this.getSetting(settingId);
        if (!setting) {
            return `<code>${settingId}</code>`;
        }
        return this.renderSetting(setting, newValue);
    }
    viewInSettingsMessage(settingId, alreadyDisplayed) {
        if (alreadyDisplayed) {
            return nls.localize('viewInSettings', 'View in Settings');
        }
        else {
            const displayName = settingKeyToDisplayFormat(settingId);
            return nls.localize('viewInSettingsDetailed', 'View "{0}: {1}" in Settings', displayName.category, displayName.label);
        }
    }
    restorePreviousSettingMessage(settingId) {
        const displayName = settingKeyToDisplayFormat(settingId);
        return nls.localize('restorePreviousValue', 'Restore value of "{0}: {1}"', displayName.category, displayName.label);
    }
    isAlreadySet(setting, value) {
        const currentValue = this._configurationService.getValue(setting.key);
        return currentValue === value || (currentValue === undefined && setting.value === value);
    }
    booleanSettingMessage(setting, booleanValue) {
        const displayName = settingKeyToDisplayFormat(setting.key);
        if (this.isAlreadySet(setting, booleanValue)) {
            if (booleanValue) {
                return nls.localize('alreadysetBoolTrue', '"{0}: {1}" is already enabled', displayName.category, displayName.label);
            }
            else {
                return nls.localize('alreadysetBoolFalse', '"{0}: {1}" is already disabled', displayName.category, displayName.label);
            }
        }
        if (booleanValue) {
            return nls.localize('trueMessage', 'Enable "{0}: {1}"', displayName.category, displayName.label);
        }
        else {
            return nls.localize('falseMessage', 'Disable "{0}: {1}"', displayName.category, displayName.label);
        }
    }
    stringSettingMessage(setting, stringValue) {
        const displayName = settingKeyToDisplayFormat(setting.key);
        if (this.isAlreadySet(setting, stringValue)) {
            return nls.localize('alreadysetString', '"{0}: {1}" is already set to "{2}"', displayName.category, displayName.label, stringValue);
        }
        return nls.localize('stringValue', 'Set "{0}: {1}" to "{2}"', displayName.category, displayName.label, stringValue);
    }
    numberSettingMessage(setting, numberValue) {
        const displayName = settingKeyToDisplayFormat(setting.key);
        if (this.isAlreadySet(setting, numberValue)) {
            return nls.localize('alreadysetNum', '"{0}: {1}" is already set to {2}', displayName.category, displayName.label, numberValue);
        }
        return nls.localize('numberValue', 'Set "{0}: {1}" to {2}', displayName.category, displayName.label, numberValue);
    }
    renderSetting(setting, newValue) {
        const href = this.settingToUriString(setting.key, newValue);
        const title = nls.localize('changeSettingTitle', 'View or change setting');
        return `<code tabindex="0"><a href="${href}" class="codesetting" title="${title}" aria-role="button"><svg width="14" height="14" viewBox="0 0 15 15" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M9.1 4.4L8.6 2H7.4l-.5 2.4-.7.3-2-1.3-.9.8 1.3 2-.2.7-2.4.5v1.2l2.4.5.3.8-1.3 2 .8.8 2-1.3.8.3.4 2.3h1.2l.5-2.4.8-.3 2 1.3.8-.8-1.3-2 .3-.8 2.3-.4V7.4l-2.4-.5-.3-.8 1.3-2-.8-.8-2 1.3-.7-.2zM9.4 1l.5 2.4L12 2.1l2 2-1.4 2.1 2.4.4v2.8l-2.4.5L14 12l-2 2-2.1-1.4-.5 2.4H6.6l-.5-2.4L4 13.9l-2-2 1.4-2.1L1 9.4V6.6l2.4-.5L2.1 4l2-2 2.1 1.4.4-2.4h2.8zm.6 7c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zM8 9c.6 0 1-.4 1-1s-.4-1-1-1-1 .4-1 1 .4 1 1 1z"/></svg>
			<span class="separator"></span>
			<span class="setting-name">${setting.key}</span>
		</a></code>`;
    }
    getSettingMessage(setting, newValue) {
        if (setting.type === 'boolean') {
            return this.booleanSettingMessage(setting, newValue);
        }
        else if (setting.type === 'string') {
            return this.stringSettingMessage(setting, newValue);
        }
        else if (setting.type === 'number') {
            return this.numberSettingMessage(setting, newValue);
        }
        return undefined;
    }
    async restoreSetting(settingId) {
        const userOriginalSettingValue = this._updatedSettings.get(settingId);
        this._updatedSettings.delete(settingId);
        return this._configurationService.updateValue(settingId, userOriginalSettingValue, 2 /* ConfigurationTarget.USER */);
    }
    async setSetting(settingId, currentSettingValue, newSettingValue) {
        this._updatedSettings.set(settingId, currentSettingValue);
        return this._configurationService.updateValue(settingId, newSettingValue, 2 /* ConfigurationTarget.USER */);
    }
    getActions(uri) {
        if (uri.scheme !== Schemas.codeSetting) {
            return;
        }
        const actions = [];
        const settingId = uri.authority;
        const newSettingValue = this.parseValue(uri.authority, uri.path.substring(1));
        const currentSettingValue = this._configurationService.inspect(settingId).userValue;
        if (newSettingValue !== undefined &&
            newSettingValue === currentSettingValue &&
            this._updatedSettings.has(settingId)) {
            const restoreMessage = this.restorePreviousSettingMessage(settingId);
            actions.push({
                class: undefined,
                id: 'restoreSetting',
                enabled: true,
                tooltip: restoreMessage,
                label: restoreMessage,
                run: () => {
                    return this.restoreSetting(settingId);
                },
            });
        }
        else if (newSettingValue !== undefined) {
            const setting = this.getSetting(settingId);
            const trySettingMessage = setting
                ? this.getSettingMessage(setting, newSettingValue)
                : undefined;
            if (setting && trySettingMessage) {
                actions.push({
                    class: undefined,
                    id: 'trySetting',
                    enabled: !this.isAlreadySet(setting, newSettingValue),
                    tooltip: trySettingMessage,
                    label: trySettingMessage,
                    run: () => {
                        this.setSetting(settingId, currentSettingValue, newSettingValue);
                    },
                });
            }
        }
        const viewInSettingsMessage = this.viewInSettingsMessage(settingId, actions.length > 0);
        actions.push({
            class: undefined,
            enabled: true,
            id: 'viewInSettings',
            tooltip: viewInSettingsMessage,
            label: viewInSettingsMessage,
            run: () => {
                return this._preferencesService.openApplicationSettings({ query: `@id:${settingId}` });
            },
        });
        actions.push({
            class: undefined,
            enabled: true,
            id: 'copySettingId',
            tooltip: nls.localize('copySettingId', 'Copy Setting ID'),
            label: nls.localize('copySettingId', 'Copy Setting ID'),
            run: () => {
                this._clipboardService.writeText(settingId);
            },
        });
        return actions;
    }
    showContextMenu(uri, x, y) {
        const actions = this.getActions(uri);
        if (!actions) {
            return;
        }
        this._contextMenuService.showContextMenu({
            getAnchor: () => ({ x, y }),
            getActions: () => actions,
            getActionViewItem: (action) => {
                return new ActionViewItem(action, action, { label: true });
            },
        });
    }
    async updateSetting(uri, x, y) {
        if (uri.scheme === Schemas.codeSetting) {
            this._telemetryService.publicLog2('releaseNotesSettingAction', {
                settingId: uri.authority,
            });
            return this.showContextMenu(uri, x, y);
        }
    }
};
SimpleSettingRenderer = __decorate([
    __param(0, IConfigurationService),
    __param(1, IContextMenuService),
    __param(2, IPreferencesService),
    __param(3, ITelemetryService),
    __param(4, IClipboardService)
], SimpleSettingRenderer);
export { SimpleSettingRenderer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25TZXR0aW5nUmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21hcmtkb3duL2Jyb3dzZXIvbWFya2Rvd25TZXR0aW5nUmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBR3pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUU1RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQzdGLE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsbUJBQW1CLEVBQVksTUFBTSxxREFBcUQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUVwRixJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFxQjtJQVFqQyxZQUN3QixxQkFBNkQsRUFDL0QsbUJBQXlELEVBQ3pELG1CQUF5RCxFQUMzRCxpQkFBcUQsRUFDckQsaUJBQXFEO1FBSmhDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDOUMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUN4Qyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBQzFDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDcEMsc0JBQWlC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