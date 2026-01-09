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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NSZXNvdXJjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VzZXJEYXRhUHJvZmlsZS9icm93c2VyL3NldHRpbmdzUmVzb3VyY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFFTixVQUFVLEdBRVYsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sa0JBQWtCLEVBRWxCLFlBQVksR0FDWixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUtOLHVCQUF1QixHQUN2QixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ25HLE9BQU8sRUFBMEIsd0JBQXdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUszRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFNckYsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBMkI7SUFDdkMsWUFDMkMsc0JBQStDLEVBQzFE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