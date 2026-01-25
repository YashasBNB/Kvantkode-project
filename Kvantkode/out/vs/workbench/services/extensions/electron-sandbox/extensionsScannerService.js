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
import { URI } from '../../../../base/common/uri.js';
import { INativeEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IExtensionsProfileScannerService } from '../../../../platform/extensionManagement/common/extensionsProfileScannerService.js';
import { IExtensionsScannerService, NativeExtensionsScannerService, } from '../../../../platform/extensionManagement/common/extensionsScannerService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
let ExtensionsScannerService = class ExtensionsScannerService extends NativeExtensionsScannerService {
    constructor(userDataProfileService, userDataProfilesService, extensionsProfileScannerService, fileService, logService, environmentService, productService, uriIdentityService, instantiationService) {
        super(URI.file(environmentService.builtinExtensionsPath), URI.file(environmentService.extensionsPath), environmentService.userHome, userDataProfileService.currentProfile, userDataProfilesService, extensionsProfileScannerService, fileService, logService, environmentService, productService, uriIdentityService, instantiationService);
    }
};
ExtensionsScannerService = __decorate([
    __param(0, IUserDataProfileService),
    __param(1, IUserDataProfilesService),
    __param(2, IExtensionsProfileScannerService),
    __param(3, IFileService),
    __param(4, ILogService),
    __param(5, INativeEnvironmentService),
    __param(6, IProductService),
    __param(7, IUriIdentityService),
    __param(8, IInstantiationService)
], ExtensionsScannerService);
export { ExtensionsScannerService };
registerSingleton(IExtensionsScannerService, ExtensionsScannerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1NjYW5uZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9lbGVjdHJvbi1zYW5kYm94L2V4dGVuc2lvbnNTY2FubmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDbEcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sb0ZBQW9GLENBQUE7QUFDckksT0FBTyxFQUNOLHlCQUF5QixFQUN6Qiw4QkFBOEIsR0FDOUIsTUFBTSw2RUFBNkUsQ0FBQTtBQUNwRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDekcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFFbEYsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFDWixTQUFRLDhCQUE4QjtJQUd0QyxZQUMwQixzQkFBK0MsRUFDOUMsdUJBQWlELEVBRTNFLCtCQUFpRSxFQUNuRCxXQUF5QixFQUMxQixVQUF1QixFQUNULGtCQUE2QyxFQUN2RCxjQUErQixFQUMzQixrQkFBdUMsRUFDckMsb0JBQTJDO1FBRWxFLEtBQUssQ0FDSixHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLHFCQUFxQixDQUFDLEVBQ2xELEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxDQUFDLEVBQzNDLGtCQUFrQixDQUFDLFFBQVEsRUFDM0Isc0JBQXNCLENBQUMsY0FBYyxFQUNyQyx1QkFBdUIsRUFDdkIsK0JBQStCLEVBQy9CLFdBQVcsRUFDWCxVQUFVLEVBQ1Ysa0JBQWtCLEVBQ2xCLGNBQWMsRUFDZCxrQkFBa0IsRUFDbEIsb0JBQW9CLENBQ3BCLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQS9CWSx3QkFBd0I7SUFLbEMsV0FBQSx1QkFBdUIsQ0FBQTtJQUN2QixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsZ0NBQWdDLENBQUE7SUFFaEMsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEseUJBQXlCLENBQUE7SUFDekIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEscUJBQXFCLENBQUE7R0FkWCx3QkFBd0IsQ0ErQnBDOztBQUVELGlCQUFpQixDQUFDLHlCQUF5QixFQUFFLHdCQUF3QixvQ0FBNEIsQ0FBQSJ9