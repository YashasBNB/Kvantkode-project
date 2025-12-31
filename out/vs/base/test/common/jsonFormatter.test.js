/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as Formatter from '../../common/jsonFormatter.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('JSON - formatter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function format(content, expected, insertSpaces = true) {
        let range = undefined;
        const rangeStart = content.indexOf('|');
        const rangeEnd = content.lastIndexOf('|');
        if (rangeStart !== -1 && rangeEnd !== -1) {
            content =
                content.substring(0, rangeStart) +
                    content.substring(rangeStart + 1, rangeEnd) +
                    content.substring(rangeEnd + 1);
            range = { offset: rangeStart, length: rangeEnd - rangeStart };
        }
        const edits = Formatter.format(content, range, {
            tabSize: 2,
            insertSpaces: insertSpaces,
            eol: '\n',
        });
        let lastEditOffset = content.length;
        for (let i = edits.length - 1; i >= 0; i--) {
            const edit = edits[i];
            assert(edit.offset >= 0 && edit.length >= 0 && edit.offset + edit.length <= content.length);
            assert(typeof edit.content === 'string');
            assert(lastEditOffset >= edit.offset + edit.length); // make sure all edits are ordered
            lastEditOffset = edit.offset;
            content =
                content.substring(0, edit.offset) +
                    edit.content +
                    content.substring(edit.offset + edit.length);
        }
        assert.strictEqual(content, expected);
    }
    test('object - single property', () => {
        const content = ['{"x" : 1}'].join('\n');
        const expected = ['{', '  "x": 1', '}'].join('\n');
        format(content, expected);
    });
    test('object - multiple properties', () => {
        const content = ['{"x" : 1,  "y" : "foo", "z"  : true}'].join('\n');
        const expected = ['{', '  "x": 1,', '  "y": "foo",', '  "z": true', '}'].join('\n');
        format(content, expected);
    });
    test('object - no properties ', () => {
        const content = ['{"x" : {    },  "y" : {}}'].join('\n');
        const expected = ['{', '  "x": {},', '  "y": {}', '}'].join('\n');
        format(content, expected);
    });
    test('object - nesting', () => {
        const content = ['{"x" : {  "y" : { "z"  : { }}, "a": true}}'].join('\n');
        const expected = [
            '{',
            '  "x": {',
            '    "y": {',
            '      "z": {}',
            '    },',
            '    "a": true',
            '  }',
            '}',
        ].join('\n');
        format(content, expected);
    });
    test('array - single items', () => {
        const content = ['["[]"]'].join('\n');
        const expected = ['[', '  "[]"', ']'].join('\n');
        format(content, expected);
    });
    test('array - multiple items', () => {
        const content = ['[true,null,1.2]'].join('\n');
        const expected = ['[', '  true,', '  null,', '  1.2', ']'].join('\n');
        format(content, expected);
    });
    test('array - no items', () => {
        const content = ['[      ]'].join('\n');
        const expected = ['[]'].join('\n');
        format(content, expected);
    });
    test('array - nesting', () => {
        const content = ['[ [], [ [ {} ], "a" ]  ]'].join('\n');
        const expected = [
            '[',
            '  [],',
            '  [',
            '    [',
            '      {}',
            '    ],',
            '    "a"',
            '  ]',
            ']',
        ].join('\n');
        format(content, expected);
    });
    test('syntax errors', () => {
        const content = ['[ null 1.2 ]'].join('\n');
        const expected = ['[', '  null 1.2', ']'].join('\n');
        format(content, expected);
    });
    test('empty lines', () => {
        const content = ['{', '"a": true,', '', '"b": true', '}'].join('\n');
        const expected = ['{', '\t"a": true,', '\t"b": true', '}'].join('\n');
        format(content, expected, false);
    });
    test('single line comment', () => {
        const content = ['[ ', '//comment', '"foo", "bar"', '] '].join('\n');
        const expected = ['[', '  //comment', '  "foo",', '  "bar"', ']'].join('\n');
        format(content, expected);
    });
    test('block line comment', () => {
        const content = ['[{', '        /*comment*/     ', '"foo" : true', '}] '].join('\n');
        const expected = ['[', '  {', '    /*comment*/', '    "foo": true', '  }', ']'].join('\n');
        format(content, expected);
    });
    test('single line comment on same line', () => {
        const content = [' {  ', '        "a": {}// comment    ', ' } '].join('\n');
        const expected = ['{', '  "a": {} // comment    ', '}'].join('\n');
        format(content, expected);
    });
    test('single line comment on same line 2', () => {
        const content = ['{ //comment', '}'].join('\n');
        const expected = ['{ //comment', '}'].join('\n');
        format(content, expected);
    });
    test('block comment on same line', () => {
        const content = [
            '{      "a": {}, /*comment*/    ',
            '        /*comment*/ "b": {},    ',
            '        "c": {/*comment*/}    } ',
        ].join('\n');
        const expected = [
            '{',
            '  "a": {}, /*comment*/',
            '  /*comment*/ "b": {},',
            '  "c": { /*comment*/}',
            '}',
        ].join('\n');
        format(content, expected);
    });
    test('block comment on same line advanced', () => {
        const content = [
            ' {       "d": [',
            '             null',
            '        ] /*comment*/',
            '        ,"e": /*comment*/ [null] }',
        ].join('\n');
        const expected = [
            '{',
            '  "d": [',
            '    null',
            '  ] /*comment*/,',
            '  "e": /*comment*/ [',
            '    null',
            '  ]',
            '}',
        ].join('\n');
        format(content, expected);
    });
    test('multiple block comments on same line', () => {
        const content = [
            '{      "a": {} /*comment*/, /*comment*/   ',
            '        /*comment*/ "b": {}  /*comment*/  } ',
        ].join('\n');
        const expected = [
            '{',
            '  "a": {} /*comment*/, /*comment*/',
            '  /*comment*/ "b": {} /*comment*/',
            '}',
        ].join('\n');
        format(content, expected);
    });
    test('multiple mixed comments on same line', () => {
        const content = ['[ /*comment*/  /*comment*/   // comment ', ']'].join('\n');
        const expected = ['[ /*comment*/ /*comment*/ // comment ', ']'].join('\n');
        format(content, expected);
    });
    test('range', () => {
        const content = ['{ "a": {},', '|"b": [null, null]|', '} '].join('\n');
        const expected = ['{ "a": {},', '"b": [', '  null,', '  null', ']', '} '].join('\n');
        format(content, expected);
    });
    test('range with existing indent', () => {
        const content = ['{ "a": {},', '   |"b": [null],', '"c": {}', '}|'].join('\n');
        const expected = ['{ "a": {},', '   "b": [', '    null', '  ],', '  "c": {}', '}'].join('\n');
        format(content, expected);
    });
    test('range with existing indent - tabs', () => {
        const content = ['{ "a": {},', '|  "b": [null],   ', '"c": {}', '} |    '].join('\n');
        const expected = ['{ "a": {},', '\t"b": [', '\t\tnull', '\t],', '\t"c": {}', '}'].join('\n');
        format(content, expected, false);
    });
    test('block comment none-line breaking symbols', () => {
        const content = [
            '{ "a": [ 1',
            '/* comment */',
            ', 2',
            '/* comment */',
            ']',
            '/* comment */',
            ',',
            ' "b": true',
            '/* comment */',
            '}',
        ].join('\n');
        const expected = [
            '{',
            '  "a": [',
            '    1',
            '    /* comment */',
            '    ,',
            '    2',
            '    /* comment */',
            '  ]',
            '  /* comment */',
            '  ,',
            '  "b": true',
            '  /* comment */',
            '}',
        ].join('\n');
        format(content, expected);
    });
    test('line comment after none-line breaking symbols', () => {
        const content = [
            '{ "a":',
            '// comment',
            'null,',
            ' "b"',
            '// comment',
            ': null',
            '// comment',
            '}',
        ].join('\n');
        const expected = [
            '{',
            '  "a":',
            '  // comment',
            '  null,',
            '  "b"',
            '  // comment',
            '  : null',
            '  // comment',
            '}',
        ].join('\n');
        format(content, expected);
    });
    test('toFormattedString', () => {
        const obj = {
            a: { b: 1, d: ['hello'] },
        };
        const getExpected = (tab, eol) => {
            return [
                `{`,
                `${tab}"a": {`,
                `${tab}${tab}"b": 1,`,
                `${tab}${tab}"d": [`,
                `${tab}${tab}${tab}"hello"`,
                `${tab}${tab}]`,
                `${tab}}`,
                '}',
            ].join(eol);
        };
        let actual = Formatter.toFormattedString(obj, { insertSpaces: true, tabSize: 2, eol: '\n' });
        assert.strictEqual(actual, getExpected('  ', '\n'));
        actual = Formatter.toFormattedString(obj, { insertSpaces: true, tabSize: 2, eol: '\r\n' });
        assert.strictEqual(actual, getExpected('  ', '\r\n'));
        actual = Formatter.toFormattedString(obj, { insertSpaces: false, eol: '\r\n' });
        assert.strictEqual(actual, getExpected('\t', '\r\n'));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkZvcm1hdHRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9qc29uRm9ybWF0dGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxTQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDMUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRXBFLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDOUIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxTQUFTLE1BQU0sQ0FBQyxPQUFlLEVBQUUsUUFBZ0IsRUFBRSxZQUFZLEdBQUcsSUFBSTtRQUNyRSxJQUFJLEtBQUssR0FBZ0MsU0FBUyxDQUFBO1FBQ2xELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDdkMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN6QyxJQUFJLFVBQVUsS0FBSyxDQUFDLENBQUMsSUFBSSxRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUMxQyxPQUFPO2dCQUNOLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQztvQkFDaEMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFLFFBQVEsQ0FBQztvQkFDM0MsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDaEMsS0FBSyxHQUFHLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsUUFBUSxHQUFHLFVBQVUsRUFBRSxDQUFBO1FBQzlELENBQUM7UUFFRCxNQUFN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