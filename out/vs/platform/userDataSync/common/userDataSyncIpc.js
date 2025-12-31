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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jSXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi91c2VyRGF0YVN5bmNJcGMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFakQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQU9qRSxPQUFPLEVBQUUsMENBQTBDLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUUxRixNQUFNLE9BQU8saUNBQWlDO0lBQzdDLFlBQTZCLE9BQW9DO1FBQXBDLFlBQU8sR0FBUCxPQUFPLENBQTZCO0lBQUcsQ0FBQztJQUVyRSxNQUFNLENBQUMsQ0FBVSxFQUFFLEtBQWE7UUFDL0IsUUFBUSxLQUFLLEVBQUUsQ0FBQztZQUNmLEtBQUssb0JBQW9CO2dCQUN4QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUE7WUFDdkMsS0FBSyxlQUFlO2dCQUNuQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFBO1FBQ25DLENBQUM7UUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLHdEQUF3RCxLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBQ2pGLENBQUM7SUFFRCxJQUFJLENBQUMsT0FBWSxFQUFFLE9BQWUsRUFBRSxJQUFVO1FBQzdDLFFBQVEsT0FB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