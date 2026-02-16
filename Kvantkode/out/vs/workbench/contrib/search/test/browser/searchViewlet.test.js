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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoVmlld2xldC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvdGVzdC9icm93c2VyL3NlYXJjaFZpZXdsZXQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBQ3ZILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQTtBQUM5SCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDakYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDdkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDL0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDckcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQzlGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtB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