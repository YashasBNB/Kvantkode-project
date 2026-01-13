/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { AccessibleContentProvider, } from '../../../../../platform/accessibility/browser/accessibleView.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
import { TerminalChatContextKeys } from './terminalChat.js';
import { TerminalChatController } from './terminalChatController.js';
export class TerminalChatAccessibilityHelp {
    constructor() {
        this.priority = 110;
        this.name = 'terminalChat';
        this.when = TerminalChatContextKeys.focused;
        this.type = "help" /* AccessibleViewType.Help */;
    }
    getProvider(accessor) {
        const terminalService = accessor.get(ITerminalService);
        const instance = terminalService.activeInstance;
        if (!instance) {
            return;
        }
        const helpText = getAccessibilityHelpText(accessor);
        return new AccessibleContentProvider("terminal-chat" /* AccessibleViewProviderId.TerminalChat */, { type: "help" /* AccessibleViewType.Help */ }, () => helpText, () => TerminalChatController.get(instance)?.terminalChatWidget?.focus(), "accessibility.verbosity.terminalChat" /* AccessibilityVerbositySettingId.TerminalChat */);
    }
}
export function getAccessibilityHelpText(accessor) {
    const keybindingService = accessor.get(IKeybindingService);
    const content = [];
    const openAccessibleViewKeybinding = keybindingService
        .lookupKeybinding('editor.action.accessibleView')
        ?.getAriaLabel();
    const runCommandKeybinding = keybindingService
        .lookupKeybinding("workbench.action.terminal.chat.runCommand" /* TerminalChatCommandId.RunCommand */)
        ?.getAriaLabel();
    const insertCommandKeybinding = keybindingService
        .lookupKeybinding("workbench.action.terminal.chat.insertCommand" /* TerminalChatCommandId.InsertCommand */)
        ?.getAriaLabel();
    const makeRequestKeybinding = keybindingService
        .lookupKeybinding("workbench.action.terminal.chat.makeRequest" /* TerminalChatCommandId.MakeRequest */)
        ?.getAriaLabel();
    const startChatKeybinding = keybindingService
        .lookupKeybinding("workbench.action.terminal.chat.start" /* TerminalChatCommandId.Start */)
        ?.getAriaLabel();
    const focusResponseKeybinding = keybindingService
        .lookupKeybinding('chat.action.focus')
        ?.getAriaLabel();
    const focusInputKeybinding = keybindingService
        .lookupKeybinding('workbench.action.chat.focusInput')
        ?.getAriaLabel();
    content.push(localize('inlineChat.overview', 'Inline chat occurs within a terminal. It is useful for suggesting terminal commands. Keep in mind that AI generated code may be incorrect.'));
    content.push(localize('inlineChat.access', 'It can be activated using the command: Terminal: Start Chat ({0}), which will focus the input box.', startChatKeybinding));
    content.push(makeRequestKeybinding
        ? localize('inlineChat.input', 'The input box is where the user can type a request and can make the request ({0}). The widget will be closed and all content will be discarded when the Escape key is pressed and the terminal will regain focus.', makeRequestKeybinding)
        : localize('inlineChat.inputNoKb', 'The input box is where the user can type a request and can make the request by tabbing to the Make Request button, which is not currently triggerable via keybindings. The widget will be closed and all content will be discarded when the Escape key is pressed and the terminal will regain focus.'));
    content.push(openAccessibleViewKeybinding
        ? localize('inlineChat.inspectResponseMessage', 'The response can be inspected in the accessible view ({0}).', openAccessibleViewKeybinding)
        : localize('inlineChat.inspectResponseNoKb', 'With the input box focused, inspect the response in the accessible view via the Open Accessible View command, which is currently not triggerable by a keybinding.'));
    content.push(focusResponseKeybinding
        ? localize('inlineChat.focusResponse', 'Reach the response from the input box ({0}).', focusResponseKeybinding)
        : localize('inlineChat.focusResponseNoKb', 'Reach the response from the input box by tabbing or assigning a keybinding for the command: Focus Terminal Response.'));
    content.push(focusInputKeybinding
        ? localize('inlineChat.focusInput', 'Reach the input box from the response ({0}).', focusInputKeybinding)
        : localize('inlineChat.focusInputNoKb', 'Reach the response from the input box by shift+tabbing or assigning a keybinding for the command: Focus Terminal Input.'));
    content.push(runCommandKeybinding
        ? localize('inlineChat.runCommand', 'With focus in the input box or command editor, the Terminal: Run Chat Command ({0}) action.', runCommandKeybinding)
        : localize('inlineChat.runCommandNoKb', 'Run a command by tabbing to the button as the action is currently not triggerable by a keybinding.'));
    content.push(insertCommandKeybinding
        ? localize('inlineChat.insertCommand', 'With focus in the input box command editor, the Terminal: Insert Chat Command ({0}) action.', insertCommandKeybinding)
        : localize('inlineChat.insertCommandNoKb', 'Insert a command by tabbing to the button as the action is currently not triggerable by a keybinding.'));
    content.push(localize('inlineChat.toolbar', 'Use tab to reach conditional parts like commands, status, message responses and more.'));
    content.push(localize('chat.signals', 'Accessibility Signals can be changed via settings with a prefix of signals.chat. By default, if a request takes more than 4 seconds, you will hear a sound indicating that progress is still occurring.'));
    return content.join('\n');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0QWNjZXNzaWJpbGl0eUhlbHAuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0L2Jyb3dzZXIvdGVybWluYWxDaGF0QWNjZXNzaWJpbGl0eUhlbHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFHTix5QkFBeUIsR0FDekIsTUFBTSxpRUFBaUUsQ0FBQTtBQUd4RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUU1RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN4RSxPQUFPLEVBQXlCLHVCQUF1QixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDbEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFcEUsTUFBTSxPQUFPLDZCQUE2QjtJQUExQztRQUNVLGFBQVEsR0FBRyxHQUFHLENBQUE7UUFDZCxTQUFJLEdBQUcsY0FBYyxDQUFBO1FBQ3JCLFNBQUksR0FBRyx1QkFBdUIsQ0FBQyxPQUFPLENBQUE7UUFDdEMsU0FBSSx3Q0FBMEI7SUFrQnhDLENBQUM7SUFqQkEsV0FBVyxDQUFDLFFBQTBCO1FBQ3JDLE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUV0RCxNQUFNLFFBQVEsR0FBRyxlQUFlLENBQUMsY0FBYyxDQUFBO1FBQy9DLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxD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