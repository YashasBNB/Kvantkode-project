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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RTeW5jaHJvbml6ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL2Fic3RyYWN0U3luY2hyb25pemVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2RCxPQUFPLEVBRU4sdUJBQXVCLEVBQ3ZCLGdCQUFnQixHQUNoQixNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV4RSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBYyxNQUFNLDhCQUE4QixDQUFBO0FBRWhFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFHM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdFLE9BQU8sRUFFTixrQkFBa0IsRUFHbEIsWUFBWSxFQUNaLHFCQUFxQixHQUNyQixNQUFNLDZCQUE2QixDQUFBO0FBQ3BDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsbUJBQW1CLEVB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