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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5zdXBwb3J0ZWRFeHRlbnNpb25zTWlncmF0aW9uQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvdW5zdXBwb3J0ZWRFeHRlbnNpb25zTWlncmF0aW9uQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsaUNBQWlDLEdBQ2pDLE1BQU0sd0VBQXdFLENBQUE7QUFDL0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDOUcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUZBQW1GLENBQUE7QUFDaEksT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXBFLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBRWhILElBQU0scUNBQXFDLEdBQTNDLE1BQU0scUNBQXFDO0lBQ2pELFlBRUMsZ0NBQW1FLEVBQ3pDLHVCQUFpRCxFQUNqRCx1QkFBaUQsRUFFM0UsMEJBQTZELEVBQ2hELFVBQXVCO1FBRXBDLHNIQUFzSDtRQUN0SCxJQUFJLGdDQUFnQyxDQUFDLCtCQUErQixFQUFFLENBQUM7WUFDdEUsNEJBQTRCLENBQzNCLGdDQUFnQyxDQUFDLCtCQUErQixDQUFDLDBCQUEwQixFQUMzRix1QkFBdUIsRUFDdkIsdUJBQXVCLEVBQ3ZCLDBCQUEwQixFQUMxQixVQUFVLENBQ1YsQ0FBQTtRQUNGLENBQUM7UUFDRCxJQUFJLGdDQUFnQyxDQUFDLDRCQUE0QixFQUFFLENBQUM7WUFDbkUsNEJBQTRCLENBQzNCLGdDQUFnQyxDQUFDLDRCQUE0QixDQUFDLDBCQUEwQixFQUN4Rix1QkFBdUIsRUFDdkIsdUJBQXVCLEVBQ3ZCLDBCQUEwQixFQUMxQixVQUFVLENBQ1YsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTlCWSxxQ0FBcUM7SUFFL0MsV0FBQSxpQ0FBaUMsQ0FBQTtJQUVqQyxXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxpQ0FBaUMsQ0FBQTtJQUVqQyxXQUFBLFdBQVcsQ0FBQTtHQVJELHFDQUFxQyxDQThCakQifQ==