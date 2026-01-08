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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbE9wZXJhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJvbGxlci9jZWxsT3BlcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBR04sZ0JBQWdCLEdBQ2hCLE1BQU0sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVsRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUUvRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVyRixPQUFPLEVBQ04sYUFBYSxFQUNiLGFBQWEsRUFDYiwrQkFBK0IsR0FHL0IsTUFBTSx1QkFBdUIsQ0FBQTtBQUU5QixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN4RixPQUFPLEVBRU4sUUFBUSxFQU1SLGtCQUFrQixHQUNsQixNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBYyxNQUFNLCtCQUErQixDQUFBO0FBQ2xHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUloRCxNQUFNLENBQUMsS0FBSyxVQUFVLGdCQUFnQixDQUNyQyxJQUFjLEVBQ2QsT0FBK0IsRUFDL0IsUUFBaUIsRUFDakIsSUFBYTtJQUViLE1BQU0sRUFBRSxjQUFjLEVBQUUsR0FBRyxPQUFPLENBQUE7SUFDbEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1FBQ2hDLE9BQU07SUFDUCxDQUFDO0lB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