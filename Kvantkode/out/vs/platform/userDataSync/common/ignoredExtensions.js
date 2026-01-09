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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWdub3JlZEV4dGVuc2lvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vaWdub3JlZEV4dGVuc2lvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSw2Q0FBNkMsQ0FBQTtBQUVwRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFN0UsTUFBTSxDQUFDLE1BQU0sbUNBQW1DLEdBQy9DLGVBQWUsQ0FBc0MscUNBQXFDLENBQUMsQ0FBQTtBQVlyRixJQUFNLGtDQUFrQyxHQUF4QyxNQUFNLGtDQUFrQztJQUc5QyxZQUN5QyxvQkFBMkM7UUFBM0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtJQUNqRixDQUFDO0lBRUosdUJBQXVCLENBQUMsV0FBbUI7UUFDMUMsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLENBQUMsOEJBQThCLEVBQUUsQ0FBQTtRQUN6RSxPQUFPLDJCQUEyQixDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQTtJQUN2RSxDQUFDO0lBRUQsd0JBQXdCLENBQUMsV0FBbUI7UUFDM0MsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLENBQUMsOEJBQThCLEVBQUUsQ0FBQTtRQUN6RSxPQUFPLDJCQUEyQixDQUFDLFFBQVEsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDN0UsQ0FBQztJQUVELHVCQUF1QixDQUFDLGtCQUEwQixFQUFFLE1BQWU7UUFDbEUsZ0VBQWdFO1FBQ2hFLElBQUksWUFBWSxH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