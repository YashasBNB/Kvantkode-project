/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ReplacePattern } from '../../common/replace.js';
suite('Replace Pattern test', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('parse replace string', () => {
        const testParse = (input, expected, expectedHasParameters) => {
            let actual = new ReplacePattern(input, { pattern: 'somepattern', isRegExp: true });
            assert.strictEqual(expected, actual.pattern);
            assert.strictEqual(expectedHasParameters, actual.hasParameters);
            actual = new ReplacePattern('hello' + input + 'hi', {
                pattern: 'sonepattern',
                isRegExp: true,
            });
            assert.strictEqual('hello' + expected + 'hi', actual.pattern);
            assert.strictEqual(expectedHasParameters, actual.hasParameters);
        };
        // no backslash => no treatment
        testParse('hello', 'hello', false);
        // \t => TAB
        testParse('\\thello', '\thello', false);
        // \n => LF
        testParse('\\nhello', '\nhello', false);
        // \\t => \t
        testParse('\\\\thello', '\\thello', false);
        // \\\t => \TAB
        testParse('\\\\\\thello', '\\\thello', false);
        // \\\\t => \\t
        testParse('\\\\\\\\thello', '\\\\thello', false);
        // \ at the end => no treatment
        testParse('hello\\', 'hello\\', false);
        // \ with unknown char => no treatment
        testParse('hello\\x', 'hello\\x', false);
        // \ with back reference => no treatment
        testParse('hello\\0', 'hello\\0', false);
        // $1 => no treatment
        testParse('hello$1', 'hello$1', true);
        // $2 => no treatment
        testParse('hello$2', 'hello$2', true);
        // $12 => no treatment
        testParse('hello$12', 'hello$12', true);
        // $99 => no treatment
        testParse('hello$99', 'hello$99', true);
        // $99a => no treatment
        testParse('hello$99a', 'hello$99a', true);
        // $100 => no treatment
        testParse('hello$100', 'hello$100', false);
        // $100a => no treatment
        testParse('hello$100a', 'hello$100a', false);
        // $10a0 => no treatment
        testParse('hello$10a0', 'hello$10a0', true);
        // $$ => no treatment
        testParse('hello$$', 'hello$$', false);
        // $$0 => no treatment
        testParse('hello$$0', 'hello$$0', false);
        // $0 => $&
        testParse('hello$0', 'hello$&', true);
        testParse('hello$02', 'hello$&2', true);
        testParse('hello$`', 'hello$`', true);
        testParse("hello$'", "hello$'", true);
    });
    test('create pattern by passing regExp', () => {
        let expected = /abc/;
        let actual = new ReplacePattern('hello', false, expected).regExp;
        assert.deepStrictEqual(actual, expected);
        expected = /abc/;
        actual = new ReplacePattern('hello', false, /abc/g).regExp;
        assert.deepStrictEqual(actual, expected);
        let testObject = new ReplacePattern('hello$0', false, /abc/g);
        assert.strictEqual(testObject.hasParameters, false);
        testObject = new ReplacePattern('hello$0', true, /abc/g);
        assert.strictEqual(testObject.hasParameters, true);
    });
    test('get replace string if given text is a complete match', () => {
        let testObject = new ReplacePattern('hello', { pattern: 'bla', isRegExp: true });
        let actual = testObject.getReplaceString('bla');
        assert.strictEqual(actual, 'hello');
        testObject = new ReplacePattern('hello', { pattern: 'bla', isRegExp: false });
        actual = testObject.getReplaceString('bla');
        assert.strictEqual(actual, 'hello');
        testObject = new ReplacePattern('hello', { pattern: '(bla)', isRegExp: true });
        actual = testObject.getReplaceString('bla');
        assert.strictEqual(actual, 'hello');
        testObject = new ReplacePattern('hello$0', { pattern: '(bla)', isRegExp: true });
        actual = testObject.getReplaceString('bla');
        assert.strictEqual(actual, 'hellobla');
        testObject = new ReplacePattern("import * as $1 from '$2';", {
            pattern: 'let\\s+(\\w+)\\s*=\\s*require\\s*\\(\\s*[\'\"]([\\w.\\-/]+)\\s*[\'\"]\\s*\\)\\s*',
            isRegExp: true,
        });
        actual = testObject.getReplaceString("let fs = require('fs')");
        assert.strictEqual(actual, "import * as fs from 'fs';");
        actual = testObject.getReplaceString("let something = require('fs')");
        assert.strictEqual(actual, "import * as something from 'fs';");
        actual = testObject.getReplaceString("let require('fs')");
        assert.strictEqual(actual, null);
        testObject = new ReplacePattern("import * as $1 from '$1';", {
            pattern: 'let\\s+(\\w+)\\s*=\\s*require\\s*\\(\\s*[\'\"]([\\w.\\-/]+)\\s*[\'\"]\\s*\\)\\s*',
            isRegExp: true,
        });
        actual = testObject.getReplaceString("let something = require('fs')");
        assert.strictEqual(actual, "import * as something from 'something';");
        testObject = new ReplacePattern("import * as $2 from '$1';", {
            pattern: 'let\\s+(\\w+)\\s*=\\s*require\\s*\\(\\s*[\'\"]([\\w.\\-/]+)\\s*[\'\"]\\s*\\)\\s*',
            isRegExp: true,
        });
        actual = testObject.getReplaceString("let something = require('fs')");
        assert.strictEqual(actual, "import * as fs from 'something';");
        testObject = new ReplacePattern("import * as $0 from '$0';", {
            pattern: 'let\\s+(\\w+)\\s*=\\s*require\\s*\\(\\s*[\'\"]([\\w.\\-/]+)\\s*[\'\"]\\s*\\)\\s*',
            isRegExp: true,
        });
        actual = testObject.getReplaceString("let something = require('fs');");
        assert.strictEqual(actual, "import * as let something = require('fs') from 'let something = require('fs')';");
        testObject = new ReplacePattern("import * as $1 from '$2';", {
            pattern: 'let\\s+(\\w+)\\s*=\\s*require\\s*\\(\\s*[\'\"]([\\w.\\-/]+)\\s*[\'\"]\\s*\\)\\s*',
            isRegExp: false,
        });
        actual = testObject.getReplaceString("let fs = require('fs');");
        assert.strictEqual(actual, null);
        testObject = new ReplacePattern('cat$1', { pattern: 'for(.*)', isRegExp: true });
        actual = testObject.getReplaceString('for ()');
        assert.strictEqual(actual, 'cat ()');
    });
    test('case operations', () => {
        const testObject = new ReplacePattern('a\\u$1l\\u\\l\\U$2M$3n', {
            pattern: 'a(l)l(good)m(e)n',
            isRegExp: true,
        });
        const actual = testObject.getReplaceString('allgoodmen');
        assert.strictEqual(actual, 'aLlGoODMen');
    });
    test('case operations - no false positive', () => {
        let testObject = new ReplacePattern('\\left $1', { pattern: '(pattern)', isRegExp: true });
        let actual = testObject.getReplaceString('pattern');
        assert.strictEqual(actual, '\\left pattern');
        testObject = new ReplacePattern('\\hi \\left $1', { pattern: '(pattern)', isRegExp: true });
        actual = testObject.getReplaceString('pattern');
        assert.strictEqual(actual, '\\hi \\left pattern');
        testObject = new ReplacePattern('\\left \\L$1', { pattern: 'PATT(ERN)', isRegExp: true });
        actual = testObject.getReplaceString('PATTERN');
        assert.strictEqual(actual, '\\left ern');
    });
    test('case operations and newline', () => {
        // #140734
        const testObject = new ReplacePattern('$1\n\\U$2', { pattern: '(multi)(line)', isRegExp: true });
        const actual = testObject.getReplaceString('multiline');
        assert.strictEqual(actual, 'multi\nLINE');
    });
    test('get replace string for no matches', () => {
        let testObject = new ReplacePattern('hello', { pattern: 'bla', isRegExp: true });
        let actual = testObject.getReplaceString('foo');
        assert.strictEqual(actual, null);
        testObject = new ReplacePattern('hello', { pattern: 'bla', isRegExp: false });
        actual = testObject.getReplaceString('foo');
        assert.strictEqual(actual, null);
    });
    test('get replace string if match is sub-string of the text', () => {
        let testObject = new ReplacePattern('hello', { pattern: 'bla', isRegExp: true });
        let actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'hello');
        testObject = new ReplacePattern('hello', { pattern: 'bla', isRegExp: false });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'hello');
        testObject = new ReplacePattern('that', { pattern: 'this(?=.*bla)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'that');
        testObject = new ReplacePattern('$1at', { pattern: '(th)is(?=.*bla)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'that');
        testObject = new ReplacePattern('$1e', { pattern: '(th)is(?=.*bla)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'the');
        testObject = new ReplacePattern('$1ere', { pattern: '(th)is(?=.*bla)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'there');
        testObject = new ReplacePattern('$1', { pattern: '(th)is(?=.*bla)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'th');
        testObject = new ReplacePattern('ma$1', { pattern: '(th)is(?=.*bla)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'math');
        testObject = new ReplacePattern('ma$1s', { pattern: '(th)is(?=.*bla)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'maths');
        testObject = new ReplacePattern('ma$1s', { pattern: '(th)is(?=.*bla)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'maths');
        testObject = new ReplacePattern('$0', { pattern: '(th)is(?=.*bla)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'this');
        testObject = new ReplacePattern('$0$1', { pattern: '(th)is(?=.*bla)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'thisth');
        testObject = new ReplacePattern('foo', { pattern: 'bla(?=\\stext$)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'foo');
        testObject = new ReplacePattern('f$1', { pattern: 'b(la)(?=\\stext$)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'fla');
        testObject = new ReplacePattern('f$0', { pattern: 'b(la)(?=\\stext$)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'fbla');
        testObject = new ReplacePattern('$0ah', { pattern: 'b(la)(?=\\stext$)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'blaah');
        testObject = new ReplacePattern('newrege$1', true, /Testrege(\w*)/);
        actual = testObject.getReplaceString('Testregex', true);
        assert.strictEqual(actual, 'Newregex');
        testObject = new ReplacePattern('newrege$1', true, /TESTREGE(\w*)/);
        actual = testObject.getReplaceString('TESTREGEX', true);
        assert.strictEqual(actual, 'NEWREGEX');
        testObject = new ReplacePattern('new_rege$1', true, /Test_Rege(\w*)/);
        actual = testObject.getReplaceString('Test_Regex', true);
        assert.strictEqual(actual, 'New_Regex');
        testObject = new ReplacePattern('new-rege$1', true, /Test-Rege(\w*)/);
        actual = testObject.getReplaceString('Test-Regex', true);
        assert.strictEqual(actual, 'New-Regex');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL3Rlc3QvY29tbW9uL3JlcGxhY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRXhELEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7SUFDbEMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO1FBQ2pDLE1BQU0sU0FBUyxHQUFHLENBQUMsS0FBYSxFQUFFLFFBQWdCLEVBQUUscUJBQThCLEVBQUUsRUFBRTtZQUNyRixJQUFJLE1BQU0sR0FBRyxJQUFJLGNBQWMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQ2xGLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLHFCQUFxQixFQUFFLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQTtZQUUvRCxNQUFNLEdBQUcsSUFBSSxjQUFjLENBQUMsT0FBTyxHQUFHLEtBQUssR0FBRyxJQUFJLEVBQUU7Z0JBQ25ELE9BQU8sRUFBRSxhQUFhO2dCQUN0QixRQUFRLEVBQUUsSUFBSTthQUNkLENBQUMsQ0FBQTtZQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxHQUFHLFFBQVEsR0FBRyxJQUFJLEVBQUUsTUFBTSxD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MUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFakMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN4RixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFbkMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLElBQUksRUFBRSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNyRixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFaEMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN2RixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFbEMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN4RixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFbkMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN4RixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFbkMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLElBQUksRUFBRSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNyRixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFbEMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN2RixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFFcEMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN0RixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFakMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN4RixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFakMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN4RixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFbEMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxFQUFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN6RixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFbkMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDbkUsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFFdEMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDbkUsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFFdEMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLFlBQVksRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUNyRSxNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUV2QyxVQUFVLEdBQUcsSUFBSSxjQUFjLENBQUMsWUFBWSxFQUFFLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQ3hDLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==