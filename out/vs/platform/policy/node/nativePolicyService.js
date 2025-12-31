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
import { AbstractPolicyService } from '../common/policy.js';
import { Throttler } from '../../../base/common/async.js';
import { MutableDisposable } from '../../../base/common/lifecycle.js';
import { ILogService } from '../../log/common/log.js';
let NativePolicyService = class NativePolicyService extends AbstractPolicyService {
    constructor(logService, productName) {
        super();
        this.logService = logService;
        this.productName = productName;
        this.throttler = new Throttler();
        this.watcher = this._register(new MutableDisposable());
    }
    async _updatePolicyDefinitions(policyDefinitions) {
        this.logService.trace(`NativePolicyService#_updatePolicyDefinitions - Found ${Object.keys(policyDefinitions).length} policy definitions`);
        const { createWatcher } = await import('@vscode/policy-watcher');
        await this.throttler.queue(() => new Promise((c, e) => {
            try {
                this.watcher.value = createWatcher(this.productName, policyDefinitions, (update) => {
                    this._onDidPolicyChange(update);
                    c();
                });
            }
            catch (err) {
                this.logService.error(`NativePolicyService#_updatePolicyDefinitions - Error creating watcher:`, err);
                e(err);
            }
        }));
    }
    _onDidPolicyChange(update) {
        this.logService.trace(`NativePolicyService#_onDidPolicyChange - Updated policy values: ${JSON.stringify(update)}`);
        for (const key in update) {
            const value = update[key];
            if (value === undefined) {
                this.policies.delete(key);
            }
            else {
                this.policies.set(key, value);
            }
        }
        this._onDidChange.fire(Object.keys(update));
    }
};
NativePolicyService = __decorate([
    __param(0, ILogService)
], NativePolicyService);
export { NativePolicyService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlUG9saWN5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3BvbGljeS9ub2RlL25hdGl2ZVBvbGljeVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFvQyxNQUFNLHFCQUFxQixDQUFBO0FBRTdGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFOUMsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxxQkFBcUI7SUFJN0QsWUFDYyxVQUF3QyxFQUNwQyxXQUFtQjtRQUVwQyxLQUFLLEVBQUUsQ0FBQTtRQUh1QixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ3BDLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBTDdCLGNBQVMsR0FBRyxJQUFJLFNBQVMsRUFBRSxDQUFBO1FBQ2xCLFlBQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksaUJBQWlCLEVBQVcsQ0FBQyxDQUFBO0lBTzNFLENBQUM7SUFFUyxLQUFLLENBQUMsd0JBQXdCLENBQ3ZDLGlCQUFzRDtRQUV0RCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FDcEIsd0RBQXdELE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxNQUFNLHFCQUFxQixDQUNsSCxDQUFBO1FBRUQsTUFBTSxFQUFFLGFBQWEsRUFBRSxHQUFHLE1BQU0sTUFBTSxDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFFaEUsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FDekIsR0FBRyxFQUFFLENBQ0osSUFBSSxPQUFPLENBQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDMUIsSUFBSSxDQUFDO2dCQUNKLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLGlCQUFpQixFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7b0JBQ2xGLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtvQkFDL0IsQ0FBQyxFQUFFLENBQUE7Z0JBQ0osQ0FBQyxDQUFDLENBQUE7WUFDSCxDQUFDO1lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDZCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FDcEIsd0VBQXdFLEVBQ3hFLEdBQUcsQ0FDSCxDQUFBO2dCQUNELENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNQLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDSCxDQUFBO0lBQ0YsQ0FBQztJQUVPLGtCQUFrQixDQUFDLE1BQXlEO1FBQ25GLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUNwQixtRUFBbUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUMzRixDQUFBO1FBRUQsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUMxQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFRLENBQUE7WUFFaEMsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ3pCLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQzFCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDOUIsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDNUMsQ0FBQztDQUNELENBQUE7QUF4RFksbUJBQW1CO0lBSzdCLFdBQUEsV0FBVyxDQUFBO0dBTEQsbUJBQW1CLENBd0QvQiJ9