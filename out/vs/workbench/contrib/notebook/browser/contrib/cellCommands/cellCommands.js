/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyChord } from '../../../../../../base/common/keyCodes.js';
import { Mimes } from '../../../../../../base/common/mime.js';
import { IBulkEditService, ResourceTextEdit, } from '../../../../../../editor/browser/services/bulkEditService.js';
import { localize, localize2 } from '../../../../../../nls.js';
import { MenuId, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { InputFocusedContext, InputFocusedContextKey, } from '../../../../../../platform/contextkey/common/contextkeys.js';
import { ResourceNotebookCellEdit } from '../../../../bulkEdit/browser/bulkCellEdits.js';
import { changeCellToKind, computeCellLinesContents, copyCellRange, joinCellsWithSurrounds, joinSelectedCells, moveCellRange, } from '../../controller/cellOperations.js';
import { cellExecutionArgs, CELL_TITLE_CELL_GROUP_ID, NotebookCellAction, NotebookMultiCellAction, parseMultiCellExecutionArgs, } from '../../controller/coreActions.js';
import { CellFocusMode, EXPAND_CELL_INPUT_COMMAND_ID, EXPAND_CELL_OUTPUT_COMMAND_ID, } from '../../notebookBrowser.js';
import { NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_CELL_INPUT_COLLAPSED, NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_OUTPUT_COLLAPSED, NOTEBOOK_CELL_TYPE, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_OUTPUT_FOCUSED, } from '../../../common/notebookContextKeys.js';
import * as icons from '../../notebookIcons.js';
import { CellKind, NotebookSetting } from '../../../common/notebookCommon.js';
import { INotificationService } from '../../../../../../platform/notification/common/notification.js';
import { EditorContextKeys } from '../../../../../../editor/common/editorContextKeys.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
//#region Move/Copy cells
const MOVE_CELL_UP_COMMAND_ID = 'notebook.cell.moveUp';
const MOVE_CELL_DOWN_COMMAND_ID = 'notebook.cell.moveDown';
const COPY_CELL_UP_COMMAND_ID = 'notebook.cell.copyUp';
const COPY_CELL_DOWN_COMMAND_ID = 'notebook.cell.copyDown';
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: MOVE_CELL_UP_COMMAND_ID,
            title: localize2('notebookActions.moveCellUp', 'Move Cell Up'),
            icon: icons.moveUpIcon,
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, InputFocusedContext.toNegated()),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.equals('config.notebook.dragAndDropEnabled', false),
                group: "3_edit" /* CellOverflowToolbarGroups.Edit */,
                order: 14,
            },
        });
    }
    async runWithContext(accessor, context) {
        return moveCellRange(context, 'up');
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: MOVE_CELL_DOWN_COMMAND_ID,
            title: localize2('notebookActions.moveCellDown', 'Move Cell Down'),
            icon: icons.moveDownIcon,
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, InputFocusedContext.toNegated()),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.equals('config.notebook.dragAndDropEnabled', false),
                group: "3_edit" /* CellOverflowToolbarGroups.Edit */,
                order: 14,
            },
        });
    }
    async runWithContext(accessor, context) {
        return moveCellRange(context, 'down');
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: COPY_CELL_UP_COMMAND_ID,
            title: localize2('notebookActions.copyCellUp', 'Copy Cell Up'),
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, InputFocusedContext.toNegated()),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
        });
    }
    async runWithContext(accessor, context) {
        return copyCellRange(context, 'up');
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: COPY_CELL_DOWN_COMMAND_ID,
            title: localize2('notebookActions.copyCellDown', 'Copy Cell Down'),
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, InputFocusedContext.toNegated()),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE),
                group: "3_edit" /* CellOverflowToolbarGroups.Edit */,
                order: 13,
            },
        });
    }
    async runWithContext(accessor, context) {
        return copyCellRange(context, 'down');
    }
});
//#endregion
//#region Join/Split
const SPLIT_CELL_COMMAND_ID = 'notebook.cell.split';
const JOIN_SELECTED_CELLS_COMMAND_ID = 'notebook.cell.joinSelected';
const JOIN_CELL_ABOVE_COMMAND_ID = 'notebook.cell.joinAbove';
const JOIN_CELL_BELOW_COMMAND_ID = 'notebook.cell.joinBelow';
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: SPLIT_CELL_COMMAND_ID,
            title: localize2('notebookActions.splitCell', 'Split Cell'),
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_INPUT_COLLAPSED.toNegated()),
                order: 5 /* CellToolbarOrder.SplitCell */,
                group: CELL_TITLE_CELL_GROUP_ID,
            },
            icon: icons.splitCellIcon,
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE, EditorContextKeys.editorTextFocus),
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 93 /* KeyCode.Backslash */),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
        });
    }
    async runWithContext(accessor, context) {
        if (context.notebookEditor.isReadOnly) {
            return;
        }
        const bulkEditService = accessor.get(IBulkEditService);
        const cell = context.cell;
        const index = context.notebookEditor.getCellIndex(cell);
        const splitPoints = cell.focusMode === CellFocusMode.Container
            ? [{ lineNumber: 1, column: 1 }]
            : cell.getSelectionsStartPosition();
        if (splitPoints && splitPoints.length > 0) {
            await cell.resolveTextModel();
            if (!cell.hasModel()) {
                return;
            }
            const newLinesContents = computeCellLinesContents(cell, splitPoints);
            if (newLinesContents) {
                const language = cell.language;
                const kind = cell.cellKind;
                const mime = cell.mime;
                const textModel = await cell.resolveTextModel();
                await bulkEditService.apply([
                    new ResourceTextEdit(cell.uri, {
                        range: textModel.getFullModelRange(),
                        text: newLinesContents[0],
                    }),
                    new ResourceNotebookCellEdit(context.notebookEditor.textModel.uri, {
                        editType: 1 /* CellEditType.Replace */,
                        index: index + 1,
                        count: 0,
                        cells: newLinesContents.slice(1).map((line) => ({
                            cellKind: kind,
                            language,
                            mime,
                            source: line,
                            outputs: [],
                            metadata: {},
                        })),
                    }),
                ], { quotableLabel: 'Split Notebook Cell' });
                context.notebookEditor
                    .cellAt(index + 1)
                    ?.updateEditState(cell.getEditState(), 'splitCell');
            }
        }
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: JOIN_CELL_ABOVE_COMMAND_ID,
            title: localize2('notebookActions.joinCellAbove', 'Join With Previous Cell'),
            keybinding: {
                when: NOTEBOOK_EDITOR_FOCUSED,
                primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 40 /* KeyCode.KeyJ */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE),
                group: "3_edit" /* CellOverflowToolbarGroups.Edit */,
                order: 10,
            },
        });
    }
    async runWithContext(accessor, context) {
        const bulkEditService = accessor.get(IBulkEditService);
        return joinCellsWithSurrounds(bulkEditService, context, 'above');
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: JOIN_CELL_BELOW_COMMAND_ID,
            title: localize2('notebookActions.joinCellBelow', 'Join With Next Cell'),
            keybinding: {
                when: NOTEBOOK_EDITOR_FOCUSED,
                primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 40 /* KeyCode.KeyJ */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE),
                group: "3_edit" /* CellOverflowToolbarGroups.Edit */,
                order: 11,
            },
        });
    }
    async runWithContext(accessor, context) {
        const bulkEditService = accessor.get(IBulkEditService);
        return joinCellsWithSurrounds(bulkEditService, context, 'below');
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: JOIN_SELECTED_CELLS_COMMAND_ID,
            title: localize2('notebookActions.joinSelectedCells', 'Join Selected Cells'),
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE),
                group: "3_edit" /* CellOverflowToolbarGroups.Edit */,
                order: 12,
            },
        });
    }
    async runWithContext(accessor, context) {
        const bulkEditService = accessor.get(IBulkEditService);
        const notificationService = accessor.get(INotificationService);
        return joinSelectedCells(bulkEditService, notificationService, context);
    }
});
//#endregion
//#region Change Cell Type
const CHANGE_CELL_TO_CODE_COMMAND_ID = 'notebook.cell.changeToCode';
const CHANGE_CELL_TO_MARKDOWN_COMMAND_ID = 'notebook.cell.changeToMarkdown';
registerAction2(class ChangeCellToCodeAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: CHANGE_CELL_TO_CODE_COMMAND_ID,
            title: localize2('notebookActions.changeCellToCode', 'Change Cell to Code'),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey), NOTEBOOK_OUTPUT_FOCUSED.toNegated()),
                primary: 55 /* KeyCode.KeyY */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            precondition: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_CELL_TYPE.isEqualTo('markup')),
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_TYPE.isEqualTo('markup')),
                group: "3_edit" /* CellOverflowToolbarGroups.Edit */,
            },
        });
    }
    async runWithContext(accessor, context) {
        await changeCellToKind(CellKind.Code, context);
    }
});
registerAction2(class ChangeCellToMarkdownAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: CHANGE_CELL_TO_MARKDOWN_COMMAND_ID,
            title: localize2('notebookActions.changeCellToMarkdown', 'Change Cell to Markdown'),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey), NOTEBOOK_OUTPUT_FOCUSED.toNegated()),
                primary: 43 /* KeyCode.KeyM */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            precondition: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_CELL_TYPE.isEqualTo('code')),
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE, NOTEBOOK_CELL_TYPE.isEqualTo('code')),
                group: "3_edit" /* CellOverflowToolbarGroups.Edit */,
            },
        });
    }
    async runWithContext(accessor, context) {
        await changeCellToKind(CellKind.Markup, context, 'markdown', Mimes.markdown);
    }
});
//#endregion
//#region Collapse Cell
const COLLAPSE_CELL_INPUT_COMMAND_ID = 'notebook.cell.collapseCellInput';
const COLLAPSE_CELL_OUTPUT_COMMAND_ID = 'notebook.cell.collapseCellOutput';
const COLLAPSE_ALL_CELL_INPUTS_COMMAND_ID = 'notebook.cell.collapseAllCellInputs';
const EXPAND_ALL_CELL_INPUTS_COMMAND_ID = 'notebook.cell.expandAllCellInputs';
const COLLAPSE_ALL_CELL_OUTPUTS_COMMAND_ID = 'notebook.cell.collapseAllCellOutputs';
const EXPAND_ALL_CELL_OUTPUTS_COMMAND_ID = 'notebook.cell.expandAllCellOutputs';
const TOGGLE_CELL_OUTPUTS_COMMAND_ID = 'notebook.cell.toggleOutputs';
const TOGGLE_CELL_OUTPUT_SCROLLING = 'notebook.cell.toggleOutputScrolling';
registerAction2(class CollapseCellInputAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: COLLAPSE_CELL_INPUT_COMMAND_ID,
            title: localize2('notebookActions.collapseCellInput', 'Collapse Cell Input'),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_INPUT_COLLAPSED.toNegated(), InputFocusedContext.toNegated()),
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
        });
    }
    parseArgs(accessor, ...args) {
        return parseMultiCellExecutionArgs(accessor, ...args);
    }
    async runWithContext(accessor, context) {
        if (context.ui) {
            context.cell.isInputCollapsed = true;
        }
        else {
            context.selectedCells.forEach((cell) => (cell.isInputCollapsed = true));
        }
    }
});
registerAction2(class ExpandCellInputAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: EXPAND_CELL_INPUT_COMMAND_ID,
            title: localize2('notebookActions.expandCellInput', 'Expand Cell Input'),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_INPUT_COLLAPSED),
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
        });
    }
    parseArgs(accessor, ...args) {
        return parseMultiCellExecutionArgs(accessor, ...args);
    }
    async runWithContext(accessor, context) {
        if (context.ui) {
            context.cell.isInputCollapsed = false;
        }
        else {
            context.selectedCells.forEach((cell) => (cell.isInputCollapsed = false));
        }
    }
});
registerAction2(class CollapseCellOutputAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: COLLAPSE_CELL_OUTPUT_COMMAND_ID,
            title: localize2('notebookActions.collapseCellOutput', 'Collapse Cell Output'),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_OUTPUT_COLLAPSED.toNegated(), InputFocusedContext.toNegated(), NOTEBOOK_CELL_HAS_OUTPUTS),
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 50 /* KeyCode.KeyT */),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
        });
    }
    async runWithContext(accessor, context) {
        if (context.ui) {
            context.cell.isOutputCollapsed = true;
        }
        else {
            context.selectedCells.forEach((cell) => (cell.isOutputCollapsed = true));
        }
    }
});
registerAction2(class ExpandCellOuputAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: EXPAND_CELL_OUTPUT_COMMAND_ID,
            title: localize2('notebookActions.expandCellOutput', 'Expand Cell Output'),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_CELL_OUTPUT_COLLAPSED),
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 50 /* KeyCode.KeyT */),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
        });
    }
    async runWithContext(accessor, context) {
        if (context.ui) {
            context.cell.isOutputCollapsed = false;
        }
        else {
            context.selectedCells.forEach((cell) => (cell.isOutputCollapsed = false));
        }
    }
});
registerAction2(class extends NotebookMultiCellAction {
    constructor() {
        super({
            id: TOGGLE_CELL_OUTPUTS_COMMAND_ID,
            precondition: NOTEBOOK_CELL_LIST_FOCUSED,
            title: localize2('notebookActions.toggleOutputs', 'Toggle Outputs'),
            metadata: {
                description: localize('notebookActions.toggleOutputs', 'Toggle Outputs'),
                args: cellExecutionArgs,
            },
        });
    }
    parseArgs(accessor, ...args) {
        return parseMultiCellExecutionArgs(accessor, ...args);
    }
    async runWithContext(accessor, context) {
        let cells = [];
        if (context.ui) {
            cells = [context.cell];
        }
        else if (context.selectedCells) {
            cells = context.selectedCells;
        }
        for (const cell of cells) {
            cell.isOutputCollapsed = !cell.isOutputCollapsed;
        }
    }
});
registerAction2(class CollapseAllCellInputsAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: COLLAPSE_ALL_CELL_INPUTS_COMMAND_ID,
            title: localize2('notebookActions.collapseAllCellInput', 'Collapse All Cell Inputs'),
            f1: true,
        });
    }
    async runWithContext(accessor, context) {
        forEachCell(context.notebookEditor, (cell) => (cell.isInputCollapsed = true));
    }
});
registerAction2(class ExpandAllCellInputsAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: EXPAND_ALL_CELL_INPUTS_COMMAND_ID,
            title: localize2('notebookActions.expandAllCellInput', 'Expand All Cell Inputs'),
            f1: true,
        });
    }
    async runWithContext(accessor, context) {
        forEachCell(context.notebookEditor, (cell) => (cell.isInputCollapsed = false));
    }
});
registerAction2(class CollapseAllCellOutputsAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: COLLAPSE_ALL_CELL_OUTPUTS_COMMAND_ID,
            title: localize2('notebookActions.collapseAllCellOutput', 'Collapse All Cell Outputs'),
            f1: true,
        });
    }
    async runWithContext(accessor, context) {
        forEachCell(context.notebookEditor, (cell) => (cell.isOutputCollapsed = true));
    }
});
registerAction2(class ExpandAllCellOutputsAction extends NotebookMultiCellAction {
    constructor() {
        super({
            id: EXPAND_ALL_CELL_OUTPUTS_COMMAND_ID,
            title: localize2('notebookActions.expandAllCellOutput', 'Expand All Cell Outputs'),
            f1: true,
        });
    }
    async runWithContext(accessor, context) {
        forEachCell(context.notebookEditor, (cell) => (cell.isOutputCollapsed = false));
    }
});
registerAction2(class ToggleCellOutputScrolling extends NotebookMultiCellAction {
    constructor() {
        super({
            id: TOGGLE_CELL_OUTPUT_SCROLLING,
            title: localize2('notebookActions.toggleScrolling', 'Toggle Scroll Cell Output'),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, InputFocusedContext.toNegated(), NOTEBOOK_CELL_HAS_OUTPUTS),
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 55 /* KeyCode.KeyY */),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
        });
    }
    toggleOutputScrolling(viewModel, globalScrollSetting, collapsed) {
        const cellMetadata = viewModel.model.metadata;
        // TODO: when is cellMetadata undefined? Is that a case we need to support? It is currently a read-only property.
        if (cellMetadata) {
            const currentlyEnabled = cellMetadata['scrollable'] !== undefined
                ? cellMetadata['scrollable']
                : globalScrollSetting;
            const shouldEnableScrolling = collapsed || !currentlyEnabled;
            cellMetadata['scrollable'] = shouldEnableScrolling;
            viewModel.resetRenderer();
        }
    }
    async runWithContext(accessor, context) {
        const globalScrolling = accessor
            .get(IConfigurationService)
            .getValue(NotebookSetting.outputScrolling);
        if (context.ui) {
            context.cell.outputsViewModels.forEach((viewModel) => {
                this.toggleOutputScrolling(viewModel, globalScrolling, context.cell.isOutputCollapsed);
            });
            context.cell.isOutputCollapsed = false;
        }
        else {
            context.selectedCells.forEach((cell) => {
                cell.outputsViewModels.forEach((viewModel) => {
                    this.toggleOutputScrolling(viewModel, globalScrolling, cell.isOutputCollapsed);
                });
                cell.isOutputCollapsed = false;
            });
        }
    }
});
//#endregion
function forEachCell(editor, callback) {
    for (let i = 0; i < editor.getLength(); i++) {
        const cell = editor.cellAt(i);
        callback(cell, i);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbENvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL2NlbGxDb21tYW5kcy9jZWxsQ29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNyRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDN0QsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixnQkFBZ0IsR0FDaEIsTUFBTSw4REFBOEQsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlELE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDOUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzNGLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsc0JBQXNCLEdBQ3RCLE1BQU0sNkRBQTZELENBQUE7QUFHcEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDeEYsT0FBTyxFQUNOLGdCQUFnQixFQUNoQix3QkFBd0IsRUFDeEIsYUFBYSxFQUNiLHNCQUFzQixFQUN0QixpQkFBaUIsRUFDakIsYUFBYSxHQUNiLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUNOLGlCQUFpQixFQUdqQix3QkFBd0IsRUFJeEIsa0JBQWtCLEVBQ2xCLHVCQUF1QixFQUN2QiwyQkFBMkIsR0FDM0IsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQ04sYUFBYSxFQUNiLDRCQUE0QixFQUM1Qiw2QkFBNkIsR0FJN0IsTUFBTSwwQkFBMEIsQ0FBQTtBQUNq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