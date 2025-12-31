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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1NjYW5uZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25zU2Nhbm5lclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sb0ZBQW9GLENBQUE7QUFDckksT0FBTyxFQUNOLGdDQUFnQyxFQUNoQyx5QkFBeUIsR0FFekIsTUFBTSw2RUFBNkUsQ0FBQTtBQUNwRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDekcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDN0YsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFFbEYsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFDWixTQUFRLGdDQUFnQztJQUd4QyxZQUMwQixzQkFBK0MsRUFDOUMsdUJBQWlELEVBRTNFLCtCQUFpRSxFQUNuRCxXQUF5QixFQUMxQixVQUF1QixFQUNOLGtCQUFnRCxFQUM3RCxjQUErQixFQUMzQixrQkFBdUMsRUFDckMsb0JBQTJDO1FBRWxFLEtBQUssQ0FDSixrQkFBa0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUNqQyxrQkFBa0IsQ0FBQyxtQkFBbUIsRUFDdEMsa0JBQWtCLENBQ2xCLEVBQ0Qsa0JBQWtCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxtQkFBbUIsRUFBRSxnQkFBZ0IsQ0FBQyxFQUM1RixrQkFBa0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUNqQyxrQkFBa0IsQ0FBQyxtQkFBbUIsRUFDdEMsZ0JBQWdCLEVBQ2hCLGNBQWMsQ0FDZCxFQUNELHNCQUFzQixDQUFDLGNBQWMsRUFDckMsdUJBQXVCLEVBQ3ZCLCtCQUErQixFQUMvQixXQUFXLEVBQ1gsVUFBVSxFQUNWLGtCQUFrQixFQUNsQixjQUFjLEVBQ2Qsa0JBQWtCLEVBQ2xCLG9CQUFvQixDQUNwQixDQUFBO0lBQ0YsQ0FBQztJQUVTLEtBQUssQ0FBQyxlQUFlO1FBQzlCLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztDQUNELENBQUE7QUExQ1ksd0JBQXdCO0lBS2xDLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLGdDQUFnQyxDQUFBO0lBRWhDLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLDRCQUE0QixDQUFBO0lBQzVCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHFCQUFxQixDQUFBO0dBZFgsd0JBQXdCLENBMENwQzs7QUFFRCxpQkFBaUIsQ0FBQyx5QkFBeUIsRUFBRSx3QkFBd0Isb0NBQTRCLENBQUEifQ==