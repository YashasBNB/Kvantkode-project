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
import { distinct } from '../../../base/common/arrays.js';
import { IConfigurationService, } from '../../configuration/common/configuration.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IIgnoredExtensionsManagementService = createDecorator('IIgnoredExtensionsManagementService');
let IgnoredExtensionsManagementService = class IgnoredExtensionsManagementService {
    constructor(configurationService) {
        this.configurationService = configurationService;
    }
    hasToNeverSyncExtension(extensionId) {
        const configuredIgnoredExtensions = this.getConfiguredIgnoredExtensions();
        return configuredIgnoredExtensions.includes(extensionId.toLowerCase());
    }
    hasToAlwaysSyncExtension(extensionId) {
        const configuredIgnoredExtensions = this.getConfiguredIgnoredExtensions();
        return configuredIgnoredExtensions.includes(`-${extensionId.toLowerCase()}`);
    }
    updateIgnoredExtensions(ignoredExtensionId, ignore) {
        // first remove the extension completely from ignored extensions
        let currentValue = [
            ...this.configurationService.getValue('settingsSync.ignoredExtensions'),
        ].map((id) => id.toLowerCase());
        currentValue = currentValue.filter((v) => v !== ignoredExtensionId && v !== `-${ignoredExtensionId}`);
        // Add only if ignored
        if (ignore) {
            currentValue.push(ignoredExtensionId.toLowerCase());
        }
        return this.configurationService.updateValue('settingsSync.ignoredExtensions', currentValue.length ? currentValue : undefined, 2 /* ConfigurationTarget.USER */);
    }
    updateSynchronizedExtensions(extensionId, sync) {
        // first remove the extension completely from ignored extensions
        let currentValue = [
            ...this.configurationService.getValue('settingsSync.ignoredExtensions'),
        ].map((id) => id.toLowerCase());
        currentValue = currentValue.filter((v) => v !== extensionId && v !== `-${extensionId}`);
        // Add only if synced
        if (sync) {
            currentValue.push(`-${extensionId.toLowerCase()}`);
        }
        return this.configurationService.updateValue('settingsSync.ignoredExtensions', currentValue.length ? currentValue : undefined, 2 /* ConfigurationTarget.USER */);
    }
    getIgnoredExtensions(installed) {
        const defaultIgnoredExtensions = installed
            .filter((i) => i.isMachineScoped)
            .map((i) => i.identifier.id.toLowerCase());
        const value = this.getConfiguredIgnoredExtensions().map((id) => id.toLowerCase());
        const added = [], removed = [];
        if (Array.isArray(value)) {
            for (const key of value) {
                if (key.startsWith('-')) {
                    removed.push(key.substring(1));
                }
                else {
                    added.push(key);
                }
            }
        }
        return distinct([...defaultIgnoredExtensions, ...added].filter((setting) => !removed.includes(setting)));
    }
    getConfiguredIgnoredExtensions() {
        return (this.configurationService.getValue('settingsSync.ignoredExtensions') || []).map((id) => id.toLowerCase());
    }
};
IgnoredExtensionsManagementService = __decorate([
    __param(0, IConfigurationService)
], IgnoredExtensionsManagementService);
export { IgnoredExtensionsManagementService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWdub3JlZEV4dGVuc2lvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL2lnbm9yZWRFeHRlbnNpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sNkNBQTZDLENBQUE7QUFFcEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRTdFLE1BQU0sQ0FBQyxNQUFNLG1DQUFtQyxHQUMvQyxlQUFlLENBQXNDLHFDQUFxQyxDQUFDLENBQUE7QUFZckYsSUFBTSxrQ0FBa0MsR0FBeEMsTUFBTSxrQ0FBa0M7SUFHOUMsWUFDeUMsb0JBQTJDO1FBQTNDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7SUFDakYsQ0FBQztJQUVKLHVCQUF1QixDQUFDLFdBQW1CO1FBQzFDLE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxDQUFDLDhCQUE4QixFQUFFLENBQUE7UUFDekUsT0FBTywyQkFBMkIsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7SUFDdkUsQ0FBQztJQUVELHdCQUF3QixDQUFDLFdBQW1CO1FBQzNDLE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxDQUFDLDhCQUE4QixFQUFFLENBQUE7UUFDekUsT0FBTywyQkFBMkIsQ0FBQyxRQUFRLENBQUMsSUFBSSxXQUFXLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQzdFLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxrQkFBMEIsRUFBRSxNQUFlO1FBQ2xFLGdFQUFnRTtRQUNoRSxJQUFJLFlBQVksR0FBRztZQUNsQixHQUFHLElBQUksQ0FB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