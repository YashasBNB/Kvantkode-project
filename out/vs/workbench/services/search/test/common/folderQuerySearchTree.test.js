/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import assert from 'assert';
import { FolderQuerySearchTree } from '../../common/folderQuerySearchTree.js';
suite('FolderQuerySearchTree', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const fq1 = { folder: URI.parse('file:///folder1?query1#fragment1') };
    const fq2 = { folder: URI.parse('file:///folder2?query2#fragment2') };
    const fq3 = { folder: URI.parse('file:///folder3?query3#fragment3') };
    const fq4 = { folder: URI.parse('file:///folder3?query3') };
    const fq5 = { folder: URI.parse('file:///folder3') };
    const folderQueries = [fq1, fq2, fq3, fq4, fq5];
    const getFolderQueryInfo = (fq, i) => ({ folder: fq.folder, index: i });
    test('find query fragment aware substr correctly', () => {
        const tree = new FolderQuerySearchTree(folderQueries, getFolderQueryInfo);
        const result = tree.findQueryFragmentAwareSubstr(fq1.folder);
        const result2 = tree.findQueryFragmentAwareSubstr(URI.parse('file:///folder1/foo/bar?query1#fragment1'));
        assert.deepStrictEqual(result, { folder: fq1.folder, index: 0 });
        assert.deepStrictEqual(result2, { folder: fq1.folder, index: 0 });
    });
    test('do not to URIs that do not have queries if the base has query', () => {
        const tree = new FolderQuerySearchTree(folderQueries, getFolderQueryInfo);
        const result = tree.findQueryFragmentAwareSubstr(URI.parse('file:///folder1'));
        const result2 = tree.findQueryFragmentAwareSubstr(URI.parse('file:///folder1?query1'));
        assert.deepStrictEqual(result, undefined);
        assert.deepStrictEqual(result2, undefined);
    });
    test('match correct entry with query/fragment', () => {
        const tree = new FolderQuerySearchTree(folderQueries, getFolderQueryInfo);
        const result = tree.findQueryFragmentAwareSubstr(URI.parse('file:///folder3/file.txt?query3#fragment3'));
        assert.deepStrictEqual(result, { folder: fq3.folder, index: 2 });
        const result2 = tree.findQueryFragmentAwareSubstr(URI.parse('file:///folder3/file.txt?query3'));
        assert.deepStrictEqual(result2, { folder: fq4.folder, index: 3 });
        const result3 = tree.findQueryFragmentAwareSubstr(URI.parse('file:///folder3/file.txt'));
        assert.deepStrictEqual(result3, { folder: fq5.folder, index: 4 });
    });
    test('can find substr of non-query/fragment URIs', () => {
        const tree = new FolderQuerySearchTree(folderQueries, getFolderQueryInfo);
        const result = tree.findQueryFragmentAwareSubstr(fq5.folder);
        const result2 = tree.findQueryFragmentAwareSubstr(URI.parse('file:///folder3/hello/world'));
        assert.deepStrictEqual(result, { folder: fq5.folder, index: 4 });
        assert.deepStrictEqual(result2, { folder: fq5.folder, index: 4 });
    });
    test('iterate over all folderQueryInfo correctly', () => {
        const tree = new FolderQuerySearchTree(folderQueries, getFolderQueryInfo);
        const results = [];
        tree.forEachFolderQueryInfo((info) => results.push(info));
        assert.equal(results.length, 5);
        assert.deepStrictEqual(results, folderQueries.map((fq, i) => getFolderQueryInfo(fq, i)));
    });
    test('`/` as a path', () => {
        const trie = new FolderQuerySearchTree([{ folder: URI.parse('memfs:/?q=1') }], getFolderQueryInfo);
        assert.deepStrictEqual(trie.findQueryFragmentAwareSubstr(URI.parse('memfs:/file.txt?q=1')), {
            folder: URI.parse('memfs:/?q=1'),
            index: 0,
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGVyUXVlcnlTZWFyY2hUcmVlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL3Rlc3QvY29tbW9uL2ZvbGRlclF1ZXJ5U2VhcmNoVHJlZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFHN0UsS0FBSyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtJQUNuQyx1Q0FBdUMsRUFBRSxDQUFBO0lBQ3pDLE1BQU0sR0FBRyxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsa0NBQWtDLENBQUMsRUFBRSxDQUFBO0lBQ3JFLE1BQU0sR0FBRyxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsa0NBQWtDLENBQUMsRUFBRSxDQUFBO0lBQ3JFLE1BQU0sR0FBRyxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsa0NBQWtDLENBQUMsRUFBRSxDQUFBO0lBQ3JFLE1BQU0sR0FBRyxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFBO0lBQzNELE1BQU0sR0FBRyxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFBO0lBRXBELE1BQU0sYUFBYSxHQUF3QixDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUVwRSxNQUFNLGtCQUFrQixHQUFHLENBQUMsRUFBcUIsRUFBRSxDQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUVsRyxJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO1FBQ3ZELE1BQU0sSUFBSSxHQUFHLElBQUkscUJBQXFCLENBQUMsYUFBYSxFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFDekUsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM1RCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQ2hELEdBQUcsQ0FBQyxLQUFLLENBQUMsMENBQTBDLENBQUMsQ0FDckQsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUNsRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywrREFBK0QsRUFBRSxHQUFHLEVBQUU7UUFDMUUsTUFBTSxJQUFJLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxhQUFhLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtRQUN6RSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUE7UUFDOUUsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFBO1FBQ3RGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQzNDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHlDQUF5QyxFQUFFLEdBQUcsRUFBRTtRQUNwRCxNQUFNLElBQUksR0FBRyxJQUFJLHFCQUFxQixDQUFDLGFBQWEsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBQ3pFLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FDL0MsR0FBRyxDQUFDLEtBQUssQ0FBQywyQ0FBMkMsQ0FBQyxDQUN0RCxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUVoRSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUE7UUFDL0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUVqRSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUE7UUFDeEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUNsRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7UUFDdkQsTUFBTSxJQUFJLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxhQUFhLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtRQUN6RSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQTtRQUMzRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDbEUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO1FBQ3ZELE1BQU0sSUFBSSxHQUFHLElBQUkscUJBQXFCLENBQUMsYUFBYSxFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFDekUsTUFBTSxPQUFPLEdBQVUsRUFBRSxDQUFBO1FBQ3pCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvQixNQUFNLENBQUMsZUFBZSxDQUNyQixPQUFPLEVBQ1AsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUN2RCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUMxQixNQUFNLElBQUksR0FBRyxJQUFJLHFCQUFxQixDQUNyQyxDQUFDLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxFQUN0QyxrQkFBa0IsQ0FDbEIsQ0FBQTtRQUVELE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQyxFQUFFO1lBQzNGLE1BQU0sRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQztZQUNoQyxLQUFLLEVBQUUsQ0FBQztTQUNSLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==