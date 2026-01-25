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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFNlYXJjaE1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvY29tbW9uL3RleHRTZWFyY2hNYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM3RCxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ2xFLE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsbUJBQW1CLEVBS25CLG9CQUFvQixFQVFwQixlQUFlLEVBRWYsMEJBQTBCLEVBRTFCLG1DQUFtQyxHQUNuQyxNQUFNLGFBQWEsQ0FBQTtBQUNwQixPQUFPLEVBRU4sZ0JBQWdCLEdBT2hCLE1BQU0scUJBQXFCLENBQUE7QUFxQjVCLE1BQU0sT0FBTyxpQkFBaUI7SUFNN0IsWUFDUyxpQkFBb0UsRUFDcEUsU0FBcUIsRUFDckIsV0FBcUM7UUFGckMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtRDtRQUNwRSxjQUFTLEdBQVQsU0FBUyxDQUFZO1FBQ3JCLGdCQUFXLEdBQVgsV0FBVyxDQUEwQjtRQVJ0QyxjQUFTLEdBQXNDLElBQUksQ0FBQTtRQUVuRCxlQUFVLEdB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