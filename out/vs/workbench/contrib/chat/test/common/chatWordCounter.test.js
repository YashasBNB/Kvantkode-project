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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdvcmRDb3VudGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vY2hhdFdvcmRDb3VudGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxTQUFTLEVBQW9CLE1BQU0saUNBQWlDLENBQUE7QUFFN0UsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUM3Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLFNBQVMsTUFBTSxDQUFDLEdBQVcsRUFBRSxNQUFjLEVBQUUsU0FBaUI7UUFDN0QsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDckQsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO1FBQ3ZCLElBQUksQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7WUFDckMsTUFBTSxLQUFLLEdBQStCO2dCQUN6QyxDQUFDLGFBQWEsRUFBRSxDQUFDLEVBQUUsT0FBTyxDQUFDO2dCQUMzQixDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsT0FBTyxDQUFDO2dCQUNyQixDQUFDLGFBQWEsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUN0QixDQUFDLDhCQUE4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