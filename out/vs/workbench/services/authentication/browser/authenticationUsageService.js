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
import { Queue } from '../../../../base/common/async.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IAuthenticationService } from '../common/authentication.js';
export const IAuthenticationUsageService = createDecorator('IAuthenticationUsageService');
let AuthenticationUsageService = class AuthenticationUsageService extends Disposable {
    constructor(_storageService, _authenticationService, _logService, productService) {
        super();
        this._storageService = _storageService;
        this._authenticationService = _authenticationService;
        this._logService = _logService;
        this._queue = new Queue();
        this._extensionsUsingAuth = new Set();
        // If an extension is listed in `trustedExtensionAuthAccess` we should consider it as using auth
        const trustedExtensionAuthAccess = productService.trustedExtensionAuthAccess;
        if (Array.isArray(trustedExtensionAuthAccess)) {
            for (const extensionId of trustedExtensionAuthAccess) {
                this._extensionsUsingAuth.add(extensionId);
            }
        }
        else if (trustedExtensionAuthAccess) {
            for (const extensions of Object.values(trustedExtensionAuthAccess)) {
                for (const extensionId of extensions) {
                    this._extensionsUsingAuth.add(extensionId);
                }
            }
        }
        this._register(this._authenticationService.onDidRegisterAuthenticationProvider((provider) => this._queue.queue(() => this._addExtensionsToCache(provider.id))));
    }
    async initializeExtensionUsageCache() {
        await this._queue.queue(() => Promise.all(this._authenticationService
            .getProviderIds()
            .map((providerId) => this._addExtensionsToCache(providerId))));
    }
    async extensionUsesAuth(extensionId) {
        await this._queue.whenIdle();
        return this._extensionsUsingAuth.has(extensionId);
    }
    readAccountUsages(providerId, accountName) {
        const accountKey = `${providerId}-${accountName}-usages`;
        const storedUsages = this._storageService.get(accountKey, -1 /* StorageScope.APPLICATION */);
        let usages = [];
        if (storedUsages) {
            try {
                usages = JSON.parse(storedUsages);
            }
            catch (e) {
                // ignore
            }
        }
        return usages;
    }
    removeAccountUsage(providerId, accountName) {
        const accountKey = `${providerId}-${accountName}-usages`;
        this._storageService.remove(accountKey, -1 /* StorageScope.APPLICATION */);
    }
    addAccountUsage(providerId, accountName, scopes, extensionId, extensionName) {
        const accountKey = `${providerId}-${accountName}-usages`;
        const usages = this.readAccountUsages(providerId, accountName);
        const existingUsageIndex = usages.findIndex((usage) => usage.extensionId === extensionId);
        if (existingUsageIndex > -1) {
            usages.splice(existingUsageIndex, 1, {
                extensionId,
                extensionName,
                scopes,
                lastUsed: Date.now(),
            });
        }
        else {
            usages.push({
                extensionId,
                extensionName,
                scopes,
                lastUsed: Date.now(),
            });
        }
        this._storageService.store(accountKey, JSON.stringify(usages), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        this._extensionsUsingAuth.add(extensionId);
    }
    async _addExtensionsToCache(providerId) {
        try {
            const accounts = await this._authenticationService.getAccounts(providerId);
            for (const account of accounts) {
                const usage = this.readAccountUsages(providerId, account.label);
                for (const u of usage) {
                    this._extensionsUsingAuth.add(u.extensionId);
                }
            }
        }
        catch (e) {
            this._logService.error(e);
        }
    }
};
AuthenticationUsageService = __decorate([
    __param(0, IStorageService),
    __param(1, IAuthenticationService),
    __param(2, ILogService),
    __param(3, IProductService)
], AuthenticationUsageService);
export { AuthenticationUsageService };
registerSingleton(IAuthenticationUsageService, AuthenticationUsageService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb25Vc2FnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvYXV0aGVudGljYXRpb24vYnJvd3Nlci9hdXRoZW50aWNhdGlvblVzYWdlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFTcEUsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsZUFBZSxDQUN6RCw2QkFBNkIsQ0FDN0IsQ0FBQTtBQXdDTSxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEyQixTQUFRLFVBQVU7SUFNekQsWUFDa0IsZUFBaUQsRUFDMUMsc0JBQStELEVBQzFFLFdBQXlDLEVBQ3JDLGNBQStCO1FBRWhELEtBQUssRUFBRSxDQUFBO1FBTDJCLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUN6QiwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXdCO1FBQ3pELGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBTi9DLFdBQU0sR0FBRyxJQUFJLEtBQUssRUFBRSxD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