/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { createCancelablePromise } from '../../../../../base/common/async.js';
import { Emitter } from '../../../../../base/common/event.js';
import { FileAccess } from '../../../../../base/common/network.js';
import * as path from '../../../../../base/common/path.js';
import { URI } from '../../../../../base/common/uri.js';
import { flakySuite } from '../../../../../base/test/node/testUtils.js';
import { isSerializedSearchComplete, isSerializedSearchSuccess, } from '../../common/search.js';
import { SearchService as RawSearchService, } from '../../node/rawSearchService.js';
const TEST_FOLDER_QUERIES = [{ folder: URI.file(path.normalize('/some/where')) }];
const TEST_FIXTURES = path.normalize(FileAccess.asFileUri('vs/workbench/services/search/test/node/fixtures').fsPath);
const MULTIROOT_QUERIES = [
    { folder: URI.file(path.join(TEST_FIXTURES, 'examples')) },
    { folder: URI.file(path.join(TEST_FIXTURES, 'more')) },
];
const stats = {
    fileWalkTime: 0,
    cmdTime: 1,
    directoriesWalked: 2,
    filesWalked: 3,
};
class TestSearchEngine {
    constructor(result, config) {
        this.result = result;
        this.config = config;
        this.isCanceled = false;
        TestSearchEngine.last = this;
    }
    search(onResult, onProgress, done) {
        const self = this;
        (function next() {
            process.nextTick(() => {
                if (self.isCanceled) {
                    done(null, {
                        limitHit: false,
                        stats: stats,
                        messages: [],
                    });
                    return;
                }
                const result = self.result();
                if (!result) {
                    done(null, {
                        limitHit: false,
                        stats: stats,
                        messages: [],
                    });
                }
                else {
                    onResult(result);
                    next();
                }
            });
        })();
    }
    cancel() {
        this.isCanceled = true;
    }
}
flakySuite('RawSearchService', () => {
    const rawSearch = {
        type: 1 /* QueryType.File */,
        folderQueries: TEST_FOLDER_QUERIES,
        filePattern: 'a',
    };
    const rawMatch = {
        base: path.normalize('/some'),
        relativePath: 'where',
        searchPath: undefined,
    };
    const match = {
        path: path.normalize('/some/where'),
    };
    test('Individual results', async function () {
        let i = 5;
        const Engine = TestSearchEngine.bind(null, () => (i-- ? rawMatch : null));
        const service = new RawSearchService();
        let results = 0;
        const cb = (value) => {
            if (!!value.message) {
                return;
            }
            if (!Array.isArray(value)) {
                assert.deepStrictEqual(value, match);
                results++;
            }
            else {
                assert.fail(JSON.stringify(value));
            }
        };
        await service.doFileSearchWithEngine(Engine, rawSearch, cb, null, 0);
        return assert.strictEqual(results, 5);
    });
    test('Batch results', async function () {
        let i = 25;
        const Engine = TestSearchEngine.bind(null, () => (i-- ? rawMatch : null));
        const service = new RawSearchService();
        const results = [];
        const cb = (value) => {
            if (!!value.message) {
                return;
            }
            if (Array.isArray(value)) {
                value.forEach((m) => {
                    assert.deepStrictEqual(m, match);
                });
                results.push(value.length);
            }
            else {
                assert.fail(JSON.stringify(value));
            }
        };
        await service.doFileSearchWithEngine(Engine, rawSearch, cb, undefined, 10);
        assert.deepStrictEqual(results, [10, 10, 5]);
    });
    test('Collect batched results', async function () {
        const uriPath = '/some/where';
        let i = 25;
        const Engine = TestSearchEngine.bind(null, () => (i-- ? rawMatch : null));
        const service = new RawSearchService();
        function fileSearch(config, batchSize) {
            let promise;
            const emitter = new Emitter({
                onWillAddFirstListener: () => {
                    promise = createCancelablePromise((token) => service
                        .doFileSearchWithEngine(Engine, config, (p) => emitter.fire(p), token, batchSize)
                        .then((c) => emitter.fire(c), (err) => emitter.fire({ type: 'error', error: err })));
                },
                onDidRemoveLastListener: () => {
                    promise.cancel();
                },
            });
            return emitter.event;
        }
        const result = await collectResultsFromEvent(fileSearch(rawSearch, 10));
        result.files.forEach((f) => {
            assert.strictEqual(f.path.replace(/\\/g, '/'), uriPath);
        });
        assert.strictEqual(result.files.length, 25, 'Result');
    });
    test('Multi-root with include pattern and maxResults', async function () {
        const service = new RawSearchService();
        const query = {
            type: 1 /* QueryType.File */,
            folderQueries: MULTIROOT_QUERIES,
            maxResults: 1,
            includePattern: {
                '*.txt': true,
                '*.js': true,
            },
        };
        const result = await collectResultsFromEvent(service.fileSearch(query));
        assert.strictEqual(result.files.length, 1, 'Result');
    });
    test('Handles maxResults=0 correctly', async function () {
        const service = new RawSearchService();
        const query = {
            type: 1 /* QueryType.File */,
            folderQueries: MULTIROOT_QUERIES,
            maxResults: 0,
            sortByScore: true,
            includePattern: {
                '*.txt': true,
                '*.js': true,
            },
        };
        const result = await collectResultsFromEvent(service.fileSearch(query));
        assert.strictEqual(result.files.length, 0, 'Result');
    });
    test('Multi-root with include pattern and exists', async function () {
        const service = new RawSearchService();
        const query = {
            type: 1 /* QueryType.File */,
            folderQueries: MULTIROOT_QUERIES,
            exists: true,
            includePattern: {
                '*.txt': true,
                '*.js': true,
            },
        };
        const result = await collectResultsFromEvent(service.fileSearch(query));
        assert.strictEqual(result.files.length, 0, 'Result');
        assert.ok(result.limitHit);
    });
    test('Sorted results', async function () {
        const paths = ['bab', 'bbc', 'abb'];
        const matches = paths.map((relativePath) => ({
            base: path.normalize('/some/where'),
            relativePath,
            basename: relativePath,
            size: 3,
            searchPath: undefined,
        }));
        const Engine = TestSearchEngine.bind(null, () => matches.shift());
        const service = new RawSearchService();
        const results = [];
        const cb = (value) => {
            if (!!value.message) {
                return;
            }
            if (Array.isArray(value)) {
                results.push(...value.map((v) => v.path));
            }
            else {
                assert.fail(JSON.stringify(value));
            }
        };
        await service.doFileSearchWithEngine(Engine, {
            type: 1 /* QueryType.File */,
            folderQueries: TEST_FOLDER_QUERIES,
            filePattern: 'bb',
            sortByScore: true,
            maxResults: 2,
        }, cb, undefined, 1);
        assert.notStrictEqual(typeof TestSearchEngine.last.config.maxResults, 'number');
        assert.deepStrictEqual(results, [
            path.normalize('/some/where/bbc'),
            path.normalize('/some/where/bab'),
        ]);
    });
    test('Sorted result batches', async function () {
        let i = 25;
        const Engine = TestSearchEngine.bind(null, () => (i-- ? rawMatch : null));
        const service = new RawSearchService();
        const results = [];
        const cb = (value) => {
            if (!!value.message) {
                return;
            }
            if (Array.isArray(value)) {
                value.forEach((m) => {
                    assert.deepStrictEqual(m, match);
                });
                results.push(value.length);
            }
            else {
                assert.fail(JSON.stringify(value));
            }
        };
        await service.doFileSearchWithEngine(Engine, {
            type: 1 /* QueryType.File */,
            folderQueries: TEST_FOLDER_QUERIES,
            filePattern: 'a',
            sortByScore: true,
            maxResults: 23,
        }, cb, undefined, 10);
        assert.deepStrictEqual(results, [10, 10, 3]);
    });
    test('Cached results', function () {
        const paths = ['bcb', 'bbc', 'aab'];
        const matches = paths.map((relativePath) => ({
            base: path.normalize('/some/where'),
            relativePath,
            basename: relativePath,
            size: 3,
            searchPath: undefined,
        }));
        const Engine = TestSearchEngine.bind(null, () => matches.shift());
        const service = new RawSearchService();
        const results = [];
        const cb = (value) => {
            if (!!value.message) {
                return;
            }
            if (Array.isArray(value)) {
                results.push(...value.map((v) => v.path));
            }
            else {
                assert.fail(JSON.stringify(value));
            }
        };
        return service
            .doFileSearchWithEngine(Engine, {
            type: 1 /* QueryType.File */,
            folderQueries: TEST_FOLDER_QUERIES,
            filePattern: 'b',
            sortByScore: true,
            cacheKey: 'x',
        }, cb, undefined, -1)
            .then((complete) => {
            assert.strictEqual(complete.stats.fromCache, false);
            assert.deepStrictEqual(results, [
                path.normalize('/some/where/bcb'),
                path.normalize('/some/where/bbc'),
                path.normalize('/some/where/aab'),
            ]);
        })
            .then(async () => {
            const results = [];
            const cb = (value) => {
                if (Array.isArray(value)) {
                    results.push(...value.map((v) => v.path));
                }
                else {
                    assert.fail(JSON.stringify(value));
                }
            };
            try {
                const complete = await service.doFileSearchWithEngine(Engine, {
                    type: 1 /* QueryType.File */,
                    folderQueries: TEST_FOLDER_QUERIES,
                    filePattern: 'bc',
                    sortByScore: true,
                    cacheKey: 'x',
                }, cb, undefined, -1);
                assert.ok(complete.stats.fromCache);
                assert.deepStrictEqual(results, [
                    path.normalize('/some/where/bcb'),
                    path.normalize('/some/where/bbc'),
                ]);
            }
            catch (e) { }
        })
            .then(() => {
            return service.clearCache('x');
        })
            .then(async () => {
            matches.push({
                base: path.normalize('/some/where'),
                relativePath: 'bc',
                searchPath: undefined,
            });
            const results = [];
            const cb = (value) => {
                if (!!value.message) {
                    return;
                }
                if (Array.isArray(value)) {
                    results.push(...value.map((v) => v.path));
                }
                else {
                    assert.fail(JSON.stringify(value));
                }
            };
            const complete = await service.doFileSearchWithEngine(Engine, {
                type: 1 /* QueryType.File */,
                folderQueries: TEST_FOLDER_QUERIES,
                filePattern: 'bc',
                sortByScore: true,
                cacheKey: 'x',
            }, cb, undefined, -1);
            assert.strictEqual(complete.stats.fromCache, false);
            assert.deepStrictEqual(results, [path.normalize('/some/where/bc')]);
        });
    });
});
function collectResultsFromEvent(event) {
    const files = [];
    let listener;
    return new Promise((c, e) => {
        listener = event((ev) => {
            if (isSerializedSearchComplete(ev)) {
                if (isSerializedSearchSuccess(ev)) {
                    c({ files, limitHit: ev.limitHit });
                }
                else {
                    e(ev.error);
                }
                listener.dispose();
            }
            else if (Array.isArray(ev)) {
                files.push(...ev);
            }
            else if (ev.path) {
                files.push(ev);
            }
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF3U2VhcmNoU2VydmljZS5pbnRlZ3JhdGlvblRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL3Rlc3Qvbm9kZS9yYXdTZWFyY2hTZXJ2aWNlLmludGVncmF0aW9uVGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQTtBQUVwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbEUsT0FBTyxLQUFLLElBQUksTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZFLE9BQU8sRUFhTiwwQkFBMEIsRUFDMUIseUJBQXlCLEdBRXpCLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUVOLGFBQWEsSUFBSSxnQkFBZ0IsR0FDakMsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV2QyxNQUFNLG1CQUFtQixHQUFHLENBQUMsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO0FBRWpGLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ25DLFVBQVUsQ0FBQyxTQUFTLENBQUMsaURBQWlELENBQUMsQ0FBQyxNQUFNLENBQzlFLENBQUE7QUFDRCxNQUFNLGlCQUFpQixHQUFtQjtJQUN6QyxFQUFFLE1BQU0sRUFBRSxH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