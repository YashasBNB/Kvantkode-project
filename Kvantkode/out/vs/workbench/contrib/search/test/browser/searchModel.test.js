/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import * as arrays from '../../../../../base/common/arrays.js';
import { DeferredPromise, timeout } from '../../../../../base/common/async.js';
import { CancellationTokenSource, } from '../../../../../base/common/cancellation.js';
import { URI } from '../../../../../base/common/uri.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ModelService } from '../../../../../editor/common/services/modelService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ISearchService, OneLineRange, TextSearchMatch, } from '../../../../services/search/common/search.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { SearchModelImpl } from '../../browser/searchTreeModel/searchModel.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../../../platform/theme/test/common/testThemeService.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { INotebookEditorService } from '../../../notebook/browser/services/notebookEditorService.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { TestEditorGroupsService, TestEditorService, } from '../../../../test/browser/workbenchTestServices.js';
import { NotebookEditorWidgetService } from '../../../notebook/browser/services/notebookEditorServiceImpl.js';
import { createFileUriFromPathFromRoot, getRootName } from './searchTestCommon.js';
import { contentMatchesToTextSearchMatches, webviewMatchesToTextSearchMatches, } from '../../browser/notebookSearch/searchNotebookHelpers.js';
import { CellKind } from '../../../notebook/common/notebookCommon.js';
import { FindMatch } from '../../../../../editor/common/model.js';
import { ResourceMap, ResourceSet } from '../../../../../base/common/map.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { INotebookSearchService } from '../../common/notebookSearch.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CellMatch, MatchInNotebook } from '../../browser/notebookSearch/notebookSearchModel.js';
const nullEvent = new (class {
    constructor() {
        this.id = -1;
    }
    stop() {
        return;
    }
    timeTaken() {
        return -1;
    }
})();
const lineOneRange = new OneLineRange(1, 0, 1);
suite('SearchModel', () => {
    let instantiationService;
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    const testSearchStats = {
        fromCache: false,
        resultCount: 1,
        type: 'searchProcess',
        detailStats: {
            fileWalkTime: 0,
            cmdTime: 0,
            cmdResultCount: 0,
            directoriesWalked: 2,
            filesWalked: 3,
        },
    };
    const folderQueries = [{ folder: createFileUriFromPathFromRoot() }];
    setup(() => {
        instantiationService = new TestInstantiationService();
        instantiationService.stub(ITelemetryService, NullTelemetryService);
        instantiationService.stub(ILabelService, { getUriBasenameLabel: (uri) => '' });
        instantiationService.stub(INotebookService, { getNotebookTextModels: () => [] });
        instantiationService.stub(IModelService, stubModelService(instantiationService));
        instantiationService.stub(INotebookEditorService, stubNotebookEditorService(instantiationService));
        instantiationService.stub(ISearchService, {});
        instantiationService.stub(ISearchService, 'textSearch', Promise.resolve({ results: [] }));
        const fileService = new FileService(new NullLogService());
        store.add(fileService);
        const uriIdentityService = new UriIdentityService(fileService);
        store.add(uriIdentityService);
        instantiationService.stub(IUriIdentityService, uriIdentityService);
        instantiationService.stub(ILogService, new NullLogService());
    });
    teardown(() => sinon.restore());
    function searchServiceWithResults(results, complete = null) {
        return {
            textSearch(query, token, onProgress, notebookURIs) {
                return new Promise((resolve) => {
                    queueMicrotask(() => {
                        results.forEach(onProgress);
                        resolve(complete);
                    });
                });
            },
            fileSearch(query, token) {
                return new Promise((resolve) => {
                    queueMicrotask(() => {
                        resolve({ results: results, messages: [] });
                    });
                });
            },
            aiTextSearch(query, token, onProgress, notebookURIs) {
                return new Promise((resolve) => {
                    queueMicrotask(() => {
                        results.forEach(onProgress);
                        resolve(complete);
                    });
                });
            },
            textSearchSplitSyncAsync(query, token, onProgress) {
                return {
                    syncResults: {
                        results: [],
                        messages: [],
                    },
                    asyncResults: new Promise((resolve) => {
                        queueMicrotask(() => {
                            results.forEach(onProgress);
                            resolve(complete);
                        });
                    }),
                };
            },
        };
    }
    function searchServiceWithError(error) {
        return {
            textSearch(query, token, onProgress) {
                return new Promise((resolve, reject) => {
                    reject(error);
                });
            },
            fileSearch(query, token) {
                return new Promise((resolve, reject) => {
                    queueMicrotask(() => {
                        reject(error);
                    });
                });
            },
            aiTextSearch(query, token, onProgress, notebookURIs) {
                return new Promise((resolve, reject) => {
                    reject(error);
                });
            },
            textSearchSplitSyncAsync(query, token, onProgress) {
                return {
                    syncResults: {
                        results: [],
                        messages: [],
                    },
                    asyncResults: new Promise((resolve, reject) => {
                        reject(error);
                    }),
                };
            },
        };
    }
    function canceleableSearchService(tokenSource) {
        return {
            textSearch(query, token, onProgress) {
                const disposable = token?.onCancellationRequested(() => tokenSource.cancel());
                if (disposable) {
                    store.add(disposable);
                }
                return this.textSearchSplitSyncAsync(query, token, onProgress).asyncResults;
            },
            fileSearch(query, token) {
                const disposable = token?.onCancellationRequested(() => tokenSource.cancel());
                if (disposable) {
                    store.add(disposable);
                }
                return new Promise((resolve) => {
                    queueMicrotask(() => {
                        resolve({});
                    });
                });
            },
            aiTextSearch(query, token, onProgress, notebookURIs) {
                const disposable = token?.onCancellationRequested(() => tokenSource.cancel());
                if (disposable) {
                    store.add(disposable);
                }
                return Promise.resolve({
                    results: [],
                    messages: [],
                });
            },
            textSearchSplitSyncAsync(query, token, onProgress) {
                const disposable = token?.onCancellationRequested(() => tokenSource.cancel());
                if (disposable) {
                    store.add(disposable);
                }
                return {
                    syncResults: {
                        results: [],
                        messages: [],
                    },
                    asyncResults: new Promise((resolve) => {
                        queueMicrotask(() => {
                            resolve({
                                results: [],
                                messages: [],
                            });
                        });
                    }),
                };
            },
        };
    }
    function searchServiceWithDeferredPromise(p) {
        return {
            textSearchSplitSyncAsync(query, token, onProgress) {
                return {
                    syncResults: {
                        results: [],
                        messages: [],
                    },
                    asyncResults: p,
                };
            },
        };
    }
    function notebookSearchServiceWithInfo(results, tokenSource) {
        return {
            _serviceBrand: undefined,
            notebookSearch(query, token, searchInstanceID, onProgress) {
                const disposable = token?.onCancellationRequested(() => tokenSource?.cancel());
                if (disposable) {
                    store.add(disposable);
                }
                const localResults = new ResourceMap((uri) => uri.path);
                results.forEach((r) => {
                    localResults.set(r.resource, r);
                });
                if (onProgress) {
                    arrays.coalesce([...localResults.values()]).forEach(onProgress);
                }
                return {
                    openFilesToScan: new ResourceSet([...localResults.keys()]),
                    completeData: Promise.resolve({
                        messages: [],
                        results: arrays.coalesce([...localResults.values()]),
                        limitHit: false,
                    }),
                    allScannedFiles: Promise.resolve(new ResourceSet()),
                };
            },
        };
    }
    test('Search Model: Search adds to results', async () => {
        const results = [
            aRawMatch('/1', new TextSearchMatch('preview 1', new OneLineRange(1, 1, 4)), new TextSearchMatch('preview 1', new OneLineRange(1, 4, 11))),
            aRawMatch('/2', new TextSearchMatch('preview 2', lineOneRange)),
        ];
        instantiationService.stub(ISearchService, searchServiceWithResults(results, { limitHit: false, messages: [], results }));
        instantiationService.stub(INotebookSearchService, notebookSearchServiceWithInfo([], undefined));
        const testObject = instantiationService.createInstance(SearchModelImpl);
        store.add(testObject);
        await testObject.search({
            contentPattern: { pattern: 'somestring' },
            type: 2 /* QueryType.Text */,
            folderQueries,
        }).asyncResults;
        const actual = testObject.searchResult.matches();
        assert.strictEqual(2, actual.length);
        assert.strictEqual(URI.file(`${getRootName()}/1`).toString(), actual[0].resource.toString());
        let actuaMatches = actual[0].matches();
        assert.strictEqual(2, actuaMatches.length);
        assert.strictEqual('preview 1', actuaMatches[0].text());
        assert.ok(new Range(2, 2, 2, 5).equalsRange(actuaMatches[0].range()));
        assert.strictEqual('preview 1', actuaMatches[1].text());
        assert.ok(new Range(2, 5, 2, 12).equalsRange(actuaMatches[1].range()));
        actuaMatches = actual[1].matches();
        assert.strictEqual(1, actuaMatches.length);
        assert.strictEqual('preview 2', actuaMatches[0].text());
        assert.ok(new Range(2, 1, 2, 2).equalsRange(actuaMatches[0].range()));
    });
    test('Search Model: Search can return notebook results', async () => {
        const results = [
            aRawMatch('/2', new TextSearchMatch('test', new OneLineRange(1, 1, 5)), new TextSearchMatch('this is a test', new OneLineRange(1, 11, 15))),
            aRawMatch('/3', new TextSearchMatch('test', lineOneRange)),
        ];
        instantiationService.stub(ISearchService, searchServiceWithResults(results, { limitHit: false, messages: [], results }));
        sinon.stub(CellMatch.prototype, 'addContext');
        const mdInputCell = {
            cellKind: CellKind.Markup,
            textBuffer: {
                getLineContent(lineNumber) {
                    if (lineNumber === 1) {
                        return '# Test';
                    }
                    else {
                        return '';
                    }
                },
            },
            id: 'mdInputCell',
        };
        const findMatchMds = [new FindMatch(new Range(1, 3, 1, 7), ['Test'])];
        const codeCell = {
            cellKind: CellKind.Code,
            textBuffer: {
                getLineContent(lineNumber) {
                    if (lineNumber === 1) {
                        return 'print("test! testing!!")';
                    }
                    else {
                        return '';
                    }
                },
            },
            id: 'codeCell',
        };
        const findMatchCodeCells = [
            new FindMatch(new Range(1, 8, 1, 12), ['test']),
            new FindMatch(new Range(1, 14, 1, 18), ['test']),
        ];
        const webviewMatches = [
            {
                index: 0,
                searchPreviewInfo: {
                    line: 'test! testing!!',
                    range: {
                        start: 1,
                        end: 5,
                    },
                },
            },
            {
                index: 1,
                searchPreviewInfo: {
                    line: 'test! testing!!',
                    range: {
                        start: 7,
                        end: 11,
                    },
                },
            },
        ];
        const cellMatchMd = {
            cell: mdInputCell,
            index: 0,
            contentResults: contentMatchesToTextSearchMatches(findMatchMds, mdInputCell),
            webviewResults: [],
        };
        const cellMatchCode = {
            cell: codeCell,
            index: 1,
            contentResults: contentMatchesToTextSearchMatches(findMatchCodeCells, codeCell),
            webviewResults: webviewMatchesToTextSearchMatches(webviewMatches),
        };
        const notebookSearchService = instantiationService.stub(INotebookSearchService, notebookSearchServiceWithInfo([aRawMatchWithCells('/1', cellMatchMd, cellMatchCode)], undefined));
        const notebookSearch = sinon.spy(notebookSearchService, 'notebookSearch');
        const model = instantiationService.createInstance(SearchModelImpl);
        store.add(model);
        await model.search({ contentPattern: { pattern: 'test' }, type: 2 /* QueryType.Text */, folderQueries })
            .asyncResults;
        const actual = model.searchResult.matches();
        assert(notebookSearch.calledOnce);
        assert.strictEqual(3, actual.length);
        assert.strictEqual(URI.file(`${getRootName()}/1`).toString(), actual[0].resource.toString());
        const notebookFileMatches = actual[0].matches();
        assert.ok(notebookFileMatches[0].range().equalsRange(new Range(1, 3, 1, 7)));
        assert.ok(notebookFileMatches[1].range().equalsRange(new Range(1, 8, 1, 12)));
        assert.ok(notebookFileMatches[2].range().equalsRange(new Range(1, 14, 1, 18)));
        assert.ok(notebookFileMatches[3].range().equalsRange(new Range(1, 2, 1, 6)));
        assert.ok(notebookFileMatches[4].range().equalsRange(new Range(1, 8, 1, 12)));
        notebookFileMatches.forEach((match) => match instanceof MatchInNotebook);
        assert(notebookFileMatches[0].cell?.id === 'mdInputCell');
        assert(notebookFileMatches[1].cell?.id === 'codeCell');
        assert(notebookFileMatches[2].cell?.id === 'codeCell');
        assert(notebookFileMatches[3].cell?.id === 'codeCell');
        assert(notebookFileMatches[4].cell?.id === 'codeCell');
        const mdCellMatchProcessed = notebookFileMatches[0].cellParent;
        const codeCellMatchProcessed = notebookFileMatches[1].cellParent;
        assert(mdCellMatchProcessed.contentMatches.length === 1);
        assert(codeCellMatchProcessed.contentMatches.length === 2);
        assert(codeCellMatchProcessed.webviewMatches.length === 2);
        assert(mdCellMatchProcessed.contentMatches[0] === notebookFileMatches[0]);
        assert(codeCellMatchProcessed.contentMatches[0] === notebookFileMatches[1]);
        assert(codeCellMatchProcessed.contentMatches[1] === notebookFileMatches[2]);
        assert(codeCellMatchProcessed.webviewMatches[0] === notebookFileMatches[3]);
        assert(codeCellMatchProcessed.webviewMatches[1] === notebookFileMatches[4]);
        assert.strictEqual(URI.file(`${getRootName()}/2`).toString(), actual[1].resource.toString());
        assert.strictEqual(URI.file(`${getRootName()}/3`).toString(), actual[2].resource.toString());
    });
    test('Search Model: Search reports telemetry on search completed', async () => {
        const target = instantiationService.spy(ITelemetryService, 'publicLog');
        const results = [
            aRawMatch('/1', new TextSearchMatch('preview 1', new OneLineRange(1, 1, 4)), new TextSearchMatch('preview 1', new OneLineRange(1, 4, 11))),
            aRawMatch('/2', new TextSearchMatch('preview 2', lineOneRange)),
        ];
        instantiationService.stub(ISearchService, searchServiceWithResults(results, { limitHit: false, messages: [], results }));
        instantiationService.stub(INotebookSearchService, notebookSearchServiceWithInfo([], undefined));
        const testObject = instantiationService.createInstance(SearchModelImpl);
        store.add(testObject);
        await testObject.search({
            contentPattern: { pattern: 'somestring' },
            type: 2 /* QueryType.Text */,
            folderQueries,
        }).asyncResults;
        assert.ok(target.calledThrice);
        assert.ok(target.calledWith('searchResultsFirstRender'));
        assert.ok(target.calledWith('searchResultsFinished'));
    });
    test('Search Model: Search reports timed telemetry on search when progress is not called', () => {
        const target2 = sinon.spy();
        sinon.stub(nullEvent, 'stop').callsFake(target2);
        const target1 = sinon.stub().returns(nullEvent);
        instantiationService.stub(ITelemetryService, 'publicLog', target1);
        instantiationService.stub(ISearchService, searchServiceWithResults([], { limitHit: false, messages: [], results: [] }));
        instantiationService.stub(INotebookSearchService, notebookSearchServiceWithInfo([], undefined));
        const testObject = instantiationService.createInstance(SearchModelImpl);
        store.add(testObject);
        const result = testObject.search({
            contentPattern: { pattern: 'somestring' },
            type: 2 /* QueryType.Text */,
            folderQueries,
        }).asyncResults;
        return result.then(() => {
            return timeout(1).then(() => {
                assert.ok(target1.calledWith('searchResultsFirstRender'));
                assert.ok(target1.calledWith('searchResultsFinished'));
            });
        });
    });
    test('Search Model: Search reports timed telemetry on search when progress is called', () => {
        const target2 = sinon.spy();
        sinon.stub(nullEvent, 'stop').callsFake(target2);
        const target1 = sinon.stub().returns(nullEvent);
        instantiationService.stub(ITelemetryService, 'publicLog', target1);
        instantiationService.stub(ISearchService, searchServiceWithResults([aRawMatch('/1', new TextSearchMatch('some preview', lineOneRange))], { results: [], stats: testSearchStats, messages: [] }));
        instantiationService.stub(INotebookSearchService, notebookSearchServiceWithInfo([], undefined));
        const testObject = instantiationService.createInstance(SearchModelImpl);
        store.add(testObject);
        const result = testObject.search({
            contentPattern: { pattern: 'somestring' },
            type: 2 /* QueryType.Text */,
            folderQueries,
        }).asyncResults;
        return result.then(() => {
            return timeout(1).then(() => {
                // timeout because promise handlers may run in a different order. We only care that these
                // are fired at some point.
                assert.ok(target1.calledWith('searchResultsFirstRender'));
                assert.ok(target1.calledWith('searchResultsFinished'));
                // assert.strictEqual(1, target2.callCount);
            });
        });
    });
    test('Search Model: Search reports timed telemetry on search when error is called', () => {
        const target2 = sinon.spy();
        sinon.stub(nullEvent, 'stop').callsFake(target2);
        const target1 = sinon.stub().returns(nullEvent);
        instantiationService.stub(ITelemetryService, 'publicLog', target1);
        instantiationService.stub(ISearchService, searchServiceWithError(new Error('This error should be thrown by this test.')));
        instantiationService.stub(INotebookSearchService, notebookSearchServiceWithInfo([], undefined));
        const testObject = instantiationService.createInstance(SearchModelImpl);
        store.add(testObject);
        const result = testObject.search({
            contentPattern: { pattern: 'somestring' },
            type: 2 /* QueryType.Text */,
            folderQueries,
        }).asyncResults;
        return result.then(() => { }, () => {
            return timeout(1).then(() => {
                assert.ok(target1.calledWith('searchResultsFirstRender'));
                assert.ok(target1.calledWith('searchResultsFinished'));
            });
        });
    });
    test('Search Model: Search reports timed telemetry on search when error is cancelled error', () => {
        const target2 = sinon.spy();
        sinon.stub(nullEvent, 'stop').callsFake(target2);
        const target1 = sinon.stub().returns(nullEvent);
        instantiationService.stub(ITelemetryService, 'publicLog', target1);
        const deferredPromise = new DeferredPromise();
        instantiationService.stub(ISearchService, searchServiceWithDeferredPromise(deferredPromise.p));
        instantiationService.stub(INotebookSearchService, notebookSearchServiceWithInfo([], undefined));
        const testObject = instantiationService.createInstance(SearchModelImpl);
        store.add(testObject);
        const result = testObject.search({
            contentPattern: { pattern: 'somestring' },
            type: 2 /* QueryType.Text */,
            folderQueries,
        }).asyncResults;
        deferredPromise.cancel();
        return result.then(() => { }, async () => {
            return timeout(1).then(() => {
                assert.ok(target1.calledWith('searchResultsFirstRender'));
                assert.ok(target1.calledWith('searchResultsFinished'));
                // assert.ok(target2.calledOnce);
            });
        });
    });
    test('Search Model: Search results are cleared during search', async () => {
        const results = [
            aRawMatch('/1', new TextSearchMatch('preview 1', new OneLineRange(1, 1, 4)), new TextSearchMatch('preview 1', new OneLineRange(1, 4, 11))),
            aRawMatch('/2', new TextSearchMatch('preview 2', lineOneRange)),
        ];
        instantiationService.stub(ISearchService, searchServiceWithResults(results, { limitHit: false, messages: [], results: [] }));
        instantiationService.stub(INotebookSearchService, notebookSearchServiceWithInfo([], undefined));
        const testObject = instantiationService.createInstance(SearchModelImpl);
        store.add(testObject);
        await testObject.search({
            contentPattern: { pattern: 'somestring' },
            type: 2 /* QueryType.Text */,
            folderQueries,
        }).asyncResults;
        assert.ok(!testObject.searchResult.isEmpty());
        instantiationService.stub(ISearchService, searchServiceWithResults([]));
        testObject.search({
            contentPattern: { pattern: 'somestring' },
            type: 2 /* QueryType.Text */,
            folderQueries,
        });
        assert.ok(testObject.searchResult.isEmpty());
    });
    test('Search Model: Previous search is cancelled when new search is called', async () => {
        const tokenSource = new CancellationTokenSource();
        store.add(tokenSource);
        instantiationService.stub(ISearchService, canceleableSearchService(tokenSource));
        instantiationService.stub(INotebookSearchService, notebookSearchServiceWithInfo([], tokenSource));
        const testObject = instantiationService.createInstance(SearchModelImpl);
        store.add(testObject);
        testObject.search({
            contentPattern: { pattern: 'somestring' },
            type: 2 /* QueryType.Text */,
            folderQueries,
        });
        instantiationService.stub(ISearchService, searchServiceWithResults([]));
        instantiationService.stub(INotebookSearchService, notebookSearchServiceWithInfo([], undefined));
        testObject.search({
            contentPattern: { pattern: 'somestring' },
            type: 2 /* QueryType.Text */,
            folderQueries,
        });
        assert.ok(tokenSource.token.isCancellationRequested);
    });
    test('getReplaceString returns proper replace string for regExpressions', async () => {
        const results = [
            aRawMatch('/1', new TextSearchMatch('preview 1', new OneLineRange(1, 1, 4)), new TextSearchMatch('preview 1', new OneLineRange(1, 4, 11))),
        ];
        instantiationService.stub(ISearchService, searchServiceWithResults(results, { limitHit: false, messages: [], results }));
        instantiationService.stub(INotebookSearchService, notebookSearchServiceWithInfo([], undefined));
        const testObject = instantiationService.createInstance(SearchModelImpl);
        store.add(testObject);
        await testObject.search({
            contentPattern: { pattern: 're' },
            type: 2 /* QueryType.Text */,
            folderQueries,
        }).asyncResults;
        testObject.replaceString = 'hello';
        let match = testObject.searchResult.matches()[0].matches()[0];
        assert.strictEqual('hello', match.replaceString);
        await testObject.search({
            contentPattern: { pattern: 're', isRegExp: true },
            type: 2 /* QueryType.Text */,
            folderQueries,
        }).asyncResults;
        match = testObject.searchResult.matches()[0].matches()[0];
        assert.strictEqual('hello', match.replaceString);
        await testObject.search({
            contentPattern: { pattern: 're(?:vi)', isRegExp: true },
            type: 2 /* QueryType.Text */,
            folderQueries,
        }).asyncResults;
        match = testObject.searchResult.matches()[0].matches()[0];
        assert.strictEqual('hello', match.replaceString);
        await testObject.search({
            contentPattern: { pattern: 'r(e)(?:vi)', isRegExp: true },
            type: 2 /* QueryType.Text */,
            folderQueries,
        }).asyncResults;
        match = testObject.searchResult.matches()[0].matches()[0];
        assert.strictEqual('hello', match.replaceString);
        await testObject.search({
            contentPattern: { pattern: 'r(e)(?:vi)', isRegExp: true },
            type: 2 /* QueryType.Text */,
            folderQueries,
        }).asyncResults;
        testObject.replaceString = 'hello$1';
        match = testObject.searchResult.matches()[0].matches()[0];
        assert.strictEqual('helloe', match.replaceString);
    });
    function aRawMatch(resource, ...results) {
        return { resource: createFileUriFromPathFromRoot(resource), results };
    }
    function aRawMatchWithCells(resource, ...cells) {
        return { resource: createFileUriFromPathFromRoot(resource), cellResults: cells };
    }
    function stubModelService(instantiationService) {
        instantiationService.stub(IThemeService, new TestThemeService());
        const config = new TestConfigurationService();
        config.setUserConfiguration('search', { searchOnType: true });
        instantiationService.stub(IConfigurationService, config);
        const modelService = instantiationService.createInstance(ModelService);
        store.add(modelService);
        return modelService;
    }
    function stubNotebookEditorService(instantiationService) {
        instantiationService.stub(IEditorGroupsService, new TestEditorGroupsService());
        instantiationService.stub(IContextKeyService, new MockContextKeyService());
        instantiationService.stub(IEditorService, store.add(new TestEditorService()));
        const notebookEditorWidgetService = instantiationService.createInstance(NotebookEditorWidgetService);
        store.add(notebookEditorWidgetService);
        return notebookEditorWidgetService;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoTW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL3Rlc3QvYnJvd3Nlci9zZWFyY2hNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQTtBQUM5QixPQUFPLEtBQUssTUFBTSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUUsT0FBTyxFQUVOLHVCQUF1QixHQUN2QixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUNwRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBU04sY0FBYyxFQUdkLFlBQVksRUFFWixlQUFlLEdBQ2YsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FB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QyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDN0UsTUFBTSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzlFLE1BQU0sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM1RSxNQUFNLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFN0UsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLFlBQVksZUFBZSxDQUFDLENBQUE7UUFDeEUsTUFBTSxDQUFFLG1CQUFtQixDQUFDLENBQUMsQ0FBcUIsQ0FBQyxJQUFJLEVBQUUsRUFBRSxLQUFLLGFBQWEsQ0FBQyxDQUFBO1FBQzlFLE1BQU0sQ0FBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQXFCLENBQUMsSUFBSSxFQUFFLEVBQUUsS0FBSyxVQUFVLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUUsbUJBQW1CLENBQUMsQ0FBQyxDQUFxQixDQUFDLElBQUksRUFBRSxFQUFFLEtBQUssVUFBVSxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFFLG1CQUFtQixDQUFDLENBQUMsQ0FBcUIsQ0FBQyxJQUFJLEVBQUUsRUFBRSxLQUFLLFVBQVUs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