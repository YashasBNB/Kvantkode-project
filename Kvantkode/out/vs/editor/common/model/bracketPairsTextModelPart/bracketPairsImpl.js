/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CallbackIterable, compareBy } from '../../../../base/common/arrays.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import { Range } from '../../core/range.js';
import { ignoreBracketsInToken } from '../../languages/supports.js';
import { BracketsUtils, } from '../../languages/supports/richEditBrackets.js';
import { BracketPairsTree } from './bracketPairsTree/bracketPairsTree.js';
export class BracketPairsTextModelPart extends Disposable {
    get canBuildAST() {
        const maxSupportedDocumentLength = /* max lines */ 50_000 * /* average column count */ 100;
        return this.textModel.getValueLength() <= maxSupportedDocumentLength;
    }
    constructor(textModel, languageConfigurationService) {
        super();
        this.textModel = textModel;
        this.languageConfigurationService = languageConfigurationService;
        this.bracketPairsTree = this._register(new MutableDisposable());
        this.onDidChangeEmitter = new Emitter();
        this.onDidChange = this.onDidChangeEmitter.event;
        this.bracketsRequested = false;
    }
    //#region TextModel events
    handleLanguageConfigurationServiceChange(e) {
        if (!e.languageId || this.bracketPairsTree.value?.object.didLanguageChange(e.languageId)) {
            this.bracketPairsTree.clear();
            this.updateBracketPairsTree();
        }
    }
    handleDidChangeOptions(e) {
        this.bracketPairsTree.clear();
        this.updateBracketPairsTree();
    }
    handleDidChangeLanguage(e) {
        this.bracketPairsTree.clear();
        this.updateBracketPairsTree();
    }
    handleDidChangeContent(change) {
        this.bracketPairsTree.value?.object.handleContentChanged(change);
    }
    handleDidChangeBackgroundTokenizationState() {
        this.bracketPairsTree.value?.object.handleDidChangeBackgroundTokenizationState();
    }
    handleDidChangeTokens(e) {
        this.bracketPairsTree.value?.object.handleDidChangeTokens(e);
    }
    //#endregion
    updateBracketPairsTree() {
        if (this.bracketsRequested && this.canBuildAST) {
            if (!this.bracketPairsTree.value) {
                const store = new DisposableStore();
                this.bracketPairsTree.value = createDisposableRef(store.add(new BracketPairsTree(this.textModel, (languageId) => {
                    return this.languageConfigurationService.getLanguageConfiguration(languageId);
                })), store);
                store.add(this.bracketPairsTree.value.object.onDidChange((e) => this.onDidChangeEmitter.fire(e)));
                this.onDidChangeEmitter.fire();
            }
        }
        else {
            if (this.bracketPairsTree.value) {
                this.bracketPairsTree.clear();
                // Important: Don't call fire if there was no change!
                this.onDidChangeEmitter.fire();
            }
        }
    }
    /**
     * Returns all bracket pairs that intersect the given range.
     * The result is sorted by the start position.
     */
    getBracketPairsInRange(range) {
        this.bracketsRequested = true;
        this.updateBracketPairsTree();
        return (this.bracketPairsTree.value?.object.getBracketPairsInRange(range, false) ||
            CallbackIterable.empty);
    }
    getBracketPairsInRangeWithMinIndentation(range) {
        this.bracketsRequested = true;
        this.updateBracketPairsTree();
        return (this.bracketPairsTree.value?.object.getBracketPairsInRange(range, true) ||
            CallbackIterable.empty);
    }
    getBracketsInRange(range, onlyColorizedBrackets = false) {
        this.bracketsRequested = true;
        this.updateBracketPairsTree();
        return (this.bracketPairsTree.value?.object.getBracketsInRange(range, onlyColorizedBrackets) ||
            CallbackIterable.empty);
    }
    findMatchingBracketUp(_bracket, _position, maxDuration) {
        const position = this.textModel.validatePosition(_position);
        const languageId = this.textModel.getLanguageIdAtPosition(position.lineNumber, position.column);
        if (this.canBuildAST) {
            const closingBracketInfo = this.languageConfigurationService
                .getLanguageConfiguration(languageId)
                .bracketsNew.getClosingBracketInfo(_bracket);
            if (!closingBracketInfo) {
                return null;
            }
            const bracketPair = this.getBracketPairsInRange(Range.fromPositions(_position, _position)).findLast((b) => closingBracketInfo.closes(b.openingBracketInfo));
            if (bracketPair) {
                return bracketPair.openingBracketRange;
            }
            return null;
        }
        else {
            // Fallback to old bracket matching code:
            const bracket = _bracket.toLowerCase();
            const bracketsSupport = this.languageConfigurationService.getLanguageConfiguration(languageId).brackets;
            if (!bracketsSupport) {
                return null;
            }
            const data = bracketsSupport.textIsBracket[bracket];
            if (!data) {
                return null;
            }
            return stripBracketSearchCanceled(this._findMatchingBracketUp(data, position, createTimeBasedContinueBracketSearchPredicate(maxDuration)));
        }
    }
    matchBracket(position, maxDuration) {
        if (this.canBuildAST) {
            const bracketPair = this.getBracketPairsInRange(Range.fromPositions(position, position))
                .filter((item) => item.closingBracketRange !== undefined &&
                (item.openingBracketRange.containsPosition(position) ||
                    item.closingBracketRange.containsPosition(position)))
                .findLastMaxBy(compareBy((item) => item.openingBracketRange.containsPosition(position)
                ? item.openingBracketRange
                : item.closingBracketRange, Range.compareRangesUsingStarts));
            if (bracketPair) {
                return [bracketPair.openingBracketRange, bracketPair.closingBracketRange];
            }
            return null;
        }
        else {
            // Fallback to old bracket matching code:
            const continueSearchPredicate = createTimeBasedContinueBracketSearchPredicate(maxDuration);
            return this._matchBracket(this.textModel.validatePosition(position), continueSearchPredicate);
        }
    }
    _establishBracketSearchOffsets(position, lineTokens, modeBrackets, tokenIndex) {
        const tokenCount = lineTokens.getCount();
        const currentLanguageId = lineTokens.getLanguageId(tokenIndex);
        // limit search to not go before `maxBracketLength`
        let searchStartOffset = Math.max(0, position.column - 1 - modeBrackets.maxBracketLength);
        for (let i = tokenIndex - 1; i >= 0; i--) {
            const tokenEndOffset = lineTokens.getEndOffset(i);
            if (tokenEndOffset <= searchStartOffset) {
                break;
            }
            if (ignoreBracketsInToken(lineTokens.getStandardTokenType(i)) ||
                lineTokens.getLanguageId(i) !== currentLanguageId) {
                searchStartOffset = tokenEndOffset;
                break;
            }
        }
        // limit search to not go after `maxBracketLength`
        let searchEndOffset = Math.min(lineTokens.getLineContent().length, position.column - 1 + modeBrackets.maxBracketLength);
        for (let i = tokenIndex + 1; i < tokenCount; i++) {
            const tokenStartOffset = lineTokens.getStartOffset(i);
            if (tokenStartOffset >= searchEndOffset) {
                break;
            }
            if (ignoreBracketsInToken(lineTokens.getStandardTokenType(i)) ||
                lineTokens.getLanguageId(i) !== currentLanguageId) {
                searchEndOffset = tokenStartOffset;
                break;
            }
        }
        return { searchStartOffset, searchEndOffset };
    }
    _matchBracket(position, continueSearchPredicate) {
        const lineNumber = position.lineNumber;
        const lineTokens = this.textModel.tokenization.getLineTokens(lineNumber);
        const lineText = this.textModel.getLineContent(lineNumber);
        const tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
        if (tokenIndex < 0) {
            return null;
        }
        const currentModeBrackets = this.languageConfigurationService.getLanguageConfiguration(lineTokens.getLanguageId(tokenIndex)).brackets;
        // check that the token is not to be ignored
        if (currentModeBrackets &&
            !ignoreBracketsInToken(lineTokens.getStandardTokenType(tokenIndex))) {
            let { searchStartOffset, searchEndOffset } = this._establishBracketSearchOffsets(position, lineTokens, currentModeBrackets, tokenIndex);
            // it might be the case that [currentTokenStart -> currentTokenEnd] contains multiple brackets
            // `bestResult` will contain the most right-side result
            let bestResult = null;
            while (true) {
                const foundBracket = BracketsUtils.findNextBracketInRange(currentModeBrackets.forwardRegex, lineNumber, lineText, searchStartOffset, searchEndOffset);
                if (!foundBracket) {
                    // there are no more brackets in this text
                    break;
                }
                // check that we didn't hit a bracket too far away from position
                if (foundBracket.startColumn <= position.column &&
                    position.column <= foundBracket.endColumn) {
                    const foundBracketText = lineText
                        .substring(foundBracket.startColumn - 1, foundBracket.endColumn - 1)
                        .toLowerCase();
                    const r = this._matchFoundBracket(foundBracket, currentModeBrackets.textIsBracket[foundBracketText], currentModeBrackets.textIsOpenBracket[foundBracketText], continueSearchPredicate);
                    if (r) {
                        if (r instanceof BracketSearchCanceled) {
                            return null;
                        }
                        bestResult = r;
                    }
                }
                searchStartOffset = foundBracket.endColumn - 1;
            }
            if (bestResult) {
                return bestResult;
            }
        }
        // If position is in between two tokens, try also looking in the previous token
        if (tokenIndex > 0 && lineTokens.getStartOffset(tokenIndex) === position.column - 1) {
            const prevTokenIndex = tokenIndex - 1;
            const prevModeBrackets = this.languageConfigurationService.getLanguageConfiguration(lineTokens.getLanguageId(prevTokenIndex)).brackets;
            // check that previous token is not to be ignored
            if (prevModeBrackets &&
                !ignoreBracketsInToken(lineTokens.getStandardTokenType(prevTokenIndex))) {
                const { searchStartOffset, searchEndOffset } = this._establishBracketSearchOffsets(position, lineTokens, prevModeBrackets, prevTokenIndex);
                const foundBracket = BracketsUtils.findPrevBracketInRange(prevModeBrackets.reversedRegex, lineNumber, lineText, searchStartOffset, searchEndOffset);
                // check that we didn't hit a bracket too far away from position
                if (foundBracket &&
                    foundBracket.startColumn <= position.column &&
                    position.column <= foundBracket.endColumn) {
                    const foundBracketText = lineText
                        .substring(foundBracket.startColumn - 1, foundBracket.endColumn - 1)
                        .toLowerCase();
                    const r = this._matchFoundBracket(foundBracket, prevModeBrackets.textIsBracket[foundBracketText], prevModeBrackets.textIsOpenBracket[foundBracketText], continueSearchPredicate);
                    if (r) {
                        if (r instanceof BracketSearchCanceled) {
                            return null;
                        }
                        return r;
                    }
                }
            }
        }
        return null;
    }
    _matchFoundBracket(foundBracket, data, isOpen, continueSearchPredicate) {
        if (!data) {
            return null;
        }
        const matched = isOpen
            ? this._findMatchingBracketDown(data, foundBracket.getEndPosition(), continueSearchPredicate)
            : this._findMatchingBracketUp(data, foundBracket.getStartPosition(), continueSearchPredicate);
        if (!matched) {
            return null;
        }
        if (matched instanceof BracketSearchCanceled) {
            return matched;
        }
        return [foundBracket, matched];
    }
    _findMatchingBracketUp(bracket, position, continueSearchPredicate) {
        // console.log('_findMatchingBracketUp: ', 'bracket: ', JSON.stringify(bracket), 'startPosition: ', String(position));
        const languageId = bracket.languageId;
        const reversedBracketRegex = bracket.reversedRegex;
        let count = -1;
        let totalCallCount = 0;
        const searchPrevMatchingBracketInRange = (lineNumber, lineText, searchStartOffset, searchEndOffset) => {
            while (true) {
                if (continueSearchPredicate && ++totalCallCount % 100 === 0 && !continueSearchPredicate()) {
                    return BracketSearchCanceled.INSTANCE;
                }
                const r = BracketsUtils.findPrevBracketInRange(reversedBracketRegex, lineNumber, lineText, searchStartOffset, searchEndOffset);
                if (!r) {
                    break;
                }
                const hitText = lineText.substring(r.startColumn - 1, r.endColumn - 1).toLowerCase();
                if (bracket.isOpen(hitText)) {
                    count++;
                }
                else if (bracket.isClose(hitText)) {
                    count--;
                }
                if (count === 0) {
                    return r;
                }
                searchEndOffset = r.startColumn - 1;
            }
            return null;
        };
        for (let lineNumber = position.lineNumber; lineNumber >= 1; lineNumber--) {
            const lineTokens = this.textModel.tokenization.getLineTokens(lineNumber);
            const tokenCount = lineTokens.getCount();
            const lineText = this.textModel.getLineContent(lineNumber);
            let tokenIndex = tokenCount - 1;
            let searchStartOffset = lineText.length;
            let searchEndOffset = lineText.length;
            if (lineNumber === position.lineNumber) {
                tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
                searchStartOffset = position.column - 1;
                searchEndOffset = position.column - 1;
            }
            let prevSearchInToken = true;
            for (; tokenIndex >= 0; tokenIndex--) {
                const searchInToken = lineTokens.getLanguageId(tokenIndex) === languageId &&
                    !ignoreBracketsInToken(lineTokens.getStandardTokenType(tokenIndex));
                if (searchInToken) {
                    // this token should be searched
                    if (prevSearchInToken) {
                        // the previous token should be searched, simply extend searchStartOffset
                        searchStartOffset = lineTokens.getStartOffset(tokenIndex);
                    }
                    else {
                        // the previous token should not be searched
                        searchStartOffset = lineTokens.getStartOffset(tokenIndex);
                        searchEndOffset = lineTokens.getEndOffset(tokenIndex);
                    }
                }
                else {
                    // this token should not be searched
                    if (prevSearchInToken && searchStartOffset !== searchEndOffset) {
                        const r = searchPrevMatchingBracketInRange(lineNumber, lineText, searchStartOffset, searchEndOffset);
                        if (r) {
                            return r;
                        }
                    }
                }
                prevSearchInToken = searchInToken;
            }
            if (prevSearchInToken && searchStartOffset !== searchEndOffset) {
                const r = searchPrevMatchingBracketInRange(lineNumber, lineText, searchStartOffset, searchEndOffset);
                if (r) {
                    return r;
                }
            }
        }
        return null;
    }
    _findMatchingBracketDown(bracket, position, continueSearchPredicate) {
        // console.log('_findMatchingBracketDown: ', 'bracket: ', JSON.stringify(bracket), 'startPosition: ', String(position));
        const languageId = bracket.languageId;
        const bracketRegex = bracket.forwardRegex;
        let count = 1;
        let totalCallCount = 0;
        const searchNextMatchingBracketInRange = (lineNumber, lineText, searchStartOffset, searchEndOffset) => {
            while (true) {
                if (continueSearchPredicate && ++totalCallCount % 100 === 0 && !continueSearchPredicate()) {
                    return BracketSearchCanceled.INSTANCE;
                }
                const r = BracketsUtils.findNextBracketInRange(bracketRegex, lineNumber, lineText, searchStartOffset, searchEndOffset);
                if (!r) {
                    break;
                }
                const hitText = lineText.substring(r.startColumn - 1, r.endColumn - 1).toLowerCase();
                if (bracket.isOpen(hitText)) {
                    count++;
                }
                else if (bracket.isClose(hitText)) {
                    count--;
                }
                if (count === 0) {
                    return r;
                }
                searchStartOffset = r.endColumn - 1;
            }
            return null;
        };
        const lineCount = this.textModel.getLineCount();
        for (let lineNumber = position.lineNumber; lineNumber <= lineCount; lineNumber++) {
            const lineTokens = this.textModel.tokenization.getLineTokens(lineNumber);
            const tokenCount = lineTokens.getCount();
            const lineText = this.textModel.getLineContent(lineNumber);
            let tokenIndex = 0;
            let searchStartOffset = 0;
            let searchEndOffset = 0;
            if (lineNumber === position.lineNumber) {
                tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
                searchStartOffset = position.column - 1;
                searchEndOffset = position.column - 1;
            }
            let prevSearchInToken = true;
            for (; tokenIndex < tokenCount; tokenIndex++) {
                const searchInToken = lineTokens.getLanguageId(tokenIndex) === languageId &&
                    !ignoreBracketsInToken(lineTokens.getStandardTokenType(tokenIndex));
                if (searchInToken) {
                    // this token should be searched
                    if (prevSearchInToken) {
                        // the previous token should be searched, simply extend searchEndOffset
                        searchEndOffset = lineTokens.getEndOffset(tokenIndex);
                    }
                    else {
                        // the previous token should not be searched
                        searchStartOffset = lineTokens.getStartOffset(tokenIndex);
                        searchEndOffset = lineTokens.getEndOffset(tokenIndex);
                    }
                }
                else {
                    // this token should not be searched
                    if (prevSearchInToken && searchStartOffset !== searchEndOffset) {
                        const r = searchNextMatchingBracketInRange(lineNumber, lineText, searchStartOffset, searchEndOffset);
                        if (r) {
                            return r;
                        }
                    }
                }
                prevSearchInToken = searchInToken;
            }
            if (prevSearchInToken && searchStartOffset !== searchEndOffset) {
                const r = searchNextMatchingBracketInRange(lineNumber, lineText, searchStartOffset, searchEndOffset);
                if (r) {
                    return r;
                }
            }
        }
        return null;
    }
    findPrevBracket(_position) {
        const position = this.textModel.validatePosition(_position);
        if (this.canBuildAST) {
            this.bracketsRequested = true;
            this.updateBracketPairsTree();
            return this.bracketPairsTree.value?.object.getFirstBracketBefore(position) || null;
        }
        let languageId = null;
        let modeBrackets = null;
        let bracketConfig = null;
        for (let lineNumber = position.lineNumber; lineNumber >= 1; lineNumber--) {
            const lineTokens = this.textModel.tokenization.getLineTokens(lineNumber);
            const tokenCount = lineTokens.getCount();
            const lineText = this.textModel.getLineContent(lineNumber);
            let tokenIndex = tokenCount - 1;
            let searchStartOffset = lineText.length;
            let searchEndOffset = lineText.length;
            if (lineNumber === position.lineNumber) {
                tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
                searchStartOffset = position.column - 1;
                searchEndOffset = position.column - 1;
                const tokenLanguageId = lineTokens.getLanguageId(tokenIndex);
                if (languageId !== tokenLanguageId) {
                    languageId = tokenLanguageId;
                    modeBrackets =
                        this.languageConfigurationService.getLanguageConfiguration(languageId).brackets;
                    bracketConfig =
                        this.languageConfigurationService.getLanguageConfiguration(languageId).bracketsNew;
                }
            }
            let prevSearchInToken = true;
            for (; tokenIndex >= 0; tokenIndex--) {
                const tokenLanguageId = lineTokens.getLanguageId(tokenIndex);
                if (languageId !== tokenLanguageId) {
                    // language id change!
                    if (modeBrackets &&
                        bracketConfig &&
                        prevSearchInToken &&
                        searchStartOffset !== searchEndOffset) {
                        const r = BracketsUtils.findPrevBracketInRange(modeBrackets.reversedRegex, lineNumber, lineText, searchStartOffset, searchEndOffset);
                        if (r) {
                            return this._toFoundBracket(bracketConfig, r);
                        }
                        prevSearchInToken = false;
                    }
                    languageId = tokenLanguageId;
                    modeBrackets =
                        this.languageConfigurationService.getLanguageConfiguration(languageId).brackets;
                    bracketConfig =
                        this.languageConfigurationService.getLanguageConfiguration(languageId).bracketsNew;
                }
                const searchInToken = !!modeBrackets && !ignoreBracketsInToken(lineTokens.getStandardTokenType(tokenIndex));
                if (searchInToken) {
                    // this token should be searched
                    if (prevSearchInToken) {
                        // the previous token should be searched, simply extend searchStartOffset
                        searchStartOffset = lineTokens.getStartOffset(tokenIndex);
                    }
                    else {
                        // the previous token should not be searched
                        searchStartOffset = lineTokens.getStartOffset(tokenIndex);
                        searchEndOffset = lineTokens.getEndOffset(tokenIndex);
                    }
                }
                else {
                    // this token should not be searched
                    if (bracketConfig &&
                        modeBrackets &&
                        prevSearchInToken &&
                        searchStartOffset !== searchEndOffset) {
                        const r = BracketsUtils.findPrevBracketInRange(modeBrackets.reversedRegex, lineNumber, lineText, searchStartOffset, searchEndOffset);
                        if (r) {
                            return this._toFoundBracket(bracketConfig, r);
                        }
                    }
                }
                prevSearchInToken = searchInToken;
            }
            if (bracketConfig &&
                modeBrackets &&
                prevSearchInToken &&
                searchStartOffset !== searchEndOffset) {
                const r = BracketsUtils.findPrevBracketInRange(modeBrackets.reversedRegex, lineNumber, lineText, searchStartOffset, searchEndOffset);
                if (r) {
                    return this._toFoundBracket(bracketConfig, r);
                }
            }
        }
        return null;
    }
    findNextBracket(_position) {
        const position = this.textModel.validatePosition(_position);
        if (this.canBuildAST) {
            this.bracketsRequested = true;
            this.updateBracketPairsTree();
            return this.bracketPairsTree.value?.object.getFirstBracketAfter(position) || null;
        }
        const lineCount = this.textModel.getLineCount();
        let languageId = null;
        let modeBrackets = null;
        let bracketConfig = null;
        for (let lineNumber = position.lineNumber; lineNumber <= lineCount; lineNumber++) {
            const lineTokens = this.textModel.tokenization.getLineTokens(lineNumber);
            const tokenCount = lineTokens.getCount();
            const lineText = this.textModel.getLineContent(lineNumber);
            let tokenIndex = 0;
            let searchStartOffset = 0;
            let searchEndOffset = 0;
            if (lineNumber === position.lineNumber) {
                tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
                searchStartOffset = position.column - 1;
                searchEndOffset = position.column - 1;
                const tokenLanguageId = lineTokens.getLanguageId(tokenIndex);
                if (languageId !== tokenLanguageId) {
                    languageId = tokenLanguageId;
                    modeBrackets =
                        this.languageConfigurationService.getLanguageConfiguration(languageId).brackets;
                    bracketConfig =
                        this.languageConfigurationService.getLanguageConfiguration(languageId).bracketsNew;
                }
            }
            let prevSearchInToken = true;
            for (; tokenIndex < tokenCount; tokenIndex++) {
                const tokenLanguageId = lineTokens.getLanguageId(tokenIndex);
                if (languageId !== tokenLanguageId) {
                    // language id change!
                    if (bracketConfig &&
                        modeBrackets &&
                        prevSearchInToken &&
                        searchStartOffset !== searchEndOffset) {
                        const r = BracketsUtils.findNextBracketInRange(modeBrackets.forwardRegex, lineNumber, lineText, searchStartOffset, searchEndOffset);
                        if (r) {
                            return this._toFoundBracket(bracketConfig, r);
                        }
                        prevSearchInToken = false;
                    }
                    languageId = tokenLanguageId;
                    modeBrackets =
                        this.languageConfigurationService.getLanguageConfiguration(languageId).brackets;
                    bracketConfig =
                        this.languageConfigurationService.getLanguageConfiguration(languageId).bracketsNew;
                }
                const searchInToken = !!modeBrackets && !ignoreBracketsInToken(lineTokens.getStandardTokenType(tokenIndex));
                if (searchInToken) {
                    // this token should be searched
                    if (prevSearchInToken) {
                        // the previous token should be searched, simply extend searchEndOffset
                        searchEndOffset = lineTokens.getEndOffset(tokenIndex);
                    }
                    else {
                        // the previous token should not be searched
                        searchStartOffset = lineTokens.getStartOffset(tokenIndex);
                        searchEndOffset = lineTokens.getEndOffset(tokenIndex);
                    }
                }
                else {
                    // this token should not be searched
                    if (bracketConfig &&
                        modeBrackets &&
                        prevSearchInToken &&
                        searchStartOffset !== searchEndOffset) {
                        const r = BracketsUtils.findNextBracketInRange(modeBrackets.forwardRegex, lineNumber, lineText, searchStartOffset, searchEndOffset);
                        if (r) {
                            return this._toFoundBracket(bracketConfig, r);
                        }
                    }
                }
                prevSearchInToken = searchInToken;
            }
            if (bracketConfig &&
                modeBrackets &&
                prevSearchInToken &&
                searchStartOffset !== searchEndOffset) {
                const r = BracketsUtils.findNextBracketInRange(modeBrackets.forwardRegex, lineNumber, lineText, searchStartOffset, searchEndOffset);
                if (r) {
                    return this._toFoundBracket(bracketConfig, r);
                }
            }
        }
        return null;
    }
    findEnclosingBrackets(_position, maxDuration) {
        const position = this.textModel.validatePosition(_position);
        if (this.canBuildAST) {
            const range = Range.fromPositions(position);
            const bracketPair = this.getBracketPairsInRange(Range.fromPositions(position, position)).findLast((item) => item.closingBracketRange !== undefined && item.range.strictContainsRange(range));
            if (bracketPair) {
                return [bracketPair.openingBracketRange, bracketPair.closingBracketRange];
            }
            return null;
        }
        const continueSearchPredicate = createTimeBasedContinueBracketSearchPredicate(maxDuration);
        const lineCount = this.textModel.getLineCount();
        const savedCounts = new Map();
        let counts = [];
        const resetCounts = (languageId, modeBrackets) => {
            if (!savedCounts.has(languageId)) {
                const tmp = [];
                for (let i = 0, len = modeBrackets ? modeBrackets.brackets.length : 0; i < len; i++) {
                    tmp[i] = 0;
                }
                savedCounts.set(languageId, tmp);
            }
            counts = savedCounts.get(languageId);
        };
        let totalCallCount = 0;
        const searchInRange = (modeBrackets, lineNumber, lineText, searchStartOffset, searchEndOffset) => {
            while (true) {
                if (continueSearchPredicate && ++totalCallCount % 100 === 0 && !continueSearchPredicate()) {
                    return BracketSearchCanceled.INSTANCE;
                }
                const r = BracketsUtils.findNextBracketInRange(modeBrackets.forwardRegex, lineNumber, lineText, searchStartOffset, searchEndOffset);
                if (!r) {
                    break;
                }
                const hitText = lineText.substring(r.startColumn - 1, r.endColumn - 1).toLowerCase();
                const bracket = modeBrackets.textIsBracket[hitText];
                if (bracket) {
                    if (bracket.isOpen(hitText)) {
                        counts[bracket.index]++;
                    }
                    else if (bracket.isClose(hitText)) {
                        counts[bracket.index]--;
                    }
                    if (counts[bracket.index] === -1) {
                        return this._matchFoundBracket(r, bracket, false, continueSearchPredicate);
                    }
                }
                searchStartOffset = r.endColumn - 1;
            }
            return null;
        };
        let languageId = null;
        let modeBrackets = null;
        for (let lineNumber = position.lineNumber; lineNumber <= lineCount; lineNumber++) {
            const lineTokens = this.textModel.tokenization.getLineTokens(lineNumber);
            const tokenCount = lineTokens.getCount();
            const lineText = this.textModel.getLineContent(lineNumber);
            let tokenIndex = 0;
            let searchStartOffset = 0;
            let searchEndOffset = 0;
            if (lineNumber === position.lineNumber) {
                tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
                searchStartOffset = position.column - 1;
                searchEndOffset = position.column - 1;
                const tokenLanguageId = lineTokens.getLanguageId(tokenIndex);
                if (languageId !== tokenLanguageId) {
                    languageId = tokenLanguageId;
                    modeBrackets =
                        this.languageConfigurationService.getLanguageConfiguration(languageId).brackets;
                    resetCounts(languageId, modeBrackets);
                }
            }
            let prevSearchInToken = true;
            for (; tokenIndex < tokenCount; tokenIndex++) {
                const tokenLanguageId = lineTokens.getLanguageId(tokenIndex);
                if (languageId !== tokenLanguageId) {
                    // language id change!
                    if (modeBrackets && prevSearchInToken && searchStartOffset !== searchEndOffset) {
                        const r = searchInRange(modeBrackets, lineNumber, lineText, searchStartOffset, searchEndOffset);
                        if (r) {
                            return stripBracketSearchCanceled(r);
                        }
                        prevSearchInToken = false;
                    }
                    languageId = tokenLanguageId;
                    modeBrackets =
                        this.languageConfigurationService.getLanguageConfiguration(languageId).brackets;
                    resetCounts(languageId, modeBrackets);
                }
                const searchInToken = !!modeBrackets && !ignoreBracketsInToken(lineTokens.getStandardTokenType(tokenIndex));
                if (searchInToken) {
                    // this token should be searched
                    if (prevSearchInToken) {
                        // the previous token should be searched, simply extend searchEndOffset
                        searchEndOffset = lineTokens.getEndOffset(tokenIndex);
                    }
                    else {
                        // the previous token should not be searched
                        searchStartOffset = lineTokens.getStartOffset(tokenIndex);
                        searchEndOffset = lineTokens.getEndOffset(tokenIndex);
                    }
                }
                else {
                    // this token should not be searched
                    if (modeBrackets && prevSearchInToken && searchStartOffset !== searchEndOffset) {
                        const r = searchInRange(modeBrackets, lineNumber, lineText, searchStartOffset, searchEndOffset);
                        if (r) {
                            return stripBracketSearchCanceled(r);
                        }
                    }
                }
                prevSearchInToken = searchInToken;
            }
            if (modeBrackets && prevSearchInToken && searchStartOffset !== searchEndOffset) {
                const r = searchInRange(modeBrackets, lineNumber, lineText, searchStartOffset, searchEndOffset);
                if (r) {
                    return stripBracketSearchCanceled(r);
                }
            }
        }
        return null;
    }
    _toFoundBracket(bracketConfig, r) {
        if (!r) {
            return null;
        }
        let text = this.textModel.getValueInRange(r);
        text = text.toLowerCase();
        const bracketInfo = bracketConfig.getBracketInfo(text);
        if (!bracketInfo) {
            return null;
        }
        return {
            range: r,
            bracketInfo,
        };
    }
}
function createDisposableRef(object, disposable) {
    return {
        object,
        dispose: () => disposable?.dispose(),
    };
}
function createTimeBasedContinueBracketSearchPredicate(maxDuration) {
    if (typeof maxDuration === 'undefined') {
        return () => true;
    }
    else {
        const startTime = Date.now();
        return () => {
            return Date.now() - startTime <= maxDuration;
        };
    }
}
class BracketSearchCanceled {
    static { this.INSTANCE = new BracketSearchCanceled(); }
    constructor() {
        this._searchCanceledBrand = undefined;
    }
}
function stripBracketSearchCanceled(result) {
    if (result instanceof BracketSearchCanceled) {
        return null;
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldFBhaXJzSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC9icmFja2V0UGFpcnNUZXh0TW9kZWxQYXJ0L2JyYWNrZXRQYWlyc0ltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFHZixpQkFBaUIsR0FDakIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFLM0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFbkUsT0FBTyxFQUNOLGFBQWEsR0FHYixNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBaUJ6RSxNQUFNLE9BQU8seUJBQTBCLFNBQVEsVUFBVTtJQVF4RCxJQUFZLFdBQVc7UUFDdEIsTUFBTSwwQkFBMEIsR0FBRyxlQUFlLENBQUMsTUFBTSxHQUFHLDBCQUEwQixDQUFDLEdBQUcsQ0FBQTtRQUMxRixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFLElBQUksMEJBQTBCLENBQUE7SUFDckUsQ0FBQztJQUlELFlBQ2tCLFNBQW9CLEVBQ3BCLDRCQUEyRDtRQUU1RSxLQUFLLEVBQUUsQ0FBQTtRQUhVLGNBQVMsR0FBVCxTQUFTLENBQVc7UUFDcEIsaUNBQTRCLEdBQTVCLDRCQUE0QixDQUErQjtRQWhCNUQscUJBQWdCLEdBQUcsSUFB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