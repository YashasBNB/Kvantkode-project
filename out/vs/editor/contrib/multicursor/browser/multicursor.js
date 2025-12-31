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
var SelectionHighlighter_1;
import { status } from '../../../../base/browser/ui/aria/aria.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { EditorAction, registerEditorAction, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { CursorMoveCommands } from '../../../common/cursor/cursorMoveCommands.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { CommonFindController } from '../../find/browser/findController.js';
import * as nls from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { getSelectionHighlightDecorationOptions } from '../../wordHighlighter/browser/highlightDecorations.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
function announceCursorChange(previousCursorState, cursorState) {
    const cursorDiff = cursorState.filter((cs) => !previousCursorState.find((pcs) => pcs.equals(cs)));
    if (cursorDiff.length >= 1) {
        const cursorPositions = cursorDiff
            .map((cs) => `line ${cs.viewState.position.lineNumber} column ${cs.viewState.position.column}`)
            .join(', ');
        const msg = cursorDiff.length === 1
            ? nls.localize('cursorAdded', 'Cursor added: {0}', cursorPositions)
            : nls.localize('cursorsAdded', 'Cursors added: {0}', cursorPositions);
        status(msg);
    }
}
export class InsertCursorAbove extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.insertCursorAbove',
            label: nls.localize2('mutlicursor.insertAbove', 'Add Cursor Above'),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */,
                linux: {
                    primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */],
                },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menuOpts: {
                menuId: MenuId.MenubarSelectionMenu,
                group: '3_multi',
                title: nls.localize({ key: 'miInsertCursorAbove', comment: ['&& denotes a mnemonic'] }, '&&Add Cursor Above'),
                order: 2,
            },
        });
    }
    run(accessor, editor, args) {
        if (!editor.hasModel()) {
            return;
        }
        let useLogicalLine = true;
        if (args && args.logicalLine === false) {
            useLogicalLine = false;
        }
        const viewModel = editor._getViewModel();
        if (viewModel.cursorConfig.readOnly) {
            return;
        }
        viewModel.model.pushStackElement();
        const previousCursorState = viewModel.getCursorStates();
        viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, CursorMoveCommands.addCursorUp(viewModel, previousCursorState, useLogicalLine));
        viewModel.revealTopMostCursor(args.source);
        announceCursorChange(previousCursorState, viewModel.getCursorStates());
    }
}
export class InsertCursorBelow extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.insertCursorBelow',
            label: nls.localize2('mutlicursor.insertBelow', 'Add Cursor Below'),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */,
                linux: {
                    primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */],
                },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menuOpts: {
                menuId: MenuId.MenubarSelectionMenu,
                group: '3_multi',
                title: nls.localize({ key: 'miInsertCursorBelow', comment: ['&& denotes a mnemonic'] }, 'A&&dd Cursor Below'),
                order: 3,
            },
        });
    }
    run(accessor, editor, args) {
        if (!editor.hasModel()) {
            return;
        }
        let useLogicalLine = true;
        if (args && args.logicalLine === false) {
            useLogicalLine = false;
        }
        const viewModel = editor._getViewModel();
        if (viewModel.cursorConfig.readOnly) {
            return;
        }
        viewModel.model.pushStackElement();
        const previousCursorState = viewModel.getCursorStates();
        viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, CursorMoveCommands.addCursorDown(viewModel, previousCursorState, useLogicalLine));
        viewModel.revealBottomMostCursor(args.source);
        announceCursorChange(previousCursorState, viewModel.getCursorStates());
    }
}
class InsertCursorAtEndOfEachLineSelected extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.insertCursorAtEndOfEachLineSelected',
            label: nls.localize2('mutlicursor.insertAtEndOfEachLineSelected', 'Add Cursors to Line Ends'),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 39 /* KeyCode.KeyI */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menuOpts: {
                menuId: MenuId.MenubarSelectionMenu,
                group: '3_multi',
                title: nls.localize({ key: 'miInsertCursorAtEndOfEachLineSelected', comment: ['&& denotes a mnemonic'] }, 'Add C&&ursors to Line Ends'),
                order: 4,
            },
        });
    }
    getCursorsForSelection(selection, model, result) {
        if (selection.isEmpty()) {
            return;
        }
        for (let i = selection.startLineNumber; i < selection.endLineNumber; i++) {
            const currentLineMaxColumn = model.getLineMaxColumn(i);
            result.push(new Selection(i, currentLineMaxColumn, i, currentLineMaxColumn));
        }
        if (selection.endColumn > 1) {
            result.push(new Selection(selection.endLineNumber, selection.endColumn, selection.endLineNumber, selection.endColumn));
        }
    }
    run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const model = editor.getModel();
        const selections = editor.getSelections();
        const viewModel = editor._getViewModel();
        const previousCursorState = viewModel.getCursorStates();
        const newSelections = [];
        selections.forEach((sel) => this.getCursorsForSelection(sel, model, newSelections));
        if (newSelections.length > 0) {
            editor.setSelections(newSelections);
        }
        announceCursorChange(previousCursorState, viewModel.getCursorStates());
    }
}
class InsertCursorAtEndOfLineSelected extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.addCursorsToBottom',
            label: nls.localize2('mutlicursor.addCursorsToBottom', 'Add Cursors to Bottom'),
            precondition: undefined,
        });
    }
    run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const selections = editor.getSelections();
        const lineCount = editor.getModel().getLineCount();
        const newSelections = [];
        for (let i = selections[0].startLineNumber; i <= lineCount; i++) {
            newSelections.push(new Selection(i, selections[0].startColumn, i, selections[0].endColumn));
        }
        const viewModel = editor._getViewModel();
        const previousCursorState = viewModel.getCursorStates();
        if (newSelections.length > 0) {
            editor.setSelections(newSelections);
        }
        announceCursorChange(previousCursorState, viewModel.getCursorStates());
    }
}
class InsertCursorAtTopOfLineSelected extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.addCursorsToTop',
            label: nls.localize2('mutlicursor.addCursorsToTop', 'Add Cursors to Top'),
            precondition: undefined,
        });
    }
    run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const selections = editor.getSelections();
        const newSelections = [];
        for (let i = selections[0].startLineNumber; i >= 1; i--) {
            newSelections.push(new Selection(i, selections[0].startColumn, i, selections[0].endColumn));
        }
        const viewModel = editor._getViewModel();
        const previousCursorState = viewModel.getCursorStates();
        if (newSelections.length > 0) {
            editor.setSelections(newSelections);
        }
        announceCursorChange(previousCursorState, viewModel.getCursorStates());
    }
}
export class MultiCursorSessionResult {
    constructor(selections, revealRange, revealScrollType) {
        this.selections = selections;
        this.revealRange = revealRange;
        this.revealScrollType = revealScrollType;
    }
}
export class MultiCursorSession {
    static create(editor, findController) {
        if (!editor.hasModel()) {
            return null;
        }
        const findState = findController.getState();
        // Find widget owns entirely what we search for if:
        //  - focus is not in the editor (i.e. it is in the find widget)
        //  - and the search widget is visible
        //  - and the search string is non-empty
        if (!editor.hasTextFocus() && findState.isRevealed && findState.searchString.length > 0) {
            // Find widget owns what is searched for
            return new MultiCursorSession(editor, findController, false, findState.searchString, findState.wholeWord, findState.matchCase, null);
        }
        // Otherwise, the selection gives the search text, and the find widget gives the search settings
        // The exception is the find state disassociation case: when beginning with a single, collapsed selection
        let isDisconnectedFromFindController = false;
        let wholeWord;
        let matchCase;
        const selections = editor.getSelections();
        if (selections.length === 1 && selections[0].isEmpty()) {
            isDisconnectedFromFindController = true;
            wholeWord = true;
            matchCase = true;
        }
        else {
            wholeWord = findState.wholeWord;
            matchCase = findState.matchCase;
        }
        // Selection owns what is searched for
        const s = editor.getSelection();
        let searchText;
        let currentMatch = null;
        if (s.isEmpty()) {
            // selection is empty => expand to current word
            const word = editor.getConfiguredWordAtPosition(s.getStartPosition());
            if (!word) {
                return null;
            }
            searchText = word.word;
            currentMatch = new Selection(s.startLineNumber, word.startColumn, s.startLineNumber, word.endColumn);
        }
        else {
            searchText = editor.getModel().getValueInRange(s).replace(/\r\n/g, '\n');
        }
        return new MultiCursorSession(editor, findController, isDisconnectedFromFindController, searchText, wholeWord, matchCase, currentMatch);
    }
    constructor(_editor, findController, isDisconnectedFromFindController, searchText, wholeWord, matchCase, currentMatch) {
        this._editor = _editor;
        this.findController = findController;
        this.isDisconnectedFromFindController = isDisconnectedFromFindController;
        this.searchText = searchText;
        this.wholeWord = wholeWord;
        this.matchCase = matchCase;
        this.currentMatch = currentMatch;
    }
    addSelectionToNextFindMatch() {
        if (!this._editor.hasModel()) {
            return null;
        }
        const nextMatch = this._getNextMatch();
        if (!nextMatch) {
            return null;
        }
        const allSelections = this._editor.getSelections();
        return new MultiCursorSessionResult(allSelections.concat(nextMatch), nextMatch, 0 /* ScrollType.Smooth */);
    }
    moveSelectionToNextFindMatch() {
        if (!this._editor.hasModel()) {
            return null;
        }
        const nextMatch = this._getNextMatch();
        if (!nextMatch) {
            return null;
        }
        const allSelections = this._editor.getSelections();
        return new MultiCursorSessionResult(allSelections.slice(0, allSelections.length - 1).concat(nextMatch), nextMatch, 0 /* ScrollType.Smooth */);
    }
    _getNextMatch() {
        if (!this._editor.hasModel()) {
            return null;
        }
        if (this.currentMatch) {
            const result = this.currentMatch;
            this.currentMatch = null;
            return result;
        }
        this.findController.highlightFindOptions();
        const allSelections = this._editor.getSelections();
        const lastAddedSelection = allSelections[allSelections.length - 1];
        const nextMatch = this._editor
            .getModel()
            .findNextMatch(this.searchText, lastAddedSelection.getEndPosition(), false, this.matchCase, this.wholeWord ? this._editor.getOption(136 /* EditorOption.wordSeparators */) : null, false);
        if (!nextMatch) {
            return null;
        }
        return new Selection(nextMatch.range.startLineNumber, nextMatch.range.startColumn, nextMatch.range.endLineNumber, nextMatch.range.endColumn);
    }
    addSelectionToPreviousFindMatch() {
        if (!this._editor.hasModel()) {
            return null;
        }
        const previousMatch = this._getPreviousMatch();
        if (!previousMatch) {
            return null;
        }
        const allSelections = this._editor.getSelections();
        return new MultiCursorSessionResult(allSelections.concat(previousMatch), previousMatch, 0 /* ScrollType.Smooth */);
    }
    moveSelectionToPreviousFindMatch() {
        if (!this._editor.hasModel()) {
            return null;
        }
        const previousMatch = this._getPreviousMatch();
        if (!previousMatch) {
            return null;
        }
        const allSelections = this._editor.getSelections();
        return new MultiCursorSessionResult(allSelections.slice(0, allSelections.length - 1).concat(previousMatch), previousMatch, 0 /* ScrollType.Smooth */);
    }
    _getPreviousMatch() {
        if (!this._editor.hasModel()) {
            return null;
        }
        if (this.currentMatch) {
            const result = this.currentMatch;
            this.currentMatch = null;
            return result;
        }
        this.findController.highlightFindOptions();
        const allSelections = this._editor.getSelections();
        const lastAddedSelection = allSelections[allSelections.length - 1];
        const previousMatch = this._editor
            .getModel()
            .findPreviousMatch(this.searchText, lastAddedSelection.getStartPosition(), false, this.matchCase, this.wholeWord ? this._editor.getOption(136 /* EditorOption.wordSeparators */) : null, false);
        if (!previousMatch) {
            return null;
        }
        return new Selection(previousMatch.range.startLineNumber, previousMatch.range.startColumn, previousMatch.range.endLineNumber, previousMatch.range.endColumn);
    }
    selectAll(searchScope) {
        if (!this._editor.hasModel()) {
            return [];
        }
        this.findController.highlightFindOptions();
        const editorModel = this._editor.getModel();
        if (searchScope) {
            return editorModel.findMatches(this.searchText, searchScope, false, this.matchCase, this.wholeWord ? this._editor.getOption(136 /* EditorOption.wordSeparators */) : null, false, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
        }
        return editorModel.findMatches(this.searchText, true, false, this.matchCase, this.wholeWord ? this._editor.getOption(136 /* EditorOption.wordSeparators */) : null, false, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
    }
}
export class MultiCursorSelectionController extends Disposable {
    static { this.ID = 'editor.contrib.multiCursorController'; }
    static get(editor) {
        return editor.getContribution(MultiCursorSelectionController.ID);
    }
    constructor(editor) {
        super();
        this._sessionDispose = this._register(new DisposableStore());
        this._editor = editor;
        this._ignoreSelectionChange = false;
        this._session = null;
    }
    dispose() {
        this._endSession();
        super.dispose();
    }
    _beginSessionIfNeeded(findController) {
        if (!this._session) {
            // Create a new session
            const session = MultiCursorSession.create(this._editor, findController);
            if (!session) {
                return;
            }
            this._session = session;
            const newState = { searchString: this._session.searchText };
            if (this._session.isDisconnectedFromFindController) {
                newState.wholeWordOverride = 1 /* FindOptionOverride.True */;
                newState.matchCaseOverride = 1 /* FindOptionOverride.True */;
                newState.isRegexOverride = 2 /* FindOptionOverride.False */;
            }
            findController.getState().change(newState, false);
            this._sessionDispose.add(this._editor.onDidChangeCursorSelection((e) => {
                if (this._ignoreSelectionChange) {
                    return;
                }
                this._endSession();
            }));
            this._sessionDispose.add(this._editor.onDidBlurEditorText(() => {
                this._endSession();
            }));
            this._sessionDispose.add(findController.getState().onFindReplaceStateChange((e) => {
                if (e.matchCase || e.wholeWord) {
                    this._endSession();
                }
            }));
        }
    }
    _endSession() {
        this._sessionDispose.clear();
        if (this._session && this._session.isDisconnectedFromFindController) {
            const newState = {
                wholeWordOverride: 0 /* FindOptionOverride.NotSet */,
                matchCaseOverride: 0 /* FindOptionOverride.NotSet */,
                isRegexOverride: 0 /* FindOptionOverride.NotSet */,
            };
            this._session.findController.getState().change(newState, false);
        }
        this._session = null;
    }
    _setSelections(selections) {
        this._ignoreSelectionChange = true;
        this._editor.setSelections(selections);
        this._ignoreSelectionChange = false;
    }
    _expandEmptyToWord(model, selection) {
        if (!selection.isEmpty()) {
            return selection;
        }
        const word = this._editor.getConfiguredWordAtPosition(selection.getStartPosition());
        if (!word) {
            return selection;
        }
        return new Selection(selection.startLineNumber, word.startColumn, selection.startLineNumber, word.endColumn);
    }
    _applySessionResult(result) {
        if (!result) {
            return;
        }
        this._setSelections(result.selections);
        if (result.revealRange) {
            this._editor.revealRangeInCenterIfOutsideViewport(result.revealRange, result.revealScrollType);
        }
    }
    getSession(findController) {
        return this._session;
    }
    addSelectionToNextFindMatch(findController) {
        if (!this._editor.hasModel()) {
            return;
        }
        if (!this._session) {
            // If there are multiple cursors, handle the case where they do not all select the same text.
            const allSelections = this._editor.getSelections();
            if (allSelections.length > 1) {
                const findState = findController.getState();
                const matchCase = findState.matchCase;
                const selectionsContainSameText = modelRangesContainSameText(this._editor.getModel(), allSelections, matchCase);
                if (!selectionsContainSameText) {
                    const model = this._editor.getModel();
                    const resultingSelections = [];
                    for (let i = 0, len = allSelections.length; i < len; i++) {
                        resultingSelections[i] = this._expandEmptyToWord(model, allSelections[i]);
                    }
                    this._editor.setSelections(resultingSelections);
                    return;
                }
            }
        }
        this._beginSessionIfNeeded(findController);
        if (this._session) {
            this._applySessionResult(this._session.addSelectionToNextFindMatch());
        }
    }
    addSelectionToPreviousFindMatch(findController) {
        this._beginSessionIfNeeded(findController);
        if (this._session) {
            this._applySessionResult(this._session.addSelectionToPreviousFindMatch());
        }
    }
    moveSelectionToNextFindMatch(findController) {
        this._beginSessionIfNeeded(findController);
        if (this._session) {
            this._applySessionResult(this._session.moveSelectionToNextFindMatch());
        }
    }
    moveSelectionToPreviousFindMatch(findController) {
        this._beginSessionIfNeeded(findController);
        if (this._session) {
            this._applySessionResult(this._session.moveSelectionToPreviousFindMatch());
        }
    }
    selectAll(findController) {
        if (!this._editor.hasModel()) {
            return;
        }
        let matches = null;
        const findState = findController.getState();
        // Special case: find widget owns entirely what we search for if:
        // - focus is not in the editor (i.e. it is in the find widget)
        // - and the search widget is visible
        // - and the search string is non-empty
        // - and we're searching for a regex
        if (findState.isRevealed && findState.searchString.length > 0 && findState.isRegex) {
            const editorModel = this._editor.getModel();
            if (findState.searchScope) {
                matches = editorModel.findMatches(findState.searchString, findState.searchScope, findState.isRegex, findState.matchCase, findState.wholeWord ? this._editor.getOption(136 /* EditorOption.wordSeparators */) : null, false, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
            }
            else {
                matches = editorModel.findMatches(findState.searchString, true, findState.isRegex, findState.matchCase, findState.wholeWord ? this._editor.getOption(136 /* EditorOption.wordSeparators */) : null, false, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
            }
        }
        else {
            this._beginSessionIfNeeded(findController);
            if (!this._session) {
                return;
            }
            matches = this._session.selectAll(findState.searchScope);
        }
        if (matches.length > 0) {
            const editorSelection = this._editor.getSelection();
            // Have the primary cursor remain the one where the action was invoked
            for (let i = 0, len = matches.length; i < len; i++) {
                const match = matches[i];
                const intersection = match.range.intersectRanges(editorSelection);
                if (intersection) {
                    // bingo!
                    matches[i] = matches[0];
                    matches[0] = match;
                    break;
                }
            }
            this._setSelections(matches.map((m) => new Selection(m.range.startLineNumber, m.range.startColumn, m.range.endLineNumber, m.range.endColumn)));
        }
    }
    selectAllUsingSelections(selections) {
        if (selections.length > 0) {
            this._setSelections(selections);
        }
    }
}
export class MultiCursorSelectionControllerAction extends EditorAction {
    run(accessor, editor) {
        const multiCursorController = MultiCursorSelectionController.get(editor);
        if (!multiCursorController) {
            return;
        }
        const viewModel = editor._getViewModel();
        if (viewModel) {
            const previousCursorState = viewModel.getCursorStates();
            const findController = CommonFindController.get(editor);
            if (findController) {
                this._run(multiCursorController, findController);
            }
            else {
                const newFindController = accessor
                    .get(IInstantiationService)
                    .createInstance(CommonFindController, editor);
                this._run(multiCursorController, newFindController);
                newFindController.dispose();
            }
            announceCursorChange(previousCursorState, viewModel.getCursorStates());
        }
    }
}
export class AddSelectionToNextFindMatchAction extends MultiCursorSelectionControllerAction {
    constructor() {
        super({
            id: 'editor.action.addSelectionToNextFindMatch',
            label: nls.localize2('addSelectionToNextFindMatch', 'Add Selection to Next Find Match'),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 34 /* KeyCode.KeyD */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menuOpts: {
                menuId: MenuId.MenubarSelectionMenu,
                group: '3_multi',
                title: nls.localize({ key: 'miAddSelectionToNextFindMatch', comment: ['&& denotes a mnemonic'] }, 'Add &&Next Occurrence'),
                order: 5,
            },
        });
    }
    _run(multiCursorController, findController) {
        multiCursorController.addSelectionToNextFindMatch(findController);
    }
}
export class AddSelectionToPreviousFindMatchAction extends MultiCursorSelectionControllerAction {
    constructor() {
        super({
            id: 'editor.action.addSelectionToPreviousFindMatch',
            label: nls.localize2('addSelectionToPreviousFindMatch', 'Add Selection to Previous Find Match'),
            precondition: undefined,
            menuOpts: {
                menuId: MenuId.MenubarSelectionMenu,
                group: '3_multi',
                title: nls.localize({ key: 'miAddSelectionToPreviousFindMatch', comment: ['&& denotes a mnemonic'] }, 'Add P&&revious Occurrence'),
                order: 6,
            },
        });
    }
    _run(multiCursorController, findController) {
        multiCursorController.addSelectionToPreviousFindMatch(findController);
    }
}
export class MoveSelectionToNextFindMatchAction extends MultiCursorSelectionControllerAction {
    constructor() {
        super({
            id: 'editor.action.moveSelectionToNextFindMatch',
            label: nls.localize2('moveSelectionToNextFindMatch', 'Move Last Selection to Next Find Match'),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 34 /* KeyCode.KeyD */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    _run(multiCursorController, findController) {
        multiCursorController.moveSelectionToNextFindMatch(findController);
    }
}
export class MoveSelectionToPreviousFindMatchAction extends MultiCursorSelectionControllerAction {
    constructor() {
        super({
            id: 'editor.action.moveSelectionToPreviousFindMatch',
            label: nls.localize2('moveSelectionToPreviousFindMatch', 'Move Last Selection to Previous Find Match'),
            precondition: undefined,
        });
    }
    _run(multiCursorController, findController) {
        multiCursorController.moveSelectionToPreviousFindMatch(findController);
    }
}
export class SelectHighlightsAction extends MultiCursorSelectionControllerAction {
    constructor() {
        super({
            id: 'editor.action.selectHighlights',
            label: nls.localize2('selectAllOccurrencesOfFindMatch', 'Select All Occurrences of Find Match'),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.focus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 42 /* KeyCode.KeyL */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            menuOpts: {
                menuId: MenuId.MenubarSelectionMenu,
                group: '3_multi',
                title: nls.localize({ key: 'miSelectHighlights', comment: ['&& denotes a mnemonic'] }, 'Select All &&Occurrences'),
                order: 7,
            },
        });
    }
    _run(multiCursorController, findController) {
        multiCursorController.selectAll(findController);
    }
}
export class CompatChangeAll extends MultiCursorSelectionControllerAction {
    constructor() {
        super({
            id: 'editor.action.changeAll',
            label: nls.localize2('changeAll.label', 'Change All Occurrences'),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.editorTextFocus),
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 60 /* KeyCode.F2 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            contextMenuOpts: {
                group: '1_modification',
                order: 1.2,
            },
        });
    }
    _run(multiCursorController, findController) {
        multiCursorController.selectAll(findController);
    }
}
class SelectionHighlighterState {
    constructor(_model, _searchText, _matchCase, _wordSeparators, prevState) {
        this._model = _model;
        this._searchText = _searchText;
        this._matchCase = _matchCase;
        this._wordSeparators = _wordSeparators;
        this._cachedFindMatches = null;
        this._modelVersionId = this._model.getVersionId();
        if (prevState &&
            this._model === prevState._model &&
            this._searchText === prevState._searchText &&
            this._matchCase === prevState._matchCase &&
            this._wordSeparators === prevState._wordSeparators &&
            this._modelVersionId === prevState._modelVersionId) {
            this._cachedFindMatches = prevState._cachedFindMatches;
        }
    }
    findMatches() {
        if (this._cachedFindMatches === null) {
            this._cachedFindMatches = this._model
                .findMatches(this._searchText, true, false, this._matchCase, this._wordSeparators, false)
                .map((m) => m.range);
            this._cachedFindMatches.sort(Range.compareRangesUsingStarts);
        }
        return this._cachedFindMatches;
    }
}
let SelectionHighlighter = class SelectionHighlighter extends Disposable {
    static { SelectionHighlighter_1 = this; }
    static { this.ID = 'editor.contrib.selectionHighlighter'; }
    constructor(editor, _languageFeaturesService) {
        super();
        this._languageFeaturesService = _languageFeaturesService;
        this.editor = editor;
        this._isEnabled = editor.getOption(113 /* EditorOption.selectionHighlight */);
        this._decorations = editor.createDecorationsCollection();
        this.updateSoon = this._register(new RunOnceScheduler(() => this._update(), 300));
        this.state = null;
        this._register(editor.onDidChangeConfiguration((e) => {
            this._isEnabled = editor.getOption(113 /* EditorOption.selectionHighlight */);
        }));
        this._register(editor.onDidChangeCursorSelection((e) => {
            if (!this._isEnabled) {
                // Early exit if nothing needs to be done!
                // Leave some form of early exit check here if you wish to continue being a cursor position change listener ;)
                return;
            }
            if (e.selection.isEmpty()) {
                if (e.reason === 3 /* CursorChangeReason.Explicit */) {
                    if (this.state) {
                        // no longer valid
                        this._setState(null);
                    }
                    this.updateSoon.schedule();
                }
                else {
                    this._setState(null);
                }
            }
            else {
                this._update();
            }
        }));
        this._register(editor.onDidChangeModel((e) => {
            this._setState(null);
        }));
        this._register(editor.onDidChangeModelContent((e) => {
            if (this._isEnabled) {
                this.updateSoon.schedule();
            }
        }));
        const findController = CommonFindController.get(editor);
        if (findController) {
            this._register(findController.getState().onFindReplaceStateChange((e) => {
                this._update();
            }));
        }
        this.updateSoon.schedule();
    }
    _update() {
        this._setState(SelectionHighlighter_1._createState(this.state, this._isEnabled, this.editor));
    }
    static _createState(oldState, isEnabled, editor) {
        if (!isEnabled) {
            return null;
        }
        if (!editor.hasModel()) {
            return null;
        }
        const s = editor.getSelection();
        if (s.startLineNumber !== s.endLineNumber) {
            // multiline forbidden for perf reasons
            return null;
        }
        const multiCursorController = MultiCursorSelectionController.get(editor);
        if (!multiCursorController) {
            return null;
        }
        const findController = CommonFindController.get(editor);
        if (!findController) {
            return null;
        }
        let r = multiCursorController.getSession(findController);
        if (!r) {
            const allSelections = editor.getSelections();
            if (allSelections.length > 1) {
                const findState = findController.getState();
                const matchCase = findState.matchCase;
                const selectionsContainSameText = modelRangesContainSameText(editor.getModel(), allSelections, matchCase);
                if (!selectionsContainSameText) {
                    return null;
                }
            }
            r = MultiCursorSession.create(editor, findController);
        }
        if (!r) {
            return null;
        }
        if (r.currentMatch) {
            // This is an empty selection
            // Do not interfere with semantic word highlighting in the no selection case
            return null;
        }
        if (/^[ \t]+$/.test(r.searchText)) {
            // whitespace only selection
            return null;
        }
        if (r.searchText.length > 200) {
            // very long selection
            return null;
        }
        // TODO: better handling of this case
        const findState = findController.getState();
        const caseSensitive = findState.matchCase;
        // Return early if the find widget shows the exact same matches
        if (findState.isRevealed) {
            let findStateSearchString = findState.searchString;
            if (!caseSensitive) {
                findStateSearchString = findStateSearchString.toLowerCase();
            }
            let mySearchString = r.searchText;
            if (!caseSensitive) {
                mySearchString = mySearchString.toLowerCase();
            }
            if (findStateSearchString === mySearchString &&
                r.matchCase === findState.matchCase &&
                r.wholeWord === findState.wholeWord &&
                !findState.isRegex) {
                return null;
            }
        }
        return new SelectionHighlighterState(editor.getModel(), r.searchText, r.matchCase, r.wholeWord ? editor.getOption(136 /* EditorOption.wordSeparators */) : null, oldState);
    }
    _setState(newState) {
        this.state = newState;
        if (!this.state) {
            this._decorations.clear();
            return;
        }
        if (!this.editor.hasModel()) {
            return;
        }
        const model = this.editor.getModel();
        if (model.isTooLargeForTokenization()) {
            // the file is too large, so searching word under cursor in the whole document would be blocking the UI.
            return;
        }
        const allMatches = this.state.findMatches();
        const selections = this.editor.getSelections();
        selections.sort(Range.compareRangesUsingStarts);
        // do not overlap with selection (issue #64 and #512)
        const matches = [];
        for (let i = 0, j = 0, len = allMatches.length, lenJ = selections.length; i < len;) {
            const match = allMatches[i];
            if (j >= lenJ) {
                // finished all editor selections
                matches.push(match);
                i++;
            }
            else {
                const cmp = Range.compareRangesUsingStarts(match, selections[j]);
                if (cmp < 0) {
                    // match is before sel
                    if (selections[j].isEmpty() || !Range.areIntersecting(match, selections[j])) {
                        matches.push(match);
                    }
                    i++;
                }
                else if (cmp > 0) {
                    // sel is before match
                    j++;
                }
                else {
                    // sel is equal to match
                    i++;
                    j++;
                }
            }
        }
        const occurrenceHighlighting = this.editor.getOption(82 /* EditorOption.occurrencesHighlight */) !== 'off';
        const hasSemanticHighlights = this._languageFeaturesService.documentHighlightProvider.has(model) && occurrenceHighlighting;
        const decorations = matches.map((r) => {
            return {
                range: r,
                options: getSelectionHighlightDecorationOptions(hasSemanticHighlights),
            };
        });
        this._decorations.set(decorations);
    }
    dispose() {
        this._setState(null);
        super.dispose();
    }
};
SelectionHighlighter = SelectionHighlighter_1 = __decorate([
    __param(1, ILanguageFeaturesService)
], SelectionHighlighter);
export { SelectionHighlighter };
function modelRangesContainSameText(model, ranges, matchCase) {
    const selectedText = getValueInRange(model, ranges[0], !matchCase);
    for (let i = 1, len = ranges.length; i < len; i++) {
        const range = ranges[i];
        if (range.isEmpty()) {
            return false;
        }
        const thisSelectedText = getValueInRange(model, range, !matchCase);
        if (selectedText !== thisSelectedText) {
            return false;
        }
    }
    return true;
}
function getValueInRange(model, range, toLowerCase) {
    const text = model.getValueInRange(range);
    return toLowerCase ? text.toLowerCase() : text;
}
export class FocusNextCursor extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.focusNextCursor',
            label: nls.localize2('mutlicursor.focusNextCursor', 'Focus Next Cursor'),
            metadata: {
                description: nls.localize('mutlicursor.focusNextCursor.description', 'Focuses the next cursor'),
                args: [],
            },
            precondition: undefined,
        });
    }
    run(accessor, editor, args) {
        if (!editor.hasModel()) {
            return;
        }
        const viewModel = editor._getViewModel();
        if (viewModel.cursorConfig.readOnly) {
            return;
        }
        viewModel.model.pushStackElement();
        const previousCursorState = Array.from(viewModel.getCursorStates());
        const firstCursor = previousCursorState.shift();
        if (!firstCursor) {
            return;
        }
        previousCursorState.push(firstCursor);
        viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, previousCursorState);
        viewModel.revealPrimaryCursor(args.source, true);
        announceCursorChange(previousCursorState, viewModel.getCursorStates());
    }
}
export class FocusPreviousCursor extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.focusPreviousCursor',
            label: nls.localize2('mutlicursor.focusPreviousCursor', 'Focus Previous Cursor'),
            metadata: {
                description: nls.localize('mutlicursor.focusPreviousCursor.description', 'Focuses the previous cursor'),
                args: [],
            },
            precondition: undefined,
        });
    }
    run(accessor, editor, args) {
        if (!editor.hasModel()) {
            return;
        }
        const viewModel = editor._getViewModel();
        if (viewModel.cursorConfig.readOnly) {
            return;
        }
        viewModel.model.pushStackElement();
        const previousCursorState = Array.from(viewModel.getCursorStates());
        const firstCursor = previousCursorState.pop();
        if (!firstCursor) {
            return;
        }
        previousCursorState.unshift(firstCursor);
        viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, previousCursorState);
        viewModel.revealPrimaryCursor(args.source, true);
        announceCursorChange(previousCursorState, viewModel.getCursorStates());
    }
}
registerEditorContribution(MultiCursorSelectionController.ID, MultiCursorSelectionController, 4 /* EditorContributionInstantiation.Lazy */);
registerEditorContribution(SelectionHighlighter.ID, SelectionHighlighter, 1 /* EditorContributionInstantiation.AfterFirstRender */);
registerEditorAction(InsertCursorAbove);
registerEditorAction(InsertCursorBelow);
registerEditorAction(InsertCursorAtEndOfEachLineSelected);
registerEditorAction(AddSelectionToNextFindMatchAction);
registerEditorAction(AddSelectionToPreviousFindMatchAction);
registerEditorAction(MoveSelectionToNextFindMatchAction);
registerEditorAction(MoveSelectionToPreviousFindMatchAction);
registerEditorAction(SelectHighlightsAction);
registerEditorAction(CompatChangeAll);
registerEditorAction(InsertCursorAtEndOfLineSelected);
registerEditorAction(InsertCursorAtTopOfLineSelected);
registerEditorAction(FocusNextCursor);
registerEditorAction(FocusPreviousCursor);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGljdXJzb3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9tdWx0aWN1cnNvci9icm93c2VyL211bHRpY3Vyc29yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDakUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBR2xGLE9BQU8sRUFDTixZQUFZLEVBRVosb0JBQW9CLEVBQ3BCLDBCQUEwQixHQUUxQixNQUFNLHNDQUFzQyxDQUFBO0FBSTdDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFNN0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFeEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFM0UsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDdkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXJGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxzQ0FBc0MsRUFBRSxNQUFNLHVEQUF1RCxDQUFB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