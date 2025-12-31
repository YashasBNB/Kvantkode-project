/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { runWhenGlobalIdle } from '../../../base/common/async.js';
import { BugIndicatingError, onUnexpectedError } from '../../../base/common/errors.js';
import { setTimeout0 } from '../../../base/common/platform.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { countEOL } from '../core/eolCounter.js';
import { LineRange } from '../core/lineRange.js';
import { OffsetRange } from '../core/offsetRange.js';
import { nullTokenizeEncoded } from '../languages/nullTokenize.js';
import { FixedArray } from './fixedArray.js';
import { ContiguousMultilineTokensBuilder } from '../tokens/contiguousMultilineTokensBuilder.js';
import { LineTokens } from '../tokens/lineTokens.js';
var Constants;
(function (Constants) {
    Constants[Constants["CHEAP_TOKENIZATION_LENGTH_LIMIT"] = 2048] = "CHEAP_TOKENIZATION_LENGTH_LIMIT";
})(Constants || (Constants = {}));
export class TokenizerWithStateStore {
    constructor(lineCount, tokenizationSupport) {
        this.tokenizationSupport = tokenizationSupport;
        this.initialState = this.tokenizationSupport.getInitialState();
        this.store = new TrackingTokenizationStateStore(lineCount);
    }
    getStartState(lineNumber) {
        return this.store.getStartState(lineNumber, this.initialState);
    }
    getFirstInvalidLine() {
        return this.store.getFirstInvalidLine(this.initialState);
    }
}
export class TokenizerWithStateStoreAndTextModel extends TokenizerWithStateStore {
    constructor(lineCount, tokenizationSupport, _textModel, _languageIdCodec) {
        super(lineCount, tokenizationSupport);
        this._textModel = _textModel;
        this._languageIdCodec = _languageIdCodec;
    }
    updateTokensUntilLine(builder, lineNumber) {
        const languageId = this._textModel.getLanguageId();
        while (true) {
            const lineToTokenize = this.getFirstInvalidLine();
            if (!lineToTokenize || lineToTokenize.lineNumber > lineNumber) {
                break;
            }
            const text = this._textModel.getLineContent(lineToTokenize.lineNumber);
            const r = safeTokenize(this._languageIdCodec, languageId, this.tokenizationSupport, text, true, lineToTokenize.startState);
            builder.add(lineToTokenize.lineNumber, r.tokens);
            this.store.setEndState(lineToTokenize.lineNumber, r.endState);
        }
    }
    /** assumes state is up to date */
    getTokenTypeIfInsertingCharacter(position, character) {
        // TODO@hediet: use tokenizeLineWithEdit
        const lineStartState = this.getStartState(position.lineNumber);
        if (!lineStartState) {
            return 0 /* StandardTokenType.Other */;
        }
        const languageId = this._textModel.getLanguageId();
        const lineContent = this._textModel.getLineContent(position.lineNumber);
        // Create the text as if `character` was inserted
        const text = lineContent.substring(0, position.column - 1) +
            character +
            lineContent.substring(position.column - 1);
        const r = safeTokenize(this._languageIdCodec, languageId, this.tokenizationSupport, text, true, lineStartState);
        const lineTokens = new LineTokens(r.tokens, text, this._languageIdCodec);
        if (lineTokens.getCount() === 0) {
            return 0 /* StandardTokenType.Other */;
        }
        const tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
        return lineTokens.getStandardTokenType(tokenIndex);
    }
    /** assumes state is up to date */
    tokenizeLinesAt(lineNumber, lines) {
        const lineStartState = this.getStartState(lineNumber);
        if (!lineStartState) {
            return null;
        }
        const languageId = this._textModel.getLanguageId();
        const result = [];
        let state = lineStartState;
        for (const line of lines) {
            const r = safeTokenize(this._languageIdCodec, languageId, this.tokenizationSupport, line, true, state);
            result.push(new LineTokens(r.tokens, line, this._languageIdCodec));
            state = r.endState;
        }
        return result;
    }
    hasAccurateTokensForLine(lineNumber) {
        const firstInvalidLineNumber = this.store.getFirstInvalidEndStateLineNumberOrMax();
        return lineNumber < firstInvalidLineNumber;
    }
    isCheapToTokenize(lineNumber) {
        const firstInvalidLineNumber = this.store.getFirstInvalidEndStateLineNumberOrMax();
        if (lineNumber < firstInvalidLineNumber) {
            return true;
        }
        if (lineNumber === firstInvalidLineNumber &&
            this._textModel.getLineLength(lineNumber) < 2048 /* Constants.CHEAP_TOKENIZATION_LENGTH_LIMIT */) {
            return true;
        }
        return false;
    }
    /**
     * The result is not cached.
     */
    tokenizeHeuristically(builder, startLineNumber, endLineNumber) {
        if (endLineNumber <= this.store.getFirstInvalidEndStateLineNumberOrMax()) {
            // nothing to do
            return { heuristicTokens: false };
        }
        if (startLineNumber <= this.store.getFirstInvalidEndStateLineNumberOrMax()) {
            // tokenization has reached the viewport start...
            this.updateTokensUntilLine(builder, endLineNumber);
            return { heuristicTokens: false };
        }
        let state = this.guessStartState(startLineNumber);
        const languageId = this._textModel.getLanguageId();
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            const text = this._textModel.getLineContent(lineNumber);
            const r = safeTokenize(this._languageIdCodec, languageId, this.tokenizationSupport, text, true, state);
            builder.add(lineNumber, r.tokens);
            state = r.endState;
        }
        return { heuristicTokens: true };
    }
    guessStartState(lineNumber) {
        let { likelyRelevantLines, initialState } = findLikelyRelevantLines(this._textModel, lineNumber, this);
        if (!initialState) {
            initialState = this.tokenizationSupport.getInitialState();
        }
        const languageId = this._textModel.getLanguageId();
        let state = initialState;
        for (const line of likelyRelevantLines) {
            const r = safeTokenize(this._languageIdCodec, languageId, this.tokenizationSupport, line, false, state);
            state = r.endState;
        }
        return state;
    }
}
export function findLikelyRelevantLines(model, lineNumber, store) {
    let nonWhitespaceColumn = model.getLineFirstNonWhitespaceColumn(lineNumber);
    const likelyRelevantLines = [];
    let initialState = null;
    for (let i = lineNumber - 1; nonWhitespaceColumn > 1 && i >= 1; i--) {
        const newNonWhitespaceIndex = model.getLineFirstNonWhitespaceColumn(i);
        // Ignore lines full of whitespace
        if (newNonWhitespaceIndex === 0) {
            continue;
        }
        if (newNonWhitespaceIndex < nonWhitespaceColumn) {
            likelyRelevantLines.push(model.getLineContent(i));
            nonWhitespaceColumn = newNonWhitespaceIndex;
            initialState = store?.getStartState(i);
            if (initialState) {
                break;
            }
        }
    }
    likelyRelevantLines.reverse();
    return { likelyRelevantLines, initialState: initialState ?? undefined };
}
/**
 * **Invariant:**
 * If the text model is retokenized from line 1 to {@link getFirstInvalidEndStateLineNumber}() - 1,
 * then the recomputed end state for line l will be equal to {@link getEndState}(l).
 */
export class TrackingTokenizationStateStore {
    constructor(lineCount) {
        this.lineCount = lineCount;
        this._tokenizationStateStore = new TokenizationStateStore();
        this._invalidEndStatesLineNumbers = new RangePriorityQueueImpl();
        this._invalidEndStatesLineNumbers.addRange(new OffsetRange(1, lineCount + 1));
    }
    getEndState(lineNumber) {
        return this._tokenizationStateStore.getEndState(lineNumber);
    }
    /**
     * @returns if the end state has changed.
     */
    setEndState(lineNumber, state) {
        if (!state) {
            throw new BugIndicatingError('Cannot set null/undefined state');
        }
        this._invalidEndStatesLineNumbers.delete(lineNumber);
        const r = this._tokenizationStateStore.setEndState(lineNumber, state);
        if (r && lineNumber < this.lineCount) {
            // because the state changed, we cannot trust the next state anymore and have to invalidate it.
            this._invalidEndStatesLineNumbers.addRange(new OffsetRange(lineNumber + 1, lineNumber + 2));
        }
        return r;
    }
    acceptChange(range, newLineCount) {
        this.lineCount += newLineCount - range.length;
        this._tokenizationStateStore.acceptChange(range, newLineCount);
        this._invalidEndStatesLineNumbers.addRangeAndResize(new OffsetRange(range.startLineNumber, range.endLineNumberExclusive), newLineCount);
    }
    acceptChanges(changes) {
        for (const c of changes) {
            const [eolCount] = countEOL(c.text);
            this.acceptChange(new LineRange(c.range.startLineNumber, c.range.endLineNumber + 1), eolCount + 1);
        }
    }
    invalidateEndStateRange(range) {
        this._invalidEndStatesLineNumbers.addRange(new OffsetRange(range.startLineNumber, range.endLineNumberExclusive));
    }
    getFirstInvalidEndStateLineNumber() {
        return this._invalidEndStatesLineNumbers.min;
    }
    getFirstInvalidEndStateLineNumberOrMax() {
        return this.getFirstInvalidEndStateLineNumber() || Number.MAX_SAFE_INTEGER;
    }
    allStatesValid() {
        return this._invalidEndStatesLineNumbers.min === null;
    }
    getStartState(lineNumber, initialState) {
        if (lineNumber === 1) {
            return initialState;
        }
        return this.getEndState(lineNumber - 1);
    }
    getFirstInvalidLine(initialState) {
        const lineNumber = this.getFirstInvalidEndStateLineNumber();
        if (lineNumber === null) {
            return null;
        }
        const startState = this.getStartState(lineNumber, initialState);
        if (!startState) {
            throw new BugIndicatingError('Start state must be defined');
        }
        return { lineNumber, startState };
    }
}
export class TokenizationStateStore {
    constructor() {
        this._lineEndStates = new FixedArray(null);
    }
    getEndState(lineNumber) {
        return this._lineEndStates.get(lineNumber);
    }
    setEndState(lineNumber, state) {
        const oldState = this._lineEndStates.get(lineNumber);
        if (oldState && oldState.equals(state)) {
            return false;
        }
        this._lineEndStates.set(lineNumber, state);
        return true;
    }
    acceptChange(range, newLineCount) {
        let length = range.length;
        if (newLineCount > 0 && length > 0) {
            // Keep the last state, even though it is unrelated.
            // But if the new state happens to agree with this last state, then we know we can stop tokenizing.
            length--;
            newLineCount--;
        }
        this._lineEndStates.replace(range.startLineNumber, length, newLineCount);
    }
    acceptChanges(changes) {
        for (const c of changes) {
            const [eolCount] = countEOL(c.text);
            this.acceptChange(new LineRange(c.range.startLineNumber, c.range.endLineNumber + 1), eolCount + 1);
        }
    }
}
export class RangePriorityQueueImpl {
    constructor() {
        this._ranges = [];
    }
    getRanges() {
        return this._ranges;
    }
    get min() {
        if (this._ranges.length === 0) {
            return null;
        }
        return this._ranges[0].start;
    }
    removeMin() {
        if (this._ranges.length === 0) {
            return null;
        }
        const range = this._ranges[0];
        if (range.start + 1 === range.endExclusive) {
            this._ranges.shift();
        }
        else {
            this._ranges[0] = new OffsetRange(range.start + 1, range.endExclusive);
        }
        return range.start;
    }
    delete(value) {
        const idx = this._ranges.findIndex((r) => r.contains(value));
        if (idx !== -1) {
            const range = this._ranges[idx];
            if (range.start === value) {
                if (range.endExclusive === value + 1) {
                    this._ranges.splice(idx, 1);
                }
                else {
                    this._ranges[idx] = new OffsetRange(value + 1, range.endExclusive);
                }
            }
            else {
                if (range.endExclusive === value + 1) {
                    this._ranges[idx] = new OffsetRange(range.start, value);
                }
                else {
                    this._ranges.splice(idx, 1, new OffsetRange(range.start, value), new OffsetRange(value + 1, range.endExclusive));
                }
            }
        }
    }
    addRange(range) {
        OffsetRange.addRange(range, this._ranges);
    }
    addRangeAndResize(range, newLength) {
        let idxFirstMightBeIntersecting = 0;
        while (!(idxFirstMightBeIntersecting >= this._ranges.length ||
            range.start <= this._ranges[idxFirstMightBeIntersecting].endExclusive)) {
            idxFirstMightBeIntersecting++;
        }
        let idxFirstIsAfter = idxFirstMightBeIntersecting;
        while (!(idxFirstIsAfter >= this._ranges.length ||
            range.endExclusive < this._ranges[idxFirstIsAfter].start)) {
            idxFirstIsAfter++;
        }
        const delta = newLength - range.length;
        for (let i = idxFirstIsAfter; i < this._ranges.length; i++) {
            this._ranges[i] = this._ranges[i].delta(delta);
        }
        if (idxFirstMightBeIntersecting === idxFirstIsAfter) {
            const newRange = new OffsetRange(range.start, range.start + newLength);
            if (!newRange.isEmpty) {
                this._ranges.splice(idxFirstMightBeIntersecting, 0, newRange);
            }
        }
        else {
            const start = Math.min(range.start, this._ranges[idxFirstMightBeIntersecting].start);
            const endEx = Math.max(range.endExclusive, this._ranges[idxFirstIsAfter - 1].endExclusive);
            const newRange = new OffsetRange(start, endEx + delta);
            if (!newRange.isEmpty) {
                this._ranges.splice(idxFirstMightBeIntersecting, idxFirstIsAfter - idxFirstMightBeIntersecting, newRange);
            }
            else {
                this._ranges.splice(idxFirstMightBeIntersecting, idxFirstIsAfter - idxFirstMightBeIntersecting);
            }
        }
    }
    toString() {
        return this._ranges.map((r) => r.toString()).join(' + ');
    }
}
function safeTokenize(languageIdCodec, languageId, tokenizationSupport, text, hasEOL, state) {
    let r = null;
    if (tokenizationSupport) {
        try {
            r = tokenizationSupport.tokenizeEncoded(text, hasEOL, state.clone());
        }
        catch (e) {
            onUnexpectedError(e);
        }
    }
    if (!r) {
        r = nullTokenizeEncoded(languageIdCodec.encodeLanguageId(languageId), state);
    }
    LineTokens.convertToEndOffset(r.tokens, text.length);
    return r;
}
export class DefaultBackgroundTokenizer {
    constructor(_tokenizerWithStateStore, _backgroundTokenStore) {
        this._tokenizerWithStateStore = _tokenizerWithStateStore;
        this._backgroundTokenStore = _backgroundTokenStore;
        this._isDisposed = false;
        this._isScheduled = false;
    }
    dispose() {
        this._isDisposed = true;
    }
    handleChanges() {
        this._beginBackgroundTokenization();
    }
    _beginBackgroundTokenization() {
        if (this._isScheduled ||
            !this._tokenizerWithStateStore._textModel.isAttachedToEditor() ||
            !this._hasLinesToTokenize()) {
            return;
        }
        this._isScheduled = true;
        runWhenGlobalIdle((deadline) => {
            this._isScheduled = false;
            this._backgroundTokenizeWithDeadline(deadline);
        });
    }
    /**
     * Tokenize until the deadline occurs, but try to yield every 1-2ms.
     */
    _backgroundTokenizeWithDeadline(deadline) {
        // Read the time remaining from the `deadline` immediately because it is unclear
        // if the `deadline` object will be valid after execution leaves this function.
        const endTime = Date.now() + deadline.timeRemaining();
        const execute = () => {
            if (this._isDisposed ||
                !this._tokenizerWithStateStore._textModel.isAttachedToEditor() ||
                !this._hasLinesToTokenize()) {
                // disposed in the meantime or detached or finished
                return;
            }
            this._backgroundTokenizeForAtLeast1ms();
            if (Date.now() < endTime) {
                // There is still time before reaching the deadline, so yield to the browser and then
                // continue execution
                setTimeout0(execute);
            }
            else {
                // The deadline has been reached, so schedule a new idle callback if necessary
                this._beginBackgroundTokenization();
            }
        };
        execute();
    }
    /**
     * Tokenize for at least 1ms.
     */
    _backgroundTokenizeForAtLeast1ms() {
        const lineCount = this._tokenizerWithStateStore._textModel.getLineCount();
        const builder = new ContiguousMultilineTokensBuilder();
        const sw = StopWatch.create(false);
        do {
            if (sw.elapsed() > 1) {
                // the comparison is intentionally > 1 and not >= 1 to ensure that
                // a full millisecond has elapsed, given how microseconds are rounded
                // to milliseconds
                break;
            }
            const tokenizedLineNumber = this._tokenizeOneInvalidLine(builder);
            if (tokenizedLineNumber >= lineCount) {
                break;
            }
        } while (this._hasLinesToTokenize());
        this._backgroundTokenStore.setTokens(builder.finalize());
        this.checkFinished();
    }
    _hasLinesToTokenize() {
        if (!this._tokenizerWithStateStore) {
            return false;
        }
        return !this._tokenizerWithStateStore.store.allStatesValid();
    }
    _tokenizeOneInvalidLine(builder) {
        const firstInvalidLine = this._tokenizerWithStateStore?.getFirstInvalidLine();
        if (!firstInvalidLine) {
            return this._tokenizerWithStateStore._textModel.getLineCount() + 1;
        }
        this._tokenizerWithStateStore.updateTokensUntilLine(builder, firstInvalidLine.lineNumber);
        return firstInvalidLine.lineNumber;
    }
    checkFinished() {
        if (this._isDisposed) {
            return;
        }
        if (this._tokenizerWithStateStore.store.allStatesValid()) {
            this._backgroundTokenStore.backgroundTokenizationFinished();
        }
    }
    requestTokens(startLineNumber, endLineNumberExclusive) {
        this._tokenizerWithStateStore.store.invalidateEndStateRange(new LineRange(startLineNumber, endLineNumberExclusive));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsVG9rZW5zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC90ZXh0TW9kZWxUb2tlbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFnQixpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQy9FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFXcEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRTVDLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUVwRCxJQUFXLFNBRVY7QUFGRCxXQUFXLFNBQVM7SUFDbkIsa0dBQXNDLENBQUE7QUFDdkMsQ0FBQyxFQUZVLFNBQVMsS0FBVCxTQUFTLFFBRW5CO0FBRUQsTUFBTSxPQUFPLHVCQUF1QjtJQUtuQyxZQUNDLFNBQWlCLEVBQ0QsbUJBQXlDO1FBQXpDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFOekMsaUJBQVksR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsZUFB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