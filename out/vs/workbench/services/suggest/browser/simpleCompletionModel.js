/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { quickSelect } from '../../../../base/common/arrays.js';
import { FuzzyScore, fuzzyScore, fuzzyScoreGracefulAggressive, FuzzyScoreOptions, } from '../../../../base/common/filters.js';
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
export class SimpleCompletionModel {
    constructor(_items, _lineContext, _rawCompareFn) {
        this._items = _items;
        this._lineContext = _lineContext;
        this._rawCompareFn = _rawCompareFn;
        this._refilterKind = 1 /* Refilter.All */;
        this._fuzzyScoreOptions = {
            ...FuzzyScoreOptions.default,
            firstMatchCanBeWeak: true,
        };
        // TODO: Pass in options
        this._options = {};
    }
    get items() {
        this._ensureCachedState();
        return this._filteredItems;
    }
    get stats() {
        this._ensureCachedState();
        return this._stats;
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
    forceRefilterAll() {
        this._refilterKind = 1 /* Refilter.All */;
    }
    _ensureCachedState() {
        if (this._refilterKind !== 0 /* Refilter.Nothing */) {
            this._createCachedState();
        }
    }
    _createCachedState() {
        // this._providerInfo = new Map();
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
            // collect all support, know if their result is incomplete
            // this._providerInfo.set(item.provider, Boolean(item.container.incomplete));
            // 'word' is that remainder of the current line that we
            // filter and score against. In theory each suggestion uses a
            // different word, but in practice not - that's why we cache
            // TODO: Fix
            const overwriteBefore = item.completion.replacementLength; // item.position.column - item.editStart.column;
            const wordLen = overwriteBefore + characterCountDelta; // - (item.position.column - this._column);
            if (word.length !== wordLen) {
                word = wordLen === 0 ? '' : leadingLineContent.slice(-wordLen);
                wordLow = word.toLowerCase();
            }
            // remember the word against which this item was
            // scored. If word is undefined, then match against the empty string.
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
                    // } else if (typeof item.completion.filterText === 'string') {
                    // 	// when there is a `filterText` it must match the `word`.
                    // 	// if it matches we check with the label to compute highlights
                    // 	// and if that doesn't yield a result we have no highlights,
                    // 	// despite having the match
                    // 	const match = scoreFn(word, wordLow, wordPos, item.completion.filterText, item.filterTextLow!, 0, this._fuzzyScoreOptions);
                    // 	if (!match) {
                    // 		continue; // NO match
                    // 	}
                    // 	if (compareIgnoreCase(item.completion.filterText, item.textLabel) === 0) {
                    // 		// filterText and label are actually the same -> use good highlights
                    // 		item.score = match;
                    // 	} else {
                    // 		// re-run the scorer on the label in the hope of a result BUT use the rank
                    // 		// of the filterText-match
                    // 		item.score = anyScore(word, wordLow, wordPos, item.textLabel, item.labelLow, 0);
                    // 		item.score[0] = match[0]; // use score from filterText
                    // 	}
                }
                else {
                    // by default match `word` against the `label`
                    const match = scoreFn(word, wordLow, wordPos, item.textLabel, item.labelLow, 0, this._fuzzyScoreOptions);
                    if (!match && word !== '') {
                        continue; // NO match
                    }
                    // Use default sorting when word is empty
                    item.score = match || FuzzyScore.Default;
                }
            }
            item.idx = i;
            target.push(item);
            // update stats
            labelLengths.push(item.textLabel.length);
        }
        this._filteredItems = target.sort(this._rawCompareFn?.bind(undefined, leadingLineContent));
        this._refilterKind = 0 /* Refilter.Nothing */;
        this._stats = {
            pLabelLen: labelLengths.length
                ? quickSelect(labelLengths.length - 0.85, labelLengths, (a, b) => a - b)
                : 0,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlQ29tcGxldGlvbk1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3N1Z2dlc3QvYnJvd3Nlci9zaW1wbGVDb21wbGV0aW9uTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRS9ELE9BQU8sRUFDTixVQUFVLEVBQ1YsVUFBVSxFQUNWLDRCQUE0QixFQUM1QixpQkFBaUIsR0FFakIsTUFBTSxvQ0FBb0MsQ0FBQTtBQU0zQyxNQUFNLE9BQU8sV0FBVztJQUN2QixZQUNVLGtCQUEwQixFQUMxQixtQkFBMkI7UUFEM0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFRO1FBQzFCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBUTtJQUNsQyxDQUFDO0NBQ0o7QUFFRCxJQUFXLFFBSVY7QUFKRCxXQUFXLFFBQVE7SUFDbEIsNkNBQVcsQ0FBQTtJQUNYLHFDQUFPLENBQUE7SUFDUCx1Q0FBUSxDQUFBO0FBQ1QsQ0FBQyxFQUpVLFFBQVEsS0FBUixRQUFRLFFBSWxCO0FBRUQsTUFBTSxPQUFPLHFCQUFxQjtJQWNqQyxZQUNrQixNQUFXLEVBQ3BCLFlBQXlCLEVBQ2hCLGFBQWtFO1FBRmxFLFdBQU0sR0FBTixNQUFNLENBQUs7UUFDcEIsaUJBQVksR0FBWixZQUFZLENBQWE7UUFDaEIsa0JBQWEsR0FBYixhQUFhLENBQXFEO1FBZDVFLGtCQUFhLHdCQUF5QjtRQUN0Qyx1QkFBa0IsR0FBa0M7WUFDM0QsR0FBRyxpQkFBaUIsQ0FBQyxPQUFPO1lBQzVCLG1CQUFtQixFQUFFLElBQUk7U0FDekIsQ0FBQTtRQUVELHdCQUF3QjtRQUNoQixhQUFRLEdBRVosRUFBRSxDQUFBO0lBTUgsQ0FBQztJQUVKLElBQUksS0FBSztRQUNS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