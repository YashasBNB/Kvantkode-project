/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ILanguageConfigurationService } from '../../../../../editor/common/languages/languageConfigurationRegistry.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { TestLanguageConfigurationService } from '../../../../../editor/test/common/modes/testLanguageConfigurationService.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { TestWorkspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { SearchModelImpl } from '../../browser/searchTreeModel/searchModel.js';
import { MockLabelService } from '../../../../services/label/test/common/mockLabelService.js';
import { OneLineRange, } from '../../../../services/search/common/search.js';
import { TestContextService } from '../../../../test/common/workbenchTestServices.js';
import { INotebookEditorService } from '../../../notebook/browser/services/notebookEditorService.js';
import { createFileUriFromPathFromRoot, getRootName, stubModelService, stubNotebookEditorService, } from './searchTestCommon.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { FILE_MATCH_PREFIX, MATCH_PREFIX, } from '../../browser/searchTreeModel/searchTreeCommon.js';
import { NotebookCompatibleFileMatch } from '../../browser/notebookSearch/notebookSearchModel.js';
import { FolderMatchImpl } from '../../browser/searchTreeModel/folderMatch.js';
import { searchComparer, searchMatchComparer } from '../../browser/searchCompare.js';
import { MatchImpl } from '../../browser/searchTreeModel/match.js';
suite('Search - Viewlet', () => {
    let instantiation;
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        instantiation = new TestInstantiationService();
        instantiation.stub(ILanguageConfigurationService, TestLanguageConfigurationService);
        instantiation.stub(IModelService, stubModelService(instantiation, (e) => store.add(e)));
        instantiation.stub(INotebookEditorService, stubNotebookEditorService(instantiation, (e) => store.add(e)));
        instantiation.set(IWorkspaceContextService, new TestContextService(TestWorkspace));
        const fileService = new FileService(new NullLogService());
        store.add(fileService);
        const uriIdentityService = new UriIdentityService(fileService);
        store.add(uriIdentityService);
        instantiation.stub(IUriIdentityService, uriIdentityService);
        instantiation.stub(ILabelService, new MockLabelService());
        instantiation.stub(ILogService, new NullLogService());
    });
    teardown(() => {
        instantiation.dispose();
    });
    test('Data Source', function () {
        const result = aSearchResult();
        result.query = {
            type: 2 /* QueryType.Text */,
            contentPattern: { pattern: 'foo' },
            folderQueries: [
                {
                    folder: createFileUriFromPathFromRoot(),
                },
            ],
        };
        result.add([
            {
                resource: createFileUriFromPathFromRoot('/foo'),
                results: [
                    {
                        previewText: 'bar',
                        rangeLocations: [
                            {
                                preview: {
                                    startLineNumber: 0,
                                    startColumn: 0,
                                    endLineNumber: 0,
                                    endColumn: 1,
                                },
                                source: {
                                    startLineNumber: 1,
                                    startColumn: 0,
                                    endLineNumber: 1,
                                    endColumn: 1,
                                },
                            },
                        ],
                    },
                ],
            },
        ], '', false);
        const fileMatch = result.matches()[0];
        const lineMatch = fileMatch.matches()[0];
        assert.strictEqual(fileMatch.id(), FILE_MATCH_PREFIX + URI.file(`${getRootName()}/foo`).toString());
        assert.strictEqual(lineMatch.id(), `${MATCH_PREFIX}${URI.file(`${getRootName()}/foo`).toString()}>[2,1 -> 2,2]b`);
    });
    test('Comparer', () => {
        const fileMatch1 = aFileMatch('/foo');
        const fileMatch2 = aFileMatch('/with/path');
        const fileMatch3 = aFileMatch('/with/path/foo');
        const lineMatch1 = new MatchImpl(fileMatch1, ['bar'], new OneLineRange(0, 1, 1), new OneLineRange(0, 1, 1), false);
        const lineMatch2 = new MatchImpl(fileMatch1, ['bar'], new OneLineRange(0, 1, 1), new OneLineRange(2, 1, 1), false);
        const lineMatch3 = new MatchImpl(fileMatch1, ['bar'], new OneLineRange(0, 1, 1), new OneLineRange(2, 1, 1), false);
        assert(searchMatchComparer(fileMatch1, fileMatch2) < 0);
        assert(searchMatchComparer(fileMatch2, fileMatch1) > 0);
        assert(searchMatchComparer(fileMatch1, fileMatch1) === 0);
        assert(searchMatchComparer(fileMatch2, fileMatch3) < 0);
        assert(searchMatchComparer(lineMatch1, lineMatch2) < 0);
        assert(searchMatchComparer(lineMatch2, lineMatch1) > 0);
        assert(searchMatchComparer(lineMatch2, lineMatch3) === 0);
    });
    test('Advanced Comparer', () => {
        const fileMatch1 = aFileMatch('/with/path/foo10');
        const fileMatch2 = aFileMatch('/with/path2/foo1');
        const fileMatch3 = aFileMatch('/with/path/bar.a');
        const fileMatch4 = aFileMatch('/with/path/bar.b');
        // By default, path < path2
        assert(searchMatchComparer(fileMatch1, fileMatch2) < 0);
        // By filenames, foo10 > foo1
        assert(searchMatchComparer(fileMatch1, fileMatch2, "fileNames" /* SearchSortOrder.FileNames */) > 0);
        // By type, bar.a < bar.b
        assert(searchMatchComparer(fileMatch3, fileMatch4, "type" /* SearchSortOrder.Type */) < 0);
    });
    test('Cross-type Comparer', () => {
        const searchResult = aSearchResult();
        const folderMatch1 = aFolderMatch('/voo', 0, searchResult.plainTextSearchResult);
        const folderMatch2 = aFolderMatch('/with', 1, searchResult.plainTextSearchResult);
        const fileMatch1 = aFileMatch('/voo/foo.a', folderMatch1);
        const fileMatch2 = aFileMatch('/with/path.c', folderMatch2);
        const fileMatch3 = aFileMatch('/with/path/bar.b', folderMatch2);
        const lineMatch1 = new MatchImpl(fileMatch1, ['bar'], new OneLineRange(0, 1, 1), new OneLineRange(0, 1, 1), false);
        const lineMatch2 = new MatchImpl(fileMatch1, ['bar'], new OneLineRange(0, 1, 1), new OneLineRange(2, 1, 1), false);
        const lineMatch3 = new MatchImpl(fileMatch2, ['barfoo'], new OneLineRange(0, 1, 1), new OneLineRange(0, 1, 1), false);
        const lineMatch4 = new MatchImpl(fileMatch2, ['fooooo'], new OneLineRange(0, 1, 1), new OneLineRange(2, 1, 1), false);
        const lineMatch5 = new MatchImpl(fileMatch3, ['foobar'], new OneLineRange(0, 1, 1), new OneLineRange(2, 1, 1), false);
        /***
         * Structure would take the following form:
         *
         *	folderMatch1 (voo)
         *		> fileMatch1 (/foo.a)
         *			>> lineMatch1
         *			>> lineMatch2
         *	folderMatch2 (with)
         *		> fileMatch2 (/path.c)
         *			>> lineMatch4
         *			>> lineMatch5
         *		> fileMatch3 (/path/bar.b)
         *			>> lineMatch3
         *
         */
        // for these, refer to diagram above
        assert(searchComparer(fileMatch1, fileMatch3) < 0);
        assert(searchComparer(fileMatch2, fileMatch3) < 0);
        assert(searchComparer(folderMatch2, fileMatch2) < 0);
        assert(searchComparer(lineMatch4, lineMatch5) < 0);
        assert(searchComparer(lineMatch1, lineMatch3) < 0);
        assert(searchComparer(lineMatch2, folderMatch2) < 0);
        // travel up hierarchy and order of folders take precedence. "voo < with" in indices
        assert(searchComparer(fileMatch1, fileMatch3, "fileNames" /* SearchSortOrder.FileNames */) < 0);
        // bar.b < path.c
        assert(searchComparer(fileMatch3, fileMatch2, "fileNames" /* SearchSortOrder.FileNames */) < 0);
        // lineMatch4's parent is fileMatch2, "bar.b < path.c"
        assert(searchComparer(fileMatch3, lineMatch4, "fileNames" /* SearchSortOrder.FileNames */) < 0);
        // bar.b < path.c
        assert(searchComparer(fileMatch3, fileMatch2, "type" /* SearchSortOrder.Type */) < 0);
        // lineMatch4's parent is fileMatch2, "bar.b < path.c"
        assert(searchComparer(fileMatch3, lineMatch4, "type" /* SearchSortOrder.Type */) < 0);
    });
    function aFileMatch(path, parentFolder, ...lineMatches) {
        const rawMatch = {
            resource: URI.file('/' + path),
            results: lineMatches,
        };
        const fileMatch = instantiation.createInstance(NotebookCompatibleFileMatch, {
            pattern: '',
        }, undefined, undefined, parentFolder ?? aFolderMatch('', 0), rawMatch, null, '');
        fileMatch.createMatches();
        store.add(fileMatch);
        return fileMatch;
    }
    function aFolderMatch(path, index, parent) {
        const searchModel = instantiation.createInstance(SearchModelImpl);
        store.add(searchModel);
        const folderMatch = instantiation.createInstance(FolderMatchImpl, createFileUriFromPathFromRoot(path), path, index, {
            type: 2 /* QueryType.Text */,
            folderQueries: [{ folder: createFileUriFromPathFromRoot() }],
            contentPattern: {
                pattern: '',
            },
        }, (parent ?? aSearchResult().folderMatches()[0]), searchModel.searchResult, null);
        store.add(folderMatch);
        return folderMatch;
    }
    function aSearchResult() {
        const searchModel = instantiation.createInstance(SearchModelImpl);
        store.add(searchModel);
        searchModel.searchResult.query = {
            type: 2 /* QueryType.Text */,
            folderQueries: [{ folder: createFileUriFromPathFromRoot() }],
            contentPattern: {
                pattern: '',
            },
        };
        return searchModel.searchResult;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoVmlld2xldC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL3Rlc3QvYnJvd3Nlci9zZWFyY2hWaWV3bGV0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUN2SCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sNkVBQTZFLENBQUE7QUFDOUgsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3JHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUM5RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDN0YsT0FBTyxFQUdOLFlBQVksR0FH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LENBQUE7UUFFakYsTUFBTSxVQUFVLEdBQUcsVUFBVSxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUN6RCxNQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsY0FBYyxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQzNELE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxrQkFBa0IsRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUUvRCxNQUFNLFVBQVUsR0FBRyxJQUFJLFNBQVMsQ0FDL0IsVUFBVSxFQUNWLENBQUMsS0FBSyxDQUFDLEVBQ1AsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsS0FBSyxDQUNMLENBQUE7UUFDRCxNQUFNLFVBQVUsR0FBRyxJQUFJLFNBQVMsQ0FDL0IsVUFBVSxFQUNWLENBQUMsS0FBSyxDQUFDLEVBQ1AsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsS0FBSyxDQUNMLENBQUE7UUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLFNBQVMsQ0FDL0IsVUFBVSxFQUNWLENBQUMsUUFBUSxDQUFDLEVBQ1YsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsS0FBSyxDQUNMLENBQUE7UUFDRCxNQUFNLFVBQVUsR0FBRyxJQUFJLFNBQVMsQ0FDL0IsVUFBVSxFQUNWLENBQUMsUUFBUSxDQUFDLEVBQ1YsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsS0FBSyxD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