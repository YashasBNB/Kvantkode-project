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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZXMvc3VwcG9ydHMvdG9rZW5pemF0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLE9BQU8sRUFDTixRQUFRLEVBQ1Isd0JBQXdCLEVBQ3hCLG9CQUFvQixFQUNwQixvQkFBb0IsRUFDcEIsVUFBVSxFQUNWLGVBQWUsRUFDZixNQUFNLEdBQ04sTUFBTSx1REFBdUQsQ0FBQTtBQUU5RCxLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO0lBQ2xDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLHlDQUF5QyxFQUFFLEdBQUcsRUFBRTtRQUNwRCxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsdUJBQXVCLENBQy9DO1lBQ0MsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRTtZQUN6RCxFQUFFLEtBQUssRUFBRSwwQ0FBMEMsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFO1lBQzNFLEVBQUUsS0FBSyxFQUFFLCtCQUErQixFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUU7U0FDaEUsRUFDRCxFQUFFLENBQ0YsQ0FBQTtRQUVELE1BQU0sUUFBUSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUE7UUFDL0IsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN4QixNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ25DLFFBQVEsQ0FBQyxL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