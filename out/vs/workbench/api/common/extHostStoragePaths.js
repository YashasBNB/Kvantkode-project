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
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IExtHostConsumerFileSystem } from './extHostFileSystemConsumer.js';
import { URI } from '../../../base/common/uri.js';
export const IExtensionStoragePaths = createDecorator('IExtensionStoragePaths');
let ExtensionStoragePaths = class ExtensionStoragePaths {
    constructor(initData, _logService, _extHostFileSystem) {
        this._logService = _logService;
        this._extHostFileSystem = _extHostFileSystem;
        this._workspace = initData.workspace ?? undefined;
        this._environment = initData.environment;
        this.whenReady = this._getOrCreateWorkspaceStoragePath().then((value) => (this._value = value));
    }
    async _getWorkspaceStorageURI(storageName) {
        return URI.joinPath(this._environment.workspaceStorageHome, storageName);
    }
    async _getOrCreateWorkspaceStoragePath() {
        if (!this._workspace) {
            return Promise.resolve(undefined);
        }
        const storageName = this._workspace.id;
        const storageUri = await this._getWorkspaceStorageURI(storageName);
        try {
            await this._extHostFileSystem.value.stat(storageUri);
            this._logService.trace('[ExtHostStorage] storage dir already exists', storageUri);
            return storageUri;
        }
        catch {
            // doesn't exist, that's OK
        }
        try {
            this._logService.trace('[ExtHostStorage] creating dir and metadata-file', storageUri);
            await this._extHostFileSystem.value.createDirectory(storageUri);
            await this._extHostFileSystem.value.writeFile(URI.joinPath(storageUri, 'meta.json'), new TextEncoder().encode(JSON.stringify({
                id: this._workspace.id,
                configuration: URI.revive(this._workspace.configuration)?.toString(),
                name: this._workspace.name,
            }, undefined, 2)));
            return storageUri;
        }
        catch (e) {
            this._logService.error('[ExtHostStorage]', e);
            return undefined;
        }
    }
    workspaceValue(extension) {
        if (this._value) {
            return URI.joinPath(this._value, extension.identifier.value);
        }
        return undefined;
    }
    globalValue(extension) {
        return URI.joinPath(this._environment.globalStorageHome, extension.identifier.value.toLowerCase());
    }
    onWillDeactivateAll() { }
};
ExtensionStoragePaths = __decorate([
    __param(0, IExtHostInitDataService),
    __param(1, ILogService),
    __param(2, IExtHostConsumerFileSystem)
], ExtensionStoragePaths);
export { ExtensionStoragePaths };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFN0b3JhZ2VQYXRocy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RTdG9yYWdlUGF0aHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3JFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUtqRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFakQsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQ2xDLGVBQWUsQ0FBeUIsd0JBQXdCLENBQUMsQ0FBQTtBQVUzRCxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFxQjtJQVNqQyxZQUMwQixRQUFpQyxFQUMxQixXQUF3QixFQUNYLGtCQUE4QztRQUQzRCxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUNYLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBNEI7UUFFM0YsSUFBSSxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUMsU0FBUyxJQUFJLFNBQVMsQ0FBQTtRQUNqRCxJQUFJLENBQUMsWUFBWSxHQUFHLFFBQVEsQ0FBQyxXQUFXLENBQUE7UUFDeEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFBO0lBQ2hHLENBQUM7SUFFUyxLQUFLLENBQUMsdUJBQXVCLENB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