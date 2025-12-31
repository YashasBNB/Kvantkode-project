/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isThenable } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Schemas } from '../../../../base/common/network.js';
import * as path from '../../../../base/common/path.js';
import * as resources from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { FolderQuerySearchTree } from './folderQuerySearchTree.js';
import { DEFAULT_MAX_SEARCH_RESULTS, hasSiblingPromiseFn, excludeToGlobPattern, QueryGlobTester, resolvePatternsForProvider, DEFAULT_TEXT_SEARCH_PREVIEW_OPTIONS, } from './search.js';
import { TextSearchMatch2, } from './searchExtTypes.js';
export class TextSearchManager {
    constructor(queryProviderPair, fileUtils, processType) {
        this.queryProviderPair = queryProviderPair;
        this.fileUtils = fileUtils;
        this.processType = processType;
        this.collector = null;
        this.isLimitHit = false;
        this.resultCount = 0;
    }
    get query() {
        return this.queryProviderPair.query;
    }
    search(onProgress, token) {
        const folderQueries = this.query.folderQueries || [];
        const tokenSource = new CancellationTokenSource(token);
        return new Promise((resolve, reject) => {
            this.collector = new TextSearchResultsCollector(onProgress);
            let isCanceled = false;
            const onResult = (result, folderIdx) => {
                if (isCanceled) {
                    return;
                }
                if (!this.isLimitHit) {
                    const resultSize = this.resultSize(result);
                    if (result instanceof TextSearchMatch2 &&
                        typeof this.query.maxResults === 'number' &&
                        this.resultCount + resultSize > this.query.maxResults) {
                        this.isLimitHit = true;
                        isCanceled = true;
                        tokenSource.cancel();
                        result = this.trimResultToSize(result, this.query.maxResults - this.resultCount);
                    }
                    const newResultSize = this.resultSize(result);
                    this.resultCount += newResultSize;
                    const a = result instanceof TextSearchMatch2;
                    if (newResultSize > 0 || !a) {
                        this.collector.add(result, folderIdx);
                    }
                }
            };
            // For each root folder
            this.doSearch(folderQueries, onResult, tokenSource.token).then((result) => {
                tokenSource.dispose();
                this.collector.flush();
                resolve({
                    limitHit: this.isLimitHit || result?.limitHit,
                    messages: this.getMessagesFromResults(result),
                    stats: {
                        type: this.processType,
                    },
                });
            }, (err) => {
                tokenSource.dispose();
                const errMsg = toErrorMessage(err);
                reject(new Error(errMsg));
            });
        });
    }
    getMessagesFromResults(result) {
        if (!result?.message) {
            return [];
        }
        if (Array.isArray(result.message)) {
            return result.message;
        }
        return [result.message];
    }
    resultSize(result) {
        if (result instanceof TextSearchMatch2) {
            return Array.isArray(result.ranges) ? result.ranges.length : 1;
        }
        else {
            // #104400 context lines shoudn't count towards result count
            return 0;
        }
    }
    trimResultToSize(result, size) {
        return new TextSearchMatch2(result.uri, result.ranges.slice(0, size), result.previewText);
    }
    async doSearch(folderQueries, onResult, token) {
        const folderMappings = new FolderQuerySearchTree(folderQueries, (fq, i) => {
            const queryTester = new QueryGlobTester(this.query, fq);
            return { queryTester, folder: fq.folder, folderIdx: i };
        }, () => true);
        const testingPs = [];
        const progress = {
            report: (result) => {
                if (result.uri === undefined) {
                    throw Error('Text search result URI is undefined. Please check provider implementation.');
                }
                const folderQuery = folderMappings.findQueryFragmentAwareSubstr(result.uri);
                const hasSibling = folderQuery.folder.scheme === Schemas.file
                    ? hasSiblingPromiseFn(() => {
                        return this.fileUtils.readdir(resources.dirname(result.uri));
                    })
                    : undefined;
                const relativePath = resources.relativePath(folderQuery.folder, result.uri);
                if (relativePath) {
                    // This method is only async when the exclude contains sibling clauses
                    const included = folderQuery.queryTester.includedInQuery(relativePath, path.basename(relativePath), hasSibling);
                    if (isThenable(included)) {
                        testingPs.push(included.then((isIncluded) => {
                            if (isIncluded) {
                                onResult(result, folderQuery.folderIdx);
                            }
                        }));
                    }
                    else if (included) {
                        onResult(result, folderQuery.folderIdx);
                    }
                }
            },
        };
        const folderOptions = folderQueries.map((fq) => this.getSearchOptionsForFolder(fq));
        const searchOptions = {
            folderOptions,
            maxFileSize: this.query.maxFileSize,
            maxResults: this.query.maxResults ?? DEFAULT_MAX_SEARCH_RESULTS,
            previewOptions: this.query.previewOptions ?? DEFAULT_TEXT_SEARCH_PREVIEW_OPTIONS,
            surroundingContext: this.query.surroundingContext ?? 0,
        };
        if ('usePCRE2' in this.query) {
            ;
            searchOptions.usePCRE2 = this.query.usePCRE2;
        }
        let result;
        if (this.queryProviderPair.query.type === 3 /* QueryType.aiText */) {
            result = await this.queryProviderPair.provider.provideAITextSearchResults(this.queryProviderPair.query.contentPattern, searchOptions, progress, token);
        }
        else {
            result = await this.queryProviderPair.provider.provideTextSearchResults(patternInfoToQuery(this.queryProviderPair.query.contentPattern), searchOptions, progress, token);
        }
        if (testingPs.length) {
            await Promise.all(testingPs);
        }
        return result;
    }
    getSearchOptionsForFolder(fq) {
        const includes = resolvePatternsForProvider(this.query.includePattern, fq.includePattern);
        let excludePattern = fq.excludePattern?.map((e) => ({
            folder: e.folder,
            patterns: resolvePatternsForProvider(this.query.excludePattern, e.pattern),
        }));
        if (!excludePattern || excludePattern.length === 0) {
            excludePattern = [
                {
                    folder: undefined,
                    patterns: resolvePatternsForProvider(this.query.excludePattern, undefined),
                },
            ];
        }
        const excludes = excludeToGlobPattern(excludePattern);
        const options = {
            folder: URI.from(fq.folder),
            excludes,
            includes,
            useIgnoreFiles: {
                local: !fq.disregardIgnoreFiles,
                parent: !fq.disregardParentIgnoreFiles,
                global: !fq.disregardGlobalIgnoreFiles,
            },
            followSymlinks: !fq.ignoreSymlinks,
            encoding: (fq.fileEncoding && this.fileUtils.toCanonicalName(fq.fileEncoding)) ?? '',
        };
        return options;
    }
}
function patternInfoToQuery(patternInfo) {
    return {
        isCaseSensitive: patternInfo.isCaseSensitive || false,
        isRegExp: patternInfo.isRegExp || false,
        isWordMatch: patternInfo.isWordMatch || false,
        isMultiline: patternInfo.isMultiline || false,
        pattern: patternInfo.pattern,
    };
}
export class TextSearchResultsCollector {
    constructor(_onResult) {
        this._onResult = _onResult;
        this._currentFolderIdx = -1;
        this._currentFileMatch = null;
        this._batchedCollector = new BatchedCollector(512, (items) => this.sendItems(items));
    }
    add(data, folderIdx) {
        // Collects TextSearchResults into IInternalFileMatches and collates using BatchedCollector.
        // This is efficient for ripgrep which sends results back one file at a time. It wouldn't be efficient for other search
        // providers that send results in random order. We could do this step afterwards instead.
        if (this._currentFileMatch &&
            (this._currentFolderIdx !== folderIdx || !resources.isEqual(this._currentUri, data.uri))) {
            this.pushToCollector();
            this._currentFileMatch = null;
        }
        if (!this._currentFileMatch) {
            this._currentFolderIdx = folderIdx;
            this._currentFileMatch = {
                resource: data.uri,
                results: [],
            };
        }
        this._currentFileMatch.results.push(extensionResultToFrontendResult(data));
    }
    pushToCollector() {
        const size = this._currentFileMatch && this._currentFileMatch.results
            ? this._currentFileMatch.results.length
            : 0;
        this._batchedCollector.addItem(this._currentFileMatch, size);
    }
    flush() {
        this.pushToCollector();
        this._batchedCollector.flush();
    }
    sendItems(items) {
        this._onResult(items);
    }
}
function extensionResultToFrontendResult(data) {
    // Warning: result from RipgrepTextSearchEH has fake Range. Don't depend on any other props beyond these...
    if (data instanceof TextSearchMatch2) {
        return {
            previewText: data.previewText,
            rangeLocations: data.ranges.map((r) => ({
                preview: {
                    startLineNumber: r.previewRange.start.line,
                    startColumn: r.previewRange.start.character,
                    endLineNumber: r.previewRange.end.line,
                    endColumn: r.previewRange.end.character,
                },
                source: {
                    startLineNumber: r.sourceRange.start.line,
                    startColumn: r.sourceRange.start.character,
                    endLineNumber: r.sourceRange.end.line,
                    endColumn: r.sourceRange.end.character,
                },
            })),
        };
    }
    else {
        return {
            text: data.text,
            lineNumber: data.lineNumber,
        };
    }
}
/**
 * Collects items that have a size - before the cumulative size of collected items reaches START_BATCH_AFTER_COUNT, the callback is called for every
 * set of items collected.
 * But after that point, the callback is called with batches of maxBatchSize.
 * If the batch isn't filled within some time, the callback is also called.
 */
export class BatchedCollector {
    static { this.TIMEOUT = 4000; }
    // After START_BATCH_AFTER_COUNT items have been collected, stop flushing on timeout
    static { this.START_BATCH_AFTER_COUNT = 50; }
    constructor(maxBatchSize, cb) {
        this.maxBatchSize = maxBatchSize;
        this.cb = cb;
        this.totalNumberCompleted = 0;
        this.batch = [];
        this.batchSize = 0;
    }
    addItem(item, size) {
        if (!item) {
            return;
        }
        this.addItemToBatch(item, size);
    }
    addItems(items, size) {
        if (!items) {
            return;
        }
        this.addItemsToBatch(items, size);
    }
    addItemToBatch(item, size) {
        this.batch.push(item);
        this.batchSize += size;
        this.onUpdate();
    }
    addItemsToBatch(item, size) {
        this.batch = this.batch.concat(item);
        this.batchSize += size;
        this.onUpdate();
    }
    onUpdate() {
        if (this.totalNumberCompleted < BatchedCollector.START_BATCH_AFTER_COUNT) {
            // Flush because we aren't batching yet
            this.flush();
        }
        else if (this.batchSize >= this.maxBatchSize) {
            // Flush because the batch is full
            this.flush();
        }
        else if (!this.timeoutHandle) {
            // No timeout running, start a timeout to flush
            this.timeoutHandle = setTimeout(() => {
                this.flush();
            }, BatchedCollector.TIMEOUT);
        }
    }
    flush() {
        if (this.batchSize) {
            this.totalNumberCompleted += this.batchSize;
            this.cb(this.batch);
            this.batch = [];
            this.batchSize = 0;
            if (this.timeoutHandle) {
                clearTimeout(this.timeoutHandle);
                this.timeoutHandle = 0;
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFNlYXJjaE1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL2NvbW1vbi90ZXh0U2VhcmNoTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDN0QsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNsRSxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLG1CQUFtQixFQUtuQixvQkFBb0IsRUFRcEIsZUFBZSxFQUVmLDBCQUEwQixFQUUxQixtQ0FBbUMsR0FDbkMsTUFBTSxhQUFhLENBQUE7QUFDcEIsT0FBTyxFQUVOLGdCQUFnQixHQU9oQixNQUFNLHFCQUFxQixDQUFBO0FBcUI1QixNQUFNLE9BQU8saUJBQWlCO0lBTTdCLFlBQ1MsaUJBQW9FLEVBQ3BFLFNBQXFCLEVBQ3JCLFdBQXFDO1FBRnJDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUQ7UUFDcEUsY0FBUyxHQUFULFNBQVMsQ0FBWTtRQUNyQixnQkFBVyxHQUFYLFdBQVcsQ0FBMEI7UUFSdEMsY0FBUyxHQUFzQyxJQUFJLENBQUE7UUFFbkQsZUFBVSxHQUFHLEtB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