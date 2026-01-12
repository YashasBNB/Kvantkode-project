/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { AccessibleDiffViewerNext, AccessibleDiffViewerPrev, CollapseAllUnchangedRegions, ExitCompareMove, RevertHunkOrSelection, ShowAllUnchangedRegions, SwitchSide, ToggleCollapseUnchangedRegions, ToggleShowMovedCodeBlocks, ToggleUseInlineViewWhenSpaceIsLimited, } from './commands.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { localize } from '../../../../nls.js';
import { MenuId, MenuRegistry, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { ContextKeyEqualsExpr, ContextKeyExpr, } from '../../../../platform/contextkey/common/contextkey.js';
import './registrations.contribution.js';
registerAction2(ToggleCollapseUnchangedRegions);
registerAction2(ToggleShowMovedCodeBlocks);
registerAction2(ToggleUseInlineViewWhenSpaceIsLimited);
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    command: {
        id: new ToggleUseInlineViewWhenSpaceIsLimited().desc.id,
        title: localize('useInlineViewWhenSpaceIsLimited', 'Use Inline View When Space Is Limited'),
        toggled: ContextKeyExpr.has('config.diffEditor.useInlineViewWhenSpaceIsLimited'),
        precondition: ContextKeyExpr.has('isInDiffEditor'),
    },
    order: 11,
    group: '1_diff',
    when: ContextKeyExpr.and(EditorContextKeys.diffEditorRenderSideBySideInlineBreakpointReached, ContextKeyExpr.has('isInDiffEditor')),
});
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    command: {
        id: new ToggleShowMovedCodeBlocks().desc.id,
        title: localize('showMoves', 'Show Moved Code Blocks'),
        icon: Codicon.move,
        toggled: ContextKeyEqualsExpr.create('config.diffEditor.experimental.showMoves', true),
        precondition: ContextKeyExpr.has('isInDiffEditor'),
    },
    order: 10,
    group: '1_diff',
    when: ContextKeyExpr.has('isInDiffEditor'),
});
registerAction2(RevertHunkOrSelection);
for (const ctx of [
    { icon: Codicon.arrowRight, key: EditorContextKeys.diffEditorInlineMode.toNegated() },
    { icon: Codicon.discard, key: EditorContextKeys.diffEditorInlineMode },
]) {
    MenuRegistry.appendMenuItem(MenuId.DiffEditorHunkToolbar, {
        command: {
            id: new RevertHunkOrSelection().desc.id,
            title: localize('revertHunk', 'Revert Block'),
            icon: ctx.icon,
        },
        when: ContextKeyExpr.and(EditorContextKeys.diffEditorModifiedWritable, ctx.key),
        order: 5,
        group: 'primary',
    });
    MenuRegistry.appendMenuItem(MenuId.DiffEditorSelectionToolbar, {
        command: {
            id: new RevertHunkOrSelection().desc.id,
            title: localize('revertSelection', 'Revert Selection'),
            icon: ctx.icon,
        },
        when: ContextKeyExpr.and(EditorContextKeys.diffEditorModifiedWritable, ctx.key),
        order: 5,
        group: 'primary',
    });
}
registerAction2(SwitchSide);
registerAction2(ExitCompareMove);
registerAction2(CollapseAllUnchangedRegions);
registerAction2(ShowAllUnchangedRegions);
MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
    command: {
        id: AccessibleDiffViewerNext.id,
        title: localize('Open Accessible Diff Viewer', 'Open Accessible Diff Viewer'),
        precondition: ContextKeyExpr.has('isInDiffEditor'),
    },
    order: 10,
    group: '2_diff',
    when: ContextKeyExpr.and(EditorContextKeys.accessibleDiffViewerVisible.negate(), ContextKeyExpr.has('isInDiffEditor')),
});
CommandsRegistry.registerCommandAlias('editor.action.diffReview.next', AccessibleDiffViewerNext.id);
registerAction2(AccessibleDiffViewerNext);
CommandsRegistry.registerCommandAlias('editor.action.diffReview.prev', AccessibleDiffViewerPrev.id);
registerAction2(AccessibleDiffViewerPrev);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvci5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9kaWZmRWRpdG9yL2RpZmZFZGl0b3IuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLHdCQUF3QixFQUN4QiwyQkFBMkIsRUFDM0IsZUFBZSxFQUNmLHFCQUFxQixFQUNyQix1QkFBdUIsRUFDdkIsVUFBVSxFQUNWLDhCQUE4QixFQUM5Qix5QkFBeUIsRUFDekIscUNBQXFDLEdBQ3JDLE1BQU0sZUFBZSxDQUFBO0FBQ3RCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQ04sTUFBTSxFQUNOLFlBQVksRUFDWixlQUFlLEdBQ2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLGNBQWMsR0FDZCxNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8saUNBQWlDLENBQUE7QUFFeEMsZUFBZSxDQUFDLDhCQUE4QixDQUFDLENBQUE7QUFDL0MsZUFBZSxDQUFDLHlCQUF5QixDQUFDLENBQUE7QUFDMUMsZUFBZSxDQUFDLHFDQUFxQyxDQUFDLENBQUE7QUFFdEQsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFO0lBQy9DLE9BQU8sRUFBRTtRQUNSLEVBQUUsRUFBRSxJQUFJLHFDQUFxQyxFQUFFLENBQUMs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