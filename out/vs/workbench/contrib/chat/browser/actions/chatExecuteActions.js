/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { ChatContextKeyExprs, ChatContextKeys } from '../../common/chatContextKeys.js';
import { chatVariableLeader } from '../../common/chatParserTypes.js';
import { IChatService } from '../../common/chatService.js';
import { ChatAgentLocation, ChatConfiguration, ChatMode, validateChatMode, } from '../../common/constants.js';
import { ILanguageModelToolsService } from '../../common/languageModelToolsService.js';
import { EditsViewId, IChatWidgetService } from '../chat.js';
import { getEditingSessionContext } from '../chatEditing/chatEditingActions.js';
import { CHAT_CATEGORY, handleCurrentEditingSession } from './chatActions.js';
import { ACTION_ID_NEW_CHAT, ChatDoneActionId, waitForChatSessionCleared, } from './chatClearActions.js';
class SubmitAction extends Action2 {
    run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        widget?.acceptInput(context?.inputValue);
    }
}
const whenNotInProgressOrPaused = ContextKeyExpr.or(ChatContextKeys.isRequestPaused, ChatContextKeys.requestInProgress.negate());
export class ChatSubmitAction extends SubmitAction {
    static { this.ID = 'workbench.action.chat.submit'; }
    constructor() {
        const precondition = ContextKeyExpr.and(
        // if the input has prompt instructions attached, allow submitting requests even
        // without text present - having instructions is enough context for a request
        ContextKeyExpr.or(ChatContextKeys.inputHasText, ChatContextKeys.instructionsAttached), whenNotInProgressOrPaused, ChatContextKeys.chatMode.isEqualTo(ChatMode.Ask));
        super({
            id: ChatSubmitAction.ID,
            title: localize2('interactive.submit.label', 'Send and Dispatch'),
            f1: false,
            category: CHAT_CATEGORY,
            icon: Codicon.send,
            precondition,
            keybinding: {
                when: ChatContextKeys.inChatInput,
                primary: 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menu: [
                {
                    id: MenuId.ChatExecuteSecondary,
                    group: 'group_1',
                    order: 1,
                    when: ChatContextKeys.chatMode.isEqualTo(ChatMode.Ask),
                },
                {
                    id: MenuId.ChatExecute,
                    order: 4,
                    when: ContextKeyExpr.and(whenNotInProgressOrPaused, ChatContextKeys.chatMode.isEqualTo(ChatMode.Ask)),
                    group: 'navigation',
                },
            ],
        });
    }
}
export const ToggleAgentModeActionId = 'workbench.action.chat.toggleAgentMode';
class ToggleChatModeAction extends Action2 {
    static { this.ID = ToggleAgentModeActionId; }
    constructor() {
        super({
            id: ToggleChatModeAction.ID,
            title: localize2('interactive.toggleAgent.label', 'Set Chat Mode'),
            f1: true,
            category: CHAT_CATEGORY,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(ChatContextKeys.Editing.hasToolsAgent, ChatContextKeyExprs.unifiedChatEnabled), ChatContextKeys.requestInProgress.negate()),
            tooltip: localize('setChatMode', 'Set Mode'),
            keybinding: {
                when: ContextKeyExpr.and(ChatContextKeys.inChatInput, ChatContextKeyExprs.inEditsOrUnified),
                primary: 2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menu: [
                {
                    id: MenuId.ChatExecute,
                    order: 1,
                    // Either in edits with agent mode available, or in unified chat view
                    when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(ContextKeyExpr.and(ChatContextKeys.location.isEqualTo(ChatAgentLocation.EditingSession), ChatContextKeys.Editing.hasToolsAgent), ChatContextKeys.inUnifiedChat)),
                    group: 'navigation',
                },
            ],
        });
    }
    async run(accessor, ...args) {
        const chatService = accessor.get(IChatService);
        const commandService = accessor.get(ICommandService);
        const configurationService = accessor.get(IConfigurationService);
        const dialogService = accessor.get(IDialogService);
        const context = getEditingSessionContext(accessor, args);
        if (!context?.chatWidget) {
            return;
        }
        const arg = args.at(0);
        const chatSession = context.chatWidget.viewModel?.model;
        const requestCount = chatSession?.getRequests().length ?? 0;
        const switchToMode = validateChatMode(arg?.mode) ??
            this.getNextMode(context.chatWidget, requestCount, configurationService);
        const needToClearEdits = (!chatService.unifiedViewEnabled ||
            (!configurationService.getValue(ChatConfiguration.Edits2Enabled) &&
                (context.chatWidget.input.currentMode === ChatMode.Edit ||
                    switchToMode === ChatMode.Edit))) &&
            requestCount > 0;
        if (switchToMode === context.chatWidget.input.currentMode) {
            return;
        }
        if (needToClearEdits) {
            // If not in unified view, or not using edits2 and switching into or out of edit mode, ask to discard the session
            const phrase = localize('switchMode.confirmPhrase', 'Switching chat modes will end your current edit session.');
            if (!context.editingSession) {
                return;
            }
            const currentEdits = context.editingSession.entries.get();
            const undecidedEdits = currentEdits.filter((edit) => edit.state.get() === 0 /* WorkingSetEntryState.Modified */);
            if (undecidedEdits.length > 0) {
                if (!(await handleCurrentEditingSession(context.editingSession, phrase, dialogService))) {
                    return;
                }
            }
            else {
                const confirmation = await dialogService.confirm({
                    title: localize('agent.newSession', 'Start new session?'),
                    message: localize('agent.newSessionMessage', 'Changing the chat mode will end your current edit session. Would you like to continue?'),
                    primaryButton: localize('agent.newSession.confirm', 'Yes'),
                    type: 'info',
                });
                if (!confirmation.confirmed) {
                    return;
                }
            }
        }
        context.chatWidget.input.setChatMode(switchToMode);
        if (needToClearEdits) {
            const clearAction = chatService.unifiedViewEnabled ? ACTION_ID_NEW_CHAT : ChatDoneActionId;
            await commandService.executeCommand(clearAction);
        }
    }
    getNextMode(chatWidget, requestCount, configurationService) {
        const modes = [ChatMode.Agent];
        if (configurationService.getValue(ChatConfiguration.Edits2Enabled) || requestCount === 0) {
            modes.push(ChatMode.Edit);
        }
        if (chatWidget.location === ChatAgentLocation.Panel) {
            modes.push(ChatMode.Ask);
        }
        const modeIndex = modes.indexOf(chatWidget.input.currentMode);
        const newMode = modes[(modeIndex + 1) % modes.length];
        return newMode;
    }
}
export const ToggleRequestPausedActionId = 'workbench.action.chat.toggleRequestPaused';
export class ToggleRequestPausedAction extends Action2 {
    static { this.ID = ToggleRequestPausedActionId; }
    constructor() {
        super({
            id: ToggleRequestPausedAction.ID,
            title: localize2('interactive.toggleRequestPausd.label', 'Toggle Request Paused'),
            category: CHAT_CATEGORY,
            icon: Codicon.debugPause,
            toggled: {
                condition: ChatContextKeys.isRequestPaused,
                icon: Codicon.play,
                tooltip: localize('requestIsPaused', 'Resume Request'),
            },
            tooltip: localize('requestNotPaused', 'Pause Request'),
            menu: [
                {
                    id: MenuId.ChatExecute,
                    order: 3.5,
                    when: ContextKeyExpr.and(ChatContextKeys.canRequestBePaused, ChatContextKeys.chatMode.isEqualTo(ChatMode.Agent), ChatContextKeyExprs.inEditsOrUnified, ContextKeyExpr.or(ChatContextKeys.isRequestPaused.negate(), ChatContextKeys.inputHasText.negate())),
                    group: 'navigation',
                },
            ],
        });
    }
    run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        widget?.togglePaused();
    }
}
export const ChatSwitchToNextModelActionId = 'workbench.action.chat.switchToNextModel';
export class SwitchToNextModelAction extends Action2 {
    static { this.ID = ChatSwitchToNextModelActionId; }
    constructor() {
        super({
            id: SwitchToNextModelAction.ID,
            title: localize2('interactive.switchToNextModel.label', 'Switch to Next Model'),
            category: CHAT_CATEGORY,
            f1: true,
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 89 /* KeyCode.Period */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ChatContextKeys.inChatInput,
            },
            precondition: ChatContextKeys.enabled,
            menu: {
                id: MenuId.ChatExecute,
                order: 3,
                group: 'navigation',
                when: ContextKeyExpr.and(ChatContextKeys.languageModelsAreUserSelectable, ContextKeyExpr.or(ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.Panel), ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.EditingSession), ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.Editor), ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.Notebook), ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.Terminal))),
            },
        });
    }
    run(accessor, ...args) {
        const widgetService = accessor.get(IChatWidgetService);
        const widget = widgetService.lastFocusedWidget;
        widget?.input.switchToNextModel();
    }
}
export class ChatEditingSessionSubmitAction extends SubmitAction {
    static { this.ID = 'workbench.action.edits.submit'; }
    constructor() {
        const precondition = ContextKeyExpr.and(
        // if the input has prompt instructions attached, allow submitting requests even
        // without text present - having instructions is enough context for a request
        ContextKeyExpr.or(ChatContextKeys.inputHasText, ChatContextKeys.instructionsAttached), whenNotInProgressOrPaused, ChatContextKeys.chatMode.notEqualsTo(ChatMode.Ask));
        super({
            id: ChatEditingSessionSubmitAction.ID,
            title: localize2('edits.submit.label', 'Send'),
            f1: false,
            category: CHAT_CATEGORY,
            icon: Codicon.send,
            precondition,
            keybinding: {
                when: ChatContextKeys.inChatInput,
                primary: 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menu: [
                {
                    id: MenuId.ChatExecuteSecondary,
                    group: 'group_1',
                    when: ContextKeyExpr.and(whenNotInProgressOrPaused, ChatContextKeys.chatMode.notEqualsTo(ChatMode.Ask)),
                    order: 1,
                },
                {
                    id: MenuId.ChatExecute,
                    order: 4,
                    when: ContextKeyExpr.and(ContextKeyExpr.or(ContextKeyExpr.and(ChatContextKeys.isRequestPaused, ChatContextKeys.inputHasText), ChatContextKeys.requestInProgress.negate()), ChatContextKeys.chatMode.notEqualsTo(ChatMode.Ask)),
                    group: 'navigation',
                },
            ],
        });
    }
}
class SubmitWithoutDispatchingAction extends Action2 {
    static { this.ID = 'workbench.action.chat.submitWithoutDispatching'; }
    constructor() {
        const precondition = ContextKeyExpr.and(
        // if the input has prompt instructions attached, allow submitting requests even
        // without text present - having instructions is enough context for a request
        ContextKeyExpr.or(ChatContextKeys.inputHasText, ChatContextKeys.instructionsAttached), whenNotInProgressOrPaused, ChatContextKeys.chatMode.isEqualTo(ChatMode.Ask));
        super({
            id: SubmitWithoutDispatchingAction.ID,
            title: localize2('interactive.submitWithoutDispatch.label', 'Send'),
            f1: false,
            category: CHAT_CATEGORY,
            precondition,
            keybinding: {
                when: ChatContextKeys.inChatInput,
                primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menu: [
                {
                    id: MenuId.ChatExecuteSecondary,
                    group: 'group_1',
                    order: 2,
                    when: ChatContextKeys.chatMode.isEqualTo(ChatMode.Ask),
                },
            ],
        });
    }
    run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        widget?.acceptInput(context?.inputValue, { noCommandDetection: true });
    }
}
export class ChatSubmitWithCodebaseAction extends Action2 {
    static { this.ID = 'workbench.action.chat.submitWithCodebase'; }
    constructor() {
        const precondition = ContextKeyExpr.and(
        // if the input has prompt instructions attached, allow submitting requests even
        // without text present - having instructions is enough context for a request
        ContextKeyExpr.or(ChatContextKeys.inputHasText, ChatContextKeys.instructionsAttached), whenNotInProgressOrPaused);
        super({
            id: ChatSubmitWithCodebaseAction.ID,
            title: localize2('actions.chat.submitWithCodebase', 'Send with {0}', `${chatVariableLeader}codebase`),
            precondition,
            menu: {
                id: MenuId.ChatExecuteSecondary,
                group: 'group_1',
                order: 3,
                when: ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.Panel),
            },
            keybinding: {
                when: ChatContextKeys.inChatInput,
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        const languageModelToolsService = accessor.get(ILanguageModelToolsService);
        const codebaseTool = languageModelToolsService.getToolByName('codebase');
        if (!codebaseTool) {
            return;
        }
        widget.input.attachmentModel.addContext({
            id: codebaseTool.id,
            name: codebaseTool.displayName ?? '',
            fullName: codebaseTool.displayName ?? '',
            value: undefined,
            icon: ThemeIcon.isThemeIcon(codebaseTool.icon) ? codebaseTool.icon : undefined,
            isTool: true,
        });
        widget.acceptInput();
    }
}
class SendToChatEditingAction extends Action2 {
    constructor() {
        const precondition = ContextKeyExpr.and(
        // if the input has prompt instructions attached, allow submitting requests even
        // without text present - having instructions is enough context for a request
        ContextKeyExpr.or(ChatContextKeys.inputHasText, ChatContextKeys.instructionsAttached), ChatContextKeys.inputHasAgent.negate(), whenNotInProgressOrPaused, ChatContextKeyExprs.inNonUnifiedPanel);
        super({
            id: 'workbench.action.chat.sendToChatEditing',
            title: localize2('chat.sendToChatEditing.label', 'Send to Copilot Edits'),
            precondition,
            category: CHAT_CATEGORY,
            f1: false,
            menu: {
                id: MenuId.ChatExecuteSecondary,
                group: 'group_1',
                order: 4,
                when: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.editingParticipantRegistered, ChatContextKeys.location.notEqualsTo(ChatAgentLocation.EditingSession), ChatContextKeys.location.notEqualsTo(ChatAgentLocation.Editor), ChatContextKeyExprs.inNonUnifiedPanel),
            },
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */,
                when: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.editingParticipantRegistered, ChatContextKeys.location.notEqualsTo(ChatAgentLocation.EditingSession), ChatContextKeys.location.notEqualsTo(ChatAgentLocation.Editor)),
            },
        });
    }
    async run(accessor, ...args) {
        if (!accessor.get(IChatAgentService).getDefaultAgent(ChatAgentLocation.EditingSession)) {
            return;
        }
        const widget = args.length > 0 && args[0].widget
            ? args[0].widget
            : accessor.get(IChatWidgetService).lastFocusedWidget;
        const viewsService = accessor.get(IViewsService);
        const dialogService = accessor.get(IDialogService);
        const { widget: editingWidget } = (await viewsService.openView(EditsViewId));
        if (!editingWidget.viewModel?.sessionId) {
            return;
        }
        const currentEditingSession = editingWidget.viewModel.model.editingSession;
        if (!currentEditingSession) {
            return;
        }
        const currentEditCount = currentEditingSession?.entries.get().length;
        if (currentEditCount) {
            const result = await dialogService.confirm({
                title: localize('chat.startEditing.confirmation.title', 'Start new editing session?'),
                message: currentEditCount === 1
                    ? localize('chat.startEditing.confirmation.message.one', 'Starting a new editing session will end your current editing session containing {0} file. Do you wish to proceed?', currentEditCount)
                    : localize('chat.startEditing.confirmation.message.many', 'Starting a new editing session will end your current editing session containing {0} files. Do you wish to proceed?', currentEditCount),
                type: 'info',
                primaryButton: localize('chat.startEditing.confirmation.primaryButton', 'Yes'),
            });
            if (!result.confirmed) {
                return;
            }
            await currentEditingSession.stop(true);
            editingWidget.clear();
        }
        for (const attachment of widget.attachmentModel.attachments) {
            editingWidget.attachmentModel.addContext(attachment);
        }
        editingWidget.setInput(widget.getInput());
        widget.setInput('');
        widget.attachmentModel.clear();
        editingWidget.acceptInput();
        editingWidget.focusInput();
    }
}
class SendToNewChatAction extends Action2 {
    constructor() {
        const precondition = ContextKeyExpr.and(
        // if the input has prompt instructions attached, allow submitting requests even
        // without text present - having instructions is enough context for a request
        ContextKeyExpr.or(ChatContextKeys.inputHasText, ChatContextKeys.instructionsAttached), whenNotInProgressOrPaused);
        super({
            id: 'workbench.action.chat.sendToNewChat',
            title: localize2('chat.newChat.label', 'Send to New Chat'),
            precondition,
            category: CHAT_CATEGORY,
            f1: false,
            menu: {
                id: MenuId.ChatExecuteSecondary,
                group: 'group_2',
                when: ContextKeyExpr.equals(ChatContextKeys.location.key, ChatAgentLocation.Panel),
            },
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                when: ChatContextKeys.inChatInput,
            },
        });
    }
    async run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const chatService = accessor.get(IChatService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        widget.clear();
        if (widget.viewModel) {
            await waitForChatSessionCleared(widget.viewModel.sessionId, chatService);
        }
        widget.acceptInput(context?.inputValue);
    }
}
export const CancelChatActionId = 'workbench.action.chat.cancel';
export class CancelAction extends Action2 {
    static { this.ID = CancelChatActionId; }
    constructor() {
        super({
            id: CancelAction.ID,
            title: localize2('interactive.cancel.label', 'Cancel'),
            f1: false,
            category: CHAT_CATEGORY,
            icon: Codicon.stopCircle,
            menu: {
                id: MenuId.ChatExecute,
                when: ContextKeyExpr.and(ChatContextKeys.isRequestPaused.negate(), ChatContextKeys.requestInProgress),
                order: 4,
                group: 'navigation',
            },
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 9 /* KeyCode.Escape */,
                win: { primary: 512 /* KeyMod.Alt */ | 1 /* KeyCode.Backspace */ },
            },
        });
    }
    run(accessor, ...args) {
        const context = args[0];
        const widgetService = accessor.get(IChatWidgetService);
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        const chatService = accessor.get(IChatService);
        if (widget.viewModel) {
            chatService.cancelCurrentRequestForSession(widget.viewModel.sessionId);
        }
    }
}
export function registerChatExecuteActions() {
    registerAction2(ChatSubmitAction);
    registerAction2(ChatEditingSessionSubmitAction);
    registerAction2(SubmitWithoutDispatchingAction);
    registerAction2(CancelAction);
    registerAction2(SendToNewChatAction);
    registerAction2(ChatSubmitWithCodebaseAction);
    registerAction2(SendToChatEditingAction);
    registerAction2(ToggleChatModeAction);
    registerAction2(ToggleRequestPausedAction);
    registerAction2(SwitchToNextModelAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEV4ZWN1dGVBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0RXhlY3V0ZUFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRWhFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDeEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWxGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzFELE9BQU8sRUFDTixpQkFBaUIsRUFDakIsaUJBQWlCLEVBQ2pCLFFBQVEsRUFDUixnQkFBZ0IsR0FDaEIsTUFB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