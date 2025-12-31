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
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { MainContext, ExtHostContext, } from '../common/extHost.protocol.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { isWeb } from '../../../base/common/platform.js';
import { IExtensionStorageService, } from '../../../platform/extensionManagement/common/extensionStorage.js';
import { migrateExtensionStorage } from '../../services/extensions/common/extensionStorageMigration.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
let MainThreadStorage = class MainThreadStorage {
    constructor(extHostContext, _extensionStorageService, _storageService, _instantiationService, _logService) {
        this._extensionStorageService = _extensionStorageService;
        this._storageService = _storageService;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._storageListener = new DisposableStore();
        this._sharedStorageKeysToWatch = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostStorage);
        this._storageListener.add(this._storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, undefined, this._storageListener)((e) => {
            if (this._sharedStorageKeysToWatch.has(e.key)) {
                const rawState = this._extensionStorageService.getExtensionStateRaw(e.key, true);
                if (typeof rawState === 'string') {
                    this._proxy.$acceptValue(true, e.key, rawState);
                }
            }
        }));
    }
    dispose() {
        this._storageListener.dispose();
    }
    async $initializeExtensionStorage(shared, extensionId) {
        await this.checkAndMigrateExtensionStorage(extensionId, shared);
        if (shared) {
            this._sharedStorageKeysToWatch.set(extensionId, true);
        }
        return this._extensionStorageService.getExtensionStateRaw(extensionId, shared);
    }
    async $setValue(shared, key, value) {
        this._extensionStorageService.setExtensionState(key, value, shared);
    }
    $registerExtensionStorageKeysToSync(extension, keys) {
        this._extensionStorageService.setKeysForSync(extension, keys);
    }
    async checkAndMigrateExtensionStorage(extensionId, shared) {
        try {
            let sourceExtensionId = this._extensionStorageService.getSourceExtensionToMigrate(extensionId);
            // TODO: @sandy081 - Remove it after 6 months
            // If current extension does not have any migration requested
            // Then check if the extension has to be migrated for using lower case in web
            // If so, migrate the extension state from lower case id to its normal id.
            if (!sourceExtensionId && isWeb && extensionId !== extensionId.toLowerCase()) {
                sourceExtensionId = extensionId.toLowerCase();
            }
            if (sourceExtensionId) {
                // TODO: @sandy081 - Remove it after 6 months
                // In Web, extension state was used to be stored in lower case extension id.
                // Hence check that if the lower cased source extension was not yet migrated in web
                // If not take the lower cased source extension id for migration
                if (isWeb &&
                    sourceExtensionId !== sourceExtensionId.toLowerCase() &&
                    this._extensionStorageService.getExtensionState(sourceExtensionId.toLowerCase(), shared) &&
                    !this._extensionStorageService.getExtensionState(sourceExtensionId, shared)) {
                    sourceExtensionId = sourceExtensionId.toLowerCase();
                }
                await migrateExtensionStorage(sourceExtensionId, extensionId, shared, this._instantiationService);
            }
        }
        catch (error) {
            this._logService.error(error);
        }
    }
};
MainThreadStorage = __decorate([
    extHostNamedCustomer(MainContext.MainThreadStorage),
    __param(1, IExtensionStorageService),
    __param(2, IStorageService),
    __param(3, IInstantiationService),
    __param(4, ILogService)
], MainThreadStorage);
export { MainThreadStorage };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFN0b3JhZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZFN0b3JhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBZ0IsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRixPQUFPLEVBRU4sV0FBVyxFQUVYLGNBQWMsR0FDZCxNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFFTix3QkFBd0IsR0FDeEIsTUFBTSxrRUFBa0UsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUN2RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFHMUQsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBaUI7SUFLN0IsWUFDQyxjQUErQixFQUNMLHdCQUFtRSxFQUM1RSxlQUFpRCxFQUMzQyxxQkFBNkQsRUFDdkUsV0FBeUM7UUFIWCw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTBCO1FBQzNELG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUMxQiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQ3RELGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBUnRDLHFCQUFnQixHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDeEMsOEJBQXlCLEdBQXlCLElBQUksR0FBRyxFQUFtQixDQUFBO1FBUzVGLElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUE7UUFFcEUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FDeEIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsK0JBRXBDLFNBQVMsRUFDVCxJQUFJLENBQUMsZ0JBQWdCLENBQ3JCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNQLElBQUksSUFBSSxDQUFDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDL0MsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUE7Z0JBQ2hGLElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQ2xDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFBO2dCQUNoRCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsS0FBSyxDQUFDLDJCQUEyQixDQUNoQyxNQUFlLEVBQ2YsV0FBbUI7UUFFbkIsTUFBTSxJQUFJLENBQUMsK0JBQStCLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRS9ELElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN0RCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsb0JBQW9CLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQy9FLENBQUM7SUFFRCxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQWUsRUFBRSxHQUFXLEVBQUUsS0FBYTtRQUMxRCxJQUFJLENBQUMsd0JBQXdCLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUNwRSxDQUFDO0lBRUQsbUNBQW1DLENBQUMsU0FBa0MsRUFBRSxJQUFjO1FBQ3JGLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQzlELENBQUM7SUFFTyxLQUFLLENBQUMsK0JBQStCLENBQzVDLFdBQW1CLEVBQ25CLE1BQWU7UUFFZixJQUFJLENBQUM7WUFDSixJQUFJLGlCQUFpQixHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQywyQkFBMkIsQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUU5Riw2Q0FBNkM7WUFDN0MsNkRBQTZEO1lBQzdELDZFQUE2RTtZQUM3RSwwRUFBMEU7WUFDMUUsSUFBSSxDQUFDLGlCQUFpQixJQUFJLEtBQUssSUFBSSxXQUFXLEtBQUssV0FBVyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUM7Z0JBQzlFLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtZQUM5QyxDQUFDO1lBRUQsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO2dCQUN2Qiw2Q0FBNkM7Z0JBQzdDLDRFQUE0RTtnQkFDNUUsbUZBQW1GO2dCQUNuRixnRUFBZ0U7Z0JBQ2hFLElBQ0MsS0FBSztvQkFDTCxpQkFBaUIsS0FBSyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUU7b0JBQ3JELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxpQkFBaUIsQ0FDOUMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLEVBQy9CLE1BQU0sQ0FDTjtvQkFDRCxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxpQkFBaUIsQ0FBQyxpQkFBaUIsRUFBRSxNQUFNLENBQUMsRUFDMUUsQ0FBQztvQkFDRixpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtnQkFDcEQsQ0FBQztnQkFDRCxNQUFNLHVCQUF1QixDQUM1QixpQkFBaUIsRUFDakIsV0FBVyxFQUNYLE1BQU0sRUFDTixJQUFJLENBQUMscUJBQXFCLENBQzFCLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDOUIsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBaEdZLGlCQUFpQjtJQUQ3QixvQkFBb0IsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUM7SUFRakQsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxXQUFXLENBQUE7R0FWRCxpQkFBaUIsQ0FnRzdCIn0=