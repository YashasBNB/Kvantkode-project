/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UserDataSyncMachinesService_1;
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { isAndroid, isChrome, isEdge, isFirefox, isSafari, isWeb, platform, PlatformToString, } from '../../../base/common/platform.js';
import { escapeRegExpCharacters } from '../../../base/common/strings.js';
import { localize } from '../../../nls.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { IProductService } from '../../product/common/productService.js';
import { getServiceMachineId } from '../../externalServices/common/serviceMachineId.js';
import { IStorageService } from '../../storage/common/storage.js';
import { IUserDataSyncLogService, IUserDataSyncStoreService, } from './userDataSync.js';
export const IUserDataSyncMachinesService = createDecorator('IUserDataSyncMachinesService');
const currentMachineNameKey = 'sync.currentMachineName';
const Safari = 'Safari';
const Chrome = 'Chrome';
const Edge = 'Edge';
const Firefox = 'Firefox';
const Android = 'Android';
export function isWebPlatform(platform) {
    switch (platform) {
        case Safari:
        case Chrome:
        case Edge:
        case Firefox:
        case Android:
        case PlatformToString(0 /* Platform.Web */):
            return true;
    }
    return false;
}
function getPlatformName() {
    if (isSafari) {
        return Safari;
    }
    if (isChrome) {
        return Chrome;
    }
    if (isEdge) {
        return Edge;
    }
    if (isFirefox) {
        return Firefox;
    }
    if (isAndroid) {
        return Android;
    }
    return PlatformToString(isWeb ? 0 /* Platform.Web */ : platform);
}
let UserDataSyncMachinesService = class UserDataSyncMachinesService extends Disposable {
    static { UserDataSyncMachinesService_1 = this; }
    static { this.VERSION = 1; }
    static { this.RESOURCE = 'machines'; }
    constructor(environmentService, fileService, storageService, userDataSyncStoreService, logService, productService) {
        super();
        this.storageService = storageService;
        this.userDataSyncStoreService = userDataSyncStoreService;
        this.logService = logService;
        this.productService = productService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.userData = null;
        this.currentMachineIdPromise = getServiceMachineId(environmentService, fileService, storageService);
    }
    async getMachines(manifest) {
        const currentMachineId = await this.currentMachineIdPromise;
        const machineData = await this.readMachinesData(manifest);
        return machineData.machines.map((machine) => ({
            ...machine,
            ...{ isCurrent: machine.id === currentMachineId },
        }));
    }
    async addCurrentMachine(manifest) {
        const currentMachineId = await this.currentMachineIdPromise;
        const machineData = await this.readMachinesData(manifest);
        if (!machineData.machines.some(({ id }) => id === currentMachineId)) {
            machineData.machines.push({
                id: currentMachineId,
                name: this.computeCurrentMachineName(machineData.machines),
                platform: getPlatformName(),
            });
            await this.writeMachinesData(machineData);
        }
    }
    async removeCurrentMachine(manifest) {
        const currentMachineId = await this.currentMachineIdPromise;
        const machineData = await this.readMachinesData(manifest);
        const updatedMachines = machineData.machines.filter(({ id }) => id !== currentMachineId);
        if (updatedMachines.length !== machineData.machines.length) {
            machineData.machines = updatedMachines;
            await this.writeMachinesData(machineData);
        }
    }
    async renameMachine(machineId, name, manifest) {
        const machineData = await this.readMachinesData(manifest);
        const machine = machineData.machines.find(({ id }) => id === machineId);
        if (machine) {
            machine.name = name;
            await this.writeMachinesData(machineData);
            const currentMachineId = await this.currentMachineIdPromise;
            if (machineId === currentMachineId) {
                this.storageService.store(currentMachineNameKey, name, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            }
        }
    }
    async setEnablements(enablements) {
        const machineData = await this.readMachinesData();
        for (const [machineId, enabled] of enablements) {
            const machine = machineData.machines.find((machine) => machine.id === machineId);
            if (machine) {
                machine.disabled = enabled ? undefined : true;
            }
        }
        await this.writeMachinesData(machineData);
    }
    computeCurrentMachineName(machines) {
        const previousName = this.storageService.get(currentMachineNameKey, -1 /* StorageScope.APPLICATION */);
        if (previousName) {
            if (!machines.some((machine) => machine.name === previousName)) {
                return previousName;
            }
            this.storageService.remove(currentMachineNameKey, -1 /* StorageScope.APPLICATION */);
        }
        const namePrefix = `${this.productService.embedderIdentifier ? `${this.productService.embedderIdentifier} - ` : ''}${getPlatformName()} (${this.productService.nameShort})`;
        const nameRegEx = new RegExp(`${escapeRegExpCharacters(namePrefix)}\\s#(\\d+)`);
        let nameIndex = 0;
        for (const machine of machines) {
            const matches = nameRegEx.exec(machine.name);
            const index = matches ? parseInt(matches[1]) : 0;
            nameIndex = index > nameIndex ? index : nameIndex;
        }
        return `${namePrefix} #${nameIndex + 1}`;
    }
    async readMachinesData(manifest) {
        this.userData = await this.readUserData(manifest);
        const machinesData = this.parse(this.userData);
        if (machinesData.version !== UserDataSyncMachinesService_1.VERSION) {
            throw new Error(localize('error incompatible', 'Cannot read machines data as the current version is incompatible. Please update {0} and try again.', this.productService.nameLong));
        }
        return machinesData;
    }
    async writeMachinesData(machinesData) {
        const content = JSON.stringify(machinesData);
        const ref = await this.userDataSyncStoreService.writeResource(UserDataSyncMachinesService_1.RESOURCE, content, this.userData?.ref || null);
        this.userData = { ref, content };
        this._onDidChange.fire();
    }
    async readUserData(manifest) {
        if (this.userData) {
            const latestRef = manifest && manifest.latest
                ? manifest.latest[UserDataSyncMachinesService_1.RESOURCE]
                : undefined;
            // Last time synced resource and latest resource on server are same
            if (this.userData.ref === latestRef) {
                return this.userData;
            }
            // There is no resource on server and last time it was synced with no resource
            if (latestRef === undefined && this.userData.content === null) {
                return this.userData;
            }
        }
        return this.userDataSyncStoreService.readResource(UserDataSyncMachinesService_1.RESOURCE, this.userData);
    }
    parse(userData) {
        if (userData.content !== null) {
            try {
                return JSON.parse(userData.content);
            }
            catch (e) {
                this.logService.error(e);
            }
        }
        return {
            version: UserDataSyncMachinesService_1.VERSION,
            machines: [],
        };
    }
};
UserDataSyncMachinesService = UserDataSyncMachinesService_1 = __decorate([
    __param(0, IEnvironmentService),
    __param(1, IFileService),
    __param(2, IStorageService),
    __param(3, IUserDataSyncStoreService),
    __param(4, IUserDataSyncLogService),
    __param(5, IProductService)
], UserDataSyncMachinesService);
export { UserDataSyncMachinesService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jTWFjaGluZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vdXNlckRhdGFTeW5jTWFjaGluZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUNOLFNBQVMsRUFDVCxRQUFRLEVBQ1IsTUFBTSxFQUNOLFNBQVMsRUFDVCxRQUFRLEVBQ1IsS0FBSyxFQUVMLFFBQVEsRUFDUixnQkFBZ0IsR0FDaEIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDeEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RixPQUFPLEVBR04sdUJBQXVCLEVBQ3ZCLHlCQUF5QixHQUN6QixNQUFNLG1CQUFtQixDQUFBO0FBZ0IxQixNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxlQUFlLENB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