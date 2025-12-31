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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFNlYXJjaC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L25vZGUvZXh0SG9zdFNlYXJjaC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDM0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxXQUFXLEVBQXlCLE1BQU0sa0NBQWtDLENBQUE7QUFHckYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3BELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM5RCxP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