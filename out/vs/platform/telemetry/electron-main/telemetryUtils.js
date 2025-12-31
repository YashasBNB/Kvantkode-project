/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getdevDeviceId } from '../../../base/node/id.js';
import { machineIdKey, sqmIdKey, devDeviceIdKey } from '../common/telemetry.js';
import { resolveMachineId as resolveNodeMachineId, resolveSqmId as resolveNodeSqmId, resolvedevDeviceId as resolveNodedevDeviceId, } from '../node/telemetryUtils.js';
export async function resolveMachineId(stateService, logService) {
    // Call the node layers implementation to avoid code duplication
    const machineId = await resolveNodeMachineId(stateService, logService);
    stateService.setItem(machineIdKey, machineId);
    return machineId;
}
export async function resolveSqmId(stateService, logService) {
    const sqmId = await resolveNodeSqmId(stateService, logService);
    stateService.setItem(sqmIdKey, sqmId);
    return sqmId;
}
export async function resolvedevDeviceId(stateService, logService) {
    const devDeviceId = await resolveNodedevDeviceId(stateService, logService);
    stateService.setItem(devDeviceIdKey, devDeviceId);
    return devDeviceId;
}
export async function validatedevDeviceId(stateService, logService) {
    const actualDeviceId = await getdevDeviceId(logService.error.bind(logService));
    const currentDeviceId = await resolveNodedevDeviceId(stateService, logService);
    if (actualDeviceId !== currentDeviceId) {
        stateService.setItem(devDeviceIdKey, actualDeviceId);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZWxlbWV0cnkvZWxlY3Ryb24tbWFpbi90ZWxlbWV0cnlVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFHekQsT0FBTyxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDL0UsT0FBTyxFQUNOLGdCQUFnQixJQUFJLG9CQUFvQixFQUN4QyxZQUFZLElBQUksZ0JBQWdCLEVBQ2hDLGtCQUFrQixJQUFJLHNCQUFzQixHQUM1QyxNQUFNLDJCQUEyQixDQUFBO0FBRWxDLE1BQU0sQ0FBQyxLQUFLLFVBQVUsZ0JBQWdCLENBQ3JDLFlBQTJCLEVBQzNCLFVBQXVCO0lBRXZCLGdFQUFnRTtJQUNoRSxNQUFNLFNBQVMsR0FBRyxNQUFNLG9CQUFvQixDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUN0RSxZQUFZLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUM3QyxPQUFPLFNBQVMsQ0FBQTtBQUNqQixDQUFDO0FBRUQsTUFBTSxDQUFDLEtBQUssVUFBVSxZQUFZLENBQ2pDLFlBQTJCLEVBQzNCLFVBQXVCO0lBRXZCLE1BQU0sS0FBSyxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQzlELFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3JDLE9BQU8sS0FBSyxDQUFBO0FBQ2IsQ0FBQztBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsa0JBQWtCLENBQ3ZDLFlBQTJCLEVBQzNCLFVBQXVCO0lBRXZCLE1BQU0sV0FBVyxHQUFHLE1BQU0sc0JBQXNCLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQzFFLFlBQVksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQ2pELE9BQU8sV0FBVyxDQUFBO0FBQ25CLENBQUM7QUFFRCxNQUFNLENBQUMsS0FBSyxVQUFVLG1CQUFtQixDQUN4QyxZQUEyQixFQUMzQixVQUF1QjtJQUV2QixNQUFNLGNBQWMsR0FBRyxNQUFNLGNBQWMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO0lBQzlFLE1BQU0sZUFBZSxHQUFHLE1BQU0sc0JBQXNCLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQzlFLElBQUksY0FBYyxLQUFLLGVBQWUsRUFBRSxDQUFDO1FBQ3hDLFlBQVksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFBO0lBQ3JELENBQUM7QUFDRixDQUFDIn0=