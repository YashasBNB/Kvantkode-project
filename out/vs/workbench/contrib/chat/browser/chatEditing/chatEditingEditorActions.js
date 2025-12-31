/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../../nls.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Action2, MenuId, MenuRegistry, registerAction2, } from '../../../../../platform/actions/common/actions.js';
import { CHAT_CATEGORY } from '../actions/chatActions.js';
import { ctxHasEditorModification, ctxHasRequestInProgress, ctxReviewModeEnabled, } from './chatEditingEditorContextKeys.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { ACTIVE_GROUP, IEditorService } from '../../../../services/editor/common/editorService.js';
import { CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME, IChatEditingService, } from '../../common/chatEditingService.js';
import { resolveCommandsContext } from '../../../../browser/parts/editor/editorCommandsContext.js';
import { IListService } from '../../../../../platform/list/browser/listService.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { MultiDiffEditorInput } from '../../../multiDiffEditor/browser/multiDiffEditorInput.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ActiveEditorContext } from '../../../../common/contextkeys.js';
import { EditorResourceAccessor, SideBySideEditor, TEXT_DIFF_EDITOR_ID, } from '../../../../common/editor.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
class ChatEditingEditorAction extends Action2 {
    constructor(desc) {
        super({
            category: CHAT_CATEGORY,
            ...desc,
        });
    }
    async run(accessor, ...args) {
        const instaService = accessor.get(IInstantiationService);
        const chatEditingService = accessor.get(IChatEditingService);
        const editorService = accessor.get(IEditorService);
        const uri = EditorResourceAccessor.getOriginalUri(editorService.activeEditorPane?.input, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        if (!uri || !editorService.activeEditorPane) {
            return;
        }
        const session = chatEditingService.editingSessionsObs
            .get()
            .find((candidate) => candidate.getEntry(uri));
        if (!session) {
            return;
        }
        const entry = session.getEntry(uri);
        const ctrl = entry.getEditorIntegration(editorService.activeEditorPane);
        return instaService.invokeFunction(this.runChatEditingCommand.bind(this), session, entry, ctrl, ...args);
    }
}
class NavigateAction extends ChatEditingEditorAction {
    constructor(next) {
        super({
            id: next ? 'chatEditor.action.navigateNext' : 'chatEditor.action.navigatePrevious',
            title: next
                ? localize2('next', 'Go to Next Chat Edit')
                : localize2('prev', 'Go to Previous Chat Edit'),
            icon: next ? Codicon.arrowDown : Codicon.arrowUp,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ctxHasRequestInProgress.negate()),
            keybinding: {
                primary: next ? 512 /* KeyMod.Alt */ | 63 /* KeyCode.F5 */ : 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 63 /* KeyCode.F5 */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(ctxHasEditorModification, EditorContextKeys.focus),
            },
            f1: true,
            menu: {
                id: MenuId.ChatEditingEditorContent,
                group: 'navigate',
                order: !next ? 2 : 3,
                when: ContextKeyExpr.and(ctxReviewModeEnabled, ctxHasRequestInProgress.negate()),
            },
        });
        this.next = next;
    }
    async runChatEditingCommand(accessor, session, entry, ctrl) {
        const instaService = accessor.get(IInstantiationService);
        const done = this.next ? ctrl.next(false) : ctrl.previous(false);
        if (done) {
            return;
        }
        const didOpenNext = await instaService.invokeFunction(openNextOrPreviousChange, session, entry, this.next);
        if (didOpenNext) {
            return;
        }
        //ELSE: wrap inside the same file
        this.next ? ctrl.next(true) : ctrl.previous(true);
    }
}
async function openNextOrPreviousChange(accessor, session, entry, next) {
    const editorService = accessor.get(IEditorService);
    const entries = session.entries.get();
    let idx = entries.indexOf(entry);
    let newEntry;
    while (true) {
        idx = (idx + (next ? 1 : -1) + entries.length) % entries.length;
        newEntry = entries[idx];
        if (newEntry.state.get() === 0 /* WorkingSetEntryState.Modified */) {
            break;
        }
        else if (newEntry === entry) {
            return false;
        }
    }
    const pane = await editorService.openEditor({
        resource: newEntry.modifiedURI,
        options: {
            revealIfOpened: false,
            revealIfVisible: false,
        },
    }, ACTIVE_GROUP);
    if (!pane) {
        return false;
    }
    if (session.entries.get().includes(newEntry)) {
        // make sure newEntry is still valid!
        newEntry.getEditorIntegration(pane).reveal(next);
    }
    return true;
}
class AcceptDiscardAction extends ChatEditingEditorAction {
    constructor(id, accept) {
        super({
            id,
            title: accept
                ? localize2('accept', 'Keep Chat Edits')
                : localize2('discard', 'Undo Chat Edits'),
            shortTitle: accept ? localize2('accept2', 'Keep') : localize2('discard2', 'Undo'),
            tooltip: accept
                ? localize2('accept3', 'Keep Chat Edits in this File')
                : localize2('discard3', 'Undo Chat Edits in this File'),
            precondition: ContextKeyExpr.and(ctxHasEditorModification, ctxHasRequestInProgress.negate()),
            icon: accept ? Codicon.check : Codicon.discard,
            f1: true,
            keybinding: {
                when: EditorContextKeys.focus,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: accept ? 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */ : 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
            },
            menu: {
                id: MenuId.ChatEditingEditorContent,
                group: 'a_resolve',
                order: accept ? 0 : 1,
                when: ContextKeyExpr.and(!accept ? ctxReviewModeEnabled : undefined, ctxHasRequestInProgress.negate()),
            },
        });
        this.accept = accept;
    }
    async runChatEditingCommand(accessor, session, entry, _integration) {
        const instaService = accessor.get(IInstantiationService);
        if (this.accept) {
            session.accept(entry.modifiedURI);
        }
        else {
            session.reject(entry.modifiedURI);
        }
        await instaService.invokeFunction(openNextOrPreviousChange, session, entry, true);
    }
}
export class AcceptAction extends AcceptDiscardAction {
    static { this.ID = 'chatEditor.action.accept'; }
    constructor() {
        super(AcceptAction.ID, true);
    }
}
export class RejectAction extends AcceptDiscardAction {
    static { this.ID = 'chatEditor.action.reject'; }
    constructor() {
        super(RejectAction.ID, false);
    }
}
class AcceptRejectHunkAction extends ChatEditingEditorAction {
    constructor(_accept) {
        super({
            id: _accept ? 'chatEditor.action.acceptHunk' : 'chatEditor.action.undoHunk',
            title: _accept
                ? localize2('acceptHunk', 'Keep this Change')
                : localize2('undo', 'Undo this Change'),
            precondition: ContextKeyExpr.and(ctxHasEditorModification, ctxHasRequestInProgress.negate()),
            icon: _accept ? Codicon.check : Codicon.discard,
            f1: true,
            keybinding: {
                when: EditorContextKeys.focus,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: _accept
                    ? 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */
                    : 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 1 /* KeyCode.Backspace */,
            },
            menu: {
                id: MenuId.ChatEditingEditorHunk,
                order: 1,
            },
        });
        this._accept = _accept;
    }
    runChatEditingCommand(_accessor, _session, _entry, ctrl, ...args) {
        if (this._accept) {
            ctrl.acceptNearestChange(args[0]);
        }
        else {
            ctrl.rejectNearestChange(args[0]);
        }
    }
}
class ToggleDiffAction extends ChatEditingEditorAction {
    constructor() {
        super({
            id: 'chatEditor.action.toggleDiff',
            title: localize2('diff', 'Toggle Diff Editor'),
            category: CHAT_CATEGORY,
            toggled: {
                condition: ContextKeyExpr.or(EditorContextKeys.inDiffEditor, ActiveEditorContext.isEqualTo(TEXT_DIFF_EDITOR_ID)),
                icon: Codicon.goToFile,
            },
            precondition: ContextKeyExpr.and(ctxHasEditorModification, ctxHasRequestInProgress.negate()),
            icon: Codicon.diffSingle,
            keybinding: {
                when: EditorContextKeys.focus,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 65 /* KeyCode.F7 */,
            },
            menu: [
                {
                    id: MenuId.ChatEditingEditorHunk,
                    order: 10,
                },
                {
                    id: MenuId.ChatEditingEditorContent,
                    group: 'a_resolve',
                    order: 2,
                    when: ContextKeyExpr.and(ctxReviewModeEnabled, ctxHasRequestInProgress.negate()),
                },
            ],
        });
    }
    runChatEditingCommand(_accessor, _session, _entry, integration, ...args) {
        integration.toggleDiff(args[0]);
    }
}
class ToggleAccessibleDiffViewAction extends ChatEditingEditorAction {
    constructor() {
        super({
            id: 'chatEditor.action.showAccessibleDiffView',
            title: localize2('accessibleDiff', 'Show Accessible Diff View'),
            f1: true,
            precondition: ContextKeyExpr.and(ctxHasEditorModification, ctxHasRequestInProgress.negate()),
            keybinding: {
                when: EditorContextKeys.focus,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 65 /* KeyCode.F7 */,
            },
        });
    }
    runChatEditingCommand(_accessor, _session, _entry, integration) {
        integration.enableAccessibleDiffView();
    }
}
export class ReviewChangesAction extends ChatEditingEditorAction {
    constructor() {
        super({
            id: 'chatEditor.action.reviewChanges',
            title: localize2('review', 'Review'),
            precondition: ContextKeyExpr.and(ctxHasEditorModification, ctxHasRequestInProgress.negate()),
            menu: [
                {
                    id: MenuId.ChatEditingEditorContent,
                    group: 'a_resolve',
                    order: 3,
                    when: ContextKeyExpr.and(ctxReviewModeEnabled.negate(), ctxHasRequestInProgress.negate()),
                },
            ],
        });
    }
    runChatEditingCommand(_accessor, _session, entry, _integration, ..._args) {
        entry.enableReviewModeUntilSettled();
    }
}
// --- multi file diff
class MultiDiffAcceptDiscardAction extends Action2 {
    constructor(accept) {
        super({
            id: accept ? 'chatEditing.multidiff.acceptAllFiles' : 'chatEditing.multidiff.discardAllFiles',
            title: accept
                ? localize('accept4', 'Keep All Edits')
                : localize('discard4', 'Undo All Edits'),
            icon: accept ? Codicon.check : Codicon.discard,
            menu: {
                when: ContextKeyExpr.equals('resourceScheme', CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME),
                id: MenuId.EditorTitle,
                order: accept ? 0 : 1,
                group: 'navigation',
            },
        });
        this.accept = accept;
    }
    async run(accessor, ...args) {
        const chatEditingService = accessor.get(IChatEditingService);
        const editorService = accessor.get(IEditorService);
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const listService = accessor.get(IListService);
        const resolvedContext = resolveCommandsContext(args, editorService, editorGroupsService, listService);
        const groupContext = resolvedContext.groupedEditors[0];
        if (!groupContext) {
            return;
        }
        const editor = groupContext.editors[0];
        if (!(editor instanceof MultiDiffEditorInput) || !editor.resource) {
            return;
        }
        const session = chatEditingService.getEditingSession(editor.resource.authority);
        if (this.accept) {
            await session?.accept();
        }
        else {
            await session?.reject();
        }
    }
}
export function registerChatEditorActions() {
    registerAction2(class NextAction extends NavigateAction {
        constructor() {
            super(true);
        }
    });
    registerAction2(class PrevAction extends NavigateAction {
        constructor() {
            super(false);
        }
    });
    registerAction2(ReviewChangesAction);
    registerAction2(AcceptAction);
    registerAction2(RejectAction);
    registerAction2(class AcceptHunkAction extends AcceptRejectHunkAction {
        constructor() {
            super(true);
        }
    });
    registerAction2(class AcceptHunkAction extends AcceptRejectHunkAction {
        constructor() {
            super(false);
        }
    });
    registerAction2(ToggleDiffAction);
    registerAction2(ToggleAccessibleDiffViewAction);
    registerAction2(class extends MultiDiffAcceptDiscardAction {
        constructor() {
            super(true);
        }
    });
    registerAction2(class extends MultiDiffAcceptDiscardAction {
        constructor() {
            super(false);
        }
    });
    MenuRegistry.appendMenuItem(MenuId.ChatEditingEditorContent, {
        command: {
            id: navigationBearingFakeActionId,
            title: localize('label', 'Navigation Status'),
            precondition: ContextKeyExpr.false(),
        },
        group: 'navigate',
        order: -1,
        when: ContextKeyExpr.and(ctxReviewModeEnabled, ctxHasRequestInProgress.negate()),
    });
}
export const navigationBearingFakeActionId = 'chatEditor.navigation.bearings';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdFZGl0b3JBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL2NoYXRFZGl0aW5nRWRpdG9yQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRTNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sT0FBTyxFQUVQLE1BQU0sRUFDTixZQUFZLEVBQ1osZUFBZSxHQUNmLE1BQU0sbURBQW1ELENBQUE7QUFHMUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3pELE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsdUJBQXVCLEVBQ3ZCLG9CQUFvQixHQUNwQixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ2xHLE9BQU8sRUFDTiw4Q0FBOEMsRUFDOUMsbUJBQW1CLEdBS25CLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FB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