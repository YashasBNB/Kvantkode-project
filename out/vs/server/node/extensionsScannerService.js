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
import { joinPath } from '../../base/common/resources.js';
import { URI } from '../../base/common/uri.js';
import { INativeEnvironmentService } from '../../platform/environment/common/environment.js';
import { IExtensionsProfileScannerService } from '../../platform/extensionManagement/common/extensionsProfileScannerService.js';
import { AbstractExtensionsScannerService, } from '../../platform/extensionManagement/common/extensionsScannerService.js';
import { IFileService } from '../../platform/files/common/files.js';
import { IInstantiationService } from '../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../platform/log/common/log.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { IUriIdentityService } from '../../platform/uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../platform/userDataProfile/common/userDataProfile.js';
import { getNLSConfiguration } from './remoteLanguagePacks.js';
let ExtensionsScannerService = class ExtensionsScannerService extends AbstractExtensionsScannerService {
    constructor(userDataProfilesService, extensionsProfileScannerService, fileService, logService, nativeEnvironmentService, productService, uriIdentityService, instantiationService) {
        super(URI.file(nativeEnvironmentService.builtinExtensionsPath), URI.file(nativeEnvironmentService.extensionsPath), joinPath(nativeEnvironmentService.userHome, '.vscode-oss-dev', 'extensions', 'control.json'), userDataProfilesService.defaultProfile, userDataProfilesService, extensionsProfileScannerService, fileService, logService, nativeEnvironmentService, productService, uriIdentityService, instantiationService);
        this.nativeEnvironmentService = nativeEnvironmentService;
    }
    async getTranslations(language) {
        const config = await getNLSConfiguration(language, this.nativeEnvironmentService.userDataPath);
        if (config.languagePack) {
            try {
                const content = await this.fileService.readFile(URI.file(config.languagePack.translationsConfigFile));
                return JSON.parse(content.value.toString());
            }
            catch (err) {
                /* Ignore error */
            }
        }
        return Object.create(null);
    }
};
ExtensionsScannerService = __decorate([
    __param(0, IUserDataProfilesService),
    __param(1, IExtensionsProfileScannerService),
    __param(2, IFileService),
    __param(3, ILogService),
    __param(4, INativeEnvironmentService),
    __param(5, IProductService),
    __param(6, IUriIdentityService),
    __param(7, IInstantiationService)
], ExtensionsScannerService);
export { ExtensionsScannerService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1NjYW5uZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvc2VydmVyL25vZGUvZXh0ZW5zaW9uc1NjYW5uZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDNUYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sOEVBQThFLENBQUE7QUFDL0gsT0FBTyxFQUNOLGdDQUFnQyxHQUdoQyxNQUFNLHVFQUF1RSxDQUFBO0FBQzlFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRXZELElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQ1osU0FBUSxnQ0FBZ0M7SUFHeEMsWUFDMkIsdUJBQWlELEVBRTNFLCtCQUFpRSxFQUNuRCxXQUF5QixFQUMxQixVQUF1QixFQUNRLHdCQUFtRCxFQUM5RSxjQUErQixFQUMzQixrQkFBdUMsRUFDckMsb0JBQTJDO1FBRWxFLEtBQUssQ0FDSixHQUFHLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLHFCQUFxQixDQUFDLEVBQ3hELEdBQUcsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsY0FBYyxDQUFDLEVBQ2pELFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLGNBQWMsQ0FBQyxFQUM1Rix1QkFBdUIsQ0FBQyxjQUFjLEVBQ3RDLHVCQUF1QixFQUN2QiwrQkFBK0IsRUFDL0IsV0FBVyxFQUNYLFVBQVUsRUFDVix3QkFBd0IsRUFDeEIsY0FBYyxFQUNkLGtCQUFrQixFQUNsQixvQkFBb0IsQ0FDcEIsQ0FBQTtRQWxCMkMsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUEyQjtJQW1CaEcsQ0FBQztJQUVTLEtBQUssQ0FBQyxlQUFlLENBQUMsUUFBZ0I7UUFDL0MsTUFBTSxNQUFNLEdBQUcsTUFBTSxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzlGLElBQUksTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQztnQkFDSixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUM5QyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsc0JBQXNCLENBQUMsQ0FDcEQsQ0FBQTtnQkFDRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1lBQzVDLENBQUM7WUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO2dCQUNkLGtCQUFrQjtZQUNuQixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMzQixDQUFDO0NBQ0QsQ0FBQTtBQTdDWSx3QkFBd0I7SUFLbEMsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLGdDQUFnQyxDQUFBO0lBRWhDLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLHlCQUF5QixDQUFBO0lBQ3pCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHFCQUFxQixDQUFBO0dBYlgsd0JBQXdCLENBNkNwQyJ9