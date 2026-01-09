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
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { IExtensionTransferService } from './extensionTransferService.js';
import { os } from '../common/helpers/systemInfo.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { timeout } from '../../../../base/common/async.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
// Onboarding contribution that mounts the component at startup
let MiscWorkbenchContribs = class MiscWorkbenchContribs extends Disposable {
    static { this.ID = 'workbench.contrib.voidMiscWorkbenchContribs'; }
    constructor(extensionTransferService, storageService) {
        super();
        this.extensionTransferService = extensionTransferService;
        this.storageService = storageService;
        this.initialize();
    }
    initialize() {
        // delete blacklisted extensions once (this is for people who already installed them)
        const deleteExtensionsStorageId = 'void-deleted-blacklist-2';
        const alreadyDeleted = this.storageService.get(deleteExtensionsStorageId, -1 /* StorageScope.APPLICATION */);
        if (!alreadyDeleted) {
            this.storageService.store(deleteExtensionsStorageId, 'true', -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            this.extensionTransferService.deleteBlacklistExtensions(os);
        }
        // after some time, trigger a resize event for the blank screen error
        timeout(5_000).then(() => {
            // Get the active window reference for multi-window support
            const targetWindow = getActiveWindow();
            // Trigger a window resize event to ensure proper layout calculations
            targetWindow.dispatchEvent(new Event('resize'));
        });
    }
};
MiscWorkbenchContribs = __decorate([
    __param(0, IExtensionTransferService),
    __param(1, IStorageService)
], MiscWorkbenchContribs);
export { MiscWorkbenchContribs };
registerWorkbenchContribution2(MiscWorkbenchContribs.ID, MiscWorkbenchContribs, 4 /* WorkbenchPhase.Eventually */);
