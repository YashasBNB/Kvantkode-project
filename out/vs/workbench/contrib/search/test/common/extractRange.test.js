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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdFJhbmdlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvdGVzdC9jb21tb24vZXh0cmFjdFJhbmdlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRS9ELEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7SUFDcEMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUs7UUFDbkIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQTtRQUV6RCxLQUFLLE1BQU0sT0FBTyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNqRCxLQUFLLE1BQU0sTUFBTSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUN0QyxNQUFNLElBQUksR0FBRyxxQkFBcUIsQ0FBQTtnQkFFbEMsSUFBSSxHQUFHLEdBQUcsc0JBQXNCLENBQUMsR0FBRyxJQUFJLEdBQUcsT0FBTyxJQUFJLENBQUMsQ0FBQTtnQkFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FB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