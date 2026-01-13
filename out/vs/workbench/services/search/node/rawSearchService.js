/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../../../base/common/arrays.js';
import { createCancelablePromise } from '../../../../base/common/async.js';
import { canceled } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { compareItemsByFuzzyScore, prepareQuery, } from '../../../../base/common/fuzzyScorer.js';
import { revive } from '../../../../base/common/marshalling.js';
import { basename, dirname, join, sep } from '../../../../base/common/path.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { URI } from '../../../../base/common/uri.js';
import { ByteSize } from '../../../../platform/files/common/files.js';
import { DEFAULT_MAX_SEARCH_RESULTS, isFilePatternMatch, } from '../common/search.js';
import { Engine as FileSearchEngine } from './fileSearch.js';
import { TextSearchEngineAdapter } from './textSearchAdapter.js';
export class SearchService {
    static { this.BATCH_SIZE = 512; }
    constructor(processType = 'searchProcess', getNumThreads) {
        this.processType = processType;
        this.getNumThreads = getNumThreads;
        this.caches = Object.create(null);
    }
    fileSearch(config) {
        let promise;
        const query = reviveQuery(config);
        const emitter = new Emitter({
            onDidAddFirstListener: () => {
                promise = createCancelablePromise(async (token) => {
                    const numThreads = await this.getNumThreads?.();
                    return this.doFileSearchWithEngine(FileSearchEngine, query, (p) => emitter.fire(p), token, SearchService.BATCH_SIZE, numThreads);
                });
                promise.then((c) => emitter.fire(c), (err) => emitter.fire({ type: 'error', error: { message: err.message, stack: err.stack } }));
            },
            onDidRemoveLastListener: () => {
                promise.cancel();
            },
        });
        return emitter.event;
    }
    textSearch(rawQuery) {
        let promise;
        const query = reviveQuery(rawQuery);
        const emitter = new Emitter({
            onDidAddFirstListener: () => {
                promise = createCancelablePromise((token) => {
                    return this.ripgrepTextSearch(query, (p) => emitter.fire(p), token);
                });
                promise.then((c) => emitter.fire(c), (err) => emitter.fire({ type: 'error', error: { message: err.message, stack: err.stack } }));
            },
            onDidRemoveLastListener: () => {
                promise.cancel();
            },
        });
        return emitter.event;
    }
    async ripgrepTextSearch(config, progressCallback, token) {
        config.maxFileSize = this.getPlatformFileLimits().maxFileSize;
        const numThreads = await this.getNumThreads?.();
        const engine = new TextSearchEngineAdapter(config, numThreads);
        return engine.search(token, progressCallback, progressCallback);
    }
    getPlatformFileLimits() {
        return {
            maxFileSize: 16 * ByteSize.GB,
        };
    }
    doFileSearch(config, numThreads, progressCallback, token) {
        return this.doFileSearchWithEngine(FileSearchEngine, config, progressCallback, token, SearchService.BATCH_SIZE, numThreads);
    }
    doFileSearchWithEngine(EngineClass, config, progressCallback, token, batchSize = SearchService.BATCH_SIZE, threads) {
        let resultCount = 0;
        const fileProgressCallback = (progress) => {
            if (Array.isArray(progress)) {
                resultCount += progress.length;
                progressCallback(progress.map((m) => this.rawMatchToSearchItem(m)));
            }
            else if (progress.relativePath) {
                resultCount++;
                progressCallback(this.rawMatchToSearchItem(progress));
            }
            else {
                progressCallback(progress);
            }
        };
        if (config.sortByScore) {
            let sortedSearch = this.trySortedSearchFromCache(config, fileProgressCallback, token);
            if (!sortedSearch) {
                const walkerConfig = config.maxResults
                    ? Object.assign({}, config, { maxResults: null })
                    : config;
                const engine = new EngineClass(walkerConfig, threads);
                sortedSearch = this.doSortedSearch(engine, config, progressCallback, fileProgressCallback, token);
            }
            return new Promise((c, e) => {
                sortedSearch.then(([result, rawMatches]) => {
                    const serializedMatches = rawMatches.map((rawMatch) => this.rawMatchToSearchItem(rawMatch));
                    this.sendProgress(serializedMatches, progressCallback, batchSize);
                    c(result);
                }, e);
            });
        }
        const engine = new EngineClass(config, threads);
        return this.doSearch(engine, fileProgressCallback, batchSize, token).then((complete) => {
            return {
                limitHit: complete.limitHit,
                type: 'success',
                stats: {
                    detailStats: complete.stats,
                    type: this.processType,
                    fromCache: false,
                    resultCount,
                    sortingTime: undefined,
                },
                messages: [],
            };
        });
    }
    rawMatchToSearchItem(match) {
        return { path: match.base ? join(match.base, match.relativePath) : match.relativePath };
    }
    doSortedSearch(engine, config, progressCallback, fileProgressCallback, token) {
        const emitter = new Emitter();
        let allResultsPromise = createCancelablePromise((token) => {
            let results = [];
            const innerProgressCallback = (progress) => {
                if (Array.isArray(progress)) {
                    results = progress;
                }
                else {
                    fileProgressCallback(progress);
                    emitter.fire(progress);
                }
            };
            return this.doSearch(engine, innerProgressCallback, -1, token).then((result) => {
                return [result, results];
            });
        });
        let cache;
        if (config.cacheKey) {
            cache = this.getOrCreateCache(config.cacheKey);
            const cacheRow = {
                promise: allResultsPromise,
                event: emitter.event,
                resolved: false,
            };
            cache.resultsToSearchCache[config.filePattern || ''] = cacheRow;
            allResultsPromise.then(() => {
                cacheRow.resolved = true;
            }, (err) => {
                delete cache.resultsToSearchCache[config.filePattern || ''];
            });
            allResultsPromise = this.preventCancellation(allResultsPromise);
        }
        return allResultsPromise.then(([result, results]) => {
            const scorerCache = cache ? cache.scorerCache : Object.create(null);
            const sortSW = (typeof config.maxResults !== 'number' || config.maxResults > 0) && StopWatch.create(false);
            return this.sortResults(config, results, scorerCache, token).then((sortedResults) => {
                // sortingTime: -1 indicates a "sorted" search that was not sorted, i.e. populating the cache when quickaccess is opened.
                // Contrasting with findFiles which is not sorted and will have sortingTime: undefined
                const sortingTime = sortSW ? sortSW.elapsed() : -1;
                return [
                    {
                        type: 'success',
                        stats: {
                            detailStats: result.stats,
                            sortingTime,
                            fromCache: false,
                            type: this.processType,
                            resultCount: sortedResults.length,
                        },
                        messages: result.messages,
                        limitHit: result.limitHit ||
                            (typeof config.maxResults === 'number' && results.length > config.maxResults),
                    },
                    sortedResults,
                ];
            });
        });
    }
    getOrCreateCache(cacheKey) {
        const existing = this.caches[cacheKey];
        if (existing) {
            return existing;
        }
        return (this.caches[cacheKey] = new Cache());
    }
    trySortedSearchFromCache(config, progressCallback, token) {
        const cache = config.cacheKey && this.caches[config.cacheKey];
        if (!cache) {
            return undefined;
        }
        const cached = this.getResultsFromCache(cache, config.filePattern || '', progressCallback, token);
        if (cached) {
            return cached.then(([result, results, cacheStats]) => {
                const sortSW = StopWatch.create(false);
                return this.sortResults(config, results, cache.scorerCache, token).then((sortedResults) => {
                    const sortingTime = sortSW.elapsed();
                    const stats = {
                        fromCache: true,
                        detailStats: cacheStats,
                        type: this.processType,
                        resultCount: results.length,
                        sortingTime,
                    };
                    return [
                        {
                            type: 'success',
                            limitHit: result.limitHit ||
                                (typeof config.maxResults === 'number' && results.length > config.maxResults),
                            stats,
                            messages: [],
                        },
                        sortedResults,
                    ];
                });
            });
        }
        return undefined;
    }
    sortResults(config, results, scorerCache, token) {
        // we use the same compare function that is used later when showing the results using fuzzy scoring
        // this is very important because we are also limiting the number of results by config.maxResults
        // and as such we want the top items to be included in this result set if the number of items
        // exceeds config.maxResults.
        const query = prepareQuery(config.filePattern || '');
        const compare = (matchA, matchB) => compareItemsByFuzzyScore(matchA, matchB, query, true, FileMatchItemAccessor, scorerCache);
        const maxResults = typeof config.maxResults === 'number' ? config.maxResults : DEFAULT_MAX_SEARCH_RESULTS;
        return arrays.topAsync(results, compare, maxResults, 10000, token);
    }
    sendProgress(results, progressCb, batchSize) {
        if (batchSize && batchSize > 0) {
            for (let i = 0; i < results.length; i += batchSize) {
                progressCb(results.slice(i, i + batchSize));
            }
        }
        else {
            progressCb(results);
        }
    }
    getResultsFromCache(cache, searchValue, progressCallback, token) {
        const cacheLookupSW = StopWatch.create(false);
        // Find cache entries by prefix of search value
        const hasPathSep = searchValue.indexOf(sep) >= 0;
        let cachedRow;
        for (const previousSearch in cache.resultsToSearchCache) {
            // If we narrow down, we might be able to reuse the cached results
            if (searchValue.startsWith(previousSearch)) {
                if (hasPathSep && previousSearch.indexOf(sep) < 0 && previousSearch !== '') {
                    continue; // since a path character widens the search for potential more matches, require it in previous search too
                }
                const row = cache.resultsToSearchCache[previousSearch];
                cachedRow = {
                    promise: this.preventCancellation(row.promise),
                    event: row.event,
                    resolved: row.resolved,
                };
                break;
            }
        }
        if (!cachedRow) {
            return null;
        }
        const cacheLookupTime = cacheLookupSW.elapsed();
        const cacheFilterSW = StopWatch.create(false);
        const listener = cachedRow.event(progressCallback);
        if (token) {
            token.onCancellationRequested(() => {
                listener.dispose();
            });
        }
        return cachedRow.promise.then(([complete, cachedEntries]) => {
            if (token && token.isCancellationRequested) {
                throw canceled();
            }
            // Pattern match on results
            const results = [];
            const normalizedSearchValueLowercase = prepareQuery(searchValue).normalizedLowercase;
            for (const entry of cachedEntries) {
                // Check if this entry is a match for the search value
                if (!isFilePatternMatch(entry, normalizedSearchValueLowercase)) {
                    continue;
                }
                results.push(entry);
            }
            return [
                complete,
                results,
                {
                    cacheWasResolved: cachedRow.resolved,
                    cacheLookupTime,
                    cacheFilterTime: cacheFilterSW.elapsed(),
                    cacheEntryCount: cachedEntries.length,
                },
            ];
        });
    }
    doSearch(engine, progressCallback, batchSize, token) {
        return new Promise((c, e) => {
            let batch = [];
            token?.onCancellationRequested(() => engine.cancel());
            engine.search((match) => {
                if (match) {
                    if (batchSize) {
                        batch.push(match);
                        if (batchSize > 0 && batch.length >= batchSize) {
                            progressCallback(batch);
                            batch = [];
                        }
                    }
                    else {
                        progressCallback(match);
                    }
                }
            }, (progress) => {
                progressCallback(progress);
            }, (error, complete) => {
                if (batch.length) {
                    progressCallback(batch);
                }
                if (error) {
                    progressCallback({ message: 'Search finished. Error: ' + error.message });
                    e(error);
                }
                else {
                    progressCallback({
                        message: 'Search finished. Stats: ' + JSON.stringify(complete.stats),
                    });
                    c(complete);
                }
            });
        });
    }
    clearCache(cacheKey) {
        delete this.caches[cacheKey];
        return Promise.resolve(undefined);
    }
    /**
     * Return a CancelablePromise which is not actually cancelable
     * TODO@rob - Is this really needed?
     */
    preventCancellation(promise) {
        return new (class {
            get [Symbol.toStringTag]() {
                return this.toString();
            }
            cancel() {
                // Do nothing
            }
            then(resolve, reject) {
                return promise.then(resolve, reject);
            }
            catch(reject) {
                return this.then(undefined, reject);
            }
            finally(onFinally) {
                return promise.finally(onFinally);
            }
        })();
    }
}
class Cache {
    constructor() {
        this.resultsToSearchCache = Object.create(null);
        this.scorerCache = Object.create(null);
    }
}
const FileMatchItemAccessor = new (class {
    getItemLabel(match) {
        return basename(match.relativePath); // e.g. myFile.txt
    }
    getItemDescription(match) {
        return dirname(match.relativePath); // e.g. some/path/to/file
    }
    getItemPath(match) {
        return match.relativePath; // e.g. some/path/to/file/myFile.txt
    }
})();
function reviveQuery(rawQuery) {
    return {
        ...rawQuery, // TODO
        ...{
            folderQueries: rawQuery.folderQueries && rawQuery.folderQueries.map(reviveFolderQuery),
            extraFileResources: rawQuery.extraFileResources &&
                rawQuery.extraFileResources.map((components) => URI.revive(components)),
        },
    };
}
function reviveFolderQuery(rawFolderQuery) {
    return revive(rawFolderQuery);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF3U2VhcmNoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC9ub2RlL3Jhd1NlYXJjaFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFN0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sd0JBQXdCLEVBR3hCLFlBQVksR0FDWixNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3JFLE9BQU8sRUFDTiwwQkFBMEIsRUFrQjFCLGtCQUFrQixHQUVsQixNQUFNLHFCQUFxQixDQUFBO0FBQzVCLE9BQU8sRUFBRSxNQUFNLElBQUksZ0JBQWdCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUtoRSxNQUFNLE9BQU8sYUFBYTthQUNELGVBQVUsR0FBRyxH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