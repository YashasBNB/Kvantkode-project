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
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { FileOperationError, IFileService, } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IUserDataProfileService, } from '../common/userDataProfile.js';
import { updateIgnoredSettings } from '../../../../platform/userDataSync/common/settingsMerge.js';
import { IUserDataSyncUtilService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { TreeItemCollapsibleState } from '../../../common/views.js';
import { API_OPEN_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { localize } from '../../../../nls.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
let SettingsResourceInitializer = class SettingsResourceInitializer {
    constructor(userDataProfileService, fileService, logService) {
        this.userDataProfileService = userDataProfileService;
        this.fileService = fileService;
        this.logService = logService;
    }
    async initialize(content) {
        const settingsContent = JSON.parse(content);
        if (settingsContent.settings === null) {
            this.logService.info(`Initializing Profile: No settings to apply...`);
            return;
        }
        await this.fileService.writeFile(this.userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString(settingsContent.settings));
    }
};
SettingsResourceInitializer = __decorate([
    __param(0, IUserDataProfileService),
    __param(1, IFileService),
    __param(2, ILogService)
], SettingsResourceInitializer);
export { SettingsResourceInitializer };
let SettingsResource = class SettingsResource {
    constructor(fileService, userDataSyncUtilService, logService) {
        this.fileService = fileService;
        this.userDataSyncUtilService = userDataSyncUtilService;
        this.logService = logService;
    }
    async getContent(profile) {
        const settingsContent = await this.getSettingsContent(profile);
        return JSON.stringify(settingsContent);
    }
    async getSettingsContent(profile) {
        const localContent = await this.getLocalFileContent(profile);
        if (localContent === null) {
            return { settings: null };
        }
        else {
            const ignoredSettings = this.getIgnoredSettings();
            const formattingOptions = await this.userDataSyncUtilService.resolveFormattingOptions(profile.settingsResource);
            const settings = updateIgnoredSettings(localContent || '{}', '{}', ignoredSettings, formattingOptions);
            return { settings };
        }
    }
    async apply(content, profile) {
        const settingsContent = JSON.parse(content);
        if (settingsContent.settings === null) {
            this.logService.info(`Importing Profile (${profile.name}): No settings to apply...`);
            return;
        }
        const localSettingsContent = await this.getLocalFileContent(profile);
        const formattingOptions = await this.userDataSyncUtilService.resolveFormattingOptions(profile.settingsResource);
        const contentToUpdate = updateIgnoredSettings(settingsContent.settings, localSettingsContent || '{}', this.getIgnoredSettings(), formattingOptions);
        await this.fileService.writeFile(profile.settingsResource, VSBuffer.fromString(contentToUpdate));
    }
    getIgnoredSettings() {
        const allSettings = Registry.as(Extensions.Configuration).getConfigurationProperties();
        const ignoredSettings = Object.keys(allSettings).filter((key) => allSettings[key]?.scope === 2 /* ConfigurationScope.MACHINE */ ||
            allSettings[key]?.scope === 3 /* ConfigurationScope.APPLICATION_MACHINE */ ||
            allSettings[key]?.scope === 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */);
        return ignoredSettings;
    }
    async getLocalFileContent(profile) {
        try {
            const content = await this.fileService.readFile(profile.settingsResource);
            return content.value.toString();
        }
        catch (error) {
            // File not found
            if (error instanceof FileOperationError &&
                error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                return null;
            }
            else {
                throw error;
            }
        }
    }
};
SettingsResource = __decorate([
    __param(0, IFileService),
    __param(1, IUserDataSyncUtilService),
    __param(2, ILogService)
], SettingsResource);
export { SettingsResource };
let SettingsResourceTreeItem = class SettingsResourceTreeItem {
    constructor(profile, uriIdentityService, instantiationService) {
        this.profile = profile;
        this.uriIdentityService = uriIdentityService;
        this.instantiationService = instantiationService;
        this.type = "settings" /* ProfileResourceType.Settings */;
        this.handle = "settings" /* ProfileResourceType.Settings */;
        this.label = { label: localize('settings', 'Settings') };
        this.collapsibleState = TreeItemCollapsibleState.Expanded;
    }
    async getChildren() {
        return [
            {
                handle: this.profile.settingsResource.toString(),
                resourceUri: this.profile.settingsResource,
                collapsibleState: TreeItemCollapsibleState.None,
                parent: this,
                accessibilityInformation: {
                    label: this.uriIdentityService.extUri.basename(this.profile.settingsResource),
                },
                command: {
                    id: API_OPEN_EDITOR_COMMAND_ID,
                    title: '',
                    arguments: [this.profile.settingsResource, undefined, undefined],
                },
            },
        ];
    }
    async hasContent() {
        const settingsContent = await this.instantiationService
            .createInstance(SettingsResource)
            .getSettingsContent(this.profile);
        return settingsContent.settings !== null;
    }
    async getContent() {
        return this.instantiationService.createInstance(SettingsResource).getContent(this.profile);
    }
    isFromDefaultProfile() {
        return !this.profile.isDefault && !!this.profile.useDefaultFlags?.settings;
    }
};
SettingsResourceTreeItem = __decorate([
    __param(1, IUriIdentityService),
    __param(2, IInstantiationService)
], SettingsResourceTreeItem);
export { SettingsResourceTreeItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NSZXNvdXJjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVByb2ZpbGUvYnJvd3Nlci9zZXR0aW5nc1Jlc291cmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBRU4sVUFBVSxHQUVWLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUNOLGtCQUFrQixFQUVsQixZQUFZLEdBQ1osTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFLTix1QkFBdUIsR0FDdkIsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUNuRyxPQUFPLEVBQTBCLHdCQUF3QixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFLM0YsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDNUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBTXJGLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTJCO0lBQ3ZDLFlBQzJDLHNCQUErQyxFQUMxRCxXQUF5QixFQUMxQixVQUF1QjtRQUZY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