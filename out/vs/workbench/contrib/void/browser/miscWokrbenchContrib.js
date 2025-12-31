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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzY1dva3JiZW5jaENvbnRyaWIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvbWlzY1dva3JiZW5jaENvbnRyaWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFFTiw4QkFBOEIsR0FFOUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDcEQsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFakUsK0RBQStEO0FBQ3hELElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsVUFBVTthQUNwQyxPQUFFLEdBQUcsNkNBQTZDLEFBQWhELENBQWdEO0lBRWxFLFlBQzZDLHdCQUFtRCxFQUM3RCxjQUErQjtRQUVqRSxLQUFLLEVBQUUsQ0FBQTtRQUhxQyw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTJCO1FBQzdELG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUdqRSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7SUFDbEIsQ0FBQztJQUVPLFVBQVU7UUFDakIscUZBQXFGO1FBQ3JGLE1BQU0seUJBQXlCLEdBQUcsMEJBQTBCLENBQUE7UUFDNUQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQzdDLHlCQUF5QixvQ0FFekIsQ0FBQTtRQUNELElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FDeEIseUJBQXlCLEVBQ3pCLE1BQU0sbUVBR04sQ0FBQTtZQUNELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUM1RCxDQUFDO1FBRUQscUVBQXFFO1FBQ3JFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ3hCLDJEQUEyRDtZQUMzRCxNQUFNLFlBQVksR0FBRyxlQUFlLEVBQUUsQ0FBQTtZQUN0QyxxRUFBcUU7WUFDckUsWUFBWSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQ2hELENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQzs7QUFuQ1cscUJBQXFCO0lBSS9CLFdBQUEseUJBQXlCLENBQUE7SUFDekIsV0FBQSxlQUFlLENBQUE7R0FMTCxxQkFBcUIsQ0FvQ2pDOztBQUVELDhCQUE4QixDQUM3QixxQkFBcUIsQ0FBQyxFQUFFLEVBQ3hCLHFCQUFxQixvQ0FFckIsQ0FBQSJ9