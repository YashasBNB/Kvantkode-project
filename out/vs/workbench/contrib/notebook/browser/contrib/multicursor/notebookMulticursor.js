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
import { localize } from '../../../../../../nls.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../../base/common/map.js';
import { EditorConfiguration } from '../../../../../../editor/browser/config/editorConfiguration.js';
import { CoreEditingCommands } from '../../../../../../editor/browser/coreCommands.js';
import { RedoCommand, UndoCommand } from '../../../../../../editor/browser/editorExtensions.js';
import { CodeEditorWidget } from '../../../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { cursorBlinkingStyleFromString, cursorStyleFromString, TextEditorCursorStyle, } from '../../../../../../editor/common/config/editorOptions.js';
import { Position } from '../../../../../../editor/common/core/position.js';
import { Selection } from '../../../../../../editor/common/core/selection.js';
import { USUAL_WORD_SEPARATORS, } from '../../../../../../editor/common/core/wordHelper.js';
import { CommandExecutor, CursorsController, } from '../../../../../../editor/common/cursor/cursor.js';
import { DeleteOperations } from '../../../../../../editor/common/cursor/cursorDeleteOperations.js';
import { CursorConfiguration, } from '../../../../../../editor/common/cursorCommon.js';
import { ILanguageConfigurationService } from '../../../../../../editor/common/languages/languageConfigurationRegistry.js';
import { indentOfLine } from '../../../../../../editor/common/model/textModel.js';
import { ITextModelService } from '../../../../../../editor/common/services/resolverService.js';
import { ViewModelEventsCollector } from '../../../../../../editor/common/viewModelEventDispatcher.js';
import { IAccessibilityService } from '../../../../../../platform/accessibility/common/accessibility.js';
import { MenuId, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IUndoRedoService, } from '../../../../../../platform/undoRedo/common/undoRedo.js';
import { registerWorkbenchContribution2, } from '../../../../../common/contributions.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { KEYBINDING_CONTEXT_NOTEBOOK_FIND_WIDGET_FOCUSED, NOTEBOOK_CELL_EDITOR_FOCUSED, NOTEBOOK_IS_ACTIVE_EDITOR, } from '../../../common/notebookContextKeys.js';
import { NotebookAction } from '../../controller/coreActions.js';
import { getNotebookEditorFromEditorPane, } from '../../notebookBrowser.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
import { CellEditorOptions } from '../../view/cellParts/cellEditorOptions.js';
import { NotebookFindContrib } from '../find/notebookFindWidget.js';
import { NotebookCellTextModel } from '../../../common/model/notebookCellTextModel.js';
const NOTEBOOK_ADD_FIND_MATCH_TO_SELECTION_ID = 'notebook.addFindMatchToSelection';
const NOTEBOOK_SELECT_ALL_FIND_MATCHES_ID = 'notebook.selectAllFindMatches';
export var NotebookMultiCursorState;
(function (NotebookMultiCursorState) {
    NotebookMultiCursorState[NotebookMultiCursorState["Idle"] = 0] = "Idle";
    NotebookMultiCursorState[NotebookMultiCursorState["Selecting"] = 1] = "Selecting";
    NotebookMultiCursorState[NotebookMultiCursorState["Editing"] = 2] = "Editing";
})(NotebookMultiCursorState || (NotebookMultiCursorState = {}));
export const NOTEBOOK_MULTI_CURSOR_CONTEXT = {
    IsNotebookMultiCursor: new RawContextKey('isNotebookMultiSelect', false),
    NotebookMultiSelectCursorState: new RawContextKey('notebookMultiSelectCursorState', NotebookMultiCursorState.Idle),
};
let NotebookMultiCursorController = class NotebookMultiCursorController extends Disposable {
    static { this.id = 'notebook.multiCursorController'; }
    getState() {
        return this.state;
    }
    constructor(notebookEditor, contextKeyService, textModelService, languageConfigurationService, accessibilityService, configurationService, undoRedoService) {
        super();
        this.notebookEditor = notebookEditor;
        this.contextKeyService = contextKeyService;
        this.textModelService = textModelService;
        this.languageConfigurationService = languageConfigurationService;
        this.accessibilityService = accessibilityService;
        this.configurationService = configurationService;
        this.undoRedoService = undoRedoService;
        this.word = '';
        this.trackedCells = [];
        this._onDidChangeAnchorCell = this._register(new Emitter());
        this.onDidChangeAnchorCell = this._onDidChangeAnchorCell.event;
        this.anchorDisposables = this._register(new DisposableStore());
        this.cursorsDisposables = this._register(new DisposableStore());
        this.cursorsControllers = new ResourceMap();
        this.state = NotebookMultiCursorState.Idle;
        this._nbIsMultiSelectSession = NOTEBOOK_MULTI_CURSOR_CONTEXT.IsNotebookMultiCursor.bindTo(this.contextKeyService);
        this._nbMultiSelectState = NOTEBOOK_MULTI_CURSOR_CONTEXT.NotebookMultiSelectCursorState.bindTo(this.contextKeyService);
        this.anchorCell = this.notebookEditor.activeCellAndCodeEditor;
        // anchor cell will catch and relay all type, cut, paste events to the cursors controllers
        // need to create new controllers when the anchor cell changes, then update their listeners
        // ** cursor controllers need to happen first, because anchor listeners relay to them
        this._register(this.onDidChangeAnchorCell(async () => {
            await this.syncCursorsControllers();
            this.syncAnchorListeners();
        }));
    }
    syncAnchorListeners() {
        this.anchorDisposables.clear();
        if (!this.anchorCell) {
            throw new Error('Anchor cell is undefined');
        }
        // typing
        this.anchorDisposables.add(this.anchorCell[1].onWillType((input) => {
            const collector = new ViewModelEventsCollector();
            this.trackedCells.forEach((cell) => {
                const controller = this.cursorsControllers.get(cell.cellViewModel.uri);
                if (!controller) {
                    // should not happen
                    return;
                }
                if (cell.cellViewModel.handle !== this.anchorCell?.[0].handle) {
                    // don't relay to active cell, already has a controller for typing
                    controller.type(collector, input, 'keyboard');
                }
            });
        }));
        this.anchorDisposables.add(this.anchorCell[1].onDidType(() => {
            this.state = NotebookMultiCursorState.Editing; // typing will continue to work as normal across ranges, just preps for another cmd+d
            this._nbMultiSelectState.set(NotebookMultiCursorState.Editing);
            const anchorController = this.cursorsControllers.get(this.anchorCell[0].uri);
            if (!anchorController) {
                return;
            }
            const activeSelections = this.notebookEditor.activeCodeEditor?.getSelections();
            if (!activeSelections) {
                return;
            }
            // need to keep anchor cursor controller in sync manually (for delete usage), since we don't relay type event to it
            anchorController.setSelections(new ViewModelEventsCollector(), 'keyboard', activeSelections, 3 /* CursorChangeReason.Explicit */);
            this.trackedCells.forEach((cell) => {
                const controller = this.cursorsControllers.get(cell.cellViewModel.uri);
                if (!controller) {
                    return;
                }
                // this is used upon exiting the multicursor session to set the selections back to the correct cursor state
                cell.initialSelection = controller.getSelection();
                // clear tracked selection data as it is invalid once typing begins
                cell.matchSelections = [];
            });
            this.updateLazyDecorations();
        }));
        // arrow key navigation
        this.anchorDisposables.add(this.anchorCell[1].onDidChangeCursorSelection((e) => {
            if (e.source === 'mouse') {
                this.resetToIdleState();
                return;
            }
            // ignore this event if it was caused by a typing event or a delete (NotSet and RecoverFromMarkers respectively)
            if (!e.oldSelections ||
                e.reason === 0 /* CursorChangeReason.NotSet */ ||
                e.reason === 2 /* CursorChangeReason.RecoverFromMarkers */) {
                return;
            }
            const translation = {
                deltaStartCol: e.selection.startColumn - e.oldSelections[0].startColumn,
                deltaStartLine: e.selection.startLineNumber - e.oldSelections[0].startLineNumber,
                deltaEndCol: e.selection.endColumn - e.oldSelections[0].endColumn,
                deltaEndLine: e.selection.endLineNumber - e.oldSelections[0].endLineNumber,
            };
            const translationDir = e.selection.getDirection();
            this.trackedCells.forEach((cell) => {
                const controller = this.cursorsControllers.get(cell.cellViewModel.uri);
                if (!controller) {
                    return;
                }
                const newSelections = controller.getSelections().map((selection) => {
                    const newStartCol = selection.startColumn + translation.deltaStartCol;
                    const newStartLine = selection.startLineNumber + translation.deltaStartLine;
                    const newEndCol = selection.endColumn + translation.deltaEndCol;
                    const newEndLine = selection.endLineNumber + translation.deltaEndLine;
                    return Selection.createWithDirection(newStartLine, newStartCol, newEndLine, newEndCol, translationDir);
                });
                controller.setSelections(new ViewModelEventsCollector(), e.source, newSelections, 3 /* CursorChangeReason.Explicit */);
            });
            this.updateLazyDecorations();
        }));
        // core actions
        this.anchorDisposables.add(this.anchorCell[1].onWillTriggerEditorOperationEvent((e) => {
            this.handleEditorOperationEvent(e);
        }));
        // exit mode
        this.anchorDisposables.add(this.anchorCell[1].onDidBlurEditorWidget(() => {
            if (this.state === NotebookMultiCursorState.Selecting ||
                this.state === NotebookMultiCursorState.Editing) {
                this.resetToIdleState();
            }
        }));
    }
    async syncCursorsControllers() {
        this.cursorsDisposables.clear(); // TODO: dial this back for perf and just update the relevant controllers
        await Promise.all(this.trackedCells.map(async (cell) => {
            const controller = await this.createCursorController(cell);
            if (!controller) {
                return;
            }
            this.cursorsControllers.set(cell.cellViewModel.uri, controller);
            const selections = cell.matchSelections;
            controller.setSelections(new ViewModelEventsCollector(), undefined, selections, 3 /* CursorChangeReason.Explicit */);
        }));
        this.updateLazyDecorations();
    }
    async createCursorController(cell) {
        const textModelRef = await this.textModelService.createModelReference(cell.cellViewModel.uri);
        const textModel = textModelRef.object.textEditorModel;
        if (!textModel) {
            return undefined;
        }
        const cursorSimpleModel = this.constructCursorSimpleModel(cell.cellViewModel);
        const converter = this.constructCoordinatesConverter();
        const editorConfig = cell.editorConfig;
        const controller = this.cursorsDisposables.add(new CursorsController(textModel, cursorSimpleModel, converter, new CursorConfiguration(textModel.getLanguageId(), textModel.getOptions(), editorConfig, this.languageConfigurationService)));
        controller.setSelections(new ViewModelEventsCollector(), undefined, cell.matchSelections, 3 /* CursorChangeReason.Explicit */);
        return controller;
    }
    constructCoordinatesConverter() {
        return {
            convertViewPositionToModelPosition(viewPosition) {
                return viewPosition;
            },
            convertViewRangeToModelRange(viewRange) {
                return viewRange;
            },
            validateViewPosition(viewPosition, expectedModelPosition) {
                return viewPosition;
            },
            validateViewRange(viewRange, expectedModelRange) {
                return viewRange;
            },
            convertModelPositionToViewPosition(modelPosition, affinity, allowZeroLineNumber, belowHiddenRanges) {
                return modelPosition;
            },
            convertModelRangeToViewRange(modelRange, affinity) {
                return modelRange;
            },
            modelPositionIsVisible(modelPosition) {
                return true;
            },
            getModelLineViewLineCount(modelLineNumber) {
                return 1;
            },
            getViewLineNumberOfModelPosition(modelLineNumber, modelColumn) {
                return modelLineNumber;
            },
        };
    }
    constructCursorSimpleModel(cell) {
        return {
            getLineCount() {
                return cell.textBuffer.getLineCount();
            },
            getLineContent(lineNumber) {
                return cell.textBuffer.getLineContent(lineNumber);
            },
            getLineMinColumn(lineNumber) {
                return cell.textBuffer.getLineMinColumn(lineNumber);
            },
            getLineMaxColumn(lineNumber) {
                return cell.textBuffer.getLineMaxColumn(lineNumber);
            },
            getLineFirstNonWhitespaceColumn(lineNumber) {
                return cell.textBuffer.getLineFirstNonWhitespaceColumn(lineNumber);
            },
            getLineLastNonWhitespaceColumn(lineNumber) {
                return cell.textBuffer.getLineLastNonWhitespaceColumn(lineNumber);
            },
            normalizePosition(position, affinity) {
                return position;
            },
            getLineIndentColumn(lineNumber) {
                return indentOfLine(cell.textBuffer.getLineContent(lineNumber)) + 1;
            },
        };
    }
    async handleEditorOperationEvent(e) {
        this.trackedCells.forEach((cell) => {
            if (cell.cellViewModel.handle === this.anchorCell?.[0].handle) {
                return;
            }
            const eventsCollector = new ViewModelEventsCollector();
            const controller = this.cursorsControllers.get(cell.cellViewModel.uri);
            if (!controller) {
                return;
            }
            this.executeEditorOperation(controller, eventsCollector, e);
        });
    }
    executeEditorOperation(controller, eventsCollector, e) {
        switch (e.handlerId) {
            case "compositionStart" /* Handler.CompositionStart */:
                controller.startComposition(eventsCollector);
                break;
            case "compositionEnd" /* Handler.CompositionEnd */:
                controller.endComposition(eventsCollector, e.source);
                break;
            case "replacePreviousChar" /* Handler.ReplacePreviousChar */: {
                const args = e.payload;
                controller.compositionType(eventsCollector, args.text || '', args.replaceCharCnt || 0, 0, 0, e.source);
                break;
            }
            case "compositionType" /* Handler.CompositionType */: {
                const args = e.payload;
                controller.compositionType(eventsCollector, args.text || '', args.replacePrevCharCnt || 0, args.replaceNextCharCnt || 0, args.positionDelta || 0, e.source);
                break;
            }
            case "paste" /* Handler.Paste */: {
                const args = e.payload;
                controller.paste(eventsCollector, args.text || '', args.pasteOnNewLine || false, args.multicursorText || null, e.source);
                break;
            }
            case "cut" /* Handler.Cut */:
                controller.cut(eventsCollector, e.source);
                break;
        }
    }
    updateViewModelSelections() {
        for (const cell of this.trackedCells) {
            const controller = this.cursorsControllers.get(cell.cellViewModel.uri);
            if (!controller) {
                // should not happen
                return;
            }
            cell.cellViewModel.setSelections(controller.getSelections());
        }
    }
    updateFinalUndoRedo() {
        const anchorCellModel = this.anchorCell?.[1].getModel();
        if (!anchorCellModel) {
            // should not happen
            return;
        }
        const newElementsMap = new ResourceMap();
        const resources = [];
        this.trackedCells.forEach((trackedMatch) => {
            const undoRedoState = trackedMatch.undoRedoHistory;
            if (!undoRedoState) {
                return;
            }
            resources.push(trackedMatch.cellViewModel.uri);
            const currentPastElements = this.undoRedoService
                .getElements(trackedMatch.cellViewModel.uri)
                .past.slice();
            const oldPastElements = trackedMatch.undoRedoHistory.past.slice();
            const newElements = currentPastElements.slice(oldPastElements.length);
            if (newElements.length === 0) {
                return;
            }
            newElementsMap.set(trackedMatch.cellViewModel.uri, newElements);
            this.undoRedoService.removeElements(trackedMatch.cellViewModel.uri);
            oldPastElements.forEach((element) => {
                this.undoRedoService.pushElement(element);
            });
        });
        this.undoRedoService.pushElement({
            type: 1 /* UndoRedoElementType.Workspace */,
            resources: resources,
            label: 'Multi Cursor Edit',
            code: 'multiCursorEdit',
            confirmBeforeUndo: false,
            undo: async () => {
                newElementsMap.forEach(async (value) => {
                    value.reverse().forEach(async (element) => {
                        await element.undo();
                    });
                });
            },
            redo: async () => {
                newElementsMap.forEach(async (value) => {
                    value.forEach(async (element) => {
                        await element.redo();
                    });
                });
            },
        });
    }
    resetToIdleState() {
        this.state = NotebookMultiCursorState.Idle;
        this._nbMultiSelectState.set(NotebookMultiCursorState.Idle);
        this._nbIsMultiSelectSession.set(false);
        this.updateFinalUndoRedo();
        this.trackedCells.forEach((cell) => {
            this.clearDecorations(cell);
            cell.cellViewModel.setSelections([cell.initialSelection]); // correct cursor placement upon exiting cmd-d session
        });
        this.anchorDisposables.clear();
        this.anchorCell = undefined;
        this.cursorsDisposables.clear();
        this.cursorsControllers.clear();
        this.trackedCells = [];
        this.startPosition = undefined;
        this.word = '';
    }
    async findAndTrackNextSelection(focusedCell) {
        if (this.state === NotebookMultiCursorState.Idle) {
            // move cursor to end of the symbol + track it, transition to selecting state
            const textModel = focusedCell.textModel;
            if (!textModel) {
                return;
            }
            const inputSelection = focusedCell.getSelections()[0];
            const word = this.getWord(inputSelection, textModel);
            if (!word) {
                return;
            }
            this.word = word.word;
            const index = this.notebookEditor.getCellIndex(focusedCell);
            if (index === undefined) {
                return;
            }
            this.startPosition = {
                cellIndex: index,
                position: new Position(inputSelection.startLineNumber, word.startColumn),
            };
            const newSelection = new Selection(inputSelection.startLineNumber, word.startColumn, inputSelection.startLineNumber, word.endColumn);
            focusedCell.setSelections([newSelection]);
            this.anchorCell = this.notebookEditor.activeCellAndCodeEditor;
            if (!this.anchorCell || this.anchorCell[0].handle !== focusedCell.handle) {
                throw new Error('Active cell is not the same as the cell passed as context');
            }
            if (!(this.anchorCell[1] instanceof CodeEditorWidget)) {
                throw new Error('Active cell is not an instance of CodeEditorWidget');
            }
            await this.updateTrackedCell(focusedCell, [newSelection]);
            this._nbIsMultiSelectSession.set(true);
            this.state = NotebookMultiCursorState.Selecting;
            this._nbMultiSelectState.set(NotebookMultiCursorState.Selecting);
            this._onDidChangeAnchorCell.fire();
        }
        else if (this.state === NotebookMultiCursorState.Selecting) {
            // use the word we stored from idle state transition to find next match, track it
            const notebookTextModel = this.notebookEditor.textModel;
            if (!notebookTextModel) {
                return; // should not happen
            }
            const index = this.notebookEditor.getCellIndex(focusedCell);
            if (index === undefined) {
                return; // should not happen
            }
            if (!this.startPosition) {
                return; // should not happen
            }
            const findResult = notebookTextModel.findNextMatch(this.word, {
                cellIndex: index,
                position: focusedCell
                    .getSelections()[focusedCell.getSelections().length - 1].getEndPosition(),
            }, false, true, USUAL_WORD_SEPARATORS, this.startPosition);
            if (!findResult) {
                return;
            }
            const findResultCellViewModel = this.notebookEditor.getCellByHandle(findResult.cell.handle);
            if (!findResultCellViewModel) {
                return;
            }
            if (findResult.cell.handle === focusedCell.handle) {
                // match is in the same cell, find tracked entry, update and set selections in viewmodel and cursorController
                const selections = [
                    ...focusedCell.getSelections(),
                    Selection.fromRange(findResult.match.range, 0 /* SelectionDirection.LTR */),
                ];
                const trackedCell = await this.updateTrackedCell(focusedCell, selections);
                findResultCellViewModel.setSelections(trackedCell.matchSelections);
            }
            else if (findResult.cell.handle !== focusedCell.handle) {
                // result is in a different cell, move focus there and apply selection, then update anchor
                await this.notebookEditor.revealRangeInViewAsync(findResultCellViewModel, findResult.match.range);
                await this.notebookEditor.focusNotebookCell(findResultCellViewModel, 'editor');
                const trackedCell = await this.updateTrackedCell(findResultCellViewModel, [
                    Selection.fromRange(findResult.match.range, 0 /* SelectionDirection.LTR */),
                ]);
                findResultCellViewModel.setSelections(trackedCell.matchSelections);
                this.anchorCell = this.notebookEditor.activeCellAndCodeEditor;
                if (!this.anchorCell || !(this.anchorCell[1] instanceof CodeEditorWidget)) {
                    throw new Error('Active cell is not an instance of CodeEditorWidget');
                }
                this._onDidChangeAnchorCell.fire();
                // we set the decorations manually for the cell we have just departed, since it blurs
                // we can find the match with the handle that the find and track request originated
                this.initializeMultiSelectDecorations(this.trackedCells.find((trackedCell) => trackedCell.cellViewModel.handle === focusedCell.handle));
            }
        }
    }
    async selectAllMatches(focusedCell, matches) {
        const notebookTextModel = this.notebookEditor.textModel;
        if (!notebookTextModel) {
            return; // should not happen
        }
        if (matches) {
            await this.handleFindWidgetSelectAllMatches(matches);
        }
        else {
            await this.handleCellEditorSelectAllMatches(notebookTextModel, focusedCell);
        }
        await this.syncCursorsControllers();
        this.syncAnchorListeners();
        this.updateLazyDecorations();
    }
    async handleFindWidgetSelectAllMatches(matches) {
        // TODO: support selecting state maybe. UX could get confusing since selecting state could be hit via ctrl+d which would have different filters (case sensetive + whole word)
        if (this.state !== NotebookMultiCursorState.Idle) {
            return;
        }
        if (!matches.length) {
            return;
        }
        await this.notebookEditor.focusNotebookCell(matches[0].cell, 'editor');
        this.anchorCell = this.notebookEditor.activeCellAndCodeEditor;
        this.trackedCells = [];
        for (const match of matches) {
            this.updateTrackedCell(match.cell, match.contentMatches.map((match) => Selection.fromRange(match.range, 0 /* SelectionDirection.LTR */)));
            if (this.anchorCell && match.cell.handle === this.anchorCell[0].handle) {
                // only explicitly set the focused cell's selections, the rest are handled by cursor controllers + decorations
                match.cell.setSelections(match.contentMatches.map((match) => Selection.fromRange(match.range, 0 /* SelectionDirection.LTR */)));
            }
        }
        this._nbIsMultiSelectSession.set(true);
        this.state = NotebookMultiCursorState.Selecting;
        this._nbMultiSelectState.set(NotebookMultiCursorState.Selecting);
    }
    async handleCellEditorSelectAllMatches(notebookTextModel, focusedCell) {
        // can be triggered mid multiselect session, or from idle state
        if (this.state === NotebookMultiCursorState.Idle) {
            // get word from current selection + rest of notebook objects
            const textModel = focusedCell.textModel;
            if (!textModel) {
                return;
            }
            const inputSelection = focusedCell.getSelections()[0];
            const word = this.getWord(inputSelection, textModel);
            if (!word) {
                return;
            }
            this.word = word.word;
            const index = this.notebookEditor.getCellIndex(focusedCell);
            if (index === undefined) {
                return;
            }
            this.startPosition = {
                cellIndex: index,
                position: new Position(inputSelection.startLineNumber, word.startColumn),
            };
            this.anchorCell = this.notebookEditor.activeCellAndCodeEditor;
            if (!this.anchorCell || this.anchorCell[0].handle !== focusedCell.handle) {
                throw new Error('Active cell is not the same as the cell passed as context');
            }
            if (!(this.anchorCell[1] instanceof CodeEditorWidget)) {
                throw new Error('Active cell is not an instance of CodeEditorWidget');
            }
            // get all matches in the notebook
            const findResults = notebookTextModel.findMatches(this.word, false, true, USUAL_WORD_SEPARATORS);
            // create the tracked matches for every result, needed for cursor controllers
            this.trackedCells = [];
            for (const res of findResults) {
                await this.updateTrackedCell(res.cell, res.matches.map((match) => Selection.fromRange(match.range, 0 /* SelectionDirection.LTR */)));
                if (res.cell.handle === focusedCell.handle) {
                    const cellViewModel = this.notebookEditor.getCellByHandle(res.cell.handle);
                    if (cellViewModel) {
                        cellViewModel.setSelections(res.matches.map((match) => Selection.fromRange(match.range, 0 /* SelectionDirection.LTR */)));
                    }
                }
            }
            this._nbIsMultiSelectSession.set(true);
            this.state = NotebookMultiCursorState.Selecting;
            this._nbMultiSelectState.set(NotebookMultiCursorState.Selecting);
        }
        else if (this.state === NotebookMultiCursorState.Selecting) {
            // we will already have a word + some number of tracked matches, need to update them with the rest given findAllMatches result
            const findResults = notebookTextModel.findMatches(this.word, false, true, USUAL_WORD_SEPARATORS);
            // update existing tracked matches with new selections and create new tracked matches for cells that aren't tracked yet
            for (const res of findResults) {
                await this.updateTrackedCell(res.cell, res.matches.map((match) => Selection.fromRange(match.range, 0 /* SelectionDirection.LTR */)));
            }
        }
    }
    async updateTrackedCell(cell, selections) {
        const cellViewModel = cell instanceof NotebookCellTextModel
            ? this.notebookEditor.getCellByHandle(cell.handle)
            : cell;
        if (!cellViewModel) {
            throw new Error('Cell not found');
        }
        let trackedMatch = this.trackedCells.find((trackedCell) => trackedCell.cellViewModel.handle === cellViewModel.handle);
        if (trackedMatch) {
            this.clearDecorations(trackedMatch); // need this to avoid leaking decorations -- TODO: just optimize the lazy decorations fn
            trackedMatch.matchSelections = selections;
        }
        else {
            const initialSelection = cellViewModel.getSelections()[0];
            const textModel = await cellViewModel.resolveTextModel();
            textModel.pushStackElement();
            const editorConfig = this.constructCellEditorOptions(cellViewModel);
            const rawEditorOptions = editorConfig.getRawOptions();
            const cursorConfig = {
                cursorStyle: cursorStyleFromString(rawEditorOptions.cursorStyle),
                cursorBlinking: cursorBlinkingStyleFromString(rawEditorOptions.cursorBlinking),
                cursorSmoothCaretAnimation: rawEditorOptions.cursorSmoothCaretAnimation,
            };
            trackedMatch = {
                cellViewModel: cellViewModel,
                initialSelection: initialSelection,
                matchSelections: selections,
                editorConfig: editorConfig,
                cursorConfig: cursorConfig,
                decorationIds: [],
                undoRedoHistory: this.undoRedoService.getElements(cellViewModel.uri),
            };
            this.trackedCells.push(trackedMatch);
        }
        return trackedMatch;
    }
    async deleteLeft() {
        this.trackedCells.forEach((cell) => {
            const controller = this.cursorsControllers.get(cell.cellViewModel.uri);
            if (!controller) {
                // should not happen
                return;
            }
            const [, commands] = DeleteOperations.deleteLeft(controller.getPrevEditOperationType(), controller.context.cursorConfig, controller.context.model, controller.getSelections(), controller.getAutoClosedCharacters());
            const delSelections = CommandExecutor.executeCommands(controller.context.model, controller.getSelections(), commands);
            if (!delSelections) {
                return;
            }
            controller.setSelections(new ViewModelEventsCollector(), undefined, delSelections, 3 /* CursorChangeReason.Explicit */);
        });
        this.updateLazyDecorations();
    }
    async deleteRight() {
        this.trackedCells.forEach((cell) => {
            const controller = this.cursorsControllers.get(cell.cellViewModel.uri);
            if (!controller) {
                // should not happen
                return;
            }
            const [, commands] = DeleteOperations.deleteRight(controller.getPrevEditOperationType(), controller.context.cursorConfig, controller.context.model, controller.getSelections());
            if (cell.cellViewModel.handle !== this.anchorCell?.[0].handle) {
                const delSelections = CommandExecutor.executeCommands(controller.context.model, controller.getSelections(), commands);
                if (!delSelections) {
                    return;
                }
                controller.setSelections(new ViewModelEventsCollector(), undefined, delSelections, 3 /* CursorChangeReason.Explicit */);
            }
            else {
                // get the selections from the viewmodel since we run the command manually (for cursor decoration reasons)
                controller.setSelections(new ViewModelEventsCollector(), undefined, cell.cellViewModel.getSelections(), 3 /* CursorChangeReason.Explicit */);
            }
        });
        this.updateLazyDecorations();
    }
    async undo() {
        const models = [];
        for (const cell of this.trackedCells) {
            const model = await cell.cellViewModel.resolveTextModel();
            if (model) {
                models.push(model);
            }
        }
        await Promise.all(models.map((model) => model.undo()));
        this.updateViewModelSelections();
        this.updateLazyDecorations();
    }
    async redo() {
        const models = [];
        for (const cell of this.trackedCells) {
            const model = await cell.cellViewModel.resolveTextModel();
            if (model) {
                models.push(model);
            }
        }
        await Promise.all(models.map((model) => model.redo()));
        this.updateViewModelSelections();
        this.updateLazyDecorations();
    }
    constructCellEditorOptions(cell) {
        const cellEditorOptions = new CellEditorOptions(this.notebookEditor.getBaseCellEditorOptions(cell.language), this.notebookEditor.notebookOptions, this.configurationService);
        const options = cellEditorOptions.getUpdatedValue(cell.internalMetadata, cell.uri);
        cellEditorOptions.dispose();
        return new EditorConfiguration(false, MenuId.EditorContent, options, null, this.accessibilityService);
    }
    /**
     * Updates the multicursor selection decorations for a specific matched cell
     *
     * @param cell -- match object containing the viewmodel + selections
     */
    initializeMultiSelectDecorations(cell) {
        if (!cell) {
            return;
        }
        const decorations = [];
        cell.matchSelections.forEach((selection) => {
            // mock cursor at the end of the selection
            decorations.push({
                range: Selection.fromPositions(selection.getEndPosition()),
                options: {
                    description: '',
                    className: this.getClassName(cell.cursorConfig, true),
                },
            });
        });
        cell.decorationIds = cell.cellViewModel.deltaModelDecorations(cell.decorationIds, decorations);
    }
    updateLazyDecorations() {
        this.trackedCells.forEach((cell) => {
            if (cell.cellViewModel.handle === this.anchorCell?.[0].handle) {
                return;
            }
            const controller = this.cursorsControllers.get(cell.cellViewModel.uri);
            if (!controller) {
                // should not happen
                return;
            }
            const selections = controller.getSelections();
            const newDecorations = [];
            selections?.map((selection) => {
                const isEmpty = selection.isEmpty();
                if (!isEmpty) {
                    // selection decoration (shift+arrow, etc)
                    newDecorations.push({
                        range: selection,
                        options: {
                            description: '',
                            className: this.getClassName(cell.cursorConfig, false),
                        },
                    });
                }
                // mock cursor at the end of the selection
                newDecorations.push({
                    range: Selection.fromPositions(selection.getPosition()),
                    options: {
                        description: '',
                        zIndex: 10000,
                        className: this.getClassName(cell.cursorConfig, true),
                    },
                });
            });
            cell.decorationIds = cell.cellViewModel.deltaModelDecorations(cell.decorationIds, newDecorations);
        });
    }
    clearDecorations(cell) {
        cell.decorationIds = cell.cellViewModel.deltaModelDecorations(cell.decorationIds, []);
    }
    getWord(selection, model) {
        const lineNumber = selection.startLineNumber;
        const startColumn = selection.startColumn;
        if (model.isDisposed()) {
            return null;
        }
        return model.getWordAtPosition({
            lineNumber: lineNumber,
            column: startColumn,
        });
    }
    getClassName(cursorConfig, isCursor) {
        let result = isCursor ? '.nb-multicursor-cursor' : '.nb-multicursor-selection';
        if (isCursor) {
            // handle base style
            switch (cursorConfig.cursorStyle) {
                case TextEditorCursorStyle.Line:
                    break; // default style, no additional class needed (handled by base css style)
                case TextEditorCursorStyle.Block:
                    result += '.nb-cursor-block-style';
                    break;
                case TextEditorCursorStyle.Underline:
                    result += '.nb-cursor-underline-style';
                    break;
                case TextEditorCursorStyle.LineThin:
                    result += '.nb-cursor-line-thin-style';
                    break;
                case TextEditorCursorStyle.BlockOutline:
                    result += '.nb-cursor-block-outline-style';
                    break;
                case TextEditorCursorStyle.UnderlineThin:
                    result += '.nb-cursor-underline-thin-style';
                    break;
                default:
                    break;
            }
            // handle animation style
            switch (cursorConfig.cursorBlinking) {
                case 1 /* TextEditorCursorBlinkingStyle.Blink */:
                    result += '.nb-blink';
                    break;
                case 2 /* TextEditorCursorBlinkingStyle.Smooth */:
                    result += '.nb-smooth';
                    break;
                case 3 /* TextEditorCursorBlinkingStyle.Phase */:
                    result += '.nb-phase';
                    break;
                case 4 /* TextEditorCursorBlinkingStyle.Expand */:
                    result += '.nb-expand';
                    break;
                case 5 /* TextEditorCursorBlinkingStyle.Solid */:
                    result += '.nb-solid';
                    break;
                default:
                    result += '.nb-solid';
                    break;
            }
            // handle caret animation style
            if (cursorConfig.cursorSmoothCaretAnimation === 'on' ||
                cursorConfig.cursorSmoothCaretAnimation === 'explicit') {
                result += '.nb-smooth-caret-animation';
            }
        }
        return result;
    }
    dispose() {
        super.dispose();
        this.anchorDisposables.dispose();
        this.cursorsDisposables.dispose();
        this.trackedCells.forEach((cell) => {
            this.clearDecorations(cell);
        });
        this.trackedCells = [];
    }
};
NotebookMultiCursorController = __decorate([
    __param(1, IContextKeyService),
    __param(2, ITextModelService),
    __param(3, ILanguageConfigurationService),
    __param(4, IAccessibilityService),
    __param(5, IConfigurationService),
    __param(6, IUndoRedoService)
], NotebookMultiCursorController);
export { NotebookMultiCursorController };
class NotebookSelectAllFindMatches extends NotebookAction {
    constructor() {
        super({
            id: NOTEBOOK_SELECT_ALL_FIND_MATCHES_ID,
            title: localize('selectAllFindMatches', 'Select All Occurrences of Find Match'),
            precondition: ContextKeyExpr.and(ContextKeyExpr.equals('config.notebook.multiCursor.enabled', true)),
            keybinding: {
                when: ContextKeyExpr.or(ContextKeyExpr.and(ContextKeyExpr.equals('config.notebook.multiCursor.enabled', true), NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_CELL_EDITOR_FOCUSED), ContextKeyExpr.and(ContextKeyExpr.equals('config.notebook.multiCursor.enabled', true), KEYBINDING_CONTEXT_NOTEBOOK_FIND_WIDGET_FOCUSED)),
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 42 /* KeyCode.KeyL */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
        });
    }
    async runWithContext(accessor, context) {
        const editorService = accessor.get(IEditorService);
        const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
        if (!editor) {
            return;
        }
        if (!context.cell) {
            return;
        }
        const cursorController = editor.getContribution(NotebookMultiCursorController.id);
        const findController = editor.getContribution(NotebookFindContrib.id);
        if (findController.widget.isFocused) {
            const findModel = findController.widget.findModel;
            cursorController.selectAllMatches(context.cell, findModel.findMatches);
        }
        else {
            cursorController.selectAllMatches(context.cell);
        }
    }
}
class NotebookAddMatchToMultiSelectionAction extends NotebookAction {
    constructor() {
        super({
            id: NOTEBOOK_ADD_FIND_MATCH_TO_SELECTION_ID,
            title: localize('addFindMatchToSelection', 'Add Selection to Next Find Match'),
            precondition: ContextKeyExpr.and(ContextKeyExpr.equals('config.notebook.multiCursor.enabled', true), NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_CELL_EDITOR_FOCUSED),
            keybinding: {
                when: ContextKeyExpr.and(ContextKeyExpr.equals('config.notebook.multiCursor.enabled', true), NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_CELL_EDITOR_FOCUSED),
                primary: 2048 /* KeyMod.CtrlCmd */ | 34 /* KeyCode.KeyD */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
        });
    }
    async runWithContext(accessor, context) {
        const editorService = accessor.get(IEditorService);
        const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
        if (!editor) {
            return;
        }
        if (!context.cell) {
            return;
        }
        const controller = editor.getContribution(NotebookMultiCursorController.id);
        controller.findAndTrackNextSelection(context.cell);
    }
}
class NotebookExitMultiSelectionAction extends NotebookAction {
    constructor() {
        super({
            id: 'noteMultiCursor.exit',
            title: localize('exitMultiSelection', 'Exit Multi Cursor Mode'),
            precondition: ContextKeyExpr.and(ContextKeyExpr.equals('config.notebook.multiCursor.enabled', true), NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_MULTI_CURSOR_CONTEXT.IsNotebookMultiCursor),
            keybinding: {
                when: ContextKeyExpr.and(ContextKeyExpr.equals('config.notebook.multiCursor.enabled', true), NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_MULTI_CURSOR_CONTEXT.IsNotebookMultiCursor),
                primary: 9 /* KeyCode.Escape */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
        });
    }
    async runWithContext(accessor, context) {
        const editorService = accessor.get(IEditorService);
        const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
        if (!editor) {
            return;
        }
        const controller = editor.getContribution(NotebookMultiCursorController.id);
        controller.resetToIdleState();
    }
}
class NotebookDeleteLeftMultiSelectionAction extends NotebookAction {
    constructor() {
        super({
            id: 'noteMultiCursor.deleteLeft',
            title: localize('deleteLeftMultiSelection', 'Delete Left'),
            precondition: ContextKeyExpr.and(ContextKeyExpr.equals('config.notebook.multiCursor.enabled', true), NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_MULTI_CURSOR_CONTEXT.IsNotebookMultiCursor, ContextKeyExpr.or(NOTEBOOK_MULTI_CURSOR_CONTEXT.NotebookMultiSelectCursorState.isEqualTo(NotebookMultiCursorState.Selecting), NOTEBOOK_MULTI_CURSOR_CONTEXT.NotebookMultiSelectCursorState.isEqualTo(NotebookMultiCursorState.Editing))),
            keybinding: {
                when: ContextKeyExpr.and(ContextKeyExpr.equals('config.notebook.multiCursor.enabled', true), NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_MULTI_CURSOR_CONTEXT.IsNotebookMultiCursor, ContextKeyExpr.or(NOTEBOOK_MULTI_CURSOR_CONTEXT.NotebookMultiSelectCursorState.isEqualTo(NotebookMultiCursorState.Selecting), NOTEBOOK_MULTI_CURSOR_CONTEXT.NotebookMultiSelectCursorState.isEqualTo(NotebookMultiCursorState.Editing))),
                primary: 1 /* KeyCode.Backspace */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
        });
    }
    async runWithContext(accessor, context) {
        const editorService = accessor.get(IEditorService);
        const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
        if (!editor) {
            return;
        }
        const controller = editor.getContribution(NotebookMultiCursorController.id);
        controller.deleteLeft();
    }
}
class NotebookDeleteRightMultiSelectionAction extends NotebookAction {
    constructor() {
        super({
            id: 'noteMultiCursor.deleteRight',
            title: localize('deleteRightMultiSelection', 'Delete Right'),
            precondition: ContextKeyExpr.and(ContextKeyExpr.equals('config.notebook.multiCursor.enabled', true), NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_MULTI_CURSOR_CONTEXT.IsNotebookMultiCursor, ContextKeyExpr.or(NOTEBOOK_MULTI_CURSOR_CONTEXT.NotebookMultiSelectCursorState.isEqualTo(NotebookMultiCursorState.Selecting), NOTEBOOK_MULTI_CURSOR_CONTEXT.NotebookMultiSelectCursorState.isEqualTo(NotebookMultiCursorState.Editing))),
            keybinding: {
                when: ContextKeyExpr.and(ContextKeyExpr.equals('config.notebook.multiCursor.enabled', true), NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_MULTI_CURSOR_CONTEXT.IsNotebookMultiCursor, ContextKeyExpr.or(NOTEBOOK_MULTI_CURSOR_CONTEXT.NotebookMultiSelectCursorState.isEqualTo(NotebookMultiCursorState.Selecting), NOTEBOOK_MULTI_CURSOR_CONTEXT.NotebookMultiSelectCursorState.isEqualTo(NotebookMultiCursorState.Editing))),
                primary: 20 /* KeyCode.Delete */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
        });
    }
    async runWithContext(accessor, context) {
        const editorService = accessor.get(IEditorService);
        const nbEditor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
        if (!nbEditor) {
            return;
        }
        const cellEditor = nbEditor.activeCodeEditor;
        if (!cellEditor) {
            return;
        }
        // need to run the command manually since we are overriding the command, this ensures proper cursor animation behavior
        CoreEditingCommands.DeleteRight.runEditorCommand(accessor, cellEditor, null);
        const controller = nbEditor.getContribution(NotebookMultiCursorController.id);
        controller.deleteRight();
    }
}
let NotebookMultiCursorUndoRedoContribution = class NotebookMultiCursorUndoRedoContribution extends Disposable {
    static { this.ID = 'workbench.contrib.notebook.multiCursorUndoRedo'; }
    constructor(_editorService, configurationService) {
        super();
        this._editorService = _editorService;
        this.configurationService = configurationService;
        if (!this.configurationService.getValue('notebook.multiCursor.enabled')) {
            return;
        }
        const PRIORITY = 10005;
        this._register(UndoCommand.addImplementation(PRIORITY, 'notebook-multicursor-undo-redo', () => {
            const editor = getNotebookEditorFromEditorPane(this._editorService.activeEditorPane);
            if (!editor) {
                return false;
            }
            if (!editor.hasModel()) {
                return false;
            }
            const controller = editor.getContribution(NotebookMultiCursorController.id);
            return controller.undo();
        }, ContextKeyExpr.and(ContextKeyExpr.equals('config.notebook.multiCursor.enabled', true), NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_MULTI_CURSOR_CONTEXT.IsNotebookMultiCursor)));
        this._register(RedoCommand.addImplementation(PRIORITY, 'notebook-multicursor-undo-redo', () => {
            const editor = getNotebookEditorFromEditorPane(this._editorService.activeEditorPane);
            if (!editor) {
                return false;
            }
            if (!editor.hasModel()) {
                return false;
            }
            const controller = editor.getContribution(NotebookMultiCursorController.id);
            return controller.redo();
        }, ContextKeyExpr.and(ContextKeyExpr.equals('config.notebook.multiCursor.enabled', true), NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_MULTI_CURSOR_CONTEXT.IsNotebookMultiCursor)));
    }
};
NotebookMultiCursorUndoRedoContribution = __decorate([
    __param(0, IEditorService),
    __param(1, IConfigurationService)
], NotebookMultiCursorUndoRedoContribution);
registerNotebookContribution(NotebookMultiCursorController.id, NotebookMultiCursorController);
registerWorkbenchContribution2(NotebookMultiCursorUndoRedoContribution.ID, NotebookMultiCursorUndoRedoContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerAction2(NotebookSelectAllFindMatches);
registerAction2(NotebookAddMatchToMultiSelectionAction);
registerAction2(NotebookExitMultiSelectionAction);
registerAction2(NotebookDeleteLeftMultiSelectionAction);
registerAction2(NotebookDeleteRightMultiSelectionAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tNdWx0aWN1cnNvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9tdWx0aWN1cnNvci9ub3RlYm9va011bHRpY3Vyc29yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sd0NBQXdDLENBQUE7QUFFdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFbEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDcEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFdEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQTtBQUV6RyxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLHFCQUFxQixFQUVyQixxQkFBcUIsR0FDckIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFM0UsT0FBTyxFQUFFLFNBQVMsRUFBc0IsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRyxPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUNOLGVBQWUsRUFDZixpQkFBaUIsR0FDakIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsZ0JBQWdC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