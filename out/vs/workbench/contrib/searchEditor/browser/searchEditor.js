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
var SearchEditor_1;
import * as DOM from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { Delayer } from '../../../../base/common/async.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import './media/searchEditor.css';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { ReferencesController } from '../../../../editor/contrib/gotoSymbol/browser/peek/referencesController.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IEditorProgressService, LongRunningOperation, } from '../../../../platform/progress/common/progress.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { inputBorder, registerColor } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { AbstractTextCodeEditor } from '../../../browser/parts/editor/textCodeEditor.js';
import { ExcludePatternInputWidget, IncludePatternInputWidget, } from '../../search/browser/patternInputWidget.js';
import { SearchWidget } from '../../search/browser/searchWidget.js';
import { QueryBuilder, } from '../../../services/search/common/queryBuilder.js';
import { getOutOfWorkspaceEditorResources } from '../../search/common/search.js';
import { SearchModelImpl } from '../../search/browser/searchTreeModel/searchModel.js';
import { InSearchEditor, SearchEditorID, SearchEditorInputTypeId, } from './constants.js';
import { serializeSearchResultForEditor } from './searchEditorSerialization.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { searchDetailsIcon } from '../../search/browser/searchIcons.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { renderSearchMessage } from '../../search/browser/searchMessage.js';
import { EditorExtensionsRegistry, } from '../../../../editor/browser/editorExtensions.js';
import { UnusualLineTerminatorsDetector } from '../../../../editor/contrib/unusualLineTerminators/browser/unusualLineTerminators.js';
import { defaultToggleStyles, getInputBoxStyle, } from '../../../../platform/theme/browser/defaultStyles.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { SearchContext } from '../../search/common/constants.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
const RESULT_LINE_REGEX = /^(\s+)(\d+)(: |  )(\s*)(.*)$/;
const FILE_LINE_REGEX = /^(\S.*):$/;
let SearchEditor = class SearchEditor extends AbstractTextCodeEditor {
    static { SearchEditor_1 = this; }
    static { this.ID = SearchEditorID; }
    static { this.SEARCH_EDITOR_VIEW_STATE_PREFERENCE_KEY = 'searchEditorViewState'; }
    get searchResultEditor() {
        return this.editorControl;
    }
    constructor(group, telemetryService, themeService, storageService, modelService, contextService, labelService, instantiationService, contextViewService, commandService, openerService, notificationService, progressService, textResourceService, editorGroupService, editorService, configurationService, fileService, logService, hoverService) {
        super(SearchEditor_1.ID, group, telemetryService, instantiationService, storageService, textResourceService, themeService, editorService, editorGroupService, fileService);
        this.modelService = modelService;
        this.contextService = contextService;
        this.labelService = labelService;
        this.contextViewService = contextViewService;
        this.commandService = commandService;
        this.openerService = openerService;
        this.notificationService = notificationService;
        this.configurationService = configurationService;
        this.logService = logService;
        this.hoverService = hoverService;
        this.runSearchDelayer = new Delayer(0);
        this.pauseSearching = false;
        this.showingIncludesExcludes = false;
        this.ongoingOperations = 0;
        this.updatingModelForSearch = false;
        this.container = DOM.$('.search-editor');
        this.searchOperation = this._register(new LongRunningOperation(progressService));
        this._register((this.messageDisposables = new DisposableStore()));
        this.searchHistoryDelayer = new Delayer(2000);
        this.searchModel = this._register(this.instantiationService.createInstance(SearchModelImpl));
    }
    createEditor(parent) {
        DOM.append(parent, this.container);
        this.queryEditorContainer = DOM.append(this.container, DOM.$('.query-container'));
        const searchResultContainer = DOM.append(this.container, DOM.$('.search-results'));
        super.createEditor(searchResultContainer);
        this.registerEditorListeners();
        const scopedContextKeyService = assertIsDefined(this.scopedContextKeyService);
        InSearchEditor.bindTo(scopedContextKeyService).set(true);
        this.createQueryEditor(this.queryEditorContainer, this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, scopedContextKeyService]))), SearchContext.InputBoxFocusedKey.bindTo(scopedContextKeyService));
    }
    createQueryEditor(container, scopedInstantiationService, inputBoxFocusedContextKey) {
        const searchEditorInputboxStyles = getInputBoxStyle({
            inputBorder: searchEditorTextInputBorder,
        });
        this.queryEditorWidget = this._register(scopedInstantiationService.createInstance(SearchWidget, container, {
            _hideReplaceToggle: true,
            showContextToggle: true,
            inputBoxStyles: searchEditorInputboxStyles,
            toggleStyles: defaultToggleStyles,
        }));
        this._register(this.queryEditorWidget.onReplaceToggled(() => this.reLayout()));
        this._register(this.queryEditorWidget.onDidHeightChange(() => this.reLayout()));
        this._register(this.queryEditorWidget.onSearchSubmit(({ delay }) => this.triggerSearch({ delay })));
        if (this.queryEditorWidget.searchInput) {
            this._register(this.queryEditorWidget.searchInput.onDidOptionChange(() => this.triggerSearch({ resetCursor: false })));
        }
        else {
            this.logService.warn('SearchEditor: SearchWidget.searchInput is undefined, cannot register onDidOptionChange listener');
        }
        this._register(this.queryEditorWidget.onDidToggleContext(() => this.triggerSearch({ resetCursor: false })));
        // Includes/Excludes Dropdown
        this.includesExcludesContainer = DOM.append(container, DOM.$('.includes-excludes'));
        // Toggle query details button
        const toggleQueryDetailsLabel = localize('moreSearch', 'Toggle Search Details');
        this.toggleQueryDetailsButton = DOM.append(this.includesExcludesContainer, DOM.$('.expand' + ThemeIcon.asCSSSelector(searchDetailsIcon), {
            tabindex: 0,
            role: 'button',
            'aria-label': toggleQueryDetailsLabel,
        }));
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), this.toggleQueryDetailsButton, toggleQueryDetailsLabel));
        this._register(DOM.addDisposableListener(this.toggleQueryDetailsButton, DOM.EventType.CLICK, (e) => {
            DOM.EventHelper.stop(e);
            this.toggleIncludesExcludes();
        }));
        this._register(DOM.addDisposableListener(this.toggleQueryDetailsButton, DOM.EventType.KEY_UP, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(3 /* KeyCode.Enter */) || event.equals(10 /* KeyCode.Space */)) {
                DOM.EventHelper.stop(e);
                this.toggleIncludesExcludes();
            }
        }));
        this._register(DOM.addDisposableListener(this.toggleQueryDetailsButton, DOM.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */)) {
                if (this.queryEditorWidget.isReplaceActive()) {
                    this.queryEditorWidget.focusReplaceAllAction();
                }
                else {
                    this.queryEditorWidget.isReplaceShown()
                        ? this.queryEditorWidget.replaceInput?.focusOnPreserve()
                        : this.queryEditorWidget.focusRegexAction();
                }
                DOM.EventHelper.stop(e);
            }
        }));
        // Includes
        const folderIncludesList = DOM.append(this.includesExcludesContainer, DOM.$('.file-types.includes'));
        const filesToIncludeTitle = localize('searchScope.includes', 'files to include');
        DOM.append(folderIncludesList, DOM.$('h4', undefined, filesToIncludeTitle));
        this.inputPatternIncludes = this._register(scopedInstantiationService.createInstance(IncludePatternInputWidget, folderIncludesList, this.contextViewService, {
            ariaLabel: localize('label.includes', 'Search Include Patterns'),
            inputBoxStyles: searchEditorInputboxStyles,
        }));
        this._register(this.inputPatternIncludes.onSubmit((triggeredOnType) => this.triggerSearch({
            resetCursor: false,
            delay: triggeredOnType ? this.searchConfig.searchOnTypeDebouncePeriod : 0,
        })));
        this._register(this.inputPatternIncludes.onChangeSearchInEditorsBox(() => this.triggerSearch()));
        // Excludes
        const excludesList = DOM.append(this.includesExcludesContainer, DOM.$('.file-types.excludes'));
        const excludesTitle = localize('searchScope.excludes', 'files to exclude');
        DOM.append(excludesList, DOM.$('h4', undefined, excludesTitle));
        this.inputPatternExcludes = this._register(scopedInstantiationService.createInstance(ExcludePatternInputWidget, excludesList, this.contextViewService, {
            ariaLabel: localize('label.excludes', 'Search Exclude Patterns'),
            inputBoxStyles: searchEditorInputboxStyles,
        }));
        this._register(this.inputPatternExcludes.onSubmit((triggeredOnType) => this.triggerSearch({
            resetCursor: false,
            delay: triggeredOnType ? this.searchConfig.searchOnTypeDebouncePeriod : 0,
        })));
        this._register(this.inputPatternExcludes.onChangeIgnoreBox(() => this.triggerSearch()));
        // Messages
        this.messageBox = DOM.append(container, DOM.$('.messages.text-search-provider-messages'));
        [
            this.queryEditorWidget.searchInputFocusTracker,
            this.queryEditorWidget.replaceInputFocusTracker,
            this.inputPatternExcludes.inputFocusTracker,
            this.inputPatternIncludes.inputFocusTracker,
        ].forEach((tracker) => {
            if (!tracker) {
                return;
            }
            this._register(tracker.onDidFocus(() => setTimeout(() => inputBoxFocusedContextKey.set(true), 0)));
            this._register(tracker.onDidBlur(() => inputBoxFocusedContextKey.set(false)));
        });
    }
    toggleRunAgainMessage(show) {
        DOM.clearNode(this.messageBox);
        this.messageDisposables.clear();
        if (show) {
            const runAgainLink = DOM.append(this.messageBox, DOM.$('a.pointer.prominent.message', {}, localize('runSearch', 'Run Search')));
            this.messageDisposables.add(DOM.addDisposableListener(runAgainLink, DOM.EventType.CLICK, async () => {
                await this.triggerSearch();
                this.searchResultEditor.focus();
            }));
        }
    }
    _getContributions() {
        const skipContributions = [UnusualLineTerminatorsDetector.ID];
        return EditorExtensionsRegistry.getEditorContributions().filter((c) => skipContributions.indexOf(c.id) === -1);
    }
    getCodeEditorWidgetOptions() {
        return { contributions: this._getContributions() };
    }
    registerEditorListeners() {
        this._register(this.searchResultEditor.onMouseUp((e) => {
            if (e.event.detail === 1) {
                const behaviour = this.searchConfig.searchEditor.singleClickBehaviour;
                const position = e.target.position;
                if (position && behaviour === 'peekDefinition') {
                    const line = this.searchResultEditor.getModel()?.getLineContent(position.lineNumber) ?? '';
                    if (line.match(FILE_LINE_REGEX) || line.match(RESULT_LINE_REGEX)) {
                        this.searchResultEditor.setSelection(Range.fromPositions(position));
                        this.commandService.executeCommand('editor.action.peekDefinition');
                    }
                }
            }
            else if (e.event.detail === 2) {
                const behaviour = this.searchConfig.searchEditor.doubleClickBehaviour;
                const position = e.target.position;
                if (position && behaviour !== 'selectWord') {
                    const line = this.searchResultEditor.getModel()?.getLineContent(position.lineNumber) ?? '';
                    if (line.match(RESULT_LINE_REGEX)) {
                        this.searchResultEditor.setSelection(Range.fromPositions(position));
                        this.commandService.executeCommand(behaviour === 'goToLocation'
                            ? 'editor.action.goToDeclaration'
                            : 'editor.action.openDeclarationToTheSide');
                    }
                    else if (line.match(FILE_LINE_REGEX)) {
                        this.searchResultEditor.setSelection(Range.fromPositions(position));
                        this.commandService.executeCommand('editor.action.peekDefinition');
                    }
                }
            }
        }));
        this._register(this.searchResultEditor.onDidChangeModelContent(() => {
            if (!this.updatingModelForSearch) {
                this.getInput()?.setDirty(true);
            }
        }));
    }
    getControl() {
        return this.searchResultEditor;
    }
    focus() {
        super.focus();
        const viewState = this.loadEditorViewState(this.getInput());
        if (viewState && viewState.focused === 'editor') {
            this.searchResultEditor.focus();
        }
        else {
            this.queryEditorWidget.focus();
        }
    }
    focusSearchInput() {
        this.queryEditorWidget.searchInput?.focus();
    }
    focusFilesToIncludeInput() {
        if (!this.showingIncludesExcludes) {
            this.toggleIncludesExcludes(true);
        }
        this.inputPatternIncludes.focus();
    }
    focusFilesToExcludeInput() {
        if (!this.showingIncludesExcludes) {
            this.toggleIncludesExcludes(true);
        }
        this.inputPatternExcludes.focus();
    }
    focusNextInput() {
        if (this.queryEditorWidget.searchInputHasFocus()) {
            if (this.showingIncludesExcludes) {
                this.inputPatternIncludes.focus();
            }
            else {
                this.searchResultEditor.focus();
            }
        }
        else if (this.inputPatternIncludes.inputHasFocus()) {
            this.inputPatternExcludes.focus();
        }
        else if (this.inputPatternExcludes.inputHasFocus()) {
            this.searchResultEditor.focus();
        }
        else if (this.searchResultEditor.hasWidgetFocus()) {
            // pass
        }
    }
    focusPrevInput() {
        if (this.queryEditorWidget.searchInputHasFocus()) {
            this.searchResultEditor.focus(); // wrap
        }
        else if (this.inputPatternIncludes.inputHasFocus()) {
            this.queryEditorWidget.searchInput?.focus();
        }
        else if (this.inputPatternExcludes.inputHasFocus()) {
            this.inputPatternIncludes.focus();
        }
        else if (this.searchResultEditor.hasWidgetFocus()) {
            // unreachable.
        }
    }
    setQuery(query) {
        this.queryEditorWidget.searchInput?.setValue(query);
    }
    selectQuery() {
        this.queryEditorWidget.searchInput?.select();
    }
    toggleWholeWords() {
        this.queryEditorWidget.searchInput?.setWholeWords(!this.queryEditorWidget.searchInput.getWholeWords());
        this.triggerSearch({ resetCursor: false });
    }
    toggleRegex() {
        this.queryEditorWidget.searchInput?.setRegex(!this.queryEditorWidget.searchInput.getRegex());
        this.triggerSearch({ resetCursor: false });
    }
    toggleCaseSensitive() {
        this.queryEditorWidget.searchInput?.setCaseSensitive(!this.queryEditorWidget.searchInput.getCaseSensitive());
        this.triggerSearch({ resetCursor: false });
    }
    toggleContextLines() {
        this.queryEditorWidget.toggleContextLines();
    }
    modifyContextLines(increase) {
        this.queryEditorWidget.modifyContextLines(increase);
    }
    toggleQueryDetails(shouldShow) {
        this.toggleIncludesExcludes(shouldShow);
    }
    deleteResultBlock() {
        const linesToDelete = new Set();
        const selections = this.searchResultEditor.getSelections();
        const model = this.searchResultEditor.getModel();
        if (!(selections && model)) {
            return;
        }
        const maxLine = model.getLineCount();
        const minLine = 1;
        const deleteUp = (start) => {
            for (let cursor = start; cursor >= minLine; cursor--) {
                const line = model.getLineContent(cursor);
                linesToDelete.add(cursor);
                if (line[0] !== undefined && line[0] !== ' ') {
                    break;
                }
            }
        };
        const deleteDown = (start) => {
            linesToDelete.add(start);
            for (let cursor = start + 1; cursor <= maxLine; cursor++) {
                const line = model.getLineContent(cursor);
                if (line[0] !== undefined && line[0] !== ' ') {
                    return cursor;
                }
                linesToDelete.add(cursor);
            }
            return;
        };
        const endingCursorLines = [];
        for (const selection of selections) {
            const lineNumber = selection.startLineNumber;
            endingCursorLines.push(deleteDown(lineNumber));
            deleteUp(lineNumber);
            for (let inner = selection.startLineNumber; inner <= selection.endLineNumber; inner++) {
                linesToDelete.add(inner);
            }
        }
        if (endingCursorLines.length === 0) {
            endingCursorLines.push(1);
        }
        const isDefined = (x) => x !== undefined;
        model.pushEditOperations(this.searchResultEditor.getSelections(), [...linesToDelete].map((line) => ({ range: new Range(line, 1, line + 1, 1), text: '' })), () => endingCursorLines.filter(isDefined).map((line) => new Selection(line, 1, line, 1)));
    }
    cleanState() {
        this.getInput()?.setDirty(false);
    }
    get searchConfig() {
        return this.configurationService.getValue('search');
    }
    iterateThroughMatches(reverse) {
        const model = this.searchResultEditor.getModel();
        if (!model) {
            return;
        }
        const lastLine = model.getLineCount() ?? 1;
        const lastColumn = model.getLineLength(lastLine);
        const fallbackStart = reverse ? new Position(lastLine, lastColumn) : new Position(1, 1);
        const currentPosition = this.searchResultEditor.getSelection()?.getStartPosition() ?? fallbackStart;
        const matchRanges = this.getInput()?.getMatchRanges();
        if (!matchRanges) {
            return;
        }
        const matchRange = (reverse ? findPrevRange : findNextRange)(matchRanges, currentPosition);
        if (!matchRange) {
            return;
        }
        this.searchResultEditor.setSelection(matchRange);
        this.searchResultEditor.revealLineInCenterIfOutsideViewport(matchRange.startLineNumber);
        this.searchResultEditor.focus();
        const matchLineText = model.getLineContent(matchRange.startLineNumber);
        const matchText = model.getValueInRange(matchRange);
        let file = '';
        for (let line = matchRange.startLineNumber; line >= 1; line--) {
            const lineText = model.getValueInRange(new Range(line, 1, line, 2));
            if (lineText !== ' ') {
                file = model.getLineContent(line);
                break;
            }
        }
        alert(localize('searchResultItem', 'Matched {0} at {1} in file {2}', matchText, matchLineText, file.slice(0, file.length - 1)));
    }
    focusNextResult() {
        this.iterateThroughMatches(false);
    }
    focusPreviousResult() {
        this.iterateThroughMatches(true);
    }
    focusAllResults() {
        this.searchResultEditor.setSelections((this.getInput()?.getMatchRanges() ?? []).map((range) => new Selection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn)));
        this.searchResultEditor.focus();
    }
    async triggerSearch(_options) {
        const focusResults = this.searchConfig.searchEditor.focusResultsOnSearch;
        // If _options don't define focusResult field, then use the setting
        if (_options === undefined) {
            _options = { focusResults: focusResults };
        }
        else if (_options.focusResults === undefined) {
            _options.focusResults = focusResults;
        }
        const options = { resetCursor: true, delay: 0, ..._options };
        if (!this.queryEditorWidget.searchInput?.inputBox.isInputValid()) {
            return;
        }
        if (!this.pauseSearching) {
            await this.runSearchDelayer.trigger(async () => {
                this.toggleRunAgainMessage(false);
                await this.doRunSearch();
                if (options.resetCursor) {
                    this.searchResultEditor.setPosition(new Position(1, 1));
                    this.searchResultEditor.setScrollPosition({ scrollTop: 0, scrollLeft: 0 });
                }
                if (options.focusResults) {
                    this.searchResultEditor.focus();
                }
            }, options.delay);
        }
    }
    readConfigFromWidget() {
        return {
            isCaseSensitive: this.queryEditorWidget.searchInput?.getCaseSensitive() ?? false,
            contextLines: this.queryEditorWidget.getContextLines(),
            filesToExclude: this.inputPatternExcludes.getValue(),
            filesToInclude: this.inputPatternIncludes.getValue(),
            query: this.queryEditorWidget.searchInput?.getValue() ?? '',
            isRegexp: this.queryEditorWidget.searchInput?.getRegex() ?? false,
            matchWholeWord: this.queryEditorWidget.searchInput?.getWholeWords() ?? false,
            useExcludeSettingsAndIgnoreFiles: this.inputPatternExcludes.useExcludesAndIgnoreFiles(),
            onlyOpenEditors: this.inputPatternIncludes.onlySearchInOpenEditors(),
            showIncludesExcludes: this.showingIncludesExcludes,
            notebookSearchConfig: {
                includeMarkupInput: this.queryEditorWidget.getNotebookFilters().markupInput,
                includeMarkupPreview: this.queryEditorWidget.getNotebookFilters().markupPreview,
                includeCodeInput: this.queryEditorWidget.getNotebookFilters().codeInput,
                includeOutput: this.queryEditorWidget.getNotebookFilters().codeOutput,
            },
        };
    }
    async doRunSearch() {
        this.searchModel.cancelSearch(true);
        const startInput = this.getInput();
        if (!startInput) {
            return;
        }
        this.searchHistoryDelayer.trigger(() => {
            this.queryEditorWidget.searchInput?.onSearchSubmit();
            this.inputPatternExcludes.onSearchSubmit();
            this.inputPatternIncludes.onSearchSubmit();
        });
        const config = this.readConfigFromWidget();
        if (!config.query) {
            return;
        }
        const content = {
            pattern: config.query,
            isRegExp: config.isRegexp,
            isCaseSensitive: config.isCaseSensitive,
            isWordMatch: config.matchWholeWord,
        };
        const options = {
            _reason: 'searchEditor',
            extraFileResources: this.instantiationService.invokeFunction(getOutOfWorkspaceEditorResources),
            maxResults: this.searchConfig.maxResults ?? undefined,
            disregardIgnoreFiles: !config.useExcludeSettingsAndIgnoreFiles || undefined,
            disregardExcludeSettings: !config.useExcludeSettingsAndIgnoreFiles || undefined,
            excludePattern: [{ pattern: config.filesToExclude }],
            includePattern: config.filesToInclude,
            onlyOpenEditors: config.onlyOpenEditors,
            previewOptions: {
                matchLines: 1,
                charsPerLine: 1000,
            },
            surroundingContext: config.contextLines,
            isSmartCase: this.searchConfig.smartCase,
            expandPatterns: true,
            notebookSearchConfig: {
                includeMarkupInput: config.notebookSearchConfig.includeMarkupInput,
                includeMarkupPreview: config.notebookSearchConfig.includeMarkupPreview,
                includeCodeInput: config.notebookSearchConfig.includeCodeInput,
                includeOutput: config.notebookSearchConfig.includeOutput,
            },
        };
        const folderResources = this.contextService.getWorkspace().folders;
        let query;
        try {
            const queryBuilder = this.instantiationService.createInstance(QueryBuilder);
            query = queryBuilder.text(content, folderResources.map((folder) => folder.uri), options);
        }
        catch (err) {
            return;
        }
        this.searchOperation.start(500);
        this.ongoingOperations++;
        const { configurationModel } = await startInput.resolveModels();
        configurationModel.updateConfig(config);
        const result = this.searchModel.search(query);
        startInput.ongoingSearchOperation = result.asyncResults.finally(() => {
            this.ongoingOperations--;
            if (this.ongoingOperations === 0) {
                this.searchOperation.stop();
            }
        });
        const searchOperation = await startInput.ongoingSearchOperation;
        await this.onSearchComplete(searchOperation, config, startInput);
    }
    async onSearchComplete(searchOperation, startConfig, startInput) {
        const input = this.getInput();
        if (!input ||
            input !== startInput ||
            JSON.stringify(startConfig) !== JSON.stringify(this.readConfigFromWidget())) {
            return;
        }
        input.ongoingSearchOperation = undefined;
        const sortOrder = this.searchConfig.sortOrder;
        if (sortOrder === "modified" /* SearchSortOrder.Modified */) {
            await this.retrieveFileStats(this.searchModel.searchResult);
        }
        const controller = ReferencesController.get(this.searchResultEditor);
        controller?.closeWidget(false);
        const labelFormatter = (uri) => this.labelService.getUriLabel(uri, { relative: true });
        const results = serializeSearchResultForEditor(this.searchModel.searchResult, startConfig.filesToInclude, startConfig.filesToExclude, startConfig.contextLines, labelFormatter, sortOrder, searchOperation?.limitHit);
        const { resultsModel } = await input.resolveModels();
        this.updatingModelForSearch = true;
        this.modelService.updateModel(resultsModel, results.text);
        this.updatingModelForSearch = false;
        if (searchOperation && searchOperation.messages) {
            for (const message of searchOperation.messages) {
                this.addMessage(message);
            }
        }
        this.reLayout();
        input.setDirty(!input.hasCapability(4 /* EditorInputCapabilities.Untitled */));
        input.setMatchRanges(results.matchRanges);
    }
    addMessage(message) {
        let messageBox;
        if (this.messageBox.firstChild) {
            messageBox = this.messageBox.firstChild;
        }
        else {
            messageBox = DOM.append(this.messageBox, DOM.$('.message'));
        }
        DOM.append(messageBox, renderSearchMessage(message, this.instantiationService, this.notificationService, this.openerService, this.commandService, this.messageDisposables, () => this.triggerSearch()));
    }
    async retrieveFileStats(searchResult) {
        const files = searchResult
            .matches()
            .filter((f) => !f.fileStat)
            .map((f) => f.resolveFileStat(this.fileService));
        await Promise.all(files);
    }
    layout(dimension) {
        this.dimension = dimension;
        this.reLayout();
    }
    getSelected() {
        const selection = this.searchResultEditor.getSelection();
        if (selection) {
            return this.searchResultEditor.getModel()?.getValueInRange(selection) ?? '';
        }
        return '';
    }
    reLayout() {
        if (this.dimension) {
            this.queryEditorWidget.setWidth(this.dimension.width - 28 /* container margin */);
            this.searchResultEditor.layout({
                height: this.dimension.height - DOM.getTotalHeight(this.queryEditorContainer),
                width: this.dimension.width,
            });
            this.inputPatternExcludes.setWidth(this.dimension.width - 28 /* container margin */);
            this.inputPatternIncludes.setWidth(this.dimension.width - 28 /* container margin */);
        }
    }
    getInput() {
        return this.input;
    }
    setSearchConfig(config) {
        this.priorConfig = config;
        if (config.query !== undefined) {
            this.queryEditorWidget.setValue(config.query);
        }
        if (config.isCaseSensitive !== undefined) {
            this.queryEditorWidget.searchInput?.setCaseSensitive(config.isCaseSensitive);
        }
        if (config.isRegexp !== undefined) {
            this.queryEditorWidget.searchInput?.setRegex(config.isRegexp);
        }
        if (config.matchWholeWord !== undefined) {
            this.queryEditorWidget.searchInput?.setWholeWords(config.matchWholeWord);
        }
        if (config.contextLines !== undefined) {
            this.queryEditorWidget.setContextLines(config.contextLines);
        }
        if (config.filesToExclude !== undefined) {
            this.inputPatternExcludes.setValue(config.filesToExclude);
        }
        if (config.filesToInclude !== undefined) {
            this.inputPatternIncludes.setValue(config.filesToInclude);
        }
        if (config.onlyOpenEditors !== undefined) {
            this.inputPatternIncludes.setOnlySearchInOpenEditors(config.onlyOpenEditors);
        }
        if (config.useExcludeSettingsAndIgnoreFiles !== undefined) {
            this.inputPatternExcludes.setUseExcludesAndIgnoreFiles(config.useExcludeSettingsAndIgnoreFiles);
        }
        if (config.showIncludesExcludes !== undefined) {
            this.toggleIncludesExcludes(config.showIncludesExcludes);
        }
    }
    async setInput(newInput, options, context, token) {
        await super.setInput(newInput, options, context, token);
        if (token.isCancellationRequested) {
            return;
        }
        const { configurationModel, resultsModel } = await newInput.resolveModels();
        if (token.isCancellationRequested) {
            return;
        }
        this.searchResultEditor.setModel(resultsModel);
        this.pauseSearching = true;
        this.toggleRunAgainMessage(!newInput.ongoingSearchOperation &&
            resultsModel.getLineCount() === 1 &&
            resultsModel.getValueLength() === 0 &&
            configurationModel.config.query !== '');
        this.setSearchConfig(configurationModel.config);
        this._register(configurationModel.onConfigDidUpdate((newConfig) => {
            if (newConfig !== this.priorConfig) {
                this.pauseSearching = true;
                this.setSearchConfig(newConfig);
                this.pauseSearching = false;
            }
        }));
        this.restoreViewState(context);
        if (!options?.preserveFocus) {
            this.focus();
        }
        this.pauseSearching = false;
        if (newInput.ongoingSearchOperation) {
            const existingConfig = this.readConfigFromWidget();
            newInput.ongoingSearchOperation.then((complete) => {
                this.onSearchComplete(complete, existingConfig, newInput);
            });
        }
    }
    toggleIncludesExcludes(_shouldShow) {
        const cls = 'expanded';
        const shouldShow = _shouldShow ?? !this.includesExcludesContainer.classList.contains(cls);
        if (shouldShow) {
            this.toggleQueryDetailsButton.setAttribute('aria-expanded', 'true');
            this.includesExcludesContainer.classList.add(cls);
        }
        else {
            this.toggleQueryDetailsButton.setAttribute('aria-expanded', 'false');
            this.includesExcludesContainer.classList.remove(cls);
        }
        this.showingIncludesExcludes = this.includesExcludesContainer.classList.contains(cls);
        this.reLayout();
    }
    toEditorViewStateResource(input) {
        if (input.typeId === SearchEditorInputTypeId) {
            return input.modelUri;
        }
        return undefined;
    }
    computeEditorViewState(resource) {
        const control = this.getControl();
        const editorViewState = control.saveViewState();
        if (!editorViewState) {
            return undefined;
        }
        if (resource.toString() !== this.getInput()?.modelUri.toString()) {
            return undefined;
        }
        return {
            ...editorViewState,
            focused: this.searchResultEditor.hasWidgetFocus() ? 'editor' : 'input',
        };
    }
    tracksEditorViewState(input) {
        return input.typeId === SearchEditorInputTypeId;
    }
    restoreViewState(context) {
        const viewState = this.loadEditorViewState(this.getInput(), context);
        if (viewState) {
            this.searchResultEditor.restoreViewState(viewState);
        }
    }
    getAriaLabel() {
        return this.getInput()?.getName() ?? localize('searchEditor', 'Search');
    }
};
SearchEditor = SearchEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, IModelService),
    __param(5, IWorkspaceContextService),
    __param(6, ILabelService),
    __param(7, IInstantiationService),
    __param(8, IContextViewService),
    __param(9, ICommandService),
    __param(10, IOpenerService),
    __param(11, INotificationService),
    __param(12, IEditorProgressService),
    __param(13, ITextResourceConfigurationService),
    __param(14, IEditorGroupsService),
    __param(15, IEditorService),
    __param(16, IConfigurationService),
    __param(17, IFileService),
    __param(18, ILogService),
    __param(19, IHoverService)
], SearchEditor);
export { SearchEditor };
const searchEditorTextInputBorder = registerColor('searchEditor.textInputBorder', inputBorder, localize('textInputBoxBorder', 'Search editor text input box border.'));
function findNextRange(matchRanges, currentPosition) {
    for (const matchRange of matchRanges) {
        if (Position.isBefore(currentPosition, matchRange.getStartPosition())) {
            return matchRange;
        }
    }
    return matchRanges[0];
}
function findPrevRange(matchRanges, currentPosition) {
    for (let i = matchRanges.length - 1; i >= 0; i--) {
        const matchRange = matchRanges[i];
        if (Position.isBefore(matchRange.getStartPosition(), currentPosition)) {
            {
                return matchRange;
            }
        }
    }
    return matchRanges[matchRanges.length - 1];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoRWRpdG9yL2Jyb3dzZXIvc2VhcmNoRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFHMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVsRSxPQUFPLDBCQUEwQixDQUFBO0FBRWpDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRXZFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUNuSCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQUNqSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8s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