/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { AccessibleDiffViewerNext } from '../../../../../editor/browser/widget/diffEditor/commands.js';
import { localize } from '../../../../../nls.js';
import { AccessibleContentProvider, } from '../../../../../platform/accessibility/browser/accessibleView.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { INLINE_CHAT_ID } from '../../../inlineChat/common/inlineChat.js';
import { ChatContextKeyExprs, ChatContextKeys } from '../../common/chatContextKeys.js';
import { ChatAgentLocation, ChatMode } from '../../common/constants.js';
import { IChatWidgetService } from '../chat.js';
export class PanelChatAccessibilityHelp {
    constructor() {
        this.priority = 107;
        this.name = 'panelChat';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = ContextKeyExpr.and(ChatContextKeys.location.isEqualTo(ChatAgentLocation.Panel), ChatContextKeys.inQuickChat.negate(), ChatContextKeys.chatMode.isEqualTo(ChatMode.Ask), ContextKeyExpr.or(ChatContextKeys.inChatSession, ChatContextKeys.isResponse, ChatContextKeys.isRequest));
    }
    getProvider(accessor) {
        const codeEditor = accessor.get(ICodeEditorService).getActiveCodeEditor() ||
            accessor.get(ICodeEditorService).getFocusedCodeEditor();
        return getChatAccessibilityHelpProvider(accessor, codeEditor ?? undefined, 'panelChat');
    }
}
export class QuickChatAccessibilityHelp {
    constructor() {
        this.priority = 107;
        this.name = 'quickChat';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = ContextKeyExpr.and(ChatContextKeys.inQuickChat, ContextKeyExpr.or(ChatContextKeys.inChatSession, ChatContextKeys.isResponse, ChatContextKeys.isRequest));
    }
    getProvider(accessor) {
        const codeEditor = accessor.get(ICodeEditorService).getActiveCodeEditor() ||
            accessor.get(ICodeEditorService).getFocusedCodeEditor();
        return getChatAccessibilityHelpProvider(accessor, codeEditor ?? undefined, 'quickChat');
    }
}
export class EditsChatAccessibilityHelp {
    constructor() {
        this.priority = 119;
        this.name = 'editsView';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = ContextKeyExpr.and(ChatContextKeyExprs.inEditingMode, ChatContextKeys.inChatInput);
    }
    getProvider(accessor) {
        const codeEditor = accessor.get(ICodeEditorService).getActiveCodeEditor() ||
            accessor.get(ICodeEditorService).getFocusedCodeEditor();
        return getChatAccessibilityHelpProvider(accessor, codeEditor ?? undefined, 'editsView');
    }
}
export class AgentChatAccessibilityHelp {
    constructor() {
        this.priority = 120;
        this.name = 'agentView';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = ContextKeyExpr.and(ChatContextKeys.chatMode.isEqualTo(ChatMode.Agent), ChatContextKeys.inChatInput);
    }
    getProvider(accessor) {
        const codeEditor = accessor.get(ICodeEditorService).getActiveCodeEditor() ||
            accessor.get(ICodeEditorService).getFocusedCodeEditor();
        return getChatAccessibilityHelpProvider(accessor, codeEditor ?? undefined, 'agentView');
    }
}
export function getAccessibilityHelpText(type, keybindingService) {
    const content = [];
    if (type === 'panelChat' || type === 'quickChat') {
        if (type === 'quickChat') {
            content.push(localize('chat.overview', 'The quick chat view is comprised of an input box and a request/response list. The input box is used to make requests and the list is used to display responses.'));
            content.push(localize('chat.differenceQuick', 'The quick chat view is a transient interface for making and viewing requests, while the panel chat view is a persistent interface that also supports navigating suggested follow-up questions.'));
        }
        if (type === 'panelChat') {
            content.push(localize('chat.differencePanel', 'The panel chat view is a persistent interface that also supports navigating suggested follow-up questions, while the quick chat view is a transient interface for making and viewing requests.'));
            content.push(localize('chat.followUp', 'In the input box, navigate to the suggested follow up question (Shift+Tab) and press Enter to run it.'));
        }
        content.push(localize('chat.requestHistory', 'In the input box, use up and down arrows to navigate your request history. Edit input and use enter or the submit button to run a new request.'));
        content.push(localize('chat.inspectResponse', 'In the input box, inspect the last response in the accessible view{0}.', '<keybinding:editor.action.accessibleView>'));
        content.push(localize('chat.announcement', 'Chat responses will be announced as they come in. A response will indicate the number of code blocks, if any, and then the rest of the response.'));
        content.push(localize('workbench.action.chat.focus', 'To focus the chat request/response list, which can be navigated with up and down arrows, invoke the Focus Chat command{0}.', getChatFocusKeybindingLabel(keybindingService, type, false)));
        content.push(localize('workbench.action.chat.focusInput', 'To focus the input box for chat requests, invoke the Focus Chat Input command{0}.', getChatFocusKeybindingLabel(keybindingService, type, true)));
        content.push(localize('workbench.action.chat.nextCodeBlock', 'To focus the next code block within a response, invoke the Chat: Next Code Block command{0}.', '<keybinding:workbench.action.chat.nextCodeBlock>'));
        if (type === 'panelChat') {
            content.push(localize('workbench.action.chat.newChat', 'To create a new chat session, invoke the New Chat command{0}.', '<keybinding:workbench.action.chat.new>'));
        }
    }
    if (type === 'editsView' || type === 'agentView') {
        if (type === 'agentView') {
            content.push(localize('chatAgent.overview', 'The chat agent view is used to apply edits across files in your workspace, enable running commands in the terminal, and more.'));
        }
        else {
            content.push(localize('chatEditing.overview', 'The chat editing view is used to apply edits across files.'));
        }
        content.push(localize('chatEditing.format', 'It is comprised of an input box and a file working set (Shift+Tab).'));
        content.push(localize('chatEditing.expectation', 'When a request is made, a progress indicator will play while the edits are being applied.'));
        content.push(localize('chatEditing.review', 'Once the edits are applied, a sound will play to indicate the document has been opened and is ready for review. The sound can be disabled with accessibility.signals.chatEditModifiedFile.'));
        content.push(localize('chatEditing.sections', 'Navigate between edits in the editor with navigate previous{0} and next{1}', '<keybinding:chatEditor.action.navigatePrevious>', '<keybinding:chatEditor.action.navigateNext>'));
        content.push(localize('chatEditing.acceptHunk', 'In the editor, Keep{0}, Undo{1}, or Toggle the Diff{2} for the current Change.', '<keybinding:chatEditor.action.acceptHunk>', '<keybinding:chatEditor.action.undoHunk>', '<keybinding:chatEditor.action.toggleDiff>'));
        content.push(localize('chatEditing.undoKeepSounds', 'Sounds will play when a change is accepted or undone. The sounds can be disabled with accessibility.signals.editsKept and accessibility.signals.editsUndone.'));
        if (type === 'agentView') {
            content.push(localize('chatAgent.userActionRequired', 'An alert will indicate when user action is required. For example, if the agent wants to run something in the terminal, you will hear Action Required: Run Command in Terminal.'));
            content.push(localize('chatAgent.runCommand', 'To take the action, use the accept tool command{0}.', '<keybinding:workbench.action.chat.acceptTool>'));
        }
        content.push(localize('chatEditing.helpfulCommands', 'Some helpful commands include:'));
        content.push(localize('workbench.action.chat.undoEdits', '- Undo Edits{0}.', '<keybinding:workbench.action.chat.undoEdits>'));
        content.push(localize('workbench.action.chat.editing.attachFiles', '- Attach Files{0}.', '<keybinding:workbench.action.chat.editing.attachFiles>'));
        content.push(localize('chatEditing.removeFileFromWorkingSet', '- Remove File from Working Set{0}.', '<keybinding:chatEditing.removeFileFromWorkingSet>'));
        content.push(localize('chatEditing.acceptFile', '- Keep{0} and Undo File{1}.', '<keybinding:chatEditing.acceptFile>', '<keybinding:chatEditing.discardFile>'));
        content.push(localize('chatEditing.saveAllFiles', '- Save All Files{0}.', '<keybinding:chatEditing.saveAllFiles>'));
        content.push(localize('chatEditing.acceptAllFiles', '- Keep All Edits{0}.', '<keybinding:chatEditing.acceptAllFiles>'));
        content.push(localize('chatEditing.discardAllFiles', '- Undo All Edits{0}.', '<keybinding:chatEditing.discardAllFiles>'));
        content.push(localize('chatEditing.openFileInDiff', '- Open File in Diff{0}.', '<keybinding:chatEditing.openFileInDiff>'));
        content.push(localize('chatEditing.viewChanges', '- View Changes{0}.', '<keybinding:chatEditing.viewChanges>'));
    }
    else {
        content.push(localize('inlineChat.overview', 'Inline chat occurs within a code editor and takes into account the current selection. It is useful for making changes to the current editor. For example, fixing diagnostics, documenting or refactoring code. Keep in mind that AI generated code may be incorrect.'));
        content.push(localize('inlineChat.access', 'It can be activated via code actions or directly using the command: Inline Chat: Start Inline Chat{0}.', '<keybinding:inlineChat.start>'));
        content.push(localize('inlineChat.requestHistory', 'In the input box, use Show Previous{0} and Show Next{1} to navigate your request history. Edit input and use enter or the submit button to run a new request.', '<keybinding:history.showPrevious>', '<keybinding:history.showNext>'));
        content.push(localize('inlineChat.inspectResponse', 'In the input box, inspect the response in the accessible view{0}.', '<keybinding:editor.action.accessibleView>'));
        content.push(localize('inlineChat.contextActions', 'Context menu actions may run a request prefixed with a /. Type / to discover such ready-made commands.'));
        content.push(localize('inlineChat.fix', 'If a fix action is invoked, a response will indicate the problem with the current code. A diff editor will be rendered and can be reached by tabbing.'));
        content.push(localize('inlineChat.diff', 'Once in the diff editor, enter review mode with{0}. Use up and down arrows to navigate lines with the proposed changes.', AccessibleDiffViewerNext.id));
        content.push(localize('inlineChat.toolbar', 'Use tab to reach conditional parts like commands, status, message responses and more.'));
    }
    content.push(localize('chat.signals', 'Accessibility Signals can be changed via settings with a prefix of signals.chat. By default, if a request takes more than 4 seconds, you will hear a sound indicating that progress is still occurring.'));
    return content.join('\n');
}
export function getChatAccessibilityHelpProvider(accessor, editor, type) {
    const widgetService = accessor.get(IChatWidgetService);
    const keybindingService = accessor.get(IKeybindingService);
    const inputEditor = type === 'panelChat' || type === 'editsView' || type === 'quickChat'
        ? widgetService.lastFocusedWidget?.inputEditor
        : editor;
    if (!inputEditor) {
        return;
    }
    const domNode = inputEditor.getDomNode() ?? undefined;
    if (!domNode) {
        return;
    }
    const cachedPosition = inputEditor.getPosition();
    inputEditor.getSupportedActions();
    const helpText = getAccessibilityHelpText(type, keybindingService);
    return new AccessibleContentProvider(type === 'panelChat'
        ? "panelChat" /* AccessibleViewProviderId.PanelChat */
        : type === 'inlineChat'
            ? "inlineChat" /* AccessibleViewProviderId.InlineChat */
            : type === 'agentView'
                ? "agentChat" /* AccessibleViewProviderId.AgentChat */
                : "quickChat" /* AccessibleViewProviderId.QuickChat */, { type: "help" /* AccessibleViewType.Help */ }, () => helpText, () => {
        if (type === 'panelChat' && cachedPosition) {
            inputEditor.setPosition(cachedPosition);
            inputEditor.focus();
        }
        else if (type === 'inlineChat') {
            // TODO@jrieken find a better way for this
            const ctrl = editor?.getContribution(INLINE_CHAT_ID);
            ctrl?.focus();
        }
    }, type === 'panelChat'
        ? "accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */
        : "accessibility.verbosity.inlineChat" /* AccessibilityVerbositySettingId.InlineChat */);
}
// The when clauses for actions may not be true when we invoke the accessible view, so we need to provide the keybinding label manually
// to ensure it's correct
function getChatFocusKeybindingLabel(keybindingService, type, focusInput) {
    let kbs;
    const fallback = ' (unassigned keybinding)';
    if (focusInput) {
        kbs = keybindingService.lookupKeybindings('workbench.action.chat.focusInput');
    }
    else {
        kbs = keybindingService.lookupKeybindings('chat.action.focus');
    }
    if (!kbs?.length) {
        return fallback;
    }
    let kb;
    if (type === 'panelChat') {
        if (focusInput) {
            kb = kbs.find((kb) => kb.getAriaLabel()?.includes('DownArrow'))?.getAriaLabel();
        }
        else {
            kb = kbs.find((kb) => kb.getAriaLabel()?.includes('UpArrow'))?.getAriaLabel();
        }
    }
    else {
        // Quick chat
        if (focusInput) {
            kb = kbs.find((kb) => kb.getAriaLabel()?.includes('UpArrow'))?.getAriaLabel();
        }
        else {
            kb = kbs.find((kb) => kb.getAriaLabel()?.includes('DownArrow'))?.getAriaLabel();
        }
    }
    return !!kb ? ` (${kb})` : fallback;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFjY2Vzc2liaWxpdHlIZWxwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdEFjY2Vzc2liaWxpdHlIZWxwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ3RHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQ04seUJBQXlCLEdBR3pCLE1BQU0saUVBQWlFLENBQUE7QUFFeEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBRTVGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUUvQyxNQUFNLE9BQU8sMEJBQTBCO0lBQXZDO1FBQ1UsYUFBUSxHQUFHLEdBQUcsQ0FBQTtRQUNkLFNBQUksR0FBRyxXQUFXLENBQUE7UUFDbEIsU0FBSSx3Q0FBMEI7UUFDOUIsU0FBSSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQ2pDLGVBQWUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxFQUMzRCxlQUFlLENBQUMsV0FBVyxDQUFD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Q0FBQztRQUMxQixJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLEVBQUUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsWUFBWSxFQUFFLENBQUE7UUFDaEYsQ0FBQzthQUFNLENBQUM7WUFDUCxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxFQUFFLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFlBQVksRUFBRSxDQUFBO1FBQzlFLENBQUM7SUFDRixDQUFDO1NBQU0sQ0FBQztRQUNQLGFBQWE7UUFDYixJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLEVBQUUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLEVBQUUsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxFQUFFLENBQUE7UUFDOUUsQ0FBQzthQUFNLENBQUM7WUFDUCxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLFlBQVksRUFBRSxDQUFBO1FBQ2hGLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUE7QUFDcEMsQ0FBQyJ9