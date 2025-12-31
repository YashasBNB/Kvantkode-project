/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// ------ internal util
export var _util;
(function (_util) {
    _util.serviceIds = new Map();
    _util.DI_TARGET = '$di$target';
    _util.DI_DEPENDENCIES = '$di$dependencies';
    function getServiceDependencies(ctor) {
        return ctor[_util.DI_DEPENDENCIES] || [];
    }
    _util.getServiceDependencies = getServiceDependencies;
})(_util || (_util = {}));
export const IInstantiationService = createDecorator('instantiationService');
function storeServiceDependency(id, target, index) {
    if (target[_util.DI_TARGET] === target) {
        ;
        target[_util.DI_DEPENDENCIES].push({ id, index });
    }
    else {
        ;
        target[_util.DI_DEPENDENCIES] = [{ id, index }];
        target[_util.DI_TARGET] = target;
    }
}
/**
 * The *only* valid way to create a {{ServiceIdentifier}}.
 */
export function createDecorator(serviceId) {
    if (_util.serviceIds.has(serviceId)) {
        return _util.serviceIds.get(serviceId);
    }
    const id = function (target, key, index) {
        if (arguments.length !== 3) {
            throw new Error('@IServiceName-decorator can only be used to decorate a parameter');
        }
        storeServiceDependency(id, target, index);
    };
    id.toString = () => serviceId;
    _util.serviceIds.set(serviceId, id);
    return id;
}
export function refineServiceDecorator(serviceIdentifier) {
    return serviceIdentifier;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFudGlhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2luc3RhbnRpYXRpb24vY29tbW9uL2luc3RhbnRpYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsdUJBQXVCO0FBRXZCLE1BQU0sS0FBVyxLQUFLLENBV3JCO0FBWEQsV0FBaUIsS0FBSztJQUNSLGdCQUFVLEdBQUcsSUFBSSxHQUFHLEVBQWtDLENBQUE7SUFFdEQsZUFBUyxHQUFHLFlBQVksQ0FBQTtJQUN4QixxQkFBZSxHQUFHLGtCQUFrQixDQUFBO0lBRWpELFNBQWdCLHNCQUFzQixDQUNyQyxJQUFTO1FBRVQsT0FBTyxJQUFJLENBQUMsTUFBQSxlQUFlLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDbkMsQ0FBQztJQUplLDRCQUFzQix5QkFJckMsQ0FBQTtBQUNGLENBQUMsRUFYZ0IsS0FBSyxLQUFMLEtBQUssUUFXckI7QUFjRCxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxlQUFlLENBQXdCLHNCQUFzQixDQUFDLENBQUE7QUE0RG5HLFNBQVMsc0JBQXNCLENBQUMsRUFBWSxFQUFFLE1BQWdCLEVBQUUsS0FBYTtJQUM1RSxJQUFLLE1BQWMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssTUFBTSxFQUFFLENBQUM7UUFDakQsQ0FBQztRQUFDLE1BQWMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDNUQsQ0FBQztTQUFNLENBQUM7UUFDUCxDQUFDO1FBQUMsTUFBYyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQ3hEO1FBQUMsTUFBYyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxNQUFNLENBQUE7SUFDM0MsQ0FBQztBQUNGLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxlQUFlLENBQUksU0FBaUI7SUFDbkQsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1FBQ3JDLE9BQU8sS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFFLENBQUE7SUFDeEMsQ0FBQztJQUVELE1BQU0sRUFBRSxHQUFRLFVBQVUsTUFBZ0IsRUFBRSxHQUFXLEVBQUUsS0FBYTtRQUNyRSxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDNUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxrRUFBa0UsQ0FBQyxDQUFBO1FBQ3BGLENBQUM7UUFDRCxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzFDLENBQUMsQ0FBQTtJQUVELEVBQUUsQ0FBQyxRQUFRLEdBQUcsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFBO0lBRTdCLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUNuQyxPQUFPLEVBQUUsQ0FBQTtBQUNWLENBQUM7QUFFRCxNQUFNLFVBQVUsc0JBQXNCLENBQ3JDLGlCQUF3QztJQUV4QyxPQUE2QixpQkFBaUIsQ0FBQTtBQUMvQyxDQUFDIn0=