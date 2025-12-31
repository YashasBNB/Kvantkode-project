/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Line } from './tokens/line.js';
import { Range } from '../../core/range.js';
import { NewLine } from './tokens/newLine.js';
import { assert } from '../../../../base/common/assert.js';
import { CarriageReturn } from './tokens/carriageReturn.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { assertDefined } from '../../../../base/common/types.js';
import { BaseDecoder } from '../../../../base/common/codecs/baseDecoder.js';
/**
 * The `decoder` part of the `LinesCodec` and is able to transform
 * data from a binary stream into a stream of text lines(`Line`).
 */
export class LinesDecoder extends BaseDecoder {
    constructor() {
        super(...arguments);
        /**
         * Buffered received data yet to be processed.
         */
        this.buffer = VSBuffer.alloc(0);
    }
    /**
     * Process data received from the input stream.
     */
    onStreamData(chunk) {
        this.buffer = VSBuffer.concat([this.buffer, chunk]);
        this.processData(false);
    }
    /**
     * Process buffered data.
     *
     * @param streamEnded Flag that indicates if the input stream has ended,
     * 					  which means that is the last call of this method.
     * @throws If internal logic implementation error is detected.
     */
    processData(streamEnded) {
        // iterate over each line of the data buffer, emitting each line
        // as a `Line` token followed by a `NewLine` token, if applies
        while (this.buffer.byteLength > 0) {
            // get line number based on a previously emitted line, if any
            const lineNumber = this.lastEmittedLine ? this.lastEmittedLine.range.startLineNumber + 1 : 1;
            // find the `\r`, `\n`, or `\r\n` tokens in the data
            const endOfLineTokens = this.findEndOfLineTokens(lineNumber);
            const firstToken = endOfLineTokens[0];
            // if no end-of-the-line tokens found, stop processing because we
            // either (1)need more data to arraive or (2)the stream has ended
            // in the case (2) remaining data must be emitted as the last line
            if (!firstToken) {
                // (2) if `streamEnded`, we need to emit the whole remaining
                // data as the last line immediately
                if (streamEnded) {
                    this.emitLine(lineNumber, this.buffer.slice(0));
                }
                break;
            }
            // emit the line found in the data as the `Line` token
            this.emitLine(lineNumber, this.buffer.slice(0, firstToken.range.startColumn - 1));
            // must always hold true as the `emitLine` above sets this
            assertDefined(this.lastEmittedLine, 'No last emitted line found.');
            // emit the end-of-the-line tokens
            let startColumn = this.lastEmittedLine.range.endColumn;
            for (const token of endOfLineTokens) {
                const endColumn = startColumn + token.byte.byteLength;
                // emit the token updating its column start/end numbers based on
                // the emitted line text length and previous end-of-the-line token
                this._onData.fire(token.withRange({ startColumn, endColumn }));
                // shorten the data buffer by the length of the token
                this.buffer = this.buffer.slice(token.byte.byteLength);
                // update the start column for the next token
                startColumn = endColumn;
            }
        }
        // if the stream has ended, assert that the input data buffer is now empty
        // otherwise we have a logic error and leaving some buffered data behind
        if (streamEnded) {
            assert(this.buffer.byteLength === 0, 'Expected the input data buffer to be empty when the stream ends.');
        }
    }
    /**
     * Find the end of line tokens in the data buffer.
     * Can return:
     *  - [`\r`, `\n`] tokens if the sequence is found
     *  - [`\r`] token if only the carriage return is found
     *  - [`\n`] token if only the newline is found
     *  - an `empty array` if no end of line tokens found
     */
    findEndOfLineTokens(lineNumber) {
        const result = [];
        // find the first occurrence of the carriage return and newline tokens
        const carriageReturnIndex = this.buffer.indexOf(CarriageReturn.byte);
        const newLineIndex = this.buffer.indexOf(NewLine.byte);
        // if the `\r` comes before the `\n`(if `\n` present at all)
        if (carriageReturnIndex >= 0 && (carriageReturnIndex < newLineIndex || newLineIndex === -1)) {
            // add the carriage return token first
            result.push(new CarriageReturn(new Range(lineNumber, carriageReturnIndex + 1, lineNumber, carriageReturnIndex + 1 + CarriageReturn.byte.byteLength)));
            // if the `\r\n` sequence
            if (newLineIndex === carriageReturnIndex + 1) {
                // add the newline token to the result
                result.push(new NewLine(new Range(lineNumber, newLineIndex + 1, lineNumber, newLineIndex + 1 + NewLine.byte.byteLength)));
            }
            if (this.buffer.byteLength > carriageReturnIndex + 1) {
                // either `\r` or `\r\n` cases found
                return result;
            }
            return [];
        }
        // no `\r`, but there is `\n`
        if (newLineIndex >= 0) {
            result.push(new NewLine(new Range(lineNumber, newLineIndex + 1, lineNumber, newLineIndex + 1 + NewLine.byte.byteLength)));
        }
        // neither `\r` nor `\n` found, no end of line found at all
        return result;
    }
    /**
     * Emit a provided line as the `Line` token to the output stream.
     */
    emitLine(lineNumber, // Note! 1-based indexing
    lineBytes) {
        const line = new Line(lineNumber, lineBytes.toString());
        this._onData.fire(line);
        // store the last emitted line so we can use it when we need
        // to send the remaining line in the `onStreamEnd` method
        this.lastEmittedLine = line;
        // shorten the data buffer by the length of the line emitted
        this.buffer = this.buffer.slice(lineBytes.byteLength);
    }
    /**
     * Handle the end of the input stream - if the buffer still has some data,
     * emit it as the last available line token before firing the `onEnd` event.
     */
    onStreamEnd() {
        // if the input data buffer is not empty when the input stream ends, emit
        // the remaining data as the last line before firing the `onEnd` event
        if (this.buffer.byteLength > 0) {
            this.processData(true);
        }
        super.onStreamEnd();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNEZWNvZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb2RlY3MvbGluZXNDb2RlYy9saW5lc0RlY29kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDN0MsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQU8zRTs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sWUFBYSxTQUFRLFdBQWlDO0lBQW5FOztRQUNDOztXQUVHO1FBQ0ssV0FBTSxHQUFhLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFxTDdDLENBQUM7SUEzS0E7O09BRUc7SUFDZ0IsWUFBWSxDQUFDLEtBQWU7UUFDOUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBRW5ELElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDeEIsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNLLFdBQVcsQ0FBQyxXQUFvQjtRQUN2QyxnRUFBZ0U7UUFDaEUs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