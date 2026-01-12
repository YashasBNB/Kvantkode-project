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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2hFZGl0b3IvYnJvd3Nlci9zZWFyY2hFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDakYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUcxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRWxFLE9BQU8sMEJBQTBCLENBQUE7QUFFakMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFdkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ25ILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRFQUE0RSxDQUFBO0FBQ2pILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLG9CQUFvQixHQUNwQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFHeEYsT0FBTyxFQUNOLHlCQUF5QixFQUN6Qix5QkFBeUIsR0FDekIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbkUsT0FBTyxFQUVOLFlBQVksR0FDWixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNyRixPQUFPLEVBQ04sY0FBYyxFQUNkLGNBQWMsRUFDZCx1QkFBdUIsR0FFdkIsTUFBTSxnQkFBZ0IsQ0FBQTtBQUV2QixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMvRSxPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0sd0RBQXdELENBQUE7QUFDL0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBUWpGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFN0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFL0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDM0UsT0FBTyxFQUNOLHdCQUF3QixHQUV4QixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHFGQUFxRixDQUFBO0FBQ3BJLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsZ0JBQWdCLEdBQ2hCLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFHM0UsTUFBTSxpQkFBaUIsR0FBRyw4QkFBOEIsQ0FBQTtBQUN4RCxNQUFNLGVBQWUsR0FBRyxXQUFXLENBQUE7QUFJNUIsSUFBTSxZQUFZLEdBQWxCLE1BQU0sWUFBYSxTQUFRLHNCQUE2Qzs7YUFDOUQsT0FBRSxHQUFXLGNBQWMsQUFBekIsQ0FBeUI7YUFFM0IsNENBQXVDLEdBQUcsdUJBQXVCLEFBQTFCLENBQTBCO0lBR2pGLElBQVksa0JBQWtCO1FBQzdCLE9BQU8sSUFBSSxDQUFDLGFBQWMsQ0FBQTtJQUMzQixDQUFDO0lBb0JELFlBQ0MsS0FBbUIsRUFDQSxnQkFBbUMsRUFDdkMsWUFBMkIsRUFDekIsY0FBK0IsRUFDakMsWUFBNEMsRUFDakMsY0FBeUQsRUFDcEUsWUFBNEMsRUFDcEMsb0JBQTJDLEVBQzdDLGtCQUF3RCxFQUM1RCxjQUFnRCxFQUNqRCxhQUE4QyxFQUN4QyxtQkFBMEQsRUFDeEQsZUFBdUMsRUFDNUIsbUJBQXNELEVBQ25FLGtCQUF3QyxFQUM5QyxhQUE2QixFQUN0QixvQkFBcUQsRUFDOUQsV0FBeUIsRUFDMUIsVUFBd0MsRUFDdEMsWUFBNEM7UUFFM0QsS0FBSyxDQUNKLGNBQVksQ0FBQyxFQUFFLEVBQ2YsS0FBSyxFQUNMLGdCQUFnQixFQUNoQixvQkFBb0IsRUFDcEIsY0FBYyxFQUNkLG1CQUFtQixFQUNuQixZQUFZLEVBQ1osYUFBYSxFQUNiLGtCQUFrQixFQUNsQixXQUFXLENBQ1gsQ0FBQTtRQTVCK0IsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDaEIsbUJBQWMsR0FBZCxjQUFjLENBQTBCO1FBQ25ELGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBRXJCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDM0MsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQ2hDLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUN2Qix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXNCO1FBSy9DLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFFOUMsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUNyQixpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQS9CcEQscUJBQWdCLEdBQUcsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDakMsbUJBQWMsR0FBWSxLQUFLLENBQUE7UUFDL0IsNEJBQXVCLEdBQVksS0FBSyxDQUFBO1FBTXhDLHNCQUFpQixHQUFXLENBQUMsQ0FBQTtRQUM3QiwyQkFBc0IsR0FBWSxLQUFLLENBQUE7UUFvQzlDLElBQUksQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBRXhDLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLG9CQUFvQixDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUE7UUFDaEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVqRSxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxPQUFPLENBQU8sSUFBSSxDQUFDLENBQUE7UUFFbkQsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQTtJQUM3RixDQUFDO0lBRWtCLFlBQVksQ0FBQyxNQUFtQjtRQUNsRCxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDbEMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLHFCQUFxQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQTtRQUNsRixLQUFLLENBQUMsWUFBWSxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDekMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUE7UUFFOUIsTUFBTSx1QkFBdUIsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUE7UUFDN0UsY0FBYyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUV4RCxJQUFJLENBQUMsaUJBQWlCLENBQ3JCLElBQUksQ0FBQyxvQkFBb0IsRUFDekIsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUNwQyxJQUFJLGlCQUFpQixDQUFDLENBQUMsa0JBQWtCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQyxDQUNwRSxDQUNELEVBQ0QsYUFBYSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxDQUNoRSxDQUFBO0lBQ0YsQ0FBQztJQUVPLGlCQUFpQixDQUN4QixTQUFzQixFQUN0QiwwQkFBaUQsRUFDakQseUJBQStDO1FBRS9DLE1BQU0sMEJBQTBCLEdBQUcsZ0JBQWdCLENBQUM7WUFDbkQsV0FBVyxFQUFFLDJCQUEyQjtTQUN4QyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDdEMsMEJBQTBCLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSxTQUFTLEVBQUU7WUFDbEUsa0JBQWtCLEVBQUUsSUFBSTtZQUN4QixpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLGNBQWMsRUFBRSwwQkFBMEI7WUFDMUMsWUFBWSxFQUFFLG1CQUFtQjtTQUNqQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDOUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvRSxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUNuRixDQUFBO1FBQ0QsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDeEMsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxDQUN6RCxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQzFDLENBQ0QsQ0FBQTtRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQ25CLGlHQUFpRyxDQUNqRyxDQUFBO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUMzRixDQUFBO1FBRUQsNkJBQTZCO1FBQzdCLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQTtRQUVuRiw4QkFBOEI7UUFDOUIsTUFBTSx1QkFBdUIsR0FBRyxRQUFRLENBQUMsWUFBWSxFQUFFLHVCQUF1QixDQUFDLENBQUE7UUFDL0UsSUFBSSxDQUFDLHdCQUF3QixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQ3pDLElBQUksQ0FBQyx5QkFBeUIsRUFDOUIsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFO1lBQzdELFFBQVEsRUFBRSxDQUFDO1lBQ1gsSUFBSSxFQUFFLFFBQVE7WUFDZCxZQUFZLEVBQUUsdUJBQXVCO1NBQ3JDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUNsQyx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsRUFDbEMsSUFBSSxDQUFDLHdCQUF3QixFQUM3Qix1QkFBdUIsQ0FDdkIsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDbkYsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdkIsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUE7UUFDOUIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsR0FBRyxDQUFDLHFCQUFxQixDQUN4QixJQUFJLENBQUMsd0JBQXdCLEVBQzdCLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUNwQixDQUFDLENBQWdCLEVBQUUsRUFBRTtZQUNwQixNQUFNLEtBQUssR0FBRyxJQUFJLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzFDLElBQUksS0FBSyxDQUFDLE1BQU0sdUJBQWUsSUFBSSxLQUFLLENBQUMsTUFBTSx3QkFBZSxFQUFFLENBQUM7Z0JBQ2hFLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUN2QixJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtZQUM5QixDQUFDO1FBQ0YsQ0FBQyxDQUNELENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsR0FBRyxDQUFDLHFCQUFxQixDQUN4QixJQUFJLENBQUMsd0JBQXdCLEVBQzdCLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUN0QixDQUFDLENBQWdCLEVBQUUsRUFBRTtZQUNwQixNQUFNLEtBQUssR0FBRyxJQUFJLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzFDLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyw2Q0FBMEIsQ0FBQyxFQUFFLENBQUM7Z0JBQzlDLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUM7b0JBQzlDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO2dCQUMvQyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsRUFBRTt3QkFDdEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLEVBQUUsZUFBZSxFQUFFO3dCQUN4RCxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixFQUFFLENBQUE7Z0JBQzdDLENBQUM7Z0JBQ0QsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDeEIsQ0FBQztRQUNGLENBQUMsQ0FDRCxDQUNELENBQUE7UUFFRCxXQUFXO1FBQ1gsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUNwQyxJQUFJLENBQUMseUJBQXlCLEVBQzlCLEdBQUcsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FDN0IsQ0FBQTtRQUNELE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFDaEYsR0FBRyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsbUJBQW1CLENBQUMsQ0FBQyxDQUFBO1FBQzNFLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN6QywwQkFBMEIsQ0FBQyxjQUFjLENBQ3hDLHlCQUF5QixFQUN6QixrQkFBa0IsRUFDbEIsSUFBSSxDQUFDLGtCQUFrQixFQUN2QjtZQUNDLFNBQVMsRUFBRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUseUJBQXlCLENBQUM7WUFDaEUsY0FBYyxFQUFFLDBCQUEwQjtTQUMxQyxDQUNELENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQ3RELElBQUksQ0FBQyxhQUFhLENBQUM7WUFDbEIsV0FBVyxFQUFFLEtBQUs7WUFDbEIsS0FBSyxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUN6RSxDQUFDLENBQ0YsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsMEJBQTBCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVoRyxXQUFXO1FBQ1gsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUE7UUFDOUYsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFDMUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUE7UUFDL0QsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3pDLDBCQUEwQixDQUFDLGNBQWMsQ0FDeEMseUJBQXlCLEVBQ3pCLFlBQVksRUFDWixJQUFJLENBQUMsa0JBQWtCLEVBQ3ZCO1lBQ0MsU0FBUyxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSx5QkFBeUIsQ0FBQztZQUNoRSxjQUFjLEVBQUUsMEJBQTBCO1NBQzFDLENBQ0QsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FDdEQsSUFBSSxDQUFDLGFBQWEsQ0FBQztZQUNsQixXQUFXLEVBQUUsS0FBSztZQUNsQixLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3pFLENBQUMsQ0FDRixDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXZGLFdBQVc7UUFDWCxJQUFJLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMseUNBQXlDLENBQUMsQ0FBQyxDQUV4RjtRQUFBO1lBQ0EsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHVCQUF1QjtZQUM5QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsd0JBQXdCO1lBQy9DLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxpQkFBaUI7WUFDM0MsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQjtTQUMzQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ3JCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZCxPQUFNO1lBQ1AsQ0FBQztZQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQ2xGLENBQUE7WUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM5RSxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxJQUFhO1FBQzFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzlCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUUvQixJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FDOUIsSUFBSSxDQUFDLFVBQVUsRUFDZixHQUFHLENBQUMsQ0FBQyxDQUFDLDZCQUE2QixFQUFFLEVBQUUsRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQzdFLENBQUE7WUFDRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUMxQixHQUFHLENBQUMscUJBQXFCLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLEtBQUssSUFBSSxFQUFFO2dCQUN2RSxNQUFNLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtnQkFDMUIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ2hDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixNQUFNLGlCQUFpQixHQUFHLENBQUMsOEJBQThCLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDN0QsT0FBTyx3QkFBd0IsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLE1BQU0sQ0FDOUQsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQzdDLENBQUE7SUFDRixDQUFDO0lBRWtCLDBCQUEwQjtRQUM1QyxPQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLENBQUE7SUFDbkQsQ0FBQztJQUVPLHVCQUF1QjtRQUM5QixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN2QyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUMxQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxvQkFBb0IsQ0FBQTtnQkFDckUsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUE7Z0JBQ2xDLElBQUksUUFBUSxJQUFJLFNBQVMsS0FBSyxnQkFBZ0IsRUFBRSxDQUFDO29CQUNoRCxNQUFNLElBQUksR0FDVCxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLEVBQUUsY0FBYyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUE7b0JBQzlFLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQzt3QkFDbEUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7d0JBQ25FLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLDhCQUE4QixDQUFDLENBQUE7b0JBQ25FLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7aUJBQU0sSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDakMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsb0JBQW9CLENBQUE7Z0JBQ3JFLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFBO2dCQUNsQyxJQUFJLFFBQVEsSUFBSSxTQUFTLEtBQUssWUFBWSxFQUFFLENBQUM7b0JBQzVDLE1BQU0sSUFBSSxHQUNULElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsRUFBRSxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtvQkFDOUUsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQzt3QkFDbkMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7d0JBQ25FLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUNqQyxTQUFTLEtBQUssY0FBYzs0QkFDM0IsQ0FBQyxDQUFDLCtCQUErQjs0QkFDakMsQ0FBQyxDQUFDLHdDQUF3QyxDQUMzQyxDQUFBO29CQUNGLENBQUM7eUJBQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUM7d0JBQ3hDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO3dCQUNuRSxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBO29CQUNuRSxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtZQUNwRCxJQUFJLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDaEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRVEsVUFBVTtRQUNsQixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQTtJQUMvQixDQUFDO0lBRVEsS0FBSztRQUNiLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUViLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUMzRCxJQUFJLFNBQVMsSUFBSSxTQUFTLENBQUMsT0FBTyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2pELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNoQyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUMvQixDQUFDO0lBQ0YsQ0FBQztJQUVELGdCQUFnQjtRQUNmLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUE7SUFDNUMsQ0FBQztJQUVELHdCQUF3QjtRQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDbkMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2xDLENBQUM7UUFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDbEMsQ0FBQztJQUVELHdCQUF3QjtRQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDbkMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2xDLENBQUM7UUFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDbEMsQ0FBQztJQUVELGNBQWM7UUFDYixJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUM7WUFDbEQsSUFBSSxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDbEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ2xDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDaEMsQ0FBQztRQUNGLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDO1lBQ3RELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNsQyxDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQztZQUN0RCxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDaEMsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUM7WUFDckQsT0FBTztRQUNSLENBQUM7SUFDRixDQUFDO0lBRUQsY0FBYztRQUNiLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQztZQUNsRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUEsQ0FBQyxPQUFPO1FBQ3hDLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDO1lBQ3RELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUE7UUFDNUMsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUM7WUFDdEQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ2xDLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDO1lBQ3JELGVBQWU7UUFDaEIsQ0FBQztJQUNGLENBQUM7SUFFRCxRQUFRLENBQUMsS0FBYTtRQUNyQixJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNwRCxDQUFDO0lBRUQsV0FBVztRQUNWLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLENBQUE7SUFDN0MsQ0FBQztJQUVELGdCQUFnQjtRQUNmLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsYUFBYSxDQUNoRCxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLENBQ25ELENBQUE7UUFDRCxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELFdBQVc7UUFDVixJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUM1RixJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELG1CQUFtQjtRQUNsQixJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUNuRCxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsQ0FDdEQsQ0FBQTtRQUNELElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsa0JBQWtCO1FBQ2pCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO0lBQzVDLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxRQUFpQjtRQUNuQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDcEQsQ0FBQztJQUVELGtCQUFrQixDQUFDLFVBQW9CO1FBQ3RDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0lBRUQsaUJBQWlCO1FBQ2hCLE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUE7UUFFdkMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQzFELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNoRCxJQUFJLENBQUMsQ0FBQyxVQUFVLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM1QixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNwQyxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUE7UUFFakIsTUFBTSxRQUFRLEdBQUcsQ0FBQyxLQUFhLEVBQUUsRUFBRTtZQUNsQyxLQUFLLElBQUksTUFBTSxHQUFHLEtBQUssRUFBRSxNQUFNLElBQUksT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUM7Z0JBQ3RELE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ3pDLGFBQWEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ3pCLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7b0JBQzlDLE1BQUs7Z0JBQ04sQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUE7UUFFRCxNQUFNLFVBQVUsR0FBRyxDQUFDLEtBQWEsRUFBc0IsRUFBRTtZQUN4RCxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3hCLEtBQUssSUFBSSxNQUFNLEdBQUcsS0FBSyxHQUFHLENBQUMsRUFBRSxNQUFNLElBQUksT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUM7Z0JBQzFELE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ3pDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7b0JBQzlDLE9BQU8sTUFBTSxDQUFBO2dCQUNkLENBQUM7Z0JBQ0QsYUFBYSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUMxQixDQUFDO1lBQ0QsT0FBTTtRQUNQLENBQUMsQ0FBQTtRQUVELE1BQU0saUJBQWlCLEdBQThCLEVBQUUsQ0FBQTtRQUN2RCxLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxlQUFlLENBQUE7WUFDNUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1lBQzlDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUNwQixLQUFLLElBQUksS0FBSyxHQUFHLFNBQVMsQ0FBQyxlQUFlLEVBQUUsS0FBSyxJQUFJLFNBQVMsQ0FBQyxhQUFhLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQztnQkFDdkYsYUFBYSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUN6QixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksaUJBQWlCLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3BDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMxQixDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUcsQ0FBSSxDQUFnQixFQUFVLEVBQUUsQ0FBQyxDQUFDLEtBQUssU0FBUyxDQUFBO1FBRWxFLEtBQUssQ0FBQyxrQkFBa0IsQ0FDdkIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGFBQWEsRUFBRSxFQUN2QyxDQUFDLEdBQUcsYUFBYSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUN4RixHQUFHLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUN4RixDQUFBO0lBQ0YsQ0FBQztJQUVELFVBQVU7UUFDVCxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxJQUFZLFlBQVk7UUFDdkIsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFpQyxRQUFRLENBQUMsQ0FBQTtJQUNwRixDQUFDO0lBRU8scUJBQXFCLENBQUMsT0FBZ0I7UUFDN0MsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ2hELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMxQyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRWhELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxRQUFRLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFdkYsTUFBTSxlQUFlLEdBQ3BCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLGFBQWEsQ0FBQTtRQUU1RSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsY0FBYyxFQUFFLENBQUE7UUFDckQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2xCLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsV0FBVyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQzFGLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqQixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDaEQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLG1DQUFtQyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUN2RixJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFL0IsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDdEUsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNuRCxJQUFJLElBQUksR0FBRyxFQUFFLENBQUE7UUFDYixLQUFLLElBQUksSUFBSSxHQUFHLFVBQVUsQ0FBQyxlQUFlLEVBQUUsSUFBSSxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQy9ELE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxlQUFlLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNuRSxJQUFJLFFBQVEsS0FBSyxHQUFHLEVBQUUsQ0FBQztnQkFDdEIsSUFBSSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ2pDLE1BQUs7WUFDTixDQUFDO1FBQ0YsQ0FBQztRQUNELEtBQUssQ0FDSixRQUFRLENBQ1Asa0JBQWtCLEVBQ2xCLGdDQUFnQyxFQUNoQyxTQUFTLEVBQ1QsYUFBYSxFQUNiLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQzlCLENBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFRCxlQUFlO1FBQ2QsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxtQkFBbUI7UUFDbEIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxlQUFlO1FBQ2QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FDcEMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxDQUM1QyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQ1QsSUFBSSxTQUFTLENBQ1osS0FBSyxDQUFDLGVBQWUsRUFDckIsS0FBSyxDQUFDLFdBQVcsRUFDakIsS0FBSyxDQUFDLGFBQWEsRUFDbkIsS0FBSyxDQUFDLFNBQVMsQ0FDZixDQUNGLENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsS0FBSyxDQUFDLGFBQWEsQ0FBQyxRQUluQjtRQUNBLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLG9CQUFvQixDQUFBO1FBRXhFLG1FQUFtRTtRQUNuRSxJQUFJLFFBQVEsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM1QixRQUFRLEdBQUcsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLENBQUE7UUFDMUMsQ0FBQzthQUFNLElBQUksUUFBUSxDQUFDLFlBQVksS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNoRCxRQUFRLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQTtRQUNyQyxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxRQUFRLEVBQUUsQ0FBQTtRQUU1RCxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQztZQUNsRSxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDMUIsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxFQUFFO2dCQUM5QyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ2pDLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO2dCQUN4QixJQUFJLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDekIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDdkQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGlCQUFpQixDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDM0UsQ0FBQztnQkFDRCxJQUFJLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDMUIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUNoQyxDQUFDO1lBQ0YsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNsQixDQUFDO0lBQ0YsQ0FBQztJQUVPLG9CQUFvQjtRQUMzQixPQUFPO1lBQ04sZUFBZSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxLQUFLO1lBQ2hGLFlBQVksRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsZUFBZSxFQUFFO1lBQ3RELGNBQWMsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxFQUFFO1lBQ3BELGNBQWMsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxFQUFFO1lBQ3BELEtBQUssRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7WUFDM0QsUUFBUSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLElBQUksS0FBSztZQUNqRSxjQUFjLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxhQUFhLEVBQUUsSUFBSSxLQUFLO1lBQzVFLGdDQUFnQyxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyx5QkFBeUIsRUFBRTtZQUN2RixlQUFlLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHVCQUF1QixFQUFFO1lBQ3BFLG9CQUFvQixFQUFFLElBQUksQ0FBQyx1QkFBdUI7WUFDbEQsb0JBQW9CLEVBQUU7Z0JBQ3JCLGtCQUFrQixFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLFdBQVc7Z0JBQzNFLG9CQUFvQixFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLGFBQWE7Z0JBQy9FLGdCQUFnQixFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLFNBQVM7Z0JBQ3ZFLGFBQWEsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxVQUFVO2FBQ3JFO1NBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsV0FBVztRQUN4QixJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUVuQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDbEMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUU7WUFDdEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxjQUFjLEVBQUUsQ0FBQTtZQUNwRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxFQUFFLENBQUE7WUFDMUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQzNDLENBQUMsQ0FBQyxDQUFBO1FBRUYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUE7UUFFMUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNuQixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFpQjtZQUM3QixPQUFPLEVBQUUsTUFBTSxDQUFDLEtBQUs7WUFDckIsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRO1lBQ3pCLGVBQWUsRUFBRSxNQUFNLENBQUMsZUFBZTtZQUN2QyxXQUFXLEVBQUUsTUFBTSxDQUFDLGNBQWM7U0FDbEMsQ0FBQTtRQUVELE1BQU0sT0FBTyxHQUE2QjtZQUN6QyxPQUFPLEVBQUUsY0FBYztZQUN2QixrQkFBa0IsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUMzRCxnQ0FBZ0MsQ0FDaEM7WUFDRCxVQUFVLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLElBQUksU0FBUztZQUNyRCxvQkFBb0IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxnQ0FBZ0MsSUFBSSxTQUFTO1lBQzNFLHdCQUF3QixFQUFFLENBQUMsTUFBTSxDQUFDLGdDQUFnQyxJQUFJLFNBQVM7WUFDL0UsY0FBYyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3BELGNBQWMsRUFBRSxNQUFNLENBQUMsY0FBYztZQUNyQyxlQUFlLEVBQUUsTUFBTSxDQUFDLGVBQWU7WUFDdkMsY0FBYyxFQUFFO2dCQUNmLFVBQVUsRUFBRSxDQUFDO2dCQUNiLFlBQVksRUFBRSxJQUFJO2FBQ2xCO1lBQ0Qsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLFlBQVk7WUFDdkMsV0FBVyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUztZQUN4QyxjQUFjLEVBQUUsSUFBSTtZQUNwQixvQkFBb0IsRUFBRTtnQkFDckIsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLG9CQUFvQixDQUFDLGtCQUFrQjtnQkFDbEUsb0JBQW9CLEVBQUUsTUFBTSxDQUFDLG9CQUFvQixDQUFDLG9CQUFvQjtnQkFDdEUsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLG9CQUFvQixDQUFDLGdCQUFnQjtnQkFDOUQsYUFBYSxFQUFFLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxhQUFhO2FBQ3hEO1NBQ0QsQ0FBQTtRQUVELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFBO1FBQ2xFLElBQUksS0FBaUIsQ0FBQTtRQUNyQixJQUFJLENBQUM7WUFDSixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQzNFLEtBQUssR0FBRyxZQUFZLENBQUMsSUFBSSxDQUN4QixPQUFPLEVBQ1AsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUMzQyxPQUFPLENBQ1AsQ0FBQTtRQUNGLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMvQixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUV4QixNQUFNLEVBQUUsa0JBQWtCLEVBQUUsR0FBRyxNQUFNLFVBQVUsQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUMvRCxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdkMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0MsVUFBVSxDQUFDLHNCQUFzQixHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTtZQUNwRSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtZQUN4QixJQUFJLElBQUksQ0FBQyxpQkFBaUIsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDbEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUM1QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixNQUFNLGVBQWUsR0FBRyxNQUFNLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQTtRQUMvRCxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQ2pFLENBQUM7SUFFTyxLQUFLLENBQUMsZ0JBQWdCLENBQzdCLGVBQWdDLEVBQ2hDLFdBQWdDLEVBQ2hDLFVBQTZCO1FBRTdCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUM3QixJQUNDLENBQUMsS0FBSztZQUNOLEtBQUssS0FBSyxVQUFVO1lBQ3BCLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxFQUMxRSxDQUFDO1lBQ0YsT0FBTTtRQUNQLENBQUM7UUFFRCxLQUFLLENBQUMsc0JBQXNCLEdBQUcsU0FBUyxDQUFBO1FBRXhDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFBO1FBQzdDLElBQUksU0FBUyw4Q0FBNkIsRUFBRSxDQUFDO1lBQzVDLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDNUQsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUNwRSxVQUFVLEVBQUUsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzlCLE1BQU0sY0FBYyxHQUFHLENBQUMsR0FBUSxFQUFVLEVBQUUsQ0FDM0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDdkQsTUFBTSxPQUFPLEdBQUcsOEJBQThCLENBQzdDLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUM3QixXQUFXLENBQUMsY0FBYyxFQUMxQixXQUFXLENBQUMsY0FBYyxFQUMxQixXQUFXLENBQUMsWUFBWSxFQUN4QixjQUFjLEVBQ2QsU0FBUyxFQUNULGVBQWUsRUFBRSxRQUFRLENBQ3pCLENBQUE7UUFDRCxNQUFNLEVBQUUsWUFBWSxFQUFFLEdBQUcsTUFBTSxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDcEQsSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQTtRQUNsQyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3pELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxLQUFLLENBQUE7UUFFbkMsSUFBSSxlQUFlLElBQUksZUFBZSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2pELEtBQUssTUFBTSxPQUFPLElBQUksZUFBZSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNoRCxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3pCLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBRWYsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLDBDQUFrQyxDQUFDLENBQUE7UUFDdEUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDMUMsQ0FBQztJQUVPLFVBQVUsQ0FBQyxPQUFrQztRQUNwRCxJQUFJLFVBQXVCLENBQUE7UUFDM0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2hDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQXlCLENBQUE7UUFDdkQsQ0FBQzthQUFNLENBQUM7WUFDUCxVQUFVLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUM1RCxDQUFDO1FBRUQsR0FBRyxDQUFDLE1BQU0sQ0FDVCxVQUFVLEVBQ1YsbUJBQW1CLENBQ2xCLE9BQU8sRUFDUCxJQUFJLENBQUMsb0JBQW9CLEVBQ3pCLElBQUksQ0FBQyxtQkFBbUIsRUFDeEIsSUFBSSxDQUFDLGFBQWEsRUFDbEIsSUFBSSxDQUFDLGNBQWMsRUFDbkIsSUFBSSxDQUFDLGtCQUFrQixFQUN2QixHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQzFCLENBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsaUJBQWlCLENBQUMsWUFBMkI7UUFDMUQsTUFBTSxLQUFLLEdBQUcsWUFBWTthQUN4QixPQUFPLEVBQUU7YUFDVCxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQzthQUMxQixHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFDakQsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3pCLENBQUM7SUFFUSxNQUFNLENBQUMsU0FBd0I7UUFDdkMsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7UUFDMUIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFRCxXQUFXO1FBQ1YsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3hELElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsRUFBRSxlQUFlLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQzVFLENBQUM7UUFDRCxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFTyxRQUFRO1FBQ2YsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDcEIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtZQUNqRixJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDO2dCQUM5QixNQUFNLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUM7Z0JBQzdFLEtBQUssRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUs7YUFDM0IsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtZQUNwRixJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQ3JGLENBQUM7SUFDRixDQUFDO0lBRU8sUUFBUTtRQUNmLE9BQU8sSUFBSSxDQUFDLEtBQTBCLENBQUE7SUFDdkMsQ0FBQztJQUdELGVBQWUsQ0FBQyxNQUE4QztRQUM3RCxJQUFJLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQTtRQUN6QixJQUFJLE1BQU0sQ0FBQyxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDOUMsQ0FBQztRQUNELElBQUksTUFBTSxDQUFDLGVBQWUsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUMxQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUM3RSxDQUFDO1FBQ0QsSUFBSSxNQUFNLENBQUMsUUFBUSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUM5RCxDQUFDO1FBQ0QsSUFBSSxNQUFNLENBQUMsY0FBYyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3pDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsYUFBYSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUN6RSxDQUFDO1FBQ0QsSUFBSSxNQUFNLENBQUMsWUFBWSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzVELENBQUM7UUFDRCxJQUFJLE1BQU0sQ0FBQyxjQUFjLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDekMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDMUQsQ0FBQztRQUNELElBQUksTUFBTSxDQUFDLGNBQWMsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN6QyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUMxRCxDQUFDO1FBQ0QsSUFBSSxNQUFNLENBQUMsZUFBZSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQywwQkFBMEIsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDN0UsQ0FBQztRQUNELElBQUksTUFBTSxDQUFDLGdDQUFnQyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzNELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyw0QkFBNEIsQ0FDckQsTUFBTSxDQUFDLGdDQUFnQyxDQUN2QyxDQUFBO1FBQ0YsQ0FBQztRQUNELElBQUksTUFBTSxDQUFDLG9CQUFvQixLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQy9DLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUN6RCxDQUFDO0lBQ0YsQ0FBQztJQUVRLEtBQUssQ0FBQyxRQUFRLENBQ3RCLFFBQTJCLEVBQzNCLE9BQW1DLEVBQ25DLE9BQTJCLEVBQzNCLEtBQXdCO1FBRXhCLE1BQU0sS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN2RCxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQ25DLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxFQUFFLGtCQUFrQixFQUFFLFlBQVksRUFBRSxHQUFHLE1BQU0sUUFBUSxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQzNFLElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDbkMsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzlDLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFBO1FBRTFCLElBQUksQ0FBQyxxQkFBcUIsQ0FDekIsQ0FBQyxRQUFRLENBQUMsc0JBQXNCO1lBQy9CLFlBQVksQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDO1lBQ2pDLFlBQVksQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDO1lBQ25DLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxLQUFLLEtBQUssRUFBRSxDQUN2QyxDQUFBO1FBRUQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUUvQyxJQUFJLENBQUMsU0FBUyxDQUNiLGtCQUFrQixDQUFDLGlCQUFpQixDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7WUFDbEQsSUFBSSxTQUFTLEtBQUssSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUNwQyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQTtnQkFDMUIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDL0IsSUFBSSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUE7WUFDNUIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFOUIsSUFBSSxDQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDYixDQUFDO1FBRUQsSUFBSSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUE7UUFFM0IsSUFBSSxRQUFRLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUNyQyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtZQUNsRCxRQUFRLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7Z0JBQ2pELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBQzFELENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFTyxzQkFBc0IsQ0FBQyxXQUFxQjtRQUNuRCxNQUFNLEdBQUcsR0FBRyxVQUFVLENBQUE7UUFDdEIsTUFBTSxVQUFVLEdBQUcsV0FBVyxJQUFJLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFekYsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsd0JBQXdCLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUNuRSxJQUFJLENBQUMseUJBQXlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNsRCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ3BFLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3JELENBQUM7UUFFRCxJQUFJLENBQUMsdUJBQXVCLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFckYsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFa0IseUJBQXlCLENBQUMsS0FBa0I7UUFDOUQsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLHVCQUF1QixFQUFFLENBQUM7WUFDOUMsT0FBUSxLQUEyQixDQUFDLFFBQVEsQ0FBQTtRQUM3QyxDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVrQixzQkFBc0IsQ0FBQyxRQUFhO1FBQ3RELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUNqQyxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDL0MsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFDRCxJQUFJLFFBQVEsQ0FBQyxRQUFRLEVBQUUsS0FBSyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDbEUsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELE9BQU87WUFDTixHQUFHLGVBQWU7WUFDbEIsT0FBTyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPO1NBQ3RFLENBQUE7SUFDRixDQUFDO0lBRVMscUJBQXFCLENBQUMsS0FBa0I7UUFDakQsT0FBTyxLQUFLLENBQUMsTUFBTSxLQUFLLHVCQUF1QixDQUFBO0lBQ2hELENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxPQUEyQjtRQUNuRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3BFLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDcEQsQ0FBQztJQUNGLENBQUM7SUFFRCxZQUFZO1FBQ1gsT0FBTyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksUUFBUSxDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN4RSxDQUFDOztBQXA4QlcsWUFBWTtJQThCdEIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsZUFBZSxDQUFBO0lBQ2YsWUFBQSxjQUFjLENBQUE7SUFDZCxZQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFlBQUEsc0JBQXNCLENBQUE7SUFDdEIsWUFBQSxpQ0FBaUMsQ0FBQTtJQUNqQyxZQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFlBQUEsY0FBYyxDQUFBO0lBQ2QsWUFBQSxxQkFBcUIsQ0FBQTtJQUNyQixZQUFBLFlBQVksQ0FBQTtJQUNaLFlBQUEsV0FBVyxDQUFBO0lBQ1gsWUFBQSxhQUFhLENBQUE7R0FoREgsWUFBWSxDQXE4QnhCOztBQUVELE1BQU0sMkJBQTJCLEdBQUcsYUFBYSxDQUNoRCw4QkFBOEIsRUFDOUIsV0FBVyxFQUNYLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxzQ0FBc0MsQ0FBQyxDQUN0RSxDQUFBO0FBRUQsU0FBUyxhQUFhLENBQUMsV0FBb0IsRUFBRSxlQUF5QjtJQUNyRSxLQUFLLE1BQU0sVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDO1FBQ3RDLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsVUFBVSxDQUFDLGdCQUFnQixFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ3ZFLE9BQU8sVUFBVSxDQUFBO1FBQ2xCLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDdEIsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLFdBQW9CLEVBQUUsZUFBeUI7SUFDckUsS0FBSyxJQUFJLENBQUMsR0FBRyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDbEQsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxlQUFlLENBQUMsRUFBRSxDQUFDO1lBQ3ZFLENBQUM7Z0JBQ0EsT0FBTyxVQUFVLENBQUE7WUFDbEIsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxXQUFXLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtBQUMzQyxDQUFDIn0=