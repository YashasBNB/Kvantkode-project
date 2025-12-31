/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { localize, localize2 } from '../../../../../../nls.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { registerWorkbenchContribution2, } from '../../../../../common/contributions.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { NOTEBOOK_CELL_EDITABLE, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_OUTPUT_FOCUSED, } from '../../../common/notebookContextKeys.js';
import { cellRangeToViewCells, expandCellRangesWithHiddenCells, getNotebookEditorFromEditorPane, } from '../../notebookBrowser.js';
import { CopyAction, CutAction, PasteAction, } from '../../../../../../editor/contrib/clipboard/browser/clipboard.js';
import { IClipboardService } from '../../../../../../platform/clipboard/common/clipboardService.js';
import { cloneNotebookCellTextModel, } from '../../../common/model/notebookCellTextModel.js';
import { SelectionStateType, } from '../../../common/notebookCommon.js';
import { INotebookService } from '../../../common/notebookService.js';
import * as platform from '../../../../../../base/common/platform.js';
import { Action2, MenuId, registerAction2, } from '../../../../../../platform/actions/common/actions.js';
import { NotebookAction, NotebookCellAction, NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT, NOTEBOOK_OUTPUT_WEBVIEW_ACTION_WEIGHT, } from '../../controller/coreActions.js';
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { InputFocusedContextKey } from '../../../../../../platform/contextkey/common/contextkeys.js';
import { RedoCommand, UndoCommand } from '../../../../../../editor/browser/editorExtensions.js';
import { Categories } from '../../../../../../platform/action/common/actionCommonCategories.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { showWindowLogActionId } from '../../../../../services/log/common/logConstants.js';
import { getActiveElement, getWindow, isAncestor, isEditableElement, isHTMLElement, } from '../../../../../../base/browser/dom.js';
let _logging = false;
function toggleLogging() {
    _logging = !_logging;
}
function _log(loggerService, str) {
    if (_logging) {
        loggerService.info(`[NotebookClipboard]: ${str}`);
    }
}
function getFocusedEditor(accessor) {
    const loggerService = accessor.get(ILogService);
    const editorService = accessor.get(IEditorService);
    const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
    if (!editor) {
        _log(loggerService, '[Revive Webview] No notebook editor found for active editor pane, bypass');
        return;
    }
    if (!editor.hasEditorFocus()) {
        _log(loggerService, '[Revive Webview] Notebook editor is not focused, bypass');
        return;
    }
    if (!editor.hasWebviewFocus()) {
        _log(loggerService, '[Revive Webview] Notebook editor backlayer webview is not focused, bypass');
        return;
    }
    // If none of the outputs have focus, then webview is not focused
    const view = editor.getViewModel();
    if (view && view.viewCells.every((cell) => !cell.outputIsFocused && !cell.outputIsHovered)) {
        return;
    }
    return { editor, loggerService };
}
function getFocusedWebviewDelegate(accessor) {
    const result = getFocusedEditor(accessor);
    if (!result) {
        return;
    }
    const webview = result.editor.getInnerWebview();
    _log(result.loggerService, '[Revive Webview] Notebook editor backlayer webview is focused');
    return webview;
}
function withWebview(accessor, f) {
    const webview = getFocusedWebviewDelegate(accessor);
    if (webview) {
        f(webview);
        return true;
    }
    return false;
}
function withEditor(accessor, f) {
    const result = getFocusedEditor(accessor);
    return result ? f(result.editor) : false;
}
const PRIORITY = 105;
UndoCommand.addImplementation(PRIORITY, 'notebook-webview', (accessor) => {
    return withWebview(accessor, (webview) => webview.undo());
});
RedoCommand.addImplementation(PRIORITY, 'notebook-webview', (accessor) => {
    return withWebview(accessor, (webview) => webview.redo());
});
CopyAction?.addImplementation(PRIORITY, 'notebook-webview', (accessor) => {
    return withWebview(accessor, (webview) => webview.copy());
});
PasteAction?.addImplementation(PRIORITY, 'notebook-webview', (accessor) => {
    return withWebview(accessor, (webview) => webview.paste());
});
CutAction?.addImplementation(PRIORITY, 'notebook-webview', (accessor) => {
    return withWebview(accessor, (webview) => webview.cut());
});
export function runPasteCells(editor, activeCell, pasteCells) {
    if (!editor.hasModel()) {
        return false;
    }
    const textModel = editor.textModel;
    if (editor.isReadOnly) {
        return false;
    }
    const originalState = {
        kind: SelectionStateType.Index,
        focus: editor.getFocus(),
        selections: editor.getSelections(),
    };
    if (activeCell) {
        const currCellIndex = editor.getCellIndex(activeCell);
        const newFocusIndex = typeof currCellIndex === 'number' ? currCellIndex + 1 : 0;
        textModel.applyEdits([
            {
                editType: 1 /* CellEditType.Replace */,
                index: newFocusIndex,
                count: 0,
                cells: pasteCells.items.map((cell) => cloneNotebookCellTextModel(cell)),
            },
        ], true, originalState, () => ({
            kind: SelectionStateType.Index,
            focus: { start: newFocusIndex, end: newFocusIndex + 1 },
            selections: [{ start: newFocusIndex, end: newFocusIndex + pasteCells.items.length }],
        }), undefined, true);
    }
    else {
        if (editor.getLength() !== 0) {
            return false;
        }
        textModel.applyEdits([
            {
                editType: 1 /* CellEditType.Replace */,
                index: 0,
                count: 0,
                cells: pasteCells.items.map((cell) => cloneNotebookCellTextModel(cell)),
            },
        ], true, originalState, () => ({
            kind: SelectionStateType.Index,
            focus: { start: 0, end: 1 },
            selections: [{ start: 1, end: pasteCells.items.length + 1 }],
        }), undefined, true);
    }
    return true;
}
export function runCopyCells(accessor, editor, targetCell) {
    if (!editor.hasModel()) {
        return false;
    }
    if (editor.hasOutputTextSelection()) {
        getWindow(editor.getDomNode()).document.execCommand('copy');
        return true;
    }
    const clipboardService = accessor.get(IClipboardService);
    const notebookService = accessor.get(INotebookService);
    const selections = editor.getSelections();
    if (targetCell) {
        const targetCellIndex = editor.getCellIndex(targetCell);
        const containingSelection = selections.find((selection) => selection.start <= targetCellIndex && targetCellIndex < selection.end);
        if (!containingSelection) {
            clipboardService.writeText(targetCell.getText());
            notebookService.setToCopy([targetCell.model], true);
            return true;
        }
    }
    const selectionRanges = expandCellRangesWithHiddenCells(editor, editor.getSelections());
    const selectedCells = cellRangeToViewCells(editor, selectionRanges);
    if (!selectedCells.length) {
        return false;
    }
    clipboardService.writeText(selectedCells.map((cell) => cell.getText()).join('\n'));
    notebookService.setToCopy(selectedCells.map((cell) => cell.model), true);
    return true;
}
export function runCutCells(accessor, editor, targetCell) {
    if (!editor.hasModel() || editor.isReadOnly) {
        return false;
    }
    const textModel = editor.textModel;
    const clipboardService = accessor.get(IClipboardService);
    const notebookService = accessor.get(INotebookService);
    const selections = editor.getSelections();
    if (targetCell) {
        // from ui
        const targetCellIndex = editor.getCellIndex(targetCell);
        const containingSelection = selections.find((selection) => selection.start <= targetCellIndex && targetCellIndex < selection.end);
        if (!containingSelection) {
            clipboardService.writeText(targetCell.getText());
            // delete cell
            const focus = editor.getFocus();
            const newFocus = focus.end <= targetCellIndex ? focus : { start: focus.start - 1, end: focus.end - 1 };
            const newSelections = selections.map((selection) => selection.end <= targetCellIndex
                ? selection
                : { start: selection.start - 1, end: selection.end - 1 });
            textModel.applyEdits([{ editType: 1 /* CellEditType.Replace */, index: targetCellIndex, count: 1, cells: [] }], true, { kind: SelectionStateType.Index, focus: editor.getFocus(), selections: selections }, () => ({ kind: SelectionStateType.Index, focus: newFocus, selections: newSelections }), undefined, true);
            notebookService.setToCopy([targetCell.model], false);
            return true;
        }
    }
    const focus = editor.getFocus();
    const containingSelection = selections.find((selection) => selection.start <= focus.start && focus.end <= selection.end);
    if (!containingSelection) {
        // focus is out of any selection, we should only cut this cell
        const targetCell = editor.cellAt(focus.start);
        clipboardService.writeText(targetCell.getText());
        const newFocus = focus.end === editor.getLength() ? { start: focus.start - 1, end: focus.end - 1 } : focus;
        const newSelections = selections.map((selection) => selection.end <= focus.start
            ? selection
            : { start: selection.start - 1, end: selection.end - 1 });
        textModel.applyEdits([{ editType: 1 /* CellEditType.Replace */, index: focus.start, count: 1, cells: [] }], true, { kind: SelectionStateType.Index, focus: editor.getFocus(), selections: selections }, () => ({ kind: SelectionStateType.Index, focus: newFocus, selections: newSelections }), undefined, true);
        notebookService.setToCopy([targetCell.model], false);
        return true;
    }
    const selectionRanges = expandCellRangesWithHiddenCells(editor, editor.getSelections());
    const selectedCells = cellRangeToViewCells(editor, selectionRanges);
    if (!selectedCells.length) {
        return false;
    }
    clipboardService.writeText(selectedCells.map((cell) => cell.getText()).join('\n'));
    const edits = selectionRanges.map((range) => ({
        editType: 1 /* CellEditType.Replace */,
        index: range.start,
        count: range.end - range.start,
        cells: [],
    }));
    const firstSelectIndex = selectionRanges[0].start;
    /**
     * If we have cells, 0, 1, 2, 3, 4, 5, 6
     * and cells 1, 2 are selected, and then we delete cells 1 and 2
     * the new focused cell should still be at index 1
     */
    const newFocusedCellIndex = firstSelectIndex < textModel.cells.length - 1
        ? firstSelectIndex
        : Math.max(textModel.cells.length - 2, 0);
    textModel.applyEdits(edits, true, { kind: SelectionStateType.Index, focus: editor.getFocus(), selections: selectionRanges }, () => {
        return {
            kind: SelectionStateType.Index,
            focus: { start: newFocusedCellIndex, end: newFocusedCellIndex + 1 },
            selections: [{ start: newFocusedCellIndex, end: newFocusedCellIndex + 1 }],
        };
    }, undefined, true);
    notebookService.setToCopy(selectedCells.map((cell) => cell.model), false);
    return true;
}
let NotebookClipboardContribution = class NotebookClipboardContribution extends Disposable {
    static { this.ID = 'workbench.contrib.notebookClipboard'; }
    constructor(_editorService) {
        super();
        this._editorService = _editorService;
        const PRIORITY = 105;
        if (CopyAction) {
            this._register(CopyAction.addImplementation(PRIORITY, 'notebook-clipboard', (accessor) => {
                return this.runCopyAction(accessor);
            }));
        }
        if (PasteAction) {
            this._register(PasteAction.addImplementation(PRIORITY, 'notebook-clipboard', (accessor) => {
                return this.runPasteAction(accessor);
            }));
        }
        if (CutAction) {
            this._register(CutAction.addImplementation(PRIORITY, 'notebook-clipboard', (accessor) => {
                return this.runCutAction(accessor);
            }));
        }
    }
    _getContext() {
        const editor = getNotebookEditorFromEditorPane(this._editorService.activeEditorPane);
        const activeCell = editor?.getActiveCell();
        return {
            editor,
            activeCell,
        };
    }
    _focusInsideEmebedMonaco(editor) {
        const windowSelection = getWindow(editor.getDomNode()).getSelection();
        if (windowSelection?.rangeCount !== 1) {
            return false;
        }
        const activeSelection = windowSelection.getRangeAt(0);
        if (activeSelection.startContainer === activeSelection.endContainer &&
            activeSelection.endOffset - activeSelection.startOffset === 0) {
            return false;
        }
        let container = activeSelection.commonAncestorContainer;
        const body = editor.getDomNode();
        if (!body.contains(container)) {
            return false;
        }
        while (container && container !== body) {
            if (container.classList &&
                container.classList.contains('monaco-editor')) {
                return true;
            }
            container = container.parentNode;
        }
        return false;
    }
    runCopyAction(accessor) {
        const loggerService = accessor.get(ILogService);
        const activeElement = getActiveElement();
        if (isHTMLElement(activeElement) && isEditableElement(activeElement)) {
            _log(loggerService, '[NotebookEditor] focus is on input or textarea element, bypass');
            return false;
        }
        const { editor } = this._getContext();
        if (!editor) {
            _log(loggerService, '[NotebookEditor] no active notebook editor, bypass');
            return false;
        }
        if (!isAncestor(activeElement, editor.getDomNode())) {
            _log(loggerService, '[NotebookEditor] focus is outside of the notebook editor, bypass');
            return false;
        }
        if (this._focusInsideEmebedMonaco(editor)) {
            _log(loggerService, '[NotebookEditor] focus is on embed monaco editor, bypass');
            return false;
        }
        _log(loggerService, '[NotebookEditor] run copy actions on notebook model');
        return runCopyCells(accessor, editor, undefined);
    }
    runPasteAction(accessor) {
        const activeElement = getActiveElement();
        if (activeElement && isEditableElement(activeElement)) {
            return false;
        }
        const notebookService = accessor.get(INotebookService);
        const pasteCells = notebookService.getToCopy();
        if (!pasteCells) {
            return false;
        }
        const { editor, activeCell } = this._getContext();
        if (!editor) {
            return false;
        }
        return runPasteCells(editor, activeCell, pasteCells);
    }
    runCutAction(accessor) {
        const activeElement = getActiveElement();
        if (activeElement && isEditableElement(activeElement)) {
            return false;
        }
        const { editor } = this._getContext();
        if (!editor) {
            return false;
        }
        return runCutCells(accessor, editor, undefined);
    }
};
NotebookClipboardContribution = __decorate([
    __param(0, IEditorService)
], NotebookClipboardContribution);
export { NotebookClipboardContribution };
registerWorkbenchContribution2(NotebookClipboardContribution.ID, NotebookClipboardContribution, 2 /* WorkbenchPhase.BlockRestore */);
const COPY_CELL_COMMAND_ID = 'notebook.cell.copy';
const CUT_CELL_COMMAND_ID = 'notebook.cell.cut';
const PASTE_CELL_COMMAND_ID = 'notebook.cell.paste';
const PASTE_CELL_ABOVE_COMMAND_ID = 'notebook.cell.pasteAbove';
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: COPY_CELL_COMMAND_ID,
            title: localize('notebookActions.copy', 'Copy Cell'),
            menu: {
                id: MenuId.NotebookCellTitle,
                when: NOTEBOOK_EDITOR_FOCUSED,
                group: "1_copy" /* CellOverflowToolbarGroups.Copy */,
                order: 2,
            },
            keybinding: platform.isNative
                ? undefined
                : {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
                    win: {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
                        secondary: [2048 /* KeyMod.CtrlCmd */ | 19 /* KeyCode.Insert */],
                    },
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                },
        });
    }
    async runWithContext(accessor, context) {
        runCopyCells(accessor, context.notebookEditor, context.cell);
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: CUT_CELL_COMMAND_ID,
            title: localize('notebookActions.cut', 'Cut Cell'),
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_CELL_EDITABLE),
                group: "1_copy" /* CellOverflowToolbarGroups.Copy */,
                order: 1,
            },
            keybinding: platform.isNative
                ? undefined
                : {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */,
                    win: {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */,
                        secondary: [1024 /* KeyMod.Shift */ | 20 /* KeyCode.Delete */],
                    },
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                },
        });
    }
    async runWithContext(accessor, context) {
        runCutCells(accessor, context.notebookEditor, context.cell);
    }
});
registerAction2(class extends NotebookAction {
    constructor() {
        super({
            id: PASTE_CELL_COMMAND_ID,
            title: localize('notebookActions.paste', 'Paste Cell'),
            menu: {
                id: MenuId.NotebookCellTitle,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_EDITOR_EDITABLE),
                group: "1_copy" /* CellOverflowToolbarGroups.Copy */,
                order: 3,
            },
            keybinding: platform.isNative
                ? undefined
                : {
                    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */,
                    win: {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */,
                        secondary: [1024 /* KeyMod.Shift */ | 19 /* KeyCode.Insert */],
                    },
                    linux: {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */,
                        secondary: [1024 /* KeyMod.Shift */ | 19 /* KeyCode.Insert */],
                    },
                    weight: 100 /* KeybindingWeight.EditorContrib */,
                },
        });
    }
    async runWithContext(accessor, context) {
        const notebookService = accessor.get(INotebookService);
        const pasteCells = notebookService.getToCopy();
        if (!context.notebookEditor.hasModel() || context.notebookEditor.isReadOnly) {
            return;
        }
        if (!pasteCells) {
            return;
        }
        runPasteCells(context.notebookEditor, context.cell, pasteCells);
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: PASTE_CELL_ABOVE_COMMAND_ID,
            title: localize('notebookActions.pasteAbove', 'Paste Cell Above'),
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 52 /* KeyCode.KeyV */,
                weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT,
            },
        });
    }
    async runWithContext(accessor, context) {
        const notebookService = accessor.get(INotebookService);
        const pasteCells = notebookService.getToCopy();
        const editor = context.notebookEditor;
        const textModel = editor.textModel;
        if (editor.isReadOnly) {
            return;
        }
        if (!pasteCells) {
            return;
        }
        const originalState = {
            kind: SelectionStateType.Index,
            focus: editor.getFocus(),
            selections: editor.getSelections(),
        };
        const currCellIndex = context.notebookEditor.getCellIndex(context.cell);
        const newFocusIndex = currCellIndex;
        textModel.applyEdits([
            {
                editType: 1 /* CellEditType.Replace */,
                index: currCellIndex,
                count: 0,
                cells: pasteCells.items.map((cell) => cloneNotebookCellTextModel(cell)),
            },
        ], true, originalState, () => ({
            kind: SelectionStateType.Index,
            focus: { start: newFocusIndex, end: newFocusIndex + 1 },
            selections: [{ start: newFocusIndex, end: newFocusIndex + pasteCells.items.length }],
        }), undefined, true);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleNotebookClipboardLog',
            title: localize2('toggleNotebookClipboardLog', 'Toggle Notebook Clipboard Troubleshooting'),
            category: Categories.Developer,
            f1: true,
        });
    }
    run(accessor) {
        toggleLogging();
        if (_logging) {
            const commandService = accessor.get(ICommandService);
            commandService.executeCommand(showWindowLogActionId);
        }
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: 'notebook.cell.output.selectAll',
            title: localize('notebook.cell.output.selectAll', 'Select All'),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */,
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_OUTPUT_FOCUSED),
                weight: NOTEBOOK_OUTPUT_WEBVIEW_ACTION_WEIGHT,
            },
        });
    }
    async runWithContext(accessor, _context) {
        withEditor(accessor, (editor) => {
            if (!editor.hasEditorFocus()) {
                return false;
            }
            if (editor.hasEditorFocus() && !editor.hasWebviewFocus()) {
                return true;
            }
            const cell = editor.getActiveCell();
            if (!cell || !cell.outputIsFocused || !editor.hasWebviewFocus()) {
                return true;
            }
            if (cell.inputInOutputIsFocused) {
                editor.selectInputContents(cell);
            }
            else {
                editor.selectOutputContent(cell);
            }
            return true;
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDbGlwYm9hcmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvY2xpcGJvYXJkL25vdGVib29rQ2xpcGJvYXJkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZFLE9BQU8sRUFFTiw4QkFBOEIsR0FDOUIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDdkYsT0FBTyxFQUNOLHNCQUFzQixFQUN0Qix3QkFBd0IsRUFDeEIsdUJBQXVCLEVBQ3ZCLHVCQUF1QixHQUN2QixNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsK0JBQStCLEVBQy9CLCtCQUErQixHQUcvQixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFDTixVQUFVLEVBQ1YsU0FBUyxFQUNULFdBQVcsR0FDWCxNQUFNLGlFQUFpRSxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ25HLE9BQU8sRUFDTiwwQkFBMEIsR0FFMUIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBSU4sa0JBQWtCLEdBQ2xCLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDckUsT0FBTyxLQUFLLFFBQVEsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNyRSxPQUFPLEVBQ04sT0FBTyxFQUNQLE1BQU0sRUFD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