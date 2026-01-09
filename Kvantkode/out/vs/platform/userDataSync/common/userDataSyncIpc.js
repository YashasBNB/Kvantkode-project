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
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IProductService } from '../../product/common/productService.js';
import { IStorageService } from '../../storage/common/storage.js';
import { AbstractUserDataSyncStoreManagementService } from './userDataSyncStoreService.js';
export class UserDataSyncAccountServiceChannel {
    constructor(service) {
        this.service = service;
    }
    listen(_, event) {
        switch (event) {
            case 'onDidChangeAccount':
                return this.service.onDidChangeAccount;
            case 'onTokenFailed':
                return this.service.onTokenFailed;
        }
        throw new Error(`[UserDataSyncAccountServiceChannel] Event not found: ${event}`);
    }
    call(context, command, args) {
        switch (command) {
            case '_getInitialData':
                return Promise.resolve(this.service.account);
            case 'updateAccount':
                return this.service.updateAccount(args);
        }
        throw new Error('Invalid call');
    }
}
export class UserDataSyncAccountServiceChannelClient extends Disposable {
    get account() {
        return this._account;
    }
    get onTokenFailed() {
        return this.channel.listen('onTokenFailed');
    }
    constructor(channel) {
        super();
        this.channel = channel;
        this._onDidChangeAccount = this._register(new Emitter());
        this.onDidChangeAccount = this._onDidChangeAccount.event;
        this.channel.call('_getInitialData').then((account) => {
            this._account = account;
            this._register(this.channel.listen('onDidChangeAccount')((account) => {
                this._account = account;
                this._onDidChangeAccount.fire(account);
            }));
        });
    }
    updateAccount(account) {
        return this.channel.call('updateAccount', account);
    }
}
export class UserDataSyncStoreManagementServiceChannel {
    constructor(service) {
        this.service = service;
    }
    listen(_, event) {
        switch (event) {
            case 'onDidChangeUserDataSyncStore':
                return this.service.onDidChangeUserDataSyncStore;
        }
        throw new Error(`[UserDataSyncStoreManagementServiceChannel] Event not found: ${event}`);
    }
    call(context, command, args) {
        switch (command) {
            case 'switch':
                return this.service.switch(args[0]);
            case 'getPreviousUserDataSyncStore':
                return this.service.getPreviousUserDataSyncStore();
        }
        throw new Error('Invalid call');
    }
}
let UserDataSyncStoreManagementServiceChannelClient = class UserDataSyncStoreManagementServiceChannelClient extends AbstractUserDataSyncStoreManagementService {
    constructor(channel, productService, configurationService, storageService) {
        super(productService, configurationService, storageService);
        this.channel = channel;
        this._register(this.channel.listen('onDidChangeUserDataSyncStore')(() => this.updateUserDataSyncStore()));
    }
    async switch(type) {
        return this.channel.call('switch', [type]);
    }
    async getPreviousUserDataSyncStore() {
        const userDataSyncStore = await this.channel.call('getPreviousUserDataSyncStore');
        return this.revive(userDataSyncStore);
    }
    revive(userDataSyncStore) {
        return {
            url: URI.revive(userDataSyncStore.url),
            type: userDataSyncStore.type,
            defaultUrl: URI.revive(userDataSyncStore.defaultUrl),
            insidersUrl: URI.revive(userDataSyncStore.insidersUrl),
            stableUrl: URI.revive(userDataSyncStore.stableUrl),
            canSwitch: userDataSyncStore.canSwitch,
            authenticationProviders: userDataSyncStore.authenticationProviders,
        };
    }
};
UserDataSyncStoreManagementServiceChannelClient = __decorate([
    __param(1, IProductService),
    __param(2, IConfigurationService),
    __param(3, IStorageService)
], UserDataSyncStoreManagementServiceChannelClient);
export { UserDataSyncStoreManagementServiceChannelClient };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL3VzZXJEYXRhU3luY0lwYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUVqRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBT2pFLE9BQU8sRUFBRSwwQ0FBMEMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRTFGLE1BQU0sT0FBTyxpQ0FBaUM7SUFDN0MsWUFBNkIsT0FBb0M7UUFBcEMsWUFBTyxHQUFQLE9BQU8sQ0FBNkI7SUFBRyxDQUFDO0lBRXJFLE1BQU0sQ0FBQyxDQUFVLEVBQUUsS0FBYTtRQUMvQixRQUFRLEtBQUssRUFBRSxDQUFDO1lBQ2YsS0FBSyxvQkFBb0I7Z0JBQ3hCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQTtZQUN2QyxLQUFLLGVBQWU7Z0JBQ25CLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUE7UUFDbkMsQ0FBQztRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsd0RBQXdELEtBQUssRUFBRSxDQUFDLENBQUE7SUFDakYsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFZLEVBQUUsT0FBZSxF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