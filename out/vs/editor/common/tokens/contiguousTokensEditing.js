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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGlndW91c1Rva2Vuc0VkaXRpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdG9rZW5zL2NvbnRpZ3VvdXNUb2tlbnNFZGl0aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUU1QyxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7QUFFMUQsTUFBTSxPQUFPLHVCQUF1QjtJQUM1QixNQUFNLENBQUMsZUFBZSxDQUM1QixVQUE0QyxFQUM1QyxTQUFpQjtRQUVqQixJQUFJLFVBQVUsS0FBSyxJQUFJLElBQUksVUFBVSxLQUFLLGlCQUFpQixFQUFFLENBQUM7WUFDN0QsT0FBTyxVQUFVLENBQUE7UUFDbEIsQ0FBQztRQUNELE9BQU8sdUJBQXVCLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDaEUsQ0FBQztJQUVNLE1BQU0sQ0FBQyxZQUFZLENBQ3pCLFVBQTRDLEVBQzVDLFdBQW1CO1FBRW5CLElBQUksVUFBVSxLQUFLLElBQUksSUFBSSxVQUFVLEtBQUssaUJBQWlCLEVBQUUsQ0FBQztZQUM3RCxPQUFPLFVBQVUsQ0FBQTtRQUNsQixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELE9BQU8sdUJBQXVCLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsY0FBYyxDQUFDLENBQUE7SUFDL0UsQ0FBQztJQUVNLE1B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