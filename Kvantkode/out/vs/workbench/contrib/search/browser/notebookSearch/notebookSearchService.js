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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTZWFyY2hTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9ub3RlYm9va1NlYXJjaC9ub3RlYm9va1NlYXJjaFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFOUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU1RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDdkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFFL0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFOUUsT0FBTyxFQUdOLGlDQUFpQyxFQUNqQyxpQ0FBaUMsR0FDakMsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLEVBTU4sbUJBQW1CLEVBQ25CLGNBQWMsRUFFZCwwQkFBMEIsR0FDMUIsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLEtBQUssTUFBTSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUVwRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUdwRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDakYsT0FBTyxFQUFF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