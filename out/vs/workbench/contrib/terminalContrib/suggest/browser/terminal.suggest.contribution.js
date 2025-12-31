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
var TerminalSuggestContribution_1;
import * as dom from '../../../../../base/browser/dom.js';
import { AutoOpenBarrier } from '../../../../../base/common/async.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore, MutableDisposable, toDisposable, } from '../../../../../base/common/lifecycle.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { localize2 } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { TerminalLocation, } from '../../../../../platform/terminal/common/terminal.js';
import { registerActiveInstanceAction, registerTerminalAction, } from '../../../terminal/browser/terminalActions.js';
import { registerTerminalContribution, } from '../../../terminal/browser/terminalExtensions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { terminalSuggestConfigSection, } from '../common/terminalSuggestConfiguration.js';
import { ITerminalCompletionService, TerminalCompletionService, } from './terminalCompletionService.js';
import { registerSingleton, } from '../../../../../platform/instantiation/common/extensions.js';
import { SuggestAddon } from './terminalSuggestAddon.js';
import { TerminalClipboardContribution } from '../../clipboard/browser/terminal.clipboard.contribution.js';
import { PwshCompletionProviderAddon } from './pwshCompletionProviderAddon.js';
import { SimpleSuggestContext } from '../../../../services/suggest/browser/simpleSuggestWidget.js';
import { SuggestDetailsClassName } from '../../../../services/suggest/browser/simpleSuggestWidgetDetails.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
import './terminalSymbolIcons.js';
registerSingleton(ITerminalCompletionService, TerminalCompletionService, 1 /* InstantiationType.Delayed */);
// #region Terminal Contributions
let TerminalSuggestContribution = class TerminalSuggestContribution extends DisposableStore {
    static { TerminalSuggestContribution_1 = this; }
    static { this.ID = 'terminal.suggest'; }
    static get(instance) {
        return instance.getContribution(TerminalSuggestContribution_1.ID);
    }
    get addon() {
        return this._addon.value;
    }
    get pwshAddon() {
        return this._pwshAddon.value;
    }
    constructor(_ctx, _contextKeyService, _configurationService, _instantiationService, _terminalCompletionService) {
        super();
        this._ctx = _ctx;
        this._contextKeyService = _contextKeyService;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._terminalCompletionService = _terminalCompletionService;
        this._addon = new MutableDisposable();
        this._pwshAddon = new MutableDisposable();
        this.add(toDisposable(() => {
            this._addon?.dispose();
            this._pwshAddon?.dispose();
        }));
        this._terminalSuggestWidgetVisibleContextKey = TerminalContextKeys.suggestWidgetVisible.bindTo(this._contextKeyService);
        this.add(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("terminal.integrated.suggest.enabled" /* TerminalSuggestSettingId.Enabled */)) {
                const completionsEnabled = this._configurationService.getValue(terminalSuggestConfigSection).enabled;
                if (!completionsEnabled) {
                    this._addon.clear();
                    this._pwshAddon.clear();
                }
                const xtermRaw = this._ctx.instance.xterm?.raw;
                if (!!xtermRaw && completionsEnabled) {
                    this._loadAddons(xtermRaw);
                }
            }
        }));
    }
    xtermOpen(xterm) {
        const config = this._configurationService.getValue(terminalSuggestConfigSection);
        const enabled = config.enabled;
        if (!enabled) {
            return;
        }
        this._loadAddons(xterm.raw);
        this.add(Event.runAndSubscribe(this._ctx.instance.onDidChangeShellType, async () => {
            this._refreshAddons();
        }));
    }
    async _loadPwshCompletionAddon(xterm) {
        // Disable when shell type is not powershell. A naive check is done for Windows PowerShell
        // as we don't differentiate it in shellType
        if (this._ctx.instance.shellType !== "pwsh" /* GeneralShellType.PowerShell */ ||
            this._ctx.instance.shellLaunchConfig.executable?.endsWith('WindowsPowerShell\\v1.0\\powershell.exe')) {
            this._pwshAddon.clear();
            return;
        }
        // Disable the addon on old backends (not conpty or Windows 11)
        await this._ctx.instance.processReady;
        const processTraits = this._ctx.processManager.processTraits;
        if (processTraits?.windowsPty &&
            (processTraits.windowsPty.backend !== 'conpty' ||
                processTraits?.windowsPty.buildNumber <= 19045)) {
            return;
        }
        const pwshCompletionProviderAddon = (this._pwshAddon.value =
            this._instantiationService.createInstance(PwshCompletionProviderAddon, this._ctx.instance.capabilities));
        xterm.loadAddon(pwshCompletionProviderAddon);
        this.add(pwshCompletionProviderAddon);
        this.add(pwshCompletionProviderAddon.onDidRequestSendText((text) => {
            this._ctx.instance.sendText(text, false);
        }));
        this.add(this._terminalCompletionService.registerTerminalCompletionProvider('builtinPwsh', pwshCompletionProviderAddon.id, pwshCompletionProviderAddon));
        // If completions are requested, pause and queue input events until completions are
        // received. This fixing some problems in PowerShell, particularly enter not executing
        // when typing quickly and some characters being printed twice. On Windows this isn't
        // needed because inputs are _not_ echoed when not handled immediately.
        // TODO: This should be based on the OS of the pty host, not the client
        if (!isWindows) {
            let barrier;
            if (pwshCompletionProviderAddon) {
                this.add(pwshCompletionProviderAddon.onDidRequestSendText(() => {
                    barrier = new AutoOpenBarrier(2000);
                    this._ctx.instance.pauseInputEvents(barrier);
                }));
            }
            if (this._pwshAddon.value) {
                this.add(this._pwshAddon.value.onDidReceiveCompletions(() => {
                    barrier?.open();
                    barrier = undefined;
                }));
            }
            else {
                throw Error('no addon');
            }
        }
    }
    _loadAddons(xterm) {
        // Don't re-create the addon
        if (this._addon.value) {
            return;
        }
        const addon = (this._addon.value = this._instantiationService.createInstance(SuggestAddon, this._ctx.instance.shellType, this._ctx.instance.capabilities, this._terminalSuggestWidgetVisibleContextKey));
        xterm.loadAddon(addon);
        this._loadPwshCompletionAddon(xterm);
        if (this._ctx.instance.target === TerminalLocation.Editor) {
            addon.setContainerWithOverflow(xterm.element);
        }
        else {
            addon.setContainerWithOverflow(dom.findParentWithClass(xterm.element, 'panel'));
        }
        addon.setScreen(xterm.element.querySelector('.xterm-screen'));
        this.add(dom.addDisposableListener(this._ctx.instance.domElement, dom.EventType.FOCUS_OUT, (e) => {
            const focusedElement = e.relatedTarget;
            if (focusedElement?.classList.contains(SuggestDetailsClassName)) {
                // Don't hide the suggest widget if the focus is moving to the details
                return;
            }
            addon.hideSuggestWidget(true);
        }));
        this.add(addon.onAcceptedCompletion(async (text) => {
            this._ctx.instance.focus();
            this._ctx.instance.sendText(text, false);
        }));
        const clipboardContrib = TerminalClipboardContribution.get(this._ctx.instance);
        this.add(clipboardContrib.onWillPaste(() => (addon.isPasting = true)));
        this.add(clipboardContrib.onDidPaste(() => {
            // Delay this slightly as synchronizing the prompt input is debounced
            setTimeout(() => (addon.isPasting = false), 100);
        }));
        if (!isWindows) {
            let barrier;
            this.add(addon.onDidReceiveCompletions(() => {
                barrier?.open();
                barrier = undefined;
            }));
        }
    }
    _refreshAddons() {
        const addon = this._addon.value;
        if (!addon) {
            return;
        }
        addon.shellType = this._ctx.instance.shellType;
        if (!this._ctx.instance.xterm?.raw) {
            return;
        }
        // Relies on shell type being set
        this._loadPwshCompletionAddon(this._ctx.instance.xterm.raw);
    }
};
TerminalSuggestContribution = TerminalSuggestContribution_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, IConfigurationService),
    __param(3, IInstantiationService),
    __param(4, ITerminalCompletionService)
], TerminalSuggestContribution);
registerTerminalContribution(TerminalSuggestContribution.ID, TerminalSuggestContribution);
// #endregion
// #region Actions
registerTerminalAction({
    id: "workbench.action.terminal.configureSuggestSettings" /* TerminalSuggestCommandId.ConfigureSettings */,
    title: localize2('workbench.action.terminal.configureSuggestSettings', 'Configure'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 87 /* KeyCode.Comma */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    },
    menu: {
        id: MenuId.MenubarTerminalSuggestStatusMenu,
        group: 'right',
        order: 1,
    },
    run: (c, accessor) => accessor.get(IPreferencesService).openSettings({ query: terminalSuggestConfigSection }),
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.requestCompletions" /* TerminalSuggestCommandId.RequestCompletions */,
    title: localize2('workbench.action.terminal.requestCompletions', 'Request Completions'),
    keybinding: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 10 /* KeyCode.Space */,
        mac: { primary: 256 /* KeyMod.WinCtrl */ | 10 /* KeyCode.Space */ },
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
        when: ContextKeyExpr.and(TerminalContextKeys.focus, TerminalContextKeys.suggestWidgetVisible.negate(), ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.enabled" /* TerminalSuggestSettingId.Enabled */}`, true)),
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.requestCompletions(true),
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.resetSuggestWidgetSize" /* TerminalSuggestCommandId.ResetWidgetSize */,
    title: localize2('workbench.action.terminal.resetSuggestWidgetSize', 'Reset Suggest Widget Size'),
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.resetWidgetSize(),
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.selectPrevSuggestion" /* TerminalSuggestCommandId.SelectPrevSuggestion */,
    title: localize2('workbench.action.terminal.selectPrevSuggestion', 'Select the Previous Suggestion'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        // Up is bound to other workbench keybindings that this needs to beat
        primary: 16 /* KeyCode.UpArrow */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
        when: ContextKeyExpr.or(SimpleSuggestContext.HasNavigated, ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.upArrowNavigatesHistory" /* TerminalSuggestSettingId.UpArrowNavigatesHistory */}`, false)),
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.selectPreviousSuggestion(),
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.selectPrevPageSuggestion" /* TerminalSuggestCommandId.SelectPrevPageSuggestion */,
    title: localize2('workbench.action.terminal.selectPrevPageSuggestion', 'Select the Previous Page Suggestion'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        // Up is bound to other workbench keybindings that this needs to beat
        primary: 11 /* KeyCode.PageUp */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.selectPreviousPageSuggestion(),
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.selectNextSuggestion" /* TerminalSuggestCommandId.SelectNextSuggestion */,
    title: localize2('workbench.action.terminal.selectNextSuggestion', 'Select the Next Suggestion'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        // Down is bound to other workbench keybindings that this needs to beat
        primary: 18 /* KeyCode.DownArrow */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.selectNextSuggestion(),
});
registerActiveInstanceAction({
    id: 'terminalSuggestToggleExplainMode',
    title: localize2('workbench.action.terminal.suggestToggleExplainMode', 'Suggest Toggle Explain Modes'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        // Down is bound to other workbench keybindings that this needs to beat
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
        primary: 2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */,
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.toggleExplainMode(),
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.suggestToggleDetailsFocus" /* TerminalSuggestCommandId.ToggleDetailsFocus */,
    title: localize2('workbench.action.terminal.suggestToggleDetailsFocus', 'Suggest Toggle Suggestion Focus'),
    f1: false,
    // HACK: This does not work with a precondition of `TerminalContextKeys.suggestWidgetVisible`, so make sure to not override the editor's keybinding
    precondition: EditorContextKeys.textInputFocus.negate(),
    keybinding: {
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 10 /* KeyCode.Space */,
        mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 10 /* KeyCode.Space */ },
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.toggleSuggestionFocus(),
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.suggestToggleDetails" /* TerminalSuggestCommandId.ToggleDetails */,
    title: localize2('workbench.action.terminal.suggestToggleDetails', 'Suggest Toggle Details'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.isOpen, TerminalContextKeys.focus, TerminalContextKeys.suggestWidgetVisible, SimpleSuggestContext.HasFocusedSuggestion),
    keybinding: {
        // HACK: Force weight to be higher than that to start terminal chat
        weight: 400 /* KeybindingWeight.ExternalExtension */ + 2,
        primary: 2048 /* KeyMod.CtrlCmd */ | 10 /* KeyCode.Space */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */],
        mac: { primary: 256 /* KeyMod.WinCtrl */ | 10 /* KeyCode.Space */, secondary: [2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */] },
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.toggleSuggestionDetails(),
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.selectNextPageSuggestion" /* TerminalSuggestCommandId.SelectNextPageSuggestion */,
    title: localize2('workbench.action.terminal.selectNextPageSuggestion', 'Select the Next Page Suggestion'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        // Down is bound to other workbench keybindings that this needs to beat
        primary: 12 /* KeyCode.PageDown */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.selectNextPageSuggestion(),
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.acceptSelectedSuggestion" /* TerminalSuggestCommandId.AcceptSelectedSuggestion */,
    title: localize2('workbench.action.terminal.acceptSelectedSuggestion', 'Insert'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        primary: 2 /* KeyCode.Tab */,
        // Tab is bound to other workbench keybindings that this needs to beat
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
    },
    menu: {
        id: MenuId.MenubarTerminalSuggestStatusMenu,
        order: 1,
        group: 'left',
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.acceptSelectedSuggestion(),
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.acceptSelectedSuggestionEnter" /* TerminalSuggestCommandId.AcceptSelectedSuggestionEnter */,
    title: localize2('workbench.action.terminal.acceptSelectedSuggestionEnter', 'Accept Selected Suggestion (Enter)'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        primary: 3 /* KeyCode.Enter */,
        // Enter is bound to other workbench keybindings that this needs to beat
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
        when: ContextKeyExpr.notEquals(`config.${"terminal.integrated.suggest.runOnEnter" /* TerminalSuggestSettingId.RunOnEnter */}`, 'ignore'),
    },
    run: async (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.acceptSelectedSuggestion(undefined, true),
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.hideSuggestWidget" /* TerminalSuggestCommandId.HideSuggestWidget */,
    title: localize2('workbench.action.terminal.hideSuggestWidget', 'Hide Suggest Widget'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        primary: 9 /* KeyCode.Escape */,
        // Escape is bound to other workbench keybindings that this needs to beat
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.hideSuggestWidget(true),
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.hideSuggestWidgetAndNavigateHistory" /* TerminalSuggestCommandId.HideSuggestWidgetAndNavigateHistory */,
    title: localize2('workbench.action.terminal.hideSuggestWidgetAndNavigateHistory', 'Hide Suggest Widget and Navigate History'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        primary: 16 /* KeyCode.UpArrow */,
        when: ContextKeyExpr.and(SimpleSuggestContext.HasNavigated.negate(), ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.upArrowNavigatesHistory" /* TerminalSuggestSettingId.UpArrowNavigatesHistory */}`, true)),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 2,
    },
    run: (activeInstance) => {
        TerminalSuggestContribution.get(activeInstance)?.addon?.hideSuggestWidget(true);
        activeInstance.sendText('\u001b[A', false); // Up arrow
    },
});
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuc3VnZ2VzdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvc3VnZ2VzdC9icm93c2VyL3Rlcm1pbmFsLnN1Z2dlc3QuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFM0QsT0FBTyxFQUNOLGVBQWUsRUFDZixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQ04sY0FBYyxFQUVkLGtCQUFrQixHQUNsQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRXJHLE9BQU8sRUFFTixnQkFBZ0IsR0FDaEIsTUFBTSxxREFBcUQsQ0FBQTtBQU01RCxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLHNCQUFzQixHQUN0QixNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFDTiw0QkFBNEIsR0FFNUIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVwRixPQUFPLEVBQ04sNEJB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