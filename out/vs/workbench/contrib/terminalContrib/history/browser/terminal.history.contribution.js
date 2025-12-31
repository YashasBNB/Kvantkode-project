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
var TerminalHistoryContribution_1;
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize2 } from '../../../../../nls.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../../platform/accessibility/common/accessibility.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { TerminalLocation } from '../../../../../platform/terminal/common/terminal.js';
import { accessibleViewCurrentProviderId, accessibleViewIsShown, } from '../../../accessibility/browser/accessibilityConfiguration.js';
import { registerActiveInstanceAction, registerTerminalAction, } from '../../../terminal/browser/terminalActions.js';
import { registerTerminalContribution, } from '../../../terminal/browser/terminalExtensions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { clearShellFileHistory, getCommandHistory, getDirectoryHistory } from '../common/history.js';
import { showRunRecentQuickPick } from './terminalRunRecentQuickPick.js';
// #region Terminal Contributions
let TerminalHistoryContribution = class TerminalHistoryContribution extends Disposable {
    static { TerminalHistoryContribution_1 = this; }
    static { this.ID = 'terminal.history'; }
    static get(instance) {
        return instance.getContribution(TerminalHistoryContribution_1.ID);
    }
    constructor(_ctx, contextKeyService, _instantiationService) {
        super();
        this._ctx = _ctx;
        this._instantiationService = _instantiationService;
        this._terminalInRunCommandPicker =
            TerminalContextKeys.inTerminalRunCommandPicker.bindTo(contextKeyService);
        this._register(_ctx.instance.capabilities.onDidAddCapabilityType((e) => {
            switch (e) {
                case 0 /* TerminalCapability.CwdDetection */: {
                    const cwdDetection = _ctx.instance.capabilities.get(0 /* TerminalCapability.CwdDetection */);
                    if (!cwdDetection) {
                        return;
                    }
                    this._register(cwdDetection.onDidChangeCwd((e) => {
                        this._instantiationService
                            .invokeFunction(getDirectoryHistory)
                            ?.add(e, { remoteAuthority: _ctx.instance.remoteAuthority });
                    }));
                    break;
                }
                case 2 /* TerminalCapability.CommandDetection */: {
                    const commandDetection = _ctx.instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
                    if (!commandDetection) {
                        return;
                    }
                    this._register(commandDetection.onCommandFinished((e) => {
                        if (e.command.trim().length > 0) {
                            this._instantiationService
                                .invokeFunction(getCommandHistory)
                                ?.add(e.command, { shellType: _ctx.instance.shellType });
                        }
                    }));
                    break;
                }
            }
        }));
    }
    /**
     * Triggers a quick pick that displays recent commands or cwds. Selecting one will
     * rerun it in the active terminal.
     */
    async runRecent(type, filterMode, value) {
        return this._instantiationService.invokeFunction(showRunRecentQuickPick, this._ctx.instance, this._terminalInRunCommandPicker, type, filterMode, value);
    }
};
TerminalHistoryContribution = TerminalHistoryContribution_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, IInstantiationService)
], TerminalHistoryContribution);
registerTerminalContribution(TerminalHistoryContribution.ID, TerminalHistoryContribution);
// #endregion
// #region Actions
const precondition = ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated);
registerTerminalAction({
    id: "workbench.action.terminal.clearPreviousSessionHistory" /* TerminalHistoryCommandId.ClearPreviousSessionHistory */,
    title: localize2('workbench.action.terminal.clearPreviousSessionHistory', 'Clear Previous Session History'),
    precondition,
    run: async (c, accessor) => {
        getCommandHistory(accessor).clear();
        clearShellFileHistory();
    },
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.goToRecentDirectory" /* TerminalHistoryCommandId.GoToRecentDirectory */,
    title: localize2('workbench.action.terminal.goToRecentDirectory', 'Go to Recent Directory...'),
    metadata: {
        description: localize2('goToRecentDirectory.metadata', 'Goes to a recent folder'),
    },
    precondition,
    keybinding: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 37 /* KeyCode.KeyG */,
        when: TerminalContextKeys.focus,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    },
    run: async (activeInstance, c) => {
        const history = TerminalHistoryContribution.get(activeInstance);
        if (!history) {
            return;
        }
        await history.runRecent('cwd');
        if (activeInstance?.target === TerminalLocation.Editor) {
            await c.editorService.revealActiveEditor();
        }
        else {
            await c.groupService.showPanel(false);
        }
    },
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.runRecentCommand" /* TerminalHistoryCommandId.RunRecentCommand */,
    title: localize2('workbench.action.terminal.runRecentCommand', 'Run Recent Command...'),
    precondition,
    keybinding: [
        {
            primary: 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */,
            when: ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, ContextKeyExpr.or(TerminalContextKeys.focus, ContextKeyExpr.and(accessibleViewIsShown, accessibleViewCurrentProviderId.isEqualTo("terminal" /* AccessibleViewProviderId.Terminal */)))),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        {
            primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 48 /* KeyCode.KeyR */,
            mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 48 /* KeyCode.KeyR */ },
            when: ContextKeyExpr.and(TerminalContextKeys.focus, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
    ],
    run: async (activeInstance, c) => {
        const history = TerminalHistoryContribution.get(activeInstance);
        if (!history) {
            return;
        }
        await history.runRecent('command');
        if (activeInstance?.target === TerminalLocation.Editor) {
            await c.editorService.revealActiveEditor();
        }
        else {
            await c.groupService.showPanel(false);
        }
    },
});
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuaGlzdG9yeS5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvaGlzdG9yeS9icm93c2VyL3Rlcm1pbmFsLmhpc3RvcnkuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRWpELE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ2xILE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEdBRWxCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFHckcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDdEYsT0FBTyxFQUNOLCtCQUErQixFQUMvQixxQkFBcUIsR0FDckIsTUFBTSw4REFBOEQsQ0FBQTtBQUtyRSxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLHNCQUFzQixHQUN0QixNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFDTiw0QkFBNEIsR0FFNUIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUVwRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV4RSxpQ0FBaUM7QUFFakMsSUFBTSwyQkFBMkIsR0FBakMs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