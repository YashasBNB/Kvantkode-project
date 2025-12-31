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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFFdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxNQUFNLEVBQWtCLE1BQU0sOENBQThDLENBQUE7QUFHckYsT0FBTyxFQUdOLFFBQVEsR0FDUixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN0RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sY0FBYyxFQUVkLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsbUJBQW1CLEdBQ25CLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUNO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