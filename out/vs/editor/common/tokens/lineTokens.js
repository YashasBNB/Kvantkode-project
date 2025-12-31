/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TokenMetadata, } from '../encodedTokenAttributes.js';
import { OffsetRange } from '../core/offsetRange.js';
import { TokenArrayBuilder } from './tokenArray.js';
import { onUnexpectedError } from '../../../base/common/errors.js';
export class LineTokens {
    static createEmpty(lineContent, decoder) {
        const defaultMetadata = LineTokens.defaultTokenMetadata;
        const tokens = new Uint32Array(2);
        tokens[0] = lineContent.length;
        tokens[1] = defaultMetadata;
        return new LineTokens(tokens, lineContent, decoder);
    }
    static createFromTextAndMetadata(data, decoder) {
        let offset = 0;
        let fullText = '';
        const tokens = new Array();
        for (const { text, metadata } of data) {
            tokens.push(offset + text.length, metadata);
            offset += text.length;
            fullText += text;
        }
        return new LineTokens(new Uint32Array(tokens), fullText, decoder);
    }
    static convertToEndOffset(tokens, lineTextLength) {
        const tokenCount = tokens.length >>> 1;
        const lastTokenIndex = tokenCount - 1;
        for (let tokenIndex = 0; tokenIndex < lastTokenIndex; tokenIndex++) {
            tokens[tokenIndex << 1] = tokens[(tokenIndex + 1) << 1];
        }
        tokens[lastTokenIndex << 1] = lineTextLength;
    }
    static findIndexInTokensArray(tokens, desiredIndex) {
        if (tokens.length <= 2) {
            return 0;
        }
        let low = 0;
        let high = (tokens.length >>> 1) - 1;
        while (low < high) {
            const mid = low + Math.floor((high - low) / 2);
            const endOffset = tokens[mid << 1];
            if (endOffset === desiredIndex) {
                return mid + 1;
            }
            else if (endOffset < desiredIndex) {
                low = mid + 1;
            }
            else if (endOffset > desiredIndex) {
                high = mid;
            }
        }
        return low;
    }
    static { this.defaultTokenMetadata = ((0 /* FontStyle.None */ << 11 /* MetadataConsts.FONT_STYLE_OFFSET */) |
        (1 /* ColorId.DefaultForeground */ << 15 /* MetadataConsts.FOREGROUND_OFFSET */) |
        (2 /* ColorId.DefaultBackground */ << 24 /* MetadataConsts.BACKGROUND_OFFSET */)) >>>
        0; }
    constructor(tokens, text, decoder) {
        this._lineTokensBrand = undefined;
        const tokensLength = tokens.length > 1 ? tokens[tokens.length - 2] : 0;
        if (tokensLength !== text.length) {
            onUnexpectedError(new Error('Token length and text length do not match!'));
        }
        this._tokens = tokens;
        this._tokensCount = this._tokens.length >>> 1;
        this._text = text;
        this.languageIdCodec = decoder;
    }
    equals(other) {
        if (other instanceof LineTokens) {
            return this.slicedEquals(other, 0, this._tokensCount);
        }
        return false;
    }
    slicedEquals(other, sliceFromTokenIndex, sliceTokenCount) {
        if (this._text !== other._text) {
            return false;
        }
        if (this._tokensCount !== other._tokensCount) {
            return false;
        }
        const from = sliceFromTokenIndex << 1;
        const to = from + (sliceTokenCount << 1);
        for (let i = from; i < to; i++) {
            if (this._tokens[i] !== other._tokens[i]) {
                return false;
            }
        }
        return true;
    }
    getLineContent() {
        return this._text;
    }
    getCount() {
        return this._tokensCount;
    }
    getStartOffset(tokenIndex) {
        if (tokenIndex > 0) {
            return this._tokens[(tokenIndex - 1) << 1];
        }
        return 0;
    }
    getMetadata(tokenIndex) {
        const metadata = this._tokens[(tokenIndex << 1) + 1];
        return metadata;
    }
    getLanguageId(tokenIndex) {
        const metadata = this._tokens[(tokenIndex << 1) + 1];
        const languageId = TokenMetadata.getLanguageId(metadata);
        return this.languageIdCodec.decodeLanguageId(languageId);
    }
    getStandardTokenType(tokenIndex) {
        const metadata = this._tokens[(tokenIndex << 1) + 1];
        return TokenMetadata.getTokenType(metadata);
    }
    getForeground(tokenIndex) {
        const metadata = this._tokens[(tokenIndex << 1) + 1];
        return TokenMetadata.getForeground(metadata);
    }
    getClassName(tokenIndex) {
        const metadata = this._tokens[(tokenIndex << 1) + 1];
        return TokenMetadata.getClassNameFromMetadata(metadata);
    }
    getInlineStyle(tokenIndex, colorMap) {
        const metadata = this._tokens[(tokenIndex << 1) + 1];
        return TokenMetadata.getInlineStyleFromMetadata(metadata, colorMap);
    }
    getPresentation(tokenIndex) {
        const metadata = this._tokens[(tokenIndex << 1) + 1];
        return TokenMetadata.getPresentationFromMetadata(metadata);
    }
    getEndOffset(tokenIndex) {
        return this._tokens[tokenIndex << 1];
    }
    /**
     * Find the token containing offset `offset`.
     * @param offset The search offset
     * @return The index of the token containing the offset.
     */
    findTokenIndexAtOffset(offset) {
        return LineTokens.findIndexInTokensArray(this._tokens, offset);
    }
    inflate() {
        return this;
    }
    sliceAndInflate(startOffset, endOffset, deltaOffset) {
        return new SliceLineTokens(this, startOffset, endOffset, deltaOffset);
    }
    sliceZeroCopy(range) {
        return this.sliceAndInflate(range.start, range.endExclusive, 0);
    }
    /**
     * @pure
     * @param insertTokens Must be sorted by offset.
     */
    withInserted(insertTokens) {
        if (insertTokens.length === 0) {
            return this;
        }
        let nextOriginalTokenIdx = 0;
        let nextInsertTokenIdx = 0;
        let text = '';
        const newTokens = new Array();
        let originalEndOffset = 0;
        while (true) {
            const nextOriginalTokenEndOffset = nextOriginalTokenIdx < this._tokensCount ? this._tokens[nextOriginalTokenIdx << 1] : -1;
            const nextInsertToken = nextInsertTokenIdx < insertTokens.length ? insertTokens[nextInsertTokenIdx] : null;
            if (nextOriginalTokenEndOffset !== -1 &&
                (nextInsertToken === null || nextOriginalTokenEndOffset <= nextInsertToken.offset)) {
                // original token ends before next insert token
                text += this._text.substring(originalEndOffset, nextOriginalTokenEndOffset);
                const metadata = this._tokens[(nextOriginalTokenIdx << 1) + 1];
                newTokens.push(text.length, metadata);
                nextOriginalTokenIdx++;
                originalEndOffset = nextOriginalTokenEndOffset;
            }
            else if (nextInsertToken) {
                if (nextInsertToken.offset > originalEndOffset) {
                    // insert token is in the middle of the next token.
                    text += this._text.substring(originalEndOffset, nextInsertToken.offset);
                    const metadata = this._tokens[(nextOriginalTokenIdx << 1) + 1];
                    newTokens.push(text.length, metadata);
                    originalEndOffset = nextInsertToken.offset;
                }
                text += nextInsertToken.text;
                newTokens.push(text.length, nextInsertToken.tokenMetadata);
                nextInsertTokenIdx++;
            }
            else {
                break;
            }
        }
        return new LineTokens(new Uint32Array(newTokens), text, this.languageIdCodec);
    }
    getTokensInRange(range) {
        const builder = new TokenArrayBuilder();
        const startTokenIndex = this.findTokenIndexAtOffset(range.start);
        const endTokenIndex = this.findTokenIndexAtOffset(range.endExclusive);
        for (let tokenIndex = startTokenIndex; tokenIndex <= endTokenIndex; tokenIndex++) {
            const tokenRange = new OffsetRange(this.getStartOffset(tokenIndex), this.getEndOffset(tokenIndex));
            const length = tokenRange.intersectionLength(range);
            if (length > 0) {
                builder.add(length, this.getMetadata(tokenIndex));
            }
        }
        return builder.build();
    }
    getTokenText(tokenIndex) {
        const startOffset = this.getStartOffset(tokenIndex);
        const endOffset = this.getEndOffset(tokenIndex);
        const text = this._text.substring(startOffset, endOffset);
        return text;
    }
    forEach(callback) {
        const tokenCount = this.getCount();
        for (let tokenIndex = 0; tokenIndex < tokenCount; tokenIndex++) {
            callback(tokenIndex);
        }
    }
    toString() {
        let result = '';
        this.forEach((i) => {
            result += `[${this.getTokenText(i)}]{${this.getClassName(i)}}`;
        });
        return result;
    }
}
class SliceLineTokens {
    constructor(source, startOffset, endOffset, deltaOffset) {
        this._source = source;
        this._startOffset = startOffset;
        this._endOffset = endOffset;
        this._deltaOffset = deltaOffset;
        this._firstTokenIndex = source.findTokenIndexAtOffset(startOffset);
        this.languageIdCodec = source.languageIdCodec;
        this._tokensCount = 0;
        for (let i = this._firstTokenIndex, len = source.getCount(); i < len; i++) {
            const tokenStartOffset = source.getStartOffset(i);
            if (tokenStartOffset >= endOffset) {
                break;
            }
            this._tokensCount++;
        }
    }
    getMetadata(tokenIndex) {
        return this._source.getMetadata(this._firstTokenIndex + tokenIndex);
    }
    getLanguageId(tokenIndex) {
        return this._source.getLanguageId(this._firstTokenIndex + tokenIndex);
    }
    getLineContent() {
        return this._source.getLineContent().substring(this._startOffset, this._endOffset);
    }
    equals(other) {
        if (other instanceof SliceLineTokens) {
            return (this._startOffset === other._startOffset &&
                this._endOffset === other._endOffset &&
                this._deltaOffset === other._deltaOffset &&
                this._source.slicedEquals(other._source, this._firstTokenIndex, this._tokensCount));
        }
        return false;
    }
    getCount() {
        return this._tokensCount;
    }
    getStandardTokenType(tokenIndex) {
        return this._source.getStandardTokenType(this._firstTokenIndex + tokenIndex);
    }
    getForeground(tokenIndex) {
        return this._source.getForeground(this._firstTokenIndex + tokenIndex);
    }
    getEndOffset(tokenIndex) {
        const tokenEndOffset = this._source.getEndOffset(this._firstTokenIndex + tokenIndex);
        return Math.min(this._endOffset, tokenEndOffset) - this._startOffset + this._deltaOffset;
    }
    getClassName(tokenIndex) {
        return this._source.getClassName(this._firstTokenIndex + tokenIndex);
    }
    getInlineStyle(tokenIndex, colorMap) {
        return this._source.getInlineStyle(this._firstTokenIndex + tokenIndex, colorMap);
    }
    getPresentation(tokenIndex) {
        return this._source.getPresentation(this._firstTokenIndex + tokenIndex);
    }
    findTokenIndexAtOffset(offset) {
        return (this._source.findTokenIndexAtOffset(offset + this._startOffset - this._deltaOffset) -
            this._firstTokenIndex);
    }
    getTokenText(tokenIndex) {
        const adjustedTokenIndex = this._firstTokenIndex + tokenIndex;
        const tokenStartOffset = this._source.getStartOffset(adjustedTokenIndex);
        const tokenEndOffset = this._source.getEndOffset(adjustedTokenIndex);
        let text = this._source.getTokenText(adjustedTokenIndex);
        if (tokenStartOffset < this._startOffset) {
            text = text.substring(this._startOffset - tokenStartOffset);
        }
        if (tokenEndOffset > this._endOffset) {
            text = text.substring(0, text.length - (tokenEndOffset - this._endOffset));
        }
        return text;
    }
    forEach(callback) {
        for (let tokenIndex = 0; tokenIndex < this.getCount(); tokenIndex++) {
            callback(tokenIndex);
        }
    }
}
export function getStandardTokenTypeAtPosition(model, position) {
    const lineNumber = position.lineNumber;
    if (!model.tokenization.isCheapToTokenize(lineNumber)) {
        return undefined;
    }
    model.tokenization.forceTokenization(lineNumber);
    const lineTokens = model.tokenization.getLineTokens(lineNumber);
    const tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
    const tokenType = lineTokens.getStandardTokenType(tokenIndex);
    return tokenType;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZVRva2Vucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdG9rZW5zL2xpbmVUb2tlbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUtOLGFBQWEsR0FFYixNQUFNLDhCQUE4QixDQUFBO0FBR3JDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNwRCxPQUFPLEVBQWMsaUJBQWlCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQW9CbEUsTUFBTSxPQUFPLFVBQVU7SUFDZixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQW1CLEVBQUUsT0FBeUI7UUFDdkUsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLG9CQUFvQixDQUFBO1FBRXZELE1BQU0sTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFBO1FBQzlCLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxlQUFlLENBQUE7UUFFM0IsT0FBTyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ3BELENBQUM7SUFFTSxNQUFNLENBQUMseUJBQXlCLENBQ3RDLElBQTBDLEVBQzFDLE9BQXlCO1FBRXpCLElBQUksTUFBTSxHQUFXLENBQUMsQ0FBQTtRQUN0QixJQUFJLFFBQVEsR0FBVyxFQUFFLENBQUE7UUFDekIsTUFBTSxNQUFNLEdBQUcsSUFBSSxLQUFLLEVBQVUsQ0FBQTtRQUNsQyxLQUFLLE1BQU0sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUM7WUFDdkMs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