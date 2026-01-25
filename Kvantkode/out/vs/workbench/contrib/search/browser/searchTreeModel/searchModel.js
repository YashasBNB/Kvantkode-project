/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { CancellationTokenSource, } from '../../../../../base/common/cancellation.js';
import * as errors from '../../../../../base/common/errors.js';
import { Emitter, Event, PauseableEmitter } from '../../../../../base/common/event.js';
import { Lazy } from '../../../../../base/common/lazy.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { INotebookSearchService } from '../../common/notebookSearch.js';
import { ReplacePattern } from '../../../../services/search/common/replace.js';
import { ISearchService, } from '../../../../services/search/common/search.js';
import { mergeSearchResultEvents, SearchModelLocation, SEARCH_MODEL_PREFIX, } from './searchTreeCommon.js';
import { SearchResultImpl } from './searchResult.js';
let SearchModelImpl = class SearchModelImpl extends Disposable {
    constructor(searchService, telemetryService, configurationService, instantiationService, logService, notebookSearchService) {
        super();
        this.searchService = searchService;
        this.telemetryService = telemetryService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.notebookSearchService = notebookSearchService;
        this._searchQuery = null;
        this._replaceActive = false;
        this._replaceString = null;
        this._replacePattern = null;
        this._preserveCase = false;
        this._startStreamDelay = Promise.resolve();
        this._resultQueue = [];
        this._aiResultQueue = [];
        this._onReplaceTermChanged = this._register(new Emitter());
        this.onReplaceTermChanged = this._onReplaceTermChanged.event;
        this._onSearchResultChanged = this._register(new PauseableEmitter({
            merge: mergeSearchResultEvents,
        }));
        this.onSearchResultChanged = this._onSearchResultChanged.event;
        this.currentCancelTokenSource = null;
        this.currentAICancelTokenSource = null;
        this.searchCancelledForNewSearch = false;
        this.aiSearchCancelledForNewSearch = false;
        this.location = SearchModelLocation.PANEL;
        this._searchResult = this.instantiationService.createInstance(SearchResultImpl, this);
        this._register(this._searchResult.onChange((e) => this._onSearchResultChanged.fire(e)));
        this._aiTextResultProviderName = new Lazy(async () => this.searchService.getAIName());
        this._id = SEARCH_MODEL_PREFIX + Date.now().toString();
    }
    id() {
        return this._id;
    }
    async getAITextResultProviderName() {
        const result = await this._aiTextResultProviderName.value;
        if (!result) {
            throw Error('Fetching AI name when no provider present.');
        }
        return result;
    }
    isReplaceActive() {
        return this._replaceActive;
    }
    set replaceActive(replaceActive) {
        this._replaceActive = replaceActive;
    }
    get replacePattern() {
        return this._replacePattern;
    }
    get replaceString() {
        return this._replaceString || '';
    }
    set preserveCase(value) {
        this._preserveCase = value;
    }
    get preserveCase() {
        return this._preserveCase;
    }
    set replaceString(replaceString) {
        this._replaceString = replaceString;
        if (this._searchQuery) {
            this._replacePattern = new ReplacePattern(replaceString, this._searchQuery.contentPattern);
        }
        this._onReplaceTermChanged.fire();
    }
    get searchResult() {
        return this._searchResult;
    }
    async addAIResults(onProgress) {
        if (this.hasAIResults) {
            // already has matches or pending matches
            throw Error('AI results already exist');
        }
        else {
            if (this._searchQuery) {
                return this.aiSearch({
                    ...this._searchQuery,
                    contentPattern: this._searchQuery.contentPattern.pattern,
                    type: 3 /* QueryType.aiText */,
                }, onProgress);
            }
            else {
                throw Error('No search query');
            }
        }
    }
    aiSearch(query, onProgress) {
        const searchInstanceID = Date.now().toString();
        const tokenSource = new CancellationTokenSource();
        this.currentAICancelTokenSource = tokenSource;
        const start = Date.now();
        const asyncAIResults = this.searchService
            .aiTextSearch(query, tokenSource.token, async (p) => {
            this.onSearchProgress(p, searchInstanceID, false, true);
            onProgress?.(p);
        })
            .finally(() => {
            tokenSource.dispose(true);
        })
            .then((value) => {
            this.onSearchCompleted(value, Date.now() - start, searchInstanceID, true);
            return value;
        }, (e) => {
            this.onSearchError(e, Date.now() - start, true);
            throw e;
        });
        return asyncAIResults;
    }
    doSearch(query, progressEmitter, searchQuery, searchInstanceID, onProgress, callerToken) {
        const asyncGenerateOnProgress = async (p) => {
            progressEmitter.fire();
            this.onSearchProgress(p, searchInstanceID, false, false);
            onProgress?.(p);
        };
        const syncGenerateOnProgress = (p) => {
            progressEmitter.fire();
            this.onSearchProgress(p, searchInstanceID, true);
            onProgress?.(p);
        };
        const tokenSource = (this.currentCancelTokenSource = new CancellationTokenSource(callerToken));
        const notebookResult = this.notebookSearchService.notebookSearch(query, tokenSource.token, searchInstanceID, asyncGenerateOnProgress);
        const textResult = this.searchService.textSearchSplitSyncAsync(searchQuery, tokenSource.token, asyncGenerateOnProgress, notebookResult.openFilesToScan, notebookResult.allScannedFiles);
        const syncResults = textResult.syncResults.results;
        syncResults.forEach((p) => {
            if (p) {
                syncGenerateOnProgress(p);
            }
        });
        const getAsyncResults = async () => {
            const searchStart = Date.now();
            // resolve async parts of search
            const allClosedEditorResults = await textResult.asyncResults;
            const resolvedNotebookResults = await notebookResult.completeData;
            const searchLength = Date.now() - searchStart;
            const resolvedResult = {
                results: [...allClosedEditorResults.results, ...resolvedNotebookResults.results],
                messages: [...allClosedEditorResults.messages, ...resolvedNotebookResults.messages],
                limitHit: allClosedEditorResults.limitHit || resolvedNotebookResults.limitHit,
                exit: allClosedEditorResults.exit,
                stats: allClosedEditorResults.stats,
            };
            this.logService.trace(`whole search time | ${searchLength}ms`);
            return resolvedResult;
        };
        return {
            asyncResults: getAsyncResults().finally(() => tokenSource.dispose(true)),
            syncResults,
        };
    }
    get hasAIResults() {
        return (!!this.searchResult.getCachedSearchComplete(true) ||
            (!!this.currentAICancelTokenSource &&
                !this.currentAICancelTokenSource.token.isCancellationRequested));
    }
    get hasPlainResults() {
        return (!!this.searchResult.getCachedSearchComplete(false) ||
            (!!this.currentCancelTokenSource &&
                !this.currentCancelTokenSource.token.isCancellationRequested));
    }
    search(query, onProgress, callerToken) {
        this.cancelSearch(true);
        this._searchQuery = query;
        if (!this.searchConfig.searchOnType) {
            this.searchResult.clear();
        }
        const searchInstanceID = Date.now().toString();
        this._searchResult.query = this._searchQuery;
        const progressEmitter = this._register(new Emitter());
        this._replacePattern = new ReplacePattern(this.replaceString, this._searchQuery.contentPattern);
        // In search on type case, delay the streaming of results just a bit, so that we don't flash the only "local results" fast path
        this._startStreamDelay = new Promise((resolve) => setTimeout(resolve, this.searchConfig.searchOnType ? 150 : 0));
        const req = this.doSearch(query, progressEmitter, this._searchQuery, searchInstanceID, onProgress, callerToken);
        const asyncResults = req.asyncResults;
        const syncResults = req.syncResults;
        if (onProgress) {
            syncResults.forEach((p) => {
                if (p) {
                    onProgress(p);
                }
            });
        }
        const start = Date.now();
        let event;
        const progressEmitterPromise = new Promise((resolve) => {
            event = Event.once(progressEmitter.event)(resolve);
            return event;
        });
        Promise.race([asyncResults, progressEmitterPromise]).finally(() => {
            /* __GDPR__
                "searchResultsFirstRender" : {
                    "owner": "roblourens",
                    "duration" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true }
                }
            */
            event?.dispose();
            this.telemetryService.publicLog('searchResultsFirstRender', { duration: Date.now() - start });
        });
        try {
            return {
                asyncResults: asyncResults.then((value) => {
                    this.onSearchCompleted(value, Date.now() - start, searchInstanceID, false);
                    return value;
                }, (e) => {
                    this.onSearchError(e, Date.now() - start, false);
                    throw e;
                }),
                syncResults,
            };
        }
        finally {
            /* __GDPR__
                "searchResultsFinished" : {
                    "owner": "roblourens",
                    "duration" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true }
                }
            */
            this.telemetryService.publicLog('searchResultsFinished', { duration: Date.now() - start });
        }
    }
    onSearchCompleted(completed, duration, searchInstanceID, ai) {
        if (!this._searchQuery) {
            throw new Error('onSearchCompleted must be called after a search is started');
        }
        if (ai) {
            this._searchResult.add(this._aiResultQueue, searchInstanceID, true);
            this._aiResultQueue.length = 0;
        }
        else {
            this._searchResult.add(this._resultQueue, searchInstanceID, false);
            this._resultQueue.length = 0;
        }
        this.searchResult.setCachedSearchComplete(completed, ai);
        const options = Object.assign({}, this._searchQuery.contentPattern);
        delete options.pattern;
        const stats = completed && completed.stats;
        const fileSchemeOnly = this._searchQuery.folderQueries.every((fq) => fq.folder.scheme === Schemas.file);
        const otherSchemeOnly = this._searchQuery.folderQueries.every((fq) => fq.folder.scheme !== Schemas.file);
        const scheme = fileSchemeOnly ? Schemas.file : otherSchemeOnly ? 'other' : 'mixed';
        /* __GDPR__
            "searchResultsShown" : {
                "owner": "roblourens",
                "count" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
                "fileCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
                "options": { "${inline}": [ "${IPatternInfo}" ] },
                "duration": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
                "type" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" },
                "scheme" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" },
                "searchOnTypeEnabled" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
            }
        */
        this.telemetryService.publicLog('searchResultsShown', {
            count: this._searchResult.count(),
            fileCount: this._searchResult.fileCount(),
            options,
            duration,
            type: stats && stats.type,
            scheme,
            searchOnTypeEnabled: this.searchConfig.searchOnType,
        });
        return completed;
    }
    onSearchError(e, duration, ai) {
        if (errors.isCancellationError(e)) {
            this.onSearchCompleted((ai ? this.aiSearchCancelledForNewSearch : this.searchCancelledForNewSearch)
                ? { exit: 1 /* SearchCompletionExitCode.NewSearchStarted */, results: [], messages: [] }
                : undefined, duration, '', ai);
            if (ai) {
                this.aiSearchCancelledForNewSearch = false;
            }
            else {
                this.searchCancelledForNewSearch = false;
            }
        }
    }
    onSearchProgress(p, searchInstanceID, sync = true, ai = false) {
        const targetQueue = ai ? this._aiResultQueue : this._resultQueue;
        if (p.resource) {
            targetQueue.push(p);
            if (sync) {
                if (targetQueue.length) {
                    this._searchResult.add(targetQueue, searchInstanceID, false, true);
                    targetQueue.length = 0;
                }
            }
            else {
                this._startStreamDelay.then(() => {
                    if (targetQueue.length) {
                        this._searchResult.add(targetQueue, searchInstanceID, ai, true);
                        targetQueue.length = 0;
                    }
                });
            }
        }
    }
    get searchConfig() {
        return this.configurationService.getValue('search');
    }
    cancelSearch(cancelledForNewSearch = false) {
        if (this.currentCancelTokenSource) {
            this.searchCancelledForNewSearch = cancelledForNewSearch;
            this.currentCancelTokenSource.cancel();
            return true;
        }
        return false;
    }
    cancelAISearch(cancelledForNewSearch = false) {
        if (this.currentAICancelTokenSource) {
            this.aiSearchCancelledForNewSearch = cancelledForNewSearch;
            this.currentAICancelTokenSource.cancel();
            return true;
        }
        return false;
    }
    clearAiSearchResults() {
        this._aiResultQueue.length = 0;
        // it's not clear all as we are only clearing the AI results
        this._searchResult.aiTextSearchResult.clear(false);
    }
    dispose() {
        this.cancelSearch();
        this.cancelAISearch();
        this.searchResult.dispose();
        super.dispose();
    }
};
SearchModelImpl = __decorate([
    __param(0, ISearchService),
    __param(1, ITelemetryService),
    __param(2, IConfigurationService),
    __param(3, IInstantiationService),
    __param(4, ILogService),
    __param(5, INotebookSearchService)
], SearchModelImpl);
export { SearchModelImpl };
let SearchViewModelWorkbenchService = class SearchViewModelWorkbenchService {
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
        this._searchModel = null;
    }
    get searchModel() {
        if (!this._searchModel) {
            this._searchModel = this.instantiationService.createInstance(SearchModelImpl);
        }
        return this._searchModel;
    }
    set searchModel(searchModel) {
        this._searchModel?.dispose();
        this._searchModel = searchModel;
    }
};
SearchViewModelWorkbenchService = __decorate([
    __param(0, IInstantiationService)
], SearchViewModelWorkbenchService);
export { SearchViewModelWorkbenchService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3NlYXJjaFRyZWVNb2RlbC9zZWFyY2hNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBRU4sdUJBQXVCLEdBQ3ZCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxLQUFLLE1BQU0sTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDOUUsT0FBTyxFQU9OLGNBQWMsR0FLZCxNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFFTix1QkFBdUIsRUFDdkIsbUJBQW1CLEVBR25CLG1CQUFtQixHQUNuQixNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8s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