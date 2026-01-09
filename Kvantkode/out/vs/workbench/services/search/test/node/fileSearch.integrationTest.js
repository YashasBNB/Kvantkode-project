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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVNlYXJjaC5pbnRlZ3JhdGlvblRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvdGVzdC9ub2RlL2ZpbGVTZWFyY2guaW50ZWdyYXRpb25UZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbEUsT0FBTyxLQUFLLElBQUksTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZFLE9BQU8sRUFJTixpQkFBaUIsR0FFakIsTUFBTSx3QkFBd0IsQ0FBQTtBQUMvQixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFOUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDbkMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxpREFBaUQsQ0FBQyxDQUFDLE1BQU0sQ0FDOUUsQ0FBQTtBQUNELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3BDLFVBQVUsQ0FBQyxTQUFTLENBQUMsa0RBQWtELENBQUMsQ0FBQyxNQUFNLENBQy9FLENBQUE7QUFDRCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxDQUFBO0FBQzlELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0FBQ3RELE1BQU0sZ0JBQWdCLEdBQWlCLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQTtBQUMxRSxNQUFNLGlCQUFpQixHQUFtQixDQUFDLGdCQUFnQixDQUFDLENBQUE7QUFFNUQsTUFBTSxpQkFBaUIsR0FBbUI7SUFDekMsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRTtJQUN0RSxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFO0NBQ25DLENBQUE7QUFFRCxNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUE7QUFFNUIsS0FBSyxVQUFVLFlBQVksQ0FDMUIsS0FBaUIsRUFDakIsbUJBQXNDO0lBRXRDLE1BQU0sR0FBRyxHQUFHLElBQUksYUFBYSxFQUFFLENBQUE7SUFFL0IsTUFBTSxPQUFPLEdBQW9DLEVBQUUsQ0FBQTtJQUNuRCxNQUFNLEdBQUcsQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1FBQy9DLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzNCLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN0QixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDbkIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDaEIsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE9BQU8sQ0FBQyxNQUFNLEVBQ2QsbUJBQW1CLEVBQ25CLE1BQU0sT0FBTyxDQUFDLE1BQU0sUUFBUSxtQkFBbUIsRUFBRSxDQUNqRCxDQUFBO0FBQ0YsQ0FBQztBQUVELFVBQVUsQ0FBQyx3QkFBd0IsRUFBRTtJQUNwQyxJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUMxQixNQUFNLE1BQU0sR0FBZTtZQUMxQixJQUFJLHdCQUFnQjtZQUNwQixhQUFhLEVBQUUsaUJBQWlCO1NBQ2hDLENBQUE7UUFFRCxPQUFPLFlBQVksQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDaEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO1FBQy9CLE1BQU0sTUFBTSxHQUFlO1lBQzFCLElBQUksd0JBQWdCO1lBQ3BCLGFBQWEsRUFBRSxpQkFBaUI7WUFDaEMsV0FBVyxFQUFFLGFBQWE7U0FDMUIsQ0FBQTtRQUVELE9BQU8sWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMvQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFDM0IsTUFBTSxNQUFNLEdBQWU7WUFDMUIsSUFBSSx3QkFBZ0I7WUFDcEIsYUFBYSxFQUFFLGlCQUFpQjtZQUNoQyxXQUFXLEVBQUUsTUFBTTtZQUNuQixjQUFjLEVBQUUsRUFBRSxxQkFBcUIsRUFBRSxJQUFJLEVBQUU7U0FDL0MsQ0FBQTtRQUVELE9BQU8sWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMvQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDN0IsTUFBTSxNQUFNLEdBQWU7WUFDMUIsSUFBSSx3QkFBZ0I7WUFDcEIsYUFBYSxFQUFFLGlCQUFpQjtZQUNoQyxXQUFXLEVBQUUsTUFBTTtZQUNuQixjQUFjLEVBQUUsRUFBRSxxQkFBcUIsRUFBRSxJQUFJLEVBQUU7U0FDL0MsQ0FBQTtRQUVELE9BQU8sWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMvQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7UUFDOUMsTUFBTSxNQUFNLEdBQWU7WUFDMUIsSUFBSSx3QkFBZ0I7WUFDcEIsYUFBYSxFQUFFLGlCQUFpQjtZQUNoQyxXQUFXLEVBQUUsNkJBQTZCO1NBQzFDLENBQUE7UUFFRCxPQUFPLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDL0IsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdURBQXVELEVBQUUsR0FBRyxFQUFFO1FBQ2xFLE1BQU0sTUFBTSxHQUFlO1lBQzFCLElBQUksd0JBQWdCO1lBQ3BCLGFBQWEsRUFBRTtnQkFDZCxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUU7Z0JBQzFELEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUU7YUFDcEM7WUFDRCxXQUFXLEVBQUUsY0FBYztZQUMzQixjQUFjLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsRUFBRTtTQUN6RCxDQUFBO1FBRUQsT0FBTyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQy9CLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==