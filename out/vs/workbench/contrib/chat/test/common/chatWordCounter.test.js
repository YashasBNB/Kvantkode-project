/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { getNWords } from '../../common/chatWordCounter.js';
suite('ChatWordCounter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function doTest(str, nWords, resultStr) {
        const result = getNWords(str, nWords);
        assert.strictEqual(result.value, resultStr);
        assert.strictEqual(result.returnedWordCount, nWords);
    }
    suite('getNWords', () => {
        test('matching actualWordCount', () => {
            const cases = [
                ['hello world', 1, 'hello'],
                ['hello', 1, 'hello'],
                ['hello world', 0, ''],
                ["here's, some.   punctuation?", 3, "here's, some.   punctuation?"],
                ['| markdown | _table_ | header |', 3, '| markdown | _table_ | header |'],
                ['| --- | --- | --- |', 1, '| ---'],
                ['| --- | --- | --- |', 3, '| --- | --- | --- |'],
                [' \t some \n whitespace     \n\n\nhere   ', 3, ' \t some \n whitespace     \n\n\nhere   '],
            ];
            cases.forEach(([str, nWords, result]) => doTest(str, nWords, result));
        });
        test('whitespace', () => {
            assert.deepStrictEqual(getNWords('hello ', 1), {
                value: 'hello ',
                returnedWordCount: 1,
                isFullString: true,
                totalWordCount: 1,
            });
            assert.deepStrictEqual(getNWords('hello\n\n', 1), {
                value: 'hello\n\n',
                returnedWordCount: 1,
                isFullString: true,
                totalWordCount: 1,
            });
            assert.deepStrictEqual(getNWords('\nhello', 1), {
                value: '\nhello',
                returnedWordCount: 1,
                isFullString: true,
                totalWordCount: 1,
            });
        });
        test('matching links', () => {
            const cases = [
                ['[hello](https://example.com) world', 1, '[hello](https://example.com)'],
                ['[hello](https://example.com) world', 2, '[hello](https://example.com) world'],
                ['oh [hello](https://example.com "title") world', 1, 'oh'],
                [
                    'oh [hello](https://example.com "title") world',
                    2,
                    'oh [hello](https://example.com "title")',
                ],
                // Parens in link destination
                ['[hello](https://example.com?()) world', 1, '[hello](https://example.com?())'],
                // Escaped brackets in link text
                [
                    '[he \\[l\\] \\]lo](https://example.com?()) world',
                    1,
                    '[he \\[l\\] \\]lo](https://example.com?())',
                ],
            ];
            cases.forEach(([str, nWords, result]) => doTest(str, nWords, result));
        });
        test('code', () => {
            const cases = [
                ['let a=1-2', 2, 'let a'],
                ['let a=1-2', 3, 'let a='],
                ['let a=1-2', 4, 'let a=1'],
                ['const myVar = 1+2', 4, 'const myVar = 1'],
                ['<div id="myDiv"></div>', 3, '<div id='],
                ['<div id="myDiv"></div>', 4, '<div id="myDiv"></div>'],
            ];
            cases.forEach(([str, nWords, result]) => doTest(str, nWords, result));
        });
        test('chinese characters', () => {
            const cases = [['我喜欢中国菜', 3, '我喜欢']];
            cases.forEach(([str, nWords, result]) => doTest(str, nWords, result));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdvcmRDb3VudGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL2NoYXRXb3JkQ291bnRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsU0FBUyxFQUFvQixNQUFNLGlDQUFpQyxDQUFBO0FBRTdFLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7SUFDN0IsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxTQUFTLE1BQU0sQ0FBQyxHQUFXLEVBQUUsTUFBYyxFQUFFLFNBQWlCO1FBQzdELE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtRQUN2QixJQUFJLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO1lBQ3JDLE1BQU0sS0FBSyxHQUErQjtnQkFDekMsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxFQUFFLE9BQU8sQ0FBQztnQkFDM0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE9BQU8sQ0FBQztnQkFDckIsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDdEIsQ0FBQyw4QkFBOEIsRUFBRSxDQUFDLEVBQUUsOEJBQThC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