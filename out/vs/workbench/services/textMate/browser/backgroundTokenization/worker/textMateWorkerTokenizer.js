/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { RunOnceScheduler } from '../../../../../../base/common/async.js';
import { observableValue } from '../../../../../../base/common/observable.js';
import { setTimeout0 } from '../../../../../../base/common/platform.js';
import { LineRange } from '../../../../../../editor/common/core/lineRange.js';
import { MirrorTextModel, } from '../../../../../../editor/common/model/mirrorTextModel.js';
import { TokenizerWithStateStore } from '../../../../../../editor/common/model/textModelTokens.js';
import { ContiguousMultilineTokensBuilder } from '../../../../../../editor/common/tokens/contiguousMultilineTokensBuilder.js';
import { LineTokens } from '../../../../../../editor/common/tokens/lineTokens.js';
import { TextMateTokenizationSupport } from '../../tokenizationSupport/textMateTokenizationSupport.js';
import { TokenizationSupportWithLineLimit } from '../../tokenizationSupport/tokenizationSupportWithLineLimit.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
export class TextMateWorkerTokenizer extends MirrorTextModel {
    constructor(uri, lines, eol, versionId, _host, _languageId, _encodedLanguageId, maxTokenizationLineLength) {
        super(uri, lines, eol, versionId);
        this._host = _host;
        this._languageId = _languageId;
        this._encodedLanguageId = _encodedLanguageId;
        this._tokenizerWithStateStore = null;
        this._isDisposed = false;
        this._maxTokenizationLineLength = observableValue(this, -1);
        this._tokenizeDebouncer = new RunOnceScheduler(() => this._tokenize(), 10);
        this._maxTokenizationLineLength.set(maxTokenizationLineLength, undefined);
        this._resetTokenization();
    }
    dispose() {
        this._isDisposed = true;
        super.dispose();
    }
    onLanguageId(languageId, encodedLanguageId) {
        this._languageId = languageId;
        this._encodedLanguageId = encodedLanguageId;
        this._resetTokenization();
    }
    onEvents(e) {
        super.onEvents(e);
        this._tokenizerWithStateStore?.store.acceptChanges(e.changes);
        this._tokenizeDebouncer.schedule();
    }
    acceptMaxTokenizationLineLength(maxTokenizationLineLength) {
        this._maxTokenizationLineLength.set(maxTokenizationLineLength, undefined);
    }
    retokenize(startLineNumber, endLineNumberExclusive) {
        if (this._tokenizerWithStateStore) {
            this._tokenizerWithStateStore.store.invalidateEndStateRange(new LineRange(startLineNumber, endLineNumberExclusive));
            this._tokenizeDebouncer.schedule();
        }
    }
    async _resetTokenization() {
        this._tokenizerWithStateStore = null;
        const languageId = this._languageId;
        const encodedLanguageId = this._encodedLanguageId;
        const r = await this._host.getOrCreateGrammar(languageId, encodedLanguageId);
        if (this._isDisposed ||
            languageId !== this._languageId ||
            encodedLanguageId !== this._encodedLanguageId ||
            !r) {
            return;
        }
        if (r.grammar) {
            const tokenizationSupport = new TokenizationSupportWithLineLimit(this._encodedLanguageId, new TextMateTokenizationSupport(r.grammar, r.initialState, false, undefined, () => false, (timeMs, lineLength, isRandomSample) => {
                this._host.reportTokenizationTime(timeMs, languageId, r.sourceExtensionId, lineLength, isRandomSample);
            }, false), Disposable.None, this._maxTokenizationLineLength);
            this._tokenizerWithStateStore = new TokenizerWithStateStore(this._lines.length, tokenizationSupport);
        }
        else {
            this._tokenizerWithStateStore = null;
        }
        this._tokenize();
    }
    async _tokenize() {
        if (this._isDisposed || !this._tokenizerWithStateStore) {
            return;
        }
        if (!this._diffStateStacksRefEqFn) {
            const { diffStateStacksRefEq } = await importAMDNodeModule('vscode-textmate', 'release/main.js');
            this._diffStateStacksRefEqFn = diffStateStacksRefEq;
        }
        const startTime = new Date().getTime();
        while (true) {
            let tokenizedLines = 0;
            const tokenBuilder = new ContiguousMultilineTokensBuilder();
            const stateDeltaBuilder = new StateDeltaBuilder();
            while (true) {
                const lineToTokenize = this._tokenizerWithStateStore.getFirstInvalidLine();
                if (lineToTokenize === null || tokenizedLines > 200) {
                    break;
                }
                tokenizedLines++;
                const text = this._lines[lineToTokenize.lineNumber - 1];
                const r = this._tokenizerWithStateStore.tokenizationSupport.tokenizeEncoded(text, true, lineToTokenize.startState);
                if (this._tokenizerWithStateStore.store.setEndState(lineToTokenize.lineNumber, r.endState)) {
                    const delta = this._diffStateStacksRefEqFn(lineToTokenize.startState, r.endState);
                    stateDeltaBuilder.setState(lineToTokenize.lineNumber, delta);
                }
                else {
                    stateDeltaBuilder.setState(lineToTokenize.lineNumber, null);
                }
                LineTokens.convertToEndOffset(r.tokens, text.length);
                tokenBuilder.add(lineToTokenize.lineNumber, r.tokens);
                const deltaMs = new Date().getTime() - startTime;
                if (deltaMs > 20) {
                    // yield to check for changes
                    break;
                }
            }
            if (tokenizedLines === 0) {
                break;
            }
            const stateDeltas = stateDeltaBuilder.getStateDeltas();
            this._host.setTokensAndStates(this._versionId, tokenBuilder.serialize(), stateDeltas);
            const deltaMs = new Date().getTime() - startTime;
            if (deltaMs > 20) {
                // yield to check for changes
                setTimeout0(() => this._tokenize());
                return;
            }
        }
    }
}
class StateDeltaBuilder {
    constructor() {
        this._lastStartLineNumber = -1;
        this._stateDeltas = [];
    }
    setState(lineNumber, stackDiff) {
        if (lineNumber === this._lastStartLineNumber + 1) {
            this._stateDeltas[this._stateDeltas.length - 1].stateDeltas.push(stackDiff);
        }
        else {
            this._stateDeltas.push({ startLineNumber: lineNumber, stateDeltas: [stackDiff] });
        }
        this._lastStartLineNumber = lineNumber;
    }
    getStateDeltas() {
        return this._stateDeltas;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVXb3JrZXJUb2tlbml6ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dE1hdGUvYnJvd3Nlci9iYWNrZ3JvdW5kVG9rZW5pemF0aW9uL3dvcmtlci90ZXh0TWF0ZVdvcmtlclRva2VuaXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRXZFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUU3RSxPQUFPLEVBRU4sZUFBZSxHQUNmLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDbEcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sNEVBQTRFLENBQUE7QUFDN0gsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3RHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBSWhILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQWlCdkUsTUFBTSxPQUFPLHVCQUF3QixTQUFRLGVBQWU7SUFPM0QsWUFDQyxHQUFRLEVBQ1IsS0FBZSxFQUNmLEdBQVcsRUFDWCxTQUFpQixFQUNBLEtBQWlDLEVBQzFDLFdBQW1CLEVBQ25CLGtCQUE4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