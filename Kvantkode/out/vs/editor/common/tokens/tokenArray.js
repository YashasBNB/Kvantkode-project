/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { OffsetRange } from '../core/offsetRange.js';
import { LineTokens } from './lineTokens.js';
/**
 * This class represents a sequence of tokens.
 * Conceptually, each token has a length and a metadata number.
 * A token array might be used to annotate a string with metadata.
 * Use {@link TokenArrayBuilder} to efficiently create a token array.
 *
 * TODO: Make this class more efficient (e.g. by using a Int32Array).
 */
export class TokenArray {
    static fromLineTokens(lineTokens) {
        const tokenInfo = [];
        for (let i = 0; i < lineTokens.getCount(); i++) {
            tokenInfo.push(new TokenInfo(lineTokens.getEndOffset(i) - lineTokens.getStartOffset(i), lineTokens.getMetadata(i)));
        }
        return TokenArray.create(tokenInfo);
    }
    static create(tokenInfo) {
        return new TokenArray(tokenInfo);
    }
    constructor(_tokenInfo) {
        this._tokenInfo = _tokenInfo;
    }
    toLineTokens(lineContent, decoder) {
        return LineTokens.createFromTextAndMetadata(this.map((r, t) => ({ text: r.substring(lineContent), metadata: t.metadata })), decoder);
    }
    forEach(cb) {
        let lengthSum = 0;
        for (const tokenInfo of this._tokenInfo) {
            const range = new OffsetRange(lengthSum, lengthSum + tokenInfo.length);
            cb(range, tokenInfo);
            lengthSum += tokenInfo.length;
        }
    }
    map(cb) {
        const result = [];
        let lengthSum = 0;
        for (const tokenInfo of this._tokenInfo) {
            const range = new OffsetRange(lengthSum, lengthSum + tokenInfo.length);
            result.push(cb(range, tokenInfo));
            lengthSum += tokenInfo.length;
        }
        return result;
    }
    slice(range) {
        const result = [];
        let lengthSum = 0;
        for (const tokenInfo of this._tokenInfo) {
            const tokenStart = lengthSum;
            const tokenEndEx = tokenStart + tokenInfo.length;
            if (tokenEndEx > range.start) {
                if (tokenStart >= range.endExclusive) {
                    break;
                }
                const deltaBefore = Math.max(0, range.start - tokenStart);
                const deltaAfter = Math.max(0, tokenEndEx - range.endExclusive);
                result.push(new TokenInfo(tokenInfo.length - deltaBefore - deltaAfter, tokenInfo.metadata));
            }
            lengthSum += tokenInfo.length;
        }
        return TokenArray.create(result);
    }
}
export class TokenInfo {
    constructor(length, metadata) {
        this.length = length;
        this.metadata = metadata;
    }
}
/**
 * TODO: Make this class more efficient (e.g. by using a Int32Array).
 */
export class TokenArrayBuilder {
    constructor() {
        this._tokens = [];
    }
    add(length, metadata) {
        this._tokens.push(new TokenInfo(length, metadata));
    }
    build() {
        return TokenArray.create(this._tokens);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5BcnJheS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi90b2tlbnMvdG9rZW5BcnJheS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFcEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRTVDOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLE9BQU8sVUFBVTtJQUNmLE1BQU0sQ0FBQyxjQUFjLENBQUMsVUFBc0I7UUFDbEQsTUFBTSxTQUFTLEdBQWdCLEVBQUUsQ0FBQTtRQUNqQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsVUFBVSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDaEQsU0FBUyxDQUFDLElBQUksQ0FDYixJQUFJLFNBQVMsQ0FDWixVQUFVLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQ3pELFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQ3pCLENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFDRCxPQUFPLFVBQVUsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVNLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBc0I7UUFDMUMsT0FBTyxJQUFJLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsWUFBcUMsVUFBdUI7UUFBdkIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtJQUFHLENBQUM7SUFFekQsWUFBWSxDQUFDLFdBQW1CLEVBQUUsT0FBeUI7UUFDakUsT0FBTyxVQUFVLENBQUMseUJBQXlCLENBQzFDLElBQUks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