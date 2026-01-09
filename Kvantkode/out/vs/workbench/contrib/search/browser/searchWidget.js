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
var SearchWidget_1;
import * as nls from '../../../../nls.js';
import * as dom from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { InputBox, } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { Widget } from '../../../../base/browser/ui/widget.js';
import { Action } from '../../../../base/common/actions.js';
import { Delayer } from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { CONTEXT_FIND_WIDGET_NOT_VISIBLE } from '../../../../editor/contrib/find/browser/findModel.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService, } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ContextScopedReplaceInput } from '../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { appendKeyBindingLabel, isSearchViewFocused, getSearchView } from './searchActionsBase.js';
import * as Constants from '../common/constants.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { Toggle } from '../../../../base/browser/ui/toggle/toggle.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { searchReplaceAllIcon, searchHideReplaceIcon, searchShowContextIcon, searchShowReplaceIcon, } from './searchIcons.js';
import { ToggleSearchEditorContextLinesCommandId } from '../../searchEditor/browser/constants.js';
import { showHistoryKeybindingHint } from '../../../../platform/history/browser/historyWidgetKeybindingHint.js';
import { defaultInputBoxStyles, defaultToggleStyles, } from '../../../../platform/theme/browser/defaultStyles.js';
import { NotebookFindFilters } from '../../notebook/browser/contrib/find/findFilters.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { NotebookEditorInput } from '../../notebook/common/notebookEditorInput.js';
import { SearchFindInput } from './searchFindInput.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { MutableDisposable } from '../../../../base/common/lifecycle.js';
import { NotebookFindScopeType } from '../../notebook/common/notebookCommon.js';
/** Specified in searchview.css */
const SingleLineInputHeight = 26;
class ReplaceAllAction extends Action {
    static { this.ID = 'search.action.replaceAll'; }
    constructor(_searchWidget) {
        super(ReplaceAllAction.ID, '', ThemeIcon.asClassName(searchReplaceAllIcon), false);
        this._searchWidget = _searchWidget;
    }
    set searchWidget(searchWidget) {
        this._searchWidget = searchWidget;
    }
    run() {
        if (this._searchWidget) {
            return this._searchWidget.triggerReplaceAll();
        }
        return Promise.resolve(null);
    }
}
const ctrlKeyMod = isMacintosh ? 256 /* KeyMod.WinCtrl */ : 2048 /* KeyMod.CtrlCmd */;
function stopPropagationForMultiLineUpwards(event, value, textarea) {
    const isMultiline = !!value.match(/\n/);
    if (textarea &&
        (isMultiline || textarea.clientHeight > SingleLineInputHeight) &&
        textarea.selectionStart > 0) {
        event.stopPropagation();
        return;
    }
}
function stopPropagationForMultiLineDownwards(event, value, textarea) {
    const isMultiline = !!value.match(/\n/);
    if (textarea &&
        (isMultiline || textarea.clientHeight > SingleLineInputHeight) &&
        textarea.selectionEnd < textarea.value.length) {
        event.stopPropagation();
        return;
    }
}
let SearchWidget = class SearchWidget extends Widget {
    static { SearchWidget_1 = this; }
    static { this.INPUT_MAX_HEIGHT = 134; }
    static { this.REPLACE_ALL_DISABLED_LABEL = nls.localize('search.action.replaceAll.disabled.label', 'Replace All (Submit Search to Enable)'); }
    static { this.REPLACE_ALL_ENABLED_LABEL = (keyBindingService2) => {
        const kb = keyBindingService2.lookupKeybinding(ReplaceAllAction.ID);
        return appendKeyBindingLabel(nls.localize('search.action.replaceAll.enabled.label', 'Replace All'), kb);
    }; }
    constructor(container, options, contextViewService, contextKeyService, keybindingService, clipboardServce, configurationService, accessibilityService, contextMenuService, instantiationService, editorService) {
        super();
        this.contextViewService = contextViewService;
        this.contextKeyService = contextKeyService;
        this.keybindingService = keybindingService;
        this.clipboardServce = clipboardServce;
        this.configurationService = configurationService;
        this.accessibilityService = accessibilityService;
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this.editorService = editorService;
        this.ignoreGlobalFindBufferOnNextFocus = false;
        this.previousGlobalFindBufferValue = null;
        this._onSearchSubmit = this._register(new Emitter());
        this.onSearchSubmit = this._onSearchSubmit.event;
        this._onSearchCancel = this._register(new Emitter());
        this.onSearchCancel = this._onSearchCancel.event;
        this._onReplaceToggled = this._register(new Emitter());
        this.onReplaceToggled = this._onReplaceToggled.event;
        this._onReplaceStateChange = this._register(new Emitter());
        this.onReplaceStateChange = this._onReplaceStateChange.event;
        this._onPreserveCaseChange = this._register(new Emitter());
        this.onPreserveCaseChange = this._onPreserveCaseChange.event;
        this._onReplaceValueChanged = this._register(new Emitter());
        this.onReplaceValueChanged = this._onReplaceValueChanged.event;
        this._onReplaceAll = this._register(new Emitter());
        this.onReplaceAll = this._onReplaceAll.event;
        this._onBlur = this._register(new Emitter());
        this.onBlur = this._onBlur.event;
        this._onDidHeightChange = this._register(new Emitter());
        this.onDidHeightChange = this._onDidHeightChange.event;
        this._onDidToggleContext = new Emitter();
        this.onDidToggleContext = this._onDidToggleContext.event;
        this.replaceActive = Constants.SearchContext.ReplaceActiveKey.bindTo(this.contextKeyService);
        this.searchInputBoxFocused = Constants.SearchContext.SearchInputBoxFocusedKey.bindTo(this.contextKeyService);
        this.replaceInputBoxFocused = Constants.SearchContext.ReplaceInputBoxFocusedKey.bindTo(this.contextKeyService);
        const notebookOptions = options.notebookOptions ?? {
            isInNotebookMarkdownInput: true,
            isInNotebookMarkdownPreview: true,
            isInNotebookCellInput: true,
            isInNotebookCellOutput: true,
        };
        this._notebookFilters = this._register(new NotebookFindFilters(notebookOptions.isInNotebookMarkdownInput, notebookOptions.isInNotebookMarkdownPreview, notebookOptions.isInNotebookCellInput, notebookOptions.isInNotebookCellOutput, { findScopeType: NotebookFindScopeType.None }));
        this._register(this._notebookFilters.onDidChange(() => {
            if (this.searchInput) {
                this.searchInput.updateFilterStyles();
            }
        }));
        this._register(this.editorService.onDidEditorsChange((e) => {
            if (this.searchInput &&
                e.event.editor instanceof NotebookEditorInput &&
                (e.event.kind === 5 /* GroupModelChangeKind.EDITOR_OPEN */ ||
                    e.event.kind === 6 /* GroupModelChangeKind.EDITOR_CLOSE */)) {
                this.searchInput.filterVisible = this._hasNotebookOpen();
            }
        }));
        this._replaceHistoryDelayer = new Delayer(500);
        this._toggleReplaceButtonListener = this._register(new MutableDisposable());
        this.render(container, options);
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('editor.accessibilitySupport')) {
                this.updateAccessibilitySupport();
            }
        }));
        this._register(this.accessibilityService.onDidChangeScreenReaderOptimized(() => this.updateAccessibilitySupport()));
        this.updateAccessibilitySupport();
    }
    _hasNotebookOpen() {
        const editors = this.editorService.editors;
        return editors.some((editor) => editor instanceof NotebookEditorInput);
    }
    getNotebookFilters() {
        return this._notebookFilters;
    }
    focus(select = true, focusReplace = false, suppressGlobalSearchBuffer = false) {
        this.ignoreGlobalFindBufferOnNextFocus = suppressGlobalSearchBuffer;
        if (focusReplace && this.isReplaceShown()) {
            if (this.replaceInput) {
                this.replaceInput.focus();
                if (select) {
                    this.replaceInput.select();
                }
            }
        }
        else {
            if (this.searchInput) {
                this.searchInput.focus();
                if (select) {
                    this.searchInput.select();
                }
            }
        }
    }
    setWidth(width) {
        this.searchInput?.inputBox.layout();
        if (this.replaceInput) {
            this.replaceInput.width = width - 28;
            this.replaceInput.inputBox.layout();
        }
    }
    clear() {
        this.searchInput?.clear();
        this.replaceInput?.setValue('');
        this.setReplaceAllActionState(false);
    }
    isReplaceShown() {
        return this.replaceContainer ? !this.replaceContainer.classList.contains('disabled') : false;
    }
    isReplaceActive() {
        return !!this.replaceActive.get();
    }
    getReplaceValue() {
        return this.replaceInput?.getValue() ?? '';
    }
    toggleReplace(show) {
        if (show === undefined || show !== this.isReplaceShown()) {
            this.onToggleReplaceButton();
        }
    }
    getSearchHistory() {
        return this.searchInput?.inputBox.getHistory() ?? [];
    }
    getReplaceHistory() {
        return this.replaceInput?.inputBox.getHistory() ?? [];
    }
    prependSearchHistory(history) {
        this.searchInput?.inputBox.prependHistory(history);
    }
    prependReplaceHistory(history) {
        this.replaceInput?.inputBox.prependHistory(history);
    }
    clearHistory() {
        this.searchInput?.inputBox.clearHistory();
        this.replaceInput?.inputBox.clearHistory();
    }
    showNextSearchTerm() {
        this.searchInput?.inputBox.showNextValue();
    }
    showPreviousSearchTerm() {
        this.searchInput?.inputBox.showPreviousValue();
    }
    showNextReplaceTerm() {
        this.replaceInput?.inputBox.showNextValue();
    }
    showPreviousReplaceTerm() {
        this.replaceInput?.inputBox.showPreviousValue();
    }
    searchInputHasFocus() {
        return !!this.searchInputBoxFocused.get();
    }
    replaceInputHasFocus() {
        return !!this.replaceInput?.inputBox.hasFocus();
    }
    focusReplaceAllAction() {
        this.replaceActionBar?.focus(true);
    }
    focusRegexAction() {
        this.searchInput?.focusOnRegex();
    }
    set replaceButtonVisibility(val) {
        if (this.toggleReplaceButton) {
            this.toggleReplaceButton.element.style.display = val ? '' : 'none';
        }
    }
    render(container, options) {
        this.domNode = dom.append(container, dom.$('.search-widget'));
        this.domNode.style.position = 'relative';
        if (!options._hideReplaceToggle) {
            this.renderToggleReplaceButton(this.domNode);
        }
        this.renderSearchInput(this.domNode, options);
        this.renderReplaceInput(this.domNode, options);
    }
    updateAccessibilitySupport() {
        this.searchInput?.setFocusInputOnOptionClick(!this.accessibilityService.isScreenReaderOptimized());
    }
    renderToggleReplaceButton(parent) {
        const opts = {
            buttonBackground: undefined,
            buttonBorder: undefined,
            buttonForeground: undefined,
            buttonHoverBackground: undefined,
            buttonSecondaryBackground: undefined,
            buttonSecondaryForeground: undefined,
            buttonSecondaryHoverBackground: undefined,
            buttonSeparator: undefined,
            title: nls.localize('search.replace.toggle.button.title', 'Toggle Replace'),
            hoverDelegate: getDefaultHoverDelegate('element'),
        };
        this.toggleReplaceButton = this._register(new Button(parent, opts));
        this.toggleReplaceButton.element.setAttribute('aria-expanded', 'false');
        this.toggleReplaceButton.element.classList.add('toggle-replace-button');
        this.toggleReplaceButton.icon = searchHideReplaceIcon;
        this._toggleReplaceButtonListener.value = this.toggleReplaceButton.onDidClick(() => this.onToggleReplaceButton());
    }
    renderSearchInput(parent, options) {
        const history = options.searchHistory || [];
        const inputOptions = {
            label: nls.localize('label.Search', 'Search: Type Search Term and press Enter to search'),
            validation: (value) => this.validateSearchInput(value),
            placeholder: nls.localize('search.placeHolder', 'Search'),
            appendCaseSensitiveLabel: appendKeyBindingLabel('', this.keybindingService.lookupKeybinding("toggleSearchCaseSensitive" /* Constants.SearchCommandIds.ToggleCaseSensitiveCommandId */)),
            appendWholeWordsLabel: appendKeyBindingLabel('', this.keybindingService.lookupKeybinding("toggleSearchWholeWord" /* Constants.SearchCommandIds.ToggleWholeWordCommandId */)),
            appendRegexLabel: appendKeyBindingLabel('', this.keybindingService.lookupKeybinding("toggleSearchRegex" /* Constants.SearchCommandIds.ToggleRegexCommandId */)),
            history: new Set(history),
            showHistoryHint: () => showHistoryKeybindingHint(this.keybindingService),
            flexibleHeight: true,
            flexibleMaxHeight: SearchWidget_1.INPUT_MAX_HEIGHT,
            showCommonFindToggles: true,
            inputBoxStyles: options.inputBoxStyles,
            toggleStyles: options.toggleStyles,
        };
        const searchInputContainer = dom.append(parent, dom.$('.search-container.input-box'));
        this.searchInput = this._register(new SearchFindInput(searchInputContainer, this.contextViewService, inputOptions, this.contextKeyService, this.contextMenuService, this.instantiationService, this._notebookFilters, this._hasNotebookOpen()));
        this._register(this.searchInput.onKeyDown((keyboardEvent) => this.onSearchInputKeyDown(keyboardEvent)));
        this.searchInput.setValue(options.value || '');
        this.searchInput.setRegex(!!options.isRegex);
        this.searchInput.setCaseSensitive(!!options.isCaseSensitive);
        this.searchInput.setWholeWords(!!options.isWholeWords);
        this._register(this.searchInput.onCaseSensitiveKeyDown((keyboardEvent) => this.onCaseSensitiveKeyDown(keyboardEvent)));
        this._register(this.searchInput.onRegexKeyDown((keyboardEvent) => this.onRegexKeyDown(keyboardEvent)));
        this._register(this.searchInput.inputBox.onDidChange(() => this.onSearchInputChanged()));
        this._register(this.searchInput.inputBox.onDidHeightChange(() => this._onDidHeightChange.fire()));
        this._register(this.onReplaceValueChanged(() => {
            this._replaceHistoryDelayer.trigger(() => this.replaceInput?.inputBox.addToHistory());
        }));
        this.searchInputFocusTracker = this._register(dom.trackFocus(this.searchInput.inputBox.inputElement));
        this._register(this.searchInputFocusTracker.onDidFocus(async () => {
            this.searchInputBoxFocused.set(true);
            const useGlobalFindBuffer = this.searchConfiguration.globalFindClipboard;
            if (!this.ignoreGlobalFindBufferOnNextFocus && useGlobalFindBuffer) {
                const globalBufferText = await this.clipboardServce.readFindText();
                if (globalBufferText && this.previousGlobalFindBufferValue !== globalBufferText) {
                    this.searchInput?.inputBox.addToHistory();
                    this.searchInput?.setValue(globalBufferText);
                    this.searchInput?.select();
                }
                this.previousGlobalFindBufferValue = globalBufferText;
            }
            this.ignoreGlobalFindBufferOnNextFocus = false;
        }));
        this._register(this.searchInputFocusTracker.onDidBlur(() => this.searchInputBoxFocused.set(false)));
        this.showContextToggle = new Toggle({
            isChecked: false,
            title: appendKeyBindingLabel(nls.localize('showContext', 'Toggle Context Lines'), this.keybindingService.lookupKeybinding(ToggleSearchEditorContextLinesCommandId)),
            icon: searchShowContextIcon,
            hoverDelegate: getDefaultHoverDelegate('element'),
            ...defaultToggleStyles,
        });
        this._register(this.showContextToggle.onChange(() => this.onContextLinesChanged()));
        if (options.showContextToggle) {
            this.contextLinesInput = new InputBox(searchInputContainer, this.contextViewService, {
                type: 'number',
                inputBoxStyles: defaultInputBoxStyles,
            });
            this.contextLinesInput.element.classList.add('context-lines-input');
            this.contextLinesInput.value =
                '' +
                    (this.configurationService.getValue('search').searchEditor
                        .defaultNumberOfContextLines ?? 1);
            this._register(this.contextLinesInput.onDidChange((value) => {
                if (value !== '0') {
                    this.showContextToggle.checked = true;
                }
                this.onContextLinesChanged();
            }));
            dom.append(searchInputContainer, this.showContextToggle.domNode);
        }
    }
    onContextLinesChanged() {
        this._onDidToggleContext.fire();
        if (this.contextLinesInput.value.includes('-')) {
            this.contextLinesInput.value = '0';
        }
        this._onDidToggleContext.fire();
    }
    setContextLines(lines) {
        if (!this.contextLinesInput) {
            return;
        }
        if (lines === 0) {
            this.showContextToggle.checked = false;
        }
        else {
            this.showContextToggle.checked = true;
            this.contextLinesInput.value = '' + lines;
        }
    }
    renderReplaceInput(parent, options) {
        this.replaceContainer = dom.append(parent, dom.$('.replace-container.disabled'));
        const replaceBox = dom.append(this.replaceContainer, dom.$('.replace-input'));
        this.replaceInput = this._register(new ContextScopedReplaceInput(replaceBox, this.contextViewService, {
            label: nls.localize('label.Replace', 'Replace: Type replace term and press Enter to preview'),
            placeholder: nls.localize('search.replace.placeHolder', 'Replace'),
            appendPreserveCaseLabel: appendKeyBindingLabel('', this.keybindingService.lookupKeybinding("toggleSearchPreserveCase" /* Constants.SearchCommandIds.TogglePreserveCaseId */)),
            history: new Set(options.replaceHistory),
            showHistoryHint: () => showHistoryKeybindingHint(this.keybindingService),
            flexibleHeight: true,
            flexibleMaxHeight: SearchWidget_1.INPUT_MAX_HEIGHT,
            inputBoxStyles: options.inputBoxStyles,
            toggleStyles: options.toggleStyles,
        }, this.contextKeyService, true));
        this._register(this.replaceInput.onDidOptionChange((viaKeyboard) => {
            if (!viaKeyboard) {
                if (this.replaceInput) {
                    this._onPreserveCaseChange.fire(this.replaceInput.getPreserveCase());
                }
            }
        }));
        this._register(this.replaceInput.onKeyDown((keyboardEvent) => this.onReplaceInputKeyDown(keyboardEvent)));
        this.replaceInput.setValue(options.replaceValue || '');
        this._register(this.replaceInput.inputBox.onDidChange(() => this._onReplaceValueChanged.fire()));
        this._register(this.replaceInput.inputBox.onDidHeightChange(() => this._onDidHeightChange.fire()));
        this.replaceAllAction = new ReplaceAllAction(this);
        this.replaceAllAction.label = SearchWidget_1.REPLACE_ALL_DISABLED_LABEL;
        this.replaceActionBar = this._register(new ActionBar(this.replaceContainer));
        this.replaceActionBar.push([this.replaceAllAction], { icon: true, label: false });
        this.onkeydown(this.replaceActionBar.domNode, (keyboardEvent) => this.onReplaceActionbarKeyDown(keyboardEvent));
        this.replaceInputFocusTracker = this._register(dom.trackFocus(this.replaceInput.inputBox.inputElement));
        this._register(this.replaceInputFocusTracker.onDidFocus(() => this.replaceInputBoxFocused.set(true)));
        this._register(this.replaceInputFocusTracker.onDidBlur(() => this.replaceInputBoxFocused.set(false)));
        this._register(this.replaceInput.onPreserveCaseKeyDown((keyboardEvent) => this.onPreserveCaseKeyDown(keyboardEvent)));
    }
    triggerReplaceAll() {
        this._onReplaceAll.fire();
        return Promise.resolve(null);
    }
    onToggleReplaceButton() {
        this.replaceContainer?.classList.toggle('disabled');
        if (this.isReplaceShown()) {
            this.toggleReplaceButton?.element.classList.remove(...ThemeIcon.asClassNameArray(searchHideReplaceIcon));
            this.toggleReplaceButton?.element.classList.add(...ThemeIcon.asClassNameArray(searchShowReplaceIcon));
        }
        else {
            this.toggleReplaceButton?.element.classList.remove(...ThemeIcon.asClassNameArray(searchShowReplaceIcon));
            this.toggleReplaceButton?.element.classList.add(...ThemeIcon.asClassNameArray(searchHideReplaceIcon));
        }
        this.toggleReplaceButton?.element.setAttribute('aria-expanded', this.isReplaceShown() ? 'true' : 'false');
        this.updateReplaceActiveState();
        this._onReplaceToggled.fire();
    }
    setValue(value) {
        this.searchInput?.setValue(value);
    }
    setReplaceAllActionState(enabled) {
        if (this.replaceAllAction && this.replaceAllAction.enabled !== enabled) {
            this.replaceAllAction.enabled = enabled;
            this.replaceAllAction.label = enabled
                ? SearchWidget_1.REPLACE_ALL_ENABLED_LABEL(this.keybindingService)
                : SearchWidget_1.REPLACE_ALL_DISABLED_LABEL;
            this.updateReplaceActiveState();
        }
    }
    updateReplaceActiveState() {
        const currentState = this.isReplaceActive();
        const newState = this.isReplaceShown() && !!this.replaceAllAction?.enabled;
        if (currentState !== newState) {
            this.replaceActive.set(newState);
            this._onReplaceStateChange.fire(newState);
            this.replaceInput?.inputBox.layout();
        }
    }
    validateSearchInput(value) {
        if (value.length === 0) {
            return null;
        }
        if (!this.searchInput?.getRegex()) {
            return null;
        }
        try {
            new RegExp(value, 'u');
        }
        catch (e) {
            return { content: e.message };
        }
        return null;
    }
    onSearchInputChanged() {
        this.searchInput?.clearMessage();
        this.setReplaceAllActionState(false);
        if (this.searchConfiguration.searchOnType) {
            if (this.searchInput?.getRegex()) {
                try {
                    const regex = new RegExp(this.searchInput.getValue(), 'ug');
                    const matchienessHeuristic = `
								~!@#$%^&*()_+
								\`1234567890-=
								qwertyuiop[]\\
								QWERTYUIOP{}|
								asdfghjkl;'
								ASDFGHJKL:"
								zxcvbnm,./
								ZXCVBNM<>? `.match(regex)?.length ?? 0;
                    const delayMultiplier = matchienessHeuristic < 50
                        ? 1
                        : matchienessHeuristic < 100
                            ? 5 // expressions like `.` or `\w`
                            : 10; // only things matching empty string
                    this.submitSearch(true, this.searchConfiguration.searchOnTypeDebouncePeriod * delayMultiplier);
                }
                catch {
                    // pass
                }
            }
            else {
                this.submitSearch(true, this.searchConfiguration.searchOnTypeDebouncePeriod);
            }
        }
    }
    onSearchInputKeyDown(keyboardEvent) {
        if (keyboardEvent.equals(ctrlKeyMod | 3 /* KeyCode.Enter */)) {
            this.searchInput?.inputBox.insertAtCursor('\n');
            keyboardEvent.preventDefault();
        }
        if (keyboardEvent.equals(3 /* KeyCode.Enter */)) {
            this.searchInput?.onSearchSubmit();
            this.submitSearch();
            keyboardEvent.preventDefault();
        }
        else if (keyboardEvent.equals(9 /* KeyCode.Escape */)) {
            this._onSearchCancel.fire({ focus: true });
            keyboardEvent.preventDefault();
        }
        else if (keyboardEvent.equals(2 /* KeyCode.Tab */)) {
            if (this.isReplaceShown()) {
                this.replaceInput?.focus();
            }
            else {
                this.searchInput?.focusOnCaseSensitive();
            }
            keyboardEvent.preventDefault();
        }
        else if (keyboardEvent.equals(16 /* KeyCode.UpArrow */)) {
            stopPropagationForMultiLineUpwards(keyboardEvent, this.searchInput?.getValue() ?? '', this.searchInput?.domNode.querySelector('textarea') ?? null);
        }
        else if (keyboardEvent.equals(18 /* KeyCode.DownArrow */)) {
            stopPropagationForMultiLineDownwards(keyboardEvent, this.searchInput?.getValue() ?? '', this.searchInput?.domNode.querySelector('textarea') ?? null);
        }
        else if (keyboardEvent.equals(11 /* KeyCode.PageUp */)) {
            const inputElement = this.searchInput?.inputBox.inputElement;
            if (inputElement) {
                inputElement.setSelectionRange(0, 0);
                inputElement.focus();
                keyboardEvent.preventDefault();
            }
        }
        else if (keyboardEvent.equals(12 /* KeyCode.PageDown */)) {
            const inputElement = this.searchInput?.inputBox.inputElement;
            if (inputElement) {
                const endOfText = inputElement.value.length;
                inputElement.setSelectionRange(endOfText, endOfText);
                inputElement.focus();
                keyboardEvent.preventDefault();
            }
        }
    }
    onCaseSensitiveKeyDown(keyboardEvent) {
        if (keyboardEvent.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */)) {
            if (this.isReplaceShown()) {
                this.replaceInput?.focus();
                keyboardEvent.preventDefault();
            }
        }
    }
    onRegexKeyDown(keyboardEvent) {
        if (keyboardEvent.equals(2 /* KeyCode.Tab */)) {
            if (this.isReplaceShown()) {
                this.replaceInput?.focusOnPreserve();
                keyboardEvent.preventDefault();
            }
        }
    }
    onPreserveCaseKeyDown(keyboardEvent) {
        if (keyboardEvent.equals(2 /* KeyCode.Tab */)) {
            if (this.isReplaceActive()) {
                this.focusReplaceAllAction();
            }
            else {
                this._onBlur.fire();
            }
            keyboardEvent.preventDefault();
        }
        else if (keyboardEvent.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */)) {
            this.focusRegexAction();
            keyboardEvent.preventDefault();
        }
    }
    onReplaceInputKeyDown(keyboardEvent) {
        if (keyboardEvent.equals(ctrlKeyMod | 3 /* KeyCode.Enter */)) {
            this.replaceInput?.inputBox.insertAtCursor('\n');
            keyboardEvent.preventDefault();
        }
        if (keyboardEvent.equals(3 /* KeyCode.Enter */)) {
            this.submitSearch();
            keyboardEvent.preventDefault();
        }
        else if (keyboardEvent.equals(2 /* KeyCode.Tab */)) {
            this.searchInput?.focusOnCaseSensitive();
            keyboardEvent.preventDefault();
        }
        else if (keyboardEvent.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */)) {
            this.searchInput?.focus();
            keyboardEvent.preventDefault();
        }
        else if (keyboardEvent.equals(16 /* KeyCode.UpArrow */)) {
            stopPropagationForMultiLineUpwards(keyboardEvent, this.replaceInput?.getValue() ?? '', this.replaceInput?.domNode.querySelector('textarea') ?? null);
        }
        else if (keyboardEvent.equals(18 /* KeyCode.DownArrow */)) {
            stopPropagationForMultiLineDownwards(keyboardEvent, this.replaceInput?.getValue() ?? '', this.replaceInput?.domNode.querySelector('textarea') ?? null);
        }
    }
    onReplaceActionbarKeyDown(keyboardEvent) {
        if (keyboardEvent.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */)) {
            this.focusRegexAction();
            keyboardEvent.preventDefault();
        }
    }
    async submitSearch(triggeredOnType = false, delay = 0) {
        this.searchInput?.validate();
        if (!this.searchInput?.inputBox.isInputValid()) {
            return;
        }
        const value = this.searchInput.getValue();
        const useGlobalFindBuffer = this.searchConfiguration.globalFindClipboard;
        if (value && useGlobalFindBuffer) {
            await this.clipboardServce.writeFindText(value);
        }
        this._onSearchSubmit.fire({ triggeredOnType, delay });
    }
    getContextLines() {
        return this.showContextToggle.checked ? +this.contextLinesInput.value : 0;
    }
    modifyContextLines(increase) {
        const current = +this.contextLinesInput.value;
        const modified = current + (increase ? 1 : -1);
        this.showContextToggle.checked = modified !== 0;
        this.contextLinesInput.value = '' + modified;
    }
    toggleContextLines() {
        this.showContextToggle.checked = !this.showContextToggle.checked;
        this.onContextLinesChanged();
    }
    dispose() {
        this.setReplaceAllActionState(false);
        super.dispose();
    }
    get searchConfiguration() {
        return this.configurationService.getValue('search');
    }
};
SearchWidget = SearchWidget_1 = __decorate([
    __param(2, IContextViewService),
    __param(3, IContextKeyService),
    __param(4, IKeybindingService),
    __param(5, IClipboardService),
    __param(6, IConfigurationService),
    __param(7, IAccessibilityService),
    __param(8, IContextMenuService),
    __param(9, IInstantiationService),
    __param(10, IEditorService)
], SearchWidget);
export { SearchWidget };
export function registerContributions() {
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: ReplaceAllAction.ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: ContextKeyExpr.and(Constants.SearchContext.SearchViewVisibleKey, Constants.SearchContext.ReplaceActiveKey, CONTEXT_FIND_WIDGET_NOT_VISIBLE),
        primary: 512 /* KeyMod.Alt */ | 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
        handler: (accessor) => {
            const viewsService = accessor.get(IViewsService);
            if (isSearchViewFocused(viewsService)) {
                const searchView = getSearchView(viewsService);
                if (searchView) {
                    new ReplaceAllAction(searchView.searchAndReplaceWidget).run();
                }
            }
        },
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9zZWFyY2hXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV0RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDOUUsT0FBTyxFQUFFLE1BQU0sRUFBa0IsTUFBTSw4Q0FBOEMsQ0FBQTtBQUdyRixPQUFPLEVBR04sUUFBUSxHQUNSLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzlELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3RHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTixjQUFjLEVBRWQsa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixtQkFBbUIsR0FDbkIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sK0RBQStELENBQUE7QUFFdEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBQzlHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxtQkFBbUIsRUFBRSxhQUFhLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNsRyxPQUFPLEtBQUssU0FBUyxNQUFNLHdCQUF3QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRSxPQUFPLEVBQWlCLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLHFCQUFxQixFQUNyQixxQkFBcUIsRUFDckIscUJBQXFCLEdBQ3JCLE1BQU0sa0JBQWtCLENBQUE7QUFDekIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDL0csT0FBTyxFQUNOLHFCQUFxQixFQUNyQixtQkFBbUIsR0FDbkIsTUFBTSxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ3RELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ25HLE9BQU8sRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRS9FLGtDQUFrQztBQUNsQyxNQUFNLHFCQUFxQixHQUFHLEVBQUUsQ0FBQTtBQXlCaEMsTUFBTSxnQkFBaUIsU0FBUSxNQUFNO2FBQ3BCLE9BQUUsR0FBVywwQkFBMEIsQ0FBQTtJQUV2RCxZQUFvQixhQUEyQjtRQUM5QyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFEL0Qsa0JBQWEsR0FBYixhQUFhLENBQWM7SUFFL0MsQ0FBQztJQUVELElBQUksWUFBWSxDQUFDLFlBQTBCO1FBQzFDLElBQUksQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFBO0lBQ2xDLENBQUM7SUFFUSxHQUFHO1FBQ1gsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDOUMsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM3QixDQUFDOztBQUdGLE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxDQUFDLDBCQUFnQixDQUFDLDBCQUFlLENBQUE7QUFFaEUsU0FBUyxrQ0FBa0MsQ0FDMUMsS0FBcUIsRUFDckIsS0FBYSxFQUNiLFFBQW9DO0lBRXBDLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3ZDLElBQ0MsUUFBUTtRQUNSLENBQUMsV0FBVyxJQUFJLFFBQVEsQ0FBQyxZQUFZLEdBQUcscUJBQXFCLENBQUM7UUFDOUQsUUFBUSxDQUFDLGNBQWMsR0FBRyxDQUFDLEVBQzFCLENBQUM7UUFDRixLQUFLLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDdkIsT0FBTTtJQUNQLENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUyxvQ0FBb0MsQ0FDNUMsS0FBcUIsRUFDckIsS0FBYSxFQUNiLFFBQW9DO0lBRXBDLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3ZDLElBQ0MsUUFBUTtRQUNSLENBQUMsV0FBVyxJQUFJLFFBQVEsQ0FBQyxZQUFZLEdBQUcscUJBQXFCLENBQUM7UUFDOUQsUUFBUSxDQUFDLFlBQVksR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFDNUMsQ0FBQztRQUNGLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUN2QixPQUFNO0lBQ1AsQ0FBQztBQUNGLENBQUM7QUFFTSxJQUFNLFlBQVksR0FBbEIsTUFBTSxZQUFhLFNBQVEsTUFBTTs7YUFDZixxQkFBZ0IsR0FBRyxHQUFHLEFBQU4sQ0FBTTthQUV0QiwrQkFBMEIsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUNoRSx5Q0FBeUMsRUFDekMsdUNBQXVDLENBQ3ZDLEFBSGlELENBR2pEO2FBQ3VCLDhCQUF5QixHQUFHLENBQ25ELGtCQUFzQyxFQUM3QixFQUFFO1FBQ1gsTUFBTSxFQUFFLEdBQUcsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDbkUsT0FBTyxxQkFBcUIsQ0FDM0IsR0FBRyxDQUFDLFFBQVEsQ0FBQyx3Q0FBd0MsRUFBRSxhQUFhLENBQUMsRUFDckUsRUFBRSxDQUNGLENBQUE7SUFDRixDQUFDLEFBUmdELENBUWhEO0lBMkRELFlBQ0MsU0FBc0IsRUFDdEIsT0FBNkIsRUFDUixrQkFBd0QsRUFDekQsaUJBQXNELEVBQ3RELGlCQUFzRCxFQUN2RCxlQUFtRCxFQUMvQyxvQkFBNEQsRUFDNUQsb0JBQTRELEVBQzlELGtCQUF3RCxFQUN0RCxvQkFBNEQsRUFDbkUsYUFBOEM7UUFFOUQsS0FBSyxFQUFFLENBQUE7UUFWK0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUN4QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ3JDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDdEMsb0JBQWUsR0FBZixlQUFlLENBQW1CO1FBQzlCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDM0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUM3Qyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3JDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDbEQsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBckR2RCxzQ0FBaUMsR0FBRyxLQUFLLENBQUE7UUFDekMsa0NBQTZCLEdBQWtCLElBQUksQ0FBQTtRQUVuRCxvQkFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3ZDLElBQUksT0FBTyxFQUErQyxDQUMxRCxDQUFBO1FBQ1EsbUJBQWMsR0FDdEIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUE7UUFFbkIsb0JBQWUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFzQixDQUFDLENBQUE7UUFDbEUsbUJBQWMsR0FBOEIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUE7UUFFdkUsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDdEQscUJBQWdCLEdBQWdCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUE7UUFFN0QsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVyxDQUFDLENBQUE7UUFDN0QseUJBQW9CLEdBQW1CLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUE7UUFFeEUsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVyxDQUFDLENBQUE7UUFDN0QseUJBQW9CLEdBQW1CLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUE7UUFFeEUsMkJBQXNCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDM0QsMEJBQXFCLEdBQWdCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUE7UUFFdkUsa0JBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUNsRCxpQkFBWSxHQUFnQixJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQTtRQUVyRCxZQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDNUMsV0FBTSxHQUFnQixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQTtRQUV6Qyx1QkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUN2RCxzQkFBaUIsR0FBZ0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQTtRQUV0RCx3QkFBbUIsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFBO1FBQ2pELHVCQUFrQixHQUFnQixJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFBO1FBc0J4RSxJQUFJLENBQUMsYUFBYSxHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQzVGLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FDbkYsSUFBSSxDQUFDLGlCQUFpQixDQUN0QixDQUFBO1FBQ0QsSUFBSSxDQUFDLHNCQUFzQixHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUNyRixJQUFJLENBQUMsaUJBQWlCLENBQ3RCLENBQUE7UUFFRCxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsZUFBZSxJQUFJO1lBQ2xELHlCQUF5QixFQUFFLElBQUk7WUFDL0IsMkJBQTJCLEVBQUUsSUFBSTtZQUNqQyxxQkFBcUIsRUFBRSxJQUFJO1lBQzNCLHNCQUFzQixFQUFFLElBQUk7U0FDNUIsQ0FBQTtRQUNELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNyQyxJQUFJLG1CQUFtQixDQUN0QixlQUFlLENBQUMseUJBQXlCLEVBQ3pDLGVBQWUsQ0FBQywyQkFBMkIsRUFDM0MsZUFBZSxDQUFDLHFCQUFxQixFQUNyQyxlQUFlLENBQUMsc0JBQXNCLEVBQ3RDLEVBQUUsYUFBYSxFQUFFLHFCQUFxQixDQUFDLElBQUksRUFBRSxDQUM3QyxDQUNELENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO1lBQ3RDLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN0QixJQUFJLENBQUMsV0FBVyxDQUFDLGtCQUFrQixFQUFFLENBQUE7WUFDdEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMzQyxJQUNDLElBQUksQ0FBQyxXQUFXO2dCQUNoQixDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sWUFBWSxtQkFBbUI7Z0JBQzdDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLDZDQUFxQztvQkFDakQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLDhDQUFzQyxDQUFDLEVBQ25ELENBQUM7Z0JBQ0YsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUE7WUFDekQsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxPQUFPLENBQU8sR0FBRyxDQUFDLENBQUE7UUFDcEQsSUFBSSxDQUFDLDRCQUE0QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBZSxDQUFDLENBQUE7UUFFeEYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFL0IsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN4RCxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyw2QkFBNkIsQ0FBQyxFQUFFLENBQUM7Z0JBQzNELElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFBO1lBQ2xDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsb0JBQW9CLENBQUMsZ0NBQWdDLENBQUMsR0FBRyxFQUFFLENBQy9ELElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUNqQyxDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQTtJQUNsQyxDQUFDO0lBRU8sZ0JBQWdCO1FBQ3ZCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFBO1FBQzFDLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxZQUFZLG1CQUFtQixDQUFDLENBQUE7SUFDdkUsQ0FBQztJQUVELGtCQUFrQjtRQUNqQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtJQUM3QixDQUFDO0lBRUQsS0FBSyxDQUNKLFNBQWtCLElBQUksRUFDdEIsZUFBd0IsS0FBSyxFQUM3QiwwQkFBMEIsR0FBRyxLQUFLO1FBRWxDLElBQUksQ0FBQyxpQ0FBaUMsR0FBRywwQkFBMEIsQ0FBQTtRQUVuRSxJQUFJLFlBQVksSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQztZQUMzQyxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDdkIsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtnQkFDekIsSUFBSSxNQUFNLEVBQUUsQ0FBQztvQkFDWixJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFBO2dCQUMzQixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3RCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBQ3hCLElBQUksTUFBTSxFQUFFLENBQUM7b0JBQ1osSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtnQkFDMUIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELFFBQVEsQ0FBQyxLQUFhO1FBQ3JCLElBQUksQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ25DLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxHQUFHLEtBQUssR0FBRyxFQUFFLENBQUE7WUFDcEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDcEMsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQTtRQUN6QixJQUFJLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUMvQixJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVELGNBQWM7UUFDYixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO0lBQzdGLENBQUM7SUFFRCxlQUFlO1FBQ2QsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsZUFBZTtRQUNkLE9BQU8sSUFBSSxDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUE7SUFDM0MsQ0FBQztJQUVELGFBQWEsQ0FBQyxJQUFjO1FBQzNCLElBQUksSUFBSSxLQUFLLFNBQVMsSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUM7WUFDMUQsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUE7UUFDN0IsQ0FBQztJQUNGLENBQUM7SUFFRCxnQkFBZ0I7UUFDZixPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsQ0FBQTtJQUNyRCxDQUFDO0lBRUQsaUJBQWlCO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxDQUFBO0lBQ3RELENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxPQUFpQjtRQUNyQyxJQUFJLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDbkQsQ0FBQztJQUVELHFCQUFxQixDQUFDLE9BQWlCO1FBQ3RDLElBQUksQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNwRCxDQUFDO0lBRUQsWUFBWTtRQUNYLElBQUksQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3pDLElBQUksQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFBO0lBQzNDLENBQUM7SUFFRCxrQkFBa0I7UUFDakIsSUFBSSxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsYUFBYSxFQUFFLENBQUE7SUFDM0MsQ0FBQztJQUVELHNCQUFzQjtRQUNyQixJQUFJLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQy9DLENBQUM7SUFFRCxtQkFBbUI7UUFDbEIsSUFBSSxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsYUFBYSxFQUFFLENBQUE7SUFDNUMsQ0FBQztJQUVELHVCQUF1QjtRQUN0QixJQUFJLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ2hELENBQUM7SUFFRCxtQkFBbUI7UUFDbEIsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsRUFBRSxDQUFBO0lBQzFDLENBQUM7SUFFRCxvQkFBb0I7UUFDbkIsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDaEQsQ0FBQztJQUVELHFCQUFxQjtRQUNwQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxnQkFBZ0I7UUFDZixJQUFJLENBQUMsV0FBVyxFQUFFLFlBQVksRUFBRSxDQUFBO0lBQ2pDLENBQUM7SUFFRCxJQUFJLHVCQUF1QixDQUFDLEdBQVk7UUFDdkMsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtRQUNuRSxDQUFDO0lBQ0YsQ0FBQztJQUVPLE1BQU0sQ0FBQyxTQUFzQixFQUFFLE9BQTZCO1FBQ25FLElBQUksQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUE7UUFDN0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQTtRQUV4QyxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUM3QyxDQUFDO1FBRUQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDN0MsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVPLDBCQUEwQjtRQUNqQyxJQUFJLENBQUMsV0FBVyxFQUFFLDBCQUEwQixDQUMzQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyx1QkFBdUIsRUFBRSxDQUNwRCxDQUFBO0lBQ0YsQ0FBQztJQUVPLHlCQUF5QixDQUFDLE1BQW1CO1FBQ3BELE1BQU0sSUFBSSxHQUFtQjtZQUM1QixnQkFBZ0IsRUFBRSxTQUFTO1lBQzNCLFlBQVksRUFBRSxTQUFTO1lBQ3ZCLGdCQUFnQixFQUFFLFNBQVM7WUFDM0IscUJBQXFCLEVBQUUsU0FBUztZQUNoQyx5QkFBeUIsRUFBRSxTQUFTO1lBQ3BDLHlCQUF5QixFQUFFLFNBQVM7WUFDcEMsOEJBQThCLEVBQUUsU0FBUztZQUN6QyxlQUFlLEVBQUUsU0FBUztZQUMxQixLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQ0FBb0MsRUFBRSxnQkFBZ0IsQ0FBQztZQUMzRSxhQUFhLEVBQUUsdUJBQXVCLENBQUMsU0FBUyxDQUFDO1NBQ2pELENBQUE7UUFDRCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNuRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDdkUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUE7UUFDdkUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksR0FBRyxxQkFBcUIsQ0FBQTtRQUNyRCxJQUFJLENBQUMsNEJBQTRCLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQ2xGLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUM1QixDQUFBO0lBQ0YsQ0FBQztJQUVPLGlCQUFpQixDQUFDLE1BQW1CLEVBQUUsT0FBNkI7UUFDM0UsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLGFBQWEsSUFBSSxFQUFFLENBQUE7UUFDM0MsTUFBTSxZQUFZLEdBQXNCO1lBQ3ZDLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxvREFBb0QsQ0FBQztZQUN6RixVQUFVLEVBQUUsQ0FBQyxLQUFhLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUM7WUFDOUQsV0FBVyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsUUFBUSxDQUFDO1lBQ3pELHdCQUF3QixFQUFFLHFCQUFxQixDQUM5QyxFQUFFLEVBQ0YsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQiwyRkFFdEMsQ0FDRDtZQUNELHFCQUFxQixFQUFFLHFCQUFxQixDQUMzQyxFQUFFLEVBQ0YsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixtRkFFdEMsQ0FDRDtZQUNELGdCQUFnQixFQUFFLHFCQUFxQixDQUN0QyxFQUFFLEVBQ0YsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQiwyRUFBaUQsQ0FDeEY7WUFDRCxPQUFPLEVBQUUsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDO1lBQ3pCLGVBQWUsRUFBRSxHQUFHLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUM7WUFDeEUsY0FBYyxFQUFFLElBQUk7WUFDcEIsaUJBQWlCLEVBQUUsY0FBWSxDQUFDLGdCQUFnQjtZQUNoRCxxQkFBcUIsRUFBRSxJQUFJO1lBQzNCLGNBQWMsRUFBRSxPQUFPLENBQUMsY0FBYztZQUN0QyxZQUFZLEVBQUUsT0FBTyxDQUFDLFlBQVk7U0FDbEMsQ0FBQTtRQUVELE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUE7UUFFckYsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNoQyxJQUFJLGVBQWUsQ0FDbEIsb0JBQW9CLEVBQ3BCLElBQUksQ0FBQyxrQkFBa0IsRUFDdkIsWUFBWSxFQUNaLElBQUksQ0FBQyxpQkFBaUIsRUFDdEIsSUFBSSxDQUFDLGtCQUFrQixFQUN2QixJQUFJLENBQUMsb0JBQW9CLEVBQ3pCLElBQUksQ0FBQyxnQkFBZ0IsRUFDckIsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQ3ZCLENBQ0QsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxhQUE2QixFQUFFLEVBQUUsQ0FDNUQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxDQUN4QyxDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQzlDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDNUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQzVELElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDdEQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsV0FBVyxDQUFDLHNCQUFzQixDQUFDLENBQUMsYUFBNkIsRUFBRSxFQUFFLENBQ3pFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhLENBQUMsQ0FDMUMsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDLGFBQTZCLEVBQUUsRUFBRSxDQUNqRSxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUNsQyxDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEYsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FDakYsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsRUFBRTtZQUMvQixJQUFJLENBQUMsc0JBQXNCLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUE7UUFDdEYsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM1QyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUN0RCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsdUJBQXVCLENBQUMsVUFBVSxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ2xELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7WUFFcEMsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsbUJBQW1CLENBQUE7WUFDeEUsSUFBSSxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO2dCQUNwRSxNQUFNLGdCQUFnQixHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtnQkFDbEUsSUFBSSxnQkFBZ0IsSUFBSSxJQUFJLENBQUMsNkJBQTZCLEtBQUssZ0JBQWdCLEVBQUUsQ0FBQztvQkFDakYsSUFBSSxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsWUFBWSxFQUFFLENBQUE7b0JBQ3pDLElBQUksQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUE7b0JBQzVDLElBQUksQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLENBQUE7Z0JBQzNCLENBQUM7Z0JBRUQsSUFBSSxDQUFDLDZCQUE2QixHQUFHLGdCQUFnQixDQUFBO1lBQ3RELENBQUM7WUFFRCxJQUFJLENBQUMsaUNBQWlDLEdBQUcsS0FBSyxDQUFBO1FBQy9DLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUNuRixDQUFBO1FBRUQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksTUFBTSxDQUFDO1lBQ25DLFNBQVMsRUFBRSxLQUFLO1lBQ2hCLEtBQUssRUFBRSxxQkFBcUIsQ0FDM0IsR0FBRyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsc0JBQXNCLENBQUMsRUFDbkQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLHVDQUF1QyxDQUFDLENBQ2hGO1lBQ0QsSUFBSSxFQUFFLHFCQUFxQjtZQUMzQixhQUFhLEVBQUUsdUJBQXVCLENBQUMsU0FBUyxDQUFDO1lBQ2pELEdBQUcsbUJBQW1CO1NBQ3RCLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFbkYsSUFBSSxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFO2dCQUNwRixJQUFJLEVBQUUsUUFBUTtnQkFDZCxjQUFjLEVBQUUscUJBQXFCO2FBQ3JDLENBQUMsQ0FBQTtZQUNGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1lBQ25FLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLO2dCQUMzQixFQUFFO29CQUNGLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBaUMsUUFBUSxDQUFDLENBQUMsWUFBWTt5QkFDeEYsMkJBQTJCLElBQUksQ0FBQyxDQUFDLENBQUE7WUFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBYSxFQUFFLEVBQUU7Z0JBQ3BELElBQUksS0FBSyxLQUFLLEdBQUcsRUFBRSxDQUFDO29CQUNuQixJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQTtnQkFDdEMsQ0FBQztnQkFDRCxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtZQUM3QixDQUFDLENBQUMsQ0FDRixDQUFBO1lBQ0QsR0FBRyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDakUsQ0FBQztJQUNGLENBQUM7SUFFTyxxQkFBcUI7UUFDNUIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxDQUFBO1FBRS9CLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNoRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQTtRQUNuQyxDQUFDO1FBRUQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxDQUFBO0lBQ2hDLENBQUM7SUFFTSxlQUFlLENBQUMsS0FBYTtRQUNuQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDN0IsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQTtRQUN2QyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFBO1lBQ3JDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEdBQUcsRUFBRSxHQUFHLEtBQUssQ0FBQTtRQUMxQyxDQUFDO0lBQ0YsQ0FBQztJQUVPLGtCQUFrQixDQUFDLE1BQW1CLEVBQUUsT0FBNkI7UUFDNUUsSUFBSSxDQUFDLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFBO1FBQ2hGLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO1FBRTdFLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDakMsSUFBSSx5QkFBeUIsQ0FDNUIsVUFBVSxFQUNWLElBQUksQ0FBQyxrQkFBa0IsRUFDdkI7WUFDQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDbEIsZUFBZSxFQUNmLHVEQUF1RCxDQUN2RDtZQUNELFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLFNBQVMsQ0FBQztZQUNsRSx1QkFBdUIsRUFBRSxxQkFBcUIsQ0FDN0MsRUFBRSxFQUNGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxnQkFBZ0Isa0ZBRXRDLENBQ0Q7WUFDRCxPQUFPLEVBQUUsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQztZQUN4QyxlQUFlLEVBQUUsR0FBRyxFQUFFLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDO1lBQ3hFLGNBQWMsRUFBRSxJQUFJO1lBQ3BCLGlCQUFpQixFQUFFLGNBQVksQ0FBQyxnQkFBZ0I7WUFDaEQsY0FBYyxFQUFFLE9BQU8sQ0FBQyxjQUFjO1lBQ3RDLFlBQVksRUFBRSxPQUFPLENBQUMsWUFBWTtTQUNsQyxFQUNELElBQUksQ0FBQyxpQkFBaUIsRUFDdEIsSUFBSSxDQUNKLENBQ0QsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFO1lBQ25ELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDbEIsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQ3ZCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFBO2dCQUNyRSxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FDekYsQ0FBQTtRQUNELElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDLENBQUE7UUFDdEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRyxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUNsRixDQUFBO1FBRUQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDbEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssR0FBRyxjQUFZLENBQUMsMEJBQTBCLENBQUE7UUFDckUsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQTtRQUM1RSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ2pGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQy9ELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxhQUFhLENBQUMsQ0FDN0MsQ0FBQTtRQUVELElBQUksQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM3QyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUN2RCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsd0JBQXdCLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FDckYsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQ3JGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxZQUFZLENBQUMscUJBQXFCLENBQUMsQ0FBQyxhQUE2QixFQUFFLEVBQUUsQ0FDekUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxDQUN6QyxDQUNELENBQUE7SUFDRixDQUFDO0lBRUQsaUJBQWlCO1FBQ2hCLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDekIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzdCLENBQUM7SUFFTyxxQkFBcUI7UUFDNUIsSUFBSSxDQUFDLGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDbkQsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsbUJBQW1CLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQ2pELEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixDQUFDLENBQ3BELENBQUE7WUFDRCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQzlDLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixDQUFDLENBQ3BELENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FDakQsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLENBQUMsQ0FDcEQsQ0FBQTtZQUNELElBQUksQ0FBQyxtQkFBbUIsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FDOUMsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMscUJBQXFCLENBQUMsQ0FDcEQsQ0FBQTtRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsT0FBTyxDQUFDLFlBQVksQ0FDN0MsZUFBZSxFQUNmLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQ3hDLENBQUE7UUFDRCxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQTtRQUMvQixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDOUIsQ0FBQztJQUVELFFBQVEsQ0FBQyxLQUFhO1FBQ3JCLElBQUksQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCx3QkFBd0IsQ0FBQyxPQUFnQjtRQUN4QyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQ3hFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO1lBQ3ZDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEdBQUcsT0FBTztnQkFDcEMsQ0FBQyxDQUFDLGNBQVksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUM7Z0JBQ2hFLENBQUMsQ0FBQyxjQUFZLENBQUMsMEJBQTBCLENBQUE7WUFDMUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUE7UUFDaEMsQ0FBQztJQUNGLENBQUM7SUFFTyx3QkFBd0I7UUFDL0IsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQzNDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQTtRQUMxRSxJQUFJLFlBQVksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNoQyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3pDLElBQUksQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ3JDLENBQUM7SUFDRixDQUFDO0lBRU8sbUJBQW1CLENBQUMsS0FBYTtRQUN4QyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDeEIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUNuQyxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUFJLENBQUM7WUFDSixJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDdkIsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUM5QixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU8sb0JBQW9CO1FBQzNCLElBQUksQ0FBQyxXQUFXLEVBQUUsWUFBWSxFQUFFLENBQUE7UUFDaEMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRXBDLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzNDLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDO2dCQUNsQyxJQUFJLENBQUM7b0JBQ0osTUFBTSxLQUFLLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtvQkFDM0QsTUFBTSxvQkFBb0IsR0FDekI7Ozs7Ozs7O29CQVFjLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLE1BQU0sSUFBSSxDQUFDLENBQUE7b0JBRXpDLE1BQU0sZUFBZSxHQUNwQixvQkFBb0IsR0FBRyxFQUFFO3dCQUN4QixDQUFDLENBQUMsQ0FBQzt3QkFDSCxDQUFDLENBQUMsb0JBQW9CLEdBQUcsR0FBRzs0QkFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQywrQkFBK0I7NEJBQ25DLENBQUMsQ0FBQyxFQUFFLENBQUEsQ0FBQyxvQ0FBb0M7b0JBRTVDLElBQUksQ0FBQyxZQUFZLENBQ2hCLElBQUksRUFDSixJQUFJLENBQUMsbUJBQW1CLENBQUMsMEJBQTBCLEdBQUcsZUFBZSxDQUNyRSxDQUFBO2dCQUNGLENBQUM7Z0JBQUMsTUFBTSxDQUFDO29CQUNSLE9BQU87Z0JBQ1IsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtZQUM3RSxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxhQUE2QjtRQUN6RCxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsVUFBVSx3QkFBZ0IsQ0FBQyxFQUFFLENBQUM7WUFDdEQsSUFBSSxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQy9DLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUMvQixDQUFDO1FBRUQsSUFBSSxhQUFhLENBQUMsTUFBTSx1QkFBZSxFQUFFLENBQUM7WUFDekMsSUFBSSxDQUFDLFdBQVcsRUFBRSxjQUFjLEVBQUUsQ0FBQTtZQUNsQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7WUFDbkIsYUFBYSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQy9CLENBQUM7YUFBTSxJQUFJLGFBQWEsQ0FBQyxNQUFNLHdCQUFnQixFQUFFLENBQUM7WUFDakQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUMxQyxhQUFhLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDL0IsQ0FBQzthQUFNLElBQUksYUFBYSxDQUFDLE1BQU0scUJBQWEsRUFBRSxDQUFDO1lBQzlDLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksQ0FBQyxZQUFZLEVBQUUsS0FBSyxFQUFFLENBQUE7WUFDM0IsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxXQUFXLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQTtZQUN6QyxDQUFDO1lBQ0QsYUFBYSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQy9CLENBQUM7YUFBTSxJQUFJLGFBQWEsQ0FBQyxNQUFNLDBCQUFpQixFQUFFLENBQUM7WUFDbEQsa0NBQWtDLENBQ2pDLGFBQWEsRUFDYixJQUFJLENBQUMsV0FBVyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsRUFDbEMsSUFBSSxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxJQUFJLElBQUksQ0FDM0QsQ0FBQTtRQUNGLENBQUM7YUFBTSxJQUFJLGFBQWEsQ0FBQyxNQUFNLDRCQUFtQixFQUFFLENBQUM7WUFDcEQsb0NBQW9DLENBQ25DLGFBQWEsRUFDYixJQUFJLENBQUMsV0FBVyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsRUFDbEMsSUFBSSxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxJQUFJLElBQUksQ0FDM0QsQ0FBQTtRQUNGLENBQUM7YUFBTSxJQUFJLGFBQWEsQ0FBQyxNQUFNLHlCQUFnQixFQUFFLENBQUM7WUFDakQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsWUFBWSxDQUFBO1lBQzVELElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2xCLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ3BDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtnQkFDcEIsYUFBYSxDQUFDLGNBQWMsRUFBRSxDQUFBO1lBQy9CLENBQUM7UUFDRixDQUFDO2FBQU0sSUFBSSxhQUFhLENBQUMsTUFBTSwyQkFBa0IsRUFBRSxDQUFDO1lBQ25ELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLFlBQVksQ0FBQTtZQUM1RCxJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUNsQixNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQTtnQkFDM0MsWUFBWSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFDcEQsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUNwQixhQUFhLENBQUMsY0FBYyxFQUFFLENBQUE7WUFDL0IsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sc0JBQXNCLENBQUMsYUFBNkI7UUFDM0QsSUFBSSxhQUFhLENBQUMsTUFBTSxDQUFDLDZDQUEwQixDQUFDLEVBQUUsQ0FBQztZQUN0RCxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDO2dCQUMzQixJQUFJLENBQUMsWUFBWSxFQUFFLEtBQUssRUFBRSxDQUFBO2dCQUMxQixhQUFhLENBQUMsY0FBYyxFQUFFLENBQUE7WUFDL0IsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sY0FBYyxDQUFDLGFBQTZCO1FBQ25ELElBQUksYUFBYSxDQUFDLE1BQU0scUJBQWEsRUFBRSxDQUFDO1lBQ3ZDLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksQ0FBQyxZQUFZLEVBQUUsZUFBZSxFQUFFLENBQUE7Z0JBQ3BDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtZQUMvQixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxhQUE2QjtRQUMxRCxJQUFJLGFBQWEsQ0FBQyxNQUFNLHFCQUFhLEVBQUUsQ0FBQztZQUN2QyxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDO2dCQUM1QixJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtZQUM3QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUNwQixDQUFDO1lBQ0QsYUFBYSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQy9CLENBQUM7YUFBTSxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsNkNBQTBCLENBQUMsRUFBRSxDQUFDO1lBQzdELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1lBQ3ZCLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUMvQixDQUFDO0lBQ0YsQ0FBQztJQUVPLHFCQUFxQixDQUFDLGFBQTZCO1FBQzFELElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxVQUFVLHdCQUFnQixDQUFDLEVBQUUsQ0FBQztZQUN0RCxJQUFJLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDaEQsYUFBYSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQy9CLENBQUM7UUFFRCxJQUFJLGFBQWEsQ0FBQyxNQUFNLHVCQUFlLEVBQUUsQ0FBQztZQUN6QyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7WUFDbkIsYUFBYSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQy9CLENBQUM7YUFBTSxJQUFJLGFBQWEsQ0FBQyxNQUFNLHFCQUFhLEVBQUUsQ0FBQztZQUM5QyxJQUFJLENBQUMsV0FBVyxFQUFFLG9CQUFvQixFQUFFLENBQUE7WUFDeEMsYUFBYSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQy9CLENBQUM7YUFBTSxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsNkNBQTBCLENBQUMsRUFBRSxDQUFDO1lBQzdELElBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUE7WUFDekIsYUFBYSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQy9CLENBQUM7YUFBTSxJQUFJLGFBQWEsQ0FBQyxNQUFNLDBCQUFpQixFQUFFLENBQUM7WUFDbEQsa0NBQWtDLENBQ2pDLGFBQWEsRUFDYixJQUFJLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsRUFDbkMsSUFBSSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxJQUFJLElBQUksQ0FDNUQsQ0FBQTtRQUNGLENBQUM7YUFBTSxJQUFJLGFBQWEsQ0FBQyxNQUFNLDRCQUFtQixFQUFFLENBQUM7WUFDcEQsb0NBQW9DLENBQ25DLGFBQWEsRUFDYixJQUFJLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsRUFDbkMsSUFBSSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxJQUFJLElBQUksQ0FDNUQsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8seUJBQXlCLENBQUMsYUFBNkI7UUFDOUQsSUFBSSxhQUFhLENBQUMsTUFBTSxDQUFDLDZDQUEwQixDQUFDLEVBQUUsQ0FBQztZQUN0RCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtZQUN2QixhQUFhLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDL0IsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsWUFBWSxDQUFDLGVBQWUsR0FBRyxLQUFLLEVBQUUsUUFBZ0IsQ0FBQztRQUNwRSxJQUFJLENBQUMsV0FBVyxFQUFFLFFBQVEsRUFBRSxDQUFBO1FBQzVCLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDO1lBQ2hELE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxtQkFBbUIsQ0FBQTtRQUN4RSxJQUFJLEtBQUssSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDaEQsQ0FBQztRQUNELElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQUUsZUFBZSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDdEQsQ0FBQztJQUVELGVBQWU7UUFDZCxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzFFLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxRQUFpQjtRQUNuQyxNQUFNLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUE7UUFDN0MsTUFBTSxRQUFRLEdBQUcsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDOUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sR0FBRyxRQUFRLEtBQUssQ0FBQyxDQUFBO1FBQy9DLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEdBQUcsRUFBRSxHQUFHLFFBQVEsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsa0JBQWtCO1FBQ2pCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFBO1FBQ2hFLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO0lBQzdCLENBQUM7SUFFUSxPQUFPO1FBQ2YsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3BDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDO0lBRUQsSUFBWSxtQkFBbUI7UUFDOUIsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFpQyxRQUFRLENBQUMsQ0FBQTtJQUNwRixDQUFDOztBQS95QlcsWUFBWTtJQTZFdEIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFlBQUEsY0FBYyxDQUFBO0dBckZKLFlBQVksQ0FnekJ4Qjs7QUFFRCxNQUFNLFVBQVUscUJBQXFCO0lBQ3BDLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO1FBQ3BELEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFO1FBQ3ZCLE1BQU0sNkNBQW1DO1FBQ3pDLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixTQUFTLENBQUMsYUFBYSxDQUFDLG9CQUFvQixFQUM1QyxTQUFTLENBQUMsYUFBYSxDQUFDLGdCQUFnQixFQUN4QywrQkFBK0IsQ0FDL0I7UUFDRCxPQUFPLEVBQUUsZ0RBQTJCLHdCQUFnQjtRQUNwRCxPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUNyQixNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQ2hELElBQUksbUJBQW1CLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztnQkFDdkMsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFBO2dCQUM5QyxJQUFJLFVBQVUsRUFBRSxDQUFDO29CQUNoQixJQUFJLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFBO2dCQUM5RCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7S0FDRCxDQUFDLENBQUE7QUFDSCxDQUFDIn0=