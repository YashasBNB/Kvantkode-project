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
import { Event } from '../../../base/common/event.js';
import { deepClone } from '../../../base/common/objects.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { FileOperationError, IFileService, } from '../../files/common/files.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService, } from '../../userDataProfile/common/userDataProfile.js';
import { AbstractInitializer, AbstractSynchroniser, } from './abstractSynchronizer.js';
import { areSame, merge } from './snippetsMerge.js';
import { IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncStoreService, USER_DATA_SYNC_SCHEME, } from './userDataSync.js';
export function parseSnippets(syncData) {
    return JSON.parse(syncData.content);
}
let SnippetsSynchroniser = class SnippetsSynchroniser extends AbstractSynchroniser {
    constructor(profile, collection, environmentService, fileService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, logService, configurationService, userDataSyncEnablementService, telemetryService, uriIdentityService) {
        super({ syncResource: "snippets" /* SyncResource.Snippets */, profile }, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService);
        this.version = 1;
        this.snippetsFolder = profile.snippetsHome;
        this._register(this.fileService.watch(environmentService.userRoamingDataHome));
        this._register(this.fileService.watch(this.snippetsFolder));
        this._register(Event.filter(this.fileService.onDidFilesChange, (e) => e.affects(this.snippetsFolder))(() => this.triggerLocalChange()));
    }
    async generateSyncPreview(remoteUserData, lastSyncUserData, isRemoteDataFromCurrentMachine) {
        const local = await this.getSnippetsFileContents();
        const localSnippets = this.toSnippetsContents(local);
        const remoteSnippets = remoteUserData.syncData
            ? this.parseSnippets(remoteUserData.syncData)
            : null;
        // Use remote data as last sync data if last sync data does not exist and remote data is from same machine
        lastSyncUserData =
            lastSyncUserData === null && isRemoteDataFromCurrentMachine
                ? remoteUserData
                : lastSyncUserData;
        const lastSyncSnippets = lastSyncUserData && lastSyncUserData.syncData
            ? this.parseSnippets(lastSyncUserData.syncData)
            : null;
        if (remoteSnippets) {
            this.logService.trace(`${this.syncResourceLogLabel}: Merging remote snippets with local snippets...`);
        }
        else {
            this.logService.trace(`${this.syncResourceLogLabel}: Remote snippets does not exist. Synchronizing snippets for the first time.`);
        }
        const mergeResult = merge(localSnippets, remoteSnippets, lastSyncSnippets);
        return this.getResourcePreviews(mergeResult, local, remoteSnippets || {}, lastSyncSnippets || {});
    }
    async hasRemoteChanged(lastSyncUserData) {
        const lastSyncSnippets = lastSyncUserData.syncData
            ? this.parseSnippets(lastSyncUserData.syncData)
            : null;
        if (lastSyncSnippets === null) {
            return true;
        }
        const local = await this.getSnippetsFileContents();
        const localSnippets = this.toSnippetsContents(local);
        const mergeResult = merge(localSnippets, lastSyncSnippets, lastSyncSnippets);
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
            this.logService.info(`${this.syncResourceLogLabel}: No changes found during synchronizing snippets.`);
        }
        if (accptedResourcePreviews.some(({ localChange }) => localChange !== 0 /* Change.None */)) {
            // back up all snippets
            await this.updateLocalBackup(accptedResourcePreviews);
            await this.updateLocalSnippets(accptedResourcePreviews, force);
        }
        if (accptedResourcePreviews.some(({ remoteChange }) => remoteChange !== 0 /* Change.None */)) {
            remoteUserData = await this.updateRemoteSnippets(accptedResourcePreviews, remoteUserData, force);
        }
        if (lastSyncUserData?.ref !== remoteUserData.ref) {
            // update last sync
            this.logService.trace(`${this.syncResourceLogLabel}: Updating last synchronized snippets...`);
            await this.updateLastSyncUserData(remoteUserData);
            this.logService.info(`${this.syncResourceLogLabel}: Updated last synchronized snippets`);
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
    getResourcePreviews(snippetsMergeResult, localFileContent, remoteSnippets, baseSnippets) {
        const resourcePreviews = new Map();
        /* Snippets added remotely -> add locally */
        for (const key of Object.keys(snippetsMergeResult.local.added)) {
            const previewResult = {
                content: snippetsMergeResult.local.added[key],
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
                remoteContent: remoteSnippets[key],
                previewResource: this.extUri.joinPath(this.syncPreviewFolder, key),
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' }),
            });
        }
        /* Snippets updated remotely -> update locally */
        for (const key of Object.keys(snippetsMergeResult.local.updated)) {
            const previewResult = {
                content: snippetsMergeResult.local.updated[key],
                hasConflicts: false,
                localChange: 2 /* Change.Modified */,
                remoteChange: 0 /* Change.None */,
            };
            const localContent = localFileContent[key] ? localFileContent[key].value.toString() : null;
            resourcePreviews.set(key, {
                baseResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' }),
                baseContent: baseSnippets[key] ?? null,
                localResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }),
                fileContent: localFileContent[key],
                localContent,
                remoteResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }),
                remoteContent: remoteSnippets[key],
                previewResource: this.extUri.joinPath(this.syncPreviewFolder, key),
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' }),
            });
        }
        /* Snippets removed remotely -> remove locally */
        for (const key of snippetsMergeResult.local.removed) {
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
                baseContent: baseSnippets[key] ?? null,
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
        /* Snippets added locally -> add remotely */
        for (const key of Object.keys(snippetsMergeResult.remote.added)) {
            const previewResult = {
                content: snippetsMergeResult.remote.added[key],
                hasConflicts: false,
                localChange: 0 /* Change.None */,
                remoteChange: 1 /* Change.Added */,
            };
            const localContent = localFileContent[key] ? localFileContent[key].value.toString() : null;
            resourcePreviews.set(key, {
                baseResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' }),
                baseContent: baseSnippets[key] ?? null,
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
        /* Snippets updated locally -> update remotely */
        for (const key of Object.keys(snippetsMergeResult.remote.updated)) {
            const previewResult = {
                content: snippetsMergeResult.remote.updated[key],
                hasConflicts: false,
                localChange: 0 /* Change.None */,
                remoteChange: 2 /* Change.Modified */,
            };
            const localContent = localFileContent[key] ? localFileContent[key].value.toString() : null;
            resourcePreviews.set(key, {
                baseResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' }),
                baseContent: baseSnippets[key] ?? null,
                localResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }),
                fileContent: localFileContent[key],
                localContent,
                remoteResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }),
                remoteContent: remoteSnippets[key],
                previewResource: this.extUri.joinPath(this.syncPreviewFolder, key),
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' }),
            });
        }
        /* Snippets removed locally -> remove remotely */
        for (const key of snippetsMergeResult.remote.removed) {
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
                baseContent: baseSnippets[key] ?? null,
                localResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }),
                fileContent: null,
                localContent: null,
                remoteResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }),
                remoteContent: remoteSnippets[key],
                previewResource: this.extUri.joinPath(this.syncPreviewFolder, key),
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' }),
            });
        }
        /* Snippets with conflicts */
        for (const key of snippetsMergeResult.conflicts) {
            const previewResult = {
                content: baseSnippets[key] ?? null,
                hasConflicts: true,
                localChange: localFileContent[key] ? 2 /* Change.Modified */ : 1 /* Change.Added */,
                remoteChange: remoteSnippets[key] ? 2 /* Change.Modified */ : 1 /* Change.Added */,
            };
            const localContent = localFileContent[key] ? localFileContent[key].value.toString() : null;
            resourcePreviews.set(key, {
                baseResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' }),
                baseContent: baseSnippets[key] ?? null,
                localResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }),
                fileContent: localFileContent[key] || null,
                localContent,
                remoteResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }),
                remoteContent: remoteSnippets[key] || null,
                previewResource: this.extUri.joinPath(this.syncPreviewFolder, key),
                previewResult,
                localChange: previewResult.localChange,
                remoteChange: previewResult.remoteChange,
                acceptedResource: this.extUri
                    .joinPath(this.syncPreviewFolder, key)
                    .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' }),
            });
        }
        /* Unmodified Snippets */
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
                    baseContent: baseSnippets[key] ?? null,
                    localResource: this.extUri
                        .joinPath(this.syncPreviewFolder, key)
                        .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' }),
                    fileContent: localFileContent[key] || null,
                    localContent,
                    remoteResource: this.extUri
                        .joinPath(this.syncPreviewFolder, key)
                        .with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' }),
                    remoteContent: remoteSnippets[key] || null,
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
            const localSnippets = await this.getSnippetsFileContents();
            if (Object.keys(localSnippets).length) {
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
        await this.backupLocal(JSON.stringify(this.toSnippetsContents(local)));
    }
    async updateLocalSnippets(resourcePreviews, force) {
        for (const { fileContent, acceptResult, localResource, remoteResource, localChange, } of resourcePreviews) {
            if (localChange !== 0 /* Change.None */) {
                const key = remoteResource
                    ? this.extUri.basename(remoteResource)
                    : this.extUri.basename(localResource);
                const resource = this.extUri.joinPath(this.snippetsFolder, key);
                // Removed
                if (localChange === 3 /* Change.Deleted */) {
                    this.logService.trace(`${this.syncResourceLogLabel}: Deleting snippet...`, this.extUri.basename(resource));
                    await this.fileService.del(resource);
                    this.logService.info(`${this.syncResourceLogLabel}: Deleted snippet`, this.extUri.basename(resource));
                }
                // Added
                else if (localChange === 1 /* Change.Added */) {
                    this.logService.trace(`${this.syncResourceLogLabel}: Creating snippet...`, this.extUri.basename(resource));
                    await this.fileService.createFile(resource, VSBuffer.fromString(acceptResult.content), {
                        overwrite: force,
                    });
                    this.logService.info(`${this.syncResourceLogLabel}: Created snippet`, this.extUri.basename(resource));
                }
                // Updated
                else {
                    this.logService.trace(`${this.syncResourceLogLabel}: Updating snippet...`, this.extUri.basename(resource));
                    await this.fileService.writeFile(resource, VSBuffer.fromString(acceptResult.content), force ? undefined : fileContent);
                    this.logService.info(`${this.syncResourceLogLabel}: Updated snippet`, this.extUri.basename(resource));
                }
            }
        }
    }
    async updateRemoteSnippets(resourcePreviews, remoteUserData, forcePush) {
        const currentSnippets = remoteUserData.syncData
            ? this.parseSnippets(remoteUserData.syncData)
            : {};
        const newSnippets = deepClone(currentSnippets);
        for (const { acceptResult, localResource, remoteResource, remoteChange } of resourcePreviews) {
            if (remoteChange !== 0 /* Change.None */) {
                const key = localResource
                    ? this.extUri.basename(localResource)
                    : this.extUri.basename(remoteResource);
                if (remoteChange === 3 /* Change.Deleted */) {
                    delete newSnippets[key];
                }
                else {
                    newSnippets[key] = acceptResult.content;
                }
            }
        }
        if (!areSame(currentSnippets, newSnippets)) {
            // update remote
            this.logService.trace(`${this.syncResourceLogLabel}: Updating remote snippets...`);
            remoteUserData = await this.updateRemoteUserData(JSON.stringify(newSnippets), forcePush ? null : remoteUserData.ref);
            this.logService.info(`${this.syncResourceLogLabel}: Updated remote snippets`);
        }
        return remoteUserData;
    }
    parseSnippets(syncData) {
        return parseSnippets(syncData);
    }
    toSnippetsContents(snippetsFileContents) {
        const snippets = {};
        for (const key of Object.keys(snippetsFileContents)) {
            snippets[key] = snippetsFileContents[key].value.toString();
        }
        return snippets;
    }
    async getSnippetsFileContents() {
        const snippets = {};
        let stat;
        try {
            stat = await this.fileService.resolve(this.snippetsFolder);
        }
        catch (e) {
            // No snippets
            if (e instanceof FileOperationError &&
                e.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                return snippets;
            }
            else {
                throw e;
            }
        }
        for (const entry of stat.children || []) {
            const resource = entry.resource;
            const extension = this.extUri.extname(resource);
            if (extension === '.json' || extension === '.code-snippets') {
                const key = this.extUri.relativePath(this.snippetsFolder, resource);
                const content = await this.fileService.readFile(resource);
                snippets[key] = content;
            }
        }
        return snippets;
    }
};
SnippetsSynchroniser = __decorate([
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
], SnippetsSynchroniser);
export { SnippetsSynchroniser };
let SnippetsInitializer = class SnippetsInitializer extends AbstractInitializer {
    constructor(fileService, userDataProfilesService, environmentService, logService, storageService, uriIdentityService) {
        super("snippets" /* SyncResource.Snippets */, userDataProfilesService, environmentService, logService, fileService, storageService, uriIdentityService);
    }
    async doInitialize(remoteUserData) {
        const remoteSnippets = remoteUserData.syncData
            ? JSON.parse(remoteUserData.syncData.content)
            : null;
        if (!remoteSnippets) {
            this.logService.info('Skipping initializing snippets because remote snippets does not exist.');
            return;
        }
        const isEmpty = await this.isEmpty();
        if (!isEmpty) {
            this.logService.info('Skipping initializing snippets because local snippets exist.');
            return;
        }
        for (const key of Object.keys(remoteSnippets)) {
            const content = remoteSnippets[key];
            if (content) {
                const resource = this.extUri.joinPath(this.userDataProfilesService.defaultProfile.snippetsHome, key);
                await this.fileService.createFile(resource, VSBuffer.fromString(content));
                this.logService.info('Created snippet', this.extUri.basename(resource));
            }
        }
        await this.updateLastSyncUserData(remoteUserData);
    }
    async isEmpty() {
        try {
            const stat = await this.fileService.resolve(this.userDataProfilesService.defaultProfile.snippetsHome);
            return !stat.children?.length;
        }
        catch (error) {
            return error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */;
        }
    }
};
SnippetsInitializer = __decorate([
    __param(0, IFileService),
    __param(1, IUserDataProfilesService),
    __param(2, IEnvironmentService),
    __param(3, IUserDataSyncLogService),
    __param(4, IStorageService),
    __param(5, IUriIdentityService)
], SnippetsInitializer);
export { SnippetsInitializer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHNTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL3NuaXBwZXRzU3luYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFHekQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUUzRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBQ04sa0JBQWtCLEVBR2xCLFlBQVksR0FFWixNQUFNLDZCQUE2QixDQUFBO0FBQ3BDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBRU4sd0JBQXdCLEdBQ3hCLE1BQU0saURBQWlELENBQUE7QUFDeEQsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixvQkFBb0IsR0FJcEIsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQUUsT0FBTyxFQUF3QyxLQUFLLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6RixPQUFPLEVBSU4sOEJBQThCLEVBRTlCLHVCQUF1QixFQUN2Qiw4QkFBOEIsRUFDOUIseUJBQXlCLEVBRXpCLHFCQUFxQixHQUNyQixNQUFNLG1CQUFtQixDQUFBO0FBVTFCLE1BQU0sVUFBVSxhQUFhLENB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