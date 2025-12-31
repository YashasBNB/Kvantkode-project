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
import { registerSingleton } from '../../instantiation/common/extensions.js';
import { IFileService } from '../../files/common/files.js';
import { IProductService } from '../../product/common/productService.js';
import { asTextOrError, IRequestService } from '../../request/common/request.js';
import { IStorageService } from '../../storage/common/storage.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { AbstractExtensionResourceLoaderService, IExtensionResourceLoaderService, } from './extensionResourceLoader.js';
import { IExtensionGalleryManifestService } from '../../extensionManagement/common/extensionGalleryManifest.js';
import { ILogService } from '../../log/common/log.js';
let ExtensionResourceLoaderService = class ExtensionResourceLoaderService extends AbstractExtensionResourceLoaderService {
    constructor(fileService, storageService, productService, environmentService, configurationService, extensionGalleryManifestService, _requestService, logService) {
        super(fileService, storageService, productService, environmentService, configurationService, extensionGalleryManifestService, logService);
        this._requestService = _requestService;
    }
    async readExtensionResource(uri) {
        if (await this.isExtensionGalleryResource(uri)) {
            const headers = await this.getExtensionGalleryRequestHeaders();
            const requestContext = await this._requestService.request({ url: uri.toString(), headers }, CancellationToken.None);
            return (await asTextOrError(requestContext)) || '';
        }
        const result = await this._fileService.readFile(uri);
        return result.value.toString();
    }
};
ExtensionResourceLoaderService = __decorate([
    __param(0, IFileService),
    __param(1, IStorageService),
    __param(2, IProductService),
    __param(3, IEnvironmentService),
    __param(4, IConfigurationService),
    __param(5, IExtensionGalleryManifestService),
    __param(6, IRequestService),
    __param(7, ILogService)
], ExtensionResourceLoaderService);
export { ExtensionResourceLoaderService };
registerSingleton(IExtensionResourceLoaderService, ExtensionResourceLoaderService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVzb3VyY2VMb2FkZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uUmVzb3VyY2VMb2FkZXIvY29tbW9uL2V4dGVuc2lvblJlc291cmNlTG9hZGVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDL0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQ04sc0NBQXNDLEVBQ3RDLCtCQUErQixHQUMvQixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQy9HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUU5QyxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUErQixTQUFRLHNDQUFzQztJQUN6RixZQUNlLFdBQXlCLEVBQ3RCLGNBQStCLEVBQy9CLGNBQStCLEVBQzNCLGtCQUF1QyxFQUNyQyxvQkFBMkMsRUFFbEUsK0JBQWlFLEVBQy9CLGVBQWdDLEVBQ3JELFVBQXVCO1FBRXBDLEtBQUssQ0FDSixXQUFXLEVBQ1gsY0FBYyxFQUNkLGNBQWMsRUFDZCxrQkFBa0IsRUFDbEIsb0JBQW9CLEVBQ3BCLCtCQUErQixFQUMvQixVQUFVLENBQ1YsQ0FBQTtRQVhpQyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7SUFZbkUsQ0FBQztJQUVELEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxHQUFRO1FBQ25DLElBQUksTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNoRCxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxDQUFBO1lBQzlELE1BQU0sY0FBYyxHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQ3hELEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFDaEMsaUJBQWlCLENBQUMsSUFBSSxDQUN0QixDQUFBO1lBQ0QsT0FBTyxDQUFDLE1BQU0sYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ25ELENBQUM7UUFDRCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3BELE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUMvQixDQUFDO0NBQ0QsQ0FBQTtBQW5DWSw4QkFBOEI7SUFFeEMsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZ0NBQWdDLENBQUE7SUFFaEMsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLFdBQVcsQ0FBQTtHQVZELDhCQUE4QixDQW1DMUM7O0FBRUQsaUJBQWlCLENBQ2hCLCtCQUErQixFQUMvQiw4QkFBOEIsb0NBRTlCLENBQUEifQ==