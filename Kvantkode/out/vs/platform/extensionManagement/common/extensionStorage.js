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
var ExtensionStorageService_1;
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { IStorageService, } from '../../storage/common/storage.js';
import { adoptToGalleryExtensionId, areSameExtensions, getExtensionId, } from './extensionManagementUtil.js';
import { IProductService } from '../../product/common/productService.js';
import { distinct } from '../../../base/common/arrays.js';
import { ILogService } from '../../log/common/log.js';
import { isString } from '../../../base/common/types.js';
export const IExtensionStorageService = createDecorator('IExtensionStorageService');
const EXTENSION_KEYS_ID_VERSION_REGEX = /^extensionKeys\/([^.]+\..+)@(\d+\.\d+\.\d+(-.*)?)$/;
let ExtensionStorageService = class ExtensionStorageService extends Disposable {
    static { ExtensionStorageService_1 = this; }
    static { this.LARGE_STATE_WARNING_THRESHOLD = 512 * 1024; }
    static toKey(extension) {
        return `extensionKeys/${adoptToGalleryExtensionId(extension.id)}@${extension.version}`;
    }
    static fromKey(key) {
        const matches = EXTENSION_KEYS_ID_VERSION_REGEX.exec(key);
        if (matches && matches[1]) {
            return { id: matches[1], version: matches[2] };
        }
        return undefined;
    }
    /* TODO @sandy081: This has to be done across all profiles */
    static async removeOutdatedExtensionVersions(extensionManagementService, storageService) {
        const extensions = await extensionManagementService.getInstalled();
        const extensionVersionsToRemove = [];
        for (const [id, versions] of ExtensionStorageService_1.readAllExtensionsWithKeysForSync(storageService)) {
            const extensionVersion = extensions.find((e) => areSameExtensions(e.identifier, { id }))
                ?.manifest.version;
            for (const version of versions) {
                if (extensionVersion !== version) {
                    extensionVersionsToRemove.push(ExtensionStorageService_1.toKey({ id, version }));
                }
            }
        }
        for (const key of extensionVersionsToRemove) {
            storageService.remove(key, 0 /* StorageScope.PROFILE */);
        }
    }
    static readAllExtensionsWithKeysForSync(storageService) {
        const extensionsWithKeysForSync = new Map();
        const keys = storageService.keys(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        for (const key of keys) {
            const extensionIdWithVersion = ExtensionStorageService_1.fromKey(key);
            if (extensionIdWithVersion) {
                let versions = extensionsWithKeysForSync.get(extensionIdWithVersion.id.toLowerCase());
                if (!versions) {
                    extensionsWithKeysForSync.set(extensionIdWithVersion.id.toLowerCase(), (versions = []));
                }
                versions.push(extensionIdWithVersion.version);
            }
        }
        return extensionsWithKeysForSync;
    }
    constructor(storageService, productService, logService) {
        super();
        this.storageService = storageService;
        this.productService = productService;
        this.logService = logService;
        this._onDidChangeExtensionStorageToSync = this._register(new Emitter());
        this.onDidChangeExtensionStorageToSync = this._onDidChangeExtensionStorageToSync.event;
        this.extensionsWithKeysForSync =
            ExtensionStorageService_1.readAllExtensionsWithKeysForSync(storageService);
        this._register(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, undefined, this._store)((e) => this.onDidChangeStorageValue(e)));
    }
    onDidChangeStorageValue(e) {
        // State of extension with keys for sync has changed
        if (this.extensionsWithKeysForSync.has(e.key.toLowerCase())) {
            this._onDidChangeExtensionStorageToSync.fire();
            return;
        }
        // Keys for sync of an extension has changed
        const extensionIdWithVersion = ExtensionStorageService_1.fromKey(e.key);
        if (extensionIdWithVersion) {
            if (this.storageService.get(e.key, 0 /* StorageScope.PROFILE */) === undefined) {
                this.extensionsWithKeysForSync.delete(extensionIdWithVersion.id.toLowerCase());
            }
            else {
                let versions = this.extensionsWithKeysForSync.get(extensionIdWithVersion.id.toLowerCase());
                if (!versions) {
                    this.extensionsWithKeysForSync.set(extensionIdWithVersion.id.toLowerCase(), (versions = []));
                }
                versions.push(extensionIdWithVersion.version);
                this._onDidChangeExtensionStorageToSync.fire();
            }
            return;
        }
    }
    getExtensionId(extension) {
        if (isString(extension)) {
            return extension;
        }
        const publisher = extension.manifest
            ? extension.manifest.publisher
            : extension.publisher;
        const name = extension.manifest
            ? extension.manifest.name
            : extension.name;
        return getExtensionId(publisher, name);
    }
    getExtensionState(extension, global) {
        const extensionId = this.getExtensionId(extension);
        const jsonValue = this.getExtensionStateRaw(extension, global);
        if (jsonValue) {
            try {
                return JSON.parse(jsonValue);
            }
            catch (error) {
                // Do not fail this call but log it for diagnostics
                // https://github.com/microsoft/vscode/issues/132777
                this.logService.error(`[mainThreadStorage] unexpected error parsing storage contents (extensionId: ${extensionId}, global: ${global}): ${error}`);
            }
        }
        return undefined;
    }
    getExtensionStateRaw(extension, global) {
        const extensionId = this.getExtensionId(extension);
        const rawState = this.storageService.get(extensionId, global ? 0 /* StorageScope.PROFILE */ : 1 /* StorageScope.WORKSPACE */);
        if (rawState && rawState?.length > ExtensionStorageService_1.LARGE_STATE_WARNING_THRESHOLD) {
            this.logService.warn(`[mainThreadStorage] large extension state detected (extensionId: ${extensionId}, global: ${global}): ${rawState.length / 1024}kb. Consider to use 'storageUri' or 'globalStorageUri' to store this data on disk instead.`);
        }
        return rawState;
    }
    setExtensionState(extension, state, global) {
        const extensionId = this.getExtensionId(extension);
        if (state === undefined) {
            this.storageService.remove(extensionId, global ? 0 /* StorageScope.PROFILE */ : 1 /* StorageScope.WORKSPACE */);
        }
        else {
            this.storageService.store(extensionId, JSON.stringify(state), global ? 0 /* StorageScope.PROFILE */ : 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
    }
    setKeysForSync(extensionIdWithVersion, keys) {
        this.storageService.store(ExtensionStorageService_1.toKey(extensionIdWithVersion), JSON.stringify(keys), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
    getKeysForSync(extensionIdWithVersion) {
        const extensionKeysForSyncFromProduct = this.productService.extensionSyncedKeys?.[extensionIdWithVersion.id.toLowerCase()];
        const extensionKeysForSyncFromStorageValue = this.storageService.get(ExtensionStorageService_1.toKey(extensionIdWithVersion), 0 /* StorageScope.PROFILE */);
        const extensionKeysForSyncFromStorage = extensionKeysForSyncFromStorageValue
            ? JSON.parse(extensionKeysForSyncFromStorageValue)
            : undefined;
        return extensionKeysForSyncFromStorage && extensionKeysForSyncFromProduct
            ? distinct([...extensionKeysForSyncFromStorage, ...extensionKeysForSyncFromProduct])
            : extensionKeysForSyncFromStorage || extensionKeysForSyncFromProduct;
    }
    addToMigrationList(from, to) {
        if (from !== to) {
            // remove the duplicates
            const migrationList = this.migrationList.filter((entry) => !entry.includes(from) && !entry.includes(to));
            migrationList.push([from, to]);
            this.migrationList = migrationList;
        }
    }
    getSourceExtensionToMigrate(toExtensionId) {
        const entry = this.migrationList.find(([, to]) => toExtensionId === to);
        return entry ? entry[0] : undefined;
    }
    get migrationList() {
        const value = this.storageService.get('extensionStorage.migrationList', -1 /* StorageScope.APPLICATION */, '[]');
        try {
            const migrationList = JSON.parse(value);
            if (Array.isArray(migrationList)) {
                return migrationList;
            }
        }
        catch (error) {
            /* ignore */
        }
        return [];
    }
    set migrationList(migrationList) {
        if (migrationList.length) {
            this.storageService.store('extensionStorage.migrationList', JSON.stringify(migrationList), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove('extensionStorage.migrationList', -1 /* StorageScope.APPLICATION */);
        }
    }
};
ExtensionStorageService = ExtensionStorageService_1 = __decorate([
    __param(0, IStorageService),
    __param(1, IProductService),
    __param(2, ILogService)
], ExtensionStorageService);
export { ExtensionStorageService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uU3RvcmFnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vZXh0ZW5zaW9uU3RvcmFnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUVOLGVBQWUsR0FHZixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFDTix5QkFBeUIsRUFDekIsaUJBQWlCLEVBQ2pCLGNBQWMsR0FDZCxNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRXJELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQVN4RCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxlQUFlLENBQ3RELDBCQUEwQixDQUMxQixDQUFBO0FBMkJELE1BQU0sK0JBQStCLEdBQUcsb0RBQW9ELENBQUE7QUFFckYsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVOzthQUd2QyxrQ0FBNkIsR0FBRyxHQUFHLEdBQUcsSUFBSSxBQUFiLENBQWE7SUFFakQsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFrQztRQUN0RCxPQUFPLGlCQUFpQix5QkFBeUIsQ0FBQyxTQUFTLENBQUMs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