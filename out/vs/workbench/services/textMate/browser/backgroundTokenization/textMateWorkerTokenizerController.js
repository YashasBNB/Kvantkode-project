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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVXb3JrZXJUb2tlbml6ZXJDb250cm9sbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRNYXRlL2Jyb3dzZXIvYmFja2dyb3VuZFRva2VuaXphdGlvbi90ZXh0TWF0ZVdvcmtlclRva2VuaXplckNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBZSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFN0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFNbEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFLOUYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFFMUgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFDNUcsT0FBTyxFQUFFLFNBQVMsRUFBRSwwQkFBMEIsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQU83RixNQUFNLE9BQU8saUNBQWtDLFNBQVEsVUFBVTthQUNqRCxRQUFHLEdBQUcsQ0FBQyxBQUFKLENBQUk7SUFvQnRCLFlBQ2tCLE1BQWtCLEVBQ2xCLE9BQTRDLEVBQzVDLGdCQUFrQyxFQUNsQyw0QkFBMEQsRUFDMUQscUJBQTRDLEVBQzVDLDBCQUErQztRQUVoRSxLQUFLLEVB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