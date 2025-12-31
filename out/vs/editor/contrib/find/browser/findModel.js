/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { findFirstIdxMonotonousOrArrLen } from '../../../../base/common/arraysFind.js';
import { RunOnceScheduler, TimeoutTimer } from '../../../../base/common/async.js';
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import { ReplaceCommand, ReplaceCommandThatPreservesSelection, } from '../../../common/commands/replaceCommand.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { SearchParams } from '../../../common/model/textModelSearch.js';
import { FindDecorations } from './findDecorations.js';
import { ReplaceAllCommand } from './replaceAllCommand.js';
import { parseReplaceString, ReplacePattern } from './replacePattern.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
export const CONTEXT_FIND_WIDGET_VISIBLE = new RawContextKey('findWidgetVisible', false);
export const CONTEXT_FIND_WIDGET_NOT_VISIBLE = CONTEXT_FIND_WIDGET_VISIBLE.toNegated();
// Keep ContextKey use of 'Focussed' to not break when clauses
export const CONTEXT_FIND_INPUT_FOCUSED = new RawContextKey('findInputFocussed', false);
export const CONTEXT_REPLACE_INPUT_FOCUSED = new RawContextKey('replaceInputFocussed', false);
export const ToggleCaseSensitiveKeybinding = {
    primary: 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */,
    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */ },
};
export const ToggleWholeWordKeybinding = {
    primary: 512 /* KeyMod.Alt */ | 53 /* KeyCode.KeyW */,
    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 53 /* KeyCode.KeyW */ },
};
export const ToggleRegexKeybinding = {
    primary: 512 /* KeyMod.Alt */ | 48 /* KeyCode.KeyR */,
    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 48 /* KeyCode.KeyR */ },
};
export const ToggleSearchScopeKeybinding = {
    primary: 512 /* KeyMod.Alt */ | 42 /* KeyCode.KeyL */,
    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 42 /* KeyCode.KeyL */ },
};
export const TogglePreserveCaseKeybinding = {
    primary: 512 /* KeyMod.Alt */ | 46 /* KeyCode.KeyP */,
    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 46 /* KeyCode.KeyP */ },
};
export const FIND_IDS = {
    StartFindAction: 'actions.find',
    StartFindWithSelection: 'actions.findWithSelection',
    StartFindWithArgs: 'editor.actions.findWithArgs',
    NextMatchFindAction: 'editor.action.nextMatchFindAction',
    PreviousMatchFindAction: 'editor.action.previousMatchFindAction',
    GoToMatchFindAction: 'editor.action.goToMatchFindAction',
    NextSelectionMatchFindAction: 'editor.action.nextSelectionMatchFindAction',
    PreviousSelectionMatchFindAction: 'editor.action.previousSelectionMatchFindAction',
    StartFindReplaceAction: 'editor.action.startFindReplaceAction',
    CloseFindWidgetCommand: 'closeFindWidget',
    ToggleCaseSensitiveCommand: 'toggleFindCaseSensitive',
    ToggleWholeWordCommand: 'toggleFindWholeWord',
    ToggleRegexCommand: 'toggleFindRegex',
    ToggleSearchScopeCommand: 'toggleFindInSelection',
    TogglePreserveCaseCommand: 'togglePreserveCase',
    ReplaceOneAction: 'editor.action.replaceOne',
    ReplaceAllAction: 'editor.action.replaceAll',
    SelectAllMatchesAction: 'editor.action.selectAllMatches',
};
export const MATCHES_LIMIT = 19999;
const RESEARCH_DELAY = 240;
export class FindModelBoundToEditorModel {
    constructor(editor, state) {
        this._toDispose = new DisposableStore();
        this._editor = editor;
        this._state = state;
        this._isDisposed = false;
        this._startSearchingTimer = new TimeoutTimer();
        this._decorations = new FindDecorations(editor);
        this._toDispose.add(this._decorations);
        this._updateDecorationsScheduler = new RunOnceScheduler(() => {
            if (!this._editor.hasModel()) {
                return;
            }
            return this.research(false);
        }, 100);
        this._toDispose.add(this._updateDecorationsScheduler);
        this._toDispose.add(this._editor.onDidChangeCursorPosition((e) => {
            if (e.reason === 3 /* CursorChangeReason.Explicit */ ||
                e.reason === 5 /* CursorChangeReason.Undo */ ||
                e.reason === 6 /* CursorChangeReason.Redo */) {
                this._decorations.setStartPosition(this._editor.getPosition());
            }
        }));
        this._ignoreModelContentChanged = false;
        this._toDispose.add(this._editor.onDidChangeModelContent((e) => {
            if (this._ignoreModelContentChanged) {
                return;
            }
            if (e.isFlush) {
                // a model.setValue() was called
                this._decorations.reset();
            }
            this._decorations.setStartPosition(this._editor.getPosition());
            this._updateDecorationsScheduler.schedule();
        }));
        this._toDispose.add(this._state.onFindReplaceStateChange((e) => this._onStateChanged(e)));
        this.research(false, this._state.searchScope);
    }
    dispose() {
        this._isDisposed = true;
        dispose(this._startSearchingTimer);
        this._toDispose.dispose();
    }
    _onStateChanged(e) {
        if (this._isDisposed) {
            // The find model is disposed during a find state changed event
            return;
        }
        if (!this._editor.hasModel()) {
            // The find model will be disposed momentarily
            return;
        }
        if (e.searchString ||
            e.isReplaceRevealed ||
            e.isRegex ||
            e.wholeWord ||
            e.matchCase ||
            e.searchScope) {
            const model = this._editor.getModel();
            if (model.isTooLargeForSyncing()) {
                this._startSearchingTimer.cancel();
                this._startSearchingTimer.setIfNotSet(() => {
                    if (e.searchScope) {
                        this.research(e.moveCursor, this._state.searchScope);
                    }
                    else {
                        this.research(e.moveCursor);
                    }
                }, RESEARCH_DELAY);
            }
            else {
                if (e.searchScope) {
                    this.research(e.moveCursor, this._state.searchScope);
                }
                else {
                    this.research(e.moveCursor);
                }
            }
        }
    }
    static _getSearchRange(model, findScope) {
        // If we have set now or before a find scope, use it for computing the search range
        if (findScope) {
            return findScope;
        }
        return model.getFullModelRange();
    }
    research(moveCursor, newFindScope) {
        let findScopes = null;
        if (typeof newFindScope !== 'undefined') {
            if (newFindScope !== null) {
                if (!Array.isArray(newFindScope)) {
                    findScopes = [newFindScope];
                }
                else {
                    findScopes = newFindScope;
                }
            }
        }
        else {
            findScopes = this._decorations.getFindScopes();
        }
        if (findScopes !== null) {
            findScopes = findScopes.map((findScope) => {
                if (findScope.startLineNumber !== findScope.endLineNumber) {
                    let endLineNumber = findScope.endLineNumber;
                    if (findScope.endColumn === 1) {
                        endLineNumber = endLineNumber - 1;
                    }
                    return new Range(findScope.startLineNumber, 1, endLineNumber, this._editor.getModel().getLineMaxColumn(endLineNumber));
                }
                return findScope;
            });
        }
        const findMatches = this._findMatches(findScopes, false, MATCHES_LIMIT);
        this._decorations.set(findMatches, findScopes);
        const editorSelection = this._editor.getSelection();
        let currentMatchesPosition = this._decorations.getCurrentMatchesPosition(editorSelection);
        if (currentMatchesPosition === 0 && findMatches.length > 0) {
            // current selection is not on top of a match
            // try to find its nearest result from the top of the document
            const matchAfterSelection = findFirstIdxMonotonousOrArrLen(findMatches.map((match) => match.range), (range) => Range.compareRangesUsingStarts(range, editorSelection) >= 0);
            currentMatchesPosition =
                matchAfterSelection > 0
                    ? matchAfterSelection - 1 + 1 /** match position is one based */
                    : currentMatchesPosition;
        }
        this._state.changeMatchInfo(currentMatchesPosition, this._decorations.getCount(), undefined);
        if (moveCursor && this._editor.getOption(43 /* EditorOption.find */).cursorMoveOnType) {
            this._moveToNextMatch(this._decorations.getStartPosition());
        }
    }
    _hasMatches() {
        return this._state.matchesCount > 0;
    }
    _cannotFind() {
        if (!this._hasMatches()) {
            const findScope = this._decorations.getFindScope();
            if (findScope) {
                // Reveal the selection so user is reminded that 'selection find' is on.
                this._editor.revealRangeInCenterIfOutsideViewport(findScope, 0 /* ScrollType.Smooth */);
            }
            return true;
        }
        return false;
    }
    _setCurrentFindMatch(match) {
        const matchesPosition = this._decorations.setCurrentFindMatch(match);
        this._state.changeMatchInfo(matchesPosition, this._decorations.getCount(), match);
        this._editor.setSelection(match);
        this._editor.revealRangeInCenterIfOutsideViewport(match, 0 /* ScrollType.Smooth */);
    }
    _prevSearchPosition(before) {
        const isUsingLineStops = this._state.isRegex &&
            (this._state.searchString.indexOf('^') >= 0 || this._state.searchString.indexOf('$') >= 0);
        let { lineNumber, column } = before;
        const model = this._editor.getModel();
        if (isUsingLineStops || column === 1) {
            if (lineNumber === 1) {
                lineNumber = model.getLineCount();
            }
            else {
                lineNumber--;
            }
            column = model.getLineMaxColumn(lineNumber);
        }
        else {
            column--;
        }
        return new Position(lineNumber, column);
    }
    _moveToPrevMatch(before, isRecursed = false) {
        if (!this._state.canNavigateBack()) {
            // we are beyond the first matched find result
            // instead of doing nothing, we should refocus the first item
            const nextMatchRange = this._decorations.matchAfterPosition(before);
            if (nextMatchRange) {
                this._setCurrentFindMatch(nextMatchRange);
            }
            return;
        }
        if (this._decorations.getCount() < MATCHES_LIMIT) {
            let prevMatchRange = this._decorations.matchBeforePosition(before);
            if (prevMatchRange &&
                prevMatchRange.isEmpty() &&
                prevMatchRange.getStartPosition().equals(before)) {
                before = this._prevSearchPosition(before);
                prevMatchRange = this._decorations.matchBeforePosition(before);
            }
            if (prevMatchRange) {
                this._setCurrentFindMatch(prevMatchRange);
            }
            return;
        }
        if (this._cannotFind()) {
            return;
        }
        const findScope = this._decorations.getFindScope();
        const searchRange = FindModelBoundToEditorModel._getSearchRange(this._editor.getModel(), findScope);
        // ...(----)...|...
        if (searchRange.getEndPosition().isBefore(before)) {
            before = searchRange.getEndPosition();
        }
        // ...|...(----)...
        if (before.isBefore(searchRange.getStartPosition())) {
            before = searchRange.getEndPosition();
        }
        const { lineNumber, column } = before;
        const model = this._editor.getModel();
        let position = new Position(lineNumber, column);
        let prevMatch = model.findPreviousMatch(this._state.searchString, position, this._state.isRegex, this._state.matchCase, this._state.wholeWord ? this._editor.getOption(136 /* EditorOption.wordSeparators */) : null, false);
        if (prevMatch &&
            prevMatch.range.isEmpty() &&
            prevMatch.range.getStartPosition().equals(position)) {
            // Looks like we're stuck at this position, unacceptable!
            position = this._prevSearchPosition(position);
            prevMatch = model.findPreviousMatch(this._state.searchString, position, this._state.isRegex, this._state.matchCase, this._state.wholeWord ? this._editor.getOption(136 /* EditorOption.wordSeparators */) : null, false);
        }
        if (!prevMatch) {
            // there is precisely one match and selection is on top of it
            return;
        }
        if (!isRecursed && !searchRange.containsRange(prevMatch.range)) {
            return this._moveToPrevMatch(prevMatch.range.getStartPosition(), true);
        }
        this._setCurrentFindMatch(prevMatch.range);
    }
    moveToPrevMatch() {
        this._moveToPrevMatch(this._editor.getSelection().getStartPosition());
    }
    _nextSearchPosition(after) {
        const isUsingLineStops = this._state.isRegex &&
            (this._state.searchString.indexOf('^') >= 0 || this._state.searchString.indexOf('$') >= 0);
        let { lineNumber, column } = after;
        const model = this._editor.getModel();
        if (isUsingLineStops || column === model.getLineMaxColumn(lineNumber)) {
            if (lineNumber === model.getLineCount()) {
                lineNumber = 1;
            }
            else {
                lineNumber++;
            }
            column = 1;
        }
        else {
            column++;
        }
        return new Position(lineNumber, column);
    }
    _moveToNextMatch(after) {
        if (!this._state.canNavigateForward()) {
            // we are beyond the last matched find result
            // instead of doing nothing, we should refocus the last item
            const prevMatchRange = this._decorations.matchBeforePosition(after);
            if (prevMatchRange) {
                this._setCurrentFindMatch(prevMatchRange);
            }
            return;
        }
        if (this._decorations.getCount() < MATCHES_LIMIT) {
            let nextMatchRange = this._decorations.matchAfterPosition(after);
            if (nextMatchRange &&
                nextMatchRange.isEmpty() &&
                nextMatchRange.getStartPosition().equals(after)) {
                // Looks like we're stuck at this position, unacceptable!
                after = this._nextSearchPosition(after);
                nextMatchRange = this._decorations.matchAfterPosition(after);
            }
            if (nextMatchRange) {
                this._setCurrentFindMatch(nextMatchRange);
            }
            return;
        }
        const nextMatch = this._getNextMatch(after, false, true);
        if (nextMatch) {
            this._setCurrentFindMatch(nextMatch.range);
        }
    }
    _getNextMatch(after, captureMatches, forceMove, isRecursed = false) {
        if (this._cannotFind()) {
            return null;
        }
        const findScope = this._decorations.getFindScope();
        const searchRange = FindModelBoundToEditorModel._getSearchRange(this._editor.getModel(), findScope);
        // ...(----)...|...
        if (searchRange.getEndPosition().isBefore(after)) {
            after = searchRange.getStartPosition();
        }
        // ...|...(----)...
        if (after.isBefore(searchRange.getStartPosition())) {
            after = searchRange.getStartPosition();
        }
        const { lineNumber, column } = after;
        const model = this._editor.getModel();
        let position = new Position(lineNumber, column);
        let nextMatch = model.findNextMatch(this._state.searchString, position, this._state.isRegex, this._state.matchCase, this._state.wholeWord ? this._editor.getOption(136 /* EditorOption.wordSeparators */) : null, captureMatches);
        if (forceMove &&
            nextMatch &&
            nextMatch.range.isEmpty() &&
            nextMatch.range.getStartPosition().equals(position)) {
            // Looks like we're stuck at this position, unacceptable!
            position = this._nextSearchPosition(position);
            nextMatch = model.findNextMatch(this._state.searchString, position, this._state.isRegex, this._state.matchCase, this._state.wholeWord ? this._editor.getOption(136 /* EditorOption.wordSeparators */) : null, captureMatches);
        }
        if (!nextMatch) {
            // there is precisely one match and selection is on top of it
            return null;
        }
        if (!isRecursed && !searchRange.containsRange(nextMatch.range)) {
            return this._getNextMatch(nextMatch.range.getEndPosition(), captureMatches, forceMove, true);
        }
        return nextMatch;
    }
    moveToNextMatch() {
        this._moveToNextMatch(this._editor.getSelection().getEndPosition());
    }
    _moveToMatch(index) {
        const decorationRange = this._decorations.getDecorationRangeAt(index);
        if (decorationRange) {
            this._setCurrentFindMatch(decorationRange);
        }
    }
    moveToMatch(index) {
        this._moveToMatch(index);
    }
    _getReplacePattern() {
        if (this._state.isRegex) {
            return parseReplaceString(this._state.replaceString);
        }
        return ReplacePattern.fromStaticValue(this._state.replaceString);
    }
    replace() {
        if (!this._hasMatches()) {
            return;
        }
        const replacePattern = this._getReplacePattern();
        const selection = this._editor.getSelection();
        const nextMatch = this._getNextMatch(selection.getStartPosition(), true, false);
        if (nextMatch) {
            if (selection.equalsRange(nextMatch.range)) {
                // selection sits on a find match => replace it!
                const replaceString = replacePattern.buildReplaceString(nextMatch.matches, this._state.preserveCase);
                const command = new ReplaceCommand(selection, replaceString);
                this._executeEditorCommand('replace', command);
                this._decorations.setStartPosition(new Position(selection.startLineNumber, selection.startColumn + replaceString.length));
                this.research(true);
            }
            else {
                this._decorations.setStartPosition(this._editor.getPosition());
                this._setCurrentFindMatch(nextMatch.range);
            }
        }
    }
    _findMatches(findScopes, captureMatches, limitResultCount) {
        const searchRanges = (findScopes || [null]).map((scope) => FindModelBoundToEditorModel._getSearchRange(this._editor.getModel(), scope));
        return this._editor
            .getModel()
            .findMatches(this._state.searchString, searchRanges, this._state.isRegex, this._state.matchCase, this._state.wholeWord ? this._editor.getOption(136 /* EditorOption.wordSeparators */) : null, captureMatches, limitResultCount);
    }
    replaceAll() {
        if (!this._hasMatches()) {
            return;
        }
        const findScopes = this._decorations.getFindScopes();
        if (findScopes === null && this._state.matchesCount >= MATCHES_LIMIT) {
            // Doing a replace on the entire file that is over ${MATCHES_LIMIT} matches
            this._largeReplaceAll();
        }
        else {
            this._regularReplaceAll(findScopes);
        }
        this.research(false);
    }
    _largeReplaceAll() {
        const searchParams = new SearchParams(this._state.searchString, this._state.isRegex, this._state.matchCase, this._state.wholeWord ? this._editor.getOption(136 /* EditorOption.wordSeparators */) : null);
        const searchData = searchParams.parseSearchRequest();
        if (!searchData) {
            return;
        }
        let searchRegex = searchData.regex;
        if (!searchRegex.multiline) {
            let mod = 'mu';
            if (searchRegex.ignoreCase) {
                mod += 'i';
            }
            if (searchRegex.global) {
                mod += 'g';
            }
            searchRegex = new RegExp(searchRegex.source, mod);
        }
        const model = this._editor.getModel();
        const modelText = model.getValue(1 /* EndOfLinePreference.LF */);
        const fullModelRange = model.getFullModelRange();
        const replacePattern = this._getReplacePattern();
        let resultText;
        const preserveCase = this._state.preserveCase;
        if (replacePattern.hasReplacementPatterns || preserveCase) {
            resultText = modelText.replace(searchRegex, function () {
                return replacePattern.buildReplaceString(arguments, preserveCase);
            });
        }
        else {
            resultText = modelText.replace(searchRegex, replacePattern.buildReplaceString(null, preserveCase));
        }
        const command = new ReplaceCommandThatPreservesSelection(fullModelRange, resultText, this._editor.getSelection());
        this._executeEditorCommand('replaceAll', command);
    }
    _regularReplaceAll(findScopes) {
        const replacePattern = this._getReplacePattern();
        // Get all the ranges (even more than the highlighted ones)
        const matches = this._findMatches(findScopes, replacePattern.hasReplacementPatterns || this._state.preserveCase, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
        const replaceStrings = [];
        for (let i = 0, len = matches.length; i < len; i++) {
            replaceStrings[i] = replacePattern.buildReplaceString(matches[i].matches, this._state.preserveCase);
        }
        const command = new ReplaceAllCommand(this._editor.getSelection(), matches.map((m) => m.range), replaceStrings);
        this._executeEditorCommand('replaceAll', command);
    }
    selectAllMatches() {
        if (!this._hasMatches()) {
            return;
        }
        const findScopes = this._decorations.getFindScopes();
        // Get all the ranges (even more than the highlighted ones)
        const matches = this._findMatches(findScopes, false, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
        let selections = matches.map((m) => new Selection(m.range.startLineNumber, m.range.startColumn, m.range.endLineNumber, m.range.endColumn));
        // If one of the ranges is the editor selection, then maintain it as primary
        const editorSelection = this._editor.getSelection();
        for (let i = 0, len = selections.length; i < len; i++) {
            const sel = selections[i];
            if (sel.equalsRange(editorSelection)) {
                selections = [editorSelection]
                    .concat(selections.slice(0, i))
                    .concat(selections.slice(i + 1));
                break;
            }
        }
        this._editor.setSelections(selections);
    }
    _executeEditorCommand(source, command) {
        try {
            this._ignoreModelContentChanged = true;
            this._editor.pushUndoStop();
            this._editor.executeCommand(source, command);
            this._editor.pushUndoStop();
        }
        finally {
            this._ignoreModelContentChanged = false;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZmluZC9icm93c2VyL2ZpbmRNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN0RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUcvRSxPQUFPLEVBQ04sY0FBYyxFQUNkLG9DQUFvQyxHQUNwQyxNQUFNLDRDQUE0QyxDQUFBO0FBR25ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFFdEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDMUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUdwRixNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxtQkFBbUIsRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUNqRyxNQUFNLENBQUMsTUFBTSwrQkFBK0IsR0FBRywyQkFBMkIsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtBQUN0Riw4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