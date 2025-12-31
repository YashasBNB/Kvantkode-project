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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vdXNlckRhdGFTeW5jU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkQsT0FBTyxFQUVOLHVCQUF1QixFQUN2QixnQkFBZ0IsR0FDaEIsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixZQUFZLEdBQ1osTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUV0RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDM0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDbEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzFELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0saUNBQWlDLENBQUE7QUFDOUYsT0FBTyxFQUFFLGlCQUFp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