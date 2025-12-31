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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNTbGljZUNoYXJTZXF1ZW5jZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vZGlmZi9kZWZhdWx0TGluZXNEaWZmQ29tcHV0ZXIvbGluZXNTbGljZUNoYXJTZXF1ZW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLGtCQUFrQixFQUNsQixtQkFBbUIsR0FDbkIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU5QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUUzQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRXBDLE1BQU0sT0FBTyxzQkFBc0I7SUFNbEMsWUFDaUIsS0FBZSxFQUNkLEtBQVksRUFDYix5QkFBa0M7UUFGbEMsVUFBSyxHQUFMLEtBQUssQ0FBVTtRQUNkLFVBQUssR0FBTCxLQUFLLENBQU87UUFDYiw4QkFBeUIsR0FBekIseUJBQXlCLENBQVM7UUFSbEMsYUFBUSxHQUFhLEVBQUUsQ0FBQTtRQUN2QixnQ0FBMkIsR0FBYSxFQUFFLENBQUE7UUFDMUMscUJBQWdCLEdBQWEsRUFBRSxDQUFBO1FBQy9CLDhCQUF5QixHQUFhLEVBQUUsQ0FBQTtRQU94RCxJQUFJLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLEtBQ0MsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQzNDLFVBQVUsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFDdEMsVUFBVSxFQUFFLEVBQ1gsQ0FBQztZ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