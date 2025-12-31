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
import { isWeb } from '../../../base/common/platform.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IStorageService, } from '../../storage/common/storage.js';
import { ALL_SYNC_RESOURCES, getEnablementKey, IUserDataSyncStoreManagementService, } from './userDataSync.js';
const enablementKey = 'sync.enable';
let UserDataSyncEnablementService = class UserDataSyncEnablementService extends Disposable {
    constructor(storageService, environmentService, userDataSyncStoreManagementService) {
        super();
        this.storageService = storageService;
        this.environmentService = environmentService;
        this.userDataSyncStoreManagementService = userDataSyncStoreManagementService;
        this._onDidChangeEnablement = new Emitter();
        this.onDidChangeEnablement = this._onDidChangeEnablement.event;
        this._onDidChangeResourceEnablement = new Emitter();
        this.onDidChangeResourceEnablement = this._onDidChangeResourceEnablement.event;
        this._register(storageService.onDidChangeValue(-1 /* StorageScope.APPLICATION */, undefined, this._store)((e) => this.onDidStorageChange(e)));
    }
    isEnabled() {
        switch (this.environmentService.sync) {
            case 'on':
                return true;
            case 'off':
                return false;
        }
        return this.storageService.getBoolean(enablementKey, -1 /* StorageScope.APPLICATION */, false);
    }
    canToggleEnablement() {
        return (this.userDataSyncStoreManagementService.userDataSyncStore !== undefined &&
            this.environmentService.sync === undefined);
    }
    setEnablement(enabled) {
        if (enabled && !this.canToggleEnablement()) {
            return;
        }
        this.storageService.store(enablementKey, enabled, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    isResourceEnabled(resource, defaultValue) {
        const storedValue = this.storageService.getBoolean(getEnablementKey(resource), -1 /* StorageScope.APPLICATION */);
        defaultValue = defaultValue ?? resource !== "prompts" /* SyncResource.Prompts */;
        return storedValue ?? defaultValue;
    }
    isResourceEnablementConfigured(resource) {
        const storedValue = this.storageService.getBoolean(getEnablementKey(resource), -1 /* StorageScope.APPLICATION */);
        return storedValue !== undefined;
    }
    setResourceEnablement(resource, enabled) {
        if (this.isResourceEnabled(resource) !== enabled) {
            const resourceEnablementKey = getEnablementKey(resource);
            this.storeResourceEnablement(resourceEnablementKey, enabled);
        }
    }
    getResourceSyncStateVersion(resource) {
        return undefined;
    }
    storeResourceEnablement(resourceEnablementKey, enabled) {
        this.storageService.store(resourceEnablementKey, enabled, -1 /* StorageScope.APPLICATION */, isWeb ? 0 /* StorageTarget.USER */ : 1 /* StorageTarget.MACHINE */);
    }
    onDidStorageChange(storageChangeEvent) {
        if (enablementKey === storageChangeEvent.key) {
            this._onDidChangeEnablement.fire(this.isEnabled());
            return;
        }
        const resourceKey = ALL_SYNC_RESOURCES.filter((resourceKey) => getEnablementKey(resourceKey) === storageChangeEvent.key)[0];
        if (resourceKey) {
            this._onDidChangeResourceEnablement.fire([resourceKey, this.isResourceEnabled(resourceKey)]);
            return;
        }
    }
};
UserDataSyncEnablementService = __decorate([
    __param(0, IStorageService),
    __param(1, IEnvironmentService),
    __param(2, IUserDataSyncStoreManagementService)
], UserDataSyncEnablementService);
export { UserDataSyncEnablementService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jRW5hYmxlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL3VzZXJEYXRhU3luY0VuYWJsZW1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdFLE9BQU8sRUFFTixlQUFlLEdBR2YsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGdCQUFnQixFQUVoQixtQ0FBbUMsR0FFbkMsTUFBTSxtQkFBbUIsQ0FBQTtBQUUxQixNQUFNLGFBQWEsR0FBRyxhQUFhLENBQUE7QUFFNUIsSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFDWixTQUFRLFVBQVU7SUFZbEIsWUFDa0IsY0FBZ0QsRUFDNUMsa0JBQTBELEVBRS9FLGtDQUF3RjtRQUV4RixLQUFLLEVBQUUsQ0FBQTtRQUwyQixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDekIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUU5RCx1Q0FBa0MsR0FBbEMsa0NBQWtDLENBQXFDO1FBWGpGLDJCQUFzQixHQUFHLElBQUksT0FBTyxFQUFXLENBQUE7UUFDOUMsMEJBQXFCLEdBQW1CLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUE7UUFFMUUsbUNBQThCLEdBQUcsSUFBSSxPQUFPLEVBQTJCLENBQUE7UUFDdEUsa0NB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