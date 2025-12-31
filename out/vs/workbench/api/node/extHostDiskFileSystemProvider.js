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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERpc2tGaWxlU3lzdGVtUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL25vZGUvZXh0SG9zdERpc2tGaWxlU3lzdGVtUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUMvRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRW5ELElBQU0sNkJBQTZCLEdBQW5DLE1BQU0sNkJBQTZCO0lBQ3pDLFlBQzZCLHlCQUFxRCxFQUNwRSxVQUF1QjtRQUVwQyxxREFBcUQ7UUFDckQsd0RBQXdEO1FBQ3hELDhCQUE4QjtRQUM5Qix5QkFBeUIsQ0FBQyxxQkFBcUIsQ0FDOUMsT0FBTyxDQUFDLElBQUksRUFDWixJQUFJLDZCQUE2QixDQUFDLFVBQVUsQ0FBQyxFQUM3QyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsQ0FDNUIsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBZFksNkJBQTZCO0lBRXZDLFdBQUEsMEJBQTBCLENBQUE7SUFDMUIsV0FBQSxXQUFXLENBQUE7R0FIRCw2QkFBNkIsQ0FjekM7O0FBRUQsTUFBTSw2QkFBNkI7SUFHbEMsWUFBWSxVQUF1QjtRQUNsQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDbkQsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBZTtRQUN6QixNQUFNLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRXRDLE9BQU87WUFDTixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDakIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2pCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVyxLQUFLLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztTQUN6RSxDQUFBO0lBQ0YsQ0FBQztJQUVELGFBQWEsQ0FBQyxHQUFlO1FBQzVCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDOUIsQ0FBQztJQUVELGVBQWUsQ0FBQyxHQUFlO1FBQzlCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDNUIsQ0FBQztJQUVELFFBQVEsQ0FBQyxHQUFlO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDL0IsQ0FBQztJQUVELFNBQVMsQ0FDUixHQUFlLEVBQ2YsT0FBbUIsRUFDbkIsT0FBa0U7UUFFbEUsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLEVBQUUsR0FBRyxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUN2RixDQUFDO0lBRUQsTUFBTSxDQUFDLEdBQWUsRUFBRSxPQUF3QztRQUMvRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsT0FBTyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDN0UsQ0FBQztJQUVELE1BQU0sQ0FDTCxNQUFrQixFQUNsQixNQUFrQixFQUNsQixPQUF3QztRQUV4QyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDakQsQ0FBQztJQUVELElBQUksQ0FDSCxNQUFrQixFQUNsQixXQUF1QixFQUN2QixPQUF3QztRQUV4QyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDcEQsQ0FBQztJQUVELDBCQUEwQjtJQUUxQixJQUFJLGVBQWU7UUFDbEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFDRCxLQUFLLENBQ0osR0FBZSxFQUNmLE9BQThFO1FBRTlFLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0NBQ0QifQ==