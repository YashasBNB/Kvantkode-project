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
import { ILogService } from '../../../../platform/log/common/log.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { AbstractExtensionsProfileScannerService, IExtensionsProfileScannerService, } from '../../../../platform/extensionManagement/common/extensionsProfileScannerService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
let ExtensionsProfileScannerService = class ExtensionsProfileScannerService extends AbstractExtensionsProfileScannerService {
    constructor(environmentService, fileService, userDataProfilesService, uriIdentityService, logService) {
        super(environmentService.userRoamingDataHome, fileService, userDataProfilesService, uriIdentityService, logService);
    }
};
ExtensionsProfileScannerService = __decorate([
    __param(0, IWorkbenchEnvironmentService),
    __param(1, IFileService),
    __param(2, IUserDataProfilesService),
    __param(3, IUriIdentityService),
    __param(4, ILogService)
], ExtensionsProfileScannerService);
export { ExtensionsProfileScannerService };
registerSingleton(IExtensionsProfileScannerService, ExtensionsProfileScannerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1Byb2ZpbGVTY2FubmVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25NYW5hZ2VtZW50L2Jyb3dzZXIvZXh0ZW5zaW9uc1Byb2ZpbGVTY2FubmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDekcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUNOLHVDQUF1QyxFQUN2QyxnQ0FBZ0MsR0FDaEMsTUFBTSxvRkFBb0YsQ0FBQTtBQUMzRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRXRGLElBQU0sK0JBQStCLEdBQXJDLE1BQU0sK0JBQWdDLFNBQVEsdUNBQXVDO0lBQzNGLFlBQytCLGtCQUFnRCxFQUNoRSxXQUF5QixFQUNiLHVCQUFpRCxFQUN0RCxrQkFBdUMsRUFDL0MsVUFBdUI7UUFFcEMsS0FBSyxDQUNKLGtCQUFrQixDQUFDLG1CQUFtQixFQUN0QyxXQUFXLEVBQ1gsdUJBQXVCLEVBQ3ZCLGtCQUFrQixFQUNsQixVQUFVLENBQ1YsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBaEJZLCtCQUErQjtJQUV6QyxXQUFBLDRCQUE0QixDQUFBO0lBQzVCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsV0FBVyxDQUFBO0dBTkQsK0JBQStCLENBZ0IzQzs7QUFFRCxpQkFBaUIsQ0FDaEIsZ0NBQWdDLEVBQ2hDLCtCQUErQixvQ0FFL0IsQ0FBQSJ9