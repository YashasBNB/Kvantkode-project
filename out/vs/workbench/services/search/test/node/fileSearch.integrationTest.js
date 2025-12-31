/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { FileAccess } from '../../../../../base/common/network.js';
import * as path from '../../../../../base/common/path.js';
import { URI } from '../../../../../base/common/uri.js';
import { flakySuite } from '../../../../../base/test/node/testUtils.js';
import { isProgressMessage, } from '../../common/search.js';
import { SearchService } from '../../node/rawSearchService.js';
const TEST_FIXTURES = path.normalize(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath);
const TEST_FIXTURES2 = path.normalize(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures2').fsPath);
const EXAMPLES_FIXTURES = path.join(TEST_FIXTURES, 'examples');
const MORE_FIXTURES = path.join(TEST_FIXTURES, 'more');
const TEST_ROOT_FOLDER = { folder: URI.file(TEST_FIXTURES) };
const ROOT_FOLDER_QUERY = [TEST_ROOT_FOLDER];
const MULTIROOT_QUERIES = [
    { folder: URI.file(EXAMPLES_FIXTURES), folderName: 'examples_folder' },
    { folder: URI.file(MORE_FIXTURES) },
];
const numThreads = undefined;
async function doSearchTest(query, expectedResultCount) {
    const svc = new SearchService();
    const results = [];
    await svc.doFileSearch(query, numThreads, (e) => {
        if (!isProgressMessage(e)) {
            if (Array.isArray(e)) {
                results.push(...e);
            }
            else {
                results.push(e);
            }
        }
    });
    assert.strictEqual(results.length, expectedResultCount, `rg ${results.length} !== ${expectedResultCount}`);
}
flakySuite('FileSearch-integration', function () {
    test('File - simple', () => {
        const config = {
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
        };
        return doSearchTest(config, 14);
    });
    test('File - filepattern', () => {
        const config = {
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: 'anotherfile',
        };
        return doSearchTest(config, 1);
    });
    test('File - exclude', () => {
        const config = {
            type: 1 /* QueryType.File */,
            folderQueries: ROOT_FOLDER_QUERY,
            filePattern: 'file',
            excludePattern: { '**/anotherfolder/**': true },
        };
        return doSearchTest(config, 2);
    });
    test('File - multiroot', () => {
        const config = {
            type: 1 /* QueryType.File */,
            folderQueries: MULTIROOT_QUERIES,
            filePattern: 'file',
            excludePattern: { '**/anotherfolder/**': true },
        };
        return doSearchTest(config, 2);
    });
    test('File - multiroot with folder name', () => {
        const config = {
            type: 1 /* QueryType.File */,
            folderQueries: MULTIROOT_QUERIES,
            filePattern: 'examples_folder anotherfile',
        };
        return doSearchTest(config, 1);
    });
    test('File - multiroot with folder name and sibling exclude', () => {
        const config = {
            type: 1 /* QueryType.File */,
            folderQueries: [
                { folder: URI.file(TEST_FIXTURES), folderName: 'folder1' },
                { folder: URI.file(TEST_FIXTURES2) },
            ],
            filePattern: 'folder1 site',
            excludePattern: { '*.css': { when: '$(basename).less' } },
        };
        return doSearchTest(config, 1);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVNlYXJjaC5pbnRlZ3JhdGlvblRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL3Rlc3Qvbm9kZS9maWxlU2VhcmNoLmludGVncmF0aW9uVGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2xFLE9BQU8sS0FBSyxJQUFJLE1BQU0sb0NBQW9DLENBQUE7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN2RSxPQUFPLEVBSU4saUJBQWlCLEdBRWpCLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRTlELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ25DLFVBQVUsQ0FBQyxTQUFTLENBQUMsaURBQWlELENBQUMsQ0FBQyxNQUFNLENBQzlFLENBQUE7QUFDRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNwQyxVQUFVLENBQUMsU0FBUyxDQUFDLGtEQUFrRCxDQUFDLENBQUMsTUFBTSxDQUMvRSxDQUFBO0FBQ0QsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQTtBQUM5RCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQTtBQUN0RCxNQUFNLGdCQUFnQixHQUFpQixFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFD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