/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { FindMatch } from '../../../../../editor/common/model.js';
import { getTextSearchMatchWithModelContext, editorMatchesToTextSearchResults, } from '../../common/searchHelpers.js';
suite('SearchHelpers', () => {
    suite('editorMatchesToTextSearchResults', () => {
        ensureNoDisposablesAreLeakedInTestSuite();
        const mockTextModel = {
            getLineContent(lineNumber) {
                return '' + lineNumber;
            },
        };
        function assertRangesEqual(actual, expected) {
            if (!Array.isArray(actual)) {
                // All of these tests are for arrays...
                throw new Error('Expected array of ranges');
            }
            assert.strictEqual(actual.length, expected.length);
            // These are sometimes Range, sometimes SearchRange
            actual.forEach((r, i) => {
                const expectedRange = expected[i];
                assert.deepStrictEqual({
                    startLineNumber: r.startLineNumber,
                    startColumn: r.startColumn,
                    endLineNumber: r.endLineNumber,
                    endColumn: r.endColumn,
                }, {
                    startLineNumber: expectedRange.startLineNumber,
                    startColumn: expectedRange.startColumn,
                    endLineNumber: expectedRange.endLineNumber,
                    endColumn: expectedRange.endColumn,
                });
            });
        }
        test('simple', () => {
            const results = editorMatchesToTextSearchResults([new FindMatch(new Range(6, 1, 6, 2), null)], mockTextModel);
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].previewText, '6\n');
            assertRangesEqual(results[0].rangeLocations.map((e) => e.preview), [new Range(0, 0, 0, 1)]);
            assertRangesEqual(results[0].rangeLocations.map((e) => e.source), [new Range(5, 0, 5, 1)]);
        });
        test('multiple', () => {
            const results = editorMatchesToTextSearchResults([
                new FindMatch(new Range(6, 1, 6, 2), null),
                new FindMatch(new Range(6, 4, 8, 2), null),
                new FindMatch(new Range(9, 1, 10, 3), null),
            ], mockTextModel);
            assert.strictEqual(results.length, 2);
            assertRangesEqual(results[0].rangeLocations.map((e) => e.preview), [new Range(0, 0, 0, 1), new Range(0, 3, 2, 1)]);
            assertRangesEqual(results[0].rangeLocations.map((e) => e.source), [new Range(5, 0, 5, 1), new Range(5, 3, 7, 1)]);
            assert.strictEqual(results[0].previewText, '6\n7\n8\n');
            assertRangesEqual(results[1].rangeLocations.map((e) => e.preview), [new Range(0, 0, 1, 2)]);
            assertRangesEqual(results[1].rangeLocations.map((e) => e.source), [new Range(8, 0, 9, 2)]);
            assert.strictEqual(results[1].previewText, '9\n10\n');
        });
    });
    suite('addContextToEditorMatches', () => {
        ensureNoDisposablesAreLeakedInTestSuite();
        const MOCK_LINE_COUNT = 100;
        const mockTextModel = {
            getLineContent(lineNumber) {
                if (lineNumber < 1 || lineNumber > MOCK_LINE_COUNT) {
                    throw new Error(`invalid line count: ${lineNumber}`);
                }
                return '' + lineNumber;
            },
            getLineCount() {
                return MOCK_LINE_COUNT;
            },
        };
        function getQuery(surroundingContext) {
            return {
                folderQueries: [],
                type: 2 /* QueryType.Text */,
                contentPattern: { pattern: 'test' },
                surroundingContext,
            };
        }
        test('no context', () => {
            const matches = [
                {
                    previewText: 'foo',
                    rangeLocations: [
                        {
                            preview: new Range(0, 0, 0, 10),
                            source: new Range(0, 0, 0, 10),
                        },
                    ],
                },
            ];
            assert.deepStrictEqual(getTextSearchMatchWithModelContext(matches, mockTextModel, getQuery()), matches);
        });
        test('simple', () => {
            const matches = [
                {
                    previewText: 'foo',
                    rangeLocations: [
                        {
                            preview: new Range(0, 0, 0, 10),
                            source: new Range(1, 0, 1, 10),
                        },
                    ],
                },
            ];
            assert.deepStrictEqual(getTextSearchMatchWithModelContext(matches, mockTextModel, getQuery(1)), [
                {
                    text: '1',
                    lineNumber: 1,
                },
                ...matches,
                {
                    text: '3',
                    lineNumber: 3,
                },
            ]);
        });
        test('multiple matches next to each other', () => {
            const matches = [
                {
                    previewText: 'foo',
                    rangeLocations: [
                        {
                            preview: new Range(0, 0, 0, 10),
                            source: new Range(1, 0, 1, 10),
                        },
                    ],
                },
                {
                    previewText: 'bar',
                    rangeLocations: [
                        {
                            preview: new Range(0, 0, 0, 10),
                            source: new Range(2, 0, 2, 10),
                        },
                    ],
                },
            ];
            assert.deepStrictEqual(getTextSearchMatchWithModelContext(matches, mockTextModel, getQuery(1)), [
                {
                    text: '1',
                    lineNumber: 1,
                },
                ...matches,
                {
                    text: '4',
                    lineNumber: 4,
                },
            ]);
        });
        test('boundaries', () => {
            const matches = [
                {
                    previewText: 'foo',
                    rangeLocations: [
                        {
                            preview: new Range(0, 0, 0, 10),
                            source: new Range(0, 0, 0, 10),
                        },
                    ],
                },
                {
                    previewText: 'bar',
                    rangeLocations: [
                        {
                            preview: new Range(0, 0, 0, 10),
                            source: new Range(MOCK_LINE_COUNT - 1, 0, MOCK_LINE_COUNT - 1, 10),
                        },
                    ],
                },
            ];
            assert.deepStrictEqual(getTextSearchMatchWithModelContext(matches, mockTextModel, getQuery(1)), [
                matches[0],
                {
                    text: '2',
                    lineNumber: 2,
                },
                {
                    text: '' + (MOCK_LINE_COUNT - 1),
                    lineNumber: MOCK_LINE_COUNT - 1,
                },
                matches[1],
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoSGVscGVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC90ZXN0L2NvbW1vbi9zZWFyY2hIZWxwZXJzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUFjLE1BQU0sdUNBQXVDLENBQUE7QUFRN0UsT0FBTyxFQUNOLGtDQUFrQyxFQUNsQyxnQ0FBZ0MsR0FDaEMsTUFBTSwrQkFBK0IsQ0FBQTtBQUV0QyxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtJQUMzQixLQUFLLENBQUMsa0NBQWtDLEVBQUUsR0FBRyxFQUFFO1FBQzlDLHVDQUF1QyxFQUFFLENBQUE7UUFDekMsTUFBTSxhQUFhLEdBQUc7WUFDckIsY0FBYyxDQUFDLFVBQWtCO2dCQUNoQyxPQUFPLEVBQUUsR0FBRyxVQUFVLENBQUE7WUFDdkIsQ0FBQztTQUNhLENBQUE7UUFFZixTQUFTLGlCQUFpQixDQUFDLE1BQXFDLEVBQUUsUUFBd0I7WUFDekYsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDNUIsdUNBQXVDO2dCQUN2QyxNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixDQUFDLENBQUE7WUFDNUMsQ0FBQztZQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7WUFFbEQsbURBQW1EO1lBQ25ELE1BQU0sQ0FBQyxPQUFP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