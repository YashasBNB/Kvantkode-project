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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5BcnJheS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdG9rZW5zL3Rva2VuQXJyYXkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRXBELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUU1Qzs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxPQUFPLFVBQVU7SUFDZixNQUFNLENBQUMsY0FBYyxDQUFDLFVBQXNCO1FBQ2xELE1BQU0sU0FBUyxHQUFnQixFQUFFLENBQUE7UUFDakMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2hELFNBQVMsQ0FBQyxJQUFJLENBQ2IsSUFBSSxTQUFTLENBQ1osVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUN6RCxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUN6QixDQUNELENBQUE7UUFDRixDQUFDO1FBQ0QsT0FBTyxVQUFVLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFTSxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQXNCO1FBQzFDLE9BQU8sSUFBSSxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVELFlBQXFDLFVBQXVCO1FBQXZCLGVBQVUsR0FBVixVQUFVLENBQWE7SUFBRyxDQUFDO0lBRXpELFlBQVksQ0FBQyxXQUFtQixFQUFFLE9BQXlCO1FBQ2pFLE9BQU8sVUFBVSxDQUFDLHlCQUF5QixDQUMxQyxJQUFJLENBQUMs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