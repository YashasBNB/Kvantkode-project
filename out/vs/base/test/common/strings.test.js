/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as strings from '../../common/strings.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Strings', () => {
    test('equalsIgnoreCase', () => {
        assert(strings.equalsIgnoreCase('', ''));
        assert(!strings.equalsIgnoreCase('', '1'));
        assert(!strings.equalsIgnoreCase('1', ''));
        assert(strings.equalsIgnoreCase('a', 'a'));
        assert(strings.equalsIgnoreCase('abc', 'Abc'));
        assert(strings.equalsIgnoreCase('abc', 'ABC'));
        assert(strings.equalsIgnoreCase('Höhenmeter', 'HÖhenmeter'));
        assert(strings.equalsIgnoreCase('ÖL', 'Öl'));
    });
    test('beginsWithIgnoreCase', () => {
        assert(strings.startsWithIgnoreCase('', ''));
        assert(!strings.startsWithIgnoreCase('', '1'));
        assert(strings.startsWithIgnoreCase('1', ''));
        assert(strings.startsWithIgnoreCase('a', 'a'));
        assert(strings.startsWithIgnoreCase('abc', 'Abc'));
        assert(strings.startsWithIgnoreCase('abc', 'ABC'));
        assert(strings.startsWithIgnoreCase('Höhenmeter', 'HÖhenmeter'));
        assert(strings.startsWithIgnoreCase('ÖL', 'Öl'));
        assert(strings.startsWithIgnoreCase('alles klar', 'a'));
        assert(strings.startsWithIgnoreCase('alles klar', 'A'));
        assert(strings.startsWithIgnoreCase('alles klar', 'alles k'));
        assert(strings.startsWithIgnoreCase('alles klar', 'alles K'));
        assert(strings.startsWithIgnoreCase('alles klar', 'ALLES K'));
        assert(strings.startsWithIgnoreCase('alles klar', 'alles klar'));
        assert(strings.startsWithIgnoreCase('alles klar', 'ALLES KLAR'));
        assert(!strings.startsWithIgnoreCase('alles klar', ' ALLES K'));
        assert(!strings.startsWithIgnoreCase('alles klar', 'ALLES K '));
        assert(!strings.startsWithIgnoreCase('alles klar', 'öALLES K '));
        assert(!strings.startsWithIgnoreCase('alles klar', ' '));
        assert(!strings.startsWithIgnoreCase('alles klar', 'ö'));
    });
    test('compareIgnoreCase', () => {
        function assertCompareIgnoreCase(a, b, recurse = true) {
            let actual = strings.compareIgnoreCase(a, b);
            actual = actual > 0 ? 1 : actual < 0 ? -1 : actual;
            let expected = strings.compare(a.toLowerCase(), b.toLowerCase());
            expected = expected > 0 ? 1 : expected < 0 ? -1 : expected;
            assert.strictEqual(actual, expected, `${a} <> ${b}`);
            if (recurse) {
                assertCompareIgnoreCase(b, a, false);
            }
        }
        assertCompareIgnoreCase('', '');
        assertCompareIgnoreCase('abc', 'ABC');
        assertCompareIgnoreCase('abc', 'ABc');
        assertCompareIgnoreCase('abc', 'ABcd');
        assertCompareIgnoreCase('abc', 'abcd');
        assertCompareIgnoreCase('foo', 'föo');
        assertCompareIgnoreCase('Code', 'code');
        assertCompareIgnoreCase('Code', 'cöde');
        assertCompareIgnoreCase('B', 'a');
        assertCompareIgnoreCase('a', 'B');
        assertCompareIgnoreCase('b', 'a');
        assertCompareIgnoreCase('a', 'b');
        assertCompareIgnoreCase('aa', 'ab');
        assertCompareIgnoreCase('aa', 'aB');
        assertCompareIgnoreCase('aa', 'aA');
        assertCompareIgnoreCase('a', 'aa');
        assertCompareIgnoreCase('ab', 'aA');
        assertCompareIgnoreCase('O', '/');
    });
    test('compareIgnoreCase (substring)', () => {
        function assertCompareIgnoreCase(a, b, aStart, aEnd, bStart, bEnd, recurse = true) {
            let actual = strings.compareSubstringIgnoreCase(a, b, aStart, aEnd, bStart, bEnd);
            actual = actual > 0 ? 1 : actual < 0 ? -1 : actual;
            let expected = strings.compare(a.toLowerCase().substring(aStart, aEnd), b.toLowerCase().substring(bStart, bEnd));
            expected = expected > 0 ? 1 : expected < 0 ? -1 : expected;
            assert.strictEqual(actual, expected, `${a} <> ${b}`);
            if (recurse) {
                assertCompareIgnoreCase(b, a, bStart, bEnd, aStart, aEnd, false);
            }
        }
        assertCompareIgnoreCase('', '', 0, 0, 0, 0);
        assertCompareIgnoreCase('abc', 'ABC', 0, 1, 0, 1);
        assertCompareIgnoreCase('abc', 'Aabc', 0, 3, 1, 4);
        assertCompareIgnoreCase('abcABc', 'ABcd', 3, 6, 0, 4);
    });
    test('format', () => {
        assert.strictEqual(strings.format('Foo Bar'), 'Foo Bar');
        assert.strictEqual(strings.format('Foo {0} Bar'), 'Foo {0} Bar');
        assert.strictEqual(strings.format('Foo {0} Bar', 'yes'), 'Foo yes Bar');
        assert.strictEqual(strings.format('Foo {0} Bar {0}', 'yes'), 'Foo yes Bar yes');
        assert.strictEqual(strings.format('Foo {0} Bar {1}{2}', 'yes'), 'Foo yes Bar {1}{2}');
        assert.strictEqual(strings.format('Foo {0} Bar {1}{2}', 'yes', undefined), 'Foo yes Bar undefined{2}');
        assert.strictEqual(strings.format('Foo {0} Bar {1}{2}', 'yes', 5, false), 'Foo yes Bar 5false');
        assert.strictEqual(strings.format('Foo {0} Bar. {1}', '(foo)', '.test'), 'Foo (foo) Bar. .test');
    });
    test('format2', () => {
        assert.strictEqual(strings.format2('Foo Bar', {}), 'Foo Bar');
        assert.strictEqual(strings.format2('Foo {oops} Bar', {}), 'Foo {oops} Bar');
        assert.strictEqual(strings.format2('Foo {foo} Bar', { foo: 'bar' }), 'Foo bar Bar');
        assert.strictEqual(strings.format2('Foo {foo} Bar {foo}', { foo: 'bar' }), 'Foo bar Bar bar');
        assert.strictEqual(strings.format2('Foo {foo} Bar {bar}{boo}', { foo: 'bar' }), 'Foo bar Bar {bar}{boo}');
        assert.strictEqual(strings.format2('Foo {foo} Bar {bar}{boo}', { foo: 'bar', bar: 'undefined' }), 'Foo bar Bar undefined{boo}');
        assert.strictEqual(strings.format2('Foo {foo} Bar {bar}{boo}', { foo: 'bar', bar: '5', boo: false }), 'Foo bar Bar 5false');
        assert.strictEqual(strings.format2('Foo {foo} Bar. {bar}', { foo: '(foo)', bar: '.test' }), 'Foo (foo) Bar. .test');
    });
    test('lcut', () => {
        assert.strictEqual(strings.lcut('foo bar', 0), '');
        assert.strictEqual(strings.lcut('foo bar', 1), 'bar');
        assert.strictEqual(strings.lcut('foo bar', 3), 'bar');
        assert.strictEqual(strings.lcut('foo bar', 4), 'bar'); // Leading whitespace trimmed
        assert.strictEqual(strings.lcut('foo bar', 5), 'foo bar');
        assert.strictEqual(strings.lcut('test string 0.1.2.3', 3), '2.3');
        assert.strictEqual(strings.lcut('foo bar', 0, '…'), '…');
        assert.strictEqual(strings.lcut('foo bar', 1, '…'), '…bar');
        assert.strictEqual(strings.lcut('foo bar', 3, '…'), '…bar');
        assert.strictEqual(strings.lcut('foo bar', 4, '…'), '…bar'); // Leading whitespace trimmed
        assert.strictEqual(strings.lcut('foo bar', 5, '…'), 'foo bar');
        assert.strictEqual(strings.lcut('test string 0.1.2.3', 3, '…'), '…2.3');
        assert.strictEqual(strings.lcut('', 10), '');
        assert.strictEqual(strings.lcut('a', 10), 'a');
        assert.strictEqual(strings.lcut(' a', 10), 'a');
        assert.strictEqual(strings.lcut('            a', 10), 'a');
        assert.strictEqual(strings.lcut(' bbbb       a', 10), 'bbbb       a');
        assert.strictEqual(strings.lcut('............a', 10), '............a');
        assert.strictEqual(strings.lcut('', 10, '…'), '');
        assert.strictEqual(strings.lcut('a', 10, '…'), 'a');
        assert.strictEqual(strings.lcut(' a', 10, '…'), 'a');
        assert.strictEqual(strings.lcut('            a', 10, '…'), 'a');
        assert.strictEqual(strings.lcut(' bbbb       a', 10, '…'), 'bbbb       a');
        assert.strictEqual(strings.lcut('............a', 10, '…'), '............a');
    });
    suite('rcut', () => {
        test('basic truncation', () => {
            assert.strictEqual(strings.rcut('foo bar', 0), 'foo');
            assert.strictEqual(strings.rcut('foo bar', 1), 'foo');
            assert.strictEqual(strings.rcut('foo bar', 4), 'foo');
            assert.strictEqual(strings.rcut('foo bar', 7), 'foo bar');
            assert.strictEqual(strings.rcut('test string 0.1.2.3', 3), 'test');
        });
        test('truncation with suffix', () => {
            assert.strictEqual(strings.rcut('foo bar', 0, '…'), 'foo…');
            assert.strictEqual(strings.rcut('foo bar', 1, '…'), 'foo…');
            assert.strictEqual(strings.rcut('foo bar', 4, '…'), 'foo…');
            assert.strictEqual(strings.rcut('foo bar', 7, '…'), 'foo bar');
            assert.strictEqual(strings.rcut('test string 0.1.2.3', 3, '…'), 'test…');
        });
    });
    test('escape', () => {
        assert.strictEqual(strings.escape(''), '');
        assert.strictEqual(strings.escape('foo'), 'foo');
        assert.strictEqual(strings.escape('foo bar'), 'foo bar');
        assert.strictEqual(strings.escape('<foo bar>'), '&lt;foo bar&gt;');
        assert.strictEqual(strings.escape('<foo>Hello</foo>'), '&lt;foo&gt;Hello&lt;/foo&gt;');
    });
    test('ltrim', () => {
        assert.strictEqual(strings.ltrim('foo', 'f'), 'oo');
        assert.strictEqual(strings.ltrim('foo', 'o'), 'foo');
        assert.strictEqual(strings.ltrim('http://www.test.de', 'http://'), 'www.test.de');
        assert.strictEqual(strings.ltrim('/foo/', '/'), 'foo/');
        assert.strictEqual(strings.ltrim('//foo/', '/'), 'foo/');
        assert.strictEqual(strings.ltrim('/', ''), '/');
        assert.strictEqual(strings.ltrim('/', '/'), '');
        assert.strictEqual(strings.ltrim('///', '/'), '');
        assert.strictEqual(strings.ltrim('', ''), '');
        assert.strictEqual(strings.ltrim('', '/'), '');
    });
    test('rtrim', () => {
        assert.strictEqual(strings.rtrim('foo', 'o'), 'f');
        assert.strictEqual(strings.rtrim('foo', 'f'), 'foo');
        assert.strictEqual(strings.rtrim('http://www.test.de', '.de'), 'http://www.test');
        assert.strictEqual(strings.rtrim('/foo/', '/'), '/foo');
        assert.strictEqual(strings.rtrim('/foo//', '/'), '/foo');
        assert.strictEqual(strings.rtrim('/', ''), '/');
        assert.strictEqual(strings.rtrim('/', '/'), '');
        assert.strictEqual(strings.rtrim('///', '/'), '');
        assert.strictEqual(strings.rtrim('', ''), '');
        assert.strictEqual(strings.rtrim('', '/'), '');
    });
    test('trim', () => {
        assert.strictEqual(strings.trim(' foo '), 'foo');
        assert.strictEqual(strings.trim('  foo'), 'foo');
        assert.strictEqual(strings.trim('bar  '), 'bar');
        assert.strictEqual(strings.trim('   '), '');
        assert.strictEqual(strings.trim('foo bar', 'bar'), 'foo ');
    });
    test('trimWhitespace', () => {
        assert.strictEqual(' foo '.trim(), 'foo');
        assert.strictEqual('	 foo	'.trim(), 'foo');
        assert.strictEqual('  foo'.trim(), 'foo');
        assert.strictEqual('bar  '.trim(), 'bar');
        assert.strictEqual('   '.trim(), '');
        assert.strictEqual(' 	  '.trim(), '');
    });
    test('lastNonWhitespaceIndex', () => {
        assert.strictEqual(strings.lastNonWhitespaceIndex('abc  \t \t '), 2);
        assert.strictEqual(strings.lastNonWhitespaceIndex('abc'), 2);
        assert.strictEqual(strings.lastNonWhitespaceIndex('abc\t'), 2);
        assert.strictEqual(strings.lastNonWhitespaceIndex('abc '), 2);
        assert.strictEqual(strings.lastNonWhitespaceIndex('abc  \t \t '), 2);
        assert.strictEqual(strings.lastNonWhitespaceIndex('abc  \t \t abc \t \t '), 11);
        assert.strictEqual(strings.lastNonWhitespaceIndex('abc  \t \t abc \t \t ', 8), 2);
        assert.strictEqual(strings.lastNonWhitespaceIndex('  \t \t '), -1);
    });
    test('containsRTL', () => {
        assert.strictEqual(strings.containsRTL('a'), false);
        assert.strictEqual(strings.containsRTL(''), false);
        assert.strictEqual(strings.containsRTL(strings.UTF8_BOM_CHARACTER + 'a'), false);
        assert.strictEqual(strings.containsRTL('hello world!'), false);
        assert.strictEqual(strings.containsRTL('a📚📚b'), false);
        assert.strictEqual(strings.containsRTL('هناك حقيقة مثبتة منذ زمن طويل'), true);
        assert.strictEqual(strings.containsRTL('זוהי עובדה מבוססת שדעתו'), true);
    });
    test('issue #115221: isEmojiImprecise misses ⭐', () => {
        const codePoint = strings.getNextCodePoint('⭐', '⭐'.length, 0);
        assert.strictEqual(strings.isEmojiImprecise(codePoint), true);
    });
    test('isBasicASCII', () => {
        function assertIsBasicASCII(str, expected) {
            assert.strictEqual(strings.isBasicASCII(str), expected, str + ` (${str.charCodeAt(0)})`);
        }
        assertIsBasicASCII('abcdefghijklmnopqrstuvwxyz', true);
        assertIsBasicASCII('ABCDEFGHIJKLMNOPQRSTUVWXYZ', true);
        assertIsBasicASCII('1234567890', true);
        assertIsBasicASCII('`~!@#$%^&*()-_=+[{]}\\|;:\'",<.>/?', true);
        assertIsBasicASCII(' ', true);
        assertIsBasicASCII('\t', true);
        assertIsBasicASCII('\n', true);
        assertIsBasicASCII('\r', true);
        let ALL = '\r\t\n';
        for (let i = 32; i < 127; i++) {
            ALL += String.fromCharCode(i);
        }
        assertIsBasicASCII(ALL, true);
        assertIsBasicASCII(String.fromCharCode(31), false);
        assertIsBasicASCII(String.fromCharCode(127), false);
        assertIsBasicASCII('ü', false);
        assertIsBasicASCII('a📚📚b', false);
    });
    test('createRegExp', () => {
        // Empty
        assert.throws(() => strings.createRegExp('', false));
        // Escapes appropriately
        assert.strictEqual(strings.createRegExp('abc', false).source, 'abc');
        assert.strictEqual(strings.createRegExp('([^ ,.]*)', false).source, '\\(\\[\\^ ,\\.\\]\\*\\)');
        assert.strictEqual(strings.createRegExp('([^ ,.]*)', true).source, '([^ ,.]*)');
        // Whole word
        assert.strictEqual(strings.createRegExp('abc', false, { wholeWord: true }).source, '\\babc\\b');
        assert.strictEqual(strings.createRegExp('abc', true, { wholeWord: true }).source, '\\babc\\b');
        assert.strictEqual(strings.createRegExp(' abc', true, { wholeWord: true }).source, ' abc\\b');
        assert.strictEqual(strings.createRegExp('abc ', true, { wholeWord: true }).source, '\\babc ');
        assert.strictEqual(strings.createRegExp(' abc ', true, { wholeWord: true }).source, ' abc ');
        const regExpWithoutFlags = strings.createRegExp('abc', true);
        assert(!regExpWithoutFlags.global);
        assert(regExpWithoutFlags.ignoreCase);
        assert(!regExpWithoutFlags.multiline);
        const regExpWithFlags = strings.createRegExp('abc', true, {
            global: true,
            matchCase: true,
            multiline: true,
        });
        assert(regExpWithFlags.global);
        assert(!regExpWithFlags.ignoreCase);
        assert(regExpWithFlags.multiline);
    });
    test('getLeadingWhitespace', () => {
        assert.strictEqual(strings.getLeadingWhitespace('  foo'), '  ');
        assert.strictEqual(strings.getLeadingWhitespace('  foo', 2), '');
        assert.strictEqual(strings.getLeadingWhitespace('  foo', 1, 1), '');
        assert.strictEqual(strings.getLeadingWhitespace('  foo', 0, 1), ' ');
        assert.strictEqual(strings.getLeadingWhitespace('  '), '  ');
        assert.strictEqual(strings.getLeadingWhitespace('  ', 1), ' ');
        assert.strictEqual(strings.getLeadingWhitespace('  ', 0, 1), ' ');
        assert.strictEqual(strings.getLeadingWhitespace('\t\tfunction foo(){', 0, 1), '\t');
        assert.strictEqual(strings.getLeadingWhitespace('\t\tfunction foo(){', 0, 2), '\t\t');
    });
    test('fuzzyContains', () => {
        assert.ok(!strings.fuzzyContains(undefined, null));
        assert.ok(strings.fuzzyContains('hello world', 'h'));
        assert.ok(!strings.fuzzyContains('hello world', 'q'));
        assert.ok(strings.fuzzyContains('hello world', 'hw'));
        assert.ok(strings.fuzzyContains('hello world', 'horl'));
        assert.ok(strings.fuzzyContains('hello world', 'd'));
        assert.ok(!strings.fuzzyContains('hello world', 'wh'));
        assert.ok(!strings.fuzzyContains('d', 'dd'));
    });
    test('startsWithUTF8BOM', () => {
        assert(strings.startsWithUTF8BOM(strings.UTF8_BOM_CHARACTER));
        assert(strings.startsWithUTF8BOM(strings.UTF8_BOM_CHARACTER + 'a'));
        assert(strings.startsWithUTF8BOM(strings.UTF8_BOM_CHARACTER + 'aaaaaaaaaa'));
        assert(!strings.startsWithUTF8BOM(' ' + strings.UTF8_BOM_CHARACTER));
        assert(!strings.startsWithUTF8BOM('foo'));
        assert(!strings.startsWithUTF8BOM(''));
    });
    test('stripUTF8BOM', () => {
        assert.strictEqual(strings.stripUTF8BOM(strings.UTF8_BOM_CHARACTER), '');
        assert.strictEqual(strings.stripUTF8BOM(strings.UTF8_BOM_CHARACTER + 'foobar'), 'foobar');
        assert.strictEqual(strings.stripUTF8BOM('foobar' + strings.UTF8_BOM_CHARACTER), 'foobar' + strings.UTF8_BOM_CHARACTER);
        assert.strictEqual(strings.stripUTF8BOM('abc'), 'abc');
        assert.strictEqual(strings.stripUTF8BOM(''), '');
    });
    test('containsUppercaseCharacter', () => {
        ;
        [
            [null, false],
            ['', false],
            ['foo', false],
            ['föö', false],
            ['ناك', false],
            ['מבוססת', false],
            ['😀', false],
            ['(#@()*&%()@*#&09827340982374}{:">?></\'\\~`', false],
            ['Foo', true],
            ['FOO', true],
            ['FöÖ', true],
            ['FöÖ', true],
            ['\\Foo', true],
        ].forEach(([str, result]) => {
            assert.strictEqual(strings.containsUppercaseCharacter(str), result, `Wrong result for ${str}`);
        });
    });
    test('containsUppercaseCharacter (ignoreEscapedChars)', () => {
        ;
        [
            ['\\Woo', false],
            ['f\\S\\S', false],
            ['foo', false],
            ['Foo', true],
        ].forEach(([str, result]) => {
            assert.strictEqual(strings.containsUppercaseCharacter(str, true), result, `Wrong result for ${str}`);
        });
    });
    test('uppercaseFirstLetter', () => {
        ;
        [
            ['', ''],
            ['foo', 'Foo'],
            ['f', 'F'],
            ['123', '123'],
            ['.a', '.a'],
        ].forEach(([inStr, result]) => {
            assert.strictEqual(strings.uppercaseFirstLetter(inStr), result, `Wrong result for ${inStr}`);
        });
    });
    test('getNLines', () => {
        assert.strictEqual(strings.getNLines('', 5), '');
        assert.strictEqual(strings.getNLines('foo', 5), 'foo');
        assert.strictEqual(strings.getNLines('foo\nbar', 5), 'foo\nbar');
        assert.strictEqual(strings.getNLines('foo\nbar', 2), 'foo\nbar');
        assert.strictEqual(strings.getNLines('foo\nbar', 1), 'foo');
        assert.strictEqual(strings.getNLines('foo\nbar'), 'foo');
        assert.strictEqual(strings.getNLines('foo\nbar\nsomething', 2), 'foo\nbar');
        assert.strictEqual(strings.getNLines('foo', 0), '');
    });
    test('getGraphemeBreakType', () => {
        assert.strictEqual(strings.getGraphemeBreakType(0xbc1), 7 /* strings.GraphemeBreakType.SpacingMark */);
    });
    test('truncate', () => {
        assert.strictEqual('hello world', strings.truncate('hello world', 100));
        assert.strictEqual('hello…', strings.truncate('hello world', 5));
    });
    test('truncateMiddle', () => {
        assert.strictEqual('hello world', strings.truncateMiddle('hello world', 100));
        assert.strictEqual('he…ld', strings.truncateMiddle('hello world', 5));
    });
    test('replaceAsync', async () => {
        let i = 0;
        assert.strictEqual(await strings.replaceAsync('abcabcabcabc', /b(.)/g, async (match, after) => {
            assert.strictEqual(match, 'bc');
            assert.strictEqual(after, 'c');
            return `${i++}${after}`;
        }), 'a0ca1ca2ca3c');
    });
    suite('removeAnsiEscapeCodes', () => {
        function testSequence(sequence) {
            assert.strictEqual(strings.removeAnsiEscapeCodes(`hello${sequence}world`), 'helloworld', `expect to remove ${JSON.stringify(sequence)}`);
            assert.deepStrictEqual([...strings.forAnsiStringParts(`hello${sequence}world`)], [
                { isCode: false, str: 'hello' },
                { isCode: true, str: sequence },
                { isCode: false, str: 'world' },
            ], `expect to forAnsiStringParts ${JSON.stringify(sequence)}`);
        }
        test('CSI sequences', () => {
            const CSI = '\x1b[';
            const sequences = [
                // Base cases from https://invisible-island.net/xterm/ctlseqs/ctlseqs.html#h3-Functions-using-CSI-_-ordered-by-the-final-character_s_
                `${CSI}42@`,
                `${CSI}42 @`,
                `${CSI}42A`,
                `${CSI}42 A`,
                `${CSI}42B`,
                `${CSI}42C`,
                `${CSI}42D`,
                `${CSI}42E`,
                `${CSI}42F`,
                `${CSI}42G`,
                `${CSI}42;42H`,
                `${CSI}42I`,
                `${CSI}42J`,
                `${CSI}?42J`,
                `${CSI}42K`,
                `${CSI}?42K`,
                `${CSI}42L`,
                `${CSI}42M`,
                `${CSI}42P`,
                `${CSI}#P`,
                `${CSI}3#P`,
                `${CSI}#Q`,
                `${CSI}3#Q`,
                `${CSI}#R`,
                `${CSI}42S`,
                `${CSI}?1;2;3S`,
                `${CSI}42T`,
                `${CSI}42;42;42;42;42T`,
                `${CSI}>3T`,
                `${CSI}42X`,
                `${CSI}42Z`,
                `${CSI}42^`,
                `${CSI}42\``,
                `${CSI}42a`,
                `${CSI}42b`,
                `${CSI}42c`,
                `${CSI}=42c`,
                `${CSI}>42c`,
                `${CSI}42d`,
                `${CSI}42e`,
                `${CSI}42;42f`,
                `${CSI}42g`,
                `${CSI}3h`,
                `${CSI}?3h`,
                `${CSI}42i`,
                `${CSI}?42i`,
                `${CSI}3l`,
                `${CSI}?3l`,
                `${CSI}3m`,
                `${CSI}>0;0m`,
                `${CSI}>0m`,
                `${CSI}?0m`,
                `${CSI}42n`,
                `${CSI}>42n`,
                `${CSI}?42n`,
                `${CSI}>42p`,
                `${CSI}!p`,
                `${CSI}0;0"p`,
                `${CSI}42$p`,
                `${CSI}?42$p`,
                `${CSI}#p`,
                `${CSI}3#p`,
                `${CSI}>42q`,
                `${CSI}42q`,
                `${CSI}42 q`,
                `${CSI}42"q`,
                `${CSI}#q`,
                `${CSI}42;42r`,
                `${CSI}?3r`,
                `${CSI}0;0;0;0;3$r`,
                `${CSI}s`,
                `${CSI}0;0s`,
                `${CSI}>42s`,
                `${CSI}?3s`,
                `${CSI}42;42;42t`,
                `${CSI}>3t`,
                `${CSI}42 t`,
                `${CSI}0;0;0;0;3$t`,
                `${CSI}u`,
                `${CSI}42 u`,
                `${CSI}0;0;0;0;0;0;0;0$v`,
                `${CSI}42$w`,
                `${CSI}0;0;0;0'w`,
                `${CSI}42x`,
                `${CSI}42*x`,
                `${CSI}0;0;0;0;0$x`,
                `${CSI}42#y`,
                `${CSI}0;0;0;0;0;0*y`,
                `${CSI}42;0'z`,
                `${CSI}0;1;2;4$z`,
                `${CSI}3'{`,
                `${CSI}#{`,
                `${CSI}3#{`,
                `${CSI}0;0;0;0\${`,
                `${CSI}0;0;0;0#|`,
                `${CSI}42$|`,
                `${CSI}42'|`,
                `${CSI}42*|`,
                `${CSI}#}`,
                `${CSI}42'}`,
                `${CSI}42$}`,
                `${CSI}42'~`,
                `${CSI}42$~`,
                // Common SGR cases:
                `${CSI}1;31m`, // multiple attrs
                `${CSI}105m`, // bright background
                `${CSI}48:5:128m`, // 256 indexed color
                `${CSI}48;5;128m`, // 256 indexed color alt
                `${CSI}38:2:0:255:255:255m`, // truecolor
                `${CSI}38;2;255;255;255m`, // truecolor alt
            ];
            for (const sequence of sequences) {
                testSequence(sequence);
            }
        });
        suite('OSC sequences', () => {
            function testOscSequence(prefix, suffix) {
                const sequenceContent = [
                    `633;SetMark;`,
                    `633;P;Cwd=/foo`,
                    `7;file://local/Users/me/foo/bar`,
                ];
                const sequences = [];
                for (const content of sequenceContent) {
                    sequences.push(`${prefix}${content}${suffix}`);
                }
                for (const sequence of sequences) {
                    testSequence(sequence);
                }
            }
            test('ESC ] Ps ; Pt ESC \\', () => {
                testOscSequence('\x1b]', '\x1b\\');
            });
            test('ESC ] Ps ; Pt BEL', () => {
                testOscSequence('\x1b]', '\x07');
            });
            test('ESC ] Ps ; Pt ST', () => {
                testOscSequence('\x1b]', '\x9c');
            });
            test('OSC Ps ; Pt ESC \\', () => {
                testOscSequence('\x9d', '\x1b\\');
            });
            test('OSC Ps ; Pt BEL', () => {
                testOscSequence('\x9d', '\x07');
            });
            test('OSC Ps ; Pt ST', () => {
                testOscSequence('\x9d', '\x9c');
            });
        });
        test('ESC sequences', () => {
            const sequenceContent = [
                ` F`,
                ` G`,
                ` L`,
                ` M`,
                ` N`,
                `#3`,
                `#4`,
                `#5`,
                `#6`,
                `#8`,
                `%@`,
                `%G`,
                `(C`,
                `)C`,
                `*C`,
                `+C`,
                `-C`,
                `.C`,
                `/C`,
            ];
            const sequences = [];
            for (const content of sequenceContent) {
                sequences.push(`\x1b${content}`);
            }
            for (const sequence of sequences) {
                testSequence(sequence);
            }
        });
        suite('regression tests', () => {
            test('#209937', () => {
                assert.strictEqual(strings.removeAnsiEscapeCodes(`localhost:\x1b[31m1234`), 'localhost:1234');
            });
        });
    });
    test('removeAnsiEscapeCodesFromPrompt', () => {
        assert.strictEqual(strings.removeAnsiEscapeCodesFromPrompt('\u001b[31m$ \u001b[0m'), '$ ');
        assert.strictEqual(strings.removeAnsiEscapeCodesFromPrompt('\n\\[\u001b[01;34m\\]\\w\\[\u001b[00m\\]\n\\[\u001b[1;32m\\]> \\[\u001b[0m\\]'), '\n\\w\n> ');
    });
    test('count', () => {
        assert.strictEqual(strings.count('hello world', 'o'), 2);
        assert.strictEqual(strings.count('hello world', 'l'), 3);
        assert.strictEqual(strings.count('hello world', 'z'), 0);
        assert.strictEqual(strings.count('hello world', 'hello'), 1);
        assert.strictEqual(strings.count('hello world', 'world'), 1);
        assert.strictEqual(strings.count('hello world', 'hello world'), 1);
        assert.strictEqual(strings.count('hello world', 'foo'), 0);
    });
    test('containsAmbiguousCharacter', () => {
        assert.strictEqual(strings.AmbiguousCharacters.getInstance(new Set()).containsAmbiguousCharacter('abcd'), false);
        assert.strictEqual(strings.AmbiguousCharacters.getInstance(new Set()).containsAmbiguousCharacter('üå'), false);
        assert.strictEqual(strings.AmbiguousCharacters.getInstance(new Set()).containsAmbiguousCharacter('(*&^)'), false);
        assert.strictEqual(strings.AmbiguousCharacters.getInstance(new Set()).containsAmbiguousCharacter('ο'), true);
        assert.strictEqual(strings.AmbiguousCharacters.getInstance(new Set()).containsAmbiguousCharacter('abɡc'), true);
    });
    test('containsInvisibleCharacter', () => {
        assert.strictEqual(strings.InvisibleCharacters.containsInvisibleCharacter('abcd'), false);
        assert.strictEqual(strings.InvisibleCharacters.containsInvisibleCharacter(' '), true);
        assert.strictEqual(strings.InvisibleCharacters.containsInvisibleCharacter('a\u{e004e}b'), true);
        assert.strictEqual(strings.InvisibleCharacters.containsInvisibleCharacter('a\u{e015a}\u000bb'), true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
test('htmlAttributeEncodeValue', () => {
    assert.strictEqual(strings.htmlAttributeEncodeValue(''), '');
    assert.strictEqual(strings.htmlAttributeEncodeValue('abc'), 'abc');
    assert.strictEqual(strings.htmlAttributeEncodeValue('<script>alert("Hello")</script>'), '&lt;script&gt;alert(&quot;Hello&quot;)&lt;/script&gt;');
    assert.strictEqual(strings.htmlAttributeEncodeValue('Hello & World'), 'Hello &amp; World');
    assert.strictEqual(strings.htmlAttributeEncodeValue('"Hello"'), '&quot;Hello&quot;');
    assert.strictEqual(strings.htmlAttributeEncodeValue("'Hello'"), '&apos;Hello&apos;');
    assert.strictEqual(strings.htmlAttributeEncodeValue('<>&\'"'), '&lt;&gt;&amp;&apos;&quot;');
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyaW5ncy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9zdHJpbmdzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxPQUFPLE1BQU0seUJBQXlCLENBQUE7QUFDbEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRXBFLEtBQUssQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO0lBQ3JCLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDN0IsTUFBTSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJ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LEdBQUcsS0FBSztnQkFDWCxHQUFHLEdBQUcsSUFBSTtnQkFDVixHQUFHLEdBQUcsS0FBSztnQkFDWCxHQUFHLEdBQUcsSUFBSTtnQkFDVixHQUFHLEdBQUcsS0FBSztnQkFDWCxHQUFHLEdBQUcsSUFBSTtnQkFDVixHQUFHLEdBQUcsS0FBSztnQkFDWCxHQUFHLEdBQUcsU0FBUztnQkFDZixHQUFHLEdBQUcsS0FBSztnQkFDWCxHQUFHLEdBQUcsaUJBQWlCO2dCQUN2QixHQUFHLEdBQUcsS0FBSztnQkFDWCxHQUFHLEdBQUcsS0FBSztnQkFDWCxHQUFHLEdBQUcsS0FBSztnQkFDWCxHQUFHLEdBQUcsS0FBSztnQkFDWCxHQUFHLEdBQUcsTUFBTTtnQkFDWixHQUFHLEdBQUcsS0FBSztnQkFDWCxHQUFHLEdBQUcsS0FBSztnQkFDWCxHQUFHLEdBQUcsS0FBSztnQkFDWCxHQUFHLEdBQUcsTUFBTTtnQkFDWixHQUFHLEdBQUcsTUFBTTtnQkFDWixHQUFHLEdBQUcsS0FBSztnQkFDWCxHQUFHLEdBQUcsS0FBSztnQkFDWCxHQUFHLEdBQUcsUUFBUTtnQkFDZCxHQUFHLEdBQUcsS0FBSztnQkFDWCxHQUFHLEdBQUcsSUFBSTtnQkFDVixHQUFHLEdBQUcsS0FBSztnQkFDWCxHQUFHLEdBQUcsS0FBSztnQkFDWCxHQUFHLEdBQUcsTUFBTTtnQkFDWixHQUFHLEdBQUcsSUFBSTtnQkFDVixHQUFHLEdBQUcsS0FBSztnQkFDWCxHQUFHLEdBQUcsSUFBSTtnQkFDVixHQUFHLEdBQUcsT0FBTztnQkFDYixHQUFHLEdBQUcsS0FBSztnQkFDWCxHQUFHLEdBQUcsS0FBSztnQkFDWCxHQUFHLEdBQUcsS0FBSztnQkFDWCxHQUFHLEdBQUcsTUFBTTtnQkFDWixHQUFHLEdBQUcsTUFBTTtnQkFDWixHQUFHLEdBQUcsTUFBTTtnQkFDWixHQUFHLEdBQUcsSUFBSTtnQkFDVixHQUFHLEdBQUcsT0FBTztnQkFDYixHQUFHLEdBQUcsTUFBTTtnQkFDWixHQUFHLEdBQUcsT0FBTztnQkFDYixHQUFHLEdBQUcsSUFBSTtnQkFD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