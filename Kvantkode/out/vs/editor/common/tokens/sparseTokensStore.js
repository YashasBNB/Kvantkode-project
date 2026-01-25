/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../../base/common/arrays.js';
import { LineTokens } from './lineTokens.js';
/**
 * Represents sparse tokens in a text model.
 */
export class SparseTokensStore {
    constructor(languageIdCodec) {
        this._pieces = [];
        this._isComplete = false;
        this._languageIdCodec = languageIdCodec;
    }
    flush() {
        this._pieces = [];
        this._isComplete = false;
    }
    isEmpty() {
        return this._pieces.length === 0;
    }
    set(pieces, isComplete) {
        this._pieces = pieces || [];
        this._isComplete = isComplete;
    }
    setPartial(_range, pieces) {
        // console.log(`setPartial ${_range} ${pieces.map(p => p.toString()).join(', ')}`);
        let range = _range;
        if (pieces.length > 0) {
            const _firstRange = pieces[0].getRange();
            const _lastRange = pieces[pieces.length - 1].getRange();
            if (!_firstRange || !_lastRange) {
                return _range;
            }
            range = _range.plusRange(_firstRange).plusRange(_lastRange);
        }
        let insertPosition = null;
        for (let i = 0, len = this._pieces.length; i < len; i++) {
            const piece = this._pieces[i];
            if (piece.endLineNumber < range.startLineNumber) {
                // this piece is before the range
                continue;
            }
            if (piece.startLineNumber > range.endLineNumber) {
                // this piece is after the range, so mark the spot before this piece
                // as a good insertion position and stop looping
                insertPosition = insertPosition || { index: i };
                break;
            }
            // this piece might intersect with the range
            piece.removeTokens(range);
            if (piece.isEmpty()) {
                // remove the piece if it became empty
                this._pieces.splice(i, 1);
                i--;
                len--;
                continue;
            }
            if (piece.endLineNumber < range.startLineNumber) {
                // after removal, this piece is before the range
                continue;
            }
            if (piece.startLineNumber > range.endLineNumber) {
                // after removal, this piece is after the range
                insertPosition = insertPosition || { index: i };
                continue;
            }
            // after removal, this piece contains the range
            const [a, b] = piece.split(range);
            if (a.isEmpty()) {
                // this piece is actually after the range
                insertPosition = insertPosition || { index: i };
                continue;
            }
            if (b.isEmpty()) {
                // this piece is actually before the range
                continue;
            }
            this._pieces.splice(i, 1, a, b);
            i++;
            len++;
            insertPosition = insertPosition || { index: i };
        }
        insertPosition = insertPosition || { index: this._pieces.length };
        if (pieces.length > 0) {
            this._pieces = arrays.arrayInsert(this._pieces, insertPosition.index, pieces);
        }
        // console.log(`I HAVE ${this._pieces.length} pieces`);
        // console.log(`${this._pieces.map(p => p.toString()).join('\n')}`);
        return range;
    }
    isComplete() {
        return this._isComplete;
    }
    addSparseTokens(lineNumber, aTokens) {
        if (aTokens.getLineContent().length === 0) {
            // Don't do anything for empty lines
            return aTokens;
        }
        const pieces = this._pieces;
        if (pieces.length === 0) {
            return aTokens;
        }
        const pieceIndex = SparseTokensStore._findFirstPieceWithLine(pieces, lineNumber);
        const bTokens = pieces[pieceIndex].getLineTokens(lineNumber);
        if (!bTokens) {
            return aTokens;
        }
        const aLen = aTokens.getCount();
        const bLen = bTokens.getCount();
        let aIndex = 0;
        const result = [];
        let resultLen = 0;
        let lastEndOffset = 0;
        const emitToken = (endOffset, metadata) => {
            if (endOffset === lastEndOffset) {
                return;
            }
            lastEndOffset = endOffset;
            result[resultLen++] = endOffset;
            result[resultLen++] = metadata;
        };
        for (let bIndex = 0; bIndex < bLen; bIndex++) {
            const bStartCharacter = bTokens.getStartCharacter(bIndex);
            const bEndCharacter = bTokens.getEndCharacter(bIndex);
            const bMetadata = bTokens.getMetadata(bIndex);
            const bMask = ((bMetadata & 1 /* MetadataConsts.SEMANTIC_USE_ITALIC */ ? 2048 /* MetadataConsts.ITALIC_MASK */ : 0) |
                (bMetadata & 2 /* MetadataConsts.SEMANTIC_USE_BOLD */ ? 4096 /* MetadataConsts.BOLD_MASK */ : 0) |
                (bMetadata & 4 /* MetadataConsts.SEMANTIC_USE_UNDERLINE */ ? 8192 /* MetadataConsts.UNDERLINE_MASK */ : 0) |
                (bMetadata & 8 /* MetadataConsts.SEMANTIC_USE_STRIKETHROUGH */
                    ? 16384 /* MetadataConsts.STRIKETHROUGH_MASK */
                    : 0) |
                (bMetadata & 16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */
                    ? 16744448 /* MetadataConsts.FOREGROUND_MASK */
                    : 0) |
                (bMetadata & 32 /* MetadataConsts.SEMANTIC_USE_BACKGROUND */
                    ? 4278190080 /* MetadataConsts.BACKGROUND_MASK */
                    : 0)) >>>
                0;
            const aMask = ~bMask >>> 0;
            // push any token from `a` that is before `b`
            while (aIndex < aLen && aTokens.getEndOffset(aIndex) <= bStartCharacter) {
                emitToken(aTokens.getEndOffset(aIndex), aTokens.getMetadata(aIndex));
                aIndex++;
            }
            // push the token from `a` if it intersects the token from `b`
            if (aIndex < aLen && aTokens.getStartOffset(aIndex) < bStartCharacter) {
                emitToken(bStartCharacter, aTokens.getMetadata(aIndex));
            }
            // skip any tokens from `a` that are contained inside `b`
            while (aIndex < aLen && aTokens.getEndOffset(aIndex) < bEndCharacter) {
                emitToken(aTokens.getEndOffset(aIndex), (aTokens.getMetadata(aIndex) & aMask) | (bMetadata & bMask));
                aIndex++;
            }
            if (aIndex < aLen) {
                emitToken(bEndCharacter, (aTokens.getMetadata(aIndex) & aMask) | (bMetadata & bMask));
                if (aTokens.getEndOffset(aIndex) === bEndCharacter) {
                    // `a` ends exactly at the same spot as `b`!
                    aIndex++;
                }
            }
            else {
                const aMergeIndex = Math.min(Math.max(0, aIndex - 1), aLen - 1);
                // push the token from `b`
                emitToken(bEndCharacter, (aTokens.getMetadata(aMergeIndex) & aMask) | (bMetadata & bMask));
            }
        }
        // push the remaining tokens from `a`
        while (aIndex < aLen) {
            emitToken(aTokens.getEndOffset(aIndex), aTokens.getMetadata(aIndex));
            aIndex++;
        }
        return new LineTokens(new Uint32Array(result), aTokens.getLineContent(), this._languageIdCodec);
    }
    static _findFirstPieceWithLine(pieces, lineNumber) {
        let low = 0;
        let high = pieces.length - 1;
        while (low < high) {
            let mid = low + Math.floor((high - low) / 2);
            if (pieces[mid].endLineNumber < lineNumber) {
                low = mid + 1;
            }
            else if (pieces[mid].startLineNumber > lineNumber) {
                high = mid - 1;
            }
            else {
                while (mid > low &&
                    pieces[mid - 1].startLineNumber <= lineNumber &&
                    lineNumber <= pieces[mid - 1].endLineNumber) {
                    mid--;
                }
                return mid;
            }
        }
        return low;
    }
    acceptEdit(range, eolCount, firstLineLength, lastLineLength, firstCharCode) {
        for (const piece of this._pieces) {
            piece.acceptEdit(range, eolCount, firstLineLength, lastLineLength, firstCharCode);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BhcnNlVG9rZW5zU3RvcmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdG9rZW5zL3NwYXJzZVRva2Vuc1N0b3JlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sZ0NBQWdDLENBQUE7QUFFeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBSzVDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGlCQUFpQjtJQUs3QixZQUFZLGVBQWlDO1FBQzVDLElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFBO1FBQ2pCLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFBO1FBQ3hCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxlQUFlLENBQUE7SUFDeEMsQ0FBQztJQUVNLEtBQUs7UUFDWCxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQTtRQUNqQixJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQTtJQUN6QixDQUFDO0lBRU0sT0FBTztRQUNiLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFTSxHQUFHLENBQUMsTUFBc0MsRUFBRSxVQUFtQjtRQUNyRSxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sSUFBSSxFQUFFLENBQUE7UUFDM0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUE7SUFDOUIsQ0FBQztJQUVNLFVBQVUsQ0FBQyxNQUFhLEVBQUUsTUFBK0I7UUFDL0QsbUZBQW1GO1FBRW5GLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQTtRQUNsQixJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdkIsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLENB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