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
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService, } from '../../userDataProfile/common/userDataProfile.js';
import { AbstractFileSynchroniser, AbstractInitializer, } from './abstractSynchronizer.js';
import { IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncStoreService, USER_DATA_SYNC_SCHEME, } from './userDataSync.js';
export function getTasksContentFromSyncContent(syncContent, logService) {
    try {
        const parsed = JSON.parse(syncContent);
        return parsed.tasks ?? null;
    }
    catch (e) {
        logService.error(e);
        return null;
    }
}
let TasksSynchroniser = class TasksSynchroniser extends AbstractFileSynchroniser {
    constructor(profile, collection, userDataSyncStoreService, userDataSyncLocalStoreService, logService, configurationService, userDataSyncEnablementService, fileService, environmentService, storageService, telemetryService, uriIdentityService) {
        super(profile.tasksResource, { syncResource: "tasks" /* SyncResource.Tasks */, profile }, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService);
        this.version = 1;
        this.previewResource = this.extUri.joinPath(this.syncPreviewFolder, 'tasks.json');
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
    }
    async generateSyncPreview(remoteUserData, lastSyncUserData, isRemoteDataFromCurrentMachine, userDataSyncConfiguration) {
        const remoteContent = remoteUserData.syncData
            ? getTasksContentFromSyncContent(remoteUserData.syncData.content, this.logService)
            : null;
        // Use remote data as last sync data if last sync data does not exist and remote data is from same machine
        lastSyncUserData =
            lastSyncUserData === null && isRemoteDataFromCurrentMachine
                ? remoteUserData
                : lastSyncUserData;
        const lastSyncContent = lastSyncUserData?.syncData
            ? getTasksContentFromSyncContent(lastSyncUserData.syncData.content, this.logService)
            : null;
        // Get file content last to get the latest
        const fileContent = await this.getLocalFileContent();
        let content = null;
        let hasLocalChanged = false;
        let hasRemoteChanged = false;
        let hasConflicts = false;
        if (remoteUserData.syncData) {
            const localContent = fileContent ? fileContent.value.toString() : null;
            if (!lastSyncContent || // First time sync
                lastSyncContent !== localContent || // Local has forwarded
                lastSyncContent !== remoteContent // Remote has forwarded
            ) {
                this.logService.trace(`${this.syncResourceLogLabel}: Merging remote tasks with local tasks...`);
                const result = merge(localContent, remoteContent, lastSyncContent);
                content = result.content;
                hasConflicts = result.hasConflicts;
                hasLocalChanged = result.hasLocalChanged;
                hasRemoteChanged = result.hasRemoteChanged;
            }
        }
        // First time syncing to remote
        else if (fileContent) {
            this.logService.trace(`${this.syncResourceLogLabel}: Remote tasks does not exist. Synchronizing tasks for the first time.`);
            content = fileContent.value.toString();
            hasRemoteChanged = true;
        }
        const previewResult = {
            content: hasConflicts ? lastSyncContent : content,
            localChange: hasLocalChanged ? (fileContent ? 2 /* Change.Modified */ : 1 /* Change.Added */) : 0 /* Change.None */,
            remoteChange: hasRemoteChanged ? 2 /* Change.Modified */ : 0 /* Change.None */,
            hasConflicts,
        };
        const localContent = fileContent ? fileContent.value.toString() : null;
        return [
            {
                fileContent,
                baseResource: this.baseResource,
                baseContent: lastSyncContent,
                localResource: this.localResource,
                localContent,
                localChange: previewResult.localChange,
                remoteResource: this.remoteResource,
                remoteContent,
                remoteChange: previewResult.remoteChange,
                previewResource: this.previewResource,
                previewResult,
                acceptedResource: this.acceptedResource,
            },
        ];
    }
    async hasRemoteChanged(lastSyncUserData) {
        const lastSyncContent = lastSyncUserData?.syncData
            ? getTasksContentFromSyncContent(lastSyncUserData.syncData.content, this.logService)
            : null;
        if (lastSyncContent === null) {
            return true;
        }
        const fileContent = await this.getLocalFileContent();
        const localContent = fileContent ? fileContent.value.toString() : null;
        const result = merge(localContent, lastSyncContent, lastSyncContent);
        return result.hasLocalChanged || result.hasRemoteChanged;
    }
    async getMergeResult(resourcePreview, token) {
        return resourcePreview.previewResult;
    }
    async getAcceptResult(resourcePreview, resource, content, token) {
        /* Accept local resource */
        if (this.extUri.isEqual(resource, this.localResource)) {
            return {
                content: resourcePreview.fileContent ? resourcePreview.fileContent.value.toString() : null,
                localChange: 0 /* Change.None */,
                remoteChange: 2 /* Change.Modified */,
            };
        }
        /* Accept remote resource */
        if (this.extUri.isEqual(resource, this.remoteResource)) {
            return {
                content: resourcePreview.remoteContent,
                localChange: 2 /* Change.Modified */,
                remoteChange: 0 /* Change.None */,
            };
        }
        /* Accept preview resource */
        if (this.extUri.isEqual(resource, this.previewResource)) {
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
                    localChange: 2 /* Change.Modified */,
                    remoteChange: 2 /* Change.Modified */,
                };
            }
        }
        throw new Error(`Invalid Resource: ${resource.toString()}`);
    }
    async applyResult(remoteUserData, lastSyncUserData, resourcePreviews, force) {
        const { fileContent } = resourcePreviews[0][0];
        const { content, localChange, remoteChange } = resourcePreviews[0][1];
        if (localChange === 0 /* Change.None */ && remoteChange === 0 /* Change.None */) {
            this.logService.info(`${this.syncResourceLogLabel}: No changes found during synchronizing tasks.`);
        }
        if (localChange !== 0 /* Change.None */) {
            this.logService.trace(`${this.syncResourceLogLabel}: Updating local tasks...`);
            if (fileContent) {
                await this.backupLocal(JSON.stringify(this.toTasksSyncContent(fileContent.value.toString())));
            }
            if (content) {
                await this.updateLocalFileContent(content, fileContent, force);
            }
            else {
                await this.deleteLocalFile();
            }
            this.logService.info(`${this.syncResourceLogLabel}: Updated local tasks`);
        }
        if (remoteChange !== 0 /* Change.None */) {
            this.logService.trace(`${this.syncResourceLogLabel}: Updating remote tasks...`);
            const remoteContents = JSON.stringify(this.toTasksSyncContent(content));
            remoteUserData = await this.updateRemoteUserData(remoteContents, force ? null : remoteUserData.ref);
            this.logService.info(`${this.syncResourceLogLabel}: Updated remote tasks`);
        }
        // Delete the preview
        try {
            await this.fileService.del(this.previewResource);
        }
        catch (e) {
            /* ignore */
        }
        if (lastSyncUserData?.ref !== remoteUserData.ref) {
            this.logService.trace(`${this.syncResourceLogLabel}: Updating last synchronized tasks...`);
            await this.updateLastSyncUserData(remoteUserData);
            this.logService.info(`${this.syncResourceLogLabel}: Updated last synchronized tasks`);
        }
    }
    async hasLocalData() {
        return this.fileService.exists(this.file);
    }
    async resolveContent(uri) {
        if (this.extUri.isEqual(this.remoteResource, uri) ||
            this.extUri.isEqual(this.baseResource, uri) ||
            this.extUri.isEqual(this.localResource, uri) ||
            this.extUri.isEqual(this.acceptedResource, uri)) {
            return this.resolvePreviewContent(uri);
        }
        return null;
    }
    toTasksSyncContent(tasks) {
        return tasks ? { tasks } : {};
    }
};
TasksSynchroniser = __decorate([
    __param(2, IUserDataSyncStoreService),
    __param(3, IUserDataSyncLocalStoreService),
    __param(4, IUserDataSyncLogService),
    __param(5, IConfigurationService),
    __param(6, IUserDataSyncEnablementService),
    __param(7, IFileService),
    __param(8, IEnvironmentService),
    __param(9, IStorageService),
    __param(10, ITelemetryService),
    __param(11, IUriIdentityService)
], TasksSynchroniser);
export { TasksSynchroniser };
let TasksInitializer = class TasksInitializer extends AbstractInitializer {
    constructor(fileService, userDataProfilesService, environmentService, logService, storageService, uriIdentityService) {
        super("tasks" /* SyncResource.Tasks */, userDataProfilesService, environmentService, logService, fileService, storageService, uriIdentityService);
        this.tasksResource = this.userDataProfilesService.defaultProfile.tasksResource;
    }
    async doInitialize(remoteUserData) {
        const tasksContent = remoteUserData.syncData
            ? getTasksContentFromSyncContent(remoteUserData.syncData.content, this.logService)
            : null;
        if (!tasksContent) {
            this.logService.info('Skipping initializing tasks because remote tasks does not exist.');
            return;
        }
        const isEmpty = await this.isEmpty();
        if (!isEmpty) {
            this.logService.info('Skipping initializing tasks because local tasks exist.');
            return;
        }
        await this.fileService.writeFile(this.tasksResource, VSBuffer.fromString(tasksContent));
        await this.updateLastSyncUserData(remoteUserData);
    }
    async isEmpty() {
        return this.fileService.exists(this.tasksResource);
    }
};
TasksInitializer = __decorate([
    __param(0, IFileService),
    __param(1, IUserDataProfilesService),
    __param(2, IEnvironmentService),
    __param(3, IUserDataSyncLogService),
    __param(4, IStorageService),
    __param(5, IUriIdentityService)
], TasksInitializer);
export { TasksInitializer };
function merge(originalLocalContent, originalRemoteContent, baseContent) {
    /* no changes */
    if (originalLocalContent === null && originalRemoteContent === null && baseContent === null) {
        return { content: null, hasLocalChanged: false, hasRemoteChanged: false, hasConflicts: false };
    }
    /* no changes */
    if (originalLocalContent === originalRemoteContent) {
        return { content: null, hasLocalChanged: false, hasRemoteChanged: false, hasConflicts: false };
    }
    const localForwarded = baseContent !== originalLocalContent;
    const remoteForwarded = baseContent !== originalRemoteContent;
    /* no changes */
    if (!localForwarded && !remoteForwarded) {
        return { content: null, hasLocalChanged: false, hasRemoteChanged: false, hasConflicts: false };
    }
    /* local has changed and remote has not */
    if (localForwarded && !remoteForwarded) {
        return {
            content: originalLocalContent,
            hasRemoteChanged: true,
            hasLocalChanged: false,
            hasConflicts: false,
        };
    }
    /* remote has changed and local has not */
    if (remoteForwarded && !localForwarded) {
        return {
            content: originalRemoteContent,
            hasLocalChanged: true,
            hasRemoteChanged: false,
            hasConflicts: false,
        };
    }
    return {
        content: originalLocalContent,
        hasLocalChanged: true,
        hasRemoteChanged: true,
        hasConflicts: true,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza3NTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi90YXNrc1N5bmMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBR3pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUVOLHdCQUF3QixHQUN4QixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsbUJBQW1CLEdBSW5CLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUdOLDhCQUE4QixFQUc5Qix1QkFBdUIsRUFDdkIsOEJBQThCLEVBQzlCLHlCQUF5QixFQUV6QixxQkFBcUIsR0FDckIsTUFBTSxtQkFBbUIsQ0FBQTtBQVUxQixNQUFNLFVBQVUsOEJBQThCLENBQzdDLFdBQW1CLEVBQ25CLFVBQXVCO0lBRXZCLElBQUksQ0FBQztRQUNKLE1BQU0sTUFBTSxHQUFzQixJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3pELE9BQU8sTUFBTSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUE7SUFDNUIsQ0FBQztJQUFDLE9BQU8sQ0FBQyxF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