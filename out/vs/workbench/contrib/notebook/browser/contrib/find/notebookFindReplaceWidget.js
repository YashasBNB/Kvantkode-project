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
import * as nls from '../../../../../../nls.js';
import * as dom from '../../../../../../base/browser/dom.js';
import './notebookFindReplaceWidget.css';
import { ActionBar } from '../../../../../../base/browser/ui/actionbar/actionbar.js';
import { DropdownMenuActionViewItem } from '../../../../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { FindInput, } from '../../../../../../base/browser/ui/findinput/findInput.js';
import { ProgressBar } from '../../../../../../base/browser/ui/progressbar/progressbar.js';
import { Sash } from '../../../../../../base/browser/ui/sash/sash.js';
import { Toggle } from '../../../../../../base/browser/ui/toggle/toggle.js';
import { Widget } from '../../../../../../base/browser/ui/widget.js';
import { Action, ActionRunner, Separator, } from '../../../../../../base/common/actions.js';
import { Delayer } from '../../../../../../base/common/async.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Event } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { isSafari } from '../../../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { FindReplaceState, } from '../../../../../../editor/contrib/find/browser/findState.js';
import { findNextMatchIcon, findPreviousMatchIcon, findReplaceAllIcon, findReplaceIcon, findSelectionIcon, SimpleButton, } from '../../../../../../editor/contrib/find/browser/findWidget.js';
import { parseReplaceString, ReplacePattern, } from '../../../../../../editor/contrib/find/browser/replacePattern.js';
import { getActionBarActions } from '../../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService, } from '../../../../../../platform/contextview/browser/contextView.js';
import { ContextScopedReplaceInput, registerAndCreateHistoryNavigationContext, } from '../../../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { defaultInputBoxStyles, defaultProgressBarStyles, defaultToggleStyles, } from '../../../../../../platform/theme/browser/defaultStyles.js';
import { asCssVariable, inputActiveOptionBackground, inputActiveOptionBorder, inputActiveOptionForeground, } from '../../../../../../platform/theme/common/colorRegistry.js';
import { registerIcon, widgetClose } from '../../../../../../platform/theme/common/iconRegistry.js';
import { registerThemingParticipant } from '../../../../../../platform/theme/common/themeService.js';
import { filterIcon } from '../../../../extensions/browser/extensionsIcons.js';
import { NotebookFindFilters } from './findFilters.js';
import { NotebookFindScopeType, NotebookSetting } from '../../../common/notebookCommon.js';
const NLS_FIND_INPUT_LABEL = nls.localize('label.find', 'Find');
const NLS_FIND_INPUT_PLACEHOLDER = nls.localize('placeholder.find', 'Find');
const NLS_PREVIOUS_MATCH_BTN_LABEL = nls.localize('label.previousMatchButton', 'Previous Match');
const NLS_NEXT_MATCH_BTN_LABEL = nls.localize('label.nextMatchButton', 'Next Match');
const NLS_TOGGLE_SELECTION_FIND_TITLE = nls.localize('label.toggleSelectionFind', 'Find in Selection');
const NLS_CLOSE_BTN_LABEL = nls.localize('label.closeButton', 'Close');
const NLS_TOGGLE_REPLACE_MODE_BTN_LABEL = nls.localize('label.toggleReplaceButton', 'Toggle Replace');
const NLS_REPLACE_INPUT_LABEL = nls.localize('label.replace', 'Replace');
const NLS_REPLACE_INPUT_PLACEHOLDER = nls.localize('placeholder.replace', 'Replace');
const NLS_REPLACE_BTN_LABEL = nls.localize('label.replaceButton', 'Replace');
const NLS_REPLACE_ALL_BTN_LABEL = nls.localize('label.replaceAllButton', 'Replace All');
export const findFilterButton = registerIcon('find-filter', Codicon.filter, nls.localize('findFilterIcon', 'Icon for Find Filter in find widget.'));
const NOTEBOOK_FIND_FILTERS = nls.localize('notebook.find.filter.filterAction', 'Find Filters');
const NOTEBOOK_FIND_IN_MARKUP_INPUT = nls.localize('notebook.find.filter.findInMarkupInput', 'Markdown Source');
const NOTEBOOK_FIND_IN_MARKUP_PREVIEW = nls.localize('notebook.find.filter.findInMarkupPreview', 'Rendered Markdown');
const NOTEBOOK_FIND_IN_CODE_INPUT = nls.localize('notebook.find.filter.findInCodeInput', 'Code Cell Source');
const NOTEBOOK_FIND_IN_CODE_OUTPUT = nls.localize('notebook.find.filter.findInCodeOutput', 'Code Cell Output');
const NOTEBOOK_FIND_WIDGET_INITIAL_WIDTH = 419;
const NOTEBOOK_FIND_WIDGET_INITIAL_HORIZONTAL_PADDING = 4;
let NotebookFindFilterActionViewItem = class NotebookFindFilterActionViewItem extends DropdownMenuActionViewItem {
    constructor(filters, action, options, actionRunner, contextMenuService) {
        super(action, { getActions: () => this.getActions() }, contextMenuService, {
            ...options,
            actionRunner,
            classNames: action.class,
            anchorAlignmentProvider: () => 1 /* AnchorAlignment.RIGHT */,
        });
        this.filters = filters;
    }
    render(container) {
        super.render(container);
        this.updateChecked();
    }
    getActions() {
        const markdownInput = {
            checked: this.filters.markupInput,
            class: undefined,
            enabled: true,
            id: 'findInMarkdownInput',
            label: NOTEBOOK_FIND_IN_MARKUP_INPUT,
            run: async () => {
                this.filters.markupInput = !this.filters.markupInput;
            },
            tooltip: '',
        };
        const markdownPreview = {
            checked: this.filters.markupPreview,
            class: undefined,
            enabled: true,
            id: 'findInMarkdownInput',
            label: NOTEBOOK_FIND_IN_MARKUP_PREVIEW,
            run: async () => {
                this.filters.markupPreview = !this.filters.markupPreview;
            },
            tooltip: '',
        };
        const codeInput = {
            checked: this.filters.codeInput,
            class: undefined,
            enabled: true,
            id: 'findInCodeInput',
            label: NOTEBOOK_FIND_IN_CODE_INPUT,
            run: async () => {
                this.filters.codeInput = !this.filters.codeInput;
            },
            tooltip: '',
        };
        const codeOutput = {
            checked: this.filters.codeOutput,
            class: undefined,
            enabled: true,
            id: 'findInCodeOutput',
            label: NOTEBOOK_FIND_IN_CODE_OUTPUT,
            run: async () => {
                this.filters.codeOutput = !this.filters.codeOutput;
            },
            tooltip: '',
            dispose: () => null,
        };
        if (isSafari) {
            return [markdownInput, codeInput];
        }
        else {
            return [markdownInput, markdownPreview, new Separator(), codeInput, codeOutput];
        }
    }
    updateChecked() {
        this.element.classList.toggle('checked', this._action.checked);
    }
};
NotebookFindFilterActionViewItem = __decorate([
    __param(4, IContextMenuService)
], NotebookFindFilterActionViewItem);
export class NotebookFindInputFilterButton extends Disposable {
    constructor(filters, contextMenuService, instantiationService, options, tooltip = NOTEBOOK_FIND_FILTERS) {
        super();
        this.filters = filters;
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this._actionbar = null;
        this._toggleStyles = options.toggleStyles;
        this._filtersAction = new Action('notebookFindFilterAction', tooltip, 'notebook-filters ' + ThemeIcon.asClassName(filterIcon));
        this._filtersAction.checked = false;
        this._filterButtonContainer = dom.$('.find-filter-button');
        this._filterButtonContainer.classList.add('monaco-custom-toggle');
        this.createFilters(this._filterButtonContainer);
    }
    get container() {
        return this._filterButtonContainer;
    }
    width() {
        return 2 /*margin left*/ + 2 /*border*/ + 2 /*padding*/ + 16; /* icon width */
    }
    enable() {
        this.container.setAttribute('aria-disabled', String(false));
    }
    disable() {
        this.container.setAttribute('aria-disabled', String(true));
    }
    set visible(visible) {
        this._filterButtonContainer.style.display = visible ? '' : 'none';
    }
    get visible() {
        return this._filterButtonContainer.style.display !== 'none';
    }
    applyStyles(filterChecked) {
        const toggleStyles = this._toggleStyles;
        this._filterButtonContainer.style.border = '1px solid transparent';
        this._filterButtonContainer.style.borderRadius = '3px';
        this._filterButtonContainer.style.borderColor =
            (filterChecked && toggleStyles.inputActiveOptionBorder) || '';
        this._filterButtonContainer.style.color =
            (filterChecked && toggleStyles.inputActiveOptionForeground) || 'inherit';
        this._filterButtonContainer.style.backgroundColor =
            (filterChecked && toggleStyles.inputActiveOptionBackground) || '';
    }
    createFilters(container) {
        this._actionbar = this._register(new ActionBar(container, {
            actionViewItemProvider: (action, options) => {
                if (action.id === this._filtersAction.id) {
                    return this.instantiationService.createInstance(NotebookFindFilterActionViewItem, this.filters, action, options, this._register(new ActionRunner()));
                }
                return undefined;
            },
        }));
        this._actionbar.push(this._filtersAction, { icon: true, label: false });
    }
}
export class NotebookFindInput extends FindInput {
    constructor(filters, contextKeyService, contextMenuService, instantiationService, parent, contextViewProvider, options) {
        super(parent, contextViewProvider, options);
        this.filters = filters;
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this._filterChecked = false;
        this._register(registerAndCreateHistoryNavigationContext(contextKeyService, this.inputBox));
        this._findFilter = this._register(new NotebookFindInputFilterButton(filters, contextMenuService, instantiationService, options));
        this.inputBox.paddingRight =
            (this.caseSensitive?.width() ?? 0) +
                (this.wholeWords?.width() ?? 0) +
                (this.regex?.width() ?? 0) +
                this._findFilter.width();
        this.controls.appendChild(this._findFilter.container);
    }
    setEnabled(enabled) {
        super.setEnabled(enabled);
        if (enabled && !this._filterChecked) {
            this.regex?.enable();
        }
        else {
            this.regex?.disable();
        }
    }
    updateFilterState(changed) {
        this._filterChecked = changed;
        if (this.regex) {
            if (this._filterChecked) {
                this.regex.disable();
                this.regex.domNode.tabIndex = -1;
                this.regex.domNode.classList.toggle('disabled', true);
            }
            else {
                this.regex.enable();
                this.regex.domNode.tabIndex = 0;
                this.regex.domNode.classList.toggle('disabled', false);
            }
        }
        this._findFilter.applyStyles(this._filterChecked);
    }
    getCellToolbarActions(menu) {
        return getActionBarActions(menu.getActions({ shouldForwardArgs: true }), (g) => /^inline/.test(g));
    }
}
let SimpleFindReplaceWidget = class SimpleFindReplaceWidget extends Widget {
    constructor(_contextViewService, contextKeyService, _configurationService, contextMenuService, instantiationService, hoverService, _state = new FindReplaceState(), _notebookEditor) {
        super();
        this._contextViewService = _contextViewService;
        this._configurationService = _configurationService;
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this._state = _state;
        this._notebookEditor = _notebookEditor;
        this._resizeOriginalWidth = NOTEBOOK_FIND_WIDGET_INITIAL_WIDTH;
        this._isVisible = false;
        this._isReplaceVisible = false;
        this.foundMatch = false;
        this.cellSelectionDecorationIds = [];
        this.textSelectionDecorationIds = [];
        this._register(this._state);
        const findFilters = this._configurationService.getValue(NotebookSetting.findFilters) ?? {
            markupSource: true,
            markupPreview: true,
            codeSource: true,
            codeOutput: true,
        };
        this._filters = new NotebookFindFilters(findFilters.markupSource, findFilters.markupPreview, findFilters.codeSource, findFilters.codeOutput, { findScopeType: NotebookFindScopeType.None });
        this._state.change({ filters: this._filters }, false);
        this._filters.onDidChange(() => {
            this._state.change({ filters: this._filters }, false);
        });
        this._domNode = document.createElement('div');
        this._domNode.classList.add('simple-fr-find-part-wrapper');
        this._register(Event.runAndSubscribe(this._configurationService.onDidChangeConfiguration, (e) => {
            if (!e || e.affectsConfiguration(NotebookSetting.globalToolbar)) {
                if (this._notebookEditor.notebookOptions.getLayoutConfiguration().globalToolbar) {
                    this._domNode.style.top = '26px';
                }
                else {
                    this._domNode.style.top = '0px';
                }
            }
        }));
        this._register(this._state.onFindReplaceStateChange((e) => this._onStateChanged(e)));
        this._scopedContextKeyService = contextKeyService.createScoped(this._domNode);
        const progressContainer = dom.$('.find-replace-progress');
        this._progressBar = new ProgressBar(progressContainer, defaultProgressBarStyles);
        this._domNode.appendChild(progressContainer);
        const isInteractiveWindow = contextKeyService.getContextKeyValue('notebookType') === 'interactive';
        // Toggle replace button
        this._toggleReplaceBtn = this._register(new SimpleButton({
            label: NLS_TOGGLE_REPLACE_MODE_BTN_LABEL,
            className: 'codicon toggle left',
            onTrigger: isInteractiveWindow
                ? () => { }
                : () => {
                    this._isReplaceVisible = !this._isReplaceVisible;
                    this._state.change({ isReplaceRevealed: this._isReplaceVisible }, false);
                    this._updateReplaceViewDisplay();
                },
        }, hoverService));
        this._toggleReplaceBtn.setEnabled(!isInteractiveWindow);
        this._toggleReplaceBtn.setExpanded(this._isReplaceVisible);
        this._domNode.appendChild(this._toggleReplaceBtn.domNode);
        this._innerFindDomNode = document.createElement('div');
        this._innerFindDomNode.classList.add('simple-fr-find-part');
        this._findInput = this._register(new NotebookFindInput(this._filters, this._scopedContextKeyService, this.contextMenuService, this.instantiationService, null, this._contextViewService, {
            // width:FIND_INPUT_AREA_WIDTH,
            label: NLS_FIND_INPUT_LABEL,
            placeholder: NLS_FIND_INPUT_PLACEHOLDER,
            validation: (value) => {
                if (value.length === 0 || !this._findInput.getRegex()) {
                    return null;
                }
                try {
                    new RegExp(value);
                    return null;
                }
                catch (e) {
                    this.foundMatch = false;
                    this.updateButtons(this.foundMatch);
                    return { content: e.message };
                }
            },
            flexibleWidth: true,
            showCommonFindToggles: true,
            inputBoxStyles: defaultInputBoxStyles,
            toggleStyles: defaultToggleStyles,
        }));
        // Find History with update delayer
        this._updateHistoryDelayer = new Delayer(500);
        this.oninput(this._findInput.domNode, (e) => {
            this.foundMatch = this.onInputChanged();
            this.updateButtons(this.foundMatch);
            this._delayedUpdateHistory();
        });
        this._register(this._findInput.inputBox.onDidChange(() => {
            this._state.change({ searchString: this._findInput.getValue() }, true);
        }));
        this._findInput.setRegex(!!this._state.isRegex);
        this._findInput.setCaseSensitive(!!this._state.matchCase);
        this._findInput.setWholeWords(!!this._state.wholeWord);
        this._register(this._findInput.onDidOptionChange(() => {
            this._state.change({
                isRegex: this._findInput.getRegex(),
                wholeWord: this._findInput.getWholeWords(),
                matchCase: this._findInput.getCaseSensitive(),
            }, true);
        }));
        this._register(this._state.onFindReplaceStateChange(() => {
            this._findInput.setRegex(this._state.isRegex);
            this._findInput.setWholeWords(this._state.wholeWord);
            this._findInput.setCaseSensitive(this._state.matchCase);
            this._replaceInput.setPreserveCase(this._state.preserveCase);
        }));
        this._matchesCount = document.createElement('div');
        this._matchesCount.className = 'matchesCount';
        this._updateMatchesCount();
        this.prevBtn = this._register(new SimpleButton({
            label: NLS_PREVIOUS_MATCH_BTN_LABEL,
            icon: findPreviousMatchIcon,
            onTrigger: () => {
                this.find(true);
            },
        }, hoverService));
        this.nextBtn = this._register(new SimpleButton({
            label: NLS_NEXT_MATCH_BTN_LABEL,
            icon: findNextMatchIcon,
            onTrigger: () => {
                this.find(false);
            },
        }, hoverService));
        this.inSelectionToggle = this._register(new Toggle({
            icon: findSelectionIcon,
            title: NLS_TOGGLE_SELECTION_FIND_TITLE,
            isChecked: false,
            inputActiveOptionBackground: asCssVariable(inputActiveOptionBackground),
            inputActiveOptionBorder: asCssVariable(inputActiveOptionBorder),
            inputActiveOptionForeground: asCssVariable(inputActiveOptionForeground),
        }));
        this.inSelectionToggle.domNode.style.display = 'inline';
        this.inSelectionToggle.onChange(() => {
            const checked = this.inSelectionToggle.checked;
            if (checked) {
                // selection logic:
                // 1. if there are multiple cells, do that.
                // 2. if there is only one cell, do the following:
                // 		- if there is a multi-line range highlighted, textual in selection
                // 		- if there is no range, cell in selection for that cell
                const cellSelection = this._notebookEditor.getSelections();
                const textSelection = this._notebookEditor
                    .getSelectionViewModels()[0]
                    .getSelections();
                if (cellSelection.length > 1 ||
                    cellSelection.some((range) => range.end - range.start > 1)) {
                    this._filters.findScope = {
                        findScopeType: NotebookFindScopeType.Cells,
                        selectedCellRanges: cellSelection,
                    };
                    this.setCellSelectionDecorations();
                }
                else if (textSelection.length > 1 ||
                    textSelection.some((range) => range.endLineNumber - range.startLineNumber >= 1)) {
                    this._filters.findScope = {
                        findScopeType: NotebookFindScopeType.Text,
                        selectedCellRanges: cellSelection,
                        selectedTextRanges: textSelection,
                    };
                    this.setTextSelectionDecorations(textSelection, this._notebookEditor.getSelectionViewModels()[0]);
                }
                else {
                    this._filters.findScope = {
                        findScopeType: NotebookFindScopeType.Cells,
                        selectedCellRanges: cellSelection,
                    };
                    this.setCellSelectionDecorations();
                }
            }
            else {
                this._filters.findScope = {
                    findScopeType: NotebookFindScopeType.None,
                };
                this.clearCellSelectionDecorations();
                this.clearTextSelectionDecorations();
            }
        });
        const closeBtn = this._register(new SimpleButton({
            label: NLS_CLOSE_BTN_LABEL,
            icon: widgetClose,
            onTrigger: () => {
                this.hide();
            },
        }, hoverService));
        this._innerFindDomNode.appendChild(this._findInput.domNode);
        this._innerFindDomNode.appendChild(this._matchesCount);
        this._innerFindDomNode.appendChild(this.prevBtn.domNode);
        this._innerFindDomNode.appendChild(this.nextBtn.domNode);
        this._innerFindDomNode.appendChild(this.inSelectionToggle.domNode);
        this._innerFindDomNode.appendChild(closeBtn.domNode);
        // _domNode wraps _innerDomNode, ensuring that
        this._domNode.appendChild(this._innerFindDomNode);
        this.onkeyup(this._innerFindDomNode, (e) => {
            if (e.equals(9 /* KeyCode.Escape */)) {
                this.hide();
                e.preventDefault();
                return;
            }
        });
        this._focusTracker = this._register(dom.trackFocus(this._domNode));
        this._register(this._focusTracker.onDidFocus(this.onFocusTrackerFocus.bind(this)));
        this._register(this._focusTracker.onDidBlur(this.onFocusTrackerBlur.bind(this)));
        this._findInputFocusTracker = this._register(dom.trackFocus(this._findInput.domNode));
        this._register(this._findInputFocusTracker.onDidFocus(this.onFindInputFocusTrackerFocus.bind(this)));
        this._register(this._findInputFocusTracker.onDidBlur(this.onFindInputFocusTrackerBlur.bind(this)));
        this._register(dom.addDisposableListener(this._innerFindDomNode, 'click', (event) => {
            event.stopPropagation();
        }));
        // Replace
        this._innerReplaceDomNode = document.createElement('div');
        this._innerReplaceDomNode.classList.add('simple-fr-replace-part');
        this._replaceInput = this._register(new ContextScopedReplaceInput(null, undefined, {
            label: NLS_REPLACE_INPUT_LABEL,
            placeholder: NLS_REPLACE_INPUT_PLACEHOLDER,
            history: new Set([]),
            inputBoxStyles: defaultInputBoxStyles,
            toggleStyles: defaultToggleStyles,
        }, contextKeyService, false));
        this._innerReplaceDomNode.appendChild(this._replaceInput.domNode);
        this._replaceInputFocusTracker = this._register(dom.trackFocus(this._replaceInput.domNode));
        this._register(this._replaceInputFocusTracker.onDidFocus(this.onReplaceInputFocusTrackerFocus.bind(this)));
        this._register(this._replaceInputFocusTracker.onDidBlur(this.onReplaceInputFocusTrackerBlur.bind(this)));
        this._register(this._replaceInput.inputBox.onDidChange(() => {
            this._state.change({ replaceString: this._replaceInput.getValue() }, true);
        }));
        this._domNode.appendChild(this._innerReplaceDomNode);
        this._updateReplaceViewDisplay();
        this._replaceBtn = this._register(new SimpleButton({
            label: NLS_REPLACE_BTN_LABEL,
            icon: findReplaceIcon,
            onTrigger: () => {
                this.replaceOne();
            },
        }, hoverService));
        // Replace all button
        this._replaceAllBtn = this._register(new SimpleButton({
            label: NLS_REPLACE_ALL_BTN_LABEL,
            icon: findReplaceAllIcon,
            onTrigger: () => {
                this.replaceAll();
            },
        }, hoverService));
        this._innerReplaceDomNode.appendChild(this._replaceBtn.domNode);
        this._innerReplaceDomNode.appendChild(this._replaceAllBtn.domNode);
        this._resizeSash = this._register(new Sash(this._domNode, { getVerticalSashLeft: () => 0 }, { orientation: 0 /* Orientation.VERTICAL */, size: 2 }));
        this._register(this._resizeSash.onDidStart(() => {
            this._resizeOriginalWidth = this._getDomWidth();
        }));
        this._register(this._resizeSash.onDidChange((evt) => {
            let width = this._resizeOriginalWidth + evt.startX - evt.currentX;
            if (width < NOTEBOOK_FIND_WIDGET_INITIAL_WIDTH) {
                width = NOTEBOOK_FIND_WIDGET_INITIAL_WIDTH;
            }
            const maxWidth = this._getMaxWidth();
            if (width > maxWidth) {
                width = maxWidth;
            }
            this._domNode.style.width = `${width}px`;
            if (this._isReplaceVisible) {
                this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
            }
            this._findInput.inputBox.layout();
        }));
        this._register(this._resizeSash.onDidReset(() => {
            // users double click on the sash
            // try to emulate what happens with editor findWidget
            const currentWidth = this._getDomWidth();
            let width = NOTEBOOK_FIND_WIDGET_INITIAL_WIDTH;
            if (currentWidth <= NOTEBOOK_FIND_WIDGET_INITIAL_WIDTH) {
                width = this._getMaxWidth();
            }
            this._domNode.style.width = `${width}px`;
            if (this._isReplaceVisible) {
                this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
            }
            this._findInput.inputBox.layout();
        }));
    }
    _getMaxWidth() {
        return this._notebookEditor.getLayoutInfo().width - 64;
    }
    _getDomWidth() {
        return dom.getTotalWidth(this._domNode) - NOTEBOOK_FIND_WIDGET_INITIAL_HORIZONTAL_PADDING * 2;
    }
    getCellToolbarActions(menu) {
        return getActionBarActions(menu.getActions({ shouldForwardArgs: true }), (g) => /^inline/.test(g));
    }
    get inputValue() {
        return this._findInput.getValue();
    }
    get replaceValue() {
        return this._replaceInput.getValue();
    }
    get replacePattern() {
        if (this._state.isRegex) {
            return parseReplaceString(this.replaceValue);
        }
        return ReplacePattern.fromStaticValue(this.replaceValue);
    }
    get focusTracker() {
        return this._focusTracker;
    }
    get isVisible() {
        return this._isVisible;
    }
    _onStateChanged(e) {
        this._updateButtons();
        this._updateMatchesCount();
    }
    _updateButtons() {
        this._findInput.setEnabled(this._isVisible);
        this._replaceInput.setEnabled(this._isVisible && this._isReplaceVisible);
        const findInputIsNonEmpty = this._state.searchString.length > 0;
        this._replaceBtn.setEnabled(this._isVisible && this._isReplaceVisible && findInputIsNonEmpty);
        this._replaceAllBtn.setEnabled(this._isVisible && this._isReplaceVisible && findInputIsNonEmpty);
        this._domNode.classList.toggle('replaceToggled', this._isReplaceVisible);
        this._toggleReplaceBtn.setExpanded(this._isReplaceVisible);
        this.foundMatch = this._state.matchesCount > 0;
        this.updateButtons(this.foundMatch);
    }
    setCellSelectionDecorations() {
        const cellHandles = [];
        this._notebookEditor.getSelectionViewModels().forEach((viewModel) => {
            cellHandles.push(viewModel.handle);
        });
        const decorations = [];
        for (const handle of cellHandles) {
            decorations.push({
                handle: handle,
                options: { className: 'nb-multiCellHighlight', outputClassName: 'nb-multiCellHighlight' },
            });
        }
        this.cellSelectionDecorationIds = this._notebookEditor.deltaCellDecorations([], decorations);
    }
    clearCellSelectionDecorations() {
        this._notebookEditor.deltaCellDecorations(this.cellSelectionDecorationIds, []);
    }
    setTextSelectionDecorations(textRanges, cell) {
        this._notebookEditor.changeModelDecorations((changeAccessor) => {
            const decorations = [];
            for (const range of textRanges) {
                decorations.push({
                    ownerId: cell.handle,
                    decorations: [
                        {
                            range: range,
                            options: {
                                description: 'text search range for notebook search scope',
                                isWholeLine: true,
                                className: 'nb-findScope',
                            },
                        },
                    ],
                });
            }
            this.textSelectionDecorationIds = changeAccessor.deltaDecorations([], decorations);
        });
    }
    clearTextSelectionDecorations() {
        this._notebookEditor.changeModelDecorations((changeAccessor) => {
            changeAccessor.deltaDecorations(this.textSelectionDecorationIds, []);
        });
    }
    _updateMatchesCount() { }
    dispose() {
        super.dispose();
        this._domNode.remove();
    }
    getDomNode() {
        return this._domNode;
    }
    reveal(initialInput) {
        if (initialInput) {
            this._findInput.setValue(initialInput);
        }
        if (this._isVisible) {
            this._findInput.select();
            return;
        }
        this._isVisible = true;
        this.updateButtons(this.foundMatch);
        setTimeout(() => {
            this._domNode.classList.add('visible', 'visible-transition');
            this._domNode.setAttribute('aria-hidden', 'false');
            this._findInput.select();
        }, 0);
    }
    focus() {
        this._findInput.focus();
    }
    show(initialInput, options) {
        if (initialInput) {
            this._findInput.setValue(initialInput);
        }
        this._isVisible = true;
        setTimeout(() => {
            this._domNode.classList.add('visible', 'visible-transition');
            this._domNode.setAttribute('aria-hidden', 'false');
            if (options?.focus ?? true) {
                this.focus();
            }
        }, 0);
    }
    showWithReplace(initialInput, replaceInput) {
        if (initialInput) {
            this._findInput.setValue(initialInput);
        }
        if (replaceInput) {
            this._replaceInput.setValue(replaceInput);
        }
        this._isVisible = true;
        this._isReplaceVisible = true;
        this._state.change({ isReplaceRevealed: this._isReplaceVisible }, false);
        this._updateReplaceViewDisplay();
        setTimeout(() => {
            this._domNode.classList.add('visible', 'visible-transition');
            this._domNode.setAttribute('aria-hidden', 'false');
            this._updateButtons();
            this._replaceInput.focus();
        }, 0);
    }
    _updateReplaceViewDisplay() {
        if (this._isReplaceVisible) {
            this._innerReplaceDomNode.style.display = 'flex';
        }
        else {
            this._innerReplaceDomNode.style.display = 'none';
        }
        this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
    }
    hide() {
        if (this._isVisible) {
            this.inSelectionToggle.checked = false;
            this._notebookEditor.deltaCellDecorations(this.cellSelectionDecorationIds, []);
            this._notebookEditor.changeModelDecorations((changeAccessor) => {
                changeAccessor.deltaDecorations(this.textSelectionDecorationIds, []);
            });
            this._domNode.classList.remove('visible-transition');
            this._domNode.setAttribute('aria-hidden', 'true');
            // Need to delay toggling visibility until after Transition, then visibility hidden - removes from tabIndex list
            setTimeout(() => {
                this._isVisible = false;
                this.updateButtons(this.foundMatch);
                this._domNode.classList.remove('visible');
            }, 200);
        }
    }
    _delayedUpdateHistory() {
        this._updateHistoryDelayer.trigger(this._updateHistory.bind(this));
    }
    _updateHistory() {
        this._findInput.inputBox.addToHistory();
    }
    _getRegexValue() {
        return this._findInput.getRegex();
    }
    _getWholeWordValue() {
        return this._findInput.getWholeWords();
    }
    _getCaseSensitiveValue() {
        return this._findInput.getCaseSensitive();
    }
    updateButtons(foundMatch) {
        const hasInput = this.inputValue.length > 0;
        this.prevBtn.setEnabled(this._isVisible && hasInput && foundMatch);
        this.nextBtn.setEnabled(this._isVisible && hasInput && foundMatch);
    }
};
SimpleFindReplaceWidget = __decorate([
    __param(0, IContextViewService),
    __param(1, IContextKeyService),
    __param(2, IConfigurationService),
    __param(3, IContextMenuService),
    __param(4, IInstantiationService),
    __param(5, IHoverService)
], SimpleFindReplaceWidget);
export { SimpleFindReplaceWidget };
// theming
registerThemingParticipant((theme, collector) => {
    collector.addRule(`
	.notebook-editor {
		--notebook-find-width: ${NOTEBOOK_FIND_WIDGET_INITIAL_WIDTH}px;
		--notebook-find-horizontal-padding: ${NOTEBOOK_FIND_WIDGET_INITIAL_HORIZONTAL_PADDING}px;
	}
	`);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tGaW5kUmVwbGFjZVdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9maW5kL25vdGVib29rRmluZFJlcGxhY2VXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSwwQkFBMEIsQ0FBQTtBQUMvQyxPQUFPLEtBQUssR0FBRyxNQUFNLHVDQUF1QyxDQUFBO0FBQzVELE9BQU8saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBTXBGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBQ2pILE9BQU8sRUFDTixTQUFTLEdBRVQsTUFBTSwwREFBMEQsQ0FBQTtBQUdqRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDMUYsT0FBTyxFQUEyQixJQUFJLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RixPQUFPLEVBQWlCLE1BQU0sRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sTUFBTSxFQUNOLFlBQVksRUFHWixTQUFTLEdBQ1QsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdkUsT0FB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