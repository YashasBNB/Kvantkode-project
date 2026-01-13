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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGVyUXVlcnlTZWFyY2hUcmVlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvdGVzdC9jb21tb24vZm9sZGVyUXVlcnlTZWFyY2hUcmVlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUc3RSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO0lBQ25DLHVDQUF1QyxFQUFFLENBQUE7SUFDekMsTUFBTSxHQUFHLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxFQUFFLENBQUE7SUFDckUsTUFBTSxHQUFHLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxFQUFFLENBQUE7SUFDckUsTUFBTSxHQUFHLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxFQUFFLENBQUE7SUFDckUsTUFBTSxHQUFHLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLENBQUE7SUFDM0QsTUFBTSxHQUFHLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUE7SUFFcEQsTUFBTSxhQUFhLEdBQXdCLENBQUMs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