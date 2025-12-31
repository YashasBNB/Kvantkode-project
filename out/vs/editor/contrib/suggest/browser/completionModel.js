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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGlvbk1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3VnZ2VzdC9icm93c2VyL2NvbXBsZXRpb25Nb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFL0QsT0FBTyxFQUNOLFFBQVEsRUFDUixVQUFVLEVBQ1YsVUFBVSxFQUNWLDRCQUE0QixFQUM1QixpQkFBaUIsR0FFakIsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQVl0RSxNQUFNLE9BQU8sV0FBVztJQUN2QixZQUNVLGtCQUEwQixFQUMxQixtQkFBMkI7UUFEM0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFRO1FBQzFCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBUTtJQUNsQyxDQUFDO0NBQ0o7QUFFRCxJQUFXLFFBSVY7QUFKRCxXQUFXLFFBQVE7SUFDbEIsNkNBQVcsQ0FBQTtJQUNYLHFDQUFPLENBQUE7SUFDUCx1Q0FBUSxDQUFBO0FBQ1QsQ0FBQyxFQUpVLFFBQVEsS0FBUixRQUFRLFFBSWxCO0FBRUQ7O0tBRUs7QUFDTCxNQUFNLE9BQU8sZUFBZTtJQWUzQixZQUNDLEtBQXVCLEVBQ3ZCLE1BQWMsRUFDZCxXQUF3QixFQUN4QixZQUEwQixFQUMxQixPQUErQixFQUMvQixrQkFBd0QsRUFDeEQsb0JBQW1ELGlCQUFpQixDQUFDLE9BQU8sRUFDbkUsZ0JBQW9DLFNBQVM7UUFBN0Msa0JBQWEsR0FBYixhQUFhLENBQWdDO1FBbEJ0QyxzQkFBaUIsR0FBRyxlQUFlLENBQUMsdUJBQXVCLENBQUE7UUFvQjNFLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1FBQ25CLElBQUks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