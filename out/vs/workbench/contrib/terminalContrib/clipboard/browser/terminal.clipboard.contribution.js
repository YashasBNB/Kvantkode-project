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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuY2xpcGJvYXJkLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jbGlwYm9hcmQvYnJvd3Nlci90ZXJtaW5hbC5jbGlwYm9hcmQuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBb0IsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBRU4sNkJBQTZCLEdBSTdCLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUNOLDRCQUE0QixHQUc1QixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFLeEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFFckcsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLHlCQUF5QixHQUN6QixNQUFNLDhDQUE4QyxDQUFBO0FBRXJELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsY0FB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