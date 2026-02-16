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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BhcnNlTXVsdGlsaW5lVG9rZW5zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3Rva2Vucy9zcGFyc2VNdWx0aWxpbmVUb2tlbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQzlDLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFaEQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8scUJBQXFCO0lBQzFCLE1BQU0sQ0FBQyxNQUFNLENBQUMsZUFBdUIsRUFBRSxNQUFtQjtRQUNoRSxPQUFPLElBQUkscUJBQXFCLENBQUMsZUFBZSxFQUFFLElBQUksNEJBQTRCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUM1RixDQUFDO0lBTUQ7O09BRUc7SUFDSCxJQUFXLGVBQWU7UUFDekIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUE7SUFDN0IsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBVyxhQUFhO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQTtJQUMzQixDQUFDO0lBRUQsWUFBb0IsZUFBdUIsRUFBRSxNQUFvQztRQUNoRixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsZUFBZSxDQUFBO1FBQ3ZDLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQ3JCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLENBQUE7SUFDN0UsQ0FBQztJQUVNLFFBQVE7UUFDZCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsUUFB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