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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENsZWFyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRDbGVhckFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFHM0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2pELE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsMkJBQTJCLEdBQzNCLE1BQU0sbUZBQW1GLENBQUE7QUFDMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDcEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVsRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDMUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RGLE9BQU8sRUFDTiw2QkFBNkIsRUFDN0IseUNBQXlDLEdBRXpDLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBZSxrQkFBa0IsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUNyRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMxRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFdkQsT0FBTyxFQUFFLGFBQWEsRUFBRSwyQkFBMkIsRUFBd0IsTUFBTSxrQkFBa0IsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFFaEQsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsK0JBQStCLENBQUE7QUFDakUsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsc0NBQXNDLENBQUE7QUFDaEYsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsNEJBQTRCLENBQUE7QUFvQjVELE1BQU0sVUFBVSxzQkFBc0I7SUFDckMsZUFBZSxDQUNkLE1BQU0sbUJBQW9CLFNBQVEsT0FBTztRQUN4QztZQUNDLEtBQUssQ0FBQztnQkFDTCxFQUFFLEVBQUUscUNBQXFDO2dCQUN6QyxLQUFLLEVBQUUsU0FBUyxDQUFDLG9CQUFvQixFQUFFLFVBQVUsQ0FBQztnQkFDbEQsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO2dCQUNsQixFQUFFLEVBQUUsS0FBSztnQkFDVCxZQUFZLEVBQUUsZUFBZSxDQUFDLE9BQU87Z0JBQ3JDLElBQUksRUFBRTtvQkFDTDt3QkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLFdBQVc7d0JBQ3RCLEtBQUssRUFBRSxZQUFZO3dCQUNuQixLQUFLLEVBQUUsQ0FBQzt3QkFDUixJQUFJLEVBQUUsbUJBQW1CLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUM7cUJBQzdEO2lCQUNEO2FBQ0QsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7WUFDbkQsbUJBQW1CLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUE7WUFDOUQsTUFBTSxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDaEMsQ0FBQztLQUNELENBQ0QsQ0FBQTtJQUVELGVBQWUsQ0FDZCxNQUFNLHFCQUFzQixTQUFRLE9BQU87UUFDMUM7WUFDQyxLQUFLLENBQUM7Z0JBQ0wsRUFBRSxFQUFFLGtCQUFrQjtnQkFDdEIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxvQkFBb0IsRUFBRSxVQUFVLENBQUM7Z0JBQ2xELFFBQVEsRUFBRSxhQUFhO2dCQUN2QixJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7Z0JBQ2xCLFlBQVksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUMvQixlQUFlLENBQUMsT0FBTyxFQUN2QixlQUFlLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsRUFDdEUsbUJBQW1CLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLENBQy9DO2dCQUNELEVBQUUsRUFBRSxJQUFJO2dCQUNSLFVBQVUsRUFBRTtvQkFDWCxNQUFNLDZDQUFtQztvQkFDekMsT0FBTyxFQUFFLGlEQUE2QjtvQkFDdEMsR0FBRyxFQUFFO3dCQUNKLE9BQU8sRUFBRSxnREFBNkI7cUJBQ3RDO29CQUNELElBQUksRUFBRSxlQUFlLENBQUMsYUFBYTtpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFO29CQUNMO3dCQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsV0FBVzt3QkFDdEIsS0FBSyxFQUFFLFNBQVM7d0JBQ2hCLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixlQUFlLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsRUFDM0QsZUFBZSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FDdEM7cUJBQ0Q7b0JBQ0Q7d0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTO3dCQUNwQixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsZUFBZSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLEVBQzNELGVBQWUsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQ3RDO3dCQUNELEtBQUssRUFBRSxZQUFZO3dCQUNuQixLQUFLLEVBQUUsQ0FBQyxDQUFDO3FCQUNUO2lCQUNEO2FBQ0QsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7WUFDbkQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3ZCLE1BQU0sMEJBQTBCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO1lBQzVFLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtZQUV0RCxJQUFJLE1BQU0sR0FBRyxhQUFhLENBQUMsaUJBQWlCLENBQUE7WUFFNUMsSUFBSSw0QkFBNEIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUMzQyxvQ0FBb0M7Z0JBQ3BDLE1BQU0sR0FBRyxhQUFhLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQy9ELENBQUM7WUFFRCxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLG1CQUFtQixDQUFDLDBCQUEwQixDQUFDLENBQUE7Z0JBQy9DLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtnQkFDZCxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUE7WUFDcEIsQ0FBQztRQUNGLENBQUM7S0FDRCxDQUNELENBQUE7SUFFRCxlQUFlLENBQ2QsTUFBTSxvQkFBcUIsU0FBUSxvQkFBb0I7UUFDdEQ7WUFDQyxLQUFLLENBQUM7Z0JBQ0wsRUFBRSxFQUFFLDBCQUEwQjtnQkFDOUIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxxQkFBcUIsRUFBRSxVQUFVLENBQUM7Z0JBQ25ELFFBQVEsRUFBRSxhQUFhO2dCQUN2QixJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7Z0JBQ2xCLFlBQVksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUMvQixlQUFlLENBQUMsT0FBTyxFQUN2QixlQUFlLENBQUMsNEJBQTRCLENBQzVDO2dCQUNELEVBQUUsRUFBRSxJQUFJO2dCQUNSLElBQUksRUFBRTtvQkFDTDt3QkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLFdBQVc7d0JBQ3RCLEtBQUssRUFBRSxTQUFTO3FCQUNoQjtvQkFDRDt3QkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVM7d0JBQ3BCLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxnQkFBZ0I7d0JBQzFDLEtBQUssRUFBRSxZQUFZO3dCQUNuQixLQUFLLEVBQUUsQ0FBQyxDQUFDO3FCQUNUO2lCQUNEO2dCQUNELFVBQVUsRUFBRTtvQkFDWCxNQUFNLDZDQUFtQztvQkFDekMsT0FBTyxFQUFFLGlEQUE2QjtvQkFDdEMsR0FBRyxFQUFFO3dCQUNKLE9BQU8sRUFBRSxnREFBNkI7cUJBQ3RDO29CQUNELElBQUksRUFBRSxlQUFlLENBQUMsYUFBYTtpQkFDbkM7YUFDRCxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsS0FBSyxDQUFDLHVCQUF1QixDQUM1QixRQUEwQixFQUMxQixjQUFtQyxFQUNuQyxNQUFtQixFQUNuQixHQUFHLElBQVc7WUFFZCxNQUFNLE9BQU8sR0FBNkMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2pFLE1BQU0sMEJBQTBCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO1lBQzVFLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDbEQsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUU5QyxJQUFJLENBQUMsQ0FBQyxNQUFNLDJCQUEyQixDQUFDLGNBQWMsRUFBRSxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNwRixPQUFNO1lBQ1AsQ0FBQztZQUVELG1CQUFtQixDQUFDLDBCQUEwQixDQUFDLENBQUE7WUFFL0MsTUFBTSxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDM0IsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ2QsTUFBTSx5QkFBeUIsQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQzFFLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDOUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsS0FBSyxFQUFFLENBQUE7WUFDbEMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFBO1lBRW5CLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZCxPQUFNO1lBQ1AsQ0FBQztZQUVELElBQUksT0FBTyxPQUFPLENBQUMsU0FBUyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUM1QyxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDN0UsQ0FBQztZQUVELElBQUksT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUN4QixJQUFJLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDNUIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQ3BDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDdkMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0tBQ0QsQ0FDRCxDQUFBO0lBRUQsZUFBZSxDQUNkLE1BQU0scUJBQXNCLFNBQVEsb0JBQW9CO1FBQ3ZEO1lBQ0MsS0FBSyxDQUFDO2dCQUNMLEVBQUUsRUFBRSxnQkFBZ0I7Z0JBQ3BCLEtBQUssRUFBRSxTQUFTLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxDQUFDO2dCQUMzQyxRQUFRLEVBQUUsYUFBYTtnQkFDdkIsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQy9CLGVBQWUsQ0FBQyxPQUFPLEVBQ3ZCLGVBQWUsQ0FBQyw0QkFBNEIsQ0FDNUM7Z0JBQ0QsRUFBRSxFQUFFLEtBQUs7Z0JBQ1QsSUFBSSxFQUFFO29CQUNMO3dCQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsd0JBQXdCO3dCQUNuQyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIseUNBQXlDLENBQUMsTUFBTSxFQUFFLEVBQ2xELDZCQUE2QixFQUM3QixlQUFlLENBQUMsNEJBQTRCLEVBQzVDLG1CQUFtQixDQUFDLGdCQUFnQixDQUNwQzt3QkFDRCxLQUFLLEVBQUUsWUFBWTt3QkFDbkIsS0FBSyxFQUFFLENBQUM7cUJBQ1I7aUJBQ0Q7YUFDRCxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRVEsS0FBSyxDQUFDLHVCQUF1QixDQUNyQyxRQUEwQixFQUMxQixjQUFtQyxFQUNuQyxNQUFtQixFQUNuQixHQUFHLElBQVc7WUFFZCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdkIsTUFBTSwwQkFBMEIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUE7WUFDNUUsSUFBSSw0QkFBNEIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUMzQyxvQ0FBb0M7Z0JBQ3BDLG1CQUFtQixDQUFDLDBCQUEwQixDQUFDLENBQUE7Z0JBQy9DLElBQUksTUFBTSxFQUFFLENBQUM7b0JBQ1osTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFBO29CQUNkLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUE7b0JBQzlCLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQTtnQkFDcEIsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxtQ0FBbUM7Z0JBQ25DLG1CQUFtQixDQUFDLDBCQUEwQixDQUFDLENBQUE7Z0JBQy9DLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtnQkFDZCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUM5QixNQUFNLENBQUMsVUFBVSxFQUFFLENBQUE7WUFDcEIsQ0FBQztRQUNGLENBQUM7S0FDRCxDQUNELENBQUE7SUFFRCxlQUFlLENBQ2QsTUFBTSw2QkFBOEIsU0FBUSxvQkFBb0I7UUFDL0Q7WUFDQyxLQUFLLENBQUM7Z0JBQ0wsRUFBRSxFQUFFLGdDQUFnQztnQkFDcEMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxxQkFBcUIsRUFBRSxtQkFBbUIsQ0FBQztnQkFDNUQsUUFBUSxFQUFFLGFBQWE7Z0JBQ3ZCLElBQUksRUFBRSxPQUFPLENBQUMsT0FBTztnQkFDckIsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQy9CLGVBQWUsQ0FBQyxrQkFBa0IsRUFDbEMsZUFBZSxDQUFDLE9BQU8sRUFDdkIsZUFBZSxDQUFDLDRCQUE0QixDQUM1QztnQkFDRCxFQUFFLEVBQUUsSUFBSTtnQkFDUixJQUFJLEVBQUU7b0JBQ0w7d0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTO3dCQUNwQixJQUFJLEVBQUUsbUJBQW1CLENBQUMsZ0JBQWdCO3dCQUMxQyxLQUFLLEVBQUUsWUFBWTt3QkFDbkIsS0FBSyxFQUFFLENBQUMsQ0FBQztxQkFDVDtpQkFDRDthQUNELENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxLQUFLLENBQUMsdUJBQXVCLENBQzVCLFFBQTBCLEVBQzFCLGNBQW1DO1lBRW5DLE1BQU0sY0FBYyxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQ3ZDLENBQUM7S0FDRCxDQUNELENBQUE7SUFFRCxlQUFlLENBQ2QsTUFBTSw2QkFBOEIsU0FBUSxvQkFBb0I7UUFDL0Q7WUFDQyxLQUFLLENBQUM7Z0JBQ0wsRUFBRSxFQUFFLGdDQUFnQztnQkFDcEMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxxQkFBcUIsRUFBRSxtQkFBbUIsQ0FBQztnQkFDNUQsUUFBUSxFQUFFLGFBQWE7Z0JBQ3ZCLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtnQkFDbEIsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQy9CLGVBQWUsQ0FBQyxrQkFBa0IsRUFDbEMsZUFBZSxDQUFDLE9BQU8sRUFDdkIsZUFBZSxDQUFDLDRCQUE0QixDQUM1QztnQkFDRCxFQUFFLEVBQUUsSUFBSTtnQkFDUixJQUFJLEVBQUU7b0JBQ0w7d0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTO3dCQUNwQixJQUFJLEVBQUUsbUJBQW1CLENBQUMsZ0JBQWdCO3dCQUMxQyxLQUFLLEVBQUUsWUFBWTt3QkFDbkIsS0FBSyxFQUFFLENBQUMsQ0FBQztxQkFDVDtpQkFDRDthQUNELENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxLQUFLLENBQUMsdUJBQXVCLENBQzVCLFFBQTBCLEVBQzFCLGNBQW1DO1lBRW5DLE1BQU0sY0FBYyxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQ3ZDLENBQUM7S0FDRCxDQUNELENBQUE7SUFFRCxlQUFlLENBQ2QsTUFBTSxxQkFBc0IsU0FBUSxPQUFPO1FBQzFDO1lBQ0MsS0FBSyxDQUFDO2dCQUNMLEVBQUUsRUFBRSx1Q0FBdUM7Z0JBQzNDLEtBQUssRUFBRSxTQUFTLENBQUMsc0JBQXNCLEVBQUUsVUFBVSxFQUFFLGVBQWUsQ0FBQztnQkFDckUsUUFBUSxFQUFFLGFBQWE7Z0JBQ3ZCLElBQUksRUFBRSxPQUFPLENBQUMsa0JBQWtCO2dCQUNoQyxFQUFFLEVBQUUsSUFBSTtnQkFDUixZQUFZLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFO2dCQUN0RCxJQUFJLEVBQUU7b0JBQ0w7d0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTO3dCQUNwQixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLEVBQ3pDLGVBQWUsQ0FBQyw0QkFBNEIsRUFDNUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxRQUFRLFdBQVcsVUFBVSxFQUFFLEtBQUssQ0FBQyxFQUMzRCxjQUFjLENBQUMsRUFBRSxDQUNoQixjQUFjLENBQUMsR0FBRyxDQUNqQixjQUFjLENBQUMsTUFBTSxDQUNwQixtREFBbUQsRUFDbkQsSUFBSSxDQUNKLEVBQ0QsY0FBYyxDQUFDLE1BQU0sQ0FDcEIsMERBQTBELEVBQzFELEtBQUssQ0FDTCxDQUNELEVBQ0QsY0FBYyxDQUFDLEdBQUcsQ0FDakIsY0FBYyxDQUFDLE1BQU0sQ0FDcEIsbURBQW1ELEVBQ25ELEtBQUssQ0FDTCxFQUNELGNBQWMsQ0FBQyxNQUFNLENBQ3BCLDBEQUEwRCxFQUMxRCxJQUFJLENBQ0osQ0FDRCxDQUNELEVBQ0QsZUFBZSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FDdEM7d0JBQ0QsS0FBSyxFQUFFLFlBQVk7d0JBQ25CLEtBQUssRUFBRSxDQUFDO3FCQUNSO29CQUNEO3dCQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO3dCQUMzQixLQUFLLEVBQUUsUUFBUTt3QkFDZixLQUFLLEVBQUUsQ0FBQzt3QkFDUixJQUFJLEVBQUUsbUJBQW1CLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFO3FCQUNyRDtvQkFDRDt3QkFDQyxFQUFFLEVBQUUsTUFBTSxDQUFDLHdCQUF3Qjt3QkFDbkMsSUFBSSxFQUFFLHlCQUF5Qjt3QkFDL0IsS0FBSyxFQUFFLFVBQVU7d0JBQ2pCLEtBQUssRUFBRSxDQUFDO3FCQUNSO2lCQUNEO2dCQUNELFVBQVUsRUFBRTtvQkFDWCxNQUFNLDZDQUFtQztvQkFDekMsT0FBTyxFQUFFLG1EQUE2Qix3QkFBZTtvQkFDckQsS0FBSyxFQUFFO3dCQUNOLE9BQU8sRUFBRSxnREFBMkIsMEJBQWUsd0JBQWU7cUJBQ2xFO29CQUNELElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixjQUFjLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsRUFDN0MsZUFBZSxDQUFDLDRCQUE0QixDQUM1QztpQkFDRDthQUNELENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsSUFBb0M7WUFDekUsSUFBSSxHQUFHLE9BQU8sSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUN4RCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQ2hELE1BQU0sUUFBUSxHQUNiLENBQUMsTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFlLFdBQVcsQ0FBQyxDQUFDO2dCQUN4RCxDQUFDLE1BQU0sWUFBWSxDQUFDLFFBQVEsQ0FBZSxVQUFVLENBQUMsQ0FBQyxDQUFBO1lBRXhELElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUM7Z0JBQ3ZCLE9BQU07WUFDUCxDQUFDO1lBRUQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ2hDLE1BQU0sS0FBSyxDQUFDLFNBQVMsQ0FDcEIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUNyRixDQUFBO1lBQ0YsQ0FBQztZQUVELElBQUksSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDO2dCQUNqQixJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDekIsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUNyQyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsUUFBUSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUN4QyxDQUFDO1lBQ0YsQ0FBQztZQUVELFFBQVEsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDN0IsQ0FBQztLQUNELENBQ0QsQ0FBQTtBQUNGLENBQUM7QUFFRCxTQUFTLG1CQUFtQixDQUFDLDBCQUF1RDtJQUNuRiwwQkFBMEIsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDakUsQ0FBQztBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUseUJBQXlCLENBQzlDLFNBQWlCLEVBQ2pCLFdBQXlCO0lBRXpCLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7UUFDeEMsT0FBTTtJQUNQLENBQUM7SUFFRCxnSkFBZ0o7SUFDaEoscUNBQXFDO0lBQ3JDLE1BQU0sV0FBVyxDQUNoQixLQUFLLENBQUMsU0FBUyxDQUNkLEtBQUssQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQyxDQUMvRSxFQUNELElBQUksQ0FDSixDQUFBO0FBQ0YsQ0FBQyJ9