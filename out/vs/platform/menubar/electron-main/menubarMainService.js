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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhck1haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9tZW51YmFyL2VsZWN0cm9uLW1haW4vbWVudWJhck1haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRyxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRXJELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDdEMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTlELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBc0Isb0JBQW9CLENBQUMsQ0FBQTtBQU10RixJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLFVBQVU7SUFLakQsWUFDeUMsb0JBQTJDLEVBQzNDLG9CQUEyQyxFQUNyRCxVQUF1QjtRQUVyRCxLQUFLLEVBQUUsQ0FBQTtRQUppQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzNDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDckQsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUlyRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFBO0lBQ3BELENBQUM7SUFFTyxLQUFLLENBQUMsNkJBQTZCO1FBQzFDLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksNENBQW9DLENBQUE7UUFFeEUsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtJQUN6RSxDQUFDO0lBRUQsS0FBSyxDQUFDLGFBQWEsQ0FBQyxRQUFnQixFQUFFLEtBQW1CO1FBQ3hELElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLDhCQUE4QixFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRS9ELE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQTtRQUNsQyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0NBQ0QsQ0FBQTtBQTNCWSxrQkFBa0I7SUFNNUIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsV0FBVyxDQUFBO0dBUkQsa0JBQWtCLENBMkI5QiJ9