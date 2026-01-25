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
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ISharedProcessService } from '../../../../platform/ipc/electron-sandbox/services.js';
import { IExtensionTipsService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionTipsService } from '../../../../platform/extensionManagement/common/extensionTipsService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Schemas } from '../../../../base/common/network.js';
let NativeExtensionTipsService = class NativeExtensionTipsService extends ExtensionTipsService {
    constructor(fileService, productService, sharedProcessService) {
        super(fileService, productService);
        this.channel = sharedProcessService.getChannel('extensionTipsService');
    }
    getConfigBasedTips(folder) {
        if (folder.scheme === Schemas.file) {
            return this.channel.call('getConfigBasedTips', [folder]);
        }
        return super.getConfigBasedTips(folder);
    }
    getImportantExecutableBasedTips() {
        return this.channel.call('getImportantExecutableBasedTips');
    }
    getOtherExecutableBasedTips() {
        return this.channel.call('getOtherExecutableBasedTips');
    }
};
NativeExtensionTipsService = __decorate([
    __param(0, IFileService),
    __param(1, IProductService),
    __param(2, ISharedProcessService)
], NativeExtensionTipsService);
registerSingleton(IExtensionTipsService, NativeExtensionTipsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uVGlwc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25NYW5hZ2VtZW50L2VsZWN0cm9uLXNhbmRib3gvZXh0ZW5zaW9uVGlwc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBRTdGLE9BQU8sRUFDTixxQkFBcUIsR0FHckIsTUFBTSx3RUFBd0UsQ0FBQTtBQUUvRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUM5RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUU1RCxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEyQixTQUFRLG9CQUFvQjtJQUc1RCxZQUNlLFdBQXlCLEVBQ3RCLGNBQStCLEVBQ3pCLG9CQUEyQztRQUVsRSxLQUFLLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQ2xDLElBQUksQ0FBQyxPQUFPLEdBQUcsb0JBQW9CLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDLENBQUE7SUFDdkUsQ0FBQztJQUVRLGtCQUFrQixDQUFDLE1BQVc7UUFDdEMsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNwQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUE2QixvQkFBb0IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDckYsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3hDLENBQUM7SUFFUSwrQkFBK0I7UUFDdkMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBaUMsaUNBQWlDLENBQUMsQ0FBQTtJQUM1RixDQUFDO0lBRVEsMkJBQTJCO1FBQ25DLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQWlDLDZCQUE2QixDQUFDLENBQUE7SUFDeEYsQ0FBQztDQUNELENBQUE7QUExQkssMEJBQTBCO0lBSTdCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLHFCQUFxQixDQUFBO0dBTmxCLDBCQUEwQixDQTBCL0I7QUFFRCxpQkFBaUIsQ0FBQyxxQkFBcUIsRUFBRSwwQkFBMEIsb0NBQTRCLENBQUEifQ==