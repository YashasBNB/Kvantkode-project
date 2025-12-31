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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uU3RvcmFnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2V4dGVuc2lvblN0b3JhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFFTixlQUFlLEdBR2YsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQ04seUJBQXlCLEVBQ3pCLGlCQUFpQixFQUNqQixjQUFjLEdBQ2QsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUVyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFTeEQsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsZUFBZSxDQUN0RCwwQkFBMEIsQ0FDMUIsQ0FBQTtBQTJCRCxNQUFNLCtCQUErQixHQUFHLG9EQUFvRCxDQUFBO0FBRXJGLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsVUFBVTs7YUFHdkMsa0NBQTZCLEdBQUcsR0FBRyxHQUFHLElBQUksQUFBYixDQUFhO0lBRWpELE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBa0M7UUFDdEQsT0FBTyxpQkFBaUIseUJBQXlCLENBQUMsU0FBUyxDQUFDLEVBQUUs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