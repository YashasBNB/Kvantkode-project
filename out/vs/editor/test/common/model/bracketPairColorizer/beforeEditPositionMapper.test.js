/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { splitLines } from '../../../../../base/common/strings.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../common/core/range.js';
import { BeforeEditPositionMapper, TextEditInfo, } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/beforeEditPositionMapper.js';
import { lengthOfString, lengthToObj, lengthToPosition, toLength, } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/length.js';
suite('Bracket Pair Colorizer - BeforeEditPositionMapper', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Single-Line 1', () => {
        assert.deepStrictEqual(compute(['0123456789'], [new TextEdit(toLength(0, 4), toLength(0, 7), 'xy')]), [
            '0  1  2  3  x  y  7  8  9  ', // The line
            '0  0  0  0  0  0  0  0  0  0  ', // the old line numbers
            '0  1  2  3  4  5  7  8  9  10 ', // the old columns
            '0  0  0  0  0  0  ∞  ∞  ∞  ∞  ', // line count until next change
            '4  3  2  1  0  0  ∞  ∞  ∞  ∞  ', // column count until next change
        ]);
    });
    test('Single-Line 2', () => {
        assert.deepStrictEqual(compute(['0123456789'], [
            new TextEdit(toLength(0, 2), toLength(0, 4), 'xxxx'),
            new TextEdit(toLength(0, 6), toLength(0, 6), 'yy'),
        ]), [
            '0  1  x  x  x  x  4  5  y  y  6  7  8  9  ',
            '0  0  0  0  0  0  0  0  0  0  0  0  0  0  0  ',
            '0  1  2  3  4  5  4  5  6  7  6  7  8  9  10 ',
            '0  0  0  0  0  0  0  0  0  0  ∞  ∞  ∞  ∞  ∞  ',
            '2  1  0  0  0  0  2  1  0  0  ∞  ∞  ∞  ∞  ∞  ',
        ]);
    });
    test('Multi-Line Replace 1', () => {
        assert.deepStrictEqual(compute(['₀₁₂₃₄₅₆₇₈₉', '0123456789', '⁰¹²³⁴⁵⁶⁷⁸⁹'], [new TextEdit(toLength(0, 3), toLength(1, 3), 'xy')]), [
            '₀  ₁  ₂  x  y  3  4  5  6  7  8  9  ',
            '0  0  0  0  0  1  1  1  1  1  1  1  1  ',
            '0  1  2  3  4  3  4  5  6  7  8  9  10 ',
            '0  0  0  0  0  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
            '3  2  1  0  0  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
            // ------------------
            '⁰  ¹  ²  ³  ⁴  ⁵  ⁶  ⁷  ⁸  ⁹  ',
            '2  2  2  2  2  2  2  2  2  2  2  ',
            '0  1  2  3  4  5  6  7  8  9  10 ',
            '∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
            '∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
        ]);
    });
    test('Multi-Line Replace 2', () => {
        assert.deepStrictEqual(compute(['₀₁₂₃₄₅₆₇₈₉', '012345678', '⁰¹²³⁴⁵⁶⁷⁸⁹'], [
            new TextEdit(toLength(0, 3), toLength(1, 0), 'ab'),
            new TextEdit(toLength(1, 5), toLength(1, 7), 'c'),
        ]), [
            '₀  ₁  ₂  a  b  0  1  2  3  4  c  7  8  ',
            '0  0  0  0  0  1  1  1  1  1  1  1  1  1  ',
            '0  1  2  3  4  0  1  2  3  4  5  7  8  9  ',
            '0  0  0  0  0  0  0  0  0  0  0  ∞  ∞  ∞  ',
            '3  2  1  0  0  5  4  3  2  1  0  ∞  ∞  ∞  ',
            // ------------------
            '⁰  ¹  ²  ³  ⁴  ⁵  ⁶  ⁷  ⁸  ⁹  ',
            '2  2  2  2  2  2  2  2  2  2  2  ',
            '0  1  2  3  4  5  6  7  8  9  10 ',
            '∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
            '∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
        ]);
    });
    test('Multi-Line Replace 3', () => {
        assert.deepStrictEqual(compute(['₀₁₂₃₄₅₆₇₈₉', '012345678', '⁰¹²³⁴⁵⁶⁷⁸⁹'], [
            new TextEdit(toLength(0, 3), toLength(1, 0), 'ab'),
            new TextEdit(toLength(1, 5), toLength(1, 7), 'c'),
            new TextEdit(toLength(1, 8), toLength(2, 4), 'd'),
        ]), [
            '₀  ₁  ₂  a  b  0  1  2  3  4  c  7  d  ⁴  ⁵  ⁶  ⁷  ⁸  ⁹  ',
            '0  0  0  0  0  1  1  1  1  1  1  1  1  2  2  2  2  2  2  2  ',
            '0  1  2  3  4  0  1  2  3  4  5  7  8  4  5  6  7  8  9  10 ',
            '0  0  0  0  0  0  0  0  0  0  0  0  0  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
            '3  2  1  0  0  5  4  3  2  1  0  1  0  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
        ]);
    });
    test('Multi-Line Insert 1', () => {
        assert.deepStrictEqual(compute(['012345678'], [new TextEdit(toLength(0, 3), toLength(0, 5), 'a\nb')]), [
            '0  1  2  a  ',
            '0  0  0  0  0  ',
            '0  1  2  3  4  ',
            '0  0  0  0  0  ',
            '3  2  1  0  0  ',
            // ------------------
            'b  5  6  7  8  ',
            '1  0  0  0  0  0  ',
            '0  5  6  7  8  9  ',
            '0  ∞  ∞  ∞  ∞  ∞  ',
            '0  ∞  ∞  ∞  ∞  ∞  ',
        ]);
    });
    test('Multi-Line Insert 2', () => {
        assert.deepStrictEqual(compute(['012345678'], [
            new TextEdit(toLength(0, 3), toLength(0, 5), 'a\nb'),
            new TextEdit(toLength(0, 7), toLength(0, 8), 'x\ny'),
        ]), [
            '0  1  2  a  ',
            '0  0  0  0  0  ',
            '0  1  2  3  4  ',
            '0  0  0  0  0  ',
            '3  2  1  0  0  ',
            // ------------------
            'b  5  6  x  ',
            '1  0  0  0  0  ',
            '0  5  6  7  8  ',
            '0  0  0  0  0  ',
            '0  2  1  0  0  ',
            // ------------------
            'y  8  ',
            '1  0  0  ',
            '0  8  9  ',
            '0  ∞  ∞  ',
            '0  ∞  ∞  ',
        ]);
    });
    test('Multi-Line Replace/Insert 1', () => {
        assert.deepStrictEqual(compute(['₀₁₂₃₄₅₆₇₈₉', '012345678', '⁰¹²³⁴⁵⁶⁷⁸⁹'], [new TextEdit(toLength(0, 3), toLength(1, 1), 'aaa\nbbb')]), [
            '₀  ₁  ₂  a  a  a  ',
            '0  0  0  0  0  0  0  ',
            '0  1  2  3  4  5  6  ',
            '0  0  0  0  0  0  0  ',
            '3  2  1  0  0  0  0  ',
            // ------------------
            'b  b  b  1  2  3  4  5  6  7  8  ',
            '1  1  1  1  1  1  1  1  1  1  1  1  ',
            '0  1  2  1  2  3  4  5  6  7  8  9  ',
            '0  0  0  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
            '0  0  0  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
            // ------------------
            '⁰  ¹  ²  ³  ⁴  ⁵  ⁶  ⁷  ⁸  ⁹  ',
            '2  2  2  2  2  2  2  2  2  2  2  ',
            '0  1  2  3  4  5  6  7  8  9  10 ',
            '∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
            '∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
        ]);
    });
    test('Multi-Line Replace/Insert 2', () => {
        assert.deepStrictEqual(compute(['₀₁₂₃₄₅₆₇₈₉', '012345678', '⁰¹²³⁴⁵⁶⁷⁸⁹'], [
            new TextEdit(toLength(0, 3), toLength(1, 1), 'aaa\nbbb'),
            new TextEdit(toLength(1, 5), toLength(1, 5), 'x\ny'),
            new TextEdit(toLength(1, 7), toLength(2, 4), 'k\nl'),
        ]), [
            '₀  ₁  ₂  a  a  a  ',
            '0  0  0  0  0  0  0  ',
            '0  1  2  3  4  5  6  ',
            '0  0  0  0  0  0  0  ',
            '3  2  1  0  0  0  0  ',
            // ------------------
            'b  b  b  1  2  3  4  x  ',
            '1  1  1  1  1  1  1  1  1  ',
            '0  1  2  1  2  3  4  5  6  ',
            '0  0  0  0  0  0  0  0  0  ',
            '0  0  0  4  3  2  1  0  0  ',
            // ------------------
            'y  5  6  k  ',
            '2  1  1  1  1  ',
            '0  5  6  7  8  ',
            '0  0  0  0  0  ',
            '0  2  1  0  0  ',
            // ------------------
            'l  ⁴  ⁵  ⁶  ⁷  ⁸  ⁹  ',
            '2  2  2  2  2  2  2  2  ',
            '0  4  5  6  7  8  9  10 ',
            '0  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
            '0  ∞  ∞  ∞  ∞  ∞  ∞  ∞  ',
        ]);
    });
});
/** @pure */
function compute(inputArr, edits) {
    const newLines = splitLines(applyLineColumnEdits(inputArr.join('\n'), edits.map((e) => ({
        text: e.newText,
        range: Range.fromPositions(lengthToPosition(e.startOffset), lengthToPosition(e.endOffset)),
    }))));
    const mapper = new BeforeEditPositionMapper(edits);
    const result = new Array();
    let lineIdx = 0;
    for (const line of newLines) {
        let lineLine = '';
        let colLine = '';
        let lineStr = '';
        let colDist = '';
        let lineDist = '';
        for (let colIdx = 0; colIdx <= line.length; colIdx++) {
            const before = mapper.getOffsetBeforeChange(toLength(lineIdx, colIdx));
            const beforeObj = lengthToObj(before);
            if (colIdx < line.length) {
                lineStr += rightPad(line[colIdx], 3);
            }
            lineLine += rightPad('' + beforeObj.lineCount, 3);
            colLine += rightPad('' + beforeObj.columnCount, 3);
            const distLen = mapper.getDistanceToNextChange(toLength(lineIdx, colIdx));
            if (distLen === null) {
                lineDist += '∞  ';
                colDist += '∞  ';
            }
            else {
                const dist = lengthToObj(distLen);
                lineDist += rightPad('' + dist.lineCount, 3);
                colDist += rightPad('' + dist.columnCount, 3);
            }
        }
        result.push(lineStr);
        result.push(lineLine);
        result.push(colLine);
        result.push(lineDist);
        result.push(colDist);
        lineIdx++;
    }
    return result;
}
export class TextEdit extends TextEditInfo {
    constructor(startOffset, endOffset, newText) {
        super(startOffset, endOffset, lengthOfString(newText));
        this.newText = newText;
    }
}
class PositionOffsetTransformer {
    constructor(text) {
        this.lineStartOffsetByLineIdx = [];
        this.lineStartOffsetByLineIdx.push(0);
        for (let i = 0; i < text.length; i++) {
            if (text.charAt(i) === '\n') {
                this.lineStartOffsetByLineIdx.push(i + 1);
            }
        }
    }
    getOffset(position) {
        return this.lineStartOffsetByLineIdx[position.lineNumber - 1] + position.column - 1;
    }
}
function applyLineColumnEdits(text, edits) {
    const transformer = new PositionOffsetTransformer(text);
    const offsetEdits = edits.map((e) => {
        const range = Range.lift(e.range);
        return {
            startOffset: transformer.getOffset(range.getStartPosition()),
            endOffset: transformer.getOffset(range.getEndPosition()),
            text: e.text,
        };
    });
    offsetEdits.sort((a, b) => b.startOffset - a.startOffset);
    for (const edit of offsetEdits) {
        text = text.substring(0, edit.startOffset) + edit.text + text.substring(edit.endOffset);
    }
    return text;
}
function rightPad(str, len) {
    while (str.length < len) {
        str += ' ';
    }
    return str;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmVmb3JlRWRpdFBvc2l0aW9uTWFwcGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZWwvYnJhY2tldFBhaXJDb2xvcml6ZXIvYmVmb3JlRWRpdFBvc2l0aW9uTWFwcGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDaEUsT0FBTyxFQUNOLHdCQUF3QixFQUN4QixZQUFZLEdBQ1osTUFBTSxpR0FBaUcsQ0FBQTtBQUN4RyxPQUFPLEVBRU4sY0FBYyxFQUNkLFdBQVcsRUFDWCxnQkFBZ0IsRUFDaEIsUUFBUSxHQUNSLE1BQU0sK0VBQStFLENBQUE7QUFFdEYsS0FBSyxDQUFDLG1EQUFtRCxFQUFFLEdBQUcsRUFBRTtJQUMvRCx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQzFCLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLE9BQU8sQ0FBQyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFDN0U7WUFDQyw2QkFBNkIsRUFBRSxXQUFXO1lBRTFDLGdDQUFnQyxFQUFFLHVCQUF1QjtZQUN6RCxnQ0FBZ0MsRUFBRSxrQkFBa0I7WUFFcEQsZ0NBQWdDLEVB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