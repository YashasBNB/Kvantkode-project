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
import * as arrays from '../../../../base/common/arrays.js';
import { DeferredPromise, raceCancellationError } from '../../../../base/common/async.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap, ResourceSet } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import { randomChance } from '../../../../base/common/numbers.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { isNumber } from '../../../../base/common/types.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { DEFAULT_MAX_SEARCH_RESULTS, deserializeSearchError, FileMatch, isFileMatch, isProgressMessage, pathIncludedInQuery, SEARCH_RESULT_LANGUAGE_ID, SearchErrorCode, } from './search.js';
import { getTextSearchMatchWithModelContext, editorMatchesToTextSearchResults, } from './searchHelpers.js';
let SearchService = class SearchService extends Disposable {
    constructor(modelService, editorService, telemetryService, logService, extensionService, fileService, uriIdentityService) {
        super();
        this.modelService = modelService;
        this.editorService = editorService;
        this.telemetryService = telemetryService;
        this.logService = logService;
        this.extensionService = extensionService;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this.fileSearchProviders = new Map();
        this.textSearchProviders = new Map();
        this.aiTextSearchProviders = new Map();
        this.deferredFileSearchesByScheme = new Map();
        this.deferredTextSearchesByScheme = new Map();
        this.deferredAITextSearchesByScheme = new Map();
        this.loggedSchemesMissingProviders = new Set();
    }
    registerSearchResultProvider(scheme, type, provider) {
        let list;
        let deferredMap;
        if (type === 0 /* SearchProviderType.file */) {
            list = this.fileSearchProviders;
            deferredMap = this.deferredFileSearchesByScheme;
        }
        else if (type === 1 /* SearchProviderType.text */) {
            list = this.textSearchProviders;
            deferredMap = this.deferredTextSearchesByScheme;
        }
        else if (type === 2 /* SearchProviderType.aiText */) {
            list = this.aiTextSearchProviders;
            deferredMap = this.deferredAITextSearchesByScheme;
        }
        else {
            throw new Error('Unknown SearchProviderType');
        }
        list.set(scheme, provider);
        if (deferredMap.has(scheme)) {
            deferredMap.get(scheme).complete(provider);
            deferredMap.delete(scheme);
        }
        return toDisposable(() => {
            list.delete(scheme);
        });
    }
    async textSearch(query, token, onProgress) {
        const results = this.textSearchSplitSyncAsync(query, token, onProgress);
        const openEditorResults = results.syncResults;
        const otherResults = await results.asyncResults;
        return {
            limitHit: otherResults.limitHit || openEditorResults.limitHit,
            results: [...otherResults.results, ...openEditorResults.results],
            messages: [...otherResults.messages, ...openEditorResults.messages],
        };
    }
    async aiTextSearch(query, token, onProgress) {
        const onProviderProgress = (progress) => {
            // Match
            if (onProgress) {
                // don't override open editor results
                if (isFileMatch(progress)) {
                    onProgress(progress);
                }
                else {
                    onProgress(progress);
                }
            }
            if (isProgressMessage(progress)) {
                this.logService.debug('SearchService#search', progress.message);
            }
        };
        return this.doSearch(query, token, onProviderProgress);
    }
    async getAIName() {
        const provider = this.getSearchProvider(3 /* QueryType.aiText */).get(Schemas.file);
        return await provider?.getAIName();
    }
    textSearchSplitSyncAsync(query, token, onProgress, notebookFilesToIgnore, asyncNotebookFilesToIgnore) {
        // Get open editor results from dirty/untitled
        const openEditorResults = this.getOpenEditorResults(query);
        if (onProgress) {
            arrays
                .coalesce([...openEditorResults.results.values()])
                .filter((e) => !(notebookFilesToIgnore && notebookFilesToIgnore.has(e.resource)))
                .forEach(onProgress);
        }
        const syncResults = {
            results: arrays.coalesce([...openEditorResults.results.values()]),
            limitHit: openEditorResults.limitHit ?? false,
            messages: [],
        };
        const getAsyncResults = async () => {
            const resolvedAsyncNotebookFilesToIgnore = (await asyncNotebookFilesToIgnore) ?? new ResourceSet();
            const onProviderProgress = (progress) => {
                if (isFileMatch(progress)) {
                    // Match
                    if (!openEditorResults.results.has(progress.resource) &&
                        !resolvedAsyncNotebookFilesToIgnore.has(progress.resource) &&
                        onProgress) {
                        // don't override open editor results
                        onProgress(progress);
                    }
                }
                else if (onProgress) {
                    // Progress
                    onProgress(progress);
                }
                if (isProgressMessage(progress)) {
                    this.logService.debug('SearchService#search', progress.message);
                }
            };
            return await this.doSearch(query, token, onProviderProgress);
        };
        return {
            syncResults,
            asyncResults: getAsyncResults(),
        };
    }
    fileSearch(query, token) {
        return this.doSearch(query, token);
    }
    schemeHasFileSearchProvider(scheme) {
        return this.fileSearchProviders.has(scheme);
    }
    doSearch(query, token, onProgress) {
        this.logService.trace('SearchService#search', JSON.stringify(query));
        const schemesInQuery = this.getSchemesInQuery(query);
        const providerActivations = [Promise.resolve(null)];
        schemesInQuery.forEach((scheme) => providerActivations.push(this.extensionService.activateByEvent(`onSearch:${scheme}`)));
        providerActivations.push(this.extensionService.activateByEvent('onSearch:file'));
        const providerPromise = (async () => {
            await Promise.all(providerActivations);
            await this.extensionService.whenInstalledExtensionsRegistered();
            // Cancel faster if search was canceled while waiting for extensions
            if (token && token.isCancellationRequested) {
                return Promise.reject(new CancellationError());
            }
            const progressCallback = (item) => {
                if (token && token.isCancellationRequested) {
                    return;
                }
                onProgress?.(item);
            };
            const exists = await Promise.all(query.folderQueries.map((query) => this.fileService.exists(query.folder)));
            query.folderQueries = query.folderQueries.filter((_, i) => exists[i]);
            let completes = await this.searchWithProviders(query, progressCallback, token);
            completes = arrays.coalesce(completes);
            if (!completes.length) {
                return {
                    limitHit: false,
                    results: [],
                    messages: [],
                };
            }
            return {
                limitHit: completes[0] && completes[0].limitHit,
                stats: completes[0].stats,
                messages: arrays
                    .coalesce(completes.flatMap((i) => i.messages))
                    .filter(arrays.uniqueFilter((message) => message.type + message.text + message.trusted)),
                results: completes.flatMap((c) => c.results),
            };
        })();
        return token ? raceCancellationError(providerPromise, token) : providerPromise;
    }
    getSchemesInQuery(query) {
        const schemes = new Set();
        query.folderQueries?.forEach((fq) => schemes.add(fq.folder.scheme));
        query.extraFileResources?.forEach((extraFile) => schemes.add(extraFile.scheme));
        return schemes;
    }
    async waitForProvider(queryType, scheme) {
        const deferredMap = this.getDeferredTextSearchesByScheme(queryType);
        if (deferredMap.has(scheme)) {
            return deferredMap.get(scheme).p;
        }
        else {
            const deferred = new DeferredPromise();
            deferredMap.set(scheme, deferred);
            return deferred.p;
        }
    }
    getSearchProvider(type) {
        switch (type) {
            case 1 /* QueryType.File */:
                return this.fileSearchProviders;
            case 2 /* QueryType.Text */:
                return this.textSearchProviders;
            case 3 /* QueryType.aiText */:
                return this.aiTextSearchProviders;
            default:
                throw new Error(`Unknown query type: ${type}`);
        }
    }
    getDeferredTextSearchesByScheme(type) {
        switch (type) {
            case 1 /* QueryType.File */:
                return this.deferredFileSearchesByScheme;
            case 2 /* QueryType.Text */:
                return this.deferredTextSearchesByScheme;
            case 3 /* QueryType.aiText */:
                return this.deferredAITextSearchesByScheme;
            default:
                throw new Error(`Unknown query type: ${type}`);
        }
    }
    async searchWithProviders(query, onProviderProgress, token) {
        const e2eSW = StopWatch.create(false);
        const searchPs = [];
        const fqs = this.groupFolderQueriesByScheme(query);
        const someSchemeHasProvider = [...fqs.keys()].some((scheme) => {
            return this.getSearchProvider(query.type).has(scheme);
        });
        if (query.type === 3 /* QueryType.aiText */ && !someSchemeHasProvider) {
            return [];
        }
        await Promise.all([...fqs.keys()].map(async (scheme) => {
            if (query.onlyFileScheme && scheme !== Schemas.file) {
                return;
            }
            const schemeFQs = fqs.get(scheme);
            let provider = this.getSearchProvider(query.type).get(scheme);
            if (!provider) {
                if (someSchemeHasProvider) {
                    if (!this.loggedSchemesMissingProviders.has(scheme)) {
                        this.logService.warn(`No search provider registered for scheme: ${scheme}. Another scheme has a provider, not waiting for ${scheme}`);
                        this.loggedSchemesMissingProviders.add(scheme);
                    }
                    return;
                }
                else {
                    if (!this.loggedSchemesMissingProviders.has(scheme)) {
                        this.logService.warn(`No search provider registered for scheme: ${scheme}, waiting`);
                        this.loggedSchemesMissingProviders.add(scheme);
                    }
                    provider = await this.waitForProvider(query.type, scheme);
                }
            }
            const oneSchemeQuery = {
                ...query,
                ...{
                    folderQueries: schemeFQs,
                },
            };
            const doProviderSearch = () => {
                switch (query.type) {
                    case 1 /* QueryType.File */:
                        return provider.fileSearch(oneSchemeQuery, token);
                    case 2 /* QueryType.Text */:
                        return provider.textSearch(oneSchemeQuery, onProviderProgress, token);
                    default:
                        return provider.textSearch(oneSchemeQuery, onProviderProgress, token);
                }
            };
            searchPs.push(doProviderSearch());
        }));
        return Promise.all(searchPs).then((completes) => {
            const endToEndTime = e2eSW.elapsed();
            this.logService.trace(`SearchService#search: ${endToEndTime}ms`);
            completes.forEach((complete) => {
                this.sendTelemetry(query, endToEndTime, complete);
            });
            return completes;
        }, (err) => {
            const endToEndTime = e2eSW.elapsed();
            this.logService.trace(`SearchService#search: ${endToEndTime}ms`);
            const searchError = deserializeSearchError(err);
            this.logService.trace(`SearchService#searchError: ${searchError.message}`);
            this.sendTelemetry(query, endToEndTime, undefined, searchError);
            throw searchError;
        });
    }
    groupFolderQueriesByScheme(query) {
        const queries = new Map();
        query.folderQueries.forEach((fq) => {
            const schemeFQs = queries.get(fq.folder.scheme) || [];
            schemeFQs.push(fq);
            queries.set(fq.folder.scheme, schemeFQs);
        });
        return queries;
    }
    sendTelemetry(query, endToEndTime, complete, err) {
        if (!randomChance(5 / 100)) {
            // Noisy events, only send 5% of them
            return;
        }
        const fileSchemeOnly = query.folderQueries.every((fq) => fq.folder.scheme === Schemas.file);
        const otherSchemeOnly = query.folderQueries.every((fq) => fq.folder.scheme !== Schemas.file);
        const scheme = fileSchemeOnly ? Schemas.file : otherSchemeOnly ? 'other' : 'mixed';
        if (query.type === 1 /* QueryType.File */ && complete && complete.stats) {
            const fileSearchStats = complete.stats;
            if (fileSearchStats.fromCache) {
                const cacheStats = fileSearchStats.detailStats;
                this.telemetryService.publicLog2('cachedSearchComplete', {
                    reason: query._reason,
                    resultCount: fileSearchStats.resultCount,
                    workspaceFolderCount: query.folderQueries.length,
                    endToEndTime: endToEndTime,
                    sortingTime: fileSearchStats.sortingTime,
                    cacheWasResolved: cacheStats.cacheWasResolved,
                    cacheLookupTime: cacheStats.cacheLookupTime,
                    cacheFilterTime: cacheStats.cacheFilterTime,
                    cacheEntryCount: cacheStats.cacheEntryCount,
                    scheme,
                });
            }
            else {
                const searchEngineStats = fileSearchStats.detailStats;
                this.telemetryService.publicLog2('searchComplete', {
                    reason: query._reason,
                    resultCount: fileSearchStats.resultCount,
                    workspaceFolderCount: query.folderQueries.length,
                    endToEndTime: endToEndTime,
                    sortingTime: fileSearchStats.sortingTime,
                    fileWalkTime: searchEngineStats.fileWalkTime,
                    directoriesWalked: searchEngineStats.directoriesWalked,
                    filesWalked: searchEngineStats.filesWalked,
                    cmdTime: searchEngineStats.cmdTime,
                    cmdResultCount: searchEngineStats.cmdResultCount,
                    scheme,
                });
            }
        }
        else if (query.type === 2 /* QueryType.Text */) {
            let errorType;
            if (err) {
                errorType =
                    err.code === SearchErrorCode.regexParseError
                        ? 'regex'
                        : err.code === SearchErrorCode.unknownEncoding
                            ? 'encoding'
                            : err.code === SearchErrorCode.globParseError
                                ? 'glob'
                                : err.code === SearchErrorCode.invalidLiteral
                                    ? 'literal'
                                    : err.code === SearchErrorCode.other
                                        ? 'other'
                                        : err.code === SearchErrorCode.canceled
                                            ? 'canceled'
                                            : 'unknown';
            }
            this.telemetryService.publicLog2('textSearchComplete', {
                reason: query._reason,
                workspaceFolderCount: query.folderQueries.length,
                endToEndTime: endToEndTime,
                scheme,
                error: errorType,
            });
        }
    }
    getOpenEditorResults(query) {
        const openEditorResults = new ResourceMap((uri) => this.uriIdentityService.extUri.getComparisonKey(uri));
        let limitHit = false;
        if (query.type === 2 /* QueryType.Text */) {
            const canonicalToOriginalResources = new ResourceMap();
            for (const editorInput of this.editorService.editors) {
                const canonical = EditorResourceAccessor.getCanonicalUri(editorInput, {
                    supportSideBySide: SideBySideEditor.PRIMARY,
                });
                const original = EditorResourceAccessor.getOriginalUri(editorInput, {
                    supportSideBySide: SideBySideEditor.PRIMARY,
                });
                if (canonical) {
                    canonicalToOriginalResources.set(canonical, original ?? canonical);
                }
            }
            const models = this.modelService.getModels();
            models.forEach((model) => {
                const resource = model.uri;
                if (!resource) {
                    return;
                }
                if (limitHit) {
                    return;
                }
                const originalResource = canonicalToOriginalResources.get(resource);
                if (!originalResource) {
                    return;
                }
                // Skip search results
                if (model.getLanguageId() === SEARCH_RESULT_LANGUAGE_ID &&
                    !(query.includePattern && query.includePattern['**/*.code-search'])) {
                    // TODO: untitled search editors will be excluded from search even when include *.code-search is specified
                    return;
                }
                // Block walkthrough, webview, etc.
                if (originalResource.scheme !== Schemas.untitled &&
                    !this.fileService.hasProvider(originalResource)) {
                    return;
                }
                // Exclude files from the git FileSystemProvider, e.g. to prevent open staged files from showing in search results
                if (originalResource.scheme === 'git') {
                    return;
                }
                if (!this.matches(originalResource, query)) {
                    return; // respect user filters
                }
                // Use editor API to find matches
                const askMax = (isNumber(query.maxResults) ? query.maxResults : DEFAULT_MAX_SEARCH_RESULTS) + 1;
                let matches = model.findMatches(query.contentPattern.pattern, false, !!query.contentPattern.isRegExp, !!query.contentPattern.isCaseSensitive, query.contentPattern.isWordMatch ? query.contentPattern.wordSeparators : null, false, askMax);
                if (matches.length) {
                    if (askMax && matches.length >= askMax) {
                        limitHit = true;
                        matches = matches.slice(0, askMax - 1);
                    }
                    const fileMatch = new FileMatch(originalResource);
                    openEditorResults.set(originalResource, fileMatch);
                    const textSearchResults = editorMatchesToTextSearchResults(matches, model, query.previewOptions);
                    fileMatch.results = getTextSearchMatchWithModelContext(textSearchResults, model, query);
                }
                else {
                    openEditorResults.set(originalResource, null);
                }
            });
        }
        return {
            results: openEditorResults,
            limitHit,
        };
    }
    matches(resource, query) {
        return pathIncludedInQuery(query, resource.fsPath);
    }
    async clearCache(cacheKey) {
        const clearPs = Array.from(this.fileSearchProviders.values()).map((provider) => provider && provider.clearCache(cacheKey));
        await Promise.all(clearPs);
    }
};
SearchService = __decorate([
    __param(0, IModelService),
    __param(1, IEditorService),
    __param(2, ITelemetryService),
    __param(3, ILogService),
    __param(4, IExtensionService),
    __param(5, IFileService),
    __param(6, IUriIdentityService)
], SearchService);
export { SearchService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvY29tbW9uL3NlYXJjaFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFekYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM1RixPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDakUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIs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