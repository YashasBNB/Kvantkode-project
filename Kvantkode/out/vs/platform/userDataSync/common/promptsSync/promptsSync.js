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
import { Event } from '../../../../base/common/event.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { deepClone } from '../../../../base/common/objects.js';
import { isPromptFile } from '../../../prompts/common/constants.js';
import { IStorageService } from '../../../storage/common/storage.js';
import { ITelemetryService } from '../../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../../uriIdentity/common/uriIdentity.js';
import { IEnvironmentService } from '../../../environment/common/environment.js';
import { IConfigurationService } from '../../../configuration/common/configuration.js';
import { areSame, merge } from './promptsMerge.js';
import { AbstractSynchroniser, } from '../abstractSynchronizer.js';
import { FileOperationError, IFileService, } from '../../../files/common/files.js';
import { IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncStoreService, USER_DATA_SYNC_SCHEME, } from '../userDataSync.js';
export function parsePrompts(syncData) {
    return JSON.parse(syncData.content);
}
/**
 * Synchronizer class for the "user" prompt files.
 * Adopted from {@link SnippetsSynchroniser}.
 */
let PromptsSynchronizer = class PromptsSynchronizer extends AbstractSynchroniser {
    constructor(profile, collection, environmentService, fileService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, logService, configurationService, userDataSyncEnablementService, telemetryService, uriIdentityService) {
        const syncResource = { syncResource: "prompts" /* SyncResource.Prompts */, profile };
        super(syncResource, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService);
        this.version = 1;
        this.promptsFolder = profile.promptsHome;
        this._register(this.fileService.watch(environmentService.userRoamingDataHome));
        this._register(this.fileService.watch(this.promptsFolder));
        this._register(Event.filter(this.fileService.onDidFilesChange, (e) => e.affects(this.promptsFolder))(() => this.triggerLocalChange()));
    }
    async generateSyncPreview(remoteUserData, lastSyncUserData, isRemoteDataFromCurrentMachine) {
        const local = await this.getPromptsFileContents();
        const localPrompts = this.toPromptContents(local);
        const remotePrompts = remoteUserData.syncData
            ? this.parsePrompts(remoteUserData.syncData)
            : null;
        // Use remote data as last sync data if last sync data does not exist and remote data is from same machine
        lastSyncUserData =
            lastSyncUserData === null && isRemoteDataFromCurrentMachine
                ? remoteUserData
                : lastSyncUserData;
        const lastSyncPrompts = lastSyncUserData && lastSyncUserData.syncData
            ? this.parsePrompts(lastSyncUserData.syncData)
            : null;
        if (remotePrompts) {
            this.logService.trace(`${this.syncResourceLogLabel}: Merging remote prompts with local prompts...`);
        }
        else {
            this.logService.trace(`${this.syncResourceLogLabel}: Remote prompts does not exist. Synchronizing prompts for the first time.`);
        }
        const mergeResult = merge(localPrompts, remotePrompts, lastSyncPrompts);
        return this.getResourcePreviews(mergeResult, local, remotePrompts || {}, lastSyncPrompts || {});
    }
    async hasRemoteChanged(lastSyncUserData) {
        const lastSync = lastSyncUserData.syncData
            ? this.parsePrompts(lastSyncUserData.syncData)
            : null;
        if (lastSync === null) {
            return true;
        }
        const local = await this.getPromptsFileContents();
        const localPrompts = this.toPromptContents(local);
        const mergeResult = merge(localPrompts, lastSync, lastSync);
        return (Object.keys(mergeResult.remote.added).length > 0 ||
            Object.keys(mergeResult.remote.updated).length > 0 ||
            mergeResult.remote.removed.length > 0 ||
            mergeResult.conflicts.length > 0);
    }
    async getMergeResult(resourcePreview, token) {
        return resourcePreview.previewResult;
    }
    async getAcceptResult(resourcePreview, resource, content, token) {
        /* Accept local resource */
        if (this.extUri.isEqualOrParent(resource, this.syncPreviewFolder.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }))) {
            return {
                content: resourcePreview.fileContent ? resourcePreview.fileContent.value.toString() : null,
                localChange: 0 /* Change.None */,
                remoteChange: resourcePreview.fileContent
                    ? resourcePreview.remoteContent !== null
                        ? 2 /* Change.Modified */
                        : 1 /* Change.Added */
                    : 3 /* Change.Deleted */,
            };
        }
        /* Accept remote resource */
        if (this.extUri.isEqualOrParent(resource, this.syncPreviewFolder.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }))) {
            return {
                content: resourcePreview.remoteContent,
                localChange: resourcePreview.remoteContent !== null
                    ? resourcePreview.fileContent
                        ? 2 /* Change.Modified */
                        : 1 /* Change.Added */
                    : 3 /* Change.Deleted */,
                remoteChange: 0 /* Change.None */,
            };
        }
        /* Accept preview resource */
        if (this.extUri.isEqualOrParent(resource, this.syncPreviewFolder)) {
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
                    localChange: content === null
                        ? resourcePreview.fileContent !== null
                            ? 3 /* Change.Deleted */
                            : 0 /* Change.None */
                        : 2 /* Change.Modified */,
                    remoteChange: content === null
                        ? resourcePreview.remoteContent !== null
                            ? 3 /* Change.Deleted */
                            : 0 /* Change.None */
                        : 2 /* Change.Modified */,
                };
            }
        }
        throw new Error(`Invalid Resource: ${resource.toString()}`);
    }
    async applyResult(remoteUserData, lastSyncUserData, resourcePreviews, force) {
        const accptedResourcePreviews = resourcePreviews.map(([resourcePreview, acceptResult]) => ({ ...resourcePreview, acceptResult }));
        if (accptedResourcePreviews.every(({ localChange, remoteChange }) => localChange === 0 /* Change.None */ && remoteChange === 0 /* Change.None */)) {
            this.logService.info(`${this.syncResourceLogLabel}: No changes found during synchronizing prompts.`);
        }
        if (accptedResourcePreviews.some(({ localChange }) => localChange !== 0 /* Change.None */)) {
            // back up all prompts
            await this.updateLocalBackup(accptedResourcePreviews);
            await this.updateLocalPrompts(accptedResourcePreviews, force);
        }
        if (accptedResourcePreviews.some(({ remoteChange }) => remoteChange !== 0 /* Change.None */)) {
            remoteUserData = await this.updateRemotePrompts(accptedResourcePreviews, remoteUserData, force);
        }
        if (lastSyncUserData?.ref !== remoteUserData.ref) {
            // update last sync
            this.logService.trace(`${this.syncResourceLogLabel}: Updating last synchronized prompts...`);
            await this.updateLastSyncUserData(remoteUserData);
            this.logService.info(`${this.syncResourceLogLabel}: Updated last synchronized prompts`);
        }
        for (const { previewResource } of accptedResourcePreviews) {
            // Delete the preview
            try {
                await this.fileService.del(previewResource);
            }
            catch (e) {
                /* ignore */
            }
        }
    }
    getResourcePreviews(mergeResult, localFileContent, remote, base) {
        const resourcePreviews = new Map();
        /* Prompts added remotely -> add locally */
        for (const key of Object.keys(mergeResult.local.added)) {
            const previewResult = {
                content: mergeResult.local.added[key],
                hasConflicts: false,
                localChange: 1 /* Change.Added */,
                remoteChange: 0 /* Change.None */,
            };
            resourcePreviews.set(key, {
                baseResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' }),
                baseContent: null,
                fileContent: null,
                localResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }),
                localContent: null,
                remoteResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }),
                remoteContent: remote[key],
                previewResource: this.extUri.joinPath(this.syncPreviewFolder, key),
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' }),
            });
        }
        /* Prompts updated remotely -> update locally */
        for (const key of Object.keys(mergeResult.local.updated)) {
            const previewResult = {
                content: mergeResult.local.updated[key],
                hasConflicts: false,
                localChange: 2 /* Change.Modified */,
                remoteChange: 0 /* Change.None */,
            };
            const localContent = localFileContent[key] ? localFileContent[key].value.toString() : null;
            resourcePreviews.set(key, {
                baseResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' }),
                baseContent: base[key] ?? null,
                localResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }),
                fileContent: localFileContent[key],
                localContent,
                remoteResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }),
                remoteContent: remote[key],
                previewResource: this.extUri.joinPath(this.syncPreviewFolder, key),
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' }),
            });
        }
        /* Prompts removed remotely -> remove locally */
        for (const key of mergeResult.local.removed) {
            const previewResult = {
                content: null,
                hasConflicts: false,
                localChange: 3 /* Change.Deleted */,
                remoteChange: 0 /* Change.None */,
            };
            const localContent = localFileContent[key] ? localFileContent[key].value.toString() : null;
            resourcePreviews.set(key, {
                baseResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' }),
                baseContent: base[key] ?? null,
                localResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }),
                fileContent: localFileContent[key],
                localContent,
                remoteResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }),
                remoteContent: null,
                previewResource: this.extUri.joinPath(this.syncPreviewFolder, key),
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' }),
            });
        }
        /* Prompts added locally -> add remotely */
        for (const key of Object.keys(mergeResult.remote.added)) {
            const previewResult = {
                content: mergeResult.remote.added[key],
                hasConflicts: false,
                localChange: 0 /* Change.None */,
                remoteChange: 1 /* Change.Added */,
            };
            const localContent = localFileContent[key] ? localFileContent[key].value.toString() : null;
            resourcePreviews.set(key, {
                baseResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' }),
                baseContent: base[key] ?? null,
                localResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }),
                fileContent: localFileContent[key],
                localContent,
                remoteResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }),
                remoteContent: null,
                previewResource: this.extUri.joinPath(this.syncPreviewFolder, key),
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' }),
            });
        }
        /* Prompts updated locally -> update remotely */
        for (const key of Object.keys(mergeResult.remote.updated)) {
            const previewResult = {
                content: mergeResult.remote.updated[key],
                hasConflicts: false,
                localChange: 0 /* Change.None */,
                remoteChange: 2 /* Change.Modified */,
            };
            const localContent = localFileContent[key] ? localFileContent[key].value.toString() : null;
            resourcePreviews.set(key, {
                baseResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' }),
                baseContent: base[key] ?? null,
                localResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }),
                fileContent: localFileContent[key],
                localContent,
                remoteResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }),
                remoteContent: remote[key],
                previewResource: this.extUri.joinPath(this.syncPreviewFolder, key),
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' }),
            });
        }
        /* Prompts removed locally -> remove remotely */
        for (const key of mergeResult.remote.removed) {
            const previewResult = {
                content: null,
                hasConflicts: false,
                localChange: 0 /* Change.None */,
                remoteChange: 3 /* Change.Deleted */,
            };
            resourcePreviews.set(key, {
                baseResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' }),
                baseContent: base[key] ?? null,
                localResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }),
                fileContent: null,
                localContent: null,
                remoteResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }),
                remoteContent: remote[key],
                previewResource: this.extUri.joinPath(this.syncPreviewFolder, key),
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' }),
            });
        }
        /* Prompts with conflicts */
        for (const key of mergeResult.conflicts) {
            const previewResult = {
                content: base[key] ?? null,
                hasConflicts: true,
                localChange: localFileContent[key] ? 2 /* Change.Modified */ : 1 /* Change.Added */,
                remoteChange: remote[key] ? 2 /* Change.Modified */ : 1 /* Change.Added */,
            };
            const localContent = localFileContent[key] ? localFileContent[key].value.toString() : null;
            resourcePreviews.set(key, {
                baseResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' }),
                baseContent: base[key] ?? null,
                localResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }),
                fileContent: localFileContent[key] || null,
                localContent,
                remoteResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }),
                remoteContent: remote[key] || null,
                previewResource: this.extUri.joinPath(this.syncPreviewFolder, key),
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' }),
            });
        }
        /* Unmodified Prompts */
        for (const key of Object.keys(localFileContent)) {
            if (!resourcePreviews.has(key)) {
                const previewResult = {
                    content: localFileContent[key] ? localFileContent[key].value.toString() : null,
                    hasConflicts: false,
                    localChange: 0 /* Change.None */,
                    remoteChange: 0 /* Change.None */,
                };
                const localContent = localFileContent[key] ? localFileContent[key].value.toString() : null;
                resourcePreviews.set(key, {
                    baseResource: this.extUri
                        .joinPath(this.syncPreviewFolder, key)
                        .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' }),
                    baseContent: base[key] ?? null,
                    localResource: this.extUri
                        .joinPath(this.syncPreviewFolder, key)
                        .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }),
                    fileContent: localFileContent[key] || null,
                    localContent,
                    remoteResource: this.extUri
                        .joinPath(this.syncPreviewFolder, key)
                        .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }),
                    remoteContent: remote[key] || null,
                    previewResource: this.extUri.joinPath(this.syncPreviewFolder, key),
                    previewResult,
                    localChange: previewResult.localChange,
                    remoteChange: previewResult.remoteChange,
                    acceptedResource: this.extUri
                        .joinPath(this.syncPreviewFolder, key)
                        .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' }),
                });
            }
        }
        return [...resourcePreviews.values()];
    }
    async resolveContent(uri) {
        if (this.extUri.isEqualOrParent(uri, this.syncPreviewFolder.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' })) ||
            this.extUri.isEqualOrParent(uri, this.syncPreviewFolder.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' })) ||
            this.extUri.isEqualOrParent(uri, this.syncPreviewFolder.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' })) ||
            this.extUri.isEqualOrParent(uri, this.syncPreviewFolder.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' }))) {
            return this.resolvePreviewContent(uri);
        }
        return null;
    }
    async hasLocalData() {
        try {
            const local = await this.getPromptsFileContents();
            if (Object.keys(local).length) {
                return true;
            }
        }
        catch (error) {
            /* ignore error */
        }
        return false;
    }
    async updateLocalBackup(resourcePreviews) {
        const local = {};
        for (const resourcePreview of resourcePreviews) {
            if (resourcePreview.fileContent) {
                local[this.extUri.basename(resourcePreview.localResource)] = resourcePreview.fileContent;
            }
        }
        await this.backupLocal(JSON.stringify(this.toPromptContents(local)));
    }
    async updateLocalPrompts(resourcePreviews, force) {
        for (const { fileContent, acceptResult, localResource, remoteResource, localChange, } of resourcePreviews) {
            if (localChange !== 0 /* Change.None */) {
                const key = remoteResource
                    ? this.extUri.basename(remoteResource)
                    : this.extUri.basename(localResource);
                const resource = this.extUri.joinPath(this.promptsFolder, key);
                // Removed
                if (localChange === 3 /* Change.Deleted */) {
                    this.logService.trace(`${this.syncResourceLogLabel}: Deleting prompt...`, this.extUri.basename(resource));
                    await this.fileService.del(resource);
                    this.logService.info(`${this.syncResourceLogLabel}: Deleted prompt`, this.extUri.basename(resource));
                }
                // Added
                else if (localChange === 1 /* Change.Added */) {
                    this.logService.trace(`${this.syncResourceLogLabel}: Creating prompt...`, this.extUri.basename(resource));
                    await this.fileService.createFile(resource, VSBuffer.fromString(acceptResult.content), {
                        overwrite: force,
                    });
                    this.logService.info(`${this.syncResourceLogLabel}: Created prompt`, this.extUri.basename(resource));
                }
                // Updated
                else {
                    this.logService.trace(`${this.syncResourceLogLabel}: Updating prompt...`, this.extUri.basename(resource));
                    await this.fileService.writeFile(resource, VSBuffer.fromString(acceptResult.content), force ? undefined : fileContent);
                    this.logService.info(`${this.syncResourceLogLabel}: Updated prompt`, this.extUri.basename(resource));
                }
            }
        }
    }
    async updateRemotePrompts(resourcePreviews, remoteUserData, forcePush) {
        const currentPrompts = remoteUserData.syncData
            ? this.parsePrompts(remoteUserData.syncData)
            : {};
        const newPrompts = deepClone(currentPrompts);
        for (const { acceptResult, localResource, remoteResource, remoteChange } of resourcePreviews) {
            if (remoteChange !== 0 /* Change.None */) {
                const key = localResource
                    ? this.extUri.basename(localResource)
                    : this.extUri.basename(remoteResource);
                if (remoteChange === 3 /* Change.Deleted */) {
                    delete newPrompts[key];
                }
                else {
                    newPrompts[key] = acceptResult.content;
                }
            }
        }
        if (!areSame(currentPrompts, newPrompts)) {
            // update remote
            this.logService.trace(`${this.syncResourceLogLabel}: Updating remote prompts...`);
            remoteUserData = await this.updateRemoteUserData(JSON.stringify(newPrompts), forcePush ? null : remoteUserData.ref);
            this.logService.info(`${this.syncResourceLogLabel}: Updated remote prompts`);
        }
        return remoteUserData;
    }
    parsePrompts(syncData) {
        return parsePrompts(syncData);
    }
    toPromptContents(fileContents) {
        const prompts = {};
        for (const key of Object.keys(fileContents)) {
            prompts[key] = fileContents[key].value.toString();
        }
        return prompts;
    }
    async getPromptsFileContents() {
        const prompts = {};
        let stat;
        try {
            stat = await this.fileService.resolve(this.promptsFolder);
        }
        catch (e) {
            // No prompts
            if (e instanceof FileOperationError &&
                e.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                return prompts;
            }
            else {
                throw e;
            }
        }
        for (const entry of stat.children || []) {
            const resource = entry.resource;
            if (!isPromptFile(resource)) {
                continue;
            }
            const key = this.extUri.relativePath(this.promptsFolder, resource);
            const content = await this.fileService.readFile(resource);
            prompts[key] = content;
        }
        return prompts;
    }
};
PromptsSynchronizer = __decorate([
    __param(2, IEnvironmentService),
    __param(3, IFileService),
    __param(4, IStorageService),
    __param(5, IUserDataSyncStoreService),
    __param(6, IUserDataSyncLocalStoreService),
    __param(7, IUserDataSyncLogService),
    __param(8, IConfigurationService),
    __param(9, IUserDataSyncEnablementService),
    __param(10, ITelemetryService),
    __param(11, IUriIdentityService)
], PromptsSynchronizer);
export { PromptsSynchronizer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0c1N5bmMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vcHJvbXB0c1N5bmMvcHJvbXB0c1N5bmMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDOUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUcxRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsT0FBTyxFQUF1QyxLQUFLLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUN2RixPQUFPLEVBQ04sb0JBQW9CLEdBSXBCLE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUNOLGtCQUFrQixFQUdsQixZQUFZLEdBRVosTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBSU4sOEJBQThCLEVBRTlCLHVCQUF1QixFQUN2Qiw4QkFBOEIsRUFDOUIseUJBQXlCLEVBRXpCLHFCQUFxQixHQUNyQixNQUFNLG9CQUFvQixDQUFBO0FBVTNCLE1BQU0sVUFBVSxZQUFZLENBQUMsUUFBbUI7SUFDL0MsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtBQUNwQyxDQUFDO0FBRUQ7OztHQUdHO0FBQ0ksSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxvQkFBb0I7SUFJNUQsWUFDQyxPQUF5QixFQUN6QixVQUE4QixFQUNULGtCQUF1QyxFQUM5QyxXQUF5QixFQUN0QixjQUErQixFQUNyQix3QkFBbUQsRUFDOUMsNkJBQTZELEVBQ3BFLFVBQW1DLEVBQ3JDLG9CQUEyQyxFQUNsQyw2QkFBNkQsRUFDMUUsZ0JBQW1DLEVBQ2pDLGtCQUF1QztRQUU1RCxNQUFNLFlBQVksR0FBRyxFQUFFLFlBQVksc0NBQXNCLEVBQUUsT0FBTyxFQUFFLENBQUE7UUFDcEUsS0FBSyxDQUNKLFlBQVksRUFDWixVQUFVLEVBQ1YsV0FBVyxFQUNYLGtCQUFrQixFQUNsQixjQUFjLEVBQ2Qsd0JBQXdCLEVBQ3hCLDZCQUE2QixFQUM3Qiw2QkFBNkIsRUFDN0IsZ0JBQWdCLEVBQ2hCLFVBQVUsRUFDVixvQkFBb0IsRUFDcEIsa0JBQWtCLENBQ2xCLENBQUE7UUEvQmlCLFlBQU8sR0FBVyxDQUFDLENBQUE7UUFpQ3JDLElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQTtRQUN4QyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQTtRQUM5RSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFBO1FBQzFELElBQUksQ0FBQyxTQUFTLENBQ2IsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUMxRixJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FDekIsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVTLEtBQUssQ0FBQyxtQkFBbUIsQ0FDbEMsY0FBK0IsRUFDL0IsZ0JBQXdDLEVBQ3hDLDhCQUF1QztRQUV2QyxNQUFNLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFBO1FBQ2pELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNqRCxNQUFNLGFBQWEsR0FBcUMsY0FBYyxDQUFDLFFBQVE7WUFDOUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQztZQUM1QyxDQUFDLENBQUMsSUFBSSxDQUFBO1FBRVAsMEdBQTBHO1FBQzFHLGdCQUFnQjtZQUNmLGdCQUFnQixLQUFLLElBQUksSUFBSSw4QkFBOEI7Z0JBQzFELENBQUMsQ0FBQyxjQUFjO2dCQUNoQixDQUFDLENBQUMsZ0JBQWdCLENBQUE7UUFDcEIsTUFBTSxlQUFlLEdBQ3BCLGdCQUFnQixJQUFJLGdCQUFnQixDQUFDLFFBQVE7WUFDNUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDO1lBQzlDLENBQUMsQ0FBQyxJQUFJLENBQUE7UUFFUixJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUNwQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsZ0RBQWdELENBQzVFLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUNwQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsNEVBQTRFLENBQ3hHLENBQUE7UUFDRixDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLFlBQVksRUFBRSxhQUFhLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDdkUsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsV0FBVyxFQUFFLEtBQUssRUFBRSxhQUFhLElBQUksRUFBRSxFQUFFLGVBQWUsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUNoRyxDQUFDO0lBRVMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLGdCQUFpQztRQUNqRSxNQUFNLFFBQVEsR0FBcUMsZ0JBQWdCLENBQUMsUUFBUTtZQUMzRSxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUM7WUFDOUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtRQUNQLElBQUksUUFBUSxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ3ZCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUE7UUFDakQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2pELE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzNELE9BQU8sQ0FDTixNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUM7WUFDaEQsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQ2xELFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQ3JDLFdBQVcsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FDaEMsQ0FBQTtJQUNGLENBQUM7SUFFUyxLQUFLLENBQUMsY0FBYyxDQUM3QixlQUF3QyxFQUN4QyxLQUF3QjtRQUV4QixPQUFPLGVBQWUsQ0FBQyxhQUFhLENBQUE7SUFDckMsQ0FBQztJQUVTLEtBQUssQ0FBQyxlQUFlLENBQzlCLGVBQXdDLEVBQ3hDLFFBQWEsRUFDYixPQUFrQyxFQUNsQyxLQUF3QjtRQUV4QiwyQkFBMkI7UUFDM0IsSUFDQyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FDMUIsUUFBUSxFQUNSLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQ2xGLEVBQ0EsQ0FBQztZQUNGLE9BQU87Z0JBQ04sT0FBTyxFQUFFLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJO2dCQUMxRixXQUFXLHFCQUFhO2dCQUN4QixZQUFZLEVBQUUsZUFBZSxDQUFDLFdBQVc7b0JBQ3hDLENBQUMsQ0FBQyxlQUFlLENBQUMsYUFBYSxLQUFLLElBQUk7d0JBQ3ZDLENBQUM7d0JBQ0QsQ0FBQyxxQkFBYTtvQkFDZixDQUFDLHVCQUFlO2FBQ2pCLENBQUE7UUFDRixDQUFDO1FBRUQsNEJBQTRCO1FBQzVCLElBQ0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQzFCLFFBQVEsRUFDUixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUNuRixFQUNBLENBQUM7WUFDRixPQUFPO2dCQUNOLE9BQU8sRUFBRSxlQUFlLENBQUMsYUFBYTtnQkFDdEMsV0FBVyxFQUNWLGVBQWUsQ0FBQyxhQUFhLEtBQUssSUFBSTtvQkFDckMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxXQUFXO3dCQUM1QixDQUFDO3dCQUNELENBQUMscUJBQWE7b0JBQ2YsQ0FBQyx1QkFBZTtnQkFDbEIsWUFBWSxxQkFBYTthQUN6QixDQUFBO1FBQ0YsQ0FBQztRQUVELDZCQUE2QjtRQUM3QixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDO1lBQ25FLElBQUksT0FBTyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUMzQixPQUFPO29CQUNOLE9BQU8sRUFBRSxlQUFlLENBQUMsYUFBYSxDQUFDLE9BQU87b0JBQzlDLFdBQVcsRUFBRSxlQUFlLENBQUMsYUFBYSxDQUFDLFdBQVc7b0JBQ3RELFlBQVksRUFBRSxlQUFlLENBQUMsYUFBYSxDQUFDLFlBQVk7aUJBQ3hELENBQUE7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTztvQkFDTixPQUFPO29CQUNQLFdBQVcsRUFDVixPQUFPLEtBQUssSUFBSTt3QkFDZixDQUFDLENBQUMsZUFBZSxDQUFDLFdBQVcsS0FBSyxJQUFJOzRCQUNyQyxDQUFDOzRCQUNELENBQUMsb0JBQVk7d0JBQ2QsQ0FBQyx3QkFBZ0I7b0JBQ25CLFlBQVksRUFDWCxPQUFPLEtBQUssSUFBSTt3QkFDZixDQUFDLENBQUMsZUFBZSxDQUFDLGFBQWEsS0FBSyxJQUFJOzRCQUN2QyxDQUFDOzRCQUNELENBQUMsb0JBQVk7d0JBQ2QsQ0FBQyx3QkFBZ0I7aUJBQ25CLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDNUQsQ0FBQztJQUVTLEtBQUssQ0FBQyxXQUFXLENBQzFCLGNBQStCLEVBQy9CLGdCQUF3QyxFQUN4QyxnQkFBNEQsRUFDNUQsS0FBYztRQUVkLE1BQU0sdUJBQXVCLEdBQXNDLGdCQUFnQixDQUFDLEdBQUcsQ0FDdEYsQ0FBQyxDQUFDLGVBQWUsRUFBRSxZQUFZLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsZUFBZSxFQUFFLFlBQVksRUFBRSxDQUFDLENBQzNFLENBQUE7UUFDRCxJQUNDLHVCQUF1QixDQUFDLEtBQUssQ0FDNUIsQ0FBQyxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsRUFBRSxFQUFFLENBQ2pDLFdBQVcsd0JBQWdCLElBQUksWUFBWSx3QkFBZ0IsQ0FDNUQsRUFDQSxDQUFDO1lBQ0YsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQ25CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixrREFBa0QsQ0FDOUUsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxDQUFDLFdBQVcsd0JBQWdCLENBQUMsRUFBRSxDQUFDO1lBQ3BGLHNCQUFzQjtZQUN0QixNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1lBQ3JELE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLHVCQUF1QixFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzlELENBQUM7UUFFRCxJQUFJLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsWUFBWSxFQUFFLEVBQUUsRUFBRSxDQUFDLFlBQVksd0JBQWdCLENBQUMsRUFBRSxDQUFDO1lBQ3RGLGNBQWMsR0FBRyxNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FDOUMsdUJBQXVCLEVBQ3ZCLGNBQWMsRUFDZCxLQUFLLENBQ0wsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLGdCQUFnQixFQUFFLEdBQUcsS0FBSyxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDbEQsbUJBQW1CO1lBQ25CLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLG9CQUFvQix5Q0FBeUMsQ0FBQyxDQUFBO1lBQzVGLE1BQU0sSUFBSSxDQUFDLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBQ2pELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixxQ0FBcUMsQ0FBQyxDQUFBO1FBQ3hGLENBQUM7UUFFRCxLQUFLLE1BQU0sRUFBRSxlQUFlLEVBQUUsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO1lBQzNELHFCQUFxQjtZQUNyQixJQUFJLENBQUM7Z0JBQ0osTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUM1QyxDQUFDO1lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDWixZQUFZO1lBQ2IsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sbUJBQW1CLENBQzFCLFdBQWdDLEVBQ2hDLGdCQUFpRCxFQUNqRCxNQUFpQyxFQUNqQyxJQUErQjtRQUUvQixNQUFNLGdCQUFnQixHQUF5QyxJQUFJLEdBQUcsRUFHbkUsQ0FBQTtRQUVILDJDQUEyQztRQUMzQyxLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3hELE1BQU0sYUFBYSxHQUFpQjtnQkFDbkMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztnQkFDckMsWUFBWSxFQUFFLEtBQUs7Z0JBQ25CLFdBQVcsc0JBQWM7Z0JBQ3pCLFlBQVkscUJBQWE7YUFDekIsQ0FBQTtZQUNELGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3pCLFlBQVksRUFBRSxJQUFJLENBQUMsTUFBTTtxQkFDdkIsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUM7cUJBQ3JDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLENBQUM7Z0JBQzVELFdBQVcsRUFBRSxJQUFJO2dCQUNqQixXQUFXLEVBQUUsSUFBSTtnQkFDakIsYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNO3FCQUN4QixRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQztxQkFDckMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsQ0FBQztnQkFDN0QsWUFBWSxFQUFFLElBQUk7Z0JBQ2xCLGNBQWMsRUFBRSxJQUFJLENBQUMsTUFBTTtxQkFDekIsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUM7cUJBQ3JDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLENBQUM7Z0JBQzlELGFBQWEsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDO2dCQUMxQixlQUFlLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQztnQkFDbEUsYUFBYTtnQkFDYixXQUFXLEVBQUUsYUFBYSxDQUFDLFdBQVc7Z0JBQ3RDLFlBQVksRUFBRSxhQUFhLENBQUMsWUFBWTtnQkFDeEMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLE1BQU07cUJBQzNCLFFBQVEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDO3FCQUNyQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxDQUFDO2FBQ2hFLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxnREFBZ0Q7UUFDaEQsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUMxRCxNQUFNLGFBQWEsR0FBaUI7Z0JBQ25DLE9BQU8sRUFBRSxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7Z0JBQ3ZDLFlBQVksRUFBRSxLQUFLO2dCQUNuQixXQUFXLHlCQUFpQjtnQkFDNUIsWUFBWSxxQkFBYTthQUN6QixDQUFBO1lBQ0QsTUFBTSxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO1lBQzFGLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3pCLFlBQVksRUFBRSxJQUFJLENBQUMsTUFBTTtxQkFDdkIsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUM7cUJBQ3JDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLENBQUM7Z0JBQzVELFdBQVcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSTtnQkFDOUIsYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNO3FCQUN4QixRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQztxQkFDckMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsQ0FBQztnQkFDN0QsV0FBVyxFQUFFLGdCQUFnQixDQUFDLEdBQUcsQ0FBQztnQkFDbEMsWUFBWTtnQkFDWixjQUFjLEVBQUUsSUFBSSxDQUFDLE1BQU07cUJBQ3pCLFFBQVEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDO3FCQUNyQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxDQUFDO2dCQUM5RCxhQUFhLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQztnQkFDMUIsZUFBZSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUM7Z0JBQ2xFLGFBQWE7Z0JBQ2IsV0FBVyxFQUFFLGFBQWEsQ0FBQyxXQUFXO2dCQUN0QyxZQUFZLEVBQUUsYUFBYSxDQUFDLFlBQVk7Z0JBQ3hDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxNQUFNO3FCQUMzQixRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQztxQkFDckMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsQ0FBQzthQUNoRSxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsZ0RBQWdEO1FBQ2hELEtBQUssTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM3QyxNQUFNLGFBQWEsR0FBaUI7Z0JBQ25DLE9BQU8sRUFBRSxJQUFJO2dCQUNiLFlBQVksRUFBRSxLQUFLO2dCQUNuQixXQUFXLHdCQUFnQjtnQkFDM0IsWUFBWSxxQkFBYTthQUN6QixDQUFBO1lBQ0QsTUFBTSxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO1lBQzFGLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3pCLFlBQVksRUFBRSxJQUFJLENBQUMsTUFBTTtxQkFDdkIsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUM7cUJBQ3JDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLENBQUM7Z0JBQzVELFdBQVcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSTtnQkFDOUIsYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNO3FCQUN4QixRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQztxQkFDckMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsQ0FBQztnQkFDN0QsV0FBVyxFQUFFLGdCQUFnQixDQUFDLEdBQUcsQ0FBQztnQkFDbEMsWUFBWTtnQkFDWixjQUFjLEVBQUUsSUFBSSxDQUFDLE1BQU07cUJBQ3pCLFFBQVEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDO3FCQUNyQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxDQUFDO2dCQUM5RCxhQUFhLEVBQUUsSUFBSTtnQkFDbkIsZUFBZSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUM7Z0JBQ2xFLGFBQWE7Z0JBQ2IsV0FBVyxFQUFFLGFBQWEsQ0FBQyxXQUFXO2dCQUN0QyxZQUFZLEVBQUUsYUFBYSxDQUFDLFlBQVk7Z0JBQ3hDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxNQUFNO3FCQUMzQixRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQztxQkFDckMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsQ0FBQzthQUNoRSxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsMkNBQTJDO1FBQzNDLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekQsTUFBTSxhQUFhLEdBQWlCO2dCQUNuQyxPQUFPLEVBQUUsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO2dCQUN0QyxZQUFZLEVBQUUsS0FBSztnQkFDbkIsV0FBVyxxQkFBYTtnQkFDeEIsWUFBWSxzQkFBYzthQUMxQixDQUFBO1lBQ0QsTUFBTSxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO1lBQzFGLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3pCLFlBQVksRUFBRSxJQUFJLENBQUMsTUFBTTtxQkFDdkIsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUM7cUJBQ3JDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLENBQUM7Z0JBQzVELFdBQVcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSTtnQkFDOUIsYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNO3FCQUN4QixRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQztxQkFDckMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsQ0FBQztnQkFDN0QsV0FBVyxFQUFFLGdCQUFnQixDQUFDLEdBQUcsQ0FBQztnQkFDbEMsWUFBWTtnQkFDWixjQUFjLEVBQUUsSUFBSSxDQUFDLE1BQU07cUJBQ3pCLFFBQVEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDO3FCQUNyQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxDQUFDO2dCQUM5RCxhQUFhLEVBQUUsSUFBSTtnQkFDbkIsZUFBZSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUM7Z0JBQ2xFLGFBQWE7Z0JBQ2IsV0FBVyxFQUFFLGFBQWEsQ0FBQyxXQUFXO2dCQUN0QyxZQUFZLEVBQUUsYUFBYSxDQUFDLFlBQVk7Z0JBQ3hDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxNQUFNO3FCQUMzQixRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQztxQkFDckMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsQ0FBQzthQUNoRSxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsZ0RBQWdEO1FBQ2hELEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDM0QsTUFBTSxhQUFhLEdBQWlCO2dCQUNuQyxPQUFPLEVBQUUsV0FBVyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO2dCQUN4QyxZQUFZLEVBQUUsS0FBSztnQkFDbkIsV0FBVyxxQkFBYTtnQkFDeEIsWUFBWSx5QkFBaUI7YUFDN0IsQ0FBQTtZQUNELE1BQU0sWUFBWSxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUMxRixnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFO2dCQUN6QixZQUFZLEVBQUUsSUFBSSxDQUFDLE1BQU07cUJBQ3ZCLFFBQVEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDO3FCQUNyQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxDQUFDO2dCQUM1RCxXQUFXLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUk7Z0JBQzlCLGFBQWEsRUFBRSxJQUFJLENBQUMsTUFBTTtxQkFDeEIsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUM7cUJBQ3JDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLENBQUM7Z0JBQzdELFdBQVcsRUFBRSxnQkFBZ0IsQ0FBQyxHQUFHLENBQUM7Z0JBQ2xDLFlBQVk7Z0JBQ1osY0FBYyxFQUFFLElBQUksQ0FBQyxNQUFNO3FCQUN6QixRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQztxQkFDckMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsQ0FBQztnQkFDOUQsYUFBYSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUM7Z0JBQzFCLGVBQWUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDO2dCQUNsRSxhQUFhO2dCQUNiLFdBQVcsRUFBRSxhQUFhLENBQUMsV0FBVztnQkFDdEMsWUFBWSxFQUFFLGFBQWEsQ0FBQyxZQUFZO2dCQUN4QyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsTUFBTTtxQkFDM0IsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUM7cUJBQ3JDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLENBQUM7YUFDaEUsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELGdEQUFnRDtRQUNoRCxLQUFLLE1BQU0sR0FBRyxJQUFJLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDOUMsTUFBTSxhQUFhLEdBQWlCO2dCQUNuQyxPQUFPLEVBQUUsSUFBSTtnQkFDYixZQUFZLEVBQUUsS0FBSztnQkFDbkIsV0FBVyxxQkFBYTtnQkFDeEIsWUFBWSx3QkFBZ0I7YUFDNUIsQ0FBQTtZQUNELGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3pCLFlBQVksRUFBRSxJQUFJLENBQUMsTUFBTTtxQkFDdkIsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUM7cUJBQ3JDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLENBQUM7Z0JBQzVELFdBQVcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSTtnQkFDOUIsYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNO3FCQUN4QixRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQztxQkFDckMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsQ0FBQztnQkFDN0QsV0FBVyxFQUFFLElBQUk7Z0JBQ2pCLFlBQVksRUFBRSxJQUFJO2dCQUNsQixjQUFjLEVBQUUsSUFBSSxDQUFDLE1BQU07cUJBQ3pCLFFBQVEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDO3FCQUNyQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxDQUFDO2dCQUM5RCxhQUFhLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQztnQkFDMUIsZUFBZSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUM7Z0JBQ2xFLGFBQWE7Z0JBQ2IsV0FBVyxFQUFFLGFBQWEsQ0FBQyxXQUFXO2dCQUN0QyxZQUFZLEVBQUUsYUFBYSxDQUFDLFlBQVk7Z0JBQ3hDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxNQUFNO3FCQUMzQixRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQztxQkFDckMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsQ0FBQzthQUNoRSxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsNEJBQTRCO1FBQzVCLEtBQUssTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sYUFBYSxHQUFpQjtnQkFDbkMsT0FBTyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJO2dCQUMxQixZQUFZLEVBQUUsSUFBSTtnQkFDbEIsV0FBVyxFQUFFLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMseUJBQWlCLENBQUMscUJBQWE7Z0JBQ25FLFlBQVksRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyx5QkFBaUIsQ0FBQyxxQkFBYTthQUMxRCxDQUFBO1lBQ0QsTUFBTSxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO1lBQzFGLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3pCLFlBQVksRUFBRSxJQUFJLENBQUMsTUFBTTtxQkFDdkIsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUM7cUJBQ3JDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLENBQUM7Z0JBQzVELFdBQVcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSTtnQkFDOUIsYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNO3FCQUN4QixRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQztxQkFDckMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsQ0FBQztnQkFDN0QsV0FBVyxFQUFFLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUk7Z0JBQzFDLFlBQVk7Z0JBQ1osY0FBYyxFQUFFLElBQUksQ0FBQyxNQUFNO3FCQUN6QixRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQztxQkFDckMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsQ0FBQztnQkFDOUQsYUFBYSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJO2dCQUNsQyxlQUFlLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQztnQkFDbEUsYUFBYTtnQkFDYixXQUFXLEVBQUUsYUFBYSxDQUFDLFdBQVc7Z0JBQ3RDLFlBQVksRUFBRSxhQUFhLENBQUMsWUFBWTtnQkFDeEMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLE1BQU07cUJBQzNCLFFBQVEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDO3FCQUNyQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxDQUFDO2FBQ2hFLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCx3QkFBd0I7UUFDeEIsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztZQUNqRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hDLE1BQU0sYUFBYSxHQUFpQjtvQkFDbkMsT0FBTyxFQUFFLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUk7b0JBQzlFLFlBQVksRUFBRSxLQUFLO29CQUNuQixXQUFXLHFCQUFhO29CQUN4QixZQUFZLHFCQUFhO2lCQUN6QixDQUFBO2dCQUNELE1BQU0sWUFBWSxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtnQkFDMUYsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRTtvQkFDekIsWUFBWSxFQUFFLElBQUksQ0FBQyxNQUFNO3lCQUN2QixRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQzt5QkFDckMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsQ0FBQztvQkFDNUQsV0FBVyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJO29CQUM5QixhQUFhLEVBQUUsSUFBSSxDQUFDLE1BQU07eUJBQ3hCLFFBQVEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDO3lCQUNyQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxDQUFDO29CQUM3RCxXQUFXLEVBQUUsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSTtvQkFDMUMsWUFBWTtvQkFDWixjQUFjLEVBQUUsSUFBSSxDQUFDLE1BQU07eUJBQ3pCLFFBQVEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDO3lCQUNyQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxDQUFDO29CQUM5RCxhQUFhLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUk7b0JBQ2xDLGVBQWUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDO29CQUNsRSxhQUFhO29CQUNiLFdBQVcsRUFBRSxhQUFhLENBQUMsV0FBVztvQkFDdEMsWUFBWSxFQUFFLGFBQWEsQ0FBQyxZQUFZO29CQUN4QyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsTUFBTTt5QkFDM0IsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUM7eUJBQ3JDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLENBQUM7aUJBQ2hFLENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0lBRVEsS0FBSyxDQUFDLGNBQWMsQ0FBQyxHQUFRO1FBQ3JDLElBQ0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQzFCLEdBQUcsRUFDSCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUNuRjtZQUNELElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUMxQixHQUFHLEVBQ0gsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FDbEY7WUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FDMUIsR0FBRyxFQUNILElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQ2pGO1lBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQzFCLEdBQUcsRUFDSCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUNyRixFQUNBLENBQUM7WUFDRixPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN2QyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVk7UUFDakIsSUFBSSxDQUFDO1lBQ0osTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtZQUNqRCxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQy9CLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLGtCQUFrQjtRQUNuQixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU8sS0FBSyxDQUFDLGlCQUFpQixDQUFDLGdCQUF3QztRQUN2RSxNQUFNLEtBQUssR0FBb0MsRUFBRSxDQUFBO1FBQ2pELEtBQUssTUFBTSxlQUFlLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUNoRCxJQUFJLGVBQWUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDakMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxXQUFXLENBQUE7WUFDekYsQ0FBQztRQUNGLENBQUM7UUFDRCxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3JFLENBQUM7SUFFTyxLQUFLLENBQUMsa0JBQWtCLENBQy9CLGdCQUFtRCxFQUNuRCxLQUFjO1FBRWQsS0FBSyxNQUFNLEVBQ1YsV0FBVyxFQUNYLFlBQVksRUFDWixhQUFhLEVBQ2IsY0FBYyxFQUNkLFdBQVcsR0FDWCxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdkIsSUFBSSxXQUFXLHdCQUFnQixFQUFFLENBQUM7Z0JBQ2pDLE1BQU0sR0FBRyxHQUFHLGNBQWM7b0JBQ3pCLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUM7b0JBQ3RDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFDdEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFFOUQsVUFBVTtnQkFDVixJQUFJLFdBQVcsMkJBQW1CLEVBQUUsQ0FBQztvQkFDcEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQ3BCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixzQkFBc0IsRUFDbEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQzlCLENBQUE7b0JBQ0QsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtvQkFDcEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQ25CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixrQkFBa0IsRUFDOUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQzlCLENBQUE7Z0JBQ0YsQ0FBQztnQkFFRCxRQUFRO3FCQUNILElBQUksV0FBVyx5QkFBaUIsRUFBRSxDQUFDO29CQUN2QyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FDcEIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLHNCQUFzQixFQUNsRCxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FDOUIsQ0FBQTtvQkFDRCxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxPQUFRLENBQUMsRUFBRTt3QkFDdkYsU0FBUyxFQUFFLEtBQUs7cUJBQ2hCLENBQUMsQ0FBQTtvQkFDRixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FDbkIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLGtCQUFrQixFQUM5QyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FDOUIsQ0FBQTtnQkFDRixDQUFDO2dCQUVELFVBQVU7cUJBQ0wsQ0FBQztvQkFDTCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FDcEIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLHNCQUFzQixFQUNsRCxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FDOUIsQ0FBQTtvQkFDRCxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUMvQixRQUFRLEVBQ1IsUUFBUSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsT0FBUSxDQUFDLEVBQzFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxXQUFZLENBQ2hDLENBQUE7b0JBQ0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQ25CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixrQkFBa0IsRUFDOUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQzlCLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxtQkFBbUIsQ0FDaEMsZ0JBQW1ELEVBQ25ELGNBQStCLEVBQy9CLFNBQWtCO1FBRWxCLE1BQU0sY0FBYyxHQUE4QixjQUFjLENBQUMsUUFBUTtZQUN4RSxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDO1lBQzVDLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDTCxNQUFNLFVBQVUsR0FBOEIsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBRXZFLEtBQUssTUFBTSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDOUYsSUFBSSxZQUFZLHdCQUFnQixFQUFFLENBQUM7Z0JBQ2xDLE1BQU0sR0FBRyxHQUFHLGFBQWE7b0JBQ3hCLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUM7b0JBQ3JDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQTtnQkFDdkMsSUFBSSxZQUFZLDJCQUFtQixFQUFFLENBQUM7b0JBQ3JDLE9BQU8sVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUN2QixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLFlBQVksQ0FBQyxPQUFRLENBQUE7Z0JBQ3hDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDMUMsZ0JBQWdCO1lBQ2hCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLG9CQUFvQiw4QkFBOEIsQ0FBQyxDQUFBO1lBQ2pGLGNBQWMsR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FDL0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFDMUIsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQ3JDLENBQUE7WUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsMEJBQTBCLENBQUMsQ0FBQTtRQUM3RSxDQUFDO1FBQ0QsT0FBTyxjQUFjLENBQUE7SUFDdEIsQ0FBQztJQUVPLFlBQVksQ0FBQyxRQUFtQjtRQUN2QyxPQUFPLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUM5QixDQUFDO0lBRU8sZ0JBQWdCLENBQ3ZCLFlBQTZDO1FBRTdDLE1BQU0sT0FBTyxHQUE4QixFQUFFLENBQUE7UUFDN0MsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7WUFDN0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDbEQsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztJQUVPLEtBQUssQ0FBQyxzQkFBc0I7UUFDbkMsTUFBTSxPQUFPLEdBQW9DLEVBQUUsQ0FBQTtRQUNuRCxJQUFJLElBQWUsQ0FBQTtRQUNuQixJQUFJLENBQUM7WUFDSixJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDMUQsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixhQUFhO1lBQ2IsSUFDQyxDQUFDLFlBQVksa0JBQWtCO2dCQUMvQixDQUFDLENBQUMsbUJBQW1CLCtDQUF1QyxFQUMzRCxDQUFDO2dCQUNGLE9BQU8sT0FBTyxDQUFBO1lBQ2YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sQ0FBQyxDQUFBO1lBQ1IsQ0FBQztRQUNGLENBQUM7UUFDRCxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksRUFBRSxFQUFFLENBQUM7WUFDekMsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQTtZQUUvQixJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQzdCLFNBQVE7WUFDVCxDQUFDO1lBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUUsQ0FBQTtZQUNuRSxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3pELE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUE7UUFDdkIsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztDQUNELENBQUE7QUF4ckJZLG1CQUFtQjtJQU83QixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLHlCQUF5QixDQUFBO0lBQ3pCLFdBQUEsOEJBQThCLENBQUE7SUFDOUIsV0FBQSx1QkFBdUIsQ0FBQTtJQUN2QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsOEJBQThCLENBQUE7SUFDOUIsWUFBQSxpQkFBaUIsQ0FBQTtJQUNqQixZQUFBLG1CQUFtQixDQUFBO0dBaEJULG1CQUFtQixDQXdyQi9CIn0=