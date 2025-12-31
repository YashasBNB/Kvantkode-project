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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemF0aW9uVGV4dE1vZGVsUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvdG9rZW5pemF0aW9uVGV4dE1vZGVsUGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDdEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sYUFBYSxFQUNiLGVBQWUsRUFDZixpQkFBaUIsR0FDakIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ2hELE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUV6RCxPQUFPLEVBQW1CLGFBQWEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRXRFLE9BQU8sRUFNTixvQkFBb0IsRUFDcEIsOEJBQThCLEdBQzlCLE1BQU0saUJBQWlCLENBQUE7QUFDeEIsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDM0QsT0FBTyxFQUNOLDZCQUE2QixHQUc3QixNQUFNLCtDQUErQyxDQUFBO0FBSXRELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNsRCxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLG1DQUFtQyxFQUNuQyw4QkFBOEIsR0FDOUIsTUFBTSxzQkFBc0IsQ0FBQTtBQUM3QixPQUFPLEVBQUUsY0FBYyxFQUFFLG1CQUFtQixFQUFpQixNQUFNLGFBQWEsQ0FBQTtBQUNoRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQVl4RCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUcxRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUV4RixJQUFNLHlCQUF5QixpQ0FBL0IsTUFBTSx5QkFBMEIsU0FBUSxhQUFhO0lBd0IzRCxZQUNrQixVQUFxQixFQUNyQiwwQkFBcUQsRUFDOUQsV0FBbUIsRUFDVixjQUE2QixFQUM1QixnQkFBbUQsRUFFckUsNkJBQTZFLEVBQ3RELHFCQUE2RDtRQUVwRixLQUFLLEVBQUUsQ0FBQTtRQVRVLGVBQVUsR0FBVixVQUFVLENBQVc7UUFDckIsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUEyQjtRQUM5RCxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUNWLG1CQUFjLEdBQWQsY0FBYyxDQUFlO1FBQ1gscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUVwRCxrQ0FBNkIsR0FBN0IsNkJBQTZCLENBQStCO1FBQ3JDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUEvQnBFLG9CQUFlLEdBQXNCLElBQUksaUJBQWlCLENBQzFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQ3JDLENBQUE7UUFFZ0IseUJBQW9CLEdBQXdDLElBQUksQ0FBQyxTQUFTLENBQzFGLElBQUksT0FBTyxFQUE4QixDQUN6QyxDQUFBO1FBQ2Usd0JBQW1CLEdBQ2xDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUE7UUFFZixzQ0FBaUMsR0FDakQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBMkMsQ0FBQyxDQUFBO1FBQ3ZELHFDQUFnQyxHQUMvQyxJQUFJLENBQUMsaUNBQWlDLENBQUMsS0FBSyxDQUFBO1FBRTVCLHVCQUFrQixHQUFzQyxJQUFJLENBQUMsU0FBUyxDQUN0RixJQUFJLE9BQU8sRUFBNEIsQ0FDdkMsQ0FBQTtRQUNlLHNCQUFpQixHQUFvQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFBO1FBR2pGLHVCQUFrQixHQUFvQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQTtRQWMzRiw0RUFBNEU7UUFDNUUsc0hBQXNIO1FBQ3RILG9FQUFvRTtRQUNwRSxJQUFJLENBQUMsU0FBUyxDQUNiLEtBQUssQ0FBQyxNQUFNLENBQUMsOEJBQThCLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDOUQsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQzdDLENBQUMsR0FBRyxFQUFFO1lBQ04sSUFBSSxDQUFDLDRCQUE0QixFQUFFLENBQUE7UUFDcEMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyw0QkFBNEIsRUFBRSxDQUFBO0lBQ3BDLENBQUM7SUFFTyxtQkFBbUI7UUFDMUIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUNwQixJQUFJLGFBQWEsQ0FDaEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsRUFDckMsSUFBSSxDQUFDLFVBQVUsRUFDZixHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUN0QixJQUFJLENBQUMsY0FBYyxDQUNuQixDQUNELENBQUE7SUFDRixDQUFDO0lBRU8sc0JBQXNCO1FBQzdCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FDcEIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FDeEMsZ0JBQWdCLEVBQ2hCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLEVBQ3JDLElBQUksQ0FBQyxVQUFVLEVBQ2YsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FDdEIsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVPLFlBQVksQ0FBQyxhQUFzQjtRQUMxQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxLQUFLLFNBQVMsQ0FBQTtRQUM3QyxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxPQUFPLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDekYsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBQy9CLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQzFCLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNwQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQzFCLElBQUksQ0FBQyxPQUFPLENBQUMsc0NBQXNDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN6RCxJQUFJLENBQUMsMEJBQTBCLENBQUMsMENBQTBDLEVBQUUsQ0FBQTtRQUM3RSxDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQix3SkFBd0o7WUFDeEosSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBQ2pDLENBQUM7SUFDRixDQUFDO0lBRU8sNEJBQTRCO1FBQ25DLElBQUksOEJBQThCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQzFELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLFlBQVksZ0JBQWdCLENBQUMsRUFBRSxDQUFDO2dCQUNqRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3hCLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLFlBQVksYUFBYSxDQUFDLEVBQUUsQ0FBQztnQkFDOUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUN6QixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxhQUFhO1FBQ1osT0FBTyxDQUNOLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxZQUFZLEVBQUU7WUFDeEMsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLFlBQVksRUFBRTtZQUNyRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsWUFBWSxFQUFFLENBQ3RDLENBQUE7SUFDRixDQUFDO0lBRU0sd0NBQXdDLENBQzlDLENBQTBDO1FBRTFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsaUNBQWlDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2hELENBQUM7SUFDRixDQUFDO0lBRU0sc0JBQXNCLENBQUMsQ0FBNEI7UUFDekQsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQzdCLENBQUM7YUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzNCLGdEQUFnRDtZQUNoRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDM0IsTUFBTSxDQUFDLFFBQVEsRUFBRSxlQUFlLEVBQUUsY0FBYyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFFcEUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQzlCLENBQUMsQ0FBQyxLQUFLLEVBQ1AsUUFBUSxFQUNSLGVBQWUsRUFDZixjQUFjLEVBQ2QsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLHNCQUFjLENBQ3hELENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVNLHVCQUF1QjtRQUM3QixJQUFJLENBQUMsT0FBTyxDQUFDLHVCQUF1QixFQUFFLENBQUE7SUFDdkMsQ0FBQztJQUVEOztPQUVHO0lBQ0ksYUFBYSxDQUFDLFVBQWtCO1FBQ3RDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNuQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUM5RCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLFVBQVUsRUFBRSxlQUFlLENBQUMsQ0FBQTtJQUN6RSxDQUFDO0lBRU8sNEJBQTRCLENBQUMsQ0FBMkI7UUFDL0QsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsMEJBQTBCLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDeEQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNoQyxDQUFDO0lBQ0YsQ0FBQztJQUVELHlCQUF5QjtJQUVqQixrQkFBa0IsQ0FBQyxVQUFrQjtRQUM1QyxJQUFJLFVBQVUsR0FBRyxDQUFDLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQztZQUNuRSxNQUFNLElBQUksa0JBQWtCLENBQUMsOEJBQThCLENBQUMsQ0FBQTtRQUM3RCxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQVcsU0FBUztRQUNuQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFBO0lBQzlCLENBQUM7SUFFTSxpQkFBaUI7UUFDdkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ2pDLENBQUM7SUFFRCxJQUFXLDJCQUEyQjtRQUNyQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsMkJBQTJCLENBQUE7SUFDaEQsQ0FBQztJQUVNLGlCQUFpQixDQUFDLFVBQWtCO1FBQzFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNuQyxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFTSx3QkFBd0IsQ0FBQyxVQUFrQjtRQUNqRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDbkMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3pELENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxVQUFrQjtRQUMxQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDbkMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFFTSxlQUFlLENBQUMsVUFBa0I7UUFDeEMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ25DLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFFTSxnQ0FBZ0MsQ0FDdEMsVUFBa0IsRUFDbEIsTUFBYyxFQUNkLFNBQWlCO1FBRWpCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQ0FBZ0MsQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQ3BGLENBQUM7SUFFTSxlQUFlLENBQUMsVUFBa0IsRUFBRSxLQUFlO1FBQ3pELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFRCxhQUFhO0lBRWIsMEJBQTBCO0lBRW5CLGlCQUFpQixDQUFDLE1BQXNDLEVBQUUsVUFBbUI7UUFDbkYsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBRTVDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQztZQUNqQyxxQkFBcUIsRUFBRSxNQUFNLEtBQUssSUFBSTtZQUN0QyxNQUFNLEVBQUUsQ0FBQyxFQUFFLGNBQWMsRUFBRSxDQUFDLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQztTQUM3RSxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU0seUJBQXlCO1FBQy9CLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtJQUN6QyxDQUFDO0lBRU0scUJBQXFCO1FBQzNCLE9BQU8sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3ZDLENBQUM7SUFFTSx3QkFBd0IsQ0FBQyxLQUFZLEVBQUUsTUFBK0I7UUFDNUUsSUFBSSxJQUFJLENBQUMseUJBQXlCLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQ2pELElBQUksQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FDOUMsQ0FBQTtRQUVELElBQUksQ0FBQyw0QkFBNEIsQ0FBQztZQUNqQyxxQkFBcUIsRUFBRSxJQUFJO1lBQzNCLE1BQU0sRUFBRTtnQkFDUDtvQkFDQyxjQUFjLEVBQUUsWUFBWSxDQUFDLGVBQWU7b0JBQzVDLFlBQVksRUFBRSxZQUFZLENBQUMsYUFBYTtpQkFDeEM7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxhQUFhO0lBRWIsMEJBQTBCO0lBRW5CLGlCQUFpQixDQUFDLFNBQW9CO1FBQzVDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBRXhCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDNUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3ZFLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzFELE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRXpFLDRDQUE0QztRQUM1QyxNQUFNLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxHQUFHLDJCQUF5QixDQUFDLHVCQUF1QixDQUNyRixVQUFVLEVBQ1YsVUFBVSxDQUNWLENBQUE7UUFDRCxNQUFNLGVBQWUsR0FBRyxhQUFhLENBQ3BDLFFBQVEsQ0FBQyxNQUFNLEVBQ2YsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxFQUN2RixXQUFXLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsRUFDakQsYUFBYSxDQUNiLENBQUE7UUFDRCwrREFBK0Q7UUFDL0QsSUFDQyxlQUFlO1lBQ2YsZUFBZSxDQUFDLFdBQVcsSUFBSSxTQUFTLENBQUMsTUFBTTtZQUMvQyxTQUFTLENBQUMsTUFBTSxJQUFJLGVBQWUsQ0FBQyxTQUFTLEVBQzVDLENBQUM7WUFDRixPQUFPLGVBQWUsQ0FBQTtRQUN2QixDQUFDO1FBRUQsMkVBQTJFO1FBQzNFLElBQUksVUFBVSxHQUFHLENBQUMsSUFBSSxhQUFhLEtBQUssUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM3RCwyRkFBMkY7WUFDM0YsTUFBTSxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsR0FBRywyQkFBeUIsQ0FBQyx1QkFBdUIsQ0FDckYsVUFBVSxFQUNWLFVBQVUsR0FBRyxDQUFDLENBQ2QsQ0FBQTtZQUNELE1BQU0sY0FBYyxHQUFHLGFBQWEsQ0FDbkMsUUFBUSxDQUFDLE1BQU0sRUFDZixJQUFJLENBQUMsd0JBQXdCLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxFQUMzRixXQUFXLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsRUFDakQsYUFBYSxDQUNiLENBQUE7WUFDRCwrREFBK0Q7WUFDL0QsSUFDQyxjQUFjO2dCQUNkLGNBQWMsQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLE1BQU07Z0JBQzlDLFNBQVMsQ0FBQyxNQUFNLElBQUksY0FBYyxDQUFDLFNBQVMsRUFDM0MsQ0FBQztnQkFDRixPQUFPLGNBQWMsQ0FBQTtZQUN0QixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVPLHdCQUF3QixDQUFDLFVBQWtCO1FBQ2xELE9BQU8sSUFBSSxDQUFDLDZCQUE2QixDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQy9FLENBQUM7SUFFTyxNQUFNLENBQUMsdUJBQXVCLENBQ3JDLFVBQXNCLEVBQ3RCLFVBQWtCO1FBRWxCLE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFdkQsNENBQTRDO1FBQzVDLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQTtRQUNuQixLQUFLLElBQUksQ0FBQyxHQUFHLFVBQVUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEtBQUssVUFBVSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDcEYsV0FBVyxHQUFHLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDM0MsQ0FBQztRQUVELDZDQUE2QztRQUM3QyxJQUFJLFNBQVMsR0FBRyxVQUFVLENBQUMsY0FBYyxFQUFFLENBQUMsTUFBTSxDQUFBO1FBQ2xELEtBQ0MsSUFBSSxDQUFDLEdBQUcsVUFBVSxFQUFFLFVBQVUsR0FBRyxVQUFVLENBQUMsUUFBUSxFQUFFLEVBQ3RELENBQUMsR0FBRyxVQUFVLElBQUksVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsS0FBSyxVQUFVLEVBQzVELENBQUMsRUFBRSxFQUNGLENBQUM7WUFDRixTQUFTLEdBQUcsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN2QyxDQUFDO1FBRUQsT0FBTyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0lBRU0sb0JBQW9CLENBQUMsUUFBbUI7UUFDOUMsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3ZELElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNyQixPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQzlFLENBQUM7UUFDRCxPQUFPO1lBQ04sSUFBSSxFQUFFLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxXQUFXLENBQUM7WUFDakYsV0FBVyxFQUFFLGNBQWMsQ0FBQyxXQUFXO1lBQ3ZDLFNBQVMsRUFBRSxRQUFRLENBQUMsTUFBTTtTQUMxQixDQUFBO0lBQ0YsQ0FBQztJQUVELGFBQWE7SUFFYiwrQkFBK0I7SUFFeEIsYUFBYTtRQUNuQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUE7SUFDeEIsQ0FBQztJQUVNLHVCQUF1QixDQUFDLFVBQWtCLEVBQUUsTUFBYztRQUNoRSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ25GLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzFELE9BQU8sVUFBVSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3hGLENBQUM7SUFFTSxhQUFhLENBQUMsVUFBa0IsRUFBRSxTQUFpQixLQUFLO1FBQzlELElBQUksSUFBSSxDQUFDLFdBQVcsS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUNyQyx3QkFBd0I7WUFDeEIsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLENBQUMsR0FBK0I7WUFDckMsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO1lBQzdCLFdBQVcsRUFBRSxVQUFVO1lBQ3ZCLE1BQU07U0FDTixDQUFBO1FBRUQsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUE7UUFFN0IsSUFBSSxDQUFDLDBCQUEwQixDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzFELElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUNoQyxJQUFJLENBQUMsNEJBQTRCLEVBQUUsQ0FBQTtRQUNuQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDaEQsQ0FBQztDQUdELENBQUE7QUFyWVkseUJBQXlCO0lBNkJuQyxXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsNkJBQTZCLENBQUE7SUFFN0IsV0FBQSxxQkFBcUIsQ0FBQTtHQWhDWCx5QkFBeUIsQ0FxWXJDOztBQUVELE1BQU0sYUFBYyxTQUFRLGNBQWM7SUEyQnpDLFlBQ0MsZUFBaUMsRUFDakMsU0FBb0IsRUFDcEIsYUFBMkIsRUFDM0IsYUFBNEI7UUFFNUIsS0FBSyxDQUFDLGVBQWUsRUFBRSxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFoQ3pDLGVBQVUsR0FBK0MsSUFBSSxDQUFBO1FBQzNELGlDQUE0QixrREFDQztRQUNwQiw0Q0FBdUMsR0FBa0IsSUFBSSxDQUFDLFNBQVMsQ0FDekYsSUFBSSxPQUFPLEVBQVEsQ0FDbkIsQ0FBQTtRQUNlLDJDQUFzQyxHQUNyRCxJQUFJLENBQUMsdUNBQXVDLENBQUMsS0FBSyxDQUFBO1FBRTNDLGdDQUEyQixHQUFzQyxJQUFJLENBQUE7UUFDNUQseUJBQW9CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDckQsSUFBSSxpQkFBaUIsRUFBd0IsQ0FDN0MsQ0FBQTtRQUVnQixZQUFPLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUkxRCw4QkFBeUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMxRCxJQUFJLGlCQUFpQixFQUF3QixDQUM3QyxDQUFBO1FBRWdCLHdCQUFtQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3BELElBQUksYUFBYSxFQUFzQyxDQUN2RCxDQUFBO1FBVUEsSUFBSSxDQUFDLFNBQVMsQ0FDYixvQkFBb0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN0QyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7WUFDdkMsSUFBSSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ25ELE9BQU07WUFDUCxDQUFDO1lBQ0QsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDekIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBRXhCLElBQUksQ0FBQyxTQUFTLENBQ2IsYUFBYSxDQUFDLHdCQUF3QixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRTtZQUMxRCxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ2pELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDZixRQUFRLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO29CQUNsRixJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQTtnQkFDN0MsQ0FBQztnQkFDRCxRQUFRLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDbEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNoRCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyx1QkFBZ0MsSUFBSTtRQUM1RCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3BCLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLEVBQUUsQ0FBQTtRQUNwQyxJQUFJLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLDhCQUE4QixDQUMvRCxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxDQUM5QixDQUFBO1FBQ0YsQ0FBQztRQUNELElBQUksb0JBQW9CLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDO2dCQUM1QixxQkFBcUIsRUFBRSxLQUFLO2dCQUM1QixNQUFNLEVBQUU7b0JBQ1A7d0JBQ0MsY0FBYyxFQUFFLENBQUM7d0JBQ2pCLFlBQVksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRTtxQkFDNUM7aUJBQ0Q7YUFDRCxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsTUFBTSxzQkFBc0IsR0FBRyxHQUFrRCxFQUFFO1lBQ2xGLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyx5QkFBeUIsRUFBRSxFQUFFLENBQUM7Z0JBQ2pELE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDcEIsQ0FBQztZQUNELE1BQU0sbUJBQW1CLEdBQUcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFBO1lBQzFFLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2dCQUMxQixPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3BCLENBQUM7WUFDRCxJQUFJLFlBQW9CLENBQUE7WUFDeEIsSUFBSSxDQUFDO2dCQUNKLFlBQVksR0FBRyxtQkFBbUIsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtZQUNyRCxDQUFDO1lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDWixpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDcEIsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNwQixDQUFDO1lBQ0QsT0FBTyxDQUFDLG1CQUFtQixFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQzNDLENBQUMsQ0FBQTtRQUVELE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxZQUFZLENBQUMsR0FBRyxzQkFBc0IsRUFBRSxDQUFBO1FBQ3BFLElBQUksbUJBQW1CLElBQUksWUFBWSxFQUFFLENBQUM7WUFDekMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLG1DQUFtQyxDQUN4RCxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxFQUM5QixtQkFBbUIsRUFDbkIsSUFBSSxDQUFDLFVBQVUsRUFDZixJQUFJLENBQUMsZ0JBQWdCLENBQ3JCLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFBO1FBQ3ZCLENBQUM7UUFFRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFakMsSUFBSSxDQUFDLDJCQUEyQixHQUFHLElBQUksQ0FBQTtRQUN2QyxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNyQixNQUFNLENBQUMsR0FBaUM7Z0JBQ3ZDLFNBQVMsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO29CQUNyQixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUN2QixDQUFDO2dCQUNELDhCQUE4QixFQUFFLEdBQUcsRUFBRTtvQkFDcEMsSUFBSSxJQUFJLENBQUMsNEJBQTRCLGtEQUEwQyxFQUFFLENBQUM7d0JBQ2pGLHVFQUF1RTt3QkFDdkUsT0FBTTtvQkFDUCxDQUFDO29CQUNELE1BQU0sUUFBUSxnREFBd0MsQ0FBQTtvQkFDdEQsSUFBSSxDQUFDLDRCQUE0QixHQUFHLFFBQVEsQ0FBQTtvQkFDNUMsSUFBSSxDQUFDLHVDQUF1QyxDQUFDLElBQUksRUFBRSxDQUFBO2dCQUNwRCxDQUFDO2dCQUNELFdBQVcsRUFBRSxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsRUFBRTtvQkFDbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQzt3QkFDdEIsT0FBTTtvQkFDUCxDQUFDO29CQUNELE1BQU0sOEJBQThCLEdBQ25DLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxFQUFFLENBQUE7b0JBQzFELHdGQUF3RjtvQkFDeEYsSUFDQyw4QkFBOEIsS0FBSyxJQUFJO3dCQUN2QyxVQUFVLElBQUksOEJBQThCLEVBQzNDLENBQUM7d0JBQ0YsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtvQkFDdEQsQ0FBQztnQkFDRixDQUFDO2FBQ0QsQ0FBQTtZQUVELElBQ0MsbUJBQW1CO2dCQUNuQixtQkFBbUIsQ0FBQyx5QkFBeUI7Z0JBQzdDLENBQUMsbUJBQW1CLENBQUMseUNBQXlDLEVBQzdELENBQUM7Z0JBQ0YsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyx5QkFBeUIsQ0FDOUUsSUFBSSxDQUFDLFVBQVUsRUFDZixDQUFDLENBQ0QsQ0FBQTtZQUNGLENBQUM7WUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMseUJBQXlCLEVBQUUsRUFBRSxDQUFDO2dCQUN0RixJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQywyQkFBMkI7b0JBQ2pFLElBQUksMEJBQTBCLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDbkQsSUFBSSxDQUFDLDJCQUEyQixDQUFDLGFBQWEsRUFBRSxDQUFBO1lBQ2pELENBQUM7WUFFRCxJQUNDLG1CQUFtQixFQUFFLHlDQUF5QztnQkFDOUQsbUJBQW1CLENBQUMseUJBQXlCLEVBQzVDLENBQUM7Z0JBQ0YsSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUkscUJBQXFCLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUE7Z0JBQzlFLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLDhCQUE4QixDQUMvRCxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxDQUM5QixDQUFBO2dCQUNELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtnQkFDdEMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyx5QkFBeUIsQ0FDbkYsSUFBSSxDQUFDLFVBQVUsRUFDZjtvQkFDQyxTQUFTLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTt3QkFDckIsSUFBSSxDQUFDLHNCQUFzQixFQUFFLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7b0JBQ3pFLENBQUM7b0JBQ0QsOEJBQThCO3dCQUM3QixRQUFRO29CQUNULENBQUM7b0JBQ0QsV0FBVyxFQUFFLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFO3dCQUNsQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsV0FBVyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtvQkFDNUQsQ0FBQztpQkFDRCxDQUNELENBQUE7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLHNCQUFzQixHQUFHLFNBQVMsQ0FBQTtnQkFDdkMsSUFBSSxDQUFDLHNCQUFzQixHQUFHLFNBQVMsQ0FBQTtnQkFDdkMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssR0FBRyxTQUFTLENBQUE7WUFDakQsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQTtJQUNuQyxDQUFDO0lBRU0sdUJBQXVCO1FBQzdCLElBQUksQ0FBQywyQkFBMkIsRUFBRSxhQUFhLEVBQUUsQ0FBQTtJQUNsRCxDQUFDO0lBRU0sc0JBQXNCLENBQUMsQ0FBNEI7UUFDekQsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZixpRkFBaUY7WUFDakYsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzlCLENBQUM7YUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzNCLGdEQUFnRDtZQUNoRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDM0IsTUFBTSxDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUVwRCxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQTtnQkFDM0QsSUFBSSxDQUFDLHNCQUFzQixFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQTtZQUM1RSxDQUFDO1lBQ0QsSUFBSSxDQUFDLHNCQUFzQixFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7WUFFckQsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3JCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDL0MsQ0FBQztZQUNELElBQUksQ0FBQywyQkFBMkIsRUFBRSxhQUFhLEVBQUUsQ0FBQTtRQUNsRCxDQUFDO0lBQ0YsQ0FBQztJQUVPLFNBQVMsQ0FBQyxNQUFtQztRQUdwRCxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRTVFLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUscUJBQXFCLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQ2hGLENBQUM7UUFFRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFBO0lBQzVCLENBQUM7SUFFTywyQkFBMkI7UUFDbEMsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQzlGLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVPLGFBQWEsQ0FBQyxNQUE0QjtRQUNqRCxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsc0JBQXNCLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDM0UsQ0FBQztJQUNGLENBQUM7SUFFTyxZQUFZLENBQUMsZUFBdUIsRUFBRSxhQUFxQjtRQUNsRSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3RCLE9BQU07UUFDUCxDQUFDO1FBRUQsZUFBZSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFBO1FBQ3hGLGFBQWEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFFdkUsTUFBTSxPQUFPLEdBQUcsSUFBSSxnQ0FBZ0MsRUFBRSxDQUFBO1FBQ3RELE1BQU0sRUFBRSxlQUFlLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUNoRSxPQUFPLEVBQ1AsZUFBZSxFQUNmLGFBQWEsQ0FDYixDQUFBO1FBQ0QsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUV4RCxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3JCLHVEQUF1RDtZQUN2RCxvRUFBb0U7WUFDcEUseUVBQXlFO1lBQ3pFLEtBQUssTUFBTSxDQUFDLElBQUksYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN2QyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDckYsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsMkJBQTJCLEVBQUUsYUFBYSxFQUFFLENBQUE7SUFDbEQsQ0FBQztJQUVNLGlCQUFpQixDQUFDLFVBQWtCO1FBQzFDLE1BQU0sT0FBTyxHQUFHLElBQUksZ0NBQWdDLEVBQUUsQ0FBQTtRQUN0RCxJQUFJLENBQUMsVUFBVSxFQUFFLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUMzRCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQ2xDLElBQUksQ0FBQywyQkFBMkIsRUFBRSxhQUFhLEVBQUUsQ0FBQTtJQUNsRCxDQUFDO0lBRU0sd0JBQXdCLENBQUMsVUFBa0I7UUFDakQsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN0QixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDNUQsQ0FBQztJQUVNLGlCQUFpQixDQUFDLFVBQWtCO1FBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDdEIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFTSxhQUFhLENBQUMsVUFBa0I7UUFDdEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDM0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsRUFBRSxVQUFVLEdBQUcsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ2hHLElBQUksSUFBSSxDQUFDLHNCQUFzQixJQUFJLElBQUksQ0FBQyxzQkFBc0IsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDbkYsSUFDQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsc0NBQXNDLEVBQUUsR0FBRyxVQUFVO2dCQUNqRixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLFVBQVUsRUFDMUUsQ0FBQztnQkFDRixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLENBQzdELElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUFFLEVBQy9CLFVBQVUsR0FBRyxDQUFDLEVBQ2QsUUFBUSxDQUNSLENBQUE7Z0JBQ0QsSUFDQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUM7b0JBQ2hDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLEVBQUUsdUJBQXVCLEVBQzVELENBQUM7b0JBQ0YsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDekUsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU0sZ0NBQWdDLENBQ3RDLFVBQWtCLEVBQ2xCLE1BQWMsRUFDZCxTQUFpQjtRQUVqQixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3RCLHVDQUE4QjtRQUMvQixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUNuRixJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzNDLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQ0FBZ0MsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDN0UsQ0FBQztJQUVNLGVBQWUsQ0FBQyxVQUFrQixFQUFFLEtBQWU7UUFDekQsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN0QixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDbEMsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDMUQsQ0FBQztJQUVELElBQVcsU0FBUztRQUNuQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFBO0lBQzlCLENBQUM7Q0FDRCJ9