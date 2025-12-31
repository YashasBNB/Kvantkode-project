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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uR2FsbGVyeU1hbmlmZXN0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25NYW5hZ2VtZW50L2Jyb3dzZXIvZXh0ZW5zaW9uR2FsbGVyeU1hbmlmZXN0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQTtBQUM5SCxPQUFPLEVBQUUsK0JBQStCLElBQUksK0JBQStCLEVBQUUsTUFBTSxvRkFBb0YsQ0FBQTtBQUN2SyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRS9FLElBQU0sa0NBQWtDLEdBQXhDLE1BQU0sa0NBQ0wsU0FBUSwrQkFBK0I7SUFHdkMsWUFDa0IsY0FBK0IsRUFDM0Isa0JBQXVDO1FBRTVELEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNyQixNQUFNLGdCQUFnQixHQUFHLGtCQUFrQixDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQzNELElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixNQUFNLE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtZQUN2RSxJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtnQkFDcEQsT0FBTyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7Z0JBQ3ZELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDckQsT0FBTyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQ3ZELENBQ0QsQ0FBQTtZQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBdEJLLGtDQUFrQztJQUtyQyxXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsbUJBQW1CLENBQUE7R0FOaEIsa0NBQWtDLENBc0J2QztBQUVELGlCQUFpQixDQUNoQixnQ0FBZ0MsRUFDaEMsa0NBQWtDLG9DQUVsQyxDQUFBIn0=