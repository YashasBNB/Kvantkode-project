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
import { createCancelablePromise, ThrottledDelayer, } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { parse } from '../../../base/common/json.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { uppercaseFirstLetter } from '../../../base/common/strings.js';
import { isUndefined } from '../../../base/common/types.js';
import { localize } from '../../../nls.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { FileOperationError, IFileService, toFileOperationResult, } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
import { getServiceMachineId } from '../../externalServices/common/serviceMachineId.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { getLastSyncResourceUri, IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncStoreService, IUserDataSyncUtilService, PREVIEW_DIR_NAME, UserDataSyncError, USER_DATA_SYNC_CONFIGURATION_SCOPE, USER_DATA_SYNC_SCHEME, getPathSegments, } from './userDataSync.js';
import { IUserDataProfilesService, } from '../../userDataProfile/common/userDataProfile.js';
export function isRemoteUserData(thing) {
    if (thing &&
        thing.ref !== undefined &&
        typeof thing.ref === 'string' &&
        thing.ref !== '' &&
        thing.syncData !== undefined &&
        (thing.syncData === null || isSyncData(thing.syncData))) {
        return true;
    }
    return false;
}
export function isSyncData(thing) {
    if (thing &&
        thing.version !== undefined &&
        typeof thing.version === 'number' &&
        thing.content !== undefined &&
        typeof thing.content === 'string') {
        // backward compatibility
        if (Object.keys(thing).length === 2) {
            return true;
        }
        if (Object.keys(thing).length === 3 &&
            thing.machineId !== undefined &&
            typeof thing.machineId === 'string') {
            return true;
        }
    }
    return false;
}
export function getSyncResourceLogLabel(syncResource, profile) {
    return `${uppercaseFirstLetter(syncResource)}${profile.isDefault ? '' : ` (${profile.name})`}`;
}
export var SyncStrategy;
(function (SyncStrategy) {
    SyncStrategy["Preview"] = "preview";
    SyncStrategy["Merge"] = "merge";
    SyncStrategy["PullOrPush"] = "pull-push";
})(SyncStrategy || (SyncStrategy = {}));
let AbstractSynchroniser = class AbstractSynchroniser extends Disposable {
    get status() {
        return this._status;
    }
    get conflicts() {
        return { ...this.syncResource, conflicts: this._conflicts };
    }
    constructor(syncResource, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService) {
        super();
        this.syncResource = syncResource;
        this.collection = collection;
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.storageService = storageService;
        this.userDataSyncStoreService = userDataSyncStoreService;
        this.userDataSyncLocalStoreService = userDataSyncLocalStoreService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.telemetryService = telemetryService;
        this.logService = logService;
        this.configurationService = configurationService;
        this.syncPreviewPromise = null;
        this._status = "idle" /* SyncStatus.Idle */;
        this._onDidChangStatus = this._register(new Emitter());
        this.onDidChangeStatus = this._onDidChangStatus.event;
        this._conflicts = [];
        this._onDidChangeConflicts = this._register(new Emitter());
        this.onDidChangeConflicts = this._onDidChangeConflicts.event;
        this.localChangeTriggerThrottler = this._register(new ThrottledDelayer(50));
        this._onDidChangeLocal = this._register(new Emitter());
        this.onDidChangeLocal = this._onDidChangeLocal.event;
        this.lastSyncUserDataStateKey = `${this.collection ? `${this.collection}.` : ''}${this.syncResource.syncResource}.lastSyncUserData`;
        this.hasSyncResourceStateVersionChanged = false;
        this.syncHeaders = {};
        this.resource = this.syncResource.syncResource;
        this.syncResourceLogLabel = getSyncResourceLogLabel(syncResource.syncResource, syncResource.profile);
        this.extUri = uriIdentityService.extUri;
        this.syncFolder = this.extUri.joinPath(environmentService.userDataSyncHome, ...getPathSegments(syncResource.profile.isDefault ? undefined : syncResource.profile.id, syncResource.syncResource));
        this.syncPreviewFolder = this.extUri.joinPath(this.syncFolder, PREVIEW_DIR_NAME);
        this.lastSyncResource = getLastSyncResourceUri(syncResource.profile.isDefault ? undefined : syncResource.profile.id, syncResource.syncResource, environmentService, this.extUri);
        this.currentMachineIdPromise = getServiceMachineId(environmentService, fileService, storageService);
    }
    triggerLocalChange() {
        this.localChangeTriggerThrottler.trigger(() => this.doTriggerLocalChange());
    }
    async doTriggerLocalChange() {
        // Sync again if current status is in conflicts
        if (this.status === "hasConflicts" /* SyncStatus.HasConflicts */) {
            this.logService.info(`${this.syncResourceLogLabel}: In conflicts state and local change detected. Syncing again...`);
            const preview = await this.syncPreviewPromise;
            this.syncPreviewPromise = null;
            const status = await this.performSync(preview.remoteUserData, preview.lastSyncUserData, "merge" /* SyncStrategy.Merge */, this.getUserDataSyncConfiguration());
            this.setStatus(status);
        }
        // Check if local change causes remote change
        else {
            this.logService.trace(`${this.syncResourceLogLabel}: Checking for local changes...`);
            const lastSyncUserData = await this.getLastSyncUserData();
            const hasRemoteChanged = lastSyncUserData
                ? await this.hasRemoteChanged(lastSyncUserData)
                : true;
            if (hasRemoteChanged) {
                this._onDidChangeLocal.fire();
            }
        }
    }
    setStatus(status) {
        if (this._status !== status) {
            this._status = status;
            this._onDidChangStatus.fire(status);
        }
    }
    async sync(manifest, preview = false, userDataSyncConfiguration = this.getUserDataSyncConfiguration(), headers = {}) {
        try {
            this.syncHeaders = { ...headers };
            if (this.status === "hasConflicts" /* SyncStatus.HasConflicts */) {
                this.logService.info(`${this.syncResourceLogLabel}: Skipped synchronizing ${this.resource.toLowerCase()} as there are conflicts.`);
                return this.syncPreviewPromise;
            }
            if (this.status === "syncing" /* SyncStatus.Syncing */) {
                this.logService.info(`${this.syncResourceLogLabel}: Skipped synchronizing ${this.resource.toLowerCase()} as it is running already.`);
                return this.syncPreviewPromise;
            }
            this.logService.trace(`${this.syncResourceLogLabel}: Started synchronizing ${this.resource.toLowerCase()}...`);
            this.setStatus("syncing" /* SyncStatus.Syncing */);
            let status = "idle" /* SyncStatus.Idle */;
            try {
                const lastSyncUserData = await this.getLastSyncUserData();
                const remoteUserData = await this.getLatestRemoteUserData(manifest, lastSyncUserData);
                status = await this.performSync(remoteUserData, lastSyncUserData, preview ? "preview" /* SyncStrategy.Preview */ : "merge" /* SyncStrategy.Merge */, userDataSyncConfiguration);
                if (status === "hasConflicts" /* SyncStatus.HasConflicts */) {
                    this.logService.info(`${this.syncResourceLogLabel}: Detected conflicts while synchronizing ${this.resource.toLowerCase()}.`);
                }
                else if (status === "idle" /* SyncStatus.Idle */) {
                    this.logService.trace(`${this.syncResourceLogLabel}: Finished synchronizing ${this.resource.toLowerCase()}.`);
                }
                return this.syncPreviewPromise || null;
            }
            finally {
                this.setStatus(status);
            }
        }
        finally {
            this.syncHeaders = {};
        }
    }
    async apply(force, headers = {}) {
        try {
            this.syncHeaders = { ...headers };
            const status = await this.doApply(force);
            this.setStatus(status);
            return this.syncPreviewPromise;
        }
        finally {
            this.syncHeaders = {};
        }
    }
    async replace(content) {
        const syncData = this.parseSyncData(content);
        if (!syncData) {
            return false;
        }
        await this.stop();
        try {
            this.logService.trace(`${this.syncResourceLogLabel}: Started resetting ${this.resource.toLowerCase()}...`);
            this.setStatus("syncing" /* SyncStatus.Syncing */);
            const lastSyncUserData = await this.getLastSyncUserData();
            const remoteUserData = await this.getLatestRemoteUserData(null, lastSyncUserData);
            const isRemoteDataFromCurrentMachine = await this.isRemoteDataFromCurrentMachine(remoteUserData);
            /* use replace sync data */
            const resourcePreviewResults = await this.generateSyncPreview({ ref: remoteUserData.ref, syncData }, lastSyncUserData, isRemoteDataFromCurrentMachine, this.getUserDataSyncConfiguration(), CancellationToken.None);
            const resourcePreviews = [];
            for (const resourcePreviewResult of resourcePreviewResults) {
                /* Accept remote resource */
                const acceptResult = await this.getAcceptResult(resourcePreviewResult, resourcePreviewResult.remoteResource, undefined, CancellationToken.None);
                /* compute remote change */
                const { remoteChange } = await this.getAcceptResult(resourcePreviewResult, resourcePreviewResult.previewResource, resourcePreviewResult.remoteContent, CancellationToken.None);
                resourcePreviews.push([
                    resourcePreviewResult,
                    {
                        ...acceptResult,
                        remoteChange: remoteChange !== 0 /* Change.None */ ? remoteChange : 2 /* Change.Modified */,
                    },
                ]);
            }
            await this.applyResult(remoteUserData, lastSyncUserData, resourcePreviews, false);
            this.logService.info(`${this.syncResourceLogLabel}: Finished resetting ${this.resource.toLowerCase()}.`);
        }
        finally {
            this.setStatus("idle" /* SyncStatus.Idle */);
        }
        return true;
    }
    async isRemoteDataFromCurrentMachine(remoteUserData) {
        const machineId = await this.currentMachineIdPromise;
        return !!remoteUserData.syncData?.machineId && remoteUserData.syncData.machineId === machineId;
    }
    async getLatestRemoteUserData(manifest, lastSyncUserData) {
        if (lastSyncUserData) {
            const latestRef = manifest ? manifest[this.resource] : undefined;
            // Last time synced resource and latest resource on server are same
            if (lastSyncUserData.ref === latestRef) {
                return lastSyncUserData;
            }
            // There is no resource on server and last time it was synced with no resource
            if (latestRef === undefined && lastSyncUserData.syncData === null) {
                return lastSyncUserData;
            }
        }
        return this.getRemoteUserData(lastSyncUserData);
    }
    async performSync(remoteUserData, lastSyncUserData, strategy, userDataSyncConfiguration) {
        if (remoteUserData.syncData && remoteUserData.syncData.version > this.version) {
            throw new UserDataSyncError(localize({
                key: 'incompatible',
                comment: [
                    'This is an error while syncing a resource that its local version is not compatible with its remote version.',
                ],
            }, 'Cannot sync {0} as its local version {1} is not compatible with its remote version {2}', this.resource, this.version, remoteUserData.syncData.version), "IncompatibleLocalContent" /* UserDataSyncErrorCode.IncompatibleLocalContent */, this.resource);
        }
        try {
            return await this.doSync(remoteUserData, lastSyncUserData, strategy, userDataSyncConfiguration);
        }
        catch (e) {
            if (e instanceof UserDataSyncError) {
                switch (e.code) {
                    case "LocalPreconditionFailed" /* UserDataSyncErrorCode.LocalPreconditionFailed */:
                        // Rejected as there is a new local version. Syncing again...
                        this.logService.info(`${this.syncResourceLogLabel}: Failed to synchronize ${this.syncResourceLogLabel} as there is a new local version available. Synchronizing again...`);
                        return this.performSync(remoteUserData, lastSyncUserData, strategy, userDataSyncConfiguration);
                    case "Conflict" /* UserDataSyncErrorCode.Conflict */:
                    case "PreconditionFailed" /* UserDataSyncErrorCode.PreconditionFailed */:
                        // Rejected as there is a new remote version. Syncing again...
                        this.logService.info(`${this.syncResourceLogLabel}: Failed to synchronize as there is a new remote version available. Synchronizing again...`);
                        // Avoid cache and get latest remote user data - https://github.com/microsoft/vscode/issues/90624
                        remoteUserData = await this.getRemoteUserData(null);
                        // Get the latest last sync user data. Because multiple parallel syncs (in Web) could share same last sync data
                        // and one of them successfully updated remote and last sync state.
                        lastSyncUserData = await this.getLastSyncUserData();
                        return this.performSync(remoteUserData, lastSyncUserData, "merge" /* SyncStrategy.Merge */, userDataSyncConfiguration);
                }
            }
            throw e;
        }
    }
    async doSync(remoteUserData, lastSyncUserData, strategy, userDataSyncConfiguration) {
        try {
            const isRemoteDataFromCurrentMachine = await this.isRemoteDataFromCurrentMachine(remoteUserData);
            const acceptRemote = !isRemoteDataFromCurrentMachine &&
                lastSyncUserData === null &&
                this.getStoredLastSyncUserDataStateContent() !== undefined;
            const merge = strategy === "preview" /* SyncStrategy.Preview */ || (strategy === "merge" /* SyncStrategy.Merge */ && !acceptRemote);
            const apply = strategy === "merge" /* SyncStrategy.Merge */ || strategy === "pull-push" /* SyncStrategy.PullOrPush */;
            // generate or use existing preview
            if (!this.syncPreviewPromise) {
                this.syncPreviewPromise = createCancelablePromise((token) => this.doGenerateSyncResourcePreview(remoteUserData, lastSyncUserData, isRemoteDataFromCurrentMachine, merge, userDataSyncConfiguration, token));
            }
            let preview = await this.syncPreviewPromise;
            if (strategy === "merge" /* SyncStrategy.Merge */ && acceptRemote) {
                this.logService.info(`${this.syncResourceLogLabel}: Accepting remote because it was synced before and the last sync data is not available.`);
                for (const resourcePreview of preview.resourcePreviews) {
                    preview = (await this.accept(resourcePreview.remoteResource)) || preview;
                }
            }
            else if (strategy === "pull-push" /* SyncStrategy.PullOrPush */) {
                for (const resourcePreview of preview.resourcePreviews) {
                    if (resourcePreview.mergeState === "accepted" /* MergeState.Accepted */) {
                        continue;
                    }
                    if (remoteUserData.ref === lastSyncUserData?.ref || isRemoteDataFromCurrentMachine) {
                        preview = (await this.accept(resourcePreview.localResource)) ?? preview;
                    }
                    else {
                        preview = (await this.accept(resourcePreview.remoteResource)) ?? preview;
                    }
                }
            }
            this.updateConflicts(preview.resourcePreviews);
            if (preview.resourcePreviews.some(({ mergeState }) => mergeState === "conflict" /* MergeState.Conflict */)) {
                return "hasConflicts" /* SyncStatus.HasConflicts */;
            }
            if (apply) {
                return await this.doApply(false);
            }
            return "syncing" /* SyncStatus.Syncing */;
        }
        catch (error) {
            // reset preview on error
            this.syncPreviewPromise = null;
            throw error;
        }
    }
    async accept(resource, content) {
        await this.updateSyncResourcePreview(resource, async (resourcePreview) => {
            const acceptResult = await this.getAcceptResult(resourcePreview, resource, content, CancellationToken.None);
            resourcePreview.acceptResult = acceptResult;
            resourcePreview.mergeState = "accepted" /* MergeState.Accepted */;
            resourcePreview.localChange = acceptResult.localChange;
            resourcePreview.remoteChange = acceptResult.remoteChange;
            return resourcePreview;
        });
        return this.syncPreviewPromise;
    }
    async discard(resource) {
        await this.updateSyncResourcePreview(resource, async (resourcePreview) => {
            const mergeResult = await this.getMergeResult(resourcePreview, CancellationToken.None);
            await this.fileService.writeFile(resourcePreview.previewResource, VSBuffer.fromString(mergeResult.content || ''));
            resourcePreview.acceptResult = undefined;
            resourcePreview.mergeState = "preview" /* MergeState.Preview */;
            resourcePreview.localChange = mergeResult.localChange;
            resourcePreview.remoteChange = mergeResult.remoteChange;
            return resourcePreview;
        });
        return this.syncPreviewPromise;
    }
    async updateSyncResourcePreview(resource, updateResourcePreview) {
        if (!this.syncPreviewPromise) {
            return;
        }
        let preview = await this.syncPreviewPromise;
        const index = preview.resourcePreviews.findIndex(({ localResource, remoteResource, previewResource }) => this.extUri.isEqual(localResource, resource) ||
            this.extUri.isEqual(remoteResource, resource) ||
            this.extUri.isEqual(previewResource, resource));
        if (index === -1) {
            return;
        }
        this.syncPreviewPromise = createCancelablePromise(async (token) => {
            const resourcePreviews = [...preview.resourcePreviews];
            resourcePreviews[index] = await updateResourcePreview(resourcePreviews[index]);
            return {
                ...preview,
                resourcePreviews,
            };
        });
        preview = await this.syncPreviewPromise;
        this.updateConflicts(preview.resourcePreviews);
        if (preview.resourcePreviews.some(({ mergeState }) => mergeState === "conflict" /* MergeState.Conflict */)) {
            this.setStatus("hasConflicts" /* SyncStatus.HasConflicts */);
        }
        else {
            this.setStatus("syncing" /* SyncStatus.Syncing */);
        }
    }
    async doApply(force) {
        if (!this.syncPreviewPromise) {
            return "idle" /* SyncStatus.Idle */;
        }
        const preview = await this.syncPreviewPromise;
        // check for conflicts
        if (preview.resourcePreviews.some(({ mergeState }) => mergeState === "conflict" /* MergeState.Conflict */)) {
            return "hasConflicts" /* SyncStatus.HasConflicts */;
        }
        // check if all are accepted
        if (preview.resourcePreviews.some(({ mergeState }) => mergeState !== "accepted" /* MergeState.Accepted */)) {
            return "syncing" /* SyncStatus.Syncing */;
        }
        // apply preview
        await this.applyResult(preview.remoteUserData, preview.lastSyncUserData, preview.resourcePreviews.map((resourcePreview) => [
            resourcePreview,
            resourcePreview.acceptResult,
        ]), force);
        // reset preview
        this.syncPreviewPromise = null;
        // reset preview folder
        await this.clearPreviewFolder();
        return "idle" /* SyncStatus.Idle */;
    }
    async clearPreviewFolder() {
        try {
            await this.fileService.del(this.syncPreviewFolder, { recursive: true });
        }
        catch (error) {
            /* Ignore */
        }
    }
    updateConflicts(resourcePreviews) {
        const conflicts = resourcePreviews.filter(({ mergeState }) => mergeState === "conflict" /* MergeState.Conflict */);
        if (!equals(this._conflicts, conflicts, (a, b) => this.extUri.isEqual(a.previewResource, b.previewResource))) {
            this._conflicts = conflicts;
            this._onDidChangeConflicts.fire(this.conflicts);
        }
    }
    async hasPreviouslySynced() {
        const lastSyncData = await this.getLastSyncUserData();
        return (!!lastSyncData &&
            lastSyncData.syncData !== null /* `null` sync data implies resource is not synced */);
    }
    async resolvePreviewContent(uri) {
        const syncPreview = this.syncPreviewPromise ? await this.syncPreviewPromise : null;
        if (syncPreview) {
            for (const resourcePreview of syncPreview.resourcePreviews) {
                if (this.extUri.isEqual(resourcePreview.acceptedResource, uri)) {
                    return resourcePreview.acceptResult ? resourcePreview.acceptResult.content : null;
                }
                if (this.extUri.isEqual(resourcePreview.remoteResource, uri)) {
                    return resourcePreview.remoteContent;
                }
                if (this.extUri.isEqual(resourcePreview.localResource, uri)) {
                    return resourcePreview.localContent;
                }
                if (this.extUri.isEqual(resourcePreview.baseResource, uri)) {
                    return resourcePreview.baseContent;
                }
            }
        }
        return null;
    }
    async resetLocal() {
        this.storageService.remove(this.lastSyncUserDataStateKey, -1 /* StorageScope.APPLICATION */);
        try {
            await this.fileService.del(this.lastSyncResource);
        }
        catch (error) {
            if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.logService.error(error);
            }
        }
    }
    async doGenerateSyncResourcePreview(remoteUserData, lastSyncUserData, isRemoteDataFromCurrentMachine, merge, userDataSyncConfiguration, token) {
        const resourcePreviewResults = await this.generateSyncPreview(remoteUserData, lastSyncUserData, isRemoteDataFromCurrentMachine, userDataSyncConfiguration, token);
        const resourcePreviews = [];
        for (const resourcePreviewResult of resourcePreviewResults) {
            const acceptedResource = resourcePreviewResult.previewResource.with({
                scheme: USER_DATA_SYNC_SCHEME,
                authority: 'accepted',
            });
            /* No change -> Accept */
            if (resourcePreviewResult.localChange === 0 /* Change.None */ &&
                resourcePreviewResult.remoteChange === 0 /* Change.None */) {
                resourcePreviews.push({
                    ...resourcePreviewResult,
                    acceptedResource,
                    acceptResult: { content: null, localChange: 0 /* Change.None */, remoteChange: 0 /* Change.None */ },
                    mergeState: "accepted" /* MergeState.Accepted */,
                });
            }
            else {
                /* Changed -> Apply ? (Merge ? Conflict | Accept) : Preview */
                /* Merge */
                const mergeResult = merge
                    ? await this.getMergeResult(resourcePreviewResult, token)
                    : undefined;
                if (token.isCancellationRequested) {
                    break;
                }
                await this.fileService.writeFile(resourcePreviewResult.previewResource, VSBuffer.fromString(mergeResult?.content || ''));
                /* Conflict | Accept */
                const acceptResult = mergeResult && !mergeResult.hasConflicts
                    ? /* Accept if merged and there are no conflicts */
                        await this.getAcceptResult(resourcePreviewResult, resourcePreviewResult.previewResource, undefined, token)
                    : undefined;
                resourcePreviews.push({
                    ...resourcePreviewResult,
                    acceptResult,
                    mergeState: mergeResult?.hasConflicts
                        ? "conflict" /* MergeState.Conflict */
                        : acceptResult
                            ? "accepted" /* MergeState.Accepted */
                            : "preview" /* MergeState.Preview */,
                    localChange: acceptResult
                        ? acceptResult.localChange
                        : mergeResult
                            ? mergeResult.localChange
                            : resourcePreviewResult.localChange,
                    remoteChange: acceptResult
                        ? acceptResult.remoteChange
                        : mergeResult
                            ? mergeResult.remoteChange
                            : resourcePreviewResult.remoteChange,
                });
            }
        }
        return {
            syncResource: this.resource,
            profile: this.syncResource.profile,
            remoteUserData,
            lastSyncUserData,
            resourcePreviews,
            isLastSyncFromCurrentMachine: isRemoteDataFromCurrentMachine,
        };
    }
    async getLastSyncUserData() {
        const storedLastSyncUserDataStateContent = this.getStoredLastSyncUserDataStateContent();
        // Last Sync Data state does not exist
        if (!storedLastSyncUserDataStateContent) {
            this.logService.info(`${this.syncResourceLogLabel}: Last sync data state does not exist.`);
            return null;
        }
        const lastSyncUserDataState = JSON.parse(storedLastSyncUserDataStateContent);
        const resourceSyncStateVersion = this.userDataSyncEnablementService.getResourceSyncStateVersion(this.resource);
        this.hasSyncResourceStateVersionChanged =
            !!lastSyncUserDataState.version &&
                !!resourceSyncStateVersion &&
                lastSyncUserDataState.version !== resourceSyncStateVersion;
        if (this.hasSyncResourceStateVersionChanged) {
            this.logService.info(`${this.syncResourceLogLabel}: Reset last sync state because last sync state version ${lastSyncUserDataState.version} is not compatible with current sync state version ${resourceSyncStateVersion}.`);
            await this.resetLocal();
            return null;
        }
        let syncData = undefined;
        // Get Last Sync Data from Local
        let retrial = 1;
        while (syncData === undefined && retrial++ < 6 /* Retry 5 times */) {
            try {
                const lastSyncStoredRemoteUserData = await this.readLastSyncStoredRemoteUserData();
                if (lastSyncStoredRemoteUserData) {
                    if (lastSyncStoredRemoteUserData.ref === lastSyncUserDataState.ref) {
                        syncData = lastSyncStoredRemoteUserData.syncData;
                    }
                    else {
                        this.logService.info(`${this.syncResourceLogLabel}: Last sync data stored locally is not same as the last sync state.`);
                    }
                }
                break;
            }
            catch (error) {
                if (error instanceof FileOperationError &&
                    error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                    this.logService.info(`${this.syncResourceLogLabel}: Last sync resource does not exist locally.`);
                    break;
                }
                else if (error instanceof UserDataSyncError) {
                    throw error;
                }
                else {
                    // log and retry
                    this.logService.error(error, retrial);
                }
            }
        }
        // Get Last Sync Data from Remote
        if (syncData === undefined) {
            try {
                const content = await this.userDataSyncStoreService.resolveResourceContent(this.resource, lastSyncUserDataState.ref, this.collection, this.syncHeaders);
                syncData = content === null ? null : this.parseSyncData(content);
                await this.writeLastSyncStoredRemoteUserData({ ref: lastSyncUserDataState.ref, syncData });
            }
            catch (error) {
                if (error instanceof UserDataSyncError && error.code === "NotFound" /* UserDataSyncErrorCode.NotFound */) {
                    this.logService.info(`${this.syncResourceLogLabel}: Last sync resource does not exist remotely.`);
                }
                else {
                    throw error;
                }
            }
        }
        // Last Sync Data Not Found
        if (syncData === undefined) {
            return null;
        }
        return {
            ...lastSyncUserDataState,
            syncData,
        };
    }
    async updateLastSyncUserData(lastSyncRemoteUserData, additionalProps = {}) {
        if (additionalProps['ref'] || additionalProps['version']) {
            throw new Error('Cannot have core properties as additional');
        }
        const version = this.userDataSyncEnablementService.getResourceSyncStateVersion(this.resource);
        const lastSyncUserDataState = {
            ref: lastSyncRemoteUserData.ref,
            version,
            ...additionalProps,
        };
        this.storageService.store(this.lastSyncUserDataStateKey, JSON.stringify(lastSyncUserDataState), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        await this.writeLastSyncStoredRemoteUserData(lastSyncRemoteUserData);
    }
    getStoredLastSyncUserDataStateContent() {
        return this.storageService.get(this.lastSyncUserDataStateKey, -1 /* StorageScope.APPLICATION */);
    }
    async readLastSyncStoredRemoteUserData() {
        const content = (await this.fileService.readFile(this.lastSyncResource)).value.toString();
        try {
            const lastSyncStoredRemoteUserData = content ? JSON.parse(content) : undefined;
            if (isRemoteUserData(lastSyncStoredRemoteUserData)) {
                return lastSyncStoredRemoteUserData;
            }
        }
        catch (e) {
            this.logService.error(e);
        }
        return undefined;
    }
    async writeLastSyncStoredRemoteUserData(lastSyncRemoteUserData) {
        await this.fileService.writeFile(this.lastSyncResource, VSBuffer.fromString(JSON.stringify(lastSyncRemoteUserData)));
    }
    async getRemoteUserData(lastSyncData) {
        const { ref, content } = await this.getUserData(lastSyncData);
        let syncData = null;
        if (content !== null) {
            syncData = this.parseSyncData(content);
        }
        return { ref, syncData };
    }
    parseSyncData(content) {
        try {
            const syncData = JSON.parse(content);
            if (isSyncData(syncData)) {
                return syncData;
            }
        }
        catch (error) {
            this.logService.error(error);
        }
        throw new UserDataSyncError(localize('incompatible sync data', 'Cannot parse sync data as it is not compatible with the current version.'), "IncompatibleRemoteContent" /* UserDataSyncErrorCode.IncompatibleRemoteContent */, this.resource);
    }
    async getUserData(lastSyncData) {
        const lastSyncUserData = lastSyncData
            ? {
                ref: lastSyncData.ref,
                content: lastSyncData.syncData ? JSON.stringify(lastSyncData.syncData) : null,
            }
            : null;
        return this.userDataSyncStoreService.readResource(this.resource, lastSyncUserData, this.collection, this.syncHeaders);
    }
    async updateRemoteUserData(content, ref) {
        const machineId = await this.currentMachineIdPromise;
        const syncData = { version: this.version, machineId, content };
        try {
            ref = await this.userDataSyncStoreService.writeResource(this.resource, JSON.stringify(syncData), ref, this.collection, this.syncHeaders);
            return { ref, syncData };
        }
        catch (error) {
            if (error instanceof UserDataSyncError && error.code === "TooLarge" /* UserDataSyncErrorCode.TooLarge */) {
                error = new UserDataSyncError(error.message, error.code, this.resource);
            }
            throw error;
        }
    }
    async backupLocal(content) {
        const syncData = { version: this.version, content };
        return this.userDataSyncLocalStoreService.writeResource(this.resource, JSON.stringify(syncData), new Date(), this.syncResource.profile.isDefault ? undefined : this.syncResource.profile.id);
    }
    async stop() {
        if (this.status === "idle" /* SyncStatus.Idle */) {
            return;
        }
        this.logService.trace(`${this.syncResourceLogLabel}: Stopping synchronizing ${this.resource.toLowerCase()}.`);
        if (this.syncPreviewPromise) {
            this.syncPreviewPromise.cancel();
            this.syncPreviewPromise = null;
        }
        this.updateConflicts([]);
        await this.clearPreviewFolder();
        this.setStatus("idle" /* SyncStatus.Idle */);
        this.logService.info(`${this.syncResourceLogLabel}: Stopped synchronizing ${this.resource.toLowerCase()}.`);
    }
    getUserDataSyncConfiguration() {
        return this.configurationService.getValue(USER_DATA_SYNC_CONFIGURATION_SCOPE);
    }
};
AbstractSynchroniser = __decorate([
    __param(2, IFileService),
    __param(3, IEnvironmentService),
    __param(4, IStorageService),
    __param(5, IUserDataSyncStoreService),
    __param(6, IUserDataSyncLocalStoreService),
    __param(7, IUserDataSyncEnablementService),
    __param(8, ITelemetryService),
    __param(9, IUserDataSyncLogService),
    __param(10, IConfigurationService),
    __param(11, IUriIdentityService)
], AbstractSynchroniser);
export { AbstractSynchroniser };
let AbstractFileSynchroniser = class AbstractFileSynchroniser extends AbstractSynchroniser {
    constructor(file, syncResource, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService) {
        super(syncResource, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService);
        this.file = file;
        this._register(this.fileService.watch(this.extUri.dirname(file)));
        this._register(this.fileService.onDidFilesChange((e) => this.onFileChanges(e)));
    }
    async getLocalFileContent() {
        try {
            return await this.fileService.readFile(this.file);
        }
        catch (error) {
            return null;
        }
    }
    async updateLocalFileContent(newContent, oldContent, force) {
        try {
            if (oldContent) {
                // file exists already
                await this.fileService.writeFile(this.file, VSBuffer.fromString(newContent), force ? undefined : oldContent);
            }
            else {
                // file does not exist
                await this.fileService.createFile(this.file, VSBuffer.fromString(newContent), {
                    overwrite: force,
                });
            }
        }
        catch (e) {
            if ((e instanceof FileOperationError &&
                e.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) ||
                (e instanceof FileOperationError &&
                    e.fileOperationResult === 3 /* FileOperationResult.FILE_MODIFIED_SINCE */)) {
                throw new UserDataSyncError(e.message, "LocalPreconditionFailed" /* UserDataSyncErrorCode.LocalPreconditionFailed */);
            }
            else {
                throw e;
            }
        }
    }
    async deleteLocalFile() {
        try {
            await this.fileService.del(this.file);
        }
        catch (e) {
            if (!(e instanceof FileOperationError &&
                e.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */)) {
                throw e;
            }
        }
    }
    onFileChanges(e) {
        if (!e.contains(this.file)) {
            return;
        }
        this.triggerLocalChange();
    }
};
AbstractFileSynchroniser = __decorate([
    __param(3, IFileService),
    __param(4, IEnvironmentService),
    __param(5, IStorageService),
    __param(6, IUserDataSyncStoreService),
    __param(7, IUserDataSyncLocalStoreService),
    __param(8, IUserDataSyncEnablementService),
    __param(9, ITelemetryService),
    __param(10, IUserDataSyncLogService),
    __param(11, IConfigurationService),
    __param(12, IUriIdentityService)
], AbstractFileSynchroniser);
export { AbstractFileSynchroniser };
let AbstractJsonFileSynchroniser = class AbstractJsonFileSynchroniser extends AbstractFileSynchroniser {
    constructor(file, syncResource, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, userDataSyncUtilService, configurationService, uriIdentityService) {
        super(file, syncResource, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService);
        this.userDataSyncUtilService = userDataSyncUtilService;
        this._formattingOptions = undefined;
    }
    hasErrors(content, isArray) {
        const parseErrors = [];
        const result = parse(content, parseErrors, {
            allowEmptyContent: true,
            allowTrailingComma: true,
        });
        return parseErrors.length > 0 || (!isUndefined(result) && isArray !== Array.isArray(result));
    }
    getFormattingOptions() {
        if (!this._formattingOptions) {
            this._formattingOptions = this.userDataSyncUtilService.resolveFormattingOptions(this.file);
        }
        return this._formattingOptions;
    }
};
AbstractJsonFileSynchroniser = __decorate([
    __param(3, IFileService),
    __param(4, IEnvironmentService),
    __param(5, IStorageService),
    __param(6, IUserDataSyncStoreService),
    __param(7, IUserDataSyncLocalStoreService),
    __param(8, IUserDataSyncEnablementService),
    __param(9, ITelemetryService),
    __param(10, IUserDataSyncLogService),
    __param(11, IUserDataSyncUtilService),
    __param(12, IConfigurationService),
    __param(13, IUriIdentityService)
], AbstractJsonFileSynchroniser);
export { AbstractJsonFileSynchroniser };
let AbstractInitializer = class AbstractInitializer {
    constructor(resource, userDataProfilesService, environmentService, logService, fileService, storageService, uriIdentityService) {
        this.resource = resource;
        this.userDataProfilesService = userDataProfilesService;
        this.environmentService = environmentService;
        this.logService = logService;
        this.fileService = fileService;
        this.storageService = storageService;
        this.extUri = uriIdentityService.extUri;
        this.lastSyncResource = getLastSyncResourceUri(undefined, this.resource, environmentService, this.extUri);
    }
    async initialize({ ref, content }) {
        if (!content) {
            this.logService.info('Remote content does not exist.', this.resource);
            return;
        }
        const syncData = this.parseSyncData(content);
        if (!syncData) {
            return;
        }
        try {
            await this.doInitialize({ ref, syncData });
        }
        catch (error) {
            this.logService.error(error);
        }
    }
    parseSyncData(content) {
        try {
            const syncData = JSON.parse(content);
            if (isSyncData(syncData)) {
                return syncData;
            }
        }
        catch (error) {
            this.logService.error(error);
        }
        this.logService.info('Cannot parse sync data as it is not compatible with the current version.', this.resource);
        return undefined;
    }
    async updateLastSyncUserData(lastSyncRemoteUserData, additionalProps = {}) {
        if (additionalProps['ref'] || additionalProps['version']) {
            throw new Error('Cannot have core properties as additional');
        }
        const lastSyncUserDataState = {
            ref: lastSyncRemoteUserData.ref,
            version: undefined,
            ...additionalProps,
        };
        this.storageService.store(`${this.resource}.lastSyncUserData`, JSON.stringify(lastSyncUserDataState), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        await this.fileService.writeFile(this.lastSyncResource, VSBuffer.fromString(JSON.stringify(lastSyncRemoteUserData)));
    }
};
AbstractInitializer = __decorate([
    __param(1, IUserDataProfilesService),
    __param(2, IEnvironmentService),
    __param(3, ILogService),
    __param(4, IFileService),
    __param(5, IStorageService),
    __param(6, IUriIdentityService)
], AbstractInitializer);
export { AbstractInitializer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RTeW5jaHJvbml6ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vYWJzdHJhY3RTeW5jaHJvbml6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZELE9BQU8sRUFFTix1QkFBdUIsRUFDdkIsZ0JBQWdCLEdBQ2hCLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXhFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFjLE1BQU0sOEJBQThCLENBQUE7QUFFaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTlELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUczRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUVOLGtCQUFrQixFQUdsQixZQUFZLEVBQ1oscUJBQXFCLEdBQ3JCLE1BQU0sNkJBQTZCLENBQUE7QUFDcEMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FB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