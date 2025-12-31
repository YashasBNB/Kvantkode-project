/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { OneLineRange, TextSearchMatch, SearchRange, } from '../../common/search.js';
suite('TextSearchResult', () => {
    const previewOptions1 = {
        matchLines: 1,
        charsPerLine: 100,
    };
    function assertOneLinePreviewRangeText(text, result) {
        assert.strictEqual(result.rangeLocations.length, 1);
        assert.strictEqual(result.previewText.substring(result.rangeLocations[0].preview.startColumn, result.rangeLocations[0].preview.endColumn), text);
    }
    function getFirstSourceFromResult(result) {
        return result.rangeLocations.map((e) => e.source)[0];
    }
    ensureNoDisposablesAreLeakedInTestSuite();
    test('empty without preview options', () => {
        const range = new OneLineRange(5, 0, 0);
        const result = new TextSearchMatch('', range);
        assert.deepStrictEqual(getFirstSourceFromResult(result), range);
        assertOneLinePreviewRangeText('', result);
    });
    test('empty with preview options', () => {
        const range = new OneLineRange(5, 0, 0);
        const result = new TextSearchMatch('', range, previewOptions1);
        assert.deepStrictEqual(getFirstSourceFromResult(result), range);
        assertOneLinePreviewRangeText('', result);
    });
    test('short without preview options', () => {
        const range = new OneLineRange(5, 4, 7);
        const result = new TextSearchMatch('foo bar', range);
        assert.deepStrictEqual(getFirstSourceFromResult(result), range);
        assertOneLinePreviewRangeText('bar', result);
    });
    test('short with preview options', () => {
        const range = new OneLineRange(5, 4, 7);
        const result = new TextSearchMatch('foo bar', range, previewOptions1);
        assert.deepStrictEqual(getFirstSourceFromResult(result), range);
        assertOneLinePreviewRangeText('bar', result);
    });
    test('leading', () => {
        const range = new OneLineRange(5, 25, 28);
        const result = new TextSearchMatch('long text very long text foo', range, previewOptions1);
        assert.deepStrictEqual(getFirstSourceFromResult(result), range);
        assertOneLinePreviewRangeText('foo', result);
    });
    test('trailing', () => {
        const range = new OneLineRange(5, 0, 3);
        const result = new TextSearchMatch('foo long text very long text long text very long text long text very long text long text very long text long text very long text', range, previewOptions1);
        assert.deepStrictEqual(getFirstSourceFromResult(result), range);
        assertOneLinePreviewRangeText('foo', result);
    });
    test('middle', () => {
        const range = new OneLineRange(5, 30, 33);
        const result = new TextSearchMatch('long text very long text long foo text very long text long text very long text long text very long text long text very long text', range, previewOptions1);
        assert.deepStrictEqual(getFirstSourceFromResult(result), range);
        assertOneLinePreviewRangeText('foo', result);
    });
    test('truncating match', () => {
        const previewOptions = {
            matchLines: 1,
            charsPerLine: 1,
        };
        const range = new OneLineRange(0, 4, 7);
        const result = new TextSearchMatch('foo bar', range, previewOptions);
        assert.deepStrictEqual(getFirstSourceFromResult(result), range);
        assertOneLinePreviewRangeText('b', result);
    });
    test('one line of multiline match', () => {
        const previewOptions = {
            matchLines: 1,
            charsPerLine: 10000,
        };
        const range = new SearchRange(5, 4, 6, 3);
        const result = new TextSearchMatch('foo bar\nfoo bar', range, previewOptions);
        assert.deepStrictEqual(getFirstSourceFromResult(result), range);
        assert.strictEqual(result.previewText, 'foo bar\nfoo bar');
        assert.strictEqual(result.rangeLocations.length, 1);
        assert.strictEqual(result.rangeLocations[0].preview.startLineNumber, 0);
        assert.strictEqual(result.rangeLocations[0].preview.startColumn, 4);
        assert.strictEqual(result.rangeLocations[0].preview.endLineNumber, 1);
        assert.strictEqual(result.rangeLocations[0].preview.endColumn, 3);
    });
    test('compacts multiple ranges on long lines', () => {
        const previewOptions = {
            matchLines: 1,
            charsPerLine: 10,
        };
        const range1 = new SearchRange(5, 4, 5, 7);
        const range2 = new SearchRange(5, 133, 5, 136);
        const range3 = new SearchRange(5, 141, 5, 144);
        const result = new TextSearchMatch('foo bar 123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890 foo bar baz bar', [range1, range2, range3], previewOptions);
        assert.deepStrictEqual(result.rangeLocations.map((e) => e.preview), [new OneLineRange(0, 4, 7), new OneLineRange(0, 42, 45), new OneLineRange(0, 50, 53)]);
        assert.strictEqual(result.previewText, 'foo bar 123456⟪ 117 characters skipped ⟫o bar baz bar');
    });
    test('trims lines endings', () => {
        const range = new SearchRange(5, 3, 5, 5);
        const previewOptions = {
            matchLines: 1,
            charsPerLine: 10000,
        };
        assert.strictEqual(new TextSearchMatch('foo bar\n', range, previewOptions).previewText, 'foo bar');
        assert.strictEqual(new TextSearchMatch('foo bar\r\n', range, previewOptions).previewText, 'foo bar');
    });
    // test('all lines of multiline match', () => {
    // 	const previewOptions: ITextSearchPreviewOptions = {
    // 		matchLines: 5,
    // 		charsPerLine: 10000
    // 	};
    // 	const range = new SearchRange(5, 4, 6, 3);
    // 	const result = new TextSearchResult('foo bar\nfoo bar', range, previewOptions);
    // 	assert.deepStrictEqual(result.range, range);
    // 	assertPreviewRangeText('bar\nfoo', result);
    // });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL3Rlc3QvY29tbW9uL3NlYXJjaC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBRU4sWUFBWSxFQUNaLGVBQWUsRUFDZixXQUFXLEdBQ1gsTUFBTSx3QkFBd0IsQ0FBQTtBQUUvQixLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQzlCLE1BQU0sZUFBZSxHQUE4QjtRQUNsRCxVQUFVLEVBQUUsQ0FBQztRQUNiLFlBQVksRUFBRSxHQUFHO0tBQ2pCLENBQUE7SUFFRCxTQUFTLDZCQUE2QixDQUFDLElBQVksRUFBRSxNQUF1QjtRQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUMzQixNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQzVDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FDMUMsRUFDRCxJQUFJLENBQ0osQ0FBQTtJQUNGLENBQUM7SUFFRCxTQUFTLHdCQUF3QixDQUFDLE1BQXVCO1FBQ3hELE9BQU8sTUFBTSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJ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