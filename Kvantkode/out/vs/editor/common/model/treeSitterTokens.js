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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclRva2Vucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC90cmVlU2l0dGVyVG9rZW5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFHTiw4QkFBOEIsR0FDOUIsTUFBTSxpQkFBaUIsQ0FBQTtBQUN4QixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFJcEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUM1QyxPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNsRixPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN0RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFFeEMsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBRXZELElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWlCLFNBQVEsY0FBYztJQWtCbkQsWUFDQyxlQUFpQyxFQUNqQyxTQUFvQixFQUNwQixVQUF3QixFQUV4QixXQUFpRTtRQUVqRSxLQUFLLENBQUMsZUFBZSxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUY1QixnQkFBVyxHQUFYLFdBQVcsQ0FBcUM7UUF0QjFELHlCQUFvQixHQUEwQyxJQUFJLENBQUE7UUFFaEUsaUNBQTRCLGtEQUNDO1FBQ3BCLDRDQUF1QyxHQUFrQixJQUFJLENBQUMsU0FBUyxDQUN6RixJQUFJLE9BQU8sRUFBUSxDQUNuQixDQUFBO1FBQ2UsMkNBQXNDLEdBQ3JELElBQUksQ0FBQyx1Q0FBdUMsQ0FBQyxLQUFLLENBQUE7UUFHbEMsMkJBQXNCLEdBQW1DLElB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