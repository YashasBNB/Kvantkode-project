/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { localize } from '../../../../../nls.js';
import { MenuId, MenuRegistry, registerAction2, } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { InputFocusedContext } from '../../../../../platform/contextkey/common/contextkeys.js';
import { insertCell } from './cellOperations.js';
import { NotebookAction } from './coreActions.js';
import { NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, } from '../../common/notebookContextKeys.js';
import { CellKind, NotebookSetting } from '../../common/notebookCommon.js';
import { CTX_NOTEBOOK_CHAT_OUTER_FOCUS_POSITION } from './chat/notebookChatContext.js';
import { INotebookKernelHistoryService } from '../../common/notebookKernelService.js';
const INSERT_CODE_CELL_ABOVE_COMMAND_ID = 'notebook.cell.insertCodeCellAbove';
const INSERT_CODE_CELL_BELOW_COMMAND_ID = 'notebook.cell.insertCodeCellBelow';
const INSERT_CODE_CELL_ABOVE_AND_FOCUS_CONTAINER_COMMAND_ID = 'notebook.cell.insertCodeCellAboveAndFocusContainer';
const INSERT_CODE_CELL_BELOW_AND_FOCUS_CONTAINER_COMMAND_ID = 'notebook.cell.insertCodeCellBelowAndFocusContainer';
const INSERT_CODE_CELL_AT_TOP_COMMAND_ID = 'notebook.cell.insertCodeCellAtTop';
const INSERT_MARKDOWN_CELL_ABOVE_COMMAND_ID = 'notebook.cell.insertMarkdownCellAbove';
const INSERT_MARKDOWN_CELL_BELOW_COMMAND_ID = 'notebook.cell.insertMarkdownCellBelow';
const INSERT_MARKDOWN_CELL_AT_TOP_COMMAND_ID = 'notebook.cell.insertMarkdownCellAtTop';
export function insertNewCell(accessor, context, kind, direction, focusEditor) {
    let newCell = null;
    if (context.ui) {
        context.notebookEditor.focus();
    }
    const languageService = accessor.get(ILanguageService);
    const kernelHistoryService = accessor.get(INotebookKernelHistoryService);
    if (context.cell) {
        const idx = context.notebookEditor.getCellIndex(context.cell);
        newCell = insertCell(languageService, context.notebookEditor, idx, kind, direction, undefined, true, kernelHistoryService);
    }
    else {
        const focusRange = context.notebookEditor.getFocus();
        const next = Math.max(focusRange.end - 1, 0);
        newCell = insertCell(languageService, context.notebookEditor, next, kind, direction, undefined, true, kernelHistoryService);
    }
    return newCell;
}
export class InsertCellCommand extends NotebookAction {
    constructor(desc, kind, direction, focusEditor) {
        super(desc);
        this.kind = kind;
        this.direction = direction;
        this.focusEditor = focusEditor;
    }
    async runWithContext(accessor, context) {
        const newCell = await insertNewCell(accessor, context, this.kind, this.direction, this.focusEditor);
        if (newCell) {
            await context.notebookEditor.focusNotebookCell(newCell, this.focusEditor ? 'editor' : 'container');
        }
    }
}
registerAction2(class InsertCodeCellAboveAction extends InsertCellCommand {
    constructor() {
        super({
            id: INSERT_CODE_CELL_ABOVE_COMMAND_ID,
            title: localize('notebookActions.insertCodeCellAbove', 'Insert Code Cell Above'),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, InputFocusedContext.toNegated()),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            menu: {
                id: MenuId.NotebookCellInsert,
                order: 0,
            },
        }, CellKind.Code, 'above', true);
    }
});
registerAction2(class InsertCodeCellAboveAndFocusContainerAction extends InsertCellCommand {
    constructor() {
        super({
            id: INSERT_CODE_CELL_ABOVE_AND_FOCUS_CONTAINER_COMMAND_ID,
            title: localize('notebookActions.insertCodeCellAboveAndFocusContainer', 'Insert Code Cell Above and Focus Container'),
        }, CellKind.Code, 'above', false);
    }
});
registerAction2(class InsertCodeCellBelowAction extends InsertCellCommand {
    constructor() {
        super({
            id: INSERT_CODE_CELL_BELOW_COMMAND_ID,
            title: localize('notebookActions.insertCodeCellBelow', 'Insert Code Cell Below'),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, InputFocusedContext.toNegated(), CTX_NOTEBOOK_CHAT_OUTER_FOCUS_POSITION.isEqualTo('')),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            menu: {
                id: MenuId.NotebookCellInsert,
                order: 1,
            },
        }, CellKind.Code, 'below', true);
    }
});
registerAction2(class InsertCodeCellBelowAndFocusContainerAction extends InsertCellCommand {
    constructor() {
        super({
            id: INSERT_CODE_CELL_BELOW_AND_FOCUS_CONTAINER_COMMAND_ID,
            title: localize('notebookActions.insertCodeCellBelowAndFocusContainer', 'Insert Code Cell Below and Focus Container'),
        }, CellKind.Code, 'below', false);
    }
});
registerAction2(class InsertMarkdownCellAboveAction extends InsertCellCommand {
    constructor() {
        super({
            id: INSERT_MARKDOWN_CELL_ABOVE_COMMAND_ID,
            title: localize('notebookActions.insertMarkdownCellAbove', 'Insert Markdown Cell Above'),
            menu: {
                id: MenuId.NotebookCellInsert,
                order: 2,
            },
        }, CellKind.Markup, 'above', true);
    }
});
registerAction2(class InsertMarkdownCellBelowAction extends InsertCellCommand {
    constructor() {
        super({
            id: INSERT_MARKDOWN_CELL_BELOW_COMMAND_ID,
            title: localize('notebookActions.insertMarkdownCellBelow', 'Insert Markdown Cell Below'),
            menu: {
                id: MenuId.NotebookCellInsert,
                order: 3,
            },
        }, CellKind.Markup, 'below', true);
    }
});
registerAction2(class InsertCodeCellAtTopAction extends NotebookAction {
    constructor() {
        super({
            id: INSERT_CODE_CELL_AT_TOP_COMMAND_ID,
            title: localize('notebookActions.insertCodeCellAtTop', 'Add Code Cell At Top'),
            f1: false,
        });
    }
    async run(accessor, context) {
        context = context ?? this.getEditorContextFromArgsOrActive(accessor);
        if (context) {
            this.runWithContext(accessor, context);
        }
    }
    async runWithContext(accessor, context) {
        const languageService = accessor.get(ILanguageService);
        const kernelHistoryService = accessor.get(INotebookKernelHistoryService);
        const newCell = insertCell(languageService, context.notebookEditor, 0, CellKind.Code, 'above', undefined, true, kernelHistoryService);
        if (newCell) {
            await context.notebookEditor.focusNotebookCell(newCell, 'editor');
        }
    }
});
registerAction2(class InsertMarkdownCellAtTopAction extends NotebookAction {
    constructor() {
        super({
            id: INSERT_MARKDOWN_CELL_AT_TOP_COMMAND_ID,
            title: localize('notebookActions.insertMarkdownCellAtTop', 'Add Markdown Cell At Top'),
            f1: false,
        });
    }
    async run(accessor, context) {
        context = context ?? this.getEditorContextFromArgsOrActive(accessor);
        if (context) {
            this.runWithContext(accessor, context);
        }
    }
    async runWithContext(accessor, context) {
        const languageService = accessor.get(ILanguageService);
        const kernelHistoryService = accessor.get(INotebookKernelHistoryService);
        const newCell = insertCell(languageService, context.notebookEditor, 0, CellKind.Markup, 'above', undefined, true, kernelHistoryService);
        if (newCell) {
            await context.notebookEditor.focusNotebookCell(newCell, 'editor');
        }
    }
});
MenuRegistry.appendMenuItem(MenuId.NotebookCellBetween, {
    command: {
        id: INSERT_CODE_CELL_BELOW_COMMAND_ID,
        title: '$(add) ' + localize('notebookActions.menu.insertCode', 'Code'),
        tooltip: localize('notebookActions.menu.insertCode.tooltip', 'Add Code Cell'),
    },
    order: 0,
    group: 'inline',
    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), ContextKeyExpr.notEquals('config.notebook.experimental.insertToolbarAlignment', 'left')),
});
MenuRegistry.appendMenuItem(MenuId.NotebookCellBetween, {
    command: {
        id: INSERT_CODE_CELL_BELOW_COMMAND_ID,
        title: localize('notebookActions.menu.insertCode.minimalToolbar', 'Add Code'),
        icon: Codicon.add,
        tooltip: localize('notebookActions.menu.insertCode.tooltip', 'Add Code Cell'),
    },
    order: 0,
    group: 'inline',
    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), ContextKeyExpr.equals('config.notebook.experimental.insertToolbarAlignment', 'left')),
});
MenuRegistry.appendMenuItem(MenuId.NotebookToolbar, {
    command: {
        id: INSERT_CODE_CELL_BELOW_COMMAND_ID,
        icon: Codicon.add,
        title: localize('notebookActions.menu.insertCode.ontoolbar', 'Code'),
        tooltip: localize('notebookActions.menu.insertCode.tooltip', 'Add Code Cell'),
    },
    order: -5,
    group: 'navigation/add',
    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), ContextKeyExpr.notEquals('config.notebook.insertToolbarLocation', 'betweenCells'), ContextKeyExpr.notEquals('config.notebook.insertToolbarLocation', 'hidden')),
});
MenuRegistry.appendMenuItem(MenuId.NotebookCellListTop, {
    command: {
        id: INSERT_CODE_CELL_AT_TOP_COMMAND_ID,
        title: '$(add) ' + localize('notebookActions.menu.insertCode', 'Code'),
        tooltip: localize('notebookActions.menu.insertCode.tooltip', 'Add Code Cell'),
    },
    order: 0,
    group: 'inline',
    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), ContextKeyExpr.notEquals('config.notebook.experimental.insertToolbarAlignment', 'left')),
});
MenuRegistry.appendMenuItem(MenuId.NotebookCellListTop, {
    command: {
        id: INSERT_CODE_CELL_AT_TOP_COMMAND_ID,
        title: localize('notebookActions.menu.insertCode.minimaltoolbar', 'Add Code'),
        icon: Codicon.add,
        tooltip: localize('notebookActions.menu.insertCode.tooltip', 'Add Code Cell'),
    },
    order: 0,
    group: 'inline',
    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), ContextKeyExpr.equals('config.notebook.experimental.insertToolbarAlignment', 'left')),
});
MenuRegistry.appendMenuItem(MenuId.NotebookCellBetween, {
    command: {
        id: INSERT_MARKDOWN_CELL_BELOW_COMMAND_ID,
        title: '$(add) ' + localize('notebookActions.menu.insertMarkdown', 'Markdown'),
        tooltip: localize('notebookActions.menu.insertMarkdown.tooltip', 'Add Markdown Cell'),
    },
    order: 1,
    group: 'inline',
    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), ContextKeyExpr.notEquals('config.notebook.experimental.insertToolbarAlignment', 'left')),
});
MenuRegistry.appendMenuItem(MenuId.NotebookToolbar, {
    command: {
        id: INSERT_MARKDOWN_CELL_BELOW_COMMAND_ID,
        icon: Codicon.add,
        title: localize('notebookActions.menu.insertMarkdown.ontoolbar', 'Markdown'),
        tooltip: localize('notebookActions.menu.insertMarkdown.tooltip', 'Add Markdown Cell'),
    },
    order: -5,
    group: 'navigation/add',
    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), ContextKeyExpr.notEquals('config.notebook.insertToolbarLocation', 'betweenCells'), ContextKeyExpr.notEquals('config.notebook.insertToolbarLocation', 'hidden'), ContextKeyExpr.notEquals(`config.${NotebookSetting.globalToolbarShowLabel}`, false), ContextKeyExpr.notEquals(`config.${NotebookSetting.globalToolbarShowLabel}`, 'never')),
});
MenuRegistry.appendMenuItem(MenuId.NotebookCellListTop, {
    command: {
        id: INSERT_MARKDOWN_CELL_AT_TOP_COMMAND_ID,
        title: '$(add) ' + localize('notebookActions.menu.insertMarkdown', 'Markdown'),
        tooltip: localize('notebookActions.menu.insertMarkdown.tooltip', 'Add Markdown Cell'),
    },
    order: 1,
    group: 'inline',
    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), ContextKeyExpr.notEquals('config.notebook.experimental.insertToolbarAlignment', 'left')),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zZXJ0Q2VsbEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyb2xsZXIvaW5zZXJ0Q2VsbEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRWhFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBRU4sTUFBTSxFQUNOLFlBQVksRUFDWixlQUFlLEdBQ2YsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDeEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFHOUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ2hELE9BQU8sRUFBMEIsY0FBYyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDekUsT0FBTyxFQUNOLDBCQUEwQixFQUMxQix3QkFBd0IsR0FDeEIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU1QyxPQUFPLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxzQ0FBc0MsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3RGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRXJGLE1BQU0saUNBQWlDLEdBQUcsbUNBQW1DLENBQUE7QUFDN0UsTUFBTSxpQ0FBaUMsR0FBRyxtQ0FBbUMsQ0FBQTtBQUM3RSxNQUFNLHFEQUFxRCxHQUMxRCxvREFBb0QsQ0FB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