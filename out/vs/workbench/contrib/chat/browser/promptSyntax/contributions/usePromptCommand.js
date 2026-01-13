/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../nls.js';
import { CHAT_CATEGORY } from '../../actions/chatActions.js';
import { IChatWidgetService } from '../../chat.js';
import { ChatContextKeys } from '../../../common/chatContextKeys.js';
import { PromptsConfig } from '../../../../../../platform/prompts/common/config.js';
import { isPromptFile } from '../../../../../../platform/prompts/common/constants.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { MenuId, MenuRegistry } from '../../../../../../platform/actions/common/actions.js';
import { isCodeEditor, isDiffEditor, } from '../../../../../../editor/browser/editorBrowser.js';
import { KeybindingsRegistry, } from '../../../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ATTACH_PROMPT_ACTION_ID, } from '../../actions/chatAttachPromptAction/chatAttachPromptAction.js';
/**
 * Command ID of the "Use Prompt" command.
 */
export const COMMAND_ID = 'workbench.command.prompts.use';
/**
 * Keybinding of the "Use Prompt" command.
 * The `cmd + /` is the current keybinding for 'attachment', so we use
 * the `alt` key modifier to convey the "prompt attachment" action.
 */
const COMMAND_KEY_BINDING = 2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */ | 512 /* KeyMod.Alt */;
/**
 * Implementation of the "Use Prompt" command. The command works in the following way.
 *
 * When executed, it tries to see if a `prompt file` was open in the active code editor
 * (see {@link IChatAttachPromptActionOptions.resource resource}), and if a chat input
 * is focused (see {@link IChatAttachPromptActionOptions.widget widget}).
 *
 * Then the command shows prompt selection dialog to the user. If an active prompt file
 * was detected, it is pre-selected in the dialog. User can confirm (`enter`) or select
 * a different prompt file in the dialog.
 *
 * When a prompt file is selected by the user (or confirmed), the command attaches
 * the selected prompt to the focused chat input, if present. If no focused chat input
 * is present, the command would attach the prompt to a `chat panel` input by default
 * (either the last focused instance, or a new one). If the `alt` (`option` on mac) key
 * was pressed when the prompt was selected, a `chat edits` panel is used instead
 * (likewise either the last focused or a new one).
 */
const command = async (accessor) => {
    const commandService = accessor.get(ICommandService);
    const options = {
        resource: getActivePromptUri(accessor),
        widget: getFocusedChatWidget(accessor),
    };
    await commandService.executeCommand(ATTACH_PROMPT_ACTION_ID, options);
};
/**
 * Get chat widget reference to attach prompt to.
 */
export function getFocusedChatWidget(accessor) {
    const chatWidgetService = accessor.get(IChatWidgetService);
    const { lastFocusedWidget } = chatWidgetService;
    if (!lastFocusedWidget) {
        return undefined;
    }
    // the widget input `must` be focused at the time when command run
    if (!lastFocusedWidget.hasInputFocus()) {
        return undefined;
    }
    return lastFocusedWidget;
}
/**
 * Gets active editor instance, if any.
 */
export function getActiveCodeEditor(accessor) {
    const editorService = accessor.get(IEditorService);
    const { activeTextEditorControl } = editorService;
    if (isCodeEditor(activeTextEditorControl) && activeTextEditorControl.hasModel()) {
        return activeTextEditorControl;
    }
    if (isDiffEditor(activeTextEditorControl)) {
        const originalEditor = activeTextEditorControl.getOriginalEditor();
        if (!originalEditor.hasModel()) {
            return undefined;
        }
        return originalEditor;
    }
    return undefined;
}
/**
 * Gets `URI` of a prompt file open in an active editor instance, if any.
 */
const getActivePromptUri = (accessor) => {
    const activeEditor = getActiveCodeEditor(accessor);
    if (!activeEditor) {
        return undefined;
    }
    const { uri } = activeEditor.getModel();
    if (isPromptFile(uri)) {
        return uri;
    }
    return undefined;
};
/**
 * Register the "Use Prompt" command with its keybinding.
 */
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: COMMAND_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: COMMAND_KEY_BINDING,
    handler: command,
    when: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
});
/**
 * Register the "Use Prompt" command in the `command palette`.
 */
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: COMMAND_ID,
        title: localize('commands.prompts.use.title', 'Use Prompt'),
        category: CHAT_CATEGORY,
    },
    when: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlUHJvbXB0Q29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL3Byb21wdFN5bnRheC9jb250cmlidXRpb25zL3VzZVByb21wdENvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRW5ELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM1RCxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRXBFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNuRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDckYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUN4RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDM0YsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUUzRixPQUFPLEVBRU4sWUFBWSxFQUNaLFlBQVksR0FDWixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSxxRUFBcUUsQ0FBQTtBQUM1RSxPQUFPLEVBRU4sdUJBQXVCLEdBQ3ZCLE1BQU0sZ0VBQWdFLENBQUE7QUFFdkU7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsK0JBQStCLENBQUE7QUFF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