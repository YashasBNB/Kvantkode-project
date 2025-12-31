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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbkNhY2hlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NvbmZpZ3VyYXRpb24vY29tbW9uL2NvbmZpZ3VyYXRpb25DYWNoZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVNoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUd4RCxNQUFNLE9BQU8sa0JBQWtCO0lBTzlCLFlBQ2tCLDhCQUF3QyxFQUN6RCxrQkFBdUMsRUFDdEIsV0FBeUI7UUFGekIsbUNBQThCLEdBQTlCLDhCQUE4QixDQUFVO1FBRXhDLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBUjFCLHlCQUFvQixHQUFxQyxJQUFJLEdBQUcsRUFHOUUsQ0FBQTtRQU9GLElBQUksQ0FBQyxTQUFTLEdBQUcsa0JBQWtCLENBQUMsU0FBUyxDQUFBO0lBQzlDLENBQUM7SUFFRCxZQUFZLENBQUMsUUFBYTtRQUN6QixpQ0FBaUM7UUFDakMsT0FBTyxDQUFDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3RFLENBQUM7SUFFRCxJQUFJLENBQUMsR0FBcUI7UUFDekIsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDL0MsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFxQixFQUFFLE9BQWU7UUFDM0MsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3RELENBQUM7SUFFRCxNQUFNLENBQUMsR0FBcUI7UUFDM0IsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDakQsQ0FBQztJQUVPLHNCQUFzQixDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBb0I7UUFDN0QsTUFBTSxDQUFDLEdBQUcsR0FBRyxJQUFJLElBQUksR0FBRyxFQUFFLENBQUE7UUFDMUIsSUFBSSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzFELElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzFCLG1CQUFtQixHQUFHLElBQUksbUJBQW1CLENBQUMsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDOUYsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtRQUN0RCxDQUFDO1FBQ0QsT0FBTyxtQkFBbUIsQ0FBQTtJQUMzQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLG1CQUFtQjtJQUt4QixZQUNDLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBb0IsRUFDL0IsU0FBYyxFQUNHLFdBQXlCO1FBQXpCLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBRTFDLElBQUksQ0FBQyxpQ0FBaUMsR0FBRyxRQUFRLENBQUMsU0FBUyxFQUFFLHNCQUFzQixFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUMvRixJQUFJLENBQUMsK0JBQStCLEdBQUcsUUFBUSxDQUM5QyxJQUFJLENBQUMsaUNBQWlDLEVBQ3RDLElBQUksS0FBSyxZQUFZLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FDL0QsQ0FBQTtRQUNELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxLQUFLLEVBQVEsQ0FBQTtJQUMvQixDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUk7UUFDVCxJQUFJLENBQUM7WUFDSixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO1lBQ3JGLE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNoQyxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQWU7UUFDekIsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtRQUMvQyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtnQkFDakMsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FDL0IsSUFBSSxDQUFDLCtCQUErQixFQUNwQyxRQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUM1QixDQUFBO1lBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxNQUFNO1FBQ1gsSUFBSSxDQUFDO1lBQ0osTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FDM0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxFQUFFO2dCQUM1RCxTQUFTLEVBQUUsSUFBSTtnQkFDZixRQUFRLEVBQUUsS0FBSzthQUNmLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBeUIsS0FBTSxDQUFDLG1CQUFtQiwrQ0FBdUMsRUFBRSxDQUFDO2dCQUM1RixNQUFNLEtBQUssQ0FBQTtZQUNaLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxrQkFBa0I7UUFDL0IsSUFBSSxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxFQUFFLENBQUM7WUFDM0UsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsSUFBSSxDQUFDO1lBQ0osTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsaUNBQWlDLENBQUMsQ0FBQTtZQUMzRSxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9