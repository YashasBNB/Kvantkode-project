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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jQWNjb3VudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vdXNlckRhdGFTeW5jQWNjb3VudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLHlCQUF5QixHQUV6QixNQUFNLG1CQUFtQixDQUFBO0FBTzFCLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLGVBQWUsQ0FDekQsNkJBQTZCLENBQzdCLENBQUE7QUFVTSxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEyQixTQUFRLFVBQVU7SUFJekQsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7SUFTRCxZQUM0Qix3QkFBb0UsRUFDdEUsVUFBb0Q7UUFFN0UsS0FBSyxFQUFFLENBQUE7UUFIcUMsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUEyQjtRQUNyRCxlQUFVLEdBQVYsVUFBVSxDQUF5QjtRQVZ0RSx3QkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFvQyxDQUFDLENBQUE7UUFDcEYsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQTtRQUVwRCxtQkFBYyxHQUFxQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFXLENBQUMsQ0FBQTtRQUN4RSxrQkFBYSxHQUFtQixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQTtRQUUxRCxtQkFBYyxHQUFZLEtBQUssQ0FBQTtRQU90QyxJQUFJLENBQUMsU0FBUyxDQUNiLHdCQUF3QixDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQy9DLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUNuQixpQ0FBaUMsRUFDakMsSUFBSSxDQUFDLE9BQU8sRUFBRSx3QkFBd0IsRUFDdEMsSUFBSSxDQUFDLGNBQWMsRUFDbkIsSUFBSSxDQUNKLENBQUE7WUFDRCxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzdCLElBQUksSUFBSSxzREFBb0MsRUFBRSxDQUFDO2dCQUM5QyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtZQUN4RCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFBO1lBQ3BGLENBQUM7WUFDRCxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQTtRQUMzQixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM3RixDQUFDO0lBRUQsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUF5QztRQUM1RCxJQUNDLE9BQU8sSUFBSSxJQUFJLENBQUMsUUFBUTtZQUN2QixDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUs7Z0JBQ3RDLE9BQU8sQ0FBQyx3QkFBd0IsS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLHdCQUF3QjtZQUM1RSxDQUFDLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQyxRQUFRLEVBQzNCLENBQUM7WUFDRixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQTtZQUN2QixJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDbkIsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFlBQVksQ0FDekMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQ25CLElBQUksQ0FBQyxRQUFRLENBQUMsd0JBQXdCLENBQ3RDLENBQUE7WUFDRixDQUFDO1lBQ0QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN2QyxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUF6RFksMEJBQTBCO0lBZ0JwQyxXQUFBLHlCQUF5QixDQUFBO0lBQ3pCLFdBQUEsdUJBQXVCLENBQUE7R0FqQmIsMEJBQTBCLENBeUR0QyJ9