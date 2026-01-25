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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbkxhYmVscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2ljb25MYWJlbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUNOLFdBQVcsRUFDWCxtQkFBbUIsRUFFbkIsMEJBQTBCLEVBQzFCLHFCQUFxQixFQUNyQixtQkFBbUIsRUFDbkIsVUFBVSxHQUNWLE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBT3BFLFNBQVMsUUFBUSxDQUNoQixNQUFtQixFQUNuQixJQUFZLEVBQ1osTUFBNkIsRUFDN0IsVUFBNkM7SUFFN0MsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUM5QixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDVCxJQUFJLFVBQVUsRUFBRSxDQUFDO1FBQ2hCLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQ3RDLENBQUM7QUFDRixDQUFDO0FBRUQsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7SUFDekIsSUFBSSxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtRQUN2QyxnREFBZ0Q7UUFDaEQsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLENBQWlCO1lBQ3pDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNSLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQztZQUNoQixDQUFDLHFCQUFxQixFQUFFLG9CQUFvQixDQUFDO1lBQzdDLENBQUMsdUJBQXVCLEVBQUUsc0JBQXNCLENBQUM7WUFDakQsQ0FBQyxlQUFlLEVBQUUsYUFB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