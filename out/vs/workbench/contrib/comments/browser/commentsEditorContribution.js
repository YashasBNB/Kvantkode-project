/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyChord } from '../../../../base/common/keyCodes.js';
import './media/review.css';
import { isCodeEditor, isDiffEditor, } from '../../../../editor/browser/editorBrowser.js';
import { registerEditorContribution, } from '../../../../editor/browser/editorExtensions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import * as nls from '../../../../nls.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ICommentService } from './commentService.js';
import { ctxCommentEditorFocused, SimpleCommentEditor } from './simpleCommentEditor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { CommentController, ID } from './commentsController.js';
import { Range } from '../../../../editor/common/core/range.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { CommentContextKeys } from '../common/commentContextKeys.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../platform/accessibility/common/accessibility.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { accessibilityHelpIsShown, accessibleViewCurrentProviderId, } from '../../accessibility/browser/accessibilityConfiguration.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { CommentsInputContentProvider } from './commentsInputContentProvider.js';
import { CommentWidgetFocus } from './commentThreadZoneWidget.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
registerEditorContribution(ID, CommentController, 1 /* EditorContributionInstantiation.AfterFirstRender */);
registerWorkbenchContribution2(CommentsInputContentProvider.ID, CommentsInputContentProvider, 2 /* WorkbenchPhase.BlockRestore */);
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: "editor.action.nextCommentThreadAction" /* CommentCommandId.NextThread */,
    handler: async (accessor, args) => {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return Promise.resolve();
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return Promise.resolve();
        }
        controller.nextCommentThread(true);
    },
    weight: 100 /* KeybindingWeight.EditorContrib */,
    primary: 512 /* KeyMod.Alt */ | 67 /* KeyCode.F9 */,
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: "editor.action.previousCommentThreadAction" /* CommentCommandId.PreviousThread */,
    handler: async (accessor, args) => {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return Promise.resolve();
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return Promise.resolve();
        }
        controller.previousCommentThread(true);
    },
    weight: 100 /* KeybindingWeight.EditorContrib */,
    primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 67 /* KeyCode.F9 */,
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "editor.action.nextCommentedRangeAction" /* CommentCommandId.NextCommentedRange */,
            title: {
                value: nls.localize('comments.NextCommentedRange', 'Go to Next Commented Range'),
                original: 'Go to Next Commented Range',
            },
            category: {
                value: nls.localize('commentsCategory', 'Comments'),
                original: 'Comments',
            },
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.activeEditorHasCommentingRange,
                },
            ],
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 68 /* KeyCode.F10 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
                when: CommentContextKeys.activeEditorHasCommentingRange,
            },
        });
    }
    run(accessor, ...args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        controller.nextCommentThread(false);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "editor.action.previousCommentedRangeAction" /* CommentCommandId.PreviousCommentedRange */,
            title: {
                value: nls.localize('comments.previousCommentedRange', 'Go to Previous Commented Range'),
                original: 'Go to Previous Commented Range',
            },
            category: {
                value: nls.localize('commentsCategory', 'Comments'),
                original: 'Comments',
            },
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.activeEditorHasCommentingRange,
                },
            ],
            keybinding: {
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 68 /* KeyCode.F10 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
                when: CommentContextKeys.activeEditorHasCommentingRange,
            },
        });
    }
    run(accessor, ...args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        controller.previousCommentThread(false);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "editor.action.nextCommentingRange" /* CommentCommandId.NextRange */,
            title: {
                value: nls.localize('comments.nextCommentingRange', 'Go to Next Commenting Range'),
                original: 'Go to Next Commenting Range',
            },
            category: {
                value: nls.localize('commentsCategory', 'Comments'),
                original: 'Comments',
            },
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.activeEditorHasCommentingRange,
                },
            ],
            keybinding: {
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
                when: ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, ContextKeyExpr.or(EditorContextKeys.focus, CommentContextKeys.commentFocused, ContextKeyExpr.and(accessibilityHelpIsShown, accessibleViewCurrentProviderId.isEqualTo("comments" /* AccessibleViewProviderId.Comments */)))),
            },
        });
    }
    run(accessor, args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        controller.nextCommentingRange();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "editor.action.previousCommentingRange" /* CommentCommandId.PreviousRange */,
            title: {
                value: nls.localize('comments.previousCommentingRange', 'Go to Previous Commenting Range'),
                original: 'Go to Previous Commenting Range',
            },
            category: {
                value: nls.localize('commentsCategory', 'Comments'),
                original: 'Comments',
            },
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.activeEditorHasCommentingRange,
                },
            ],
            keybinding: {
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
                when: ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, ContextKeyExpr.or(EditorContextKeys.focus, CommentContextKeys.commentFocused, ContextKeyExpr.and(accessibilityHelpIsShown, accessibleViewCurrentProviderId.isEqualTo("comments" /* AccessibleViewProviderId.Comments */)))),
            },
        });
    }
    async run(accessor, ...args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        controller.previousCommentingRange();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "workbench.action.toggleCommenting" /* CommentCommandId.ToggleCommenting */,
            title: {
                value: nls.localize('comments.toggleCommenting', 'Toggle Editor Commenting'),
                original: 'Toggle Editor Commenting',
            },
            category: {
                value: nls.localize('commentsCategory', 'Comments'),
                original: 'Comments',
            },
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.WorkspaceHasCommenting,
                },
            ],
        });
    }
    run(accessor, ...args) {
        const commentService = accessor.get(ICommentService);
        const enable = commentService.isCommentingEnabled;
        commentService.enableCommenting(!enable);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "workbench.action.addComment" /* CommentCommandId.Add */,
            title: {
                value: nls.localize('comments.addCommand', 'Add Comment on Current Selection'),
                original: 'Add Comment on Current Selection',
            },
            category: {
                value: nls.localize('commentsCategory', 'Comments'),
                original: 'Comments',
            },
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.activeCursorHasCommentingRange,
                },
            ],
            keybinding: {
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
                when: CommentContextKeys.activeCursorHasCommentingRange,
            },
        });
    }
    async run(accessor, args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        const position = args?.range
            ? new Range(args.range.startLineNumber, args.range.startLineNumber, args.range.endLineNumber, args.range.endColumn)
            : args?.fileComment
                ? undefined
                : activeEditor.getSelection();
        await controller.addOrToggleCommentAtLine(position, undefined);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "workbench.action.focusCommentOnCurrentLine" /* CommentCommandId.FocusCommentOnCurrentLine */,
            title: {
                value: nls.localize('comments.focusCommentOnCurrentLine', 'Focus Comment on Current Line'),
                original: 'Focus Comment on Current Line',
            },
            category: {
                value: nls.localize('commentsCategory', 'Comments'),
                original: 'Comments',
            },
            f1: true,
            precondition: CommentContextKeys.activeCursorHasComment,
        });
    }
    async run(accessor, ...args) {
        const activeEditor = getActiveEditor(accessor);
        if (!activeEditor) {
            return;
        }
        const controller = CommentController.get(activeEditor);
        if (!controller) {
            return;
        }
        const position = activeEditor.getSelection();
        const notificationService = accessor.get(INotificationService);
        let error = false;
        try {
            const commentAtLine = controller.getCommentsAtLine(position);
            if (commentAtLine.length === 0) {
                error = true;
            }
            else {
                await controller.revealCommentThread(commentAtLine[0].commentThread.threadId, undefined, false, CommentWidgetFocus.Widget);
            }
        }
        catch (e) {
            error = true;
        }
        if (error) {
            notificationService.error(nls.localize('comments.focusCommand.error', 'The cursor must be on a line with a comment to focus the comment'));
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "workbench.action.collapseAllComments" /* CommentCommandId.CollapseAll */,
            title: {
                value: nls.localize('comments.collapseAll', 'Collapse All Comments'),
                original: 'Collapse All Comments',
            },
            category: {
                value: nls.localize('commentsCategory', 'Comments'),
                original: 'Comments',
            },
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.WorkspaceHasCommenting,
                },
            ],
        });
    }
    run(accessor, ...args) {
        getActiveController(accessor)?.collapseAll();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "workbench.action.expandAllComments" /* CommentCommandId.ExpandAll */,
            title: {
                value: nls.localize('comments.expandAll', 'Expand All Comments'),
                original: 'Expand All Comments',
            },
            category: {
                value: nls.localize('commentsCategory', 'Comments'),
                original: 'Comments',
            },
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.WorkspaceHasCommenting,
                },
            ],
        });
    }
    run(accessor, ...args) {
        getActiveController(accessor)?.expandAll();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: "workbench.action.expandUnresolvedComments" /* CommentCommandId.ExpandUnresolved */,
            title: {
                value: nls.localize('comments.expandUnresolved', 'Expand Unresolved Comments'),
                original: 'Expand Unresolved Comments',
            },
            category: {
                value: nls.localize('commentsCategory', 'Comments'),
                original: 'Comments',
            },
            menu: [
                {
                    id: MenuId.CommandPalette,
                    when: CommentContextKeys.WorkspaceHasCommenting,
                },
            ],
        });
    }
    run(accessor, ...args) {
        getActiveController(accessor)?.expandUnresolved();
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: "editor.action.submitComment" /* CommentCommandId.Submit */,
    weight: 100 /* KeybindingWeight.EditorContrib */,
    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    when: ctxCommentEditorFocused,
    handler: (accessor, args) => {
        const activeCodeEditor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
        if (activeCodeEditor instanceof SimpleCommentEditor) {
            activeCodeEditor.getParentThread().submitComment();
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: "workbench.action.hideComment" /* CommentCommandId.Hide */,
    weight: 100 /* KeybindingWeight.EditorContrib */,
    primary: 9 /* KeyCode.Escape */,
    secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
    when: ContextKeyExpr.or(ctxCommentEditorFocused, CommentContextKeys.commentFocused),
    handler: async (accessor, args) => {
        const activeCodeEditor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
        const keybindingService = accessor.get(IKeybindingService);
        // Unfortunate, but collapsing the comment thread might cause a dialog to show
        // If we don't wait for the key up here, then the dialog will consume it and immediately close
        await keybindingService.enableKeybindingHoldMode("workbench.action.hideComment" /* CommentCommandId.Hide */);
        if (activeCodeEditor instanceof SimpleCommentEditor) {
            activeCodeEditor.getParentThread().collapse();
        }
        else if (activeCodeEditor) {
            const controller = CommentController.get(activeCodeEditor);
            if (!controller) {
                return;
            }
            const notificationService = accessor.get(INotificationService);
            const commentService = accessor.get(ICommentService);
            let error = false;
            try {
                const activeComment = commentService.lastActiveCommentcontroller?.activeComment;
                if (!activeComment) {
                    error = true;
                }
                else {
                    controller.collapseAndFocusRange(activeComment.thread.threadId);
                }
            }
            catch (e) {
                error = true;
            }
            if (error) {
                notificationService.error(nls.localize('comments.focusCommand.error', 'The cursor must be on a line with a comment to focus the comment'));
            }
        }
    },
});
export function getActiveEditor(accessor) {
    let activeTextEditorControl = accessor.get(IEditorService).activeTextEditorControl;
    if (isDiffEditor(activeTextEditorControl)) {
        if (activeTextEditorControl.getOriginalEditor().hasTextFocus()) {
            activeTextEditorControl = activeTextEditorControl.getOriginalEditor();
        }
        else {
            activeTextEditorControl = activeTextEditorControl.getModifiedEditor();
        }
    }
    if (!isCodeEditor(activeTextEditorControl) || !activeTextEditorControl.hasModel()) {
        return null;
    }
    return activeTextEditorControl;
}
function getActiveController(accessor) {
    const activeEditor = getActiveEditor(accessor);
    if (!activeEditor) {
        return undefined;
    }
    const controller = CommentController.get(activeEditor);
    if (!controller) {
        return undefined;
    }
    return controller;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNFZGl0b3JDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnRzRWRpdG9yQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0scUNBQXFDLENBQUE7QUFDL0UsT0FBTyxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBRU4sWUFBWSxFQUNaLFlBQVksR0FDWixNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFFTiwwQkFBMEIsR0FDMUIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDckQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDdkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxFQUFFLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUMvRCxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdkUsT0FBTyxFQUFFLG9CQUFvQixF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