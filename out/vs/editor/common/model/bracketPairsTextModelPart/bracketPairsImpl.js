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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldFBhaXJzSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvYnJhY2tldFBhaXJzVGV4dE1vZGVsUGFydC9icmFja2V0UGFpcnNJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBR2YsaUJBQWlCLEdBQ2pCLE1BQU0sc0NBQXNDLENBQUE7QUFFN0MsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBSzNDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRW5FLE9BQU8sRUFDTixhQUFhLEdBR2IsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQWlCekUsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFVBQVU7SUFReEQsSUFBWSxXQUFXO1FBQ3RCLE1BQU0sMEJBQTBCLEdBQUcsZUFBZSxDQUFDLE1BQU0sR0FBRywwQkFBMEIsQ0FBQyxHQUFHLENBQUE7UUFDMUYsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxJQUFJLDBCQUEwQixDQUFBO0lBQ3JFLENBQUM7SUFJRCxZQUNrQixTQUFvQixFQUNwQiw0QkFBMkQ7UUFFNUUsS0FBSyxFQUFFLENBQUE7UUFIVSxjQUFTLEdBQVQsU0FBUyxDQUFXO1FBQ3BCLGlDQUE0QixHQUE1Qiw0QkFBNEIsQ0FBK0I7UUFoQjVELHFCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ2pELElBQUks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