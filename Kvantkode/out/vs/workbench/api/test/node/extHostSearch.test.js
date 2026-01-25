/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { mapArrayOrNot } from '../../../../base/common/arrays.js';
import { timeout } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { revive } from '../../../../base/common/marshalling.js';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { MainContext } from '../../common/extHost.protocol.js';
import { Range } from '../../common/extHostTypes.js';
import { URITransformerService } from '../../common/extHostUriTransformerService.js';
import { NativeExtHostSearch } from '../../node/extHostSearch.js';
import { TestRPCProtocol } from '../common/testRPCProtocol.js';
import { resultIsMatch, } from '../../../services/search/common/search.js';
import { NativeTextSearchManager } from '../../../services/search/node/textSearchManager.js';
let rpcProtocol;
let extHostSearch;
let mockMainThreadSearch;
class MockMainThreadSearch {
    constructor() {
        this.results = [];
    }
    $registerFileSearchProvider(handle, scheme) {
        this.lastHandle = handle;
    }
    $registerTextSearchProvider(handle, scheme) {
        this.lastHandle = handle;
    }
    $registerAITextSearchProvider(handle, scheme) {
        this.lastHandle = handle;
    }
    $unregisterProvider(handle) { }
    $handleFileMatch(handle, session, data) {
        this.results.push(...data);
    }
    $handleTextMatch(handle, session, data) {
        this.results.push(...data);
    }
    $handleTelemetry(eventName, data) { }
    dispose() { }
}
let mockPFS;
function extensionResultIsMatch(data) {
    return !!data.preview;
}
suite('ExtHostSearch', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    async function registerTestTextSearchProvider(provider, scheme = 'file') {
        disposables.add(extHostSearch.registerTextSearchProviderOld(scheme, provider));
        await rpcProtocol.sync();
    }
    async function registerTestFileSearchProvider(provider, scheme = 'file') {
        disposables.add(extHostSearch.registerFileSearchProviderOld(scheme, provider));
        await rpcProtocol.sync();
    }
    async function runFileSearch(query, cancel = false) {
        let stats;
        try {
            const cancellation = new CancellationTokenSource();
            const p = extHostSearch.$provideFileSearchResults(mockMainThreadSearch.lastHandle, 0, query, cancellation.token);
            if (cancel) {
                await timeout(0);
                cancellation.cancel();
            }
            stats = await p;
        }
        catch (err) {
            if (!isCancellationError(err)) {
                await rpcProtocol.sync();
                throw err;
            }
        }
        await rpcProtocol.sync();
        return {
            results: mockMainThreadSearch.results.map((r) => URI.revive(r)),
            stats: stats,
        };
    }
    async function runTextSearch(query) {
        let stats;
        try {
            const cancellation = new CancellationTokenSource();
            const p = extHostSearch.$provideTextSearchResults(mockMainThreadSearch.lastHandle, 0, query, cancellation.token);
            stats = await p;
        }
        catch (err) {
            if (!isCancellationError(err)) {
                await rpcProtocol.sync();
                throw err;
            }
        }
        await rpcProtocol.sync();
        const results = revive(mockMainThreadSearch.results);
        return { results, stats: stats };
    }
    setup(() => {
        rpcProtocol = new TestRPCProtocol();
        mockMainThreadSearch = new MockMainThreadSearch();
        const logService = new NullLogService();
        rpcProtocol.set(MainContext.MainThreadSearch, mockMainThreadSearch);
        mockPFS = {};
        extHostSearch = disposables.add(new (class extends NativeExtHostSearch {
            constructor() {
                super(rpcProtocol, new (class extends mock() {
                    constructor() {
                        super(...arguments);
                        this.remote = { isRemote: false, authority: undefined, connectionData: null };
                    }
                })(), new URITransformerService(null), new (class extends mock() {
                    async getConfigProvider() {
                        return {
                            onDidChangeConfiguration(_listener) { },
                            getConfiguration() {
                                return {
                                    get() { },
                                    has() {
                                        return false;
                                    },
                                    inspect() {
                                        return undefined;
                                    },
                                    async update() { },
                                };
                            },
                        };
                    }
                })(), logService);
                this._pfs = mockPFS;
            }
            createTextSearchManager(query, provider) {
                return new NativeTextSearchManager(query, provider, this._pfs);
            }
        })());
    });
    teardown(() => {
        return rpcProtocol.sync();
    });
    const rootFolderA = URI.file('/foo/bar1');
    const rootFolderB = URI.file('/foo/bar2');
    const fancyScheme = 'fancy';
    const fancySchemeFolderA = URI.from({ scheme: fancyScheme, path: '/project/folder1' });
    suite('File:', () => {
        function getSimpleQuery(filePattern = '') {
            return {
                type: 1 /* QueryType.File */,
                filePattern,
                folderQueries: [{ folder: rootFolderA }],
            };
        }
        function compareURIs(actual, expected) {
            const sortAndStringify = (arr) => arr.sort().map((u) => u.toString());
            assert.deepStrictEqual(sortAndStringify(actual), sortAndStringify(expected));
        }
        test('no results', async () => {
            await registerTestFileSearchProvider({
                provideFileSearchResults(query, options, token) {
                    return Promise.resolve(null);
                },
            });
            const { results, stats } = await runFileSearch(getSimpleQuery());
            assert(!stats.limitHit);
            assert(!results.length);
        });
        test('simple results', async () => {
            const reportedResults = [
                joinPath(rootFolderA, 'file1.ts'),
                joinPath(rootFolderA, 'file2.ts'),
                joinPath(rootFolderA, 'subfolder/file3.ts'),
            ];
            await registerTestFileSearchProvider({
                provideFileSearchResults(query, options, token) {
                    return Promise.resolve(reportedResults);
                },
            });
            const { results, stats } = await runFileSearch(getSimpleQuery());
            assert(!stats.limitHit);
            assert.strictEqual(results.length, 3);
            compareURIs(results, reportedResults);
        });
        test('Search canceled', async () => {
            let cancelRequested = false;
            await registerTestFileSearchProvider({
                provideFileSearchResults(query, options, token) {
                    return new Promise((resolve, reject) => {
                        function onCancel() {
                            cancelRequested = true;
                            resolve([joinPath(options.folder, 'file1.ts')]); // or reject or nothing?
                        }
                        if (token.isCancellationRequested) {
                            onCancel();
                        }
                        else {
                            disposables.add(token.onCancellationRequested(() => onCancel()));
                        }
                    });
                },
            });
            const { results } = await runFileSearch(getSimpleQuery(), true);
            assert(cancelRequested);
            assert(!results.length);
        });
        test('session cancellation should work', async () => {
            let numSessionCancelled = 0;
            const disposables = [];
            await registerTestFileSearchProvider({
                provideFileSearchResults(query, options, token) {
                    disposables.push(options.session?.onCancellationRequested(() => {
                        numSessionCancelled++;
                    }));
                    return Promise.resolve([]);
                },
            });
            await runFileSearch({ ...getSimpleQuery(), cacheKey: '1' }, true);
            await runFileSearch({ ...getSimpleQuery(), cacheKey: '2' }, true);
            extHostSearch.$clearCache('1');
            assert.strictEqual(numSessionCancelled, 1);
            disposables.forEach((d) => d?.dispose());
        });
        test('provider returns null', async () => {
            await registerTestFileSearchProvider({
                provideFileSearchResults(query, options, token) {
                    return null;
                },
            });
            try {
                await runFileSearch(getSimpleQuery());
                assert(false, 'Expected to fail');
            }
            catch {
                // Expected to throw
            }
        });
        test('all provider calls get global include/excludes', async () => {
            await registerTestFileSearchProvider({
                provideFileSearchResults(query, options, token) {
                    assert(options.excludes.length === 2 && options.includes.length === 2, 'Missing global include/excludes');
                    return Promise.resolve(null);
                },
            });
            const query = {
                type: 1 /* QueryType.File */,
                filePattern: '',
                includePattern: {
                    foo: true,
                    bar: true,
                },
                excludePattern: {
                    something: true,
                    else: true,
                },
                folderQueries: [{ folder: rootFolderA }, { folder: rootFolderB }],
            };
            await runFileSearch(query);
        });
        test('global/local include/excludes combined', async () => {
            await registerTestFileSearchProvider({
                provideFileSearchResults(query, options, token) {
                    if (options.folder.toString() === rootFolderA.toString()) {
                        assert.deepStrictEqual(options.includes.sort(), ['*.ts', 'foo']);
                        assert.deepStrictEqual(options.excludes.sort(), ['*.js', 'bar']);
                    }
                    else {
                        assert.deepStrictEqual(options.includes.sort(), ['*.ts']);
                        assert.deepStrictEqual(options.excludes.sort(), ['*.js']);
                    }
                    return Promise.resolve(null);
                },
            });
            const query = {
                type: 1 /* QueryType.File */,
                filePattern: '',
                includePattern: {
                    '*.ts': true,
                },
                excludePattern: {
                    '*.js': true,
                },
                folderQueries: [
                    {
                        folder: rootFolderA,
                        includePattern: {
                            foo: true,
                        },
                        excludePattern: [
                            {
                                pattern: {
                                    bar: true,
                                },
                            },
                        ],
                    },
                    { folder: rootFolderB },
                ],
            };
            await runFileSearch(query);
        });
        test('include/excludes resolved correctly', async () => {
            await registerTestFileSearchProvider({
                provideFileSearchResults(query, options, token) {
                    assert.deepStrictEqual(options.includes.sort(), ['*.jsx', '*.ts']);
                    assert.deepStrictEqual(options.excludes.sort(), []);
                    return Promise.resolve(null);
                },
            });
            const query = {
                type: 1 /* QueryType.File */,
                filePattern: '',
                includePattern: {
                    '*.ts': true,
                    '*.jsx': false,
                },
                excludePattern: {
                    '*.js': true,
                    '*.tsx': false,
                },
                folderQueries: [
                    {
                        folder: rootFolderA,
                        includePattern: {
                            '*.jsx': true,
                        },
                        excludePattern: [
                            {
                                pattern: {
                                    '*.js': false,
                                },
                            },
                        ],
                    },
                ],
            };
            await runFileSearch(query);
        });
        test('basic sibling exclude clause', async () => {
            const reportedResults = ['file1.ts', 'file1.js'];
            await registerTestFileSearchProvider({
                provideFileSearchResults(query, options, token) {
                    return Promise.resolve(reportedResults.map((relativePath) => joinPath(options.folder, relativePath)));
                },
            });
            const query = {
                type: 1 /* QueryType.File */,
                filePattern: '',
                excludePattern: {
                    '*.js': {
                        when: '$(basename).ts',
                    },
                },
                folderQueries: [{ folder: rootFolderA }],
            };
            const { results } = await runFileSearch(query);
            compareURIs(results, [joinPath(rootFolderA, 'file1.ts')]);
        });
        // https://github.com/microsoft/vscode-remotehub/issues/255
        test('include, sibling exclude, and subfolder', async () => {
            const reportedResults = ['foo/file1.ts', 'foo/file1.js'];
            await registerTestFileSearchProvider({
                provideFileSearchResults(query, options, token) {
                    return Promise.resolve(reportedResults.map((relativePath) => joinPath(options.folder, relativePath)));
                },
            });
            const query = {
                type: 1 /* QueryType.File */,
                filePattern: '',
                includePattern: { '**/*.ts': true },
                excludePattern: {
                    '*.js': {
                        when: '$(basename).ts',
                    },
                },
                folderQueries: [{ folder: rootFolderA }],
            };
            const { results } = await runFileSearch(query);
            compareURIs(results, [joinPath(rootFolderA, 'foo/file1.ts')]);
        });
        test('multiroot sibling exclude clause', async () => {
            await registerTestFileSearchProvider({
                provideFileSearchResults(query, options, token) {
                    let reportedResults;
                    if (options.folder.fsPath === rootFolderA.fsPath) {
                        reportedResults = ['folder/fileA.scss', 'folder/fileA.css', 'folder/file2.css'].map((relativePath) => joinPath(rootFolderA, relativePath));
                    }
                    else {
                        reportedResults = ['fileB.ts', 'fileB.js', 'file3.js'].map((relativePath) => joinPath(rootFolderB, relativePath));
                    }
                    return Promise.resolve(reportedResults);
                },
            });
            const query = {
                type: 1 /* QueryType.File */,
                filePattern: '',
                excludePattern: {
                    '*.js': {
                        when: '$(basename).ts',
                    },
                    '*.css': true,
                },
                folderQueries: [
                    {
                        folder: rootFolderA,
                        excludePattern: [
                            {
                                pattern: {
                                    'folder/*.css': {
                                        when: '$(basename).scss',
                                    },
                                },
                            },
                        ],
                    },
                    {
                        folder: rootFolderB,
                        excludePattern: [
                            {
                                pattern: {
                                    '*.js': false,
                                },
                            },
                        ],
                    },
                ],
            };
            const { results } = await runFileSearch(query);
            compareURIs(results, [
                joinPath(rootFolderA, 'folder/fileA.scss'),
                joinPath(rootFolderA, 'folder/file2.css'),
                joinPath(rootFolderB, 'fileB.ts'),
                joinPath(rootFolderB, 'fileB.js'),
                joinPath(rootFolderB, 'file3.js'),
            ]);
        });
        test('max results = 1', async () => {
            const reportedResults = [
                joinPath(rootFolderA, 'file1.ts'),
                joinPath(rootFolderA, 'file2.ts'),
                joinPath(rootFolderA, 'file3.ts'),
            ];
            let wasCanceled = false;
            await registerTestFileSearchProvider({
                provideFileSearchResults(query, options, token) {
                    disposables.add(token.onCancellationRequested(() => (wasCanceled = true)));
                    return Promise.resolve(reportedResults);
                },
            });
            const query = {
                type: 1 /* QueryType.File */,
                filePattern: '',
                maxResults: 1,
                folderQueries: [
                    {
                        folder: rootFolderA,
                    },
                ],
            };
            const { results, stats } = await runFileSearch(query);
            assert(stats.limitHit, 'Expected to return limitHit');
            assert.strictEqual(results.length, 1);
            compareURIs(results, reportedResults.slice(0, 1));
            assert(wasCanceled, 'Expected to be canceled when hitting limit');
        });
        test('max results = 2', async () => {
            const reportedResults = [
                joinPath(rootFolderA, 'file1.ts'),
                joinPath(rootFolderA, 'file2.ts'),
                joinPath(rootFolderA, 'file3.ts'),
            ];
            let wasCanceled = false;
            await registerTestFileSearchProvider({
                provideFileSearchResults(query, options, token) {
                    disposables.add(token.onCancellationRequested(() => (wasCanceled = true)));
                    return Promise.resolve(reportedResults);
                },
            });
            const query = {
                type: 1 /* QueryType.File */,
                filePattern: '',
                maxResults: 2,
                folderQueries: [
                    {
                        folder: rootFolderA,
                    },
                ],
            };
            const { results, stats } = await runFileSearch(query);
            assert(stats.limitHit, 'Expected to return limitHit');
            assert.strictEqual(results.length, 2);
            compareURIs(results, reportedResults.slice(0, 2));
            assert(wasCanceled, 'Expected to be canceled when hitting limit');
        });
        test('provider returns maxResults exactly', async () => {
            const reportedResults = [joinPath(rootFolderA, 'file1.ts'), joinPath(rootFolderA, 'file2.ts')];
            let wasCanceled = false;
            await registerTestFileSearchProvider({
                provideFileSearchResults(query, options, token) {
                    disposables.add(token.onCancellationRequested(() => (wasCanceled = true)));
                    return Promise.resolve(reportedResults);
                },
            });
            const query = {
                type: 1 /* QueryType.File */,
                filePattern: '',
                maxResults: 2,
                folderQueries: [
                    {
                        folder: rootFolderA,
                    },
                ],
            };
            const { results, stats } = await runFileSearch(query);
            assert(!stats.limitHit, 'Expected not to return limitHit');
            assert.strictEqual(results.length, 2);
            compareURIs(results, reportedResults);
            assert(!wasCanceled, 'Expected not to be canceled when just reaching limit');
        });
        test('multiroot max results', async () => {
            let cancels = 0;
            await registerTestFileSearchProvider({
                async provideFileSearchResults(query, options, token) {
                    disposables.add(token.onCancellationRequested(() => cancels++));
                    // Provice results async so it has a chance to invoke every provider
                    await new Promise((r) => process.nextTick(r));
                    return ['file1.ts', 'file2.ts', 'file3.ts'].map((relativePath) => joinPath(options.folder, relativePath));
                },
            });
            const query = {
                type: 1 /* QueryType.File */,
                filePattern: '',
                maxResults: 2,
                folderQueries: [
                    {
                        folder: rootFolderA,
                    },
                    {
                        folder: rootFolderB,
                    },
                ],
            };
            const { results } = await runFileSearch(query);
            assert.strictEqual(results.length, 2); // Don't care which 2 we got
            assert.strictEqual(cancels, 2, 'Expected all invocations to be canceled when hitting limit');
        });
        test('works with non-file schemes', async () => {
            const reportedResults = [
                joinPath(fancySchemeFolderA, 'file1.ts'),
                joinPath(fancySchemeFolderA, 'file2.ts'),
                joinPath(fancySchemeFolderA, 'subfolder/file3.ts'),
            ];
            await registerTestFileSearchProvider({
                provideFileSearchResults(query, options, token) {
                    return Promise.resolve(reportedResults);
                },
            }, fancyScheme);
            const query = {
                type: 1 /* QueryType.File */,
                filePattern: '',
                folderQueries: [
                    {
                        folder: fancySchemeFolderA,
                    },
                ],
            };
            const { results } = await runFileSearch(query);
            compareURIs(results, reportedResults);
        });
        test('if onlyFileScheme is set, do not call custom schemes', async () => {
            let fancySchemeCalled = false;
            await registerTestFileSearchProvider({
                provideFileSearchResults(query, options, token) {
                    fancySchemeCalled = true;
                    return Promise.resolve([]);
                },
            }, fancyScheme);
            const query = {
                type: 1 /* QueryType.File */,
                filePattern: '',
                folderQueries: [],
            };
            await runFileSearch(query);
            assert(!fancySchemeCalled);
        });
    });
    suite('Text:', () => {
        function makePreview(text) {
            return {
                matches: [new Range(0, 0, 0, text.length)],
                text,
            };
        }
        function makeTextResult(baseFolder, relativePath) {
            return {
                preview: makePreview('foo'),
                ranges: [new Range(0, 0, 0, 3)],
                uri: joinPath(baseFolder, relativePath),
            };
        }
        function getSimpleQuery(queryText) {
            return {
                type: 2 /* QueryType.Text */,
                contentPattern: getPattern(queryText),
                folderQueries: [{ folder: rootFolderA }],
            };
        }
        function getPattern(queryText) {
            return {
                pattern: queryText,
            };
        }
        function assertResults(actual, expected) {
            const actualTextSearchResults = [];
            for (const fileMatch of actual) {
                // Make relative
                for (const lineResult of fileMatch.results) {
                    if (resultIsMatch(lineResult)) {
                        actualTextSearchResults.push({
                            preview: {
                                text: lineResult.previewText,
                                matches: mapArrayOrNot(lineResult.rangeLocations.map((r) => r.preview), (m) => new Range(m.startLineNumber, m.startColumn, m.endLineNumber, m.endColumn)),
                            },
                            ranges: mapArrayOrNot(lineResult.rangeLocations.map((r) => r.source), (r) => new Range(r.startLineNumber, r.startColumn, r.endLineNumber, r.endColumn)),
                            uri: fileMatch.resource,
                        });
                    }
                    else {
                        actualTextSearchResults.push({
                            text: lineResult.text,
                            lineNumber: lineResult.lineNumber,
                            uri: fileMatch.resource,
                        });
                    }
                }
            }
            const rangeToString = (r) => `(${r.start.line}, ${r.start.character}), (${r.end.line}, ${r.end.character})`;
            const makeComparable = (results) => results
                .sort((a, b) => {
                const compareKeyA = a.uri.toString() + ': ' + (extensionResultIsMatch(a) ? a.preview.text : a.text);
                const compareKeyB = b.uri.toString() + ': ' + (extensionResultIsMatch(b) ? b.preview.text : b.text);
                return compareKeyB.localeCompare(compareKeyA);
            })
                .map((r) => extensionResultIsMatch(r)
                ? {
                    uri: r.uri.toString(),
                    range: mapArrayOrNot(r.ranges, rangeToString),
                    preview: {
                        text: r.preview.text,
                        match: null, // Don't care about this right now
                    },
                }
                : {
                    uri: r.uri.toString(),
                    text: r.text,
                    lineNumber: r.lineNumber,
                });
            return assert.deepStrictEqual(makeComparable(actualTextSearchResults), makeComparable(expected));
        }
        test('no results', async () => {
            await registerTestTextSearchProvider({
                provideTextSearchResults(query, options, progress, token) {
                    return Promise.resolve(null);
                },
            });
            const { results, stats } = await runTextSearch(getSimpleQuery('foo'));
            assert(!stats.limitHit);
            assert(!results.length);
        });
        test('basic results', async () => {
            const providedResults = [
                makeTextResult(rootFolderA, 'file1.ts'),
                makeTextResult(rootFolderA, 'file2.ts'),
            ];
            await registerTestTextSearchProvider({
                provideTextSearchResults(query, options, progress, token) {
                    providedResults.forEach((r) => progress.report(r));
                    return Promise.resolve(null);
                },
            });
            const { results, stats } = await runTextSearch(getSimpleQuery('foo'));
            assert(!stats.limitHit);
            assertResults(results, providedResults);
        });
        test('all provider calls get global include/excludes', async () => {
            await registerTestTextSearchProvider({
                provideTextSearchResults(query, options, progress, token) {
                    assert.strictEqual(options.includes.length, 1);
                    assert.strictEqual(options.excludes.length, 1);
                    return Promise.resolve(null);
                },
            });
            const query = {
                type: 2 /* QueryType.Text */,
                contentPattern: getPattern('foo'),
                includePattern: {
                    '*.ts': true,
                },
                excludePattern: {
                    '*.js': true,
                },
                folderQueries: [{ folder: rootFolderA }, { folder: rootFolderB }],
            };
            await runTextSearch(query);
        });
        test('global/local include/excludes combined', async () => {
            await registerTestTextSearchProvider({
                provideTextSearchResults(query, options, progress, token) {
                    if (options.folder.toString() === rootFolderA.toString()) {
                        assert.deepStrictEqual(options.includes.sort(), ['*.ts', 'foo']);
                        assert.deepStrictEqual(options.excludes.sort(), ['*.js', 'bar']);
                    }
                    else {
                        assert.deepStrictEqual(options.includes.sort(), ['*.ts']);
                        assert.deepStrictEqual(options.excludes.sort(), ['*.js']);
                    }
                    return Promise.resolve(null);
                },
            });
            const query = {
                type: 2 /* QueryType.Text */,
                contentPattern: getPattern('foo'),
                includePattern: {
                    '*.ts': true,
                },
                excludePattern: {
                    '*.js': true,
                },
                folderQueries: [
                    {
                        folder: rootFolderA,
                        includePattern: {
                            foo: true,
                        },
                        excludePattern: [
                            {
                                pattern: {
                                    bar: true,
                                },
                            },
                        ],
                    },
                    { folder: rootFolderB },
                ],
            };
            await runTextSearch(query);
        });
        test('include/excludes resolved correctly', async () => {
            await registerTestTextSearchProvider({
                provideTextSearchResults(query, options, progress, token) {
                    assert.deepStrictEqual(options.includes.sort(), ['*.jsx', '*.ts']);
                    assert.deepStrictEqual(options.excludes.sort(), []);
                    return Promise.resolve(null);
                },
            });
            const query = {
                type: 2 /* QueryType.Text */,
                contentPattern: getPattern('foo'),
                includePattern: {
                    '*.ts': true,
                    '*.jsx': false,
                },
                excludePattern: {
                    '*.js': true,
                    '*.tsx': false,
                },
                folderQueries: [
                    {
                        folder: rootFolderA,
                        includePattern: {
                            '*.jsx': true,
                        },
                        excludePattern: [
                            {
                                pattern: {
                                    '*.js': false,
                                },
                            },
                        ],
                    },
                ],
            };
            await runTextSearch(query);
        });
        test('provider fail', async () => {
            await registerTestTextSearchProvider({
                provideTextSearchResults(query, options, progress, token) {
                    throw new Error('Provider fail');
                },
            });
            try {
                await runTextSearch(getSimpleQuery('foo'));
                assert(false, 'Expected to fail');
            }
            catch {
                // expected to fail
            }
        });
        test('basic sibling clause', async () => {
            ;
            mockPFS.Promises = {
                readdir: (_path) => {
                    if (_path === rootFolderA.fsPath) {
                        return Promise.resolve(['file1.js', 'file1.ts']);
                    }
                    else {
                        return Promise.reject(new Error('Wrong path'));
                    }
                },
            };
            const providedResults = [
                makeTextResult(rootFolderA, 'file1.js'),
                makeTextResult(rootFolderA, 'file1.ts'),
            ];
            await registerTestTextSearchProvider({
                provideTextSearchResults(query, options, progress, token) {
                    providedResults.forEach((r) => progress.report(r));
                    return Promise.resolve(null);
                },
            });
            const query = {
                type: 2 /* QueryType.Text */,
                contentPattern: getPattern('foo'),
                excludePattern: {
                    '*.js': {
                        when: '$(basename).ts',
                    },
                },
                folderQueries: [{ folder: rootFolderA }],
            };
            const { results } = await runTextSearch(query);
            assertResults(results, providedResults.slice(1));
        });
        test('multiroot sibling clause', async () => {
            ;
            mockPFS.Promises = {
                readdir: (_path) => {
                    if (_path === joinPath(rootFolderA, 'folder').fsPath) {
                        return Promise.resolve(['fileA.scss', 'fileA.css', 'file2.css']);
                    }
                    else if (_path === rootFolderB.fsPath) {
                        return Promise.resolve(['fileB.ts', 'fileB.js', 'file3.js']);
                    }
                    else {
                        return Promise.reject(new Error('Wrong path'));
                    }
                },
            };
            await registerTestTextSearchProvider({
                provideTextSearchResults(query, options, progress, token) {
                    let reportedResults;
                    if (options.folder.fsPath === rootFolderA.fsPath) {
                        reportedResults = [
                            makeTextResult(rootFolderA, 'folder/fileA.scss'),
                            makeTextResult(rootFolderA, 'folder/fileA.css'),
                            makeTextResult(rootFolderA, 'folder/file2.css'),
                        ];
                    }
                    else {
                        reportedResults = [
                            makeTextResult(rootFolderB, 'fileB.ts'),
                            makeTextResult(rootFolderB, 'fileB.js'),
                            makeTextResult(rootFolderB, 'file3.js'),
                        ];
                    }
                    reportedResults.forEach((r) => progress.report(r));
                    return Promise.resolve(null);
                },
            });
            const query = {
                type: 2 /* QueryType.Text */,
                contentPattern: getPattern('foo'),
                excludePattern: {
                    '*.js': {
                        when: '$(basename).ts',
                    },
                    '*.css': true,
                },
                folderQueries: [
                    {
                        folder: rootFolderA,
                        excludePattern: [
                            {
                                pattern: {
                                    'folder/*.css': {
                                        when: '$(basename).scss',
                                    },
                                },
                            },
                        ],
                    },
                    {
                        folder: rootFolderB,
                        excludePattern: [
                            {
                                pattern: {
                                    '*.js': false,
                                },
                            },
                        ],
                    },
                ],
            };
            const { results } = await runTextSearch(query);
            assertResults(results, [
                makeTextResult(rootFolderA, 'folder/fileA.scss'),
                makeTextResult(rootFolderA, 'folder/file2.css'),
                makeTextResult(rootFolderB, 'fileB.ts'),
                makeTextResult(rootFolderB, 'fileB.js'),
                makeTextResult(rootFolderB, 'file3.js'),
            ]);
        });
        test('include pattern applied', async () => {
            const providedResults = [
                makeTextResult(rootFolderA, 'file1.js'),
                makeTextResult(rootFolderA, 'file1.ts'),
            ];
            await registerTestTextSearchProvider({
                provideTextSearchResults(query, options, progress, token) {
                    providedResults.forEach((r) => progress.report(r));
                    return Promise.resolve(null);
                },
            });
            const query = {
                type: 2 /* QueryType.Text */,
                contentPattern: getPattern('foo'),
                includePattern: {
                    '*.ts': true,
                },
                folderQueries: [{ folder: rootFolderA }],
            };
            const { results } = await runTextSearch(query);
            assertResults(results, providedResults.slice(1));
        });
        test('max results = 1', async () => {
            const providedResults = [
                makeTextResult(rootFolderA, 'file1.ts'),
                makeTextResult(rootFolderA, 'file2.ts'),
            ];
            let wasCanceled = false;
            await registerTestTextSearchProvider({
                provideTextSearchResults(query, options, progress, token) {
                    disposables.add(token.onCancellationRequested(() => (wasCanceled = true)));
                    providedResults.forEach((r) => progress.report(r));
                    return Promise.resolve(null);
                },
            });
            const query = {
                type: 2 /* QueryType.Text */,
                contentPattern: getPattern('foo'),
                maxResults: 1,
                folderQueries: [{ folder: rootFolderA }],
            };
            const { results, stats } = await runTextSearch(query);
            assert(stats.limitHit, 'Expected to return limitHit');
            assertResults(results, providedResults.slice(0, 1));
            assert(wasCanceled, 'Expected to be canceled');
        });
        test('max results = 2', async () => {
            const providedResults = [
                makeTextResult(rootFolderA, 'file1.ts'),
                makeTextResult(rootFolderA, 'file2.ts'),
                makeTextResult(rootFolderA, 'file3.ts'),
            ];
            let wasCanceled = false;
            await registerTestTextSearchProvider({
                provideTextSearchResults(query, options, progress, token) {
                    disposables.add(token.onCancellationRequested(() => (wasCanceled = true)));
                    providedResults.forEach((r) => progress.report(r));
                    return Promise.resolve(null);
                },
            });
            const query = {
                type: 2 /* QueryType.Text */,
                contentPattern: getPattern('foo'),
                maxResults: 2,
                folderQueries: [{ folder: rootFolderA }],
            };
            const { results, stats } = await runTextSearch(query);
            assert(stats.limitHit, 'Expected to return limitHit');
            assertResults(results, providedResults.slice(0, 2));
            assert(wasCanceled, 'Expected to be canceled');
        });
        test('provider returns maxResults exactly', async () => {
            const providedResults = [
                makeTextResult(rootFolderA, 'file1.ts'),
                makeTextResult(rootFolderA, 'file2.ts'),
            ];
            let wasCanceled = false;
            await registerTestTextSearchProvider({
                provideTextSearchResults(query, options, progress, token) {
                    disposables.add(token.onCancellationRequested(() => (wasCanceled = true)));
                    providedResults.forEach((r) => progress.report(r));
                    return Promise.resolve(null);
                },
            });
            const query = {
                type: 2 /* QueryType.Text */,
                contentPattern: getPattern('foo'),
                maxResults: 2,
                folderQueries: [{ folder: rootFolderA }],
            };
            const { results, stats } = await runTextSearch(query);
            assert(!stats.limitHit, 'Expected not to return limitHit');
            assertResults(results, providedResults);
            assert(!wasCanceled, 'Expected not to be canceled');
        });
        test('provider returns early with limitHit', async () => {
            const providedResults = [
                makeTextResult(rootFolderA, 'file1.ts'),
                makeTextResult(rootFolderA, 'file2.ts'),
                makeTextResult(rootFolderA, 'file3.ts'),
            ];
            await registerTestTextSearchProvider({
                provideTextSearchResults(query, options, progress, token) {
                    providedResults.forEach((r) => progress.report(r));
                    return Promise.resolve({ limitHit: true });
                },
            });
            const query = {
                type: 2 /* QueryType.Text */,
                contentPattern: getPattern('foo'),
                maxResults: 1000,
                folderQueries: [{ folder: rootFolderA }],
            };
            const { results, stats } = await runTextSearch(query);
            assert(stats.limitHit, 'Expected to return limitHit');
            assertResults(results, providedResults);
        });
        test('multiroot max results', async () => {
            let cancels = 0;
            await registerTestTextSearchProvider({
                async provideTextSearchResults(query, options, progress, token) {
                    disposables.add(token.onCancellationRequested(() => cancels++));
                    await new Promise((r) => process.nextTick(r));
                    ['file1.ts', 'file2.ts', 'file3.ts'].forEach((f) => progress.report(makeTextResult(options.folder, f)));
                    return null;
                },
            });
            const query = {
                type: 2 /* QueryType.Text */,
                contentPattern: getPattern('foo'),
                maxResults: 2,
                folderQueries: [{ folder: rootFolderA }, { folder: rootFolderB }],
            };
            const { results } = await runTextSearch(query);
            assert.strictEqual(results.length, 2);
            assert.strictEqual(cancels, 2);
        });
        test('works with non-file schemes', async () => {
            const providedResults = [
                makeTextResult(fancySchemeFolderA, 'file1.ts'),
                makeTextResult(fancySchemeFolderA, 'file2.ts'),
                makeTextResult(fancySchemeFolderA, 'file3.ts'),
            ];
            await registerTestTextSearchProvider({
                provideTextSearchResults(query, options, progress, token) {
                    providedResults.forEach((r) => progress.report(r));
                    return Promise.resolve(null);
                },
            }, fancyScheme);
            const query = {
                type: 2 /* QueryType.Text */,
                contentPattern: getPattern('foo'),
                folderQueries: [{ folder: fancySchemeFolderA }],
            };
            const { results } = await runTextSearch(query);
            assertResults(results, providedResults);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFNlYXJjaC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3Qvbm9kZS9leHRIb3N0U2VhcmNoLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFBO0FBRW5FLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFdBQVcsRUFBeUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUdyRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDcEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDcEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FB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