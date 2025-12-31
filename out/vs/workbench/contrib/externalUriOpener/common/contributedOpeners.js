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
var ContributedExternalUriOpenersStore_1;
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { Memento } from '../../../common/memento.js';
import { updateContributedOpeners } from './configuration.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
let ContributedExternalUriOpenersStore = class ContributedExternalUriOpenersStore extends Disposable {
    static { ContributedExternalUriOpenersStore_1 = this; }
    static { this.STORAGE_ID = 'externalUriOpeners'; }
    constructor(storageService, _extensionService) {
        super();
        this._extensionService = _extensionService;
        this._openers = new Map();
        this._memento = new Memento(ContributedExternalUriOpenersStore_1.STORAGE_ID, storageService);
        this._mementoObject = this._memento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        for (const [id, value] of Object.entries(this._mementoObject || {})) {
            this.add(id, value.extensionId, { isCurrentlyRegistered: false });
        }
        this.invalidateOpenersOnExtensionsChanged();
        this._register(this._extensionService.onDidChangeExtensions(() => this.invalidateOpenersOnExtensionsChanged()));
        this._register(this._extensionService.onDidChangeExtensionsStatus(() => this.invalidateOpenersOnExtensionsChanged()));
    }
    didRegisterOpener(id, extensionId) {
        this.add(id, extensionId, {
            isCurrentlyRegistered: true,
        });
    }
    add(id, extensionId, options) {
        const existing = this._openers.get(id);
        if (existing) {
            existing.isCurrentlyRegistered =
                existing.isCurrentlyRegistered || options.isCurrentlyRegistered;
            return;
        }
        const entry = {
            extensionId,
            isCurrentlyRegistered: options.isCurrentlyRegistered,
        };
        this._openers.set(id, entry);
        this._mementoObject[id] = entry;
        this._memento.saveMemento();
        this.updateSchema();
    }
    delete(id) {
        this._openers.delete(id);
        delete this._mementoObject[id];
        this._memento.saveMemento();
        this.updateSchema();
    }
    async invalidateOpenersOnExtensionsChanged() {
        await this._extensionService.whenInstalledExtensionsRegistered();
        const registeredExtensions = this._extensionService.extensions;
        for (const [id, entry] of this._openers) {
            const extension = registeredExtensions.find((r) => r.identifier.value === entry.extensionId);
            if (extension) {
                if (!this._extensionService.canRemoveExtension(extension)) {
                    // The extension is running. We should have registered openers at this point
                    if (!entry.isCurrentlyRegistered) {
                        this.delete(id);
                    }
                }
            }
            else {
                // The opener came from an extension that is no longer enabled/installed
                this.delete(id);
            }
        }
    }
    updateSchema() {
        const ids = [];
        const descriptions = [];
        for (const [id, entry] of this._openers) {
            ids.push(id);
            descriptions.push(entry.extensionId);
        }
        updateContributedOpeners(ids, descriptions);
    }
};
ContributedExternalUriOpenersStore = ContributedExternalUriOpenersStore_1 = __decorate([
    __param(0, IStorageService),
    __param(1, IExtensionService)
], ContributedExternalUriOpenersStore);
export { ContributedExternalUriOpenersStore };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJpYnV0ZWRPcGVuZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZXJuYWxVcmlPcGVuZXIvY29tbW9uL2NvbnRyaWJ1dGVkT3BlbmVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDcEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFZOUUsSUFBTSxrQ0FBa0MsR0FBeEMsTUFBTSxrQ0FBbUMsU0FBUSxVQUFVOzthQUN6QyxlQUFVLEdBQUcsb0JBQW9CLEFBQXZCLENBQXVCO0lBTXpELFlBQ2tCLGNBQStCLEVBQzdCLGlCQUFxRDtRQUV4RSxLQUFLLEVBQUUsQ0FBQTtRQUY2QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBTnhELGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBb0MsQ0FBQTtRQVV0RSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksT0FBTyxDQUFDLG9DQUFrQyxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUMxRixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSw2REFBNkMsQ0FBQTtRQUMzRixLQUFLLE1BQU0sQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENB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