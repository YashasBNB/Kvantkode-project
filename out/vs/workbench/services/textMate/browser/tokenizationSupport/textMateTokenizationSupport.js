/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { StopWatch } from '../../../../../base/common/stopwatch.js';
import { TokenMetadata } from '../../../../../editor/common/encodedTokenAttributes.js';
import { EncodedTokenizationResult, } from '../../../../../editor/common/languages.js';
export class TextMateTokenizationSupport extends Disposable {
    constructor(_grammar, _initialState, _containsEmbeddedLanguages, _createBackgroundTokenizer, _backgroundTokenizerShouldOnlyVerifyTokens, _reportTokenizationTime, _reportSlowTokenization) {
        super();
        this._grammar = _grammar;
        this._initialState = _initialState;
        this._containsEmbeddedLanguages = _containsEmbeddedLanguages;
        this._createBackgroundTokenizer = _createBackgroundTokenizer;
        this._backgroundTokenizerShouldOnlyVerifyTokens = _backgroundTokenizerShouldOnlyVerifyTokens;
        this._reportTokenizationTime = _reportTokenizationTime;
        this._reportSlowTokenization = _reportSlowTokenization;
        this._seenLanguages = [];
        this._onDidEncounterLanguage = this._register(new Emitter());
        this.onDidEncounterLanguage = this._onDidEncounterLanguage.event;
    }
    get backgroundTokenizerShouldOnlyVerifyTokens() {
        return this._backgroundTokenizerShouldOnlyVerifyTokens();
    }
    getInitialState() {
        return this._initialState;
    }
    tokenize(line, hasEOL, state) {
        throw new Error('Not supported!');
    }
    createBackgroundTokenizer(textModel, store) {
        if (this._createBackgroundTokenizer) {
            return this._createBackgroundTokenizer(textModel, store);
        }
        return undefined;
    }
    tokenizeEncoded(line, hasEOL, state) {
        const isRandomSample = Math.random() * 10_000 < 1;
        const shouldMeasure = this._reportSlowTokenization || isRandomSample;
        const sw = shouldMeasure ? new StopWatch(true) : undefined;
        const textMateResult = this._grammar.tokenizeLine2(line, state, 500);
        if (shouldMeasure) {
            const timeMS = sw.elapsed();
            if (isRandomSample || timeMS > 32) {
                this._reportTokenizationTime(timeMS, line.length, isRandomSample);
            }
        }
        if (textMateResult.stoppedEarly) {
            console.warn(`Time limit reached when tokenizing line: ${line.substring(0, 100)}`);
            // return the state at the beginning of the line
            return new EncodedTokenizationResult(textMateResult.tokens, state);
        }
        if (this._containsEmbeddedLanguages) {
            const seenLanguages = this._seenLanguages;
            const tokens = textMateResult.tokens;
            // Must check if any of the embedded languages was hit
            for (let i = 0, len = tokens.length >>> 1; i < len; i++) {
                const metadata = tokens[(i << 1) + 1];
                const languageId = TokenMetadata.getLanguageId(metadata);
                if (!seenLanguages[languageId]) {
                    seenLanguages[languageId] = true;
                    this._onDidEncounterLanguage.fire(languageId);
                }
            }
        }
        let endState;
        // try to save an object if possible
        if (state.equals(textMateResult.ruleStack)) {
            endState = state;
        }
        else {
            endState = textMateResult.ruleStack;
        }
        return new EncodedTokenizationResult(textMateResult.tokens, endState);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVUb2tlbml6YXRpb25TdXBwb3J0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRNYXRlL2Jyb3dzZXIvdG9rZW5pemF0aW9uU3VwcG9ydC90ZXh0TWF0ZVRva2VuaXphdGlvblN1cHBvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkUsT0FBTyxFQUFjLGFBQWEsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTix5QkFBeUIsR0FNekIsTUFBTSwyQ0FBMkMsQ0FBQTtBQUlsRCxNQUFNLE9BQU8sMkJBQTRCLFNBQVEsVUFBVTtJQU8xRCxZQUNrQixRQUFrQixFQUNsQixhQUF5QixFQUN6QiwwQkFBbUMsRUFDbkMsMEJBS0wsRUFDSywwQ0FBeUQsRUFDekQsdUJBSVIsRUFDUSx1QkFBZ0M7UUFFakQsS0FBSyxFQUFFLENBQUE7UUFqQlUsYUFBUSxHQUFSLFFBQVEsQ0FBVTtRQUNsQixrQkFBYSxHQUFiLGFBQWEsQ0FBWTtRQUN6QiwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQVM7UUFDbkMsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUsvQjtRQUNLLCtDQUEwQyxHQUExQywwQ0FBMEMsQ0FBZTtRQUN6RCw0QkFBdUIsR0FBdkIsdUJBQXVCLENBSS9CO1FBQ1EsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUFTO1FBdEJqQyxtQkFBYyxHQUFjLEVBQUUsQ0FBQTtRQUM5Qiw0QkFBdUIsR0FBd0IsSUFBSSxDQUFDLFNBQVMsQ0FDN0UsSUFBSSxP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