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
import { Emitter } from '../../../../base/common/event.js';
import { debounce, throttle } from '../../../../base/common/decorators.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { MergedEnvironmentVariableCollection } from '../../../../platform/terminal/common/environmentVariableCollection.js';
import { deserializeEnvironmentDescriptionMap, deserializeEnvironmentVariableCollection, serializeEnvironmentDescriptionMap, serializeEnvironmentVariableCollection, } from '../../../../platform/terminal/common/environmentVariableShared.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
/**
 * Tracks and persists environment variable collections as defined by extensions.
 */
let EnvironmentVariableService = class EnvironmentVariableService extends Disposable {
    get onDidChangeCollections() {
        return this._onDidChangeCollections.event;
    }
    constructor(_extensionService, _storageService) {
        super();
        this._extensionService = _extensionService;
        this._storageService = _storageService;
        this.collections = new Map();
        this._onDidChangeCollections = this._register(new Emitter());
        this._storageService.remove("terminal.integrated.environmentVariableCollections" /* TerminalStorageKeys.DeprecatedEnvironmentVariableCollections */, 1 /* StorageScope.WORKSPACE */);
        const serializedPersistedCollections = this._storageService.get("terminal.integrated.environmentVariableCollectionsV2" /* TerminalStorageKeys.EnvironmentVariableCollections */, 1 /* StorageScope.WORKSPACE */);
        if (serializedPersistedCollections) {
            const collectionsJson = JSON.parse(serializedPersistedCollections);
            collectionsJson.forEach((c) => this.collections.set(c.extensionIdentifier, {
                persistent: true,
                map: deserializeEnvironmentVariableCollection(c.collection),
                descriptionMap: deserializeEnvironmentDescriptionMap(c.description),
            }));
            // Asynchronously invalidate collections where extensions have been uninstalled, this is
            // async to avoid making all functions on the service synchronous and because extensions
            // being uninstalled is rare.
            this._invalidateExtensionCollections();
        }
        this.mergedCollection = this._resolveMergedCollection();
        // Listen for uninstalled/disabled extensions
        this._register(this._extensionService.onDidChangeExtensions(() => this._invalidateExtensionCollections()));
    }
    set(extensionIdentifier, collection) {
        this.collections.set(extensionIdentifier, collection);
        this._updateCollections();
    }
    delete(extensionIdentifier) {
        this.collections.delete(extensionIdentifier);
        this._updateCollections();
    }
    _updateCollections() {
        this._persistCollectionsEventually();
        this.mergedCollection = this._resolveMergedCollection();
        this._notifyCollectionUpdatesEventually();
    }
    _persistCollectionsEventually() {
        this._persistCollections();
    }
    _persistCollections() {
        const collectionsJson = [];
        this.collections.forEach((collection, extensionIdentifier) => {
            if (collection.persistent) {
                collectionsJson.push({
                    extensionIdentifier,
                    collection: serializeEnvironmentVariableCollection(this.collections.get(extensionIdentifier).map),
                    description: serializeEnvironmentDescriptionMap(collection.descriptionMap),
                });
            }
        });
        const stringifiedJson = JSON.stringify(collectionsJson);
        this._storageService.store("terminal.integrated.environmentVariableCollectionsV2" /* TerminalStorageKeys.EnvironmentVariableCollections */, stringifiedJson, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    _notifyCollectionUpdatesEventually() {
        this._notifyCollectionUpdates();
    }
    _notifyCollectionUpdates() {
        this._onDidChangeCollections.fire(this.mergedCollection);
    }
    _resolveMergedCollection() {
        return new MergedEnvironmentVariableCollection(this.collections);
    }
    async _invalidateExtensionCollections() {
        await this._extensionService.whenInstalledExtensionsRegistered();
        const registeredExtensions = this._extensionService.extensions;
        let changes = false;
        this.collections.forEach((_, extensionIdentifier) => {
            const isExtensionRegistered = registeredExtensions.some((r) => r.identifier.value === extensionIdentifier);
            if (!isExtensionRegistered) {
                this.collections.delete(extensionIdentifier);
                changes = true;
            }
        });
        if (changes) {
            this._updateCollections();
        }
    }
};
__decorate([
    throttle(1000)
], EnvironmentVariableService.prototype, "_persistCollectionsEventually", null);
__decorate([
    debounce(1000)
], EnvironmentVariableService.prototype, "_notifyCollectionUpdatesEventually", null);
EnvironmentVariableService = __decorate([
    __param(0, IExtensionService),
    __param(1, IStorageService)
], EnvironmentVariableService);
export { EnvironmentVariableService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRWYXJpYWJsZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9jb21tb24vZW52aXJvbm1lbnRWYXJpYWJsZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDMUUsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLHVFQUF1RSxDQUFBO0FBQzNILE9BQU8sRUFDTixvQ0FBb0MsRUFDcEMsd0NBQXdDLEVBQ3hDLGtDQUFrQyxFQUNsQyxzQ0FBc0MsR0FDdEMsTUFBTSxtRUFBbUUsQ0FBQTtBQVcxRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFRakU7O0dBRUc7QUFDSSxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEyQixTQUFRLFVBQVU7SUFTekQsSUFBSSxzQkFBc0I7UUFDekIsT0FBTyxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFBO0lBQzFDLENBQUM7SUFFRCxZQUNvQixpQkFBcUQsRUFDdkQsZUFBaUQ7UUFFbEUsS0FBSyxFQUFFLENBQUE7UUFINkIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUN0QyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFabkUsZ0JBQVcsR0FBK0QsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUdsRSw0QkFBdUIsR0FBRyxJQUFJLENB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