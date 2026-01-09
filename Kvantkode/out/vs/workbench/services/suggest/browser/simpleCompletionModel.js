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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlQ29tcGxldGlvbk1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc3VnZ2VzdC9icm93c2VyL3NpbXBsZUNvbXBsZXRpb25Nb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFL0QsT0FBTyxFQUNOLFVBQVUsRUFDVixVQUFVLEVBQ1YsNEJBQTRCLEVBQzVCLGlCQUFpQixHQUVqQixNQUFNLG9DQUFvQyxDQUFBO0FBTTNDLE1BQU0sT0FBTyxXQUFXO0lBQ3ZCLFlBQ1Usa0JBQTBCLEVBQzFCLG1CQUEyQjtRQUQzQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQVE7UUFDMUIsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFRO0lBQ2xDLENBQUM7Q0FDSjtBQUVELElBQVcsUUFJVjtBQUpELFdBQVcsUUFBUTtJQUNsQiw2Q0FBVyxDQUFBO0lBQ1gscUNBQU8sQ0FBQTtJQUNQLHVDQUFRLENBQUE7QUFDVCxDQUFDLEVBSlUsUUFBUSxLQUFSLFFBQVEsUUFJbEI7QUFFRCxNQUFNLE9BQU8scUJBQXFCO0lBY2pDLFlBQ2tCLE1BQVcsRUFDcEIsWUFBeUIsRUFDaEIsYUFBa0U7UUFGbEUsV0FBTSxHQUFOLE1BQU0sQ0FBSztRQUNwQixpQkFBWSxHQUFaLFlBQVksQ0FBYTtRQUNoQixrQkFBYSxHQUFiLGFBQWEsQ0FBcUQ7UUFkNUUsa0JBQWEsd0JBQXlCO1FBQ3RDLHVCQUFrQixHQUFrQztZQUMzRCxHQUFHLGlCQUFpQixDQUFDLE9BQU87WUFDNUIsbUJBQW1CLEVBQUUsSUFBSTtTQUN6QixDQUFBO1FBRUQsd0JBQXdCO1FBQ2hCLGFBQVEsR0FFWixFQUFFLENBQUE7SUFNSCxD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