/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { convertLinkRangeToBuffer } from '../../browser/terminalLinkHelpers.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
suite('Workbench - Terminal Link Helpers', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('convertLinkRangeToBuffer', () => {
        test('should convert ranges for ascii characters', () => {
            const lines = createBufferLineArray([
                { text: 'AA http://t', width: 11 },
                { text: '.com/f/', width: 8 },
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 4, startLineNumber: 1, endColumn: 19, endLineNumber: 1 }, 0);
            assert.deepStrictEqual(bufferRange, {
                start: { x: 4, y: 1 },
                end: { x: 7, y: 2 },
            });
        });
        test('should convert ranges for wide characters before the link', () => {
            const lines = createBufferLineArray([
                { text: 'A文 http://', width: 11 },
                { text: 't.com/f/', width: 9 },
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 4, startLineNumber: 1, endColumn: 19, endLineNumber: 1 }, 0);
            assert.deepStrictEqual(bufferRange, {
                start: { x: 4 + 1, y: 1 },
                end: { x: 7 + 1, y: 2 },
            });
        });
        test('should give correct range for links containing multi-character emoji', () => {
            const lines = createBufferLineArray([{ text: 'A🙂 http://', width: 11 }]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 0 + 1, startLineNumber: 1, endColumn: 2 + 1, endLineNumber: 1 }, 0);
            assert.deepStrictEqual(bufferRange, {
                start: { x: 1, y: 1 },
                end: { x: 2, y: 1 },
            });
        });
        test('should convert ranges for combining characters before the link', () => {
            const lines = createBufferLineArray([
                { text: 'A🙂 http://', width: 11 },
                { text: 't.com/f/', width: 9 },
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 4 + 1, startLineNumber: 1, endColumn: 19 + 1, endLineNumber: 1 }, 0);
            assert.deepStrictEqual(bufferRange, {
                start: { x: 6, y: 1 },
                end: { x: 9, y: 2 },
            });
        });
        test('should convert ranges for wide characters inside the link', () => {
            const lines = createBufferLineArray([
                { text: 'AA http://t', width: 11 },
                { text: '.com/文/', width: 8 },
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 4, startLineNumber: 1, endColumn: 19, endLineNumber: 1 }, 0);
            assert.deepStrictEqual(bufferRange, {
                start: { x: 4, y: 1 },
                end: { x: 7 + 1, y: 2 },
            });
        });
        test('should convert ranges for wide characters before and inside the link', () => {
            const lines = createBufferLineArray([
                { text: 'A文 http://', width: 11 },
                { text: 't.com/文/', width: 9 },
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 4, startLineNumber: 1, endColumn: 19, endLineNumber: 1 }, 0);
            assert.deepStrictEqual(bufferRange, {
                start: { x: 4 + 1, y: 1 },
                end: { x: 7 + 2, y: 2 },
            });
        });
        test('should convert ranges for emoji before and wide inside the link', () => {
            const lines = createBufferLineArray([
                { text: 'A🙂 http://', width: 11 },
                { text: 't.com/文/', width: 9 },
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 4 + 1, startLineNumber: 1, endColumn: 19 + 1, endLineNumber: 1 }, 0);
            assert.deepStrictEqual(bufferRange, {
                start: { x: 6, y: 1 },
                end: { x: 10 + 1, y: 2 },
            });
        });
        test('should convert ranges for ascii characters (link starts on wrapped)', () => {
            const lines = createBufferLineArray([
                { text: 'AAAAAAAAAAA', width: 11 },
                { text: 'AA http://t', width: 11 },
                { text: '.com/f/', width: 8 },
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 15, startLineNumber: 1, endColumn: 30, endLineNumber: 1 }, 0);
            assert.deepStrictEqual(bufferRange, {
                start: { x: 4, y: 2 },
                end: { x: 7, y: 3 },
            });
        });
        test('should convert ranges for wide characters before the link (link starts on wrapped)', () => {
            const lines = createBufferLineArray([
                { text: 'AAAAAAAAAAA', width: 11 },
                { text: 'A文 http://', width: 11 },
                { text: 't.com/f/', width: 9 },
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 15, startLineNumber: 1, endColumn: 30, endLineNumber: 1 }, 0);
            assert.deepStrictEqual(bufferRange, {
                start: { x: 4 + 1, y: 2 },
                end: { x: 7 + 1, y: 3 },
            });
        });
        test('regression test #147619: 获取模板 25235168 的预览图失败', () => {
            const lines = createBufferLineArray([{ text: '获取模板 25235168 的预览图失败', width: 30 }]);
            assert.deepStrictEqual(convertLinkRangeToBuffer(lines, 30, {
                startColumn: 1,
                startLineNumber: 1,
                endColumn: 5,
                endLineNumber: 1,
            }, 0), {
                start: { x: 1, y: 1 },
                end: { x: 8, y: 1 },
            });
            assert.deepStrictEqual(convertLinkRangeToBuffer(lines, 30, {
                startColumn: 6,
                startLineNumber: 1,
                endColumn: 14,
                endLineNumber: 1,
            }, 0), {
                start: { x: 10, y: 1 },
                end: { x: 17, y: 1 },
            });
            assert.deepStrictEqual(convertLinkRangeToBuffer(lines, 30, {
                startColumn: 15,
                startLineNumber: 1,
                endColumn: 21,
                endLineNumber: 1,
            }, 0), {
                start: { x: 19, y: 1 },
                end: { x: 30, y: 1 },
            });
        });
        test('should convert ranges for wide characters inside the link (link starts on wrapped)', () => {
            const lines = createBufferLineArray([
                { text: 'AAAAAAAAAAA', width: 11 },
                { text: 'AA http://t', width: 11 },
                { text: '.com/文/', width: 8 },
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 15, startLineNumber: 1, endColumn: 30, endLineNumber: 1 }, 0);
            assert.deepStrictEqual(bufferRange, {
                start: { x: 4, y: 2 },
                end: { x: 7 + 1, y: 3 },
            });
        });
        test('should convert ranges for wide characters before and inside the link #2', () => {
            const lines = createBufferLineArray([
                { text: 'AAAAAAAAAAA', width: 11 },
                { text: 'A文 http://', width: 11 },
                { text: 't.com/文/', width: 9 },
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 15, startLineNumber: 1, endColumn: 30, endLineNumber: 1 }, 0);
            assert.deepStrictEqual(bufferRange, {
                start: { x: 4 + 1, y: 2 },
                end: { x: 7 + 2, y: 3 },
            });
        });
        test('should convert ranges for several wide characters before the link', () => {
            const lines = createBufferLineArray([
                { text: 'A文文AAAAAA', width: 11 },
                { text: 'AA文文 http', width: 11 },
                { text: '://t.com/f/', width: 11 },
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 15, startLineNumber: 1, endColumn: 30, endLineNumber: 1 }, 0);
            // This test ensures that the start offset is applied to the end before it's counted
            assert.deepStrictEqual(bufferRange, {
                start: { x: 3 + 4, y: 2 },
                end: { x: 6 + 4, y: 3 },
            });
        });
        test('should convert ranges for several wide characters before and inside the link', () => {
            const lines = createBufferLineArray([
                { text: 'A文文AAAAAA', width: 11 },
                { text: 'AA文文 http', width: 11 },
                { text: '://t.com/文', width: 11 },
                { text: '文/', width: 3 },
            ]);
            const bufferRange = convertLinkRangeToBuffer(lines, 11, { startColumn: 14, startLineNumber: 1, endColumn: 31, endLineNumber: 1 }, 0);
            // This test ensures that the start offset is applies to the end before it's counted
            assert.deepStrictEqual(bufferRange, {
                start: { x: 5, y: 2 },
                end: { x: 1, y: 4 },
            });
        });
    });
});
const TEST_WIDE_CHAR = '文';
const TEST_NULL_CHAR = 'C';
function createBufferLineArray(lines) {
    const result = [];
    lines.forEach((l, i) => {
        result.push(new TestBufferLine(l.text, l.width, i + 1 !== lines.length));
    });
    return result;
}
class TestBufferLine {
    constructor(_text, length, isWrapped) {
        this._text = _text;
        this.length = length;
        this.isWrapped = isWrapped;
    }
    getCell(x) {
        // Create a fake line of cells and use that to resolve the width
        const cells = [];
        let wideNullCellOffset = 0; // There is no null 0 width char after a wide char
        const emojiOffset = 0; // Skip chars as emoji are multiple characters
        for (let i = 0; i <= x - wideNullCellOffset + emojiOffset; i++) {
            let char = this._text.charAt(i);
            if (char === '\ud83d') {
                // Make "🙂"
                char += '\ude42';
            }
            cells.push(char);
            if (this._text.charAt(i) === TEST_WIDE_CHAR || char.charCodeAt(0) > 255) {
                // Skip the next character as it's width is 0
                cells.push(TEST_NULL_CHAR);
                wideNullCellOffset++;
            }
        }
        return {
            getChars: () => {
                return x >= cells.length ? '' : cells[x];
            },
            getWidth: () => {
                switch (cells[x]) {
                    case TEST_WIDE_CHAR:
                        return 2;
                    case TEST_NULL_CHAR:
                        return 0;
                    default: {
                        // Naive measurement, assume anything our of ascii in tests are wide
                        if (cells[x].charCodeAt(0) > 255) {
                            return 2;
                        }
                        return 1;
                    }
                }
            },
        };
    }
    translateToString() {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rSGVscGVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL3Rlc3QvYnJvd3Nlci90ZXJtaW5hbExpbmtIZWxwZXJzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRXJHLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7SUFDL0MsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO1FBQ3RDLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7WUFDdkQsTUFBTSxLQUFLLEdBQUcscUJBQXFCLENBQUM7Z0JBQ25DLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO2dCQUNsQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTthQUM3QixDQUFDLENBQUE7WUFDRixNQUFNLFdBQVcsR0FBRyx3QkFBd0IsQ0FDM0MsS0FBSyxFQUNMLEVBQUUsRUFDRixFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsZUFBZSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLGFBQWEsRUFBRSxDQUFDLEVBQUUsRUFDdkUsQ0FBQyxDQUNELENBQUE7WUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLFdBQVcsRUFBRTtnQkFDbkMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVB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