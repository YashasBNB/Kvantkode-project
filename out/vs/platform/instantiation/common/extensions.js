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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2luc3RhbnRpYXRpb24vY29tbW9uL2V4dGVuc2lvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBR2pELE1BQU0sU0FBUyxHQUFvRCxFQUFFLENBQUE7QUFFckUsTUFBTSxDQUFOLElBQWtCLGlCQVlqQjtBQVpELFdBQWtCLGlCQUFpQjtJQUNsQzs7O09BR0c7SUFDSCwyREFBUyxDQUFBO0lBRVQ7OztPQUdHO0lBQ0gsK0RBQVcsQ0FBQTtBQUNaLENBQUMsRUFaaUIsaUJBQWlCLEtBQWpCLGlCQUFpQixRQVlsQztBQVdELE1BQU0sVUFBVSxpQkFBaUIsQ0FDaEMsRUFBd0IsRUFDeEIsZ0JBQTBFLEVBQzFFLDRCQUEwRDtJQUUxRCxJQUFJLENBQUMsQ0FBQyxnQkFBZ0IsWUFBWSxjQUFjLENBQUMsRUFBRSxDQUFDO1FBQ25ELGdCQUFnQixHQUFHLElBQUksY0FBYyxDQUNwQyxnQkFBNkMsRUFDN0MsRUFBRSxFQUNGLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUNyQyxDQUFBO0lBQ0YsQ0FBQztJQUVELFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO0FBQ3ZDLENBQUM7QUFFRCxNQUFNLFVBQVUsOEJBQThCO0lBQzdDLE9BQU8sU0FBUyxDQUFBO0FBQ2pCLENBQUMifQ==