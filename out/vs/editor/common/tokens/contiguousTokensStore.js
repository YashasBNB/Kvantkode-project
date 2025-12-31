/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../../base/common/arrays.js';
import { Position } from '../core/position.js';
import { ContiguousTokensEditing, EMPTY_LINE_TOKENS, toUint32Array, } from './contiguousTokensEditing.js';
import { LineTokens } from './lineTokens.js';
import { TokenMetadata, } from '../encodedTokenAttributes.js';
/**
 * Represents contiguous tokens in a text model.
 */
export class ContiguousTokensStore {
    constructor(languageIdCodec) {
        this._lineTokens = [];
        this._len = 0;
        this._languageIdCodec = languageIdCodec;
    }
    flush() {
        this._lineTokens = [];
        this._len = 0;
    }
    get hasTokens() {
        return this._lineTokens.length > 0;
    }
    getTokens(topLevelLanguageId, lineIndex, lineText) {
        let rawLineTokens = null;
        if (lineIndex < this._len) {
            rawLineTokens = this._lineTokens[lineIndex];
        }
        if (rawLineTokens !== null && rawLineTokens !== EMPTY_LINE_TOKENS) {
            return new LineTokens(toUint32Array(rawLineTokens), lineText, this._languageIdCodec);
        }
        const lineTokens = new Uint32Array(2);
        lineTokens[0] = lineText.length;
        lineTokens[1] = getDefaultMetadata(this._languageIdCodec.encodeLanguageId(topLevelLanguageId));
        return new LineTokens(lineTokens, lineText, this._languageIdCodec);
    }
    static _massageTokens(topLevelLanguageId, lineTextLength, _tokens) {
        const tokens = _tokens ? toUint32Array(_tokens) : null;
        if (lineTextLength === 0) {
            let hasDifferentLanguageId = false;
            if (tokens && tokens.length > 1) {
                hasDifferentLanguageId = TokenMetadata.getLanguageId(tokens[1]) !== topLevelLanguageId;
            }
            if (!hasDifferentLanguageId) {
                return EMPTY_LINE_TOKENS;
            }
        }
        if (!tokens || tokens.length === 0) {
            const tokens = new Uint32Array(2);
            tokens[0] = lineTextLength;
            tokens[1] = getDefaultMetadata(topLevelLanguageId);
            return tokens.buffer;
        }
        // Ensure the last token covers the end of the text
        tokens[tokens.length - 2] = lineTextLength;
        if (tokens.byteOffset === 0 && tokens.byteLength === tokens.buffer.byteLength) {
            // Store directly the ArrayBuffer pointer to save an object
            return tokens.buffer;
        }
        return tokens;
    }
    _ensureLine(lineIndex) {
        while (lineIndex >= this._len) {
            this._lineTokens[this._len] = null;
            this._len++;
        }
    }
    _deleteLines(start, deleteCount) {
        if (deleteCount === 0) {
            return;
        }
        if (start + deleteCount > this._len) {
            deleteCount = this._len - start;
        }
        this._lineTokens.splice(start, deleteCount);
        this._len -= deleteCount;
    }
    _insertLines(insertIndex, insertCount) {
        if (insertCount === 0) {
            return;
        }
        const lineTokens = [];
        for (let i = 0; i < insertCount; i++) {
            lineTokens[i] = null;
        }
        this._lineTokens = arrays.arrayInsert(this._lineTokens, insertIndex, lineTokens);
        this._len += insertCount;
    }
    setTokens(topLevelLanguageId, lineIndex, lineTextLength, _tokens, checkEquality) {
        const tokens = ContiguousTokensStore._massageTokens(this._languageIdCodec.encodeLanguageId(topLevelLanguageId), lineTextLength, _tokens);
        this._ensureLine(lineIndex);
        const oldTokens = this._lineTokens[lineIndex];
        this._lineTokens[lineIndex] = tokens;
        if (checkEquality) {
            return !ContiguousTokensStore._equals(oldTokens, tokens);
        }
        return false;
    }
    static _equals(_a, _b) {
        if (!_a || !_b) {
            return !_a && !_b;
        }
        const a = toUint32Array(_a);
        const b = toUint32Array(_b);
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0, len = a.length; i < len; i++) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }
    //#region Editing
    acceptEdit(range, eolCount, firstLineLength) {
        this._acceptDeleteRange(range);
        this._acceptInsertText(new Position(range.startLineNumber, range.startColumn), eolCount, firstLineLength);
    }
    _acceptDeleteRange(range) {
        const firstLineIndex = range.startLineNumber - 1;
        if (firstLineIndex >= this._len) {
            return;
        }
        if (range.startLineNumber === range.endLineNumber) {
            if (range.startColumn === range.endColumn) {
                // Nothing to delete
                return;
            }
            this._lineTokens[firstLineIndex] = ContiguousTokensEditing.delete(this._lineTokens[firstLineIndex], range.startColumn - 1, range.endColumn - 1);
            return;
        }
        this._lineTokens[firstLineIndex] = ContiguousTokensEditing.deleteEnding(this._lineTokens[firstLineIndex], range.startColumn - 1);
        const lastLineIndex = range.endLineNumber - 1;
        let lastLineTokens = null;
        if (lastLineIndex < this._len) {
            lastLineTokens = ContiguousTokensEditing.deleteBeginning(this._lineTokens[lastLineIndex], range.endColumn - 1);
        }
        // Take remaining text on last line and append it to remaining text on first line
        this._lineTokens[firstLineIndex] = ContiguousTokensEditing.append(this._lineTokens[firstLineIndex], lastLineTokens);
        // Delete middle lines
        this._deleteLines(range.startLineNumber, range.endLineNumber - range.startLineNumber);
    }
    _acceptInsertText(position, eolCount, firstLineLength) {
        if (eolCount === 0 && firstLineLength === 0) {
            // Nothing to insert
            return;
        }
        const lineIndex = position.lineNumber - 1;
        if (lineIndex >= this._len) {
            return;
        }
        if (eolCount === 0) {
            // Inserting text on one line
            this._lineTokens[lineIndex] = ContiguousTokensEditing.insert(this._lineTokens[lineIndex], position.column - 1, firstLineLength);
            return;
        }
        this._lineTokens[lineIndex] = ContiguousTokensEditing.deleteEnding(this._lineTokens[lineIndex], position.column - 1);
        this._lineTokens[lineIndex] = ContiguousTokensEditing.insert(this._lineTokens[lineIndex], position.column - 1, firstLineLength);
        this._insertLines(position.lineNumber, eolCount);
    }
    //#endregion
    setMultilineTokens(tokens, textModel) {
        if (tokens.length === 0) {
            return { changes: [] };
        }
        const ranges = [];
        for (let i = 0, len = tokens.length; i < len; i++) {
            const element = tokens[i];
            let minChangedLineNumber = 0;
            let maxChangedLineNumber = 0;
            let hasChange = false;
            for (let lineNumber = element.startLineNumber; lineNumber <= element.endLineNumber; lineNumber++) {
                if (hasChange) {
                    this.setTokens(textModel.getLanguageId(), lineNumber - 1, textModel.getLineLength(lineNumber), element.getLineTokens(lineNumber), false);
                    maxChangedLineNumber = lineNumber;
                }
                else {
                    const lineHasChange = this.setTokens(textModel.getLanguageId(), lineNumber - 1, textModel.getLineLength(lineNumber), element.getLineTokens(lineNumber), true);
                    if (lineHasChange) {
                        hasChange = true;
                        minChangedLineNumber = lineNumber;
                        maxChangedLineNumber = lineNumber;
                    }
                }
            }
            if (hasChange) {
                ranges.push({ fromLineNumber: minChangedLineNumber, toLineNumber: maxChangedLineNumber });
            }
        }
        return { changes: ranges };
    }
}
function getDefaultMetadata(topLevelLanguageId) {
    return (((topLevelLanguageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */) |
        (0 /* StandardTokenType.Other */ << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */) |
        (0 /* FontStyle.None */ << 11 /* MetadataConsts.FONT_STYLE_OFFSET */) |
        (1 /* ColorId.DefaultForeground */ << 15 /* MetadataConsts.FOREGROUND_OFFSET */) |
        (2 /* ColorId.DefaultBackground */ << 24 /* MetadataConsts.BACKGROUND_OFFSET */) |
        1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */) >>>
        0);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGlndW91c1Rva2Vuc1N0b3JlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi90b2tlbnMvY29udGlndW91c1Rva2Vuc1N0b3JlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sZ0NBQWdDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRTlDLE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsaUJBQWlCLEVBQ2pCLGFBQWEsR0FDYixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUU1QyxPQUFPLEVBTU4sYUFBYSxHQUNiLE1BQU0sOEJBQThCLENBQUE7QUFJckM7O0dBRUc7QUFDSCxNQUFNLE9BQU8scUJBQXFCO0lBS2pDLFlBQVksZUFBaUM7UUFDNUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUE7UUFDckIsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUE7UUFDYixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsZUFBZSxDQUFBO0lBQ3hDLENBQUM7SUFFTSxLQUFLO1FBQ1gsSUFBSSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUE7UUFDckIsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUE7SUFDZCxDQUFDO0lBRUQsSUFBSSxTQUFTO1FBQ1osT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVNLFNBQVMsQ0FBQyxrQkFBMEIsRUFBRSxTQUFpQixFQUFFLFFBQWdCO1FBQy9FLElBQUksYUFBYSxHQUFxQyxJQUFJLENBQUE7UUFDMUQsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxD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