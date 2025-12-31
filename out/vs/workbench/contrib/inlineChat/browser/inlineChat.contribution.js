/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerEditorContribution, } from '../../../../editor/browser/editorExtensions.js';
import { MenuRegistry, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { InlineChatController, InlineChatController1, InlineChatController2, } from './inlineChatController.js';
import * as InlineChatActions from './inlineChatActions.js';
import { CTX_INLINE_CHAT_EDITING, CTX_INLINE_CHAT_REQUEST_IN_PROGRESS, INLINE_CHAT_ID, MENU_INLINE_CHAT_WIDGET_STATUS, } from '../common/inlineChat.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { InlineChatNotebookContribution } from './inlineChatNotebook.js';
import { registerWorkbenchContribution2, Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { InlineChatAccessibleView } from './inlineChatAccessibleView.js';
import { IInlineChatSessionService } from './inlineChatSessionService.js';
import { InlineChatEnabler, InlineChatSessionServiceImpl } from './inlineChatSessionServiceImpl.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { CancelAction, ChatSubmitAction } from '../../chat/browser/actions/chatExecuteActions.js';
import { localize } from '../../../../nls.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { InlineChatAccessibilityHelp } from './inlineChatAccessibilityHelp.js';
import { InlineChatExpandLineAction, InlineChatHintsController, HideInlineChatHintAction, ShowInlineChatHintAction, } from './inlineChatCurrentLine.js';
registerEditorContribution(InlineChatController2.ID, InlineChatController2, 0 /* EditorContributionInstantiation.Eager */); // EAGER because of notebook dispose/create of editors
registerEditorContribution(INLINE_CHAT_ID, InlineChatController1, 0 /* EditorContributionInstantiation.Eager */); // EAGER because of notebook dispose/create of editors
registerEditorContribution(InlineChatController.ID, InlineChatController, 0 /* EditorContributionInstantiation.Eager */); // EAGER because of notebook dispose/create of editors
registerAction2(InlineChatActions.StopSessionAction2);
registerAction2(InlineChatActions.RevealWidget);
// --- browser
registerSingleton(IInlineChatSessionService, InlineChatSessionServiceImpl, 1 /* InstantiationType.Delayed */);
registerAction2(InlineChatExpandLineAction);
registerAction2(ShowInlineChatHintAction);
registerAction2(HideInlineChatHintAction);
registerEditorContribution(InlineChatHintsController.ID, InlineChatHintsController, 3 /* EditorContributionInstantiation.Eventually */);
// --- MENU special ---
const editActionMenuItem = {
    group: '0_main',
    order: 0,
    command: {
        id: ChatSubmitAction.ID,
        title: localize('send.edit', 'Edit Code'),
    },
    when: ContextKeyExpr.and(ChatContextKeys.inputHasText, CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.toNegated(), CTX_INLINE_CHAT_EDITING),
};
const generateActionMenuItem = {
    group: '0_main',
    order: 0,
    command: {
        id: ChatSubmitAction.ID,
        title: localize('send.generate', 'Generate'),
    },
    when: ContextKeyExpr.and(ChatContextKeys.inputHasText, CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.toNegated(), CTX_INLINE_CHAT_EDITING.toNegated()),
};
MenuRegistry.appendMenuItem(MENU_INLINE_CHAT_WIDGET_STATUS, editActionMenuItem);
MenuRegistry.appendMenuItem(MENU_INLINE_CHAT_WIDGET_STATUS, generateActionMenuItem);
const cancelActionMenuItem = {
    group: '0_main',
    order: 0,
    command: {
        id: CancelAction.ID,
        title: localize('cancel', 'Cancel Request'),
        shortTitle: localize('cancelShort', 'Cancel'),
    },
    when: ContextKeyExpr.and(CTX_INLINE_CHAT_REQUEST_IN_PROGRESS),
};
MenuRegistry.appendMenuItem(MENU_INLINE_CHAT_WIDGET_STATUS, cancelActionMenuItem);
// --- actions ---
registerAction2(InlineChatActions.StartSessionAction);
registerAction2(InlineChatActions.CloseAction);
registerAction2(InlineChatActions.ConfigureInlineChatAction);
registerAction2(InlineChatActions.UnstashSessionAction);
registerAction2(InlineChatActions.DiscardHunkAction);
registerAction2(InlineChatActions.RerunAction);
registerAction2(InlineChatActions.MoveToNextHunk);
registerAction2(InlineChatActions.MoveToPreviousHunk);
registerAction2(InlineChatActions.ArrowOutUpAction);
registerAction2(InlineChatActions.ArrowOutDownAction);
registerAction2(InlineChatActions.FocusInlineChat);
registerAction2(InlineChatActions.ViewInChatAction);
registerAction2(InlineChatActions.ToggleDiffForChange);
registerAction2(InlineChatActions.AcceptChanges);
const workbenchContributionsRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchContributionsRegistry.registerWorkbenchContribution(InlineChatNotebookContribution, 3 /* LifecyclePhase.Restored */);
registerWorkbenchContribution2(InlineChatEnabler.Id, InlineChatEnabler, 3 /* WorkbenchPhase.AfterRestored */);
AccessibleViewRegistry.register(new InlineChatAccessibleView());
AccessibleViewRegistry.register(new InlineChatAccessibilityHelp());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDaGF0L2Jyb3dzZXIvaW5saW5lQ2hhdC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUVOLDBCQUEwQixHQUMxQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFFTixZQUFZLEVBQ1osZUFBZSxHQUNmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixxQkFBcUIsRUFDckIscUJBQXFCLEdBQ3JCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxLQUFLLGlCQUFpQixNQUFNLHdCQUF3QixDQUFBO0FBQzNELE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsbUNBQW1DLEVBQ25DLGNBQWMsRUFDZCw4QkFBOEIsR0FDOUIsTUFBTSx5QkFBeUIsQ0FBQTtBQUNoQyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRTNFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3hFLE9BQU8sRUFFTiw4QkFBOEIsRUFDOUIsVUFBVSxJQUFJLG1CQUFtQixHQUVqQyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25HLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxN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