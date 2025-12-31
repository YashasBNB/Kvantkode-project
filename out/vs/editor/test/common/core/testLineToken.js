/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TokenMetadata, } from '../../../common/encodedTokenAttributes.js';
/**
 * A token on a line.
 */
export class TestLineToken {
    constructor(endIndex, metadata) {
        this.endIndex = endIndex;
        this._metadata = metadata;
    }
    getStandardTokenType() {
        return TokenMetadata.getTokenType(this._metadata);
    }
    getForeground() {
        return TokenMetadata.getForeground(this._metadata);
    }
    getType() {
        return TokenMetadata.getClassNameFromMetadata(this._metadata);
    }
    getInlineStyle(colorMap) {
        return TokenMetadata.getInlineStyleFromMetadata(this._metadata, colorMap);
    }
    getPresentation() {
        return TokenMetadata.getPresentationFromMetadata(this._metadata);
    }
    static _equals(a, b) {
        return a.endIndex === b.endIndex && a._metadata === b._metadata;
    }
    static equalsArr(a, b) {
        const aLen = a.length;
        const bLen = b.length;
        if (aLen !== bLen) {
            return false;
        }
        for (let i = 0; i < aLen; i++) {
            if (!this._equals(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }
}
export class TestLineTokens {
    constructor(actual) {
        this._actual = actual;
    }
    equals(other) {
        if (other instanceof TestLineTokens) {
            return TestLineToken.equalsArr(this._actual, other._actual);
        }
        return false;
    }
    getCount() {
        return this._actual.length;
    }
    getStandardTokenType(tokenIndex) {
        return this._actual[tokenIndex].getStandardTokenType();
    }
    getForeground(tokenIndex) {
        return this._actual[tokenIndex].getForeground();
    }
    getEndOffset(tokenIndex) {
        return this._actual[tokenIndex].endIndex;
    }
    getClassName(tokenIndex) {
        return this._actual[tokenIndex].getType();
    }
    getInlineStyle(tokenIndex, colorMap) {
        return this._actual[tokenIndex].getInlineStyle(colorMap);
    }
    getPresentation(tokenIndex) {
        return this._actual[tokenIndex].getPresentation();
    }
    findTokenIndexAtOffset(offset) {
        throw new Error('Not implemented');
    }
    getLineContent() {
        throw new Error('Not implemented');
    }
    getMetadata(tokenIndex) {
        throw new Error('Method not implemented.');
    }
    getLanguageId(tokenIndex) {
        throw new Error('Method not implemented.');
    }
    getTokenText(tokenIndex) {
        throw new Error('Method not implemented.');
    }
    forEach(callback) {
        throw new Error('Not implemented');
    }
    get languageIdCodec() {
        throw new Error('Not implemented');
    }
}
export class TestLineTokenFactory {
    static inflateArr(tokens) {
        const tokensCount = tokens.length >>> 1;
        const result = new Array(tokensCount);
        for (let i = 0; i < tokensCount; i++) {
            const endOffset = tokens[i << 1];
            const metadata = tokens[(i << 1) + 1];
            result[i] = new TestLineToken(endOffset, metadata);
        }
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdExpbmVUb2tlbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9jb3JlL3Rlc3RMaW5lVG9rZW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUVOLGFBQWEsR0FHYixNQUFNLDJDQUEyQyxDQUFBO0FBR2xEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGFBQWE7SUFPekIsWUFBWSxRQUFnQixFQUFFLFFBQWdCO1FBQzdDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFBO1FBQ3hCLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFBO0lBQzFCLENBQUM7SUFFTSxvQkFBb0I7UUFDMUIsT0FBTyxhQUFhLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0lBRU0sYUFBYTtRQUNuQixPQUFPLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ25ELENBQUM7SUFFTSxPQUFPO1FBQ2IsT0FBTyxhQUFhLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQzlELENBQUM7SUFFTSxjQUFjLENBQUMsUUFBa0I7UUFDdkMsT0FBTyxhQUFhLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUMxRSxDQUFDO0lBRU0sZUFBZTtRQUNyQixPQUFPLGFBQWEsQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDakUsQ0FBQztJQUVPLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBZ0IsRUFBRSxDQUFnQjtRQUN4RCxPQUFPLENBQUMsQ0FBQyxRQUFRLEtBQUssQ0FBQyxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsU0FB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