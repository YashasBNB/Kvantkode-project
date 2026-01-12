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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFudGlhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vaW5zdGFudGlhdGlvbi9jb21tb24vaW5zdGFudGlhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU1oRyx1QkFBdUI7QUFFdkIsTUFBTSxLQUFXLEtBQUssQ0FXckI7QUFYRCxXQUFpQixLQUFLO0lBQ1IsZ0JBQVUsR0FBRyxJQUFJLEdBQUcsRUFBa0MsQ0FBQTtJQUV0RCxlQUFTLEdBQUcsWUFBWSxDQUFBO0lBQ3hCLHFCQUFlLEdBQUcsa0JBQWtCLENBQUE7SUFFakQsU0FBZ0Isc0JBQXNCLENBQ3JDLElBQVM7UUFFVCxPQUFPLElBQUksQ0FBQyxNQUFBLGVBQWUsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUNuQyxDQUFDO0lBSmUsNEJBQXNCLHlCQUlyQyxDQUFBO0FBQ0YsQ0FBQyxFQVhnQixLQUFLLEtBQUwsS0FBSyxRQVdyQjtBQWNELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGVBQWUsQ0FBd0Isc0JBQXNCLENBQUMsQ0FBQTtBQTREbkcsU0FBUyxzQkFBc0IsQ0FBQyxFQUFZLEVBQUUsTUFBZ0IsRUFBRSxLQUFhO0lBQzVFLElBQUssTUFBYyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxNQUFNLEVBQUUsQ0FBQztRQUNqRCxDQUFDO1FBQUMsTUFBYyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUM1RCxDQUFDO1NBQU0sQ0FBQztRQUNQLENBQUM7UUFBQyxNQUFjLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FDeEQ7UUFBQyxNQUFjLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFHLE1BQU0sQ0FBQTtJQUMzQyxDQUFDO0FBQ0YsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGVBQWUsQ0FBSSxTQUFpQjtJQUNuRCxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7UUFDckMsT0FBTyxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUUsQ0FBQTtJQUN4QyxDQUFDO0lBRUQsTUFBTSxFQUFFLEdBQVEsVUFBVSxNQUFnQixFQUFFLEdBQVcsRUFBRSxLQUFhO1FBQ3JFLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM1QixNQUFNLElBQUksS0FBSyxDQUFDLGtFQUFrRSxDQUFDLENBQUE7UUFDcEYsQ0FBQztRQUNELHNCQUFzQixDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDMUMsQ0FBQyxDQUFBO0lBRUQsRUFBRSxDQUFDLFFBQVEsR0FBRyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUE7SUFFN0IsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ25DLE9BQU8sRUFBRSxDQUFBO0FBQ1YsQ0FBQztBQUVELE1BQU0sVUFBVSxzQkFBc0IsQ0FDckMsaUJBQXdDO0lBRXhDLE9BQTZCLGlCQUFpQixDQUFBO0FBQy9DLENBQUMifQ==