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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IExtensionGalleryService, IGlobalExtensionEnablementService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionStorageService, IExtensionStorageService, } from '../../../../platform/extensionManagement/common/extensionStorage.js';
import { migrateUnsupportedExtensions } from '../../../../platform/extensionManagement/common/unsupportedExtensionsMigration.js';
import { INativeServerExtensionManagementService } from '../../../../platform/extensionManagement/node/extensionManagementService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
let ExtensionsContributions = class ExtensionsContributions extends Disposable {
    constructor(extensionManagementService, extensionGalleryService, extensionStorageService, extensionEnablementService, storageService, logService) {
        super();
        extensionManagementService.cleanUp();
        migrateUnsupportedExtensions(extensionManagementService, extensionGalleryService, extensionStorageService, extensionEnablementService, logService);
        ExtensionStorageService.removeOutdatedExtensionVersions(extensionManagementService, storageService);
    }
};
ExtensionsContributions = __decorate([
    __param(0, INativeServerExtensionManagementService),
    __param(1, IExtensionGalleryService),
    __param(2, IExtensionStorageService),
    __param(3, IGlobalExtensionEnablementService),
    __param(4, IStorageService),
    __param(5, ILogService)
], ExtensionsContributions);
export { ExtensionsContributions };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2NvZGUvZWxlY3Ryb24tdXRpbGl0eS9zaGFyZWRQcm9jZXNzL2NvbnRyaWIvZXh0ZW5zaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUNOLHdCQUF3QixFQUN4QixpQ0FBaUMsR0FDakMsTUFBTSx3RUFBd0UsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLHdCQUF3QixHQUN4QixNQUFNLHFFQUFxRSxDQUFBO0FBQzVFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1GQUFtRixDQUFBO0FBQ2hJLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZFQUE2RSxDQUFBO0FBQ3JJLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFekUsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBQ3RELFlBRUMsMEJBQW1FLEVBQ3pDLHVCQUFpRCxFQUNqRCx1QkFBaUQsRUFFM0UsMEJBQTZELEVBQzVDLGNBQStCLEVBQ25DLFVBQXVCO1FBRXBDLEtBQUssRUFBRSxDQUFBO1FBRVAsMEJBQTBCLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDcEMsNEJBQTRCLENBQzNCLDBCQUEwQixFQUMxQix1QkFBdUIsRUFDdkIsdUJBQXVCLEVBQ3ZCLDBCQUEwQixFQUMxQixVQUFVLENBQ1YsQ0FBQTtRQUNELHVCQUF1QixDQUFDLCtCQUErQixDQUN0RCwwQkFBMEIsRUFDMUIsY0FBYyxDQUNkLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTFCWSx1QkFBdUI7SUFFakMsV0FBQSx1Q0FBdUMsQ0FBQTtJQUV2QyxXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxpQ0FBaUMsQ0FBQTtJQUVqQyxXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsV0FBVyxDQUFBO0dBVEQsdUJBQXVCLENBMEJuQyJ9