/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ColorMap, ExternalThemeTrieElement, ParsedTokenThemeRule, ThemeTrieElementRule, TokenTheme, parseTokenTheme, strcmp, } from '../../../../common/languages/supports/tokenization.js';
suite('Token theme matching', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('gives higher priority to deeper matches', () => {
        const theme = TokenTheme.createFromRawTokenTheme([
            { token: '', foreground: '100000', background: '200000' },
            { token: 'punctuation.definition.string.begin.html', foreground: '300000' },
            { token: 'punctuation.definition.string', foreground: '400000' },
        ], []);
        const colorMap = new ColorMap();
        colorMap.getId('100000');
        const _B = colorMap.getId('200000');
        colorMap.getId('400000');
        const _D = colorMap.getId('300000');
        const actual = theme._match('punctuation.definition.string.begin.html');
        assert.deepStrictEqual(actual, new ThemeTrieElementRule(0 /* FontStyle.None */, _D, _B));
    });
    test('can match', () => {
        const theme = TokenTheme.createFromRawTokenTheme([
            { token: '', foreground: 'F8F8F2', background: '272822' },
            { token: 'source', background: '100000' },
            { token: 'something', background: '100000' },
            { token: 'bar', background: '200000' },
            { token: 'baz', background: '200000' },
            { token: 'bar', fontStyle: 'bold' },
            { token: 'constant', fontStyle: 'italic', foreground: '300000' },
            { token: 'constant.numeric', foreground: '400000' },
            { token: 'constant.numeric.hex', fontStyle: 'bold' },
            { token: 'constant.numeric.oct', fontStyle: 'bold italic underline' },
            { token: 'constant.numeric.bin', fontStyle: 'bold strikethrough' },
            { token: 'constant.numeric.dec', fontStyle: '', foreground: '500000' },
            { token: 'storage.object.bar', fontStyle: '', foreground: '600000' },
        ], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('F8F8F2');
        const _B = colorMap.getId('272822');
        const _C = colorMap.getId('200000');
        const _D = colorMap.getId('300000');
        const _E = colorMap.getId('400000');
        const _F = colorMap.getId('500000');
        const _G = colorMap.getId('100000');
        const _H = colorMap.getId('600000');
        function assertMatch(scopeName, expected) {
            const actual = theme._match(scopeName);
            assert.deepStrictEqual(actual, expected, 'when matching <<' + scopeName + '>>');
        }
        function assertSimpleMatch(scopeName, fontStyle, foreground, background) {
            assertMatch(scopeName, new ThemeTrieElementRule(fontStyle, foreground, background));
        }
        function assertNoMatch(scopeName) {
            assertMatch(scopeName, new ThemeTrieElementRule(0 /* FontStyle.None */, _A, _B));
        }
        // matches defaults
        assertNoMatch('');
        assertNoMatch('bazz');
        assertNoMatch('asdfg');
        // matches source
        assertSimpleMatch('source', 0 /* FontStyle.None */, _A, _G);
        assertSimpleMatch('source.ts', 0 /* FontStyle.None */, _A, _G);
        assertSimpleMatch('source.tss', 0 /* FontStyle.None */, _A, _G);
        // matches something
        assertSimpleMatch('something', 0 /* FontStyle.None */, _A, _G);
        assertSimpleMatch('something.ts', 0 /* FontStyle.None */, _A, _G);
        assertSimpleMatch('something.tss', 0 /* FontStyle.None */, _A, _G);
        // matches baz
        assertSimpleMatch('baz', 0 /* FontStyle.None */, _A, _C);
        assertSimpleMatch('baz.ts', 0 /* FontStyle.None */, _A, _C);
        assertSimpleMatch('baz.tss', 0 /* FontStyle.None */, _A, _C);
        // matches constant
        assertSimpleMatch('constant', 1 /* FontStyle.Italic */, _D, _B);
        assertSimpleMatch('constant.string', 1 /* FontStyle.Italic */, _D, _B);
        assertSimpleMatch('constant.hex', 1 /* FontStyle.Italic */, _D, _B);
        // matches constant.numeric
        assertSimpleMatch('constant.numeric', 1 /* FontStyle.Italic */, _E, _B);
        assertSimpleMatch('constant.numeric.baz', 1 /* FontStyle.Italic */, _E, _B);
        // matches constant.numeric.hex
        assertSimpleMatch('constant.numeric.hex', 2 /* FontStyle.Bold */, _E, _B);
        assertSimpleMatch('constant.numeric.hex.baz', 2 /* FontStyle.Bold */, _E, _B);
        // matches constant.numeric.oct
        assertSimpleMatch('constant.numeric.oct', 2 /* FontStyle.Bold */ | 1 /* FontStyle.Italic */ | 4 /* FontStyle.Underline */, _E, _B);
        assertSimpleMatch('constant.numeric.oct.baz', 2 /* FontStyle.Bold */ | 1 /* FontStyle.Italic */ | 4 /* FontStyle.Underline */, _E, _B);
        // matches constant.numeric.bin
        assertSimpleMatch('constant.numeric.bin', 2 /* FontStyle.Bold */ | 8 /* FontStyle.Strikethrough */, _E, _B);
        assertSimpleMatch('constant.numeric.bin.baz', 2 /* FontStyle.Bold */ | 8 /* FontStyle.Strikethrough */, _E, _B);
        // matches constant.numeric.dec
        assertSimpleMatch('constant.numeric.dec', 0 /* FontStyle.None */, _F, _B);
        assertSimpleMatch('constant.numeric.dec.baz', 0 /* FontStyle.None */, _F, _B);
        // matches storage.object.bar
        assertSimpleMatch('storage.object.bar', 0 /* FontStyle.None */, _H, _B);
        assertSimpleMatch('storage.object.bar.baz', 0 /* FontStyle.None */, _H, _B);
        // does not match storage.object.bar
        assertSimpleMatch('storage.object.bart', 0 /* FontStyle.None */, _A, _B);
        assertSimpleMatch('storage.object', 0 /* FontStyle.None */, _A, _B);
        assertSimpleMatch('storage', 0 /* FontStyle.None */, _A, _B);
        assertSimpleMatch('bar', 2 /* FontStyle.Bold */, _A, _C);
    });
});
suite('Token theme parsing', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('can parse', () => {
        const actual = parseTokenTheme([
            { token: '', foreground: 'F8F8F2', background: '272822' },
            { token: 'source', background: '100000' },
            { token: 'something', background: '100000' },
            { token: 'bar', background: '010000' },
            { token: 'baz', background: '010000' },
            { token: 'bar', fontStyle: 'bold' },
            { token: 'constant', fontStyle: 'italic', foreground: 'ff0000' },
            { token: 'constant.numeric', foreground: '00ff00' },
            { token: 'constant.numeric.hex', fontStyle: 'bold' },
            { token: 'constant.numeric.oct', fontStyle: 'bold italic underline' },
            { token: 'constant.numeric.dec', fontStyle: '', foreground: '0000ff' },
        ]);
        const expected = [
            new ParsedTokenThemeRule('', 0, -1 /* FontStyle.NotSet */, 'F8F8F2', '272822'),
            new ParsedTokenThemeRule('source', 1, -1 /* FontStyle.NotSet */, null, '100000'),
            new ParsedTokenThemeRule('something', 2, -1 /* FontStyle.NotSet */, null, '100000'),
            new ParsedTokenThemeRule('bar', 3, -1 /* FontStyle.NotSet */, null, '010000'),
            new ParsedTokenThemeRule('baz', 4, -1 /* FontStyle.NotSet */, null, '010000'),
            new ParsedTokenThemeRule('bar', 5, 2 /* FontStyle.Bold */, null, null),
            new ParsedTokenThemeRule('constant', 6, 1 /* FontStyle.Italic */, 'ff0000', null),
            new ParsedTokenThemeRule('constant.numeric', 7, -1 /* FontStyle.NotSet */, '00ff00', null),
            new ParsedTokenThemeRule('constant.numeric.hex', 8, 2 /* FontStyle.Bold */, null, null),
            new ParsedTokenThemeRule('constant.numeric.oct', 9, 2 /* FontStyle.Bold */ | 1 /* FontStyle.Italic */ | 4 /* FontStyle.Underline */, null, null),
            new ParsedTokenThemeRule('constant.numeric.dec', 10, 0 /* FontStyle.None */, '0000ff', null),
        ];
        assert.deepStrictEqual(actual, expected);
    });
});
suite('Token theme resolving', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('strcmp works', () => {
        const actual = ['bar', 'z', 'zu', 'a', 'ab', ''].sort(strcmp);
        const expected = ['', 'a', 'ab', 'bar', 'z', 'zu'];
        assert.deepStrictEqual(actual, expected);
    });
    test('always has defaults', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('000000');
        const _B = colorMap.getId('ffffff');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
        assert.deepStrictEqual(actual.getThemeTrieElement(), new ExternalThemeTrieElement(new ThemeTrieElementRule(0 /* FontStyle.None */, _A, _B)));
    });
    test('respects incoming defaults 1', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([new ParsedTokenThemeRule('', -1, -1 /* FontStyle.NotSet */, null, null)], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('000000');
        const _B = colorMap.getId('ffffff');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
        assert.deepStrictEqual(actual.getThemeTrieElement(), new ExternalThemeTrieElement(new ThemeTrieElementRule(0 /* FontStyle.None */, _A, _B)));
    });
    test('respects incoming defaults 2', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([new ParsedTokenThemeRule('', -1, 0 /* FontStyle.None */, null, null)], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('000000');
        const _B = colorMap.getId('ffffff');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
        assert.deepStrictEqual(actual.getThemeTrieElement(), new ExternalThemeTrieElement(new ThemeTrieElementRule(0 /* FontStyle.None */, _A, _B)));
    });
    test('respects incoming defaults 3', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([new ParsedTokenThemeRule('', -1, 2 /* FontStyle.Bold */, null, null)], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('000000');
        const _B = colorMap.getId('ffffff');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
        assert.deepStrictEqual(actual.getThemeTrieElement(), new ExternalThemeTrieElement(new ThemeTrieElementRule(2 /* FontStyle.Bold */, _A, _B)));
    });
    test('respects incoming defaults 4', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([new ParsedTokenThemeRule('', -1, -1 /* FontStyle.NotSet */, 'ff0000', null)], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('ff0000');
        const _B = colorMap.getId('ffffff');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
        assert.deepStrictEqual(actual.getThemeTrieElement(), new ExternalThemeTrieElement(new ThemeTrieElementRule(0 /* FontStyle.None */, _A, _B)));
    });
    test('respects incoming defaults 5', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([new ParsedTokenThemeRule('', -1, -1 /* FontStyle.NotSet */, null, 'ff0000')], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('000000');
        const _B = colorMap.getId('ff0000');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
        assert.deepStrictEqual(actual.getThemeTrieElement(), new ExternalThemeTrieElement(new ThemeTrieElementRule(0 /* FontStyle.None */, _A, _B)));
    });
    test('can merge incoming defaults', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([
            new ParsedTokenThemeRule('', -1, -1 /* FontStyle.NotSet */, null, 'ff0000'),
            new ParsedTokenThemeRule('', -1, -1 /* FontStyle.NotSet */, '00ff00', null),
            new ParsedTokenThemeRule('', -1, 2 /* FontStyle.Bold */, null, null),
        ], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('00ff00');
        const _B = colorMap.getId('ff0000');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
        assert.deepStrictEqual(actual.getThemeTrieElement(), new ExternalThemeTrieElement(new ThemeTrieElementRule(2 /* FontStyle.Bold */, _A, _B)));
    });
    test('defaults are inherited', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([
            new ParsedTokenThemeRule('', -1, -1 /* FontStyle.NotSet */, 'F8F8F2', '272822'),
            new ParsedTokenThemeRule('var', -1, -1 /* FontStyle.NotSet */, 'ff0000', null),
        ], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('F8F8F2');
        const _B = colorMap.getId('272822');
        const _C = colorMap.getId('ff0000');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
        const root = new ExternalThemeTrieElement(new ThemeTrieElementRule(0 /* FontStyle.None */, _A, _B), {
            var: new ExternalThemeTrieElement(new ThemeTrieElementRule(0 /* FontStyle.None */, _C, _B)),
        });
        assert.deepStrictEqual(actual.getThemeTrieElement(), root);
    });
    test('same rules get merged', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([
            new ParsedTokenThemeRule('', -1, -1 /* FontStyle.NotSet */, 'F8F8F2', '272822'),
            new ParsedTokenThemeRule('var', 1, 2 /* FontStyle.Bold */, null, null),
            new ParsedTokenThemeRule('var', 0, -1 /* FontStyle.NotSet */, 'ff0000', null),
        ], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('F8F8F2');
        const _B = colorMap.getId('272822');
        const _C = colorMap.getId('ff0000');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
        const root = new ExternalThemeTrieElement(new ThemeTrieElementRule(0 /* FontStyle.None */, _A, _B), {
            var: new ExternalThemeTrieElement(new ThemeTrieElementRule(2 /* FontStyle.Bold */, _C, _B)),
        });
        assert.deepStrictEqual(actual.getThemeTrieElement(), root);
    });
    test('rules are inherited 1', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([
            new ParsedTokenThemeRule('', -1, -1 /* FontStyle.NotSet */, 'F8F8F2', '272822'),
            new ParsedTokenThemeRule('var', -1, 2 /* FontStyle.Bold */, 'ff0000', null),
            new ParsedTokenThemeRule('var.identifier', -1, -1 /* FontStyle.NotSet */, '00ff00', null),
        ], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('F8F8F2');
        const _B = colorMap.getId('272822');
        const _C = colorMap.getId('ff0000');
        const _D = colorMap.getId('00ff00');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
        const root = new ExternalThemeTrieElement(new ThemeTrieElementRule(0 /* FontStyle.None */, _A, _B), {
            var: new ExternalThemeTrieElement(new ThemeTrieElementRule(2 /* FontStyle.Bold */, _C, _B), {
                identifier: new ExternalThemeTrieElement(new ThemeTrieElementRule(2 /* FontStyle.Bold */, _D, _B)),
            }),
        });
        assert.deepStrictEqual(actual.getThemeTrieElement(), root);
    });
    test('rules are inherited 2', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([
            new ParsedTokenThemeRule('', -1, -1 /* FontStyle.NotSet */, 'F8F8F2', '272822'),
            new ParsedTokenThemeRule('var', -1, 2 /* FontStyle.Bold */, 'ff0000', null),
            new ParsedTokenThemeRule('var.identifier', -1, -1 /* FontStyle.NotSet */, '00ff00', null),
            new ParsedTokenThemeRule('constant', 4, 1 /* FontStyle.Italic */, '100000', null),
            new ParsedTokenThemeRule('constant.numeric', 5, -1 /* FontStyle.NotSet */, '200000', null),
            new ParsedTokenThemeRule('constant.numeric.hex', 6, 2 /* FontStyle.Bold */, null, null),
            new ParsedTokenThemeRule('constant.numeric.oct', 7, 2 /* FontStyle.Bold */ | 1 /* FontStyle.Italic */ | 4 /* FontStyle.Underline */, null, null),
            new ParsedTokenThemeRule('constant.numeric.dec', 8, 0 /* FontStyle.None */, '300000', null),
        ], []);
        const colorMap = new ColorMap();
        const _A = colorMap.getId('F8F8F2');
        const _B = colorMap.getId('272822');
        const _C = colorMap.getId('100000');
        const _D = colorMap.getId('200000');
        const _E = colorMap.getId('300000');
        const _F = colorMap.getId('ff0000');
        const _G = colorMap.getId('00ff00');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
        const root = new ExternalThemeTrieElement(new ThemeTrieElementRule(0 /* FontStyle.None */, _A, _B), {
            var: new ExternalThemeTrieElement(new ThemeTrieElementRule(2 /* FontStyle.Bold */, _F, _B), {
                identifier: new ExternalThemeTrieElement(new ThemeTrieElementRule(2 /* FontStyle.Bold */, _G, _B)),
            }),
            constant: new ExternalThemeTrieElement(new ThemeTrieElementRule(1 /* FontStyle.Italic */, _C, _B), {
                numeric: new ExternalThemeTrieElement(new ThemeTrieElementRule(1 /* FontStyle.Italic */, _D, _B), {
                    hex: new ExternalThemeTrieElement(new ThemeTrieElementRule(2 /* FontStyle.Bold */, _D, _B)),
                    oct: new ExternalThemeTrieElement(new ThemeTrieElementRule(2 /* FontStyle.Bold */ | 1 /* FontStyle.Italic */ | 4 /* FontStyle.Underline */, _D, _B)),
                    dec: new ExternalThemeTrieElement(new ThemeTrieElementRule(0 /* FontStyle.None */, _E, _B)),
                }),
            }),
        });
        assert.deepStrictEqual(actual.getThemeTrieElement(), root);
    });
    test('custom colors are first in color map', () => {
        const actual = TokenTheme.createFromParsedTokenTheme([new ParsedTokenThemeRule('var', -1, -1 /* FontStyle.NotSet */, 'F8F8F2', null)], ['000000', 'FFFFFF', '0F0F0F']);
        const colorMap = new ColorMap();
        colorMap.getId('000000');
        colorMap.getId('FFFFFF');
        colorMap.getId('0F0F0F');
        colorMap.getId('F8F8F2');
        assert.deepStrictEqual(actual.getColorMap(), colorMap.getColorMap());
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2Rlcy9zdXBwb3J0cy90b2tlbml6YXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsT0FBTyxFQUNOLFFBQVEsRUFDUix3QkFBd0IsRUFDeEIsb0JBQW9CLEVBQ3BCLG9CQUFvQixFQUNwQixVQUFVLEVBQ1YsZUFBZSxFQUNmLE1BQU0sR0FDTixNQUFNLHVEQUF1RCxDQUFBO0FBRTlELEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7SUFDbEMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMseUNBQXlDLEVBQUUsR0FBRyxFQUFFO1FBQ3BELE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyx1QkFBdUIsQ0FDL0M7WUFDQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFO1lBQ3pELEVBQUUsS0FBSyxFQUFFLDBDQUEwQyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUU7WUFDM0UsRUFBRSxLQUFLLEVBQUUsK0JBQStCLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRTtTQUNoRSxFQUNELEVBQUUsQ0FDRixDQUFBO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQTtRQUMvQixRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3hCLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDbkMsUUFBUSxD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