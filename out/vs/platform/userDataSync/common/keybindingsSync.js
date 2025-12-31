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
import { isNonEmptyArray } from '../../../base/common/arrays.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { Event } from '../../../base/common/event.js';
import { parse } from '../../../base/common/json.js';
import { OS } from '../../../base/common/platform.js';
import { isUndefined } from '../../../base/common/types.js';
import { localize } from '../../../nls.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService, } from '../../userDataProfile/common/userDataProfile.js';
import { AbstractInitializer, AbstractJsonFileSynchroniser, } from './abstractSynchronizer.js';
import { merge } from './keybindingsMerge.js';
import { IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncStoreService, IUserDataSyncUtilService, UserDataSyncError, USER_DATA_SYNC_SCHEME, CONFIG_SYNC_KEYBINDINGS_PER_PLATFORM, } from './userDataSync.js';
export function getKeybindingsContentFromSyncContent(syncContent, platformSpecific, logService) {
    try {
        const parsed = JSON.parse(syncContent);
        if (!platformSpecific) {
            return isUndefined(parsed.all) ? null : parsed.all;
        }
        switch (OS) {
            case 2 /* OperatingSystem.Macintosh */:
                return isUndefined(parsed.mac) ? null : parsed.mac;
            case 3 /* OperatingSystem.Linux */:
                return isUndefined(parsed.linux) ? null : parsed.linux;
            case 1 /* OperatingSystem.Windows */:
                return isUndefined(parsed.windows) ? null : parsed.windows;
        }
    }
    catch (e) {
        logService.error(e);
        return null;
    }
}
let KeybindingsSynchroniser = class KeybindingsSynchroniser extends AbstractJsonFileSynchroniser {
    constructor(profile, collection, userDataSyncStoreService, userDataSyncLocalStoreService, logService, configurationService, userDataSyncEnablementService, fileService, environmentService, storageService, userDataSyncUtilService, telemetryService, uriIdentityService) {
        super(profile.keybindingsResource, { syncResource: "keybindings" /* SyncResource.Keybindings */, profile }, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, userDataSyncUtilService, configurationService, uriIdentityService);
        /* Version 2: Change settings from `sync.${setting}` to `settingsSync.{setting}` */
        this.version = 2;
        this.previewResource = this.extUri.joinPath(this.syncPreviewFolder, 'keybindings.json');
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
        this._register(Event.filter(configurationService.onDidChangeConfiguration, (e) => e.affectsConfiguration('settingsSync.keybindingsPerPlatform'))(() => this.triggerLocalChange()));
    }
    async generateSyncPreview(remoteUserData, lastSyncUserData, isRemoteDataFromCurrentMachine, userDataSyncConfiguration) {
        const remoteContent = remoteUserData.syncData
            ? getKeybindingsContentFromSyncContent(remoteUserData.syncData.content, userDataSyncConfiguration.keybindingsPerPlatform ?? this.syncKeybindingsPerPlatform(), this.logService)
            : null;
        // Use remote data as last sync data if last sync data does not exist and remote data is from same machine
        lastSyncUserData =
            lastSyncUserData === null && isRemoteDataFromCurrentMachine
                ? remoteUserData
                : lastSyncUserData;
        const lastSyncContent = lastSyncUserData
            ? this.getKeybindingsContentFromLastSyncUserData(lastSyncUserData)
            : null;
        // Get file content last to get the latest
        const fileContent = await this.getLocalFileContent();
        const formattingOptions = await this.getFormattingOptions();
        let mergedContent = null;
        let hasLocalChanged = false;
        let hasRemoteChanged = false;
        let hasConflicts = false;
        if (remoteContent) {
            let localContent = fileContent ? fileContent.value.toString() : '[]';
            localContent = localContent || '[]';
            if (this.hasErrors(localContent, true)) {
                throw new UserDataSyncError(localize('errorInvalidSettings', 'Unable to sync keybindings because the content in the file is not valid. Please open the file and correct it.'), "LocalInvalidContent" /* UserDataSyncErrorCode.LocalInvalidContent */, this.resource);
            }
            if (!lastSyncContent || // First time sync
                lastSyncContent !== localContent || // Local has forwarded
                lastSyncContent !== remoteContent // Remote has forwarded
            ) {
                this.logService.trace(`${this.syncResourceLogLabel}: Merging remote keybindings with local keybindings...`);
                const result = await merge(localContent, remoteContent, lastSyncContent, formattingOptions, this.userDataSyncUtilService);
                // Sync only if there are changes
                if (result.hasChanges) {
                    mergedContent = result.mergeContent;
                    hasConflicts = result.hasConflicts;
                    hasLocalChanged = hasConflicts || result.mergeContent !== localContent;
                    hasRemoteChanged = hasConflicts || result.mergeContent !== remoteContent;
                }
            }
        }
        // First time syncing to remote
        else if (fileContent) {
            this.logService.trace(`${this.syncResourceLogLabel}: Remote keybindings does not exist. Synchronizing keybindings for the first time.`);
            mergedContent = fileContent.value.toString();
            hasRemoteChanged = true;
        }
        const previewResult = {
            content: hasConflicts ? lastSyncContent : mergedContent,
            localChange: hasLocalChanged ? (fileContent ? 2 /* Change.Modified */ : 1 /* Change.Added */) : 0 /* Change.None */,
            remoteChange: hasRemoteChanged ? 2 /* Change.Modified */ : 0 /* Change.None */,
            hasConflicts,
        };
        const localContent = fileContent ? fileContent.value.toString() : null;
        return [
            {
                fileContent,
                baseResource: this.baseResource,
                baseContent: lastSyncContent,
                localResource: this.localResource,
                localContent,
                localChange: previewResult.localChange,
                remoteResource: this.remoteResource,
                remoteContent,
                remoteChange: previewResult.remoteChange,
                previewResource: this.previewResource,
                previewResult,
                acceptedResource: this.acceptedResource,
            },
        ];
    }
    async hasRemoteChanged(lastSyncUserData) {
        const lastSyncContent = this.getKeybindingsContentFromLastSyncUserData(lastSyncUserData);
        if (lastSyncContent === null) {
            return true;
        }
        const fileContent = await this.getLocalFileContent();
        const localContent = fileContent ? fileContent.value.toString() : '';
        const formattingOptions = await this.getFormattingOptions();
        const result = await merge(localContent || '[]', lastSyncContent, lastSyncContent, formattingOptions, this.userDataSyncUtilService);
        return result.hasConflicts || result.mergeContent !== lastSyncContent;
    }
    async getMergeResult(resourcePreview, token) {
        return resourcePreview.previewResult;
    }
    async getAcceptResult(resourcePreview, resource, content, token) {
        /* Accept local resource */
        if (this.extUri.isEqual(resource, this.localResource)) {
            return {
                content: resourcePreview.fileContent ? resourcePreview.fileContent.value.toString() : null,
                localChange: 0 /* Change.None */,
                remoteChange: 2 /* Change.Modified */,
            };
        }
        /* Accept remote resource */
        if (this.extUri.isEqual(resource, this.remoteResource)) {
            return {
                content: resourcePreview.remoteContent,
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
                    content,
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
            this.logService.info(`${this.syncResourceLogLabel}: No changes found during synchronizing keybindings.`);
        }
        if (content !== null) {
            content = content.trim();
            content = content || '[]';
            if (this.hasErrors(content, true)) {
                throw new UserDataSyncError(localize('errorInvalidSettings', 'Unable to sync keybindings because the content in the file is not valid. Please open the file and correct it.'), "LocalInvalidContent" /* UserDataSyncErrorCode.LocalInvalidContent */, this.resource);
            }
        }
        if (localChange !== 0 /* Change.None */) {
            this.logService.trace(`${this.syncResourceLogLabel}: Updating local keybindings...`);
            if (fileContent) {
                await this.backupLocal(this.toSyncContent(fileContent.value.toString()));
            }
            await this.updateLocalFileContent(content || '[]', fileContent, force);
            this.logService.info(`${this.syncResourceLogLabel}: Updated local keybindings`);
        }
        if (remoteChange !== 0 /* Change.None */) {
            this.logService.trace(`${this.syncResourceLogLabel}: Updating remote keybindings...`);
            const remoteContents = this.toSyncContent(content || '[]', remoteUserData.syncData?.content);
            remoteUserData = await this.updateRemoteUserData(remoteContents, force ? null : remoteUserData.ref);
            this.logService.info(`${this.syncResourceLogLabel}: Updated remote keybindings`);
        }
        // Delete the preview
        try {
            await this.fileService.del(this.previewResource);
        }
        catch (e) {
            /* ignore */
        }
        if (lastSyncUserData?.ref !== remoteUserData.ref) {
            this.logService.trace(`${this.syncResourceLogLabel}: Updating last synchronized keybindings...`);
            await this.updateLastSyncUserData(remoteUserData, {
                platformSpecific: this.syncKeybindingsPerPlatform(),
            });
            this.logService.info(`${this.syncResourceLogLabel}: Updated last synchronized keybindings`);
        }
    }
    async hasLocalData() {
        try {
            const localFileContent = await this.getLocalFileContent();
            if (localFileContent) {
                const keybindings = parse(localFileContent.value.toString());
                if (isNonEmptyArray(keybindings)) {
                    return true;
                }
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
            this.extUri.isEqual(this.baseResource, uri) ||
            this.extUri.isEqual(this.localResource, uri) ||
            this.extUri.isEqual(this.acceptedResource, uri)) {
            return this.resolvePreviewContent(uri);
        }
        return null;
    }
    getKeybindingsContentFromLastSyncUserData(lastSyncUserData) {
        if (!lastSyncUserData.syncData) {
            return null;
        }
        // Return null if there is a change in platform specific property from last time sync.
        if (lastSyncUserData.platformSpecific !== undefined &&
            lastSyncUserData.platformSpecific !== this.syncKeybindingsPerPlatform()) {
            return null;
        }
        return getKeybindingsContentFromSyncContent(lastSyncUserData.syncData.content, this.syncKeybindingsPerPlatform(), this.logService);
    }
    toSyncContent(keybindingsContent, syncContent) {
        let parsed = {};
        try {
            parsed = JSON.parse(syncContent || '{}');
        }
        catch (e) {
            this.logService.error(e);
        }
        if (this.syncKeybindingsPerPlatform()) {
            delete parsed.all;
        }
        else {
            parsed.all = keybindingsContent;
        }
        switch (OS) {
            case 2 /* OperatingSystem.Macintosh */:
                parsed.mac = keybindingsContent;
                break;
            case 3 /* OperatingSystem.Linux */:
                parsed.linux = keybindingsContent;
                break;
            case 1 /* OperatingSystem.Windows */:
                parsed.windows = keybindingsContent;
                break;
        }
        return JSON.stringify(parsed);
    }
    syncKeybindingsPerPlatform() {
        return !!this.configurationService.getValue(CONFIG_SYNC_KEYBINDINGS_PER_PLATFORM);
    }
};
KeybindingsSynchroniser = __decorate([
    __param(2, IUserDataSyncStoreService),
    __param(3, IUserDataSyncLocalStoreService),
    __param(4, IUserDataSyncLogService),
    __param(5, IConfigurationService),
    __param(6, IUserDataSyncEnablementService),
    __param(7, IFileService),
    __param(8, IEnvironmentService),
    __param(9, IStorageService),
    __param(10, IUserDataSyncUtilService),
    __param(11, ITelemetryService),
    __param(12, IUriIdentityService)
], KeybindingsSynchroniser);
export { KeybindingsSynchroniser };
let KeybindingsInitializer = class KeybindingsInitializer extends AbstractInitializer {
    constructor(fileService, userDataProfilesService, environmentService, logService, storageService, uriIdentityService) {
        super("keybindings" /* SyncResource.Keybindings */, userDataProfilesService, environmentService, logService, fileService, storageService, uriIdentityService);
    }
    async doInitialize(remoteUserData) {
        const keybindingsContent = remoteUserData.syncData
            ? this.getKeybindingsContentFromSyncContent(remoteUserData.syncData.content)
            : null;
        if (!keybindingsContent) {
            this.logService.info('Skipping initializing keybindings because remote keybindings does not exist.');
            return;
        }
        const isEmpty = await this.isEmpty();
        if (!isEmpty) {
            this.logService.info('Skipping initializing keybindings because local keybindings exist.');
            return;
        }
        await this.fileService.writeFile(this.userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(keybindingsContent));
        await this.updateLastSyncUserData(remoteUserData);
    }
    async isEmpty() {
        try {
            const fileContent = await this.fileService.readFile(this.userDataProfilesService.defaultProfile.settingsResource);
            const keybindings = parse(fileContent.value.toString());
            return !isNonEmptyArray(keybindings);
        }
        catch (error) {
            return error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */;
        }
    }
    getKeybindingsContentFromSyncContent(syncContent) {
        try {
            return getKeybindingsContentFromSyncContent(syncContent, true, this.logService);
        }
        catch (e) {
            this.logService.error(e);
            return null;
        }
    }
};
KeybindingsInitializer = __decorate([
    __param(0, IFileService),
    __param(1, IUserDataProfilesService),
    __param(2, IEnvironmentService),
    __param(3, IUserDataSyncLogService),
    __param(4, IStorageService),
    __param(5, IUriIdentityService)
], KeybindingsInitializer);
export { KeybindingsInitializer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi9rZXliaW5kaW5nc1N5bmMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3BELE9BQU8sRUFBbUIsRUFBRSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRTNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBQTJDLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRW5HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBRU4sd0JBQXdCLEdBQ3hCLE1BQU0saURBQWlELENBQUE7QUFDeEQsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiw0QkFBNEIsR0FJNUIsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVB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