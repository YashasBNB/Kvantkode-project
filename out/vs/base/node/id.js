/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { networkInterfaces } from 'os';
import { TernarySearchTree } from '../common/ternarySearchTree.js';
import * as uuid from '../common/uuid.js';
import { getMac } from './macAddress.js';
import { isWindows } from '../common/platform.js';
// http://www.techrepublic.com/blog/data-center/mac-address-scorecard-for-common-virtual-machine-platforms/
// VMware ESX 3, Server, Workstation, Player	00-50-56, 00-0C-29, 00-05-69
// Microsoft Hyper-V, Virtual Server, Virtual PC	00-03-FF
// Parallels Desktop, Workstation, Server, Virtuozzo	00-1C-42
// Virtual Iron 4	00-0F-4B
// Red Hat Xen	00-16-3E
// Oracle VM	00-16-3E
// XenSource	00-16-3E
// Novell Xen	00-16-3E
// Sun xVM VirtualBox	08-00-27
export const virtualMachineHint = new (class {
    _isVirtualMachineMacAddress(mac) {
        if (!this._virtualMachineOUIs) {
            this._virtualMachineOUIs = TernarySearchTree.forStrings();
            // dash-separated
            this._virtualMachineOUIs.set('00-50-56', true);
            this._virtualMachineOUIs.set('00-0C-29', true);
            this._virtualMachineOUIs.set('00-05-69', true);
            this._virtualMachineOUIs.set('00-03-FF', true);
            this._virtualMachineOUIs.set('00-1C-42', true);
            this._virtualMachineOUIs.set('00-16-3E', true);
            this._virtualMachineOUIs.set('08-00-27', true);
            // colon-separated
            this._virtualMachineOUIs.set('00:50:56', true);
            this._virtualMachineOUIs.set('00:0C:29', true);
            this._virtualMachineOUIs.set('00:05:69', true);
            this._virtualMachineOUIs.set('00:03:FF', true);
            this._virtualMachineOUIs.set('00:1C:42', true);
            this._virtualMachineOUIs.set('00:16:3E', true);
            this._virtualMachineOUIs.set('08:00:27', true);
        }
        return !!this._virtualMachineOUIs.findSubstr(mac);
    }
    value() {
        if (this._value === undefined) {
            let vmOui = 0;
            let interfaceCount = 0;
            const interfaces = networkInterfaces();
            for (const name in interfaces) {
                const networkInterface = interfaces[name];
                if (networkInterface) {
                    for (const { mac, internal } of networkInterface) {
                        if (!internal) {
                            interfaceCount += 1;
                            if (this._isVirtualMachineMacAddress(mac.toUpperCase())) {
                                vmOui += 1;
                            }
                        }
                    }
                }
            }
            this._value = interfaceCount > 0 ? vmOui / interfaceCount : 0;
        }
        return this._value;
    }
})();
let machineId;
export async function getMachineId(errorLogger) {
    if (!machineId) {
        machineId = (async () => {
            const id = await getMacMachineId(errorLogger);
            return id || uuid.generateUuid(); // fallback, generate a UUID
        })();
    }
    return machineId;
}
async function getMacMachineId(errorLogger) {
    try {
        const crypto = await import('crypto');
        const macAddress = getMac();
        return crypto.createHash('sha256').update(macAddress, 'utf8').digest('hex');
    }
    catch (err) {
        errorLogger(err);
        return undefined;
    }
}
const SQM_KEY = 'Software\\Microsoft\\SQMClient';
export async function getSqmMachineId(errorLogger) {
    if (isWindows) {
        const Registry = await import('@vscode/windows-registry');
        try {
            return Registry.GetStringRegKey('HKEY_LOCAL_MACHINE', SQM_KEY, 'MachineId') || '';
        }
        catch (err) {
            errorLogger(err);
            return '';
        }
    }
    return '';
}
export async function getdevDeviceId(errorLogger) {
    try {
        const deviceIdPackage = await import('@vscode/deviceid');
        const id = await deviceIdPackage.getDeviceId();
        return id;
    }
    catch (err) {
        errorLogger(err);
        return uuid.generateUuid();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2Uvbm9kZS9pZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDdEMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbEUsT0FBTyxLQUFLLElBQUksTUFBTSxtQkFBbUIsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDeEMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRWpELDJHQUEyRztBQUMzRyx5RUFBeUU7QUFDekUseURBQXlEO0FBQ3pELDZEQUE2RDtBQUM3RCwwQkFBMEI7QUFDMUIsdUJBQXVCO0FBQ3ZCLHFCQUFxQjtBQUNyQixxQkFBcUI7QUFDckIsc0JBQXNCO0FBQ3RCLDhCQUE4QjtBQUM5QixNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBd0IsSUFBSSxDQUFDO0lBSW5ELDJCQUEyQixDQUFDLEdBQVc7UUFDOUMsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxpQkFBaUIsQ0FBQyxVQUFVLEVBQVcsQ0FBQTtZQUVsRSxpQkFBaUI7WUFDakIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDOUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDOUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDOUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDOUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDOUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDOUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFFOUMsa0JBQWtCO1lBQ2xCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzlDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzlDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzlDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzlDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzlDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzlDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQy9DLENBQUM7UUFDRCxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQy9CLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQTtZQUNiLElBQUksY0FBYyxHQUFHLENBQUMsQ0FBQTtZQUV0QixNQUFNLFVBQVUsR0FBRyxpQkFBaUIsRUFBRSxDQUFBO1lBQ3RDLEtBQUssTUFBTSxJQUFJLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQy9CLE1BQU0sZ0JBQWdCLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUN6QyxJQUFJLGdCQUFnQixFQUFFLENBQUM7b0JBQ3RCLEtBQUssTUFBTSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO3dCQUNsRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7NEJBQ2YsY0FBYyxJQUFJLENBQUMsQ0FBQTs0QkFDbkIsSUFBSSxJQUFJLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQztnQ0FDekQsS0FBSyxJQUFJLENBQUMsQ0FBQTs0QkFDWCxDQUFDO3dCQUNGLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzlELENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDbkIsQ0FBQztDQUNELENBQUMsRUFBRSxDQUFBO0FBRUosSUFBSSxTQUEwQixDQUFBO0FBQzlCLE1BQU0sQ0FBQyxLQUFLLFVBQVUsWUFBWSxDQUFDLFdBQWlDO0lBQ25FLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNoQixTQUFTLEdBQUcsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUN2QixNQUFNLEVBQUUsR0FBRyxNQUFNLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUU3QyxPQUFPLEVBQUUsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUEsQ0FBQyw0QkFBNEI7UUFDOUQsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtJQUNMLENBQUM7SUFFRCxPQUFPLFNBQVMsQ0FBQTtBQUNqQixDQUFDO0FBRUQsS0FBSyxVQUFVLGVBQWUsQ0FBQyxXQUFpQztJQUMvRCxJQUFJLENBQUM7UUFDSixNQUFNLE1BQU0sR0FBRyxNQUFNLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNyQyxNQUFNLFVBQVUsR0FBRyxNQUFNLEVBQUUsQ0FBQTtRQUMzQixPQUFPLE1BQU0sQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDNUUsQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDZCxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDaEIsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLE9BQU8sR0FBVyxnQ0FBZ0MsQ0FBQTtBQUN4RCxNQUFNLENBQUMsS0FBSyxVQUFVLGVBQWUsQ0FBQyxXQUFpQztJQUN0RSxJQUFJLFNBQVMsRUFBRSxDQUFDO1FBQ2YsTUFBTSxRQUFRLEdBQUcsTUFBTSxNQUFNLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtRQUN6RCxJQUFJLENBQUM7WUFDSixPQUFPLFFBQVEsQ0FBQyxlQUFlLENBQUMsb0JBQW9CLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNsRixDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNoQixPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxFQUFFLENBQUE7QUFDVixDQUFDO0FBRUQsTUFBTSxDQUFDLEtBQUssVUFBVSxjQUFjLENBQUMsV0FBaUM7SUFDckUsSUFBSSxDQUFDO1FBQ0osTUFBTSxlQUFlLEdBQUcsTUFBTSxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUN4RCxNQUFNLEVBQUUsR0FBRyxNQUFNLGVBQWUsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUM5QyxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO0lBQzNCLENBQUM7QUFDRixDQUFDIn0=