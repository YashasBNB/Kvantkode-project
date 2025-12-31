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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC90ZXN0L2NvbW1vbi9yZXBsYWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUV4RCxLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO0lBQ2xDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtRQUNqQyxNQUFNLFNBQVMsR0FBRyxDQUFDLEtBQWEsRUFBRSxRQUFnQixFQUFFLHFCQUE4QixFQUFFLEVBQUU7WUFDckYsSUFBSSxNQUFNLEdBQUcsSUFBSSxjQUFjLENBQUMsS0FBSyxFQUFFLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUNsRixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUE7WUFFL0QsTUFBTSxHQUFHLElBQUksY0FBYyxDQUFDLE9BQU8sR0FBRyxLQUFLLEdBQUcsSUFBSSxFQUFFO2dCQUNuRCxPQUFPLEVBQUUsYUFBYTtnQkFDdEIsUUFBUSxFQUFFLElBQUk7YUFDZCxDQUFDLENBQUE7WUFDRixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sR0FBRyxRQUFRLEdBQUcsSUFBSSxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLHFCQUFxQixFQUFFLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNoRSxDQUFDLENBQUE7UUFFRCwrQkFBK0I7UUFDL0IsU0FBUyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFbEMsWUFBWTtRQUNaLFNBQVMsQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXZDLFdBQVc7UUFDWCxTQUFTLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV2QyxZQUFZO1FBQ1osU0FBUyxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFMUMsZUFBZTtRQUNmLFNBQVMsQ0FBQyxjQUFjLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRTdDLGVBQWU7UUFDZixTQUFTLENBQUMsZ0JBQWdCLEVBQUUsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRWhELCtCQUErQjtRQUMvQixTQUFTLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV0QyxzQ0FBc0M7UUFDdEMsU0FBUyxDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFeEMsd0NBQXdDO1FBQ3hDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXhDLHFCQUFxQjtRQUNyQixTQUFTLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNyQyxxQkFBcUI7UUFDckIsU0FBUyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDckMsc0JBQXNCO1FBQ3RCLFNBQVMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZDLHNCQUFzQjtRQUN0QixTQUFTLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2Qyx1QkFBdUI7UUFDdkIsU0FBUyxDQUFDLFdBQVcsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDekMsdUJBQXVCO1FBQ3ZCLFNBQVMsQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzFDLHdCQUF3QjtRQUN4QixTQUFTLENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM1Qyx3QkFBd0I7UUFDeEIsU0FBUyxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0MscUJBQXFCO1FBQ3JCLFNBQVMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3RDLHNCQUFzQjtRQUN0QixTQUFTLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUV4QyxXQUFXO1FBQ1gsU0FBUyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDckMsU0FBUyxDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFdkMsU0FBUyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDckMsU0FBUyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDdEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0NBQWtDLEVBQUUsR0FBRyxFQUFFO1FBQzdDLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQTtRQUNwQixJQUFJLE1BQU0sR0FBRyxJQUFJLGNBQWMsQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtRQUNoRSxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUV4QyxRQUFRLEdBQUcsS0FBSyxDQUFBO1FBQ2hCLE1BQU0sR0FBRyxJQUFJLGNBQWMsQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQTtRQUMxRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUV4QyxJQUFJLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVuRCxVQUFVLEdBQUcsSUFBSSxjQUFjLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDbkQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsc0RBQXNELEVBQUUsR0FBRyxFQUFFO1FBQ2pFLElBQUksVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDaEYsSUFBSSxNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBRW5DLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQzdFLE1BQU0sR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFbkMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDOUUsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUVuQyxVQUFVLEdBQUcsSUFBSSxjQUFjLENBQUMsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNoRixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBRXRDLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQywyQkFBMkIsRUFBRTtZQUM1RCxPQUFPLEVBQUUsa0ZBQWtGO1lBQzNGLFFBQVEsRUFBRSxJQUFJO1NBQ2QsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLDJCQUEyQixDQUFDLENBQUE7UUFFdkQsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLGtDQUFrQyxDQUFDLENBQUE7UUFFOUQsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRWhDLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQywyQkFBMkIsRUFBRTtZQUM1RCxPQUFPLEVBQUUsa0ZBQWtGO1lBQzNGLFFBQVEsRUFBRSxJQUFJO1NBQ2QsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLHlDQUF5QyxDQUFDLENBQUE7UUFFckUsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLDJCQUEyQixFQUFFO1lBQzVELE9BQU8sRUFBRSxrRkFBa0Y7WUFDM0YsUUFBUSxFQUFFLElBQUk7U0FDZCxDQUFDLENBQUE7UUFDRixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLCtCQUErQixDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsa0NBQWtDLENBQUMsQ0FBQTtRQUU5RCxVQUFVLEdBQUcsSUFBSSxjQUFjLENBQUMsMkJBQTJCLEVBQUU7WUFDNUQsT0FBTyxFQUFFLGtGQUFrRjtZQUMzRixRQUFRLEVBQUUsSUFBSTtTQUNkLENBQUMsQ0FBQTtRQUNGLE1BQU0sR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsZ0NBQWdDLENBQUMsQ0FBQTtRQUN0RSxNQUFNLENBQUMsV0FBVyxDQUNqQixNQUFNLEVBQ04saUZBQWlGLENBQ2pGLENBQUE7UUFFRCxVQUFVLEdBQUcsSUFBSSxjQUFjLENBQUMsMkJBQTJCLEVBQUU7WUFDNUQsT0FBTyxFQUFFLGtGQUFrRjtZQUMzRixRQUFRLEVBQUUsS0FBSztTQUNmLENBQUMsQ0FBQTtRQUNGLE1BQU0sR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMseUJBQXlCLENBQUMsQ0FBQTtRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVoQyxVQUFVLEdBQUcsSUFBSSxjQUFjLENBQUMsT0FBTyxFQUFFLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNoRixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3JDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtRQUM1QixNQUFNLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyx3QkFBd0IsRUFBRTtZQUMvRCxPQUFPLEVBQUUsa0JBQWtCO1lBQzNCLFFBQVEsRUFBRSxJQUFJO1NBQ2QsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFBO0lBQ3pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtRQUNoRCxJQUFJLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQzFGLElBQUksTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1FBRTVDLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDM0YsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1FBRWpELFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxjQUFjLEVBQUUsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3pGLE1BQU0sR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUE7SUFDekMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO1FBQ3hDLFVBQVU7UUFDVixNQUFNLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ2hHLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxhQUFhLENBQUMsQ0FBQTtJQUMxQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7UUFDOUMsSUFBSSxVQUFVLEdBQUcsSUFBSSxjQUFjLENBQUMsT0FBTyxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNoRixJQUFJLE1BQU0sR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFaEMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDN0UsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNqQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1REFBdUQsRUFBRSxHQUFHLEVBQUU7UUFDbEUsSUFBSSxVQUFVLEdBQUcsSUFBSSxjQUFjLENBQUMsT0FBTyxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNoRixJQUFJLE1BQU0sR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUVuQyxVQUFVLEdBQUcsSUFBSSxjQUFjLENBQUMsT0FBTyxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUM3RSxNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFbkMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDckYsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRWxDLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDdkYsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRWxDLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDdEYsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRWpDLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDeEYsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBRW5DLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDckYsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRWhDLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDdkYsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRWxDLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDeEYsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBRW5DLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDeEYsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBRW5DLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDckYsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRWxDLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDdkYsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRXBDLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDdEYsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRWpDLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDeEYsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRWpDLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDeEYsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRWxDLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDekYsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBRW5DLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQ25FLE1BQU0sR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBRXRDLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQ25FLE1BQU0sR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBRXRDLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxZQUFZLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFDckUsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFFdkMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLFlBQVksRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUNyRSxNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUN4QyxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=