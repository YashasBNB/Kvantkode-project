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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdMaWZlY3ljbGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2NvbW1vbi9kZWJ1Z0xpZmVjeWNsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUUvRSxPQUFPLEVBQXVCLGFBQWEsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQWtCLE1BQU0saURBQWlELENBQUE7QUFFNUYsSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBYztJQUcxQixZQUNvQixnQkFBbUMsRUFDdEIsWUFBMkIsRUFDbkIsb0JBQTJDLEVBQ2xELGFBQTZCO1FBRjlCLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQ25CLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDbEQsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBRTlELElBQUksQ0FBQyxVQUFVLEdBQUcsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQy9ELENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FDdkQsQ0FBQTtJQUNGLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxPQUF1QjtRQUNqRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWTthQUNwQyxRQUFRLEVBQUU7YUFDVixXQUFXLEVBQUU7YUFDYixNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLEtBQUssU0FBUyxDQUFDLENBQUE7UUFDOUMsSUFBSSxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQy9CLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELE1BQU0sbUJBQW1CLEdBQ3hCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQXNCLE9BQU8sQ0FBQyxDQUFDLGFBQWEsQ0FBQTtRQUMvRSxJQUFJLG1CQUFtQixLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQ3JDLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLDJCQUEyQixDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUM3RCxDQUFDO0lBRU0sT0FBTztRQUNiLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNqQyxDQUFDO0lBRU8sS0FBSyxDQUFDLDJCQUEyQixDQUFDLFdBQW1CO1FBQzVELElBQUksT0FBZSxDQUFBO1FBQ25CLElBQUksV0FBVyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLE9BQU8sR0FBRyxHQUFHLENBQUMsUUFBUSxDQUNyQiw2Q0FBNkMsRUFDN0MscUVBQXFFLENBQ3JFLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sR0FBRyxHQUFHLENBQUMsUUFBUSxDQUNyQiwyQ0FBMkMsRUFDM0Msc0VBQXNFLENBQ3RFLENBQUE7UUFDRixDQUFDO1FBQ0QsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQztZQUM1QyxPQUFPO1lBQ1AsSUFBSSxFQUFFLFNBQVM7WUFDZixhQUFhLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDMUIsRUFBRSxHQUFHLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDekQsa0JBQWtCLENBQ2xCO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUE7SUFDdEIsQ0FBQztDQUNELENBQUE7QUEzRFksY0FBYztJQUl4QixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGNBQWMsQ0FBQTtHQVBKLGNBQWMsQ0EyRDFCIn0=