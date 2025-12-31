/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from '../../../base/common/event.js';
import { Iterable } from '../../../base/common/iterator.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IPolicyService = createDecorator('policy');
export class AbstractPolicyService extends Disposable {
    constructor() {
        super(...arguments);
        this.policyDefinitions = {};
        this.policies = new Map();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
    }
    async updatePolicyDefinitions(policyDefinitions) {
        const size = Object.keys(this.policyDefinitions).length;
        this.policyDefinitions = { ...policyDefinitions, ...this.policyDefinitions };
        if (size !== Object.keys(this.policyDefinitions).length) {
            await this._updatePolicyDefinitions(this.policyDefinitions);
        }
        return Iterable.reduce(this.policies.entries(), (r, [name, value]) => ({ ...r, [name]: value }), {});
    }
    getPolicyValue(name) {
        return this.policies.get(name);
    }
    serialize() {
        return Iterable.reduce(Object.entries(this.policyDefinitions), (r, [name, definition]) => ({
            ...r,
            [name]: { definition, value: this.policies.get(name) },
        }), {});
    }
}
export class NullPolicyService {
    constructor() {
        this.onDidChange = Event.None;
        this.policyDefinitions = {};
    }
    async updatePolicyDefinitions() {
        return {};
    }
    getPolicyValue() {
        return undefined;
    }
    serialize() {
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9saWN5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcG9saWN5L2NvbW1vbi9wb2xpY3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQVM3RSxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsZUFBZSxDQUFpQixRQUFRLENBQUMsQ0FBQTtBQWN2RSxNQUFNLE9BQWdCLHFCQUFzQixTQUFRLFVBQVU7SUFBOUQ7O1FBR1Esc0JBQWlCLEdBQXdDLEVBQUUsQ0FBQTtRQUN4RCxhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQTJCLENBQUE7UUFFcEMsaUJBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUF5QixDQUFDLENBQUE7UUFDN0UsZ0JBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtJQXdDL0MsQ0FBQztJQXRDQSxLQUFLLENBQUMsdUJBQXVCLENBQzVCLGlCQUFzRDtRQUV0RCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtRQUN2RCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsRUFBRSxHQUFHLGlCQUFpQixFQUFFLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFFNUUsSUFBSSxJQUFJLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN6RCxNQUFNLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUM1RCxDQUFDO1FBRUQsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUNyQixJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxFQUN2QixDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFDL0MsRUFBRSxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsY0FBYyxDQUFDLElBQWdCO1FBQzlCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDL0IsQ0FBQztJQUVELFNBQVM7UUFDUixPQUFPLFFBQVEsQ0FBQyxNQUFNLENBSXJCLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQ3RDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzNCLEdBQUcsQ0FBQztZQUNKLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxFQUFFO1NBQ3ZELENBQUMsRUFDRixFQUFFLENBQ0YsQ0FBQTtJQUNGLENBQUM7Q0FLRDtBQUVELE1BQU0sT0FBTyxpQkFBaUI7SUFBOUI7UUFFVSxnQkFBVyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFVakMsc0JBQWlCLEdBQXdDLEVBQUUsQ0FBQTtJQUM1RCxDQUFDO0lBVkEsS0FBSyxDQUFDLHVCQUF1QjtRQUM1QixPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFDRCxjQUFjO1FBQ2IsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELFNBQVM7UUFDUixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0NBRUQifQ==