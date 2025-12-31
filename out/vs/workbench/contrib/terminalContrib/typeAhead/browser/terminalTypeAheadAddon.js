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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUeXBlQWhlYWRBZGRvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi90eXBlQWhlYWQvYnJvd3Nlci90ZXJtaW5hbFR5cGVBaGVhZEFkZG9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBRXpGLE9BQU8sRUFHTix1QkFBdUIsR0FDdkIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU3QyxPQUFPLEVBQ04sMEJBQTBCLEdBRTFCLE1BQU0sNkNBQTZDLENBQUE7QUFFcEQsSUFBVyxFQU9WO0FBUEQsV0FBVyxFQUFFO0lBQ1osb0JBQVksQ0FBQTtJQUNaLHFCQUFhLENBQUE7SUFDYixnQ0FBd0IsQ0FBQTtJQUN4QixnQ0FBd0IsQ0FBQTtJQUN4Qiw2QkFBcUIsQ0FBQTtJQUNyQixtQ0FBMkIsQ0FBQTtBQUM1QixDQUFDLEVBUFUsRUFBRSxLQUFGLEVBQUUsUUFPWjtBQUVELE1BQU0sWUFBWSxH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