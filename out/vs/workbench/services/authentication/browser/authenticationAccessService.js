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
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
export const IAuthenticationAccessService = createDecorator('IAuthenticationAccessService');
// TODO@TylerLeonhardt: Move this class to MainThreadAuthentication
let AuthenticationAccessService = class AuthenticationAccessService extends Disposable {
    constructor(_storageService, _productService) {
        super();
        this._storageService = _storageService;
        this._productService = _productService;
        this._onDidChangeExtensionSessionAccess = this._register(new Emitter());
        this.onDidChangeExtensionSessionAccess = this._onDidChangeExtensionSessionAccess.event;
    }
    isAccessAllowed(providerId, accountName, extensionId) {
        const trustedExtensionAuthAccess = this._productService.trustedExtensionAuthAccess;
        if (Array.isArray(trustedExtensionAuthAccess)) {
            if (trustedExtensionAuthAccess.includes(extensionId)) {
                return true;
            }
        }
        else if (trustedExtensionAuthAccess?.[providerId]?.includes(extensionId)) {
            return true;
        }
        const allowList = this.readAllowedExtensions(providerId, accountName);
        const extensionData = allowList.find((extension) => extension.id === extensionId);
        if (!extensionData) {
            return undefined;
        }
        // This property didn't exist on this data previously, inclusion in the list at all indicates allowance
        return extensionData.allowed !== undefined ? extensionData.allowed : true;
    }
    readAllowedExtensions(providerId, accountName) {
        let trustedExtensions = [];
        try {
            const trustedExtensionSrc = this._storageService.get(`${providerId}-${accountName}`, -1 /* StorageScope.APPLICATION */);
            if (trustedExtensionSrc) {
                trustedExtensions = JSON.parse(trustedExtensionSrc);
            }
        }
        catch (err) { }
        return trustedExtensions;
    }
    updateAllowedExtensions(providerId, accountName, extensions) {
        const allowList = this.readAllowedExtensions(providerId, accountName);
        for (const extension of extensions) {
            const index = allowList.findIndex((e) => e.id === extension.id);
            if (index === -1) {
                allowList.push(extension);
            }
            else {
                allowList[index].allowed = extension.allowed;
            }
        }
        this._storageService.store(`${providerId}-${accountName}`, JSON.stringify(allowList), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        this._onDidChangeExtensionSessionAccess.fire({ providerId, accountName });
    }
    removeAllowedExtensions(providerId, accountName) {
        this._storageService.remove(`${providerId}-${accountName}`, -1 /* StorageScope.APPLICATION */);
        this._onDidChangeExtensionSessionAccess.fire({ providerId, accountName });
    }
};
AuthenticationAccessService = __decorate([
    __param(0, IStorageService),
    __param(1, IProductService)
], AuthenticationAccessService);
export { AuthenticationAccessService };
registerSingleton(IAuthenticationAccessService, AuthenticationAccessService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb25BY2Nlc3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvYXV0aGVudGljYXRpb24vYnJvd3Nlci9hdXRoZW50aWNhdGlvbkFjY2Vzc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFHdkQsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsZUFBZSxDQUMxRCw4QkFBOEIsQ0FDOUIsQ0FBQTtBQXdCRCxtRUFBbUU7QUFDNUQsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFDWixTQUFRLFVBQVU7SUFVbEIsWUFDa0IsZUFBaUQsRUFDakQsZUFBaUQ7UUFFbEUsS0FBSyxFQUFFLENBQUE7UUFIMkIsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQ2hDLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQVAzRCx1Q0FBa0MsR0FDekMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBK0MsQ0FBQyxDQUFBO1FBQ2xFLHNDQUFpQyxHQUN6QyxJQUFJLENBQUMsa0NBQWtDLENBQUMsS0FBSyxDQUFBO0lBTzlDLENBQUM7SUFFRCxlQUFlLENBQ2QsVUFBa0IsRUFDbEIsV0FB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