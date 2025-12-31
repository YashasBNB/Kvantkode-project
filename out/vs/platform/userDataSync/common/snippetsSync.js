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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHNTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi9zbmlwcGV0c1N5bmMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBR3pELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFM0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUNOLGtCQUFrQixFQUdsQixZQUFZLEdBRVosTUFBTSw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUVOLHdCQUF3QixHQUN4QixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsb0JBQW9CLEdBSXBCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLE9BQU8sRUFBd0MsS0FBSyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDekYsT0FBTyxFQUlOLDhCQUE4QixFQUU5Qix1QkFBdUIsRUFDdkIsOEJBQThCLEVBQzlCLHlCQUF5QixFQUV6QixxQkFBcUIsR0FDckIsTUFBTSxtQkFBbUIsQ0FBQTtBQVUxQixNQUFNLFVBQVUsYUFBYSxDQUFDLFFB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