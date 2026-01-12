/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { AbstractPolicyService } from './policy.js';
export class PolicyChannel {
    constructor(service) {
        this.service = service;
        this.disposables = new DisposableStore();
    }
    listen(_, event) {
        switch (event) {
            case 'onDidChange':
                return Event.map(this.service.onDidChange, (names) => names.reduce((r, name) => ({ ...r, [name]: this.service.getPolicyValue(name) ?? null }), {}), this.disposables);
        }
        throw new Error(`Event not found: ${event}`);
    }
    call(_, command, arg) {
        switch (command) {
            case 'updatePolicyDefinitions':
                return this.service.updatePolicyDefinitions(arg);
        }
        throw new Error(`Call not found: ${command}`);
    }
    dispose() {
        this.disposables.dispose();
    }
}
export class PolicyChannelClient extends AbstractPolicyService {
    constructor(policiesData, channel) {
        super();
        this.channel = channel;
        for (const name in policiesData) {
            const { definition, value } = policiesData[name];
            this.policyDefinitions[name] = definition;
            if (value !== undefined) {
                this.policies.set(name, value);
            }
        }
        this.channel.listen('onDidChange')((policies) => {
            for (const name in policies) {
                const value = policies[name];
                if (value === null) {
                    this.policies.delete(name);
                }
                else {
                    this.policies.set(name, value);
                }
            }
            this._onDidChange.fire(Object.keys(policies));
        });
    }
    async _updatePolicyDefinitions(policyDefinitions) {
        const result = await this.channel.call('updatePolicyDefinitions', policyDefinitions);
        for (const name in result) {
            this.policies.set(name, result[name]);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9saWN5SXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wb2xpY3kvY29tbW9uL3BvbGljeUlwYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBR25FLE9BQU8sRUFBRSxxQkFBcUIsRUFBaUQsTUFBTSxhQUFhLENBQUE7QUFFbEcsTUFBTSxPQUFPLGFBQWE7SUFHekIsWUFBb0IsT0FBdUI7UUFBdkIsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7UUFGMUIsZ0JBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBRU4sQ0FBQztJQUUvQyxNQUFNLENBQUMsQ0FBVSxFQUFFLEtBQWE7UUFDL0IsUUFBUSxLQUFLLEVBQUUsQ0FBQztZQUNmLEtBQUssYUFBYTtnQkFDakIsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUNmLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUN4QixDQUFDLEtBQUssRUFBRSxFQUFFLENBQ1QsS0FBSyxDQUFDLE1BQU0sQ0FDWCxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLEVBQzFFLEVBQUUsQ0FDRixFQUNGLElBQUksQ0FBQyxXQUFXLENBQ2hCLENBQUE7UUFDSCxDQUFDO1FBRUQsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsSUFBSSxDQUFDLENBQVUsRUFBRSxPQUFlLEVBQUUsR0FBUztRQUMxQyxRQUFRLE9BQU8sRUFBRSxDQUFDO1lBQ2pCLEtBQUsseUJBQXlCO2dCQUM3QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsR0FBMEMsQ0FBQyxDQUFBO1FBQ3pGLENBQUM7UUFFRCxNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixPQUFPLEVBQUUsQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUMzQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEscUJBQXFCO0lBQzdELFlBQ0MsWUFBcUYsRUFDcEUsT0FBaUI7UUFFbEMsS0FBSyxFQUFFLENBQUE7UUFGVSxZQUFPLEdBQVAsT0FBTyxDQUFVO1FBR2xDLEtBQUssTUFBTSxJQUFJLElBQUksWUFBWSxFQUFFLENBQUM7WUFDakMsTUFBTSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDaEQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxHQUFHLFVBQVUsQ0FBQTtZQUN6QyxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDekIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQy9CLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQVMsYUFBYSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUN2RCxLQUFLLE1BQU0sSUFBSSxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUM3QixNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsSUFBNkIsQ0FBQyxDQUFBO2dCQUVyRCxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDcEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQzNCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7Z0JBQy9CLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQzlDLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVTLEtBQUssQ0FBQyx3QkFBd0IsQ0FDdkMsaUJBQXNEO1FBRXRELE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQ3JDLHlCQUF5QixFQUN6QixpQkFBaUIsQ0FDakIsQ0FBQTtRQUNELEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxFQUFFLENBQUM7WUFDM0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==