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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF3U2VhcmNoU2VydmljZS5pbnRlZ3JhdGlvblRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvdGVzdC9ub2RlL3Jhd1NlYXJjaFNlcnZpY2UuaW50ZWdyYXRpb25UZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFBO0FBRXBFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRSxPQUFPLEtBQUssSUFBSSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdkUsT0FBTyxFQWFOLDBCQUEwQixFQUMxQix5QkFBeUIsR0FFekIsTUFBTSx3QkFBd0IsQ0FBQTtBQUMvQixPQUFPLEVBRU4sYUFBYSxJQUFJLGdCQUFnQixHQUNqQyxNQUFNLGdDQUFnQyxDQUFBO0FBRXZDLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUE7QUFFakYsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDbkMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxpREFBaUQsQ0FBQyxDQUFDLE1BQU0sQ0FDOUUsQ0FBQTtBQUNELE1BQU0saUJBQWlCLEdBQW1CO0lBQ3pDLEVBQUUsTUFBTSxF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