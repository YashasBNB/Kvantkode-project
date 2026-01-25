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
var TokenizationTextModelPart_1;
import { BugIndicatingError, onUnexpectedError } from '../../../base/common/errors.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { DisposableMap, DisposableStore, MutableDisposable, } from '../../../base/common/lifecycle.js';
import { countEOL } from '../core/eolCounter.js';
import { LineRange } from '../core/lineRange.js';
import { Position } from '../core/position.js';
import { getWordAtText } from '../core/wordHelper.js';
import { TokenizationRegistry, TreeSitterTokenizationRegistry, } from '../languages.js';
import { ILanguageService } from '../languages/language.js';
import { ILanguageConfigurationService, } from '../languages/languageConfigurationRegistry.js';
import { TextModelPart } from './textModelPart.js';
import { DefaultBackgroundTokenizer, TokenizerWithStateStoreAndTextModel, TrackingTokenizationStateStore, } from './textModelTokens.js';
import { AbstractTokens, AttachedViewHandler } from './tokens.js';
import { TreeSitterTokens } from './treeSitterTokens.js';
import { ContiguousMultilineTokensBuilder } from '../tokens/contiguousMultilineTokensBuilder.js';
import { ContiguousTokensStore } from '../tokens/contiguousTokensStore.js';
import { SparseTokensStore } from '../tokens/sparseTokensStore.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
let TokenizationTextModelPart = TokenizationTextModelPart_1 = class TokenizationTextModelPart extends TextModelPart {
    constructor(_textModel, _bracketPairsTextModelPart, _languageId, _attachedViews, _languageService, _languageConfigurationService, _instantiationService) {
        super();
        this._textModel = _textModel;
        this._bracketPairsTextModelPart = _bracketPairsTextModelPart;
        this._languageId = _languageId;
        this._attachedViews = _attachedViews;
        this._languageService = _languageService;
        this._languageConfigurationService = _languageConfigurationService;
        this._instantiationService = _instantiationService;
        this._semanticTokens = new SparseTokensStore(this._languageService.languageIdCodec);
        this._onDidChangeLanguage = this._register(new Emitter());
        this.onDidChangeLanguage = this._onDidChangeLanguage.event;
        this._onDidChangeLanguageConfiguration = this._register(new Emitter());
        this.onDidChangeLanguageConfiguration = this._onDidChangeLanguageConfiguration.event;
        this._onDidChangeTokens = this._register(new Emitter());
        this.onDidChangeTokens = this._onDidChangeTokens.event;
        this._tokensDisposables = this._register(new DisposableStore());
        // We just look at registry changes to determine whether to use tree sitter.
        // This means that removing a language from the setting will not cause a switch to textmate and will require a reload.
        // Adding a language to the setting will not need a reload, however.
        this._register(Event.filter(TreeSitterTokenizationRegistry.onDidChange, (e) => e.changedLanguages.includes(this._languageId))(() => {
            this.createPreferredTokenProvider();
        }));
        this.createPreferredTokenProvider();
    }
    createGrammarTokens() {
        return this._register(new GrammarTokens(this._languageService.languageIdCodec, this._textModel, () => this._languageId, this._attachedViews));
    }
    createTreeSitterTokens() {
        return this._register(this._instantiationService.createInstance(TreeSitterTokens, this._languageService.languageIdCodec, this._textModel, () => this._languageId));
    }
    createTokens(useTreeSitter) {
        const needsReset = this._tokens !== undefined;
        this._tokens?.dispose();
        this._tokens = useTreeSitter ? this.createTreeSitterTokens() : this.createGrammarTokens();
        this._tokensDisposables.clear();
        this._tokensDisposables.add(this._tokens.onDidChangeTokens((e) => {
            this._emitModelTokensChangedEvent(e);
        }));
        this._tokensDisposables.add(this._tokens.onDidChangeBackgroundTokenizationState((e) => {
            this._bracketPairsTextModelPart.handleDidChangeBackgroundTokenizationState();
        }));
        if (needsReset) {
            // We need to reset the tokenization, as the new token provider otherwise won't have a chance to provide tokens until some action happens in the editor.
            this._tokens.resetTokenization();
        }
    }
    createPreferredTokenProvider() {
        if (TreeSitterTokenizationRegistry.get(this._languageId)) {
            if (!(this._tokens instanceof TreeSitterTokens)) {
                this.createTokens(true);
            }
        }
        else {
            if (!(this._tokens instanceof GrammarTokens)) {
                this.createTokens(false);
            }
        }
    }
    _hasListeners() {
        return (this._onDidChangeLanguage.hasListeners() ||
            this._onDidChangeLanguageConfiguration.hasListeners() ||
            this._onDidChangeTokens.hasListeners());
    }
    handleLanguageConfigurationServiceChange(e) {
        if (e.affects(this._languageId)) {
            this._onDidChangeLanguageConfiguration.fire({});
        }
    }
    handleDidChangeContent(e) {
        if (e.isFlush) {
            this._semanticTokens.flush();
        }
        else if (!e.isEolChange) {
            // We don't have to do anything on an EOL change
            for (const c of e.changes) {
                const [eolCount, firstLineLength, lastLineLength] = countEOL(c.text);
                this._semanticTokens.acceptEdit(c.range, eolCount, firstLineLength, lastLineLength, c.text.length > 0 ? c.text.charCodeAt(0) : 0 /* CharCode.Null */);
            }
        }
        this._tokens.handleDidChangeContent(e);
    }
    handleDidChangeAttached() {
        this._tokens.handleDidChangeAttached();
    }
    /**
     * Includes grammar and semantic tokens.
     */
    getLineTokens(lineNumber) {
        this.validateLineNumber(lineNumber);
        const syntacticTokens = this._tokens.getLineTokens(lineNumber);
        return this._semanticTokens.addSparseTokens(lineNumber, syntacticTokens);
    }
    _emitModelTokensChangedEvent(e) {
        if (!this._textModel._isDisposing()) {
            this._bracketPairsTextModelPart.handleDidChangeTokens(e);
            this._onDidChangeTokens.fire(e);
        }
    }
    // #region Grammar Tokens
    validateLineNumber(lineNumber) {
        if (lineNumber < 1 || lineNumber > this._textModel.getLineCount()) {
            throw new BugIndicatingError('Illegal value for lineNumber');
        }
    }
    get hasTokens() {
        return this._tokens.hasTokens;
    }
    resetTokenization() {
        this._tokens.resetTokenization();
    }
    get backgroundTokenizationState() {
        return this._tokens.backgroundTokenizationState;
    }
    forceTokenization(lineNumber) {
        this.validateLineNumber(lineNumber);
        this._tokens.forceTokenization(lineNumber);
    }
    hasAccurateTokensForLine(lineNumber) {
        this.validateLineNumber(lineNumber);
        return this._tokens.hasAccurateTokensForLine(lineNumber);
    }
    isCheapToTokenize(lineNumber) {
        this.validateLineNumber(lineNumber);
        return this._tokens.isCheapToTokenize(lineNumber);
    }
    tokenizeIfCheap(lineNumber) {
        this.validateLineNumber(lineNumber);
        this._tokens.tokenizeIfCheap(lineNumber);
    }
    getTokenTypeIfInsertingCharacter(lineNumber, column, character) {
        return this._tokens.getTokenTypeIfInsertingCharacter(lineNumber, column, character);
    }
    tokenizeLinesAt(lineNumber, lines) {
        return this._tokens.tokenizeLinesAt(lineNumber, lines);
    }
    // #endregion
    // #region Semantic Tokens
    setSemanticTokens(tokens, isComplete) {
        this._semanticTokens.set(tokens, isComplete);
        this._emitModelTokensChangedEvent({
            semanticTokensApplied: tokens !== null,
            ranges: [{ fromLineNumber: 1, toLineNumber: this._textModel.getLineCount() }],
        });
    }
    hasCompleteSemanticTokens() {
        return this._semanticTokens.isComplete();
    }
    hasSomeSemanticTokens() {
        return !this._semanticTokens.isEmpty();
    }
    setPartialSemanticTokens(range, tokens) {
        if (this.hasCompleteSemanticTokens()) {
            return;
        }
        const changedRange = this._textModel.validateRange(this._semanticTokens.setPartial(range, tokens));
        this._emitModelTokensChangedEvent({
            semanticTokensApplied: true,
            ranges: [
                {
                    fromLineNumber: changedRange.startLineNumber,
                    toLineNumber: changedRange.endLineNumber,
                },
            ],
        });
    }
    // #endregion
    // #region Utility Methods
    getWordAtPosition(_position) {
        this.assertNotDisposed();
        const position = this._textModel.validatePosition(_position);
        const lineContent = this._textModel.getLineContent(position.lineNumber);
        const lineTokens = this.getLineTokens(position.lineNumber);
        const tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
        // (1). First try checking right biased word
        const [rbStartOffset, rbEndOffset] = TokenizationTextModelPart_1._findLanguageBoundaries(lineTokens, tokenIndex);
        const rightBiasedWord = getWordAtText(position.column, this.getLanguageConfiguration(lineTokens.getLanguageId(tokenIndex)).getWordDefinition(), lineContent.substring(rbStartOffset, rbEndOffset), rbStartOffset);
        // Make sure the result touches the original passed in position
        if (rightBiasedWord &&
            rightBiasedWord.startColumn <= _position.column &&
            _position.column <= rightBiasedWord.endColumn) {
            return rightBiasedWord;
        }
        // (2). Else, if we were at a language boundary, check the left biased word
        if (tokenIndex > 0 && rbStartOffset === position.column - 1) {
            // edge case, where `position` sits between two tokens belonging to two different languages
            const [lbStartOffset, lbEndOffset] = TokenizationTextModelPart_1._findLanguageBoundaries(lineTokens, tokenIndex - 1);
            const leftBiasedWord = getWordAtText(position.column, this.getLanguageConfiguration(lineTokens.getLanguageId(tokenIndex - 1)).getWordDefinition(), lineContent.substring(lbStartOffset, lbEndOffset), lbStartOffset);
            // Make sure the result touches the original passed in position
            if (leftBiasedWord &&
                leftBiasedWord.startColumn <= _position.column &&
                _position.column <= leftBiasedWord.endColumn) {
                return leftBiasedWord;
            }
        }
        return null;
    }
    getLanguageConfiguration(languageId) {
        return this._languageConfigurationService.getLanguageConfiguration(languageId);
    }
    static _findLanguageBoundaries(lineTokens, tokenIndex) {
        const languageId = lineTokens.getLanguageId(tokenIndex);
        // go left until a different language is hit
        let startOffset = 0;
        for (let i = tokenIndex; i >= 0 && lineTokens.getLanguageId(i) === languageId; i--) {
            startOffset = lineTokens.getStartOffset(i);
        }
        // go right until a different language is hit
        let endOffset = lineTokens.getLineContent().length;
        for (let i = tokenIndex, tokenCount = lineTokens.getCount(); i < tokenCount && lineTokens.getLanguageId(i) === languageId; i++) {
            endOffset = lineTokens.getEndOffset(i);
        }
        return [startOffset, endOffset];
    }
    getWordUntilPosition(position) {
        const wordAtPosition = this.getWordAtPosition(position);
        if (!wordAtPosition) {
            return { word: '', startColumn: position.column, endColumn: position.column };
        }
        return {
            word: wordAtPosition.word.substr(0, position.column - wordAtPosition.startColumn),
            startColumn: wordAtPosition.startColumn,
            endColumn: position.column,
        };
    }
    // #endregion
    // #region Language Id handling
    getLanguageId() {
        return this._languageId;
    }
    getLanguageIdAtPosition(lineNumber, column) {
        const position = this._textModel.validatePosition(new Position(lineNumber, column));
        const lineTokens = this.getLineTokens(position.lineNumber);
        return lineTokens.getLanguageId(lineTokens.findTokenIndexAtOffset(position.column - 1));
    }
    setLanguageId(languageId, source = 'api') {
        if (this._languageId === languageId) {
            // There's nothing to do
            return;
        }
        const e = {
            oldLanguage: this._languageId,
            newLanguage: languageId,
            source,
        };
        this._languageId = languageId;
        this._bracketPairsTextModelPart.handleDidChangeLanguage(e);
        this._tokens.resetTokenization();
        this.createPreferredTokenProvider();
        this._onDidChangeLanguage.fire(e);
        this._onDidChangeLanguageConfiguration.fire({});
    }
};
TokenizationTextModelPart = TokenizationTextModelPart_1 = __decorate([
    __param(4, ILanguageService),
    __param(5, ILanguageConfigurationService),
    __param(6, IInstantiationService)
], TokenizationTextModelPart);
export { TokenizationTextModelPart };
class GrammarTokens extends AbstractTokens {
    constructor(languageIdCodec, textModel, getLanguageId, attachedViews) {
        super(languageIdCodec, textModel, getLanguageId);
        this._tokenizer = null;
        this._backgroundTokenizationState = 1 /* BackgroundTokenizationState.InProgress */;
        this._onDidChangeBackgroundTokenizationState = this._register(new Emitter());
        this.onDidChangeBackgroundTokenizationState = this._onDidChangeBackgroundTokenizationState.event;
        this._defaultBackgroundTokenizer = null;
        this._backgroundTokenizer = this._register(new MutableDisposable());
        this._tokens = new ContiguousTokensStore(this._languageIdCodec);
        this._debugBackgroundTokenizer = this._register(new MutableDisposable());
        this._attachedViewStates = this._register(new DisposableMap());
        this._register(TokenizationRegistry.onDidChange((e) => {
            const languageId = this.getLanguageId();
            if (e.changedLanguages.indexOf(languageId) === -1) {
                return;
            }
            this.resetTokenization();
        }));
        this.resetTokenization();
        this._register(attachedViews.onDidChangeVisibleRanges(({ view, state }) => {
            if (state) {
                let existing = this._attachedViewStates.get(view);
                if (!existing) {
                    existing = new AttachedViewHandler(() => this.refreshRanges(existing.lineRanges));
                    this._attachedViewStates.set(view, existing);
                }
                existing.handleStateChange(state);
            }
            else {
                this._attachedViewStates.deleteAndDispose(view);
            }
        }));
    }
    resetTokenization(fireTokenChangeEvent = true) {
        this._tokens.flush();
        this._debugBackgroundTokens?.flush();
        if (this._debugBackgroundStates) {
            this._debugBackgroundStates = new TrackingTokenizationStateStore(this._textModel.getLineCount());
        }
        if (fireTokenChangeEvent) {
            this._onDidChangeTokens.fire({
                semanticTokensApplied: false,
                ranges: [
                    {
                        fromLineNumber: 1,
                        toLineNumber: this._textModel.getLineCount(),
                    },
                ],
            });
        }
        const initializeTokenization = () => {
            if (this._textModel.isTooLargeForTokenization()) {
                return [null, null];
            }
            const tokenizationSupport = TokenizationRegistry.get(this.getLanguageId());
            if (!tokenizationSupport) {
                return [null, null];
            }
            let initialState;
            try {
                initialState = tokenizationSupport.getInitialState();
            }
            catch (e) {
                onUnexpectedError(e);
                return [null, null];
            }
            return [tokenizationSupport, initialState];
        };
        const [tokenizationSupport, initialState] = initializeTokenization();
        if (tokenizationSupport && initialState) {
            this._tokenizer = new TokenizerWithStateStoreAndTextModel(this._textModel.getLineCount(), tokenizationSupport, this._textModel, this._languageIdCodec);
        }
        else {
            this._tokenizer = null;
        }
        this._backgroundTokenizer.clear();
        this._defaultBackgroundTokenizer = null;
        if (this._tokenizer) {
            const b = {
                setTokens: (tokens) => {
                    this.setTokens(tokens);
                },
                backgroundTokenizationFinished: () => {
                    if (this._backgroundTokenizationState === 2 /* BackgroundTokenizationState.Completed */) {
                        // We already did a full tokenization and don't go back to progressing.
                        return;
                    }
                    const newState = 2 /* BackgroundTokenizationState.Completed */;
                    this._backgroundTokenizationState = newState;
                    this._onDidChangeBackgroundTokenizationState.fire();
                },
                setEndState: (lineNumber, state) => {
                    if (!this._tokenizer) {
                        return;
                    }
                    const firstInvalidEndStateLineNumber = this._tokenizer.store.getFirstInvalidEndStateLineNumber();
                    // Don't accept states for definitely valid states, the renderer is ahead of the worker!
                    if (firstInvalidEndStateLineNumber !== null &&
                        lineNumber >= firstInvalidEndStateLineNumber) {
                        this._tokenizer?.store.setEndState(lineNumber, state);
                    }
                },
            };
            if (tokenizationSupport &&
                tokenizationSupport.createBackgroundTokenizer &&
                !tokenizationSupport.backgroundTokenizerShouldOnlyVerifyTokens) {
                this._backgroundTokenizer.value = tokenizationSupport.createBackgroundTokenizer(this._textModel, b);
            }
            if (!this._backgroundTokenizer.value && !this._textModel.isTooLargeForTokenization()) {
                this._backgroundTokenizer.value = this._defaultBackgroundTokenizer =
                    new DefaultBackgroundTokenizer(this._tokenizer, b);
                this._defaultBackgroundTokenizer.handleChanges();
            }
            if (tokenizationSupport?.backgroundTokenizerShouldOnlyVerifyTokens &&
                tokenizationSupport.createBackgroundTokenizer) {
                this._debugBackgroundTokens = new ContiguousTokensStore(this._languageIdCodec);
                this._debugBackgroundStates = new TrackingTokenizationStateStore(this._textModel.getLineCount());
                this._debugBackgroundTokenizer.clear();
                this._debugBackgroundTokenizer.value = tokenizationSupport.createBackgroundTokenizer(this._textModel, {
                    setTokens: (tokens) => {
                        this._debugBackgroundTokens?.setMultilineTokens(tokens, this._textModel);
                    },
                    backgroundTokenizationFinished() {
                        // NO OP
                    },
                    setEndState: (lineNumber, state) => {
                        this._debugBackgroundStates?.setEndState(lineNumber, state);
                    },
                });
            }
            else {
                this._debugBackgroundTokens = undefined;
                this._debugBackgroundStates = undefined;
                this._debugBackgroundTokenizer.value = undefined;
            }
        }
        this.refreshAllVisibleLineTokens();
    }
    handleDidChangeAttached() {
        this._defaultBackgroundTokenizer?.handleChanges();
    }
    handleDidChangeContent(e) {
        if (e.isFlush) {
            // Don't fire the event, as the view might not have got the text change event yet
            this.resetTokenization(false);
        }
        else if (!e.isEolChange) {
            // We don't have to do anything on an EOL change
            for (const c of e.changes) {
                const [eolCount, firstLineLength] = countEOL(c.text);
                this._tokens.acceptEdit(c.range, eolCount, firstLineLength);
                this._debugBackgroundTokens?.acceptEdit(c.range, eolCount, firstLineLength);
            }
            this._debugBackgroundStates?.acceptChanges(e.changes);
            if (this._tokenizer) {
                this._tokenizer.store.acceptChanges(e.changes);
            }
            this._defaultBackgroundTokenizer?.handleChanges();
        }
    }
    setTokens(tokens) {
        const { changes } = this._tokens.setMultilineTokens(tokens, this._textModel);
        if (changes.length > 0) {
            this._onDidChangeTokens.fire({ semanticTokensApplied: false, ranges: changes });
        }
        return { changes: changes };
    }
    refreshAllVisibleLineTokens() {
        const ranges = LineRange.joinMany([...this._attachedViewStates].map(([_, s]) => s.lineRanges));
        this.refreshRanges(ranges);
    }
    refreshRanges(ranges) {
        for (const range of ranges) {
            this.refreshRange(range.startLineNumber, range.endLineNumberExclusive - 1);
        }
    }
    refreshRange(startLineNumber, endLineNumber) {
        if (!this._tokenizer) {
            return;
        }
        startLineNumber = Math.max(1, Math.min(this._textModel.getLineCount(), startLineNumber));
        endLineNumber = Math.min(this._textModel.getLineCount(), endLineNumber);
        const builder = new ContiguousMultilineTokensBuilder();
        const { heuristicTokens } = this._tokenizer.tokenizeHeuristically(builder, startLineNumber, endLineNumber);
        const changedTokens = this.setTokens(builder.finalize());
        if (heuristicTokens) {
            // We overrode tokens with heuristically computed ones.
            // Because old states might get reused (thus stopping invalidation),
            // we have to explicitly request the tokens for the changed ranges again.
            for (const c of changedTokens.changes) {
                this._backgroundTokenizer.value?.requestTokens(c.fromLineNumber, c.toLineNumber + 1);
            }
        }
        this._defaultBackgroundTokenizer?.checkFinished();
    }
    forceTokenization(lineNumber) {
        const builder = new ContiguousMultilineTokensBuilder();
        this._tokenizer?.updateTokensUntilLine(builder, lineNumber);
        this.setTokens(builder.finalize());
        this._defaultBackgroundTokenizer?.checkFinished();
    }
    hasAccurateTokensForLine(lineNumber) {
        if (!this._tokenizer) {
            return true;
        }
        return this._tokenizer.hasAccurateTokensForLine(lineNumber);
    }
    isCheapToTokenize(lineNumber) {
        if (!this._tokenizer) {
            return true;
        }
        return this._tokenizer.isCheapToTokenize(lineNumber);
    }
    getLineTokens(lineNumber) {
        const lineText = this._textModel.getLineContent(lineNumber);
        const result = this._tokens.getTokens(this._textModel.getLanguageId(), lineNumber - 1, lineText);
        if (this._debugBackgroundTokens && this._debugBackgroundStates && this._tokenizer) {
            if (this._debugBackgroundStates.getFirstInvalidEndStateLineNumberOrMax() > lineNumber &&
                this._tokenizer.store.getFirstInvalidEndStateLineNumberOrMax() > lineNumber) {
                const backgroundResult = this._debugBackgroundTokens.getTokens(this._textModel.getLanguageId(), lineNumber - 1, lineText);
                if (!result.equals(backgroundResult) &&
                    this._debugBackgroundTokenizer.value?.reportMismatchingTokens) {
                    this._debugBackgroundTokenizer.value.reportMismatchingTokens(lineNumber);
                }
            }
        }
        return result;
    }
    getTokenTypeIfInsertingCharacter(lineNumber, column, character) {
        if (!this._tokenizer) {
            return 0 /* StandardTokenType.Other */;
        }
        const position = this._textModel.validatePosition(new Position(lineNumber, column));
        this.forceTokenization(position.lineNumber);
        return this._tokenizer.getTokenTypeIfInsertingCharacter(position, character);
    }
    tokenizeLinesAt(lineNumber, lines) {
        if (!this._tokenizer) {
            return null;
        }
        this.forceTokenization(lineNumber);
        return this._tokenizer.tokenizeLinesAt(lineNumber, lines);
    }
    get hasTokens() {
        return this._tokens.hasTokens;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemF0aW9uVGV4dE1vZGVsUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC90b2tlbml6YXRpb25UZXh0TW9kZWxQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN0RixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFDTixhQUFhLEVBQ2IsZUFBZSxFQUNmLGlCQUFpQixHQUNqQixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDaEQsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRXpELE9BQU8sRUFBbUIsYUFBYSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFdEUsT0FBTyxFQU1OLG9CQUFvQixFQUNwQiw4QkFBOEIsR0FDOUIsTUFBTSxpQkFBaUIsQ0FBQTtBQUN4QixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sNkJBQTZCLEdBRzdCLE1BQU0sK0NBQStDLENBQUE7QUFJdEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ2xELE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsbUNBQW1DLEVBQ25DLDhCQUE4QixHQUM5QixNQUFNLHNCQUFzQixDQUFBO0FBQzdCLE9BQU8sRUFBRSxjQUFjLEVBQUUsbUJBQW1CLEVBQWlCLE1BQU0sYUFBYSxDQUFBO0FB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