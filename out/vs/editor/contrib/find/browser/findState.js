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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZFN0YXRlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZmluZC9icm93c2VyL2ZpbmRTdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUF1QjlDLE1BQU0sQ0FBTixJQUFrQixrQkFJakI7QUFKRCxXQUFrQixrQkFBa0I7SUFDbkMsK0RBQVUsQ0FBQTtJQUNWLDJEQUFRLENBQUE7SUFDUiw2REFBUyxDQUFBO0FBQ1YsQ0FBQyxFQUppQixrQkFBa0IsS0FBbEIsa0JBQWtCLFFBSW5DO0FBdUJELFNBQVMsb0JBQW9CLENBQUMsUUFBNEIsRUFBRSxLQUFjO0lBQ3pFLElBQUksUUFBUSxvQ0FBNEIsRUFBRSxDQUFDO1FBQzFDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELElBQUksUUFBUSxxQ0FBNkIsRUFBRSxDQUFDO1FBQzNDLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELE9BQU8sS0FBSyxDQUFBO0FBQ2IsQ0FBQztBQUVELE1BQU0sT0FBTyxnQkFFWCxTQUFRLFVBQVU7SUF3Qm5CLElBQVcsWUFBWTtRQUN0QixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUE7SUFDMUIsQ0FBQztJQUNELElBQVcsYUFBYTtRQUN2QixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUE7SUFDM0IsQ0FBQztJQUNELElBQVcsVUFBVTtRQUNwQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUE7SUFDeEIsQ0FB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