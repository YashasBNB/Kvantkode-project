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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlUG9saWN5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcG9saWN5L25vZGUvbmF0aXZlUG9saWN5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQW9DLE1BQU0scUJBQXFCLENBQUE7QUFFN0YsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXpELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUU5QyxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLHFCQUFxQjtJQUk3RCxZQUNjLFVBQXdDLEVBQ3BDLFdBQW1CO1FBRXBDLEtBQUssRUFBRSxDQUFBO1FBSHVCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDcEMsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFMN0IsY0FBUyxHQUFHLElBQUksU0FBUyxFQUFFLENBQUE7UUFDbEIsWUFBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBVyxDQUFDLENBQUE7SUFPM0UsQ0FBQztJQUVTLEtBQUssQ0FBQyx3QkFBd0IsQ0FDdkMsaUJBQXNEO1FBRXRELElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUNwQix3REFBd0QsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLE1BQU0scUJBQXFCLENBQ2xILENBQUE7UUFFRCxNQUFNLEVBQUUsYUFBYSxFQUFFLEdBQUcsTUFBTSxNQUFNLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUVoRSxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUN6QixHQUFHLEVBQUUsQ0FDSixJQUFJLE9BQU8sQ0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMxQixJQUFJLENBQUM7Z0JBQ0osSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtvQkFDbEYsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFBO29CQUMvQixDQUFDLEVBQUUsQ0FBQTtnQkFDSixDQUFDLENBQUMsQ0FBQTtZQUNILENBQUM7WUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO2dCQUNkLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUNwQix3RUFBd0UsRUFDeEUsR0FBRyxDQUNILENBQUE7Z0JBQ0QsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ1AsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNILENBQUE7SUFDRixDQUFDO0lBRU8sa0JBQWtCLENBQUMsTUFBeUQ7UUFDbkYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQ3BCLG1FQUFtRSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQzNGLENBQUE7UUFFRCxLQUFLLE1BQU0sR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQzFCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQVEsQ0FBQTtZQUVoQyxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDekIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDMUIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUM5QixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0NBQ0QsQ0FBQTtBQXhEWSxtQkFBbUI7SUFLN0IsV0FBQSxXQUFXLENBQUE7R0FMRCxtQkFBbUIsQ0F3RC9CIn0=