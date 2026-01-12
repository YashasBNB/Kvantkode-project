/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { importAMDNodeModule } from '../../../../../amdX.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, keepObserved } from '../../../../../base/common/observable.js';
import { countEOL } from '../../../../../editor/common/core/eolCounter.js';
import { LineRange } from '../../../../../editor/common/core/lineRange.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { TokenizationStateStore } from '../../../../../editor/common/model/textModelTokens.js';
import { ContiguousMultilineTokensBuilder } from '../../../../../editor/common/tokens/contiguousMultilineTokensBuilder.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
import { ArrayEdit, MonotonousIndexTransformer, SingleArrayEdit } from '../arrayOperation.js';
export class TextMateWorkerTokenizerController extends Disposable {
    static { this._id = 0; }
    constructor(_model, _worker, _languageIdCodec, _backgroundTokenizationStore, _configurationService, _maxTokenizationLineLength) {
        super();
        this._model = _model;
        this._worker = _worker;
        this._languageIdCodec = _languageIdCodec;
        this._backgroundTokenizationStore = _backgroundTokenizationStore;
        this._configurationService = _configurationService;
        this._maxTokenizationLineLength = _maxTokenizationLineLength;
        this.controllerId = TextMateWorkerTokenizerController._id++;
        this._pendingChanges = [];
        /**
         * These states will eventually equal the worker states.
         * _states[i] stores the state at the end of line number i+1.
         */
        this._states = new TokenizationStateStore();
        this._loggingEnabled = observableConfigValue('editor.experimental.asyncTokenizationLogging', false, this._configurationService);
        this._register(keepObserved(this._loggingEnabled));
        this._register(this._model.onDidChangeContent((e) => {
            if (this._shouldLog) {
                console.log('model change', {
                    fileName: this._model.uri.fsPath.split('\\').pop(),
                    changes: changesToString(e.changes),
                });
            }
            this._worker.$acceptModelChanged(this.controllerId, e);
            this._pendingChanges.push(e);
        }));
        this._register(this._model.onDidChangeLanguage((e) => {
            const languageId = this._model.getLanguageId();
            const encodedLanguageId = this._languageIdCodec.encodeLanguageId(languageId);
            this._worker.$acceptModelLanguageChanged(this.controllerId, languageId, encodedLanguageId);
        }));
        const languageId = this._model.getLanguageId();
        const encodedLanguageId = this._languageIdCodec.encodeLanguageId(languageId);
        this._worker.$acceptNewModel({
            uri: this._model.uri,
            versionId: this._model.getVersionId(),
            lines: this._model.getLinesContent(),
            EOL: this._model.getEOL(),
            languageId,
            encodedLanguageId,
            maxTokenizationLineLength: this._maxTokenizationLineLength.get(),
            controllerId: this.controllerId,
        });
        this._register(autorun((reader) => {
            /** @description update maxTokenizationLineLength */
            const maxTokenizationLineLength = this._maxTokenizationLineLength.read(reader);
            this._worker.$acceptMaxTokenizationLineLength(this.controllerId, maxTokenizationLineLength);
        }));
    }
    dispose() {
        super.dispose();
        this._worker.$acceptRemovedModel(this.controllerId);
    }
    requestTokens(startLineNumber, endLineNumberExclusive) {
        this._worker.$retokenize(this.controllerId, startLineNumber, endLineNumberExclusive);
    }
    /**
     * This method is called from the worker through the worker host.
     */
    async setTokensAndStates(controllerId, versionId, rawTokens, stateDeltas) {
        if (this.controllerId !== controllerId) {
            // This event is for an outdated controller (the worker didn't receive the delete/create messages yet), ignore the event.
            return;
        }
        // _states state, change{k}, ..., change{versionId}, state delta base & rawTokens, change{j}, ..., change{m}, current renderer state
        //                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^                                ^^^^^^^^^^^^^^^^^^^^^^^^^
        //                | past changes                                                   | future states
        let tokens = ContiguousMultilineTokensBuilder.deserialize(new Uint8Array(rawTokens));
        if (this._shouldLog) {
            console.log('received background tokenization result', {
                fileName: this._model.uri.fsPath.split('\\').pop(),
                updatedTokenLines: tokens.map((t) => t.getLineRange()).join(' & '),
                updatedStateLines: stateDeltas
                    .map((s) => new LineRange(s.startLineNumber, s.startLineNumber + s.stateDeltas.length).toString())
                    .join(' & '),
            });
        }
        if (this._shouldLog) {
            const changes = this._pendingChanges
                .filter((c) => c.versionId <= versionId)
                .map((c) => c.changes)
                .map((c) => changesToString(c))
                .join(' then ');
            console.log('Applying changes to local states', changes);
        }
        // Apply past changes to _states
        while (this._pendingChanges.length > 0 && this._pendingChanges[0].versionId <= versionId) {
            const change = this._pendingChanges.shift();
            this._states.acceptChanges(change.changes);
        }
        if (this._pendingChanges.length > 0) {
            if (this._shouldLog) {
                const changes = this._pendingChanges
                    .map((c) => c.changes)
                    .map((c) => changesToString(c))
                    .join(' then ');
                console.log('Considering non-processed changes', changes);
            }
            const curToFutureTransformerTokens = MonotonousIndexTransformer.fromMany(this._pendingChanges.map((c) => fullLineArrayEditFromModelContentChange(c.changes)));
            // Filter tokens in lines that got changed in the future to prevent flickering
            // These tokens are recomputed anyway.
            const b = new ContiguousMultilineTokensBuilder();
            for (const t of tokens) {
                for (let i = t.startLineNumber; i <= t.endLineNumber; i++) {
                    const result = curToFutureTransformerTokens.transform(i - 1);
                    // If result is undefined, the current line got touched by an edit.
                    // The webworker will send us new tokens for all the new/touched lines after it received the edits.
                    if (result !== undefined) {
                        b.add(i, t.getLineTokens(i));
                    }
                }
            }
            tokens = b.finalize();
            // Apply future changes to tokens
            for (const change of this._pendingChanges) {
                for (const innerChanges of change.changes) {
                    for (let j = 0; j < tokens.length; j++) {
                        tokens[j].applyEdit(innerChanges.range, innerChanges.text);
                    }
                }
            }
        }
        const curToFutureTransformerStates = MonotonousIndexTransformer.fromMany(this._pendingChanges.map((c) => fullLineArrayEditFromModelContentChange(c.changes)));
        if (!this._applyStateStackDiffFn || !this._initialState) {
            const { applyStateStackDiff, INITIAL } = await importAMDNodeModule('vscode-textmate', 'release/main.js');
            this._applyStateStackDiffFn = applyStateStackDiff;
            this._initialState = INITIAL;
        }
        // Apply state deltas to _states and _backgroundTokenizationStore
        for (const d of stateDeltas) {
            let prevState = d.startLineNumber <= 1
                ? this._initialState
                : this._states.getEndState(d.startLineNumber - 1);
            for (let i = 0; i < d.stateDeltas.length; i++) {
                const delta = d.stateDeltas[i];
                let state;
                if (delta) {
                    state = this._applyStateStackDiffFn(prevState, delta);
                    this._states.setEndState(d.startLineNumber + i, state);
                }
                else {
                    state = this._states.getEndState(d.startLineNumber + i);
                }
                const offset = curToFutureTransformerStates.transform(d.startLineNumber + i - 1);
                if (offset !== undefined) {
                    // Only set the state if there is no future change in this line,
                    // as this might make consumers believe that the state/tokens are accurate
                    this._backgroundTokenizationStore.setEndState(offset + 1, state);
                }
                if (d.startLineNumber + i >= this._model.getLineCount() - 1) {
                    this._backgroundTokenizationStore.backgroundTokenizationFinished();
                }
                prevState = state;
            }
        }
        // First set states, then tokens, so that events fired from set tokens don't read invalid states
        this._backgroundTokenizationStore.setTokens(tokens);
    }
    get _shouldLog() {
        return this._loggingEnabled.get();
    }
}
function fullLineArrayEditFromModelContentChange(c) {
    return new ArrayEdit(c.map((c) => new SingleArrayEdit(c.range.startLineNumber - 1, 
    // Expand the edit range to include the entire line
    c.range.endLineNumber - c.range.startLineNumber + 1, countEOL(c.text)[0] + 1)));
}
function changesToString(changes) {
    return changes.map((c) => Range.lift(c.range).toString() + ' => ' + c.text).join(' & ');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVXb3JrZXJUb2tlbml6ZXJDb250cm9sbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dE1hdGUvYnJvd3Nlci9iYWNrZ3JvdW5kVG9rZW5pemF0aW9uL3RleHRNYXRlV29ya2VyVG9rZW5pemVyQ29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFlLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUU3RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDMUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQU1sRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUs5RixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUUxSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUM1RyxPQUFPLEVBQUUsU0FBUyxFQUFFLDBCQUEwQixFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBTzdGLE1BQU0sT0FBTyxpQ0FBa0MsU0FBUSxVQUFVO2FBQ2pELFFBQUcsR0FBRyxDQUFDLEFBQUosQ0FBSTtJQW9CdEIsWUFDa0IsTUFBa0IsRUFDbEIsT0FBNEMsRUFDNUMsZ0JBQWtDLEVBQ2xDLDRCQUEwRCxFQUMxRCxxQkFBNEMsRUFDNUMsMEJBQStDO1FBRWhFLEtB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