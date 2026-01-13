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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmVmb3JlRWRpdFBvc2l0aW9uTWFwcGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2RlbC9icmFja2V0UGFpckNvbG9yaXplci9iZWZvcmVFZGl0UG9zaXRpb25NYXBwZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLFlBQVksR0FDWixNQUFNLGlHQUFpRyxDQUFBO0FBQ3hHLE9BQU8sRUFFTixjQUFjLEVBQ2QsV0FBVyxFQUNYLGdCQUFnQixFQUNoQixRQUFRLEdBQ1IsTUFBTSwrRUFBK0UsQ0FBQTtBQUV0RixLQUFLLENBQUMsbURBQW1ELEVBQUUsR0FBRyxFQUFFO0lBQy9ELHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7UUFDMUIsTUFBTSxDQUFDLGVBQWUsQ0FDckIsT0FBTyxDQUFDLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUM3RTtZQUNDLDZCQUE2QixFQUFFLFdBQVc7WUFFMUMsZ0NBQWdDLEVBQUUsdUJBQXVCO1lBQ3pELGdDQUFnQyxFQUFF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