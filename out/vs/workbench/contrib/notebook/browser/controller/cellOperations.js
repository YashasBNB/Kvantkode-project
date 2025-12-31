/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ResourceTextEdit, } from '../../../../../editor/browser/services/bulkEditService.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { ResourceNotebookCellEdit } from '../../../bulkEdit/browser/bulkCellEdits.js';
import { CellEditState, CellFocusMode, expandCellRangesWithHiddenCells, } from '../notebookBrowser.js';
import { cloneNotebookCellTextModel } from '../../common/model/notebookCellTextModel.js';
import { CellKind, SelectionStateType, } from '../../common/notebookCommon.js';
import { cellRangeContains, cellRangesToIndexes } from '../../common/notebookRange.js';
import { localize } from '../../../../../nls.js';
export async function changeCellToKind(kind, context, language, mime) {
    const { notebookEditor } = context;
    if (!notebookEditor.hasModel()) {
        return;
    }
    if (notebookEditor.isReadOnly) {
        return;
    }
    if (context.ui && context.cell) {
        // action from UI
        const { cell } = context;
        if (cell.cellKind === kind) {
            return;
        }
        const text = cell.getText();
        const idx = notebookEditor.getCellIndex(cell);
        if (language === undefined) {
            const availableLanguages = notebookEditor.activeKernel?.supportedLanguages ?? [];
            language = availableLanguages[0] ?? PLAINTEXT_LANGUAGE_ID;
        }
        notebookEditor.textModel.applyEdits([
            {
                editType: 1 /* CellEditType.Replace */,
                index: idx,
                count: 1,
                cells: [
                    {
                        cellKind: kind,
                        source: text,
                        language: language,
                        mime: mime ?? cell.mime,
                        outputs: cell.model.outputs,
                        metadata: cell.metadata,
                    },
                ],
            },
        ], true, {
            kind: SelectionStateType.Index,
            focus: notebookEditor.getFocus(),
            selections: notebookEditor.getSelections(),
        }, () => {
            return {
                kind: SelectionStateType.Index,
                focus: notebookEditor.getFocus(),
                selections: notebookEditor.getSelections(),
            };
        }, undefined, true);
        const newCell = notebookEditor.cellAt(idx);
        await notebookEditor.focusNotebookCell(newCell, cell.getEditState() === CellEditState.Editing ? 'editor' : 'container');
    }
    else if (context.selectedCells) {
        const selectedCells = context.selectedCells;
        const rawEdits = [];
        selectedCells.forEach((cell) => {
            if (cell.cellKind === kind) {
                return;
            }
            const text = cell.getText();
            const idx = notebookEditor.getCellIndex(cell);
            if (language === undefined) {
                const availableLanguages = notebookEditor.activeKernel?.supportedLanguages ?? [];
                language = availableLanguages[0] ?? PLAINTEXT_LANGUAGE_ID;
            }
            rawEdits.push({
                editType: 1 /* CellEditType.Replace */,
                index: idx,
                count: 1,
                cells: [
                    {
                        cellKind: kind,
                        source: text,
                        language: language,
                        mime: mime ?? cell.mime,
                        outputs: cell.model.outputs,
                        metadata: cell.metadata,
                    },
                ],
            });
        });
        notebookEditor.textModel.applyEdits(rawEdits, true, {
            kind: SelectionStateType.Index,
            focus: notebookEditor.getFocus(),
            selections: notebookEditor.getSelections(),
        }, () => {
            return {
                kind: SelectionStateType.Index,
                focus: notebookEditor.getFocus(),
                selections: notebookEditor.getSelections(),
            };
        }, undefined, true);
    }
}
export function runDeleteAction(editor, cell) {
    const textModel = editor.textModel;
    const selections = editor.getSelections();
    const targetCellIndex = editor.getCellIndex(cell);
    const containingSelection = selections.find((selection) => selection.start <= targetCellIndex && targetCellIndex < selection.end);
    const computeUndoRedo = !editor.isReadOnly || textModel.viewType === 'interactive';
    if (containingSelection) {
        const edits = selections.reverse().map((selection) => ({
            editType: 1 /* CellEditType.Replace */,
            index: selection.start,
            count: selection.end - selection.start,
            cells: [],
        }));
        const nextCellAfterContainingSelection = containingSelection.end >= editor.getLength()
            ? undefined
            : editor.cellAt(containingSelection.end);
        textModel.applyEdits(edits, true, {
            kind: SelectionStateType.Index,
            focus: editor.getFocus(),
            selections: editor.getSelections(),
        }, () => {
            if (nextCellAfterContainingSelection) {
                const cellIndex = textModel.cells.findIndex((cell) => cell.handle === nextCellAfterContainingSelection.handle);
                return {
                    kind: SelectionStateType.Index,
                    focus: { start: cellIndex, end: cellIndex + 1 },
                    selections: [{ start: cellIndex, end: cellIndex + 1 }],
                };
            }
            else {
                if (textModel.length) {
                    const lastCellIndex = textModel.length - 1;
                    return {
                        kind: SelectionStateType.Index,
                        focus: { start: lastCellIndex, end: lastCellIndex + 1 },
                        selections: [{ start: lastCellIndex, end: lastCellIndex + 1 }],
                    };
                }
                else {
                    return {
                        kind: SelectionStateType.Index,
                        focus: { start: 0, end: 0 },
                        selections: [{ start: 0, end: 0 }],
                    };
                }
            }
        }, undefined, computeUndoRedo);
    }
    else {
        const focus = editor.getFocus();
        const edits = [
            {
                editType: 1 /* CellEditType.Replace */,
                index: targetCellIndex,
                count: 1,
                cells: [],
            },
        ];
        const finalSelections = [];
        for (let i = 0; i < selections.length; i++) {
            const selection = selections[i];
            if (selection.end <= targetCellIndex) {
                finalSelections.push(selection);
            }
            else if (selection.start > targetCellIndex) {
                finalSelections.push({ start: selection.start - 1, end: selection.end - 1 });
            }
            else {
                finalSelections.push({ start: targetCellIndex, end: targetCellIndex + 1 });
            }
        }
        if (editor.cellAt(focus.start) === cell) {
            // focus is the target, focus is also not part of any selection
            const newFocus = focus.end === textModel.length ? { start: focus.start - 1, end: focus.end - 1 } : focus;
            textModel.applyEdits(edits, true, {
                kind: SelectionStateType.Index,
                focus: editor.getFocus(),
                selections: editor.getSelections(),
            }, () => ({
                kind: SelectionStateType.Index,
                focus: newFocus,
                selections: finalSelections,
            }), undefined, computeUndoRedo);
        }
        else {
            // users decide to delete a cell out of current focus/selection
            const newFocus = focus.start > targetCellIndex ? { start: focus.start - 1, end: focus.end - 1 } : focus;
            textModel.applyEdits(edits, true, {
                kind: SelectionStateType.Index,
                focus: editor.getFocus(),
                selections: editor.getSelections(),
            }, () => ({
                kind: SelectionStateType.Index,
                focus: newFocus,
                selections: finalSelections,
            }), undefined, computeUndoRedo);
        }
    }
}
export async function moveCellRange(context, direction) {
    if (!context.notebookEditor.hasModel()) {
        return;
    }
    const editor = context.notebookEditor;
    const textModel = editor.textModel;
    if (editor.isReadOnly) {
        return;
    }
    let range = undefined;
    if (context.cell) {
        const idx = editor.getCellIndex(context.cell);
        range = { start: idx, end: idx + 1 };
    }
    else {
        const selections = editor.getSelections();
        const modelRanges = expandCellRangesWithHiddenCells(editor, selections);
        range = modelRanges[0];
    }
    if (!range || range.start === range.end) {
        return;
    }
    if (direction === 'up') {
        if (range.start === 0) {
            return;
        }
        const indexAbove = range.start - 1;
        const finalSelection = { start: range.start - 1, end: range.end - 1 };
        const focus = context.notebookEditor.getFocus();
        const newFocus = cellRangeContains(range, focus)
            ? { start: focus.start - 1, end: focus.end - 1 }
            : { start: range.start - 1, end: range.start };
        textModel.applyEdits([
            {
                editType: 6 /* CellEditType.Move */,
                index: indexAbove,
                length: 1,
                newIdx: range.end - 1,
            },
        ], true, {
            kind: SelectionStateType.Index,
            focus: editor.getFocus(),
            selections: editor.getSelections(),
        }, () => ({ kind: SelectionStateType.Index, focus: newFocus, selections: [finalSelection] }), undefined, true);
        const focusRange = editor.getSelections()[0] ?? editor.getFocus();
        editor.revealCellRangeInView(focusRange);
    }
    else {
        if (range.end >= textModel.length) {
            return;
        }
        const indexBelow = range.end;
        const finalSelection = { start: range.start + 1, end: range.end + 1 };
        const focus = editor.getFocus();
        const newFocus = cellRangeContains(range, focus)
            ? { start: focus.start + 1, end: focus.end + 1 }
            : { start: range.start + 1, end: range.start + 2 };
        textModel.applyEdits([
            {
                editType: 6 /* CellEditType.Move */,
                index: indexBelow,
                length: 1,
                newIdx: range.start,
            },
        ], true, {
            kind: SelectionStateType.Index,
            focus: editor.getFocus(),
            selections: editor.getSelections(),
        }, () => ({ kind: SelectionStateType.Index, focus: newFocus, selections: [finalSelection] }), undefined, true);
        const focusRange = editor.getSelections()[0] ?? editor.getFocus();
        editor.revealCellRangeInView(focusRange);
    }
}
export async function copyCellRange(context, direction) {
    const editor = context.notebookEditor;
    if (!editor.hasModel()) {
        return;
    }
    const textModel = editor.textModel;
    if (editor.isReadOnly) {
        return;
    }
    let range = undefined;
    if (context.ui) {
        const targetCell = context.cell;
        const targetCellIndex = editor.getCellIndex(targetCell);
        range = { start: targetCellIndex, end: targetCellIndex + 1 };
    }
    else {
        const selections = editor.getSelections();
        const modelRanges = expandCellRangesWithHiddenCells(editor, selections);
        range = modelRanges[0];
    }
    if (!range || range.start === range.end) {
        return;
    }
    if (direction === 'up') {
        // insert up, without changing focus and selections
        const focus = editor.getFocus();
        const selections = editor.getSelections();
        textModel.applyEdits([
            {
                editType: 1 /* CellEditType.Replace */,
                index: range.end,
                count: 0,
                cells: cellRangesToIndexes([range]).map((index) => cloneNotebookCellTextModel(editor.cellAt(index).model)),
            },
        ], true, {
            kind: SelectionStateType.Index,
            focus: focus,
            selections: selections,
        }, () => ({ kind: SelectionStateType.Index, focus: focus, selections: selections }), undefined, true);
    }
    else {
        // insert down, move selections
        const focus = editor.getFocus();
        const selections = editor.getSelections();
        const newCells = cellRangesToIndexes([range]).map((index) => cloneNotebookCellTextModel(editor.cellAt(index).model));
        const countDelta = newCells.length;
        const newFocus = context.ui
            ? focus
            : { start: focus.start + countDelta, end: focus.end + countDelta };
        const newSelections = context.ui
            ? selections
            : [{ start: range.start + countDelta, end: range.end + countDelta }];
        textModel.applyEdits([
            {
                editType: 1 /* CellEditType.Replace */,
                index: range.end,
                count: 0,
                cells: cellRangesToIndexes([range]).map((index) => cloneNotebookCellTextModel(editor.cellAt(index).model)),
            },
        ], true, {
            kind: SelectionStateType.Index,
            focus: focus,
            selections: selections,
        }, () => ({ kind: SelectionStateType.Index, focus: newFocus, selections: newSelections }), undefined, true);
        const focusRange = editor.getSelections()[0] ?? editor.getFocus();
        editor.revealCellRangeInView(focusRange);
    }
}
export async function joinSelectedCells(bulkEditService, notificationService, context) {
    const editor = context.notebookEditor;
    if (editor.isReadOnly) {
        return;
    }
    const edits = [];
    const cells = [];
    for (const selection of editor.getSelections()) {
        cells.push(...editor.getCellsInRange(selection));
    }
    if (cells.length <= 1) {
        return;
    }
    // check if all cells are of the same kind
    const cellKind = cells[0].cellKind;
    const isSameKind = cells.every((cell) => cell.cellKind === cellKind);
    if (!isSameKind) {
        // cannot join cells of different kinds
        // show warning and quit
        const message = localize('notebookActions.joinSelectedCells', 'Cannot join cells of different kinds');
        return notificationService.warn(message);
    }
    // merge all cells content into first cell
    const firstCell = cells[0];
    const insertContent = cells.map((cell) => cell.getText()).join(firstCell.textBuffer.getEOL());
    const firstSelection = editor.getSelections()[0];
    edits.push(new ResourceNotebookCellEdit(editor.textModel.uri, {
        editType: 1 /* CellEditType.Replace */,
        index: firstSelection.start,
        count: firstSelection.end - firstSelection.start,
        cells: [
            {
                cellKind: firstCell.cellKind,
                source: insertContent,
                language: firstCell.language,
                mime: firstCell.mime,
                outputs: firstCell.model.outputs,
                metadata: firstCell.metadata,
            },
        ],
    }));
    for (const selection of editor.getSelections().slice(1)) {
        edits.push(new ResourceNotebookCellEdit(editor.textModel.uri, {
            editType: 1 /* CellEditType.Replace */,
            index: selection.start,
            count: selection.end - selection.start,
            cells: [],
        }));
    }
    if (edits.length) {
        await bulkEditService.apply(edits, {
            quotableLabel: localize('notebookActions.joinSelectedCells.label', 'Join Notebook Cells'),
        });
    }
}
export async function joinNotebookCells(editor, range, direction, constraint) {
    if (editor.isReadOnly) {
        return null;
    }
    const textModel = editor.textModel;
    const cells = editor.getCellsInRange(range);
    if (!cells.length) {
        return null;
    }
    if (range.start === 0 && direction === 'above') {
        return null;
    }
    if (range.end === textModel.length && direction === 'below') {
        return null;
    }
    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        if (constraint && cell.cellKind !== constraint) {
            return null;
        }
    }
    if (direction === 'above') {
        const above = editor.cellAt(range.start - 1);
        if (constraint && above.cellKind !== constraint) {
            return null;
        }
        const insertContent = cells
            .map((cell) => (cell.textBuffer.getEOL() ?? '') + cell.getText())
            .join('');
        const aboveCellLineCount = above.textBuffer.getLineCount();
        const aboveCellLastLineEndColumn = above.textBuffer.getLineLength(aboveCellLineCount);
        return {
            edits: [
                new ResourceTextEdit(above.uri, {
                    range: new Range(aboveCellLineCount, aboveCellLastLineEndColumn + 1, aboveCellLineCount, aboveCellLastLineEndColumn + 1),
                    text: insertContent,
                }),
                new ResourceNotebookCellEdit(textModel.uri, {
                    editType: 1 /* CellEditType.Replace */,
                    index: range.start,
                    count: range.end - range.start,
                    cells: [],
                }),
            ],
            cell: above,
            endFocus: { start: range.start - 1, end: range.start },
            endSelections: [{ start: range.start - 1, end: range.start }],
        };
    }
    else {
        const below = editor.cellAt(range.end);
        if (constraint && below.cellKind !== constraint) {
            return null;
        }
        const cell = cells[0];
        const restCells = [...cells.slice(1), below];
        const insertContent = restCells
            .map((cl) => (cl.textBuffer.getEOL() ?? '') + cl.getText())
            .join('');
        const cellLineCount = cell.textBuffer.getLineCount();
        const cellLastLineEndColumn = cell.textBuffer.getLineLength(cellLineCount);
        return {
            edits: [
                new ResourceTextEdit(cell.uri, {
                    range: new Range(cellLineCount, cellLastLineEndColumn + 1, cellLineCount, cellLastLineEndColumn + 1),
                    text: insertContent,
                }),
                new ResourceNotebookCellEdit(textModel.uri, {
                    editType: 1 /* CellEditType.Replace */,
                    index: range.start + 1,
                    count: range.end - range.start,
                    cells: [],
                }),
            ],
            cell,
            endFocus: { start: range.start, end: range.start + 1 },
            endSelections: [{ start: range.start, end: range.start + 1 }],
        };
    }
}
export async function joinCellsWithSurrounds(bulkEditService, context, direction) {
    const editor = context.notebookEditor;
    const textModel = editor.textModel;
    const viewModel = editor.getViewModel();
    let ret = null;
    if (context.ui) {
        const focusMode = context.cell.focusMode;
        const cellIndex = editor.getCellIndex(context.cell);
        ret = await joinNotebookCells(editor, { start: cellIndex, end: cellIndex + 1 }, direction);
        if (!ret) {
            return;
        }
        await bulkEditService.apply(ret?.edits, { quotableLabel: 'Join Notebook Cells' });
        viewModel.updateSelectionsState({
            kind: SelectionStateType.Index,
            focus: ret.endFocus,
            selections: ret.endSelections,
        });
        ret.cell.updateEditState(CellEditState.Editing, 'joinCellsWithSurrounds');
        editor.revealCellRangeInView(editor.getFocus());
        if (focusMode === CellFocusMode.Editor) {
            ret.cell.focusMode = CellFocusMode.Editor;
        }
    }
    else {
        const selections = editor.getSelections();
        if (!selections.length) {
            return;
        }
        const focus = editor.getFocus();
        const focusMode = editor.cellAt(focus.start)?.focusMode;
        const edits = [];
        let cell = null;
        const cells = [];
        for (let i = selections.length - 1; i >= 0; i--) {
            const selection = selections[i];
            const containFocus = cellRangeContains(selection, focus);
            if ((selection.end >= textModel.length && direction === 'below') ||
                (selection.start === 0 && direction === 'above')) {
                if (containFocus) {
                    cell = editor.cellAt(focus.start);
                }
                cells.push(...editor.getCellsInRange(selection));
                continue;
            }
            const singleRet = await joinNotebookCells(editor, selection, direction);
            if (!singleRet) {
                return;
            }
            edits.push(...singleRet.edits);
            cells.push(singleRet.cell);
            if (containFocus) {
                cell = singleRet.cell;
            }
        }
        if (!edits.length) {
            return;
        }
        if (!cell || !cells.length) {
            return;
        }
        await bulkEditService.apply(edits, { quotableLabel: 'Join Notebook Cells' });
        cells.forEach((cell) => {
            cell.updateEditState(CellEditState.Editing, 'joinCellsWithSurrounds');
        });
        viewModel.updateSelectionsState({
            kind: SelectionStateType.Handle,
            primary: cell.handle,
            selections: cells.map((cell) => cell.handle),
        });
        editor.revealCellRangeInView(editor.getFocus());
        const newFocusedCell = editor.cellAt(editor.getFocus().start);
        if (focusMode === CellFocusMode.Editor && newFocusedCell) {
            newFocusedCell.focusMode = CellFocusMode.Editor;
        }
    }
}
function _splitPointsToBoundaries(splitPoints, textBuffer) {
    const boundaries = [];
    const lineCnt = textBuffer.getLineCount();
    const getLineLen = (lineNumber) => {
        return textBuffer.getLineLength(lineNumber);
    };
    // split points need to be sorted
    splitPoints = splitPoints.sort((l, r) => {
        const lineDiff = l.lineNumber - r.lineNumber;
        const columnDiff = l.column - r.column;
        return lineDiff !== 0 ? lineDiff : columnDiff;
    });
    for (let sp of splitPoints) {
        if (getLineLen(sp.lineNumber) + 1 === sp.column &&
            sp.column !== 1 /** empty line */ &&
            sp.lineNumber < lineCnt) {
            sp = new Position(sp.lineNumber + 1, 1);
        }
        _pushIfAbsent(boundaries, sp);
    }
    if (boundaries.length === 0) {
        return null;
    }
    // boundaries already sorted and not empty
    const modelStart = new Position(1, 1);
    const modelEnd = new Position(lineCnt, getLineLen(lineCnt) + 1);
    return [modelStart, ...boundaries, modelEnd];
}
function _pushIfAbsent(positions, p) {
    const last = positions.length > 0 ? positions[positions.length - 1] : undefined;
    if (!last || last.lineNumber !== p.lineNumber || last.column !== p.column) {
        positions.push(p);
    }
}
export function computeCellLinesContents(cell, splitPoints) {
    const rangeBoundaries = _splitPointsToBoundaries(splitPoints, cell.textBuffer);
    if (!rangeBoundaries) {
        return null;
    }
    const newLineModels = [];
    for (let i = 1; i < rangeBoundaries.length; i++) {
        const start = rangeBoundaries[i - 1];
        const end = rangeBoundaries[i];
        newLineModels.push(cell.textBuffer.getValueInRange(new Range(start.lineNumber, start.column, end.lineNumber, end.column), 0 /* EndOfLinePreference.TextDefined */));
    }
    return newLineModels;
}
export function insertCell(languageService, editor, index, type, direction = 'above', initialText = '', ui = false, kernelHistoryService) {
    const viewModel = editor.getViewModel();
    const activeKernel = editor.activeKernel;
    if (viewModel.options.isReadOnly) {
        return null;
    }
    const cell = editor.cellAt(index);
    const nextIndex = ui ? viewModel.getNextVisibleCellIndex(index) : index + 1;
    let language;
    if (type === CellKind.Code) {
        const supportedLanguages = activeKernel?.supportedLanguages ?? languageService.getRegisteredLanguageIds();
        const defaultLanguage = supportedLanguages[0] || PLAINTEXT_LANGUAGE_ID;
        if (cell?.cellKind === CellKind.Code) {
            language = cell.language;
        }
        else if (cell?.cellKind === CellKind.Markup) {
            const nearestCodeCellIndex = viewModel.nearestCodeCellIndex(index);
            if (nearestCodeCellIndex > -1) {
                language = viewModel.cellAt(nearestCodeCellIndex).language;
            }
            else {
                language = defaultLanguage;
            }
        }
        else if (!cell && viewModel.length === 0) {
            // No cells in notebook - check kernel history
            const lastKernels = kernelHistoryService?.getKernels(viewModel.notebookDocument);
            if (lastKernels?.all.length) {
                const lastKernel = lastKernels.all[0];
                language = lastKernel.supportedLanguages[0] || defaultLanguage;
            }
            else {
                language = defaultLanguage;
            }
        }
        else {
            if (cell === undefined && direction === 'above') {
                // insert cell at the very top
                language =
                    viewModel.viewCells.find((cell) => cell.cellKind === CellKind.Code)?.language ||
                        defaultLanguage;
            }
            else {
                language = defaultLanguage;
            }
        }
        if (!supportedLanguages.includes(language)) {
            // the language no longer exists
            language = defaultLanguage;
        }
    }
    else {
        language = 'markdown';
    }
    const insertIndex = cell ? (direction === 'above' ? index : nextIndex) : index;
    return insertCellAtIndex(viewModel, insertIndex, initialText, language, type, undefined, [], true, true);
}
export function insertCellAtIndex(viewModel, index, source, language, type, metadata, outputs, synchronous, pushUndoStop) {
    const endSelections = {
        kind: SelectionStateType.Index,
        focus: { start: index, end: index + 1 },
        selections: [{ start: index, end: index + 1 }],
    };
    viewModel.notebookDocument.applyEdits([
        {
            editType: 1 /* CellEditType.Replace */,
            index,
            count: 0,
            cells: [
                {
                    cellKind: type,
                    language: language,
                    mime: undefined,
                    outputs: outputs,
                    metadata: metadata,
                    source: source,
                },
            ],
        },
    ], synchronous, {
        kind: SelectionStateType.Index,
        focus: viewModel.getFocus(),
        selections: viewModel.getSelections(),
    }, () => endSelections, undefined, pushUndoStop && !viewModel.options.isReadOnly);
    return viewModel.cellAt(index);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbE9wZXJhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyb2xsZXIvY2VsbE9wZXJhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUdOLGdCQUFnQixHQUNoQixNQUFNLDJEQUEyRCxDQUFBO0FBQ2xFLE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNuRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFbEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFFL0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFckYsT0FBTyxFQUNOLGFBQWEsRUFDYixhQUFhLEVBQ2IsK0JBQStCLEdBRy9CLE1BQU0sdUJBQXVCLENBQUE7QUFFOUIsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDeEYsT0FBTyxFQUVOLFFBQVEsRUFNUixrQkFBa0IsR0FDbEIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQWMsTUFBTSwrQkFBK0IsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFJaEQsTUFBTSxDQUFDLEtBQUssVUFBVSxnQkFBZ0IsQ0FDckMsSUFBYyxFQUNkLE9BQStCLEVBQy9CLFFBQWlCLEVBQ2pCLElBQWE7SUFFYixNQUFNLEVBQUUsY0FBYyxFQUFFLEdBQUcsT0FBTyxDQUFBO0lBQ2xDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztRQUNoQyxPQUFNO0lBQ1AsQ0FBQztJQUVELElB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