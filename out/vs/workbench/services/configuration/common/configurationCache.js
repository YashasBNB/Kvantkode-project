/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { joinPath } from '../../../../base/common/resources.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Queue } from '../../../../base/common/async.js';
export class ConfigurationCache {
    constructor(donotCacheResourcesWithSchemes, environmentService, fileService) {
        this.donotCacheResourcesWithSchemes = donotCacheResourcesWithSchemes;
        this.fileService = fileService;
        this.cachedConfigurations = new Map();
        this.cacheHome = environmentService.cacheHome;
    }
    needsCaching(resource) {
        // Cache all non native resources
        return !this.donotCacheResourcesWithSchemes.includes(resource.scheme);
    }
    read(key) {
        return this.getCachedConfiguration(key).read();
    }
    write(key, content) {
        return this.getCachedConfiguration(key).save(content);
    }
    remove(key) {
        return this.getCachedConfiguration(key).remove();
    }
    getCachedConfiguration({ type, key }) {
        const k = `${type}:${key}`;
        let cachedConfiguration = this.cachedConfigurations.get(k);
        if (!cachedConfiguration) {
            cachedConfiguration = new CachedConfiguration({ type, key }, this.cacheHome, this.fileService);
            this.cachedConfigurations.set(k, cachedConfiguration);
        }
        return cachedConfiguration;
    }
}
class CachedConfiguration {
    constructor({ type, key }, cacheHome, fileService) {
        this.fileService = fileService;
        this.cachedConfigurationFolderResource = joinPath(cacheHome, 'CachedConfigurations', type, key);
        this.cachedConfigurationFileResource = joinPath(this.cachedConfigurationFolderResource, type === 'workspaces' ? 'workspace.json' : 'configuration.json');
        this.queue = new Queue();
    }
    async read() {
        try {
            const content = await this.fileService.readFile(this.cachedConfigurationFileResource);
            return content.value.toString();
        }
        catch (e) {
            return '';
        }
    }
    async save(content) {
        const created = await this.createCachedFolder();
        if (created) {
            await this.queue.queue(async () => {
                await this.fileService.writeFile(this.cachedConfigurationFileResource, VSBuffer.fromString(content));
            });
        }
    }
    async remove() {
        try {
            await this.queue.queue(() => this.fileService.del(this.cachedConfigurationFolderResource, {
                recursive: true,
                useTrash: false,
            }));
        }
        catch (error) {
            if (error.fileOperationResult !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                throw error;
            }
        }
    }
    async createCachedFolder() {
        if (await this.fileService.exists(this.cachedConfigurationFolderResource)) {
            return true;
        }
        try {
            await this.fileService.createFolder(this.cachedConfigurationFolderResource);
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbkNhY2hlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvY29uZmlndXJhdGlvbi9jb21tb24vY29uZmlndXJhdGlvbkNhY2hlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBU2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBR3hELE1BQU0sT0FBTyxrQkFBa0I7SUFPOUIsWUFDa0IsOEJBQXdDLEVBQ3pELGtCQUF1QyxFQUN0QixXQUF5QjtRQUZ6QixtQ0FBOEIsR0FBOUIsOEJBQThCLENBQVU7UUFFeEMsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFSMUIseUJBQW9CLEdBQXFDLElBQUksR0FBRyxFQUc5RSxDQUFBO1FBT0YsSUFBSSxDQUFDLFNBQVMsR0FBRyxrQkFBa0IsQ0FBQyxTQUFTLENBQUE7SUFDOUMsQ0FBQztJQUVELFlBQVksQ0FBQyxRQUFhO1FBQ3pCLGlDQUFpQztRQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDdEUsQ0FBQztJQUVELElBQUksQ0FBQyxHQUFxQjtRQUN6QixPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQXFCLEVBQUUsT0FBZTtRQUMzQyxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDdEQs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