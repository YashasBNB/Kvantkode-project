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
import { Iterable } from '../../../../base/common/iterator.js';
import { Event } from '../../../../base/common/event.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { AbstractPolicyService, } from '../../../../platform/policy/common/policy.js';
let MultiplexPolicyService = class MultiplexPolicyService extends AbstractPolicyService {
    constructor(policyServices, logService) {
        super();
        this.policyServices = policyServices;
        this.logService = logService;
        this.updatePolicies();
        this._register(Event.any(...this.policyServices.map((service) => service.onDidChange))((names) => {
            this.updatePolicies();
            this._onDidChange.fire(names);
        }));
    }
    async updatePolicyDefinitions(policyDefinitions) {
        await this._updatePolicyDefinitions(policyDefinitions);
        return Iterable.reduce(this.policies.entries(), (r, [name, value]) => ({ ...r, [name]: value }), {});
    }
    async _updatePolicyDefinitions(policyDefinitions) {
        await Promise.all(this.policyServices.map((service) => service.updatePolicyDefinitions(policyDefinitions)));
        this.updatePolicies();
    }
    updatePolicies() {
        this.policies.clear();
        const updated = [];
        for (const service of this.policyServices) {
            const definitions = service.policyDefinitions;
            for (const name in definitions) {
                const value = service.getPolicyValue(name);
                this.policyDefinitions[name] = definitions[name];
                if (value !== undefined) {
                    updated.push(name);
                    this.policies.set(name, value);
                }
            }
        }
        // Check that no results have overlapping keys
        const changed = new Set();
        for (const key of updated) {
            if (changed.has(key)) {
                this.logService.warn(`MultiplexPolicyService#_updatePolicyDefinitions - Found overlapping keys in policy services: ${key}`);
            }
            changed.add(key);
        }
    }
};
MultiplexPolicyService = __decorate([
    __param(1, ILogService)
], MultiplexPolicyService);
export { MultiplexPolicyService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlwbGV4UG9saWN5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9wb2xpY2llcy9jb21tb24vbXVsdGlwbGV4UG9saWN5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQ04scUJBQXFCLEdBSXJCLE1BQU0sOENBQThDLENBQUE7QUFFOUMsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIsU0FBUSxxQkFBcUI7SUFDaEUsWUFDa0IsY0FBNkMsRUFDaEMsVUFBdUI7UUFFckQsS0FBSyxFQUFFLENBQUE7UUFIVSxtQkFBYyxHQUFkLGNBQWMsQ0FBK0I7UUFDaEMsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUlyRCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDckIsSUFBSSxDQUFDLFNBQVMsQ0FDYixLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDakYsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO1lBQ3JCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzlCLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRVEsS0FBSyxDQUFDLHVCQUF1QixDQUNyQyxpQkFBc0Q7UUFFdEQsTUFBTSxJQUFJLENBQUMsd0JBQXdCLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUN0RCxPQUFPLFFBQVEsQ0FBQyxNQUFNLENBQ3JCLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQ3ZCLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUMvQyxFQUFFLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFUyxLQUFLLENBQUMsd0JBQXdCLENBQ3ZDLGlCQUFzRDtRQUV0RCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQ2hCLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUN4RixDQUFBO1FBQ0QsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO0lBQ3RCLENBQUM7SUFFTyxjQUFjO1FBQ3JCLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDckIsTUFBTSxPQUFPLEdBQWEsRUFBRSxDQUFBO1FBQzVCLEtBQUssTUFBTSxPQUFPLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzNDLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQTtZQUM3QyxLQUFLLE1BQU0sSUFBSSxJQUFJLFdBQVcsRUFBRSxDQUFDO2dCQUNoQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUMxQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNoRCxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDekIsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDbEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO2dCQUMvQixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCw4Q0FBOEM7UUFDOUMsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQTtRQUNqQyxLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzNCLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUN0QixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FDbkIsZ0dBQWdHLEdBQUcsRUFBRSxDQUNyRyxDQUFBO1lBQ0YsQ0FBQztZQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDakIsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBOURZLHNCQUFzQjtJQUdoQyxXQUFBLFdBQVcsQ0FBQTtHQUhELHNCQUFzQixDQThEbEMifQ==