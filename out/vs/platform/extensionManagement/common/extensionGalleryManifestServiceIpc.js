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
import { Barrier } from '../../../base/common/async.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { IProductService } from '../../product/common/productService.js';
import { ExtensionGalleryManifestService } from './extensionGalleryManifestService.js';
let ExtensionGalleryManifestIPCService = class ExtensionGalleryManifestIPCService extends ExtensionGalleryManifestService {
    constructor(server, productService) {
        super(productService);
        this._onDidChangeExtensionGalleryManifest = this._register(new Emitter());
        this.onDidChangeExtensionGalleryManifest = this._onDidChangeExtensionGalleryManifest.event;
        this.barrier = new Barrier();
        server.registerChannel('extensionGalleryManifest', {
            listen: () => Event.None,
            call: async (context, command, args) => {
                switch (command) {
                    case 'setExtensionGalleryManifest':
                        return Promise.resolve(this.setExtensionGalleryManifest(args[0]));
                }
                throw new Error('Invalid call');
            },
        });
    }
    async getExtensionGalleryManifest() {
        await this.barrier.wait();
        return this.extensionGalleryManifest ?? null;
    }
    setExtensionGalleryManifest(manifest) {
        this.extensionGalleryManifest = manifest;
        this._onDidChangeExtensionGalleryManifest.fire(manifest);
        this.barrier.open();
    }
};
ExtensionGalleryManifestIPCService = __decorate([
    __param(1, IProductService)
], ExtensionGalleryManifestIPCService);
export { ExtensionGalleryManifestIPCService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uR2FsbGVyeU1hbmlmZXN0U2VydmljZUlwYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2V4dGVuc2lvbkdhbGxlcnlNYW5pZmVzdFNlcnZpY2VJcGMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBS3hFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRS9FLElBQU0sa0NBQWtDLEdBQXhDLE1BQU0sa0NBQ1osU0FBUSwrQkFBK0I7SUFjdkMsWUFBWSxNQUFzQixFQUFtQixjQUErQjtRQUNuRixLQUFLLENBQUMsY0FBYyxDQUFDLENBQUE7UUFWZCx5Q0FBb0MsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM1RCxJQUFJLE9BQU8sRUFBb0MsQ0FDL0MsQ0FBQTtRQUNpQix3Q0FBbUMsR0FDcEQsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLEtBQUssQ0FBQTtRQUcvQixZQUFPLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQTtRQUl2QyxNQUFNLENBQUMsZUFBZSxDQUFDLDBCQUEwQixFQUFFO1lBQ2xELE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSTtZQUN4QixJQUFJLEVBQUUsS0FBSyxFQUFFLE9BQVksRUFBRSxPQUFlLEVBQUUsSUFBVSxFQUFnQixFQUFFO2dCQUN2RSxRQUFRLE9BQU8sRUFBRSxDQUFDO29CQUNqQixLQUFLLDZCQUE2Qjt3QkFDakMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNuRSxDQUFDO2dCQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDaEMsQ0FBQztTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFUSxLQUFLLENBQUMsMkJBQTJCO1FBQ3pDLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUN6QixPQUFPLElBQUksQ0FBQyx3QkFBd0IsSUFBSSxJQUFJLENBQUE7SUFDN0MsQ0FBQztJQUVPLDJCQUEyQixDQUFDLFFBQTBDO1FBQzdFLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxRQUFRLENBQUE7UUFDeEMsSUFBSSxDQUFDLG9DQUFvQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN4RCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ3BCLENBQUM7Q0FDRCxDQUFBO0FBdkNZLGtDQUFrQztJQWVULFdBQUEsZUFBZSxDQUFBO0dBZnhDLGtDQUFrQyxDQXVDOUMifQ==