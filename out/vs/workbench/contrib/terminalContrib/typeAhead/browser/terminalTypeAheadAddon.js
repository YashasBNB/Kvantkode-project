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
import { disposableTimeout } from '../../../../../base/common/async.js';
import { Color, RGBA } from '../../../../../base/common/color.js';
import { debounce } from '../../../../../base/common/decorators.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { escapeRegExpCharacters } from '../../../../../base/common/strings.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { TERMINAL_CONFIG_SECTION, } from '../../../terminal/common/terminal.js';
import { DEFAULT_LOCAL_ECHO_EXCLUDE, } from '../common/terminalTypeAheadConfiguration.js';
var VT;
(function (VT) {
    VT["Esc"] = "\u001B";
    VT["Csi"] = "\u001B[";
    VT["ShowCursor"] = "\u001B[?25h";
    VT["HideCursor"] = "\u001B[?25l";
    VT["DeleteChar"] = "\u001B[X";
    VT["DeleteRestOfLine"] = "\u001B[K";
})(VT || (VT = {}));
const CSI_STYLE_RE = /^\x1b\[[0-9;]*m/;
const CSI_MOVE_RE = /^\x1b\[?([0-9]*)(;[35])?O?([DC])/;
const NOT_WORD_RE = /[^a-z0-9]/i;
var StatsConstants;
(function (StatsConstants) {
    StatsConstants[StatsConstants["StatsBufferSize"] = 24] = "StatsBufferSize";
    StatsConstants[StatsConstants["StatsSendTelemetryEvery"] = 300000] = "StatsSendTelemetryEvery";
    StatsConstants[StatsConstants["StatsMinSamplesToTurnOn"] = 5] = "StatsMinSamplesToTurnOn";
    StatsConstants[StatsConstants["StatsMinAccuracyToTurnOn"] = 0.3] = "StatsMinAccuracyToTurnOn";
    StatsConstants[StatsConstants["StatsToggleOffThreshold"] = 0.5] = "StatsToggleOffThreshold";
})(StatsConstants || (StatsConstants = {}));
/**
 * Codes that should be omitted from sending to the prediction engine and instead omitted directly:
 * - Hide cursor (DECTCEM): We wrap the local echo sequence in hide and show
 *   CSI ? 2 5 l
 * - Show cursor (DECTCEM): We wrap the local echo sequence in hide and show
 *   CSI ? 2 5 h
 * - Device Status Report (DSR): These sequence fire report events from xterm which could cause
 *   double reporting and potentially a stack overflow (#119472)
 *   CSI Ps n
 *   CSI ? Ps n
 */
const PREDICTION_OMIT_RE = /^(\x1b\[(\??25[hl]|\??[0-9;]+n))+/;
const core = (terminal) => terminal._core;
const flushOutput = (terminal) => {
    // TODO: Flushing output is not possible anymore without async
};
var CursorMoveDirection;
(function (CursorMoveDirection) {
    CursorMoveDirection["Back"] = "D";
    CursorMoveDirection["Forwards"] = "C";
})(CursorMoveDirection || (CursorMoveDirection = {}));
class Cursor {
    get x() {
        return this._x;
    }
    get y() {
        return this._y;
    }
    get baseY() {
        return this._baseY;
    }
    get coordinate() {
        return { x: this._x, y: this._y, baseY: this._baseY };
    }
    constructor(rows, cols, _buffer) {
        this.rows = rows;
        this.cols = cols;
        this._buffer = _buffer;
        this._x = 0;
        this._y = 1;
        this._baseY = 1;
        this._x = _buffer.cursorX;
        this._y = _buffer.cursorY;
        this._baseY = _buffer.baseY;
    }
    getLine() {
        return this._buffer.getLine(this._y + this._baseY);
    }
    getCell(loadInto) {
        return this.getLine()?.getCell(this._x, loadInto);
    }
    moveTo(coordinate) {
        this._x = coordinate.x;
        this._y = coordinate.y + coordinate.baseY - this._baseY;
        return this.moveInstruction();
    }
    clone() {
        const c = new Cursor(this.rows, this.cols, this._buffer);
        c.moveTo(this);
        return c;
    }
    move(x, y) {
        this._x = x;
        this._y = y;
        return this.moveInstruction();
    }
    shift(x = 0, y = 0) {
        this._x += x;
        this._y += y;
        return this.moveInstruction();
    }
    moveInstruction() {
        if (this._y >= this.rows) {
            this._baseY += this._y - (this.rows - 1);
            this._y = this.rows - 1;
        }
        else if (this._y < 0) {
            this._baseY -= this._y;
            this._y = 0;
        }
        return `${"\u001B[" /* VT.Csi */}${this._y + 1};${this._x + 1}H`;
    }
}
const moveToWordBoundary = (b, cursor, direction) => {
    let ateLeadingWhitespace = false;
    if (direction < 0) {
        cursor.shift(-1);
    }
    let cell;
    while (cursor.x >= 0) {
        cell = cursor.getCell(cell);
        if (!cell?.getCode()) {
            return;
        }
        const chars = cell.getChars();
        if (NOT_WORD_RE.test(chars)) {
            if (ateLeadingWhitespace) {
                break;
            }
        }
        else {
            ateLeadingWhitespace = true;
        }
        cursor.shift(direction);
    }
    if (direction < 0) {
        cursor.shift(1); // we want to place the cursor after the whitespace starting the word
    }
};
var MatchResult;
(function (MatchResult) {
    /** matched successfully */
    MatchResult[MatchResult["Success"] = 0] = "Success";
    /** failed to match */
    MatchResult[MatchResult["Failure"] = 1] = "Failure";
    /** buffer data, it might match in the future one more data comes in */
    MatchResult[MatchResult["Buffer"] = 2] = "Buffer";
})(MatchResult || (MatchResult = {}));
class StringReader {
    get remaining() {
        return this._input.length - this.index;
    }
    get eof() {
        return this.index === this._input.length;
    }
    get rest() {
        return this._input.slice(this.index);
    }
    constructor(_input) {
        this._input = _input;
        this.index = 0;
    }
    /**
     * Advances the reader and returns the character if it matches.
     */
    eatChar(char) {
        if (this._input[this.index] !== char) {
            return;
        }
        this.index++;
        return char;
    }
    /**
     * Advances the reader and returns the string if it matches.
     */
    eatStr(substr) {
        if (this._input.slice(this.index, substr.length) !== substr) {
            return;
        }
        this.index += substr.length;
        return substr;
    }
    /**
     * Matches and eats the substring character-by-character. If EOF is reached
     * before the substring is consumed, it will buffer. Index is not moved
     * if it's not a match.
     */
    eatGradually(substr) {
        const prevIndex = this.index;
        for (let i = 0; i < substr.length; i++) {
            if (i > 0 && this.eof) {
                return 2 /* MatchResult.Buffer */;
            }
            if (!this.eatChar(substr[i])) {
                this.index = prevIndex;
                return 1 /* MatchResult.Failure */;
            }
        }
        return 0 /* MatchResult.Success */;
    }
    /**
     * Advances the reader and returns the regex if it matches.
     */
    eatRe(re) {
        const match = re.exec(this._input.slice(this.index));
        if (!match) {
            return;
        }
        this.index += match[0].length;
        return match;
    }
    /**
     * Advances the reader and returns the character if the code matches.
     */
    eatCharCode(min = 0, max = min + 1) {
        const code = this._input.charCodeAt(this.index);
        if (code < min || code >= max) {
            return undefined;
        }
        this.index++;
        return code;
    }
}
/**
 * Preidction which never tests true. Will always discard predictions made
 * after it.
 */
class HardBoundary {
    constructor() {
        this.clearAfterTimeout = false;
    }
    apply() {
        return '';
    }
    rollback() {
        return '';
    }
    rollForwards() {
        return '';
    }
    matches() {
        return 1 /* MatchResult.Failure */;
    }
}
/**
 * Wraps another prediction. Does not apply the prediction, but will pass
 * through its `matches` request.
 */
class TentativeBoundary {
    constructor(inner) {
        this.inner = inner;
    }
    apply(buffer, cursor) {
        this._appliedCursor = cursor.clone();
        this.inner.apply(buffer, this._appliedCursor);
        return '';
    }
    rollback(cursor) {
        this.inner.rollback(cursor.clone());
        return '';
    }
    rollForwards(cursor, withInput) {
        if (this._appliedCursor) {
            cursor.moveTo(this._appliedCursor);
        }
        return withInput;
    }
    matches(input) {
        return this.inner.matches(input);
    }
}
const isTenativeCharacterPrediction = (p) => p instanceof TentativeBoundary && p.inner instanceof CharacterPrediction;
/**
 * Prediction for a single alphanumeric character.
 */
class CharacterPrediction {
    constructor(_style, _char) {
        this._style = _style;
        this._char = _char;
        this.affectsStyle = true;
    }
    apply(_, cursor) {
        const cell = cursor.getCell();
        this.appliedAt = cell
            ? { pos: cursor.coordinate, oldAttributes: attributesToSeq(cell), oldChar: cell.getChars() }
            : { pos: cursor.coordinate, oldAttributes: '', oldChar: '' };
        cursor.shift(1);
        return this._style.apply + this._char + this._style.undo;
    }
    rollback(cursor) {
        if (!this.appliedAt) {
            return ''; // not applied
        }
        const { oldAttributes, oldChar, pos } = this.appliedAt;
        const r = cursor.moveTo(pos) +
            (oldChar ? `${oldAttributes}${oldChar}${cursor.moveTo(pos)}` : "\u001B[X" /* VT.DeleteChar */);
        return r;
    }
    rollForwards(cursor, input) {
        if (!this.appliedAt) {
            return ''; // not applied
        }
        return cursor.clone().moveTo(this.appliedAt.pos) + input;
    }
    matches(input, lookBehind) {
        const startIndex = input.index;
        // remove any styling CSI before checking the char
        while (input.eatRe(CSI_STYLE_RE)) { }
        if (input.eof) {
            return 2 /* MatchResult.Buffer */;
        }
        if (input.eatChar(this._char)) {
            return 0 /* MatchResult.Success */;
        }
        if (lookBehind instanceof CharacterPrediction) {
            // see #112842
            const sillyZshOutcome = input.eatGradually(`\b${lookBehind._char}${this._char}`);
            if (sillyZshOutcome !== 1 /* MatchResult.Failure */) {
                return sillyZshOutcome;
            }
        }
        input.index = startIndex;
        return 1 /* MatchResult.Failure */;
    }
}
class BackspacePrediction {
    constructor(_terminal) {
        this._terminal = _terminal;
    }
    apply(_, cursor) {
        // at eol if everything to the right is whitespace (zsh will emit a "clear line" code in this case)
        // todo: can be optimized if `getTrimmedLength` is exposed from xterm
        const isLastChar = !cursor.getLine()?.translateToString(undefined, cursor.x).trim();
        const pos = cursor.coordinate;
        const move = cursor.shift(-1);
        const cell = cursor.getCell();
        this._appliedAt = cell
            ? { isLastChar, pos, oldAttributes: attributesToSeq(cell), oldChar: cell.getChars() }
            : { isLastChar, pos, oldAttributes: '', oldChar: '' };
        return move + "\u001B[X" /* VT.DeleteChar */;
    }
    rollback(cursor) {
        if (!this._appliedAt) {
            return ''; // not applied
        }
        const { oldAttributes, oldChar, pos } = this._appliedAt;
        if (!oldChar) {
            return cursor.moveTo(pos) + "\u001B[X" /* VT.DeleteChar */;
        }
        return (oldAttributes +
            oldChar +
            cursor.moveTo(pos) +
            attributesToSeq(core(this._terminal)._inputHandler._curAttrData));
    }
    rollForwards() {
        return '';
    }
    matches(input) {
        if (this._appliedAt?.isLastChar) {
            const r1 = input.eatGradually(`\b${"\u001B[" /* VT.Csi */}K`);
            if (r1 !== 1 /* MatchResult.Failure */) {
                return r1;
            }
            const r2 = input.eatGradually(`\b \b`);
            if (r2 !== 1 /* MatchResult.Failure */) {
                return r2;
            }
        }
        return 1 /* MatchResult.Failure */;
    }
}
class NewlinePrediction {
    apply(_, cursor) {
        this._prevPosition = cursor.coordinate;
        cursor.move(0, cursor.y + 1);
        return '\r\n';
    }
    rollback(cursor) {
        return this._prevPosition ? cursor.moveTo(this._prevPosition) : '';
    }
    rollForwards() {
        return ''; // does not need to rewrite
    }
    matches(input) {
        return input.eatGradually('\r\n');
    }
}
/**
 * Prediction when the cursor reaches the end of the line. Similar to newline
 * prediction, but shells handle it slightly differently.
 */
class LinewrapPrediction extends NewlinePrediction {
    apply(_, cursor) {
        this._prevPosition = cursor.coordinate;
        cursor.move(0, cursor.y + 1);
        return ' \r';
    }
    matches(input) {
        // bash and zshell add a space which wraps in the terminal, then a CR
        const r = input.eatGradually(' \r');
        if (r !== 1 /* MatchResult.Failure */) {
            // zshell additionally adds a clear line after wrapping to be safe -- eat it
            const r2 = input.eatGradually("\u001B[K" /* VT.DeleteRestOfLine */);
            return r2 === 2 /* MatchResult.Buffer */ ? 2 /* MatchResult.Buffer */ : r;
        }
        return input.eatGradually('\r\n');
    }
}
class CursorMovePrediction {
    constructor(_direction, _moveByWords, _amount) {
        this._direction = _direction;
        this._moveByWords = _moveByWords;
        this._amount = _amount;
    }
    apply(buffer, cursor) {
        const prevPosition = cursor.x;
        const currentCell = cursor.getCell();
        const prevAttrs = currentCell ? attributesToSeq(currentCell) : '';
        const { _amount: amount, _direction: direction, _moveByWords: moveByWords } = this;
        const delta = direction === "D" /* CursorMoveDirection.Back */ ? -1 : 1;
        const target = cursor.clone();
        if (moveByWords) {
            for (let i = 0; i < amount; i++) {
                moveToWordBoundary(buffer, target, delta);
            }
        }
        else {
            target.shift(delta * amount);
        }
        this._applied = {
            amount: Math.abs(cursor.x - target.x),
            prevPosition,
            prevAttrs,
            rollForward: cursor.moveTo(target),
        };
        return this._applied.rollForward;
    }
    rollback(cursor) {
        if (!this._applied) {
            return '';
        }
        return cursor.move(this._applied.prevPosition, cursor.y) + this._applied.prevAttrs;
    }
    rollForwards() {
        return ''; // does not need to rewrite
    }
    matches(input) {
        if (!this._applied) {
            return 1 /* MatchResult.Failure */;
        }
        const direction = this._direction;
        const { amount, rollForward } = this._applied;
        // arg can be omitted to move one character. We don't eatGradually() here
        // or below moves that don't go as far as the cursor would be buffered
        // indefinitely
        if (input.eatStr(`${"\u001B[" /* VT.Csi */}${direction}`.repeat(amount))) {
            return 0 /* MatchResult.Success */;
        }
        // \b is the equivalent to moving one character back
        if (direction === "D" /* CursorMoveDirection.Back */) {
            if (input.eatStr(`\b`.repeat(amount))) {
                return 0 /* MatchResult.Success */;
            }
        }
        // check if the cursor position is set absolutely
        if (rollForward) {
            const r = input.eatGradually(rollForward);
            if (r !== 1 /* MatchResult.Failure */) {
                return r;
            }
        }
        // check for a relative move in the direction
        return input.eatGradually(`${"\u001B[" /* VT.Csi */}${amount}${direction}`);
    }
}
export class PredictionStats extends Disposable {
    /**
     * Gets the percent (0-1) of predictions that were accurate.
     */
    get accuracy() {
        let correctCount = 0;
        for (const [, correct] of this._stats) {
            if (correct) {
                correctCount++;
            }
        }
        return correctCount / (this._stats.length || 1);
    }
    /**
     * Gets the number of recorded stats.
     */
    get sampleSize() {
        return this._stats.length;
    }
    /**
     * Gets latency stats of successful predictions.
     */
    get latency() {
        const latencies = this._stats
            .filter(([, correct]) => correct)
            .map(([s]) => s)
            .sort();
        return {
            count: latencies.length,
            min: latencies[0],
            median: latencies[Math.floor(latencies.length / 2)],
            max: latencies[latencies.length - 1],
        };
    }
    /**
     * Gets the maximum observed latency.
     */
    get maxLatency() {
        let max = -Infinity;
        for (const [latency, correct] of this._stats) {
            if (correct) {
                max = Math.max(latency, max);
            }
        }
        return max;
    }
    constructor(timeline) {
        super();
        this._stats = [];
        this._index = 0;
        this._addedAtTime = new WeakMap();
        this._changeEmitter = new Emitter();
        this.onChange = this._changeEmitter.event;
        this._register(timeline.onPredictionAdded((p) => this._addedAtTime.set(p, Date.now())));
        this._register(timeline.onPredictionSucceeded(this._pushStat.bind(this, true)));
        this._register(timeline.onPredictionFailed(this._pushStat.bind(this, false)));
    }
    _pushStat(correct, prediction) {
        const started = this._addedAtTime.get(prediction);
        this._stats[this._index] = [Date.now() - started, correct];
        this._index = (this._index + 1) % 24 /* StatsConstants.StatsBufferSize */;
        this._changeEmitter.fire();
    }
}
export class PredictionTimeline {
    get _currentGenerationPredictions() {
        return this._expected.filter(({ gen }) => gen === this._expected[0].gen).map(({ p }) => p);
    }
    get isShowingPredictions() {
        return this._showPredictions;
    }
    get length() {
        return this._expected.length;
    }
    constructor(terminal, _style) {
        this.terminal = terminal;
        this._style = _style;
        /**
         * Expected queue of events. Only predictions for the lowest are
         * written into the terminal.
         */
        this._expected = [];
        /**
         * Current prediction generation.
         */
        this._currentGen = 0;
        /**
         * Whether predictions are echoed to the terminal. If false, predictions
         * will still be computed internally for latency metrics, but input will
         * never be adjusted.
         */
        this._showPredictions = false;
        this._addedEmitter = new Emitter();
        this.onPredictionAdded = this._addedEmitter.event;
        this._failedEmitter = new Emitter();
        this.onPredictionFailed = this._failedEmitter.event;
        this._succeededEmitter = new Emitter();
        this.onPredictionSucceeded = this._succeededEmitter.event;
    }
    setShowPredictions(show) {
        if (show === this._showPredictions) {
            return;
        }
        // console.log('set predictions:', show);
        this._showPredictions = show;
        const buffer = this._getActiveBuffer();
        if (!buffer) {
            return;
        }
        const toApply = this._currentGenerationPredictions;
        if (show) {
            this.clearCursor();
            this._style.expectIncomingStyle(toApply.reduce((count, p) => (p.affectsStyle ? count + 1 : count), 0));
            this.terminal.write(toApply.map((p) => p.apply(buffer, this.physicalCursor(buffer))).join(''));
        }
        else {
            this.terminal.write(toApply
                .reverse()
                .map((p) => p.rollback(this.physicalCursor(buffer)))
                .join(''));
        }
    }
    /**
     * Undoes any predictions written and resets expectations.
     */
    undoAllPredictions() {
        const buffer = this._getActiveBuffer();
        if (this._showPredictions && buffer) {
            this.terminal.write(this._currentGenerationPredictions
                .reverse()
                .map((p) => p.rollback(this.physicalCursor(buffer)))
                .join(''));
        }
        this._expected = [];
    }
    /**
     * Should be called when input is incoming to the temrinal.
     */
    beforeServerInput(input) {
        const originalInput = input;
        if (this._inputBuffer) {
            input = this._inputBuffer + input;
            this._inputBuffer = undefined;
        }
        if (!this._expected.length) {
            this._clearPredictionState();
            return input;
        }
        const buffer = this._getActiveBuffer();
        if (!buffer) {
            this._clearPredictionState();
            return input;
        }
        let output = '';
        const reader = new StringReader(input);
        const startingGen = this._expected[0].gen;
        const emitPredictionOmitted = () => {
            const omit = reader.eatRe(PREDICTION_OMIT_RE);
            if (omit) {
                output += omit[0];
            }
        };
        ReadLoop: while (this._expected.length && reader.remaining > 0) {
            emitPredictionOmitted();
            const { p: prediction, gen } = this._expected[0];
            const cursor = this.physicalCursor(buffer);
            const beforeTestReaderIndex = reader.index;
            switch (prediction.matches(reader, this._lookBehind)) {
                case 0 /* MatchResult.Success */: {
                    // if the input character matches what the next prediction expected, undo
                    // the prediction and write the real character out.
                    const eaten = input.slice(beforeTestReaderIndex, reader.index);
                    if (gen === startingGen) {
                        output += prediction.rollForwards?.(cursor, eaten);
                    }
                    else {
                        prediction.apply(buffer, this.physicalCursor(buffer)); // move cursor for additional apply
                        output += eaten;
                    }
                    this._succeededEmitter.fire(prediction);
                    this._lookBehind = prediction;
                    this._expected.shift();
                    break;
                }
                case 2 /* MatchResult.Buffer */:
                    // on a buffer, store the remaining data and completely read data
                    // to be output as normal.
                    this._inputBuffer = input.slice(beforeTestReaderIndex);
                    reader.index = input.length;
                    break ReadLoop;
                case 1 /* MatchResult.Failure */: {
                    // on a failure, roll back all remaining items in this generation
                    // and clear predictions, since they are no longer valid
                    const rollback = this._expected.filter((p) => p.gen === startingGen).reverse();
                    output += rollback.map(({ p }) => p.rollback(this.physicalCursor(buffer))).join('');
                    if (rollback.some((r) => r.p.affectsStyle)) {
                        // reading the current style should generally be safe, since predictions
                        // always restore the style if they modify it.
                        output += attributesToSeq(core(this.terminal)._inputHandler._curAttrData);
                    }
                    this._clearPredictionState();
                    this._failedEmitter.fire(prediction);
                    break ReadLoop;
                }
            }
        }
        emitPredictionOmitted();
        // Extra data (like the result of running a command) should cause us to
        // reset the cursor
        if (!reader.eof) {
            output += reader.rest;
            this._clearPredictionState();
        }
        // If we passed a generation boundary, apply the current generation's predictions
        if (this._expected.length && startingGen !== this._expected[0].gen) {
            for (const { p, gen } of this._expected) {
                if (gen !== this._expected[0].gen) {
                    break;
                }
                if (p.affectsStyle) {
                    this._style.expectIncomingStyle();
                }
                output += p.apply(buffer, this.physicalCursor(buffer));
            }
        }
        if (!this._showPredictions) {
            return originalInput;
        }
        if (output.length === 0 || output === input) {
            return output;
        }
        if (this._physicalCursor) {
            output += this._physicalCursor.moveInstruction();
        }
        // prevent cursor flickering while typing
        output = "\u001B[?25l" /* VT.HideCursor */ + output + "\u001B[?25h" /* VT.ShowCursor */;
        return output;
    }
    /**
     * Clears any expected predictions and stored state. Should be called when
     * the pty gives us something we don't recognize.
     */
    _clearPredictionState() {
        this._expected = [];
        this.clearCursor();
        this._lookBehind = undefined;
    }
    /**
     * Appends a typeahead prediction.
     */
    addPrediction(buffer, prediction) {
        this._expected.push({ gen: this._currentGen, p: prediction });
        this._addedEmitter.fire(prediction);
        if (this._currentGen !== this._expected[0].gen) {
            prediction.apply(buffer, this.tentativeCursor(buffer));
            return false;
        }
        const text = prediction.apply(buffer, this.physicalCursor(buffer));
        this._tenativeCursor = undefined; // next read will get or clone the physical cursor
        if (this._showPredictions && text) {
            if (prediction.affectsStyle) {
                this._style.expectIncomingStyle();
            }
            // console.log('predict:', JSON.stringify(text));
            this.terminal.write(text);
        }
        return true;
    }
    addBoundary(buffer, prediction) {
        let applied = false;
        if (buffer && prediction) {
            // We apply the prediction so that it's matched against, but wrapped
            // in a tentativeboundary so that it doesn't affect the physical cursor.
            // Then we apply it specifically to the tentative cursor.
            applied = this.addPrediction(buffer, new TentativeBoundary(prediction));
            prediction.apply(buffer, this.tentativeCursor(buffer));
        }
        this._currentGen++;
        return applied;
    }
    /**
     * Peeks the last prediction written.
     */
    peekEnd() {
        return this._expected[this._expected.length - 1]?.p;
    }
    /**
     * Peeks the first pending prediction.
     */
    peekStart() {
        return this._expected[0]?.p;
    }
    /**
     * Current position of the cursor in the terminal.
     */
    physicalCursor(buffer) {
        if (!this._physicalCursor) {
            if (this._showPredictions) {
                flushOutput(this.terminal);
            }
            this._physicalCursor = new Cursor(this.terminal.rows, this.terminal.cols, buffer);
        }
        return this._physicalCursor;
    }
    /**
     * Cursor position if all predictions and boundaries that have been inserted
     * so far turn out to be successfully predicted.
     */
    tentativeCursor(buffer) {
        if (!this._tenativeCursor) {
            this._tenativeCursor = this.physicalCursor(buffer).clone();
        }
        return this._tenativeCursor;
    }
    clearCursor() {
        this._physicalCursor = undefined;
        this._tenativeCursor = undefined;
    }
    _getActiveBuffer() {
        const buffer = this.terminal.buffer.active;
        return buffer.type === 'normal' ? buffer : undefined;
    }
}
/**
 * Gets the escape sequence args to restore state/appearance in the cell.
 */
const attributesToArgs = (cell) => {
    if (cell.isAttributeDefault()) {
        return [0];
    }
    const args = [];
    if (cell.isBold()) {
        args.push(1);
    }
    if (cell.isDim()) {
        args.push(2);
    }
    if (cell.isItalic()) {
        args.push(3);
    }
    if (cell.isUnderline()) {
        args.push(4);
    }
    if (cell.isBlink()) {
        args.push(5);
    }
    if (cell.isInverse()) {
        args.push(7);
    }
    if (cell.isInvisible()) {
        args.push(8);
    }
    if (cell.isFgRGB()) {
        args.push(38, 2, cell.getFgColor() >>> 24, (cell.getFgColor() >>> 16) & 0xff, cell.getFgColor() & 0xff);
    }
    if (cell.isFgPalette()) {
        args.push(38, 5, cell.getFgColor());
    }
    if (cell.isFgDefault()) {
        args.push(39);
    }
    if (cell.isBgRGB()) {
        args.push(48, 2, cell.getBgColor() >>> 24, (cell.getBgColor() >>> 16) & 0xff, cell.getBgColor() & 0xff);
    }
    if (cell.isBgPalette()) {
        args.push(48, 5, cell.getBgColor());
    }
    if (cell.isBgDefault()) {
        args.push(49);
    }
    return args;
};
/**
 * Gets the escape sequence to restore state/appearance in the cell.
 */
const attributesToSeq = (cell) => `${"\u001B[" /* VT.Csi */}${attributesToArgs(cell).join(';')}m`;
const arrayHasPrefixAt = (a, ai, b) => {
    if (a.length - ai > b.length) {
        return false;
    }
    for (let bi = 0; bi < b.length; bi++, ai++) {
        if (b[ai] !== a[ai]) {
            return false;
        }
    }
    return true;
};
/**
 * @see https://github.com/xtermjs/xterm.js/blob/065eb13a9d3145bea687239680ec9696d9112b8e/src/common/InputHandler.ts#L2127
 */
const getColorWidth = (params, pos) => {
    const accu = [0, 0, -1, 0, 0, 0];
    let cSpace = 0;
    let advance = 0;
    do {
        const v = params[pos + advance];
        accu[advance + cSpace] = typeof v === 'number' ? v : v[0];
        if (typeof v !== 'number') {
            let i = 0;
            do {
                if (accu[1] === 5) {
                    cSpace = 1;
                }
                accu[advance + i + 1 + cSpace] = v[i];
            } while (++i < v.length && i + advance + 1 + cSpace < accu.length);
            break;
        }
        // exit early if can decide color mode with semicolons
        if ((accu[1] === 5 && advance + cSpace >= 2) || (accu[1] === 2 && advance + cSpace >= 5)) {
            break;
        }
        // offset colorSpace slot for semicolon mode
        if (accu[1]) {
            cSpace = 1;
        }
    } while (++advance + pos < params.length && advance + cSpace < accu.length);
    return advance;
};
class TypeAheadStyle {
    static _compileArgs(args) {
        return `${"\u001B[" /* VT.Csi */}${args.join(';')}m`;
    }
    constructor(value, _terminal) {
        this._terminal = _terminal;
        /**
         * Number of typeahead style arguments we expect to read. If this is 0 and
         * we see a style coming in, we know that the PTY actually wanted to update.
         */
        this._expectedIncomingStyles = 0;
        this.onUpdate(value);
    }
    /**
     * Signals that a style was written to the terminal and we should watch
     * for it coming in.
     */
    expectIncomingStyle(n = 1) {
        this._expectedIncomingStyles += n * 2;
    }
    /**
     * Starts tracking for CSI changes in the terminal.
     */
    startTracking() {
        this._expectedIncomingStyles = 0;
        this._onDidWriteSGR(attributesToArgs(core(this._terminal)._inputHandler._curAttrData));
        this._csiHandler = this._terminal.parser.registerCsiHandler({ final: 'm' }, (args) => {
            this._onDidWriteSGR(args);
            return false;
        });
    }
    /**
     * Stops tracking terminal CSI changes.
     */
    debounceStopTracking() {
        this._stopTracking();
    }
    /**
     * @inheritdoc
     */
    dispose() {
        this._stopTracking();
    }
    _stopTracking() {
        this._csiHandler?.dispose();
        this._csiHandler = undefined;
    }
    _onDidWriteSGR(args) {
        const originalUndo = this._undoArgs;
        for (let i = 0; i < args.length;) {
            const px = args[i];
            const p = typeof px === 'number' ? px : px[0];
            if (this._expectedIncomingStyles) {
                if (arrayHasPrefixAt(args, i, this._undoArgs)) {
                    this._expectedIncomingStyles--;
                    i += this._undoArgs.length;
                    continue;
                }
                if (arrayHasPrefixAt(args, i, this._applyArgs)) {
                    this._expectedIncomingStyles--;
                    i += this._applyArgs.length;
                    continue;
                }
            }
            const width = p === 38 || p === 48 || p === 58 ? getColorWidth(args, i) : 1;
            switch (this._applyArgs[0]) {
                case 1:
                    if (p === 2) {
                        this._undoArgs = [22, 2];
                    }
                    else if (p === 22 || p === 0) {
                        this._undoArgs = [22];
                    }
                    break;
                case 2:
                    if (p === 1) {
                        this._undoArgs = [22, 1];
                    }
                    else if (p === 22 || p === 0) {
                        this._undoArgs = [22];
                    }
                    break;
                case 38:
                    if (p === 0 || p === 39 || p === 100) {
                        this._undoArgs = [39];
                    }
                    else if ((p >= 30 && p <= 38) || (p >= 90 && p <= 97)) {
                        this._undoArgs = args.slice(i, i + width);
                    }
                    break;
                default:
                    if (p === this._applyArgs[0]) {
                        this._undoArgs = this._applyArgs;
                    }
                    else if (p === 0) {
                        this._undoArgs = this._originalUndoArgs;
                    }
                // no-op
            }
            i += width;
        }
        if (originalUndo !== this._undoArgs) {
            this.undo = TypeAheadStyle._compileArgs(this._undoArgs);
        }
    }
    /**
     * Updates the current typeahead style.
     */
    onUpdate(style) {
        const { applyArgs, undoArgs } = this._getArgs(style);
        this._applyArgs = applyArgs;
        this._undoArgs = this._originalUndoArgs = undoArgs;
        this.apply = TypeAheadStyle._compileArgs(this._applyArgs);
        this.undo = TypeAheadStyle._compileArgs(this._undoArgs);
    }
    _getArgs(style) {
        switch (style) {
            case 'bold':
                return { applyArgs: [1], undoArgs: [22] };
            case 'dim':
                return { applyArgs: [2], undoArgs: [22] };
            case 'italic':
                return { applyArgs: [3], undoArgs: [23] };
            case 'underlined':
                return { applyArgs: [4], undoArgs: [24] };
            case 'inverted':
                return { applyArgs: [7], undoArgs: [27] };
            default: {
                let color;
                try {
                    color = Color.fromHex(style);
                }
                catch {
                    color = new Color(new RGBA(255, 0, 0, 1));
                }
                const { r, g, b } = color.rgba;
                return { applyArgs: [38, 2, r, g, b], undoArgs: [39] };
            }
        }
    }
}
__decorate([
    debounce(2000)
], TypeAheadStyle.prototype, "debounceStopTracking", null);
const compileExcludeRegexp = (programs = DEFAULT_LOCAL_ECHO_EXCLUDE) => new RegExp(`\\b(${programs.map(escapeRegExpCharacters).join('|')})\\b`, 'i');
export var CharPredictState;
(function (CharPredictState) {
    /** No characters typed on this line yet */
    CharPredictState[CharPredictState["Unknown"] = 0] = "Unknown";
    /** Has a pending character prediction */
    CharPredictState[CharPredictState["HasPendingChar"] = 1] = "HasPendingChar";
    /** Character validated on this line */
    CharPredictState[CharPredictState["Validated"] = 2] = "Validated";
})(CharPredictState || (CharPredictState = {}));
let TypeAheadAddon = class TypeAheadAddon extends Disposable {
    constructor(_processManager, _configurationService, _telemetryService) {
        super();
        this._processManager = _processManager;
        this._configurationService = _configurationService;
        this._telemetryService = _telemetryService;
        this._typeaheadThreshold = this._configurationService.getValue(TERMINAL_CONFIG_SECTION)
            .localEchoLatencyThreshold;
        this._excludeProgramRe = compileExcludeRegexp(this._configurationService.getValue(TERMINAL_CONFIG_SECTION)
            .localEchoExcludePrograms);
        this._terminalTitle = '';
        this._register(toDisposable(() => this._clearPredictionDebounce?.dispose()));
    }
    activate(terminal) {
        const style = (this._typeaheadStyle = this._register(new TypeAheadStyle(this._configurationService.getValue(TERMINAL_CONFIG_SECTION).localEchoStyle, terminal)));
        const timeline = (this._timeline = new PredictionTimeline(terminal, this._typeaheadStyle));
        const stats = (this.stats = this._register(new PredictionStats(this._timeline)));
        timeline.setShowPredictions(this._typeaheadThreshold === 0);
        this._register(terminal.onData((e) => this._onUserData(e)));
        this._register(terminal.onTitleChange((title) => {
            this._terminalTitle = title;
            this._reevaluatePredictorState(stats, timeline);
        }));
        this._register(terminal.onResize(() => {
            timeline.setShowPredictions(false);
            timeline.clearCursor();
            this._reevaluatePredictorState(stats, timeline);
        }));
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(TERMINAL_CONFIG_SECTION)) {
                style.onUpdate(this._configurationService.getValue(TERMINAL_CONFIG_SECTION).localEchoStyle);
                this._typeaheadThreshold =
                    this._configurationService.getValue(TERMINAL_CONFIG_SECTION).localEchoLatencyThreshold;
                this._excludeProgramRe = compileExcludeRegexp(this._configurationService.getValue(TERMINAL_CONFIG_SECTION).localEchoExcludePrograms);
                this._reevaluatePredictorState(stats, timeline);
            }
        }));
        this._register(this._timeline.onPredictionSucceeded((p) => {
            if (this._lastRow?.charState === 1 /* CharPredictState.HasPendingChar */ &&
                isTenativeCharacterPrediction(p) &&
                p.inner.appliedAt) {
                if (p.inner.appliedAt.pos.y + p.inner.appliedAt.pos.baseY === this._lastRow.y) {
                    this._lastRow.charState = 2 /* CharPredictState.Validated */;
                }
            }
        }));
        this._register(this._processManager.onBeforeProcessData((e) => this._onBeforeProcessData(e)));
        let nextStatsSend;
        this._register(stats.onChange(() => {
            if (!nextStatsSend) {
                nextStatsSend = setTimeout(() => {
                    this._sendLatencyStats(stats);
                    nextStatsSend = undefined;
                }, 300000 /* StatsConstants.StatsSendTelemetryEvery */);
            }
            if (timeline.length === 0) {
                style.debounceStopTracking();
            }
            this._reevaluatePredictorState(stats, timeline);
        }));
    }
    reset() {
        this._lastRow = undefined;
    }
    _deferClearingPredictions() {
        if (!this.stats || !this._timeline) {
            return;
        }
        this._clearPredictionDebounce?.dispose();
        if (this._timeline.length === 0 || this._timeline.peekStart()?.clearAfterTimeout === false) {
            this._clearPredictionDebounce = undefined;
            return;
        }
        this._clearPredictionDebounce = disposableTimeout(() => {
            this._timeline?.undoAllPredictions();
            if (this._lastRow?.charState === 1 /* CharPredictState.HasPendingChar */) {
                this._lastRow.charState = 0 /* CharPredictState.Unknown */;
            }
        }, Math.max(500, (this.stats.maxLatency * 3) / 2), this._store);
    }
    /**
     * Note on debounce:
     *
     * We want to toggle the state only when the user has a pause in their
     * typing. Otherwise, we could turn this on when the PTY sent data but the
     * terminal cursor is not updated, causes issues.
     */
    _reevaluatePredictorState(stats, timeline) {
        this._reevaluatePredictorStateNow(stats, timeline);
    }
    _reevaluatePredictorStateNow(stats, timeline) {
        if (this._excludeProgramRe.test(this._terminalTitle)) {
            timeline.setShowPredictions(false);
        }
        else if (this._typeaheadThreshold < 0) {
            timeline.setShowPredictions(false);
        }
        else if (this._typeaheadThreshold === 0) {
            timeline.setShowPredictions(true);
        }
        else if (stats.sampleSize > 5 /* StatsConstants.StatsMinSamplesToTurnOn */ &&
            stats.accuracy > 0.3 /* StatsConstants.StatsMinAccuracyToTurnOn */) {
            const latency = stats.latency.median;
            if (latency >= this._typeaheadThreshold) {
                timeline.setShowPredictions(true);
            }
            else if (latency < this._typeaheadThreshold / 0.5 /* StatsConstants.StatsToggleOffThreshold */) {
                timeline.setShowPredictions(false);
            }
        }
    }
    _sendLatencyStats(stats) {
        /* __GDPR__
            "terminalLatencyStats" : {
                "owner": "Tyriar",
                "min" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
                "max" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
                "median" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
                "count" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
                "predictionAccuracy" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true }
            }
         */
        this._telemetryService.publicLog('terminalLatencyStats', {
            ...stats.latency,
            predictionAccuracy: stats.accuracy,
        });
    }
    _onUserData(data) {
        if (this._timeline?.terminal.buffer.active.type !== 'normal') {
            return;
        }
        // console.log('user data:', JSON.stringify(data));
        const terminal = this._timeline.terminal;
        const buffer = terminal.buffer.active;
        // Detect programs like git log/less that use the normal buffer but don't
        // take input by deafult (fixes #109541)
        if (buffer.cursorX === 1 && buffer.cursorY === terminal.rows - 1) {
            if (buffer
                .getLine(buffer.cursorY + buffer.baseY)
                ?.getCell(0)
                ?.getChars() === ':') {
                return;
            }
        }
        // the following code guards the terminal prompt to avoid being able to
        // arrow or backspace-into the prompt. Record the lowest X value at which
        // the user gave input, and mark all additions before that as tentative.
        const actualY = buffer.baseY + buffer.cursorY;
        if (actualY !== this._lastRow?.y) {
            this._lastRow = {
                y: actualY,
                startingX: buffer.cursorX,
                endingX: buffer.cursorX,
                charState: 0 /* CharPredictState.Unknown */,
            };
        }
        else {
            this._lastRow.startingX = Math.min(this._lastRow.startingX, buffer.cursorX);
            this._lastRow.endingX = Math.max(this._lastRow.endingX, this._timeline.physicalCursor(buffer).x);
        }
        const addLeftNavigating = (p) => this._timeline.tentativeCursor(buffer).x <= this._lastRow.startingX
            ? this._timeline.addBoundary(buffer, p)
            : this._timeline.addPrediction(buffer, p);
        const addRightNavigating = (p) => this._timeline.tentativeCursor(buffer).x >= this._lastRow.endingX - 1
            ? this._timeline.addBoundary(buffer, p)
            : this._timeline.addPrediction(buffer, p);
        /** @see https://github.com/xtermjs/xterm.js/blob/1913e9512c048e3cf56bb5f5df51bfff6899c184/src/common/input/Keyboard.ts */
        const reader = new StringReader(data);
        while (reader.remaining > 0) {
            if (reader.eatCharCode(127)) {
                // backspace
                const previous = this._timeline.peekEnd();
                if (previous && previous instanceof CharacterPrediction) {
                    this._timeline.addBoundary();
                }
                // backspace must be able to read the previously-written character in
                // the event that it needs to undo it
                if (this._timeline.isShowingPredictions) {
                    flushOutput(this._timeline.terminal);
                }
                if (this._timeline.tentativeCursor(buffer).x <= this._lastRow.startingX) {
                    this._timeline.addBoundary(buffer, new BackspacePrediction(this._timeline.terminal));
                }
                else {
                    // Backspace decrements our ability to go right.
                    this._lastRow.endingX--;
                    this._timeline.addPrediction(buffer, new BackspacePrediction(this._timeline.terminal));
                }
                continue;
            }
            if (reader.eatCharCode(32, 126)) {
                // alphanum
                const char = data[reader.index - 1];
                const prediction = new CharacterPrediction(this._typeaheadStyle, char);
                if (this._lastRow.charState === 0 /* CharPredictState.Unknown */) {
                    this._timeline.addBoundary(buffer, prediction);
                    this._lastRow.charState = 1 /* CharPredictState.HasPendingChar */;
                }
                else {
                    this._timeline.addPrediction(buffer, prediction);
                }
                if (this._timeline.tentativeCursor(buffer).x >= terminal.cols) {
                    this._timeline.addBoundary(buffer, new LinewrapPrediction());
                }
                continue;
            }
            const cursorMv = reader.eatRe(CSI_MOVE_RE);
            if (cursorMv) {
                const direction = cursorMv[3];
                const p = new CursorMovePrediction(direction, !!cursorMv[2], Number(cursorMv[1]) || 1);
                if (direction === "D" /* CursorMoveDirection.Back */) {
                    addLeftNavigating(p);
                }
                else {
                    addRightNavigating(p);
                }
                continue;
            }
            if (reader.eatStr(`${"\u001B" /* VT.Esc */}f`)) {
                addRightNavigating(new CursorMovePrediction("C" /* CursorMoveDirection.Forwards */, true, 1));
                continue;
            }
            if (reader.eatStr(`${"\u001B" /* VT.Esc */}b`)) {
                addLeftNavigating(new CursorMovePrediction("D" /* CursorMoveDirection.Back */, true, 1));
                continue;
            }
            if (reader.eatChar('\r') && buffer.cursorY < terminal.rows - 1) {
                this._timeline.addPrediction(buffer, new NewlinePrediction());
                continue;
            }
            // something else
            this._timeline.addBoundary(buffer, new HardBoundary());
            break;
        }
        if (this._timeline.length === 1) {
            this._deferClearingPredictions();
            this._typeaheadStyle.startTracking();
        }
    }
    _onBeforeProcessData(event) {
        if (!this._timeline) {
            return;
        }
        // console.log('incoming data:', JSON.stringify(event.data));
        event.data = this._timeline.beforeServerInput(event.data);
        // console.log('emitted data:', JSON.stringify(event.data));
        this._deferClearingPredictions();
    }
};
__decorate([
    debounce(100)
], TypeAheadAddon.prototype, "_reevaluatePredictorState", null);
TypeAheadAddon = __decorate([
    __param(1, IConfigurationService),
    __param(2, ITelemetryService)
], TypeAheadAddon);
export { TypeAheadAddon };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUeXBlQWhlYWRBZGRvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3R5cGVBaGVhZC9icm93c2VyL3Rlcm1pbmFsVHlwZUFoZWFkQWRkb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdkUsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDOUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFFekYsT0FBTyxFQUdOLHVCQUF1QixHQUN2QixNQUFNLHNDQUFzQyxDQUFBO0FBRTdDLE9BQU8sRUFDTiwwQkFBMEIsR0FFMUIsTUFBTSw2Q0FBNkMsQ0FBQTtBQUVwRCxJQUFXLEVBT1Y7QUFQRCxXQUFXLEVBQUU7SUFDWixvQkFBWSxDQUFBO0lBQ1oscUJBQWEsQ0FBQTtJQUNiLGdDQUF3QixDQUFBO0lBQ3hCLGdDQUF3QixDQUFBO0lBQ3hCLDZCQUFxQixDQUFBO0lBQ3JCLG1DQUEyQixDQUFBO0FBQzVCLENBQUMsRUFQVSxFQUFFLEtBQUYsRUFBRSxRQU9aO0FBRUQsTUFBTSxZ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