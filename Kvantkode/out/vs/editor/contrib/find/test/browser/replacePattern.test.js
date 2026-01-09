/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { buildReplaceStringWithCasePreserved } from '../../../../../base/common/search.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { parseReplaceString, ReplacePattern, ReplacePiece } from '../../browser/replacePattern.js';
suite('Replace Pattern test', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('parse replace string', () => {
        const testParse = (input, expectedPieces) => {
            const actual = parseReplaceString(input);
            const expected = new ReplacePattern(expectedPieces);
            assert.deepStrictEqual(actual, expected, 'Parsing ' + input);
        };
        // no backslash => no treatment
        testParse('hello', [ReplacePiece.staticValue('hello')]);
        // \t => TAB
        testParse('\\thello', [ReplacePiece.staticValue('\thello')]);
        testParse('h\\tello', [ReplacePiece.staticValue('h\tello')]);
        testParse('hello\\t', [ReplacePiece.staticValue('hello\t')]);
        // \n => LF
        testParse('\\nhello', [ReplacePiece.staticValue('\nhello')]);
        // \\t => \t
        testParse('\\\\thello', [ReplacePiece.staticValue('\\thello')]);
        testParse('h\\\\tello', [ReplacePiece.staticValue('h\\tello')]);
        testParse('hello\\\\t', [ReplacePiece.staticValue('hello\\t')]);
        // \\\t => \TAB
        testParse('\\\\\\thello', [ReplacePiece.staticValue('\\\thello')]);
        // \\\\t => \\t
        testParse('\\\\\\\\thello', [ReplacePiece.staticValue('\\\\thello')]);
        // \ at the end => no treatment
        testParse('hello\\', [ReplacePiece.staticValue('hello\\')]);
        // \ with unknown char => no treatment
        testParse('hello\\x', [ReplacePiece.staticValue('hello\\x')]);
        // \ with back reference => no treatment
        testParse('hello\\0', [ReplacePiece.staticValue('hello\\0')]);
        testParse('hello$&', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(0)]);
        testParse('hello$0', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(0)]);
        testParse('hello$02', [
            ReplacePiece.staticValue('hello'),
            ReplacePiece.matchIndex(0),
            ReplacePiece.staticValue('2'),
        ]);
        testParse('hello$1', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(1)]);
        testParse('hello$2', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(2)]);
        testParse('hello$9', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(9)]);
        testParse('$9hello', [ReplacePiece.matchIndex(9), ReplacePiece.staticValue('hello')]);
        testParse('hello$12', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(12)]);
        testParse('hello$99', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(99)]);
        testParse('hello$99a', [
            ReplacePiece.staticValue('hello'),
            ReplacePiece.matchIndex(99),
            ReplacePiece.staticValue('a'),
        ]);
        testParse('hello$1a', [
            ReplacePiece.staticValue('hello'),
            ReplacePiece.matchIndex(1),
            ReplacePiece.staticValue('a'),
        ]);
        testParse('hello$100', [
            ReplacePiece.staticValue('hello'),
            ReplacePiece.matchIndex(10),
            ReplacePiece.staticValue('0'),
        ]);
        testParse('hello$100a', [
            ReplacePiece.staticValue('hello'),
            ReplacePiece.matchIndex(10),
            ReplacePiece.staticValue('0a'),
        ]);
        testParse('hello$10a0', [
            ReplacePiece.staticValue('hello'),
            ReplacePiece.matchIndex(10),
            ReplacePiece.staticValue('a0'),
        ]);
        testParse('hello$$', [ReplacePiece.staticValue('hello$')]);
        testParse('hello$$0', [ReplacePiece.staticValue('hello$0')]);
        testParse('hello$`', [ReplacePiece.staticValue('hello$`')]);
        testParse("hello$'", [ReplacePiece.staticValue("hello$'")]);
    });
    test('parse replace string with case modifiers', () => {
        const testParse = (input, expectedPieces) => {
            const actual = parseReplaceString(input);
            const expected = new ReplacePattern(expectedPieces);
            assert.deepStrictEqual(actual, expected, 'Parsing ' + input);
        };
        function assertReplace(target, search, replaceString, expected) {
            const replacePattern = parseReplaceString(replaceString);
            const m = search.exec(target);
            const actual = replacePattern.buildReplaceString(m);
            assert.strictEqual(actual, expected, `${target}.replace(${search}, ${replaceString}) === ${expected}`);
        }
        // \U, \u => uppercase  \L, \l => lowercase  \E => cancel
        testParse('hello\\U$1', [ReplacePiece.staticValue('hello'), ReplacePiece.caseOps(1, ['U'])]);
        assertReplace('func privateFunc(', /func (\w+)\(/, 'func \\U$1(', 'func PRIVATEFUNC(');
        testParse('hello\\u$1', [ReplacePiece.staticValue('hello'), ReplacePiece.caseOps(1, ['u'])]);
        assertReplace('func privateFunc(', /func (\w+)\(/, 'func \\u$1(', 'func PrivateFunc(');
        testParse('hello\\L$1', [ReplacePiece.staticValue('hello'), ReplacePiece.caseOps(1, ['L'])]);
        assertReplace('func privateFunc(', /func (\w+)\(/, 'func \\L$1(', 'func privatefunc(');
        testParse('hello\\l$1', [ReplacePiece.staticValue('hello'), ReplacePiece.caseOps(1, ['l'])]);
        assertReplace('func PrivateFunc(', /func (\w+)\(/, 'func \\l$1(', 'func privateFunc(');
        testParse('hello$1\\u\\u\\U$4goodbye', [
            ReplacePiece.staticValue('hello'),
            ReplacePiece.matchIndex(1),
            ReplacePiece.caseOps(4, ['u', 'u', 'U']),
            ReplacePiece.staticValue('goodbye'),
        ]);
        assertReplace('hellogooDbye', /hello(\w+)/, 'hello\\u\\u\\l\\l\\U$1', 'helloGOodBYE');
    });
    test('replace has JavaScript semantics', () => {
        const testJSReplaceSemantics = (target, search, replaceString, expected) => {
            const replacePattern = parseReplaceString(replaceString);
            const m = search.exec(target);
            const actual = replacePattern.buildReplaceString(m);
            assert.deepStrictEqual(actual, expected, `${target}.replace(${search}, ${replaceString})`);
        };
        testJSReplaceSemantics('hi', /hi/, 'hello', 'hi'.replace(/hi/, 'hello'));
        testJSReplaceSemantics('hi', /hi/, '\\t', 'hi'.replace(/hi/, '\t'));
        testJSReplaceSemantics('hi', /hi/, '\\n', 'hi'.replace(/hi/, '\n'));
        testJSReplaceSemantics('hi', /hi/, '\\\\t', 'hi'.replace(/hi/, '\\t'));
        testJSReplaceSemantics('hi', /hi/, '\\\\n', 'hi'.replace(/hi/, '\\n'));
        // implicit capture group 0
        testJSReplaceSemantics('hi', /hi/, 'hello$&', 'hi'.replace(/hi/, 'hello$&'));
        testJSReplaceSemantics('hi', /hi/, 'hello$0', 'hi'.replace(/hi/, 'hello$&'));
        testJSReplaceSemantics('hi', /hi/, 'hello$&1', 'hi'.replace(/hi/, 'hello$&1'));
        testJSReplaceSemantics('hi', /hi/, 'hello$01', 'hi'.replace(/hi/, 'hello$&1'));
        // capture groups have funny semantics in replace strings
        // the replace string interprets $nn as a captured group only if it exists in the search regex
        testJSReplaceSemantics('hi', /(hi)/, 'hello$10', 'hi'.replace(/(hi)/, 'hello$10'));
        testJSReplaceSemantics('hi', /(hi)()()()()()()()()()/, 'hello$10', 'hi'.replace(/(hi)()()()()()()()()()/, 'hello$10'));
        testJSReplaceSemantics('hi', /(hi)/, 'hello$100', 'hi'.replace(/(hi)/, 'hello$100'));
        testJSReplaceSemantics('hi', /(hi)/, 'hello$20', 'hi'.replace(/(hi)/, 'hello$20'));
    });
    test('get replace string if given text is a complete match', () => {
        function assertReplace(target, search, replaceString, expected) {
            const replacePattern = parseReplaceString(replaceString);
            const m = search.exec(target);
            const actual = replacePattern.buildReplaceString(m);
            assert.strictEqual(actual, expected, `${target}.replace(${search}, ${replaceString}) === ${expected}`);
        }
        assertReplace('bla', /bla/, 'hello', 'hello');
        assertReplace('bla', /(bla)/, 'hello', 'hello');
        assertReplace('bla', /(bla)/, 'hello$0', 'hellobla');
        const searchRegex = /let\s+(\w+)\s*=\s*require\s*\(\s*['"]([\w\.\-/]+)\s*['"]\s*\)\s*/;
        assertReplace("let fs = require('fs')", searchRegex, "import * as $1 from '$2';", "import * as fs from 'fs';");
        assertReplace("let something = require('fs')", searchRegex, "import * as $1 from '$2';", "import * as something from 'fs';");
        assertReplace("let something = require('fs')", searchRegex, "import * as $1 from '$1';", "import * as something from 'something';");
        assertReplace("let something = require('fs')", searchRegex, "import * as $2 from '$1';", "import * as fs from 'something';");
        assertReplace("let something = require('fs')", searchRegex, "import * as $0 from '$0';", "import * as let something = require('fs') from 'let something = require('fs')';");
        assertReplace("let fs = require('fs')", searchRegex, "import * as $1 from '$2';", "import * as fs from 'fs';");
        assertReplace('for ()', /for(.*)/, 'cat$1', 'cat ()');
        // issue #18111
        assertReplace('HRESULT OnAmbientPropertyChange(DISPID   dispid);', /\b\s{3}\b/, ' ', ' ');
    });
    test('get replace string if match is sub-string of the text', () => {
        function assertReplace(target, search, replaceString, expected) {
            const replacePattern = parseReplaceString(replaceString);
            const m = search.exec(target);
            const actual = replacePattern.buildReplaceString(m);
            assert.strictEqual(actual, expected, `${target}.replace(${search}, ${replaceString}) === ${expected}`);
        }
        assertReplace('this is a bla text', /bla/, 'hello', 'hello');
        assertReplace('this is a bla text', /this(?=.*bla)/, 'that', 'that');
        assertReplace('this is a bla text', /(th)is(?=.*bla)/, '$1at', 'that');
        assertReplace('this is a bla text', /(th)is(?=.*bla)/, '$1e', 'the');
        assertReplace('this is a bla text', /(th)is(?=.*bla)/, '$1ere', 'there');
        assertReplace('this is a bla text', /(th)is(?=.*bla)/, '$1', 'th');
        assertReplace('this is a bla text', /(th)is(?=.*bla)/, 'ma$1', 'math');
        assertReplace('this is a bla text', /(th)is(?=.*bla)/, 'ma$1s', 'maths');
        assertReplace('this is a bla text', /(th)is(?=.*bla)/, '$0', 'this');
        assertReplace('this is a bla text', /(th)is(?=.*bla)/, '$0$1', 'thisth');
        assertReplace('this is a bla text', /bla(?=\stext$)/, 'foo', 'foo');
        assertReplace('this is a bla text', /b(la)(?=\stext$)/, 'f$1', 'fla');
        assertReplace('this is a bla text', /b(la)(?=\stext$)/, 'f$0', 'fbla');
        assertReplace('this is a bla text', /b(la)(?=\stext$)/, '$0ah', 'blaah');
    });
    test('issue #19740 Find and replace capture group/backreference inserts `undefined` instead of empty string', () => {
        const replacePattern = parseReplaceString('a{$1}');
        const matches = /a(z)?/.exec('abcd');
        const actual = replacePattern.buildReplaceString(matches);
        assert.strictEqual(actual, 'a{}');
    });
    test('buildReplaceStringWithCasePreserved test', () => {
        function assertReplace(target, replaceString, expected) {
            let actual = '';
            actual = buildReplaceStringWithCasePreserved(target, replaceString);
            assert.strictEqual(actual, expected);
        }
        assertReplace(['abc'], 'Def', 'def');
        assertReplace(['Abc'], 'Def', 'Def');
        assertReplace(['ABC'], 'Def', 'DEF');
        assertReplace(['abc', 'Abc'], 'Def', 'def');
        assertReplace(['Abc', 'abc'], 'Def', 'Def');
        assertReplace(['ABC', 'abc'], 'Def', 'DEF');
        assertReplace(['aBc', 'abc'], 'Def', 'def');
        assertReplace(['AbC'], 'Def', 'Def');
        assertReplace(['aBC'], 'Def', 'def');
        assertReplace(['aBc'], 'DeF', 'deF');
        assertReplace(['Foo-Bar'], 'newfoo-newbar', 'Newfoo-Newbar');
        assertReplace(['Foo-Bar-Abc'], 'newfoo-newbar-newabc', 'Newfoo-Newbar-Newabc');
        assertReplace(['Foo-Bar-abc'], 'newfoo-newbar', 'Newfoo-newbar');
        assertReplace(['foo-Bar'], 'newfoo-newbar', 'newfoo-Newbar');
        assertReplace(['foo-BAR'], 'newfoo-newbar', 'newfoo-NEWBAR');
        assertReplace(['foO-BAR'], 'NewFoo-NewBar', 'newFoo-NEWBAR');
        assertReplace(['Foo_Bar'], 'newfoo_newbar', 'Newfoo_Newbar');
        assertReplace(['Foo_Bar_Abc'], 'newfoo_newbar_newabc', 'Newfoo_Newbar_Newabc');
        assertReplace(['Foo_Bar_abc'], 'newfoo_newbar', 'Newfoo_newbar');
        assertReplace(['Foo_Bar-abc'], 'newfoo_newbar-abc', 'Newfoo_newbar-abc');
        assertReplace(['foo_Bar'], 'newfoo_newbar', 'newfoo_Newbar');
        assertReplace(['Foo_BAR'], 'newfoo_newbar', 'Newfoo_NEWBAR');
    });
    test('preserve case', () => {
        function assertReplace(target, replaceString, expected) {
            const replacePattern = parseReplaceString(replaceString);
            const actual = replacePattern.buildReplaceString(target, true);
            assert.strictEqual(actual, expected);
        }
        assertReplace(['abc'], 'Def', 'def');
        assertReplace(['Abc'], 'Def', 'Def');
        assertReplace(['ABC'], 'Def', 'DEF');
        assertReplace(['abc', 'Abc'], 'Def', 'def');
        assertReplace(['Abc', 'abc'], 'Def', 'Def');
        assertReplace(['ABC', 'abc'], 'Def', 'DEF');
        assertReplace(['aBc', 'abc'], 'Def', 'def');
        assertReplace(['AbC'], 'Def', 'Def');
        assertReplace(['aBC'], 'Def', 'def');
        assertReplace(['aBc'], 'DeF', 'deF');
        assertReplace(['Foo-Bar'], 'newfoo-newbar', 'Newfoo-Newbar');
        assertReplace(['Foo-Bar-Abc'], 'newfoo-newbar-newabc', 'Newfoo-Newbar-Newabc');
        assertReplace(['Foo-Bar-abc'], 'newfoo-newbar', 'Newfoo-newbar');
        assertReplace(['foo-Bar'], 'newfoo-newbar', 'newfoo-Newbar');
        assertReplace(['foo-BAR'], 'newfoo-newbar', 'newfoo-NEWBAR');
        assertReplace(['foO-BAR'], 'NewFoo-NewBar', 'newFoo-NEWBAR');
        assertReplace(['Foo_Bar'], 'newfoo_newbar', 'Newfoo_Newbar');
        assertReplace(['Foo_Bar_Abc'], 'newfoo_newbar_newabc', 'Newfoo_Newbar_Newabc');
        assertReplace(['Foo_Bar_abc'], 'newfoo_newbar', 'Newfoo_newbar');
        assertReplace(['Foo_Bar-abc'], 'newfoo_newbar-abc', 'Newfoo_newbar-abc');
        assertReplace(['foo_Bar'], 'newfoo_newbar', 'newfoo_Newbar');
        assertReplace(['foo_BAR'], 'newfoo_newbar', 'newfoo_NEWBAR');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZVBhdHRlcm4udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZmluZC90ZXN0L2Jyb3dzZXIvcmVwbGFjZVBhdHRlcm4udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDMUYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGNBQWMsRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUVsRyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO0lBQ2xDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtRQUNqQyxNQUFNLFNBQVMsR0FBRyxDQUFDLEtBQWEsRUFBRSxjQUE4QixFQUFFLEVBQUU7WUFDbkUsTUFBTSxNQUFNLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDeEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDbkQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFVBQVUsR0FBRyxLQUFLLENBQUMsQ0FBQTtRQUM3RCxDQUFDLENBQUE7UUFFRCwrQkFBK0I7UUFDL0IsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXZELFlBQVk7UUFDWixTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDNUQsU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzVELFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU1RCxXQUFXO1FBQ1gsU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTVELFlBQVk7UUFDWixTQUFTLENBQUMsWUFBWSxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDL0QsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9ELFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUUvRCxlQUFlO1FBQ2YsU0FBUyxDQUFDLGNBQWMsRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRWxFLGVBQWU7UUFDZixTQUFTLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVyRSwrQkFBK0I7UUFDL0IsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTNELHNDQUFzQztRQUN0QyxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFN0Qsd0NBQXdDO1FBQ3hDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU3RCxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyRixTQUFTLENBQUMsU0FBUyxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyRixTQUFTLENBQUMsVUFBVSxFQUFFO1lBQ3JCLFlBQVksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDO1lBQ2pDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQzFCLFlBQVksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDO1NBQzdCLENBQUMsQ0FBQTtRQUNGLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXJGLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxZ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