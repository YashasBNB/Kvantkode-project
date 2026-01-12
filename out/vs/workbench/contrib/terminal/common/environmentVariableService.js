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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRWYXJpYWJsZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2NvbW1vbi9lbnZpcm9ubWVudFZhcmlhYmxlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMxRSxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDckYsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sdUVBQXVFLENBQUE7QUFDM0gsT0FBTyxFQUNOLG9DQUFvQyxFQUNwQyx3Q0FBd0MsRUFDeEMsa0NBQWtDLEVBQ2xDLHNDQUFzQyxHQUN0QyxNQUFNLG1FQUFtRSxDQUFBO0FBVzFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQVFqRTs7R0FFRztBQUNJLElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTJCLFNBQVEsVUFBVTtJQVN6RCxJQUFJLHNCQUFzQjtRQUN6QixPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUE7SUFDMUMsQ0FBQztJQUVELFlBQ29CLGlCQUFxRCxFQUN2RCxlQUFpRDtRQUVsRSxLQUFLLEVBQUUsQ0FBQTtRQUg2QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQ3RDLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQVpuRSxnQkFBVyxHQUErRCxJQUFJLEdBQUcsRUFBRSxDQUFBO1FBR2xFLDRCQUF1QixHQUFHLElB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