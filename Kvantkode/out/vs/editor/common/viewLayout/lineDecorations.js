/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
export class LineDecoration {
    constructor(startColumn, endColumn, className, type) {
        this.startColumn = startColumn;
        this.endColumn = endColumn;
        this.className = className;
        this.type = type;
        this._lineDecorationBrand = undefined;
    }
    static _equals(a, b) {
        return (a.startColumn === b.startColumn &&
            a.endColumn === b.endColumn &&
            a.className === b.className &&
            a.type === b.type);
    }
    static equalsArr(a, b) {
        const aLen = a.length;
        const bLen = b.length;
        if (aLen !== bLen) {
            return false;
        }
        for (let i = 0; i < aLen; i++) {
            if (!LineDecoration._equals(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }
    static extractWrapped(arr, startOffset, endOffset) {
        if (arr.length === 0) {
            return arr;
        }
        const startColumn = startOffset + 1;
        const endColumn = endOffset + 1;
        const lineLength = endOffset - startOffset;
        const r = [];
        let rLength = 0;
        for (const dec of arr) {
            if (dec.endColumn <= startColumn || dec.startColumn >= endColumn) {
                continue;
            }
            r[rLength++] = new LineDecoration(Math.max(1, dec.startColumn - startColumn + 1), Math.min(lineLength + 1, dec.endColumn - startColumn + 1), dec.className, dec.type);
        }
        return r;
    }
    static filter(lineDecorations, lineNumber, minLineColumn, maxLineColumn) {
        if (lineDecorations.length === 0) {
            return [];
        }
        const result = [];
        let resultLen = 0;
        for (let i = 0, len = lineDecorations.length; i < len; i++) {
            const d = lineDecorations[i];
            const range = d.range;
            if (range.endLineNumber < lineNumber || range.startLineNumber > lineNumber) {
                // Ignore decorations that sit outside this line
                continue;
            }
            if (range.isEmpty() &&
                (d.type === 0 /* InlineDecorationType.Regular */ ||
                    d.type === 3 /* InlineDecorationType.RegularAffectingLetterSpacing */)) {
                // Ignore empty range decorations
                continue;
            }
            const startColumn = range.startLineNumber === lineNumber ? range.startColumn : minLineColumn;
            const endColumn = range.endLineNumber === lineNumber ? range.endColumn : maxLineColumn;
            result[resultLen++] = new LineDecoration(startColumn, endColumn, d.inlineClassName, d.type);
        }
        return result;
    }
    static _typeCompare(a, b) {
        const ORDER = [2, 0, 1, 3];
        return ORDER[a] - ORDER[b];
    }
    static compare(a, b) {
        if (a.startColumn !== b.startColumn) {
            return a.startColumn - b.startColumn;
        }
        if (a.endColumn !== b.endColumn) {
            return a.endColumn - b.endColumn;
        }
        const typeCmp = LineDecoration._typeCompare(a.type, b.type);
        if (typeCmp !== 0) {
            return typeCmp;
        }
        if (a.className !== b.className) {
            return a.className < b.className ? -1 : 1;
        }
        return 0;
    }
}
export class DecorationSegment {
    constructor(startOffset, endOffset, className, metadata) {
        this.startOffset = startOffset;
        this.endOffset = endOffset;
        this.className = className;
        this.metadata = metadata;
    }
}
class Stack {
    constructor() {
        this.stopOffsets = [];
        this.classNames = [];
        this.metadata = [];
        this.count = 0;
    }
    static _metadata(metadata) {
        let result = 0;
        for (let i = 0, len = metadata.length; i < len; i++) {
            result |= metadata[i];
        }
        return result;
    }
    consumeLowerThan(maxStopOffset, nextStartOffset, result) {
        while (this.count > 0 && this.stopOffsets[0] < maxStopOffset) {
            let i = 0;
            // Take all equal stopping offsets
            while (i + 1 < this.count && this.stopOffsets[i] === this.stopOffsets[i + 1]) {
                i++;
            }
            // Basically we are consuming the first i + 1 elements of the stack
            result.push(new DecorationSegment(nextStartOffset, this.stopOffsets[i], this.classNames.join(' '), Stack._metadata(this.metadata)));
            nextStartOffset = this.stopOffsets[i] + 1;
            // Consume them
            this.stopOffsets.splice(0, i + 1);
            this.classNames.splice(0, i + 1);
            this.metadata.splice(0, i + 1);
            this.count -= i + 1;
        }
        if (this.count > 0 && nextStartOffset < maxStopOffset) {
            result.push(new DecorationSegment(nextStartOffset, maxStopOffset - 1, this.classNames.join(' '), Stack._metadata(this.metadata)));
            nextStartOffset = maxStopOffset;
        }
        return nextStartOffset;
    }
    insert(stopOffset, className, metadata) {
        if (this.count === 0 || this.stopOffsets[this.count - 1] <= stopOffset) {
            // Insert at the end
            this.stopOffsets.push(stopOffset);
            this.classNames.push(className);
            this.metadata.push(metadata);
        }
        else {
            // Find the insertion position for `stopOffset`
            for (let i = 0; i < this.count; i++) {
                if (this.stopOffsets[i] >= stopOffset) {
                    this.stopOffsets.splice(i, 0, stopOffset);
                    this.classNames.splice(i, 0, className);
                    this.metadata.splice(i, 0, metadata);
                    break;
                }
            }
        }
        this.count++;
        return;
    }
}
export class LineDecorationsNormalizer {
    /**
     * Normalize line decorations. Overlapping decorations will generate multiple segments
     */
    static normalize(lineContent, lineDecorations) {
        if (lineDecorations.length === 0) {
            return [];
        }
        const result = [];
        const stack = new Stack();
        let nextStartOffset = 0;
        for (let i = 0, len = lineDecorations.length; i < len; i++) {
            const d = lineDecorations[i];
            let startColumn = d.startColumn;
            let endColumn = d.endColumn;
            const className = d.className;
            const metadata = d.type === 1 /* InlineDecorationType.Before */
                ? 2 /* LinePartMetadata.PSEUDO_BEFORE */
                : d.type === 2 /* InlineDecorationType.After */
                    ? 4 /* LinePartMetadata.PSEUDO_AFTER */
                    : 0;
            // If the position would end up in the middle of a high-low surrogate pair, we move it to before the pair
            if (startColumn > 1) {
                const charCodeBefore = lineContent.charCodeAt(startColumn - 2);
                if (strings.isHighSurrogate(charCodeBefore)) {
                    startColumn--;
                }
            }
            if (endColumn > 1) {
                const charCodeBefore = lineContent.charCodeAt(endColumn - 2);
                if (strings.isHighSurrogate(charCodeBefore)) {
                    endColumn--;
                }
            }
            const currentStartOffset = startColumn - 1;
            const currentEndOffset = endColumn - 2;
            nextStartOffset = stack.consumeLowerThan(currentStartOffset, nextStartOffset, result);
            if (stack.count === 0) {
                nextStartOffset = currentStartOffset;
            }
            stack.insert(currentEndOffset, className, metadata);
        }
        stack.consumeLowerThan(1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, nextStartOffset, result);
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZURlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3ZpZXdMYXlvdXQvbGluZURlY29yYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFLMUQsTUFBTSxPQUFPLGNBQWM7SUFHMUIsWUFDaUIsV0FBbUIsRUFDbkIsU0FBaUIsRUFDakIsU0FBaUIsRUFDakIsSUFBMEI7UUFIMUIsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFDbkIsY0FBUyxHQUFULFNBQVMsQ0FBUTtRQUNqQixjQUFTLEdBQVQsU0FBUyxDQUFRO1FBQ2pCLFNBQUksR0FBSixJQUFJLENBQXNCO1FBTjNDLHlCQUFvQixHQUFTLFNBQVMsQ0FBQTtJQU9uQyxDQUFDO0lBRUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFpQixFQUFFLENBQWlCO1FBQzFELE9BQU8sQ0FDTixDQUFDLENBQUMsV0FBVyxLQUFLLENBQUMsQ0FBQyxXQUFXO1lBQy9CLENBQUMsQ0FBQyxTQUFTLEtBQUssQ0FBQyxDQUFDLFNBQVM7WUFDM0IsQ0FBQyxDQUFDLFNBQVMsS0FBSyxDQUFDLENBQUMsU0FBUztZQUMzQixDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQ2pCLENBQUE7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFtQixFQUFFLENBQW1CO1FBQy9ELE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUE7UUFDckIsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtRQUNyQixJQUFJLElBQUksS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNuQixPQUFPLEtBQUssQ0FBQTtR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