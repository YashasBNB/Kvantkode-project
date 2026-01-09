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
