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
var TerminalClipboardContribution_1;
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ITerminalConfigurationService, } from '../../../terminal/browser/terminal.js';
import { registerTerminalContribution, } from '../../../terminal/browser/terminalExtensions.js';
import { shouldPasteTerminalText } from './terminalClipboard.js';
import { Emitter } from '../../../../../base/common/event.js';
import { BrowserFeatures } from '../../../../../base/browser/canIUse.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { isLinux, isMacintosh } from '../../../../../base/common/platform.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { registerActiveInstanceAction, registerActiveXtermAction, } from '../../../terminal/browser/terminalActions.js';
import { localize2 } from '../../../../../nls.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { terminalStrings } from '../../../terminal/common/terminalStrings.js';
import { isString } from '../../../../../base/common/types.js';
// #region Terminal Contributions
let TerminalClipboardContribution = class TerminalClipboardContribution extends Disposable {
    static { TerminalClipboardContribution_1 = this; }
    static { this.ID = 'terminal.clipboard'; }
    static get(instance) {
        return instance.getContribution(TerminalClipboardContribution_1.ID);
    }
    constructor(_ctx, _clipboardService, _configurationService, _instantiationService, _notificationService, _terminalConfigurationService) {
        super();
        this._ctx = _ctx;
        this._clipboardService = _clipboardService;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._notificationService = _notificationService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._overrideCopySelection = undefined;
        this._onWillPaste = this._register(new Emitter());
        this.onWillPaste = this._onWillPaste.event;
        this._onDidPaste = this._register(new Emitter());
        this.onDidPaste = this._onDidPaste.event;
    }
    xtermReady(xterm) {
        this._xterm = xterm;
        // TODO: This should be a different event on xterm, copying html should not share the requesting run command event
        this._register(xterm.onDidRequestCopyAsHtml((e) => this.copySelection(true, e.command)));
        this._register(xterm.raw.onSelectionChange(async () => {
            if (this._configurationService.getValue("terminal.integrated.copyOnSelection" /* TerminalSettingId.CopyOnSelection */)) {
                if (this._overrideCopySelection === false) {
                    return;
                }
                if (this._ctx.instance.hasSelection()) {
                    await this.copySelection();
                }
            }
        }));
    }
    async copySelection(asHtml, command) {
        // TODO: Confirm this is fine that it's no longer awaiting xterm promise
        this._xterm?.copySelection(asHtml, command);
    }
    /**
     * Focuses and pastes the contents of the clipboard into the terminal instance.
     */
    async paste() {
        await this._paste(await this._clipboardService.readText());
    }
    /**
     * Focuses and pastes the contents of the selection clipboard into the terminal instance.
     */
    async pasteSelection() {
        await this._paste(await this._clipboardService.readText('selection'));
    }
    async _paste(value) {
        if (!this._xterm) {
            return;
        }
        let currentText = value;
        const shouldPasteText = await this._instantiationService.invokeFunction(shouldPasteTerminalText, currentText, this._xterm?.raw.modes.bracketedPasteMode);
        if (!shouldPasteText) {
            return;
        }
        if (typeof shouldPasteText === 'object') {
            currentText = shouldPasteText.modifiedText;
        }
        this._ctx.instance.focus();
        this._onWillPaste.fire(currentText);
        this._xterm.raw.paste(currentText);
        this._onDidPaste.fire(currentText);
    }
    async handleMouseEvent(event) {
        switch (event.button) {
            case 1: {
                // Middle click
                if (this._terminalConfigurationService.config.middleClickBehavior === 'paste') {
                    this.paste();
                    return { handled: true };
                }
                break;
            }
            case 2: {
                // Right click
                // Ignore shift click as it forces the context menu
                if (event.shiftKey) {
                    return;
                }
                const rightClickBehavior = this._terminalConfigurationService.config.rightClickBehavior;
                if (rightClickBehavior !== 'copyPaste' && rightClickBehavior !== 'paste') {
                    return;
                }
                if (rightClickBehavior === 'copyPaste' && this._ctx.instance.hasSelection()) {
                    await this.copySelection();
                    this._ctx.instance.clearSelection();
                }
                else {
                    if (BrowserFeatures.clipboard.readText) {
                        this.paste();
                    }
                    else {
                        this._notificationService.info(`This browser doesn't support the clipboard.readText API needed to trigger a paste, try ${isMacintosh ? '⌘' : 'Ctrl'}+V instead.`);
                    }
                }
                // Clear selection after all click event bubbling is finished on Mac to prevent
                // right-click selecting a word which is seemed cannot be disabled. There is a
                // flicker when pasting but this appears to give the best experience if the
                // setting is enabled.
                if (isMacintosh) {
                    setTimeout(() => this._ctx.instance.clearSelection(), 0);
                }
                return { handled: true };
            }
        }
    }
    /**
     * Override the copy on selection feature with a custom value.
     * @param value Whether to enable copySelection.
     */
    overrideCopyOnSelection(value) {
        if (this._overrideCopySelection !== undefined) {
            throw new Error('Cannot set a copy on selection override multiple times');
        }
        this._overrideCopySelection = value;
        return toDisposable(() => (this._overrideCopySelection = undefined));
    }
};
TerminalClipboardContribution = TerminalClipboardContribution_1 = __decorate([
    __param(1, IClipboardService),
    __param(2, IConfigurationService),
    __param(3, IInstantiationService),
    __param(4, INotificationService),
    __param(5, ITerminalConfigurationService)
], TerminalClipboardContribution);
export { TerminalClipboardContribution };
registerTerminalContribution(TerminalClipboardContribution.ID, TerminalClipboardContribution, false);
// #endregion
// #region Actions
const terminalAvailableWhenClause = ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated);
// TODO: Move these commands into this terminalContrib/
registerActiveInstanceAction({
    id: "workbench.action.terminal.copyLastCommand" /* TerminalCommandId.CopyLastCommand */,
    title: localize2('workbench.action.terminal.copyLastCommand', 'Copy Last Command'),
    precondition: terminalAvailableWhenClause,
    run: async (instance, c, accessor) => {
        const clipboardService = accessor.get(IClipboardService);
        const commands = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */)?.commands;
        if (!commands || commands.length === 0) {
            return;
        }
        const command = commands[commands.length - 1];
        if (!command.command) {
            return;
        }
        await clipboardService.writeText(command.command);
    },
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.copyLastCommandOutput" /* TerminalCommandId.CopyLastCommandOutput */,
    title: localize2('workbench.action.terminal.copyLastCommandOutput', 'Copy Last Command Output'),
    precondition: terminalAvailableWhenClause,
    run: async (instance, c, accessor) => {
        const clipboardService = accessor.get(IClipboardService);
        const commands = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */)?.commands;
        if (!commands || commands.length === 0) {
            return;
        }
        const command = commands[commands.length - 1];
        if (!command?.hasOutput()) {
            return;
        }
        const output = command.getOutput();
        if (isString(output)) {
            await clipboardService.writeText(output);
        }
    },
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.copyLastCommandAndLastCommandOutput" /* TerminalCommandId.CopyLastCommandAndLastCommandOutput */,
    title: localize2('workbench.action.terminal.copyLastCommandAndOutput', 'Copy Last Command and Output'),
    precondition: terminalAvailableWhenClause,
    run: async (instance, c, accessor) => {
        const clipboardService = accessor.get(IClipboardService);
        const commands = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */)?.commands;
        if (!commands || commands.length === 0) {
            return;
        }
        const command = commands[commands.length - 1];
        if (!command?.hasOutput()) {
            return;
        }
        const output = command.getOutput();
        if (isString(output)) {
            await clipboardService.writeText(`${command.command !== '' ? command.command + '\n' : ''}${output}`);
        }
    },
});
// Some commands depend on platform features
if (BrowserFeatures.clipboard.writeText) {
    registerActiveXtermAction({
        id: "workbench.action.terminal.copySelection" /* TerminalCommandId.CopySelection */,
        title: localize2('workbench.action.terminal.copySelection', 'Copy Selection'),
        // TODO: Why is copy still showing up when text isn't selected?
        precondition: ContextKeyExpr.or(TerminalContextKeys.textSelectedInFocused, ContextKeyExpr.and(terminalAvailableWhenClause, TerminalContextKeys.textSelected)),
        keybinding: [
            {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 33 /* KeyCode.KeyC */,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.or(ContextKeyExpr.and(TerminalContextKeys.textSelected, TerminalContextKeys.focus), TerminalContextKeys.textSelectedInFocused),
            },
        ],
        run: (activeInstance) => activeInstance.copySelection(),
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.copyAndClearSelection" /* TerminalCommandId.CopyAndClearSelection */,
        title: localize2('workbench.action.terminal.copyAndClearSelection', 'Copy and Clear Selection'),
        precondition: ContextKeyExpr.or(TerminalContextKeys.textSelectedInFocused, ContextKeyExpr.and(terminalAvailableWhenClause, TerminalContextKeys.textSelected)),
        keybinding: [
            {
                win: { primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.or(ContextKeyExpr.and(TerminalContextKeys.textSelected, TerminalContextKeys.focus), TerminalContextKeys.textSelectedInFocused),
            },
        ],
        run: async (xterm) => {
            await xterm.copySelection();
            xterm.clearSelection();
        },
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.copySelectionAsHtml" /* TerminalCommandId.CopySelectionAsHtml */,
        title: localize2('workbench.action.terminal.copySelectionAsHtml', 'Copy Selection as HTML'),
        f1: true,
        category: terminalStrings.actionCategory,
        precondition: ContextKeyExpr.or(TerminalContextKeys.textSelectedInFocused, ContextKeyExpr.and(terminalAvailableWhenClause, TerminalContextKeys.textSelected)),
        run: (xterm) => xterm.copySelection(true),
    });
}
if (BrowserFeatures.clipboard.readText) {
    registerActiveInstanceAction({
        id: "workbench.action.terminal.paste" /* TerminalCommandId.Paste */,
        title: localize2('workbench.action.terminal.paste', 'Paste into Active Terminal'),
        precondition: terminalAvailableWhenClause,
        keybinding: [
            {
                primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */,
                win: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 52 /* KeyCode.KeyV */],
                },
                linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 52 /* KeyCode.KeyV */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: TerminalContextKeys.focus,
            },
        ],
        run: (activeInstance) => TerminalClipboardContribution.get(activeInstance)?.paste(),
    });
}
if (BrowserFeatures.clipboard.readText && isLinux) {
    registerActiveInstanceAction({
        id: "workbench.action.terminal.pasteSelection" /* TerminalCommandId.PasteSelection */,
        title: localize2('workbench.action.terminal.pasteSelection', 'Paste Selection into Active Terminal'),
        precondition: terminalAvailableWhenClause,
        keybinding: [
            {
                linux: { primary: 1024 /* KeyMod.Shift */ | 19 /* KeyCode.Insert */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: TerminalContextKeys.focus,
            },
        ],
        run: (activeInstance) => TerminalClipboardContribution.get(activeInstance)?.pasteSelection(),
    });
}
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuY2xpcGJvYXJkLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NsaXBib2FyZC9icm93c2VyL3Rlcm1pbmFsLmNsaXBib2FyZC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFvQixNQUFNLHlDQUF5QyxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFFTiw2QkFBNkIsR0FJN0IsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQ04sNEJBQTRCLEdBRzVCLE1BQU0saURBQWlELENBQUE7QUFDeEQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUt4RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUVyRyxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTiw0QkFBNEIsRUFDNUIseUJBQXlCLEdBQ3pCLE1BQU0sOENBQThDLENBQUE7QUFFckQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixD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