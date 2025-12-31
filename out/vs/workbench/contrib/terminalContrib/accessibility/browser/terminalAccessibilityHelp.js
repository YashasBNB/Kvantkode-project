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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { accessibleViewIsShown, accessibleViewCurrentProviderId, } from '../../../accessibility/browser/accessibilityConfiguration.js';
export var ClassName;
(function (ClassName) {
    ClassName["Active"] = "active";
    ClassName["EditorTextArea"] = "textarea";
})(ClassName || (ClassName = {}));
let TerminalAccessibilityHelpProvider = class TerminalAccessibilityHelpProvider extends Disposable {
    onClose() {
        const expr = ContextKeyExpr.and(accessibleViewIsShown, ContextKeyExpr.equals(accessibleViewCurrentProviderId.key, "terminal-help" /* AccessibleViewProviderId.TerminalHelp */));
        if (expr?.evaluate(this._contextKeyService.getContext(null))) {
            this._commandService.executeCommand("workbench.action.terminal.focusAccessibleBuffer" /* TerminalAccessibilityCommandId.FocusAccessibleBuffer */);
        }
        else {
            this._instance.focus();
        }
        this.dispose();
    }
    constructor(_instance, _xterm, _commandService, _configurationService, _contextKeyService) {
        super();
        this._instance = _instance;
        this._commandService = _commandService;
        this._configurationService = _configurationService;
        this._contextKeyService = _contextKeyService;
        this.id = "terminal-help" /* AccessibleViewProviderId.TerminalHelp */;
        this._hasShellIntegration = false;
        this.options = {
            type: "help" /* AccessibleViewType.Help */,
            readMoreUrl: 'https://code.visualstudio.com/docs/editor/accessibility#_terminal-accessibility',
        };
        this.verbositySettingKey = "accessibility.verbosity.terminal" /* AccessibilityVerbositySettingId.Terminal */;
        this._hasShellIntegration = _xterm.shellIntegration.status === 2 /* ShellIntegrationStatus.VSCode */;
    }
    provideContent() {
        const content = [
            localize('focusAccessibleTerminalView', 'The Focus Accessible Terminal View command<keybinding:{0}> enables screen readers to read terminal contents.', "workbench.action.terminal.focusAccessibleBuffer" /* TerminalAccessibilityCommandId.FocusAccessibleBuffer */),
            localize('preserveCursor', 'Customize the behavior of the cursor when toggling between the terminal and accessible view with `terminal.integrated.accessibleViewPreserveCursorPosition.`'),
            localize('openDetectedLink', 'The Open Detected Link command<keybinding:{0}> enables screen readers to easily open links found in the terminal.', "workbench.action.terminal.openDetectedLink" /* TerminalLinksCommandId.OpenDetectedLink */),
            localize('newWithProfile', 'The Create New Terminal (With Profile) command<keybinding:{0}> allows for easy terminal creation using a specific profile.', "workbench.action.terminal.newWithProfile" /* TerminalCommandId.NewWithProfile */),
            localize('focusAfterRun', 'Configure what gets focused after running selected text in the terminal with `{0}`.', "terminal.integrated.focusAfterRun" /* TerminalSettingId.FocusAfterRun */),
        ];
        if (!this._configurationService.getValue("terminal.integrated.accessibleViewFocusOnCommandExecution" /* TerminalAccessibilitySettingId.AccessibleViewFocusOnCommandExecution */)) {
            content.push(localize('focusViewOnExecution', 'Enable `terminal.integrated.accessibleViewFocusOnCommandExecution` to automatically focus the terminal accessible view when a command is executed in the terminal.'));
        }
        if (this._configurationService.getValue("terminal.integrated.suggest.enabled" /* TerminalSuggestSettingId.Enabled */)) {
            content.push(localize('suggestTrigger', 'The terminal request completions command can be invoked manually<keybinding:{0}>, but also appears while typing.', "workbench.action.terminal.requestCompletions" /* TerminalSuggestCommandId.RequestCompletions */));
            content.push(localize('suggestCommands', 'When the terminal suggest widget is focused, accept the suggestion<keybinding:{0}> and configure suggest settings<keybinding:{1}>.', "workbench.action.terminal.acceptSelectedSuggestion" /* TerminalSuggestCommandId.AcceptSelectedSuggestion */, "workbench.action.terminal.configureSuggestSettings" /* TerminalSuggestCommandId.ConfigureSettings */));
            content.push(localize('suggestCommandsMore', 'Also, when the suggest widget is focused, toggle between the widget and terminal<keybinding:{0}> and toggle details focus<keybinding:{1}> to learn more about the suggestion.', "workbench.action.terminal.suggestToggleDetails" /* TerminalSuggestCommandId.ToggleDetails */, "workbench.action.terminal.suggestToggleDetailsFocus" /* TerminalSuggestCommandId.ToggleDetailsFocus */));
        }
        if (this._instance.shellType === "cmd" /* WindowsShellType.CommandPrompt */) {
            content.push(localize('commandPromptMigration', 'Consider using powershell instead of command prompt for an improved experience'));
        }
        if (this._hasShellIntegration) {
            content.push(localize('shellIntegration', 'The terminal has a feature called shell integration that offers an enhanced experience and provides useful commands for screen readers such as:'));
            content.push('- ' +
                localize('goToNextCommand', 'Go to Next Command<keybinding:{0}> in the accessible view', "workbench.action.terminal.accessibleBufferGoToNextCommand" /* TerminalAccessibilityCommandId.AccessibleBufferGoToNextCommand */));
            content.push('- ' +
                localize('goToPreviousCommand', 'Go to Previous Command<keybinding:{0}> in the accessible view', "workbench.action.terminal.accessibleBufferGoToPreviousCommand" /* TerminalAccessibilityCommandId.AccessibleBufferGoToPreviousCommand */));
            content.push('- ' +
                localize('goToSymbol', 'Go to Symbol<keybinding:{0}>', "editor.action.accessibleViewGoToSymbol" /* AccessibilityCommandId.GoToSymbol */));
            content.push('- ' +
                localize('runRecentCommand', 'Run Recent Command<keybinding:{0}>', "workbench.action.terminal.runRecentCommand" /* TerminalHistoryCommandId.RunRecentCommand */));
            content.push('- ' +
                localize('goToRecentDirectory', 'Go to Recent Directory<keybinding:{0}>', "workbench.action.terminal.goToRecentDirectory" /* TerminalHistoryCommandId.GoToRecentDirectory */));
        }
        else {
            content.push(localize('noShellIntegration', 'Shell integration is not enabled. Some accessibility features may not be available.'));
        }
        return content.join('\n');
    }
};
TerminalAccessibilityHelpProvider = __decorate([
    __param(2, ICommandService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService)
], TerminalAccessibilityHelpProvider);
export { TerminalAccessibilityHelpProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxBY2Nlc3NpYmlsaXR5SGVscC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9hY2Nlc3NpYmlsaXR5L2Jyb3dzZXIvdGVybWluYWxBY2Nlc3NpYmlsaXR5SGVscC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNyRixPQUFPLEVBQ04sY0FBYyxFQUNkLGtCQUFrQixHQUNsQixNQUFNLHlEQUF5RCxDQUFBO0FBVWhFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBVXJHLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsK0JBQStCLEdBRS9CLE1BQU0sOERBQThELENBQUE7QUFLckUsTUFBTSxDQUFOLElBQWtCLFNBR2pCO0FBSEQsV0FBa0IsU0FBUztJQUMxQiw4QkFBaUIsQ0FBQTtJQUNqQix3Q0FBMkIsQ0FBQTtBQUM1QixDQUFDLEVBSGlCLFNBQVMsS0FBVCxTQUFTLFFBRzFCO0FBRU0sSUFBTSxpQ0FBaUMsR0FBdkMsTUFBTSxpQ0FDWixTQUFRLFVBQVU7SUFLbEIsT0FBTztRQUNOLE1BQU0sSUFBSSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQzlCLHFCQUFxQixFQUNyQixjQUFjLENBQUMsTUFBTSxDQUNwQiwrQkFBK0IsQ0FBQyxHQUFHLDhEQUVuQyxDQUNELENBQUE7UUFDRCxJQUFJLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENB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