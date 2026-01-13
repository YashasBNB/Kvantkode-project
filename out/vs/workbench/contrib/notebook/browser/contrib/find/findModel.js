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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvZmluZC9maW5kTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDNUYsT0FBTyxFQUVOLHVCQUF1QixFQUN2QixPQUFPLEdBQ1AsTUFBTSx3Q0FBd0MsQ0FBQTtBQUUvQyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUs5RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUV4RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RSxPQUFPLEVBQ04sYUFBYSxHQUtiLE1BQU0sMEJBQTBCLENBQUE7QUFHakMsT0FBTyxFQUNOLFFBQVEsRUFFUix1QkFBdUIsR0FDdkIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUUxQyxNQUFNLE9BQU8sa0JBQWtCO0lBSzlCLElBQUksTUFBTTtRQUNULE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUE7SUFDakUsQ0FBQztJQUVELElBQUksY0FBYztRQUNqQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUE7SUFDNUIsQ0FBQztJQUVELElBQUksY0FBYztRQUNqQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUE7SUFD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