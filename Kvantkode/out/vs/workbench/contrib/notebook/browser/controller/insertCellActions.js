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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zZXJ0Q2VsbEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJvbGxlci9pbnNlcnRDZWxsQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFaEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDckYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFFTixNQUFNLEVBQ04sWUFBWSxFQUNaLGVBQWUsR0FDZixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUc5RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDaEQsT0FBTyxFQUEwQixjQUFjLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUN6RSxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLHdCQUF3QixHQUN4QixNQUFNLHFDQUFxQyxDQUFBO0FBRTVDLE9BQU8sRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDMUUsT0FBTyxFQUFFLHNDQUFzQyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdEYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFckYsTUFBTSxpQ0FBaUMsR0FBRyxtQ0FBbUMsQ0FBQTtBQUM3RSxNQUFNLGlDQUFpQyxHQUFHLG1DQUFtQyxDQUFBO0FBQzdFLE1BQU0s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