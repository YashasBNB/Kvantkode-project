/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { quickSelect } from '../../../../base/common/arrays.js';
import { anyScore, fuzzyScore, FuzzyScore, fuzzyScoreGracefulAggressive, FuzzyScoreOptions, } from '../../../../base/common/filters.js';
import { compareIgnoreCase } from '../../../../base/common/strings.js';
export class LineContext {
    constructor(leadingLineContent, characterCountDelta) {
        this.leadingLineContent = leadingLineContent;
        this.characterCountDelta = characterCountDelta;
    }
}
var Refilter;
(function (Refilter) {
    Refilter[Refilter["Nothing"] = 0] = "Nothing";
    Refilter[Refilter["All"] = 1] = "All";
    Refilter[Refilter["Incr"] = 2] = "Incr";
})(Refilter || (Refilter = {}));
/**
 * Sorted, filtered completion view model
 * */
export class CompletionModel {
    constructor(items, column, lineContext, wordDistance, options, snippetSuggestions, fuzzyScoreOptions = FuzzyScoreOptions.default, clipboardText = undefined) {
        this.clipboardText = clipboardText;
        this._snippetCompareFn = CompletionModel._compareCompletionItems;
        this._items = items;
        this._column = column;
        this._wordDistance = wordDistance;
        this._options = options;
        this._refilterKind = 1 /* Refilter.All */;
        this._lineContext = lineContext;
        this._fuzzyScoreOptions = fuzzyScoreOptions;
        if (snippetSuggestions === 'top') {
            this._snippetCompareFn = CompletionModel._compareCompletionItemsSnippetsUp;
        }
        else if (snippetSuggestions === 'bottom') {
            this._snippetCompareFn = CompletionModel._compareCompletionItemsSnippetsDown;
        }
    }
    get lineContext() {
        return this._lineContext;
    }
    set lineContext(value) {
        if (this._lineContext.leadingLineContent !== value.leadingLineContent ||
            this._lineContext.characterCountDelta !== value.characterCountDelta) {
            this._refilterKind =
                this._lineContext.characterCountDelta < value.characterCountDelta && this._filteredItems
                    ? 2 /* Refilter.Incr */
                    : 1 /* Refilter.All */;
            this._lineContext = value;
        }
    }
    get items() {
        this._ensureCachedState();
        return this._filteredItems;
    }
    getItemsByProvider() {
        this._ensureCachedState();
        return this._itemsByProvider;
    }
    getIncompleteProvider() {
        this._ensureCachedState();
        const result = new Set();
        for (const [provider, items] of this.getItemsByProvider()) {
            if (items.length > 0 && items[0].container.incomplete) {
                result.add(provider);
            }
        }
        return result;
    }
    get stats() {
        this._ensureCachedState();
        return this._stats;
    }
    _ensureCachedState() {
        if (this._refilterKind !== 0 /* Refilter.Nothing */) {
            this._createCachedState();
        }
    }
    _createCachedState() {
        this._itemsByProvider = new Map();
        const labelLengths = [];
        const { leadingLineContent, characterCountDelta } = this._lineContext;
        let word = '';
        let wordLow = '';
        // incrementally filter less
        const source = this._refilterKind === 1 /* Refilter.All */ ? this._items : this._filteredItems;
        const target = [];
        // picks a score function based on the number of
        // items that we have to score/filter and based on the
        // user-configuration
        const scoreFn = !this._options.filterGraceful || source.length > 2000
            ? fuzzyScore
            : fuzzyScoreGracefulAggressive;
        for (let i = 0; i < source.length; i++) {
            const item = source[i];
            if (item.isInvalid) {
                continue; // SKIP invalid items
            }
            // keep all items by their provider
            const arr = this._itemsByProvider.get(item.provider);
            if (arr) {
                arr.push(item);
            }
            else {
                this._itemsByProvider.set(item.provider, [item]);
            }
            // 'word' is that remainder of the current line that we
            // filter and score against. In theory each suggestion uses a
            // different word, but in practice not - that's why we cache
            const overwriteBefore = item.position.column - item.editStart.column;
            const wordLen = overwriteBefore + characterCountDelta - (item.position.column - this._column);
            if (word.length !== wordLen) {
                word = wordLen === 0 ? '' : leadingLineContent.slice(-wordLen);
                wordLow = word.toLowerCase();
            }
            // remember the word against which this item was
            // scored
            item.word = word;
            if (wordLen === 0) {
                // when there is nothing to score against, don't
                // event try to do. Use a const rank and rely on
                // the fallback-sort using the initial sort order.
                // use a score of `-100` because that is out of the
                // bound of values `fuzzyScore` will return
                item.score = FuzzyScore.Default;
            }
            else {
                // skip word characters that are whitespace until
                // we have hit the replace range (overwriteBefore)
                let wordPos = 0;
                while (wordPos < overwriteBefore) {
                    const ch = word.charCodeAt(wordPos);
                    if (ch === 32 /* CharCode.Space */ || ch === 9 /* CharCode.Tab */) {
                        wordPos += 1;
                    }
                    else {
                        break;
                    }
                }
                if (wordPos >= wordLen) {
                    // the wordPos at which scoring starts is the whole word
                    // and therefore the same rules as not having a word apply
                    item.score = FuzzyScore.Default;
                }
                else if (typeof item.completion.filterText === 'string') {
                    // when there is a `filterText` it must match the `word`.
                    // if it matches we check with the label to compute highlights
                    // and if that doesn't yield a result we have no highlights,
                    // despite having the match
                    const match = scoreFn(word, wordLow, wordPos, item.completion.filterText, item.filterTextLow, 0, this._fuzzyScoreOptions);
                    if (!match) {
                        continue; // NO match
                    }
                    if (compareIgnoreCase(item.completion.filterText, item.textLabel) === 0) {
                        // filterText and label are actually the same -> use good highlights
                        item.score = match;
                    }
                    else {
                        // re-run the scorer on the label in the hope of a result BUT use the rank
                        // of the filterText-match
                        item.score = anyScore(word, wordLow, wordPos, item.textLabel, item.labelLow, 0);
                        item.score[0] = match[0]; // use score from filterText
                    }
                }
                else {
                    // by default match `word` against the `label`
                    const match = scoreFn(word, wordLow, wordPos, item.textLabel, item.labelLow, 0, this._fuzzyScoreOptions);
                    if (!match) {
                        continue; // NO match
                    }
                    item.score = match;
                }
            }
            item.idx = i;
            item.distance = this._wordDistance.distance(item.position, item.completion);
            target.push(item);
            // update stats
            labelLengths.push(item.textLabel.length);
        }
        this._filteredItems = target.sort(this._snippetCompareFn);
        this._refilterKind = 0 /* Refilter.Nothing */;
        this._stats = {
            pLabelLen: labelLengths.length
                ? quickSelect(labelLengths.length - 0.85, labelLengths, (a, b) => a - b)
                : 0,
        };
    }
    static _compareCompletionItems(a, b) {
        if (a.score[0] > b.score[0]) {
            return -1;
        }
        else if (a.score[0] < b.score[0]) {
            return 1;
        }
        else if (a.distance < b.distance) {
            return -1;
        }
        else if (a.distance > b.distance) {
            return 1;
        }
        else if (a.idx < b.idx) {
            return -1;
        }
        else if (a.idx > b.idx) {
            return 1;
        }
        else {
            return 0;
        }
    }
    static _compareCompletionItemsSnippetsDown(a, b) {
        if (a.completion.kind !== b.completion.kind) {
            if (a.completion.kind === 27 /* CompletionItemKind.Snippet */) {
                return 1;
            }
            else if (b.completion.kind === 27 /* CompletionItemKind.Snippet */) {
                return -1;
            }
        }
        return CompletionModel._compareCompletionItems(a, b);
    }
    static _compareCompletionItemsSnippetsUp(a, b) {
        if (a.completion.kind !== b.completion.kind) {
            if (a.completion.kind === 27 /* CompletionItemKind.Snippet */) {
                return -1;
            }
            else if (b.completion.kind === 27 /* CompletionItemKind.Snippet */) {
                return 1;
            }
        }
        return CompletionModel._compareCompletionItems(a, b);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbk1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvY29tcGxldGlvbk1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUUvRCxPQUFPLEVBQ04sUUFBUSxFQUNSLFVBQVUsRUFDVixVQUFVLEVBQ1YsNEJBQTRCLEVBQzVCLGlCQUFpQixHQUVqQixNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBWXRFLE1BQU0sT0FBTyxXQUFXO0lBQ3ZCLFlBQ1Usa0JBQTBCLEVBQzFCLG1CQUEyQjtRQUQzQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQVE7UUFDMUIsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFRO0lBQ2xDLENBQUM7Q0FDSjtBQUVELElBQVcsUUFJVjtBQUpELFdBQVcsUUFBUTtJQUNsQiw2Q0FBVyxDQUFBO0lBQ1gscUNBQU8sQ0FBQTtJQUNQLHVDQUFRLENBQUE7QUFDVCxDQUFDLEVBSlUsUUFBUSxLQUFSLFFBQVEsUUFJbEI7QUFFRDs7S0FFSztBQUNMLE1BQU0sT0FBTyxlQUFlO0lBZTNCLFlBQ0MsS0FBdUIsRUFDdkIsTUFBYyxFQUNkLFdBQXdCLEVBQ3hCLFlBQTBCLEVBQzFCLE9BQStCLEVBQy9CLGtCQUF3RCxFQUN4RCxvQkFBbUQsaUJBQWlCLENBQUMsT0FBTyxFQUNuRSxnQkFBb0MsU0FBUztRQUE3QyxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0M7UUFsQnRDLHNCQUFpQixHQUFHLGVBQWUsQ0FBQyx1QkFBdUIsQ0FBQTtRQW9CM0UsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFDbkIs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