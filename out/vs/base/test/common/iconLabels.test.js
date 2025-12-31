/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { escapeIcons, getCodiconAriaLabel, markdownEscapeEscapedIcons, matchesFuzzyIconAware, parseLabelWithIcons, stripIcons, } from '../../common/iconLabels.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
function filterOk(filter, word, target, highlights) {
    const r = filter(word, target);
    assert(r);
    if (highlights) {
        assert.deepStrictEqual(r, highlights);
    }
}
suite('Icon Labels', () => {
    test('Can get proper aria labels', () => {
        // note, the spaces in the results are important
        const testCases = new Map([
            ['', ''],
            ['asdf', 'asdf'],
            ['asdf$(squirrel)asdf', 'asdf squirrel asdf'],
            ['asdf $(squirrel) asdf', 'asdf  squirrel  asdf'],
            ['$(rocket)asdf', 'rocket asdf'],
            ['$(rocket) asdf', 'rocket  asdf'],
            ['$(rocket)$(rocket)$(rocket)asdf', 'rocket  rocket  rocket asdf'],
            ['$(rocket) asdf $(rocket)', 'rocket  asdf  rocket'],
            ['$(rocket)asdf$(rocket)', 'rocket asdf rocket'],
        ]);
        for (const [input, expected] of testCases) {
            assert.strictEqual(getCodiconAriaLabel(input), expected);
        }
    });
    test('matchesFuzzyIconAware', () => {
        // Camel Case
        filterOk(matchesFuzzyIconAware, 'ccr', parseLabelWithIcons('$(codicon)CamelCaseRocks$(codicon)'), [
            { start: 10, end: 11 },
            { start: 15, end: 16 },
            { start: 19, end: 20 },
        ]);
        filterOk(matchesFuzzyIconAware, 'ccr', parseLabelWithIcons('$(codicon) CamelCaseRocks $(codicon)'), [
            { start: 11, end: 12 },
            { start: 16, end: 17 },
            { start: 20, end: 21 },
        ]);
        filterOk(matchesFuzzyIconAware, 'iut', parseLabelWithIcons('$(codicon) Indent $(octico) Using $(octic) Tpaces'), [
            { start: 11, end: 12 },
            { start: 28, end: 29 },
            { start: 43, end: 44 },
        ]);
        // Prefix
        filterOk(matchesFuzzyIconAware, 'using', parseLabelWithIcons('$(codicon) Indent Using Spaces'), [{ start: 18, end: 23 }]);
        // Broken Codicon
        filterOk(matchesFuzzyIconAware, 'codicon', parseLabelWithIcons('This $(codicon Indent Using Spaces'), [{ start: 7, end: 14 }]);
        filterOk(matchesFuzzyIconAware, 'indent', parseLabelWithIcons('This $codicon Indent Using Spaces'), [{ start: 14, end: 20 }]);
        // Testing #59343
        filterOk(matchesFuzzyIconAware, 'unt', parseLabelWithIcons('$(primitive-dot) $(file-text) Untitled-1'), [{ start: 30, end: 33 }]);
        // Testing #136172
        filterOk(matchesFuzzyIconAware, 's', parseLabelWithIcons('$(loading~spin) start'), [
            { start: 16, end: 17 },
        ]);
    });
    test('stripIcons', () => {
        assert.strictEqual(stripIcons('Hello World'), 'Hello World');
        assert.strictEqual(stripIcons('$(Hello World'), '$(Hello World');
        assert.strictEqual(stripIcons('$(Hello) World'), ' World');
        assert.strictEqual(stripIcons('$(Hello) W$(oi)rld'), ' Wrld');
    });
    test('escapeIcons', () => {
        assert.strictEqual(escapeIcons('Hello World'), 'Hello World');
        assert.strictEqual(escapeIcons('$(Hello World'), '$(Hello World');
        assert.strictEqual(escapeIcons('$(Hello) World'), '\\$(Hello) World');
        assert.strictEqual(escapeIcons('\\$(Hello) W$(oi)rld'), '\\$(Hello) W\\$(oi)rld');
    });
    test('markdownEscapeEscapedIcons', () => {
        assert.strictEqual(markdownEscapeEscapedIcons('Hello World'), 'Hello World');
        assert.strictEqual(markdownEscapeEscapedIcons('$(Hello) World'), '$(Hello) World');
        assert.strictEqual(markdownEscapeEscapedIcons('\\$(Hello) World'), '\\\\$(Hello) World');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbkxhYmVscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9pY29uTGFiZWxzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFDTixXQUFXLEVBQ1gsbUJBQW1CLEVBRW5CLDBCQUEwQixFQUMxQixxQkFBcUIsRUFDckIsbUJBQW1CLEVBQ25CLFVBQVUsR0FDVixNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQU9wRSxTQUFTLFFBQVEsQ0FDaEIsTUFBbUIsRUFDbkIsSUFBWSxFQUNaLE1BQTZCLEVBQzdCLFVBQTZDO0lBRTdDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDOUIsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ1QsSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUNoQixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0FBQ0YsQ0FBQztBQUVELEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO0lBQ3pCLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7UUFDdkMsZ0RBQWdEO1FBQ2hELE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFpQjtZQUN6QyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDUixDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUM7WUFDaEIsQ0FBQyxxQkFBcUIsRUFBRSxvQkFBb0IsQ0FBQztZQUM3QyxDQUFDLHVCQUF1QixFQUFFLHNCQUFzQixDQUFDO1lBQ2pELENBQUMsZUFBZSxFQUFFLGFBQWEsQ0FB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