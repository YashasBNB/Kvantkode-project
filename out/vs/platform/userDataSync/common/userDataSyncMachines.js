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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jTWFjaGluZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL3VzZXJEYXRhU3luY01hY2hpbmVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFDTixTQUFTLEVBQ1QsUUFBUSxFQUNSLE1BQU0sRUFDTixTQUFTLEVBQ1QsUUFBUSxFQUNSLEtBQUssRUFFTCxRQUFRLEVBQ1IsZ0JBQWdCLEdBQ2hCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0saUNBQWlDLENBQUE7QUFDOUYsT0FBTyxFQUdOLHVCQUF1QixFQUN2Qix5QkFBeUIsR0FDekIsTUFBTSxtQkFBbUIsQ0FBQTtBQWdCMUIsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsZUFBZSxDQUMxRCw4QkFBOEIsQ0FDOUIsQ0FBQTtB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