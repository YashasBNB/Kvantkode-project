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
import { Emitter } from '../../../../base/common/event.js';
import { IUpdateService, State } from '../../../../platform/update/common/update.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { IHostService } from '../../host/browser/host.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
let BrowserUpdateService = class BrowserUpdateService extends Disposable {
    get state() {
        return this._state;
    }
    set state(state) {
        this._state = state;
        this._onStateChange.fire(state);
    }
    constructor(environmentService, hostService) {
        super();
        this.environmentService = environmentService;
        this.hostService = hostService;
        this._onStateChange = this._register(new Emitter());
        this.onStateChange = this._onStateChange.event;
        this._state = State.Uninitialized;
        this.checkForUpdates(false);
    }
    async isLatestVersion() {
        const update = await this.doCheckForUpdates(false);
        if (update === undefined) {
            return undefined; // no update provider
        }
        return !!update;
    }
    async checkForUpdates(explicit) {
        await this.doCheckForUpdates(explicit);
    }
    async doCheckForUpdates(explicit) {
        if (this.environmentService.options && this.environmentService.options.updateProvider) {
            const updateProvider = this.environmentService.options.updateProvider;
            // State -> Checking for Updates
            this.state = State.CheckingForUpdates(explicit);
            const update = await updateProvider.checkForUpdate();
            if (update) {
                // State -> Downloaded
                this.state = State.Ready({ version: update.version, productVersion: update.version });
            }
            else {
                // State -> Idle
                this.state = State.Idle(1 /* UpdateType.Archive */);
            }
            return update;
        }
        return undefined; // no update provider to ask
    }
    async downloadUpdate() {
        // no-op
    }
    async applyUpdate() {
        this.hostService.reload();
    }
    async quitAndInstall() {
        this.hostService.reload();
    }
    async _applySpecificUpdate(packagePath) {
        // noop
    }
};
BrowserUpdateService = __decorate([
    __param(0, IBrowserWorkbenchEnvironmentService),
    __param(1, IHostService)
], BrowserUpdateService);
export { BrowserUpdateService };
registerSingleton(IUpdateService, BrowserUpdateService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91cGRhdGUvYnJvd3Nlci91cGRhdGVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBYyxNQUFNLDhDQUE4QyxDQUFBO0FBQ2hHLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBZTFELElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEsVUFBVTtJQU9uRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDbkIsQ0FBQztJQUNELElBQUksS0FBSyxDQUFDLEtBQVk7UUFDckIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDbkIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDaEMsQ0FBQztJQUVELFlBRUMsa0JBQXdFLEVBQzFELFdBQTBDO1FBRXhELEtBQUssRUFBRSxDQUFBO1FBSFUsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQztRQUN6QyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQWZqRCxtQkFBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVMsQ0FBQyxDQUFBO1FBQ3BELGtCQUFhLEdBQWlCLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFBO1FBRXhELFdBQU0sR0FBVSxLQUFLLENBQUMsYUFBYSxDQUFBO1FBZ0IxQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzVCLENBQUM7SUFFRCxLQUFLLENBQUMsZUFBZTtRQUNwQixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNsRCxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUMxQixPQUFPLFNBQVMsQ0FBQSxDQUFDLHFCQUFxQjtRQUN2QyxDQUFDO1FBRUQsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFBO0lBQ2hCLENBQUM7SUFFRCxLQUFLLENBQUMsZUFBZSxDQUFDLFFBQWlCO1FBQ3RDLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFTyxLQUFLLENBQUMsaUJBQWlCLENBQzlCLFFBQWlCO1FBRWpCLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3ZGLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFBO1lBRXJFLGdDQUFnQztZQUNoQyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUUvQyxNQUFNLE1BQU0sR0FBRyxNQUFNLGNBQWMsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtZQUNwRCxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLHNCQUFzQjtnQkFDdEIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1lBQ3RGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxnQkFBZ0I7Z0JBQ2hCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksNEJBQW9CLENBQUE7WUFDNUMsQ0FBQztZQUVELE9BQU8sTUFBTSxDQUFBO1FBQ2QsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBLENBQUMsNEJBQTRCO0lBQzlDLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYztRQUNuQixRQUFRO0lBQ1QsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXO1FBQ2hCLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDMUIsQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjO1FBQ25CLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDMUIsQ0FBQztJQUVELEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxXQUFtQjtRQUM3QyxPQUFPO0lBQ1IsQ0FBQztDQUNELENBQUE7QUE3RVksb0JBQW9CO0lBZ0I5QixXQUFBLG1DQUFtQyxDQUFBO0lBRW5DLFdBQUEsWUFBWSxDQUFBO0dBbEJGLG9CQUFvQixDQTZFaEM7O0FBRUQsaUJBQWlCLENBQUMsY0FBYyxFQUFFLG9CQUFvQixrQ0FBMEIsQ0FBQSJ9