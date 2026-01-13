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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jRW5hYmxlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vdXNlckRhdGFTeW5jRW5hYmxlbWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUVOLGVBQWUsR0FHZixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsZ0JBQWdCLEVBRWhCLG1DQUFtQyxHQUVuQyxNQUFNLG1CQUFtQixDQUFBO0FBRTFCLE1BQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQTtBQUU1QixJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUNaLFNBQVEsVUFBVTtJQVlsQixZQUNrQixjQUFnRCxFQUM1QyxrQkFBMEQsRUFFL0Usa0NBQXdGO1FBRXhGLEtBQUssRUFBRSxDQUFBO1FBTDJCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUN6Qix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBRTlELHVDQUFrQyxHQUFsQyxrQ0FBa0MsQ0FBcUM7UUFYakYsMkJBQXNCLEdBQUcsSUFBSSxPQUFPLEVBQVcsQ0FBQTtRQUM5QywwQkFBcUIsR0FBbUIsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQTtRQUUxRSxtQ0FBOEIsR0FBRyxJQUFJLE9B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