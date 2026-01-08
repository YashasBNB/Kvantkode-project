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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJyb3cuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9uYXZpZ2F0aW9uL2Fycm93LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUdoRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUMvRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN4RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbkQsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDckgsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUMvRixPQUFPLEVBQ04sVUFBVSxJQUFJLHVCQUF1QixHQUVyQyxNQUFNLDBFQUEwRSxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUMzRixPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLGdCQUFnQixHQUNoQixNQUFNLDZEQUE2RCxDQUFBO0FBR3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsc0NBQXNDLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRyxPQUFPLEVBR04sY0FBYyxFQUNkLGtCQUFrQixFQUNsQixvQ0FBb0MsRUFDcEMsb0JBQW9CLEdBQ3BCLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBCQUEwQixD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