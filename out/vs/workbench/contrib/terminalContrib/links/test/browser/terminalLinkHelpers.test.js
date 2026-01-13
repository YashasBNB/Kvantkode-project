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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rSGVscGVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvbGlua3MvdGVzdC9icm93c2VyL3Rlcm1pbmFsTGlua0hlbHBlcnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0UsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFckcsS0FBSyxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtJQUMvQyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7UUFDdEMsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEdBQUcsRUFBRTtZQUN2RCxNQUFNLEtBQUssR0FBRyxxQkFBcUIsQ0FBQztnQkFDbkMsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7Z0JBQ2xDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFO2FBQzdCLENBQUMsQ0FBQTtZQUNGLE1BQU0sV0FBVyxHQUFHLHdCQUF3QixDQUMzQyxLQUFLLEVBQ0wsRUFBRSxFQUNGLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxlQUFlLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsYUFBYSxFQUFFLENBQUMsRUFBRSxFQUN2RSxDQUFDLENBQ0QsQ0FBQTtZQUNELE1BQU0sQ0FBQyxlQUFlLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxLQUFLLEVBQUUsRUFBRSxDQUFD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