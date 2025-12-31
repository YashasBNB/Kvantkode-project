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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uVGlwc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9uTWFuYWdlbWVudC9lbGVjdHJvbi1zYW5kYm94L2V4dGVuc2lvblRpcHNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUU3RixPQUFPLEVBQ04scUJBQXFCLEdBR3JCLE1BQU0sd0VBQXdFLENBQUE7QUFFL0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFDOUcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFNUQsSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMkIsU0FBUSxvQkFBb0I7SUFHNUQsWUFDZSxXQUF5QixFQUN0QixjQUErQixFQUN6QixvQkFBMkM7UUFFbEUsS0FBSyxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUNsQyxJQUFJLENBQUMsT0FBTyxHQUFHLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO0lBQ3ZFLENBQUM7SUFFUSxrQkFBa0IsQ0FBQyxNQUFXO1FBQ3RDLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDcEMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBNkIsb0JBQW9CLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0lBRVEsK0JBQStCO1FBQ3ZDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQWlDLGlDQUFpQyxDQUFDLENBQUE7SUFDNUYsQ0FBQztJQUVRLDJCQUEyQjtRQUNuQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFpQyw2QkFBNkIsQ0FBQyxDQUFBO0lBQ3hGLENBQUM7Q0FDRCxDQUFBO0FBMUJLLDBCQUEwQjtJQUk3QixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxxQkFBcUIsQ0FBQTtHQU5sQiwwQkFBMEIsQ0EwQi9CO0FBRUQsaUJBQWlCLENBQUMscUJBQXFCLEVBQUUsMEJBQTBCLG9DQUE0QixDQUFBIn0=