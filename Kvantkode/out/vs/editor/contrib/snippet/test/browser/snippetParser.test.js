/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Choice, FormatString, Placeholder, Scanner, SnippetParser, Text, TextmateSnippet, Transform, Variable, } from '../../browser/snippetParser.js';
suite('SnippetParser', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Scanner', () => {
        const scanner = new Scanner();
        assert.strictEqual(scanner.next().type, 14 /* TokenType.EOF */);
        scanner.text('abc');
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 14 /* TokenType.EOF */);
        scanner.text('{{abc}}');
        assert.strictEqual(scanner.next().type, 3 /* TokenType.CurlyOpen */);
        assert.strictEqual(scanner.next().type, 3 /* TokenType.CurlyOpen */);
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 4 /* TokenType.CurlyClose */);
        assert.strictEqual(scanner.next().type, 4 /* TokenType.CurlyClose */);
        assert.strictEqual(scanner.next().type, 14 /* TokenType.EOF */);
        scanner.text('abc() ');
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 10 /* TokenType.Format */);
        assert.strictEqual(scanner.next().type, 14 /* TokenType.EOF */);
        scanner.text('abc 123');
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 10 /* TokenType.Format */);
        assert.strictEqual(scanner.next().type, 8 /* TokenType.Int */);
        assert.strictEqual(scanner.next().type, 14 /* TokenType.EOF */);
        scanner.text('$foo');
        assert.strictEqual(scanner.next().type, 0 /* TokenType.Dollar */);
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 14 /* TokenType.EOF */);
        scanner.text('$foo_bar');
        assert.strictEqual(scanner.next().type, 0 /* TokenType.Dollar */);
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 14 /* TokenType.EOF */);
        scanner.text('$foo-bar');
        assert.strictEqual(scanner.next().type, 0 /* TokenType.Dollar */);
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 12 /* TokenType.Dash */);
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 14 /* TokenType.EOF */);
        scanner.text('${foo}');
        assert.strictEqual(scanner.next().type, 0 /* TokenType.Dollar */);
        assert.strictEqual(scanner.next().type, 3 /* TokenType.CurlyOpen */);
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 4 /* TokenType.CurlyClose */);
        assert.strictEqual(scanner.next().type, 14 /* TokenType.EOF */);
        scanner.text('${1223:foo}');
        assert.strictEqual(scanner.next().type, 0 /* TokenType.Dollar */);
        assert.strictEqual(scanner.next().type, 3 /* TokenType.CurlyOpen */);
        assert.strictEqual(scanner.next().type, 8 /* TokenType.Int */);
        assert.strictEqual(scanner.next().type, 1 /* TokenType.Colon */);
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 4 /* TokenType.CurlyClose */);
        assert.strictEqual(scanner.next().type, 14 /* TokenType.EOF */);
        scanner.text('\\${}');
        assert.strictEqual(scanner.next().type, 5 /* TokenType.Backslash */);
        assert.strictEqual(scanner.next().type, 0 /* TokenType.Dollar */);
        assert.strictEqual(scanner.next().type, 3 /* TokenType.CurlyOpen */);
        assert.strictEqual(scanner.next().type, 4 /* TokenType.CurlyClose */);
        scanner.text('${foo/regex/format/option}');
        assert.strictEqual(scanner.next().type, 0 /* TokenType.Dollar */);
        assert.strictEqual(scanner.next().type, 3 /* TokenType.CurlyOpen */);
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 6 /* TokenType.Forwardslash */);
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 6 /* TokenType.Forwardslash */);
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 6 /* TokenType.Forwardslash */);
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 4 /* TokenType.CurlyClose */);
        assert.strictEqual(scanner.next().type, 14 /* TokenType.EOF */);
    });
    function assertText(value, expected) {
        const actual = SnippetParser.asInsertText(value);
        assert.strictEqual(actual, expected);
    }
    function assertMarker(input, ...ctors) {
        let marker;
        if (input instanceof TextmateSnippet) {
            marker = [...input.children];
        }
        else if (typeof input === 'string') {
            const p = new SnippetParser();
            marker = p.parse(input).children;
        }
        else {
            marker = [...input];
        }
        while (marker.length > 0) {
            const m = marker.pop();
            const ctor = ctors.pop();
            assert.ok(m instanceof ctor);
        }
        assert.strictEqual(marker.length, ctors.length);
        assert.strictEqual(marker.length, 0);
    }
    function assertTextAndMarker(value, escaped, ...ctors) {
        assertText(value, escaped);
        assertMarker(value, ...ctors);
    }
    function assertEscaped(value, expected) {
        const actual = SnippetParser.escape(value);
        assert.strictEqual(actual, expected);
    }
    test('Parser, escaped', function () {
        assertEscaped('foo$0', 'foo\\$0');
        assertEscaped('foo\\$0', 'foo\\\\\\$0');
        assertEscaped('f$1oo$0', 'f\\$1oo\\$0');
        assertEscaped('${1:foo}$0', '\\${1:foo\\}\\$0');
        assertEscaped('$', '\\$');
    });
    test('Parser, text', () => {
        assertText('$', '$');
        assertText('\\\\$', '\\$');
        assertText('{', '{');
        assertText('\\}', '}');
        assertText('\\abc', '\\abc');
        assertText('foo${f:\\}}bar', 'foo}bar');
        assertText('\\{', '\\{');
        assertText('I need \\\\\\$', 'I need \\$');
        assertText('\\', '\\');
        assertText('\\{{', '\\{{');
        assertText('{{', '{{');
        assertText('{{dd', '{{dd');
        assertText('}}', '}}');
        assertText('ff}}', 'ff}}');
        assertText('farboo', 'farboo');
        assertText('far{{}}boo', 'far{{}}boo');
        assertText('far{{123}}boo', 'far{{123}}boo');
        assertText('far\\{{123}}boo', 'far\\{{123}}boo');
        assertText('far{{id:bern}}boo', 'far{{id:bern}}boo');
        assertText('far{{id:bern {{basel}}}}boo', 'far{{id:bern {{basel}}}}boo');
        assertText('far{{id:bern {{id:basel}}}}boo', 'far{{id:bern {{id:basel}}}}boo');
        assertText('far{{id:bern {{id2:basel}}}}boo', 'far{{id:bern {{id2:basel}}}}boo');
    });
    test('Parser, TM text', () => {
        assertTextAndMarker('foo${1:bar}}', 'foobar}', Text, Placeholder, Text);
        assertTextAndMarker('foo${1:bar}${2:foo}}', 'foobarfoo}', Text, Placeholder, Placeholder, Text);
        assertTextAndMarker('foo${1:bar\\}${2:foo}}', 'foobar}foo', Text, Placeholder);
        const [, placeholder] = new SnippetParser().parse('foo${1:bar\\}${2:foo}}').children;
        const { children } = placeholder;
        assert.strictEqual(placeholder.index, 1);
        assert.ok(children[0] instanceof Text);
        assert.strictEqual(children[0].toString(), 'bar}');
        assert.ok(children[1] instanceof Placeholder);
        assert.strictEqual(children[1].toString(), 'foo');
    });
    test('Parser, placeholder', () => {
        assertTextAndMarker('farboo', 'farboo', Text);
        assertTextAndMarker('far{{}}boo', 'far{{}}boo', Text);
        assertTextAndMarker('far{{123}}boo', 'far{{123}}boo', Text);
        assertTextAndMarker('far\\{{123}}boo', 'far\\{{123}}boo', Text);
    });
    test('Parser, literal code', () => {
        assertTextAndMarker('far`123`boo', 'far`123`boo', Text);
        assertTextAndMarker('far\\`123\\`boo', 'far\\`123\\`boo', Text);
    });
    test('Parser, variables/tabstop', () => {
        assertTextAndMarker('$far-boo', '-boo', Variable, Text);
        assertTextAndMarker('\\$far-boo', '$far-boo', Text);
        assertTextAndMarker('far$farboo', 'far', Text, Variable);
        assertTextAndMarker('far${farboo}', 'far', Text, Variable);
        assertTextAndMarker('$123', '', Placeholder);
        assertTextAndMarker('$farboo', '', Variable);
        assertTextAndMarker('$far12boo', '', Variable);
        assertTextAndMarker('000_${far}_000', '000__000', Text, Variable, Text);
        assertTextAndMarker('FFF_${TM_SELECTED_TEXT}_FFF$0', 'FFF__FFF', Text, Variable, Text, Placeholder);
    });
    test('Parser, variables/placeholder with defaults', () => {
        assertTextAndMarker('${name:value}', 'value', Variable);
        assertTextAndMarker('${1:value}', 'value', Placeholder);
        assertTextAndMarker('${1:bar${2:foo}bar}', 'barfoobar', Placeholder);
        assertTextAndMarker('${name:value', '${name:value', Text);
        assertTextAndMarker('${1:bar${2:foobar}', '${1:barfoobar', Text, Placeholder);
    });
    test('Parser, variable transforms', function () {
        assertTextAndMarker('${foo///}', '', Variable);
        assertTextAndMarker('${foo/regex/format/gmi}', '', Variable);
        assertTextAndMarker('${foo/([A-Z][a-z])/format/}', '', Variable);
        // invalid regex
        assertTextAndMarker('${foo/([A-Z][a-z])/format/GMI}', '${foo/([A-Z][a-z])/format/GMI}', Text);
        assertTextAndMarker('${foo/([A-Z][a-z])/format/funky}', '${foo/([A-Z][a-z])/format/funky}', Text);
        assertTextAndMarker('${foo/([A-Z][a-z]/format/}', '${foo/([A-Z][a-z]/format/}', Text);
        // tricky regex
        assertTextAndMarker('${foo/m\\/atch/$1/i}', '', Variable);
        assertMarker('${foo/regex\/format/options}', Text);
        // incomplete
        assertTextAndMarker('${foo///', '${foo///', Text);
        assertTextAndMarker('${foo/regex/format/options', '${foo/regex/format/options', Text);
        // format string
        assertMarker('${foo/.*/${0:fooo}/i}', Variable);
        assertMarker('${foo/.*/${1}/i}', Variable);
        assertMarker('${foo/.*/$1/i}', Variable);
        assertMarker('${foo/.*/This-$1-encloses/i}', Variable);
        assertMarker('${foo/.*/complex${1:else}/i}', Variable);
        assertMarker('${foo/.*/complex${1:-else}/i}', Variable);
        assertMarker('${foo/.*/complex${1:+if}/i}', Variable);
        assertMarker('${foo/.*/complex${1:?if:else}/i}', Variable);
        assertMarker('${foo/.*/complex${1:/upcase}/i}', Variable);
    });
    test('Parser, placeholder transforms', function () {
        assertTextAndMarker('${1///}', '', Placeholder);
        assertTextAndMarker('${1/regex/format/gmi}', '', Placeholder);
        assertTextAndMarker('${1/([A-Z][a-z])/format/}', '', Placeholder);
        // tricky regex
        assertTextAndMarker('${1/m\\/atch/$1/i}', '', Placeholder);
        assertMarker('${1/regex\/format/options}', Text);
        // incomplete
        assertTextAndMarker('${1///', '${1///', Text);
        assertTextAndMarker('${1/regex/format/options', '${1/regex/format/options', Text);
    });
    test('No way to escape forward slash in snippet regex #36715', function () {
        assertMarker('${TM_DIRECTORY/src\\//$1/}', Variable);
    });
    test('No way to escape forward slash in snippet format section #37562', function () {
        assertMarker('${TM_SELECTED_TEXT/a/\\/$1/g}', Variable);
        assertMarker('${TM_SELECTED_TEXT/a/in\\/$1ner/g}', Variable);
        assertMarker('${TM_SELECTED_TEXT/a/end\\//g}', Variable);
    });
    test('Parser, placeholder with choice', () => {
        assertTextAndMarker('${1|one,two,three|}', 'one', Placeholder);
        assertTextAndMarker('${1|one|}', 'one', Placeholder);
        assertTextAndMarker('${1|one1,two2|}', 'one1', Placeholder);
        assertTextAndMarker('${1|one1\\,two2|}', 'one1,two2', Placeholder);
        assertTextAndMarker('${1|one1\\|two2|}', 'one1|two2', Placeholder);
        assertTextAndMarker('${1|one1\\atwo2|}', 'one1\\atwo2', Placeholder);
        assertTextAndMarker('${1|one,two,three,|}', '${1|one,two,three,|}', Text);
        assertTextAndMarker('${1|one,', '${1|one,', Text);
        const snippet = new SnippetParser().parse('${1|one,two,three|}');
        const expected = [
            (m) => m instanceof Placeholder,
            (m) => m instanceof Choice && m.options.length === 3 && m.options.every((x) => x instanceof Text),
        ];
        snippet.walk((marker) => {
            assert.ok(expected.shift()(marker));
            return true;
        });
    });
    test('Snippet choices: unable to escape comma and pipe, #31521', function () {
        assertTextAndMarker('console.log(${1|not\\, not, five, 5, 1   23|});', 'console.log(not, not);', Text, Placeholder, Text);
    });
    test('Marker, toTextmateString()', function () {
        function assertTextsnippetString(input, expected) {
            const snippet = new SnippetParser().parse(input);
            const actual = snippet.toTextmateString();
            assert.strictEqual(actual, expected);
        }
        assertTextsnippetString('$1', '$1');
        assertTextsnippetString('\\$1', '\\$1');
        assertTextsnippetString('console.log(${1|not\\, not, five, 5, 1   23|});', 'console.log(${1|not\\, not, five, 5, 1   23|});');
        assertTextsnippetString('console.log(${1|not\\, not, \\| five, 5, 1   23|});', 'console.log(${1|not\\, not, \\| five, 5, 1   23|});');
        assertTextsnippetString('${1|cho\\,ices,wi\\|th,esc\\\\aping,chall\\\\\\,enges|}', '${1|cho\\,ices,wi\\|th,esc\\\\aping,chall\\\\\\,enges|}');
        assertTextsnippetString('this is text', 'this is text');
        assertTextsnippetString('this ${1:is ${2:nested with $var}}', 'this ${1:is ${2:nested with ${var}}}');
        assertTextsnippetString('this ${1:is ${2:nested with $var}}}', 'this ${1:is ${2:nested with ${var}}}\\}');
    });
    test('Marker, toTextmateString() <-> identity', function () {
        function assertIdent(input) {
            // full loop: (1) parse input, (2) generate textmate string, (3) parse, (4) ensure both trees are equal
            const snippet = new SnippetParser().parse(input);
            const input2 = snippet.toTextmateString();
            const snippet2 = new SnippetParser().parse(input2);
            function checkCheckChildren(marker1, marker2) {
                assert.ok(marker1 instanceof Object.getPrototypeOf(marker2).constructor);
                assert.ok(marker2 instanceof Object.getPrototypeOf(marker1).constructor);
                assert.strictEqual(marker1.children.length, marker2.children.length);
                assert.strictEqual(marker1.toString(), marker2.toString());
                for (let i = 0; i < marker1.children.length; i++) {
                    checkCheckChildren(marker1.children[i], marker2.children[i]);
                }
            }
            checkCheckChildren(snippet, snippet2);
        }
        assertIdent('$1');
        assertIdent('\\$1');
        assertIdent('console.log(${1|not\\, not, five, 5, 1   23|});');
        assertIdent('console.log(${1|not\\, not, \\| five, 5, 1   23|});');
        assertIdent('this is text');
        assertIdent('this ${1:is ${2:nested with $var}}');
        assertIdent('this ${1:is ${2:nested with $var}}}');
        assertIdent('this ${1:is ${2:nested with $var}} and repeating $1');
    });
    test('Parser, choise marker', () => {
        const { placeholders } = new SnippetParser().parse('${1|one,two,three|}');
        assert.strictEqual(placeholders.length, 1);
        assert.ok(placeholders[0].choice instanceof Choice);
        assert.ok(placeholders[0].children[0] instanceof Choice);
        assert.strictEqual(placeholders[0].children[0].options.length, 3);
        assertText('${1|one,two,three|}', 'one');
        assertText('\\${1|one,two,three|}', '${1|one,two,three|}');
        assertText('${1\\|one,two,three|}', '${1\\|one,two,three|}');
        assertText('${1||}', '${1||}');
    });
    test("Backslash character escape in choice tabstop doesn't work #58494", function () {
        const { placeholders } = new SnippetParser().parse('${1|\\,,},$,\\|,\\\\|}');
        assert.strictEqual(placeholders.length, 1);
        assert.ok(placeholders[0].choice instanceof Choice);
    });
    test('Parser, only textmate', () => {
        const p = new SnippetParser();
        assertMarker(p.parse('far{{}}boo'), Text);
        assertMarker(p.parse('far{{123}}boo'), Text);
        assertMarker(p.parse('far\\{{123}}boo'), Text);
        assertMarker(p.parse('far$0boo'), Text, Placeholder, Text);
        assertMarker(p.parse('far${123}boo'), Text, Placeholder, Text);
        assertMarker(p.parse('far\\${123}boo'), Text);
    });
    test('Parser, real world', () => {
        let marker = new SnippetParser().parse('console.warn(${1: $TM_SELECTED_TEXT })').children;
        assert.strictEqual(marker[0].toString(), 'console.warn(');
        assert.ok(marker[1] instanceof Placeholder);
        assert.strictEqual(marker[2].toString(), ')');
        const placeholder = marker[1];
        assert.strictEqual(placeholder.index, 1);
        assert.strictEqual(placeholder.children.length, 3);
        assert.ok(placeholder.children[0] instanceof Text);
        assert.ok(placeholder.children[1] instanceof Variable);
        assert.ok(placeholder.children[2] instanceof Text);
        assert.strictEqual(placeholder.children[0].toString(), ' ');
        assert.strictEqual(placeholder.children[1].toString(), '');
        assert.strictEqual(placeholder.children[2].toString(), ' ');
        const nestedVariable = placeholder.children[1];
        assert.strictEqual(nestedVariable.name, 'TM_SELECTED_TEXT');
        assert.strictEqual(nestedVariable.children.length, 0);
        marker = new SnippetParser().parse('$TM_SELECTED_TEXT').children;
        assert.strictEqual(marker.length, 1);
        assert.ok(marker[0] instanceof Variable);
    });
    test('Parser, transform example', () => {
        const { children } = new SnippetParser().parse('${1:name} : ${2:type}${3/\\s:=(.*)/${1:+ :=}${1}/};\n$0');
        //${1:name}
        assert.ok(children[0] instanceof Placeholder);
        assert.strictEqual(children[0].children.length, 1);
        assert.strictEqual(children[0].children[0].toString(), 'name');
        assert.strictEqual(children[0].transform, undefined);
        // :
        assert.ok(children[1] instanceof Text);
        assert.strictEqual(children[1].toString(), ' : ');
        //${2:type}
        assert.ok(children[2] instanceof Placeholder);
        assert.strictEqual(children[2].children.length, 1);
        assert.strictEqual(children[2].children[0].toString(), 'type');
        //${3/\\s:=(.*)/${1:+ :=}${1}/}
        assert.ok(children[3] instanceof Placeholder);
        assert.strictEqual(children[3].children.length, 0);
        assert.notStrictEqual(children[3].transform, undefined);
        const transform = children[3].transform;
        assert.deepStrictEqual(transform.regexp, /\s:=(.*)/);
        assert.strictEqual(transform.children.length, 2);
        assert.ok(transform.children[0] instanceof FormatString);
        assert.strictEqual(transform.children[0].index, 1);
        assert.strictEqual(transform.children[0].ifValue, ' :=');
        assert.ok(transform.children[1] instanceof FormatString);
        assert.strictEqual(transform.children[1].index, 1);
        assert.ok(children[4] instanceof Text);
        assert.strictEqual(children[4].toString(), ';\n');
    });
    // TODO @jrieken making this strictEqul causes circular json conversion errors
    test('Parser, default placeholder values', () => {
        assertMarker('errorContext: `${1:err}`, error: $1', Text, Placeholder, Text, Placeholder);
        const [, p1, , p2] = new SnippetParser().parse('errorContext: `${1:err}`, error:$1').children;
        assert.strictEqual(p1.index, 1);
        assert.strictEqual(p1.children.length, 1);
        assert.strictEqual(p1.children[0].toString(), 'err');
        assert.strictEqual(p2.index, 1);
        assert.strictEqual(p2.children.length, 1);
        assert.strictEqual(p2.children[0].toString(), 'err');
    });
    // TODO @jrieken making this strictEqul causes circular json conversion errors
    test('Parser, default placeholder values and one transform', () => {
        assertMarker('errorContext: `${1:err}`, error: ${1/err/ok/}', Text, Placeholder, Text, Placeholder);
        const [, p3, , p4] = new SnippetParser().parse('errorContext: `${1:err}`, error:${1/err/ok/}').children;
        assert.strictEqual(p3.index, 1);
        assert.strictEqual(p3.children.length, 1);
        assert.strictEqual(p3.children[0].toString(), 'err');
        assert.strictEqual(p3.transform, undefined);
        assert.strictEqual(p4.index, 1);
        assert.strictEqual(p4.children.length, 1);
        assert.strictEqual(p4.children[0].toString(), 'err');
        assert.notStrictEqual(p4.transform, undefined);
    });
    test('Repeated snippet placeholder should always inherit, #31040', function () {
        assertText('${1:foo}-abc-$1', 'foo-abc-foo');
        assertText('${1:foo}-abc-${1}', 'foo-abc-foo');
        assertText('${1:foo}-abc-${1:bar}', 'foo-abc-foo');
        assertText('${1}-abc-${1:foo}', 'foo-abc-foo');
    });
    test('backspace esapce in TM only, #16212', () => {
        const actual = SnippetParser.asInsertText('Foo \\\\${abc}bar');
        assert.strictEqual(actual, 'Foo \\bar');
    });
    test('colon as variable/placeholder value, #16717', () => {
        let actual = SnippetParser.asInsertText('${TM_SELECTED_TEXT:foo:bar}');
        assert.strictEqual(actual, 'foo:bar');
        actual = SnippetParser.asInsertText('${1:foo:bar}');
        assert.strictEqual(actual, 'foo:bar');
    });
    test('incomplete placeholder', () => {
        assertTextAndMarker('${1:}', '', Placeholder);
    });
    test('marker#len', () => {
        function assertLen(template, ...lengths) {
            const snippet = new SnippetParser().parse(template, true);
            snippet.walk((m) => {
                const expected = lengths.shift();
                assert.strictEqual(m.len(), expected);
                return true;
            });
            assert.strictEqual(lengths.length, 0);
        }
        assertLen('text$0', 4, 0);
        assertLen('$1text$0', 0, 4, 0);
        assertLen('te$1xt$0', 2, 0, 2, 0);
        assertLen('errorContext: `${1:err}`, error: $0', 15, 0, 3, 10, 0);
        assertLen('errorContext: `${1:err}`, error: $1$0', 15, 0, 3, 10, 0, 3, 0);
        assertLen('$TM_SELECTED_TEXT$0', 0, 0);
        assertLen('${TM_SELECTED_TEXT:def}$0', 0, 3, 0);
    });
    test('parser, parent node', function () {
        let snippet = new SnippetParser().parse('This ${1:is ${2:nested}}$0', true);
        assert.strictEqual(snippet.placeholders.length, 3);
        let [first, second] = snippet.placeholders;
        assert.strictEqual(first.index, 1);
        assert.strictEqual(second.index, 2);
        assert.ok(second.parent === first);
        assert.ok(first.parent === snippet);
        snippet = new SnippetParser().parse('${VAR:default${1:value}}$0', true);
        assert.strictEqual(snippet.placeholders.length, 2);
        [first] = snippet.placeholders;
        assert.strictEqual(first.index, 1);
        assert.ok(snippet.children[0] instanceof Variable);
        assert.ok(first.parent === snippet.children[0]);
    });
    test('TextmateSnippet#enclosingPlaceholders', () => {
        const snippet = new SnippetParser().parse('This ${1:is ${2:nested}}$0', true);
        const [first, second] = snippet.placeholders;
        assert.deepStrictEqual(snippet.enclosingPlaceholders(first), []);
        assert.deepStrictEqual(snippet.enclosingPlaceholders(second), [first]);
    });
    test('TextmateSnippet#offset', () => {
        let snippet = new SnippetParser().parse('te$1xt', true);
        assert.strictEqual(snippet.offset(snippet.children[0]), 0);
        assert.strictEqual(snippet.offset(snippet.children[1]), 2);
        assert.strictEqual(snippet.offset(snippet.children[2]), 2);
        snippet = new SnippetParser().parse('${TM_SELECTED_TEXT:def}', true);
        assert.strictEqual(snippet.offset(snippet.children[0]), 0);
        assert.strictEqual(snippet.offset(snippet.children[0].children[0]), 0);
        // forgein marker
        assert.strictEqual(snippet.offset(new Text('foo')), -1);
    });
    test('TextmateSnippet#placeholder', () => {
        let snippet = new SnippetParser().parse('te$1xt$0', true);
        let placeholders = snippet.placeholders;
        assert.strictEqual(placeholders.length, 2);
        snippet = new SnippetParser().parse('te$1xt$1$0', true);
        placeholders = snippet.placeholders;
        assert.strictEqual(placeholders.length, 3);
        snippet = new SnippetParser().parse('te$1xt$2$0', true);
        placeholders = snippet.placeholders;
        assert.strictEqual(placeholders.length, 3);
        snippet = new SnippetParser().parse('${1:bar${2:foo}bar}$0', true);
        placeholders = snippet.placeholders;
        assert.strictEqual(placeholders.length, 3);
    });
    test('TextmateSnippet#replace 1/2', function () {
        const snippet = new SnippetParser().parse('aaa${1:bbb${2:ccc}}$0', true);
        assert.strictEqual(snippet.placeholders.length, 3);
        const [, second] = snippet.placeholders;
        assert.strictEqual(second.index, 2);
        const enclosing = snippet.enclosingPlaceholders(second);
        assert.strictEqual(enclosing.length, 1);
        assert.strictEqual(enclosing[0].index, 1);
        const nested = new SnippetParser().parse('ddd$1eee$0', true);
        snippet.replace(second, nested.children);
        assert.strictEqual(snippet.toString(), 'aaabbbdddeee');
        assert.strictEqual(snippet.placeholders.length, 4);
        assert.strictEqual(snippet.placeholders[0].index, 1);
        assert.strictEqual(snippet.placeholders[1].index, 1);
        assert.strictEqual(snippet.placeholders[2].index, 0);
        assert.strictEqual(snippet.placeholders[3].index, 0);
        const newEnclosing = snippet.enclosingPlaceholders(snippet.placeholders[1]);
        assert.ok(newEnclosing[0] === snippet.placeholders[0]);
        assert.strictEqual(newEnclosing.length, 1);
        assert.strictEqual(newEnclosing[0].index, 1);
    });
    test('TextmateSnippet#replace 2/2', function () {
        const snippet = new SnippetParser().parse('aaa${1:bbb${2:ccc}}$0', true);
        assert.strictEqual(snippet.placeholders.length, 3);
        const [, second] = snippet.placeholders;
        assert.strictEqual(second.index, 2);
        const nested = new SnippetParser().parse('dddeee$0', true);
        snippet.replace(second, nested.children);
        assert.strictEqual(snippet.toString(), 'aaabbbdddeee');
        assert.strictEqual(snippet.placeholders.length, 3);
    });
    test('Snippet order for placeholders, #28185', function () {
        const _10 = new Placeholder(10);
        const _2 = new Placeholder(2);
        assert.strictEqual(Placeholder.compareByIndex(_10, _2), 1);
    });
    test('Maximum call stack size exceeded, #28983', function () {
        new SnippetParser().parse('${1:${foo:${1}}}');
    });
    test('Snippet can freeze the editor, #30407', function () {
        const seen = new Set();
        seen.clear();
        new SnippetParser()
            .parse('class ${1:${TM_FILENAME/(?:\\A|_)([A-Za-z0-9]+)(?:\\.rb)?/(?2::\\u$1)/g}} < ${2:Application}Controller\n  $3\nend')
            .walk((marker) => {
            assert.ok(!seen.has(marker));
            seen.add(marker);
            return true;
        });
        seen.clear();
        new SnippetParser().parse('${1:${FOO:abc$1def}}').walk((marker) => {
            assert.ok(!seen.has(marker));
            seen.add(marker);
            return true;
        });
    });
    test('Snippets: make parser ignore `${0|choice|}`, #31599', function () {
        assertTextAndMarker('${0|foo,bar|}', '${0|foo,bar|}', Text);
        assertTextAndMarker('${1|foo,bar|}', 'foo', Placeholder);
    });
    test('Transform -> FormatString#resolve', function () {
        // shorthand functions
        assert.strictEqual(new FormatString(1, 'upcase').resolve('foo'), 'FOO');
        assert.strictEqual(new FormatString(1, 'downcase').resolve('FOO'), 'foo');
        assert.strictEqual(new FormatString(1, 'capitalize').resolve('bar'), 'Bar');
        assert.strictEqual(new FormatString(1, 'capitalize').resolve('bar no repeat'), 'Bar no repeat');
        assert.strictEqual(new FormatString(1, 'pascalcase').resolve('bar-foo'), 'BarFoo');
        assert.strictEqual(new FormatString(1, 'pascalcase').resolve('bar-42-foo'), 'Bar42Foo');
        assert.strictEqual(new FormatString(1, 'pascalcase').resolve('snake_AndPascalCase'), 'SnakeAndPascalCase');
        assert.strictEqual(new FormatString(1, 'pascalcase').resolve('kebab-AndPascalCase'), 'KebabAndPascalCase');
        assert.strictEqual(new FormatString(1, 'pascalcase').resolve('_justPascalCase'), 'JustPascalCase');
        assert.strictEqual(new FormatString(1, 'camelcase').resolve('bar-foo'), 'barFoo');
        assert.strictEqual(new FormatString(1, 'camelcase').resolve('bar-42-foo'), 'bar42Foo');
        assert.strictEqual(new FormatString(1, 'camelcase').resolve('snake_AndCamelCase'), 'snakeAndCamelCase');
        assert.strictEqual(new FormatString(1, 'camelcase').resolve('kebab-AndCamelCase'), 'kebabAndCamelCase');
        assert.strictEqual(new FormatString(1, 'camelcase').resolve('_JustCamelCase'), 'justCamelCase');
        assert.strictEqual(new FormatString(1, 'notKnown').resolve('input'), 'input');
        // if
        assert.strictEqual(new FormatString(1, undefined, 'foo', undefined).resolve(undefined), '');
        assert.strictEqual(new FormatString(1, undefined, 'foo', undefined).resolve(''), '');
        assert.strictEqual(new FormatString(1, undefined, 'foo', undefined).resolve('bar'), 'foo');
        // else
        assert.strictEqual(new FormatString(1, undefined, undefined, 'foo').resolve(undefined), 'foo');
        assert.strictEqual(new FormatString(1, undefined, undefined, 'foo').resolve(''), 'foo');
        assert.strictEqual(new FormatString(1, undefined, undefined, 'foo').resolve('bar'), 'bar');
        // if-else
        assert.strictEqual(new FormatString(1, undefined, 'bar', 'foo').resolve(undefined), 'foo');
        assert.strictEqual(new FormatString(1, undefined, 'bar', 'foo').resolve(''), 'foo');
        assert.strictEqual(new FormatString(1, undefined, 'bar', 'foo').resolve('baz'), 'bar');
    });
    test("Snippet variable transformation doesn't work if regex is complicated and snippet body contains '$$' #55627", function () {
        const snippet = new SnippetParser().parse('const fileName = "${TM_FILENAME/(.*)\\..+$/$1/}"');
        assert.strictEqual(snippet.toTextmateString(), 'const fileName = "${TM_FILENAME/(.*)\\..+$/${1}/}"');
    });
    test('[BUG] HTML attribute suggestions: Snippet session does not have end-position set, #33147', function () {
        const { placeholders } = new SnippetParser().parse('src="$1"', true);
        const [first, second] = placeholders;
        assert.strictEqual(placeholders.length, 2);
        assert.strictEqual(first.index, 1);
        assert.strictEqual(second.index, 0);
    });
    test('Snippet optional transforms are not applied correctly when reusing the same variable, #37702', function () {
        const transform = new Transform();
        transform.appendChild(new FormatString(1, 'upcase'));
        transform.appendChild(new FormatString(2, 'upcase'));
        transform.regexp = /^(.)|-(.)/g;
        assert.strictEqual(transform.resolve('my-file-name'), 'MyFileName');
        const clone = transform.clone();
        assert.strictEqual(clone.resolve('my-file-name'), 'MyFileName');
    });
    test('problem with snippets regex #40570', function () {
        const snippet = new SnippetParser().parse('${TM_DIRECTORY/.*src[\\/](.*)/$1/}');
        assertMarker(snippet, Variable);
    });
    test("Variable transformation doesn't work if undefined variables are used in the same snippet #51769", function () {
        const transform = new Transform();
        transform.appendChild(new Text('bar'));
        transform.regexp = new RegExp('foo', 'gi');
        assert.strictEqual(transform.toTextmateString(), '/foo/bar/ig');
    });
    test('Snippet parser freeze #53144', function () {
        const snippet = new SnippetParser().parse('${1/(void$)|(.+)/${1:?-\treturn nil;}/}');
        assertMarker(snippet, Placeholder);
    });
    test('snippets variable not resolved in JSON proposal #52931', function () {
        assertTextAndMarker('FOO${1:/bin/bash}', 'FOO/bin/bash', Text, Placeholder);
    });
    test('Mirroring sequence of nested placeholders not selected properly on backjumping #58736', function () {
        const snippet = new SnippetParser().parse('${3:nest1 ${1:nest2 ${2:nest3}}} $3');
        assert.strictEqual(snippet.children.length, 3);
        assert.ok(snippet.children[0] instanceof Placeholder);
        assert.ok(snippet.children[1] instanceof Text);
        assert.ok(snippet.children[2] instanceof Placeholder);
        function assertParent(marker) {
            marker.children.forEach(assertParent);
            if (!(marker instanceof Placeholder)) {
                return;
            }
            let found = false;
            let m = marker;
            while (m && !found) {
                if (m.parent === snippet) {
                    found = true;
                }
                m = m.parent;
            }
            assert.ok(found);
        }
        const [, , clone] = snippet.children;
        assertParent(clone);
    });
    test("Backspace can't be escaped in snippet variable transforms #65412", function () {
        const snippet = new SnippetParser().parse('namespace ${TM_DIRECTORY/[\\/]/\\\\/g};');
        assertMarker(snippet, Text, Variable, Text);
    });
    test('Snippet cannot escape closing bracket inside conditional insertion variable replacement #78883', function () {
        const snippet = new SnippetParser().parse('${TM_DIRECTORY/(.+)/${1:+import { hello \\} from world}/}');
        const variable = snippet.children[0];
        assert.strictEqual(snippet.children.length, 1);
        assert.ok(variable instanceof Variable);
        assert.ok(variable.transform);
        assert.strictEqual(variable.transform.children.length, 1);
        assert.ok(variable.transform.children[0] instanceof FormatString);
        assert.strictEqual(variable.transform.children[0].ifValue, 'import { hello } from world');
        assert.strictEqual(variable.transform.children[0].elseValue, undefined);
    });
    test('Snippet escape backslashes inside conditional insertion variable replacement #80394', function () {
        const snippet = new SnippetParser().parse('${CURRENT_YEAR/(.+)/${1:+\\\\}/}');
        const variable = snippet.children[0];
        assert.strictEqual(snippet.children.length, 1);
        assert.ok(variable instanceof Variable);
        assert.ok(variable.transform);
        assert.strictEqual(variable.transform.children.length, 1);
        assert.ok(variable.transform.children[0] instanceof FormatString);
        assert.strictEqual(variable.transform.children[0].ifValue, '\\');
        assert.strictEqual(variable.transform.children[0].elseValue, undefined);
    });
    test('Snippet placeholder empty right after expansion #152553', function () {
        const snippet = new SnippetParser().parse('${1:prog}: ${2:$1.cc} - $2');
        const actual = snippet.toString();
        assert.strictEqual(actual, 'prog: prog.cc - prog.cc');
        const snippet2 = new SnippetParser().parse('${1:prog}: ${3:${2:$1.cc}.33} - $2 $3');
        const actual2 = snippet2.toString();
        assert.strictEqual(actual2, 'prog: prog.cc.33 - prog.cc prog.cc.33');
        // cyclic references of placeholders
        const snippet3 = new SnippetParser().parse('${1:$2.one} <> ${2:$1.two}');
        const actual3 = snippet3.toString();
        assert.strictEqual(actual3, '.two.one.two.one <> .one.two.one.two');
    });
    test('Snippet choices are incorrectly escaped/applied #180132', function () {
        assertTextAndMarker('${1|aaa$aaa|}bbb\\$bbb', 'aaa$aaabbb$bbb', Placeholder, Text);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldFBhcnNlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zbmlwcGV0L3Rlc3QvYnJvd3Nlci9zbmlwcGV0UGFyc2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFDTixNQUFNLEVBQ04sWUFBWSxFQUVaLFdBQVcsRUFDWCxPQUFPLEVBQ1AsYUFBYSxFQUNiLElBQUksRUFDSixlQUFlLEVBRWYsU0FBUyxFQUNULFFBQVEsR0FDUixNQUFNLGdDQUFnQyxDQUFBO0FBRXZDLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzNCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7UUFDcEIsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQTtRQUM3QixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLHlCQUFnQixDQUFBO1FBRXRELE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxpQ0FBeUIsQ0FBQTtRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLHlCQUFnQixDQUFBO1FBRXRELE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSw4QkFBc0IsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLDhCQUFzQixDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksaUNBQXlCLENBQUE7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSwrQkFBdUIsQ0FBQTtRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLCtCQUF1QixDQUFBO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUkseUJBQWdCLENBQUE7UUFFdEQsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLGlDQUF5QixDQUFBO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksNEJBQW1CLENBQUE7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSx5QkFBZ0IsQ0FBQTtRQUV0RCxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksaUNBQXlCLENBQUE7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSw0QkFBbUIsQ0FBQTtRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLHdCQUFnQixDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUkseUJBQWdCLENBQUE7UUFFdEQsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNwQixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLDJCQUFtQixDQUFBO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksaUNBQXlCLENBQUE7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSx5QkFBZ0IsQ0FBQTtRQUV0RCxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksMkJBQW1CLENBQUE7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxpQ0FBeUIsQ0FBQTtRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLHlCQUFnQixDQUFBO1FBRXRELE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDeEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSwyQkFBbUIsQ0FBQTtRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLGlDQUF5QixDQUFBO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksMEJBQWlCLENBQUE7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxpQ0FBeUIsQ0FBQTtRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLHlCQUFnQixDQUFBO1FBRXRELE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSwyQkFBbUIsQ0FBQTtRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLDhCQUFzQixDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksaUNBQXlCLENBQUE7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSwrQkFBdUIsQ0FBQTtRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLHlCQUFnQixDQUFBO1FBRXRELE9BQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDM0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSwyQkFBbUIsQ0FBQTtRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLDhCQUFzQixDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksd0JBQWdCLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSwwQkFBa0IsQ0FBQTtRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLGlDQUF5QixDQUFBO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksK0JBQXVCLENBQUE7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSx5QkFBZ0IsQ0FBQTtRQUV0RCxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksOEJBQXNCLENBQUE7UUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSwyQkFBbUIsQ0FBQTtRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLDhCQUFzQixDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksK0JBQXVCLENBQUE7UUFFN0QsT0FBTyxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksMkJBQW1CLENBQUE7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSw4QkFBc0IsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLGlDQUF5QixDQUFBO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksaUNBQXlCLENBQUE7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxpQ0FBeUIsQ0FBQTtRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLGlDQUF5QixDQUFBO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksaUNBQXlCLENBQUE7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxpQ0FBeUIsQ0FBQTtRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLGlDQUF5QixDQUFBO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksK0JBQXVCLENBQUE7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSx5QkFBZ0IsQ0FBQTtJQUN2RCxDQUFDLENBQUMsQ0FBQTtJQUVGLFNBQVMsVUFBVSxDQUFDLEtBQWEsRUFBRSxRQUFnQjtRQUNsRCxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFRCxTQUFTLFlBQVksQ0FBQyxLQUEwQyxFQUFFLEdBQUcsS0FBaUI7UUFDckYsSUFBSSxNQUFnQixDQUFBO1FBQ3BCLElBQUksS0FBSyxZQUFZLGVBQWUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzdCLENBQUM7YUFBTSxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sQ0FBQyxHQUFHLElBQUksYUFBYSxFQUFFLENBQUE7WUFDN0IsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFBO1FBQ2pDLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQTtRQUNwQixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzFCLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQTtZQUN0QixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFHLENBQUE7WUFDekIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUE7UUFDN0IsQ0FBQztRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFRCxTQUFTLG1CQUFtQixDQUFDLEtBQWEsRUFBRSxPQUFlLEVBQUUsR0FBRyxLQUFpQjtRQUNoRixVQUFVLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzFCLFlBQVksQ0FBQyxLQUFLLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQTtJQUM5QixDQUFDO0lBRUQsU0FBUyxhQUFhLENBQUMsS0FBYSxFQUFFLFFBQWdCO1FBQ3JELE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVELElBQUksQ0FBQyxpQkFBaUIsRUFBRTtRQUN2QixhQUFhLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2pDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDdkMsYUFBYSxDQUFDLFNBQVMsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUN2QyxhQUFhLENBQUMsWUFBWSxFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFDL0MsYUFBYSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUMxQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1FBQ3pCLFVBQVUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDcEIsVUFBVSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMxQixVQUFVLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3BCLFVBQVUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDdEIsVUFBVSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUM1QixVQUFVLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDdkMsVUFBVSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN4QixVQUFVLENBQUMsZ0JBQWdCLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDMUMsVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN0QixVQUFVLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzFCLFVBQVUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdEIsVUFBVSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMxQixVQUFVLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3RCLFVBQVUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFMUIsVUFBVSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUM5QixVQUFVLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQ3RDLFVBQVUsQ0FBQyxlQUFlLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDNUMsVUFBVSxDQUFDLGlCQUFpQixFQUFFLGlCQUFpQixDQUFDLENBQUE7UUFDaEQsVUFBVSxDQUFDLG1CQUFtQixFQUFFLG1CQUFtQixDQUFDLENBQUE7UUFDcEQsVUFBVSxDQUFDLDZCQUE2QixFQUFFLDZCQUE2QixDQUFDLENBQUE7UUFDeEUsVUFBVSxDQUFDLGdDQUFnQyxFQUFFLGdDQUFnQyxDQUFDLENBQUE7UUFDOUUsVUFBVSxDQUFDLGlDQUFpQyxFQUFFLGlDQUFpQyxDQUFDLENBQUE7SUFDakYsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1FBQzVCLG1CQUFtQixDQUFDLGNBQWMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2RSxtQkFBbUIsQ0FBQyxzQkFBc0IsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFL0YsbUJBQW1CLENBQUMsd0JBQXdCLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUU5RSxNQUFNLENBQUMsRUFBRSxXQUFXLENBQUMsR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQTtRQUNwRixNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQWdCLFdBQVcsQ0FBQTtRQUU3QyxNQUFNLENBQUMsV0FBVyxDQUFlLFdBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUE7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFlBQVksV0FBVyxDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDbEQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ2hDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0MsbUJBQW1CLENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNyRCxtQkFBbUIsQ0FBQyxlQUFlLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNELG1CQUFtQixDQUFDLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ2hFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtRQUNqQyxtQkFBbUIsQ0FBQyxhQUFhLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZELG1CQUFtQixDQUFDLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ2hFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtRQUN0QyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2RCxtQkFBbUIsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ25ELG1CQUFtQixDQUFDLFlBQVksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3hELG1CQUFtQixDQUFDLGNBQWMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzFELG1CQUFtQixDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDNUMsbUJBQW1CLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUM1QyxtQkFBbUIsQ0FBQyxXQUFXLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzlDLG1CQUFtQixDQUFDLGdCQUFnQixFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZFLG1CQUFtQixDQUNsQiwrQkFBK0IsRUFDL0IsVUFBVSxFQUNWLElBQUksRUFDSixRQUFRLEVBQ1IsSUFBSSxFQUNKLFdBQVcsQ0FDWCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkNBQTZDLEVBQUUsR0FBRyxFQUFFO1FBQ3hELG1CQUFtQixDQUFDLGVBQWUsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDdkQsbUJBQW1CLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUN2RCxtQkFBbUIsQ0FBQyxxQkFBcUIsRUFBRSxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFFcEUsbUJBQW1CLENBQUMsY0FBYyxFQUFFLGNBQWMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN6RCxtQkFBbUIsQ0FBQyxvQkFBb0IsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQzlFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZCQUE2QixFQUFFO1FBQ25DLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDOUMsbUJBQW1CLENBQUMseUJBQXlCLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzVELG1CQUFtQixDQUFDLDZCQUE2QixFQUFFLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUVoRSxnQkFBZ0I7UUFDaEIsbUJBQW1CLENBQUMsZ0NBQWdDLEVBQUUsZ0NBQWdDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0YsbUJBQW1CLENBQ2xCLGtDQUFrQyxFQUNsQyxrQ0FBa0MsRUFDbEMsSUFBSSxDQUNKLENBQUE7UUFDRCxtQkFBbUIsQ0FBQyw0QkFBNEIsRUFBRSw0QkFBNEIsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVyRixlQUFlO1FBQ2YsbUJBQW1CLENBQUMsc0JBQXNCLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3pELFlBQVksQ0FBQyw4QkFBOEIsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVsRCxhQUFhO1FBQ2IsbUJBQW1CLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNqRCxtQkFBbUIsQ0FBQyw0QkFBNEIsRUFBRSw0QkFBNEIsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVyRixnQkFBZ0I7UUFDaEIsWUFBWSxDQUFDLHVCQUF1QixFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQy9DLFlBQVksQ0FBQyxrQkFBa0IsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUMxQyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDeEMsWUFBWSxDQUFDLDhCQUE4QixFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3RELFlBQVksQ0FBQyw4QkFBOEIsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN0RCxZQUFZLENBQUMsK0JBQStCLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDdkQsWUFBWSxDQUFDLDZCQUE2QixFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3JELFlBQVksQ0FBQyxrQ0FBa0MsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUMxRCxZQUFZLENBQUMsaUNBQWlDLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDMUQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0NBQWdDLEVBQUU7UUFDdEMsbUJBQW1CLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUMvQyxtQkFBbUIsQ0FBQyx1QkFBdUIsRUFBRSxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDN0QsbUJBQW1CLENBQUMsMkJBQTJCLEVBQUUsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBRWpFLGVBQWU7UUFDZixtQkFBbUIsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDMUQsWUFBWSxDQUFDLDRCQUE0QixFQUFFLElBQUksQ0FBQyxDQUFBO1FBRWhELGFBQWE7UUFDYixtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzdDLG1CQUFtQixDQUFDLDBCQUEwQixFQUFFLDBCQUEwQixFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ2xGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdEQUF3RCxFQUFFO1FBQzlELFlBQVksQ0FBQyw0QkFBNEIsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUNyRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpRUFBaUUsRUFBRTtRQUN2RSxZQUFZLENBQUMsK0JBQStCLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDdkQsWUFBWSxDQUFDLG9DQUFvQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzVELFlBQVksQ0FBQyxnQ0FBZ0MsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN6RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7UUFDNUMsbUJBQW1CLENBQUMscUJBQXFCLEVBQUUsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQzlELG1CQUFtQixDQUFDLFdBQVcsRUFBRSxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDcEQsbUJBQW1CLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQzNELG1CQUFtQixDQUFDLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUNsRSxtQkFBbUIsQ0FBQyxtQkFBbUIsRUFBRSxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDbEUsbUJBQW1CLENBQUMsbUJBQW1CLEVBQUUsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3BFLG1CQUFtQixDQUFDLHNCQUFzQixFQUFFLHNCQUFzQixFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3pFLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFakQsTUFBTSxPQUFPLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUNoRSxNQUFNLFFBQVEsR0FBK0I7WUFDNUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsWUFBWSxXQUFXO1lBQy9CLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxDQUFDLFlBQVksTUFBTSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxZQUFZLElBQUksQ0FBQztTQUMzRixDQUFBO1FBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ3ZCLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDcEMsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDBEQUEwRCxFQUFFO1FBQ2hFLG1CQUFtQixDQUNsQixpREFBaUQsRUFDakQsd0JBQXdCLEVBQ3hCLElBQUksRUFDSixXQUFXLEVBQ1gsSUFBSSxDQUNKLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw0QkFBNEIsRUFBRTtRQUNsQyxTQUFTLHVCQUF1QixDQUFDLEtBQWEsRUFBRSxRQUFnQjtZQUMvRCxNQUFNLE9BQU8sR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNoRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtZQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNyQyxDQUFDO1FBRUQsdUJBQXVCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ25DLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN2Qyx1QkFBdUIsQ0FDdEIsaURBQWlELEVBQ2pELGlEQUFpRCxDQUNqRCxDQUFBO1FBQ0QsdUJBQXVCLENBQ3RCLHFEQUFxRCxFQUNyRCxxREFBcUQsQ0FDckQsQ0FBQTtRQUNELHVCQUF1QixDQUN0Qix5REFBeUQsRUFDekQseURBQXlELENBQ3pELENBQUE7UUFDRCx1QkFBdUIsQ0FBQyxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDdkQsdUJBQXVCLENBQ3RCLG9DQUFvQyxFQUNwQyxzQ0FBc0MsQ0FDdEMsQ0FBQTtRQUNELHVCQUF1QixDQUN0QixxQ0FBcUMsRUFDckMseUNBQXlDLENBQ3pDLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5Q0FBeUMsRUFBRTtRQUMvQyxTQUFTLFdBQVcsQ0FBQyxLQUFhO1lBQ2pDLHVHQUF1RztZQUN2RyxNQUFNLE9BQU8sR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNoRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtZQUN6QyxNQUFNLFFBQVEsR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUVsRCxTQUFTLGtCQUFrQixDQUFDLE9BQWUsRUFBRSxPQUFlO2dCQUMzRCxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sWUFBWSxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFBO2dCQUN4RSxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sWUFBWSxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFBO2dCQUV4RSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO2dCQUUxRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDbEQsa0JBQWtCLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQzdELENBQUM7WUFDRixDQUFDO1lBRUQsa0JBQWtCLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3RDLENBQUM7UUFFRCxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDakIsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ25CLFdBQVcsQ0FBQyxpREFBaUQsQ0FBQyxDQUFBO1FBQzlELFdBQVcsQ0FBQyxxREFBcUQsQ0FBQyxDQUFBO1FBQ2xFLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUMzQixXQUFXLENBQUMsb0NBQW9DLENBQUMsQ0FBQTtRQUNqRCxXQUFXLENBQUMscUNBQXFDLENBQUMsQ0FBQTtRQUNsRCxXQUFXLENBQUMscURBQXFELENBQUMsQ0FBQTtJQUNuRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7UUFDbEMsTUFBTSxFQUFFLFlBQVksRUFBRSxHQUFHLElBQUksYUFBYSxFQUFFLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFFekUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sWUFBWSxNQUFNLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFlBQVksTUFBTSxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBVSxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFM0UsVUFBVSxDQUFDLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3hDLFVBQVUsQ0FBQyx1QkFBdUIsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1FBQzFELFVBQVUsQ0FBQyx1QkFBdUIsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO1FBQzVELFVBQVUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDL0IsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0VBQWtFLEVBQUU7UUFDeEUsTUFBTSxFQUFFLFlBQVksRUFBRSxHQUFHLElBQUksYUFBYSxFQUFFLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sWUFBWSxNQUFNLENBQUMsQ0FBQTtJQUNwRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7UUFDbEMsTUFBTSxDQUFDLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQTtRQUM3QixZQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN6QyxZQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1QyxZQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRTlDLFlBQVksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDMUQsWUFBWSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM5RCxZQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQzlDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtRQUMvQixJQUFJLE1BQU0sR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDLEtBQUssQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDLFFBQVEsQ0FBQTtRQUV6RixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUN6RCxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsWUFBWSxXQUFXLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUU3QyxNQUFNLFdBQVcsR0FBZ0IsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsWUFBWSxJQUFJLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFlBQVksUUFBUSxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxZQUFZLElBQUksQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBRTNELE1BQU0sY0FBYyxHQUFhLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVyRCxNQUFNLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxRQUFRLENBQUE7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxZQUFZLFFBQVEsQ0FBQyxDQUFBO0lBQ3pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtRQUN0QyxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQyxLQUFLLENBQzdDLHlEQUF5RCxDQUN6RCxDQUFBO1FBRUQsV0FBVztRQUNYLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxZQUFZLFdBQVcsQ0FBQyxDQUFBO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQWUsUUFBUSxDQUFDLENBQUMsQ0FBRSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUVuRSxJQUFJO1FBQ0osTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUE7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFakQsV0FBVztRQUNYLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxZQUFZLFdBQVcsQ0FBQyxDQUFBO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRTlELCtCQUErQjtRQUMvQixNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsWUFBWSxXQUFXLENBQUMsQ0FBQTtRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxjQUFjLENBQWUsUUFBUSxDQUFDLENBQUMsQ0FBRSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUN0RSxNQUFNLFNBQVMsR0FBaUIsUUFBUSxDQUFDLENBQUMsQ0FBRSxDQUFDLFNBQVUsQ0FBQTtRQUN2RCxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFlBQVksWUFBWSxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBZ0IsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBZ0IsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUUsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDeEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxZQUFZLFlBQVksQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQWdCLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxZQUFZLElBQUksQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ2xELENBQUMsQ0FBQyxDQUFBO0lBRUYsOEVBQThFO0lBQzlFLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7UUFDL0MsWUFBWSxDQUFDLHFDQUFxQyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBRXpGLE1BQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxBQUFELEVBQUcsRUFBRSxDQUFDLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQyxLQUFLLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxRQUFRLENBQUE7UUFFN0YsTUFBTSxDQUFDLFdBQVcsQ0FBZSxFQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQWUsRUFBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBc0IsRUFBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUUzRSxNQUFNLENBQUMsV0FBVyxDQUFlLEVBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBZSxFQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFzQixFQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzVFLENBQUMsQ0FBQyxDQUFBO0lBRUYsOEVBQThFO0lBQzlFLElBQUksQ0FBQyxzREFBc0QsRUFBRSxHQUFHLEVBQUU7UUFDakUsWUFBWSxDQUNYLCtDQUErQyxFQUMvQyxJQUFJLEVBQ0osV0FBVyxFQUNYLElBQUksRUFDSixXQUFXLENBQ1gsQ0FBQTtRQUVELE1BQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxBQUFELEVBQUcsRUFBRSxDQUFDLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQyxLQUFLLENBQzdDLDhDQUE4QyxDQUM5QyxDQUFDLFFBQVEsQ0FBQTtRQUVWLE1BQU0sQ0FBQyxXQUFXLENBQWUsRUFBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFlLEVBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQXNCLEVBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBZSxFQUFHLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRTFELE1BQU0sQ0FBQyxXQUFXLENBQWUsRUFBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFlLEVBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQXNCLEVBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLGNBQWMsQ0FBZSxFQUFHLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQzlELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDREQUE0RCxFQUFFO1FBQ2xFLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUM1QyxVQUFVLENBQUMsbUJBQW1CLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDOUMsVUFBVSxDQUFDLHVCQUF1QixFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQ2xELFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxhQUFhLENBQUMsQ0FBQTtJQUMvQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7UUFDaEQsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQ3hDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLEdBQUcsRUFBRTtRQUN4RCxJQUFJLE1BQU0sR0FBRyxhQUFhLENBQUMsWUFBWSxDQUFDLDZCQUE2QixDQUFDLENBQUE7UUFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFckMsTUFBTSxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDdEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO1FBQ25DLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDOUMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtRQUN2QixTQUFTLFNBQVMsQ0FBQyxRQUFnQixFQUFFLEdBQUcsT0FBaUI7WUFDeEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3pELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDbEIsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQTtnQkFDckMsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDLENBQUMsQ0FBQTtZQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0QyxDQUFDO1FBRUQsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekIsU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlCLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakMsU0FBUyxDQUFDLHFDQUFxQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRSxTQUFTLENBQUMsdUNBQXVDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekUsU0FBUyxDQUFDLHFCQUFxQixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0QyxTQUFTLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNoRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxQkFBcUIsRUFBRTtRQUMzQixJQUFJLE9BQU8sR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUUzRSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xELElBQUksQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQTtRQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25DLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsQ0FBQTtRQUNsQyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLENBQUE7UUFFbkMsT0FBTyxHQUFHLElBQUksYUFBYSxFQUFFLENBQUMsS0FBSyxDQUFDLDRCQUE0QixFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZFLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQ2pEO1FBQUEsQ0FBQyxLQUFLLENBQUMsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFBO1FBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVsQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFlBQVksUUFBUSxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNoRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxHQUFHLEVBQUU7UUFDbEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQyxLQUFLLENBQUMsNEJBQTRCLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0UsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFBO1FBRTVDLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtJQUN2RSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7UUFDbkMsSUFBSSxPQUFPLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTFELE9BQU8sR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBWSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWxGLGlCQUFpQjtRQUNqQixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3hELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtRQUN4QyxJQUFJLE9BQU8sR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDekQsSUFBSSxZQUFZLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQTtRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFMUMsT0FBTyxHQUFHLElBQUksYUFBYSxFQUFFLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2RCxZQUFZLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQTtRQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFMUMsT0FBTyxHQUFHLElBQUksYUFBYSxFQUFFLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2RCxZQUFZLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQTtRQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFMUMsT0FBTyxHQUFHLElBQUksYUFBYSxFQUFFLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2xFLFlBQVksR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFBO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMzQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2QkFBNkIsRUFBRTtRQUNuQyxNQUFNLE9BQU8sR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUV4RSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUE7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRW5DLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXpDLE1BQU0sTUFBTSxHQUFHLElBQUksYUFBYSxFQUFFLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1RCxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXBELE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUssT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDN0MsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkJBQTZCLEVBQUU7UUFDbkMsTUFBTSxPQUFPLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFeEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVuQyxNQUFNLE1BQU0sR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDMUQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRXhDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDbkQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0NBQXdDLEVBQUU7UUFDOUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDL0IsTUFBTSxFQUFFLEdBQUcsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFN0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMzRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywwQ0FBMEMsRUFBRTtRQUNoRCxJQUFJLGFBQWEsRUFBRSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0lBQzlDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHVDQUF1QyxFQUFFO1FBQzdDLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUE7UUFFOUIsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ1osSUFBSSxhQUFhLEVBQUU7YUFDakIsS0FBSyxDQUNMLG1IQUFtSCxDQUNuSDthQUNBLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ2hCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDNUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNoQixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUMsQ0FBQyxDQUFBO1FBRUgsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ1osSUFBSSxhQUFhLEVBQUUsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNqRSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1lBQzVCLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDaEIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFEQUFxRCxFQUFFO1FBQzNELG1CQUFtQixDQUFDLGVBQWUsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0QsbUJBQW1CLENBQUMsZUFBZSxFQUFFLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUN6RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtQ0FBbUMsRUFBRTtRQUN6QyxzQkFBc0I7UUFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFlBQVksQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3ZFLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN6RSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksWUFBWSxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFlBQVksQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQy9GLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNsRixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksWUFBWSxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDdkYsTUFBTSxDQUFDLFdBQVcsQ0FDakIsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxFQUNoRSxvQkFBb0IsQ0FDcEIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLElBQUksWUFBWSxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQyxPQUFPLENBQUMscUJBQXFCLENBQUMsRUFDaEUsb0JBQW9CLENBQ3BCLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixJQUFJLFlBQVksQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLEVBQzVELGdCQUFnQixDQUNoQixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFlBQVksQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ2pGLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUN0RixNQUFNLENBQUMsV0FBVyxDQUNqQixJQUFJLFlBQVksQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLEVBQzlELG1CQUFtQixDQUNuQixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxFQUM5RCxtQkFBbUIsQ0FDbkIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQy9GLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUU3RSxLQUFLO1FBQ0wsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFlBQVksQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDM0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFlBQVksQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDcEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFlBQVksQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFMUYsT0FBTztRQUNQLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzlGLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3ZGLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRTFGLFVBQVU7UUFDVixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksWUFBWSxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMxRixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksWUFBWSxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsS0FB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