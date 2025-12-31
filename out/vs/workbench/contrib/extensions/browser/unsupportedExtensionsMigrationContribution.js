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
import { IExtensionGalleryService, IGlobalExtensionEnablementService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IExtensionStorageService } from '../../../../platform/extensionManagement/common/extensionStorage.js';
import { migrateUnsupportedExtensions } from '../../../../platform/extensionManagement/common/unsupportedExtensionsMigration.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IExtensionManagementServerService } from '../../../services/extensionManagement/common/extensionManagement.js';
let UnsupportedExtensionsMigrationContrib = class UnsupportedExtensionsMigrationContrib {
    constructor(extensionManagementServerService, extensionGalleryService, extensionStorageService, extensionEnablementService, logService) {
        // Unsupported extensions are not migrated for local extension management server, because it is done in shared process
        if (extensionManagementServerService.remoteExtensionManagementServer) {
            migrateUnsupportedExtensions(extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService, extensionGalleryService, extensionStorageService, extensionEnablementService, logService);
        }
        if (extensionManagementServerService.webExtensionManagementServer) {
            migrateUnsupportedExtensions(extensionManagementServerService.webExtensionManagementServer.extensionManagementService, extensionGalleryService, extensionStorageService, extensionEnablementService, logService);
        }
    }
};
UnsupportedExtensionsMigrationContrib = __decorate([
    __param(0, IExtensionManagementServerService),
    __param(1, IExtensionGalleryService),
    __param(2, IExtensionStorageService),
    __param(3, IGlobalExtensionEnablementService),
    __param(4, ILogService)
], UnsupportedExtensionsMigrationContrib);
export { UnsupportedExtensionsMigrationContrib };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5zdXBwb3J0ZWRFeHRlbnNpb25zTWlncmF0aW9uQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL3Vuc3VwcG9ydGVkRXh0ZW5zaW9uc01pZ3JhdGlvbkNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLGlDQUFpQyxHQUNqQyxNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQzlHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1GQUFtRixDQUFBO0FBQ2hJLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVwRSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUVoSCxJQUFNLHFDQUFxQyxHQUEzQyxNQUFNLHFDQUFxQztJQUNqRCxZQUVDLGdDQUFtRSxFQUN6Qyx1QkFBaUQsRUFDakQsdUJBQWlELEVBRTNFLDBCQUE2RCxFQUNoRCxVQUF1QjtRQUVwQyxzSEFBc0g7UUFDdEgsSUFBSSxnQ0FBZ0MsQ0FBQywrQkFBK0IsRUFBRSxDQUFDO1lBQ3RFLDRCQUE0QixDQUMzQixnQ0FBZ0MsQ0FBQywrQkFBK0IsQ0FBQywwQkFBMEIsRUFDM0YsdUJBQXVCLEVBQ3ZCLHVCQUF1QixFQUN2QiwwQkFBMEIsRUFDMUIsVUFBVSxDQUNWLENBQUE7UUFDRixDQUFDO1FBQ0QsSUFBSSxnQ0FBZ0MsQ0FBQyw0QkFBNEIsRUFBRSxDQUFDO1lBQ25FLDRCQUE0QixDQUMzQixnQ0FBZ0MsQ0FBQyw0QkFBNEIsQ0FBQywwQkFBMEIsRUFDeEYsdUJBQXVCLEVBQ3ZCLHVCQUF1QixFQUN2QiwwQkFBMEIsRUFDMUIsVUFBVSxDQUNWLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUE5QlkscUNBQXFDO0lBRS9DLFdBQUEsaUNBQWlDLENBQUE7SUFFakMsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsaUNBQWlDLENBQUE7SUFFakMsV0FBQSxXQUFXLENBQUE7R0FSRCxxQ0FBcUMsQ0E4QmpEIn0=