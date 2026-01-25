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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFdmVudHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxFdmVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUNOLDJCQUEyQixFQUMzQixLQUFLLEVBQ0wsZ0JBQWdCLEdBRWhCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQU1sRyxNQUFNLFVBQVUsd0NBQXdDLENBQ3ZELGdCQUFxQyxFQUNyQyxhQUF1QyxFQUN2QyxnQkFBMEMsRUFDMUMsWUFBZSxFQUNmLFFBQWlFO0lBRWpFLE1BQU0sS0FBSyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFDbkMsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGdCQUFnQixFQUE0QyxDQUFDLENBQUE7SUFDL0YsTUFBTSxtQkFBbUIsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUNwQyxJQUFJLGFBQWEsRUFBcUUsQ0FDdEYsQ0FBQTtJQUVELFNBQVMsYUFBYSxDQUFDLFFBQTJCLEVBQUUsVUFBeUM7UUFDNUYsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDL0IsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUMvRCxDQUFBO1FBQ0QsSUFBSSwyQkFBMkIsR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzlFLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFD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