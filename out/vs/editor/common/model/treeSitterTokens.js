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
import { TreeSitterTokenizationRegistry, } from '../languages.js';
import { LineTokens } from '../tokens/lineTokens.js';
import { AbstractTokens } from './tokens.js';
import { MutableDisposable } from '../../../base/common/lifecycle.js';
import { ITreeSitterTokenizationStoreService } from './treeSitterTokenStoreService.js';
import { Range } from '../core/range.js';
import { Emitter } from '../../../base/common/event.js';
let TreeSitterTokens = class TreeSitterTokens extends AbstractTokens {
    constructor(languageIdCodec, textModel, languageId, _tokenStore) {
        super(languageIdCodec, textModel, languageId);
        this._tokenStore = _tokenStore;
        this._tokenizationSupport = null;
        this._backgroundTokenizationState = 1 /* BackgroundTokenizationState.InProgress */;
        this._onDidChangeBackgroundTokenizationState = this._register(new Emitter());
        this.onDidChangeBackgroundTokenizationState = this._onDidChangeBackgroundTokenizationState.event;
        this._tokensChangedListener = this._register(new MutableDisposable());
        this._onDidChangeBackgroundTokenization = this._register(new MutableDisposable());
        this._initialize();
    }
    _initialize() {
        const newLanguage = this.getLanguageId();
        if (!this._tokenizationSupport || this._lastLanguageId !== newLanguage) {
            this._lastLanguageId = newLanguage;
            this._tokenizationSupport = TreeSitterTokenizationRegistry.get(newLanguage);
            this._tokensChangedListener.value = this._tokenizationSupport?.onDidChangeTokens((e) => {
                if (e.textModel === this._textModel) {
                    this._onDidChangeTokens.fire(e.changes);
                }
            });
            this._onDidChangeBackgroundTokenization.value =
                this._tokenizationSupport?.onDidChangeBackgroundTokenization((e) => {
                    if (e.textModel === this._textModel) {
                        this._backgroundTokenizationState = 2 /* BackgroundTokenizationState.Completed */;
                        this._onDidChangeBackgroundTokenizationState.fire();
                    }
                });
        }
    }
    getLineTokens(lineNumber) {
        const content = this._textModel.getLineContent(lineNumber);
        if (this._tokenizationSupport && content.length > 0) {
            const rawTokens = this._tokenStore.getTokens(this._textModel, lineNumber);
            if (rawTokens && rawTokens.length > 0) {
                return new LineTokens(rawTokens, content, this._languageIdCodec);
            }
        }
        return LineTokens.createEmpty(content, this._languageIdCodec);
    }
    resetTokenization(fireTokenChangeEvent = true) {
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
        this._initialize();
    }
    handleDidChangeAttached() {
        // TODO @alexr00 implement for background tokenization
    }
    handleDidChangeContent(e) {
        if (e.isFlush) {
            // Don't fire the event, as the view might not have got the text change event yet
            this.resetTokenization(false);
        }
        else {
            this._tokenStore.handleContentChanged(this._textModel, e);
        }
    }
    forceTokenization(lineNumber) {
        if (this._tokenizationSupport && !this.hasAccurateTokensForLine(lineNumber)) {
            this._tokenizationSupport.tokenizeEncoded(lineNumber, this._textModel);
        }
    }
    hasAccurateTokensForLine(lineNumber) {
        return this._tokenStore.hasTokens(this._textModel, new Range(lineNumber, 1, lineNumber, this._textModel.getLineMaxColumn(lineNumber)));
    }
    isCheapToTokenize(lineNumber) {
        // TODO @alexr00 determine what makes it cheap to tokenize?
        return true;
    }
    getTokenTypeIfInsertingCharacter(lineNumber, column, character) {
        // TODO @alexr00 implement once we have custom parsing and don't just feed in the whole text model value
        return 0 /* StandardTokenType.Other */;
    }
    tokenizeLinesAt(lineNumber, lines) {
        if (this._tokenizationSupport) {
            const rawLineTokens = this._tokenizationSupport.guessTokensForLinesContent(lineNumber, this._textModel, lines);
            const lineTokens = [];
            if (rawLineTokens) {
                for (let i = 0; i < rawLineTokens.length; i++) {
                    lineTokens.push(new LineTokens(rawLineTokens[i], lines[i], this._languageIdCodec));
                }
                return lineTokens;
            }
        }
        return null;
    }
    get hasTokens() {
        return this._tokenStore.hasTokens(this._textModel);
    }
};
TreeSitterTokens = __decorate([
    __param(3, ITreeSitterTokenizationStoreService)
], TreeSitterTokens);
export { TreeSitterTokens };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclRva2Vucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvdHJlZVNpdHRlclRva2Vucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBR04sOEJBQThCLEdBQzlCLE1BQU0saUJBQWlCLENBQUE7QUFDeEIsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBSXBELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDNUMsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbEYsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBRXhDLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUV2RCxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFpQixTQUFRLGNBQWM7SUFrQm5ELFlBQ0MsZUFBaUMsRUFDakMsU0FBb0IsRUFDcEIsVUFBd0IsRUFFeEIsV0FBaUU7UUFFakUsS0FBSyxDQUFDLGVBQWUsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFGNUIsZ0JBQVcsR0FBWCxXQUFXLENBQXFDO1FBdEIxRCx5QkFBb0IsR0FBMEMsSUFBSSxDQUFBO1FBRWhFLGlDQUE0QixrREFDQztRQUNwQiw0Q0FBdUMsR0FBa0IsSUFBSSxDQUFDLFNBQVMsQ0FDekYsSUFBSSxPQUFPLEVBQVEsQ0FDbkIsQ0FBQTtRQUNlLDJDQUFzQyxHQUNyRCxJQUFJLENBQUMsdUNBQXVDLENBQUMsS0FBSyxDQUFBO1FBR2xDLDJCQUFzQixHQUFtQyxJQUFJLENBQUMsU0FBUyxDQUN2RixJQUFJ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