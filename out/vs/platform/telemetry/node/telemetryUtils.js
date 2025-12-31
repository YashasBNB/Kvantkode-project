/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isMacintosh } from '../../../base/common/platform.js';
import { getMachineId, getSqmMachineId, getdevDeviceId } from '../../../base/node/id.js';
import { machineIdKey, sqmIdKey, devDeviceIdKey } from '../common/telemetry.js';
export async function resolveMachineId(stateService, logService) {
    // We cache the machineId for faster lookups
    // and resolve it only once initially if not cached or we need to replace the macOS iBridge device
    let machineId = stateService.getItem(machineIdKey);
    if (typeof machineId !== 'string' ||
        (isMacintosh &&
            machineId === '6c9d2bc8f91b89624add29c0abeae7fb42bf539fa1cdb2e3e57cd668fa9bcead')) {
        machineId = await getMachineId(logService.error.bind(logService));
    }
    return machineId;
}
export async function resolveSqmId(stateService, logService) {
    let sqmId = stateService.getItem(sqmIdKey);
    if (typeof sqmId !== 'string') {
        sqmId = await getSqmMachineId(logService.error.bind(logService));
    }
    return sqmId;
}
export async function resolvedevDeviceId(stateService, logService) {
    let devDeviceId = stateService.getItem(devDeviceIdKey);
    if (typeof devDeviceId !== 'string') {
        devDeviceId = await getdevDeviceId(logService.error.bind(logService));
    }
    return devDeviceId;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZWxlbWV0cnkvbm9kZS90ZWxlbWV0cnlVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFHeEYsT0FBTyxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFL0UsTUFBTSxDQUFDLEtBQUssVUFBVSxnQkFBZ0IsQ0FDckMsWUFBK0IsRUFDL0IsVUFBdUI7SUFFdkIsNENBQTRDO0lBQzVDLGtHQUFrRztJQUNsRyxJQUFJLFNBQVMsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFTLFlBQVksQ0FBQyxDQUFBO0lBQzFELElBQ0MsT0FBTyxTQUFTLEtBQUssUUFBUTtRQUM3QixDQUFDLFdBQVc7WUFDWCxTQUFTLEtBQUssa0VBQWtFLENBQUMsRUFDakYsQ0FBQztRQUNGLFNBQVMsR0FBRyxNQUFNLFlBQVksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO0lBQ2xFLENBQUM7SUFFRCxPQUFPLFNBQVMsQ0FBQTtBQUNqQixDQUFDO0FBRUQsTUFBTSxDQUFDLEtBQUssVUFBVSxZQUFZLENBQ2pDLFlBQStCLEVBQy9CLFVBQXVCO0lBRXZCLElBQUksS0FBSyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQVMsUUFBUSxDQUFDLENBQUE7SUFDbEQsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUMvQixLQUFLLEdBQUcsTUFBTSxlQUFlLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtJQUNqRSxDQUFDO0lBRUQsT0FBTyxLQUFLLENBQUE7QUFDYixDQUFDO0FBRUQsTUFBTSxDQUFDLEtBQUssVUFBVSxrQkFBa0IsQ0FDdkMsWUFBK0IsRUFDL0IsVUFBdUI7SUFFdkIsSUFBSSxXQUFXLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBUyxjQUFjLENBQUMsQ0FBQTtJQUM5RCxJQUFJLE9BQU8sV0FBVyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3JDLFdBQVcsR0FBRyxNQUFNLGNBQWMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO0lBQ3RFLENBQUM7SUFFRCxPQUFPLFdBQVcsQ0FBQTtBQUNuQixDQUFDIn0=