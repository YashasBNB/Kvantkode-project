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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25TZXR0aW5nUmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tYXJrZG93bi9icm93c2VyL21hcmtkb3duU2V0dGluZ1JlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUd6RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFNUQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM3RixPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLG1CQUFtQixFQUFZLE1BQU0scURBQXFELENBQUE7QUFDbkcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFFcEYsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBcUI7SUFRakMsWUFDd0IscUJBQTZELEVBQy9ELG1CQUF5RCxFQUN6RCxtQkFBeUQsRUFDM0QsaUJBQXFELEVBQ3JELGlCQUFxRDtRQUpoQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQzlDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFDeEMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUMxQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQ3BDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFU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