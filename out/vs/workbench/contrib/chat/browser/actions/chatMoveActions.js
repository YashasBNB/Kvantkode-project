/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ActiveEditorContext } from '../../../../common/contextkeys.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { ACTIVE_GROUP, AUX_WINDOW_GROUP, IEditorService, } from '../../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { isChatViewTitleActionContext } from '../../common/chatActions.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { IChatService } from '../../common/chatService.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { ChatViewId, IChatWidgetService } from '../chat.js';
import { ChatEditor } from '../chatEditor.js';
import { ChatEditorInput } from '../chatEditorInput.js';
import { CHAT_CATEGORY } from './chatActions.js';
import { waitForChatSessionCleared } from './chatClearActions.js';
var MoveToNewLocation;
(function (MoveToNewLocation) {
    MoveToNewLocation["Editor"] = "Editor";
    MoveToNewLocation["Window"] = "Window";
})(MoveToNewLocation || (MoveToNewLocation = {}));
export function registerMoveActions() {
    registerAction2(class GlobalMoveToEditorAction extends Action2 {
        constructor() {
            super({
                id: `workbench.action.chat.openInEditor`,
                title: localize2('chat.openInEditor.label', 'Open Chat in Editor'),
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled,
                f1: true,
                menu: {
                    id: MenuId.ViewTitle,
                    when: ContextKeyExpr.equals('view', ChatViewId),
                    order: 0,
                    group: '1_open',
                },
            });
        }
        async run(accessor, ...args) {
            const context = args[0];
            executeMoveToAction(accessor, MoveToNewLocation.Editor, isChatViewTitleActionContext(context) ? context.sessionId : undefined);
        }
    });
    registerAction2(class GlobalMoveToNewWindowAction extends Action2 {
        constructor() {
            super({
                id: `workbench.action.chat.openInNewWindow`,
                title: localize2('chat.openInNewWindow.label', 'Open Chat in New Window'),
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled,
                f1: true,
                menu: {
                    id: MenuId.ViewTitle,
                    when: ContextKeyExpr.equals('view', ChatViewId),
                    order: 0,
                    group: '1_open',
                },
            });
        }
        async run(accessor, ...args) {
            const context = args[0];
            executeMoveToAction(accessor, MoveToNewLocation.Window, isChatViewTitleActionContext(context) ? context.sessionId : undefined);
        }
    });
    registerAction2(class GlobalMoveToSidebarAction extends Action2 {
        constructor() {
            super({
                id: `workbench.action.chat.openInSidebar`,
                title: localize2('interactiveSession.openInSidebar.label', 'Open Chat in Side Bar'),
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled,
                f1: true,
                menu: [
                    {
                        id: MenuId.EditorTitle,
                        order: 0,
                        when: ActiveEditorContext.isEqualTo(ChatEditorInput.EditorID),
                    },
                ],
            });
        }
        async run(accessor, ...args) {
            return moveToSidebar(accessor);
        }
    });
}
async function executeMoveToAction(accessor, moveTo, _sessionId) {
    const widgetService = accessor.get(IChatWidgetService);
    const editorService = accessor.get(IEditorService);
    const chatService = accessor.get(IChatService);
    const widget = (_sessionId ? widgetService.getWidgetBySessionId(_sessionId) : undefined) ??
        widgetService.lastFocusedWidget;
    if (!widget || !widget.viewModel || widget.location !== ChatAgentLocation.Panel) {
        await editorService.openEditor({ resource: ChatEditorInput.getNewEditorUri(), options: { pinned: true } }, moveTo === MoveToNewLocation.Window ? AUX_WINDOW_GROUP : ACTIVE_GROUP);
        return;
    }
    const sessionId = widget.viewModel.sessionId;
    const viewState = widget.getViewState();
    widget.clear();
    await waitForChatSessionCleared(sessionId, chatService);
    const options = { target: { sessionId }, pinned: true, viewState: viewState };
    await editorService.openEditor({ resource: ChatEditorInput.getNewEditorUri(), options }, moveTo === MoveToNewLocation.Window ? AUX_WINDOW_GROUP : ACTIVE_GROUP);
}
async function moveToSidebar(accessor) {
    const viewsService = accessor.get(IViewsService);
    const editorService = accessor.get(IEditorService);
    const editorGroupService = accessor.get(IEditorGroupsService);
    const chatEditor = editorService.activeEditorPane;
    const chatEditorInput = chatEditor?.input;
    let view;
    if (chatEditor instanceof ChatEditor &&
        chatEditorInput instanceof ChatEditorInput &&
        chatEditorInput.sessionId) {
        await editorService.closeEditor({
            editor: chatEditor.input,
            groupId: editorGroupService.activeGroup.id,
        });
        view = (await viewsService.openView(ChatViewId));
        await view.loadSession(chatEditorInput.sessionId, chatEditor.getViewState());
    }
    else {
        view = (await viewsService.openView(ChatViewId));
    }
    view.focus();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1vdmVBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdE1vdmVBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFFeEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDaEcsT0FBTyxFQUNOLFlBQVksRUFDWixnQkFBZ0IsRUFDaEIsY0FBYyxHQUNkLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFzQixNQUFNLGtCQUFrQixDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsYUFBYSxF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