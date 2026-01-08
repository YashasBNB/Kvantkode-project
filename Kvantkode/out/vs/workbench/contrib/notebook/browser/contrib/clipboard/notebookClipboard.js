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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDbGlwYm9hcmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9jbGlwYm9hcmQvbm90ZWJvb2tDbGlwYm9hcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdkUsT0FBTyxFQUVOLDhCQUE4QixHQUM5QixNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUN2RixPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLHdCQUF3QixFQUN4Qix1QkFBdUIsRUFDdkIsdUJBQXVCLEdBQ3ZCLE1BQU0sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyxFQUNOLG9CQUFvQixFQUNwQiwrQkFBK0IsRUFDL0IsK0JBQStCLEdBRy9CLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUNOLFVBQVUsRUFDVixTQUFTLEVBQ1QsV0FBVyxHQUNYLE1BQU0saUVBQWlFLENBQUE7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDbkcsT0FBTyxFQUNOLDBCQUEwQixHQUUxQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFJTixrQkFBa0IsR0FDbEIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNyRSxPQUFPLEtBQUssUUFBUSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3JFLE9BQU8sRUFDTixPQUFPLEVBQ1AsTUFB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