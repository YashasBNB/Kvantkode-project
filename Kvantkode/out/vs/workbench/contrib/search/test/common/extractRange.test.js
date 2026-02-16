/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { extractRangeFromFilter } from '../../common/search.js';
suite('extractRangeFromFilter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('basics', async function () {
        assert.ok(!extractRangeFromFilter(''));
        assert.ok(!extractRangeFromFilter('/some/path'));
        assert.ok(!extractRangeFromFilter('/some/path/file.txt'));
        for (const lineSep of [':', '#', '(', ':line ']) {
            for (const colSep of [':', '#', ',']) {
                const base = '/some/path/file.txt';
                let res = extractRangeFromFilter(`${base}${lineSep}20`);
                assert.strictEqual(res?.filter, base);
                assert.strictEqual(res?.range.startLineNumber, 20);
                assert.strictEqual(res?.range.startColumn, 1);
                res = extractRangeFromFilter(`${base}${lineSep}20${colSep}`);
                assert.strictEqual(res?.filter, base);
                assert.strictEqual(res?.range.startLineNumber, 20);
                assert.strictEqual(res?.range.startColumn, 1);
                res = extractRangeFromFilter(`${base}${lineSep}20${colSep}3`);
                assert.strictEqual(res?.filter, base);
                assert.strictEqual(res?.range.startLineNumber, 20);
                assert.strictEqual(res?.range.startColumn, 3);
            }
        }
    });
    test('allow space after path', async function () {
        const res = extractRangeFromFilter('/some/path/file.txt (19,20)');
        assert.strictEqual(res?.filter, '/some/path/file.txt');
        assert.strictEqual(res?.range.startLineNumber, 19);
        assert.strictEqual(res?.range.startColumn, 20);
    });
    suite('unless', function () {
        const testSpecs = [
            // alpha-only symbol after unless
            { filter: '/some/path/file.txt@alphasymbol', unless: ['@'], result: undefined },
            // unless as first char
            { filter: '@/some/path/file.txt (19,20)', unless: ['@'], result: undefined },
            // unless as last char
            { filter: '/some/path/file.txt (19,20)@', unless: ['@'], result: undefined },
            // unless before ,
            {
                filter: '/some/@path/file.txt (19,20)',
                unless: ['@'],
                result: {
                    filter: '/some/@path/file.txt',
                    range: {
                        endColumn: 20,
                        endLineNumber: 19,
                        startColumn: 20,
                        startLineNumber: 19,
                    },
                },
            },
            // unless before :
            {
                filter: '/some/@path/file.txt:19:20',
                unless: ['@'],
                result: {
                    filter: '/some/@path/file.txt',
                    range: {
                        endColumn: 20,
                        endLineNumber: 19,
                        startColumn: 20,
                        startLineNumber: 19,
                    },
                },
            },
            // unless before #
            {
                filter: '/some/@path/file.txt#19',
                unless: ['@'],
                result: {
                    filter: '/some/@path/file.txt',
                    range: {
                        endColumn: 1,
                        endLineNumber: 19,
                        startColumn: 1,
                        startLineNumber: 19,
                    },
                },
            },
        ];
        for (const { filter, unless, result } of testSpecs) {
            test(`${filter} - ${JSON.stringify(unless)}`, () => {
                assert.deepStrictEqual(extractRangeFromFilter(filter, unless), result);
            });
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdFJhbmdlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC90ZXN0L2NvbW1vbi9leHRyYWN0UmFuZ2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFL0QsS0FBSyxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtJQUNwQyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSztRQUNuQixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsc0JBQXNCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsc0JBQXNCLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFBO1FBRXpELEtBQUssTUFBTSxPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ2pELEtBQUssTUFBTSxNQUFNLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RDLE1BQU0sSUFBSSxHQUFHLHFCQUFxQixDQUFBO2dCQUVsQyxJQUFJLEdBQUcsR0FBRyxzQkFBc0IsQ0FBQyxHQUFHLElBQUksR0FBRyxPQUFPLElBQUksQ0FBQyxDQUFBO2dC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