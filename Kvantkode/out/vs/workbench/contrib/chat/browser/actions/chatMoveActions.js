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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1vdmVBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0TW92ZUFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUV4RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNoRyxPQUFPLEVBQ04sWUFBWSxFQUNaLGdCQUFnQixFQUNoQixjQUFjLEdBQ2QsTUFBTSxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDMUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQXNCLE1BQU0sa0JBQWtCLENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRXZELE9BQU8sRUFBRSxh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