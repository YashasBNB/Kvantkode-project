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
var TerminalQuickFixContribution_1;
import { DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { localize2 } from '../../../../../nls.js';
import { registerSingleton, } from '../../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { registerActiveInstanceAction } from '../../../terminal/browser/terminalActions.js';
import { registerTerminalContribution, } from '../../../terminal/browser/terminalExtensions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import './media/terminalQuickFix.css';
import { ITerminalQuickFixService } from './quickFix.js';
import { TerminalQuickFixAddon } from './quickFixAddon.js';
import { freePort, gitCreatePr, gitFastForwardPull, gitPushSetUpstream, gitSimilar, gitTwoDashes, pwshGeneralError, pwshUnixCommandNotFoundError, } from './terminalQuickFixBuiltinActions.js';
import { TerminalQuickFixService } from './terminalQuickFixService.js';
// #region Services
registerSingleton(ITerminalQuickFixService, TerminalQuickFixService, 1 /* InstantiationType.Delayed */);
// #endregion
// #region Contributions
let TerminalQuickFixContribution = class TerminalQuickFixContribution extends DisposableStore {
    static { TerminalQuickFixContribution_1 = this; }
    static { this.ID = 'quickFix'; }
    static get(instance) {
        return instance.getContribution(TerminalQuickFixContribution_1.ID);
    }
    get addon() {
        return this._addon;
    }
    constructor(_ctx, _instantiationService) {
        super();
        this._ctx = _ctx;
        this._instantiationService = _instantiationService;
        this._quickFixMenuItems = this.add(new MutableDisposable());
    }
    xtermReady(xterm) {
        // Create addon
        this._addon = this._instantiationService.createInstance(TerminalQuickFixAddon, undefined, this._ctx.instance.capabilities);
        xterm.raw.loadAddon(this._addon);
        // Hook up listeners
        this.add(this._addon.onDidRequestRerunCommand((e) => this._ctx.instance.runCommand(e.command, e.shouldExecute || false)));
        this.add(this._addon.onDidUpdateQuickFixes((e) => {
            // Only track the latest command's quick fixes
            this._quickFixMenuItems.value = e.actions
                ? xterm.decorationAddon.registerMenuItems(e.command, e.actions)
                : undefined;
        }));
        // Register quick fixes
        for (const actionOption of [
            gitTwoDashes(),
            gitFastForwardPull(),
            freePort((port, command) => this._ctx.instance.freePortKillProcess(port, command)),
            gitSimilar(),
            gitPushSetUpstream(),
            gitCreatePr(),
            pwshUnixCommandNotFoundError(),
            pwshGeneralError(),
        ]) {
            this._addon.registerCommandFinishedListener(actionOption);
        }
    }
};
TerminalQuickFixContribution = TerminalQuickFixContribution_1 = __decorate([
    __param(1, IInstantiationService)
], TerminalQuickFixContribution);
registerTerminalContribution(TerminalQuickFixContribution.ID, TerminalQuickFixContribution);
// #endregion
// #region Actions
var TerminalQuickFixCommandId;
(function (TerminalQuickFixCommandId) {
    TerminalQuickFixCommandId["ShowQuickFixes"] = "workbench.action.terminal.showQuickFixes";
})(TerminalQuickFixCommandId || (TerminalQuickFixCommandId = {}));
registerActiveInstanceAction({
    id: "workbench.action.terminal.showQuickFixes" /* TerminalQuickFixCommandId.ShowQuickFixes */,
    title: localize2('workbench.action.terminal.showQuickFixes', 'Show Terminal Quick Fixes'),
    precondition: TerminalContextKeys.focus,
    keybinding: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    },
    run: (activeInstance) => TerminalQuickFixContribution.get(activeInstance)?.addon?.showMenu(),
});
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwucXVpY2tGaXguY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3F1aWNrRml4L2Jyb3dzZXIvdGVybWluYWwucXVpY2tGaXguY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDNUYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2pELE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQU9yRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMzRixPQUFPLEVBQ04sNEJBQTRCLEdBRTVCLE1BQU0saURBQWlELENBQUE7QUFDeEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDcEYsT0FBTyw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDeEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDMUQsT0FBTyxFQUNOLFFBQVEsRUFDUixXQUFXLEVBQ1gsa0JBQWtCLEVBQ2xCLGtCQUFrQixFQUNsQixVQUFVLEVBQ1YsWUFBWSxFQUNaLGdCQUFnQixFQUNoQiw0QkFBNEIsR0FDNUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUV0RSxtQkFBbUI7QUFFbkIsaUJBQWlCLENBQUMsd0JBQXdCLEVBQUUsdUJBQXVCLG9DQUE0QixDQUFBO0FBRS9GLGFBQWE7QUFFYix3QkFBd0I7QUFFeEIsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNkIsU0FBUSxlQUFlOzthQUN6QyxPQUFFLEdBQUcsVUFBVSxBQUFiLENBQWE7SUFFL0IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUEyQjtRQUNyQyxPQUFPLFFBQVEsQ0FBQyxlQUFlLENBQStCLDhCQUE0QixDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQy9GLENBQUM7SUFHRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDbkIsQ0FBQztJQUlELFlBQ2tCLElBQWtDLEVBQzVCLHFCQUE2RDtRQUVwRixLQUFLLEVBQUUsQ0FBQTtRQUhVLFNBQUksR0FBSixJQUFJLENBQThCO1FBQ1gsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUpwRSx1QkFBa0IsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFBO0lBT3ZFLENBQUM7SUFFRCxVQUFVLENBQUMsS0FBaUQ7UUFDM0QsZUFBZTtRQUNmLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FDdEQscUJBQXFCLEVBQ3JCLFNBQVMsRUFDVCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQy9CLENBQUE7UUFDRCxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFaEMsb0JBQW9CO1FBQ3BCLElBQUksQ0FBQyxHQUFHLENBQ1AsSUFBSSxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxhQUFhLElBQUksS0FBSyxDQUFDLENBQ2xFLENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxHQUFHLENBQ1AsSUFBSSxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3ZDLDhDQUE4QztZQUM5QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxPQUFPO2dCQUN4QyxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUM7Z0JBQy9ELENBQUMsQ0FBQyxTQUFTLENBQUE7UUFDYixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsdUJBQXVCO1FBQ3ZCLEtBQUssTUFBTSxZQUFZLElBQUk7WUFDMUIsWUFBWSxFQUFFO1lBQ2Qsa0JBQWtCLEVBQUU7WUFDcEIsUUFBUSxDQUFDLENBQUMsSUFBWSxFQUFFLE9BQWUsRUFBRSxFQUFFLENBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FDckQ7WUFDRCxVQUFVLEVBQUU7WUFDWixrQkFBa0IsRUFBRTtZQUNwQixXQUFXLEVBQUU7WUFDYiw0QkFBNEIsRUFBRTtZQUM5QixnQkFBZ0IsRUFBRTtTQUNsQixFQUFFLENBQUM7WUFDSCxJQUFJLENBQUMsTUFBTSxDQUFDLCtCQUErQixDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzFELENBQUM7SUFDRixDQUFDOztBQTVESSw0QkFBNEI7SUFnQi9CLFdBQUEscUJBQXFCLENBQUE7R0FoQmxCLDRCQUE0QixDQTZEakM7QUFDRCw0QkFBNEIsQ0FBQyw0QkFBNEIsQ0FBQyxFQUFFLEVBQUUsNEJBQTRCLENBQUMsQ0FBQTtBQUUzRixhQUFhO0FBRWIsa0JBQWtCO0FBRWxCLElBQVcseUJBRVY7QUFGRCxXQUFXLHlCQUF5QjtJQUNuQyx3RkFBMkQsQ0FBQTtBQUM1RCxDQUFDLEVBRlUseUJBQXlCLEtBQXpCLHlCQUF5QixRQUVuQztBQUVELDRCQUE0QixDQUFDO0lBQzVCLEVBQUUsMkZBQTBDO0lBQzVDLEtBQUssRUFBRSxTQUFTLENBQUMsMENBQTBDLEVBQUUsMkJBQTJCLENBQUM7SUFDekYsWUFBWSxFQUFFLG1CQUFtQixDQUFDLEtBQUs7SUFDdkMsVUFBVSxFQUFFO1FBQ1gsT0FBTyxFQUFFLG1EQUErQjtRQUN4QyxNQUFNLDZDQUFtQztLQUN6QztJQUNELEdBQUcsRUFBRSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUU7Q0FDNUYsQ0FBQyxDQUFBO0FBRUYsYUFBYSJ9