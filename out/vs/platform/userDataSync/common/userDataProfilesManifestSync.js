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
import { toFormattedString } from '../../../base/common/jsonFormatter.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService, } from '../../userDataProfile/common/userDataProfile.js';
import { AbstractSynchroniser, } from './abstractSynchronizer.js';
import { merge } from './userDataProfilesManifestMerge.js';
import { IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncStoreService, USER_DATA_SYNC_SCHEME, UserDataSyncError, } from './userDataSync.js';
let UserDataProfilesManifestSynchroniser = class UserDataProfilesManifestSynchroniser extends AbstractSynchroniser {
    constructor(profile, collection, userDataProfilesService, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, logService, configurationService, userDataSyncEnablementService, telemetryService, uriIdentityService) {
        super({ syncResource: "profiles" /* SyncResource.Profiles */, profile }, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService);
        this.userDataProfilesService = userDataProfilesService;
        this.version = 2;
        this.previewResource = this.extUri.joinPath(this.syncPreviewFolder, 'profiles.json');
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
        this._register(userDataProfilesService.onDidChangeProfiles(() => this.triggerLocalChange()));
    }
    async getLastSyncedProfiles() {
        const lastSyncUserData = await this.getLastSyncUserData();
        return lastSyncUserData?.syncData
            ? parseUserDataProfilesManifest(lastSyncUserData.syncData)
            : null;
    }
    async getRemoteSyncedProfiles(manifest) {
        const lastSyncUserData = await this.getLastSyncUserData();
        const remoteUserData = await this.getLatestRemoteUserData(manifest, lastSyncUserData);
        return remoteUserData?.syncData ? parseUserDataProfilesManifest(remoteUserData.syncData) : null;
    }
    async generateSyncPreview(remoteUserData, lastSyncUserData, isRemoteDataFromCurrentMachine) {
        const remoteProfiles = remoteUserData.syncData
            ? parseUserDataProfilesManifest(remoteUserData.syncData)
            : null;
        const lastSyncProfiles = lastSyncUserData?.syncData
            ? parseUserDataProfilesManifest(lastSyncUserData.syncData)
            : null;
        const localProfiles = this.getLocalUserDataProfiles();
        const { local, remote } = merge(localProfiles, remoteProfiles, lastSyncProfiles, []);
        const previewResult = {
            local,
            remote,
            content: lastSyncProfiles ? this.stringifyRemoteProfiles(lastSyncProfiles) : null,
            localChange: local.added.length > 0 || local.removed.length > 0 || local.updated.length > 0
                ? 2 /* Change.Modified */
                : 0 /* Change.None */,
            remoteChange: remote !== null ? 2 /* Change.Modified */ : 0 /* Change.None */,
        };
        const localContent = stringifyLocalProfiles(localProfiles, false);
        return [
            {
                baseResource: this.baseResource,
                baseContent: lastSyncProfiles ? this.stringifyRemoteProfiles(lastSyncProfiles) : null,
                localResource: this.localResource,
                localContent,
                remoteResource: this.remoteResource,
                remoteContent: remoteProfiles ? this.stringifyRemoteProfiles(remoteProfiles) : null,
                remoteProfiles,
                previewResource: this.previewResource,
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.acceptedResource,
            },
        ];
    }
    async hasRemoteChanged(lastSyncUserData) {
        const lastSyncProfiles = lastSyncUserData?.syncData
            ? parseUserDataProfilesManifest(lastSyncUserData.syncData)
            : null;
        const localProfiles = this.getLocalUserDataProfiles();
        const { remote } = merge(localProfiles, lastSyncProfiles, lastSyncProfiles, []);
        return !!remote?.added.length || !!remote?.removed.length || !!remote?.updated.length;
    }
    async getMergeResult(resourcePreview, token) {
        return { ...resourcePreview.previewResult, hasConflicts: false };
    }
    async getAcceptResult(resourcePreview, resource, content, token) {
        /* Accept local resource */
        if (this.extUri.isEqual(resource, this.localResource)) {
            return this.acceptLocal(resourcePreview);
        }
        /* Accept remote resource */
        if (this.extUri.isEqual(resource, this.remoteResource)) {
            return this.acceptRemote(resourcePreview);
        }
        /* Accept preview resource */
        if (this.extUri.isEqual(resource, this.previewResource)) {
            return resourcePreview.previewResult;
        }
        throw new Error(`Invalid Resource: ${resource.toString()}`);
    }
    async acceptLocal(resourcePreview) {
        const localProfiles = this.getLocalUserDataProfiles();
        const mergeResult = merge(localProfiles, null, null, []);
        const { local, remote } = mergeResult;
        return {
            content: resourcePreview.localContent,
            local,
            remote,
            localChange: local.added.length > 0 || local.removed.length > 0 || local.updated.length > 0
                ? 2 /* Change.Modified */
                : 0 /* Change.None */,
            remoteChange: remote !== null ? 2 /* Change.Modified */ : 0 /* Change.None */,
        };
    }
    async acceptRemote(resourcePreview) {
        const remoteProfiles = resourcePreview.remoteContent
            ? JSON.parse(resourcePreview.remoteContent)
            : null;
        const lastSyncProfiles = [];
        const localProfiles = [];
        for (const profile of this.getLocalUserDataProfiles()) {
            const remoteProfile = remoteProfiles?.find((remoteProfile) => remoteProfile.id === profile.id);
            if (remoteProfile) {
                lastSyncProfiles.push({
                    id: profile.id,
                    name: profile.name,
                    collection: remoteProfile.collection,
                });
                localProfiles.push(profile);
            }
        }
        if (remoteProfiles !== null) {
            const mergeResult = merge(localProfiles, remoteProfiles, lastSyncProfiles, []);
            const { local, remote } = mergeResult;
            return {
                content: resourcePreview.remoteContent,
                local,
                remote,
                localChange: local.added.length > 0 || local.removed.length > 0 || local.updated.length > 0
                    ? 2 /* Change.Modified */
                    : 0 /* Change.None */,
                remoteChange: remote !== null ? 2 /* Change.Modified */ : 0 /* Change.None */,
            };
        }
        else {
            return {
                content: resourcePreview.remoteContent,
                local: { added: [], removed: [], updated: [] },
                remote: null,
                localChange: 0 /* Change.None */,
                remoteChange: 0 /* Change.None */,
            };
        }
    }
    async applyResult(remoteUserData, lastSyncUserData, resourcePreviews, force) {
        const { local, remote, localChange, remoteChange } = resourcePreviews[0][1];
        if (localChange === 0 /* Change.None */ && remoteChange === 0 /* Change.None */) {
            this.logService.info(`${this.syncResourceLogLabel}: No changes found during synchronizing profiles.`);
        }
        const remoteProfiles = resourcePreviews[0][0].remoteProfiles || [];
        if (remoteProfiles.length + (remote?.added.length ?? 0) - (remote?.removed.length ?? 0) > 20) {
            throw new UserDataSyncError('Too many profiles to sync. Please remove some profiles and try again.', "LocalTooManyProfiles" /* UserDataSyncErrorCode.LocalTooManyProfiles */);
        }
        if (localChange !== 0 /* Change.None */) {
            await this.backupLocal(stringifyLocalProfiles(this.getLocalUserDataProfiles(), false));
            await Promise.all(local.removed.map(async (profile) => {
                this.logService.trace(`${this.syncResourceLogLabel}: Removing '${profile.name}' profile...`);
                await this.userDataProfilesService.removeProfile(profile);
                this.logService.info(`${this.syncResourceLogLabel}: Removed profile '${profile.name}'.`);
            }));
            await Promise.all(local.added.map(async (profile) => {
                this.logService.trace(`${this.syncResourceLogLabel}: Creating '${profile.name}' profile...`);
                await this.userDataProfilesService.createProfile(profile.id, profile.name, {
                    icon: profile.icon,
                    useDefaultFlags: profile.useDefaultFlags,
                });
                this.logService.info(`${this.syncResourceLogLabel}: Created profile '${profile.name}'.`);
            }));
            await Promise.all(local.updated.map(async (profile) => {
                const localProfile = this.userDataProfilesService.profiles.find((p) => p.id === profile.id);
                if (localProfile) {
                    this.logService.trace(`${this.syncResourceLogLabel}: Updating '${profile.name}' profile...`);
                    await this.userDataProfilesService.updateProfile(localProfile, {
                        name: profile.name,
                        icon: profile.icon,
                        useDefaultFlags: profile.useDefaultFlags,
                    });
                    this.logService.info(`${this.syncResourceLogLabel}: Updated profile '${profile.name}'.`);
                }
                else {
                    this.logService.info(`${this.syncResourceLogLabel}: Could not find profile with id '${profile.id}' to update.`);
                }
            }));
        }
        if (remoteChange !== 0 /* Change.None */) {
            this.logService.trace(`${this.syncResourceLogLabel}: Updating remote profiles...`);
            const addedCollections = [];
            const canAddRemoteProfiles = remoteProfiles.length + (remote?.added.length ?? 0) <= 20;
            if (canAddRemoteProfiles) {
                for (const profile of remote?.added || []) {
                    const collection = await this.userDataSyncStoreService.createCollection(this.syncHeaders);
                    addedCollections.push(collection);
                    remoteProfiles.push({
                        id: profile.id,
                        name: profile.name,
                        collection,
                        icon: profile.icon,
                        useDefaultFlags: profile.useDefaultFlags,
                    });
                }
            }
            else {
                this.logService.info(`${this.syncResourceLogLabel}: Could not create remote profiles as there are too many profiles.`);
            }
            for (const profile of remote?.removed || []) {
                remoteProfiles.splice(remoteProfiles.findIndex(({ id }) => profile.id === id), 1);
            }
            for (const profile of remote?.updated || []) {
                const profileToBeUpdated = remoteProfiles.find(({ id }) => profile.id === id);
                if (profileToBeUpdated) {
                    remoteProfiles.splice(remoteProfiles.indexOf(profileToBeUpdated), 1, {
                        ...profileToBeUpdated,
                        id: profile.id,
                        name: profile.name,
                        icon: profile.icon,
                        useDefaultFlags: profile.useDefaultFlags,
                    });
                }
            }
            try {
                remoteUserData = await this.updateRemoteProfiles(remoteProfiles, force ? null : remoteUserData.ref);
                this.logService.info(`${this.syncResourceLogLabel}: Updated remote profiles.${canAddRemoteProfiles && remote?.added.length ? ` Added: ${JSON.stringify(remote.added.map((e) => e.name))}.` : ''}${remote?.updated.length ? ` Updated: ${JSON.stringify(remote.updated.map((e) => e.name))}.` : ''}${remote?.removed.length ? ` Removed: ${JSON.stringify(remote.removed.map((e) => e.name))}.` : ''}`);
            }
            catch (error) {
                if (addedCollections.length) {
                    this.logService.info(`${this.syncResourceLogLabel}: Failed to update remote profiles. Cleaning up added collections...`);
                    for (const collection of addedCollections) {
                        await this.userDataSyncStoreService.deleteCollection(collection, this.syncHeaders);
                    }
                }
                throw error;
            }
            for (const profile of remote?.removed || []) {
                await this.userDataSyncStoreService.deleteCollection(profile.collection, this.syncHeaders);
            }
        }
        if (lastSyncUserData?.ref !== remoteUserData.ref) {
            // update last sync
            this.logService.trace(`${this.syncResourceLogLabel}: Updating last synchronized profiles...`);
            await this.updateLastSyncUserData(remoteUserData);
            this.logService.info(`${this.syncResourceLogLabel}: Updated last synchronized profiles.`);
        }
    }
    async updateRemoteProfiles(profiles, ref) {
        return this.updateRemoteUserData(this.stringifyRemoteProfiles(profiles), ref);
    }
    async hasLocalData() {
        return this.getLocalUserDataProfiles().length > 0;
    }
    async resolveContent(uri) {
        if (this.extUri.isEqual(this.remoteResource, uri) ||
            this.extUri.isEqual(this.baseResource, uri) ||
            this.extUri.isEqual(this.localResource, uri) ||
            this.extUri.isEqual(this.acceptedResource, uri)) {
            const content = await this.resolvePreviewContent(uri);
            return content ? toFormattedString(JSON.parse(content), {}) : content;
        }
        return null;
    }
    getLocalUserDataProfiles() {
        return this.userDataProfilesService.profiles.filter((p) => !p.isDefault && !p.isTransient);
    }
    stringifyRemoteProfiles(profiles) {
        return JSON.stringify([...profiles].sort((a, b) => a.name.localeCompare(b.name)));
    }
};
UserDataProfilesManifestSynchroniser = __decorate([
    __param(2, IUserDataProfilesService),
    __param(3, IFileService),
    __param(4, IEnvironmentService),
    __param(5, IStorageService),
    __param(6, IUserDataSyncStoreService),
    __param(7, IUserDataSyncLocalStoreService),
    __param(8, IUserDataSyncLogService),
    __param(9, IConfigurationService),
    __param(10, IUserDataSyncEnablementService),
    __param(11, ITelemetryService),
    __param(12, IUriIdentityService)
], UserDataProfilesManifestSynchroniser);
export { UserDataProfilesManifestSynchroniser };
export function stringifyLocalProfiles(profiles, format) {
    const result = [...profiles]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({ id: p.id, name: p.name }));
    return format ? toFormattedString(result, {}) : JSON.stringify(result);
}
export function parseUserDataProfilesManifest(syncData) {
    return JSON.parse(syncData.content);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlc01hbmlmZXN0U3luYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vdXNlckRhdGFQcm9maWxlc01hbmlmZXN0U3luYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUV6RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdFLE9BQU8sRUFFTix3QkFBd0IsR0FDeEIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sb0JBQW9CLEdBSXBCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFHTiw4QkFBOEIsRUFFOUIsdUJBQXVCLEVBQ3ZCLDhCQUE4QixFQUM5Qix5QkFBeUIsRUFFekIscUJBQXFCLEVBSXJCLGlCQUFpQixHQUVqQixNQUFNLG1CQUFtQixDQUFBO0FBb0JuQixJQUFNLG9DQUFvQyxHQUExQyxNQUFNLG9DQUNaLFNBQVEsb0JBQW9CO0lBc0I1QixZQUNDLE9BQXlCLEVBQ3pCLFVBQThCLEVBQ0osdUJBQWtFLEVBQzlFLFdBQXlCLEVB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