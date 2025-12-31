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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9zZWFyY2hUcmVlTW9kZWwvc2VhcmNoTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUVOLHVCQUF1QixHQUN2QixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sS0FBSyxNQUFNLE1BQU0sc0NBQXNDLENBQUE7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN0RixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDdkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzlFLE9BQU8sRUFPTixjQUFjLEdBS2QsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLEVBRU4sdUJBQXVCLEVBQ3ZCLG1CQUFtQixFQUduQixtQkFBbUIsR0FDbkIsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUc3QyxJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFnQixTQUFRLFVBQVU7SUE4QjlDLFlBQ2lCLGFBQThDLEVBQzNDLGdCQUFvRCxFQUNoRCxvQkFBNEQsRUFDNUQsb0JBQTRELEVBQ3RFLFVBQXdDLEVBQzdCLHFCQUE4RDtRQUV0RixLQUFLLEVBQUUsQ0FBQTtRQVAwQixrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDMUIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUMvQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzNDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDckQsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUNaLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBd0I7UUFsQy9FLGlCQUFZLEdBQXNCLElBQUksQ0FBQTtRQUN0QyxtQkFBYyxHQUFZLEtBQUssQ0FBQTtRQUMvQixtQkFBYyxHQUFrQixJQUFJLENBQUE7UUFDcEMsb0JBQWUsR0FBMEIsSUFBSSxDQUFBO1FBQzdDLGtCQUFhLEdBQVksS0FBSyxDQUFBO1FBQzlCLHNCQUFpQixHQUFrQixPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDM0MsaUJBQVksR0FBaUIsRUFBRSxDQUFBO1FBQy9CLG1CQUFjLEdBQWlCLEVBQUUsQ0FBQTtRQUVqQywwQkFBcUIsR0FBa0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDbEYseUJBQW9CLEdBQWdCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUE7UUFFNUQsMkJBQXNCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDdkQsSUFBSSxnQkFBZ0IsQ0FBZTtZQUNsQyxLQUFLLEVBQUUsdUJBQXVCO1NBQzlCLENBQUMsQ0FDRixDQUFBO1FBQ1EsMEJBQXFCLEdBQXdCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUE7UUFFL0UsNkJBQXdCLEdBQW1DLElBQUksQ0FBQTtRQUMvRCwrQkFBMEIsR0FBbUMsSUFBSSxDQUFBO1FBQ2pFLGdDQUEyQixHQUFZLEtBQUssQ0FBQTtRQUM1QyxrQ0FBNkIsR0FBWSxLQUFLLENBQUE7UUFDL0MsYUFBUSxHQUF3QixtQkFBbUIsQ0FBQyxLQUFLLENBQUE7UUFjL0QsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3JGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXZGLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQTtRQUNyRixJQUFJLENBQUMsR0FBRyxHQUFHLG1CQUFtQixHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUN2RCxDQUFDO0lBRUQsRUFBRTtRQUNELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQTtJQUNoQixDQUFDO0lBRUQsS0FBSyxDQUFDLDJCQUEyQjtRQUNoQyxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUE7UUFDekQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsTUFBTSxLQUFLLENBQUMsNENBQTRDLENBQUMsQ0FBQTtRQUMxRCxDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRUQsZUFBZTtRQUNkLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQTtJQUMzQixDQUFDO0lBRUQsSUFBSSxhQUFhLENBQUMsYUFBc0I7UUFDdkMsSUFBSSxDQUFDLGNBQWMsR0FBRyxhQUFhLENBQUE7SUFDcEMsQ0FBQztJQUVELElBQUksY0FBYztRQUNqQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUE7SUFDNUIsQ0FBQztJQUVELElBQUksYUFBYTtRQUNoQixPQUFPLElBQUksQ0FBQyxjQUFjLElBQUksRUFBRSxDQUFBO0lBQ2pDLENBQUM7SUFFRCxJQUFJLFlBQVksQ0FBQyxLQUFjO1FBQzlCLElBQUksQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFBO0lBQzNCLENBQUM7SUFFRCxJQUFJLFlBQVk7UUFDZixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUE7SUFDMUIsQ0FBQztJQUVELElBQUksYUFBYSxDQUFDLGFBQXFCO1FBQ3RDLElBQUksQ0FBQyxjQUFjLEdBQUcsYUFBYSxDQUFBO1FBQ25DLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxjQUFjLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDM0YsQ0FBQztRQUNELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFBO0lBQzFCLENBQUM7SUFFRCxLQUFLLENBQUMsWUFBWSxDQUFDLFVBQWtEO1FBQ3BFLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3ZCLHlDQUF5QztZQUN6QyxNQUFNLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxDQUFBO1FBQ3hDLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3ZCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FDbkI7b0JBQ0MsR0FBRyxJQUFJLENBQUMsWUFBWTtvQkFDcEIsY0FBYyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLE9BQU87b0JBQ3hELElBQUksMEJBQWtCO2lCQUN0QixFQUNELFVBQVUsQ0FDVixDQUFBO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7WUFDL0IsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsUUFBUSxDQUNQLEtBQW1CLEVBQ25CLFVBQWtEO1FBRWxELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQzlDLE1BQU0sV0FBVyxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQTtRQUNqRCxJQUFJLENBQUMsMEJBQTBCLEdBQUcsV0FBVyxDQUFBO1FBQzdDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUN4QixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsYUFBYTthQUN2QyxZQUFZLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQXNCLEVBQUUsRUFBRTtZQUN4RSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN2RCxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNoQixDQUFDLENBQUM7YUFDRCxPQUFPLENBQUMsR0FBRyxFQUFFO1lBQ2IsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMxQixDQUFDLENBQUM7YUFDRCxJQUFJLENBQ0osQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNULElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN6RSxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUMsRUFDRCxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ0wsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUMvQyxNQUFNLENBQUMsQ0FBQTtRQUNSLENBQUMsQ0FDRCxDQUFBO1FBQ0YsT0FBTyxjQUFjLENBQUE7SUFDdEIsQ0FBQztJQUVPLFFBQVEsQ0FDZixLQUFpQixFQUNqQixlQUE4QixFQUM5QixXQUF1QixFQUN2QixnQkFBd0IsRUFDeEIsVUFBa0QsRUFDbEQsV0FBK0I7UUFLL0IsTUFBTSx1QkFBdUIsR0FBRyxLQUFLLEVBQUUsQ0FBc0IsRUFBRSxFQUFFO1lBQ2hFLGVBQWUsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUN0QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN4RCxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNoQixDQUFDLENBQUE7UUFFRCxNQUFNLHNCQUFzQixHQUFHLENBQUMsQ0FBc0IsRUFBRSxFQUFFO1lBQ3pELGVBQWUsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUN0QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ2hELFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2hCLENBQUMsQ0FBQTtRQUNELE1BQU0sV0FBVyxHQUFHLENBQUMsSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksdUJBQXVCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQTtRQUU5RixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUMvRCxLQUFLLEVBQ0wsV0FBVyxDQUFDLEtBQUssRUFDakIsZ0JBQWdCLEVBQ2hCLHVCQUF1QixDQUN2QixDQUFBO1FBQ0QsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FDN0QsV0FBVyxFQUNYLFdBQVcsQ0FBQyxLQUFLLEVBQ2pCLHVCQUF1QixFQUN2QixjQUFjLENBQUMsZUFBZSxFQUM5QixjQUFjLENBQUMsZUFBZSxDQUM5QixDQUFBO1FBRUQsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUE7UUFDbEQsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3pCLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ1Asc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDMUIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsTUFBTSxlQUFlLEdBQUcsS0FBSyxJQUE4QixFQUFFO1lBQzVELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtZQUU5QixnQ0FBZ0M7WUFDaEMsTUFBTSxzQkFBc0IsR0FBRyxNQUFNLFVBQVUsQ0FBQyxZQUFZLENBQUE7WUFDNUQsTUFBTSx1QkFBdUIsR0FBRyxNQUFNLGNBQWMsQ0FBQyxZQUFZLENBQUE7WUFDakUsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLFdBQVcsQ0FBQTtZQUM3QyxNQUFNLGNBQWMsR0FBb0I7Z0JBQ3ZDLE9BQU8sRUFBRSxDQUFDLEdBQUcsc0JBQXNCLENBQUMsT0FBTyxFQUFFLEdBQUcsdUJBQXVCLENBQUMsT0FBTyxDQUFDO2dCQUNoRixRQUFRLEVBQUUsQ0FBQyxHQUFHLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxHQUFHLHVCQUF1QixDQUFDLFFBQVEsQ0FBQztnQkFDbkYsUUFBUSxFQUFFLHNCQUFzQixDQUFDLFFBQVEsSUFBSSx1QkFBdUIsQ0FBQyxRQUFRO2dCQUM3RSxJQUFJLEVBQUUsc0JBQXNCLENBQUMsSUFBSTtnQkFDakMsS0FBSyxFQUFFLHNCQUFzQixDQUFDLEtBQUs7YUFDbkMsQ0FBQTtZQUNELElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLHVCQUF1QixZQUFZLElBQUksQ0FBQyxDQUFBO1lBQzlELE9BQU8sY0FBYyxDQUFBO1FBQ3RCLENBQUMsQ0FBQTtRQUNELE9BQU87WUFDTixZQUFZLEVBQUUsZUFBZSxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEUsV0FBVztTQUNYLENBQUE7SUFDRixDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxDQUNOLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQztZQUNqRCxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsMEJBQTBCO2dCQUNqQyxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FDaEUsQ0FBQTtJQUNGLENBQUM7SUFFRCxJQUFJLGVBQWU7UUFDbEIsT0FBTyxDQUNOLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQztZQUNsRCxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsd0JBQXdCO2dCQUMvQixDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FDOUQsQ0FBQTtJQUNGLENBQUM7SUFFRCxNQUFNLENBQ0wsS0FBaUIsRUFDakIsVUFBa0QsRUFDbEQsV0FBK0I7UUFLL0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUV2QixJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQTtRQUN6QixJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQzFCLENBQUM7UUFDRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUU5QyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFBO1FBRTVDLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQzNELElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBRS9GLCtIQUErSDtRQUMvSCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUNoRCxVQUFVLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUM3RCxDQUFBO1FBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FDeEIsS0FBSyxFQUNMLGVBQWUsRUFDZixJQUFJLENBQUMsWUFBWSxFQUNqQixnQkFBZ0IsRUFDaEIsVUFBVSxFQUNWLFdBQVcsQ0FDWCxDQUFBO1FBQ0QsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLFlBQVksQ0FBQTtRQUNyQyxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFBO1FBRW5DLElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUN6QixJQUFJLENBQUMsRUFBRSxDQUFDO29CQUNQLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDZCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQ3hCLElBQUksS0FBOEIsQ0FBQTtRQUVsQyxNQUFNLHNCQUFzQixHQUFHLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDdEQsS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ2xELE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQyxDQUFDLENBQUE7UUFFRixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFO1lBQ2pFOzs7OztjQUtFO1lBQ0YsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFBO1lBQ2hCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsMEJBQTBCLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDOUYsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUM7WUFDSixPQUFPO2dCQUNOLFlBQVksRUFBRSxZQUFZLENBQUMsSUFBSSxDQUM5QixDQUFDLEtBQUssRUFBRSxFQUFFO29CQUNULElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsQ0FBQTtvQkFDMUUsT0FBTyxLQUFLLENBQUE7Z0JBQ2IsQ0FBQyxFQUNELENBQUMsQ0FBQyxFQUFFLEVBQUU7b0JBQ0wsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtvQkFDaEQsTUFBTSxDQUFDLENBQUE7Z0JBQ1IsQ0FBQyxDQUNEO2dCQUNELFdBQVc7YUFDWCxDQUFBO1FBQ0YsQ0FBQztnQkFBUyxDQUFDO1lBQ1Y7Ozs7O2NBS0U7WUFDRixJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLHVCQUF1QixFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQzNGLENBQUM7SUFDRixDQUFDO0lBRU8saUJBQWlCLENBQ3hCLFNBQXNDLEVBQ3RDLFFBQWdCLEVBQ2hCLGdCQUF3QixFQUN4QixFQUFXO1FBRVgsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLDREQUE0RCxDQUFDLENBQUE7UUFDOUUsQ0FBQztRQUVELElBQUksRUFBRSxFQUFFLENBQUM7WUFDUixJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ25FLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUMvQixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDbEUsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1FBQzdCLENBQUM7UUFFRCxJQUFJLENBQUMsWUFBWSxDQUFDLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUV4RCxNQUFNLE9BQU8sR0FBaUIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNqRixPQUFRLE9BQWUsQ0FBQyxPQUFPLENBQUE7UUFFL0IsTUFBTSxLQUFLLEdBQUcsU0FBUyxJQUFLLFNBQVMsQ0FBQyxLQUEwQixDQUFBO1FBRWhFLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FDM0QsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLENBQ3pDLENBQUE7UUFDRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQzVELENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxDQUN6QyxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFBO1FBRWxGOzs7Ozs7Ozs7OztVQVdFO1FBQ0YsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsRUFBRTtZQUNyRCxLQUFLLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUU7WUFDakMsU0FBUyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFO1lBQ3pDLE9BQU87WUFDUCxRQUFRO1lBQ1IsSUFBSSxFQUFFLEtBQUssSUFBSSxLQUFLLENBQUMsSUFBSTtZQUN6QixNQUFNO1lBQ04sbUJBQW1CLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZO1NBQ25ELENBQUMsQ0FBQTtRQUNGLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTyxhQUFhLENBQUMsQ0FBTSxFQUFFLFFBQWdCLEVBQUUsRUFBVztRQUMxRCxJQUFJLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxpQkFBaUIsQ0FDckIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDO2dCQUMzRSxDQUFDLENBQUMsRUFBRSxJQUFJLG1EQUEyQyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRTtnQkFDaEYsQ0FBQyxDQUFDLFNBQVMsRUFDWixRQUFRLEVBQ1IsRUFBRSxFQUNGLEVBQUUsQ0FDRixDQUFBO1lBQ0QsSUFBSSxFQUFFLEVBQUUsQ0FBQztnQkFDUixJQUFJLENBQUMsNkJBQTZCLEdBQUcsS0FBSyxDQUFBO1lBQzNDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsMkJBQTJCLEdBQUcsS0FBSyxDQUFBO1lBQ3pDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLGdCQUFnQixDQUN2QixDQUFzQixFQUN0QixnQkFBd0IsRUFDeEIsSUFBSSxHQUFHLElBQUksRUFDWCxLQUFjLEtBQUs7UUFFbkIsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFBO1FBQ2hFLElBQWlCLENBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM5QixXQUFXLENBQUMsSUFBSSxDQUFhLENBQUMsQ0FBQyxDQUFBO1lBQy9CLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ1YsSUFBSSxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ3hCLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7b0JBQ2xFLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO2dCQUN2QixDQUFDO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO29CQUNoQyxJQUFJLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQzt3QkFDeEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLGdCQUFnQixFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTt3QkFDL0QsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7b0JBQ3ZCLENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFZLFlBQVk7UUFDdkIsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFpQyxRQUFRLENBQUMsQ0FBQTtJQUNwRixDQUFDO0lBRUQsWUFBWSxDQUFDLHFCQUFxQixHQUFHLEtBQUs7UUFDekMsSUFBSSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUNuQyxJQUFJLENBQUMsMkJBQTJCLEdBQUcscUJBQXFCLENBQUE7WUFDeEQsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ3RDLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELGNBQWMsQ0FBQyxxQkFBcUIsR0FBRyxLQUFLO1FBQzNDLElBQUksSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUM7WUFDckMsSUFBSSxDQUFDLDZCQUE2QixHQUFHLHFCQUFxQixDQUFBO1lBQzFELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUN4QyxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxvQkFBb0I7UUFDbkIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1FBQzlCLDREQUE0RDtRQUM1RCxJQUFJLENBQUMsYUFBYSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0lBQ1EsT0FBTztRQUNmLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNuQixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDckIsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUMzQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQztDQUNELENBQUE7QUEvYlksZUFBZTtJQStCekIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsc0JBQXNCLENBQUE7R0FwQ1osZUFBZSxDQStiM0I7O0FBRU0sSUFBTSwrQkFBK0IsR0FBckMsTUFBTSwrQkFBK0I7SUFJM0MsWUFDd0Isb0JBQTREO1FBQTNDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFINUUsaUJBQVksR0FBMkIsSUFBSSxDQUFBO0lBSWhELENBQUM7SUFFSixJQUFJLFdBQVc7UUFDZCxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUM5RSxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFBO0lBQ3pCLENBQUM7SUFFRCxJQUFJLFdBQVcsQ0FBQyxXQUE0QjtRQUMzQyxJQUFJLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxDQUFBO1FBQzVCLElBQUksQ0FBQyxZQUFZLEdBQUcsV0FBVyxDQUFBO0lBQ2hDLENBQUM7Q0FDRCxDQUFBO0FBbkJZLCtCQUErQjtJQUt6QyxXQUFBLHFCQUFxQixDQUFBO0dBTFgsK0JBQStCLENBbUIzQyJ9