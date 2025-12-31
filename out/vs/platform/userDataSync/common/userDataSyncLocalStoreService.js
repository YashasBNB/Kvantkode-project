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
import { Promises } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { toLocalISOString } from '../../../base/common/date.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { joinPath } from '../../../base/common/resources.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService, toFileOperationResult, } from '../../files/common/files.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
import { ALL_SYNC_RESOURCES, IUserDataSyncLogService, } from './userDataSync.js';
let UserDataSyncLocalStoreService = class UserDataSyncLocalStoreService extends Disposable {
    constructor(environmentService, fileService, configurationService, logService, userDataProfilesService) {
        super();
        this.environmentService = environmentService;
        this.fileService = fileService;
        this.configurationService = configurationService;
        this.logService = logService;
        this.userDataProfilesService = userDataProfilesService;
        this.cleanUp();
    }
    async cleanUp() {
        for (const profile of this.userDataProfilesService.profiles) {
            for (const resource of ALL_SYNC_RESOURCES) {
                try {
                    await this.cleanUpBackup(this.getResourceBackupHome(resource, profile.isDefault ? undefined : profile.id));
                }
                catch (error) {
                    this.logService.error(error);
                }
            }
        }
        let stat;
        try {
            stat = await this.fileService.resolve(this.environmentService.userDataSyncHome);
        }
        catch (error) {
            if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.logService.error(error);
            }
            return;
        }
        if (stat.children) {
            for (const child of stat.children) {
                if (child.isDirectory &&
                    !ALL_SYNC_RESOURCES.includes(child.name) &&
                    !this.userDataProfilesService.profiles.some((profile) => profile.id === child.name)) {
                    try {
                        this.logService.info('Deleting non existing profile from backup', child.resource.path);
                        await this.fileService.del(child.resource, { recursive: true });
                    }
                    catch (error) {
                        this.logService.error(error);
                    }
                }
            }
        }
    }
    async getAllResourceRefs(resource, collection, root) {
        const folder = this.getResourceBackupHome(resource, collection, root);
        try {
            const stat = await this.fileService.resolve(folder);
            if (stat.children) {
                const all = stat.children
                    .filter((stat) => stat.isFile && !stat.name.startsWith('lastSync'))
                    .sort()
                    .reverse();
                return all.map((stat) => ({
                    ref: stat.name,
                    created: this.getCreationTime(stat),
                }));
            }
        }
        catch (error) {
            if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                throw error;
            }
        }
        return [];
    }
    async resolveResourceContent(resourceKey, ref, collection, root) {
        const folder = this.getResourceBackupHome(resourceKey, collection, root);
        const file = joinPath(folder, ref);
        try {
            const content = await this.fileService.readFile(file);
            return content.value.toString();
        }
        catch (error) {
            this.logService.error(error);
            return null;
        }
    }
    async writeResource(resourceKey, content, cTime, collection, root) {
        const folder = this.getResourceBackupHome(resourceKey, collection, root);
        const resource = joinPath(folder, `${toLocalISOString(cTime).replace(/-|:|\.\d+Z$/g, '')}.json`);
        try {
            await this.fileService.writeFile(resource, VSBuffer.fromString(content));
        }
        catch (e) {
            this.logService.error(e);
        }
    }
    getResourceBackupHome(resource, collection, root = this.environmentService.userDataSyncHome) {
        return joinPath(root, ...(collection ? [collection, resource] : [resource]));
    }
    async cleanUpBackup(folder) {
        try {
            try {
                if (!(await this.fileService.exists(folder))) {
                    return;
                }
            }
            catch (e) {
                return;
            }
            const stat = await this.fileService.resolve(folder);
            if (stat.children) {
                const all = stat.children
                    .filter((stat) => stat.isFile && /^\d{8}T\d{6}(\.json)?$/.test(stat.name))
                    .sort();
                const backUpMaxAge = 1000 *
                    60 *
                    60 *
                    24 *
                    (this.configurationService.getValue('sync.localBackupDuration') ||
                        30); /* Default 30 days */
                let toDelete = all.filter((stat) => Date.now() - this.getCreationTime(stat) > backUpMaxAge);
                const remaining = all.length - toDelete.length;
                if (remaining < 10) {
                    toDelete = toDelete.slice(10 - remaining);
                }
                await Promises.settled(toDelete.map(async (stat) => {
                    this.logService.info('Deleting from backup', stat.resource.path);
                    await this.fileService.del(stat.resource);
                }));
            }
        }
        catch (e) {
            this.logService.error(e);
        }
    }
    getCreationTime(stat) {
        return new Date(parseInt(stat.name.substring(0, 4)), parseInt(stat.name.substring(4, 6)) - 1, parseInt(stat.name.substring(6, 8)), parseInt(stat.name.substring(9, 11)), parseInt(stat.name.substring(11, 13)), parseInt(stat.name.substring(13, 15))).getTime();
    }
};
UserDataSyncLocalStoreService = __decorate([
    __param(0, IEnvironmentService),
    __param(1, IFileService),
    __param(2, IConfigurationService),
    __param(3, IUserDataSyncLogService),
    __param(4, IUserDataProfilesService)
], UserDataSyncLocalStoreService);
export { UserDataSyncLocalStoreService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jTG9jYWxTdG9yZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL3VzZXJEYXRhU3luY0xvY2FsU3RvcmVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU1RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBRU4sWUFBWSxFQUVaLHFCQUFxQixHQUNyQixNQUFNLDZCQUE2QixDQUFBO0FBQ3BDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzFGLE9BQU8sRUFDTixrQkFBa0IsRUFHbEIsdUJBQXVCLEdBRXZCLE1BQU0sbUJBQW1CLENBQUE7QUFFbkIsSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFDWixTQUFRLFVBQVU7SUFLbEIsWUFDdUMsa0JBQXVDLEVBQzlDLFdBQXlCLEVBQ2hCLG9CQUEyQyxFQUN6QyxVQUFtQyxFQUNsQyx1QkFBaUQ7UUFFNUYsS0FBSyxFQUFFLENBQUE7UUFOK0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUM5QyxnQkFBVyxHQUFYLFdBQVcsQ0FB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