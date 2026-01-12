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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RlbGVtZXRyeS9ub2RlL3RlbGVtZXRyeVV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxjQUFjLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUd4RixPQUFPLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxjQUFjLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUUvRSxNQUFNLENBQUMsS0FBSyxVQUFVLGdCQUFnQixDQUNyQyxZQUErQixFQUMvQixVQUF1QjtJQUV2Qiw0Q0FBNEM7SUFDNUMsa0dBQWtHO0lBQ2xHLElBQUksU0FBUyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQVMsWUFBWSxDQUFDLENBQUE7SUFDMUQsSUFDQyxPQUFPLFNBQVMsS0FBSyxRQUFRO1FBQzdCLENBQUMsV0FBVztZQUNYLFNBQVMsS0FBSyxrRUFBa0UsQ0FBQyxFQUNqRixDQUFDO1FBQ0YsU0FBUyxHQUFHLE1BQU0sWUFBWSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7SUFDbEUsQ0FBQztJQUVELE9BQU8sU0FBUyxDQUFBO0FBQ2pCLENBQUM7QUFFRCxNQUFNLENBQUMsS0FBSyxVQUFVLFlBQVksQ0FDakMsWUFBK0IsRUFDL0IsVUFBdUI7SUFFdkIsSUFBSSxLQUFLLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBUyxRQUFRLENBQUMsQ0FBQTtJQUNsRCxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQy9CLEtBQUssR0FBRyxNQUFNLGVBQWUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO0lBQ2pFLENBQUM7SUFFRCxPQUFPLEtBQUssQ0FBQTtBQUNiLENBQUM7QUFFRCxNQUFNLENBQUMsS0FBSyxVQUFVLGtCQUFrQixDQUN2QyxZQUErQixFQUMvQixVQUF1QjtJQUV2QixJQUFJLFdBQVcsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFTLGNBQWMsQ0FBQyxDQUFBO0lBQzlELElBQUksT0FBTyxXQUFXLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDckMsV0FBVyxHQUFHLE1BQU0sY0FBYyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7SUFDdEUsQ0FBQztJQUVELE9BQU8sV0FBVyxDQUFBO0FBQ25CLENBQUMifQ==