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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxBY2Nlc3NpYmlsaXR5SGVscC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2FjY2Vzc2liaWxpdHkvYnJvd3Nlci90ZXJtaW5hbEFjY2Vzc2liaWxpdHlIZWxwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3JGLE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEdBQ2xCLE1BQU0seURBQXlELENBQUE7QUFVaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFVckcsT0FBTyxFQUNOLHFCQUFxQixFQUNyQiwrQkFBK0IsR0FFL0IsTUFBTSw4REFBOEQsQ0FBQTtBQUtyRSxNQUFNLENBQU4sSUFBa0IsU0FHakI7QUFIRCxXQUFrQixTQUFTO0lBQzFCLDhCQUFpQixDQUFBO0lBQ2pCLHdDQUEyQixDQUFBO0FBQzVCLENBQUMsRUFIaUIsU0FBUyxLQUFULFNBQVMsUUFHMUI7QUFFTSxJQUFNLGlDQUFpQyxHQUF2QyxNQUFNLGlDQUNaLFNBQVEsVUFBVTtJQUtsQixPQUFPO1FBQ04sTUFBTSxJQUFJLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FDOUIscUJBQXFCLEVBQ3JCLGNBQWMsQ0FBQyxNQUFNLENBQ3BCLCtCQUErQixDQUFDLEdBQUcsOERBRW5DLENBQ0QsQ0FBQTtRQUNELElBQUksSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsa0JBQWtC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