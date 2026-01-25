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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYmFsU3RhdGVTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL2dsb2JhbFN0YXRlU3luYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFHekQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDcEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDekUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXhELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUUzRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDMUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3ZGLE9BQU8sRUFFTixlQUFlLEdBR2YsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBQ04sbUJBQW1CLEVB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