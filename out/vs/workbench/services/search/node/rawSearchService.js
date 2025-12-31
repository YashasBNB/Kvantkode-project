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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF3U2VhcmNoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvbm9kZS9yYXdTZWFyY2hTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTdGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUNOLHdCQUF3QixFQUd4QixZQUFZLEdBQ1osTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRSxPQUFPLEVBQ04sMEJBQTBCLEVBa0IxQixrQkFBa0IsR0FFbEIsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLEVBQUUsTUFBTSxJQUFJLGdCQUFnQixFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDNUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFLaEUsTUFBTSxPQUFPLGFBQWE7YUFDRCxlQUFVLEdBQUcsR0FBRyxBQUFOLENBQU07SUFJeEMsWUFD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