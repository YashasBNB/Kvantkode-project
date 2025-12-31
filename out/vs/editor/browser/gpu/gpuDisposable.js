/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isFunction } from '../../../base/common/types.js';
export var GPULifecycle;
(function (GPULifecycle) {
    async function requestDevice(fallback) {
        try {
            if (!navigator.gpu) {
                throw new Error('This browser does not support WebGPU');
            }
            const adapter = (await navigator.gpu.requestAdapter());
            if (!adapter) {
                throw new Error('This browser supports WebGPU but it appears to be disabled');
            }
            return wrapDestroyableInDisposable(await adapter.requestDevice());
        }
        catch (e) {
            if (fallback) {
                fallback(e.message);
            }
            throw e;
        }
    }
    GPULifecycle.requestDevice = requestDevice;
    function createBuffer(device, descriptor, initialValues) {
        const buffer = device.createBuffer(descriptor);
        if (initialValues) {
            device.queue.writeBuffer(buffer, 0, isFunction(initialValues) ? initialValues() : initialValues);
        }
        return wrapDestroyableInDisposable(buffer);
    }
    GPULifecycle.createBuffer = createBuffer;
    function createTexture(device, descriptor) {
        return wrapDestroyableInDisposable(device.createTexture(descriptor));
    }
    GPULifecycle.createTexture = createTexture;
})(GPULifecycle || (GPULifecycle = {}));
function wrapDestroyableInDisposable(value) {
    return {
        object: value,
        dispose: () => value.destroy(),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3B1RGlzcG9zYWJsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2dwdS9ncHVEaXNwb3NhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUUxRCxNQUFNLEtBQVcsWUFBWSxDQTJDNUI7QUEzQ0QsV0FBaUIsWUFBWTtJQUNyQixLQUFLLFVBQVUsYUFBYSxDQUNsQyxRQUFvQztRQUVwQyxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLHNDQUFzQyxDQUFDLENBQUE7WUFDeEQsQ0FBQztZQUNELE1BQU0sT0FBTyxHQUFHLENBQUMsTUFBTSxTQUFTLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFFLENBQUE7WUFDdkQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsNERBQTRELENBQUMsQ0FBQTtZQUM5RSxDQUFDO1lBQ0QsT0FBTywyQkFBMkIsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFBO1FBQ2xFLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3BCLENBQUM7WUFDRCxNQUFNLENBQUMsQ0FBQTtRQUNSLENBQUM7SUFDRixDQUFDO0lBbEJxQiwwQkFBYSxnQkFrQmxDLENBQUE7SUFFRCxTQUFnQixZQUFZLENBQzNCLE1BQWlCLEVBQ2pCLFVBQStCLEVBQy9CLGFBQW1EO1FBRW5ELE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDOUMsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNuQixNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FDdkIsTUFBTSxFQUNOLENBQUMsRUFDRCxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQzNELENBQUE7UUFDRixDQUFDO1FBQ0QsT0FBTywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBZGUseUJBQVksZUFjM0IsQ0FBQTtJQUVELFNBQWdCLGFBQWEsQ0FDNUIsTUFBaUIsRUFDakIsVUFBZ0M7UUFFaEMsT0FBTywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7SUFDckUsQ0FBQztJQUxlLDBCQUFhLGdCQUs1QixDQUFBO0FBQ0YsQ0FBQyxFQTNDZ0IsWUFBWSxLQUFaLFlBQVksUUEyQzVCO0FBRUQsU0FBUywyQkFBMkIsQ0FBZ0MsS0FBUTtJQUMzRSxPQUFPO1FBQ04sTUFBTSxFQUFFLEtBQUs7UUFDYixPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRTtLQUM5QixDQUFBO0FBQ0YsQ0FBQyJ9