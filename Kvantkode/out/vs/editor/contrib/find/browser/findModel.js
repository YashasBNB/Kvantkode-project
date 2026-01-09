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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9maW5kL2Jyb3dzZXIvZmluZE1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRy9FLE9BQU8sRUFDTixjQUFjLEVBQ2Qsb0NBQW9DLEdBQ3BDLE1BQU0sNENBQTRDLENBQUE7QUFHbkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFHN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUV0RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDeEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBR3BGLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLElBQUksYUFBYSxDQUFVLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxDQUFBO0FBQ2pHLE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLDJCQUEyQixDQUFDLFNBQVMsRUFBRSxDQUFBO0FBQ3RGLDhEQUE4RDtBQUM5RCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxtQkFBbUIsRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUNoRyxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxJQUFJLGFBQWEsQ0FDN0Qsc0JBQXNCLEVBQ3RCLEtBQUssQ0FDTCxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQWlCO0lBQzFELE9BQU8sRUFBRSw0Q0FBeUI7SUFDbEMsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLGdEQUEyQix3QkFBZSxFQUFFO0NBQzVELENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBaUI7SUFDdEQsT0FBTyxFQUFFLDRDQUF5QjtJQUNsQyxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsZ0RBQTJCLHdCQUFlLEVBQUU7Q0FDNUQsQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFpQjtJQUNsRCxPQUFPLEVBQUUsNENBQXlCO0lBQ2xDLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxnREFBMkIsd0JBQWUsRUFBRTtDQUM1RCxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQWlCO0lBQ3hELE9BQU8sRUFBRSw0Q0FBeUI7SUFDbEMsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLGdEQUEyQix3QkFBZSxFQUFFO0NBQzVELENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBaUI7SUFDekQsT0FBTyxFQUFFLDRDQUF5QjtJQUNsQyxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsZ0RBQTJCLHdCQUFlLEVBQUU7Q0FDNUQsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBRztJQUN2QixlQUFlLEVBQUUsY0FBYztJQUMvQixzQkFBc0IsRUFBRSwyQkFBMkI7SUFDbkQsaUJBQWlCLEVBQUUsNkJBQTZCO0lBQ2hELG1CQUFtQixFQUFFLG1DQUFtQztJQUN4RCx1QkFBdUIsRUFBRSx1Q0FBdUM7SUFDaEUsbUJBQW1CLEVBQUUsbUNBQW1DO0lBQ3hELDRCQUE0QixFQUFFLDRDQUE0QztJQUMxRSxnQ0FBZ0MsRUFBRSxnREFBZ0Q7SUFDbEYsc0JBQXNCLEVBQUUsc0NBQXNDO0lBQzlELHNCQUFzQixFQUFFLGlCQUFpQjtJQUN6QywwQkFBMEIsRUFBRSx5QkFBeUI7SUFDckQsc0JBQXNCLEVBQUUscUJBQXFCO0lBQzdDLGtCQUFrQixFQUFFLGlCQUFpQjtJQUNyQyx3QkFBd0IsRUFBRSx1QkFBdUI7SUFDakQseUJBQXlCLEVBQUUsb0JBQW9CO0lBQy9DLGdCQUFnQixFQUFFLDBCQUEwQjtJQUM1QyxnQkFBZ0IsRUFBRSwwQkFBMEI7SUFDNUMsc0JBQXNCLEVBQUUsZ0NBQWdDO0NBQ3hELENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFBO0FBQ2xDLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQTtBQUUxQixNQUFNLE9BQU8sMkJBQTJCO0lBV3ZDLFlBQVksTUFBeUIsRUFBRSxLQUF1QjtRQVI3QyxlQUFVLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQVNsRCxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUNyQixJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQTtRQUNuQixJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQTtRQUN4QixJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQTtRQUU5QyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQy9DLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUV0QyxJQUFJLENBQUMsMkJBQTJCLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUU7WUFDNUQsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztnQkFDOUIsT0FBTTtZQUNQLENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDNUIsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ1AsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUE7UUFFckQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUE4QixFQUFFLEVBQUU7WUFDekUsSUFDQyxDQUFDLENBQUMsTUFBTSx3Q0FBZ0M7Z0JBQ3hDLENBQUMsQ0FBQyxNQUFNLG9DQUE0QjtnQkFDcEMsQ0FBQyxDQUFDLE1BQU0sb0NBQTRCLEVBQ25DLENBQUM7Z0JBQ0YsSUFBSSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7WUFDL0QsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsMEJBQTBCLEdBQUcsS0FBSyxDQUFBO1FBQ3ZDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDMUMsSUFBSSxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztnQkFDckMsT0FBTTtZQUNQLENBQUM7WUFDRCxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZixnQ0FBZ0M7Z0JBQ2hDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDMUIsQ0FBQztZQUNELElBQUksQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFBO1lBQzlELElBQUksQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUM1QyxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFekYsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0lBRU0sT0FBTztRQUNiLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFBO1FBQ3ZCLE9BQU8sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUNsQyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQzFCLENBQUM7SUFFTyxlQUFlLENBQUMsQ0FBK0I7UUFDdEQsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEIsK0RBQStEO1lBQy9ELE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUM5Qiw4Q0FBOEM7WUFDOUMsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUNDLENBQUMsQ0FBQyxZQUFZO1lBQ2QsQ0FBQyxDQUFDLGlCQUFpQjtZQUNuQixDQUFDLENBQUMsT0FBTztZQUNULENBQUMsQ0FBQyxTQUFTO1lBQ1gsQ0FBQyxDQUFDLFNBQVM7WUFDWCxDQUFDLENBQUMsV0FBVyxFQUNaLENBQUM7WUFDRixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBRXJDLElBQUksS0FBSyxDQUFDLG9CQUFvQixFQUFFLEVBQUUsQ0FBQztnQkFDbEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxDQUFBO2dCQUVsQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRTtvQkFDMUMsSUFBSSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7d0JBQ25CLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFBO29CQUNyRCxDQUFDO3lCQUFNLENBQUM7d0JBQ1AsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUE7b0JBQzVCLENBQUM7Z0JBQ0YsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1lBQ25CLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDbkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUE7Z0JBQ3JELENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDNUIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBaUIsRUFBRSxTQUF1QjtRQUN4RSxtRkFBbUY7UUFDbkYsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ2pDLENBQUM7SUFFTyxRQUFRLENBQUMsVUFBbUIsRUFBRSxZQUFxQztRQUMxRSxJQUFJLFVBQVUsR0FBbUIsSUFBSSxDQUFBO1FBQ3JDLElBQUksT0FBTyxZQUFZLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDekMsSUFBSSxZQUFZLEtBQUssSUFBSSxFQUFFLENBQUM7Z0JBQzNCLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7b0JBQ2xDLFVBQVUsR0FBRyxDQUFDLFlBQXFCLENBQUMsQ0FBQTtnQkFDckMsQ0FBQztxQkFBTSxDQUFDO29CQUNQLFVBQVUsR0FBRyxZQUFZLENBQUE7Z0JBQzFCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxVQUFVLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUMvQyxDQUFDO1FBQ0QsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDekIsVUFBVSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtnQkFDekMsSUFBSSxTQUFTLENBQUMsZUFBZSxLQUFLLFNBQVMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDM0QsSUFBSSxhQUFhLEdBQUcsU0FBUyxDQUFDLGFBQWEsQ0FBQTtvQkFFM0MsSUFBSSxTQUFTLENBQUMsU0FBUyxLQUFLLENBQUMsRUFBRSxDQUFDO3dCQUMvQixhQUFhLEdBQUcsYUFBYSxHQUFHLENBQUMsQ0FBQTtvQkFDbEMsQ0FBQztvQkFFRCxPQUFPLElBQUksS0FBSyxDQUNmLFNBQVMsQ0FBQyxlQUFlLEVBQ3pCLENBQUMsRUFDRCxhQUFhLEVBQ2IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FDdkQsQ0FBQTtnQkFDRixDQUFDO2dCQUNELE9BQU8sU0FBUyxDQUFBO1lBQ2pCLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUN2RSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFFOUMsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNuRCxJQUFJLHNCQUFzQixHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMseUJBQXlCLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDekYsSUFBSSxzQkFBc0IsS0FBSyxDQUFDLElBQUksV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM1RCw2Q0FBNkM7WUFDN0MsOERBQThEO1lBQzlELE1BQU0sbUJBQW1CLEdBQUcsOEJBQThCLENBQ3pELFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFDdkMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUN0RSxDQUFBO1lBQ0Qsc0JBQXNCO2dCQUNyQixtQkFBbUIsR0FBRyxDQUFDO29CQUN0QixDQUFDLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxrQ0FBa0M7b0JBQ2hFLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQTtRQUMzQixDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUU1RixJQUFJLFVBQVUsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsNEJBQW1CLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUM5RSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUE7UUFDNUQsQ0FBQztJQUNGLENBQUM7SUFFTyxXQUFXO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFTyxXQUFXO1FBQ2xCLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztZQUN6QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFBO1lBQ2xELElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2Ysd0VBQXdFO2dCQUN4RSxJQUFJLENBQUMsT0FBTyxDQUFDLG9DQUFvQyxDQUFDLFNBQVMsNEJBQW9CLENBQUE7WUFDaEYsQ0FBQztZQUNELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVPLG9CQUFvQixDQUFDLEtBQVk7UUFDeEMsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNwRSxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVqRixJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNoQyxJQUFJLENBQUMsT0FBTyxDQUFDLG9DQUFvQyxDQUFDLEtBQUssNEJBQW9CLENBQUE7SUFDNUUsQ0FBQztJQUVPLG1CQUFtQixDQUFDLE1BQWdCO1FBQzNDLE1BQU0sZ0JBQWdCLEdBQ3JCLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTztZQUNuQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQzNGLElBQUksRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFBO1FBQ25DLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUE7UUFFckMsSUFBSSxnQkFBZ0IsSUFBSSxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdEMsSUFBSSxVQUFVLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3RCLFVBQVUsR0FBRyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUE7WUFDbEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFVBQVUsRUFBRSxDQUFBO1lBQ2IsQ0FBQztZQUNELE1BQU0sR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDNUMsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLEVBQUUsQ0FBQTtRQUNULENBQUM7UUFFRCxPQUFPLElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0lBRU8sZ0JBQWdCLENBQUMsTUFBZ0IsRUFBRSxhQUFzQixLQUFLO1FBQ3JFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUM7WUFDcEMsOENBQThDO1lBQzlDLDZEQUE2RDtZQUM3RCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRW5FLElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ3BCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsQ0FBQTtZQUMxQyxDQUFDO1lBQ0QsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEdBQUcsYUFBYSxFQUFFLENBQUM7WUFDbEQsSUFBSSxjQUFjLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUVsRSxJQUNDLGNBQWM7Z0JBQ2QsY0FBYyxDQUFDLE9BQU8sRUFBRTtnQkFDeEIsY0FBYyxDQUFDLGdCQUFnQixFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUMvQyxDQUFDO2dCQUNGLE1BQU0sR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ3pDLGNBQWMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQy9ELENBQUM7WUFFRCxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNwQixJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDMUMsQ0FBQztZQUVELE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztZQUN4QixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDbEQsTUFBTSxXQUFXLEdBQUcsMkJBQTJCLENBQUMsZUFBZSxDQUM5RCxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUN2QixTQUFTLENBQ1QsQ0FBQTtRQUVELG1CQUFtQjtRQUNuQixJQUFJLFdBQVcsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNuRCxNQUFNLEdBQUcsV0FBVyxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ3RDLENBQUM7UUFFRCxtQkFBbUI7UUFDbkIsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNyRCxNQUFNLEdBQUcsV0FBVyxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ3RDLENBQUM7UUFFRCxNQUFNLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQTtRQUNyQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBRXJDLElBQUksUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUUvQyxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQ3RDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUN4QixRQUFRLEVBQ1IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQ25CLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUNyQixJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLHVDQUE2QixDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQ2xGLEtBQUssQ0FDTCxDQUFBO1FBRUQsSUFDQyxTQUFTO1lBQ1QsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUU7WUFDekIsU0FBUyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFDbEQsQ0FBQztZQUNGLHlEQUF5RDtZQUN6RCxRQUFRLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzdDLFNBQVMsR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQ2xDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUN4QixRQUFRLEVBQ1IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQ25CLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUNyQixJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLHVDQUE2QixDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQ2xGLEtBQUssQ0FDTCxDQUFBO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQiw2REFBNkQ7WUFDN0QsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNoRSxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdkUsQ0FBQztRQUVELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVNLGVBQWU7UUFDckIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFBO0lBQ3RFLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxLQUFlO1FBQzFDLE1BQU0sZ0JBQWdCLEdBQ3JCLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTztZQUNuQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBRTNGLElBQUksRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFBO1FBQ2xDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUE7UUFFckMsSUFBSSxnQkFBZ0IsSUFBSSxNQUFNLEtBQUssS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDdkUsSUFBSSxVQUFVLEtBQUssS0FBSyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7Z0JBQ3pDLFVBQVUsR0FBRyxDQUFDLENBQUE7WUFDZixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsVUFBVSxFQUFFLENBQUE7WUFDYixDQUFDO1lBQ0QsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUNYLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxFQUFFLENBQUE7UUFDVCxDQUFDO1FBRUQsT0FBTyxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDeEMsQ0FBQztJQUVPLGdCQUFnQixDQUFDLEtBQWU7UUFDdkMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDO1lBQ3ZDLDZDQUE2QztZQUM3Qyw0REFBNEQ7WUFDNUQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUVuRSxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNwQixJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDMUMsQ0FBQztZQUNELE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxHQUFHLGFBQWEsRUFBRSxDQUFDO1lBQ2xELElBQUksY0FBYyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFFaEUsSUFDQyxjQUFjO2dCQUNkLGNBQWMsQ0FBQyxPQUFPLEVBQUU7Z0JBQ3hCLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFDOUMsQ0FBQztnQkFDRix5REFBeUQ7Z0JBQ3pELEtBQUssR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ3ZDLGNBQWMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQzdELENBQUM7WUFDRCxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNwQixJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDMUMsQ0FBQztZQUVELE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3hELElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzNDLENBQUM7SUFDRixDQUFDO0lBRU8sYUFBYSxDQUNwQixLQUFlLEVBQ2YsY0FBdUIsRUFDdkIsU0FBa0IsRUFDbEIsYUFBc0IsS0FBSztRQUUzQixJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDbEQsTUFBTSxXQUFXLEdBQUcsMkJBQTJCLENBQUMsZUFBZSxDQUM5RCxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUN2QixTQUFTLENBQ1QsQ0FBQTtRQUVELG1CQUFtQjtRQUNuQixJQUFJLFdBQVcsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNsRCxLQUFLLEdBQUcsV0FBVyxDQUFDLGdCQUFnQixFQUFFLENBQUE7UUFDdkMsQ0FBQztRQUVELG1CQUFtQjtRQUNuQixJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ3BELEtBQUssR0FBRyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUN2QyxDQUFDO1FBRUQsTUFBTSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsR0FBRyxLQUFLLENBQUE7UUFDcEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUVyQyxJQUFJLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFL0MsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FDbEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQ3hCLFFBQVEsRUFDUixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFDbkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQ3JCLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsdUNBQTZCLENBQUMsQ0FBQyxDQUFDLElBQUksRUFDbEYsY0FBYyxDQUNkLENBQUE7UUFFRCxJQUNDLFNBQVM7WUFDVCxTQUFTO1lBQ1QsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUU7WUFDekIsU0FBUyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFDbEQsQ0FBQztZQUNGLHlEQUF5RDtZQUN6RCxRQUFRLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzdDLFNBQVMsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUM5QixJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksRUFDeEIsUUFBUSxFQUNSLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUNuQixJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFDckIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyx1Q0FBNkIsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUNsRixjQUFjLENBQ2QsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsNkRBQTZEO1lBQzdELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2hFLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxFQUFFLGNBQWMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0YsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTSxlQUFlO1FBQ3JCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUE7SUFDcEUsQ0FBQztJQUVPLFlBQVksQ0FBQyxLQUFhO1FBQ2pDLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDckUsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsb0JBQW9CLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDM0MsQ0FBQztJQUNGLENBQUM7SUFFTSxXQUFXLENBQUMsS0FBYTtRQUMvQixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3pCLENBQUM7SUFFTyxrQkFBa0I7UUFDekIsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3pCLE9BQU8sa0JBQWtCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNyRCxDQUFDO1FBQ0QsT0FBTyxjQUFjLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDakUsQ0FBQztJQUVNLE9BQU87UUFDYixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUM7WUFDekIsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtRQUNoRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQzdDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLGdCQUFnQixFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQy9FLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixJQUFJLFNBQVMsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzVDLGdEQUFnRDtnQkFDaEQsTUFBTSxhQUFhLEdBQUcsY0FBYyxDQUFDLGtCQUFrQixDQUN0RCxTQUFTLENBQUMsT0FBTyxFQUNqQixJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FDeEIsQ0FBQTtnQkFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLGNBQWMsQ0FBQyxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUE7Z0JBRTVELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUE7Z0JBRTlDLElBQUksQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQ2pDLElBQUksUUFBUSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsU0FBUyxDQUFDLFdBQVcsR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQ3JGLENBQUE7Z0JBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNwQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7Z0JBQzlELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDM0MsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sWUFBWSxDQUNuQixVQUEwQixFQUMxQixjQUF1QixFQUN2QixnQkFBd0I7UUFFeEIsTUFBTSxZQUFZLEdBQUcsQ0FBRSxVQUFpQixJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFtQixFQUFFLEVBQUUsQ0FDL0UsMkJBQTJCLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQzNFLENBQUE7UUFFRCxPQUFPLElBQUksQ0FBQyxPQUFPO2FBQ2pCLFFBQVEsRUFBRTthQUNWLFdBQVcsQ0FDWCxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksRUFDeEIsWUFBWSxFQUNaLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUNuQixJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFDckIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyx1Q0FBNkIsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUNsRixjQUFjLEVBQ2QsZ0JBQWdCLENBQ2hCLENBQUE7SUFDSCxDQUFDO0lBRU0sVUFBVTtRQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUM7WUFDekIsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBRXBELElBQUksVUFBVSxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUN0RSwyRUFBMkU7WUFDM0UsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUE7UUFDeEIsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDcEMsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDckIsQ0FBQztJQUVPLGdCQUFnQjtRQUN2QixNQUFNLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FDcEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQ3hCLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUNuQixJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFDckIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyx1Q0FBNkIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUNsRixDQUFBO1FBQ0QsTUFBTSxVQUFVLEdBQUcsWUFBWSxDQUFDLGtCQUFrQixFQUFFLENBQUE7UUFDcEQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxXQUFXLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQTtRQUNsQyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzVCLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQTtZQUNkLElBQUksV0FBVyxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUM1QixHQUFHLElBQUksR0FBRyxDQUFBO1lBQ1gsQ0FBQztZQUNELElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUN4QixHQUFHLElBQUksR0FBRyxDQUFBO1lBQ1gsQ0FBQztZQUNELFdBQVcsR0FBRyxJQUFJLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ2xELENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3JDLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixDQUFBO1FBQ3hELE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBRWhELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO1FBQ2hELElBQUksVUFBa0IsQ0FBQTtRQUN0QixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQTtRQUU3QyxJQUFJLGNBQWMsQ0FBQyxzQkFBc0IsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUMzRCxVQUFVLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUU7Z0JBQzNDLE9BQU8sY0FBYyxDQUFDLGtCQUFrQixDQUFpQixTQUFVLEVBQUUsWUFBWSxDQUFDLENBQUE7WUFDbkYsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO2FBQU0sQ0FBQztZQUNQLFVBQVUsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUM3QixXQUFXLEVBQ1gsY0FBYyxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FDckQsQ0FBQTtRQUNGLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLG9DQUFvQyxDQUN2RCxjQUFjLEVBQ2QsVUFBVSxFQUNWLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQzNCLENBQUE7UUFDRCxJQUFJLENBQUMscUJBQXFCLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxVQUEwQjtRQUNwRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtRQUNoRCwyREFBMkQ7UUFDM0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FDaEMsVUFBVSxFQUNWLGNBQWMsQ0FBQyxzQkFBc0IsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksb0RBRWpFLENBQUE7UUFFRCxNQUFNLGNBQWMsR0FBYSxFQUFFLENBQUE7UUFDbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3BELGNBQWMsQ0FBQyxDQUFDLENBQUMsR0FBRyxjQUFjLENBQUMsa0JBQWtCLENBQ3BELE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQ2xCLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUN4QixDQUFBO1FBQ0YsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksaUJBQWlCLENBQ3BDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLEVBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFDM0IsY0FBYyxDQUNkLENBQUE7UUFDRCxJQUFJLENBQUMscUJBQXFCLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFFTSxnQkFBZ0I7UUFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO1lBQ3pCLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUVwRCwyREFBMkQ7UUFDM0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsS0FBSyxvREFBbUMsQ0FBQTtRQUN0RixJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUMzQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQ0wsSUFBSSxTQUFTLENBQ1osQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQ3ZCLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUNuQixDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFDckIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQ2pCLENBQ0YsQ0FBQTtRQUVELDRFQUE0RTtRQUM1RSxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ25ELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN2RCxNQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDekIsSUFBSSxHQUFHLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RDLFVBQVUsR0FBRyxDQUFDLGVBQWUsQ0FBQztxQkFDNUIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO3FCQUM5QixNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDakMsTUFBSztZQUNOLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVPLHFCQUFxQixDQUFDLE1BQWMsRUFBRSxPQUFpQjtRQUM5RCxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsMEJBQTBCLEdBQUcsSUFBSSxDQUFBO1lBQ3RDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUE7WUFDM0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQzVDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDNUIsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsSUFBSSxDQUFDLDBCQUEwQixHQUFHLEtBQUssQ0FBQTtRQUN4QyxDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=