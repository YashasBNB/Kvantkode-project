/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { timeout } from '../../../../../../base/common/async.js';
import { EditorExtensionsRegistry } from '../../../../../../editor/browser/editorExtensions.js';
import { EditorContextKeys } from '../../../../../../editor/common/editorContextKeys.js';
import { localize } from '../../../../../../nls.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../../../platform/accessibility/common/accessibility.js';
import { Action2, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { Extensions as ConfigurationExtensions, } from '../../../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { InputFocusedContextKey, IsWindowsContext, } from '../../../../../../platform/contextkey/common/contextkeys.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { InlineChatController } from '../../../../inlineChat/browser/inlineChatController.js';
import { CTX_NOTEBOOK_CHAT_OUTER_FOCUS_POSITION } from '../../controller/chat/notebookChatContext.js';
import { NotebookAction, NotebookCellAction, NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT, findTargetCellEditor, } from '../../controller/coreActions.js';
import { CellEditState } from '../../notebookBrowser.js';
import { CellKind, NOTEBOOK_EDITOR_CURSOR_BOUNDARY } from '../../../common/notebookCommon.js';
import { NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_CELL_MARKDOWN_EDIT_MODE, NOTEBOOK_CELL_TYPE, NOTEBOOK_CURSOR_NAVIGATION_MODE, NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_OUTPUT_INPUT_FOCUSED, NOTEBOOK_OUTPUT_FOCUSED, NOTEBOOK_CELL_EDITOR_FOCUSED, IS_COMPOSITE_NOTEBOOK, } from '../../../common/notebookContextKeys.js';
const NOTEBOOK_FOCUS_TOP = 'notebook.focusTop';
const NOTEBOOK_FOCUS_BOTTOM = 'notebook.focusBottom';
const NOTEBOOK_FOCUS_PREVIOUS_EDITOR = 'notebook.focusPreviousEditor';
const NOTEBOOK_FOCUS_NEXT_EDITOR = 'notebook.focusNextEditor';
const FOCUS_IN_OUTPUT_COMMAND_ID = 'notebook.cell.focusInOutput';
const FOCUS_OUT_OUTPUT_COMMAND_ID = 'notebook.cell.focusOutOutput';
export const CENTER_ACTIVE_CELL = 'notebook.centerActiveCell';
const NOTEBOOK_CURSOR_PAGEUP_COMMAND_ID = 'notebook.cell.cursorPageUp';
const NOTEBOOK_CURSOR_PAGEUP_SELECT_COMMAND_ID = 'notebook.cell.cursorPageUpSelect';
const NOTEBOOK_CURSOR_PAGEDOWN_COMMAND_ID = 'notebook.cell.cursorPageDown';
const NOTEBOOK_CURSOR_PAGEDOWN_SELECT_COMMAND_ID = 'notebook.cell.cursorPageDownSelect';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.cell.nullAction',
            title: localize('notebook.cell.webviewHandledEvents', 'Keypresses that should be handled by the focused element in the cell output.'),
            keybinding: [
                {
                    when: NOTEBOOK_OUTPUT_INPUT_FOCUSED,
                    primary: 18 /* KeyCode.DownArrow */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                },
                {
                    when: NOTEBOOK_OUTPUT_INPUT_FOCUSED,
                    primary: 16 /* KeyCode.UpArrow */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                },
            ],
            f1: false,
        });
    }
    run() {
        // noop, these are handled by the output webview
        return;
    }
});
registerAction2(class FocusNextCellAction extends NotebookCellAction {
    constructor() {
        super({
            id: NOTEBOOK_FOCUS_NEXT_EDITOR,
            title: localize('cursorMoveDown', 'Focus Next Cell Editor'),
            keybinding: [
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate(), ContextKeyExpr.equals('config.notebook.navigation.allowNavigateToSurroundingCells', true), ContextKeyExpr.and(ContextKeyExpr.has(InputFocusedContextKey), EditorContextKeys.editorTextFocus, NOTEBOOK_EDITOR_CURSOR_BOUNDARY.notEqualsTo('top'), NOTEBOOK_EDITOR_CURSOR_BOUNDARY.notEqualsTo('none')), EditorContextKeys.isEmbeddedDiffEditor.negate()),
                    primary: 18 /* KeyCode.DownArrow */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT, // code cell keybinding, focus inside editor: lower weight to not override suggest widget
                },
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate(), ContextKeyExpr.equals('config.notebook.navigation.allowNavigateToSurroundingCells', true), ContextKeyExpr.and(NOTEBOOK_CELL_TYPE.isEqualTo('markup'), NOTEBOOK_CELL_MARKDOWN_EDIT_MODE.isEqualTo(false), NOTEBOOK_CURSOR_NAVIGATION_MODE), EditorContextKeys.isEmbeddedDiffEditor.negate()),
                    primary: 18 /* KeyCode.DownArrow */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */, // markdown keybinding, focus on list: higher weight to override list.focusDown
                },
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_OUTPUT_FOCUSED),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                    mac: { primary: 256 /* KeyMod.WinCtrl */ | 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */ },
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                },
                {
                    when: ContextKeyExpr.and(NOTEBOOK_CELL_EDITOR_FOCUSED, CONTEXT_ACCESSIBILITY_MODE_ENABLED),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 12 /* KeyCode.PageDown */,
                    mac: { primary: 256 /* KeyMod.WinCtrl */ | 11 /* KeyCode.PageUp */ },
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                },
            ],
        });
    }
    async runWithContext(accessor, context) {
        const editor = context.notebookEditor;
        const activeCell = context.cell;
        const idx = editor.getCellIndex(activeCell);
        if (typeof idx !== 'number') {
            return;
        }
        if (idx >= editor.getLength() - 1) {
            // last one
            return;
        }
        const focusEditorLine = activeCell.textBuffer.getLineCount();
        const targetCell = context.cell ?? context.selectedCells?.[0];
        const foundEditor = targetCell
            ? findTargetCellEditor(context, targetCell)
            : undefined;
        if (foundEditor &&
            foundEditor.hasTextFocus() &&
            InlineChatController.get(foundEditor)?.getWidgetPosition()?.lineNumber === focusEditorLine) {
            InlineChatController.get(foundEditor)?.focus();
        }
        else {
            const newCell = editor.cellAt(idx + 1);
            const newFocusMode = newCell.cellKind === CellKind.Markup && newCell.getEditState() === CellEditState.Preview
                ? 'container'
                : 'editor';
            await editor.focusNotebookCell(newCell, newFocusMode, { focusEditorLine: 1 });
        }
    }
});
registerAction2(class FocusPreviousCellAction extends NotebookCellAction {
    constructor() {
        super({
            id: NOTEBOOK_FOCUS_PREVIOUS_EDITOR,
            title: localize('cursorMoveUp', 'Focus Previous Cell Editor'),
            keybinding: [
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate(), ContextKeyExpr.equals('config.notebook.navigation.allowNavigateToSurroundingCells', true), ContextKeyExpr.and(ContextKeyExpr.has(InputFocusedContextKey), EditorContextKeys.editorTextFocus, NOTEBOOK_EDITOR_CURSOR_BOUNDARY.notEqualsTo('bottom'), NOTEBOOK_EDITOR_CURSOR_BOUNDARY.notEqualsTo('none')), EditorContextKeys.isEmbeddedDiffEditor.negate()),
                    primary: 16 /* KeyCode.UpArrow */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT, // code cell keybinding, focus inside editor: lower weight to not override suggest widget
                },
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate(), ContextKeyExpr.equals('config.notebook.navigation.allowNavigateToSurroundingCells', true), ContextKeyExpr.and(NOTEBOOK_CELL_TYPE.isEqualTo('markup'), NOTEBOOK_CELL_MARKDOWN_EDIT_MODE.isEqualTo(false), NOTEBOOK_CURSOR_NAVIGATION_MODE), EditorContextKeys.isEmbeddedDiffEditor.negate()),
                    primary: 16 /* KeyCode.UpArrow */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */, // markdown keybinding, focus on list: higher weight to override list.focusDown
                },
                {
                    when: ContextKeyExpr.and(NOTEBOOK_CELL_EDITOR_FOCUSED, CONTEXT_ACCESSIBILITY_MODE_ENABLED),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 11 /* KeyCode.PageUp */,
                    mac: { primary: 256 /* KeyMod.WinCtrl */ | 11 /* KeyCode.PageUp */ },
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                },
            ],
        });
    }
    async runWithContext(accessor, context) {
        const editor = context.notebookEditor;
        const activeCell = context.cell;
        const idx = editor.getCellIndex(activeCell);
        if (typeof idx !== 'number') {
            return;
        }
        if (idx < 1 || editor.getLength() === 0) {
            // we don't do loop
            return;
        }
        const newCell = editor.cellAt(idx - 1);
        const newFocusMode = newCell.cellKind === CellKind.Markup && newCell.getEditState() === CellEditState.Preview
            ? 'container'
            : 'editor';
        const focusEditorLine = newCell.textBuffer.getLineCount();
        await editor.focusNotebookCell(newCell, newFocusMode, { focusEditorLine: focusEditorLine });
        const foundEditor = findTargetCellEditor(context, newCell);
        if (foundEditor &&
            InlineChatController.get(foundEditor)?.getWidgetPosition()?.lineNumber === focusEditorLine) {
            InlineChatController.get(foundEditor)?.focus();
        }
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: NOTEBOOK_FOCUS_TOP,
            title: localize('focusFirstCell', 'Focus First Cell'),
            keybinding: [
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 14 /* KeyCode.Home */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                },
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey), CTX_NOTEBOOK_CHAT_OUTER_FOCUS_POSITION.isEqualTo('')),
                    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */ },
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                },
            ],
        });
    }
    async runWithContext(accessor, context) {
        const editor = context.notebookEditor;
        if (editor.getLength() === 0) {
            return;
        }
        const firstCell = editor.cellAt(0);
        await editor.focusNotebookCell(firstCell, 'container');
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: NOTEBOOK_FOCUS_BOTTOM,
            title: localize('focusLastCell', 'Focus Last Cell'),
            keybinding: [
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 13 /* KeyCode.End */,
                    mac: undefined,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                },
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey), CTX_NOTEBOOK_CHAT_OUTER_FOCUS_POSITION.isEqualTo('')),
                    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */ },
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                },
            ],
        });
    }
    async runWithContext(accessor, context) {
        const editor = context.notebookEditor;
        if (!editor.hasModel() || editor.getLength() === 0) {
            return;
        }
        const lastIdx = editor.getLength() - 1;
        const lastVisibleIdx = editor.getPreviousVisibleCellIndex(lastIdx);
        if (lastVisibleIdx) {
            const cell = editor.cellAt(lastVisibleIdx);
            await editor.focusNotebookCell(cell, 'container');
        }
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: FOCUS_IN_OUTPUT_COMMAND_ID,
            title: localize('focusOutput', 'Focus In Active Cell Output'),
            keybinding: [
                {
                    when: ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK.negate(), IsWindowsContext),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                },
                {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */,
                    mac: { primary: 256 /* KeyMod.WinCtrl */ | 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */ },
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                },
            ],
            precondition: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_CELL_HAS_OUTPUTS),
        });
    }
    async runWithContext(accessor, context) {
        const editor = context.notebookEditor;
        const activeCell = context.cell;
        return timeout(0).then(() => editor.focusNotebookCell(activeCell, 'output'));
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: FOCUS_OUT_OUTPUT_COMMAND_ID,
            title: localize('focusOutputOut', 'Focus Out Active Cell Output'),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            precondition: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_OUTPUT_FOCUSED),
        });
    }
    async runWithContext(accessor, context) {
        const editor = context.notebookEditor;
        const activeCell = context.cell;
        await editor.focusNotebookCell(activeCell, 'editor');
    }
});
registerAction2(class CenterActiveCellAction extends NotebookCellAction {
    constructor() {
        super({
            id: CENTER_ACTIVE_CELL,
            title: localize('notebookActions.centerActiveCell', 'Center Active Cell'),
            keybinding: {
                when: NOTEBOOK_EDITOR_FOCUSED,
                primary: 2048 /* KeyMod.CtrlCmd */ | 42 /* KeyCode.KeyL */,
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 42 /* KeyCode.KeyL */,
                },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
        });
    }
    async runWithContext(accessor, context) {
        return context.notebookEditor.revealInCenter(context.cell);
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: NOTEBOOK_CURSOR_PAGEUP_COMMAND_ID,
            title: localize('cursorPageUp', 'Cell Cursor Page Up'),
            keybinding: [
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.has(InputFocusedContextKey), EditorContextKeys.editorTextFocus),
                    primary: 11 /* KeyCode.PageUp */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT,
                },
            ],
        });
    }
    async runWithContext(accessor, context) {
        EditorExtensionsRegistry.getEditorCommand('cursorPageUp').runCommand(accessor, {
            pageSize: getPageSize(context),
        });
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: NOTEBOOK_CURSOR_PAGEUP_SELECT_COMMAND_ID,
            title: localize('cursorPageUpSelect', 'Cell Cursor Page Up Select'),
            keybinding: [
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.has(InputFocusedContextKey), EditorContextKeys.editorTextFocus, NOTEBOOK_OUTPUT_FOCUSED.negate()),
                    primary: 1024 /* KeyMod.Shift */ | 11 /* KeyCode.PageUp */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT,
                },
            ],
        });
    }
    async runWithContext(accessor, context) {
        EditorExtensionsRegistry.getEditorCommand('cursorPageUpSelect').runCommand(accessor, {
            pageSize: getPageSize(context),
        });
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: NOTEBOOK_CURSOR_PAGEDOWN_COMMAND_ID,
            title: localize('cursorPageDown', 'Cell Cursor Page Down'),
            keybinding: [
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.has(InputFocusedContextKey), EditorContextKeys.editorTextFocus),
                    primary: 12 /* KeyCode.PageDown */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT,
                },
            ],
        });
    }
    async runWithContext(accessor, context) {
        EditorExtensionsRegistry.getEditorCommand('cursorPageDown').runCommand(accessor, {
            pageSize: getPageSize(context),
        });
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: NOTEBOOK_CURSOR_PAGEDOWN_SELECT_COMMAND_ID,
            title: localize('cursorPageDownSelect', 'Cell Cursor Page Down Select'),
            keybinding: [
                {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.has(InputFocusedContextKey), EditorContextKeys.editorTextFocus, NOTEBOOK_OUTPUT_FOCUSED.negate()),
                    primary: 1024 /* KeyMod.Shift */ | 12 /* KeyCode.PageDown */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT,
                },
            ],
        });
    }
    async runWithContext(accessor, context) {
        EditorExtensionsRegistry.getEditorCommand('cursorPageDownSelect').runCommand(accessor, {
            pageSize: getPageSize(context),
        });
    }
});
function getPageSize(context) {
    const editor = context.notebookEditor;
    const layoutInfo = editor.getViewModel().layoutInfo;
    const lineHeight = layoutInfo?.fontInfo.lineHeight || 17;
    return Math.max(1, Math.floor((layoutInfo?.height || 0) / lineHeight) - 2);
}
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    id: 'notebook',
    order: 100,
    type: 'object',
    properties: {
        'notebook.navigation.allowNavigateToSurroundingCells': {
            type: 'boolean',
            default: true,
            markdownDescription: localize('notebook.navigation.allowNavigateToSurroundingCells', 'When enabled cursor can navigate to the next/previous cell when the current cursor in the cell editor is at the first/last line.'),
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJyb3cuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvbmF2aWdhdGlvbi9hcnJvdy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFHaEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDL0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDeEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ25ELE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3JILE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDL0YsT0FBTyxFQUNOLFVBQVUsSUFBSSx1QkFBdUIsR0FFckMsTUFBTSwwRUFBMEUsQ0FBQTtBQUNqRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDM0YsT0FBTyxFQUNOLHNCQUFzQixFQUN0QixnQkFBZ0IsR0FDaEIsTUFBTSw2REFBNkQsQ0FBQTtBQUdwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDakYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDN0YsT0FBTyxFQUFFLHNDQUFzQyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDckcsT0FBTyxFQUdOLGNBQWMsRUFDZCxrQkFBa0IsRUFDbEIsb0NBQW9DLEVBQ3BDLG9CQUFvQixHQUNwQixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtB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