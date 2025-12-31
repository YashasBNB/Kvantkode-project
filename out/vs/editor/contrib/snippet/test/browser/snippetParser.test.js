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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldFBhcnNlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc25pcHBldC90ZXN0L2Jyb3dzZXIvc25pcHBldFBhcnNlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sTUFBTSxFQUNOLFlBQVksRUFFWixXQUFXLEVBQ1gsT0FBTyxFQUNQLGFBQWEsRUFDYixJQUFJLEVBQ0osZUFBZSxFQUVmLFNBQVMsRUFDVCxRQUFRLEdBQ1IsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV2QyxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtJQUMzQix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO1FBQ3BCLE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUE7UUFDN0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSx5QkFBZ0IsQ0FBQTtRQUV0RCxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ25CLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksaUNBQXlCLENBQUE7UUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSx5QkFBZ0IsQ0FBQTtRQUV0RCxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksOEJBQXNC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LENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFlLFFBQVEsQ0FBQyxDQUFDLENBQUUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFbkUsSUFBSTtRQUNKLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxZQUFZLElBQUksQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRWpELFdBQVc7UUFDWCxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsWUFBWSxXQUFXLENBQUMsQ0FBQTtRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUU5RCwrQkFBK0I7UUFDL0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFlBQVksV0FBVyxDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsY0FBYyxDQUFlLFFBQVEsQ0FBQyxDQUFDLENBQUUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDdEUsTUFBTSxTQUFTLEdBQWlCLFFBQVEsQ0FBQyxDQUFDLENBQUUsQ0FBQyxTQUFVLENBQUE7UUFDdkQsTUFBTSxDQUFD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