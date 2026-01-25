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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVzb3VyY2VMb2FkZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25SZXNvdXJjZUxvYWRlci9icm93c2VyL2V4dGVuc2lvblJlc291cmNlTG9hZGVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDL0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDckQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUNOLHNDQUFzQyxFQUN0QywrQkFBK0IsR0FDL0IsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUUvRyxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUErQixTQUFRLHNDQUFzQztJQUdsRixZQUNlLFdBQXlCLEVBQ3RCLGNBQStCLEVBQy9CLGNBQStCLEVBQzNCLGtCQUF1QyxFQUNyQyxvQkFBMkMsRUFFbEUsK0JBQWlFLEVBQ3BELFVBQXVCO1FBRXBDLEtBQUssQ0FDSixXQUFXLEVBQ1gsY0FBYyxFQUNkLGNBQWMsRUFDZCxrQkFBa0IsRUFDbEIsb0JBQW9CLEVBQ3BCLCtCQUErQixFQUMvQixVQUFVLENBQ1YsQ0FBQTtJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMscUJBQXFCLENBQUMsR0FBUTtRQUNuQyxHQUFHLEdBQUcsVUFBVSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUVyQyxJQUNDLEdBQUcsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLElBQUk7WUFDM0IsR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsS0FBSztZQUM1QixHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQzFCLENBQUM7WUFDRixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3BELE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUMvQixDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQWdCLEVBQUUsQ0FBQTtRQUNuQyxJQUFJLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDaEQsV0FBVyxDQUFDLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxDQUFBO1lBQ3BFLFdBQVcsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFBLENBQUMsOERBQThEO1FBQ3pGLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxNQUFNLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQzdELElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FDcEIsZUFBZSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyw2QkFBNkIsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUMvRSxDQUFBO1lBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDckMsQ0FBQztRQUNELE9BQU8sUUFBUSxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ3ZCLENBQUM7Q0FDRCxDQUFBO0FBbkRLLDhCQUE4QjtJQUlqQyxXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxnQ0FBZ0MsQ0FBQTtJQUVoQyxXQUFBLFdBQVcsQ0FBQTtHQVhSLDhCQUE4QixDQW1EbkM7QUFFRCxpQkFBaUIsQ0FDaEIsK0JBQStCLEVBQy9CLDhCQUE4QixvQ0FFOUIsQ0FBQSJ9