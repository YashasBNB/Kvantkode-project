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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza3NTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL3Rhc2tzU3luYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFHekQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRTFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBRU4sd0JBQXdCLEdBQ3hCLE1BQU0saURBQWlELENBQUE7QUFDeEQsT0FBTyxFQUNOLHdCQUF3QixFQUN4QixtQkFBbUIsR0FJbkIsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBR04sOEJBQThCLEVBRzlCLHVCQUF1QixFQUN2Qiw4QkFBOEIsRUFDOUIseUJBQXlCLEVBRXpCLHFCQUFxQixHQUNyQixNQUFNLG1CQUFtQixDQUFBO0FBVTFCLE1BQU0sVUFBVSw4QkFBOEIsQ0FDN0MsV0FBbUIsRUFDbkIsVUFBdUI7SUFFdkIsSUFBSSxDQUFDO1FBQ0osTUFBTSxNQUFNLEdBQXNCLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDekQsT0FBTyxNQUFNLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQTtJQUM1QixDQUFDO0lBQUMsT0FBTyxD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