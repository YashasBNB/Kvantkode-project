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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW55dGhpbmdRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL2FueXRoaW5nUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUdOLDJCQUEyQixFQUMzQiwyQkFBMkIsRUFHM0Isb0JBQW9CLEVBQ3BCLGtCQUFrQixHQUVsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFFTix5QkFBeUIsRUFDekIsYUFBYSxHQUliLE1BQU0sOERBQThELENBQUE7QUFDckUsT0FBTyxFQUNOLFlBQVksRUFFWix3QkFBd0IsRUFDeEIsY0FBYyxHQUVkLE1BQU0sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyxFQUVOLFlBQVksR0FDWixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTixnQ0FBZ0MsRUFDaEMsc0JBQXNCLEdBRXRCLE1BQU0scUJBQXFCLENBQUE7QUFDNUIsT0FBTyxFQUFFLGNBQWMsRUFBbUIsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMzRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3BHLE9BQU8sRUFB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