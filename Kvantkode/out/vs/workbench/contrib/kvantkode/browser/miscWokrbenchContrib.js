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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzY1dva3JiZW5jaENvbnRyaWIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2t2YW50a29kZS9icm93c2VyL21pc2NXb2tyYmVuY2hDb250cmliLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBRU4sOEJBQThCLEdBRTlCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDekUsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3BELE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRWpFLCtEQUErRDtBQUN4RCxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLFVBQVU7YUFDcEMsT0FBRSxHQUFHLDZDQUE2QyxBQUFoRCxDQUFnRDtJQUVsRSxZQUM2Qyx3QkFBbUQsRUFDN0QsY0FBK0I7UUFFakUsS0FBSyxFQUFFLENBQUE7UUFIcUMsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUEyQjtRQUM3RCxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFHakUsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO0lBQ2xCLENBQUM7SUFFTyxVQUFVO1FBQ2pCLHFGQUFxRjtRQUNyRixNQUFNLHlCQUF5QixHQUFHLDBCQUEwQixDQUFBO1FBQzVELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUM3Qyx5QkFBeUIsb0NBRXpCLENBQUE7UUFDRCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQ3hCLHlCQUF5QixFQUN6QixNQUFNLG1FQUdOLENBQUE7WUFDRCxJQUFJLENBQUMsd0JBQXdCLENBQUMseUJBQXlCLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDNUQsQ0FBQztRQUVELHFFQUFxRTtRQUNyRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUN4QiwyREFBMkQ7WUFDM0QsTUFBTSxZQUFZLEdBQUcsZUFBZSxFQUFFLENBQUE7WUFDdEMscUVBQXFFO1lBQ3JFLFlBQVksQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7O0FBbkNXLHFCQUFxQjtJQUkvQixXQUFBLHlCQUF5QixDQUFBO0lBQ3pCLFdBQUEsZUFBZSxDQUFBO0dBTEwscUJBQXFCLENBb0NqQzs7QUFFRCw4QkFBOEIsQ0FDN0IscUJBQXFCLENBQUMsRUFBRSxFQUN4QixxQkFBcUIsb0NBRXJCLENBQUEifQ==