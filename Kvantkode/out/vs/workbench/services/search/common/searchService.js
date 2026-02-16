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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC9jb21tb24vc2VhcmNoU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV6RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTNELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxn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