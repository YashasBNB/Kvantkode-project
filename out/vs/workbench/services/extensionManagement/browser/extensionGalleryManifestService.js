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
import { IExtensionGalleryManifestService } from '../../../../platform/extensionManagement/common/extensionGalleryManifest.js';
import { ExtensionGalleryManifestService as ExtensionGalleryManifestService } from '../../../../platform/extensionManagement/common/extensionGalleryManifestService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
let WebExtensionGalleryManifestService = class WebExtensionGalleryManifestService extends ExtensionGalleryManifestService {
    constructor(productService, remoteAgentService) {
        super(productService);
        const remoteConnection = remoteAgentService.getConnection();
        if (remoteConnection) {
            const channel = remoteConnection.getChannel('extensionGalleryManifest');
            this.getExtensionGalleryManifest().then((manifest) => {
                channel.call('setExtensionGalleryManifest', [manifest]);
                this._register(this.onDidChangeExtensionGalleryManifest((manifest) => channel.call('setExtensionGalleryManifest', [manifest])));
            });
        }
    }
};
WebExtensionGalleryManifestService = __decorate([
    __param(0, IProductService),
    __param(1, IRemoteAgentService)
], WebExtensionGalleryManifestService);
registerSingleton(IExtensionGalleryManifestService, WebExtensionGalleryManifestService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uR2FsbGVyeU1hbmlmZXN0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbk1hbmFnZW1lbnQvYnJvd3Nlci9leHRlbnNpb25HYWxsZXJ5TWFuaWZlc3RTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDZFQUE2RSxDQUFBO0FBQzlILE9BQU8sRUFBRSwrQkFBK0IsSUFBSSwrQkFBK0IsRUFBRSxNQUFNLG9GQUFvRixDQUFBO0FBQ3ZLLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFFL0UsSUFBTSxrQ0FBa0MsR0FBeEMsTUFBTSxrQ0FDTCxTQUFRLCtCQUErQjtJQUd2QyxZQUNrQixjQUErQixFQUMzQixrQkFBdUM7UUFFNUQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ3JCLE1BQU0sZ0JBQWdCLEdBQUcsa0JBQWtCLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDM0QsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RCLE1BQU0sT0FBTyxHQUFHLGdCQUFnQixDQUFDLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQyxDQUFBO1lBQ3ZFLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO2dCQUNwRCxPQUFPLENBQUMsSUFBSSxDQUFDLDZCQUE2QixFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtnQkFDdkQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsbUNBQW1DLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUNyRCxPQUFPLENBQUMsSUFBSSxDQUFDLDZCQUE2QixFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FDdkQsQ0FDRCxDQUFBO1lBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUF0Qkssa0NBQWtDO0lBS3JDLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxtQkFBbUIsQ0FBQTtHQU5oQixrQ0FBa0MsQ0FzQnZDO0FBRUQsaUJBQWlCLENBQ2hCLGdDQUFnQyxFQUNoQyxrQ0FBa0Msb0NBRWxDLENBQUEifQ==