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
import { IExtHostConsumerFileSystem } from '../common/extHostFileSystemConsumer.js';
import { Schemas } from '../../../base/common/network.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { DiskFileSystemProvider } from '../../../platform/files/node/diskFileSystemProvider.js';
import { FilePermission } from '../../../platform/files/common/files.js';
import { isLinux } from '../../../base/common/platform.js';
let ExtHostDiskFileSystemProvider = class ExtHostDiskFileSystemProvider {
    constructor(extHostConsumerFileSystem, logService) {
        // Register disk file system provider so that certain
        // file operations can execute fast within the extension
        // host without roundtripping.
        extHostConsumerFileSystem.addFileSystemProvider(Schemas.file, new DiskFileSystemProviderAdapter(logService), { isCaseSensitive: isLinux });
    }
};
ExtHostDiskFileSystemProvider = __decorate([
    __param(0, IExtHostConsumerFileSystem),
    __param(1, ILogService)
], ExtHostDiskFileSystemProvider);
export { ExtHostDiskFileSystemProvider };
class DiskFileSystemProviderAdapter {
    constructor(logService) {
        this.impl = new DiskFileSystemProvider(logService);
    }
    async stat(uri) {
        const stat = await this.impl.stat(uri);
        return {
            type: stat.type,
            ctime: stat.ctime,
            mtime: stat.mtime,
            size: stat.size,
            permissions: stat.permissions === FilePermission.Readonly ? 1 : undefined,
        };
    }
    readDirectory(uri) {
        return this.impl.readdir(uri);
    }
    createDirectory(uri) {
        return this.impl.mkdir(uri);
    }
    readFile(uri) {
        return this.impl.readFile(uri);
    }
    writeFile(uri, content, options) {
        return this.impl.writeFile(uri, content, { ...options, unlock: false, atomic: false });
    }
    delete(uri, options) {
        return this.impl.delete(uri, { ...options, useTrash: false, atomic: false });
    }
    rename(oldUri, newUri, options) {
        return this.impl.rename(oldUri, newUri, options);
    }
    copy(source, destination, options) {
        return this.impl.copy(source, destination, options);
    }
    // --- Not Implemented ---
    get onDidChangeFile() {
        throw new Error('Method not implemented.');
    }
    watch(uri, options) {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERpc2tGaWxlU3lzdGVtUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvbm9kZS9leHRIb3N0RGlza0ZpbGVTeXN0ZW1Qcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNuRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFbkQsSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFBNkI7SUFDekMsWUFDNkIseUJBQXFELEVBQ3BFLFVBQXVCO1FBRXBDLHFEQUFxRDtRQUNyRCx3REFBd0Q7UUFDeEQsOEJBQThCO1FBQzlCLHlCQUF5QixDQUFDLHFCQUFxQixDQUM5QyxPQUFPLENBQUMsSUFBSSxFQUNaLElBQUksNkJBQTZCLENBQUMsVUFBVSxDQUFDLEVBQzdDLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxDQUM1QixDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFkWSw2QkFBNkI7SUFFdkMsV0FBQSwwQkFBMEIsQ0FBQTtJQUMxQixXQUFBLFdBQVcsQ0FBQTtHQUhELDZCQUE2QixDQWN6Qzs7QUFFRCxNQUFNLDZCQUE2QjtJQUdsQyxZQUFZLFVBQXVCO1FBQ2xDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFlO1FBQ3pCLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFdEMsT0FBTztZQUNOLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztZQUNqQixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDakIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1lBQ2YsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXLEtBQUssY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO1NBQ3pFLENBQUE7SUFDRixDQUFDO0lBRUQsYUFBYSxDQUFDLEdBQWU7UUFDNUIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUM5QixDQUFDO0lBRUQsZUFBZSxDQUFDLEdBQWU7UUFDOUIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUM1QixDQUFDO0lBRUQsUUFBUSxDQUFDLEdBQWU7UUFDdkIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUMvQixDQUFDO0lBRUQsU0FBUyxDQUNSLEdBQWUsRUFDZixPQUFtQixFQUNuQixPQUFrRTtRQUVsRSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRSxHQUFHLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBQ3ZGLENBQUM7SUFFRCxNQUFNLENBQUMsR0FBZSxFQUFFLE9BQXdDO1FBQy9ELE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEVBQUUsR0FBRyxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUM3RSxDQUFDO0lBRUQsTUFBTSxDQUNMLE1BQWtCLEVBQ2xCLE1BQWtCLEVBQ2xCLE9BQXdDO1FBRXhDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUNqRCxDQUFDO0lBRUQsSUFBSSxDQUNILE1BQWtCLEVBQ2xCLFdBQXVCLEVBQ3ZCLE9BQXdDO1FBRXhDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUNwRCxDQUFDO0lBRUQsMEJBQTBCO0lBRTFCLElBQUksZUFBZTtRQUNsQixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELEtBQUssQ0FDSixHQUFlLEVBQ2YsT0FBOEU7UUFFOUUsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7Q0FDRCJ9