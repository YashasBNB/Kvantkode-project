/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { createScanner, parse, parseTree, } from '../../common/json.js';
import { getParseErrorMessage } from '../../common/jsonErrorMessages.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
function assertKinds(text, ...kinds) {
    const scanner = createScanner(text);
    let kind;
    while ((kind = scanner.scan()) !== 17 /* SyntaxKind.EOF */) {
        assert.strictEqual(kind, kinds.shift());
    }
    assert.strictEqual(kinds.length, 0);
}
function assertScanError(text, expectedKind, scanError) {
    const scanner = createScanner(text);
    scanner.scan();
    assert.strictEqual(scanner.getToken(), expectedKind);
    assert.strictEqual(scanner.getTokenError(), scanError);
}
function assertValidParse(input, expected, options) {
    const errors = [];
    const actual = parse(input, errors, options);
    if (errors.length !== 0) {
        assert(false, getParseErrorMessage(errors[0].error));
    }
    assert.deepStrictEqual(actual, expected);
}
function assertInvalidParse(input, expected, options) {
    const errors = [];
    const actual = parse(input, errors, options);
    assert(errors.length > 0);
    assert.deepStrictEqual(actual, expected);
}
function assertTree(input, expected, expectedErrors = [], options) {
    const errors = [];
    const actual = parseTree(input, errors, options);
    assert.deepStrictEqual(errors.map((e) => e.error, expected), expectedErrors);
    const checkParent = (node) => {
        if (node.children) {
            for (const child of node.children) {
                assert.strictEqual(node, child.parent);
                delete child.parent; // delete to avoid recursion in deep equal
                checkParent(child);
            }
        }
    };
    checkParent(actual);
    assert.deepStrictEqual(actual, expected);
}
suite('JSON', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('tokens', () => {
        assertKinds('{', 1 /* SyntaxKind.OpenBraceToken */);
        assertKinds('}', 2 /* SyntaxKind.CloseBraceToken */);
        assertKinds('[', 3 /* SyntaxKind.OpenBracketToken */);
        assertKinds(']', 4 /* SyntaxKind.CloseBracketToken */);
        assertKinds(':', 6 /* SyntaxKind.ColonToken */);
        assertKinds(',', 5 /* SyntaxKind.CommaToken */);
    });
    test('comments', () => {
        assertKinds('// this is a comment', 12 /* SyntaxKind.LineCommentTrivia */);
        assertKinds('// this is a comment\n', 12 /* SyntaxKind.LineCommentTrivia */, 14 /* SyntaxKind.LineBreakTrivia */);
        assertKinds('/* this is a comment*/', 13 /* SyntaxKind.BlockCommentTrivia */);
        assertKinds('/* this is a \r\ncomment*/', 13 /* SyntaxKind.BlockCommentTrivia */);
        assertKinds('/* this is a \ncomment*/', 13 /* SyntaxKind.BlockCommentTrivia */);
        // unexpected end
        assertKinds('/* this is a', 13 /* SyntaxKind.BlockCommentTrivia */);
        assertKinds('/* this is a \ncomment', 13 /* SyntaxKind.BlockCommentTrivia */);
        // broken comment
        assertKinds('/ ttt', 16 /* SyntaxKind.Unknown */, 15 /* SyntaxKind.Trivia */, 16 /* SyntaxKind.Unknown */);
    });
    test('strings', () => {
        assertKinds('"test"', 10 /* SyntaxKind.StringLiteral */);
        assertKinds('"\\""', 10 /* SyntaxKind.StringLiteral */);
        assertKinds('"\\/"', 10 /* SyntaxKind.StringLiteral */);
        assertKinds('"\\b"', 10 /* SyntaxKind.StringLiteral */);
        assertKinds('"\\f"', 10 /* SyntaxKind.StringLiteral */);
        assertKinds('"\\n"', 10 /* SyntaxKind.StringLiteral */);
        assertKinds('"\\r"', 10 /* SyntaxKind.StringLiteral */);
        assertKinds('"\\t"', 10 /* SyntaxKind.StringLiteral */);
        assertKinds('"\\v"', 10 /* SyntaxKind.StringLiteral */);
        assertKinds('"\u88ff"', 10 /* SyntaxKind.StringLiteral */);
        assertKinds('"​\u2028"', 10 /* SyntaxKind.StringLiteral */);
        // unexpected end
        assertKinds('"test', 10 /* SyntaxKind.StringLiteral */);
        assertKinds('"test\n"', 10 /* SyntaxKind.StringLiteral */, 14 /* SyntaxKind.LineBreakTrivia */, 10 /* SyntaxKind.StringLiteral */);
        // invalid characters
        assertScanError('"\t"', 10 /* SyntaxKind.StringLiteral */, 6 /* ScanError.InvalidCharacter */);
        assertScanError('"\t "', 10 /* SyntaxKind.StringLiteral */, 6 /* ScanError.InvalidCharacter */);
    });
    test('numbers', () => {
        assertKinds('0', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('0.1', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('-0.1', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('-1', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('1', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('123456789', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('10', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('90', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('90E+123', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('90e+123', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('90e-123', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('90E-123', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('90E123', 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('90e123', 11 /* SyntaxKind.NumericLiteral */);
        // zero handling
        assertKinds('01', 11 /* SyntaxKind.NumericLiteral */, 11 /* SyntaxKind.NumericLiteral */);
        assertKinds('-01', 11 /* SyntaxKind.NumericLiteral */, 11 /* SyntaxKind.NumericLiteral */);
        // unexpected end
        assertKinds('-', 16 /* SyntaxKind.Unknown */);
        assertKinds('.0', 16 /* SyntaxKind.Unknown */);
    });
    test('keywords: true, false, null', () => {
        assertKinds('true', 8 /* SyntaxKind.TrueKeyword */);
        assertKinds('false', 9 /* SyntaxKind.FalseKeyword */);
        assertKinds('null', 7 /* SyntaxKind.NullKeyword */);
        assertKinds('true false null', 8 /* SyntaxKind.TrueKeyword */, 15 /* SyntaxKind.Trivia */, 9 /* SyntaxKind.FalseKeyword */, 15 /* SyntaxKind.Trivia */, 7 /* SyntaxKind.NullKeyword */);
        // invalid words
        assertKinds('nulllll', 16 /* SyntaxKind.Unknown */);
        assertKinds('True', 16 /* SyntaxKind.Unknown */);
        assertKinds('foo-bar', 16 /* SyntaxKind.Unknown */);
        assertKinds('foo bar', 16 /* SyntaxKind.Unknown */, 15 /* SyntaxKind.Trivia */, 16 /* SyntaxKind.Unknown */);
    });
    test('trivia', () => {
        assertKinds(' ', 15 /* SyntaxKind.Trivia */);
        assertKinds('  \t  ', 15 /* SyntaxKind.Trivia */);
        assertKinds('  \t  \n  \t  ', 15 /* SyntaxKind.Trivia */, 14 /* SyntaxKind.LineBreakTrivia */, 15 /* SyntaxKind.Trivia */);
        assertKinds('\r\n', 14 /* SyntaxKind.LineBreakTrivia */);
        assertKinds('\r', 14 /* SyntaxKind.LineBreakTrivia */);
        assertKinds('\n', 14 /* SyntaxKind.LineBreakTrivia */);
        assertKinds('\n\r', 14 /* SyntaxKind.LineBreakTrivia */, 14 /* SyntaxKind.LineBreakTrivia */);
        assertKinds('\n   \n', 14 /* SyntaxKind.LineBreakTrivia */, 15 /* SyntaxKind.Trivia */, 14 /* SyntaxKind.LineBreakTrivia */);
    });
    test('parse: literals', () => {
        assertValidParse('true', true);
        assertValidParse('false', false);
        assertValidParse('null', null);
        assertValidParse('"foo"', 'foo');
        assertValidParse('"\\"-\\\\-\\/-\\b-\\f-\\n-\\r-\\t"', '"-\\-/-\b-\f-\n-\r-\t');
        assertValidParse('"\\u00DC"', 'Ü');
        assertValidParse('9', 9);
        assertValidParse('-9', -9);
        assertValidParse('0.129', 0.129);
        assertValidParse('23e3', 23e3);
        assertValidParse('1.2E+3', 1.2e3);
        assertValidParse('1.2E-3', 1.2e-3);
        assertValidParse('1.2E-3 // comment', 1.2e-3);
    });
    test('parse: objects', () => {
        assertValidParse('{}', {});
        assertValidParse('{ "foo": true }', { foo: true });
        assertValidParse('{ "bar": 8, "xoo": "foo" }', { bar: 8, xoo: 'foo' });
        assertValidParse('{ "hello": [], "world": {} }', { hello: [], world: {} });
        assertValidParse('{ "a": false, "b": true, "c": [ 7.4 ] }', { a: false, b: true, c: [7.4] });
        assertValidParse('{ "lineComment": "//", "blockComment": ["/*", "*/"], "brackets": [ ["{", "}"], ["[", "]"], ["(", ")"] ] }', {
            lineComment: '//',
            blockComment: ['/*', '*/'],
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')'],
            ],
        });
        assertValidParse('{ "hello": [], "world": {} }', { hello: [], world: {} });
        assertValidParse('{ "hello": { "again": { "inside": 5 }, "world": 1 }}', {
            hello: { again: { inside: 5 }, world: 1 },
        });
        assertValidParse('{ "foo": /*hello*/true }', { foo: true });
    });
    test('parse: arrays', () => {
        assertValidParse('[]', []);
        assertValidParse('[ [],  [ [] ]]', [[], [[]]]);
        assertValidParse('[ 1, 2, 3 ]', [1, 2, 3]);
        assertValidParse('[ { "a": null } ]', [{ a: null }]);
    });
    test('parse: objects with errors', () => {
        assertInvalidParse('{,}', {});
        assertInvalidParse('{ "foo": true, }', { foo: true }, { allowTrailingComma: false });
        assertInvalidParse('{ "bar": 8 "xoo": "foo" }', { bar: 8, xoo: 'foo' });
        assertInvalidParse('{ ,"bar": 8 }', { bar: 8 });
        assertInvalidParse('{ ,"bar": 8, "foo" }', { bar: 8 });
        assertInvalidParse('{ "bar": 8, "foo": }', { bar: 8 });
        assertInvalidParse('{ 8, "foo": 9 }', { foo: 9 });
    });
    test('parse: array with errors', () => {
        assertInvalidParse('[,]', []);
        assertInvalidParse('[ 1, 2, ]', [1, 2], { allowTrailingComma: false });
        assertInvalidParse('[ 1 2, 3 ]', [1, 2, 3]);
        assertInvalidParse('[ ,1, 2, 3 ]', [1, 2, 3]);
        assertInvalidParse('[ ,1, 2, 3, ]', [1, 2, 3], { allowTrailingComma: false });
    });
    test('parse: disallow commments', () => {
        const options = { disallowComments: true };
        assertValidParse('[ 1, 2, null, "foo" ]', [1, 2, null, 'foo'], options);
        assertValidParse('{ "hello": [], "world": {} }', { hello: [], world: {} }, options);
        assertInvalidParse('{ "foo": /*comment*/ true }', { foo: true }, options);
    });
    test('parse: trailing comma', () => {
        // default is allow
        assertValidParse('{ "hello": [], }', { hello: [] });
        let options = { allowTrailingComma: true };
        assertValidParse('{ "hello": [], }', { hello: [] }, options);
        assertValidParse('{ "hello": [] }', { hello: [] }, options);
        assertValidParse('{ "hello": [], "world": {}, }', { hello: [], world: {} }, options);
        assertValidParse('{ "hello": [], "world": {} }', { hello: [], world: {} }, options);
        assertValidParse('{ "hello": [1,] }', { hello: [1] }, options);
        options = { allowTrailingComma: false };
        assertInvalidParse('{ "hello": [], }', { hello: [] }, options);
        assertInvalidParse('{ "hello": [], "world": {}, }', { hello: [], world: {} }, options);
    });
    test('tree: literals', () => {
        assertTree('true', { type: 'boolean', offset: 0, length: 4, value: true });
        assertTree('false', { type: 'boolean', offset: 0, length: 5, value: false });
        assertTree('null', { type: 'null', offset: 0, length: 4, value: null });
        assertTree('23', { type: 'number', offset: 0, length: 2, value: 23 });
        assertTree('-1.93e-19', { type: 'number', offset: 0, length: 9, value: -1.93e-19 });
        assertTree('"hello"', { type: 'string', offset: 0, length: 7, value: 'hello' });
    });
    test('tree: arrays', () => {
        assertTree('[]', { type: 'array', offset: 0, length: 2, children: [] });
        assertTree('[ 1 ]', {
            type: 'array',
            offset: 0,
            length: 5,
            children: [{ type: 'number', offset: 2, length: 1, value: 1 }],
        });
        assertTree('[ 1,"x"]', {
            type: 'array',
            offset: 0,
            length: 8,
            children: [
                { type: 'number', offset: 2, length: 1, value: 1 },
                { type: 'string', offset: 4, length: 3, value: 'x' },
            ],
        });
        assertTree('[[]]', {
            type: 'array',
            offset: 0,
            length: 4,
            children: [{ type: 'array', offset: 1, length: 2, children: [] }],
        });
    });
    test('tree: objects', () => {
        assertTree('{ }', { type: 'object', offset: 0, length: 3, children: [] });
        assertTree('{ "val": 1 }', {
            type: 'object',
            offset: 0,
            length: 12,
            children: [
                {
                    type: 'property',
                    offset: 2,
                    length: 8,
                    colonOffset: 7,
                    children: [
                        { type: 'string', offset: 2, length: 5, value: 'val' },
                        { type: 'number', offset: 9, length: 1, value: 1 },
                    ],
                },
            ],
        });
        assertTree('{"id": "$", "v": [ null, null] }', {
            type: 'object',
            offset: 0,
            length: 32,
            children: [
                {
                    type: 'property',
                    offset: 1,
                    length: 9,
                    colonOffset: 5,
                    children: [
                        { type: 'string', offset: 1, length: 4, value: 'id' },
                        { type: 'string', offset: 7, length: 3, value: '$' },
                    ],
                },
                {
                    type: 'property',
                    offset: 12,
                    length: 18,
                    colonOffset: 15,
                    children: [
                        { type: 'string', offset: 12, length: 3, value: 'v' },
                        {
                            type: 'array',
                            offset: 17,
                            length: 13,
                            children: [
                                { type: 'null', offset: 19, length: 4, value: null },
                                { type: 'null', offset: 25, length: 4, value: null },
                            ],
                        },
                    ],
                },
            ],
        });
        assertTree('{  "id": { "foo": { } } , }', {
            type: 'object',
            offset: 0,
            length: 27,
            children: [
                {
                    type: 'property',
                    offset: 3,
                    length: 20,
                    colonOffset: 7,
                    children: [
                        { type: 'string', offset: 3, length: 4, value: 'id' },
                        {
                            type: 'object',
                            offset: 9,
                            length: 14,
                            children: [
                                {
                                    type: 'property',
                                    offset: 11,
                                    length: 10,
                                    colonOffset: 16,
                                    children: [
                                        { type: 'string', offset: 11, length: 5, value: 'foo' },
                                        { type: 'object', offset: 18, length: 3, children: [] },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        }, [3 /* ParseErrorCode.PropertyNameExpected */, 4 /* ParseErrorCode.ValueExpected */], { allowTrailingComma: false });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9qc29uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFDTixhQUFhLEVBRWIsS0FBSyxFQUlMLFNBQVMsR0FHVCxNQUFNLHNCQUFzQixDQUFBO0FBQzdCLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUVwRSxTQUFTLFdBQVcsQ0FBQyxJQUFZLEVBQUUsR0FBRyxLQUFtQjtJQUN4RCxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDbkMsSUFBSSxJQUFnQixDQUFBO0lBQ3BCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLDRCQUFtQixFQUFFLENBQUM7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDeEMsQ0FBQztJQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNwQyxDQUFDO0FBQ0QsU0FBUyxlQUFlLENBQUMsSUFBWSxFQUFFLFlBQXdCLEVBQUUsU0FBb0I7SUFDcEYsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ25DLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUNkLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFBO0lBQ3BELE1BQU0sQ0FBQyxXQUFXLENB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QU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUMxRSxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDNUUsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZFLFVBQVUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxVQUFVLENBQUMsV0FBVyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUNuRixVQUFVLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUE7SUFDaEYsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtRQUN6QixVQUFVLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDdkUsVUFBVSxDQUFDLE9BQU8sRUFBRTtZQUNuQixJQUFJLEVBQUUsT0FB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