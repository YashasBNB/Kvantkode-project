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
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IDebugService } from './debug.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
let DebugLifecycle = class DebugLifecycle {
    constructor(lifecycleService, debugService, configurationService, dialogService) {
        this.debugService = debugService;
        this.configurationService = configurationService;
        this.dialogService = dialogService;
        this.disposable = lifecycleService.onBeforeShutdown(async (e) => e.veto(this.shouldVetoShutdown(e.reason), 'veto.debug'));
    }
    shouldVetoShutdown(_reason) {
        const rootSessions = this.debugService
            .getModel()
            .getSessions()
            .filter((s) => s.parentSession === undefined);
        if (rootSessions.length === 0) {
            return false;
        }
        const shouldConfirmOnExit = this.configurationService.getValue('debug').confirmOnExit;
        if (shouldConfirmOnExit === 'never') {
            return false;
        }
        return this.showWindowCloseConfirmation(rootSessions.length);
    }
    dispose() {
        return this.disposable.dispose();
    }
    async showWindowCloseConfirmation(numSessions) {
        let message;
        if (numSessions === 1) {
            message = nls.localize('debug.debugSessionCloseConfirmationSingular', 'There is an active debug session, are you sure you want to stop it?');
        }
        else {
            message = nls.localize('debug.debugSessionCloseConfirmationPlural', 'There are active debug sessions, are you sure you want to stop them?');
        }
        const res = await this.dialogService.confirm({
            message,
            type: 'warning',
            primaryButton: nls.localize({ key: 'debug.stop', comment: ['&& denotes a mnemonic'] }, '&&Stop Debugging'),
        });
        return !res.confirmed;
    }
};
DebugLifecycle = __decorate([
    __param(0, ILifecycleService),
    __param(1, IDebugService),
    __param(2, IConfigurationService),
    __param(3, IDialogService)
], DebugLifecycle);
export { DebugLifecycle };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdMaWZlY3ljbGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9jb21tb24vZGVidWdMaWZlY3ljbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFL0UsT0FBTyxFQUF1QixhQUFhLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFrQixNQUFNLGlEQUFpRCxDQUFBO0FBRTVGLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWM7SUFHMUIsWUFDb0IsZ0JBQW1DLEVBQ3RCLFlBQTJCLEVBQ25CLG9CQUEyQyxFQUNsRCxhQUE2QjtRQUY5QixpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUNuQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ2xELGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUU5RCxJQUFJLENBQUMsVUFBVSxHQUFHLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUMvRCxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQ3ZELENBQUE7SUFDRixDQUFDO0lBRU8sa0JBQWtCLENBQUMsT0FBdUI7UUFDakQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVk7YUFDcEMsUUFBUSxFQUFFO2FBQ1YsV0FBVyxFQUFFO2FBQ2IsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxLQUFLLFNBQVMsQ0FBQyxDQUFBO1FBQzlDLElBQUksWUFBWSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMvQixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxNQUFNLG1CQUFtQixHQUN4QixJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFzQixPQUFPLENBQUMsQ0FBQyxhQUFhLENBQUE7UUFDL0UsSUFBSSxtQkFBbUIsS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUNyQyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUVNLE9BQU87UUFDYixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDakMsQ0FBQztJQUVPLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxXQUFtQjtRQUM1RCxJQUFJLE9BQWUsQ0FBQTtRQUNuQixJQUFJLFdBQVcsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN2QixPQUFPLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDckIsNkNBQTZDLEVBQzdDLHFFQUFxRSxDQUNyRSxDQUFBO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDckIsMkNBQTJDLEVBQzNDLHNFQUFzRSxDQUN0RSxDQUFBO1FBQ0YsQ0FBQztRQUNELE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7WUFDNUMsT0FBTztZQUNQLElBQUksRUFBRSxTQUFTO1lBQ2YsYUFBYSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQzFCLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQ3pELGtCQUFrQixDQUNsQjtTQUNELENBQUMsQ0FBQTtRQUNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFBO0lBQ3RCLENBQUM7Q0FDRCxDQUFBO0FBM0RZLGNBQWM7SUFJeEIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxjQUFjLENBQUE7R0FQSixjQUFjLENBMkQxQiJ9