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
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { IUserDataSyncLogService, IUserDataSyncStoreService, } from './userDataSync.js';
export const IUserDataSyncAccountService = createDecorator('IUserDataSyncAccountService');
let UserDataSyncAccountService = class UserDataSyncAccountService extends Disposable {
    get account() {
        return this._account;
    }
    constructor(userDataSyncStoreService, logService) {
        super();
        this.userDataSyncStoreService = userDataSyncStoreService;
        this.logService = logService;
        this._onDidChangeAccount = this._register(new Emitter());
        this.onDidChangeAccount = this._onDidChangeAccount.event;
        this._onTokenFailed = this._register(new Emitter());
        this.onTokenFailed = this._onTokenFailed.event;
        this.wasTokenFailed = false;
        this._register(userDataSyncStoreService.onTokenFailed((code) => {
            this.logService.info('Settings Sync auth token failed', this.account?.authenticationProviderId, this.wasTokenFailed, code);
            this.updateAccount(undefined);
            if (code === "Forbidden" /* UserDataSyncErrorCode.Forbidden */) {
                this._onTokenFailed.fire(true /*bail out immediately*/);
            }
            else {
                this._onTokenFailed.fire(this.wasTokenFailed /* bail out if token failed before */);
            }
            this.wasTokenFailed = true;
        }));
        this._register(userDataSyncStoreService.onTokenSucceed(() => (this.wasTokenFailed = false)));
    }
    async updateAccount(account) {
        if (account && this._account
            ? account.token !== this._account.token ||
                account.authenticationProviderId !== this._account.authenticationProviderId
            : account !== this._account) {
            this._account = account;
            if (this._account) {
                this.userDataSyncStoreService.setAuthToken(this._account.token, this._account.authenticationProviderId);
            }
            this._onDidChangeAccount.fire(account);
        }
    }
};
UserDataSyncAccountService = __decorate([
    __param(0, IUserDataSyncStoreService),
    __param(1, IUserDataSyncLogService)
], UserDataSyncAccountService);
export { UserDataSyncAccountService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jQWNjb3VudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi91c2VyRGF0YVN5bmNBY2NvdW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFDTix1QkFBdUIsRUFDdkIseUJBQXlCLEdBRXpCLE1BQU0sbUJBQW1CLENBQUE7QUFPMUIsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsZUFBZSxDQUN6RCw2QkFBNkIsQ0FDN0IsQ0FBQTtBQVVNLElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTJCLFNBQVEsVUFBVTtJQUl6RCxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQVNELFlBQzRCLHdCQUFvRSxFQUN0RSxVQUFvRDtRQUU3RSxLQUFLLEVBQUUsQ0FBQTtRQUhxQyw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTJCO1FBQ3JELGVBQVUsR0FBVixVQUFVLENBQXlCO1FBVnRFLHdCQUFtQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQW9DLENBQUMsQ0FBQTtRQUNwRix1QkFBa0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFBO1FBRXBELG1CQUFjLEdBQXFCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVcsQ0FBQyxDQUFBO1FBQ3hFLGtCQUFhLEdBQW1CLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFBO1FBRTFELG1CQUFjLEdBQVksS0FBSyxDQUFBO1FBT3RDLElBQUksQ0FBQyxTQUFTLENBQ2Isd0JBQXdCLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDL0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQ25CLGlDQUFpQyxFQUNqQyxJQUFJLENBQUMsT0FBTyxFQUFFLHdCQUF3QixFQUN0QyxJQUFJLENBQUMsY0FBYyxFQUNuQixJQUFJLENBQ0osQ0FBQTtZQUNELElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDN0IsSUFBSSxJQUFJLHNEQUFvQyxFQUFFLENBQUM7Z0JBQzlDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1lBQ3hELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLHFDQUFxQyxDQUFDLENBQUE7WUFDcEYsQ0FBQztZQUNELElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFBO1FBQzNCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLHdCQUF3QixDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzdGLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQXlDO1FBQzVELElBQ0MsT0FBTyxJQUFJLElBQUksQ0FBQyxRQUFRO1lBQ3ZCLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSztnQkFDdEMsT0FBTyxDQUFDLHdCQUF3QixLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsd0JBQXdCO1lBQzVFLENBQUMsQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLFFBQVEsRUFDM0IsQ0FBQztZQUNGLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFBO1lBQ3ZCLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNuQixJQUFJLENBQUMsd0JBQXdCLENBQUMsWUFBWSxDQUN6QyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFDbkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsQ0FDdEMsQ0FBQTtZQUNGLENBQUM7WUFDRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3ZDLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXpEWSwwQkFBMEI7SUFnQnBDLFdBQUEseUJBQXlCLENBQUE7SUFDekIsV0FBQSx1QkFBdUIsQ0FBQTtHQWpCYiwwQkFBMEIsQ0F5RHRDIn0=