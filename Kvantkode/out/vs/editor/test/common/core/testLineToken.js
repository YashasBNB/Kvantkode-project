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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdExpbmVUb2tlbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL2NvcmUvdGVzdExpbmVUb2tlbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBRU4sYUFBYSxHQUdiLE1BQU0sMkNBQTJDLENBQUE7QUFHbEQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sYUFBYTtJQU96QixZQUFZLFFBQWdCLEVBQUUsUUFBZ0I7UUFDN0MsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUE7UUFDeEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUE7SUFDMUIsQ0FBQztJQUVNLG9CQUFvQjtRQUMxQixPQUFPLGFBQWEsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFFTSxhQUFhO1FBQ25CLE9BQU8sYUFBYSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDbkQsQ0FBQztJQUVNLE9BQU87UUFDYixPQUFPLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDOUQsQ0FBQztJQUVNLGNBQWMsQ0FBQyxRQUFrQjtRQUN2QyxPQUFPLGFBQWEsQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQzFFLENBQUM7SUFFTSxlQUFlO1FBQ3JCLE9BQU8sYUFBYSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUNqRSxDQUFDO0lBRU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFnQixFQUFFLENBQWdCO1FBQ3hELE9BQU8sQ0FBQyxDQUFDLFFBQVEsS0FBSyxDQUFDLENBQUMs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