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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZVBhdHRlcm4udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2ZpbmQvdGVzdC9icm93c2VyL3JlcGxhY2VQYXR0ZXJuLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzFGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxjQUFjLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFbEcsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtJQUNsQyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7UUFDakMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxLQUFhLEVBQUUsY0FBOEIsRUFBRSxFQUFFO1lBQ25FLE1BQU0sTUFBTSxHQUFHLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3hDLE1BQU0sUUFBUSxHQUFHLElBQUksY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBQ25ELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxVQUFVLEdBQUcsS0FBSyxDQUFDLENBQUE7UUFDN0QsQ0FBQyxDQUFBO1FBRUQsK0JBQStCO1FBQy9CLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUV2RCxZQUFZO1FBQ1osU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzVELFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM1RCxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFNUQsV0FBVztRQUNYLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU1RCxZQUFZO1FBQ1osU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9ELFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMvRCxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFL0QsZUFBZTtRQUNmLFNBQVMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVsRSxlQUFlO1FBQ2YsU0FBUyxDQUFDLGdCQUFnQixFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFckUsK0JBQStCO1FBQy9CLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUUzRCxzQ0FBc0M7UUFDdEMsU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTdELHdDQUF3QztRQUN4QyxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFN0QsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckYsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckYsU0FBUyxDQUFDLFVBQVUsRUFBRTtZQUNyQixZQUFZLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQztZQUNqQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUMxQixZQUFZLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQztTQUM3QixDQUFDLENBQUE7UUFDRixTQUFTLENBQUMsU0FBUyxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyRixTQUFTLENBQUMsU0FBUyxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyRixTQUFTLENBQUMsU0FBUyxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyRixTQUFTLENBQUMsU0FBUyxFQUFFLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVyRixTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFP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M0MsYUFBYSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3BDLGFBQWEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNwQyxhQUFhLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDcEMsYUFBYSxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsZUFBZSxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQzVELGFBQWEsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxFQUFFLHNCQUFzQixFQUFFLHNCQUFzQixDQUFDLENBQUE7UUFDOUUsYUFBYSxDQUFDLENBQUMsYUFBYSxDQUFDLEVBQUUsZUFBZSxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQ2hFLGFBQWEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUM1RCxhQUFhLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxlQUFlLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDNUQsYUFBYSxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsZUFBZSxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQzVELGFBQWEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUM1RCxhQUFhLENBQUMsQ0FBQyxhQUFhLENBQUMsRUFBRSxzQkFBc0IsRUFBRSxzQkFBc0IsQ0FBQyxDQUFBO1FBQzlFLGFBQWEsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxFQUFFLGVBQWUsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUNoRSxhQUFhLENBQUMsQ0FBQyxhQUFhLENBQUMsRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO1FBQ3hFLGFBQWEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLGVBQWUsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUM1RCxhQUFhLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxl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