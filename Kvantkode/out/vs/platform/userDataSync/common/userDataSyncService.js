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
import { equals } from '../../../base/common/arrays.js';
import { createCancelablePromise, RunOnceScheduler, } from '../../../base/common/async.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../base/common/lifecycle.js';
import { isEqual } from '../../../base/common/resources.js';
import { isBoolean, isUndefined } from '../../../base/common/types.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IExtensionGalleryService } from '../../extensionManagement/common/extensionManagement.js';
import { IFileService } from '../../files/common/files.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUserDataProfilesService, } from '../../userDataProfile/common/userDataProfile.js';
import { ExtensionsSynchroniser } from './extensionsSync.js';
import { GlobalStateSynchroniser } from './globalStateSync.js';
import { KeybindingsSynchroniser } from './keybindingsSync.js';
import { PromptsSynchronizer } from './promptsSync/promptsSync.js';
import { SettingsSynchroniser } from './settingsSync.js';
import { SnippetsSynchroniser } from './snippetsSync.js';
import { TasksSynchroniser } from './tasksSync.js';
import { UserDataProfilesManifestSynchroniser } from './userDataProfilesManifestSync.js';
import { ALL_SYNC_RESOURCES, createSyncHeaders, IUserDataSyncEnablementService, IUserDataSyncLogService, IUserDataSyncStoreManagementService, IUserDataSyncStoreService, UserDataSyncError, UserDataSyncStoreError, USER_DATA_SYNC_CONFIGURATION_SCOPE, IUserDataSyncResourceProviderService, IUserDataSyncLocalStoreService, } from './userDataSync.js';
const LAST_SYNC_TIME_KEY = 'sync.lastSyncTime';
let UserDataSyncService = class UserDataSyncService extends Disposable {
    get status() {
        return this._status;
    }
    get conflicts() {
        return this._conflicts;
    }
    get lastSyncTime() {
        return this._lastSyncTime;
    }
    constructor(fileService, userDataSyncStoreService, userDataSyncStoreManagementService, instantiationService, logService, telemetryService, storageService, userDataSyncEnablementService, userDataProfilesService, userDataSyncResourceProviderService, userDataSyncLocalStoreService) {
        super();
        this.fileService = fileService;
        this.userDataSyncStoreService = userDataSyncStoreService;
        this.userDataSyncStoreManagementService = userDataSyncStoreManagementService;
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.telemetryService = telemetryService;
        this.storageService = storageService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.userDataProfilesService = userDataProfilesService;
        this.userDataSyncResourceProviderService = userDataSyncResourceProviderService;
        this.userDataSyncLocalStoreService = userDataSyncLocalStoreService;
        this._status = "uninitialized" /* SyncStatus.Uninitialized */;
        this._onDidChangeStatus = this._register(new Emitter());
        this.onDidChangeStatus = this._onDidChangeStatus.event;
        this._onDidChangeLocal = this._register(new Emitter());
        this.onDidChangeLocal = this._onDidChangeLocal.event;
        this._conflicts = [];
        this._onDidChangeConflicts = this._register(new Emitter());
        this.onDidChangeConflicts = this._onDidChangeConflicts.event;
        this._syncErrors = [];
        this._onSyncErrors = this._register(new Emitter());
        this.onSyncErrors = this._onSyncErrors.event;
        this._lastSyncTime = undefined;
        this._onDidChangeLastSyncTime = this._register(new Emitter());
        this.onDidChangeLastSyncTime = this._onDidChangeLastSyncTime.event;
        this._onDidResetLocal = this._register(new Emitter());
        this.onDidResetLocal = this._onDidResetLocal.event;
        this._onDidResetRemote = this._register(new Emitter());
        this.onDidResetRemote = this._onDidResetRemote.event;
        this.activeProfileSynchronizers = new Map();
        this._status = userDataSyncStoreManagementService.userDataSyncStore
            ? "idle" /* SyncStatus.Idle */
            : "uninitialized" /* SyncStatus.Uninitialized */;
        this._lastSyncTime = this.storageService.getNumber(LAST_SYNC_TIME_KEY, -1 /* StorageScope.APPLICATION */, undefined);
        this._register(toDisposable(() => this.clearActiveProfileSynchronizers()));
        this._register(new RunOnceScheduler(() => this.cleanUpStaleStorageData(), 5 * 1000 /* after 5s */)).schedule();
    }
    async createSyncTask(manifest, disableCache) {
        this.checkEnablement();
        this.logService.info('Sync started.');
        const startTime = new Date().getTime();
        const executionId = generateUuid();
        try {
            const syncHeaders = createSyncHeaders(executionId);
            if (disableCache) {
                syncHeaders['Cache-Control'] = 'no-cache';
            }
            manifest = await this.userDataSyncStoreService.manifest(manifest, syncHeaders);
        }
        catch (error) {
            const userDataSyncError = UserDataSyncError.toUserDataSyncError(error);
            reportUserDataSyncError(userDataSyncError, executionId, this.userDataSyncStoreManagementService, this.telemetryService);
            throw userDataSyncError;
        }
        const executed = false;
        const that = this;
        let cancellablePromise;
        return {
            manifest,
            async run() {
                if (executed) {
                    throw new Error('Can run a task only once');
                }
                cancellablePromise = createCancelablePromise((token) => that.sync(manifest, false, executionId, token));
                await cancellablePromise.finally(() => (cancellablePromise = undefined));
                that.logService.info(`Sync done. Took ${new Date().getTime() - startTime}ms`);
                that.updateLastSyncTime();
            },
            stop() {
                cancellablePromise?.cancel();
                return that.stop();
            },
        };
    }
    async createManualSyncTask() {
        this.checkEnablement();
        if (this.userDataSyncEnablementService.isEnabled()) {
            throw new UserDataSyncError('Cannot start manual sync when sync is enabled', "LocalError" /* UserDataSyncErrorCode.LocalError */);
        }
        this.logService.info('Sync started.');
        const startTime = new Date().getTime();
        const executionId = generateUuid();
        const syncHeaders = createSyncHeaders(executionId);
        let manifest;
        try {
            manifest = await this.userDataSyncStoreService.manifest(null, syncHeaders);
        }
        catch (error) {
            const userDataSyncError = UserDataSyncError.toUserDataSyncError(error);
            reportUserDataSyncError(userDataSyncError, executionId, this.userDataSyncStoreManagementService, this.telemetryService);
            throw userDataSyncError;
        }
        /* Manual sync shall start on clean local state */
        await this.resetLocal();
        const that = this;
        const cancellableToken = new CancellationTokenSource();
        return {
            id: executionId,
            async merge() {
                return that.sync(manifest, true, executionId, cancellableToken.token);
            },
            async apply() {
                try {
                    try {
                        await that.applyManualSync(manifest, executionId, cancellableToken.token);
                    }
                    catch (error) {
                        if (UserDataSyncError.toUserDataSyncError(error).code ===
                            "MethodNotFound" /* UserDataSyncErrorCode.MethodNotFound */) {
                            that.logService.info('Client is making invalid requests. Cleaning up data...');
                            await that.cleanUpRemoteData();
                            that.logService.info('Applying manual sync again...');
                            await that.applyManualSync(manifest, executionId, cancellableToken.token);
                        }
                        else {
                            throw error;
                        }
                    }
                }
                catch (error) {
                    that.logService.error(error);
                    throw error;
                }
                that.logService.info(`Sync done. Took ${new Date().getTime() - startTime}ms`);
                that.updateLastSyncTime();
            },
            async stop() {
                cancellableToken.cancel();
                await that.stop();
                await that.resetLocal();
            },
        };
    }
    async sync(manifest, preview, executionId, token) {
        this._syncErrors = [];
        try {
            if (this.status !== "hasConflicts" /* SyncStatus.HasConflicts */) {
                this.setStatus("syncing" /* SyncStatus.Syncing */);
            }
            // Sync Default Profile First
            const defaultProfileSynchronizer = this.getOrCreateActiveProfileSynchronizer(this.userDataProfilesService.defaultProfile, undefined);
            this._syncErrors.push(...(await this.syncProfile(defaultProfileSynchronizer, manifest, preview, executionId, token)));
            // Sync other profiles
            const userDataProfileManifestSynchronizer = defaultProfileSynchronizer.enabled.find((s) => s.resource === "profiles" /* SyncResource.Profiles */);
            if (userDataProfileManifestSynchronizer) {
                const syncProfiles = (await userDataProfileManifestSynchronizer.getLastSyncedProfiles()) || [];
                if (token.isCancellationRequested) {
                    return;
                }
                await this.syncRemoteProfiles(syncProfiles, manifest, preview, executionId, token);
            }
        }
        finally {
            if (this.status !== "hasConflicts" /* SyncStatus.HasConflicts */) {
                this.setStatus("idle" /* SyncStatus.Idle */);
            }
            this._onSyncErrors.fire(this._syncErrors);
        }
    }
    async syncRemoteProfiles(remoteProfiles, manifest, preview, executionId, token) {
        for (const syncProfile of remoteProfiles) {
            if (token.isCancellationRequested) {
                return;
            }
            const profile = this.userDataProfilesService.profiles.find((p) => p.id === syncProfile.id);
            if (!profile) {
                this.logService.error(`Profile with id:${syncProfile.id} and name: ${syncProfile.name} does not exist locally to sync.`);
                continue;
            }
            this.logService.info('Syncing profile.', syncProfile.name);
            const profileSynchronizer = this.getOrCreateActiveProfileSynchronizer(profile, syncProfile);
            this._syncErrors.push(...(await this.syncProfile(profileSynchronizer, manifest, preview, executionId, token)));
        }
        // Dispose & Delete profile synchronizers which do not exist anymore
        for (const [key, profileSynchronizerItem] of this.activeProfileSynchronizers.entries()) {
            if (this.userDataProfilesService.profiles.some((p) => p.id === profileSynchronizerItem[0].profile.id)) {
                continue;
            }
            await profileSynchronizerItem[0].resetLocal();
            profileSynchronizerItem[1].dispose();
            this.activeProfileSynchronizers.delete(key);
        }
    }
    async applyManualSync(manifest, executionId, token) {
        try {
            this.setStatus("syncing" /* SyncStatus.Syncing */);
            const profileSynchronizers = this.getActiveProfileSynchronizers();
            for (const profileSynchronizer of profileSynchronizers) {
                if (token.isCancellationRequested) {
                    return;
                }
                await profileSynchronizer.apply(executionId, token);
            }
            const defaultProfileSynchronizer = profileSynchronizers.find((s) => s.profile.isDefault);
            if (!defaultProfileSynchronizer) {
                return;
            }
            const userDataProfileManifestSynchronizer = defaultProfileSynchronizer.enabled.find((s) => s.resource === "profiles" /* SyncResource.Profiles */);
            if (!userDataProfileManifestSynchronizer) {
                return;
            }
            // Sync remote profiles which are not synced locally
            const remoteProfiles = (await userDataProfileManifestSynchronizer.getRemoteSyncedProfiles(manifest?.latest ?? null)) || [];
            const remoteProfilesToSync = remoteProfiles.filter((remoteProfile) => profileSynchronizers.every((s) => s.profile.id !== remoteProfile.id));
            if (remoteProfilesToSync.length) {
                await this.syncRemoteProfiles(remoteProfilesToSync, manifest, false, executionId, token);
            }
        }
        finally {
            this.setStatus("idle" /* SyncStatus.Idle */);
        }
    }
    async syncProfile(profileSynchronizer, manifest, preview, executionId, token) {
        const errors = await profileSynchronizer.sync(manifest, preview, executionId, token);
        return errors.map(([syncResource, error]) => ({
            profile: profileSynchronizer.profile,
            syncResource,
            error,
        }));
    }
    async stop() {
        if (this.status !== "idle" /* SyncStatus.Idle */) {
            await Promise.allSettled(this.getActiveProfileSynchronizers().map((profileSynchronizer) => profileSynchronizer.stop()));
        }
    }
    async resolveContent(resource) {
        const content = await this.userDataSyncResourceProviderService.resolveContent(resource);
        if (content) {
            return content;
        }
        for (const profileSynchronizer of this.getActiveProfileSynchronizers()) {
            for (const synchronizer of profileSynchronizer.enabled) {
                const content = await synchronizer.resolveContent(resource);
                if (content) {
                    return content;
                }
            }
        }
        return null;
    }
    async replace(syncResourceHandle) {
        this.checkEnablement();
        const profileSyncResource = this.userDataSyncResourceProviderService.resolveUserDataSyncResource(syncResourceHandle);
        if (!profileSyncResource) {
            return;
        }
        const content = await this.resolveContent(syncResourceHandle.uri);
        if (!content) {
            return;
        }
        await this.performAction(profileSyncResource.profile, async (synchronizer) => {
            if (profileSyncResource.syncResource === synchronizer.resource) {
                await synchronizer.replace(content);
                return true;
            }
            return undefined;
        });
        return;
    }
    async accept(syncResource, resource, content, apply) {
        this.checkEnablement();
        await this.performAction(syncResource.profile, async (synchronizer) => {
            if (syncResource.syncResource === synchronizer.resource) {
                await synchronizer.accept(resource, content);
                if (apply) {
                    await synchronizer.apply(isBoolean(apply) ? false : apply.force, createSyncHeaders(generateUuid()));
                }
                return true;
            }
            return undefined;
        });
    }
    async hasLocalData() {
        const result = await this.performAction(this.userDataProfilesService.defaultProfile, async (synchronizer) => {
            // skip global state synchronizer
            if (synchronizer.resource !== "globalState" /* SyncResource.GlobalState */ &&
                (await synchronizer.hasLocalData())) {
                return true;
            }
            return undefined;
        });
        return !!result;
    }
    async hasPreviouslySynced() {
        const result = await this.performAction(this.userDataProfilesService.defaultProfile, async (synchronizer) => {
            if (await synchronizer.hasPreviouslySynced()) {
                return true;
            }
            return undefined;
        });
        return !!result;
    }
    async reset() {
        this.checkEnablement();
        await this.resetRemote();
        await this.resetLocal();
    }
    async resetRemote() {
        this.checkEnablement();
        try {
            await this.userDataSyncStoreService.clear();
            this.logService.info('Cleared data on server');
        }
        catch (e) {
            this.logService.error(e);
        }
        this._onDidResetRemote.fire();
    }
    async resetLocal() {
        this.checkEnablement();
        this._lastSyncTime = undefined;
        this.storageService.remove(LAST_SYNC_TIME_KEY, -1 /* StorageScope.APPLICATION */);
        for (const [synchronizer] of this.activeProfileSynchronizers.values()) {
            try {
                await synchronizer.resetLocal();
            }
            catch (e) {
                this.logService.error(e);
            }
        }
        this.clearActiveProfileSynchronizers();
        this._onDidResetLocal.fire();
        this.logService.info('Did reset the local sync state.');
    }
    async cleanUpStaleStorageData() {
        const allKeys = this.storageService.keys(-1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        const lastSyncProfileKeys = [];
        for (const key of allKeys) {
            if (!key.endsWith('.lastSyncUserData')) {
                continue;
            }
            const segments = key.split('.');
            if (segments.length === 3) {
                lastSyncProfileKeys.push([key, segments[0]]);
            }
        }
        if (!lastSyncProfileKeys.length) {
            return;
        }
        const disposables = new DisposableStore();
        try {
            let defaultProfileSynchronizer = this.activeProfileSynchronizers.get(this.userDataProfilesService.defaultProfile.id)?.[0];
            if (!defaultProfileSynchronizer) {
                defaultProfileSynchronizer = disposables.add(this.instantiationService.createInstance(ProfileSynchronizer, this.userDataProfilesService.defaultProfile, undefined));
            }
            const userDataProfileManifestSynchronizer = defaultProfileSynchronizer.enabled.find((s) => s.resource === "profiles" /* SyncResource.Profiles */);
            if (!userDataProfileManifestSynchronizer) {
                return;
            }
            const lastSyncedProfiles = await userDataProfileManifestSynchronizer.getLastSyncedProfiles();
            const lastSyncedCollections = lastSyncedProfiles?.map((p) => p.collection) ?? [];
            for (const [key, collection] of lastSyncProfileKeys) {
                if (!lastSyncedCollections.includes(collection)) {
                    this.logService.info(`Removing last sync state for stale profile: ${collection}`);
                    this.storageService.remove(key, -1 /* StorageScope.APPLICATION */);
                }
            }
        }
        finally {
            disposables.dispose();
        }
    }
    async cleanUpRemoteData() {
        const remoteProfiles = await this.userDataSyncResourceProviderService.getRemoteSyncedProfiles();
        const remoteProfileCollections = remoteProfiles.map((profile) => profile.collection);
        const allCollections = await this.userDataSyncStoreService.getAllCollections();
        const redundantCollections = allCollections.filter((c) => !remoteProfileCollections.includes(c));
        if (redundantCollections.length) {
            this.logService.info(`Deleting ${redundantCollections.length} redundant collections on server`);
            await Promise.allSettled(redundantCollections.map((collectionId) => this.userDataSyncStoreService.deleteCollection(collectionId)));
            this.logService.info(`Deleted redundant collections on server`);
        }
        const updatedRemoteProfiles = remoteProfiles.filter((profile) => allCollections.includes(profile.collection));
        if (updatedRemoteProfiles.length !== remoteProfiles.length) {
            const profileManifestSynchronizer = this.instantiationService.createInstance(UserDataProfilesManifestSynchroniser, this.userDataProfilesService.defaultProfile, undefined);
            try {
                this.logService.info('Resetting the last synced state of profiles');
                await profileManifestSynchronizer.resetLocal();
                this.logService.info('Did reset the last synced state of profiles');
                this.logService.info(`Updating remote profiles with invalid collections on server`);
                await profileManifestSynchronizer.updateRemoteProfiles(updatedRemoteProfiles, null);
                this.logService.info(`Updated remote profiles on server`);
            }
            finally {
                profileManifestSynchronizer.dispose();
            }
        }
    }
    async saveRemoteActivityData(location) {
        this.checkEnablement();
        const data = await this.userDataSyncStoreService.getActivityData();
        await this.fileService.writeFile(location, data);
    }
    async extractActivityData(activityDataResource, location) {
        const content = (await this.fileService.readFile(activityDataResource)).value.toString();
        const activityData = JSON.parse(content);
        if (activityData.resources) {
            for (const resource in activityData.resources) {
                for (const version of activityData.resources[resource]) {
                    await this.userDataSyncLocalStoreService.writeResource(resource, version.content, new Date(version.created * 1000), undefined, location);
                }
            }
        }
        if (activityData.collections) {
            for (const collection in activityData.collections) {
                for (const resource in activityData.collections[collection].resources) {
                    for (const version of activityData.collections[collection].resources?.[resource] ?? []) {
                        await this.userDataSyncLocalStoreService.writeResource(resource, version.content, new Date(version.created * 1000), collection, location);
                    }
                }
            }
        }
    }
    async performAction(profile, action) {
        const disposables = new DisposableStore();
        try {
            const activeProfileSyncronizer = this.activeProfileSynchronizers.get(profile.id);
            if (activeProfileSyncronizer) {
                const result = await this.performActionWithProfileSynchronizer(activeProfileSyncronizer[0], action, disposables);
                return isUndefined(result) ? null : result;
            }
            if (profile.isDefault) {
                const defaultProfileSynchronizer = disposables.add(this.instantiationService.createInstance(ProfileSynchronizer, profile, undefined));
                const result = await this.performActionWithProfileSynchronizer(defaultProfileSynchronizer, action, disposables);
                return isUndefined(result) ? null : result;
            }
            const userDataProfileManifestSynchronizer = disposables.add(this.instantiationService.createInstance(UserDataProfilesManifestSynchroniser, profile, undefined));
            const manifest = await this.userDataSyncStoreService.manifest(null);
            const syncProfiles = (await userDataProfileManifestSynchronizer.getRemoteSyncedProfiles(manifest?.latest ?? null)) || [];
            const syncProfile = syncProfiles.find((syncProfile) => syncProfile.id === profile.id);
            if (syncProfile) {
                const profileSynchronizer = disposables.add(this.instantiationService.createInstance(ProfileSynchronizer, profile, syncProfile.collection));
                const result = await this.performActionWithProfileSynchronizer(profileSynchronizer, action, disposables);
                return isUndefined(result) ? null : result;
            }
            return null;
        }
        finally {
            disposables.dispose();
        }
    }
    async performActionWithProfileSynchronizer(profileSynchronizer, action, disposables) {
        const allSynchronizers = [
            ...profileSynchronizer.enabled,
            ...profileSynchronizer.disabled.reduce((synchronizers, syncResource) => {
                if (syncResource !== "workspaceState" /* SyncResource.WorkspaceState */) {
                    synchronizers.push(disposables.add(profileSynchronizer.createSynchronizer(syncResource)));
                }
                return synchronizers;
            }, []),
        ];
        for (const synchronizer of allSynchronizers) {
            const result = await action(synchronizer);
            if (!isUndefined(result)) {
                return result;
            }
        }
        return undefined;
    }
    setStatus(status) {
        const oldStatus = this._status;
        if (this._status !== status) {
            this._status = status;
            this._onDidChangeStatus.fire(status);
            if (oldStatus === "hasConflicts" /* SyncStatus.HasConflicts */) {
                this.updateLastSyncTime();
            }
        }
    }
    updateConflicts() {
        const conflicts = this.getActiveProfileSynchronizers()
            .map((synchronizer) => synchronizer.conflicts)
            .flat();
        if (!equals(this._conflicts, conflicts, (a, b) => a.profile.id === b.profile.id &&
            a.syncResource === b.syncResource &&
            equals(a.conflicts, b.conflicts, (a, b) => isEqual(a.previewResource, b.previewResource)))) {
            this._conflicts = conflicts;
            this._onDidChangeConflicts.fire(conflicts);
        }
    }
    updateLastSyncTime() {
        if (this.status === "idle" /* SyncStatus.Idle */) {
            this._lastSyncTime = new Date().getTime();
            this.storageService.store(LAST_SYNC_TIME_KEY, this._lastSyncTime, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            this._onDidChangeLastSyncTime.fire(this._lastSyncTime);
        }
    }
    getOrCreateActiveProfileSynchronizer(profile, syncProfile) {
        let activeProfileSynchronizer = this.activeProfileSynchronizers.get(profile.id);
        if (activeProfileSynchronizer &&
            activeProfileSynchronizer[0].collection !== syncProfile?.collection) {
            this.logService.error('Profile synchronizer collection does not match with the remote sync profile collection');
            activeProfileSynchronizer[1].dispose();
            activeProfileSynchronizer = undefined;
            this.activeProfileSynchronizers.delete(profile.id);
        }
        if (!activeProfileSynchronizer) {
            const disposables = new DisposableStore();
            const profileSynchronizer = disposables.add(this.instantiationService.createInstance(ProfileSynchronizer, profile, syncProfile?.collection));
            disposables.add(profileSynchronizer.onDidChangeStatus((e) => this.setStatus(e)));
            disposables.add(profileSynchronizer.onDidChangeConflicts((conflicts) => this.updateConflicts()));
            disposables.add(profileSynchronizer.onDidChangeLocal((e) => this._onDidChangeLocal.fire(e)));
            this.activeProfileSynchronizers.set(profile.id, (activeProfileSynchronizer = [profileSynchronizer, disposables]));
        }
        return activeProfileSynchronizer[0];
    }
    getActiveProfileSynchronizers() {
        const profileSynchronizers = [];
        for (const [profileSynchronizer] of this.activeProfileSynchronizers.values()) {
            profileSynchronizers.push(profileSynchronizer);
        }
        return profileSynchronizers;
    }
    clearActiveProfileSynchronizers() {
        this.activeProfileSynchronizers.forEach(([, disposable]) => disposable.dispose());
        this.activeProfileSynchronizers.clear();
    }
    checkEnablement() {
        if (!this.userDataSyncStoreManagementService.userDataSyncStore) {
            throw new Error('Not enabled');
        }
    }
};
UserDataSyncService = __decorate([
    __param(0, IFileService),
    __param(1, IUserDataSyncStoreService),
    __param(2, IUserDataSyncStoreManagementService),
    __param(3, IInstantiationService),
    __param(4, IUserDataSyncLogService),
    __param(5, ITelemetryService),
    __param(6, IStorageService),
    __param(7, IUserDataSyncEnablementService),
    __param(8, IUserDataProfilesService),
    __param(9, IUserDataSyncResourceProviderService),
    __param(10, IUserDataSyncLocalStoreService)
], UserDataSyncService);
export { UserDataSyncService };
let ProfileSynchronizer = class ProfileSynchronizer extends Disposable {
    get enabled() {
        return this._enabled.sort((a, b) => a[1] - b[1]).map(([synchronizer]) => synchronizer);
    }
    get disabled() {
        return ALL_SYNC_RESOURCES.filter((syncResource) => !this.userDataSyncEnablementService.isResourceEnabled(syncResource));
    }
    get status() {
        return this._status;
    }
    get conflicts() {
        return this._conflicts;
    }
    constructor(profile, collection, userDataSyncEnablementService, instantiationService, extensionGalleryService, userDataSyncStoreManagementService, telemetryService, logService, configurationService) {
        super();
        this.profile = profile;
        this.collection = collection;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.instantiationService = instantiationService;
        this.extensionGalleryService = extensionGalleryService;
        this.userDataSyncStoreManagementService = userDataSyncStoreManagementService;
        this.telemetryService = telemetryService;
        this.logService = logService;
        this.configurationService = configurationService;
        this._enabled = [];
        this._status = "idle" /* SyncStatus.Idle */;
        this._onDidChangeStatus = this._register(new Emitter());
        this.onDidChangeStatus = this._onDidChangeStatus.event;
        this._onDidChangeLocal = this._register(new Emitter());
        this.onDidChangeLocal = this._onDidChangeLocal.event;
        this._conflicts = [];
        this._onDidChangeConflicts = this._register(new Emitter());
        this.onDidChangeConflicts = this._onDidChangeConflicts.event;
        this._register(userDataSyncEnablementService.onDidChangeResourceEnablement(([syncResource, enablement]) => this.onDidChangeResourceEnablement(syncResource, enablement)));
        this._register(toDisposable(() => this._enabled
            .splice(0, this._enabled.length)
            .forEach(([, , disposable]) => disposable.dispose())));
        for (const syncResource of ALL_SYNC_RESOURCES) {
            if (userDataSyncEnablementService.isResourceEnabled(syncResource)) {
                this.registerSynchronizer(syncResource);
            }
        }
    }
    onDidChangeResourceEnablement(syncResource, enabled) {
        if (enabled) {
            this.registerSynchronizer(syncResource);
        }
        else {
            this.deRegisterSynchronizer(syncResource);
        }
    }
    registerSynchronizer(syncResource) {
        if (this._enabled.some(([synchronizer]) => synchronizer.resource === syncResource)) {
            return;
        }
        if (syncResource === "extensions" /* SyncResource.Extensions */ && !this.extensionGalleryService.isEnabled()) {
            this.logService.info('Skipping extensions sync because gallery is not configured');
            return;
        }
        if (syncResource === "profiles" /* SyncResource.Profiles */) {
            if (!this.profile.isDefault) {
                return;
            }
        }
        if (syncResource === "workspaceState" /* SyncResource.WorkspaceState */) {
            return;
        }
        if (syncResource !== "profiles" /* SyncResource.Profiles */ && this.profile.useDefaultFlags?.[syncResource]) {
            this.logService.debug(`Skipping syncing ${syncResource} in ${this.profile.name} because it is already synced by default profile`);
            return;
        }
        const disposables = new DisposableStore();
        const synchronizer = disposables.add(this.createSynchronizer(syncResource));
        disposables.add(synchronizer.onDidChangeStatus(() => this.updateStatus()));
        disposables.add(synchronizer.onDidChangeConflicts(() => this.updateConflicts()));
        disposables.add(synchronizer.onDidChangeLocal(() => this._onDidChangeLocal.fire(syncResource)));
        const order = this.getOrder(syncResource);
        this._enabled.push([synchronizer, order, disposables]);
    }
    deRegisterSynchronizer(syncResource) {
        const index = this._enabled.findIndex(([synchronizer]) => synchronizer.resource === syncResource);
        if (index !== -1) {
            const [[synchronizer, , disposable]] = this._enabled.splice(index, 1);
            disposable.dispose();
            this.updateStatus();
            synchronizer.stop().then(null, (error) => this.logService.error(error));
        }
    }
    createSynchronizer(syncResource) {
        switch (syncResource) {
            case "settings" /* SyncResource.Settings */:
                return this.instantiationService.createInstance(SettingsSynchroniser, this.profile, this.collection);
            case "keybindings" /* SyncResource.Keybindings */:
                return this.instantiationService.createInstance(KeybindingsSynchroniser, this.profile, this.collection);
            case "snippets" /* SyncResource.Snippets */:
                return this.instantiationService.createInstance(SnippetsSynchroniser, this.profile, this.collection);
            case "prompts" /* SyncResource.Prompts */:
                return this.instantiationService.createInstance(PromptsSynchronizer, this.profile, this.collection);
            case "tasks" /* SyncResource.Tasks */:
                return this.instantiationService.createInstance(TasksSynchroniser, this.profile, this.collection);
            case "globalState" /* SyncResource.GlobalState */:
                return this.instantiationService.createInstance(GlobalStateSynchroniser, this.profile, this.collection);
            case "extensions" /* SyncResource.Extensions */:
                return this.instantiationService.createInstance(ExtensionsSynchroniser, this.profile, this.collection);
            case "profiles" /* SyncResource.Profiles */:
                return this.instantiationService.createInstance(UserDataProfilesManifestSynchroniser, this.profile, this.collection);
        }
    }
    async sync(manifest, preview, executionId, token) {
        // Return if cancellation is requested
        if (token.isCancellationRequested) {
            return [];
        }
        const synchronizers = this.enabled;
        if (!synchronizers.length) {
            return [];
        }
        try {
            const syncErrors = [];
            const syncHeaders = createSyncHeaders(executionId);
            const resourceManifest = (this.collection ? manifest?.collections?.[this.collection]?.latest : manifest?.latest) ??
                null;
            const userDataSyncConfiguration = preview
                ? await this.getUserDataSyncConfiguration(resourceManifest)
                : this.getLocalUserDataSyncConfiguration();
            for (const synchroniser of synchronizers) {
                // Return if cancellation is requested
                if (token.isCancellationRequested) {
                    return [];
                }
                // Return if resource is not enabled
                if (!this.userDataSyncEnablementService.isResourceEnabled(synchroniser.resource)) {
                    return [];
                }
                try {
                    await synchroniser.sync(resourceManifest, preview, userDataSyncConfiguration, syncHeaders);
                }
                catch (e) {
                    const userDataSyncError = UserDataSyncError.toUserDataSyncError(e);
                    reportUserDataSyncError(userDataSyncError, executionId, this.userDataSyncStoreManagementService, this.telemetryService);
                    if (canBailout(e)) {
                        throw userDataSyncError;
                    }
                    // Log and and continue
                    this.logService.error(e);
                    this.logService.error(`${synchroniser.resource}: ${toErrorMessage(e)}`);
                    syncErrors.push([synchroniser.resource, userDataSyncError]);
                }
            }
            return syncErrors;
        }
        finally {
            this.updateStatus();
        }
    }
    async apply(executionId, token) {
        const syncHeaders = createSyncHeaders(executionId);
        for (const synchroniser of this.enabled) {
            if (token.isCancellationRequested) {
                return;
            }
            try {
                await synchroniser.apply(false, syncHeaders);
            }
            catch (e) {
                const userDataSyncError = UserDataSyncError.toUserDataSyncError(e);
                reportUserDataSyncError(userDataSyncError, executionId, this.userDataSyncStoreManagementService, this.telemetryService);
                if (canBailout(e)) {
                    throw userDataSyncError;
                }
                // Log and and continue
                this.logService.error(e);
                this.logService.error(`${synchroniser.resource}: ${toErrorMessage(e)}`);
            }
        }
    }
    async stop() {
        for (const synchroniser of this.enabled) {
            try {
                if (synchroniser.status !== "idle" /* SyncStatus.Idle */) {
                    await synchroniser.stop();
                }
            }
            catch (e) {
                this.logService.error(e);
            }
        }
    }
    async resetLocal() {
        for (const synchroniser of this.enabled) {
            try {
                await synchroniser.resetLocal();
            }
            catch (e) {
                this.logService.error(`${synchroniser.resource}: ${toErrorMessage(e)}`);
                this.logService.error(e);
            }
        }
    }
    async getUserDataSyncConfiguration(manifest) {
        if (!this.profile.isDefault) {
            return {};
        }
        const local = this.getLocalUserDataSyncConfiguration();
        const settingsSynchronizer = this.enabled.find((synchronizer) => synchronizer instanceof SettingsSynchroniser);
        if (settingsSynchronizer) {
            const remote = await (settingsSynchronizer).getRemoteUserDataSyncConfiguration(manifest);
            return { ...local, ...remote };
        }
        return local;
    }
    getLocalUserDataSyncConfiguration() {
        return this.configurationService.getValue(USER_DATA_SYNC_CONFIGURATION_SCOPE);
    }
    setStatus(status) {
        if (this._status !== status) {
            this._status = status;
            this._onDidChangeStatus.fire(status);
        }
    }
    updateStatus() {
        this.updateConflicts();
        if (this.enabled.some((s) => s.status === "hasConflicts" /* SyncStatus.HasConflicts */)) {
            return this.setStatus("hasConflicts" /* SyncStatus.HasConflicts */);
        }
        if (this.enabled.some((s) => s.status === "syncing" /* SyncStatus.Syncing */)) {
            return this.setStatus("syncing" /* SyncStatus.Syncing */);
        }
        return this.setStatus("idle" /* SyncStatus.Idle */);
    }
    updateConflicts() {
        const conflicts = this.enabled
            .filter((s) => s.status === "hasConflicts" /* SyncStatus.HasConflicts */)
            .filter((s) => s.conflicts.conflicts.length > 0)
            .map((s) => s.conflicts);
        if (!equals(this._conflicts, conflicts, (a, b) => a.syncResource === b.syncResource &&
            equals(a.conflicts, b.conflicts, (a, b) => isEqual(a.previewResource, b.previewResource)))) {
            this._conflicts = conflicts;
            this._onDidChangeConflicts.fire(conflicts);
        }
    }
    getOrder(syncResource) {
        switch (syncResource) {
            case "settings" /* SyncResource.Settings */:
                return 0;
            case "keybindings" /* SyncResource.Keybindings */:
                return 1;
            case "snippets" /* SyncResource.Snippets */:
                return 2;
            case "tasks" /* SyncResource.Tasks */:
                return 3;
            case "globalState" /* SyncResource.GlobalState */:
                return 4;
            case "extensions" /* SyncResource.Extensions */:
                return 5;
            case "prompts" /* SyncResource.Prompts */:
                return 6;
            case "profiles" /* SyncResource.Profiles */:
                return 7;
            case "workspaceState" /* SyncResource.WorkspaceState */:
                return 8;
        }
    }
};
ProfileSynchronizer = __decorate([
    __param(2, IUserDataSyncEnablementService),
    __param(3, IInstantiationService),
    __param(4, IExtensionGalleryService),
    __param(5, IUserDataSyncStoreManagementService),
    __param(6, ITelemetryService),
    __param(7, IUserDataSyncLogService),
    __param(8, IConfigurationService)
], ProfileSynchronizer);
function canBailout(e) {
    if (e instanceof UserDataSyncError) {
        switch (e.code) {
            case "MethodNotFound" /* UserDataSyncErrorCode.MethodNotFound */:
            case "TooLarge" /* UserDataSyncErrorCode.TooLarge */:
            case "RemoteTooManyRequests" /* UserDataSyncErrorCode.TooManyRequests */:
            case "TooManyRequestsAndRetryAfter" /* UserDataSyncErrorCode.TooManyRequestsAndRetryAfter */:
            case "LocalTooManyRequests" /* UserDataSyncErrorCode.LocalTooManyRequests */:
            case "LocalTooManyProfiles" /* UserDataSyncErrorCode.LocalTooManyProfiles */:
            case "Gone" /* UserDataSyncErrorCode.Gone */:
            case "UpgradeRequired" /* UserDataSyncErrorCode.UpgradeRequired */:
            case "IncompatibleRemoteContent" /* UserDataSyncErrorCode.IncompatibleRemoteContent */:
            case "IncompatibleLocalContent" /* UserDataSyncErrorCode.IncompatibleLocalContent */:
                return true;
        }
    }
    return false;
}
function reportUserDataSyncError(userDataSyncError, executionId, userDataSyncStoreManagementService, telemetryService) {
    telemetryService.publicLog2('sync/error', {
        code: userDataSyncError.code,
        serverCode: userDataSyncError instanceof UserDataSyncStoreError
            ? String(userDataSyncError.serverCode)
            : undefined,
        url: userDataSyncError instanceof UserDataSyncStoreError ? userDataSyncError.url : undefined,
        resource: userDataSyncError.resource,
        executionId,
        service: userDataSyncStoreManagementService.userDataSyncStore.url.toString(),
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi91c2VyRGF0YVN5bmNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2RCxPQUFPLEVBRU4sdUJBQXVCLEVBQ3ZCLGdCQUFnQixHQUNoQixNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXRFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDMUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RixPQUFPLEVBQUUs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