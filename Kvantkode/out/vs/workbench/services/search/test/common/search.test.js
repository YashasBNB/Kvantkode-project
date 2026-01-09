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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvdGVzdC9jb21tb24vc2VhcmNoLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFFTixZQUFZLEVBQ1osZUFBZSxFQUNmLFdBQVcsR0FDWCxNQUFNLHdCQUF3QixDQUFBO0FBRS9CLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDOUIsTUFBTSxlQUFlLEdBQThCO1FBQ2xELFVBQVUsRUFBRSxDQUFDO1FBQ2IsWUFBWSxFQUFFLEdBQUc7S0FDakIsQ0FBQTtJQUVELFNBQVMsNkJBQTZCLENBQUMsSUFBWSxFQUFFLE1BQXVCO1FBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FDakIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQzNCLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFDNUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUMxQyxFQUNELElBQUksQ0FDSixDQUFBO0lBQ0YsQ0FBQztJQUVELFNBQVMsd0JBQXdCLENBQUMsTUFBdUI7UUFDeEQsT0FBTyxNQUFNLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFRCx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQywrQkFBK0IsRUFBRSxHQUFHLEVBQUU7UUFDMUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQWUsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMvRCw2QkFBNkIsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDMUMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO1FBQ3ZDLE1BQU0sS0FBSyxHQUFHLElBQUksWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsTUFBTSxNQUFNLEdBQUcsSUFBSSxlQUFlLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUM5RCxNQUFNLENBQUMsZUFBZSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQy9ELDZCQUE2QixDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUMxQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywrQkFBK0IsRUFBRSxHQUFHLEVBQUU7UUFDMUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQWUsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMvRCw2QkFBNkIsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDN0MsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO1FBQ3ZDLE1BQU0sS0FBSyxHQUFHLElBQUksWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsTUFBTSxNQUFNLEdBQUcsSUFBSSxlQUFlLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsZUFBZSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQy9ELDZCQUE2QixDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUM3QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO1FBQ3BCLE1BQU0sS0FBSyxHQUFHLElBQUksWUFBWSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDekMsTUFBTSxNQUFNLEdBQUcsSUFBSSxlQUFlLENBQUMsOEJBQThCLEVBQUUsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQzFGLE1BQU0sQ0FBQyxlQUFlLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDL0QsNkJBQTZCLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQzdDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7UUFDckIsTUFBTSxLQUFLLEdBQUcsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQWUsQ0FDakMsa0lBQWtJLEVBQ2xJLEtBQUssRUFDTCxlQUFlLENBQ2YsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDL0QsNkJBQTZCLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQzdDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7UUFDbkIsTUFBTSxLQUFLLEdBQUcsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN6QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQWUsQ0FDakMsa0lBQWtJLEVBQ2xJLEtBQUssRUFDTCxlQUFlLENBQ2YsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDL0QsNkJBQTZCLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQzdDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtRQUM3QixNQUFNLGNBQWMsR0FBOEI7WUFDakQsVUFBVSxFQUFFLENBQUM7WUFDYixZQUFZLEVBQUUsQ0FBQztTQUNmLENBQUE7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sTUFBTSxHQUFHLElBQUksZUFBZSxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMvRCw2QkFBNkIsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDM0MsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO1FBQ3hDLE1BQU0sY0FBYyxHQUE4QjtZQUNqRCxVQUFVLEVBQUUsQ0FBQztZQUNiLFlBQVksRUFBRSxLQUFLO1NBQ25CLENBQUE7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQWUsQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDN0UsTUFBTSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25FLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ2xFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEdBQUcsRUFBRTtRQUNuRCxNQUFNLGNBQWMsR0FBOEI7WUFDakQsVUFBVSxFQUFFLENBQUM7WUFDYixZQUFZLEVBQUUsRUFBRTtTQUNoQixDQUFBO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxXQUFXLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDOUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxXQUFXLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDOUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxlQUFlLENBQ2pDLGtKQUFrSixFQUNsSixDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQ3hCLGNBQWMsQ0FDZCxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsTUFBTSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFDM0MsQ0FBQyxJQUFJLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksWUFBWSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUNyRixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLHVEQUF1RCxDQUFDLENBQUE7SUFDaEcsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ2hDLE1BQU0sS0FBSyxHQUFHLElBQUksV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sY0FBYyxHQUE4QjtZQUNqRCxVQUFVLEVBQUUsQ0FBQztZQUNiLFlBQVksRUFBRSxLQUFLO1NBQ25CLENBQUE7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUNqQixJQUFJLGVBQWUsQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFDLFdBQVcsRUFDbkUsU0FBUyxDQUNULENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixJQUFJLGVBQWUsQ0FBQyxhQUFhLEVBQUUsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFDLFdBQVcsRUFDckUsU0FBUyxDQUNULENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLCtDQUErQztJQUMvQyx1REFBdUQ7SUFDdkQsbUJBQW1CO0lBQ25CLHdCQUF3QjtJQUN4QixNQUFNO0lBRU4sOENBQThDO0lBQzlDLG1GQUFtRjtJQUNuRixnREFBZ0Q7SUFDaEQsK0NBQStDO0lBQy9DLE1BQU07QUFDUCxDQUFDLENBQUMsQ0FBQSJ9