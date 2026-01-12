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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jTG9jYWxTdG9yZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vdXNlckRhdGFTeW5jTG9jYWxTdG9yZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTVELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdFLE9BQU8sRUFFTixZQUFZLEVBRVoscUJBQXFCLEdBQ3JCLE1BQU0sNkJBQTZCLENBQUE7QUFDcEMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDMUYsT0FBTyxFQUNOLGtCQUFrQixFQUdsQix1QkFBdUIsR0FFdkIsTUFBTSxtQkFBbUIsQ0FBQTtBQUVuQixJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUNaLFNBQVEsVUFBVTtJQUtsQixZQUN1QyxrQkFBdUMsRUFDOUMsV0FBeUIsRUFDaEIsb0JBQTJDLEVBQ3pDLFVBQW1DLEVBQ2xDLHVCQUFpRDtRQUU1RixLQUFLLEVBQUUsQ0FBQTtRQU4rQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQzlDLGdCQUFXLEdBQVgsV0FB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