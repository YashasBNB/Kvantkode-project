/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { raceTimeout } from '../../../../../base/common/async.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Event } from '../../../../../base/common/event.js';
import { localize2 } from '../../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { ActiveEditorContext } from '../../../../common/contextkeys.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { isChatViewTitleActionContext } from '../../common/chatActions.js';
import { ChatContextKeyExprs, ChatContextKeys } from '../../common/chatContextKeys.js';
import { hasAppliedChatEditsContextKey, hasUndecidedChatEditingResourceContextKey, } from '../../common/chatEditingService.js';
import { IChatService } from '../../common/chatService.js';
import { ChatAgentLocation, ChatMode } from '../../common/constants.js';
import { ChatViewId, EditsViewId, IChatWidgetService } from '../chat.js';
import { EditingSessionAction } from '../chatEditing/chatEditingActions.js';
import { ctxIsGlobalEditingSession } from '../chatEditing/chatEditingEditorContextKeys.js';
import { ChatEditorInput } from '../chatEditorInput.js';
import { CHAT_CATEGORY, handleCurrentEditingSession } from './chatActions.js';
import { clearChatEditor } from './chatClear.js';
export const ACTION_ID_NEW_CHAT = `workbench.action.chat.newChat`;
export const ACTION_ID_NEW_EDIT_SESSION = `workbench.action.chat.newEditSession`;
export const ChatDoneActionId = 'workbench.action.chat.done';
export function registerNewChatActions() {
    registerAction2(class NewChatEditorAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chatEditor.newChat',
                title: localize2('chat.newChat.label', 'New Chat'),
                icon: Codicon.plus,
                f1: false,
                precondition: ChatContextKeys.enabled,
                menu: [
                    {
                        id: MenuId.EditorTitle,
                        group: 'navigation',
                        order: 0,
                        when: ActiveEditorContext.isEqualTo(ChatEditorInput.EditorID),
                    },
                ],
            });
        }
        async run(accessor, ...args) {
            announceChatCleared(accessor.get(IAccessibilitySignalService));
            await clearChatEditor(accessor);
        }
    });
    registerAction2(class GlobalClearChatAction extends Action2 {
        constructor() {
            super({
                id: ACTION_ID_NEW_CHAT,
                title: localize2('chat.newChat.label', 'New Chat'),
                category: CHAT_CATEGORY,
                icon: Codicon.plus,
                precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.location.notEqualsTo(ChatAgentLocation.EditingSession), ChatContextKeyExprs.unifiedChatEnabled.negate()),
                f1: true,
                keybinding: {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 42 /* KeyCode.KeyL */,
                    mac: {
                        primary: 256 /* KeyMod.WinCtrl */ | 42 /* KeyCode.KeyL */,
                    },
                    when: ChatContextKeys.inChatSession,
                },
                menu: [
                    {
                        id: MenuId.ChatContext,
                        group: 'z_clear',
                        when: ContextKeyExpr.and(ChatContextKeys.location.isEqualTo(ChatAgentLocation.Panel), ChatContextKeys.inUnifiedChat.negate()),
                    },
                    {
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.and(ChatContextKeys.location.isEqualTo(ChatAgentLocation.Panel), ChatContextKeys.inUnifiedChat.negate()),
                        group: 'navigation',
                        order: -1,
                    },
                ],
            });
        }
        async run(accessor, ...args) {
            const context = args[0];
            const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
            const widgetService = accessor.get(IChatWidgetService);
            let widget = widgetService.lastFocusedWidget;
            if (isChatViewTitleActionContext(context)) {
                // Is running in the Chat view title
                widget = widgetService.getWidgetBySessionId(context.sessionId);
            }
            if (widget) {
                announceChatCleared(accessibilitySignalService);
                widget.clear();
                widget.focusInput();
            }
        }
    });
    registerAction2(class NewEditSessionAction extends EditingSessionAction {
        constructor() {
            super({
                id: ACTION_ID_NEW_EDIT_SESSION,
                title: localize2('chat.newEdits.label', 'New Chat'),
                category: CHAT_CATEGORY,
                icon: Codicon.plus,
                precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.editingParticipantRegistered),
                f1: true,
                menu: [
                    {
                        id: MenuId.ChatContext,
                        group: 'z_clear',
                    },
                    {
                        id: MenuId.ViewTitle,
                        when: ChatContextKeyExprs.inEditsOrUnified,
                        group: 'navigation',
                        order: -1,
                    },
                ],
                keybinding: {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 42 /* KeyCode.KeyL */,
                    mac: {
                        primary: 256 /* KeyMod.WinCtrl */ | 42 /* KeyCode.KeyL */,
                    },
                    when: ChatContextKeys.inChatSession,
                },
            });
        }
        async runEditingSessionAction(accessor, editingSession, widget, ...args) {
            const context = args[0];
            const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
            const dialogService = accessor.get(IDialogService);
            const chatService = accessor.get(IChatService);
            if (!(await handleCurrentEditingSession(editingSession, undefined, dialogService))) {
                return;
            }
            announceChatCleared(accessibilitySignalService);
            await editingSession.stop();
            widget.clear();
            await waitForChatSessionCleared(editingSession.chatSessionId, chatService);
            widget.attachmentModel.clear();
            widget.input.relatedFiles?.clear();
            widget.focusInput();
            if (!context) {
                return;
            }
            if (typeof context.agentMode === 'boolean') {
                widget.input.setChatMode(context.agentMode ? ChatMode.Agent : ChatMode.Edit);
            }
            if (context.inputValue) {
                if (context.isPartialQuery) {
                    widget.setInput(context.inputValue);
                }
                else {
                    widget.acceptInput(context.inputValue);
                }
            }
        }
    });
    registerAction2(class GlobalEditsDoneAction extends EditingSessionAction {
        constructor() {
            super({
                id: ChatDoneActionId,
                title: localize2('chat.done.label', 'Done'),
                category: CHAT_CATEGORY,
                precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.editingParticipantRegistered),
                f1: false,
                menu: [
                    {
                        id: MenuId.ChatEditingWidgetToolbar,
                        when: ContextKeyExpr.and(hasUndecidedChatEditingResourceContextKey.negate(), hasAppliedChatEditsContextKey, ChatContextKeys.editingParticipantRegistered, ChatContextKeyExprs.inEditsOrUnified),
                        group: 'navigation',
                        order: 0,
                    },
                ],
            });
        }
        async runEditingSessionAction(accessor, editingSession, widget, ...args) {
            const context = args[0];
            const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
            if (isChatViewTitleActionContext(context)) {
                // Is running in the Chat view title
                announceChatCleared(accessibilitySignalService);
                if (widget) {
                    widget.clear();
                    widget.attachmentModel.clear();
                    widget.focusInput();
                }
            }
            else {
                // Is running from f1 or keybinding
                announceChatCleared(accessibilitySignalService);
                widget.clear();
                widget.attachmentModel.clear();
                widget.focusInput();
            }
        }
    });
    registerAction2(class UndoChatEditInteractionAction extends EditingSessionAction {
        constructor() {
            super({
                id: 'workbench.action.chat.undoEdit',
                title: localize2('chat.undoEdit.label', 'Undo Last Request'),
                category: CHAT_CATEGORY,
                icon: Codicon.discard,
                precondition: ContextKeyExpr.and(ChatContextKeys.chatEditingCanUndo, ChatContextKeys.enabled, ChatContextKeys.editingParticipantRegistered),
                f1: true,
                menu: [
                    {
                        id: MenuId.ViewTitle,
                        when: ChatContextKeyExprs.inEditsOrUnified,
                        group: 'navigation',
                        order: -3,
                    },
                ],
            });
        }
        async runEditingSessionAction(accessor, editingSession) {
            await editingSession.undoInteraction();
        }
    });
    registerAction2(class RedoChatEditInteractionAction extends EditingSessionAction {
        constructor() {
            super({
                id: 'workbench.action.chat.redoEdit',
                title: localize2('chat.redoEdit.label', 'Redo Last Request'),
                category: CHAT_CATEGORY,
                icon: Codicon.redo,
                precondition: ContextKeyExpr.and(ChatContextKeys.chatEditingCanRedo, ChatContextKeys.enabled, ChatContextKeys.editingParticipantRegistered),
                f1: true,
                menu: [
                    {
                        id: MenuId.ViewTitle,
                        when: ChatContextKeyExprs.inEditsOrUnified,
                        group: 'navigation',
                        order: -2,
                    },
                ],
            });
        }
        async runEditingSessionAction(accessor, editingSession) {
            await editingSession.redoInteraction();
        }
    });
    registerAction2(class GlobalOpenEditsAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.openEditSession',
                title: localize2('chat.openEdits.label', 'Open {0}', 'Copilot Edits'),
                category: CHAT_CATEGORY,
                icon: Codicon.goToEditingSession,
                f1: true,
                precondition: ChatContextKeys.Setup.hidden.toNegated(),
                menu: [
                    {
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', ChatViewId), ChatContextKeys.editingParticipantRegistered, ContextKeyExpr.equals(`view.${EditsViewId}.visible`, false), ContextKeyExpr.or(ContextKeyExpr.and(ContextKeyExpr.equals(`workbench.panel.chat.defaultViewContainerLocation`, true), ContextKeyExpr.equals(`workbench.panel.chatEditing.defaultViewContainerLocation`, false)), ContextKeyExpr.and(ContextKeyExpr.equals(`workbench.panel.chat.defaultViewContainerLocation`, false), ContextKeyExpr.equals(`workbench.panel.chatEditing.defaultViewContainerLocation`, true))), ChatContextKeys.inUnifiedChat.negate()),
                        group: 'navigation',
                        order: 1,
                    },
                    {
                        id: MenuId.ChatTitleBarMenu,
                        group: 'a_open',
                        order: 2,
                        when: ChatContextKeyExprs.unifiedChatEnabled.negate(),
                    },
                    {
                        id: MenuId.ChatEditingEditorContent,
                        when: ctxIsGlobalEditingSession,
                        group: 'navigate',
                        order: 4,
                    },
                ],
                keybinding: {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 39 /* KeyCode.KeyI */,
                    linux: {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 39 /* KeyCode.KeyI */,
                    },
                    when: ContextKeyExpr.and(ContextKeyExpr.notEquals('view', EditsViewId), ChatContextKeys.editingParticipantRegistered),
                },
            });
        }
        async run(accessor, opts) {
            opts = typeof opts === 'string' ? { query: opts } : opts;
            const viewsService = accessor.get(IViewsService);
            const chatView = (await viewsService.openView(EditsViewId)) ??
                (await viewsService.openView(ChatViewId));
            if (!chatView?.widget) {
                return;
            }
            if (!chatView.widget.viewModel) {
                await Event.toPromise(Event.filter(chatView.widget.onDidChangeViewModel, () => !!chatView.widget.viewModel));
            }
            if (opts?.query) {
                if (opts.isPartialQuery) {
                    chatView.widget.setInput(opts.query);
                }
                else {
                    chatView.widget.acceptInput(opts.query);
                }
            }
            chatView.widget.focusInput();
        }
    });
}
function announceChatCleared(accessibilitySignalService) {
    accessibilitySignalService.playSignal(AccessibilitySignal.clear);
}
export async function waitForChatSessionCleared(sessionId, chatService) {
    if (!chatService.getSession(sessionId)) {
        return;
    }
    // The ChatWidget just signals cancellation to its host viewpane or editor. Clearing the session is now async, we need to wait for it to finish.
    // This is expected to always happen.
    await raceTimeout(Event.toPromise(Event.filter(chatService.onDidDisposeSession, (e) => e.sessionId === sessionId)), 2000);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENsZWFyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdENsZWFyQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUczRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDakQsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiwyQkFBMkIsR0FDM0IsTUFBTSxtRkFBbUYsQ0FBQTtBQUMxRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDeEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWxGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdEYsT0FBTyxFQUNOLDZCQUE2QixFQUM3Qix5Q0FBeUMsR0FFekMsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDMUQsT0FB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