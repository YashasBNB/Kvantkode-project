/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { countEOL } from '../core/eolCounter.js';
/**
 * Represents sparse tokens over a contiguous range of lines.
 */
export class SparseMultilineTokens {
    static create(startLineNumber, tokens) {
        return new SparseMultilineTokens(startLineNumber, new SparseMultilineTokensStorage(tokens));
    }
    /**
     * (Inclusive) start line number for these tokens.
     */
    get startLineNumber() {
        return this._startLineNumber;
    }
    /**
     * (Inclusive) end line number for these tokens.
     */
    get endLineNumber() {
        return this._endLineNumber;
    }
    constructor(startLineNumber, tokens) {
        this._startLineNumber = startLineNumber;
        this._tokens = tokens;
        this._endLineNumber = this._startLineNumber + this._tokens.getMaxDeltaLine();
    }
    toString() {
        return this._tokens.toString(this._startLineNumber);
    }
    _updateEndLineNumber() {
        this._endLineNumber = this._startLineNumber + this._tokens.getMaxDeltaLine();
    }
    isEmpty() {
        return this._tokens.isEmpty();
    }
    getLineTokens(lineNumber) {
        if (this._startLineNumber <= lineNumber && lineNumber <= this._endLineNumber) {
            return this._tokens.getLineTokens(lineNumber - this._startLineNumber);
        }
        return null;
    }
    getRange() {
        const deltaRange = this._tokens.getRange();
        if (!deltaRange) {
            return deltaRange;
        }
        return new Range(this._startLineNumber + deltaRange.startLineNumber, deltaRange.startColumn, this._startLineNumber + deltaRange.endLineNumber, deltaRange.endColumn);
    }
    removeTokens(range) {
        const startLineIndex = range.startLineNumber - this._startLineNumber;
        const endLineIndex = range.endLineNumber - this._startLineNumber;
        this._startLineNumber += this._tokens.removeTokens(startLineIndex, range.startColumn - 1, endLineIndex, range.endColumn - 1);
        this._updateEndLineNumber();
    }
    split(range) {
        // split tokens to two:
        // a) all the tokens before `range`
        // b) all the tokens after `range`
        const startLineIndex = range.startLineNumber - this._startLineNumber;
        const endLineIndex = range.endLineNumber - this._startLineNumber;
        const [a, b, bDeltaLine] = this._tokens.split(startLineIndex, range.startColumn - 1, endLineIndex, range.endColumn - 1);
        return [
            new SparseMultilineTokens(this._startLineNumber, a),
            new SparseMultilineTokens(this._startLineNumber + bDeltaLine, b),
        ];
    }
    applyEdit(range, text) {
        const [eolCount, firstLineLength, lastLineLength] = countEOL(text);
        this.acceptEdit(range, eolCount, firstLineLength, lastLineLength, text.length > 0 ? text.charCodeAt(0) : 0 /* CharCode.Null */);
    }
    acceptEdit(range, eolCount, firstLineLength, lastLineLength, firstCharCode) {
        this._acceptDeleteRange(range);
        this._acceptInsertText(new Position(range.startLineNumber, range.startColumn), eolCount, firstLineLength, lastLineLength, firstCharCode);
        this._updateEndLineNumber();
    }
    _acceptDeleteRange(range) {
        if (range.startLineNumber === range.endLineNumber && range.startColumn === range.endColumn) {
            // Nothing to delete
            return;
        }
        const firstLineIndex = range.startLineNumber - this._startLineNumber;
        const lastLineIndex = range.endLineNumber - this._startLineNumber;
        if (lastLineIndex < 0) {
            // this deletion occurs entirely before this block, so we only need to adjust line numbers
            const deletedLinesCount = lastLineIndex - firstLineIndex;
            this._startLineNumber -= deletedLinesCount;
            return;
        }
        const tokenMaxDeltaLine = this._tokens.getMaxDeltaLine();
        if (firstLineIndex >= tokenMaxDeltaLine + 1) {
            // this deletion occurs entirely after this block, so there is nothing to do
            return;
        }
        if (firstLineIndex < 0 && lastLineIndex >= tokenMaxDeltaLine + 1) {
            // this deletion completely encompasses this block
            this._startLineNumber = 0;
            this._tokens.clear();
            return;
        }
        if (firstLineIndex < 0) {
            const deletedBefore = -firstLineIndex;
            this._startLineNumber -= deletedBefore;
            this._tokens.acceptDeleteRange(range.startColumn - 1, 0, 0, lastLineIndex, range.endColumn - 1);
        }
        else {
            this._tokens.acceptDeleteRange(0, firstLineIndex, range.startColumn - 1, lastLineIndex, range.endColumn - 1);
        }
    }
    _acceptInsertText(position, eolCount, firstLineLength, lastLineLength, firstCharCode) {
        if (eolCount === 0 && firstLineLength === 0) {
            // Nothing to insert
            return;
        }
        const lineIndex = position.lineNumber - this._startLineNumber;
        if (lineIndex < 0) {
            // this insertion occurs before this block, so we only need to adjust line numbers
            this._startLineNumber += eolCount;
            return;
        }
        const tokenMaxDeltaLine = this._tokens.getMaxDeltaLine();
        if (lineIndex >= tokenMaxDeltaLine + 1) {
            // this insertion occurs after this block, so there is nothing to do
            return;
        }
        this._tokens.acceptInsertText(lineIndex, position.column - 1, eolCount, firstLineLength, lastLineLength, firstCharCode);
    }
}
class SparseMultilineTokensStorage {
    constructor(tokens) {
        this._tokens = tokens;
        this._tokenCount = tokens.length / 4;
    }
    toString(startLineNumber) {
        const pieces = [];
        for (let i = 0; i < this._tokenCount; i++) {
            pieces.push(`(${this._getDeltaLine(i) + startLineNumber},${this._getStartCharacter(i)}-${this._getEndCharacter(i)})`);
        }
        return `[${pieces.join(',')}]`;
    }
    getMaxDeltaLine() {
        const tokenCount = this._getTokenCount();
        if (tokenCount === 0) {
            return -1;
        }
        return this._getDeltaLine(tokenCount - 1);
    }
    getRange() {
        const tokenCount = this._getTokenCount();
        if (tokenCount === 0) {
            return null;
        }
        const startChar = this._getStartCharacter(0);
        const maxDeltaLine = this._getDeltaLine(tokenCount - 1);
        const endChar = this._getEndCharacter(tokenCount - 1);
        return new Range(0, startChar + 1, maxDeltaLine, endChar + 1);
    }
    _getTokenCount() {
        return this._tokenCount;
    }
    _getDeltaLine(tokenIndex) {
        return this._tokens[4 * tokenIndex];
    }
    _getStartCharacter(tokenIndex) {
        return this._tokens[4 * tokenIndex + 1];
    }
    _getEndCharacter(tokenIndex) {
        return this._tokens[4 * tokenIndex + 2];
    }
    isEmpty() {
        return this._getTokenCount() === 0;
    }
    getLineTokens(deltaLine) {
        let low = 0;
        let high = this._getTokenCount() - 1;
        while (low < high) {
            const mid = low + Math.floor((high - low) / 2);
            const midDeltaLine = this._getDeltaLine(mid);
            if (midDeltaLine < deltaLine) {
                low = mid + 1;
            }
            else if (midDeltaLine > deltaLine) {
                high = mid - 1;
            }
            else {
                let min = mid;
                while (min > low && this._getDeltaLine(min - 1) === deltaLine) {
                    min--;
                }
                let max = mid;
                while (max < high && this._getDeltaLine(max + 1) === deltaLine) {
                    max++;
                }
                return new SparseLineTokens(this._tokens.subarray(4 * min, 4 * max + 4));
            }
        }
        if (this._getDeltaLine(low) === deltaLine) {
            return new SparseLineTokens(this._tokens.subarray(4 * low, 4 * low + 4));
        }
        return null;
    }
    clear() {
        this._tokenCount = 0;
    }
    removeTokens(startDeltaLine, startChar, endDeltaLine, endChar) {
        const tokens = this._tokens;
        const tokenCount = this._tokenCount;
        let newTokenCount = 0;
        let hasDeletedTokens = false;
        let firstDeltaLine = 0;
        for (let i = 0; i < tokenCount; i++) {
            const srcOffset = 4 * i;
            const tokenDeltaLine = tokens[srcOffset];
            const tokenStartCharacter = tokens[srcOffset + 1];
            const tokenEndCharacter = tokens[srcOffset + 2];
            const tokenMetadata = tokens[srcOffset + 3];
            if ((tokenDeltaLine > startDeltaLine ||
                (tokenDeltaLine === startDeltaLine && tokenEndCharacter >= startChar)) &&
                (tokenDeltaLine < endDeltaLine ||
                    (tokenDeltaLine === endDeltaLine && tokenStartCharacter <= endChar))) {
                hasDeletedTokens = true;
            }
            else {
                if (newTokenCount === 0) {
                    firstDeltaLine = tokenDeltaLine;
                }
                if (hasDeletedTokens) {
                    // must move the token to the left
                    const destOffset = 4 * newTokenCount;
                    tokens[destOffset] = tokenDeltaLine - firstDeltaLine;
                    tokens[destOffset + 1] = tokenStartCharacter;
                    tokens[destOffset + 2] = tokenEndCharacter;
                    tokens[destOffset + 3] = tokenMetadata;
                }
                newTokenCount++;
            }
        }
        this._tokenCount = newTokenCount;
        return firstDeltaLine;
    }
    split(startDeltaLine, startChar, endDeltaLine, endChar) {
        const tokens = this._tokens;
        const tokenCount = this._tokenCount;
        const aTokens = [];
        const bTokens = [];
        let destTokens = aTokens;
        let destOffset = 0;
        let destFirstDeltaLine = 0;
        for (let i = 0; i < tokenCount; i++) {
            const srcOffset = 4 * i;
            const tokenDeltaLine = tokens[srcOffset];
            const tokenStartCharacter = tokens[srcOffset + 1];
            const tokenEndCharacter = tokens[srcOffset + 2];
            const tokenMetadata = tokens[srcOffset + 3];
            if (tokenDeltaLine > startDeltaLine ||
                (tokenDeltaLine === startDeltaLine && tokenEndCharacter >= startChar)) {
                if (tokenDeltaLine < endDeltaLine ||
                    (tokenDeltaLine === endDeltaLine && tokenStartCharacter <= endChar)) {
                    // this token is touching the range
                    continue;
                }
                else {
                    // this token is after the range
                    if (destTokens !== bTokens) {
                        // this token is the first token after the range
                        destTokens = bTokens;
                        destOffset = 0;
                        destFirstDeltaLine = tokenDeltaLine;
                    }
                }
            }
            destTokens[destOffset++] = tokenDeltaLine - destFirstDeltaLine;
            destTokens[destOffset++] = tokenStartCharacter;
            destTokens[destOffset++] = tokenEndCharacter;
            destTokens[destOffset++] = tokenMetadata;
        }
        return [
            new SparseMultilineTokensStorage(new Uint32Array(aTokens)),
            new SparseMultilineTokensStorage(new Uint32Array(bTokens)),
            destFirstDeltaLine,
        ];
    }
    acceptDeleteRange(horizontalShiftForFirstLineTokens, startDeltaLine, startCharacter, endDeltaLine, endCharacter) {
        // This is a bit complex, here are the cases I used to think about this:
        //
        // 1. The token starts before the deletion range
        // 1a. The token is completely before the deletion range
        //               -----------
        //                          xxxxxxxxxxx
        // 1b. The token starts before, the deletion range ends after the token
        //               -----------
        //                      xxxxxxxxxxx
        // 1c. The token starts before, the deletion range ends precisely with the token
        //               ---------------
        //                      xxxxxxxx
        // 1d. The token starts before, the deletion range is inside the token
        //               ---------------
        //                    xxxxx
        //
        // 2. The token starts at the same position with the deletion range
        // 2a. The token starts at the same position, and ends inside the deletion range
        //               -------
        //               xxxxxxxxxxx
        // 2b. The token starts at the same position, and ends at the same position as the deletion range
        //               ----------
        //               xxxxxxxxxx
        // 2c. The token starts at the same position, and ends after the deletion range
        //               -------------
        //               xxxxxxx
        //
        // 3. The token starts inside the deletion range
        // 3a. The token is inside the deletion range
        //                -------
        //             xxxxxxxxxxxxx
        // 3b. The token starts inside the deletion range, and ends at the same position as the deletion range
        //                ----------
        //             xxxxxxxxxxxxx
        // 3c. The token starts inside the deletion range, and ends after the deletion range
        //                ------------
        //             xxxxxxxxxxx
        //
        // 4. The token starts after the deletion range
        //                  -----------
        //          xxxxxxxx
        //
        const tokens = this._tokens;
        const tokenCount = this._tokenCount;
        const deletedLineCount = endDeltaLine - startDeltaLine;
        let newTokenCount = 0;
        let hasDeletedTokens = false;
        for (let i = 0; i < tokenCount; i++) {
            const srcOffset = 4 * i;
            let tokenDeltaLine = tokens[srcOffset];
            let tokenStartCharacter = tokens[srcOffset + 1];
            let tokenEndCharacter = tokens[srcOffset + 2];
            const tokenMetadata = tokens[srcOffset + 3];
            if (tokenDeltaLine < startDeltaLine ||
                (tokenDeltaLine === startDeltaLine && tokenEndCharacter <= startCharacter)) {
                // 1a. The token is completely before the deletion range
                // => nothing to do
                newTokenCount++;
                continue;
            }
            else if (tokenDeltaLine === startDeltaLine && tokenStartCharacter < startCharacter) {
                // 1b, 1c, 1d
                // => the token survives, but it needs to shrink
                if (tokenDeltaLine === endDeltaLine && tokenEndCharacter > endCharacter) {
                    // 1d. The token starts before, the deletion range is inside the token
                    // => the token shrinks by the deletion character count
                    tokenEndCharacter -= endCharacter - startCharacter;
                }
                else {
                    // 1b. The token starts before, the deletion range ends after the token
                    // 1c. The token starts before, the deletion range ends precisely with the token
                    // => the token shrinks its ending to the deletion start
                    tokenEndCharacter = startCharacter;
                }
            }
            else if (tokenDeltaLine === startDeltaLine && tokenStartCharacter === startCharacter) {
                // 2a, 2b, 2c
                if (tokenDeltaLine === endDeltaLine && tokenEndCharacter > endCharacter) {
                    // 2c. The token starts at the same position, and ends after the deletion range
                    // => the token shrinks by the deletion character count
                    tokenEndCharacter -= endCharacter - startCharacter;
                }
                else {
                    // 2a. The token starts at the same position, and ends inside the deletion range
                    // 2b. The token starts at the same position, and ends at the same position as the deletion range
                    // => the token is deleted
                    hasDeletedTokens = true;
                    continue;
                }
            }
            else if (tokenDeltaLine < endDeltaLine ||
                (tokenDeltaLine === endDeltaLine && tokenStartCharacter < endCharacter)) {
                // 3a, 3b, 3c
                if (tokenDeltaLine === endDeltaLine && tokenEndCharacter > endCharacter) {
                    // 3c. The token starts inside the deletion range, and ends after the deletion range
                    // => the token moves to continue right after the deletion
                    tokenDeltaLine = startDeltaLine;
                    tokenStartCharacter = startCharacter;
                    tokenEndCharacter = tokenStartCharacter + (tokenEndCharacter - endCharacter);
                }
                else {
                    // 3a. The token is inside the deletion range
                    // 3b. The token starts inside the deletion range, and ends at the same position as the deletion range
                    // => the token is deleted
                    hasDeletedTokens = true;
                    continue;
                }
            }
            else if (tokenDeltaLine > endDeltaLine) {
                // 4. (partial) The token starts after the deletion range, on a line below...
                if (deletedLineCount === 0 && !hasDeletedTokens) {
                    // early stop, there is no need to walk all the tokens and do nothing...
                    newTokenCount = tokenCount;
                    break;
                }
                tokenDeltaLine -= deletedLineCount;
            }
            else if (tokenDeltaLine === endDeltaLine && tokenStartCharacter >= endCharacter) {
                // 4. (continued) The token starts after the deletion range, on the last line where a deletion occurs
                if (horizontalShiftForFirstLineTokens && tokenDeltaLine === 0) {
                    tokenStartCharacter += horizontalShiftForFirstLineTokens;
                    tokenEndCharacter += horizontalShiftForFirstLineTokens;
                }
                tokenDeltaLine -= deletedLineCount;
                tokenStartCharacter -= endCharacter - startCharacter;
                tokenEndCharacter -= endCharacter - startCharacter;
            }
            else {
                throw new Error(`Not possible!`);
            }
            const destOffset = 4 * newTokenCount;
            tokens[destOffset] = tokenDeltaLine;
            tokens[destOffset + 1] = tokenStartCharacter;
            tokens[destOffset + 2] = tokenEndCharacter;
            tokens[destOffset + 3] = tokenMetadata;
            newTokenCount++;
        }
        this._tokenCount = newTokenCount;
    }
    acceptInsertText(deltaLine, character, eolCount, firstLineLength, lastLineLength, firstCharCode) {
        // Here are the cases I used to think about this:
        //
        // 1. The token is completely before the insertion point
        //            -----------   |
        // 2. The token ends precisely at the insertion point
        //            -----------|
        // 3. The token contains the insertion point
        //            -----|------
        // 4. The token starts precisely at the insertion point
        //            |-----------
        // 5. The token is completely after the insertion point
        //            |   -----------
        //
        const isInsertingPreciselyOneWordCharacter = eolCount === 0 &&
            firstLineLength === 1 &&
            ((firstCharCode >= 48 /* CharCode.Digit0 */ && firstCharCode <= 57 /* CharCode.Digit9 */) ||
                (firstCharCode >= 65 /* CharCode.A */ && firstCharCode <= 90 /* CharCode.Z */) ||
                (firstCharCode >= 97 /* CharCode.a */ && firstCharCode <= 122 /* CharCode.z */));
        const tokens = this._tokens;
        const tokenCount = this._tokenCount;
        for (let i = 0; i < tokenCount; i++) {
            const offset = 4 * i;
            let tokenDeltaLine = tokens[offset];
            let tokenStartCharacter = tokens[offset + 1];
            let tokenEndCharacter = tokens[offset + 2];
            if (tokenDeltaLine < deltaLine ||
                (tokenDeltaLine === deltaLine && tokenEndCharacter < character)) {
                // 1. The token is completely before the insertion point
                // => nothing to do
                continue;
            }
            else if (tokenDeltaLine === deltaLine && tokenEndCharacter === character) {
                // 2. The token ends precisely at the insertion point
                // => expand the end character only if inserting precisely one character that is a word character
                if (isInsertingPreciselyOneWordCharacter) {
                    tokenEndCharacter += 1;
                }
                else {
                    continue;
                }
            }
            else if (tokenDeltaLine === deltaLine &&
                tokenStartCharacter < character &&
                character < tokenEndCharacter) {
                // 3. The token contains the insertion point
                if (eolCount === 0) {
                    // => just expand the end character
                    tokenEndCharacter += firstLineLength;
                }
                else {
                    // => cut off the token
                    tokenEndCharacter = character;
                }
            }
            else {
                // 4. or 5.
                if (tokenDeltaLine === deltaLine && tokenStartCharacter === character) {
                    // 4. The token starts precisely at the insertion point
                    // => grow the token (by keeping its start constant) only if inserting precisely one character that is a word character
                    // => otherwise behave as in case 5.
                    if (isInsertingPreciselyOneWordCharacter) {
                        continue;
                    }
                }
                // => the token must move and keep its size constant
                if (tokenDeltaLine === deltaLine) {
                    tokenDeltaLine += eolCount;
                    // this token is on the line where the insertion is taking place
                    if (eolCount === 0) {
                        tokenStartCharacter += firstLineLength;
                        tokenEndCharacter += firstLineLength;
                    }
                    else {
                        const tokenLength = tokenEndCharacter - tokenStartCharacter;
                        tokenStartCharacter = lastLineLength + (tokenStartCharacter - character);
                        tokenEndCharacter = tokenStartCharacter + tokenLength;
                    }
                }
                else {
                    tokenDeltaLine += eolCount;
                }
            }
            tokens[offset] = tokenDeltaLine;
            tokens[offset + 1] = tokenStartCharacter;
            tokens[offset + 2] = tokenEndCharacter;
        }
    }
}
export class SparseLineTokens {
    constructor(tokens) {
        this._tokens = tokens;
    }
    getCount() {
        return this._tokens.length / 4;
    }
    getStartCharacter(tokenIndex) {
        return this._tokens[4 * tokenIndex + 1];
    }
    getEndCharacter(tokenIndex) {
        return this._tokens[4 * tokenIndex + 2];
    }
    getMetadata(tokenIndex) {
        return this._tokens[4 * tokenIndex + 3];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BhcnNlTXVsdGlsaW5lVG9rZW5zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi90b2tlbnMvc3BhcnNlTXVsdGlsaW5lVG9rZW5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUM5QyxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDaEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRWhEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHFCQUFxQjtJQUMxQixNQUFNLENBQUMsTUFBTSxDQUFDLGVBQXVCLEVBQUUsTUFBbUI7UUFDaEUsT0FBTyxJQUFJLHFCQUFxQixDQUFDLGVBQWUsRUFBRSxJQUFJLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDNUYsQ0FBQztJQU1EOztPQUVHO0lBQ0gsSUFBVyxlQUFlO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFBO0lBQzdCLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsYUFBYTtRQUN2QixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUE7SUFDM0IsQ0FBQztJQUVELFlBQW9CLGVBQXVCLEVBQUUsTUFBb0M7UUFDaEYsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGVBQWUsQ0FBQTtRQUN2QyxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUNyQixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxDQUFBO0lBQzdFLENBQUM7SUFFTSxRQUFRO1FBQ2QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsZ0JBQWdC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