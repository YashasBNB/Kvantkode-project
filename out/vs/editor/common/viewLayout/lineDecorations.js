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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZURlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi92aWV3TGF5b3V0L2xpbmVEZWNvcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBSzFELE1BQU0sT0FBTyxjQUFjO0lBRzFCLFlBQ2lCLFdBQW1CLEVBQ25CLFNBQWlCLEVBQ2pCLFNBQWlCLEVBQ2pCLElBQTBCO1FBSDFCLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQ25CLGNBQVMsR0FBVCxTQUFTLENBQVE7UUFDakIsY0FBUyxHQUFULFNBQVMsQ0FBUTtRQUNqQixTQUFJLEdBQUosSUFBSSxDQUFzQjtRQU4zQyx5QkFBb0IsR0FBUyxTQUFTLENBQUE7SUFPbkMsQ0FBQztJQUVJLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBaUIsRUFBRSxDQUFpQjtRQUMxRCxPQUFPLENBQ04sQ0FBQyxDQUFDLFdBQVcsS0FBSyxDQUFDLENBQUMsV0FBVztZQUMvQixDQUFDLENBQUMsU0FBUyxLQUFLLENBQUMsQ0FBQyxTQUFTO1lBQzNCLENBQUMsQ0FBQyxTQUFTLEtBQUssQ0FBQyxDQUFDLFNBQVM7WUFDM0IsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsSUFBSSxDQUNqQixDQUFBO0lBQ0YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBbUIsRUFBRSxDQUFtQjtRQUMvRCxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFBO1FBQ3JCLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUE7UUFDckIsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDbkIsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsS0FBSyxJQUFJ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