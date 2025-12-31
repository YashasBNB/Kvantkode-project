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
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { isUndefinedOrNull } from '../../../base/common/types.js';
import { DISABLED_EXTENSIONS_STORAGE_PATH, IExtensionManagementService, } from './extensionManagement.js';
import { areSameExtensions } from './extensionManagementUtil.js';
import { IStorageService, } from '../../storage/common/storage.js';
let GlobalExtensionEnablementService = class GlobalExtensionEnablementService extends Disposable {
    constructor(storageService, extensionManagementService) {
        super();
        this._onDidChangeEnablement = new Emitter();
        this.onDidChangeEnablement = this._onDidChangeEnablement.event;
        this.storageManager = this._register(new StorageManager(storageService));
        this._register(this.storageManager.onDidChange((extensions) => this._onDidChangeEnablement.fire({ extensions, source: 'storage' })));
        this._register(extensionManagementService.onDidInstallExtensions((e) => e.forEach(({ local, operation }) => {
            if (local && operation === 4 /* InstallOperation.Migrate */) {
                this._removeFromDisabledExtensions(local.identifier); /* Reset migrated extensions */
            }
        })));
    }
    async enableExtension(extension, source) {
        if (this._removeFromDisabledExtensions(extension)) {
            this._onDidChangeEnablement.fire({ extensions: [extension], source });
            return true;
        }
        return false;
    }
    async disableExtension(extension, source) {
        if (this._addToDisabledExtensions(extension)) {
            this._onDidChangeEnablement.fire({ extensions: [extension], source });
            return true;
        }
        return false;
    }
    getDisabledExtensions() {
        return this._getExtensions(DISABLED_EXTENSIONS_STORAGE_PATH);
    }
    async getDisabledExtensionsAsync() {
        return this.getDisabledExtensions();
    }
    _addToDisabledExtensions(identifier) {
        const disabledExtensions = this.getDisabledExtensions();
        if (disabledExtensions.every((e) => !areSameExtensions(e, identifier))) {
            disabledExtensions.push(identifier);
            this._setDisabledExtensions(disabledExtensions);
            return true;
        }
        return false;
    }
    _removeFromDisabledExtensions(identifier) {
        const disabledExtensions = this.getDisabledExtensions();
        for (let index = 0; index < disabledExtensions.length; index++) {
            const disabledExtension = disabledExtensions[index];
            if (areSameExtensions(disabledExtension, identifier)) {
                disabledExtensions.splice(index, 1);
                this._setDisabledExtensions(disabledExtensions);
                return true;
            }
        }
        return false;
    }
    _setDisabledExtensions(disabledExtensions) {
        this._setExtensions(DISABLED_EXTENSIONS_STORAGE_PATH, disabledExtensions);
    }
    _getExtensions(storageId) {
        return this.storageManager.get(storageId, 0 /* StorageScope.PROFILE */);
    }
    _setExtensions(storageId, extensions) {
        this.storageManager.set(storageId, extensions, 0 /* StorageScope.PROFILE */);
    }
};
GlobalExtensionEnablementService = __decorate([
    __param(0, IStorageService),
    __param(1, IExtensionManagementService)
], GlobalExtensionEnablementService);
export { GlobalExtensionEnablementService };
export class StorageManager extends Disposable {
    constructor(storageService) {
        super();
        this.storageService = storageService;
        this.storage = Object.create(null);
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._register(storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, undefined, this._store)((e) => this.onDidStorageChange(e)));
    }
    get(key, scope) {
        let value;
        if (scope === 0 /* StorageScope.PROFILE */) {
            if (isUndefinedOrNull(this.storage[key])) {
                this.storage[key] = this._get(key, scope);
            }
            value = this.storage[key];
        }
        else {
            value = this._get(key, scope);
        }
        return JSON.parse(value);
    }
    set(key, value, scope) {
        const newValue = JSON.stringify(value.map(({ id, uuid }) => ({ id, uuid })));
        const oldValue = this._get(key, scope);
        if (oldValue !== newValue) {
            if (scope === 0 /* StorageScope.PROFILE */) {
                if (value.length) {
                    this.storage[key] = newValue;
                }
                else {
                    delete this.storage[key];
                }
            }
            this._set(key, value.length ? newValue : undefined, scope);
        }
    }
    onDidStorageChange(storageChangeEvent) {
        if (!isUndefinedOrNull(this.storage[storageChangeEvent.key])) {
            const newValue = this._get(storageChangeEvent.key, storageChangeEvent.scope);
            if (newValue !== this.storage[storageChangeEvent.key]) {
                const oldValues = this.get(storageChangeEvent.key, storageChangeEvent.scope);
                delete this.storage[storageChangeEvent.key];
                const newValues = this.get(storageChangeEvent.key, storageChangeEvent.scope);
                const added = oldValues.filter((oldValue) => !newValues.some((newValue) => areSameExtensions(oldValue, newValue)));
                const removed = newValues.filter((newValue) => !oldValues.some((oldValue) => areSameExtensions(oldValue, newValue)));
                if (added.length || removed.length) {
                    this._onDidChange.fire([...added, ...removed]);
                }
            }
        }
    }
    _get(key, scope) {
        return this.storageService.get(key, scope, '[]');
    }
    _set(key, value, scope) {
        if (value) {
            // Enablement state is synced separately through extensions
            this.storageService.store(key, value, scope, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(key, scope);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRW5hYmxlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9leHRlbnNpb25FbmFibGVtZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2pFLE9BQU8sRUFDTixnQ0FBZ0MsRUFFaEMsMkJBQTJCLEdBRzNCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDaEUsT0FBTyxFQUVOLGVBQWUsR0FHZixNQUFNLGlDQUFpQyxDQUFBO0FBRWpDLElBQU0sZ0NBQWdDLEdBQXRDLE1BQU0sZ0NBQ1osU0FBUSxVQUFVO0lBZWxCLFlBQ2tCLGNBQStCLEVBQ25CLDBCQUF1RDtRQUVwRixLQUFLLEVBQUUsQ0FBQTtRQWRBLDJCQUFzQixHQUFHLElBQUksT0FBTyxFQUd4QyxDQUFBO1FBQ0ssMEJBQXFCLEdBR3pCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUE7UUFRckMsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUE7UUFDeEUsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQzlDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMs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