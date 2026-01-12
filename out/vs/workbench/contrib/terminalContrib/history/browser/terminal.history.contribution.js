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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuaGlzdG9yeS5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9oaXN0b3J5L2Jyb3dzZXIvdGVybWluYWwuaGlzdG9yeS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFakQsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDbEgsT0FBTyxFQUNOLGNBQWMsRUFDZCxrQkFBa0IsR0FFbEIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUdyRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN0RixPQUFPLEVBQ04sK0JBQStCLEVBQy9CLHFCQUFxQixHQUNyQixNQUFNLDhEQUE4RCxDQUFBO0FBS3JFLE9BQU8sRUFDTiw0QkFBNEIsRUFDNUIsc0JBQXNCLEdBQ3RCLE1BQU0sOENBQThDLENBQUE7QUFDckQsT0FBTyxFQUNOLDRCQUE0QixHQUU1QixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBRXBHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRXhFLGlDQUFpQztBQUVqQyxJQUFNLDJCQUEyQixH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