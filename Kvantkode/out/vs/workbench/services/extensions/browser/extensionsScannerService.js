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
import { IExtensionsProfileScannerService } from '../../../../platform/extensionManagement/common/extensionsProfileScannerService.js';
import { AbstractExtensionsScannerService, IExtensionsScannerService, } from '../../../../platform/extensionManagement/common/extensionsScannerService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
let ExtensionsScannerService = class ExtensionsScannerService extends AbstractExtensionsScannerService {
    constructor(userDataProfileService, userDataProfilesService, extensionsProfileScannerService, fileService, logService, environmentService, productService, uriIdentityService, instantiationService) {
        super(uriIdentityService.extUri.joinPath(environmentService.userRoamingDataHome, 'systemExtensions'), uriIdentityService.extUri.joinPath(environmentService.userRoamingDataHome, 'userExtensions'), uriIdentityService.extUri.joinPath(environmentService.userRoamingDataHome, 'userExtensions', 'control.json'), userDataProfileService.currentProfile, userDataProfilesService, extensionsProfileScannerService, fileService, logService, environmentService, productService, uriIdentityService, instantiationService);
    }
    async getTranslations() {
        return {};
    }
};
ExtensionsScannerService = __decorate([
    __param(0, IUserDataProfileService),
    __param(1, IUserDataProfilesService),
    __param(2, IExtensionsProfileScannerService),
    __param(3, IFileService),
    __param(4, ILogService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, IProductService),
    __param(7, IUriIdentityService),
    __param(8, IInstantiationService)
], ExtensionsScannerService);
export { ExtensionsScannerService };
registerSingleton(IExtensionsScannerService, ExtensionsScannerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1NjYW5uZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9icm93c2VyL2V4dGVuc2lvbnNTY2FubmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxvRkFBb0YsQ0FBQTtBQUNySSxPQUFPLEVBQ04sZ0NBQWdDLEVBQ2hDLHlCQUF5QixHQUV6QixNQUFNLDZFQUE2RSxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUVsRixJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUNaLFNBQVEsZ0NBQWdDO0lBR3hDLFlBQzBCLHNCQUErQyxFQUM5Qyx1QkFBaUQsRUFFM0UsK0JBQWlFLEVBQ25ELFdBQXlCLEVBQzFCLFVBQXVCLEVBQ04sa0JBQWdELEVBQzdELGNBQStCLEVBQzNCLGtCQUF1QyxFQUNyQyxvQkFBMkM7UUFFbEUsS0FBSyxDQUNKLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQ2pDLGtCQUFrQixDQUFDLG1CQUFtQixFQUN0QyxrQkFBa0IsQ0FDbEIsRUFDRCxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLG1CQUFtQixFQUFFLGdCQUFnQixDQUFDLEVBQzVGLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQ2pDLGtCQUFrQixDQUFDLG1CQUFtQixFQUN0QyxnQkFBZ0IsRUFDaEIsY0FBYyxDQUNkLEVBQ0Qsc0JBQXNCLENBQUMsY0FBYyxFQUNyQyx1QkFBdUIsRUFDdkIsK0JBQStCLEVBQy9CLFdBQVcsRUFDWCxVQUFVLEVBQ1Ysa0JBQWtCLEVBQ2xCLGNBQWMsRUFDZCxrQkFBa0IsRUFDbEIsb0JBQW9CLENBQ3BCLENBQUE7SUFDRixDQUFDO0lBRVMsS0FBSyxDQUFDLGVBQWU7UUFDOUIsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0NBQ0QsQ0FBQTtBQTFDWSx3QkFBd0I7SUFLbEMsV0FBQSx1QkFBdUIsQ0FBQTtJQUN2QixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsZ0NBQWdDLENBQUE7SUFFaEMsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsNEJBQTRCLENBQUE7SUFDNUIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEscUJBQXFCLENBQUE7R0FkWCx3QkFBd0IsQ0EwQ3BDOztBQUVELGlCQUFpQixDQUFDLHlCQUF5QixFQUFFLHdCQUF3QixvQ0FBNEIsQ0FBQSJ9