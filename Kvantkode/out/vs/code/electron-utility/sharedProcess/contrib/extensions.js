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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvY29kZS9lbGVjdHJvbi11dGlsaXR5L3NoYXJlZFByb2Nlc3MvY29udHJpYi9leHRlbnNpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLGlDQUFpQyxHQUNqQyxNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsd0JBQXdCLEdBQ3hCLE1BQU0scUVBQXFFLENBQUE7QUFDNUUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUZBQW1GLENBQUE7QUFDaEksT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkVBQTZFLENBQUE7QUFDckksT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUV6RSxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7SUFDdEQsWUFFQywwQkFBbUUsRUFDekMsdUJBQWlELEVBQ2pELHVCQUFpRCxFQUUzRSwwQkFBNkQsRUFDNUMsY0FBK0IsRUFDbkMsVUFBdUI7UUFFcEMsS0FBSyxFQUFFLENBQUE7UUFFUCwwQkFBMEIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNwQyw0QkFBNEIsQ0FDM0IsMEJBQTBCLEVBQzFCLHVCQUF1QixFQUN2Qix1QkFBdUIsRUFDdkIsMEJBQTBCLEVBQzFCLFVBQVUsQ0FDVixDQUFBO1FBQ0QsdUJBQXVCLENBQUMsK0JBQStCLENBQ3RELDBCQUEwQixFQUMxQixjQUFjLENBQ2QsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBMUJZLHVCQUF1QjtJQUVqQyxXQUFBLHVDQUF1QyxDQUFBO0lBRXZDLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLGlDQUFpQyxDQUFBO0lBRWpDLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxXQUFXLENBQUE7R0FURCx1QkFBdUIsQ0EwQm5DIn0=