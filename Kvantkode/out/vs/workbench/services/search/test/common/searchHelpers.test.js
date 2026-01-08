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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoSGVscGVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL3Rlc3QvY29tbW9uL3NlYXJjaEhlbHBlcnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQWMsTUFBTSx1Q0FBdUMsQ0FBQTtBQVE3RSxPQUFPLEVBQ04sa0NBQWtDLEVBQ2xDLGdDQUFnQyxHQUNoQyxNQUFNLCtCQUErQixDQUFBO0FBRXRDLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzNCLEtBQUssQ0FBQyxrQ0FBa0MsRUFBRSxHQUFHLEVBQUU7UUFDOUMsdUNBQXVDLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLGFBQWEsR0FBRztZQUNyQixjQUFjLENBQUMsVUFBa0I7Z0JBQ2hDLE9BQU8sRUFBRSxHQUFHLFVBQVUsQ0FBQTtZQUN2QixDQUFDO1NBQ2EsQ0FBQTtRQUVmLFNBQVMsaUJBQWlCLENBQUMsTUFBcUMsRUFBRSxRQUF3QjtZQUN6RixJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUM1Qix1Q0FBdUM7Z0JBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtZQUM1QyxDQUFDO1lBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUVsRCxtREFBbUQ7WUFDbkQsTUFBTSxDQUFD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