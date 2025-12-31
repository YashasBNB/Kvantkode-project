/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LineTokens } from './lineTokens.js';
export const EMPTY_LINE_TOKENS = new Uint32Array(0).buffer;
export class ContiguousTokensEditing {
    static deleteBeginning(lineTokens, toChIndex) {
        if (lineTokens === null || lineTokens === EMPTY_LINE_TOKENS) {
            return lineTokens;
        }
        return ContiguousTokensEditing.delete(lineTokens, 0, toChIndex);
    }
    static deleteEnding(lineTokens, fromChIndex) {
        if (lineTokens === null || lineTokens === EMPTY_LINE_TOKENS) {
            return lineTokens;
        }
        const tokens = toUint32Array(lineTokens);
        const lineTextLength = tokens[tokens.length - 2];
        return ContiguousTokensEditing.delete(lineTokens, fromChIndex, lineTextLength);
    }
    static delete(lineTokens, fromChIndex, toChIndex) {
        if (lineTokens === null || lineTokens === EMPTY_LINE_TOKENS || fromChIndex === toChIndex) {
            return lineTokens;
        }
        const tokens = toUint32Array(lineTokens);
        const tokensCount = tokens.length >>> 1;
        // special case: deleting everything
        if (fromChIndex === 0 && tokens[tokens.length - 2] === toChIndex) {
            return EMPTY_LINE_TOKENS;
        }
        const fromTokenIndex = LineTokens.findIndexInTokensArray(tokens, fromChIndex);
        const fromTokenStartOffset = fromTokenIndex > 0 ? tokens[(fromTokenIndex - 1) << 1] : 0;
        const fromTokenEndOffset = tokens[fromTokenIndex << 1];
        if (toChIndex < fromTokenEndOffset) {
            // the delete range is inside a single token
            const delta = toChIndex - fromChIndex;
            for (let i = fromTokenIndex; i < tokensCount; i++) {
                tokens[i << 1] -= delta;
            }
            return lineTokens;
        }
        let dest;
        let lastEnd;
        if (fromTokenStartOffset !== fromChIndex) {
            tokens[fromTokenIndex << 1] = fromChIndex;
            dest = (fromTokenIndex + 1) << 1;
            lastEnd = fromChIndex;
        }
        else {
            dest = fromTokenIndex << 1;
            lastEnd = fromTokenStartOffset;
        }
        const delta = toChIndex - fromChIndex;
        for (let tokenIndex = fromTokenIndex + 1; tokenIndex < tokensCount; tokenIndex++) {
            const tokenEndOffset = tokens[tokenIndex << 1] - delta;
            if (tokenEndOffset > lastEnd) {
                tokens[dest++] = tokenEndOffset;
                tokens[dest++] = tokens[(tokenIndex << 1) + 1];
                lastEnd = tokenEndOffset;
            }
        }
        if (dest === tokens.length) {
            // nothing to trim
            return lineTokens;
        }
        const tmp = new Uint32Array(dest);
        tmp.set(tokens.subarray(0, dest), 0);
        return tmp.buffer;
    }
    static append(lineTokens, _otherTokens) {
        if (_otherTokens === EMPTY_LINE_TOKENS) {
            return lineTokens;
        }
        if (lineTokens === EMPTY_LINE_TOKENS) {
            return _otherTokens;
        }
        if (lineTokens === null) {
            return lineTokens;
        }
        if (_otherTokens === null) {
            // cannot determine combined line length...
            return null;
        }
        const myTokens = toUint32Array(lineTokens);
        const otherTokens = toUint32Array(_otherTokens);
        const otherTokensCount = otherTokens.length >>> 1;
        const result = new Uint32Array(myTokens.length + otherTokens.length);
        result.set(myTokens, 0);
        let dest = myTokens.length;
        const delta = myTokens[myTokens.length - 2];
        for (let i = 0; i < otherTokensCount; i++) {
            result[dest++] = otherTokens[i << 1] + delta;
            result[dest++] = otherTokens[(i << 1) + 1];
        }
        return result.buffer;
    }
    static insert(lineTokens, chIndex, textLength) {
        if (lineTokens === null || lineTokens === EMPTY_LINE_TOKENS) {
            // nothing to do
            return lineTokens;
        }
        const tokens = toUint32Array(lineTokens);
        const tokensCount = tokens.length >>> 1;
        let fromTokenIndex = LineTokens.findIndexInTokensArray(tokens, chIndex);
        if (fromTokenIndex > 0) {
            const fromTokenStartOffset = tokens[(fromTokenIndex - 1) << 1];
            if (fromTokenStartOffset === chIndex) {
                fromTokenIndex--;
            }
        }
        for (let tokenIndex = fromTokenIndex; tokenIndex < tokensCount; tokenIndex++) {
            tokens[tokenIndex << 1] += textLength;
        }
        return lineTokens;
    }
}
export function toUint32Array(arr) {
    if (arr instanceof Uint32Array) {
        return arr;
    }
    else {
        return new Uint32Array(arr);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGlndW91c1Rva2Vuc0VkaXRpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3Rva2Vucy9jb250aWd1b3VzVG9rZW5zRWRpdGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFFNUMsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO0FBRTFELE1BQU0sT0FBTyx1QkFBdUI7SUFDNUIsTUFBTSxDQUFDLGVBQWUsQ0FDNUIsVUFBNEMsRUFDNUMsU0FBaUI7UUFFakIsSUFBSSxVQUFVLEtBQUssSUFBSSxJQUFJLFVBQVUsS0FBSyxpQkFBaUIsRUFBRSxDQUFDO1lBQzdELE9BQU8sVUFBVSxDQUFBO1FBQ2xCLENBQUM7UUFDRCxPQUFPLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQ2hFLENBQUM7SUFFTSxNQUFNLENBQUMsWUFBWSxDQUN6QixVQUE0QyxFQUM1QyxXQUFtQjtRQUVuQixJQUFJLFVBQVUsS0FBSyxJQUFJLElBQUksVUFBVSxLQUFLLGlCQUFpQixFQUFFLENBQUM7WUFDN0QsT0FBTyxVQUFVLENBQUE7UUFDbEIsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUN4QyxNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNoRCxPQUFPLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsV0FBVyxFQUFFLGNBQWMsQ0FBQyxDQUFBO0lBQy9FLENBQUM7SUFFTSxNQUFNLENB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