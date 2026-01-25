/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Iterable } from '../../../../../base/common/iterator.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { localize, localize2 } from '../../../../../nls.js';
import { MenuId, MenuRegistry, registerAction2, } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDebugService } from '../../../debug/common/debug.js';
import { CTX_INLINE_CHAT_FOCUSED } from '../../../inlineChat/common/inlineChat.js';
import { insertCell } from './cellOperations.js';
import { NotebookChatController } from './chat/notebookChatController.js';
import { CELL_TITLE_CELL_GROUP_ID, NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT, NotebookAction, NotebookCellAction, NotebookMultiCellAction, cellExecutionArgs, getContextFromActiveEditor, getContextFromUri, parseMultiCellExecutionArgs, } from './coreActions.js';
import { CellEditState, CellFocusMode, EXECUTE_CELL_COMMAND_ID, ScrollToRevealBehavior, } from '../notebookBrowser.js';
import * as icons from '../notebookIcons.js';
import { CellKind, CellUri, NotebookSetting } from '../../common/notebookCommon.js';
import { NOTEBOOK_CELL_EXECUTING, NOTEBOOK_CELL_EXECUTION_STATE, NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_TYPE, NOTEBOOK_HAS_RUNNING_CELL, NOTEBOOK_HAS_SOMETHING_RUNNING, NOTEBOOK_INTERRUPTIBLE_KERNEL, NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_KERNEL_COUNT, NOTEBOOK_KERNEL_SOURCE_COUNT, NOTEBOOK_LAST_CELL_FAILED, NOTEBOOK_MISSING_KERNEL_EXTENSION, } from '../../common/notebookContextKeys.js';
import { NotebookEditorInput } from '../../common/notebookEditorInput.js';
import { INotebookExecutionStateService } from '../../common/notebookExecutionStateService.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
const EXECUTE_NOTEBOOK_COMMAND_ID = 'notebook.execute';
const CANCEL_NOTEBOOK_COMMAND_ID = 'notebook.cancelExecution';
const INTERRUPT_NOTEBOOK_COMMAND_ID = 'notebook.interruptExecution';
const CANCEL_CELL_COMMAND_ID = 'notebook.cell.cancelExecution';
const EXECUTE_CELL_FOCUS_CONTAINER_COMMAND_ID = 'notebook.cell.executeAndFocusContainer';
const EXECUTE_CELL_SELECT_BELOW = 'notebook.cell.executeAndSelectBelow';
const EXECUTE_CELL_INSERT_BELOW = 'notebook.cell.executeAndInsertBelow';
const EXECUTE_CELL_AND_BELOW = 'notebook.cell.executeCellAndBelow';
const EXECUTE_CELLS_ABOVE = 'notebook.cell.executeCellsAbove';
const RENDER_ALL_MARKDOWN_CELLS = 'notebook.renderAllMarkdownCells';
const REVEAL_RUNNING_CELL = 'notebook.revealRunningCell';
const REVEAL_LAST_FAILED_CELL = 'notebook.revealLastFailedCell';
// If this changes, update getCodeCellExecutionContextKeyService to match
export const executeCondition = ContextKeyExpr.and(NOTEBOOK_CELL_TYPE.isEqualTo('code'), ContextKeyExpr.or(ContextKeyExpr.greater(NOTEBOOK_KERNEL_COUNT.key, 0), ContextKeyExpr.greater(NOTEBOOK_KERNEL_SOURCE_COUNT.key, 0), NOTEBOOK_MISSING_KERNEL_EXTENSION));
export const executeThisCellCondition = ContextKeyExpr.and(executeCondition, NOTEBOOK_CELL_EXECUTING.toNegated());
export const executeSectionCondition = ContextKeyExpr.and(NOTEBOOK_CELL_TYPE.isEqualTo('markup'));
function renderAllMarkdownCells(context) {
    for (let i = 0; i < context.notebookEditor.getLength(); i++) {
        const cell = context.notebookEditor.cellAt(i);
        if (cell.cellKind === CellKind.Markup) {
            cell.updateEditState(CellEditState.Preview, 'renderAllMarkdownCells');
        }
    }
}
async function runCell(editorGroupsService, context) {
    const group = editorGroupsService.activeGroup;
    if (group) {
        if (group.activeEditor) {
            group.pinEditor(group.activeEditor);
        }
    }
    if (context.ui && context.cell) {
        await context.notebookEditor.executeNotebookCells(Iterable.single(context.cell));
        if (context.autoReveal) {
            const cellIndex = context.notebookEditor.getCellIndex(context.cell);
            context.notebookEditor.revealCellRangeInView({ start: cellIndex, end: cellIndex + 1 });
        }
    }
    else if (context.selectedCells?.length || context.cell) {
        const selectedCells = context.selectedCells?.length ? context.selectedCells : [context.cell];
        await context.notebookEditor.executeNotebookCells(selectedCells);
        const firstCell = selectedCells[0];
        if (firstCell && context.autoReveal) {
            const cellIndex = context.notebookEditor.getCellIndex(firstCell);
            context.notebookEditor.revealCellRangeInView({ start: cellIndex, end: cellIndex + 1 });
        }
    }
    let foundEditor = undefined;
    for (const [, codeEditor] of context.notebookEditor.codeEditors) {
        if (isEqual(codeEditor.getModel()?.uri, (context.cell ?? context.selectedCells?.[0])?.uri)) {
            foundEditor = codeEditor;
            break;
        }
    }
    if (!foundEditor) {
        return;
    }
}
registerAction2(class RenderAllMarkdownCellsAction extends NotebookAction {
    constructor() {
        super({
            id: RENDER_ALL_MARKDOWN_CELLS,
            title: localize('notebookActions.renderMarkdown', 'Render All Markdown Cells'),
        });
    }
    async runWithContext(accessor, context) {
        renderAllMarkdownCells(context);
    }
});
registerAction2(class ExecuteNotebookAction extends NotebookAction {
    constructor() {
        super({
            id: EXECUTE_NOTEBOOK_COMMAND_ID,
            title: localize('notebookActions.executeNotebook', 'Run All'),
            icon: icons.executeAllIcon,
            metadata: {
                description: localize('notebookActions.executeNotebook', 'Run All'),
                args: [
                    {
                        name: 'uri',
                        description: 'The document uri',
                    },
                ],
            },
            menu: [
                {
                    id: MenuId.EditorTitle,
                    order: -1,
                    group: 'navigation',
                    when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, ContextKeyExpr.or(NOTEBOOK_INTERRUPTIBLE_KERNEL.toNegated(), NOTEBOOK_HAS_SOMETHING_RUNNING.toNegated()), ContextKeyExpr.notEquals('config.notebook.globalToolbar', true)),
                },
                {
                    id: MenuId.NotebookToolbar,
                    order: -1,
                    group: 'navigation/execute',
                    when: ContextKeyExpr.and(ContextKeyExpr.or(NOTEBOOK_INTERRUPTIBLE_KERNEL.toNegated(), NOTEBOOK_HAS_SOMETHING_RUNNING.toNegated()), ContextKeyExpr.and(NOTEBOOK_HAS_SOMETHING_RUNNING, NOTEBOOK_INTERRUPTIBLE_KERNEL.toNegated())?.negate(), ContextKeyExpr.equals('config.notebook.globalToolbar', true)),
                },
            ],
        });
    }
    getEditorContextFromArgsOrActive(accessor, context) {
        return (getContextFromUri(accessor, context) ??
            getContextFromActiveEditor(accessor.get(IEditorService)));
    }
    async runWithContext(accessor, context) {
        renderAllMarkdownCells(context);
        const editorService = accessor.get(IEditorService);
        const editor = editorService
            .getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)
            .find((editor) => editor.editor instanceof NotebookEditorInput &&
            editor.editor.viewType === context.notebookEditor.textModel.viewType &&
            editor.editor.resource.toString() === context.notebookEditor.textModel.uri.toString());
        const editorGroupService = accessor.get(IEditorGroupsService);
        if (editor) {
            const group = editorGroupService.getGroup(editor.groupId);
            group?.pinEditor(editor.editor);
        }
        return context.notebookEditor.executeNotebookCells();
    }
});
registerAction2(class ExecuteCell extends NotebookMultiCellAction {
    constructor() {
        super({
            id: EXECUTE_CELL_COMMAND_ID,
            precondition: executeThisCellCondition,
            title: localize('notebookActions.execute', 'Execute Cell'),
            keybinding: {
                when: NOTEBOOK_CELL_LIST_FOCUSED,
                primary: 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */,
                win: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */,
                },
                weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT,
            },
            menu: {
                id: MenuId.NotebookCellExecutePrimary,
                when: executeThisCellCondition,
                group: 'inline',
            },
            metadata: {
                description: localize('notebookActions.execute', 'Execute Cell'),
                args: cellExecutionArgs,
            },
            icon: icons.executeIcon,
        });
    }
    parseArgs(accessor, ...args) {
        return parseMultiCellExecutionArgs(accessor, ...args);
    }
    async runWithContext(accessor, context) {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        if (context.ui) {
            await context.notebookEditor.focusNotebookCell(context.cell, 'container', {
                skipReveal: true,
            });
        }
        const chatController = NotebookChatController.get(context.notebookEditor);
        const editingCell = chatController?.getEditingCell();
        if (chatController?.hasFocus() && editingCell) {
            const group = editorGroupsService.activeGroup;
            if (group) {
                if (group.activeEditor) {
                    group.pinEditor(group.activeEditor);
                }
            }
            await context.notebookEditor.executeNotebookCells([editingCell]);
            return;
        }
        await runCell(editorGroupsService, context);
    }
});
registerAction2(class ExecuteAboveCells extends NotebookMultiCellAction {
    constructor() {
        super({
            id: EXECUTE_CELLS_ABOVE,
            precondition: executeCondition,
            title: localize('notebookActions.executeAbove', 'Execute Above Cells'),
            menu: [
                {
                    id: MenuId.NotebookCellExecute,
                    when: ContextKeyExpr.and(executeCondition, ContextKeyExpr.equals(`config.${NotebookSetting.consolidatedRunButton}`, true)),
                },
                {
                    id: MenuId.NotebookCellTitle,
                    order: 2 /* CellToolbarOrder.ExecuteAboveCells */,
                    group: CELL_TITLE_CELL_GROUP_ID,
                    when: ContextKeyExpr.and(executeCondition, ContextKeyExpr.equals(`config.${NotebookSetting.consolidatedRunButton}`, false)),
                },
            ],
            icon: icons.executeAboveIcon,
        });
    }
    parseArgs(accessor, ...args) {
        return parseMultiCellExecutionArgs(accessor, ...args);
    }
    async runWithContext(accessor, context) {
        let endCellIdx = undefined;
        if (context.ui) {
            endCellIdx = context.notebookEditor.getCellIndex(context.cell);
            await context.notebookEditor.focusNotebookCell(context.cell, 'container', {
                skipReveal: true,
            });
        }
        else {
            endCellIdx = Math.min(...context.selectedCells.map((cell) => context.notebookEditor.getCellIndex(cell)));
        }
        if (typeof endCellIdx === 'number') {
            const range = { start: 0, end: endCellIdx };
            const cells = context.notebookEditor.getCellsInRange(range);
            context.notebookEditor.executeNotebookCells(cells);
        }
    }
});
registerAction2(class ExecuteCellAndBelow extends NotebookMultiCellAction {
    constructor() {
        super({
            id: EXECUTE_CELL_AND_BELOW,
            precondition: executeCondition,
            title: localize('notebookActions.executeBelow', 'Execute Cell and Below'),
            menu: [
                {
                    id: MenuId.NotebookCellExecute,
                    when: ContextKeyExpr.and(executeCondition, ContextKeyExpr.equals(`config.${NotebookSetting.consolidatedRunButton}`, true)),
                },
                {
                    id: MenuId.NotebookCellTitle,
                    order: 3 /* CellToolbarOrder.ExecuteCellAndBelow */,
                    group: CELL_TITLE_CELL_GROUP_ID,
                    when: ContextKeyExpr.and(executeCondition, ContextKeyExpr.equals(`config.${NotebookSetting.consolidatedRunButton}`, false)),
                },
            ],
            icon: icons.executeBelowIcon,
        });
    }
    parseArgs(accessor, ...args) {
        return parseMultiCellExecutionArgs(accessor, ...args);
    }
    async runWithContext(accessor, context) {
        let startCellIdx = undefined;
        if (context.ui) {
            startCellIdx = context.notebookEditor.getCellIndex(context.cell);
            await context.notebookEditor.focusNotebookCell(context.cell, 'container', {
                skipReveal: true,
            });
        }
        else {
            startCellIdx = Math.min(...context.selectedCells.map((cell) => context.notebookEditor.getCellIndex(cell)));
        }
        if (typeof startCellIdx === 'number') {
            const range = { start: startCellIdx, end: context.notebookEditor.getLength() };
            const cells = context.notebookEditor.getCellsInRange(range);
            context.notebookEditor.executeNotebookCells(cells);
        }
    }
});
registerAction2(class ExecuteCellFocusContainer extends NotebookMultiCellAction {
    constructor() {
        super({
            id: EXECUTE_CELL_FOCUS_CONTAINER_COMMAND_ID,
            precondition: executeThisCellCondition,
            title: localize('notebookActions.executeAndFocusContainer', 'Execute Cell and Focus Container'),
            metadata: {
                description: localize('notebookActions.executeAndFocusContainer', 'Execute Cell and Focus Container'),
                args: cellExecutionArgs,
            },
            icon: icons.executeIcon,
        });
    }
    parseArgs(accessor, ...args) {
        return parseMultiCellExecutionArgs(accessor, ...args);
    }
    async runWithContext(accessor, context) {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        if (context.ui) {
            await context.notebookEditor.focusNotebookCell(context.cell, 'container', {
                skipReveal: true,
            });
        }
        else {
            const firstCell = context.selectedCells[0];
            if (firstCell) {
                await context.notebookEditor.focusNotebookCell(firstCell, 'container', {
                    skipReveal: true,
                });
            }
        }
        await runCell(editorGroupsService, context);
    }
});
const cellCancelCondition = ContextKeyExpr.or(ContextKeyExpr.equals(NOTEBOOK_CELL_EXECUTION_STATE.key, 'executing'), ContextKeyExpr.equals(NOTEBOOK_CELL_EXECUTION_STATE.key, 'pending'));
registerAction2(class CancelExecuteCell extends NotebookMultiCellAction {
    constructor() {
        super({
            id: CANCEL_CELL_COMMAND_ID,
            precondition: cellCancelCondition,
            title: localize('notebookActions.cancel', 'Stop Cell Execution'),
            icon: icons.stopIcon,
            menu: {
                id: MenuId.NotebookCellExecutePrimary,
                when: cellCancelCondition,
                group: 'inline',
            },
            metadata: {
                description: localize('notebookActions.cancel', 'Stop Cell Execution'),
                args: [
                    {
                        name: 'options',
                        description: 'The cell range options',
                        schema: {
                            type: 'object',
                            required: ['ranges'],
                            properties: {
                                ranges: {
                                    type: 'array',
                                    items: [
                                        {
                                            type: 'object',
                                            required: ['start', 'end'],
                                            properties: {
                                                start: {
                                                    type: 'number',
                                                },
                                                end: {
                                                    type: 'number',
                                                },
                                            },
                                        },
                                    ],
                                },
                                document: {
                                    type: 'object',
                                    description: 'The document uri',
                                },
                            },
                        },
                    },
                ],
            },
        });
    }
    parseArgs(accessor, ...args) {
        return parseMultiCellExecutionArgs(accessor, ...args);
    }
    async runWithContext(accessor, context) {
        if (context.ui) {
            await context.notebookEditor.focusNotebookCell(context.cell, 'container', {
                skipReveal: true,
            });
            return context.notebookEditor.cancelNotebookCells(Iterable.single(context.cell));
        }
        else {
            return context.notebookEditor.cancelNotebookCells(context.selectedCells);
        }
    }
});
registerAction2(class ExecuteCellSelectBelow extends NotebookCellAction {
    constructor() {
        super({
            id: EXECUTE_CELL_SELECT_BELOW,
            precondition: ContextKeyExpr.or(executeThisCellCondition, NOTEBOOK_CELL_TYPE.isEqualTo('markup')),
            title: localize('notebookActions.executeAndSelectBelow', 'Execute Notebook Cell and Select Below'),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, CTX_INLINE_CHAT_FOCUSED.negate()),
                primary: 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT,
            },
        });
    }
    async runWithContext(accessor, context) {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const idx = context.notebookEditor.getCellIndex(context.cell);
        if (typeof idx !== 'number') {
            return;
        }
        const languageService = accessor.get(ILanguageService);
        const config = accessor.get(IConfigurationService);
        const scrollBehavior = config.getValue(NotebookSetting.scrollToRevealCell);
        let focusOptions;
        if (scrollBehavior === 'none') {
            focusOptions = { skipReveal: true };
        }
        else {
            focusOptions = {
                revealBehavior: scrollBehavior === 'fullCell'
                    ? ScrollToRevealBehavior.fullCell
                    : ScrollToRevealBehavior.firstLine,
            };
        }
        if (context.cell.cellKind === CellKind.Markup) {
            const nextCell = context.notebookEditor.cellAt(idx + 1);
            context.cell.updateEditState(CellEditState.Preview, EXECUTE_CELL_SELECT_BELOW);
            if (nextCell) {
                await context.notebookEditor.focusNotebookCell(nextCell, 'container', focusOptions);
            }
            else {
                const newCell = insertCell(languageService, context.notebookEditor, idx, CellKind.Markup, 'below');
                if (newCell) {
                    await context.notebookEditor.focusNotebookCell(newCell, 'editor', focusOptions);
                }
            }
            return;
        }
        else {
            const nextCell = context.notebookEditor.cellAt(idx + 1);
            if (nextCell) {
                await context.notebookEditor.focusNotebookCell(nextCell, 'container', focusOptions);
            }
            else {
                const newCell = insertCell(languageService, context.notebookEditor, idx, CellKind.Code, 'below');
                if (newCell) {
                    await context.notebookEditor.focusNotebookCell(newCell, 'editor', focusOptions);
                }
            }
            return runCell(editorGroupsService, context);
        }
    }
});
registerAction2(class ExecuteCellInsertBelow extends NotebookCellAction {
    constructor() {
        super({
            id: EXECUTE_CELL_INSERT_BELOW,
            precondition: ContextKeyExpr.or(executeThisCellCondition, NOTEBOOK_CELL_TYPE.isEqualTo('markup')),
            title: localize('notebookActions.executeAndInsertBelow', 'Execute Notebook Cell and Insert Below'),
            keybinding: {
                when: NOTEBOOK_CELL_LIST_FOCUSED,
                primary: 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */,
                weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT,
            },
        });
    }
    async runWithContext(accessor, context) {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const idx = context.notebookEditor.getCellIndex(context.cell);
        const languageService = accessor.get(ILanguageService);
        const newFocusMode = context.cell.focusMode === CellFocusMode.Editor ? 'editor' : 'container';
        const newCell = insertCell(languageService, context.notebookEditor, idx, context.cell.cellKind, 'below');
        if (newCell) {
            await context.notebookEditor.focusNotebookCell(newCell, newFocusMode);
        }
        if (context.cell.cellKind === CellKind.Markup) {
            context.cell.updateEditState(CellEditState.Preview, EXECUTE_CELL_INSERT_BELOW);
        }
        else {
            runCell(editorGroupsService, context);
        }
    }
});
class CancelNotebook extends NotebookAction {
    getEditorContextFromArgsOrActive(accessor, context) {
        return (getContextFromUri(accessor, context) ??
            getContextFromActiveEditor(accessor.get(IEditorService)));
    }
    async runWithContext(accessor, context) {
        return context.notebookEditor.cancelNotebookCells();
    }
}
registerAction2(class CancelAllNotebook extends CancelNotebook {
    constructor() {
        super({
            id: CANCEL_NOTEBOOK_COMMAND_ID,
            title: localize2('notebookActions.cancelNotebook', 'Stop Execution'),
            icon: icons.stopIcon,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    order: -1,
                    group: 'navigation',
                    when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_HAS_SOMETHING_RUNNING, NOTEBOOK_INTERRUPTIBLE_KERNEL.toNegated(), ContextKeyExpr.notEquals('config.notebook.globalToolbar', true)),
                },
                {
                    id: MenuId.NotebookToolbar,
                    order: -1,
                    group: 'navigation/execute',
                    when: ContextKeyExpr.and(NOTEBOOK_HAS_SOMETHING_RUNNING, NOTEBOOK_INTERRUPTIBLE_KERNEL.toNegated(), ContextKeyExpr.equals('config.notebook.globalToolbar', true)),
                },
            ],
        });
    }
});
registerAction2(class InterruptNotebook extends CancelNotebook {
    constructor() {
        super({
            id: INTERRUPT_NOTEBOOK_COMMAND_ID,
            title: localize2('notebookActions.interruptNotebook', 'Interrupt'),
            precondition: ContextKeyExpr.and(NOTEBOOK_HAS_SOMETHING_RUNNING, NOTEBOOK_INTERRUPTIBLE_KERNEL),
            icon: icons.stopIcon,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    order: -1,
                    group: 'navigation',
                    when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_HAS_SOMETHING_RUNNING, NOTEBOOK_INTERRUPTIBLE_KERNEL, ContextKeyExpr.notEquals('config.notebook.globalToolbar', true)),
                },
                {
                    id: MenuId.NotebookToolbar,
                    order: -1,
                    group: 'navigation/execute',
                    when: ContextKeyExpr.and(NOTEBOOK_HAS_SOMETHING_RUNNING, NOTEBOOK_INTERRUPTIBLE_KERNEL, ContextKeyExpr.equals('config.notebook.globalToolbar', true)),
                },
                {
                    id: MenuId.InteractiveToolbar,
                    group: 'navigation/execute',
                },
            ],
        });
    }
});
MenuRegistry.appendMenuItem(MenuId.NotebookToolbar, {
    title: localize('revealRunningCellShort', 'Go To'),
    submenu: MenuId.NotebookCellExecuteGoTo,
    group: 'navigation/execute',
    order: 20,
    icon: ThemeIcon.modify(icons.executingStateIcon, 'spin'),
});
registerAction2(class RevealRunningCellAction extends NotebookAction {
    constructor() {
        super({
            id: REVEAL_RUNNING_CELL,
            title: localize('revealRunningCell', 'Go to Running Cell'),
            tooltip: localize('revealRunningCell', 'Go to Running Cell'),
            shortTitle: localize('revealRunningCell', 'Go to Running Cell'),
            precondition: NOTEBOOK_HAS_RUNNING_CELL,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_HAS_RUNNING_CELL, ContextKeyExpr.notEquals('config.notebook.globalToolbar', true)),
                    group: 'navigation',
                    order: 0,
                },
                {
                    id: MenuId.NotebookCellExecuteGoTo,
                    when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_HAS_RUNNING_CELL, ContextKeyExpr.equals('config.notebook.globalToolbar', true)),
                    group: 'navigation/execute',
                    order: 20,
                },
                {
                    id: MenuId.InteractiveToolbar,
                    when: ContextKeyExpr.and(NOTEBOOK_HAS_RUNNING_CELL, ContextKeyExpr.equals('activeEditor', 'workbench.editor.interactive')),
                    group: 'navigation',
                    order: 10,
                },
            ],
            icon: ThemeIcon.modify(icons.executingStateIcon, 'spin'),
        });
    }
    async runWithContext(accessor, context) {
        const notebookExecutionStateService = accessor.get(INotebookExecutionStateService);
        const notebook = context.notebookEditor.textModel.uri;
        const executingCells = notebookExecutionStateService.getCellExecutionsForNotebook(notebook);
        if (executingCells[0]) {
            const topStackFrameCell = this.findCellAtTopFrame(accessor, notebook);
            const focusHandle = topStackFrameCell ?? executingCells[0].cellHandle;
            const cell = context.notebookEditor.getCellByHandle(focusHandle);
            if (cell) {
                context.notebookEditor.focusNotebookCell(cell, 'container');
            }
        }
    }
    findCellAtTopFrame(accessor, notebook) {
        const debugService = accessor.get(IDebugService);
        for (const session of debugService.getModel().getSessions()) {
            for (const thread of session.getAllThreads()) {
                const sf = thread.getTopStackFrame();
                if (sf) {
                    const parsed = CellUri.parse(sf.source.uri);
                    if (parsed && parsed.notebook.toString() === notebook.toString()) {
                        return parsed.handle;
                    }
                }
            }
        }
        return undefined;
    }
});
registerAction2(class RevealLastFailedCellAction extends NotebookAction {
    constructor() {
        super({
            id: REVEAL_LAST_FAILED_CELL,
            title: localize('revealLastFailedCell', 'Go to Most Recently Failed Cell'),
            tooltip: localize('revealLastFailedCell', 'Go to Most Recently Failed Cell'),
            shortTitle: localize('revealLastFailedCellShort', 'Go to Most Recently Failed Cell'),
            precondition: NOTEBOOK_LAST_CELL_FAILED,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_LAST_CELL_FAILED, NOTEBOOK_HAS_RUNNING_CELL.toNegated(), ContextKeyExpr.notEquals('config.notebook.globalToolbar', true)),
                    group: 'navigation',
                    order: 0,
                },
                {
                    id: MenuId.NotebookCellExecuteGoTo,
                    when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_LAST_CELL_FAILED, NOTEBOOK_HAS_RUNNING_CELL.toNegated(), ContextKeyExpr.equals('config.notebook.globalToolbar', true)),
                    group: 'navigation/execute',
                    order: 20,
                },
            ],
            icon: icons.errorStateIcon,
        });
    }
    async runWithContext(accessor, context) {
        const notebookExecutionStateService = accessor.get(INotebookExecutionStateService);
        const notebook = context.notebookEditor.textModel.uri;
        const lastFailedCellHandle = notebookExecutionStateService.getLastFailedCellForNotebook(notebook);
        if (lastFailedCellHandle !== undefined) {
            const lastFailedCell = context.notebookEditor.getCellByHandle(lastFailedCellHandle);
            if (lastFailedCell) {
                context.notebookEditor.focusNotebookCell(lastFailedCell, 'container');
            }
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0ZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJvbGxlci9leGVjdXRlQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUduRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNELE9BQU8sRUFDTixNQUFNLEVBQ04sWUFBWSxFQUNaLGVBQWUsR0FDZixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUd4RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDOUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ2hELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pFLE9BQU8sRUFDTix3QkFBd0IsRUFNeEIsb0NBQW9DLEVBQ3BDLGNBQWMsRUFDZCxrQkFBa0IsRUFDbEIsdUJBQXVCLEVBQ3ZCLGlCQUFpQixFQUNqQiwwQkFBMEIsRUFDMUIsaUJBQWlCLEVBQ2pCLDJCQUEy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