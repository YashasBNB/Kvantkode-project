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
import { FileAccess, Schemas } from '../../../base/common/network.js';
import { IProductService } from '../../product/common/productService.js';
import { IStorageService } from '../../storage/common/storage.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { ILogService } from '../../log/common/log.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { AbstractExtensionResourceLoaderService, IExtensionResourceLoaderService, } from '../common/extensionResourceLoader.js';
import { IExtensionGalleryManifestService } from '../../extensionManagement/common/extensionGalleryManifest.js';
let ExtensionResourceLoaderService = class ExtensionResourceLoaderService extends AbstractExtensionResourceLoaderService {
    constructor(fileService, storageService, productService, environmentService, configurationService, extensionGalleryManifestService, logService) {
        super(fileService, storageService, productService, environmentService, configurationService, extensionGalleryManifestService, logService);
    }
    async readExtensionResource(uri) {
        uri = FileAccess.uriToBrowserUri(uri);
        if (uri.scheme !== Schemas.http &&
            uri.scheme !== Schemas.https &&
            uri.scheme !== Schemas.data) {
            const result = await this._fileService.readFile(uri);
            return result.value.toString();
        }
        const requestInit = {};
        if (await this.isExtensionGalleryResource(uri)) {
            requestInit.headers = await this.getExtensionGalleryRequestHeaders();
            requestInit.mode = 'cors'; /* set mode to cors so that above headers are always passed */
        }
        const response = await fetch(uri.toString(true), requestInit);
        if (response.status !== 200) {
            this._logService.info(`Request to '${uri.toString(true)}' failed with status code ${response.status}`);
            throw new Error(response.statusText);
        }
        return response.text();
    }
};
ExtensionResourceLoaderService = __decorate([
    __param(0, IFileService),
    __param(1, IStorageService),
    __param(2, IProductService),
    __param(3, IEnvironmentService),
    __param(4, IConfigurationService),
    __param(5, IExtensionGalleryManifestService),
    __param(6, ILogService)
], ExtensionResourceLoaderService);
registerSingleton(IExtensionResourceLoaderService, ExtensionResourceLoaderService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVzb3VyY2VMb2FkZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uUmVzb3VyY2VMb2FkZXIvYnJvd3Nlci9leHRlbnNpb25SZXNvdXJjZUxvYWRlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8sRUFDTixzQ0FBc0MsRUFDdEMsK0JBQStCLEdBQy9CLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sOERBQThELENBQUE7QUFFL0csSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBK0IsU0FBUSxzQ0FBc0M7SUFHbEYsWUFDZSxXQUF5QixFQUN0QixjQUErQixFQUMvQixjQUErQixFQUMzQixrQkFBdUMsRUFDckMsb0JBQTJDLEVBRWxFLCtCQUFpRSxFQUNwRCxVQUF1QjtRQUVwQyxLQUFLLENBQ0osV0FBVyxFQUNYLGNBQWMsRUFDZCxjQUFjLEVBQ2Qsa0JBQWtCLEVBQ2xCLG9CQUFvQixFQUNwQiwrQkFBK0IsRUFDL0IsVUFBVSxDQUNWLENBQUE7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLHFCQUFxQixDQUFDLEdBQVE7UUFDbkMsR0FBRyxHQUFHLFVBQVUsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFckMsSUFDQyxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJO1lBQzNCLEdBQUcsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLEtBQUs7WUFDNUIsR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxFQUMxQixDQUFDO1lBQ0YsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNwRCxPQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDL0IsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFnQixFQUFFLENBQUE7UUFDbkMsSUFBSSxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2hELFdBQVcsQ0FBQyxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsaUNBQWlDLEVBQUUsQ0FBQTtZQUNwRSxXQUFXLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQSxDQUFDLDhEQUE4RDtRQUN6RixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUM3RCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQ3BCLGVBQWUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FDL0UsQ0FBQTtZQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3JDLENBQUM7UUFDRCxPQUFPLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUN2QixDQUFDO0NBQ0QsQ0FBQTtBQW5ESyw4QkFBOEI7SUFJakMsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZ0NBQWdDLENBQUE7SUFFaEMsV0FBQSxXQUFXLENBQUE7R0FYUiw4QkFBOEIsQ0FtRG5DO0FBRUQsaUJBQWlCLENBQ2hCLCtCQUErQixFQUMvQiw4QkFBOEIsb0NBRTlCLENBQUEifQ==