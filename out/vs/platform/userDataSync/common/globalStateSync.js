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
import { VSBuffer } from '../../../base/common/buffer.js';
import { getErrorMessage } from '../../../base/common/errors.js';
import { Event } from '../../../base/common/event.js';
import { parse } from '../../../base/common/json.js';
import { toFormattedString } from '../../../base/common/jsonFormatter.js';
import { isWeb } from '../../../base/common/platform.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
import { getServiceMachineId } from '../../externalServices/common/serviceMachineId.js';
import { IStorageService, } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { AbstractInitializer, AbstractSynchroniser, getSyncResourceLogLabel, isSyncData, } from './abstractSynchronizer.js';
import { edit } from './content.js';
import { merge } from './globalStateMerge.js';
import { ALL_SYNC_RESOURCES, createSyncHeaders, getEnablementKey, IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncStoreService, SYNC_SERVICE_URL_TYPE, UserDataSyncError, USER_DATA_SYNC_SCHEME, } from './userDataSync.js';
import { IUserDataProfilesService, } from '../../userDataProfile/common/userDataProfile.js';
import { IUserDataProfileStorageService } from '../../userDataProfile/common/userDataProfileStorageService.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
const argvStoragePrefx = 'globalState.argv.';
const argvProperties = ['locale'];
export function stringify(globalState, format) {
    const storageKeys = globalState.storage ? Object.keys(globalState.storage).sort() : [];
    const storage = {};
    storageKeys.forEach((key) => (storage[key] = globalState.storage[key]));
    globalState.storage = storage;
    return format ? toFormattedString(globalState, {}) : JSON.stringify(globalState);
}
const GLOBAL_STATE_DATA_VERSION = 1;
/**
 * Synchronises global state that includes
 * 	- Global storage with user scope
 * 	- Locale from argv properties
 *
 * Global storage is synced without checking version just like other resources (settings, keybindings).
 * If there is a change in format of the value of a storage key which requires migration then
 * 		Owner of that key should remove that key from user scope and replace that with new user scoped key.
 */
let GlobalStateSynchroniser = class GlobalStateSynchroniser extends AbstractSynchroniser {
    constructor(profile, collection, userDataProfileStorageService, fileService, userDataSyncStoreService, userDataSyncLocalStoreService, logService, environmentService, userDataSyncEnablementService, telemetryService, configurationService, storageService, uriIdentityService, instantiationService) {
        super({ syncResource: "globalState" /* SyncResource.GlobalState */, profile }, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService);
        this.userDataProfileStorageService = userDataProfileStorageService;
        this.version = GLOBAL_STATE_DATA_VERSION;
        this.previewResource = this.extUri.joinPath(this.syncPreviewFolder, 'globalState.json');
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
        this.localGlobalStateProvider = instantiationService.createInstance(LocalGlobalStateProvider);
        this._register(fileService.watch(this.extUri.dirname(this.environmentService.argvResource)));
        this._register(Event.any(
        /* Locale change */
        Event.filter(fileService.onDidFilesChange, (e) => e.contains(this.environmentService.argvResource)), Event.filter(userDataProfileStorageService.onDidChange, (e) => {
            /* StorageTarget has changed in profile storage */
            if (e.targetChanges.some((profile) => this.syncResource.profile.id === profile.id)) {
                return true;
            }
            /* User storage data has changed in profile storage */
            if (e.valueChanges.some(({ profile, changes }) => this.syncResource.profile.id === profile.id &&
                changes.some((change) => change.target === 0 /* StorageTarget.USER */))) {
                return true;
            }
            return false;
        }))(() => this.triggerLocalChange()));
    }
    async generateSyncPreview(remoteUserData, lastSyncUserData, isRemoteDataFromCurrentMachine) {
        const remoteGlobalState = remoteUserData.syncData
            ? JSON.parse(remoteUserData.syncData.content)
            : null;
        // Use remote data as last sync data if last sync data does not exist and remote data is from same machine
        lastSyncUserData =
            lastSyncUserData === null && isRemoteDataFromCurrentMachine
                ? remoteUserData
                : lastSyncUserData;
        const lastSyncGlobalState = lastSyncUserData && lastSyncUserData.syncData
            ? JSON.parse(lastSyncUserData.syncData.content)
            : null;
        const localGlobalState = await this.localGlobalStateProvider.getLocalGlobalState(this.syncResource.profile);
        if (remoteGlobalState) {
            this.logService.trace(`${this.syncResourceLogLabel}: Merging remote ui state with local ui state...`);
        }
        else {
            this.logService.trace(`${this.syncResourceLogLabel}: Remote ui state does not exist. Synchronizing ui state for the first time.`);
        }
        const storageKeys = await this.getStorageKeys(lastSyncGlobalState);
        const { local, remote } = merge(localGlobalState.storage, remoteGlobalState ? remoteGlobalState.storage : null, lastSyncGlobalState ? lastSyncGlobalState.storage : null, storageKeys, this.logService);
        const previewResult = {
            content: null,
            local,
            remote,
            localChange: Object.keys(local.added).length > 0 ||
                Object.keys(local.updated).length > 0 ||
                local.removed.length > 0
                ? 2 /* Change.Modified */
                : 0 /* Change.None */,
            remoteChange: remote.all !== null ? 2 /* Change.Modified */ : 0 /* Change.None */,
        };
        const localContent = stringify(localGlobalState, false);
        return [
            {
                baseResource: this.baseResource,
                baseContent: lastSyncGlobalState ? stringify(lastSyncGlobalState, false) : localContent,
                localResource: this.localResource,
                localContent,
                localUserData: localGlobalState,
                remoteResource: this.remoteResource,
                remoteContent: remoteGlobalState ? stringify(remoteGlobalState, false) : null,
                previewResource: this.previewResource,
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.acceptedResource,
                storageKeys,
            },
        ];
    }
    async hasRemoteChanged(lastSyncUserData) {
        const lastSyncGlobalState = lastSyncUserData.syncData
            ? JSON.parse(lastSyncUserData.syncData.content)
            : null;
        if (lastSyncGlobalState === null) {
            return true;
        }
        const localGlobalState = await this.localGlobalStateProvider.getLocalGlobalState(this.syncResource.profile);
        const storageKeys = await this.getStorageKeys(lastSyncGlobalState);
        const { remote } = merge(localGlobalState.storage, lastSyncGlobalState.storage, lastSyncGlobalState.storage, storageKeys, this.logService);
        return remote.all !== null;
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
        if (resourcePreview.remoteContent !== null) {
            const remoteGlobalState = JSON.parse(resourcePreview.remoteContent);
            const { local, remote } = merge(resourcePreview.localUserData.storage, remoteGlobalState.storage, remoteGlobalState.storage, resourcePreview.storageKeys, this.logService);
            return {
                content: resourcePreview.remoteContent,
                local,
                remote,
                localChange: 0 /* Change.None */,
                remoteChange: remote.all !== null ? 2 /* Change.Modified */ : 0 /* Change.None */,
            };
        }
        else {
            return {
                content: resourcePreview.localContent,
                local: { added: {}, removed: [], updated: {} },
                remote: {
                    added: Object.keys(resourcePreview.localUserData.storage),
                    removed: [],
                    updated: [],
                    all: resourcePreview.localUserData.storage,
                },
                localChange: 0 /* Change.None */,
                remoteChange: 2 /* Change.Modified */,
            };
        }
    }
    async acceptRemote(resourcePreview) {
        if (resourcePreview.remoteContent !== null) {
            const remoteGlobalState = JSON.parse(resourcePreview.remoteContent);
            const { local, remote } = merge(resourcePreview.localUserData.storage, remoteGlobalState.storage, resourcePreview.localUserData.storage, resourcePreview.storageKeys, this.logService);
            return {
                content: resourcePreview.remoteContent,
                local,
                remote,
                localChange: Object.keys(local.added).length > 0 ||
                    Object.keys(local.updated).length > 0 ||
                    local.removed.length > 0
                    ? 2 /* Change.Modified */
                    : 0 /* Change.None */,
                remoteChange: 0 /* Change.None */,
            };
        }
        else {
            return {
                content: resourcePreview.remoteContent,
                local: { added: {}, removed: [], updated: {} },
                remote: { added: [], removed: [], updated: [], all: null },
                localChange: 0 /* Change.None */,
                remoteChange: 0 /* Change.None */,
            };
        }
    }
    async applyResult(remoteUserData, lastSyncUserData, resourcePreviews, force) {
        const { localUserData } = resourcePreviews[0][0];
        const { local, remote, localChange, remoteChange } = resourcePreviews[0][1];
        if (localChange === 0 /* Change.None */ && remoteChange === 0 /* Change.None */) {
            this.logService.info(`${this.syncResourceLogLabel}: No changes found during synchronizing ui state.`);
        }
        if (localChange !== 0 /* Change.None */) {
            // update local
            this.logService.trace(`${this.syncResourceLogLabel}: Updating local ui state...`);
            await this.backupLocal(JSON.stringify(localUserData));
            await this.localGlobalStateProvider.writeLocalGlobalState(local, this.syncResource.profile);
            this.logService.info(`${this.syncResourceLogLabel}: Updated local ui state`);
        }
        if (remoteChange !== 0 /* Change.None */) {
            // update remote
            this.logService.trace(`${this.syncResourceLogLabel}: Updating remote ui state...`);
            const content = JSON.stringify({ storage: remote.all });
            remoteUserData = await this.updateRemoteUserData(content, force ? null : remoteUserData.ref);
            this.logService.info(`${this.syncResourceLogLabel}: Updated remote ui state.${remote.added.length ? ` Added: ${remote.added}.` : ''}${remote.updated.length ? ` Updated: ${remote.updated}.` : ''}${remote.removed.length ? ` Removed: ${remote.removed}.` : ''}`);
        }
        if (lastSyncUserData?.ref !== remoteUserData.ref) {
            // update last sync
            this.logService.trace(`${this.syncResourceLogLabel}: Updating last synchronized ui state...`);
            await this.updateLastSyncUserData(remoteUserData);
            this.logService.info(`${this.syncResourceLogLabel}: Updated last synchronized ui state`);
        }
    }
    async resolveContent(uri) {
        if (this.extUri.isEqual(this.remoteResource, uri) ||
            this.extUri.isEqual(this.baseResource, uri) ||
            this.extUri.isEqual(this.localResource, uri) ||
            this.extUri.isEqual(this.acceptedResource, uri)) {
            const content = await this.resolvePreviewContent(uri);
            return content ? stringify(JSON.parse(content), true) : content;
        }
        return null;
    }
    async hasLocalData() {
        try {
            const { storage } = await this.localGlobalStateProvider.getLocalGlobalState(this.syncResource.profile);
            if (Object.keys(storage).length > 1 ||
                storage[`${argvStoragePrefx}.locale`]?.value !== 'en') {
                return true;
            }
        }
        catch (error) {
            /* ignore error */
        }
        return false;
    }
    async getStorageKeys(lastSyncGlobalState) {
        const storageData = await this.userDataProfileStorageService.readStorageData(this.syncResource.profile);
        const user = [], machine = [];
        for (const [key, value] of storageData) {
            if (value.target === 0 /* StorageTarget.USER */) {
                user.push(key);
            }
            else if (value.target === 1 /* StorageTarget.MACHINE */) {
                machine.push(key);
            }
        }
        const registered = [...user, ...machine];
        const unregistered = lastSyncGlobalState?.storage
            ? Object.keys(lastSyncGlobalState.storage).filter((key) => !key.startsWith(argvStoragePrefx) &&
                !registered.includes(key) &&
                storageData.get(key) !== undefined)
            : [];
        if (!isWeb) {
            // Following keys are synced only in web. Do not sync these keys in other platforms
            const keysSyncedOnlyInWeb = [
                ...ALL_SYNC_RESOURCES.map((resource) => getEnablementKey(resource)),
                SYNC_SERVICE_URL_TYPE,
            ];
            unregistered.push(...keysSyncedOnlyInWeb);
            machine.push(...keysSyncedOnlyInWeb);
        }
        return { user, machine, unregistered };
    }
};
GlobalStateSynchroniser = __decorate([
    __param(2, IUserDataProfileStorageService),
    __param(3, IFileService),
    __param(4, IUserDataSyncStoreService),
    __param(5, IUserDataSyncLocalStoreService),
    __param(6, IUserDataSyncLogService),
    __param(7, IEnvironmentService),
    __param(8, IUserDataSyncEnablementService),
    __param(9, ITelemetryService),
    __param(10, IConfigurationService),
    __param(11, IStorageService),
    __param(12, IUriIdentityService),
    __param(13, IInstantiationService)
], GlobalStateSynchroniser);
export { GlobalStateSynchroniser };
let LocalGlobalStateProvider = class LocalGlobalStateProvider {
    constructor(fileService, environmentService, userDataProfileStorageService, logService) {
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.userDataProfileStorageService = userDataProfileStorageService;
        this.logService = logService;
    }
    async getLocalGlobalState(profile) {
        const storage = {};
        if (profile.isDefault) {
            const argvContent = await this.getLocalArgvContent();
            const argvValue = parse(argvContent);
            for (const argvProperty of argvProperties) {
                if (argvValue[argvProperty] !== undefined) {
                    storage[`${argvStoragePrefx}${argvProperty}`] = {
                        version: 1,
                        value: argvValue[argvProperty],
                    };
                }
            }
        }
        const storageData = await this.userDataProfileStorageService.readStorageData(profile);
        for (const [key, value] of storageData) {
            if (value.value && value.target === 0 /* StorageTarget.USER */) {
                storage[key] = { version: 1, value: value.value };
            }
        }
        return { storage };
    }
    async getLocalArgvContent() {
        try {
            this.logService.debug('GlobalStateSync#getLocalArgvContent', this.environmentService.argvResource);
            const content = await this.fileService.readFile(this.environmentService.argvResource);
            this.logService.debug('GlobalStateSync#getLocalArgvContent - Resolved', this.environmentService.argvResource);
            return content.value.toString();
        }
        catch (error) {
            this.logService.debug(getErrorMessage(error));
        }
        return '{}';
    }
    async writeLocalGlobalState({ added, removed, updated, }, profile) {
        const syncResourceLogLabel = getSyncResourceLogLabel("globalState" /* SyncResource.GlobalState */, profile);
        const argv = {};
        const updatedStorage = new Map();
        const storageData = await this.userDataProfileStorageService.readStorageData(profile);
        const handleUpdatedStorage = (keys, storage) => {
            for (const key of keys) {
                if (key.startsWith(argvStoragePrefx)) {
                    argv[key.substring(argvStoragePrefx.length)] = storage ? storage[key].value : undefined;
                    continue;
                }
                if (storage) {
                    const storageValue = storage[key];
                    if (storageValue.value !== storageData.get(key)?.value) {
                        updatedStorage.set(key, storageValue.value);
                    }
                }
                else {
                    if (storageData.get(key) !== undefined) {
                        updatedStorage.set(key, undefined);
                    }
                }
            }
        };
        handleUpdatedStorage(Object.keys(added), added);
        handleUpdatedStorage(Object.keys(updated), updated);
        handleUpdatedStorage(removed);
        if (Object.keys(argv).length) {
            this.logService.trace(`${syncResourceLogLabel}: Updating locale...`);
            const argvContent = await this.getLocalArgvContent();
            let content = argvContent;
            for (const argvProperty of Object.keys(argv)) {
                content = edit(content, [argvProperty], argv[argvProperty], {});
            }
            if (argvContent !== content) {
                this.logService.trace(`${syncResourceLogLabel}: Updating locale...`);
                await this.fileService.writeFile(this.environmentService.argvResource, VSBuffer.fromString(content));
                this.logService.info(`${syncResourceLogLabel}: Updated locale.`);
            }
            this.logService.info(`${syncResourceLogLabel}: Updated locale`);
        }
        if (updatedStorage.size) {
            this.logService.trace(`${syncResourceLogLabel}: Updating global state...`);
            await this.userDataProfileStorageService.updateStorageData(profile, updatedStorage, 0 /* StorageTarget.USER */);
            this.logService.info(`${syncResourceLogLabel}: Updated global state`, [
                ...updatedStorage.keys(),
            ]);
        }
    }
};
LocalGlobalStateProvider = __decorate([
    __param(0, IFileService),
    __param(1, IEnvironmentService),
    __param(2, IUserDataProfileStorageService),
    __param(3, IUserDataSyncLogService)
], LocalGlobalStateProvider);
export { LocalGlobalStateProvider };
let GlobalStateInitializer = class GlobalStateInitializer extends AbstractInitializer {
    constructor(storageService, fileService, userDataProfilesService, environmentService, logService, uriIdentityService) {
        super("globalState" /* SyncResource.GlobalState */, userDataProfilesService, environmentService, logService, fileService, storageService, uriIdentityService);
    }
    async doInitialize(remoteUserData) {
        const remoteGlobalState = remoteUserData.syncData
            ? JSON.parse(remoteUserData.syncData.content)
            : null;
        if (!remoteGlobalState) {
            this.logService.info('Skipping initializing global state because remote global state does not exist.');
            return;
        }
        const argv = {};
        const storage = {};
        for (const key of Object.keys(remoteGlobalState.storage)) {
            if (key.startsWith(argvStoragePrefx)) {
                argv[key.substring(argvStoragePrefx.length)] = remoteGlobalState.storage[key].value;
            }
            else {
                if (this.storageService.get(key, 0 /* StorageScope.PROFILE */) === undefined) {
                    storage[key] = remoteGlobalState.storage[key].value;
                }
            }
        }
        if (Object.keys(argv).length) {
            let content = '{}';
            try {
                const fileContent = await this.fileService.readFile(this.environmentService.argvResource);
                content = fileContent.value.toString();
            }
            catch (error) { }
            for (const argvProperty of Object.keys(argv)) {
                content = edit(content, [argvProperty], argv[argvProperty], {});
            }
            await this.fileService.writeFile(this.environmentService.argvResource, VSBuffer.fromString(content));
        }
        if (Object.keys(storage).length) {
            const storageEntries = [];
            for (const key of Object.keys(storage)) {
                storageEntries.push({
                    key,
                    value: storage[key],
                    scope: 0 /* StorageScope.PROFILE */,
                    target: 0 /* StorageTarget.USER */,
                });
            }
            this.storageService.storeAll(storageEntries, true);
        }
    }
};
GlobalStateInitializer = __decorate([
    __param(0, IStorageService),
    __param(1, IFileService),
    __param(2, IUserDataProfilesService),
    __param(3, IEnvironmentService),
    __param(4, IUserDataSyncLogService),
    __param(5, IUriIdentityService)
], GlobalStateInitializer);
export { GlobalStateInitializer };
let UserDataSyncStoreTypeSynchronizer = class UserDataSyncStoreTypeSynchronizer {
    constructor(userDataSyncStoreClient, storageService, environmentService, fileService, logService) {
        this.userDataSyncStoreClient = userDataSyncStoreClient;
        this.storageService = storageService;
        this.environmentService = environmentService;
        this.fileService = fileService;
        this.logService = logService;
    }
    getSyncStoreType(userData) {
        const remoteGlobalState = this.parseGlobalState(userData);
        return remoteGlobalState?.storage[SYNC_SERVICE_URL_TYPE]?.value;
    }
    async sync(userDataSyncStoreType) {
        const syncHeaders = createSyncHeaders(generateUuid());
        try {
            return await this.doSync(userDataSyncStoreType, syncHeaders);
        }
        catch (e) {
            if (e instanceof UserDataSyncError) {
                switch (e.code) {
                    case "PreconditionFailed" /* UserDataSyncErrorCode.PreconditionFailed */:
                        this.logService.info(`Failed to synchronize UserDataSyncStoreType as there is a new remote version available. Synchronizing again...`);
                        return this.doSync(userDataSyncStoreType, syncHeaders);
                }
            }
            throw e;
        }
    }
    async doSync(userDataSyncStoreType, syncHeaders) {
        // Read the global state from remote
        const globalStateUserData = await this.userDataSyncStoreClient.readResource("globalState" /* SyncResource.GlobalState */, null, undefined, syncHeaders);
        const remoteGlobalState = this.parseGlobalState(globalStateUserData) || { storage: {} };
        // Update the sync store type
        remoteGlobalState.storage[SYNC_SERVICE_URL_TYPE] = {
            value: userDataSyncStoreType,
            version: GLOBAL_STATE_DATA_VERSION,
        };
        // Write the global state to remote
        const machineId = await getServiceMachineId(this.environmentService, this.fileService, this.storageService);
        const syncDataToUpdate = {
            version: GLOBAL_STATE_DATA_VERSION,
            machineId,
            content: stringify(remoteGlobalState, false),
        };
        await this.userDataSyncStoreClient.writeResource("globalState" /* SyncResource.GlobalState */, JSON.stringify(syncDataToUpdate), globalStateUserData.ref, undefined, syncHeaders);
    }
    parseGlobalState({ content }) {
        if (!content) {
            return null;
        }
        const syncData = JSON.parse(content);
        if (isSyncData(syncData)) {
            return syncData ? JSON.parse(syncData.content) : null;
        }
        throw new Error('Invalid remote data');
    }
};
UserDataSyncStoreTypeSynchronizer = __decorate([
    __param(1, IStorageService),
    __param(2, IEnvironmentService),
    __param(3, IFileService),
    __param(4, ILogService)
], UserDataSyncStoreTypeSynchronizer);
export { UserDataSyncStoreTypeSynchronizer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYmFsU3RhdGVTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi9nbG9iYWxTdGF0ZVN5bmMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBR3pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3BELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFM0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzFELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN2RixPQUFPLEVBRU4sZUFBZSxHQUdmLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixv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