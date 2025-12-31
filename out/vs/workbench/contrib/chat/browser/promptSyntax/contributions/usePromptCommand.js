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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlUHJvbXB0Q29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9wcm9tcHRTeW50YXgvY29udHJpYnV0aW9ucy91c2VQcm9tcHRDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUVuRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDNUQsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUVwRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDbkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDeEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFM0YsT0FBTyxFQUVOLFlBQVksRUFDWixZQUFZLEdBQ1osTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0scUVBQXFFLENBQUE7QUFDNUUsT0FBTyxFQUVOLHVCQUF1QixHQUN2QixNQUFNLGdFQUFnRSxDQUFBO0FBRXZFOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLCtCQUErQixDQUFBO0FBRXpEOzs7O0dBSUc7QUFDSCxNQUFNLG1C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