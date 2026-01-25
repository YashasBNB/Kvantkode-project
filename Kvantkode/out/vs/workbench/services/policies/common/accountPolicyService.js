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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjb3VudFBvbGljeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9wb2xpY2llcy9jb21tb24vYWNjb3VudFBvbGljeVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFDTixxQkFBcUIsR0FHckIsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLEVBRU4sc0JBQXNCLEdBQ3RCLE1BQU0seUNBQXlDLENBQUE7QUFFekMsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxxQkFBcUI7SUFFOUQsWUFDYyxVQUF3QyxFQUM3QixxQkFBNkQ7UUFFckYsS0FBSyxFQUFFLENBQUE7UUFIdUIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUNaLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFIOUUsK0JBQTBCLEdBQVksSUFBSSxDQUFBO1FBT2pELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQy9ELElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLDZCQUE2QixJQUFJLElBQUksQ0FBQyxDQUFBO1lBQzVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHlCQUF5QixDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FDaEUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsNkJBQTZCLElBQUksSUFBSSxDQUFDLENBQzVELENBQ0QsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLE9BQU8sQ0FBQywwQkFBK0M7UUFDOUQsTUFBTSxRQUFRLEdBQUcsMEJBQTBCLEtBQUssU0FBUyxJQUFJLDBCQUEwQixDQUFBO1FBQ3ZGLElBQUksSUFBSSxDQUFDLDBCQUEwQixLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2xELElBQUksQ0FBQywwQkFBMEIsR0FBRyxRQUFRLENBQUE7WUFDMUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ3RELENBQUM7SUFDRixDQUFDO0lBRVMsS0FBSyxDQUFDLHdCQUF3QixDQUN2QyxpQkFBc0Q7UUFFdEQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQ3BCLHNEQUFzRCxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsTUFBTSxxQkFBcUIsQ0FDaEgsQ0FBQTtRQUVELE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQTtRQUMzQixLQUFLLE1BQU0sR0FBRyxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDckMsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDckMsSUFBSSxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQzNCLElBQUksSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUM7b0JBQ3JDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO29CQUN6QixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO29CQUNoQixTQUFRO2dCQUNULENBQUM7Z0JBQ0QsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQTtnQkFDeEMsTUFBTSxZQUFZLEdBQUcsWUFBWSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUE7Z0JBQ3RFLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssWUFBWSxFQUFFLENBQUM7b0JBQzdDLFNBQVE7Z0JBQ1QsQ0FBQztnQkFDRCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDLENBQUE7Z0JBQ3BDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDakIsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMvQixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUF4RFksb0JBQW9CO0lBRzlCLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxzQkFBc0IsQ0FBQTtHQUpaLG9CQUFvQixDQXdEaEMifQ==