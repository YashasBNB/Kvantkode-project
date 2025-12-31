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
import { createDecorator, IInstantiationService } from '../../instantiation/common/instantiation.js';
import { ILifecycleMainService, } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { Menubar } from './menubar.js';
import { Disposable } from '../../../base/common/lifecycle.js';
export const IMenubarMainService = createDecorator('menubarMainService');
let MenubarMainService = class MenubarMainService extends Disposable {
    constructor(instantiationService, lifecycleMainService, logService) {
        super();
        this.instantiationService = instantiationService;
        this.lifecycleMainService = lifecycleMainService;
        this.logService = logService;
        this.menubar = this.installMenuBarAfterWindowOpen();
    }
    async installMenuBarAfterWindowOpen() {
        await this.lifecycleMainService.when(3 /* LifecycleMainPhase.AfterWindowOpen */);
        return this._register(this.instantiationService.createInstance(Menubar));
    }
    async updateMenubar(windowId, menus) {
        this.logService.trace('menubarService#updateMenubar', windowId);
        const menubar = await this.menubar;
        menubar.updateMenu(menus, windowId);
    }
};
MenubarMainService = __decorate([
    __param(0, IInstantiationService),
    __param(1, ILifecycleMainService),
    __param(2, ILogService)
], MenubarMainService);
export { MenubarMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhck1haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbWVudWJhci9lbGVjdHJvbi1tYWluL21lbnViYXJNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDcEcsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUVyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQ3RDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU5RCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLG9CQUFvQixDQUFDLENBQUE7QUFNdEYsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxVQUFVO0lBS2pELFlBQ3lDLG9CQUEyQyxFQUMzQyxvQkFBMkMsRUFDckQsVUFBdUI7UUFFckQsS0FBSyxFQUFFLENBQUE7UUFKaUMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUMzQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ3JELGVBQVUsR0FBVixVQUFVLENBQWE7UUFJckQsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQTtJQUNwRCxDQUFDO0lBRU8sS0FBSyxDQUFDLDZCQUE2QjtRQUMxQyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLDRDQUFvQyxDQUFBO1FBRXhFLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7SUFDekUsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQUMsUUFBZ0IsRUFBRSxLQUFtQjtRQUN4RCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUUvRCxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUE7UUFDbEMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDcEMsQ0FBQztDQUNELENBQUE7QUEzQlksa0JBQWtCO0lBTTVCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLFdBQVcsQ0FBQTtHQVJELGtCQUFrQixDQTJCOUIifQ==