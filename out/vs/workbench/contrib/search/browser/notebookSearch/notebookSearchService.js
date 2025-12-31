var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { ResourceSet, ResourceMap } from '../../../../../base/common/map.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { contentMatchesToTextSearchMatches, webviewMatchesToTextSearchMatches, } from './searchNotebookHelpers.js';
import { pathIncludedInQuery, ISearchService, DEFAULT_MAX_SEARCH_RESULTS, } from '../../../../services/search/common/search.js';
import * as arrays from '../../../../../base/common/arrays.js';
import { isNumber } from '../../../../../base/common/types.js';
import { IEditorResolverService } from '../../../../services/editor/common/editorResolverService.js';
import { INotebookEditorService } from '../../../notebook/browser/services/notebookEditorService.js';
import { QueryBuilder } from '../../../../services/search/common/queryBuilder.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
let NotebookSearchService = class NotebookSearchService {
    constructor(uriIdentityService, notebookEditorService, logService, notebookService, configurationService, editorResolverService, searchService, instantiationService) {
        this.uriIdentityService = uriIdentityService;
        this.notebookEditorService = notebookEditorService;
        this.logService = logService;
        this.notebookService = notebookService;
        this.configurationService = configurationService;
        this.editorResolverService = editorResolverService;
        this.searchService = searchService;
        this.queryBuilder = instantiationService.createInstance(QueryBuilder);
    }
    notebookSearch(query, token, searchInstanceID, onProgress) {
        if (query.type !== 2 /* QueryType.Text */) {
            return {
                openFilesToScan: new ResourceSet(),
                completeData: Promise.resolve({
                    messages: [],
                    limitHit: false,
                    results: [],
                }),
                allScannedFiles: Promise.resolve(new ResourceSet()),
            };
        }
        const localNotebookWidgets = this.getLocalNotebookWidgets();
        const localNotebookFiles = localNotebookWidgets.map((widget) => widget.viewModel.uri);
        const getAllResults = () => {
            const searchStart = Date.now();
            const localResultPromise = this.getLocalNotebookResults(query, token ?? CancellationToken.None, localNotebookWidgets, searchInstanceID);
            const searchLocalEnd = Date.now();
            const experimentalNotebooksEnabled = this.configurationService.getValue('search').experimental
                ?.closedNotebookRichContentResults ?? false;
            let closedResultsPromise = Promise.resolve(undefined);
            if (experimentalNotebooksEnabled) {
                closedResultsPromise = this.getClosedNotebookResults(query, new ResourceSet(localNotebookFiles, (uri) => this.uriIdentityService.extUri.getComparisonKey(uri)), token ?? CancellationToken.None);
            }
            const promise = Promise.all([localResultPromise, closedResultsPromise]);
            return {
                completeData: promise.then((resolvedPromise) => {
                    const openNotebookResult = resolvedPromise[0];
                    const closedNotebookResult = resolvedPromise[1];
                    const resolved = resolvedPromise.filter((e) => !!e);
                    const resultArray = [
                        ...openNotebookResult.results.values(),
                        ...(closedNotebookResult?.results.values() ?? []),
                    ];
                    const results = arrays.coalesce(resultArray);
                    if (onProgress) {
                        results.forEach(onProgress);
                    }
                    this.logService.trace(`local notebook search time | ${searchLocalEnd - searchStart}ms`);
                    return {
                        messages: [],
                        limitHit: resolved.reduce((prev, cur) => prev || cur.limitHit, false),
                        results,
                    };
                }),
                allScannedFiles: promise.then((resolvedPromise) => {
                    const openNotebookResults = resolvedPromise[0];
                    const closedNotebookResults = resolvedPromise[1];
                    const results = arrays.coalesce([
                        ...openNotebookResults.results.keys(),
                        ...(closedNotebookResults?.results.keys() ?? []),
                    ]);
                    return new ResourceSet(results, (uri) => this.uriIdentityService.extUri.getComparisonKey(uri));
                }),
            };
        };
        const promiseResults = getAllResults();
        return {
            openFilesToScan: new ResourceSet(localNotebookFiles),
            completeData: promiseResults.completeData,
            allScannedFiles: promiseResults.allScannedFiles,
        };
    }
    async doesFileExist(includes, folderQueries, token) {
        const promises = includes.map(async (includePattern) => {
            const query = this.queryBuilder.file(folderQueries.map((e) => e.folder), {
                includePattern: includePattern.startsWith('/') ? includePattern : '**/' + includePattern, // todo: find cleaner way to ensure that globs match all appropriate filetypes
                exists: true,
                onlyFileScheme: true,
            });
            return this.searchService.fileSearch(query, token).then((ret) => {
                return !!ret.limitHit;
            });
        });
        return Promise.any(promises);
    }
    async getClosedNotebookResults(textQuery, scannedFiles, token) {
        const userAssociations = this.editorResolverService.getAllUserAssociations();
        const allPriorityInfo = new Map();
        const contributedNotebookTypes = this.notebookService.getContributedNotebookTypes();
        userAssociations.forEach((association) => {
            // we gather the editor associations here, but cannot check them until we actually have the files that the glob matches
            // this is because longer patterns take precedence over shorter ones, and even if there is a user association that
            // specifies the exact same glob as a contributed notebook type, there might be another user association that is longer/more specific
            // that still matches the path and should therefore take more precedence.
            if (!association.filenamePattern) {
                return;
            }
            const info = {
                isFromSettings: true,
                filenamePatterns: [association.filenamePattern],
            };
            const existingEntry = allPriorityInfo.get(association.viewType);
            if (existingEntry) {
                allPriorityInfo.set(association.viewType, existingEntry.concat(info));
            }
            else {
                allPriorityInfo.set(association.viewType, [info]);
            }
        });
        const promises = [];
        contributedNotebookTypes.forEach((notebook) => {
            if (notebook.selectors.length > 0) {
                promises.push((async () => {
                    const includes = notebook.selectors.map((selector) => {
                        const globPattern = selector.include ||
                            selector;
                        return globPattern.toString();
                    });
                    const isInWorkspace = await this.doesFileExist(includes, textQuery.folderQueries, token);
                    if (isInWorkspace) {
                        const canResolve = await this.notebookService.canResolve(notebook.id);
                        if (!canResolve) {
                            return undefined;
                        }
                        const serializer = (await this.notebookService.withNotebookDataProvider(notebook.id))
                            .serializer;
                        return await serializer.searchInNotebooks(textQuery, token, allPriorityInfo);
                    }
                    else {
                        return undefined;
                    }
                })());
            }
        });
        const start = Date.now();
        const searchComplete = arrays.coalesce(await Promise.all(promises));
        const results = searchComplete.flatMap((e) => e.results);
        let limitHit = searchComplete.some((e) => e.limitHit);
        // results are already sorted with high priority first, filter out duplicates.
        const uniqueResults = new ResourceMap((uri) => this.uriIdentityService.extUri.getComparisonKey(uri));
        let numResults = 0;
        for (const result of results) {
            if (textQuery.maxResults && numResults >= textQuery.maxResults) {
                limitHit = true;
                break;
            }
            if (!scannedFiles.has(result.resource) && !uniqueResults.has(result.resource)) {
                uniqueResults.set(result.resource, result.cellResults.length > 0 ? result : null);
                numResults++;
            }
        }
        const end = Date.now();
        this.logService.trace(`query: ${textQuery.contentPattern.pattern}`);
        this.logService.trace(`closed notebook search time | ${end - start}ms`);
        return {
            results: uniqueResults,
            limitHit,
        };
    }
    async getLocalNotebookResults(query, token, widgets, searchID) {
        const localResults = new ResourceMap((uri) => this.uriIdentityService.extUri.getComparisonKey(uri));
        let limitHit = false;
        for (const widget of widgets) {
            if (!widget.hasModel()) {
                continue;
            }
            const askMax = (isNumber(query.maxResults) ? query.maxResults : DEFAULT_MAX_SEARCH_RESULTS) + 1;
            const uri = widget.viewModel.uri;
            if (!pathIncludedInQuery(query, uri.fsPath)) {
                continue;
            }
            let matches = await widget.find(query.contentPattern.pattern, {
                regex: query.contentPattern.isRegExp,
                wholeWord: query.contentPattern.isWordMatch,
                caseSensitive: query.contentPattern.isCaseSensitive,
                includeMarkupInput: query.contentPattern.notebookInfo?.isInNotebookMarkdownInput ?? true,
                includeMarkupPreview: query.contentPattern.notebookInfo?.isInNotebookMarkdownPreview ?? true,
                includeCodeInput: query.contentPattern.notebookInfo?.isInNotebookCellInput ?? true,
                includeOutput: query.contentPattern.notebookInfo?.isInNotebookCellOutput ?? true,
            }, token, false, true, searchID);
            if (matches.length) {
                if (askMax && matches.length >= askMax) {
                    limitHit = true;
                    matches = matches.slice(0, askMax - 1);
                }
                const cellResults = matches.map((match) => {
                    const contentResults = contentMatchesToTextSearchMatches(match.contentMatches, match.cell);
                    const webviewResults = webviewMatchesToTextSearchMatches(match.webviewMatches);
                    return {
                        cell: match.cell,
                        index: match.index,
                        contentResults: contentResults,
                        webviewResults: webviewResults,
                    };
                });
                const fileMatch = {
                    resource: uri,
                    cellResults: cellResults,
                };
                localResults.set(uri, fileMatch);
            }
            else {
                localResults.set(uri, null);
            }
        }
        return {
            results: localResults,
            limitHit,
        };
    }
    getLocalNotebookWidgets() {
        const notebookWidgets = this.notebookEditorService.retrieveAllExistingWidgets();
        return notebookWidgets
            .map((widget) => widget.value)
            .filter((val) => !!val && val.hasModel());
    }
};
NotebookSearchService = __decorate([
    __param(0, IUriIdentityService),
    __param(1, INotebookEditorService),
    __param(2, ILogService),
    __param(3, INotebookService),
    __param(4, IConfigurationService),
    __param(5, IEditorResolverService),
    __param(6, ISearchService),
    __param(7, IInstantiationService)
], NotebookSearchService);
export { NotebookSearchService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTZWFyY2hTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvbm90ZWJvb2tTZWFyY2gvbm90ZWJvb2tTZWFyY2hTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRTlFLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFNUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBRS9GLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRTlFLE9BQU8sRUFHTixpQ0FBaUMsRUFDakMsaUNBQWlDLEdBQ2pDLE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQU1OLG1CQUFtQixFQUNuQixjQUFjLEVBRWQsMEJBQTBCLEdBQzFCLE1BQU0sOENBQThDLENBQUE7QUFDckQsT0FBTyxLQUFLLE1BQU0sTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFFcEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFHcEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUEr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