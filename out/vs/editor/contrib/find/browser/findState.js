/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Range } from '../../../common/core/range.js';
import { MATCHES_LIMIT } from './findModel.js';
export var FindOptionOverride;
(function (FindOptionOverride) {
    FindOptionOverride[FindOptionOverride["NotSet"] = 0] = "NotSet";
    FindOptionOverride[FindOptionOverride["True"] = 1] = "True";
    FindOptionOverride[FindOptionOverride["False"] = 2] = "False";
})(FindOptionOverride || (FindOptionOverride = {}));
function effectiveOptionValue(override, value) {
    if (override === 1 /* FindOptionOverride.True */) {
        return true;
    }
    if (override === 2 /* FindOptionOverride.False */) {
        return false;
    }
    return value;
}
export class FindReplaceState extends Disposable {
    get searchString() {
        return this._searchString;
    }
    get replaceString() {
        return this._replaceString;
    }
    get isRevealed() {
        return this._isRevealed;
    }
    get isReplaceRevealed() {
        return this._isReplaceRevealed;
    }
    get isRegex() {
        return effectiveOptionValue(this._isRegexOverride, this._isRegex);
    }
    get wholeWord() {
        return effectiveOptionValue(this._wholeWordOverride, this._wholeWord);
    }
    get matchCase() {
        return effectiveOptionValue(this._matchCaseOverride, this._matchCase);
    }
    get preserveCase() {
        return effectiveOptionValue(this._preserveCaseOverride, this._preserveCase);
    }
    get actualIsRegex() {
        return this._isRegex;
    }
    get actualWholeWord() {
        return this._wholeWord;
    }
    get actualMatchCase() {
        return this._matchCase;
    }
    get actualPreserveCase() {
        return this._preserveCase;
    }
    get searchScope() {
        return this._searchScope;
    }
    get matchesPosition() {
        return this._matchesPosition;
    }
    get matchesCount() {
        return this._matchesCount;
    }
    get currentMatch() {
        return this._currentMatch;
    }
    get isSearching() {
        return this._isSearching;
    }
    get filters() {
        return this._filters;
    }
    constructor() {
        super();
        this._onFindReplaceStateChange = this._register(new Emitter());
        this.onFindReplaceStateChange = this._onFindReplaceStateChange.event;
        this._searchString = '';
        this._replaceString = '';
        this._isRevealed = false;
        this._isReplaceRevealed = false;
        this._isRegex = false;
        this._isRegexOverride = 0 /* FindOptionOverride.NotSet */;
        this._wholeWord = false;
        this._wholeWordOverride = 0 /* FindOptionOverride.NotSet */;
        this._matchCase = false;
        this._matchCaseOverride = 0 /* FindOptionOverride.NotSet */;
        this._preserveCase = false;
        this._preserveCaseOverride = 0 /* FindOptionOverride.NotSet */;
        this._searchScope = null;
        this._matchesPosition = 0;
        this._matchesCount = 0;
        this._currentMatch = null;
        this._loop = true;
        this._isSearching = false;
        this._filters = null;
    }
    changeMatchInfo(matchesPosition, matchesCount, currentMatch) {
        const changeEvent = {
            moveCursor: false,
            updateHistory: false,
            searchString: false,
            replaceString: false,
            isRevealed: false,
            isReplaceRevealed: false,
            isRegex: false,
            wholeWord: false,
            matchCase: false,
            preserveCase: false,
            searchScope: false,
            matchesPosition: false,
            matchesCount: false,
            currentMatch: false,
            loop: false,
            isSearching: false,
            filters: false,
        };
        let somethingChanged = false;
        if (matchesCount === 0) {
            matchesPosition = 0;
        }
        if (matchesPosition > matchesCount) {
            matchesPosition = matchesCount;
        }
        if (this._matchesPosition !== matchesPosition) {
            this._matchesPosition = matchesPosition;
            changeEvent.matchesPosition = true;
            somethingChanged = true;
        }
        if (this._matchesCount !== matchesCount) {
            this._matchesCount = matchesCount;
            changeEvent.matchesCount = true;
            somethingChanged = true;
        }
        if (typeof currentMatch !== 'undefined') {
            if (!Range.equalsRange(this._currentMatch, currentMatch)) {
                this._currentMatch = currentMatch;
                changeEvent.currentMatch = true;
                somethingChanged = true;
            }
        }
        if (somethingChanged) {
            this._onFindReplaceStateChange.fire(changeEvent);
        }
    }
    change(newState, moveCursor, updateHistory = true) {
        const changeEvent = {
            moveCursor: moveCursor,
            updateHistory: updateHistory,
            searchString: false,
            replaceString: false,
            isRevealed: false,
            isReplaceRevealed: false,
            isRegex: false,
            wholeWord: false,
            matchCase: false,
            preserveCase: false,
            searchScope: false,
            matchesPosition: false,
            matchesCount: false,
            currentMatch: false,
            loop: false,
            isSearching: false,
            filters: false,
        };
        let somethingChanged = false;
        const oldEffectiveIsRegex = this.isRegex;
        const oldEffectiveWholeWords = this.wholeWord;
        const oldEffectiveMatchCase = this.matchCase;
        const oldEffectivePreserveCase = this.preserveCase;
        if (typeof newState.searchString !== 'undefined') {
            if (this._searchString !== newState.searchString) {
                this._searchString = newState.searchString;
                changeEvent.searchString = true;
                somethingChanged = true;
            }
        }
        if (typeof newState.replaceString !== 'undefined') {
            if (this._replaceString !== newState.replaceString) {
                this._replaceString = newState.replaceString;
                changeEvent.replaceString = true;
                somethingChanged = true;
            }
        }
        if (typeof newState.isRevealed !== 'undefined') {
            if (this._isRevealed !== newState.isRevealed) {
                this._isRevealed = newState.isRevealed;
                changeEvent.isRevealed = true;
                somethingChanged = true;
            }
        }
        if (typeof newState.isReplaceRevealed !== 'undefined') {
            if (this._isReplaceRevealed !== newState.isReplaceRevealed) {
                this._isReplaceRevealed = newState.isReplaceRevealed;
                changeEvent.isReplaceRevealed = true;
                somethingChanged = true;
            }
        }
        if (typeof newState.isRegex !== 'undefined') {
            this._isRegex = newState.isRegex;
        }
        if (typeof newState.wholeWord !== 'undefined') {
            this._wholeWord = newState.wholeWord;
        }
        if (typeof newState.matchCase !== 'undefined') {
            this._matchCase = newState.matchCase;
        }
        if (typeof newState.preserveCase !== 'undefined') {
            this._preserveCase = newState.preserveCase;
        }
        if (typeof newState.searchScope !== 'undefined') {
            if (!newState.searchScope?.every((newSearchScope) => {
                return this._searchScope?.some((existingSearchScope) => {
                    return !Range.equalsRange(existingSearchScope, newSearchScope);
                });
            })) {
                this._searchScope = newState.searchScope;
                changeEvent.searchScope = true;
                somethingChanged = true;
            }
        }
        if (typeof newState.loop !== 'undefined') {
            if (this._loop !== newState.loop) {
                this._loop = newState.loop;
                changeEvent.loop = true;
                somethingChanged = true;
            }
        }
        if (typeof newState.isSearching !== 'undefined') {
            if (this._isSearching !== newState.isSearching) {
                this._isSearching = newState.isSearching;
                changeEvent.isSearching = true;
                somethingChanged = true;
            }
        }
        if (typeof newState.filters !== 'undefined') {
            if (this._filters) {
                this._filters.update(newState.filters);
            }
            else {
                this._filters = newState.filters;
            }
            changeEvent.filters = true;
            somethingChanged = true;
        }
        // Overrides get set when they explicitly come in and get reset anytime something else changes
        this._isRegexOverride =
            typeof newState.isRegexOverride !== 'undefined'
                ? newState.isRegexOverride
                : 0 /* FindOptionOverride.NotSet */;
        this._wholeWordOverride =
            typeof newState.wholeWordOverride !== 'undefined'
                ? newState.wholeWordOverride
                : 0 /* FindOptionOverride.NotSet */;
        this._matchCaseOverride =
            typeof newState.matchCaseOverride !== 'undefined'
                ? newState.matchCaseOverride
                : 0 /* FindOptionOverride.NotSet */;
        this._preserveCaseOverride =
            typeof newState.preserveCaseOverride !== 'undefined'
                ? newState.preserveCaseOverride
                : 0 /* FindOptionOverride.NotSet */;
        if (oldEffectiveIsRegex !== this.isRegex) {
            somethingChanged = true;
            changeEvent.isRegex = true;
        }
        if (oldEffectiveWholeWords !== this.wholeWord) {
            somethingChanged = true;
            changeEvent.wholeWord = true;
        }
        if (oldEffectiveMatchCase !== this.matchCase) {
            somethingChanged = true;
            changeEvent.matchCase = true;
        }
        if (oldEffectivePreserveCase !== this.preserveCase) {
            somethingChanged = true;
            changeEvent.preserveCase = true;
        }
        if (somethingChanged) {
            this._onFindReplaceStateChange.fire(changeEvent);
        }
    }
    canNavigateBack() {
        return this.canNavigateInLoop() || this.matchesPosition !== 1;
    }
    canNavigateForward() {
        return this.canNavigateInLoop() || this.matchesPosition < this.matchesCount;
    }
    canNavigateInLoop() {
        return this._loop || this.matchesCount >= MATCHES_LIMIT;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZFN0YXRlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9maW5kL2Jyb3dzZXIvZmluZFN0YXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQXVCOUMsTUFBTSxDQUFOLElBQWtCLGtCQUlqQjtBQUpELFdBQWtCLGtCQUFrQjtJQUNuQywrREFBVSxDQUFBO0lBQ1YsMkRBQVEsQ0FBQTtJQUNSLDZEQUFTLENBQUE7QUFDVixDQUFDLEVBSmlCLGtCQUFrQixLQUFsQixrQkFBa0IsUUFJbkM7QUF1QkQsU0FBUyxvQkFBb0IsQ0FBQyxRQUE0QixFQUFFLEtBQWM7SUFDekUsSUFBSSxRQUFRLG9DQUE0QixFQUFFLENBQUM7UUFDMUMsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsSUFBSSxRQUFRLHFDQUE2QixFQUFFLENBQUM7UUFDM0MsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsT0FBTyxLQUFLLENBQUE7QUFDYixDQUFDO0FBRUQsTUFBTSxPQUFPLGdCQUVYLFNBQVEsVUFBVTtJQXdCbkIsSUFBVyxZQUFZO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMxQixDQUFDO0lBQ0QsSUFBVyxhQUFhO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQTtJQUMzQixDQUFDO0lBQ0QsSUFBVyxVQUFVO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQTtJQUN4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