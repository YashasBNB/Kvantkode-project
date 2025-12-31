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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL25vZGUvaWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3RDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2xFLE9BQU8sS0FBSyxJQUFJLE1BQU0sbUJBQW1CLENBQUE7QUFDekMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQ3hDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUVqRCwyR0FBMkc7QUFDM0cseUVBQXlFO0FBQ3pFLHlEQUF5RDtBQUN6RCw2REFBNkQ7QUFDN0QsMEJBQTBCO0FBQzFCLHVCQUF1QjtBQUN2QixxQkFBcUI7QUFDckIscUJBQXFCO0FBQ3JCLHNCQUFzQjtBQUN0Qiw4QkFBOEI7QUFDOUIsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQXdCLElBQUksQ0FBQztJQUluRCwyQkFBMkIsQ0FBQyxHQUFXO1FBQzlDLElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsbUJBQW1CLEdBQUcsaUJBQWlCLENBQUMsVUFBVSxFQUFXLENBQUE7WUFFbEUsaUJBQWlCO1lBQ2pCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzlDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzlDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzlDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFH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