/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isLinux, isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IEnvironmentMainService } from '../../../../platform/environment/electron-main/environmentMainService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IApplicationStorageMainService } from '../../../../platform/storage/electron-main/storageMainService.js';
import { PostHog } from 'posthog-node';
import { OPT_OUT_KEY } from '../common/storageKeys.js';
const os = isWindows ? 'windows' : isMacintosh ? 'mac' : isLinux ? 'linux' : null;
const _getOSInfo = () => {
    try {
        const { platform, arch } = process; // see platform.ts
        return { platform, arch };
    }
    catch (e) {
        return { osInfo: { platform: '??', arch: '??' } };
    }
};
const osInfo = _getOSInfo();
// we'd like to use devDeviceId on telemetryService, but that gets sanitized by the time it gets here as 'someValue.devDeviceId'
let MetricsMainService = class MetricsMainService extends Disposable {
    // helper - looks like this is stored in a .vscdb file in ~/Library/Application Support/Void
    _memoStorage(key, target, setValIfNotExist) {
        const currVal = this._appStorage.get(key, -1 /* StorageScope.APPLICATION */);
        if (currVal !== undefined)
            return currVal;
        const newVal = setValIfNotExist ?? generateUuid();
        this._appStorage.store(key, newVal, -1 /* StorageScope.APPLICATION */, target);
        return newVal;
    }
    // this is old, eventually we can just delete this since all the keys will have been transferred over
    // returns 'NULL' or the old key
    get oldId() {
        // check new storage key first
        const newKey = 'void.app.oldMachineId';
        const newOldId = this._appStorage.get(newKey, -1 /* StorageScope.APPLICATION */);
        if (newOldId)
            return newOldId;
        // put old key into new key if didn't already
        const oldValue = this._appStorage.get('void.machineId', -1 /* StorageScope.APPLICATION */) ?? 'NULL'; // the old way of getting the key
        this._appStorage.store(newKey, oldValue, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        return oldValue;
        // in a few weeks we can replace above with this
        // private get oldId() {
        // 	return this._memoStorage('void.app.oldMachineId', StorageTarget.MACHINE, 'NULL')
        // }
    }
    // the main id
    get distinctId() {
        const oldId = this.oldId;
        const setValIfNotExist = oldId === 'NULL' ? undefined : oldId;
        return this._memoStorage('void.app.machineId', 1 /* StorageTarget.MACHINE */, setValIfNotExist);
    }
    // just to see if there are ever multiple machineIDs per userID (instead of this, we should just track by the user's email)
    get userId() {
        return this._memoStorage('void.app.userMachineId', 0 /* StorageTarget.USER */);
    }
    constructor(_productService, _envMainService, _appStorage) {
        super();
        this._productService = _productService;
        this._envMainService = _envMainService;
        this._appStorage = _appStorage;
        this._initProperties = {};
        this.capture = (event, params) => {
            const capture = { distinctId: this.distinctId, event, properties: params };
            // console.log('full capture:', this.distinctId)
            this.client.capture(capture);
        };
        this.setOptOut = (newVal) => {
            if (newVal) {
                this._appStorage.store(OPT_OUT_KEY, 'true', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            }
            else {
                this._appStorage.remove(OPT_OUT_KEY, -1 /* StorageScope.APPLICATION */);
            }
        };
        this.client = new PostHog('phc_UanIdujHiLp55BkUTjB1AuBXcasVkdqRwgnwRlWESH2', {
            host: 'https://us.i.posthog.com',
        });
        this.initialize(); // async
    }
    async initialize() {
        // very important to await whenReady!
        await this._appStorage.whenReady;
        const { commit, version, voidVersion, release, quality } = this._productService;
        const isDevMode = !this._envMainService.isBuilt; // found in abstractUpdateService.ts
        // custom properties we identify
        this._initProperties = {
            commit,
            vscodeVersion: version,
            voidVersion: voidVersion,
            release,
            os,
            quality,
            distinctId: this.distinctId,
            distinctIdUser: this.userId,
            oldId: this.oldId,
            isDevMode,
            ...osInfo,
        };
        const identifyMessage = {
            distinctId: this.distinctId,
            properties: this._initProperties,
        };
        const didOptOut = this._appStorage.getBoolean(OPT_OUT_KEY, -1 /* StorageScope.APPLICATION */, false);
        console.log('User is opted out of basic Void metrics?', didOptOut);
        if (didOptOut) {
            this.client.optOut();
        }
        else {
            this.client.optIn();
            this.client.identify(identifyMessage);
        }
        console.log('Void posthog metrics info:', JSON.stringify(identifyMessage, null, 2));
    }
    async getDebuggingProperties() {
        return this._initProperties;
    }
};
MetricsMainService = __decorate([
    __param(0, IProductService),
    __param(1, IEnvironmentMainService),
    __param(2, IApplicationStorageMainService)
], MetricsMainService);
export { MetricsMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0cmljc01haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2VsZWN0cm9uLW1haW4vbWV0cmljc01haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNyRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMEVBQTBFLENBQUE7QUFDbEgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBRXZGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBR2pILE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDdEMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRXRELE1BQU0sRUFBRSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtBQUNqRixNQUFNLFVBQVUsR0FBRyxHQUFHLEVBQUU7SUFDdkIsSUFBSSxDQUFDO1FBQ0osTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUEsQ0FBQyxrQkFBa0I7UUFDckQsT0FBTyxFQUFFLFFBQVEsRUFB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