/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DynamicListEventMultiplexer, Event, EventMultiplexer, } from '../../../../base/common/event.js';
import { DisposableMap, DisposableStore } from '../../../../base/common/lifecycle.js';
export function createInstanceCapabilityEventMultiplexer(currentInstances, onAddInstance, onRemoveInstance, capabilityId, getEvent) {
    const store = new DisposableStore();
    const multiplexer = store.add(new EventMultiplexer());
    const capabilityListeners = store.add(new DisposableMap());
    function addCapability(instance, capability) {
        const listener = multiplexer.add(Event.map(getEvent(capability), (data) => ({ instance, data })));
        let instanceCapabilityListeners = capabilityListeners.get(instance.instanceId);
        if (!instanceCapabilityListeners) {
            instanceCapabilityListeners = new DisposableMap();
            capabilityListeners.set(instance.instanceId, instanceCapabilityListeners);
        }
        instanceCapabilityListeners.set(capability, listener);
    }
    // Existing instances
    for (const instance of currentInstances) {
        const capability = instance.capabilities.get(capabilityId);
        if (capability) {
            addCapability(instance, capability);
        }
    }
    // Removed instances
    store.add(onRemoveInstance((instance) => {
        capabilityListeners.deleteAndDispose(instance.instanceId);
    }));
    // Added capabilities
    const addCapabilityMultiplexer = store.add(new DynamicListEventMultiplexer(currentInstances, onAddInstance, onRemoveInstance, (instance) => Event.map(instance.capabilities.onDidAddCapability, (changeEvent) => ({
        instance,
        changeEvent,
    }))));
    store.add(addCapabilityMultiplexer.event((e) => {
        if (e.changeEvent.id === capabilityId) {
            addCapability(e.instance, e.changeEvent.capability);
        }
    }));
    // Removed capabilities
    const removeCapabilityMultiplexer = store.add(new DynamicListEventMultiplexer(currentInstances, onAddInstance, onRemoveInstance, (instance) => Event.map(instance.capabilities.onDidRemoveCapability, (changeEvent) => ({
        instance,
        changeEvent,
    }))));
    store.add(removeCapabilityMultiplexer.event((e) => {
        if (e.changeEvent.id === capabilityId) {
            capabilityListeners.get(e.instance.instanceId)?.deleteAndDispose(e.changeEvent.id);
        }
    }));
    return {
        dispose: () => store.dispose(),
        event: multiplexer.event,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFdmVudHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsRXZlbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFDTiwyQkFBMkIsRUFDM0IsS0FBSyxFQUNMLGdCQUFnQixHQUVoQixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFNbEcsTUFBTSxVQUFVLHdDQUF3QyxDQUN2RCxnQkFBcUMsRUFDckMsYUFBdUMsRUFDdkMsZ0JBQTBDLEVBQzFDLFlBQWUsRUFDZixRQUFpRTtJQUVqRSxNQUFNLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBQ25DLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxnQkFBZ0IsRUFBNEMsQ0FBQyxDQUFBO0lBQy9GLE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FDcEMsSUFBSSxhQUFhLEVBQXFFLENBQ3RGLENBQUE7SUFFRCxTQUFTLGFBQWEsQ0FBQyxRQUEyQixFQUFFLFVBQXlDO1FBQzVGLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQy9CLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FDL0QsQ0FBQTtRQUNELElBQUksMkJBQTJCLEdBQUcsbUJBQW1CLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUM5RSxJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQztZQUNs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