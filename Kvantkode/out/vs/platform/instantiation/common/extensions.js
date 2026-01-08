/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SyncDescriptor } from './descriptors.js';
const _registry = [];
export var InstantiationType;
(function (InstantiationType) {
    /**
     * Instantiate this service as soon as a consumer depends on it. _Note_ that this
     * is more costly as some upfront work is done that is likely not needed
     */
    InstantiationType[InstantiationType["Eager"] = 0] = "Eager";
    /**
     * Instantiate this service as soon as a consumer uses it. This is the _better_
     * way of registering a service.
     */
    InstantiationType[InstantiationType["Delayed"] = 1] = "Delayed";
})(InstantiationType || (InstantiationType = {}));
export function registerSingleton(id, ctorOrDescriptor, supportsDelayedInstantiation) {
    if (!(ctorOrDescriptor instanceof SyncDescriptor)) {
        ctorOrDescriptor = new SyncDescriptor(ctorOrDescriptor, [], Boolean(supportsDelayedInstantiation));
    }
    _registry.push([id, ctorOrDescriptor]);
}
export function getSingletonServiceDescriptors() {
    return _registry;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vaW5zdGFudGlhdGlvbi9jb21tb24vZXh0ZW5zaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFHakQsTUFBTSxTQUFTLEdBQW9ELEVBQUUsQ0FBQTtBQUVyRSxNQUFNLENBQU4sSUFBa0IsaUJBWWpCO0FBWkQsV0FBa0IsaUJBQWlCO0lBQ2xDOzs7T0FHRztJQUNILDJEQUFTLENBQUE7SUFFVDs7O09BR0c7SUFDSCwrREFBVyxDQUFBO0FBQ1osQ0FBQyxFQVppQixpQkFBaUIsS0FBakIsaUJBQWlCLFFBWWxDO0FBV0QsTUFBTSxVQUFVLGlCQUFpQixDQUNoQyxFQUF3QixFQUN4QixnQkFBMEUsRUFDMUUsNEJBQTBEO0lBRTFELElBQUksQ0FBQyxDQUFDLGdCQUFnQixZQUFZLGNBQWMsQ0FBQyxFQUFFLENBQUM7UUFDbkQsZ0JBQWdCLEdBQUcsSUFBSSxjQUFjLENBQ3BDLGdCQUE2QyxFQUM3QyxFQUFFLEVBQ0YsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQ3JDLENBQUE7SUFDRixDQUFDO0lBRUQsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUE7QUFDdkMsQ0FBQztBQUVELE1BQU0sVUFBVSw4QkFBOEI7SUFDN0MsT0FBTyxTQUFTLENBQUE7QUFDakIsQ0FBQyJ9