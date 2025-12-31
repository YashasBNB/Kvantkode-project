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
var SearchView_1;
import * as dom from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { ObjectTreeElementCollapseState, } from '../../../../base/browser/ui/tree/tree.js';
import { Delayer, RunOnceScheduler, Throttler } from '../../../../base/common/async.js';
import * as errors from '../../../../base/common/errors.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import * as env from '../../../../base/common/platform.js';
import * as strings from '../../../../base/common/strings.js';
import { URI } from '../../../../base/common/uri.js';
import * as network from '../../../../base/common/network.js';
import './media/searchview.css';
import { getCodeEditor, isCodeEditor, isDiffEditor, } from '../../../../editor/browser/editorBrowser.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { EmbeddedCodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import { CommonFindController } from '../../../../editor/contrib/find/browser/findController.js';
import { MultiCursorSelectionController } from '../../../../editor/contrib/multicursor/browser/multicursor.js';
import * as nls from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService, } from '../../../../platform/contextview/browser/contextView.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService, } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { getSelectionKeyboardEvent, WorkbenchCompressibleAsyncDataTree, } from '../../../../platform/list/browser/listService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService, withSelection } from '../../../../platform/opener/common/opener.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { defaultInputBoxStyles, defaultToggleStyles, } from '../../../../platform/theme/browser/defaultStyles.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { OpenFileFolderAction, OpenFolderAction, } from '../../../browser/actions/workspaceActions.js';
import { ResourceListDnDHandler } from '../../../browser/dnd.js';
import { ResourceLabels } from '../../../browser/labels.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { Memento } from '../../../common/memento.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { NotebookEditor } from '../../notebook/browser/notebookEditor.js';
import { ExcludePatternInputWidget, IncludePatternInputWidget } from './patternInputWidget.js';
import { appendKeyBindingLabel } from './searchActionsBase.js';
import { searchDetailsIcon } from './searchIcons.js';
import { renderSearchMessage } from './searchMessage.js';
import { FileMatchRenderer, FolderMatchRenderer, MatchRenderer, SearchAccessibilityProvider, SearchDelegate, TextSearchResultRenderer, } from './searchResultsView.js';
import { SearchWidget } from './searchWidget.js';
import * as Constants from '../common/constants.js';
import { IReplaceService } from './replace.js';
import { getOutOfWorkspaceEditorResources, SearchStateKey, SearchUIState, } from '../common/search.js';
import { ISearchHistoryService, SearchHistoryService, } from '../common/searchHistoryService.js';
import { createEditorFromSearchResult } from '../../searchEditor/browser/searchEditorActions.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP, } from '../../../services/editor/common/editorService.js';
import { IPreferencesService, } from '../../../services/preferences/common/preferences.js';
import { QueryBuilder, } from '../../../services/search/common/queryBuilder.js';
import { ISearchService, TextSearchCompleteMessageType, } from '../../../services/search/common/search.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { INotebookService } from '../../notebook/common/notebookService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { ISearchViewModelWorkbenchService } from './searchTreeModel/searchViewModelWorkbenchService.js';
import { isSearchTreeMatch, SearchModelLocation, isSearchTreeFileMatch, isSearchTreeFolderMatch, isSearchTreeFolderMatchNoRoot, isSearchTreeFolderMatchWithResource, isSearchTreeFolderMatchWorkspaceRoot, isSearchResult, isTextSearchHeading, isSearchHeader, } from './searchTreeModel/searchTreeCommon.js';
import { isIMatchInNotebook, } from './notebookSearch/notebookSearchModelBase.js';
import { searchMatchComparer } from './searchCompare.js';
import { AIFolderMatchWorkspaceRootImpl } from './AISearch/aiSearchModel.js';
const $ = dom.$;
export var SearchViewPosition;
(function (SearchViewPosition) {
    SearchViewPosition[SearchViewPosition["SideBar"] = 0] = "SideBar";
    SearchViewPosition[SearchViewPosition["Panel"] = 1] = "Panel";
})(SearchViewPosition || (SearchViewPosition = {}));
const SEARCH_CANCELLED_MESSAGE = nls.localize('searchCanceled', 'Search was canceled before any results could be found - ');
const DEBOUNCE_DELAY = 75;
let SearchView = class SearchView extends ViewPane {
    static { SearchView_1 = this; }
    static { this.ACTIONS_RIGHT_CLASS_NAME = 'actions-right'; }
    constructor(options, fileService, editorService, codeEditorService, progressService, notificationService, dialogService, commandService, contextViewService, instantiationService, viewDescriptorService, configurationService, contextService, searchViewModelWorkbenchService, contextKeyService, replaceService, textFileService, preferencesService, themeService, searchHistoryService, contextMenuService, accessibilityService, keybindingService, storageService, searchService, openerService, hoverService, notebookService, logService, accessibilitySignalService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.fileService = fileService;
        this.editorService = editorService;
        this.codeEditorService = codeEditorService;
        this.progressService = progressService;
        this.notificationService = notificationService;
        this.dialogService = dialogService;
        this.commandService = commandService;
        this.contextViewService = contextViewService;
        this.contextService = contextService;
        this.searchViewModelWorkbenchService = searchViewModelWorkbenchService;
        this.replaceService = replaceService;
        this.textFileService = textFileService;
        this.preferencesService = preferencesService;
        this.searchHistoryService = searchHistoryService;
        this.accessibilityService = accessibilityService;
        this.storageService = storageService;
        this.searchService = searchService;
        this.notebookService = notebookService;
        this.logService = logService;
        this.accessibilitySignalService = accessibilitySignalService;
        this.isDisposed = false;
        this.lastFocusState = 'input';
        this.messageDisposables = new DisposableStore();
        this.currentSearchQ = Promise.resolve();
        this.pauseSearching = false;
        this._visibleMatches = 0;
        this.container = dom.$('.search-view');
        // globals
        this.viewletVisible = Constants.SearchContext.SearchViewVisibleKey.bindTo(this.contextKeyService);
        this.firstMatchFocused = Constants.SearchContext.FirstMatchFocusKey.bindTo(this.contextKeyService);
        this.fileMatchOrMatchFocused = Constants.SearchContext.FileMatchOrMatchFocusKey.bindTo(this.contextKeyService);
        this.fileMatchOrFolderMatchFocus =
            Constants.SearchContext.FileMatchOrFolderMatchFocusKey.bindTo(this.contextKeyService);
        this.fileMatchOrFolderMatchWithResourceFocus =
            Constants.SearchContext.FileMatchOrFolderMatchWithResourceFocusKey.bindTo(this.contextKeyService);
        this.fileMatchFocused = Constants.SearchContext.FileFocusKey.bindTo(this.contextKeyService);
        this.folderMatchFocused = Constants.SearchContext.FolderFocusKey.bindTo(this.contextKeyService);
        this.folderMatchWithResourceFocused = Constants.SearchContext.ResourceFolderFocusKey.bindTo(this.contextKeyService);
        this.searchResultHeaderFocused = Constants.SearchContext.SearchResultHeaderFocused.bindTo(this.contextKeyService);
        this.hasSearchResultsKey = Constants.SearchContext.HasSearchResults.bindTo(this.contextKeyService);
        this.matchFocused = Constants.SearchContext.MatchFocusKey.bindTo(this.contextKeyService);
        this.searchStateKey = SearchStateKey.bindTo(this.contextKeyService);
        this.hasSearchPatternKey = Constants.SearchContext.ViewHasSearchPatternKey.bindTo(this.contextKeyService);
        this.hasReplacePatternKey = Constants.SearchContext.ViewHasReplacePatternKey.bindTo(this.contextKeyService);
        this.hasFilePatternKey = Constants.SearchContext.ViewHasFilePatternKey.bindTo(this.contextKeyService);
        this.hasSomeCollapsibleResultKey = Constants.SearchContext.ViewHasSomeCollapsibleKey.bindTo(this.contextKeyService);
        this.treeViewKey = Constants.SearchContext.InTreeViewKey.bindTo(this.contextKeyService);
        this.refreshTreeController = this._register(this.instantiationService.createInstance(RefreshTreeController, this, () => this.searchConfig));
        this._register(this.contextKeyService.onDidChangeContext((e) => {
            const keys = Constants.SearchContext.hasAIResultProvider.keys();
            if (e.affectsSome(new Set(keys))) {
                this.refreshHasAISetting();
            }
        }));
        // scoped
        this.contextKeyService = this._register(this.contextKeyService.createScoped(this.container));
        Constants.SearchContext.SearchViewFocusedKey.bindTo(this.contextKeyService).set(true);
        this.inputBoxFocused = Constants.SearchContext.InputBoxFocusedKey.bindTo(this.contextKeyService);
        this.inputPatternIncludesFocused = Constants.SearchContext.PatternIncludesFocusedKey.bindTo(this.contextKeyService);
        this.inputPatternExclusionsFocused = Constants.SearchContext.PatternExcludesFocusedKey.bindTo(this.contextKeyService);
        this.isEditableItem = Constants.SearchContext.IsEditableItemKey.bindTo(this.contextKeyService);
        this.instantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.contextKeyService])));
        this._register(this.configurationService.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('search.sortOrder')) {
                if (this.searchConfig.sortOrder === "modified" /* SearchSortOrder.Modified */) {
                    // If changing away from modified, remove all fileStats
                    // so that updated files are re-retrieved next time.
                    this.removeFileStats();
                }
                await this.refreshTreeController.queue();
            }
        }));
        this.viewModel = this.searchViewModelWorkbenchService.searchModel;
        this.queryBuilder = this.instantiationService.createInstance(QueryBuilder);
        this.memento = new Memento(this.id, storageService);
        this.viewletState = this.memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        this._register(this.fileService.onDidFilesChange((e) => this.onFilesChanged(e)));
        this._register(this.textFileService.untitled.onWillDispose((model) => this.onUntitledDidDispose(model.resource)));
        this._register(this.contextService.onDidChangeWorkbenchState(() => this.onDidChangeWorkbenchState()));
        this._register(this.searchHistoryService.onDidClearHistory(() => this.clearHistory()));
        this._register(this.configurationService.onDidChangeConfiguration((e) => this.onConfigurationUpdated(e)));
        this.delayedRefresh = this._register(new Delayer(250));
        this.addToSearchHistoryDelayer = this._register(new Delayer(2000));
        this.toggleCollapseStateDelayer = this._register(new Delayer(100));
        this.triggerQueryDelayer = this._register(new Delayer(0));
        this.treeAccessibilityProvider = this.instantiationService.createInstance(SearchAccessibilityProvider, this);
        this.isTreeLayoutViewVisible =
            this.viewletState['view.treeLayout'] ?? this.searchConfig.defaultViewMode === "tree" /* ViewMode.Tree */;
        this._refreshResultsScheduler = this._register(new RunOnceScheduler(this._updateResults.bind(this), 80));
        // storage service listener for for roaming changes
        this._register(this.storageService.onWillSaveState(() => {
            this._saveSearchHistoryService();
        }));
        this._register(this.storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, SearchHistoryService.SEARCH_HISTORY_KEY, this._store)(() => {
            const restoredHistory = this.searchHistoryService.load();
            if (restoredHistory.include) {
                this.inputPatternIncludes.prependHistory(restoredHistory.include);
            }
            if (restoredHistory.exclude) {
                this.inputPatternExcludes.prependHistory(restoredHistory.exclude);
            }
            if (restoredHistory.search) {
                this.searchWidget.prependSearchHistory(restoredHistory.search);
            }
            if (restoredHistory.replace) {
                this.searchWidget.prependReplaceHistory(restoredHistory.replace);
            }
        }));
        this.changedWhileHidden = this.hasSearchResults();
    }
    async queueRefreshTree() {
        return this.refreshTreeController.queue();
    }
    get isTreeLayoutViewVisible() {
        return this.treeViewKey.get() ?? false;
    }
    set isTreeLayoutViewVisible(visible) {
        this.treeViewKey.set(visible);
    }
    async setTreeView(visible) {
        if (visible === this.isTreeLayoutViewVisible) {
            return;
        }
        this.isTreeLayoutViewVisible = visible;
        this.updateIndentStyles(this.themeService.getFileIconTheme());
        return this.refreshTreeController.queue();
    }
    get state() {
        return this.searchStateKey.get() ?? SearchUIState.Idle;
    }
    set state(v) {
        this.searchStateKey.set(v);
    }
    getContainer() {
        return this.container;
    }
    get searchResult() {
        return this.viewModel && this.viewModel.searchResult;
    }
    get model() {
        return this.viewModel;
    }
    async refreshHasAISetting() {
        const shouldShowAI = this.shouldShowAIResults();
        if (!this.tree.hasNode(this.searchResult)) {
            return;
        }
        if (shouldShowAI && !this.tree.hasNode(this.searchResult.aiTextSearchResult)) {
            if (this.model.searchResult.getCachedSearchComplete(false)) {
                return this.refreshAndUpdateCount();
            }
        }
        else if (!shouldShowAI && this.tree.hasNode(this.searchResult.aiTextSearchResult)) {
            return this.refreshAndUpdateCount();
        }
    }
    onDidChangeWorkbenchState() {
        if (this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */ &&
            this.searchWithoutFolderMessageElement) {
            dom.hide(this.searchWithoutFolderMessageElement);
        }
    }
    refreshInputs() {
        this.pauseSearching = true;
        this.searchWidget.setValue(this.viewModel.searchResult.query?.contentPattern.pattern ?? '');
        this.searchWidget.setReplaceAllActionState(false);
        this.searchWidget.toggleReplace(true);
        this.inputPatternIncludes.setOnlySearchInOpenEditors(this.viewModel.searchResult.query?.onlyOpenEditors || false);
        this.inputPatternExcludes.setUseExcludesAndIgnoreFiles(!this.viewModel.searchResult.query?.userDisabledExcludesAndIgnoreFiles || true);
        this.searchIncludePattern.setValue('');
        this.searchExcludePattern.setValue('');
        this.pauseSearching = false;
    }
    async replaceSearchModel(searchModel, asyncResults) {
        let progressComplete;
        this.progressService.withProgress({ location: this.getProgressLocation(), delay: 0 }, (_progress) => {
            return new Promise((resolve) => (progressComplete = resolve));
        });
        const slowTimer = setTimeout(() => {
            this.state = SearchUIState.SlowSearch;
        }, 2000);
        this._refreshResultsScheduler.schedule();
        // remove old model and use the new searchModel
        searchModel.location = SearchModelLocation.PANEL;
        searchModel.replaceActive = this.viewModel.isReplaceActive();
        searchModel.replaceString = this.searchWidget.getReplaceValue();
        this._onSearchResultChangedDisposable?.dispose();
        this._onSearchResultChangedDisposable = this._register(searchModel.onSearchResultChanged(async (event) => this.onSearchResultsChanged(event)));
        // this call will also dispose of the old model
        this.searchViewModelWorkbenchService.searchModel = searchModel;
        this.viewModel = searchModel;
        this.tree.setInput(this.viewModel.searchResult);
        await this.onSearchResultsChanged();
        this.refreshInputs();
        asyncResults.then((complete) => {
            clearTimeout(slowTimer);
            return this.onSearchComplete(progressComplete, undefined, undefined, complete);
        }, (e) => {
            clearTimeout(slowTimer);
            return this.onSearchError(e, progressComplete, undefined, undefined);
        });
        await this.expandIfSingularResult();
    }
    renderBody(parent) {
        super.renderBody(parent);
        this.container = dom.append(parent, dom.$('.search-view'));
        this.searchWidgetsContainerElement = dom.append(this.container, $('.search-widgets-container'));
        this.createSearchWidget(this.searchWidgetsContainerElement);
        const history = this.searchHistoryService.load();
        const filePatterns = this.viewletState['query.filePatterns'] || '';
        const patternExclusions = this.viewletState['query.folderExclusions'] || '';
        const patternExclusionsHistory = history.exclude || [];
        const patternIncludes = this.viewletState['query.folderIncludes'] || '';
        const patternIncludesHistory = history.include || [];
        const onlyOpenEditors = this.viewletState['query.onlyOpenEditors'] || false;
        const queryDetailsExpanded = this.viewletState['query.queryDetailsExpanded'] || '';
        const useExcludesAndIgnoreFiles = typeof this.viewletState['query.useExcludesAndIgnoreFiles'] === 'boolean'
            ? this.viewletState['query.useExcludesAndIgnoreFiles']
            : true;
        this.queryDetails = dom.append(this.searchWidgetsContainerElement, $('.query-details'));
        // Toggle query details button
        const toggleQueryDetailsLabel = nls.localize('moreSearch', 'Toggle Search Details');
        this.toggleQueryDetailsButton = dom.append(this.queryDetails, $('.more' + ThemeIcon.asCSSSelector(searchDetailsIcon), {
            tabindex: 0,
            role: 'button',
            'aria-label': toggleQueryDetailsLabel,
        }));
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), this.toggleQueryDetailsButton, toggleQueryDetailsLabel));
        this._register(dom.addDisposableListener(this.toggleQueryDetailsButton, dom.EventType.CLICK, (e) => {
            dom.EventHelper.stop(e);
            this.toggleQueryDetails(!this.accessibilityService.isScreenReaderOptimized());
        }));
        this._register(dom.addDisposableListener(this.toggleQueryDetailsButton, dom.EventType.KEY_UP, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                dom.EventHelper.stop(e);
                this.toggleQueryDetails(false);
            }
        }));
        this._register(dom.addDisposableListener(this.toggleQueryDetailsButton, dom.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */)) {
                if (this.searchWidget.isReplaceActive()) {
                    this.searchWidget.focusReplaceAllAction();
                }
                else {
                    this.searchWidget.isReplaceShown()
                        ? this.searchWidget.replaceInput?.focusOnPreserve()
                        : this.searchWidget.focusRegexAction();
                }
                dom.EventHelper.stop(e);
            }
        }));
        // folder includes list
        const folderIncludesList = dom.append(this.queryDetails, $('.file-types.includes'));
        const filesToIncludeTitle = nls.localize('searchScope.includes', 'files to include');
        dom.append(folderIncludesList, $('h4', undefined, filesToIncludeTitle));
        this.inputPatternIncludes = this._register(this.instantiationService.createInstance(IncludePatternInputWidget, folderIncludesList, this.contextViewService, {
            ariaLabel: filesToIncludeTitle,
            placeholder: nls.localize('placeholder.includes', 'e.g. *.ts, src/**/include'),
            showPlaceholderOnFocus: true,
            history: patternIncludesHistory,
            inputBoxStyles: defaultInputBoxStyles,
        }));
        this.inputPatternIncludes.setValue(patternIncludes);
        this.inputPatternIncludes.setOnlySearchInOpenEditors(onlyOpenEditors);
        this._register(this.inputPatternIncludes.onCancel(() => this.cancelSearch(false)));
        this._register(this.inputPatternIncludes.onChangeSearchInEditorsBox(() => this.triggerQueryChange()));
        this.trackInputBox(this.inputPatternIncludes.inputFocusTracker, this.inputPatternIncludesFocused);
        // excludes list
        const excludesList = dom.append(this.queryDetails, $('.file-types.excludes'));
        const excludesTitle = nls.localize('searchScope.excludes', 'files to exclude');
        dom.append(excludesList, $('h4', undefined, excludesTitle));
        this.inputPatternExcludes = this._register(this.instantiationService.createInstance(ExcludePatternInputWidget, excludesList, this.contextViewService, {
            ariaLabel: excludesTitle,
            placeholder: nls.localize('placeholder.excludes', 'e.g. *.ts, src/**/exclude'),
            showPlaceholderOnFocus: true,
            history: patternExclusionsHistory,
            inputBoxStyles: defaultInputBoxStyles,
        }));
        this.inputPatternExcludes.setValue(patternExclusions);
        this.inputPatternExcludes.setUseExcludesAndIgnoreFiles(useExcludesAndIgnoreFiles);
        this._register(this.inputPatternExcludes.onCancel(() => this.cancelSearch(false)));
        this._register(this.inputPatternExcludes.onChangeIgnoreBox(() => this.triggerQueryChange()));
        this.trackInputBox(this.inputPatternExcludes.inputFocusTracker, this.inputPatternExclusionsFocused);
        const updateHasFilePatternKey = () => this.hasFilePatternKey.set(this.inputPatternIncludes.getValue().length > 0 ||
            this.inputPatternExcludes.getValue().length > 0);
        updateHasFilePatternKey();
        const onFilePatternSubmit = (triggeredOnType) => {
            this.triggerQueryChange({
                triggeredOnType,
                delay: this.searchConfig.searchOnTypeDebouncePeriod,
            });
            if (triggeredOnType) {
                updateHasFilePatternKey();
            }
        };
        this._register(this.inputPatternIncludes.onSubmit(onFilePatternSubmit));
        this._register(this.inputPatternExcludes.onSubmit(onFilePatternSubmit));
        this.messagesElement = dom.append(this.container, $('.messages.text-search-provider-messages'));
        if (this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
            this.showSearchWithoutFolderMessage();
        }
        this.createSearchResultsView(this.container);
        if (filePatterns !== '' ||
            patternExclusions !== '' ||
            patternIncludes !== '' ||
            queryDetailsExpanded !== '' ||
            !useExcludesAndIgnoreFiles) {
            this.toggleQueryDetails(true, true, true);
        }
        this._onSearchResultChangedDisposable = this._register(this.viewModel.onSearchResultChanged(async (event) => await this.onSearchResultsChanged(event)));
        this._register(this.onDidChangeBodyVisibility((visible) => this.onVisibilityChanged(visible)));
        this.updateIndentStyles(this.themeService.getFileIconTheme());
        this._register(this.themeService.onDidFileIconThemeChange(this.updateIndentStyles, this));
    }
    updateIndentStyles(theme) {
        this.resultsElement.classList.toggle('hide-arrows', this.isTreeLayoutViewVisible && theme.hidesExplorerArrows);
    }
    async onVisibilityChanged(visible) {
        this.viewletVisible.set(visible);
        if (visible) {
            if (this.changedWhileHidden) {
                // Render if results changed while viewlet was hidden - #37818
                await this.refreshAndUpdateCount();
                this.changedWhileHidden = false;
            }
        }
        else {
            // Reset last focus to input to preserve opening the viewlet always focusing the query editor.
            this.lastFocusState = 'input';
        }
        // Enable highlights if there are searchresults
        this.viewModel?.searchResult.toggleHighlights(visible);
    }
    get searchAndReplaceWidget() {
        return this.searchWidget;
    }
    get searchIncludePattern() {
        return this.inputPatternIncludes;
    }
    get searchExcludePattern() {
        return this.inputPatternExcludes;
    }
    createSearchWidget(container) {
        const contentPattern = this.viewletState['query.contentPattern'] || '';
        const replaceText = this.viewletState['query.replaceText'] || '';
        const isRegex = this.viewletState['query.regex'] === true;
        const isWholeWords = this.viewletState['query.wholeWords'] === true;
        const isCaseSensitive = this.viewletState['query.caseSensitive'] === true;
        const history = this.searchHistoryService.load();
        const searchHistory = history.search || this.viewletState['query.searchHistory'] || [];
        const replaceHistory = history.replace || this.viewletState['query.replaceHistory'] || [];
        const showReplace = typeof this.viewletState['view.showReplace'] === 'boolean'
            ? this.viewletState['view.showReplace']
            : true;
        const preserveCase = this.viewletState['query.preserveCase'] === true;
        const isInNotebookMarkdownInput = this.viewletState['query.isInNotebookMarkdownInput'] ?? true;
        const isInNotebookMarkdownPreview = this.viewletState['query.isInNotebookMarkdownPreview'] ?? true;
        const isInNotebookCellInput = this.viewletState['query.isInNotebookCellInput'] ?? true;
        const isInNotebookCellOutput = this.viewletState['query.isInNotebookCellOutput'] ?? true;
        this.searchWidget = this._register(this.instantiationService.createInstance(SearchWidget, container, {
            value: contentPattern,
            replaceValue: replaceText,
            isRegex: isRegex,
            isCaseSensitive: isCaseSensitive,
            isWholeWords: isWholeWords,
            searchHistory: searchHistory,
            replaceHistory: replaceHistory,
            preserveCase: preserveCase,
            inputBoxStyles: defaultInputBoxStyles,
            toggleStyles: defaultToggleStyles,
            notebookOptions: {
                isInNotebookMarkdownInput,
                isInNotebookMarkdownPreview,
                isInNotebookCellInput,
                isInNotebookCellOutput,
            },
        }));
        if (!this.searchWidget.searchInput || !this.searchWidget.replaceInput) {
            this.logService.warn(`Cannot fully create search widget. Search or replace input undefined. SearchInput: ${this.searchWidget.searchInput}, ReplaceInput: ${this.searchWidget.replaceInput}`);
            return;
        }
        if (showReplace) {
            this.searchWidget.toggleReplace(true);
        }
        this._register(this.searchWidget.onSearchSubmit((options) => this.triggerQueryChange(options)));
        this._register(this.searchWidget.onSearchCancel(({ focus }) => this.cancelSearch(focus)));
        this._register(this.searchWidget.searchInput.onDidOptionChange(() => {
            this.triggerQueryChange({ shouldKeepAIResults: true });
        }));
        this._register(this.searchWidget
            .getNotebookFilters()
            .onDidChange(() => this.triggerQueryChange({ shouldKeepAIResults: true })));
        const updateHasPatternKey = () => this.hasSearchPatternKey.set(this.searchWidget.searchInput ? this.searchWidget.searchInput.getValue().length > 0 : false);
        updateHasPatternKey();
        this._register(this.searchWidget.searchInput.onDidChange(() => updateHasPatternKey()));
        const updateHasReplacePatternKey = () => this.hasReplacePatternKey.set(this.searchWidget.getReplaceValue().length > 0);
        updateHasReplacePatternKey();
        this._register(this.searchWidget.replaceInput.inputBox.onDidChange(() => updateHasReplacePatternKey()));
        this._register(this.searchWidget.onDidHeightChange(() => this.reLayout()));
        this._register(this.searchWidget.onReplaceToggled(() => this.reLayout()));
        this._register(this.searchWidget.onReplaceStateChange(async (state) => {
            this.viewModel.replaceActive = state;
            await this.refreshTreeController.queue();
        }));
        this._register(this.searchWidget.onPreserveCaseChange(async (state) => {
            this.viewModel.preserveCase = state;
            await this.refreshTreeController.queue();
        }));
        this._register(this.searchWidget.onReplaceValueChanged(() => {
            this.viewModel.replaceString = this.searchWidget.getReplaceValue();
            this.delayedRefresh.trigger(async () => this.refreshTreeController.queue());
        }));
        this._register(this.searchWidget.onBlur(() => {
            this.toggleQueryDetailsButton.focus();
        }));
        this._register(this.searchWidget.onReplaceAll(() => this.replaceAll()));
        this.trackInputBox(this.searchWidget.searchInputFocusTracker);
        this.trackInputBox(this.searchWidget.replaceInputFocusTracker);
    }
    shouldShowAIResults() {
        const hasProvider = Constants.SearchContext.hasAIResultProvider.getValue(this.contextKeyService);
        return !!hasProvider;
    }
    async onConfigurationUpdated(event) {
        if (event &&
            (event.affectsConfiguration('search.decorations.colors') ||
                event.affectsConfiguration('search.decorations.badges'))) {
            return this.refreshTreeController.queue();
        }
    }
    trackInputBox(inputFocusTracker, contextKey) {
        if (!inputFocusTracker) {
            return;
        }
        this._register(inputFocusTracker.onDidFocus(() => {
            this.lastFocusState = 'input';
            this.inputBoxFocused.set(true);
            contextKey?.set(true);
        }));
        this._register(inputFocusTracker.onDidBlur(() => {
            this.inputBoxFocused.set(this.searchWidget.searchInputHasFocus() ||
                this.searchWidget.replaceInputHasFocus() ||
                this.inputPatternIncludes.inputHasFocus() ||
                this.inputPatternExcludes.inputHasFocus());
            contextKey?.set(false);
        }));
    }
    async onSearchResultsChanged(event) {
        if (this.isVisible()) {
            return this.refreshAndUpdateCount(event);
        }
        else {
            this.changedWhileHidden = true;
        }
    }
    async refreshAndUpdateCount(event) {
        this.searchWidget.setReplaceAllActionState(!this.viewModel.searchResult.isEmpty());
        this.updateSearchResultCount(this.viewModel.searchResult.query.userDisabledExcludesAndIgnoreFiles, this.viewModel.searchResult.query?.onlyOpenEditors, event?.clearingAll);
        return this.refreshTreeController.queue(event);
    }
    originalShouldCollapse(match) {
        const collapseResults = this.searchConfig.collapseResults;
        return collapseResults === 'alwaysCollapse' ||
            (!isSearchTreeMatch(match) && match.count() > 10 && collapseResults !== 'alwaysExpand')
            ? ObjectTreeElementCollapseState.PreserveOrCollapsed
            : ObjectTreeElementCollapseState.PreserveOrExpanded;
    }
    shouldCollapseAccordingToConfig(match) {
        const collapseResults = this.originalShouldCollapse(match);
        if (collapseResults === ObjectTreeElementCollapseState.PreserveOrCollapsed) {
            return true;
        }
        return false;
    }
    replaceAll() {
        if (this.viewModel.searchResult.count() === 0) {
            return;
        }
        const occurrences = this.viewModel.searchResult.count();
        const fileCount = this.viewModel.searchResult.fileCount();
        const replaceValue = this.searchWidget.getReplaceValue() || '';
        const afterReplaceAllMessage = this.buildAfterReplaceAllMessage(occurrences, fileCount, replaceValue);
        let progressComplete;
        let progressReporter;
        this.progressService.withProgress({ location: this.getProgressLocation(), delay: 100, total: occurrences }, (p) => {
            progressReporter = p;
            return new Promise((resolve) => (progressComplete = resolve));
        });
        const confirmation = {
            title: nls.localize('replaceAll.confirmation.title', 'Replace All'),
            message: this.buildReplaceAllConfirmationMessage(occurrences, fileCount, replaceValue),
            primaryButton: nls.localize({ key: 'replaceAll.confirm.button', comment: ['&& denotes a mnemonic'] }, '&&Replace'),
        };
        this.dialogService.confirm(confirmation).then((res) => {
            if (res.confirmed) {
                this.searchWidget.setReplaceAllActionState(false);
                this.viewModel.searchResult.replaceAll(progressReporter).then(() => {
                    progressComplete();
                    const messageEl = this.clearMessage();
                    dom.append(messageEl, afterReplaceAllMessage);
                    this.reLayout();
                }, (error) => {
                    progressComplete();
                    errors.isCancellationError(error);
                    this.notificationService.error(error);
                });
            }
            else {
                progressComplete();
            }
        });
    }
    buildAfterReplaceAllMessage(occurrences, fileCount, replaceValue) {
        if (occurrences === 1) {
            if (fileCount === 1) {
                if (replaceValue) {
                    return nls.localize('replaceAll.occurrence.file.message', "Replaced {0} occurrence across {1} file with '{2}'.", occurrences, fileCount, replaceValue);
                }
                return nls.localize('removeAll.occurrence.file.message', 'Replaced {0} occurrence across {1} file.', occurrences, fileCount);
            }
            if (replaceValue) {
                return nls.localize('replaceAll.occurrence.files.message', "Replaced {0} occurrence across {1} files with '{2}'.", occurrences, fileCount, replaceValue);
            }
            return nls.localize('removeAll.occurrence.files.message', 'Replaced {0} occurrence across {1} files.', occurrences, fileCount);
        }
        if (fileCount === 1) {
            if (replaceValue) {
                return nls.localize('replaceAll.occurrences.file.message', "Replaced {0} occurrences across {1} file with '{2}'.", occurrences, fileCount, replaceValue);
            }
            return nls.localize('removeAll.occurrences.file.message', 'Replaced {0} occurrences across {1} file.', occurrences, fileCount);
        }
        if (replaceValue) {
            return nls.localize('replaceAll.occurrences.files.message', "Replaced {0} occurrences across {1} files with '{2}'.", occurrences, fileCount, replaceValue);
        }
        return nls.localize('removeAll.occurrences.files.message', 'Replaced {0} occurrences across {1} files.', occurrences, fileCount);
    }
    buildReplaceAllConfirmationMessage(occurrences, fileCount, replaceValue) {
        if (occurrences === 1) {
            if (fileCount === 1) {
                if (replaceValue) {
                    return nls.localize('removeAll.occurrence.file.confirmation.message', "Replace {0} occurrence across {1} file with '{2}'?", occurrences, fileCount, replaceValue);
                }
                return nls.localize('replaceAll.occurrence.file.confirmation.message', 'Replace {0} occurrence across {1} file?', occurrences, fileCount);
            }
            if (replaceValue) {
                return nls.localize('removeAll.occurrence.files.confirmation.message', "Replace {0} occurrence across {1} files with '{2}'?", occurrences, fileCount, replaceValue);
            }
            return nls.localize('replaceAll.occurrence.files.confirmation.message', 'Replace {0} occurrence across {1} files?', occurrences, fileCount);
        }
        if (fileCount === 1) {
            if (replaceValue) {
                return nls.localize('removeAll.occurrences.file.confirmation.message', "Replace {0} occurrences across {1} file with '{2}'?", occurrences, fileCount, replaceValue);
            }
            return nls.localize('replaceAll.occurrences.file.confirmation.message', 'Replace {0} occurrences across {1} file?', occurrences, fileCount);
        }
        if (replaceValue) {
            return nls.localize('removeAll.occurrences.files.confirmation.message', "Replace {0} occurrences across {1} files with '{2}'?", occurrences, fileCount, replaceValue);
        }
        return nls.localize('replaceAll.occurrences.files.confirmation.message', 'Replace {0} occurrences across {1} files?', occurrences, fileCount);
    }
    clearMessage() {
        this.searchWithoutFolderMessageElement = undefined;
        const wasHidden = this.messagesElement.style.display === 'none';
        dom.clearNode(this.messagesElement);
        dom.show(this.messagesElement);
        this.messageDisposables.clear();
        const newMessage = dom.append(this.messagesElement, $('.message'));
        if (wasHidden) {
            this.reLayout();
        }
        return newMessage;
    }
    createSearchResultsView(container) {
        this.resultsElement = dom.append(container, $('.results.show-file-icons.file-icon-themable-tree'));
        const delegate = this.instantiationService.createInstance(SearchDelegate);
        const identityProvider = {
            getId(element) {
                return element.id();
            },
        };
        this.searchDataSource = this.instantiationService.createInstance(SearchViewDataSource, this);
        this.treeLabels = this._register(this.instantiationService.createInstance(ResourceLabels, {
            onDidChangeVisibility: this.onDidChangeBodyVisibility,
        }));
        this.tree = this._register(this.instantiationService.createInstance((WorkbenchCompressibleAsyncDataTree), 'SearchView', this.resultsElement, delegate, {
            isIncompressible: (element) => {
                if (isSearchTreeFolderMatch(element) &&
                    !isTextSearchHeading(element.parent()) &&
                    !isSearchTreeFolderMatchWorkspaceRoot(element.parent()) &&
                    !isSearchTreeFolderMatchNoRoot(element.parent())) {
                    return false;
                }
                return true;
            },
        }, [
            this._register(this.instantiationService.createInstance(FolderMatchRenderer, this, this.treeLabels)),
            this._register(this.instantiationService.createInstance(FileMatchRenderer, this, this.treeLabels)),
            this._register(this.instantiationService.createInstance(TextSearchResultRenderer, this.treeLabels)),
            this._register(this.instantiationService.createInstance(MatchRenderer, this)),
        ], this.searchDataSource, {
            identityProvider,
            accessibilityProvider: this.treeAccessibilityProvider,
            dnd: this.instantiationService.createInstance(ResourceListDnDHandler, (element) => {
                if (isSearchTreeFileMatch(element)) {
                    return element.resource;
                }
                if (isSearchTreeMatch(element)) {
                    return withSelection(element.parent().resource, element.range());
                }
                return null;
            }),
            multipleSelectionSupport: true,
            selectionNavigation: true,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
            paddingBottom: SearchDelegate.ITEM_HEIGHT,
            collapseByDefault: (e) => {
                if (isTextSearchHeading(e)) {
                    // always collapse the ai text search result, but always expand the text result
                    return e.isAIContributed;
                }
                // always expand compressed nodes
                if (isSearchTreeFolderMatch(e) &&
                    e.matches().length === 1 &&
                    isSearchTreeFolderMatch(e.matches()[0])) {
                    return false;
                }
                return this.shouldCollapseAccordingToConfig(e);
            },
        }));
        Constants.SearchContext.SearchResultListFocusedKey.bindTo(this.tree.contextKeyService);
        this.tree.setInput(this.viewModel.searchResult);
        this._register(this.tree.onContextMenu((e) => this.onContextMenu(e)));
        const updateHasSomeCollapsible = () => this.toggleCollapseStateDelayer.trigger(() => this.hasSomeCollapsibleResultKey.set(this.hasSomeCollapsible()));
        updateHasSomeCollapsible();
        this._register(this.tree.onDidChangeCollapseState(() => updateHasSomeCollapsible()));
        this._register(this.tree.onDidChangeModel(() => updateHasSomeCollapsible()));
        this._register(Event.debounce(this.tree.onDidOpen, (last, event) => event, DEBOUNCE_DELAY, true)((options) => {
            if (isSearchTreeMatch(options.element)) {
                const selectedMatch = options.element;
                this.currentSelectedFileMatch?.setSelectedMatch(null);
                this.currentSelectedFileMatch = selectedMatch.parent();
                this.currentSelectedFileMatch.setSelectedMatch(selectedMatch);
                this.onFocus(selectedMatch, options.editorOptions.preserveFocus, options.sideBySide, options.editorOptions.pinned);
            }
        }));
        this._register(Event.debounce(this.tree.onDidChangeFocus, (last, event) => event, DEBOUNCE_DELAY, true)(() => {
            const selection = this.tree.getSelection();
            const focus = this.tree.getFocus()[0];
            if (selection.length > 1 && isSearchTreeMatch(focus)) {
                this.onFocus(focus, true);
            }
        }));
        this._register(Event.any(this.tree.onDidFocus, this.tree.onDidChangeFocus)(() => {
            const focus = this.tree.getFocus()[0];
            if (this.tree.isDOMFocused()) {
                const firstElem = this.tree.getFirstElementChild(this.tree.getInput());
                this.firstMatchFocused.set(firstElem === focus);
                this.fileMatchOrMatchFocused.set(!!focus);
                this.fileMatchFocused.set(isSearchTreeFileMatch(focus));
                this.folderMatchFocused.set(isSearchTreeFolderMatch(focus));
                this.matchFocused.set(isSearchTreeMatch(focus));
                this.fileMatchOrFolderMatchFocus.set(isSearchTreeFileMatch(focus) || isSearchTreeFolderMatch(focus));
                this.fileMatchOrFolderMatchWithResourceFocus.set(isSearchTreeFileMatch(focus) || isSearchTreeFolderMatchWithResource(focus));
                this.folderMatchWithResourceFocused.set(isSearchTreeFolderMatchWithResource(focus));
                this.searchResultHeaderFocused.set(isSearchHeader(focus));
                this.lastFocusState = 'tree';
            }
            let editable = false;
            if (isSearchTreeMatch(focus)) {
                editable = !focus.isReadonly;
            }
            else if (isSearchTreeFileMatch(focus)) {
                editable = !focus.hasOnlyReadOnlyMatches();
            }
            else if (isSearchTreeFolderMatch(focus)) {
                editable = !focus.hasOnlyReadOnlyMatches();
            }
            this.isEditableItem.set(editable);
        }));
        this._register(this.tree.onDidBlur(() => {
            this.firstMatchFocused.reset();
            this.fileMatchOrMatchFocused.reset();
            this.fileMatchFocused.reset();
            this.folderMatchFocused.reset();
            this.matchFocused.reset();
            this.fileMatchOrFolderMatchFocus.reset();
            this.fileMatchOrFolderMatchWithResourceFocus.reset();
            this.folderMatchWithResourceFocused.reset();
            this.searchResultHeaderFocused.reset();
            this.isEditableItem.reset();
        }));
    }
    onContextMenu(e) {
        e.browserEvent.preventDefault();
        e.browserEvent.stopPropagation();
        const selection = this.tree.getSelection();
        let arg;
        let context;
        if (selection && selection.length > 0) {
            arg = e.element;
            context = selection;
        }
        else {
            context = e.element;
        }
        this.contextMenuService.showContextMenu({
            menuId: MenuId.SearchContext,
            menuActionOptions: { shouldForwardArgs: true, arg },
            contextKeyService: this.contextKeyService,
            getAnchor: () => e.anchor,
            getActionsContext: () => context,
        });
    }
    hasSomeCollapsible() {
        const viewer = this.getControl();
        const navigator = viewer.navigate();
        let node = navigator.first();
        const shouldShowAI = this.shouldShowAIResults();
        do {
            if (node && !viewer.isCollapsed(node) && (!shouldShowAI || !isTextSearchHeading(node))) {
                // ignore the ai text search result id
                return true;
            }
        } while ((node = navigator.next()));
        return false;
    }
    async selectNextMatch() {
        if (!this.hasSearchResults()) {
            return;
        }
        const [selected] = this.tree.getSelection();
        // Expand the initial selected node, if needed
        if (selected && !isSearchTreeMatch(selected)) {
            if (this.tree.isCollapsed(selected)) {
                await this.tree.expand(selected);
            }
        }
        const navigator = this.tree.navigate(selected);
        let next = navigator.next();
        if (!next) {
            next = navigator.first();
        }
        // Expand until first child is a Match
        while (next && !isSearchTreeMatch(next)) {
            if (this.tree.isCollapsed(next)) {
                await this.tree.expand(next);
            }
            // Select the first child
            next = navigator.next();
        }
        // Reveal the newly selected element
        if (next) {
            if (next === selected) {
                this.tree.setFocus([]);
            }
            const event = getSelectionKeyboardEvent(undefined, false, false);
            this.tree.setFocus([next], event);
            this.tree.setSelection([next], event);
            this.tree.reveal(next);
            const ariaLabel = this.treeAccessibilityProvider.getAriaLabel(next);
            if (ariaLabel) {
                aria.status(ariaLabel);
            }
        }
    }
    async selectPreviousMatch() {
        if (!this.hasSearchResults()) {
            return;
        }
        const [selected] = this.tree.getSelection();
        let navigator = this.tree.navigate(selected);
        let prev = navigator.previous();
        // Select previous until find a Match or a collapsed item
        while (!prev || (!isSearchTreeMatch(prev) && !this.tree.isCollapsed(prev))) {
            const nextPrev = prev ? navigator.previous() : navigator.last();
            if (!prev && !nextPrev) {
                return;
            }
            prev = nextPrev;
        }
        // Expand until last child is a Match
        while (prev && !isSearchTreeMatch(prev)) {
            const nextItem = navigator.next();
            if (!nextItem) {
                break;
            }
            await this.tree.expand(prev);
            navigator = this.tree.navigate(nextItem); // recreate navigator because modifying the tree can invalidate it
            prev = nextItem ? navigator.previous() : navigator.last(); // select last child
        }
        // Reveal the newly selected element
        if (prev) {
            if (prev === selected) {
                this.tree.setFocus([]);
            }
            const event = getSelectionKeyboardEvent(undefined, false, false);
            this.tree.setFocus([prev], event);
            this.tree.setSelection([prev], event);
            this.tree.reveal(prev);
            const ariaLabel = this.treeAccessibilityProvider.getAriaLabel(prev);
            if (ariaLabel) {
                aria.status(ariaLabel);
            }
        }
    }
    moveFocusToResults() {
        this.tree.domFocus();
    }
    focus() {
        super.focus();
        if (this.lastFocusState === 'input' || !this.hasSearchResults()) {
            const updatedText = this.searchConfig.seedOnFocus
                ? this.updateTextFromSelection({ allowSearchOnType: false })
                : false;
            this.searchWidget.focus(undefined, undefined, updatedText);
        }
        else {
            this.tree.domFocus();
        }
    }
    updateTextFromFindWidgetOrSelection({ allowUnselectedWord = true, allowSearchOnType = true, }) {
        let activeEditor = this.editorService.activeTextEditorControl;
        if (isCodeEditor(activeEditor) && !activeEditor?.hasTextFocus()) {
            const controller = CommonFindController.get(activeEditor);
            if (controller && controller.isFindInputFocused()) {
                return this.updateTextFromFindWidget(controller, { allowSearchOnType });
            }
            const editors = this.codeEditorService.listCodeEditors();
            activeEditor =
                editors.find((editor) => editor instanceof EmbeddedCodeEditorWidget &&
                    editor.getParentEditor() === activeEditor &&
                    editor.hasTextFocus()) ?? activeEditor;
        }
        return this.updateTextFromSelection({ allowUnselectedWord, allowSearchOnType }, activeEditor);
    }
    updateTextFromFindWidget(controller, { allowSearchOnType = true }) {
        if (!this.searchConfig.seedWithNearestWord &&
            (dom.getActiveWindow().getSelection()?.toString() ?? '') === '') {
            return false;
        }
        const searchString = controller.getState().searchString;
        if (searchString === '') {
            return false;
        }
        this.searchWidget.searchInput?.setCaseSensitive(controller.getState().matchCase);
        this.searchWidget.searchInput?.setWholeWords(controller.getState().wholeWord);
        this.searchWidget.searchInput?.setRegex(controller.getState().isRegex);
        this.updateText(searchString, allowSearchOnType);
        return true;
    }
    updateTextFromSelection({ allowUnselectedWord = true, allowSearchOnType = true }, editor) {
        const seedSearchStringFromSelection = this.configurationService.getValue('editor').find
            .seedSearchStringFromSelection;
        if (!seedSearchStringFromSelection || seedSearchStringFromSelection === 'never') {
            return false;
        }
        let selectedText = this.getSearchTextFromEditor(allowUnselectedWord, editor);
        if (selectedText === null) {
            return false;
        }
        if (this.searchWidget.searchInput?.getRegex()) {
            selectedText = strings.escapeRegExpCharacters(selectedText);
        }
        this.updateText(selectedText, allowSearchOnType);
        return true;
    }
    updateText(text, allowSearchOnType = true) {
        if (allowSearchOnType && !this.viewModel.searchResult.isDirty) {
            this.searchWidget.setValue(text);
        }
        else {
            this.pauseSearching = true;
            this.searchWidget.setValue(text);
            this.pauseSearching = false;
        }
    }
    focusNextInputBox() {
        if (this.searchWidget.searchInputHasFocus()) {
            if (this.searchWidget.isReplaceShown()) {
                this.searchWidget.focus(true, true);
            }
            else {
                this.moveFocusFromSearchOrReplace();
            }
            return;
        }
        if (this.searchWidget.replaceInputHasFocus()) {
            this.moveFocusFromSearchOrReplace();
            return;
        }
        if (this.inputPatternIncludes.inputHasFocus()) {
            this.inputPatternExcludes.focus();
            this.inputPatternExcludes.select();
            return;
        }
        if (this.inputPatternExcludes.inputHasFocus()) {
            this.selectTreeIfNotSelected();
            return;
        }
    }
    moveFocusFromSearchOrReplace() {
        if (this.showsFileTypes()) {
            this.toggleQueryDetails(true, this.showsFileTypes());
        }
        else {
            this.selectTreeIfNotSelected();
        }
    }
    focusPreviousInputBox() {
        if (this.searchWidget.searchInputHasFocus()) {
            return;
        }
        if (this.searchWidget.replaceInputHasFocus()) {
            this.searchWidget.focus(true);
            return;
        }
        if (this.inputPatternIncludes.inputHasFocus()) {
            this.searchWidget.focus(true, true);
            return;
        }
        if (this.inputPatternExcludes.inputHasFocus()) {
            this.inputPatternIncludes.focus();
            this.inputPatternIncludes.select();
            return;
        }
        if (this.tree.isDOMFocused()) {
            this.moveFocusFromResults();
            return;
        }
    }
    moveFocusFromResults() {
        if (this.showsFileTypes()) {
            this.toggleQueryDetails(true, true, false, true);
        }
        else {
            this.searchWidget.focus(true, true);
        }
    }
    reLayout() {
        if (this.isDisposed || !this.size) {
            return;
        }
        const actionsPosition = this.searchConfig.actionsPosition;
        this.getContainer().classList.toggle(SearchView_1.ACTIONS_RIGHT_CLASS_NAME, actionsPosition === 'right');
        this.searchWidget.setWidth(this.size.width - 28 /* container margin */);
        this.inputPatternExcludes.setWidth(this.size.width - 28 /* container margin */);
        this.inputPatternIncludes.setWidth(this.size.width - 28 /* container margin */);
        const widgetHeight = dom.getTotalHeight(this.searchWidgetsContainerElement);
        const messagesHeight = dom.getTotalHeight(this.messagesElement);
        this.tree.layout(this.size.height - widgetHeight - messagesHeight, this.size.width - 28);
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.size = new dom.Dimension(width, height);
        this.reLayout();
    }
    getControl() {
        return this.tree;
    }
    allSearchFieldsClear() {
        return (this.searchWidget.getReplaceValue() === '' &&
            (!this.searchWidget.searchInput || this.searchWidget.searchInput.getValue() === ''));
    }
    allFilePatternFieldsClear() {
        return (this.searchExcludePattern.getValue() === '' && this.searchIncludePattern.getValue() === '');
    }
    hasSearchResults() {
        return !this.viewModel.searchResult.isEmpty();
    }
    clearSearchResults(clearInput = true) {
        this.viewModel.searchResult.clear();
        this.showEmptyStage(true);
        if (this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
            this.showSearchWithoutFolderMessage();
        }
        if (clearInput) {
            if (this.allSearchFieldsClear()) {
                this.clearFilePatternFields();
            }
            this.searchWidget.clear();
        }
        this.viewModel.cancelSearch();
        this.tree.ariaLabel = nls.localize('emptySearch', 'Empty Search');
        this.accessibilitySignalService.playSignal(AccessibilitySignal.clear);
        this.reLayout();
    }
    clearFilePatternFields() {
        this.searchExcludePattern.clear();
        this.searchIncludePattern.clear();
    }
    cancelSearch(focus = true) {
        if (this.viewModel.cancelSearch() && this.viewModel.cancelAISearch()) {
            if (focus) {
                this.searchWidget.focus();
            }
            return true;
        }
        return false;
    }
    selectTreeIfNotSelected() {
        if (this.tree.getNode(undefined)) {
            this.tree.domFocus();
            const selection = this.tree.getSelection();
            if (selection.length === 0) {
                const event = getSelectionKeyboardEvent();
                this.tree.focusNext(undefined, undefined, event);
                this.tree.setSelection(this.tree.getFocus(), event);
            }
        }
    }
    getSearchTextFromEditor(allowUnselectedWord, editor) {
        if (dom.isAncestorOfActiveElement(this.getContainer())) {
            return null;
        }
        editor = editor ?? this.editorService.activeTextEditorControl;
        if (!editor) {
            return null;
        }
        const allowUnselected = this.searchConfig.seedWithNearestWord && allowUnselectedWord;
        return getSelectionTextFromEditor(allowUnselected, editor);
    }
    showsFileTypes() {
        return this.queryDetails.classList.contains('more');
    }
    toggleCaseSensitive() {
        this.searchWidget.searchInput?.setCaseSensitive(!this.searchWidget.searchInput.getCaseSensitive());
        this.triggerQueryChange({ shouldKeepAIResults: true });
    }
    toggleWholeWords() {
        this.searchWidget.searchInput?.setWholeWords(!this.searchWidget.searchInput.getWholeWords());
        this.triggerQueryChange({ shouldKeepAIResults: true });
    }
    toggleRegex() {
        this.searchWidget.searchInput?.setRegex(!this.searchWidget.searchInput.getRegex());
        this.triggerQueryChange({ shouldKeepAIResults: true });
    }
    togglePreserveCase() {
        this.searchWidget.replaceInput?.setPreserveCase(!this.searchWidget.replaceInput.getPreserveCase());
        this.triggerQueryChange({ shouldKeepAIResults: true });
    }
    setSearchParameters(args = {}) {
        if (typeof args.isCaseSensitive === 'boolean') {
            this.searchWidget.searchInput?.setCaseSensitive(args.isCaseSensitive);
        }
        if (typeof args.matchWholeWord === 'boolean') {
            this.searchWidget.searchInput?.setWholeWords(args.matchWholeWord);
        }
        if (typeof args.isRegex === 'boolean') {
            this.searchWidget.searchInput?.setRegex(args.isRegex);
        }
        if (typeof args.filesToInclude === 'string') {
            this.searchIncludePattern.setValue(String(args.filesToInclude));
        }
        if (typeof args.filesToExclude === 'string') {
            this.searchExcludePattern.setValue(String(args.filesToExclude));
        }
        if (typeof args.query === 'string') {
            this.searchWidget.searchInput?.setValue(args.query);
        }
        if (typeof args.replace === 'string') {
            this.searchWidget.replaceInput?.setValue(args.replace);
        }
        else {
            if (this.searchWidget.replaceInput && this.searchWidget.replaceInput.getValue() !== '') {
                this.searchWidget.replaceInput.setValue('');
            }
        }
        if (typeof args.triggerSearch === 'boolean' && args.triggerSearch) {
            this.triggerQueryChange();
        }
        if (typeof args.preserveCase === 'boolean') {
            this.searchWidget.replaceInput?.setPreserveCase(args.preserveCase);
        }
        if (typeof args.useExcludeSettingsAndIgnoreFiles === 'boolean') {
            this.inputPatternExcludes.setUseExcludesAndIgnoreFiles(args.useExcludeSettingsAndIgnoreFiles);
        }
        if (typeof args.onlyOpenEditors === 'boolean') {
            this.searchIncludePattern.setOnlySearchInOpenEditors(args.onlyOpenEditors);
        }
    }
    toggleQueryDetails(moveFocus = true, show, skipLayout, reverse) {
        const cls = 'more';
        show = typeof show === 'undefined' ? !this.queryDetails.classList.contains(cls) : Boolean(show);
        this.viewletState['query.queryDetailsExpanded'] = show;
        skipLayout = Boolean(skipLayout);
        if (show) {
            this.toggleQueryDetailsButton.setAttribute('aria-expanded', 'true');
            this.queryDetails.classList.add(cls);
            if (moveFocus) {
                if (reverse) {
                    this.inputPatternExcludes.focus();
                    this.inputPatternExcludes.select();
                }
                else {
                    this.inputPatternIncludes.focus();
                    this.inputPatternIncludes.select();
                }
            }
        }
        else {
            this.toggleQueryDetailsButton.setAttribute('aria-expanded', 'false');
            this.queryDetails.classList.remove(cls);
            if (moveFocus) {
                this.searchWidget.focus();
            }
        }
        if (!skipLayout && this.size) {
            this.reLayout();
        }
    }
    searchInFolders(folderPaths = []) {
        this._searchWithIncludeOrExclude(true, folderPaths);
    }
    searchOutsideOfFolders(folderPaths = []) {
        this._searchWithIncludeOrExclude(false, folderPaths);
    }
    _searchWithIncludeOrExclude(include, folderPaths) {
        if (!folderPaths.length || folderPaths.some((folderPath) => folderPath === '.')) {
            this.inputPatternIncludes.setValue('');
            this.searchWidget.focus();
            return;
        }
        // Show 'files to include' box
        if (!this.showsFileTypes()) {
            this.toggleQueryDetails(true, true);
        }
        ;
        (include ? this.inputPatternIncludes : this.inputPatternExcludes).setValue(folderPaths.join(', '));
        this.searchWidget.focus(false);
    }
    triggerQueryChange(_options) {
        const options = { preserveFocus: true, triggeredOnType: false, delay: 0, ..._options };
        if (options.triggeredOnType && !this.searchConfig.searchOnType) {
            return;
        }
        if (!this.pauseSearching) {
            const delay = options.triggeredOnType ? options.delay : 0;
            this.triggerQueryDelayer.trigger(() => {
                this._onQueryChanged(options.preserveFocus, options.triggeredOnType, options.shouldKeepAIResults, options.shouldUpdateAISearch);
            }, delay);
        }
    }
    _getExcludePattern() {
        return this.inputPatternExcludes.getValue().trim();
    }
    _getIncludePattern() {
        return this.inputPatternIncludes.getValue().trim();
    }
    _onQueryChanged(preserveFocus, triggeredOnType = false, shouldKeepAIResults = false, shouldUpdateAISearch = false) {
        if (!this.searchWidget.searchInput?.inputBox.isInputValid()) {
            return;
        }
        const isRegex = this.searchWidget.searchInput.getRegex();
        const isInNotebookMarkdownInput = this.searchWidget.getNotebookFilters().markupInput;
        const isInNotebookMarkdownPreview = this.searchWidget.getNotebookFilters().markupPreview;
        const isInNotebookCellInput = this.searchWidget.getNotebookFilters().codeInput;
        const isInNotebookCellOutput = this.searchWidget.getNotebookFilters().codeOutput;
        const isWholeWords = this.searchWidget.searchInput.getWholeWords();
        const isCaseSensitive = this.searchWidget.searchInput.getCaseSensitive();
        const contentPattern = this.searchWidget.searchInput.getValue();
        const excludePatternText = this._getExcludePattern();
        const includePatternText = this._getIncludePattern();
        const useExcludesAndIgnoreFiles = this.inputPatternExcludes.useExcludesAndIgnoreFiles();
        const onlySearchInOpenEditors = this.inputPatternIncludes.onlySearchInOpenEditors();
        if (contentPattern.length === 0) {
            this.clearSearchResults(false);
            this.clearMessage();
            return;
        }
        const content = {
            pattern: contentPattern,
            isRegExp: isRegex,
            isCaseSensitive: isCaseSensitive,
            isWordMatch: isWholeWords,
            notebookInfo: {
                isInNotebookMarkdownInput,
                isInNotebookMarkdownPreview,
                isInNotebookCellInput,
                isInNotebookCellOutput,
            },
        };
        const excludePattern = [{ pattern: this.inputPatternExcludes.getValue() }];
        const includePattern = this.inputPatternIncludes.getValue();
        // Need the full match line to correctly calculate replace text, if this is a search/replace with regex group references ($1, $2, ...).
        // 10000 chars is enough to avoid sending huge amounts of text around, if you do a replace with a longer match, it may or may not resolve the group refs correctly.
        // https://github.com/microsoft/vscode/issues/58374
        const charsPerLine = content.isRegExp ? 10000 : 1000;
        const options = {
            _reason: 'searchView',
            extraFileResources: this.instantiationService.invokeFunction(getOutOfWorkspaceEditorResources),
            maxResults: this.searchConfig.maxResults ?? undefined,
            disregardIgnoreFiles: !useExcludesAndIgnoreFiles || undefined,
            disregardExcludeSettings: !useExcludesAndIgnoreFiles || undefined,
            onlyOpenEditors: onlySearchInOpenEditors,
            excludePattern,
            includePattern,
            previewOptions: {
                matchLines: 1,
                charsPerLine,
            },
            isSmartCase: this.searchConfig.smartCase,
            expandPatterns: true,
        };
        const folderResources = this.contextService.getWorkspace().folders;
        const onQueryValidationError = (err) => {
            this.searchWidget.searchInput?.showMessage({ content: err.message, type: 3 /* MessageType.ERROR */ });
            this.viewModel.searchResult.clear();
        };
        let query;
        try {
            query = this.queryBuilder.text(content, folderResources.map((folder) => folder.uri), options);
        }
        catch (err) {
            onQueryValidationError(err);
            return;
        }
        this.validateQuery(query).then(() => {
            // ensure that the node is closed when a new search is triggered
            if (!shouldKeepAIResults &&
                !shouldUpdateAISearch &&
                this.tree.hasNode(this.searchResult.aiTextSearchResult)) {
                this.tree.collapse(this.searchResult.aiTextSearchResult);
            }
            this.onQueryTriggered(query, options, excludePatternText, includePatternText, triggeredOnType, shouldKeepAIResults, shouldUpdateAISearch);
            if (!preserveFocus) {
                this.searchWidget.focus(false, undefined, true); // focus back to input field
            }
        }, onQueryValidationError);
    }
    validateQuery(query) {
        // Validate folderQueries
        const folderQueriesExistP = query.folderQueries.map((fq) => {
            return this.fileService.exists(fq.folder).catch(() => false);
        });
        return Promise.all(folderQueriesExistP).then((existResults) => {
            // If no folders exist, show an error message about the first one
            const existingFolderQueries = query.folderQueries.filter((folderQuery, i) => existResults[i]);
            if (!query.folderQueries.length || existingFolderQueries.length) {
                query.folderQueries = existingFolderQueries;
            }
            else {
                const nonExistantPath = query.folderQueries[0].folder.fsPath;
                const searchPathNotFoundError = nls.localize('searchPathNotFoundError', 'Search path not found: {0}', nonExistantPath);
                return Promise.reject(new Error(searchPathNotFoundError));
            }
            return undefined;
        });
    }
    onQueryTriggered(query, options, excludePatternText, includePatternText, triggeredOnType, shouldKeepAIResults, shouldUpdateAISearch) {
        this.addToSearchHistoryDelayer.trigger(() => {
            this.searchWidget.searchInput?.onSearchSubmit();
            this.inputPatternExcludes.onSearchSubmit();
            this.inputPatternIncludes.onSearchSubmit();
        });
        this.viewModel.cancelSearch(true);
        this.viewModel.cancelAISearch(true);
        this.currentSearchQ = this.currentSearchQ
            .then(() => this.doSearch(query, excludePatternText, includePatternText, triggeredOnType, shouldKeepAIResults, shouldUpdateAISearch))
            .then(() => undefined, () => undefined);
    }
    async _updateResults() {
        if (this.state === SearchUIState.Idle) {
            return;
        }
        try {
            // Search result tree update
            const fileCount = this.viewModel.searchResult.fileCount();
            if (this._visibleMatches !== fileCount) {
                this._visibleMatches = fileCount;
                await this.refreshAndUpdateCount();
            }
        }
        finally {
            // show frequent progress and results by scheduling updates 80 ms after the last one
            this._refreshResultsScheduler.schedule();
        }
    }
    async expandIfSingularResult() {
        // expand if just 1 file with less than 50 matches
        const collapseResults = this.searchConfig.collapseResults;
        if (collapseResults !== 'alwaysCollapse' &&
            this.viewModel.searchResult.matches().length === 1) {
            const onlyMatch = this.viewModel.searchResult.matches()[0];
            await this.tree.expandTo(onlyMatch);
            if (onlyMatch.count() < 50) {
                await this.tree.expand(onlyMatch);
            }
        }
    }
    async onSearchComplete(progressComplete, excludePatternText, includePatternText, completed, shouldDoFinalRefresh = true) {
        this.state = SearchUIState.Idle;
        // Complete up to 100% as needed
        progressComplete();
        if (shouldDoFinalRefresh) {
            // anything that gets called from `getChildren` should not do this, since the tree will refresh anyways.
            await this.refreshAndUpdateCount();
        }
        const allResults = !this.viewModel.searchResult.isEmpty();
        const aiResults = this.searchResult.getCachedSearchComplete(true);
        if (completed?.exit === 1 /* SearchCompletionExitCode.NewSearchStarted */) {
            return;
        }
        // Special case for when we have an AI provider registered
        Constants.SearchContext.AIResultsRequested.bindTo(this.contextKeyService).set(this.shouldShowAIResults() && !!aiResults);
        if (this.shouldShowAIResults() && !allResults) {
            const messageEl = this.clearMessage();
            const noResultsMessage = nls.localize('noResultsFallback', 'No results found. ');
            dom.append(messageEl, noResultsMessage);
            let aiName = 'Copilot';
            try {
                aiName = (await this.searchService.getAIName()) || aiName;
            }
            catch (e) {
                // ignore
            }
            if (aiName) {
                const searchWithAIButtonTooltip = appendKeyBindingLabel(nls.localize('triggerAISearch.tooltip', 'Search with {0}', aiName), this.keybindingService.lookupKeybinding("search.action.searchWithAI" /* Constants.SearchCommandIds.SearchWithAIActionId */));
                const searchWithAIButtonText = nls.localize('searchWithAIButtonTooltip', 'Search with {0}.', aiName);
                const searchWithAIButton = this.messageDisposables.add(new SearchLinkButton(searchWithAIButtonText, () => {
                    this.commandService.executeCommand("search.action.searchWithAI" /* Constants.SearchCommandIds.SearchWithAIActionId */);
                }, this.hoverService, searchWithAIButtonTooltip));
                dom.append(messageEl, searchWithAIButton.element);
            }
            if (!aiResults) {
                return;
            }
        }
        if (!allResults) {
            const hasExcludes = !!excludePatternText;
            const hasIncludes = !!includePatternText;
            let message;
            if (!completed) {
                message = SEARCH_CANCELLED_MESSAGE;
            }
            else if (this.inputPatternIncludes.onlySearchInOpenEditors()) {
                if (hasIncludes && hasExcludes) {
                    message = nls.localize('noOpenEditorResultsIncludesExcludes', "No results found in open editors matching '{0}' excluding '{1}' - ", includePatternText, excludePatternText);
                }
                else if (hasIncludes) {
                    message = nls.localize('noOpenEditorResultsIncludes', "No results found in open editors matching '{0}' - ", includePatternText);
                }
                else if (hasExcludes) {
                    message = nls.localize('noOpenEditorResultsExcludes', "No results found in open editors excluding '{0}' - ", excludePatternText);
                }
                else {
                    message = nls.localize('noOpenEditorResultsFound', 'No results found in open editors. Review your settings for configured exclusions and check your gitignore files - ');
                }
            }
            else {
                if (hasIncludes && hasExcludes) {
                    message = nls.localize('noResultsIncludesExcludes', "No results found in '{0}' excluding '{1}' - ", includePatternText, excludePatternText);
                }
                else if (hasIncludes) {
                    message = nls.localize('noResultsIncludes', "No results found in '{0}' - ", includePatternText);
                }
                else if (hasExcludes) {
                    message = nls.localize('noResultsExcludes', "No results found excluding '{0}' - ", excludePatternText);
                }
                else {
                    message = nls.localize('noResultsFound', 'No results found. Review your settings for configured exclusions and check your gitignore files - ');
                }
            }
            // Indicate as status to ARIA
            aria.status(message);
            const messageEl = this.clearMessage();
            dom.append(messageEl, message);
            if (!completed) {
                const searchAgainButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('rerunSearch.message', 'Search again'), () => this.triggerQueryChange({ preserveFocus: false }), this.hoverService));
                dom.append(messageEl, searchAgainButton.element);
            }
            else if (hasIncludes || hasExcludes) {
                const searchAgainButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('rerunSearchInAll.message', 'Search again in all files'), this.onSearchAgain.bind(this), this.hoverService));
                dom.append(messageEl, searchAgainButton.element);
            }
            else {
                const openSettingsButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('openSettings.message', 'Open Settings'), this.onOpenSettings.bind(this), this.hoverService));
                dom.append(messageEl, openSettingsButton.element);
            }
            if (completed) {
                dom.append(messageEl, $('span', undefined, ' - '));
                const learnMoreButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('openSettings.learnMore', 'Learn More'), this.onLearnMore.bind(this), this.hoverService));
                dom.append(messageEl, learnMoreButton.element);
            }
            if (this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
                this.showSearchWithoutFolderMessage();
            }
            this.reLayout();
        }
        else {
            this.viewModel.searchResult.toggleHighlights(this.isVisible()); // show highlights
            // Indicate final search result count for ARIA
            aria.status(nls.localize('ariaSearchResultsStatus', 'Search returned {0} results in {1} files', this.viewModel.searchResult.count(), this.viewModel.searchResult.fileCount()));
        }
        if (completed && completed.limitHit) {
            completed.messages.push({
                type: TextSearchCompleteMessageType.Warning,
                text: nls.localize('searchMaxResultsWarning', 'The result set only contains a subset of all matches. Be more specific in your search to narrow down the results.'),
            });
        }
        if (completed && completed.messages) {
            for (const message of completed.messages) {
                this.addMessage(message);
            }
        }
        this.reLayout();
    }
    async onSearchError(e, progressComplete, excludePatternText, includePatternText, completed, shouldDoFinalRefresh = true) {
        this.state = SearchUIState.Idle;
        if (errors.isCancellationError(e)) {
            return this.onSearchComplete(progressComplete, excludePatternText, includePatternText, completed, shouldDoFinalRefresh);
        }
        else {
            progressComplete();
            this.searchWidget.searchInput?.showMessage({ content: e.message, type: 3 /* MessageType.ERROR */ });
            this.viewModel.searchResult.clear();
            return Promise.resolve();
        }
    }
    async addAIResults() {
        const excludePatternText = this._getExcludePattern();
        const includePatternText = this._getIncludePattern();
        let progressComplete;
        this.progressService.withProgress({ location: this.getProgressLocation(), delay: 0 }, (_progress) => {
            return new Promise((resolve) => (progressComplete = resolve));
        });
        this.searchWidget.searchInput?.clearMessage();
        this.state = SearchUIState.Searching;
        this.showEmptyStage();
        const slowTimer = setTimeout(() => {
            this.state = SearchUIState.SlowSearch;
        }, 2000);
        this._visibleMatches = 0;
        this.tree.setSelection([]);
        this.tree.setFocus([]);
        this.viewModel.replaceString = this.searchWidget.getReplaceValue();
        this.viewModel.searchResult.setAIQueryUsingTextQuery();
        const result = this.viewModel.addAIResults();
        return result.then((complete) => {
            clearTimeout(slowTimer);
            this.updateSearchResultCount(this.viewModel.searchResult.query?.userDisabledExcludesAndIgnoreFiles, this.viewModel.searchResult.query?.onlyOpenEditors, false);
            return this.onSearchComplete(progressComplete, excludePatternText, includePatternText, complete, false);
        }, (e) => {
            clearTimeout(slowTimer);
            return this.onSearchError(e, progressComplete, excludePatternText, includePatternText, undefined, false);
        });
    }
    doSearch(query, excludePatternText, includePatternText, triggeredOnType, shouldKeepAIResults, shouldUpdateAISearch) {
        let progressComplete;
        this.progressService.withProgress({ location: this.getProgressLocation(), delay: triggeredOnType ? 300 : 0 }, (_progress) => {
            return new Promise((resolve) => (progressComplete = resolve));
        });
        this.searchWidget.searchInput?.clearMessage();
        this.state = SearchUIState.Searching;
        this.showEmptyStage();
        this.model.searchResult.aiTextSearchResult.hidden =
            !shouldKeepAIResults && !shouldUpdateAISearch;
        const slowTimer = setTimeout(() => {
            this.state = SearchUIState.SlowSearch;
        }, 2000);
        this._visibleMatches = 0;
        this._refreshResultsScheduler.schedule();
        this.searchWidget.setReplaceAllActionState(false);
        this.tree.setSelection([]);
        this.tree.setFocus([]);
        this.viewModel.replaceString = this.searchWidget.getReplaceValue();
        const result = this.viewModel.search(query);
        if (!shouldKeepAIResults || shouldUpdateAISearch) {
            this.viewModel.searchResult.setAIQueryUsingTextQuery(query);
        }
        if (shouldUpdateAISearch) {
            this.tree.updateChildren(this.searchResult.aiTextSearchResult);
        }
        return result.asyncResults.then((complete) => {
            clearTimeout(slowTimer);
            return this.onSearchComplete(progressComplete, excludePatternText, includePatternText, complete);
        }, (e) => {
            clearTimeout(slowTimer);
            return this.onSearchError(e, progressComplete, excludePatternText, includePatternText);
        });
    }
    onOpenSettings(e) {
        dom.EventHelper.stop(e, false);
        this.openSettings('@id:files.exclude,search.exclude,search.useParentIgnoreFiles,search.useGlobalIgnoreFiles,search.useIgnoreFiles');
    }
    openSettings(query) {
        const options = { query };
        return this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */
            ? this.preferencesService.openWorkspaceSettings(options)
            : this.preferencesService.openUserSettings(options);
    }
    onLearnMore() {
        this.openerService.open(URI.parse('https://go.microsoft.com/fwlink/?linkid=853977'));
    }
    onSearchAgain() {
        this.inputPatternExcludes.setValue('');
        this.inputPatternIncludes.setValue('');
        this.inputPatternIncludes.setOnlySearchInOpenEditors(false);
        this.triggerQueryChange({ preserveFocus: false });
    }
    onEnableExcludes() {
        this.toggleQueryDetails(false, true);
        this.searchExcludePattern.setUseExcludesAndIgnoreFiles(true);
    }
    onDisableSearchInOpenEditors() {
        this.toggleQueryDetails(false, true);
        this.inputPatternIncludes.setOnlySearchInOpenEditors(false);
    }
    updateSearchResultCount(disregardExcludesAndIgnores, onlyOpenEditors, clear = false) {
        const fileCount = this.viewModel.searchResult.fileCount();
        const resultCount = this.viewModel.searchResult.count();
        this.hasSearchResultsKey.set(fileCount > 0);
        const msgWasHidden = this.messagesElement.style.display === 'none';
        const messageEl = this.clearMessage();
        const resultMsg = clear ? '' : this.buildResultCountMessage(resultCount, fileCount);
        this.tree.ariaLabel =
            resultMsg +
                nls.localize('forTerm', ' - Search: {0}', this.searchResult.query?.contentPattern.pattern ?? '');
        dom.append(messageEl, resultMsg);
        if (fileCount > 0) {
            if (disregardExcludesAndIgnores) {
                const excludesDisabledMessage = ' - ' +
                    nls.localize('useIgnoresAndExcludesDisabled', 'exclude settings and ignore files are disabled') +
                    ' ';
                const enableExcludesButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('excludes.enable', 'enable'), this.onEnableExcludes.bind(this), this.hoverService, nls.localize('useExcludesAndIgnoreFilesDescription', 'Use Exclude Settings and Ignore Files')));
                dom.append(messageEl, $('span', undefined, excludesDisabledMessage, '(', enableExcludesButton.element, ')'));
            }
            if (onlyOpenEditors) {
                const searchingInOpenMessage = ' - ' + nls.localize('onlyOpenEditors', 'searching only in open files') + ' ';
                const disableOpenEditorsButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('openEditors.disable', 'disable'), this.onDisableSearchInOpenEditors.bind(this), this.hoverService, nls.localize('disableOpenEditors', 'Search in entire workspace')));
                dom.append(messageEl, $('span', undefined, searchingInOpenMessage, '(', disableOpenEditorsButton.element, ')'));
            }
            dom.append(messageEl, ' - ');
            const openInEditorTooltip = appendKeyBindingLabel(nls.localize('openInEditor.tooltip', 'Copy current search results to an editor'), this.keybindingService.lookupKeybinding("search.action.openInEditor" /* Constants.SearchCommandIds.OpenInEditorCommandId */));
            const openInEditorButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('openInEditor.message', 'Open in editor'), () => this.instantiationService.invokeFunction(createEditorFromSearchResult, this.searchResult, this.searchIncludePattern.getValue(), this.searchExcludePattern.getValue(), this.searchIncludePattern.onlySearchInOpenEditors()), this.hoverService, openInEditorTooltip));
            dom.append(messageEl, openInEditorButton.element);
            this.reLayout();
        }
        else if (!msgWasHidden) {
            dom.hide(this.messagesElement);
        }
    }
    addMessage(message) {
        const messageBox = this.messagesElement.firstChild;
        if (!messageBox) {
            return;
        }
        dom.append(messageBox, renderSearchMessage(message, this.instantiationService, this.notificationService, this.openerService, this.commandService, this.messageDisposables, () => this.triggerQueryChange()));
    }
    buildResultCountMessage(resultCount, fileCount) {
        if (resultCount === 1 && fileCount === 1) {
            return nls.localize('search.file.result', '{0} result in {1} file', resultCount, fileCount);
        }
        else if (resultCount === 1) {
            return nls.localize('search.files.result', '{0} result in {1} files', resultCount, fileCount);
        }
        else if (fileCount === 1) {
            return nls.localize('search.file.results', '{0} results in {1} file', resultCount, fileCount);
        }
        else {
            return nls.localize('search.files.results', '{0} results in {1} files', resultCount, fileCount);
        }
    }
    showSearchWithoutFolderMessage() {
        this.searchWithoutFolderMessageElement = this.clearMessage();
        const textEl = dom.append(this.searchWithoutFolderMessageElement, $('p', undefined, nls.localize('searchWithoutFolder', 'You have not opened or specified a folder. Only open files are currently searched - ')));
        const openFolderButton = this.messageDisposables.add(new SearchLinkButton(nls.localize('openFolder', 'Open Folder'), () => {
            this.commandService
                .executeCommand(env.isMacintosh && env.isNative ? OpenFileFolderAction.ID : OpenFolderAction.ID)
                .catch((err) => errors.onUnexpectedError(err));
        }, this.hoverService));
        dom.append(textEl, openFolderButton.element);
    }
    showEmptyStage(forceHideMessages = false) {
        const showingCancelled = (this.messagesElement.firstChild?.textContent?.indexOf(SEARCH_CANCELLED_MESSAGE) ?? -1) > -1;
        // clean up ui
        // this.replaceService.disposeAllReplacePreviews();
        if (showingCancelled ||
            forceHideMessages ||
            !this.configurationService.getValue().search.searchOnType) {
            // when in search to type, don't preemptively hide, as it causes flickering and shifting of the live results
            dom.hide(this.messagesElement);
        }
        dom.show(this.resultsElement);
        this.currentSelectedFileMatch = undefined;
    }
    shouldOpenInNotebookEditor(match, uri) {
        // Untitled files will return a false positive for getContributedNotebookTypes.
        // Since untitled files are already open, then untitled notebooks should return NotebookMatch results.
        return (isIMatchInNotebook(match) ||
            (uri.scheme !== network.Schemas.untitled &&
                this.notebookService.getContributedNotebookTypes(uri).length > 0));
    }
    onFocus(lineMatch, preserveFocus, sideBySide, pinned) {
        const useReplacePreview = this.configurationService.getValue().search.useReplacePreview;
        const resource = isSearchTreeMatch(lineMatch)
            ? lineMatch.parent().resource
            : lineMatch.resource;
        return useReplacePreview &&
            this.viewModel.isReplaceActive() &&
            !!this.viewModel.replaceString &&
            !this.shouldOpenInNotebookEditor(lineMatch, resource)
            ? this.replaceService.openReplacePreview(lineMatch, preserveFocus, sideBySide, pinned)
            : this.open(lineMatch, preserveFocus, sideBySide, pinned, resource);
    }
    async open(element, preserveFocus, sideBySide, pinned, resourceInput) {
        const selection = getEditorSelectionFromMatch(element, this.viewModel);
        const oldParentMatches = isSearchTreeMatch(element) ? element.parent().matches() : [];
        const resource = resourceInput ??
            (isSearchTreeMatch(element)
                ? element.parent().resource
                : element.resource);
        let editor;
        const options = {
            preserveFocus,
            pinned,
            selection,
            revealIfVisible: true,
        };
        try {
            editor = await this.editorService.openEditor({
                resource: resource,
                options,
            }, sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
            const editorControl = editor?.getControl();
            if (isSearchTreeMatch(element) && preserveFocus && isCodeEditor(editorControl)) {
                this.viewModel.searchResult
                    .getRangeHighlightDecorations()
                    .highlightRange(editorControl.getModel(), element.range());
            }
            else {
                this.viewModel.searchResult.getRangeHighlightDecorations().removeHighlightRange();
            }
        }
        catch (err) {
            errors.onUnexpectedError(err);
            return;
        }
        if (editor instanceof NotebookEditor) {
            const elemParent = element.parent();
            if (isSearchTreeMatch(element)) {
                if (isIMatchInNotebook(element)) {
                    element.parent().showMatch(element);
                }
                else {
                    const editorWidget = editor.getControl();
                    if (editorWidget) {
                        // Ensure that the editor widget is binded. If if is, then this should return immediately.
                        // Otherwise, it will bind the widget.
                        elemParent.bindNotebookEditorWidget(editorWidget);
                        await elemParent.updateMatchesForEditorWidget();
                        const matchIndex = oldParentMatches.findIndex((e) => e.id() === element.id());
                        const matches = elemParent.matches();
                        const match = matchIndex >= matches.length ? matches[matches.length - 1] : matches[matchIndex];
                        if (isIMatchInNotebook(match)) {
                            elemParent.showMatch(match);
                            if (!this.tree.getFocus().includes(match) ||
                                !this.tree.getSelection().includes(match)) {
                                this.tree.setSelection([match], getSelectionKeyboardEvent());
                                this.tree.setFocus([match]);
                            }
                        }
                    }
                }
            }
        }
    }
    openEditorWithMultiCursor(element) {
        const resource = isSearchTreeMatch(element)
            ? element.parent().resource
            : element.resource;
        return this.editorService
            .openEditor({
            resource: resource,
            options: {
                preserveFocus: false,
                pinned: true,
                revealIfVisible: true,
            },
        })
            .then((editor) => {
            if (editor) {
                let fileMatch = null;
                if (isSearchTreeFileMatch(element)) {
                    fileMatch = element;
                }
                else if (isSearchTreeMatch(element)) {
                    fileMatch = element.parent();
                }
                if (fileMatch) {
                    const selections = fileMatch
                        .matches()
                        .map((m) => new Selection(m.range().startLineNumber, m.range().startColumn, m.range().endLineNumber, m.range().endColumn));
                    const codeEditor = getCodeEditor(editor.getControl());
                    if (codeEditor) {
                        const multiCursorController = MultiCursorSelectionController.get(codeEditor);
                        multiCursorController?.selectAllUsingSelections(selections);
                    }
                }
            }
            this.viewModel.searchResult.getRangeHighlightDecorations().removeHighlightRange();
        }, errors.onUnexpectedError);
    }
    onUntitledDidDispose(resource) {
        if (!this.viewModel) {
            return;
        }
        // remove search results from this resource as it got disposed
        let matches = this.viewModel.searchResult.matches();
        for (let i = 0, len = matches.length; i < len; i++) {
            if (resource.toString() === matches[i].resource.toString()) {
                this.viewModel.searchResult.remove(matches[i]);
            }
        }
        matches = this.viewModel.searchResult.matches(true);
        for (let i = 0, len = matches.length; i < len; i++) {
            if (resource.toString() === matches[i].resource.toString()) {
                this.viewModel.searchResult.remove(matches[i]);
            }
        }
    }
    onFilesChanged(e) {
        if (!this.viewModel ||
            (this.searchConfig.sortOrder !== "modified" /* SearchSortOrder.Modified */ && !e.gotDeleted())) {
            return;
        }
        const matches = this.viewModel.searchResult.matches();
        if (e.gotDeleted()) {
            const deletedMatches = matches.filter((m) => e.contains(m.resource, 2 /* FileChangeType.DELETED */));
            this.viewModel.searchResult.remove(deletedMatches);
        }
        else {
            // Check if the changed file contained matches
            const changedMatches = matches.filter((m) => e.contains(m.resource));
            if (changedMatches.length && this.searchConfig.sortOrder === "modified" /* SearchSortOrder.Modified */) {
                // No matches need to be removed, but modified files need to have their file stat updated.
                this.updateFileStats(changedMatches).then(async () => this.refreshTreeController.queue());
            }
        }
    }
    get searchConfig() {
        return this.configurationService.getValue('search');
    }
    clearHistory() {
        this.searchWidget.clearHistory();
        this.inputPatternExcludes.clearHistory();
        this.inputPatternIncludes.clearHistory();
    }
    saveState() {
        // This can be called before renderBody() method gets called for the first time
        // if we move the searchView inside another viewPaneContainer
        if (!this.searchWidget) {
            return;
        }
        const patternExcludes = this.inputPatternExcludes?.getValue().trim() ?? '';
        const patternIncludes = this.inputPatternIncludes?.getValue().trim() ?? '';
        const onlyOpenEditors = this.inputPatternIncludes?.onlySearchInOpenEditors() ?? false;
        const useExcludesAndIgnoreFiles = this.inputPatternExcludes?.useExcludesAndIgnoreFiles() ?? true;
        const preserveCase = this.viewModel.preserveCase;
        if (this.searchWidget.searchInput) {
            const isRegex = this.searchWidget.searchInput.getRegex();
            const isWholeWords = this.searchWidget.searchInput.getWholeWords();
            const isCaseSensitive = this.searchWidget.searchInput.getCaseSensitive();
            const contentPattern = this.searchWidget.searchInput.getValue();
            const isInNotebookCellInput = this.searchWidget.getNotebookFilters().codeInput;
            const isInNotebookCellOutput = this.searchWidget.getNotebookFilters().codeOutput;
            const isInNotebookMarkdownInput = this.searchWidget.getNotebookFilters().markupInput;
            const isInNotebookMarkdownPreview = this.searchWidget.getNotebookFilters().markupPreview;
            this.viewletState['query.contentPattern'] = contentPattern;
            this.viewletState['query.regex'] = isRegex;
            this.viewletState['query.wholeWords'] = isWholeWords;
            this.viewletState['query.caseSensitive'] = isCaseSensitive;
            this.viewletState['query.isInNotebookMarkdownInput'] = isInNotebookMarkdownInput;
            this.viewletState['query.isInNotebookMarkdownPreview'] = isInNotebookMarkdownPreview;
            this.viewletState['query.isInNotebookCellInput'] = isInNotebookCellInput;
            this.viewletState['query.isInNotebookCellOutput'] = isInNotebookCellOutput;
        }
        this.viewletState['query.folderExclusions'] = patternExcludes;
        this.viewletState['query.folderIncludes'] = patternIncludes;
        this.viewletState['query.useExcludesAndIgnoreFiles'] = useExcludesAndIgnoreFiles;
        this.viewletState['query.preserveCase'] = preserveCase;
        this.viewletState['query.onlyOpenEditors'] = onlyOpenEditors;
        const isReplaceShown = this.searchAndReplaceWidget.isReplaceShown();
        this.viewletState['view.showReplace'] = isReplaceShown;
        this.viewletState['view.treeLayout'] = this.isTreeLayoutViewVisible;
        this.viewletState['query.replaceText'] = isReplaceShown && this.searchWidget.getReplaceValue();
        this._saveSearchHistoryService();
        this.memento.saveMemento();
        super.saveState();
    }
    _saveSearchHistoryService() {
        if (this.searchWidget === undefined) {
            return;
        }
        const history = Object.create(null);
        const searchHistory = this.searchWidget.getSearchHistory();
        if (searchHistory && searchHistory.length) {
            history.search = searchHistory;
        }
        const replaceHistory = this.searchWidget.getReplaceHistory();
        if (replaceHistory && replaceHistory.length) {
            history.replace = replaceHistory;
        }
        const patternExcludesHistory = this.inputPatternExcludes.getHistory();
        if (patternExcludesHistory && patternExcludesHistory.length) {
            history.exclude = patternExcludesHistory;
        }
        const patternIncludesHistory = this.inputPatternIncludes.getHistory();
        if (patternIncludesHistory && patternIncludesHistory.length) {
            history.include = patternIncludesHistory;
        }
        this.searchHistoryService.save(history);
    }
    async updateFileStats(elements) {
        const files = elements.map((f) => f.resolveFileStat(this.fileService));
        await Promise.all(files);
    }
    removeFileStats() {
        for (const fileMatch of this.searchResult.matches()) {
            fileMatch.fileStat = undefined;
        }
        for (const fileMatch of this.searchResult.matches(true)) {
            fileMatch.fileStat = undefined;
        }
    }
    dispose() {
        this.isDisposed = true;
        this.saveState();
        super.dispose();
    }
};
SearchView = SearchView_1 = __decorate([
    __param(1, IFileService),
    __param(2, IEditorService),
    __param(3, ICodeEditorService),
    __param(4, IProgressService),
    __param(5, INotificationService),
    __param(6, IDialogService),
    __param(7, ICommandService),
    __param(8, IContextViewService),
    __param(9, IInstantiationService),
    __param(10, IViewDescriptorService),
    __param(11, IConfigurationService),
    __param(12, IWorkspaceContextService),
    __param(13, ISearchViewModelWorkbenchService),
    __param(14, IContextKeyService),
    __param(15, IReplaceService),
    __param(16, ITextFileService),
    __param(17, IPreferencesService),
    __param(18, IThemeService),
    __param(19, ISearchHistoryService),
    __param(20, IContextMenuService),
    __param(21, IAccessibilityService),
    __param(22, IKeybindingService),
    __param(23, IStorageService),
    __param(24, ISearchService),
    __param(25, IOpenerService),
    __param(26, IHoverService),
    __param(27, INotebookService),
    __param(28, ILogService),
    __param(29, IAccessibilitySignalService)
], SearchView);
export { SearchView };
class SearchLinkButton extends Disposable {
    constructor(label, handler, hoverService, tooltip) {
        super();
        this.element = $('a.pointer', { tabindex: 0 }, label);
        this._register(hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.element, tooltip));
        this.addEventHandlers(handler);
    }
    addEventHandlers(handler) {
        const wrappedHandler = (e) => {
            dom.EventHelper.stop(e, false);
            handler(e);
        };
        this._register(dom.addDisposableListener(this.element, dom.EventType.CLICK, wrappedHandler));
        this._register(dom.addDisposableListener(this.element, dom.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(10 /* KeyCode.Space */) || event.equals(3 /* KeyCode.Enter */)) {
                wrappedHandler(e);
                event.preventDefault();
                event.stopPropagation();
            }
        }));
    }
}
export function getEditorSelectionFromMatch(element, viewModel) {
    let match = null;
    if (isSearchTreeMatch(element)) {
        match = element;
    }
    if (isSearchTreeFileMatch(element) && element.count() > 0) {
        match = element.matches()[element.matches().length - 1];
    }
    if (match) {
        const range = match.range();
        if (viewModel.isReplaceActive() && !!viewModel.replaceString) {
            const replaceString = match.replaceString;
            return {
                startLineNumber: range.startLineNumber,
                startColumn: range.startColumn,
                endLineNumber: range.startLineNumber,
                endColumn: range.startColumn + replaceString.length,
            };
        }
        return range;
    }
    return undefined;
}
export function getSelectionTextFromEditor(allowUnselectedWord, activeEditor) {
    let editor = activeEditor;
    if (isDiffEditor(editor)) {
        if (editor.getOriginalEditor().hasTextFocus()) {
            editor = editor.getOriginalEditor();
        }
        else {
            editor = editor.getModifiedEditor();
        }
    }
    if (!isCodeEditor(editor) || !editor.hasModel()) {
        return null;
    }
    const range = editor.getSelection();
    if (!range) {
        return null;
    }
    if (range.isEmpty()) {
        if (allowUnselectedWord) {
            const wordAtPosition = editor.getModel().getWordAtPosition(range.getStartPosition());
            return wordAtPosition?.word ?? null;
        }
        else {
            return null;
        }
    }
    let searchText = '';
    for (let i = range.startLineNumber; i <= range.endLineNumber; i++) {
        let lineText = editor.getModel().getLineContent(i);
        if (i === range.endLineNumber) {
            lineText = lineText.substring(0, range.endColumn - 1);
        }
        if (i === range.startLineNumber) {
            lineText = lineText.substring(range.startColumn - 1);
        }
        if (i !== range.startLineNumber) {
            lineText = '\n' + lineText;
        }
        searchText += lineText;
    }
    return searchText;
}
let SearchViewDataSource = class SearchViewDataSource {
    constructor(searchView, configurationService) {
        this.searchView = searchView;
        this.configurationService = configurationService;
    }
    get searchConfig() {
        return this.configurationService.getValue('search');
    }
    createSearchResultIterator(searchResult) {
        const ret = [];
        if (this.searchView.shouldShowAIResults() &&
            searchResult.searchModel.hasPlainResults &&
            !searchResult.aiTextSearchResult.hidden) {
            // as long as there is a query present, we can load AI results
            ret.push(searchResult.aiTextSearchResult);
        }
        if (!searchResult.plainTextSearchResult.isEmpty()) {
            if (!this.searchView.shouldShowAIResults() || searchResult.aiTextSearchResult.hidden) {
                // only one root, so just return the children
                return this.createTextSearchResultIterator(searchResult.plainTextSearchResult);
            }
            ret.push(searchResult.plainTextSearchResult);
        }
        return ret;
    }
    createTextSearchResultIterator(textSearchResult) {
        const folderMatches = textSearchResult
            .folderMatches()
            .filter((fm) => !fm.isEmpty())
            .sort(searchMatchComparer);
        if (folderMatches.length === 1) {
            return this.createFolderIterator(folderMatches[0]);
        }
        return folderMatches;
    }
    createFolderIterator(folderMatch) {
        const matchArray = this.searchView.isTreeLayoutViewVisible
            ? folderMatch.matches()
            : folderMatch.allDownstreamFileMatches();
        let matches = matchArray;
        if (!(folderMatch instanceof AIFolderMatchWorkspaceRootImpl)) {
            matches = matchArray.sort((a, b) => searchMatchComparer(a, b, this.searchConfig.sortOrder));
        }
        return matches;
    }
    createFileIterator(fileMatch) {
        const matches = fileMatch.matches().sort(searchMatchComparer);
        return matches;
    }
    hasChildren(element) {
        if (isSearchTreeMatch(element)) {
            return false;
        }
        if (isTextSearchHeading(element) && element.isAIContributed) {
            return true;
        }
        const hasChildren = element.hasChildren;
        return hasChildren;
    }
    getChildren(element) {
        if (isSearchResult(element)) {
            return this.createSearchResultIterator(element);
        }
        else if (isTextSearchHeading(element)) {
            if (element.isAIContributed && !this.searchView.model.hasAIResults) {
                return this.searchView
                    .addAIResults()
                    .then(() => this.createTextSearchResultIterator(element));
            }
            return this.createTextSearchResultIterator(element);
        }
        else if (isSearchTreeFolderMatch(element)) {
            return this.createFolderIterator(element);
        }
        else if (isSearchTreeFileMatch(element)) {
            return this.createFileIterator(element);
        }
        return [];
    }
    getParent(element) {
        const parent = element.parent();
        if (isSearchResult(parent)) {
            throw new Error('Invalid element passed to getParent');
        }
        return parent;
    }
};
SearchViewDataSource = __decorate([
    __param(1, IConfigurationService)
], SearchViewDataSource);
let RefreshTreeController = class RefreshTreeController extends Disposable {
    constructor(searchView, geSearchConfig, fileService) {
        super();
        this.searchView = searchView;
        this.geSearchConfig = geSearchConfig;
        this.fileService = fileService;
        this.queuedIChangeEvents = [];
        this.refreshTreeThrottler = this._register(new Throttler());
    }
    async queue(e) {
        if (e) {
            this.queuedIChangeEvents.push(e);
        }
        return this.refreshTreeThrottler.queue(this.refreshTreeUsingQueue.bind(this));
    }
    async refreshTreeUsingQueue() {
        const aggregateChangeEvent = this.queuedIChangeEvents.length === 0
            ? undefined
            : {
                elements: this.queuedIChangeEvents.map((e) => e.elements).flat(),
                added: this.queuedIChangeEvents.some((e) => e.added),
                removed: this.queuedIChangeEvents.some((e) => e.removed),
                clearingAll: this.queuedIChangeEvents.some((e) => e.clearingAll),
            };
        this.queuedIChangeEvents = [];
        return this.refreshTree(aggregateChangeEvent);
    }
    async retrieveFileStats() {
        const files = this.searchView.model.searchResult
            .matches()
            .filter((f) => !f.fileStat)
            .map((f) => f.resolveFileStat(this.fileService));
        await Promise.all(files);
    }
    async refreshTree(event) {
        const searchConfig = this.geSearchConfig();
        if (!event || event.added || event.removed) {
            // Refresh whole tree
            if (searchConfig.sortOrder === "modified" /* SearchSortOrder.Modified */) {
                // Ensure all matches have retrieved their file stat
                await this.retrieveFileStats().then(() => this.searchView.getControl().updateChildren(undefined));
            }
            else {
                await this.searchView.getControl().updateChildren(undefined);
            }
        }
        else {
            // If updated counts affect our search order, re-sort the view.
            if (searchConfig.sortOrder === "countAscending" /* SearchSortOrder.CountAscending */ ||
                searchConfig.sortOrder === "countDescending" /* SearchSortOrder.CountDescending */) {
                await this.searchView.getControl().updateChildren(undefined);
            }
            else {
                const treeHasAllElements = event.elements.every((elem) => this.searchView.getControl().hasNode(elem));
                if (treeHasAllElements) {
                    // IFileMatchInstance modified, refresh those elements
                    await Promise.all(event.elements.map(async (element) => {
                        await this.searchView.getControl().updateChildren(element);
                        this.searchView.getControl().rerender(element);
                    }));
                }
                else {
                    this.searchView.getControl().updateChildren(undefined);
                }
            }
        }
    }
};
RefreshTreeController = __decorate([
    __param(2, IFileService)
], RefreshTreeController);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3NlYXJjaFZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDakYsT0FBTyxLQUFLLElBQUksTUFBTSwwQ0FBMEMsQ0FBQTtBQUdoRSxPQUFPLEVBR04sOEJBQThCLEdBQzlCLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN2RixPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9GLE9BQU8sS0FBSyxHQUFHLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLHdCQUF3QixDQUFBO0FBQy9CLE9BQU8sRUFDTixhQUFhLEVBQ2IsWUFBWSxFQUNaLFlBQVksR0FDWixNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBFQUEw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