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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BhcnNlVG9rZW5zU3RvcmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3Rva2Vucy9zcGFyc2VUb2tlbnNTdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLGdDQUFnQyxDQUFBO0FBRXhELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUs1Qzs7R0FFRztBQUNILE1BQU0sT0FBTyxpQkFBaUI7SUFLN0IsWUFBWSxlQUFpQztRQUM1QyxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQTtRQUNqQixJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQTtRQUN4QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsZUFBZSxDQUFBO0lBQ3hDLENBQUM7SUFFTSxLQUFLO1FBQ1gsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUE7UUFDakIsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUE7SUFDekIsQ0FBQztJQUVNLE9BQU87UUFDYixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRU0sR0FBRyxDQUFDLE1BQXNDLEVBQUUsVUFBbUI7UUFDckUsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLElBQUksRUFBRSxDQUFBO1FBQzNCLElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFBO0lBQzlCLENBQUM7SUFFTSxVQUFVLENBQUMsTUFBYSxFQUFFLE1BQStCO1FBQy9ELG1GQUFtRjtRQUVuRixJQUFJLEtBQUssR0FBRyxNQUFNLENBQUE7UUFDbEIsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUN4QyxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUN2RCxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ2pDLE9BQU8sTUFBTSxDQUFBO1lBQ2QsQ0FBQztZQUNELEtBQUssR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUM1RCxDQUFDO1FBRUQsSUFBSSxjQUFjLEdBQTZCLElBQUksQ0FBQTtRQUNuRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3pELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDN0IsSUFBSSxLQUFLLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDakQsaUNBQWlDO2dCQUNqQyxTQUFRO1lBQ1QsQ0FBQztZQUVELElBQUksS0FBSyxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ2pELG9FQUFvRTtnQkFDcEUsZ0RBQWdEO2dCQUNoRCxjQUFjLEdBQUcsY0FBYyxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFBO2dCQUMvQyxNQUFLO1lBQ04sQ0FBQztZQUVELDRDQUE0QztZQUM1QyxLQUFLLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBRXpCLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7Z0JBQ3JCLHNDQUFzQztnQkFDdEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUN6QixDQUFDLEVBQUUsQ0FBQTtnQkFDSCxHQUFHLEVBQUUsQ0FBQTtnQkFDTCxTQUFRO1lBQ1QsQ0FBQztZQUVELElBQUksS0FBSyxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ2pELGdEQUFnRDtnQkFDaEQsU0FBUTtZQUNULENBQUM7WUFFRCxJQUFJLEtBQUssQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUNqRCwrQ0FBK0M7Z0JBQy9DLGNBQWMsR0FBRyxjQUFjLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUE7Z0JBQy9DLFNBQVE7WUFDVCxDQUFDO1lBRUQsK0NBQStDO1lBQy9DLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNqQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO2dCQUNqQix5Q0FBeUM7Z0JBQ3pDLGNBQWMsR0FBRyxjQUFjLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUE7Z0JBQy9DLFNBQVE7WUFDVCxDQUFDO1lBQ0QsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztnQkFDakIsMENBQTBDO2dCQUMxQyxTQUFRO1lBQ1QsQ0FBQztZQUNELElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQy9CLENBQUMsRUFBRSxDQUFBO1lBQ0gsR0FBRyxFQUFFLENBQUE7WUFFTCxjQUFjLEdBQUcsY0FBYyxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFBO1FBQ2hELENBQUM7UUFFRCxjQUFjLEdBQUcsY0FBYyxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUE7UUFFakUsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDOUUsQ0FBQztRQUVELHVEQUF1RDtRQUN2RCxvRUFBb0U7UUFFcEUsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU0sVUFBVTtRQUNoQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUE7SUFDeEIsQ0FBQztJQUVNLGVBQWUsQ0FBQyxVQUFrQixFQUFFLE9BQW1CO1FBQzdELElBQUksT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMzQyxvQ0FBb0M7WUFDcEMsT0FBTyxPQUFPLENBQUE7UUFDZixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQTtRQUUzQixJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekIsT0FBTyxPQUFPLENBQUE7UUFDZixDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQUcsaUJBQWlCLENBQUMsdUJBQXVCLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ2hGLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFNUQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTyxPQUFPLENBQUE7UUFDZixDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQy9CLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUUvQixJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFDZCxNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUE7UUFDM0IsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFBO1FBQ2pCLElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQTtRQUVyQixNQUFNLFNBQVMsR0FBRyxDQUFDLFNBQWlCLEVBQUUsUUFBZ0IsRUFBRSxFQUFFO1lBQ3pELElBQUksU0FBUyxLQUFLLGFBQWEsRUFBRSxDQUFDO2dCQUNqQyxPQUFNO1lBQ1AsQ0FBQztZQUNELGFBQWEsR0FBRyxTQUFTLENBQUE7WUFDekIsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLEdBQUcsU0FBUyxDQUFBO1lBQy9CLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQTtRQUMvQixDQUFDLENBQUE7UUFFRCxLQUFLLElBQUksTUFBTSxHQUFHLENBQUMsRUFBRSxNQUFNLEdBQUcsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUM7WUFDOUMsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3pELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDckQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUU3QyxNQUFNLEtBQUssR0FDVixDQUFDLENBQUMsU0FBUyw2Q0FBcUMsQ0FBQyxDQUFDLHVDQUE0QixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNqRixDQUFDLFNBQVMsMkNBQW1DLENBQUMsQ0FBQyxxQ0FBMEIsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDN0UsQ0FBQyxTQUFTLGdEQUF3QyxDQUFDLENBQUMsMENBQStCLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZGLENBQUMsU0FBUyxvREFBNEM7b0JBQ3JELENBQUM7b0JBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDTCxDQUFDLFNBQVMsa0RBQXlDO29CQUNsRCxDQUFDO29CQUNELENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ0wsQ0FBQyxTQUFTLGtEQUF5QztvQkFDbEQsQ0FBQztvQkFDRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ1AsQ0FBQyxDQUFBO1lBQ0YsTUFBTSxLQUFLLEdBQUcsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFBO1lBRTFCLDZDQUE2QztZQUM3QyxPQUFPLE1BQU0sR0FBRyxJQUFJLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQztnQkFDekUsU0FBUyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEVBQUUsT0FBTyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO2dCQUNwRSxNQUFNLEVBQUUsQ0FBQTtZQUNULENBQUM7WUFFRCw4REFBOEQ7WUFDOUQsSUFBSSxNQUFNLEdBQUcsSUFBSSxJQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsZUFBZSxFQUFFLENBQUM7Z0JBQ3ZFLFNBQVMsQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1lBQ3hELENBQUM7WUFFRCx5REFBeUQ7WUFDekQsT0FBTyxNQUFNLEdBQUcsSUFBSSxJQUFJLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEdBQUcsYUFBYSxFQUFFLENBQUM7Z0JBQ3RFLFNBQVMsQ0FDUixPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUM1QixDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLENBQzNELENBQUE7Z0JBQ0QsTUFBTSxFQUFFLENBQUE7WUFDVCxDQUFDO1lBRUQsSUFBSSxNQUFNLEdBQUcsSUFBSSxFQUFFLENBQUM7Z0JBQ25CLFNBQVMsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUE7Z0JBQ3JGLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsS0FBSyxhQUFhLEVBQUUsQ0FBQztvQkFDcEQsNENBQTRDO29CQUM1QyxNQUFNLEVBQUUsQ0FBQTtnQkFDVCxDQUFDO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFFL0QsMEJBQTBCO2dCQUMxQixTQUFTLENBQUMsYUFBYSxFQUFFLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFBO1lBQzNGLENBQUM7UUFDRixDQUFDO1FBRUQscUNBQXFDO1FBQ3JDLE9BQU8sTUFBTSxHQUFHLElBQUksRUFBRSxDQUFDO1lBQ3RCLFNBQVMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtZQUNwRSxNQUFNLEVBQUUsQ0FBQTtRQUNULENBQUM7UUFFRCxPQUFPLElBQUksVUFBVSxDQUFDLElBQUksV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxjQUFjLEVBQUUsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUNoRyxDQUFDO0lBRU8sTUFBTSxDQUFDLHVCQUF1QixDQUNyQyxNQUErQixFQUMvQixVQUFrQjtRQUVsQixJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUE7UUFDWCxJQUFJLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUU1QixPQUFPLEdBQUcsR0FBRyxJQUFJLEVBQUUsQ0FBQztZQUNuQixJQUFJLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUU1QyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxhQUFhLEdBQUcsVUFBVSxFQUFFLENBQUM7Z0JBQzVDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFBO1lBQ2QsQ0FBQztpQkFBTSxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxlQUFlLEdBQUcsVUFBVSxFQUFFLENBQUM7Z0JBQ3JELElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFBO1lBQ2YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQ0MsR0FBRyxHQUFHLEdBQUc7b0JBQ1QsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxlQUFlLElBQUksVUFBVTtvQkFDN0MsVUFBVSxJQUFJLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsYUFBYSxFQUMxQyxDQUFDO29CQUNGLEdBQUcsRUFBRSxDQUFBO2dCQUNOLENBQUM7Z0JBQ0QsT0FBTyxHQUFHLENBQUE7WUFDWCxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sR0FBRyxDQUFBO0lBQ1gsQ0FBQztJQUVNLFVBQVUsQ0FDaEIsS0FBYSxFQUNiLFFBQWdCLEVBQ2hCLGVBQXVCLEVBQ3ZCLGNBQXNCLEVBQ3RCLGFBQXFCO1FBRXJCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQ2xGLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==