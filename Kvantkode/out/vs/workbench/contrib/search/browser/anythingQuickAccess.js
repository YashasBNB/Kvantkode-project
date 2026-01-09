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
var AnythingQuickAccessProvider_1;
import './media/anythingQuickAccess.css';
import { quickPickItemScorerAccessor, QuickPickItemScorerAccessor, QuickInputHideReason, IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { PickerQuickAccessProvider, TriggerAction, } from '../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { prepareQuery, compareItemsByFuzzyScore, scoreItemFuzzy, } from '../../../../base/common/fuzzyScorer.js';
import { QueryBuilder, } from '../../../services/search/common/queryBuilder.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { getOutOfWorkspaceEditorResources, extractRangeFromFilter, } from '../common/search.js';
import { ISearchService } from '../../../services/search/common/search.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { untildify } from '../../../../base/common/labels.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { URI } from '../../../../base/common/uri.js';
import { toLocalResource, dirname, basenameOrAuthority } from '../../../../base/common/resources.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { DisposableStore, toDisposable, MutableDisposable, Disposable, } from '../../../../base/common/lifecycle.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { localize } from '../../../../nls.js';
import { IWorkingCopyService } from '../../../services/workingCopy/common/workingCopyService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { EditorResourceAccessor, isEditorInput, } from '../../../common/editor.js';
import { IEditorService, SIDE_GROUP, ACTIVE_GROUP, } from '../../../services/editor/common/editorService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ThrottledDelayer } from '../../../../base/common/async.js';
import { top } from '../../../../base/common/arrays.js';
import { FileQueryCacheState } from '../common/cacheState.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { Schemas } from '../../../../base/common/network.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { SymbolsQuickAccessProvider } from './symbolsQuickAccess.js';
import { DefaultQuickAccessFilterValue, Extensions, } from '../../../../platform/quickinput/common/quickAccess.js';
import { PickerEditorState, } from '../../../browser/quickaccess.js';
import { GotoSymbolQuickAccessProvider } from '../../codeEditor/browser/quickaccess/gotoSymbolQuickAccess.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { Event } from '../../../../base/common/event.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { stripIcons } from '../../../../base/common/iconLabels.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ASK_QUICK_QUESTION_ACTION_ID } from '../../chat/browser/actions/chatQuickInputActions.js';
import { IQuickChatService } from '../../chat/browser/chat.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ICustomEditorLabelService } from '../../../services/editor/common/customEditorLabelService.js';
function isEditorSymbolQuickPickItem(pick) {
    const candidate = pick;
    return !!candidate?.range && !!candidate.resource;
}
let AnythingQuickAccessProvider = class AnythingQuickAccessProvider extends PickerQuickAccessProvider {
    static { AnythingQuickAccessProvider_1 = this; }
    static { this.PREFIX = ''; }
    static { this.NO_RESULTS_PICK = {
        label: localize('noAnythingResults', 'No matching results'),
    }; }
    static { this.MAX_RESULTS = 512; }
    static { this.TYPING_SEARCH_DELAY = 200; } // this delay accommodates for the user typing a word and then stops typing to start searching
    static { this.SYMBOL_PICKS_MERGE_DELAY = 200; } // allow some time to merge fast and slow picks to reduce flickering
    get defaultFilterValue() {
        if (this.configuration.preserveInput) {
            return DefaultQuickAccessFilterValue.LAST;
        }
        return undefined;
    }
    constructor(instantiationService, searchService, contextService, pathService, environmentService, fileService, labelService, modelService, languageService, workingCopyService, configurationService, editorService, historyService, filesConfigurationService, textModelService, uriIdentityService, quickInputService, keybindingService, quickChatService, logService, customEditorLabelService) {
        super(AnythingQuickAccessProvider_1.PREFIX, {
            canAcceptInBackground: true,
            noResultsPick: AnythingQuickAccessProvider_1.NO_RESULTS_PICK,
        });
        this.instantiationService = instantiationService;
        this.searchService = searchService;
        this.contextService = contextService;
        this.pathService = pathService;
        this.environmentService = environmentService;
        this.fileService = fileService;
        this.labelService = labelService;
        this.modelService = modelService;
        this.languageService = languageService;
        this.workingCopyService = workingCopyService;
        this.configurationService = configurationService;
        this.editorService = editorService;
        this.historyService = historyService;
        this.filesConfigurationService = filesConfigurationService;
        this.textModelService = textModelService;
        this.uriIdentityService = uriIdentityService;
        this.quickInputService = quickInputService;
        this.keybindingService = keybindingService;
        this.quickChatService = quickChatService;
        this.logService = logService;
        this.customEditorLabelService = customEditorLabelService;
        this.pickState = this._register(new (class extends Disposable {
            constructor(provider, instantiationService) {
                super();
                this.provider = provider;
                this.instantiationService = instantiationService;
                this.picker = undefined;
                this.editorViewState = this._register(this.instantiationService.createInstance(PickerEditorState));
                this.scorerCache = Object.create(null);
                this.fileQueryCache = undefined;
                this.lastOriginalFilter = undefined;
                this.lastFilter = undefined;
                this.lastRange = undefined;
                this.lastGlobalPicks = undefined;
                this.isQuickNavigating = undefined;
            }
            set(picker) {
                // Picker for this run
                this.picker = picker;
                Event.once(picker.onDispose)(() => {
                    if (picker === this.picker) {
                        this.picker = undefined; // clear the picker when disposed to not keep it in memory for too long
                    }
                });
                // Caches
                const isQuickNavigating = !!picker.quickNavigate;
                if (!isQuickNavigating) {
                    this.fileQueryCache = this.provider.createFileQueryCache();
                    this.scorerCache = Object.create(null);
                }
                // Other
                this.isQuickNavigating = isQuickNavigating;
                this.lastOriginalFilter = undefined;
                this.lastFilter = undefined;
                this.lastRange = undefined;
                this.lastGlobalPicks = undefined;
                this.editorViewState.reset();
            }
        })(this, this.instantiationService));
        //#region Editor History
        this.labelOnlyEditorHistoryPickAccessor = new QuickPickItemScorerAccessor({
            skipDescription: true,
        });
        //#endregion
        //#region File Search
        this.fileQueryDelayer = this._register(new ThrottledDelayer(AnythingQuickAccessProvider_1.TYPING_SEARCH_DELAY));
        this.fileQueryBuilder = this.instantiationService.createInstance(QueryBuilder);
        //#endregion
        //#region Command Center (if enabled)
        this.lazyRegistry = new Lazy(() => Registry.as(Extensions.Quickaccess));
        //#endregion
        //#region Workspace Symbols (if enabled)
        this.workspaceSymbolsQuickAccess = this._register(this.instantiationService.createInstance(SymbolsQuickAccessProvider));
        //#endregion
        //#region Editor Symbols (if narrowing down into a global pick via `@`)
        this.editorSymbolsQuickAccess = this.instantiationService.createInstance(GotoSymbolQuickAccessProvider);
    }
    get configuration() {
        const editorConfig = this.configurationService.getValue().workbench?.editor;
        const searchConfig = this.configurationService.getValue().search;
        const quickAccessConfig = this.configurationService.getValue().workbench.quickOpen;
        return {
            openEditorPinned: !editorConfig?.enablePreviewFromQuickOpen || !editorConfig?.enablePreview,
            openSideBySideDirection: editorConfig?.openSideBySideDirection,
            includeSymbols: searchConfig?.quickOpen.includeSymbols,
            includeHistory: searchConfig?.quickOpen.includeHistory,
            historyFilterSortOrder: searchConfig?.quickOpen.history.filterSortOrder,
            preserveInput: quickAccessConfig.preserveInput,
        };
    }
    provide(picker, token, runOptions) {
        const disposables = new DisposableStore();
        // Update the pick state for this run
        this.pickState.set(picker);
        // Add editor decorations for active editor symbol picks
        const editorDecorationsDisposable = disposables.add(new MutableDisposable());
        disposables.add(picker.onDidChangeActive(() => {
            // Clear old decorations
            editorDecorationsDisposable.value = undefined;
            // Add new decoration if editor symbol is active
            const [item] = picker.activeItems;
            if (isEditorSymbolQuickPickItem(item)) {
                editorDecorationsDisposable.value = this.decorateAndRevealSymbolRange(item);
            }
        }));
        // Restore view state upon cancellation if we changed it
        // but only when the picker was closed via explicit user
        // gesture and not e.g. when focus was lost because that
        // could mean the user clicked into the editor directly.
        disposables.add(Event.once(picker.onDidHide)(({ reason }) => {
            if (reason === QuickInputHideReason.Gesture) {
                this.pickState.editorViewState.restore();
            }
        }));
        // Start picker
        disposables.add(super.provide(picker, token, runOptions));
        return disposables;
    }
    decorateAndRevealSymbolRange(pick) {
        const activeEditor = this.editorService.activeEditor;
        if (!this.uriIdentityService.extUri.isEqual(pick.resource, activeEditor?.resource)) {
            return Disposable.None; // active editor needs to be for resource
        }
        const activeEditorControl = this.editorService.activeTextEditorControl;
        if (!activeEditorControl) {
            return Disposable.None; // we need a text editor control to decorate and reveal
        }
        // we must remember our curret view state to be able to restore
        this.pickState.editorViewState.set();
        // Reveal
        activeEditorControl.revealRangeInCenter(pick.range.selection, 0 /* ScrollType.Smooth */);
        // Decorate
        this.addDecorations(activeEditorControl, pick.range.decoration);
        return toDisposable(() => this.clearDecorations(activeEditorControl));
    }
    _getPicks(originalFilter, disposables, token, runOptions) {
        // Find a suitable range from the pattern looking for ":", "#" or ","
        // unless we have the `@` editor symbol character inside the filter
        const filterWithRange = extractRangeFromFilter(originalFilter, [
            GotoSymbolQuickAccessProvider.PREFIX,
        ]);
        // Update filter with normalized values
        let filter;
        if (filterWithRange) {
            filter = filterWithRange.filter;
        }
        else {
            filter = originalFilter;
        }
        // Remember as last range
        this.pickState.lastRange = filterWithRange?.range;
        // If the original filter value has changed but the normalized
        // one has not, we return early with a `null` result indicating
        // that the results should preserve because the range information
        // (:<line>:<column>) does not need to trigger any re-sorting.
        if (originalFilter !== this.pickState.lastOriginalFilter &&
            filter === this.pickState.lastFilter) {
            return null;
        }
        // Remember as last filter
        const lastWasFiltering = !!this.pickState.lastOriginalFilter;
        this.pickState.lastOriginalFilter = originalFilter;
        this.pickState.lastFilter = filter;
        // Remember our pick state before returning new picks
        // unless we are inside an editor symbol filter or result.
        // We can use this state to return back to the global pick
        // when the user is narrowing back out of editor symbols.
        const picks = this.pickState.picker?.items;
        const activePick = this.pickState.picker?.activeItems[0];
        if (picks && activePick) {
            const activePickIsEditorSymbol = isEditorSymbolQuickPickItem(activePick);
            const activePickIsNoResultsInEditorSymbols = activePick === AnythingQuickAccessProvider_1.NO_RESULTS_PICK &&
                filter.indexOf(GotoSymbolQuickAccessProvider.PREFIX) >= 0;
            if (!activePickIsEditorSymbol && !activePickIsNoResultsInEditorSymbols) {
                this.pickState.lastGlobalPicks = {
                    items: picks,
                    active: activePick,
                };
            }
        }
        // `enableEditorSymbolSearch`: this will enable local editor symbol
        // search if the filter value includes `@` character. We only want
        // to enable this support though if the user was filtering in the
        // picker because this feature depends on an active item in the result
        // list to get symbols from. If we would simply trigger editor symbol
        // search without prior filtering, you could not paste a file name
        // including the `@` character to open it (e.g. /some/file@path)
        // refs: https://github.com/microsoft/vscode/issues/93845
        return this.doGetPicks(filter, {
            ...runOptions,
            enableEditorSymbolSearch: lastWasFiltering,
        }, disposables, token);
    }
    doGetPicks(filter, options, disposables, token) {
        const query = prepareQuery(filter);
        // Return early if we have editor symbol picks. We support this by:
        // - having a previously active global pick (e.g. a file)
        // - the user typing `@` to start the local symbol query
        if (options.enableEditorSymbolSearch) {
            const editorSymbolPicks = this.getEditorSymbolPicks(query, disposables, token);
            if (editorSymbolPicks) {
                return editorSymbolPicks;
            }
        }
        // If we have a known last active editor symbol pick, we try to restore
        // the last global pick to support the case of narrowing out from a
        // editor symbol search back into the global search
        const activePick = this.pickState.picker?.activeItems[0];
        if (isEditorSymbolQuickPickItem(activePick) && this.pickState.lastGlobalPicks) {
            return this.pickState.lastGlobalPicks;
        }
        // Otherwise return normally with history and file/symbol results
        const historyEditorPicks = this.getEditorHistoryPicks(query);
        let picks = new Array();
        if (options.additionPicks) {
            for (const pick of options.additionPicks) {
                if (pick.type === 'separator') {
                    picks.push(pick);
                    continue;
                }
                if (!query.original) {
                    pick.highlights = undefined;
                    picks.push(pick);
                    continue;
                }
                const { score, labelMatch, descriptionMatch } = scoreItemFuzzy(pick, query, true, quickPickItemScorerAccessor, this.pickState.scorerCache);
                if (!score) {
                    continue;
                }
                pick.highlights = {
                    label: labelMatch,
                    description: descriptionMatch,
                };
                picks.push(pick);
            }
        }
        if (this.pickState.isQuickNavigating) {
            if (picks.length > 0) {
                picks.push({
                    type: 'separator',
                    label: localize('recentlyOpenedSeparator', 'recently opened'),
                });
            }
            picks = historyEditorPicks;
        }
        else {
            if (options.includeHelp) {
                picks.push(...this.getHelpPicks(query, token, options));
            }
            if (historyEditorPicks.length !== 0) {
                picks.push({
                    type: 'separator',
                    label: localize('recentlyOpenedSeparator', 'recently opened'),
                });
                picks.push(...historyEditorPicks);
            }
        }
        return {
            // Fast picks: help (if included) & editor history
            picks: options.filter ? picks.filter((p) => options.filter?.(p)) : picks,
            // Slow picks: files and symbols
            additionalPicks: (async () => {
                // Exclude any result that is already present in editor history
                const additionalPicksExcludes = new ResourceMap();
                for (const historyEditorPick of historyEditorPicks) {
                    if (historyEditorPick.resource) {
                        additionalPicksExcludes.set(historyEditorPick.resource, true);
                    }
                }
                let additionalPicks = await this.getAdditionalPicks(query, additionalPicksExcludes, this.configuration.includeSymbols, token);
                if (options.filter) {
                    additionalPicks = additionalPicks.filter((p) => options.filter?.(p));
                }
                if (token.isCancellationRequested) {
                    return [];
                }
                return additionalPicks.length > 0
                    ? [
                        {
                            type: 'separator',
                            label: this.configuration.includeSymbols
                                ? localize('fileAndSymbolResultsSeparator', 'file and symbol results')
                                : localize('fileResultsSeparator', 'file results'),
                        },
                        ...additionalPicks,
                    ]
                    : [];
            })(),
            // allow some time to merge files and symbols to reduce flickering
            mergeDelay: AnythingQuickAccessProvider_1.SYMBOL_PICKS_MERGE_DELAY,
        };
    }
    async getAdditionalPicks(query, excludes, includeSymbols, token) {
        // Resolve file and symbol picks (if enabled)
        const [filePicks, symbolPicks] = await Promise.all([
            this.getFilePicks(query, excludes, token),
            this.getWorkspaceSymbolPicks(query, includeSymbols, token),
        ]);
        if (token.isCancellationRequested) {
            return [];
        }
        // Perform sorting (top results by score)
        const sortedAnythingPicks = top([...filePicks, ...symbolPicks], (anyPickA, anyPickB) => compareItemsByFuzzyScore(anyPickA, anyPickB, query, true, quickPickItemScorerAccessor, this.pickState.scorerCache), AnythingQuickAccessProvider_1.MAX_RESULTS);
        // Perform filtering
        const filteredAnythingPicks = [];
        for (const anythingPick of sortedAnythingPicks) {
            // Always preserve any existing highlights (e.g. from workspace symbols)
            if (anythingPick.highlights) {
                filteredAnythingPicks.push(anythingPick);
            }
            // Otherwise, do the scoring and matching here
            else {
                const { score, labelMatch, descriptionMatch } = scoreItemFuzzy(anythingPick, query, true, quickPickItemScorerAccessor, this.pickState.scorerCache);
                if (!score) {
                    continue;
                }
                anythingPick.highlights = {
                    label: labelMatch,
                    description: descriptionMatch,
                };
                filteredAnythingPicks.push(anythingPick);
            }
        }
        return filteredAnythingPicks;
    }
    getEditorHistoryPicks(query) {
        const configuration = this.configuration;
        // Just return all history entries if not searching
        if (!query.normalized) {
            return this.historyService
                .getHistory()
                .map((editor) => this.createAnythingPick(editor, configuration));
        }
        if (!this.configuration.includeHistory) {
            return []; // disabled when searching
        }
        // Perform filtering
        const editorHistoryScorerAccessor = query.containsPathSeparator
            ? quickPickItemScorerAccessor
            : this.labelOnlyEditorHistoryPickAccessor; // Only match on label of the editor unless the search includes path separators
        const editorHistoryPicks = [];
        for (const editor of this.historyService.getHistory()) {
            const resource = editor.resource;
            if (!resource) {
                continue;
            }
            const editorHistoryPick = this.createAnythingPick(editor, configuration);
            const { score, labelMatch, descriptionMatch } = scoreItemFuzzy(editorHistoryPick, query, false, editorHistoryScorerAccessor, this.pickState.scorerCache);
            if (!score) {
                continue; // exclude editors not matching query
            }
            editorHistoryPick.highlights = {
                label: labelMatch,
                description: descriptionMatch,
            };
            editorHistoryPicks.push(editorHistoryPick);
        }
        // Return without sorting if settings tell to sort by recency
        if (this.configuration.historyFilterSortOrder === 'recency') {
            return editorHistoryPicks;
        }
        // Perform sorting
        return editorHistoryPicks.sort((editorA, editorB) => compareItemsByFuzzyScore(editorA, editorB, query, false, editorHistoryScorerAccessor, this.pickState.scorerCache));
    }
    createFileQueryCache() {
        return new FileQueryCacheState((cacheKey) => this.fileQueryBuilder.file(this.contextService.getWorkspace().folders, this.getFileQueryOptions({ cacheKey })), (query) => this.searchService.fileSearch(query), (cacheKey) => this.searchService.clearCache(cacheKey), this.pickState.fileQueryCache).load();
    }
    async getFilePicks(query, excludes, token) {
        if (!query.normalized) {
            return [];
        }
        // Absolute path result
        const absolutePathResult = await this.getAbsolutePathFileResult(query, token);
        if (token.isCancellationRequested) {
            return [];
        }
        // Use absolute path result as only results if present
        let fileMatches;
        if (absolutePathResult) {
            if (excludes.has(absolutePathResult)) {
                return []; // excluded
            }
            // Create a single result pick and make sure to apply full
            // highlights to ensure the pick is displayed. Since a
            // ~ might have been used for searching, our fuzzy scorer
            // may otherwise not properly respect the pick as a result
            const absolutePathPick = this.createAnythingPick(absolutePathResult, this.configuration);
            absolutePathPick.highlights = {
                label: [{ start: 0, end: absolutePathPick.label.length }],
                description: absolutePathPick.description
                    ? [{ start: 0, end: absolutePathPick.description.length }]
                    : undefined,
            };
            return [absolutePathPick];
        }
        // Otherwise run the file search (with a delayer if cache is not ready yet)
        if (this.pickState.fileQueryCache?.isLoaded) {
            fileMatches = await this.doFileSearch(query, token);
        }
        else {
            fileMatches = await this.fileQueryDelayer.trigger(async () => {
                if (token.isCancellationRequested) {
                    return [];
                }
                return this.doFileSearch(query, token);
            });
        }
        if (token.isCancellationRequested) {
            return [];
        }
        // Filter excludes & convert to picks
        const configuration = this.configuration;
        return fileMatches
            .filter((resource) => !excludes.has(resource))
            .map((resource) => this.createAnythingPick(resource, configuration));
    }
    async doFileSearch(query, token) {
        const [fileSearchResults, relativePathFileResults] = await Promise.all([
            // File search: this is a search over all files of the workspace using the provided pattern
            this.getFileSearchResults(query, token),
            // Relative path search: we also want to consider results that match files inside the workspace
            // by looking for relative paths that the user typed as query. This allows to return even excluded
            // results into the picker if found (e.g. helps for opening compilation results that are otherwise
            // excluded)
            this.getRelativePathFileResults(query, token),
        ]);
        if (token.isCancellationRequested) {
            return [];
        }
        // Return quickly if no relative results are present
        if (!relativePathFileResults) {
            return fileSearchResults;
        }
        // Otherwise, make sure to filter relative path results from
        // the search results to prevent duplicates
        const relativePathFileResultsMap = new ResourceMap();
        for (const relativePathFileResult of relativePathFileResults) {
            relativePathFileResultsMap.set(relativePathFileResult, true);
        }
        return [
            ...fileSearchResults.filter((result) => !relativePathFileResultsMap.has(result)),
            ...relativePathFileResults,
        ];
    }
    async getFileSearchResults(query, token) {
        // filePattern for search depends on the number of queries in input:
        // - with multiple: only take the first one and let the filter later drop non-matching results
        // - with single: just take the original in full
        //
        // This enables to e.g. search for "someFile someFolder" by only returning
        // search results for "someFile" and not both that would normally not match.
        //
        let filePattern = '';
        if (query.values && query.values.length > 1) {
            filePattern = query.values[0].original;
        }
        else {
            filePattern = query.original;
        }
        const fileSearchResults = await this.doGetFileSearchResults(filePattern, token);
        if (token.isCancellationRequested) {
            return [];
        }
        // If we detect that the search limit has been hit and we have a query
        // that was composed of multiple inputs where we only took the first part
        // we run another search with the full original query included to make
        // sure we are including all possible results that could match.
        if (fileSearchResults.limitHit && query.values && query.values.length > 1) {
            const additionalFileSearchResults = await this.doGetFileSearchResults(query.original, token);
            if (token.isCancellationRequested) {
                return [];
            }
            // Remember which result we already covered
            const existingFileSearchResultsMap = new ResourceMap();
            for (const fileSearchResult of fileSearchResults.results) {
                existingFileSearchResultsMap.set(fileSearchResult.resource, true);
            }
            // Add all additional results to the original set for inclusion
            for (const additionalFileSearchResult of additionalFileSearchResults.results) {
                if (!existingFileSearchResultsMap.has(additionalFileSearchResult.resource)) {
                    fileSearchResults.results.push(additionalFileSearchResult);
                }
            }
        }
        return fileSearchResults.results.map((result) => result.resource);
    }
    doGetFileSearchResults(filePattern, token) {
        const start = Date.now();
        return this.searchService
            .fileSearch(this.fileQueryBuilder.file(this.contextService.getWorkspace().folders, this.getFileQueryOptions({
            filePattern,
            cacheKey: this.pickState.fileQueryCache?.cacheKey,
            maxResults: AnythingQuickAccessProvider_1.MAX_RESULTS,
        })), token)
            .finally(() => {
            this.logService.trace(`QuickAccess fileSearch ${Date.now() - start}ms`);
        });
    }
    getFileQueryOptions(input) {
        return {
            _reason: 'openFileHandler', // used for telemetry - do not change
            extraFileResources: this.instantiationService.invokeFunction(getOutOfWorkspaceEditorResources),
            filePattern: input.filePattern || '',
            cacheKey: input.cacheKey,
            maxResults: input.maxResults || 0,
            sortByScore: true,
        };
    }
    async getAbsolutePathFileResult(query, token) {
        if (!query.containsPathSeparator) {
            return;
        }
        const userHome = await this.pathService.userHome();
        const detildifiedQuery = untildify(query.original, userHome.scheme === Schemas.file ? userHome.fsPath : userHome.path);
        if (token.isCancellationRequested) {
            return;
        }
        const isAbsolutePathQuery = (await this.pathService.path).isAbsolute(detildifiedQuery);
        if (token.isCancellationRequested) {
            return;
        }
        if (isAbsolutePathQuery) {
            const resource = toLocalResource(await this.pathService.fileURI(detildifiedQuery), this.environmentService.remoteAuthority, this.pathService.defaultUriScheme);
            if (token.isCancellationRequested) {
                return;
            }
            try {
                if ((await this.fileService.stat(resource)).isFile) {
                    return resource;
                }
            }
            catch (error) {
                // ignore if file does not exist
            }
        }
        return;
    }
    async getRelativePathFileResults(query, token) {
        if (!query.containsPathSeparator) {
            return;
        }
        // Convert relative paths to absolute paths over all folders of the workspace
        // and return them as results if the absolute paths exist
        const isAbsolutePathQuery = (await this.pathService.path).isAbsolute(query.original);
        if (!isAbsolutePathQuery) {
            const resources = [];
            for (const folder of this.contextService.getWorkspace().folders) {
                if (token.isCancellationRequested) {
                    break;
                }
                const resource = toLocalResource(folder.toResource(query.original), this.environmentService.remoteAuthority, this.pathService.defaultUriScheme);
                try {
                    if ((await this.fileService.stat(resource)).isFile) {
                        resources.push(resource);
                    }
                }
                catch (error) {
                    // ignore if file does not exist
                }
            }
            return resources;
        }
        return;
    }
    getHelpPicks(query, token, runOptions) {
        if (query.normalized) {
            return []; // If there's a filter, we don't show the help
        }
        const providers = this.lazyRegistry.value
            .getQuickAccessProviders()
            .filter((p) => p.helpEntries.some((h) => h.commandCenterOrder !== undefined))
            .flatMap((provider) => provider.helpEntries
            .filter((h) => h.commandCenterOrder !== undefined)
            .map((helpEntry) => {
            const providerSpecificOptions = {
                ...runOptions,
                includeHelp: provider.prefix === AnythingQuickAccessProvider_1.PREFIX
                    ? false
                    : runOptions?.includeHelp,
            };
            const label = helpEntry.commandCenterLabel ?? helpEntry.description;
            return {
                label,
                description: helpEntry.prefix ?? provider.prefix,
                commandCenterOrder: helpEntry.commandCenterOrder,
                keybinding: helpEntry.commandId
                    ? this.keybindingService.lookupKeybinding(helpEntry.commandId)
                    : undefined,
                ariaLabel: localize('helpPickAriaLabel', '{0}, {1}', label, helpEntry.description),
                accept: () => {
                    this.quickInputService.quickAccess.show(provider.prefix, {
                        preserveValue: true,
                        providerOptions: providerSpecificOptions,
                    });
                },
            };
        }));
        // TODO: There has to be a better place for this, but it's the first time we are adding a non-quick access provider
        // to the command center, so for now, let's do this.
        if (this.quickChatService.enabled) {
            providers.push({
                label: localize('chat', 'Open Quick Chat'),
                commandCenterOrder: 30,
                keybinding: this.keybindingService.lookupKeybinding(ASK_QUICK_QUESTION_ACTION_ID),
                accept: () => this.quickChatService.toggle(),
            });
        }
        return providers.sort((a, b) => a.commandCenterOrder - b.commandCenterOrder);
    }
    async getWorkspaceSymbolPicks(query, includeSymbols, token) {
        if (!query.normalized || // we need a value for search for
            !includeSymbols || // we need to enable symbols in search
            this.pickState.lastRange // a range is an indicator for just searching for files
        ) {
            return [];
        }
        // Delegate to the existing symbols quick access
        // but skip local results and also do not score
        return this.workspaceSymbolsQuickAccess.getSymbolPicks(query.original, {
            skipLocal: true,
            skipSorting: true,
            delay: AnythingQuickAccessProvider_1.TYPING_SEARCH_DELAY,
        }, token);
    }
    getEditorSymbolPicks(query, disposables, token) {
        const filterSegments = query.original.split(GotoSymbolQuickAccessProvider.PREFIX);
        const filter = filterSegments.length > 1 ? filterSegments[filterSegments.length - 1].trim() : undefined;
        if (typeof filter !== 'string') {
            return null; // we need to be searched for editor symbols via `@`
        }
        const activeGlobalPick = this.pickState.lastGlobalPicks?.active;
        if (!activeGlobalPick) {
            return null; // we need an active global pick to find symbols for
        }
        const activeGlobalResource = activeGlobalPick.resource;
        if (!activeGlobalResource ||
            (!this.fileService.hasProvider(activeGlobalResource) &&
                activeGlobalResource.scheme !== Schemas.untitled)) {
            return null; // we need a resource that we can resolve
        }
        if (activeGlobalPick.label.includes(GotoSymbolQuickAccessProvider.PREFIX) ||
            activeGlobalPick.description?.includes(GotoSymbolQuickAccessProvider.PREFIX)) {
            if (filterSegments.length < 3) {
                return null; // require at least 2 `@` if our active pick contains `@` in label or description
            }
        }
        return this.doGetEditorSymbolPicks(activeGlobalPick, activeGlobalResource, filter, disposables, token);
    }
    async doGetEditorSymbolPicks(activeGlobalPick, activeGlobalResource, filter, disposables, token) {
        // Bring the editor to front to review symbols to go to
        try {
            // we must remember our curret view state to be able to restore
            this.pickState.editorViewState.set();
            // open it
            await this.pickState.editorViewState.openTransientEditor({
                resource: activeGlobalResource,
                options: { preserveFocus: true, revealIfOpened: true, ignoreError: true },
            });
        }
        catch (error) {
            return []; // return if resource cannot be opened
        }
        if (token.isCancellationRequested) {
            return [];
        }
        // Obtain model from resource
        let model = this.modelService.getModel(activeGlobalResource);
        if (!model) {
            try {
                const modelReference = disposables.add(await this.textModelService.createModelReference(activeGlobalResource));
                if (token.isCancellationRequested) {
                    return [];
                }
                model = modelReference.object.textEditorModel;
            }
            catch (error) {
                return []; // return if model cannot be resolved
            }
        }
        // Ask provider for editor symbols
        const editorSymbolPicks = await this.editorSymbolsQuickAccess.getSymbolPicks(model, filter, { extraContainerLabel: stripIcons(activeGlobalPick.label) }, disposables, token);
        if (token.isCancellationRequested) {
            return [];
        }
        return editorSymbolPicks.map((editorSymbolPick) => {
            // Preserve separators
            if (editorSymbolPick.type === 'separator') {
                return editorSymbolPick;
            }
            // Convert editor symbols to anything pick
            return {
                ...editorSymbolPick,
                resource: activeGlobalResource,
                description: editorSymbolPick.description,
                trigger: (buttonIndex, keyMods) => {
                    this.openAnything(activeGlobalResource, {
                        keyMods,
                        range: editorSymbolPick.range?.selection,
                        forceOpenSideBySide: true,
                    });
                    return TriggerAction.CLOSE_PICKER;
                },
                accept: (keyMods, event) => this.openAnything(activeGlobalResource, {
                    keyMods,
                    range: editorSymbolPick.range?.selection,
                    preserveFocus: event.inBackground,
                    forcePinned: event.inBackground,
                }),
            };
        });
    }
    addDecorations(editor, range) {
        this.editorSymbolsQuickAccess.addDecorations(editor, range);
    }
    clearDecorations(editor) {
        this.editorSymbolsQuickAccess.clearDecorations(editor);
    }
    //#endregion
    //#region Helpers
    createAnythingPick(resourceOrEditor, configuration) {
        const isEditorHistoryEntry = !URI.isUri(resourceOrEditor);
        let resource;
        let label;
        let description = undefined;
        let isDirty = undefined;
        let extraClasses;
        let icon = undefined;
        if (isEditorInput(resourceOrEditor)) {
            resource = EditorResourceAccessor.getOriginalUri(resourceOrEditor);
            label = resourceOrEditor.getName();
            description = resourceOrEditor.getDescription();
            isDirty = resourceOrEditor.isDirty() && !resourceOrEditor.isSaving();
            extraClasses = resourceOrEditor.getLabelExtraClasses();
            icon = resourceOrEditor.getIcon();
        }
        else {
            resource = URI.isUri(resourceOrEditor) ? resourceOrEditor : resourceOrEditor.resource;
            const customLabel = this.customEditorLabelService.getName(resource);
            label = customLabel || basenameOrAuthority(resource);
            description = this.labelService.getUriLabel(!!customLabel ? resource : dirname(resource), {
                relative: true,
            });
            isDirty =
                this.workingCopyService.isDirty(resource) &&
                    !this.filesConfigurationService.hasShortAutoSaveDelay(resource);
            extraClasses = [];
        }
        const labelAndDescription = description ? `${label} ${description}` : label;
        const iconClassesValue = new Lazy(() => getIconClasses(this.modelService, this.languageService, resource, undefined, icon).concat(extraClasses));
        const buttonsValue = new Lazy(() => {
            const openSideBySideDirection = configuration.openSideBySideDirection;
            const buttons = [];
            // Open to side / below
            buttons.push({
                iconClass: openSideBySideDirection === 'right'
                    ? ThemeIcon.asClassName(Codicon.splitHorizontal)
                    : ThemeIcon.asClassName(Codicon.splitVertical),
                tooltip: openSideBySideDirection === 'right'
                    ? localize({
                        key: 'openToSide',
                        comment: ['Open this file in a split editor on the left/right side'],
                    }, 'Open to the Side')
                    : localize({
                        key: 'openToBottom',
                        comment: ['Open this file in a split editor on the bottom'],
                    }, 'Open to the Bottom'),
            });
            // Remove from History
            if (isEditorHistoryEntry) {
                buttons.push({
                    iconClass: isDirty
                        ? 'dirty-anything ' + ThemeIcon.asClassName(Codicon.circleFilled)
                        : ThemeIcon.asClassName(Codicon.close),
                    tooltip: localize('closeEditor', 'Remove from Recently Opened'),
                    alwaysVisible: isDirty,
                });
            }
            return buttons;
        });
        return {
            resource,
            label,
            ariaLabel: isDirty
                ? localize('filePickAriaLabelDirty', '{0} unsaved changes', labelAndDescription)
                : labelAndDescription,
            description,
            get iconClasses() {
                return iconClassesValue.value;
            },
            get buttons() {
                return buttonsValue.value;
            },
            trigger: (buttonIndex, keyMods) => {
                switch (buttonIndex) {
                    // Open to side / below
                    case 0:
                        this.openAnything(resourceOrEditor, {
                            keyMods,
                            range: this.pickState.lastRange,
                            forceOpenSideBySide: true,
                        });
                        return TriggerAction.CLOSE_PICKER;
                    // Remove from History
                    case 1:
                        if (!URI.isUri(resourceOrEditor)) {
                            this.historyService.removeFromHistory(resourceOrEditor);
                            return TriggerAction.REMOVE_ITEM;
                        }
                }
                return TriggerAction.NO_ACTION;
            },
            accept: (keyMods, event) => this.openAnything(resourceOrEditor, {
                keyMods,
                range: this.pickState.lastRange,
                preserveFocus: event.inBackground,
                forcePinned: event.inBackground,
            }),
        };
    }
    async openAnything(resourceOrEditor, options) {
        // Craft some editor options based on quick access usage
        const editorOptions = {
            preserveFocus: options.preserveFocus,
            pinned: options.keyMods?.ctrlCmd || options.forcePinned || this.configuration.openEditorPinned,
            selection: options.range ? Range.collapseToStart(options.range) : undefined,
        };
        const targetGroup = options.keyMods?.alt ||
            (this.configuration.openEditorPinned && options.keyMods?.ctrlCmd) ||
            options.forceOpenSideBySide
            ? SIDE_GROUP
            : ACTIVE_GROUP;
        // Restore any view state if the target is the side group
        if (targetGroup === SIDE_GROUP) {
            await this.pickState.editorViewState.restore();
        }
        // Open editor (typed)
        if (isEditorInput(resourceOrEditor)) {
            await this.editorService.openEditor(resourceOrEditor, editorOptions, targetGroup);
        }
        // Open editor (untyped)
        else {
            let resourceEditorInput;
            if (URI.isUri(resourceOrEditor)) {
                resourceEditorInput = {
                    resource: resourceOrEditor,
                    options: editorOptions,
                };
            }
            else {
                resourceEditorInput = {
                    ...resourceOrEditor,
                    options: {
                        ...resourceOrEditor.options,
                        ...editorOptions,
                    },
                };
            }
            await this.editorService.openEditor(resourceEditorInput, targetGroup);
        }
    }
};
AnythingQuickAccessProvider = AnythingQuickAccessProvider_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, ISearchService),
    __param(2, IWorkspaceContextService),
    __param(3, IPathService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, IFileService),
    __param(6, ILabelService),
    __param(7, IModelService),
    __param(8, ILanguageService),
    __param(9, IWorkingCopyService),
    __param(10, IConfigurationService),
    __param(11, IEditorService),
    __param(12, IHistoryService),
    __param(13, IFilesConfigurationService),
    __param(14, ITextModelService),
    __param(15, IUriIdentityService),
    __param(16, IQuickInputService),
    __param(17, IKeybindingService),
    __param(18, IQuickChatService),
    __param(19, ILogService),
    __param(20, ICustomEditorLabelService)
], AnythingQuickAccessProvider);
export { AnythingQuickAccessProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW55dGhpbmdRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvYW55dGhpbmdRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBR04sMkJBQTJCLEVBQzNCLDJCQUEyQixFQUczQixvQkFBb0IsRUFDcEIsa0JBQWtCLEdBRWxCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUVOLHlCQUF5QixFQUN6QixhQUFhLEdBSWIsTUFBTSw4REFBOEQsQ0FBQTtBQUNyRSxPQUFPLEVBQ04sWUFBWSxFQUVaLHdCQUF3QixFQUN4QixjQUFjLEdBRWQsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBRU4sWUFBWSxHQUNaLE1BQU0saURBQWlELENBQUE7QUFDeEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUNOLGdDQUFnQyxFQUNoQyxzQkFBc0IsR0FFdEIsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLEVBQUUsY0FBYyxFQUFtQixNQUFNLDJDQUEyQyxDQUFBO0FBQzNGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDM0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0NB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