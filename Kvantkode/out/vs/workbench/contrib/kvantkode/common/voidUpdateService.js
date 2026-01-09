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
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
export const IVoidUpdateService = createDecorator('VoidUpdateService');
// implemented by calling channel
let VoidUpdateService = class VoidUpdateService {
    constructor(mainProcessService) {
        // anything transmitted over a channel must be async even if it looks like it doesn't have to be
        this.check = async (explicit) => {
            const res = await this.voidUpdateService.check(explicit);
            return res;
        };
        // creates an IPC proxy to use metricsMainService.ts
        this.voidUpdateService = ProxyChannel.toService(mainProcessService.getChannel('void-channel-update'));
    }
};
VoidUpdateService = __decorate([
    __param(0, IMainProcessService)
], VoidUpdateService);
export { VoidUpdateService };
registerSingleton(IVoidUpdateService, VoidUpdateService, 0 /* InstantiationType.Eager */);
