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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2pzb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUNOLGFBQWEsRUFFYixLQUFLLEVBSUwsU0FBUyxHQUdULE1BQU0sc0JBQXNCLENBQUE7QUFDN0IsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRXBFLFNBQVMsV0FBVyxDQUFDLElBQVksRUFBRSxHQUFHLEtBQW1CO0lBQ3hELE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNuQyxJQUFJLElBQWdCLENBQUE7SUFDcEIsT0FBTyxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsNEJBQW1CLEVBQUUsQ0FBQztRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0lBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ3BDLENBQUM7QUFDRCxTQUFTLGVBQWUsQ0FBQyxJQUFZLEVBQUUsWUFBd0IsRUFBRSxTQUFvQjtJQUNwRixNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDbkMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ2QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsWUFBWSxDQUFDLENBQUE7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LElBQUksRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQzFFLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUM1RSxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDdkUsVUFBVSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLFVBQVUsQ0FBQyxXQUFXLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQ25GLFVBQVUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQTtJQUNoRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1FBQ3pCLFVBQVUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN2RSxVQUFVLENBQUMsT0FBTyxF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