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
import { VSBuffer } from '../../../base/common/buffer.js';
import { Event } from '../../../base/common/event.js';
import { localize } from '../../../nls.js';
import { IConfigurationService, } from '../../configuration/common/configuration.js';
import { ConfigurationModelParser } from '../../configuration/common/configurationModels.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IExtensionManagementService } from '../../extensionManagement/common/extensionManagement.js';
import { IFileService } from '../../files/common/files.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService, } from '../../userDataProfile/common/userDataProfile.js';
import { AbstractInitializer, AbstractJsonFileSynchroniser, } from './abstractSynchronizer.js';
import { getIgnoredSettings, isEmpty, merge, updateIgnoredSettings } from './settingsMerge.js';
import { IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncStoreService, IUserDataSyncUtilService, UserDataSyncError, USER_DATA_SYNC_CONFIGURATION_SCOPE, USER_DATA_SYNC_SCHEME, getIgnoredSettingsForExtension, } from './userDataSync.js';
function isSettingsSyncContent(thing) {
    return (thing && thing.settings && typeof thing.settings === 'string' && Object.keys(thing).length === 1);
}
export function parseSettingsSyncContent(syncContent) {
    const parsed = JSON.parse(syncContent);
    return isSettingsSyncContent(parsed) ? parsed : /* migrate */ { settings: syncContent };
}
let SettingsSynchroniser = class SettingsSynchroniser extends AbstractJsonFileSynchroniser {
    constructor(profile, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, logService, userDataSyncUtilService, configurationService, userDataSyncEnablementService, telemetryService, extensionManagementService, uriIdentityService) {
        super(profile.settingsResource, { syncResource: "settings" /* SyncResource.Settings */, profile }, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, userDataSyncUtilService, configurationService, uriIdentityService);
        this.profile = profile;
        this.extensionManagementService = extensionManagementService;
        /* Version 2: Change settings from `sync.${setting}` to `settingsSync.{setting}` */
        this.version = 2;
        this.previewResource = this.extUri.joinPath(this.syncPreviewFolder, 'settings.json');
        this.baseResource = this.previewResource.with({
            scheme: USER_DATA_SYNC_SCHEME,
            authority: 'base',
        });
        this.localResource = this.previewResource.with({
            scheme: USER_DATA_SYNC_SCHEME,
            authority: 'local',
        });
        this.remoteResource = this.previewResource.with({
            scheme: USER_DATA_SYNC_SCHEME,
            authority: 'remote',
        });
        this.acceptedResource = this.previewResource.with({
            scheme: USER_DATA_SYNC_SCHEME,
            authority: 'accepted',
        });
        this.coreIgnoredSettings = undefined;
        this.systemExtensionsIgnoredSettings = undefined;
        this.userExtensionsIgnoredSettings = undefined;
    }
    async getRemoteUserDataSyncConfiguration(manifest) {
        const lastSyncUserData = await this.getLastSyncUserData();
        const remoteUserData = await this.getLatestRemoteUserData(manifest, lastSyncUserData);
        const remoteSettingsSyncContent = this.getSettingsSyncContent(remoteUserData);
        const parser = new ConfigurationModelParser(USER_DATA_SYNC_CONFIGURATION_SCOPE, this.logService);
        if (remoteSettingsSyncContent?.settings) {
            parser.parse(remoteSettingsSyncContent.settings);
        }
        return parser.configurationModel.getValue(USER_DATA_SYNC_CONFIGURATION_SCOPE) || {};
    }
    async generateSyncPreview(remoteUserData, lastSyncUserData, isRemoteDataFromCurrentMachine) {
        const fileContent = await this.getLocalFileContent();
        const formattingOptions = await this.getFormattingOptions();
        const remoteSettingsSyncContent = this.getSettingsSyncContent(remoteUserData);
        // Use remote data as last sync data if last sync data does not exist and remote data is from same machine
        lastSyncUserData =
            lastSyncUserData === null && isRemoteDataFromCurrentMachine
                ? remoteUserData
                : lastSyncUserData;
        const lastSettingsSyncContent = lastSyncUserData
            ? this.getSettingsSyncContent(lastSyncUserData)
            : null;
        const ignoredSettings = await this.getIgnoredSettings();
        let mergedContent = null;
        let hasLocalChanged = false;
        let hasRemoteChanged = false;
        let hasConflicts = false;
        if (remoteSettingsSyncContent) {
            let localContent = fileContent ? fileContent.value.toString().trim() : '{}';
            localContent = localContent || '{}';
            this.validateContent(localContent);
            this.logService.trace(`${this.syncResourceLogLabel}: Merging remote settings with local settings...`);
            const result = merge(localContent, remoteSettingsSyncContent.settings, lastSettingsSyncContent ? lastSettingsSyncContent.settings : null, ignoredSettings, [], formattingOptions);
            mergedContent = result.localContent || result.remoteContent;
            hasLocalChanged = result.localContent !== null;
            hasRemoteChanged = result.remoteContent !== null;
            hasConflicts = result.hasConflicts;
        }
        // First time syncing to remote
        else if (fileContent) {
            this.logService.trace(`${this.syncResourceLogLabel}: Remote settings does not exist. Synchronizing settings for the first time.`);
            mergedContent = fileContent.value.toString().trim() || '{}';
            this.validateContent(mergedContent);
            hasRemoteChanged = true;
        }
        const localContent = fileContent ? fileContent.value.toString() : null;
        const baseContent = lastSettingsSyncContent?.settings ?? null;
        const previewResult = {
            content: hasConflicts ? baseContent : mergedContent,
            localChange: hasLocalChanged ? 2 /* Change.Modified */ : 0 /* Change.None */,
            remoteChange: hasRemoteChanged ? 2 /* Change.Modified */ : 0 /* Change.None */,
            hasConflicts,
        };
        return [
            {
                fileContent,
                baseResource: this.baseResource,
                baseContent,
                localResource: this.localResource,
                localContent,
                localChange: previewResult.localChange,
                remoteResource: this.remoteResource,
                remoteContent: remoteSettingsSyncContent ? remoteSettingsSyncContent.settings : null,
                remoteChange: previewResult.remoteChange,
                previewResource: this.previewResource,
                previewResult,
                acceptedResource: this.acceptedResource,
            },
        ];
    }
    async hasRemoteChanged(lastSyncUserData) {
        const lastSettingsSyncContent = this.getSettingsSyncContent(lastSyncUserData);
        if (lastSettingsSyncContent === null) {
            return true;
        }
        const fileContent = await this.getLocalFileContent();
        const localContent = fileContent ? fileContent.value.toString().trim() : '';
        const ignoredSettings = await this.getIgnoredSettings();
        const formattingOptions = await this.getFormattingOptions();
        const result = merge(localContent || '{}', lastSettingsSyncContent.settings, lastSettingsSyncContent.settings, ignoredSettings, [], formattingOptions);
        return result.remoteContent !== null;
    }
    async getMergeResult(resourcePreview, token) {
        const formatUtils = await this.getFormattingOptions();
        const ignoredSettings = await this.getIgnoredSettings();
        return {
            ...resourcePreview.previewResult,
            // remove ignored settings from the preview content
            content: resourcePreview.previewResult.content
                ? updateIgnoredSettings(resourcePreview.previewResult.content, '{}', ignoredSettings, formatUtils)
                : null,
        };
    }
    async getAcceptResult(resourcePreview, resource, content, token) {
        const formattingOptions = await this.getFormattingOptions();
        const ignoredSettings = await this.getIgnoredSettings();
        /* Accept local resource */
        if (this.extUri.isEqual(resource, this.localResource)) {
            return {
                /* Remove ignored settings */
                content: resourcePreview.fileContent
                    ? updateIgnoredSettings(resourcePreview.fileContent.value.toString(), '{}', ignoredSettings, formattingOptions)
                    : null,
                localChange: 0 /* Change.None */,
                remoteChange: 2 /* Change.Modified */,
            };
        }
        /* Accept remote resource */
        if (this.extUri.isEqual(resource, this.remoteResource)) {
            return {
                /* Update ignored settings from local file content */
                content: resourcePreview.remoteContent !== null
                    ? updateIgnoredSettings(resourcePreview.remoteContent, resourcePreview.fileContent ? resourcePreview.fileContent.value.toString() : '{}', ignoredSettings, formattingOptions)
                    : null,
                localChange: 2 /* Change.Modified */,
                remoteChange: 0 /* Change.None */,
            };
        }
        /* Accept preview resource */
        if (this.extUri.isEqual(resource, this.previewResource)) {
            if (content === undefined) {
                return {
                    content: resourcePreview.previewResult.content,
                    localChange: resourcePreview.previewResult.localChange,
                    remoteChange: resourcePreview.previewResult.remoteChange,
                };
            }
            else {
                return {
                    /* Add ignored settings from local file content */
                    content: content !== null
                        ? updateIgnoredSettings(content, resourcePreview.fileContent ? resourcePreview.fileContent.value.toString() : '{}', ignoredSettings, formattingOptions)
                        : null,
                    localChange: 2 /* Change.Modified */,
                    remoteChange: 2 /* Change.Modified */,
                };
            }
        }
        throw new Error(`Invalid Resource: ${resource.toString()}`);
    }
    async applyResult(remoteUserData, lastSyncUserData, resourcePreviews, force) {
        const { fileContent } = resourcePreviews[0][0];
        let { content, localChange, remoteChange } = resourcePreviews[0][1];
        if (localChange === 0 /* Change.None */ && remoteChange === 0 /* Change.None */) {
            this.logService.info(`${this.syncResourceLogLabel}: No changes found during synchronizing settings.`);
        }
        content = content ? content.trim() : '{}';
        content = content || '{}';
        this.validateContent(content);
        if (localChange !== 0 /* Change.None */) {
            this.logService.trace(`${this.syncResourceLogLabel}: Updating local settings...`);
            if (fileContent) {
                await this.backupLocal(JSON.stringify(this.toSettingsSyncContent(fileContent.value.toString())));
            }
            await this.updateLocalFileContent(content, fileContent, force);
            await this.configurationService.reloadConfiguration(3 /* ConfigurationTarget.USER_LOCAL */);
            this.logService.info(`${this.syncResourceLogLabel}: Updated local settings`);
        }
        if (remoteChange !== 0 /* Change.None */) {
            const formatUtils = await this.getFormattingOptions();
            // Update ignored settings from remote
            const remoteSettingsSyncContent = this.getSettingsSyncContent(remoteUserData);
            const ignoredSettings = await this.getIgnoredSettings(content);
            content = updateIgnoredSettings(content, remoteSettingsSyncContent ? remoteSettingsSyncContent.settings : '{}', ignoredSettings, formatUtils);
            this.logService.trace(`${this.syncResourceLogLabel}: Updating remote settings...`);
            remoteUserData = await this.updateRemoteUserData(JSON.stringify(this.toSettingsSyncContent(content)), force ? null : remoteUserData.ref);
            this.logService.info(`${this.syncResourceLogLabel}: Updated remote settings`);
        }
        // Delete the preview
        try {
            await this.fileService.del(this.previewResource);
        }
        catch (e) {
            /* ignore */
        }
        if (lastSyncUserData?.ref !== remoteUserData.ref) {
            this.logService.trace(`${this.syncResourceLogLabel}: Updating last synchronized settings...`);
            await this.updateLastSyncUserData(remoteUserData);
            this.logService.info(`${this.syncResourceLogLabel}: Updated last synchronized settings`);
        }
    }
    async hasLocalData() {
        try {
            const localFileContent = await this.getLocalFileContent();
            if (localFileContent) {
                return !isEmpty(localFileContent.value.toString());
            }
        }
        catch (error) {
            if (error.fileOperationResult !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                return true;
            }
        }
        return false;
    }
    async resolveContent(uri) {
        if (this.extUri.isEqual(this.remoteResource, uri) ||
            this.extUri.isEqual(this.localResource, uri) ||
            this.extUri.isEqual(this.acceptedResource, uri) ||
            this.extUri.isEqual(this.baseResource, uri)) {
            return this.resolvePreviewContent(uri);
        }
        return null;
    }
    async resolvePreviewContent(resource) {
        let content = await super.resolvePreviewContent(resource);
        if (content) {
            const formatUtils = await this.getFormattingOptions();
            // remove ignored settings from the preview content
            const ignoredSettings = await this.getIgnoredSettings();
            content = updateIgnoredSettings(content, '{}', ignoredSettings, formatUtils);
        }
        return content;
    }
    getSettingsSyncContent(remoteUserData) {
        return remoteUserData.syncData
            ? this.parseSettingsSyncContent(remoteUserData.syncData.content)
            : null;
    }
    parseSettingsSyncContent(syncContent) {
        try {
            return parseSettingsSyncContent(syncContent);
        }
        catch (e) {
            this.logService.error(e);
        }
        return null;
    }
    toSettingsSyncContent(settings) {
        return { settings };
    }
    async getIgnoredSettings(content) {
        if (!this.coreIgnoredSettings) {
            this.coreIgnoredSettings = this.userDataSyncUtilService.resolveDefaultCoreIgnoredSettings();
        }
        if (!this.systemExtensionsIgnoredSettings) {
            this.systemExtensionsIgnoredSettings = this.getIgnoredSettingForSystemExtensions();
        }
        if (!this.userExtensionsIgnoredSettings) {
            this.userExtensionsIgnoredSettings = this.getIgnoredSettingForUserExtensions();
            const disposable = this._register(Event.any(Event.filter(this.extensionManagementService.onDidInstallExtensions, (e) => e.some(({ local }) => !!local)), Event.filter(this.extensionManagementService.onDidUninstallExtension, (e) => !e.error))(() => {
                disposable.dispose();
                this.userExtensionsIgnoredSettings = undefined;
            }));
        }
        const defaultIgnoredSettings = (await Promise.all([
            this.coreIgnoredSettings,
            this.systemExtensionsIgnoredSettings,
            this.userExtensionsIgnoredSettings,
        ])).flat();
        return getIgnoredSettings(defaultIgnoredSettings, this.configurationService, content);
    }
    async getIgnoredSettingForSystemExtensions() {
        const systemExtensions = await this.extensionManagementService.getInstalled(0 /* ExtensionType.System */);
        return distinct(systemExtensions.map((e) => getIgnoredSettingsForExtension(e.manifest)).flat());
    }
    async getIgnoredSettingForUserExtensions() {
        const userExtensions = await this.extensionManagementService.getInstalled(1 /* ExtensionType.User */, this.profile.extensionsResource);
        return distinct(userExtensions.map((e) => getIgnoredSettingsForExtension(e.manifest)).flat());
    }
    validateContent(content) {
        if (this.hasErrors(content, false)) {
            throw new UserDataSyncError(localize('errorInvalidSettings', 'Unable to sync settings as there are errors/warning in settings file.'), "LocalInvalidContent" /* UserDataSyncErrorCode.LocalInvalidContent */, this.resource);
        }
    }
};
SettingsSynchroniser = __decorate([
    __param(2, IFileService),
    __param(3, IEnvironmentService),
    __param(4, IStorageService),
    __param(5, IUserDataSyncStoreService),
    __param(6, IUserDataSyncLocalStoreService),
    __param(7, IUserDataSyncLogService),
    __param(8, IUserDataSyncUtilService),
    __param(9, IConfigurationService),
    __param(10, IUserDataSyncEnablementService),
    __param(11, ITelemetryService),
    __param(12, IExtensionManagementService),
    __param(13, IUriIdentityService)
], SettingsSynchroniser);
export { SettingsSynchroniser };
let SettingsInitializer = class SettingsInitializer extends AbstractInitializer {
    constructor(fileService, userDataProfilesService, environmentService, logService, storageService, uriIdentityService) {
        super("settings" /* SyncResource.Settings */, userDataProfilesService, environmentService, logService, fileService, storageService, uriIdentityService);
    }
    async doInitialize(remoteUserData) {
        const settingsSyncContent = remoteUserData.syncData
            ? this.parseSettingsSyncContent(remoteUserData.syncData.content)
            : null;
        if (!settingsSyncContent) {
            this.logService.info('Skipping initializing settings because remote settings does not exist.');
            return;
        }
        const isEmpty = await this.isEmpty();
        if (!isEmpty) {
            this.logService.info('Skipping initializing settings because local settings exist.');
            return;
        }
        await this.fileService.writeFile(this.userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(settingsSyncContent.settings));
        await this.updateLastSyncUserData(remoteUserData);
    }
    async isEmpty() {
        try {
            const fileContent = await this.fileService.readFile(this.userDataProfilesService.defaultProfile.settingsResource);
            return isEmpty(fileContent.value.toString().trim());
        }
        catch (error) {
            return error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */;
        }
    }
    parseSettingsSyncContent(syncContent) {
        try {
            return parseSettingsSyncContent(syncContent);
        }
        catch (e) {
            this.logService.error(e);
        }
        return null;
    }
};
SettingsInitializer = __decorate([
    __param(0, IFileService),
    __param(1, IUserDataProfilesService),
    __param(2, IEnvironmentService),
    __param(3, IUserDataSyncLogService),
    __param(4, IStorageService),
    __param(5, IUriIdentityService)
], SettingsInitializer);
export { SettingsInitializer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi9zZXR0aW5nc1N5bmMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUVyRyxPQUFPLEVBQTJDLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBRU4sd0JBQXdCLEdBQ3hCLE1BQU0saURBQWlELENBQUE7QUFDeEQsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiw0QkFBNEIsR0FJNUIsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxxQkFBcUIsRUFB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