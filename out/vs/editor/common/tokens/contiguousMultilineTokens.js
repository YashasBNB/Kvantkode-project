/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../../base/common/arrays.js';
import { readUInt32BE, writeUInt32BE } from '../../../base/common/buffer.js';
import { Position } from '../core/position.js';
import { countEOL } from '../core/eolCounter.js';
import { ContiguousTokensEditing } from './contiguousTokensEditing.js';
import { LineRange } from '../core/lineRange.js';
/**
 * Represents contiguous tokens over a contiguous range of lines.
 */
export class ContiguousMultilineTokens {
    static deserialize(buff, offset, result) {
        const view32 = new Uint32Array(buff.buffer);
        const startLineNumber = readUInt32BE(buff, offset);
        offset += 4;
        const count = readUInt32BE(buff, offset);
        offset += 4;
        const tokens = [];
        for (let i = 0; i < count; i++) {
            const byteCount = readUInt32BE(buff, offset);
            offset += 4;
            tokens.push(view32.subarray(offset / 4, offset / 4 + byteCount / 4));
            offset += byteCount;
        }
        result.push(new ContiguousMultilineTokens(startLineNumber, tokens));
        return offset;
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
        return this._startLineNumber + this._tokens.length - 1;
    }
    constructor(startLineNumber, tokens) {
        this._startLineNumber = startLineNumber;
        this._tokens = tokens;
    }
    getLineRange() {
        return new LineRange(this._startLineNumber, this._startLineNumber + this._tokens.length);
    }
    /**
     * @see {@link _tokens}
     */
    getLineTokens(lineNumber) {
        return this._tokens[lineNumber - this._startLineNumber];
    }
    appendLineTokens(lineTokens) {
        this._tokens.push(lineTokens);
    }
    serializeSize() {
        let result = 0;
        result += 4; // 4 bytes for the start line number
        result += 4; // 4 bytes for the line count
        for (let i = 0; i < this._tokens.length; i++) {
            const lineTokens = this._tokens[i];
            if (!(lineTokens instanceof Uint32Array)) {
                throw new Error(`Not supported!`);
            }
            result += 4; // 4 bytes for the byte count
            result += lineTokens.byteLength;
        }
        return result;
    }
    serialize(destination, offset) {
        writeUInt32BE(destination, this._startLineNumber, offset);
        offset += 4;
        writeUInt32BE(destination, this._tokens.length, offset);
        offset += 4;
        for (let i = 0; i < this._tokens.length; i++) {
            const lineTokens = this._tokens[i];
            if (!(lineTokens instanceof Uint32Array)) {
                throw new Error(`Not supported!`);
            }
            writeUInt32BE(destination, lineTokens.byteLength, offset);
            offset += 4;
            destination.set(new Uint8Array(lineTokens.buffer), offset);
            offset += lineTokens.byteLength;
        }
        return offset;
    }
    applyEdit(range, text) {
        const [eolCount, firstLineLength] = countEOL(text);
        this._acceptDeleteRange(range);
        this._acceptInsertText(new Position(range.startLineNumber, range.startColumn), eolCount, firstLineLength);
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
        if (firstLineIndex >= this._tokens.length) {
            // this deletion occurs entirely after this block, so there is nothing to do
            return;
        }
        if (firstLineIndex < 0 && lastLineIndex >= this._tokens.length) {
            // this deletion completely encompasses this block
            this._startLineNumber = 0;
            this._tokens = [];
            return;
        }
        if (firstLineIndex === lastLineIndex) {
            // a delete on a single line
            this._tokens[firstLineIndex] = ContiguousTokensEditing.delete(this._tokens[firstLineIndex], range.startColumn - 1, range.endColumn - 1);
            return;
        }
        if (firstLineIndex >= 0) {
            // The first line survives
            this._tokens[firstLineIndex] = ContiguousTokensEditing.deleteEnding(this._tokens[firstLineIndex], range.startColumn - 1);
            if (lastLineIndex < this._tokens.length) {
                // The last line survives
                const lastLineTokens = ContiguousTokensEditing.deleteBeginning(this._tokens[lastLineIndex], range.endColumn - 1);
                // Take remaining text on last line and append it to remaining text on first line
                this._tokens[firstLineIndex] = ContiguousTokensEditing.append(this._tokens[firstLineIndex], lastLineTokens);
                // Delete middle lines
                this._tokens.splice(firstLineIndex + 1, lastLineIndex - firstLineIndex);
            }
            else {
                // The last line does not survive
                // Take remaining text on last line and append it to remaining text on first line
                this._tokens[firstLineIndex] = ContiguousTokensEditing.append(this._tokens[firstLineIndex], null);
                // Delete lines
                this._tokens = this._tokens.slice(0, firstLineIndex + 1);
            }
        }
        else {
            // The first line does not survive
            const deletedBefore = -firstLineIndex;
            this._startLineNumber -= deletedBefore;
            // Remove beginning from last line
            this._tokens[lastLineIndex] = ContiguousTokensEditing.deleteBeginning(this._tokens[lastLineIndex], range.endColumn - 1);
            // Delete lines
            this._tokens = this._tokens.slice(lastLineIndex);
        }
    }
    _acceptInsertText(position, eolCount, firstLineLength) {
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
        if (lineIndex >= this._tokens.length) {
            // this insertion occurs after this block, so there is nothing to do
            return;
        }
        if (eolCount === 0) {
            // Inserting text on one line
            this._tokens[lineIndex] = ContiguousTokensEditing.insert(this._tokens[lineIndex], position.column - 1, firstLineLength);
            return;
        }
        this._tokens[lineIndex] = ContiguousTokensEditing.deleteEnding(this._tokens[lineIndex], position.column - 1);
        this._tokens[lineIndex] = ContiguousTokensEditing.insert(this._tokens[lineIndex], position.column - 1, firstLineLength);
        this._insertLines(position.lineNumber, eolCount);
    }
    _insertLines(insertIndex, insertCount) {
        if (insertCount === 0) {
            return;
        }
        const lineTokens = [];
        for (let i = 0; i < insertCount; i++) {
            lineTokens[i] = null;
        }
        this._tokens = arrays.arrayInsert(this._tokens, insertIndex, lineTokens);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGlndW91c011bHRpbGluZVRva2Vucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdG9rZW5zL2NvbnRpZ3VvdXNNdWx0aWxpbmVUb2tlbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUU5QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBRWhEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHlCQUF5QjtJQUM5QixNQUFNLENBQUMsV0FBVyxDQUN4QixJQUFnQixFQUNoQixNQUFjLEVBQ2QsTUFBbUM7UUFFbkMsTUFBTSxNQUFNLEdBQUcsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzNDLE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDbEQsTUFBTSxJQUFJLENBQUMsQ0FBQTtRQUNYLE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDeEMsTUFBTSxJQUFJLENBQUMsQ0FBQTtRQUNYLE1BQU0sTUFBTSxHQUFrQixFQUFFLENBQUE7UUFDaEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFD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