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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0ZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyb2xsZXIvZXhlY3V0ZUFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFHbkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDckYsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sTUFBTSxFQUNOLFlBQVksRUFDWixlQUFlLEdBQ2YsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFHeEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzlELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6RSxPQUFPLEVBQ04sd0JBQXdCLEVBTXhCLG9DQUFvQyxFQUNwQyxjQUFjLEVBQ2Qsa0JBQWtCLEVBQ2xCLHVCQUF1QixFQUN2QixpQkFBaUIsRUFDakIsMEJBQTBCLEVBQzFCLGlCQUFpQixFQUNqQiwyQkFBMkIsR0FD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