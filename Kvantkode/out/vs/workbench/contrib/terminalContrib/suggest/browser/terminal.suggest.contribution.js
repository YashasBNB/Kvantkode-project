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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuc3VnZ2VzdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvdGVybWluYWwuc3VnZ2VzdC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUzRCxPQUFPLEVBQ04sZUFBZSxFQUNmLGlCQUFpQixFQUNqQixZQUFZLEdBQ1osTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFDTixjQUFjLEVBRWQsa0JBQWtCLEdBQ2xCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFFckcsT0FBTyxFQUVOLGdCQUFnQixHQUNoQixNQUFNLHFEQUFxRCxDQUFBO0FBTTVELE9BQU8sRUFDTiw0QkFBNEIsRUFDNUIsc0JBQXNCLEdBQ3RCLE1BQU0sOENBQThDLENBQUE7QUFDckQsT0FBTyxFQUNOLDRCQUE0QixHQUU1QixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRXBGLE9BQU8sRUFD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