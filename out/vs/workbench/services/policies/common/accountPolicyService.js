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
import { ILogService } from '../../../../platform/log/common/log.js';
import { AbstractPolicyService, } from '../../../../platform/policy/common/policy.js';
import { IDefaultAccountService, } from '../../accounts/common/defaultAccount.js';
let AccountPolicyService = class AccountPolicyService extends AbstractPolicyService {
    constructor(logService, defaultAccountService) {
        super();
        this.logService = logService;
        this.defaultAccountService = defaultAccountService;
        this.chatPreviewFeaturesEnabled = true;
        this.defaultAccountService.getDefaultAccount().then((account) => {
            this._update(account?.chat_preview_features_enabled ?? true);
            this._register(this.defaultAccountService.onDidChangeDefaultAccount((account) => this._update(account?.chat_preview_features_enabled ?? true)));
        });
    }
    _update(chatPreviewFeaturesEnabled) {
        const newValue = chatPreviewFeaturesEnabled === undefined || chatPreviewFeaturesEnabled;
        if (this.chatPreviewFeaturesEnabled !== newValue) {
            this.chatPreviewFeaturesEnabled = newValue;
            this._updatePolicyDefinitions(this.policyDefinitions);
        }
    }
    async _updatePolicyDefinitions(policyDefinitions) {
        this.logService.trace(`AccountPolicyService#_updatePolicyDefinitions: Got ${Object.keys(policyDefinitions).length} policy definitions`);
        const update = [];
        for (const key in policyDefinitions) {
            const policy = policyDefinitions[key];
            if (policy.previewFeature) {
                if (this.chatPreviewFeaturesEnabled) {
                    this.policies.delete(key);
                    update.push(key);
                    continue;
                }
                const defaultValue = policy.defaultValue;
                const updatedValue = defaultValue === undefined ? false : defaultValue;
                if (this.policies.get(key) === updatedValue) {
                    continue;
                }
                this.policies.set(key, updatedValue);
                update.push(key);
            }
        }
        if (update.length) {
            this._onDidChange.fire(update);
        }
    }
};
AccountPolicyService = __decorate([
    __param(0, ILogService),
    __param(1, IDefaultAccountService)
], AccountPolicyService);
export { AccountPolicyService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjb3VudFBvbGljeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcG9saWNpZXMvY29tbW9uL2FjY291bnRQb2xpY3lTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQ04scUJBQXFCLEdBR3JCLE1BQU0sOENBQThDLENBQUE7QUFDckQsT0FBTyxFQUVOLHNCQUFzQixHQUN0QixNQUFNLHlDQUF5QyxDQUFBO0FBRXpDLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEscUJBQXFCO0lBRTlELFlBQ2MsVUFBd0MsRUFDN0IscUJBQTZEO1FBRXJGLEtBQUssRUFBRSxDQUFBO1FBSHVCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDWiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBSDlFLCtCQUEwQixHQUFZLElBQUksQ0FBQTtRQU9qRCxJQUFJLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUMvRCxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSw2QkFBNkIsSUFBSSxJQUFJLENBQUMsQ0FBQTtZQUM1RCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQ2hFLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLDZCQUE2QixJQUFJLElBQUksQ0FBQyxDQUM1RCxDQUNELENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxPQUFPLENBQUMsMEJBQStDO1FBQzlELE1BQU0sUUFBUSxHQUFHLDBCQUEwQixLQUFLLFNBQVMsSUFBSSwwQkFBMEIsQ0FBQTtRQUN2RixJQUFJLElBQUksQ0FBQywwQkFBMEIsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNsRCxJQUFJLENBQUMsMEJBQTBCLEdBQUcsUUFBUSxDQUFBO1lBQzFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUN0RCxDQUFDO0lBQ0YsQ0FBQztJQUVTLEtBQUssQ0FBQyx3QkFBd0IsQ0FDdkMsaUJBQXNEO1FBRXRELElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUNwQixzREFBc0QsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLE1BQU0scUJBQXFCLENBQ2hILENBQUE7UUFFRCxNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUE7UUFDM0IsS0FBSyxNQUFNLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3JDLElBQUksTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUMzQixJQUFJLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO29CQUNyQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDekIsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDaEIsU0FBUTtnQkFDVCxDQUFDO2dCQUNELE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUE7Z0JBQ3hDLE1BQU0sWUFBWSxHQUFHLFlBQVksS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFBO2dCQUN0RSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLFlBQVksRUFBRSxDQUFDO29CQUM3QyxTQUFRO2dCQUNULENBQUM7Z0JBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQyxDQUFBO2dCQUNwQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2pCLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDL0IsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBeERZLG9CQUFvQjtJQUc5QixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsc0JBQXNCLENBQUE7R0FKWixvQkFBb0IsQ0F3RGhDIn0=