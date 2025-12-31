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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEV4ZWN1dGVBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdEV4ZWN1dGVBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDckYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVsRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDOUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRXRGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMxRCxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLGlCQUFpQixFQUNqQixRQUFRLEVBQ1IsZ0JBQWdCLEdBQ2hCLE1BQU0sMkJB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