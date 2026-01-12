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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFjY2Vzc2liaWxpdHlIZWxwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0QWNjZXNzaWJpbGl0eUhlbHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDdEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFDTix5QkFBeUIsR0FHekIsTUFBTSxpRUFBaUUsQ0FBQTtBQUV4RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDeEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFFNUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDdkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRS9DLE1BQU0sT0FBTywwQkFBMEI7SUFBdkM7UUFDVSxhQUFRLEdBQUcsR0FBRyxDQUFBO1FBQ2QsU0FBSSxHQUFHLFdBQVcsQ0FBQTtRQUNsQixTQUFJLHdDQUEwQjtRQUM5QixTQUFJLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FDakMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLEVBQzNELGVBQWUsQ0FBQyxXQUFX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