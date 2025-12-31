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
import { findFirstIdxMonotonousOrArrLen } from '../../../../../../base/common/arraysFind.js';
import { createCancelablePromise, Delayer, } from '../../../../../../base/common/async.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { PrefixSumComputer } from '../../../../../../editor/common/model/prefixSumComputer.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { FindMatchDecorationModel } from './findMatchDecorationModel.js';
import { CellEditState, } from '../../notebookBrowser.js';
import { CellKind, NotebookCellsChangeType, } from '../../../common/notebookCommon.js';
export class CellFindMatchModel {
    get length() {
        return this._contentMatches.length + this._webviewMatches.length;
    }
    get contentMatches() {
        return this._contentMatches;
    }
    get webviewMatches() {
        return this._webviewMatches;
    }
    constructor(cell, index, contentMatches, webviewMatches) {
        this.cell = cell;
        this.index = index;
        this._contentMatches = contentMatches;
        this._webviewMatches = webviewMatches;
    }
    getMatch(index) {
        if (index >= this.length) {
            throw new Error('NotebookCellFindMatch: index out of range');
        }
        if (index < this._contentMatches.length) {
            return this._contentMatches[index];
        }
        return this._webviewMatches[index - this._contentMatches.length];
    }
}
let FindModel = class FindModel extends Disposable {
    get findMatches() {
        return this._findMatches;
    }
    get currentMatch() {
        return this._currentMatch;
    }
    constructor(_notebookEditor, _state, _configurationService) {
        super();
        this._notebookEditor = _notebookEditor;
        this._state = _state;
        this._configurationService = _configurationService;
        this._findMatches = [];
        this._findMatchesStarts = null;
        this._currentMatch = -1;
        this._computePromise = null;
        this._modelDisposable = this._register(new DisposableStore());
        this._throttledDelayer = new Delayer(20);
        this._computePromise = null;
        this._register(_state.onFindReplaceStateChange((e) => {
            this._updateCellStates(e);
            if (e.searchString ||
                e.isRegex ||
                e.matchCase ||
                e.searchScope ||
                e.wholeWord ||
                (e.isRevealed && this._state.isRevealed) ||
                e.filters ||
                e.isReplaceRevealed) {
                this.research();
            }
            if (e.isRevealed && !this._state.isRevealed) {
                this.clear();
            }
        }));
        this._register(this._notebookEditor.onDidChangeModel((e) => {
            this._registerModelListener(e);
        }));
        this._register(this._notebookEditor.onDidChangeCellState((e) => {
            if (e.cell.cellKind === CellKind.Markup && e.source.editStateChanged) {
                // research when markdown cell is switching between markdown preview and editing mode.
                this.research();
            }
        }));
        if (this._notebookEditor.hasModel()) {
            this._registerModelListener(this._notebookEditor.textModel);
        }
        this._findMatchDecorationModel = new FindMatchDecorationModel(this._notebookEditor, this._notebookEditor.getId());
    }
    _updateCellStates(e) {
        if (!this._state.filters?.markupInput ||
            !this._state.filters?.markupPreview ||
            !this._state.filters?.findScope) {
            return;
        }
        // we only update cell state if users are using the hybrid mode (both input and preview are enabled)
        const updateEditingState = () => {
            const viewModel = this._notebookEditor.getViewModel();
            if (!viewModel) {
                return;
            }
            // search markup sources first to decide if a markup cell should be in editing mode
            const wordSeparators = this._configurationService.inspect('editor.wordSeparators').value;
            const options = {
                regex: this._state.isRegex,
                wholeWord: this._state.wholeWord,
                caseSensitive: this._state.matchCase,
                wordSeparators: wordSeparators,
                includeMarkupInput: true,
                includeCodeInput: false,
                includeMarkupPreview: false,
                includeOutput: false,
                findScope: this._state.filters?.findScope,
            };
            const contentMatches = viewModel.find(this._state.searchString, options);
            for (let i = 0; i < viewModel.length; i++) {
                const cell = viewModel.cellAt(i);
                if (cell && cell.cellKind === CellKind.Markup) {
                    const foundContentMatch = contentMatches.find((m) => m.cell.handle === cell.handle && m.contentMatches.length > 0);
                    const targetState = foundContentMatch ? CellEditState.Editing : CellEditState.Preview;
                    const currentEditingState = cell.getEditState();
                    if (currentEditingState === CellEditState.Editing && cell.editStateSource !== 'find') {
                        // it's already in editing mode, we should not update
                        continue;
                    }
                    if (currentEditingState !== targetState) {
                        cell.updateEditState(targetState, 'find');
                    }
                }
            }
        };
        if (e.isReplaceRevealed && !this._state.isReplaceRevealed) {
            // replace is hidden, we need to switch all markdown cells to preview mode
            const viewModel = this._notebookEditor.getViewModel();
            if (!viewModel) {
                return;
            }
            for (let i = 0; i < viewModel.length; i++) {
                const cell = viewModel.cellAt(i);
                if (cell && cell.cellKind === CellKind.Markup) {
                    if (cell.getEditState() === CellEditState.Editing && cell.editStateSource === 'find') {
                        cell.updateEditState(CellEditState.Preview, 'find');
                    }
                }
            }
            return;
        }
        if (e.isReplaceRevealed) {
            updateEditingState();
        }
        else if ((e.filters || e.isRevealed || e.searchString || e.replaceString) &&
            this._state.isRevealed &&
            this._state.isReplaceRevealed) {
            updateEditingState();
        }
    }
    ensureFindMatches() {
        if (!this._findMatchesStarts) {
            this.set(this._findMatches, true);
        }
    }
    getCurrentMatch() {
        const nextIndex = this._findMatchesStarts.getIndexOf(this._currentMatch);
        const cell = this._findMatches[nextIndex.index].cell;
        const match = this._findMatches[nextIndex.index].getMatch(nextIndex.remainder);
        return {
            cell,
            match,
            isModelMatch: nextIndex.remainder < this._findMatches[nextIndex.index].contentMatches.length,
        };
    }
    refreshCurrentMatch(focus) {
        const findMatchIndex = this.findMatches.findIndex((match) => match.cell === focus.cell);
        if (findMatchIndex === -1) {
            return;
        }
        const findMatch = this.findMatches[findMatchIndex];
        const index = findMatch.contentMatches.findIndex((match) => match.range.intersectRanges(focus.range) !== null);
        if (index === undefined) {
            return;
        }
        const matchesBefore = findMatchIndex === 0 ? 0 : (this._findMatchesStarts?.getPrefixSum(findMatchIndex - 1) ?? 0);
        this._currentMatch = matchesBefore + index;
        this.highlightCurrentFindMatchDecoration(findMatchIndex, index).then((offset) => {
            this.revealCellRange(findMatchIndex, index, offset);
            this._state.changeMatchInfo(this._currentMatch, this._findMatches.reduce((p, c) => p + c.length, 0), undefined);
        });
    }
    find(option) {
        if (!this.findMatches.length) {
            return;
        }
        // let currCell;
        if (!this._findMatchesStarts) {
            this.set(this._findMatches, true);
            if ('index' in option) {
                this._currentMatch = option.index;
            }
        }
        else {
            // const currIndex = this._findMatchesStarts!.getIndexOf(this._currentMatch);
            // currCell = this._findMatches[currIndex.index].cell;
            const totalVal = this._findMatchesStarts.getTotalSum();
            if ('index' in option) {
                this._currentMatch = option.index;
            }
            else if (this._currentMatch === -1) {
                this._currentMatch = option.previous ? totalVal - 1 : 0;
            }
            else {
                const nextVal = (this._currentMatch + (option.previous ? -1 : 1) + totalVal) % totalVal;
                this._currentMatch = nextVal;
            }
        }
        const nextIndex = this._findMatchesStarts.getIndexOf(this._currentMatch);
        // const newFocusedCell = this._findMatches[nextIndex.index].cell;
        this.highlightCurrentFindMatchDecoration(nextIndex.index, nextIndex.remainder).then((offset) => {
            this.revealCellRange(nextIndex.index, nextIndex.remainder, offset);
            this._state.changeMatchInfo(this._currentMatch, this._findMatches.reduce((p, c) => p + c.length, 0), undefined);
        });
    }
    revealCellRange(cellIndex, matchIndex, outputOffset) {
        const findMatch = this._findMatches[cellIndex];
        if (matchIndex >= findMatch.contentMatches.length) {
            // reveal output range
            this._notebookEditor.focusElement(findMatch.cell);
            const index = this._notebookEditor.getCellIndex(findMatch.cell);
            if (index !== undefined) {
                // const range: ICellRange = { start: index, end: index + 1 };
                this._notebookEditor.revealCellOffsetInCenter(findMatch.cell, outputOffset ?? 0);
            }
        }
        else {
            const match = findMatch.getMatch(matchIndex);
            if (findMatch.cell.getEditState() !== CellEditState.Editing) {
                findMatch.cell.updateEditState(CellEditState.Editing, 'find');
            }
            findMatch.cell.isInputCollapsed = false;
            this._notebookEditor.focusElement(findMatch.cell);
            this._notebookEditor.setCellEditorSelection(findMatch.cell, match.range);
            this._notebookEditor.revealRangeInCenterIfOutsideViewportAsync(findMatch.cell, match.range);
        }
    }
    _registerModelListener(notebookTextModel) {
        this._modelDisposable.clear();
        if (notebookTextModel) {
            this._modelDisposable.add(notebookTextModel.onDidChangeContent((e) => {
                if (!e.rawEvents.some((event) => event.kind === NotebookCellsChangeType.ChangeCellContent ||
                    event.kind === NotebookCellsChangeType.ModelChange)) {
                    return;
                }
                this.research();
            }));
        }
        this.research();
    }
    async research() {
        return this._throttledDelayer.trigger(async () => {
            this._state.change({ isSearching: true }, false);
            await this._research();
            this._state.change({ isSearching: false }, false);
        });
    }
    async _research() {
        this._computePromise?.cancel();
        if (!this._state.isRevealed || !this._notebookEditor.hasModel()) {
            this.set([], false);
            return;
        }
        this._computePromise = createCancelablePromise((token) => this._compute(token));
        const findMatches = await this._computePromise;
        if (!findMatches) {
            this.set([], false);
            return;
        }
        if (findMatches.length === 0) {
            this.set([], false);
            return;
        }
        const findFirstMatchAfterCellIndex = (cellIndex) => {
            const matchAfterSelection = findFirstIdxMonotonousOrArrLen(findMatches.map((match) => match.index), (index) => index >= cellIndex);
            this._updateCurrentMatch(findMatches, this._matchesCountBeforeIndex(findMatches, matchAfterSelection));
        };
        if (this._currentMatch === -1) {
            // no active current match
            if (this._notebookEditor.getLength() === 0) {
                this.set(findMatches, false);
                return;
            }
            else {
                const focus = this._notebookEditor.getFocus().start;
                findFirstMatchAfterCellIndex(focus);
                this.set(findMatches, false);
                return;
            }
        }
        const oldCurrIndex = this._findMatchesStarts.getIndexOf(this._currentMatch);
        const oldCurrCell = this._findMatches[oldCurrIndex.index].cell;
        const oldCurrMatchCellIndex = this._notebookEditor.getCellIndex(oldCurrCell);
        if (oldCurrMatchCellIndex < 0) {
            // the cell containing the active match is deleted
            if (this._notebookEditor.getLength() === 0) {
                this.set(findMatches, false);
                return;
            }
            findFirstMatchAfterCellIndex(oldCurrMatchCellIndex);
            return;
        }
        // the cell still exist
        const cell = this._notebookEditor.cellAt(oldCurrMatchCellIndex);
        // we will try restore the active find match in this cell, if it contains any find match
        if (cell.cellKind === CellKind.Markup && cell.getEditState() === CellEditState.Preview) {
            // find first match in this cell or below
            findFirstMatchAfterCellIndex(oldCurrMatchCellIndex);
            return;
        }
        // the cell is a markup cell in editing mode or a code cell, both should have monaco editor rendered
        if (!this._findMatchDecorationModel.currentMatchDecorations) {
            // no current highlight decoration
            findFirstMatchAfterCellIndex(oldCurrMatchCellIndex);
            return;
        }
        // check if there is monaco editor selection and find the first match, otherwise find the first match above current cell
        // this._findMatches[cellIndex].matches[matchIndex].range
        if (this._findMatchDecorationModel.currentMatchDecorations.kind === 'input') {
            const currentMatchDecorationId = this._findMatchDecorationModel.currentMatchDecorations.decorations.find((decoration) => decoration.ownerId === cell.handle);
            if (!currentMatchDecorationId) {
                // current match decoration is no longer valid
                findFirstMatchAfterCellIndex(oldCurrMatchCellIndex);
                return;
            }
            const matchAfterSelection = findFirstIdxMonotonousOrArrLen(findMatches, (match) => match.index >= oldCurrMatchCellIndex) % findMatches.length;
            if (findMatches[matchAfterSelection].index > oldCurrMatchCellIndex) {
                // there is no search result in curr cell anymore, find the nearest one (from top to bottom)
                this._updateCurrentMatch(findMatches, this._matchesCountBeforeIndex(findMatches, matchAfterSelection));
                return;
            }
            else {
                // there are still some search results in current cell
                let currMatchRangeInEditor = cell.editorAttached && currentMatchDecorationId.decorations[0]
                    ? cell.getCellDecorationRange(currentMatchDecorationId.decorations[0])
                    : null;
                if (currMatchRangeInEditor === null &&
                    oldCurrIndex.remainder < this._findMatches[oldCurrIndex.index].contentMatches.length) {
                    currMatchRangeInEditor = this._findMatches[oldCurrIndex.index].getMatch(oldCurrIndex.remainder).range;
                }
                if (currMatchRangeInEditor !== null) {
                    // we find a range for the previous current match, let's find the nearest one after it (can overlap)
                    const cellMatch = findMatches[matchAfterSelection];
                    const matchAfterOldSelection = findFirstIdxMonotonousOrArrLen(cellMatch.contentMatches, (match) => Range.compareRangesUsingStarts(match.range, currMatchRangeInEditor) >=
                        0);
                    this._updateCurrentMatch(findMatches, this._matchesCountBeforeIndex(findMatches, matchAfterSelection) +
                        matchAfterOldSelection);
                }
                else {
                    // no range found, let's fall back to finding the nearest match
                    this._updateCurrentMatch(findMatches, this._matchesCountBeforeIndex(findMatches, matchAfterSelection));
                    return;
                }
            }
        }
        else {
            // output now has the highlight
            const matchAfterSelection = findFirstIdxMonotonousOrArrLen(findMatches.map((match) => match.index), (index) => index >= oldCurrMatchCellIndex) % findMatches.length;
            this._updateCurrentMatch(findMatches, this._matchesCountBeforeIndex(findMatches, matchAfterSelection));
        }
    }
    set(cellFindMatches, autoStart) {
        if (!cellFindMatches || !cellFindMatches.length) {
            this._findMatches = [];
            this._findMatchDecorationModel.setAllFindMatchesDecorations([]);
            this.constructFindMatchesStarts();
            this._currentMatch = -1;
            this._findMatchDecorationModel.clearCurrentFindMatchDecoration();
            this._state.changeMatchInfo(this._currentMatch, this._findMatches.reduce((p, c) => p + c.length, 0), undefined);
            return;
        }
        // all matches
        this._findMatches = cellFindMatches;
        this._findMatchDecorationModel.setAllFindMatchesDecorations(cellFindMatches || []);
        // current match
        this.constructFindMatchesStarts();
        if (autoStart) {
            this._currentMatch = 0;
            this.highlightCurrentFindMatchDecoration(0, 0);
        }
        this._state.changeMatchInfo(this._currentMatch, this._findMatches.reduce((p, c) => p + c.length, 0), undefined);
    }
    async _compute(token) {
        if (!this._notebookEditor.hasModel()) {
            return null;
        }
        let ret = null;
        const val = this._state.searchString;
        const wordSeparators = this._configurationService.inspect('editor.wordSeparators').value;
        const options = {
            regex: this._state.isRegex,
            wholeWord: this._state.wholeWord,
            caseSensitive: this._state.matchCase,
            wordSeparators: wordSeparators,
            includeMarkupInput: this._state.filters?.markupInput ?? true,
            includeCodeInput: this._state.filters?.codeInput ?? true,
            includeMarkupPreview: !!this._state.filters?.markupPreview,
            includeOutput: !!this._state.filters?.codeOutput,
            findScope: this._state.filters?.findScope,
        };
        ret = await this._notebookEditor.find(val, options, token);
        if (token.isCancellationRequested) {
            return null;
        }
        return ret;
    }
    _updateCurrentMatch(findMatches, currentMatchesPosition) {
        this._currentMatch = currentMatchesPosition % findMatches.length;
        this.set(findMatches, false);
        const nextIndex = this._findMatchesStarts.getIndexOf(this._currentMatch);
        this.highlightCurrentFindMatchDecoration(nextIndex.index, nextIndex.remainder);
        this._state.changeMatchInfo(this._currentMatch, this._findMatches.reduce((p, c) => p + c.length, 0), undefined);
    }
    _matchesCountBeforeIndex(findMatches, index) {
        let prevMatchesCount = 0;
        for (let i = 0; i < index; i++) {
            prevMatchesCount += findMatches[i].length;
        }
        return prevMatchesCount;
    }
    constructFindMatchesStarts() {
        if (this._findMatches && this._findMatches.length) {
            const values = new Uint32Array(this._findMatches.length);
            for (let i = 0; i < this._findMatches.length; i++) {
                values[i] = this._findMatches[i].length;
            }
            this._findMatchesStarts = new PrefixSumComputer(values);
        }
        else {
            this._findMatchesStarts = null;
        }
    }
    async highlightCurrentFindMatchDecoration(cellIndex, matchIndex) {
        const cell = this._findMatches[cellIndex].cell;
        const match = this._findMatches[cellIndex].getMatch(matchIndex);
        if (matchIndex < this._findMatches[cellIndex].contentMatches.length) {
            return this._findMatchDecorationModel.highlightCurrentFindMatchDecorationInCell(cell, match.range);
        }
        else {
            return this._findMatchDecorationModel.highlightCurrentFindMatchDecorationInWebview(cell, match.index);
        }
    }
    clear() {
        this._computePromise?.cancel();
        this._throttledDelayer.cancel();
        this.set([], false);
    }
    dispose() {
        this._findMatchDecorationModel.dispose();
        super.dispose();
    }
};
FindModel = __decorate([
    __param(2, IConfigurationService)
], FindModel);
export { FindModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL2ZpbmQvZmluZE1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzVGLE9BQU8sRUFFTix1QkFBdUIsRUFDdkIsT0FBTyxHQUNQLE1BQU0sd0NBQXdDLENBQUE7QUFFL0MsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFFckUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFLOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFFeEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDeEUsT0FBTyxFQUNOLGFBQWEsR0FLYixNQUFNLDBCQUEwQixDQUFBO0FBR2pDLE9BQU8sRUFDTixRQUFRLEVBRVIsdUJBQXVCLEdBQ3ZCLE1BQU0sbUNBQW1DLENBQUE7QUFFMUMsTUFBTSxPQUFPLGtCQUFrQjtJQUs5QixJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFBO0lBQ2pFLENBQUM7SUFFRCxJQUFJLGNBQWM7UUFDakIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFBO0lBQzVCLENBQUM7SUFFRCxJQUFJLGNBQWM7UUFDakIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFBO0lBQzVCLENBQUM7SUFFRCxZQUNDLElBQW9C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