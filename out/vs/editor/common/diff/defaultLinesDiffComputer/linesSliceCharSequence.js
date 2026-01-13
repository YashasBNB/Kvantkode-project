/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { findLastIdxMonotonous, findLastMonotonous, findFirstMonotonous, } from '../../../../base/common/arraysFind.js';
import { OffsetRange } from '../../core/offsetRange.js';
import { Position } from '../../core/position.js';
import { Range } from '../../core/range.js';
import { isSpace } from './utils.js';
export class LinesSliceCharSequence {
    constructor(lines, range, considerWhitespaceChanges) {
        this.lines = lines;
        this.range = range;
        this.considerWhitespaceChanges = considerWhitespaceChanges;
        this.elements = [];
        this.firstElementOffsetByLineIdx = [];
        this.lineStartOffsets = [];
        this.trimmedWsLengthsByLineIdx = [];
        this.firstElementOffsetByLineIdx.push(0);
        for (let lineNumber = this.range.startLineNumber; lineNumber <= this.range.endLineNumber; lineNumber++) {
            let line = lines[lineNumber - 1];
            let lineStartOffset = 0;
            if (lineNumber === this.range.startLineNumber && this.range.startColumn > 1) {
                lineStartOffset = this.range.startColumn - 1;
                line = line.substring(lineStartOffset);
            }
            this.lineStartOffsets.push(lineStartOffset);
            let trimmedWsLength = 0;
            if (!considerWhitespaceChanges) {
                const trimmedStartLine = line.trimStart();
                trimmedWsLength = line.length - trimmedStartLine.length;
                line = trimmedStartLine.trimEnd();
            }
            this.trimmedWsLengthsByLineIdx.push(trimmedWsLength);
            const lineLength = lineNumber === this.range.endLineNumber
                ? Math.min(this.range.endColumn - 1 - lineStartOffset - trimmedWsLength, line.length)
                : line.length;
            for (let i = 0; i < lineLength; i++) {
                this.elements.push(line.charCodeAt(i));
            }
            if (lineNumber < this.range.endLineNumber) {
                this.elements.push('\n'.charCodeAt(0));
                this.firstElementOffsetByLineIdx.push(this.elements.length);
            }
        }
    }
    toString() {
        return `Slice: "${this.text}"`;
    }
    get text() {
        return this.getText(new OffsetRange(0, this.length));
    }
    getText(range) {
        return this.elements
            .slice(range.start, range.endExclusive)
            .map((e) => String.fromCharCode(e))
            .join('');
    }
    getElement(offset) {
        return this.elements[offset];
    }
    get length() {
        return this.elements.length;
    }
    getBoundaryScore(length) {
        //   a   b   c   ,           d   e   f
        // 11  0   0   12  15  6   13  0   0   11
        const prevCategory = getCategory(length > 0 ? this.elements[length - 1] : -1);
        const nextCategory = getCategory(length < this.elements.length ? this.elements[length] : -1);
        if (prevCategory === 7 /* CharBoundaryCategory.LineBreakCR */ &&
            nextCategory === 8 /* CharBoundaryCategory.LineBreakLF */) {
            // don't break between \r and \n
            return 0;
        }
        if (prevCategory === 8 /* CharBoundaryCategory.LineBreakLF */) {
            // prefer the linebreak before the change
            return 150;
        }
        let score = 0;
        if (prevCategory !== nextCategory) {
            score += 10;
            if (prevCategory === 0 /* CharBoundaryCategory.WordLower */ &&
                nextCategory === 1 /* CharBoundaryCategory.WordUpper */) {
                score += 1;
            }
        }
        score += getCategoryBoundaryScore(prevCategory);
        score += getCategoryBoundaryScore(nextCategory);
        return score;
    }
    translateOffset(offset, preference = 'right') {
        // find smallest i, so that lineBreakOffsets[i] <= offset using binary search
        const i = findLastIdxMonotonous(this.firstElementOffsetByLineIdx, (value) => value <= offset);
        const lineOffset = offset - this.firstElementOffsetByLineIdx[i];
        return new Position(this.range.startLineNumber + i, 1 +
            this.lineStartOffsets[i] +
            lineOffset +
            (lineOffset === 0 && preference === 'left' ? 0 : this.trimmedWsLengthsByLineIdx[i]));
    }
    translateRange(range) {
        const pos1 = this.translateOffset(range.start, 'right');
        const pos2 = this.translateOffset(range.endExclusive, 'left');
        if (pos2.isBefore(pos1)) {
            return Range.fromPositions(pos2, pos2);
        }
        return Range.fromPositions(pos1, pos2);
    }
    /**
     * Finds the word that contains the character at the given offset
     */
    findWordContaining(offset) {
        if (offset < 0 || offset >= this.elements.length) {
            return undefined;
        }
        if (!isWordChar(this.elements[offset])) {
            return undefined;
        }
        // find start
        let start = offset;
        while (start > 0 && isWordChar(this.elements[start - 1])) {
            start--;
        }
        // find end
        let end = offset;
        while (end < this.elements.length && isWordChar(this.elements[end])) {
            end++;
        }
        return new OffsetRange(start, end);
    }
    /** fooBar has the two sub-words foo and bar */
    findSubWordContaining(offset) {
        if (offset < 0 || offset >= this.elements.length) {
            return undefined;
        }
        if (!isWordChar(this.elements[offset])) {
            return undefined;
        }
        // find start
        let start = offset;
        while (start > 0 &&
            isWordChar(this.elements[start - 1]) &&
            !isUpperCase(this.elements[start])) {
            start--;
        }
        // find end
        let end = offset;
        while (end < this.elements.length &&
            isWordChar(this.elements[end]) &&
            !isUpperCase(this.elements[end])) {
            end++;
        }
        return new OffsetRange(start, end);
    }
    countLinesIn(range) {
        return (this.translateOffset(range.endExclusive).lineNumber -
            this.translateOffset(range.start).lineNumber);
    }
    isStronglyEqual(offset1, offset2) {
        return this.elements[offset1] === this.elements[offset2];
    }
    extendToFullLines(range) {
        const start = findLastMonotonous(this.firstElementOffsetByLineIdx, (x) => x <= range.start) ?? 0;
        const end = findFirstMonotonous(this.firstElementOffsetByLineIdx, (x) => range.endExclusive <= x) ??
            this.elements.length;
        return new OffsetRange(start, end);
    }
}
function isWordChar(charCode) {
    return ((charCode >= 97 /* CharCode.a */ && charCode <= 122 /* CharCode.z */) ||
        (charCode >= 65 /* CharCode.A */ && charCode <= 90 /* CharCode.Z */) ||
        (charCode >= 48 /* CharCode.Digit0 */ && charCode <= 57 /* CharCode.Digit9 */));
}
function isUpperCase(charCode) {
    return charCode >= 65 /* CharCode.A */ && charCode <= 90 /* CharCode.Z */;
}
var CharBoundaryCategory;
(function (CharBoundaryCategory) {
    CharBoundaryCategory[CharBoundaryCategory["WordLower"] = 0] = "WordLower";
    CharBoundaryCategory[CharBoundaryCategory["WordUpper"] = 1] = "WordUpper";
    CharBoundaryCategory[CharBoundaryCategory["WordNumber"] = 2] = "WordNumber";
    CharBoundaryCategory[CharBoundaryCategory["End"] = 3] = "End";
    CharBoundaryCategory[CharBoundaryCategory["Other"] = 4] = "Other";
    CharBoundaryCategory[CharBoundaryCategory["Separator"] = 5] = "Separator";
    CharBoundaryCategory[CharBoundaryCategory["Space"] = 6] = "Space";
    CharBoundaryCategory[CharBoundaryCategory["LineBreakCR"] = 7] = "LineBreakCR";
    CharBoundaryCategory[CharBoundaryCategory["LineBreakLF"] = 8] = "LineBreakLF";
})(CharBoundaryCategory || (CharBoundaryCategory = {}));
const score = {
    [0 /* CharBoundaryCategory.WordLower */]: 0,
    [1 /* CharBoundaryCategory.WordUpper */]: 0,
    [2 /* CharBoundaryCategory.WordNumber */]: 0,
    [3 /* CharBoundaryCategory.End */]: 10,
    [4 /* CharBoundaryCategory.Other */]: 2,
    [5 /* CharBoundaryCategory.Separator */]: 30,
    [6 /* CharBoundaryCategory.Space */]: 3,
    [7 /* CharBoundaryCategory.LineBreakCR */]: 10,
    [8 /* CharBoundaryCategory.LineBreakLF */]: 10,
};
function getCategoryBoundaryScore(category) {
    return score[category];
}
function getCategory(charCode) {
    if (charCode === 10 /* CharCode.LineFeed */) {
        return 8 /* CharBoundaryCategory.LineBreakLF */;
    }
    else if (charCode === 13 /* CharCode.CarriageReturn */) {
        return 7 /* CharBoundaryCategory.LineBreakCR */;
    }
    else if (isSpace(charCode)) {
        return 6 /* CharBoundaryCategory.Space */;
    }
    else if (charCode >= 97 /* CharCode.a */ && charCode <= 122 /* CharCode.z */) {
        return 0 /* CharBoundaryCategory.WordLower */;
    }
    else if (charCode >= 65 /* CharCode.A */ && charCode <= 90 /* CharCode.Z */) {
        return 1 /* CharBoundaryCategory.WordUpper */;
    }
    else if (charCode >= 48 /* CharCode.Digit0 */ && charCode <= 57 /* CharCode.Digit9 */) {
        return 2 /* CharBoundaryCategory.WordNumber */;
    }
    else if (charCode === -1) {
        return 3 /* CharBoundaryCategory.End */;
    }
    else if (charCode === 44 /* CharCode.Comma */ || charCode === 59 /* CharCode.Semicolon */) {
        return 5 /* CharBoundaryCategory.Separator */;
    }
    else {
        return 4 /* CharBoundaryCategory.Other */;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNTbGljZUNoYXJTZXF1ZW5jZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9kaWZmL2RlZmF1bHRMaW5lc0RpZmZDb21wdXRlci9saW5lc1NsaWNlQ2hhclNlcXVlbmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsa0JBQWtCLEVBQ2xCLG1CQUFtQixHQUNuQixNQUFNLHVDQUF1QyxDQUFBO0FBRTlDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDakQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRTNDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFcEMsTUFBTSxPQUFPLHNCQUFzQjtJQU1sQyxZQUNpQixLQUFlLEVBQ2QsS0FBWSxFQUNiLHlCQUFrQztRQUZsQyxVQUFLLEdBQUwsS0FBSyxDQUFVO1FBQ2QsVUFBSyxHQUFMLEtBQUssQ0FBTztRQUNiLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBUztRQVJsQyxhQUFRLEdBQWEsRUFBRSxDQUFBO1FBQ3ZCLGdDQUEyQixHQUFhLEVBQUUsQ0FBQTtRQUMxQyxxQkFBZ0IsR0FBYSxFQUFFLENBQUE7UUFDL0IsOEJBQXlCLEdBQWEsRUFBRSxDQUFBO1FBT3hELElBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDeEMsS0FDQyxJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFDM0MsVUFBVSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUN0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