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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0c1N5bmMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL3Byb21wdHNTeW5jL3Byb21wdHNTeW5jLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDcEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFHMUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDaEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDdEYsT0FBTyxFQUFFLE9BQU8sRUFBdUMsS0FBSyxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDdkYsT0FBTyxFQUNOLG9CQUFvQixHQUlwQixNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFDTixrQkFBa0IsRUFHbEIsWUFBWSxHQUVaLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUlOLDhCQUE4QixFQUU5Qix1QkFBdUIsRUFDdkIsOEJBQThCLEVBQzlCLHlCQUF5QixFQUV6QixxQkFBcUIsR0FDckIsTUFBTSxvQkFBb0IsQ0FBQTtBQVUzQixNQUFNLFVBQVUsWUFBWSxDQUFDLFFBQW1CO0lB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