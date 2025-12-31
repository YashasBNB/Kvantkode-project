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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0QWNjZXNzaWJpbGl0eUhlbHAuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdC9icm93c2VyL3Rlcm1pbmFsQ2hhdEFjY2Vzc2liaWxpdHlIZWxwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBR04seUJBQXlCLEdBQ3pCLE1BQU0saUVBQWlFLENBQUE7QUFHeEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFFNUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDeEUsT0FBTyxFQUF5Qix1QkFBdUIsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ2xGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRXBFLE1BQU0sT0FBTyw2QkFBNkI7SUFBMUM7UUFDVSxhQUFRLEdBQUcsR0FBRyxDQUFBO1FBQ2QsU0FBSSxHQUFHLGNBQWMsQ0FBQTtRQUNyQixTQUFJLEdBQUcsdUJBQXVCLENBQUMsT0FBTyxDQUFBO1FBQ3RDLFNBQUksd0NBQTBCO0lBa0J4QyxDQUFDO0lBakJBLFdBQVcsQ0FBQyxRQUEwQjtRQUNyQyxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFFdEQsTUFBTSxRQUFRLEdBQUcsZUFBZSxDQUFDLGNBQWMsQ0FBQTtRQUMvQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ25ELE9BQU8sSUFB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