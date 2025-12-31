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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoTW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC90ZXN0L2Jyb3dzZXIvc2VhcmNoTW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUE7QUFDOUIsT0FBTyxLQUFLLE1BQU0sTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlFLE9BQU8sRUFFTix1QkFBdUIsR0FDdkIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDcEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQVNOLGNBQWMsRUFHZCxZQUFZLEVBRVosZUFBZSxHQUNmLE1BQU0sOENBQThDLENBQUE7QUFDckQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDakcsT0FBTyxFQUFFLGVBQWUs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