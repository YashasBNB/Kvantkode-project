/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
import { alert as alertFn } from '../../../../base/browser/ui/aria/aria.js';
import { Toggle } from '../../../../base/browser/ui/toggle/toggle.js';
import { Sash, } from '../../../../base/browser/ui/sash/sash.js';
import { Widget } from '../../../../base/browser/ui/widget.js';
import { Delayer } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import * as platform from '../../../../base/common/platform.js';
import * as strings from '../../../../base/common/strings.js';
import './findWidget.css';
import { Range } from '../../../common/core/range.js';
import { CONTEXT_FIND_INPUT_FOCUSED, CONTEXT_REPLACE_INPUT_FOCUSED, FIND_IDS, MATCHES_LIMIT, } from './findModel.js';
import * as nls from '../../../../nls.js';
import { ContextScopedFindInput, ContextScopedReplaceInput, } from '../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { showHistoryKeybindingHint } from '../../../../platform/history/browser/historyWidgetKeybindingHint.js';
import { asCssVariable, contrastBorder, editorFindMatchForeground, editorFindMatchHighlightBorder, editorFindMatchHighlightForeground, editorFindRangeHighlightBorder, inputActiveOptionBackground, inputActiveOptionBorder, inputActiveOptionForeground, } from '../../../../platform/theme/common/colorRegistry.js';
import { registerIcon, widgetClose } from '../../../../platform/theme/common/iconRegistry.js';
import { registerThemingParticipant, } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { isHighContrast } from '../../../../platform/theme/common/theme.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { defaultInputBoxStyles, defaultToggleStyles, } from '../../../../platform/theme/browser/defaultStyles.js';
import { createInstantHoverDelegate, getDefaultHoverDelegate, } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
const findCollapsedIcon = registerIcon('find-collapsed', Codicon.chevronRight, nls.localize('findCollapsedIcon', 'Icon to indicate that the editor find widget is collapsed.'));
const findExpandedIcon = registerIcon('find-expanded', Codicon.chevronDown, nls.localize('findExpandedIcon', 'Icon to indicate that the editor find widget is expanded.'));
export const findSelectionIcon = registerIcon('find-selection', Codicon.selection, nls.localize('findSelectionIcon', "Icon for 'Find in Selection' in the editor find widget."));
export const findReplaceIcon = registerIcon('find-replace', Codicon.replace, nls.localize('findReplaceIcon', "Icon for 'Replace' in the editor find widget."));
export const findReplaceAllIcon = registerIcon('find-replace-all', Codicon.replaceAll, nls.localize('findReplaceAllIcon', "Icon for 'Replace All' in the editor find widget."));
export const findPreviousMatchIcon = registerIcon('find-previous-match', Codicon.arrowUp, nls.localize('findPreviousMatchIcon', "Icon for 'Find Previous' in the editor find widget."));
export const findNextMatchIcon = registerIcon('find-next-match', Codicon.arrowDown, nls.localize('findNextMatchIcon', "Icon for 'Find Next' in the editor find widget."));
const NLS_FIND_DIALOG_LABEL = nls.localize('label.findDialog', 'Find / Replace');
const NLS_FIND_INPUT_LABEL = nls.localize('label.find', 'Find');
const NLS_FIND_INPUT_PLACEHOLDER = nls.localize('placeholder.find', 'Find');
const NLS_PREVIOUS_MATCH_BTN_LABEL = nls.localize('label.previousMatchButton', 'Previous Match');
const NLS_NEXT_MATCH_BTN_LABEL = nls.localize('label.nextMatchButton', 'Next Match');
const NLS_TOGGLE_SELECTION_FIND_TITLE = nls.localize('label.toggleSelectionFind', 'Find in Selection');
const NLS_CLOSE_BTN_LABEL = nls.localize('label.closeButton', 'Close');
const NLS_REPLACE_INPUT_LABEL = nls.localize('label.replace', 'Replace');
const NLS_REPLACE_INPUT_PLACEHOLDER = nls.localize('placeholder.replace', 'Replace');
const NLS_REPLACE_BTN_LABEL = nls.localize('label.replaceButton', 'Replace');
const NLS_REPLACE_ALL_BTN_LABEL = nls.localize('label.replaceAllButton', 'Replace All');
const NLS_TOGGLE_REPLACE_MODE_BTN_LABEL = nls.localize('label.toggleReplaceButton', 'Toggle Replace');
const NLS_MATCHES_COUNT_LIMIT_TITLE = nls.localize('title.matchesCountLimit', 'Only the first {0} results are highlighted, but all find operations work on the entire text.', MATCHES_LIMIT);
export const NLS_MATCHES_LOCATION = nls.localize('label.matchesLocation', '{0} of {1}');
export const NLS_NO_RESULTS = nls.localize('label.noResults', 'No results');
const FIND_WIDGET_INITIAL_WIDTH = 419;
const PART_WIDTH = 275;
const FIND_INPUT_AREA_WIDTH = PART_WIDTH - 54;
let MAX_MATCHES_COUNT_WIDTH = 69;
// let FIND_ALL_CONTROLS_WIDTH = 17/** Find Input margin-left */ + (MAX_MATCHES_COUNT_WIDTH + 3 + 1) /** Match Results */ + 23 /** Button */ * 4 + 2/** sash */;
const FIND_INPUT_AREA_HEIGHT = 33; // The height of Find Widget when Replace Input is not visible.
const ctrlEnterReplaceAllWarningPromptedKey = 'ctrlEnterReplaceAll.windows.donotask';
const ctrlKeyMod = platform.isMacintosh ? 256 /* KeyMod.WinCtrl */ : 2048 /* KeyMod.CtrlCmd */;
export class FindWidgetViewZone {
    constructor(afterLineNumber) {
        this.afterLineNumber = afterLineNumber;
        this.heightInPx = FIND_INPUT_AREA_HEIGHT;
        this.suppressMouseDown = false;
        this.domNode = document.createElement('div');
        this.domNode.className = 'dock-find-viewzone';
    }
}
function stopPropagationForMultiLineUpwards(event, value, textarea) {
    const isMultiline = !!value.match(/\n/);
    if (textarea && isMultiline && textarea.selectionStart > 0) {
        event.stopPropagation();
        return;
    }
}
function stopPropagationForMultiLineDownwards(event, value, textarea) {
    const isMultiline = !!value.match(/\n/);
    if (textarea && isMultiline && textarea.selectionEnd < textarea.value.length) {
        event.stopPropagation();
        return;
    }
}
export class FindWidget extends Widget {
    static { this.ID = 'editor.contrib.findWidget'; }
    constructor(codeEditor, controller, state, contextViewProvider, keybindingService, contextKeyService, themeService, storageService, notificationService, _hoverService, _findWidgetSearchHistory, _replaceWidgetHistory) {
        super();
        this._hoverService = _hoverService;
        this._findWidgetSearchHistory = _findWidgetSearchHistory;
        this._replaceWidgetHistory = _replaceWidgetHistory;
        this._cachedHeight = null;
        this._revealTimeouts = [];
        this._codeEditor = codeEditor;
        this._controller = controller;
        this._state = state;
        this._contextViewProvider = contextViewProvider;
        this._keybindingService = keybindingService;
        this._contextKeyService = contextKeyService;
        this._storageService = storageService;
        this._notificationService = notificationService;
        this._ctrlEnterReplaceAllWarningPrompted = !!storageService.getBoolean(ctrlEnterReplaceAllWarningPromptedKey, 0 /* StorageScope.PROFILE */);
        this._isVisible = false;
        this._isReplaceVisible = false;
        this._ignoreChangeEvent = false;
        this._updateHistoryDelayer = new Delayer(500);
        this._register(toDisposable(() => this._updateHistoryDelayer.cancel()));
        this._register(this._state.onFindReplaceStateChange((e) => this._onStateChanged(e)));
        this._buildDomNode();
        this._updateButtons();
        this._tryUpdateWidgetWidth();
        this._findInput.inputBox.layout();
        this._register(this._codeEditor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(96 /* EditorOption.readOnly */)) {
                if (this._codeEditor.getOption(96 /* EditorOption.readOnly */)) {
                    // Hide replace part if editor becomes read only
                    this._state.change({ isReplaceRevealed: false }, false);
                }
                this._updateButtons();
            }
            if (e.hasChanged(151 /* EditorOption.layoutInfo */)) {
                this._tryUpdateWidgetWidth();
            }
            if (e.hasChanged(2 /* EditorOption.accessibilitySupport */)) {
                this.updateAccessibilitySupport();
            }
            if (e.hasChanged(43 /* EditorOption.find */)) {
                const supportLoop = this._codeEditor.getOption(43 /* EditorOption.find */).loop;
                this._state.change({ loop: supportLoop }, false);
                const addExtraSpaceOnTop = this._codeEditor.getOption(43 /* EditorOption.find */).addExtraSpaceOnTop;
                if (addExtraSpaceOnTop && !this._viewZone) {
                    this._viewZone = new FindWidgetViewZone(0);
                    this._showViewZone();
                }
                if (!addExtraSpaceOnTop && this._viewZone) {
                    this._removeViewZone();
                }
            }
        }));
        this.updateAccessibilitySupport();
        this._register(this._codeEditor.onDidChangeCursorSelection(() => {
            if (this._isVisible) {
                this._updateToggleSelectionFindButton();
            }
        }));
        this._register(this._codeEditor.onDidFocusEditorWidget(async () => {
            if (this._isVisible) {
                const globalBufferTerm = await this._controller.getGlobalBufferTerm();
                if (globalBufferTerm && globalBufferTerm !== this._state.searchString) {
                    this._state.change({ searchString: globalBufferTerm }, false);
                    this._findInput.select();
                }
            }
        }));
        this._findInputFocused = CONTEXT_FIND_INPUT_FOCUSED.bindTo(contextKeyService);
        this._findFocusTracker = this._register(dom.trackFocus(this._findInput.inputBox.inputElement));
        this._register(this._findFocusTracker.onDidFocus(() => {
            this._findInputFocused.set(true);
            this._updateSearchScope();
        }));
        this._register(this._findFocusTracker.onDidBlur(() => {
            this._findInputFocused.set(false);
        }));
        this._replaceInputFocused = CONTEXT_REPLACE_INPUT_FOCUSED.bindTo(contextKeyService);
        this._replaceFocusTracker = this._register(dom.trackFocus(this._replaceInput.inputBox.inputElement));
        this._register(this._replaceFocusTracker.onDidFocus(() => {
            this._replaceInputFocused.set(true);
            this._updateSearchScope();
        }));
        this._register(this._replaceFocusTracker.onDidBlur(() => {
            this._replaceInputFocused.set(false);
        }));
        this._codeEditor.addOverlayWidget(this);
        if (this._codeEditor.getOption(43 /* EditorOption.find */).addExtraSpaceOnTop) {
            this._viewZone = new FindWidgetViewZone(0); // Put it before the first line then users can scroll beyond the first line.
        }
        this._register(this._codeEditor.onDidChangeModel(() => {
            if (!this._isVisible) {
                return;
            }
            this._viewZoneId = undefined;
        }));
        this._register(this._codeEditor.onDidScrollChange((e) => {
            if (e.scrollTopChanged) {
                this._layoutViewZone();
                return;
            }
            // for other scroll changes, layout the viewzone in next tick to avoid ruining current rendering.
            setTimeout(() => {
                this._layoutViewZone();
            }, 0);
        }));
    }
    // ----- IOverlayWidget API
    getId() {
        return FindWidget.ID;
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        if (this._isVisible) {
            return {
                preference: 0 /* OverlayWidgetPositionPreference.TOP_RIGHT_CORNER */,
            };
        }
        return null;
    }
    // ----- React to state changes
    _onStateChanged(e) {
        if (e.searchString) {
            try {
                this._ignoreChangeEvent = true;
                this._findInput.setValue(this._state.searchString);
            }
            finally {
                this._ignoreChangeEvent = false;
            }
            this._updateButtons();
        }
        if (e.replaceString) {
            this._replaceInput.inputBox.value = this._state.replaceString;
        }
        if (e.isRevealed) {
            if (this._state.isRevealed) {
                this._reveal();
            }
            else {
                this._hide(true);
            }
        }
        if (e.isReplaceRevealed) {
            if (this._state.isReplaceRevealed) {
                if (!this._codeEditor.getOption(96 /* EditorOption.readOnly */) && !this._isReplaceVisible) {
                    this._isReplaceVisible = true;
                    this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
                    this._updateButtons();
                    this._replaceInput.inputBox.layout();
                }
            }
            else {
                if (this._isReplaceVisible) {
                    this._isReplaceVisible = false;
                    this._updateButtons();
                }
            }
        }
        if ((e.isRevealed || e.isReplaceRevealed) &&
            (this._state.isRevealed || this._state.isReplaceRevealed)) {
            if (this._tryUpdateHeight()) {
                this._showViewZone();
            }
        }
        if (e.isRegex) {
            this._findInput.setRegex(this._state.isRegex);
        }
        if (e.wholeWord) {
            this._findInput.setWholeWords(this._state.wholeWord);
        }
        if (e.matchCase) {
            this._findInput.setCaseSensitive(this._state.matchCase);
        }
        if (e.preserveCase) {
            this._replaceInput.setPreserveCase(this._state.preserveCase);
        }
        if (e.searchScope) {
            if (this._state.searchScope) {
                this._toggleSelectionFind.checked = true;
            }
            else {
                this._toggleSelectionFind.checked = false;
            }
            this._updateToggleSelectionFindButton();
        }
        if (e.searchString || e.matchesCount || e.matchesPosition) {
            const showRedOutline = this._state.searchString.length > 0 && this._state.matchesCount === 0;
            this._domNode.classList.toggle('no-results', showRedOutline);
            this._updateMatchesCount();
            this._updateButtons();
        }
        if (e.searchString || e.currentMatch) {
            this._layoutViewZone();
        }
        if (e.updateHistory) {
            this._delayedUpdateHistory();
        }
        if (e.loop) {
            this._updateButtons();
        }
    }
    _delayedUpdateHistory() {
        this._updateHistoryDelayer
            .trigger(this._updateHistory.bind(this))
            .then(undefined, onUnexpectedError);
    }
    _updateHistory() {
        if (this._state.searchString) {
            this._findInput.inputBox.addToHistory();
        }
        if (this._state.replaceString) {
            this._replaceInput.inputBox.addToHistory();
        }
    }
    _updateMatchesCount() {
        this._matchesCount.style.minWidth = MAX_MATCHES_COUNT_WIDTH + 'px';
        if (this._state.matchesCount >= MATCHES_LIMIT) {
            this._matchesCount.title = NLS_MATCHES_COUNT_LIMIT_TITLE;
        }
        else {
            this._matchesCount.title = '';
        }
        // remove previous content
        this._matchesCount.firstChild?.remove();
        let label;
        if (this._state.matchesCount > 0) {
            let matchesCount = String(this._state.matchesCount);
            if (this._state.matchesCount >= MATCHES_LIMIT) {
                matchesCount += '+';
            }
            let matchesPosition = String(this._state.matchesPosition);
            if (matchesPosition === '0') {
                matchesPosition = '?';
            }
            label = strings.format(NLS_MATCHES_LOCATION, matchesPosition, matchesCount);
        }
        else {
            label = NLS_NO_RESULTS;
        }
        this._matchesCount.appendChild(document.createTextNode(label));
        alertFn(this._getAriaLabel(label, this._state.currentMatch, this._state.searchString));
        MAX_MATCHES_COUNT_WIDTH = Math.max(MAX_MATCHES_COUNT_WIDTH, this._matchesCount.clientWidth);
    }
    // ----- actions
    _getAriaLabel(label, currentMatch, searchString) {
        if (label === NLS_NO_RESULTS) {
            return searchString === ''
                ? nls.localize('ariaSearchNoResultEmpty', '{0} found', label)
                : nls.localize('ariaSearchNoResult', "{0} found for '{1}'", label, searchString);
        }
        if (currentMatch) {
            const ariaLabel = nls.localize('ariaSearchNoResultWithLineNum', "{0} found for '{1}', at {2}", label, searchString, currentMatch.startLineNumber + ':' + currentMatch.startColumn);
            const model = this._codeEditor.getModel();
            if (model &&
                currentMatch.startLineNumber <= model.getLineCount() &&
                currentMatch.startLineNumber >= 1) {
                const lineContent = model.getLineContent(currentMatch.startLineNumber);
                return `${lineContent}, ${ariaLabel}`;
            }
            return ariaLabel;
        }
        return nls.localize('ariaSearchNoResultWithLineNumNoCurrentMatch', "{0} found for '{1}'", label, searchString);
    }
    /**
     * If 'selection find' is ON we should not disable the button (its function is to cancel 'selection find').
     * If 'selection find' is OFF we enable the button only if there is a selection.
     */
    _updateToggleSelectionFindButton() {
        const selection = this._codeEditor.getSelection();
        const isSelection = selection
            ? selection.startLineNumber !== selection.endLineNumber ||
                selection.startColumn !== selection.endColumn
            : false;
        const isChecked = this._toggleSelectionFind.checked;
        if (this._isVisible && (isChecked || isSelection)) {
            this._toggleSelectionFind.enable();
        }
        else {
            this._toggleSelectionFind.disable();
        }
    }
    _updateButtons() {
        this._findInput.setEnabled(this._isVisible);
        this._replaceInput.setEnabled(this._isVisible && this._isReplaceVisible);
        this._updateToggleSelectionFindButton();
        this._closeBtn.setEnabled(this._isVisible);
        const findInputIsNonEmpty = this._state.searchString.length > 0;
        const matchesCount = this._state.matchesCount ? true : false;
        this._prevBtn.setEnabled(this._isVisible && findInputIsNonEmpty && matchesCount && this._state.canNavigateBack());
        this._nextBtn.setEnabled(this._isVisible && findInputIsNonEmpty && matchesCount && this._state.canNavigateForward());
        this._replaceBtn.setEnabled(this._isVisible && this._isReplaceVisible && findInputIsNonEmpty);
        this._replaceAllBtn.setEnabled(this._isVisible && this._isReplaceVisible && findInputIsNonEmpty);
        this._domNode.classList.toggle('replaceToggled', this._isReplaceVisible);
        this._toggleReplaceBtn.setExpanded(this._isReplaceVisible);
        const canReplace = !this._codeEditor.getOption(96 /* EditorOption.readOnly */);
        this._toggleReplaceBtn.setEnabled(this._isVisible && canReplace);
    }
    _reveal() {
        this._revealTimeouts.forEach((e) => {
            clearTimeout(e);
        });
        this._revealTimeouts = [];
        if (!this._isVisible) {
            this._isVisible = true;
            const selection = this._codeEditor.getSelection();
            switch (this._codeEditor.getOption(43 /* EditorOption.find */).autoFindInSelection) {
                case 'always':
                    this._toggleSelectionFind.checked = true;
                    break;
                case 'never':
                    this._toggleSelectionFind.checked = false;
                    break;
                case 'multiline': {
                    const isSelectionMultipleLine = !!selection && selection.startLineNumber !== selection.endLineNumber;
                    this._toggleSelectionFind.checked = isSelectionMultipleLine;
                    break;
                }
                default:
                    break;
            }
            this._tryUpdateWidgetWidth();
            this._updateButtons();
            this._revealTimeouts.push(setTimeout(() => {
                this._domNode.classList.add('visible');
                this._domNode.setAttribute('aria-hidden', 'false');
            }, 0));
            // validate query again as it's being dismissed when we hide the find widget.
            this._revealTimeouts.push(setTimeout(() => {
                this._findInput.validate();
            }, 200));
            this._codeEditor.layoutOverlayWidget(this);
            let adjustEditorScrollTop = true;
            if (this._codeEditor.getOption(43 /* EditorOption.find */).seedSearchStringFromSelection &&
                selection) {
                const domNode = this._codeEditor.getDomNode();
                if (domNode) {
                    const editorCoords = dom.getDomNodePagePosition(domNode);
                    const startCoords = this._codeEditor.getScrolledVisiblePosition(selection.getStartPosition());
                    const startLeft = editorCoords.left + (startCoords ? startCoords.left : 0);
                    const startTop = startCoords ? startCoords.top : 0;
                    if (this._viewZone && startTop < this._viewZone.heightInPx) {
                        if (selection.endLineNumber > selection.startLineNumber) {
                            adjustEditorScrollTop = false;
                        }
                        const leftOfFindWidget = dom.getTopLeftOffset(this._domNode).left;
                        if (startLeft > leftOfFindWidget) {
                            adjustEditorScrollTop = false;
                        }
                        const endCoords = this._codeEditor.getScrolledVisiblePosition(selection.getEndPosition());
                        const endLeft = editorCoords.left + (endCoords ? endCoords.left : 0);
                        if (endLeft > leftOfFindWidget) {
                            adjustEditorScrollTop = false;
                        }
                    }
                }
            }
            this._showViewZone(adjustEditorScrollTop);
        }
    }
    _hide(focusTheEditor) {
        this._revealTimeouts.forEach((e) => {
            clearTimeout(e);
        });
        this._revealTimeouts = [];
        if (this._isVisible) {
            this._isVisible = false;
            this._updateButtons();
            this._domNode.classList.remove('visible');
            this._domNode.setAttribute('aria-hidden', 'true');
            this._findInput.clearMessage();
            if (focusTheEditor) {
                this._codeEditor.focus();
            }
            this._codeEditor.layoutOverlayWidget(this);
            this._removeViewZone();
        }
    }
    _layoutViewZone(targetScrollTop) {
        const addExtraSpaceOnTop = this._codeEditor.getOption(43 /* EditorOption.find */).addExtraSpaceOnTop;
        if (!addExtraSpaceOnTop) {
            this._removeViewZone();
            return;
        }
        if (!this._isVisible) {
            return;
        }
        const viewZone = this._viewZone;
        if (this._viewZoneId !== undefined || !viewZone) {
            return;
        }
        this._codeEditor.changeViewZones((accessor) => {
            viewZone.heightInPx = this._getHeight();
            this._viewZoneId = accessor.addZone(viewZone);
            // scroll top adjust to make sure the editor doesn't scroll when adding viewzone at the beginning.
            this._codeEditor.setScrollTop(targetScrollTop || this._codeEditor.getScrollTop() + viewZone.heightInPx);
        });
    }
    _showViewZone(adjustScroll = true) {
        if (!this._isVisible) {
            return;
        }
        const addExtraSpaceOnTop = this._codeEditor.getOption(43 /* EditorOption.find */).addExtraSpaceOnTop;
        if (!addExtraSpaceOnTop) {
            return;
        }
        if (this._viewZone === undefined) {
            this._viewZone = new FindWidgetViewZone(0);
        }
        const viewZone = this._viewZone;
        this._codeEditor.changeViewZones((accessor) => {
            if (this._viewZoneId !== undefined) {
                // the view zone already exists, we need to update the height
                const newHeight = this._getHeight();
                if (newHeight === viewZone.heightInPx) {
                    return;
                }
                const scrollAdjustment = newHeight - viewZone.heightInPx;
                viewZone.heightInPx = newHeight;
                accessor.layoutZone(this._viewZoneId);
                if (adjustScroll) {
                    this._codeEditor.setScrollTop(this._codeEditor.getScrollTop() + scrollAdjustment);
                }
                return;
            }
            else {
                let scrollAdjustment = this._getHeight();
                // if the editor has top padding, factor that into the zone height
                scrollAdjustment -= this._codeEditor.getOption(88 /* EditorOption.padding */).top;
                if (scrollAdjustment <= 0) {
                    return;
                }
                viewZone.heightInPx = scrollAdjustment;
                this._viewZoneId = accessor.addZone(viewZone);
                if (adjustScroll) {
                    this._codeEditor.setScrollTop(this._codeEditor.getScrollTop() + scrollAdjustment);
                }
            }
        });
    }
    _removeViewZone() {
        this._codeEditor.changeViewZones((accessor) => {
            if (this._viewZoneId !== undefined) {
                accessor.removeZone(this._viewZoneId);
                this._viewZoneId = undefined;
                if (this._viewZone) {
                    this._codeEditor.setScrollTop(this._codeEditor.getScrollTop() - this._viewZone.heightInPx);
                    this._viewZone = undefined;
                }
            }
        });
    }
    _tryUpdateWidgetWidth() {
        if (!this._isVisible) {
            return;
        }
        if (!this._domNode.isConnected) {
            // the widget is not in the DOM
            return;
        }
        const layoutInfo = this._codeEditor.getLayoutInfo();
        const editorContentWidth = layoutInfo.contentWidth;
        if (editorContentWidth <= 0) {
            // for example, diff view original editor
            this._domNode.classList.add('hiddenEditor');
            return;
        }
        else if (this._domNode.classList.contains('hiddenEditor')) {
            this._domNode.classList.remove('hiddenEditor');
        }
        const editorWidth = layoutInfo.width;
        const minimapWidth = layoutInfo.minimap.minimapWidth;
        let collapsedFindWidget = false;
        let reducedFindWidget = false;
        let narrowFindWidget = false;
        if (this._resized) {
            const widgetWidth = dom.getTotalWidth(this._domNode);
            if (widgetWidth > FIND_WIDGET_INITIAL_WIDTH) {
                // as the widget is resized by users, we may need to change the max width of the widget as the editor width changes.
                this._domNode.style.maxWidth = `${editorWidth - 28 - minimapWidth - 15}px`;
                this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
                return;
            }
        }
        if (FIND_WIDGET_INITIAL_WIDTH + 28 + minimapWidth >= editorWidth) {
            reducedFindWidget = true;
        }
        if (FIND_WIDGET_INITIAL_WIDTH + 28 + minimapWidth - MAX_MATCHES_COUNT_WIDTH >= editorWidth) {
            narrowFindWidget = true;
        }
        if (FIND_WIDGET_INITIAL_WIDTH + 28 + minimapWidth - MAX_MATCHES_COUNT_WIDTH >=
            editorWidth + 50) {
            collapsedFindWidget = true;
        }
        this._domNode.classList.toggle('collapsed-find-widget', collapsedFindWidget);
        this._domNode.classList.toggle('narrow-find-widget', narrowFindWidget);
        this._domNode.classList.toggle('reduced-find-widget', reducedFindWidget);
        if (!narrowFindWidget && !collapsedFindWidget) {
            // the minimal left offset of findwidget is 15px.
            this._domNode.style.maxWidth = `${editorWidth - 28 - minimapWidth - 15}px`;
        }
        this._findInput.layout({ collapsedFindWidget, narrowFindWidget, reducedFindWidget });
        if (this._resized) {
            const findInputWidth = this._findInput.inputBox.element.clientWidth;
            if (findInputWidth > 0) {
                this._replaceInput.width = findInputWidth;
            }
        }
        else if (this._isReplaceVisible) {
            this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
        }
    }
    _getHeight() {
        let totalheight = 0;
        // find input margin top
        totalheight += 4;
        // find input height
        totalheight += this._findInput.inputBox.height + 2; /** input box border */
        if (this._isReplaceVisible) {
            // replace input margin
            totalheight += 4;
            totalheight += this._replaceInput.inputBox.height + 2; /** input box border */
        }
        // margin bottom
        totalheight += 4;
        return totalheight;
    }
    _tryUpdateHeight() {
        const totalHeight = this._getHeight();
        if (this._cachedHeight !== null && this._cachedHeight === totalHeight) {
            return false;
        }
        this._cachedHeight = totalHeight;
        this._domNode.style.height = `${totalHeight}px`;
        return true;
    }
    // ----- Public
    focusFindInput() {
        this._findInput.select();
        // Edge browser requires focus() in addition to select()
        this._findInput.focus();
    }
    focusReplaceInput() {
        this._replaceInput.select();
        // Edge browser requires focus() in addition to select()
        this._replaceInput.focus();
    }
    highlightFindOptions() {
        this._findInput.highlightFindOptions();
    }
    _updateSearchScope() {
        if (!this._codeEditor.hasModel()) {
            return;
        }
        if (this._toggleSelectionFind.checked) {
            const selections = this._codeEditor.getSelections();
            selections
                .map((selection) => {
                if (selection.endColumn === 1 && selection.endLineNumber > selection.startLineNumber) {
                    selection = selection.setEndPosition(selection.endLineNumber - 1, this._codeEditor.getModel().getLineMaxColumn(selection.endLineNumber - 1));
                }
                const currentMatch = this._state.currentMatch;
                if (selection.startLineNumber !== selection.endLineNumber) {
                    if (!Range.equalsRange(selection, currentMatch)) {
                        return selection;
                    }
                }
                return null;
            })
                .filter((element) => !!element);
            if (selections.length) {
                this._state.change({ searchScope: selections }, true);
            }
        }
    }
    _onFindInputMouseDown(e) {
        // on linux, middle key does pasting.
        if (e.middleButton) {
            e.stopPropagation();
        }
    }
    _onFindInputKeyDown(e) {
        if (e.equals(ctrlKeyMod | 3 /* KeyCode.Enter */)) {
            if (this._keybindingService.dispatchEvent(e, e.target)) {
                e.preventDefault();
                return;
            }
            else {
                this._findInput.inputBox.insertAtCursor('\n');
                e.preventDefault();
                return;
            }
        }
        if (e.equals(2 /* KeyCode.Tab */)) {
            if (this._isReplaceVisible) {
                this._replaceInput.focus();
            }
            else {
                this._findInput.focusOnCaseSensitive();
            }
            e.preventDefault();
            return;
        }
        if (e.equals(2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */)) {
            this._codeEditor.focus();
            e.preventDefault();
            return;
        }
        if (e.equals(16 /* KeyCode.UpArrow */)) {
            return stopPropagationForMultiLineUpwards(e, this._findInput.getValue(), this._findInput.domNode.querySelector('textarea'));
        }
        if (e.equals(18 /* KeyCode.DownArrow */)) {
            return stopPropagationForMultiLineDownwards(e, this._findInput.getValue(), this._findInput.domNode.querySelector('textarea'));
        }
    }
    _onReplaceInputKeyDown(e) {
        if (e.equals(ctrlKeyMod | 3 /* KeyCode.Enter */)) {
            if (this._keybindingService.dispatchEvent(e, e.target)) {
                e.preventDefault();
                return;
            }
            else {
                if (platform.isWindows && platform.isNative && !this._ctrlEnterReplaceAllWarningPrompted) {
                    // this is the first time when users press Ctrl + Enter to replace all
                    this._notificationService.info(nls.localize('ctrlEnter.keybindingChanged', 'Ctrl+Enter now inserts line break instead of replacing all. You can modify the keybinding for editor.action.replaceAll to override this behavior.'));
                    this._ctrlEnterReplaceAllWarningPrompted = true;
                    this._storageService.store(ctrlEnterReplaceAllWarningPromptedKey, true, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
                }
                this._replaceInput.inputBox.insertAtCursor('\n');
                e.preventDefault();
                return;
            }
        }
        if (e.equals(2 /* KeyCode.Tab */)) {
            this._findInput.focusOnCaseSensitive();
            e.preventDefault();
            return;
        }
        if (e.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */)) {
            this._findInput.focus();
            e.preventDefault();
            return;
        }
        if (e.equals(2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */)) {
            this._codeEditor.focus();
            e.preventDefault();
            return;
        }
        if (e.equals(16 /* KeyCode.UpArrow */)) {
            return stopPropagationForMultiLineUpwards(e, this._replaceInput.inputBox.value, this._replaceInput.inputBox.element.querySelector('textarea'));
        }
        if (e.equals(18 /* KeyCode.DownArrow */)) {
            return stopPropagationForMultiLineDownwards(e, this._replaceInput.inputBox.value, this._replaceInput.inputBox.element.querySelector('textarea'));
        }
    }
    // ----- sash
    getVerticalSashLeft(_sash) {
        return 0;
    }
    // ----- initialization
    _keybindingLabelFor(actionId) {
        const kb = this._keybindingService.lookupKeybinding(actionId);
        if (!kb) {
            return '';
        }
        return ` (${kb.getLabel()})`;
    }
    _buildDomNode() {
        const flexibleHeight = true;
        const flexibleWidth = true;
        // Find input
        const findSearchHistoryConfig = this._codeEditor.getOption(43 /* EditorOption.find */).history;
        const replaceHistoryConfig = this._codeEditor.getOption(43 /* EditorOption.find */).replaceHistory;
        this._findInput = this._register(new ContextScopedFindInput(null, this._contextViewProvider, {
            width: FIND_INPUT_AREA_WIDTH,
            label: NLS_FIND_INPUT_LABEL,
            placeholder: NLS_FIND_INPUT_PLACEHOLDER,
            appendCaseSensitiveLabel: this._keybindingLabelFor(FIND_IDS.ToggleCaseSensitiveCommand),
            appendWholeWordsLabel: this._keybindingLabelFor(FIND_IDS.ToggleWholeWordCommand),
            appendRegexLabel: this._keybindingLabelFor(FIND_IDS.ToggleRegexCommand),
            validation: (value) => {
                if (value.length === 0 || !this._findInput.getRegex()) {
                    return null;
                }
                try {
                    // use `g` and `u` which are also used by the TextModel search
                    new RegExp(value, 'gu');
                    return null;
                }
                catch (e) {
                    return { content: e.message };
                }
            },
            flexibleHeight,
            flexibleWidth,
            flexibleMaxHeight: 118,
            showCommonFindToggles: true,
            showHistoryHint: () => showHistoryKeybindingHint(this._keybindingService),
            inputBoxStyles: defaultInputBoxStyles,
            toggleStyles: defaultToggleStyles,
            history: findSearchHistoryConfig === 'workspace' ? this._findWidgetSearchHistory : new Set([]),
        }, this._contextKeyService));
        this._findInput.setRegex(!!this._state.isRegex);
        this._findInput.setCaseSensitive(!!this._state.matchCase);
        this._findInput.setWholeWords(!!this._state.wholeWord);
        this._register(this._findInput.onKeyDown((e) => this._onFindInputKeyDown(e)));
        this._register(this._findInput.inputBox.onDidChange(() => {
            if (this._ignoreChangeEvent) {
                return;
            }
            this._state.change({ searchString: this._findInput.getValue() }, true);
        }));
        this._register(this._findInput.onDidOptionChange(() => {
            this._state.change({
                isRegex: this._findInput.getRegex(),
                wholeWord: this._findInput.getWholeWords(),
                matchCase: this._findInput.getCaseSensitive(),
            }, true);
        }));
        this._register(this._findInput.onCaseSensitiveKeyDown((e) => {
            if (e.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */)) {
                if (this._isReplaceVisible) {
                    this._replaceInput.focus();
                    e.preventDefault();
                }
            }
        }));
        this._register(this._findInput.onRegexKeyDown((e) => {
            if (e.equals(2 /* KeyCode.Tab */)) {
                if (this._isReplaceVisible) {
                    this._replaceInput.focusOnPreserve();
                    e.preventDefault();
                }
            }
        }));
        this._register(this._findInput.inputBox.onDidHeightChange((e) => {
            if (this._tryUpdateHeight()) {
                this._showViewZone();
            }
        }));
        if (platform.isLinux) {
            this._register(this._findInput.onMouseDown((e) => this._onFindInputMouseDown(e)));
        }
        this._matchesCount = document.createElement('div');
        this._matchesCount.className = 'matchesCount';
        this._updateMatchesCount();
        // Create a scoped hover delegate for all find related buttons
        const hoverDelegate = this._register(createInstantHoverDelegate());
        // Previous button
        this._prevBtn = this._register(new SimpleButton({
            label: NLS_PREVIOUS_MATCH_BTN_LABEL +
                this._keybindingLabelFor(FIND_IDS.PreviousMatchFindAction),
            icon: findPreviousMatchIcon,
            hoverDelegate,
            onTrigger: () => {
                assertIsDefined(this._codeEditor.getAction(FIND_IDS.PreviousMatchFindAction))
                    .run()
                    .then(undefined, onUnexpectedError);
            },
        }, this._hoverService));
        // Next button
        this._nextBtn = this._register(new SimpleButton({
            label: NLS_NEXT_MATCH_BTN_LABEL + this._keybindingLabelFor(FIND_IDS.NextMatchFindAction),
            icon: findNextMatchIcon,
            hoverDelegate,
            onTrigger: () => {
                assertIsDefined(this._codeEditor.getAction(FIND_IDS.NextMatchFindAction))
                    .run()
                    .then(undefined, onUnexpectedError);
            },
        }, this._hoverService));
        const findPart = document.createElement('div');
        findPart.className = 'find-part';
        findPart.appendChild(this._findInput.domNode);
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'find-actions';
        findPart.appendChild(actionsContainer);
        actionsContainer.appendChild(this._matchesCount);
        actionsContainer.appendChild(this._prevBtn.domNode);
        actionsContainer.appendChild(this._nextBtn.domNode);
        // Toggle selection button
        this._toggleSelectionFind = this._register(new Toggle({
            icon: findSelectionIcon,
            title: NLS_TOGGLE_SELECTION_FIND_TITLE +
                this._keybindingLabelFor(FIND_IDS.ToggleSearchScopeCommand),
            isChecked: false,
            hoverDelegate: hoverDelegate,
            inputActiveOptionBackground: asCssVariable(inputActiveOptionBackground),
            inputActiveOptionBorder: asCssVariable(inputActiveOptionBorder),
            inputActiveOptionForeground: asCssVariable(inputActiveOptionForeground),
        }));
        this._register(this._toggleSelectionFind.onChange(() => {
            if (this._toggleSelectionFind.checked) {
                if (this._codeEditor.hasModel()) {
                    let selections = this._codeEditor.getSelections();
                    selections = selections
                        .map((selection) => {
                        if (selection.endColumn === 1 &&
                            selection.endLineNumber > selection.startLineNumber) {
                            selection = selection.setEndPosition(selection.endLineNumber - 1, this._codeEditor.getModel().getLineMaxColumn(selection.endLineNumber - 1));
                        }
                        if (!selection.isEmpty()) {
                            return selection;
                        }
                        return null;
                    })
                        .filter((element) => !!element);
                    if (selections.length) {
                        this._state.change({ searchScope: selections }, true);
                    }
                }
            }
            else {
                this._state.change({ searchScope: null }, true);
            }
        }));
        actionsContainer.appendChild(this._toggleSelectionFind.domNode);
        // Close button
        this._closeBtn = this._register(new SimpleButton({
            label: NLS_CLOSE_BTN_LABEL + this._keybindingLabelFor(FIND_IDS.CloseFindWidgetCommand),
            icon: widgetClose,
            hoverDelegate,
            onTrigger: () => {
                this._state.change({ isRevealed: false, searchScope: null }, false);
            },
            onKeyDown: (e) => {
                if (e.equals(2 /* KeyCode.Tab */)) {
                    if (this._isReplaceVisible) {
                        if (this._replaceBtn.isEnabled()) {
                            this._replaceBtn.focus();
                        }
                        else {
                            this._codeEditor.focus();
                        }
                        e.preventDefault();
                    }
                }
            },
        }, this._hoverService));
        // Replace input
        this._replaceInput = this._register(new ContextScopedReplaceInput(null, undefined, {
            label: NLS_REPLACE_INPUT_LABEL,
            placeholder: NLS_REPLACE_INPUT_PLACEHOLDER,
            appendPreserveCaseLabel: this._keybindingLabelFor(FIND_IDS.TogglePreserveCaseCommand),
            history: replaceHistoryConfig === 'workspace' ? this._replaceWidgetHistory : new Set([]),
            flexibleHeight,
            flexibleWidth,
            flexibleMaxHeight: 118,
            showHistoryHint: () => showHistoryKeybindingHint(this._keybindingService),
            inputBoxStyles: defaultInputBoxStyles,
            toggleStyles: defaultToggleStyles,
        }, this._contextKeyService, true));
        this._replaceInput.setPreserveCase(!!this._state.preserveCase);
        this._register(this._replaceInput.onKeyDown((e) => this._onReplaceInputKeyDown(e)));
        this._register(this._replaceInput.inputBox.onDidChange(() => {
            this._state.change({ replaceString: this._replaceInput.inputBox.value }, false);
        }));
        this._register(this._replaceInput.inputBox.onDidHeightChange((e) => {
            if (this._isReplaceVisible && this._tryUpdateHeight()) {
                this._showViewZone();
            }
        }));
        this._register(this._replaceInput.onDidOptionChange(() => {
            this._state.change({
                preserveCase: this._replaceInput.getPreserveCase(),
            }, true);
        }));
        this._register(this._replaceInput.onPreserveCaseKeyDown((e) => {
            if (e.equals(2 /* KeyCode.Tab */)) {
                if (this._prevBtn.isEnabled()) {
                    this._prevBtn.focus();
                }
                else if (this._nextBtn.isEnabled()) {
                    this._nextBtn.focus();
                }
                else if (this._toggleSelectionFind.enabled) {
                    this._toggleSelectionFind.focus();
                }
                else if (this._closeBtn.isEnabled()) {
                    this._closeBtn.focus();
                }
                e.preventDefault();
            }
        }));
        // Create scoped hover delegate for replace actions
        const replaceHoverDelegate = this._register(createInstantHoverDelegate());
        // Replace one button
        this._replaceBtn = this._register(new SimpleButton({
            label: NLS_REPLACE_BTN_LABEL + this._keybindingLabelFor(FIND_IDS.ReplaceOneAction),
            icon: findReplaceIcon,
            hoverDelegate: replaceHoverDelegate,
            onTrigger: () => {
                this._controller.replace();
            },
            onKeyDown: (e) => {
                if (e.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */)) {
                    this._closeBtn.focus();
                    e.preventDefault();
                }
            },
        }, this._hoverService));
        // Replace all button
        this._replaceAllBtn = this._register(new SimpleButton({
            label: NLS_REPLACE_ALL_BTN_LABEL + this._keybindingLabelFor(FIND_IDS.ReplaceAllAction),
            icon: findReplaceAllIcon,
            hoverDelegate: replaceHoverDelegate,
            onTrigger: () => {
                this._controller.replaceAll();
            },
        }, this._hoverService));
        const replacePart = document.createElement('div');
        replacePart.className = 'replace-part';
        replacePart.appendChild(this._replaceInput.domNode);
        const replaceActionsContainer = document.createElement('div');
        replaceActionsContainer.className = 'replace-actions';
        replacePart.appendChild(replaceActionsContainer);
        replaceActionsContainer.appendChild(this._replaceBtn.domNode);
        replaceActionsContainer.appendChild(this._replaceAllBtn.domNode);
        // Toggle replace button
        this._toggleReplaceBtn = this._register(new SimpleButton({
            label: NLS_TOGGLE_REPLACE_MODE_BTN_LABEL,
            className: 'codicon toggle left',
            onTrigger: () => {
                this._state.change({ isReplaceRevealed: !this._isReplaceVisible }, false);
                if (this._isReplaceVisible) {
                    this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
                    this._replaceInput.inputBox.layout();
                }
                this._showViewZone();
            },
        }, this._hoverService));
        this._toggleReplaceBtn.setExpanded(this._isReplaceVisible);
        // Widget
        this._domNode = document.createElement('div');
        this._domNode.className = 'editor-widget find-widget';
        this._domNode.setAttribute('aria-hidden', 'true');
        this._domNode.ariaLabel = NLS_FIND_DIALOG_LABEL;
        this._domNode.role = 'dialog';
        // We need to set this explicitly, otherwise on IE11, the width inheritence of flex doesn't work.
        this._domNode.style.width = `${FIND_WIDGET_INITIAL_WIDTH}px`;
        this._domNode.appendChild(this._toggleReplaceBtn.domNode);
        this._domNode.appendChild(findPart);
        this._domNode.appendChild(this._closeBtn.domNode);
        this._domNode.appendChild(replacePart);
        this._resizeSash = this._register(new Sash(this._domNode, this, { orientation: 0 /* Orientation.VERTICAL */, size: 2 }));
        this._resized = false;
        let originalWidth = FIND_WIDGET_INITIAL_WIDTH;
        this._register(this._resizeSash.onDidStart(() => {
            originalWidth = dom.getTotalWidth(this._domNode);
        }));
        this._register(this._resizeSash.onDidChange((evt) => {
            this._resized = true;
            const width = originalWidth + evt.startX - evt.currentX;
            if (width < FIND_WIDGET_INITIAL_WIDTH) {
                // narrow down the find widget should be handled by CSS.
                return;
            }
            const maxWidth = parseFloat(dom.getComputedStyle(this._domNode).maxWidth) || 0;
            if (width > maxWidth) {
                return;
            }
            this._domNode.style.width = `${width}px`;
            if (this._isReplaceVisible) {
                this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
            }
            this._findInput.inputBox.layout();
            this._tryUpdateHeight();
        }));
        this._register(this._resizeSash.onDidReset(() => {
            // users double click on the sash
            const currentWidth = dom.getTotalWidth(this._domNode);
            if (currentWidth < FIND_WIDGET_INITIAL_WIDTH) {
                // The editor is narrow and the width of the find widget is controlled fully by CSS.
                return;
            }
            let width = FIND_WIDGET_INITIAL_WIDTH;
            if (!this._resized || currentWidth === FIND_WIDGET_INITIAL_WIDTH) {
                // 1. never resized before, double click should maximizes it
                // 2. users resized it already but its width is the same as default
                const layoutInfo = this._codeEditor.getLayoutInfo();
                width = layoutInfo.width - 28 - layoutInfo.minimap.minimapWidth - 15;
                this._resized = true;
            }
            else {
                /**
                 * no op, the find widget should be shrinked to its default size.
                 */
            }
            this._domNode.style.width = `${width}px`;
            if (this._isReplaceVisible) {
                this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
            }
            this._findInput.inputBox.layout();
        }));
    }
    updateAccessibilitySupport() {
        const value = this._codeEditor.getOption(2 /* EditorOption.accessibilitySupport */);
        this._findInput.setFocusInputOnOptionClick(value !== 2 /* AccessibilitySupport.Enabled */);
    }
    getViewState() {
        let widgetViewZoneVisible = false;
        if (this._viewZone && this._viewZoneId) {
            widgetViewZoneVisible = this._viewZone.heightInPx > this._codeEditor.getScrollTop();
        }
        return {
            widgetViewZoneVisible,
            scrollTop: this._codeEditor.getScrollTop(),
        };
    }
    setViewState(state) {
        if (!state) {
            return;
        }
        if (state.widgetViewZoneVisible) {
            // we should add the view zone
            this._layoutViewZone(state.scrollTop);
        }
    }
}
export class SimpleButton extends Widget {
    constructor(opts, hoverService) {
        super();
        this._opts = opts;
        let className = 'button';
        if (this._opts.className) {
            className = className + ' ' + this._opts.className;
        }
        if (this._opts.icon) {
            className = className + ' ' + ThemeIcon.asClassName(this._opts.icon);
        }
        this._domNode = document.createElement('div');
        this._domNode.tabIndex = 0;
        this._domNode.className = className;
        this._domNode.setAttribute('role', 'button');
        this._domNode.setAttribute('aria-label', this._opts.label);
        this._register(hoverService.setupManagedHover(opts.hoverDelegate ?? getDefaultHoverDelegate('element'), this._domNode, this._opts.label));
        this.onclick(this._domNode, (e) => {
            this._opts.onTrigger();
            e.preventDefault();
        });
        this.onkeydown(this._domNode, (e) => {
            if (e.equals(10 /* KeyCode.Space */) || e.equals(3 /* KeyCode.Enter */)) {
                this._opts.onTrigger();
                e.preventDefault();
                return;
            }
            this._opts.onKeyDown?.(e);
        });
    }
    get domNode() {
        return this._domNode;
    }
    isEnabled() {
        return this._domNode.tabIndex >= 0;
    }
    focus() {
        this._domNode.focus();
    }
    setEnabled(enabled) {
        this._domNode.classList.toggle('disabled', !enabled);
        this._domNode.setAttribute('aria-disabled', String(!enabled));
        this._domNode.tabIndex = enabled ? 0 : -1;
    }
    setExpanded(expanded) {
        this._domNode.setAttribute('aria-expanded', String(!!expanded));
        if (expanded) {
            this._domNode.classList.remove(...ThemeIcon.asClassNameArray(findCollapsedIcon));
            this._domNode.classList.add(...ThemeIcon.asClassNameArray(findExpandedIcon));
        }
        else {
            this._domNode.classList.remove(...ThemeIcon.asClassNameArray(findExpandedIcon));
            this._domNode.classList.add(...ThemeIcon.asClassNameArray(findCollapsedIcon));
        }
    }
}
// theming
registerThemingParticipant((theme, collector) => {
    const findMatchHighlightBorder = theme.getColor(editorFindMatchHighlightBorder);
    if (findMatchHighlightBorder) {
        collector.addRule(`.monaco-editor .findMatch { border: 1px ${isHighContrast(theme.type) ? 'dotted' : 'solid'} ${findMatchHighlightBorder}; box-sizing: border-box; }`);
    }
    const findRangeHighlightBorder = theme.getColor(editorFindRangeHighlightBorder);
    if (findRangeHighlightBorder) {
        collector.addRule(`.monaco-editor .findScope { border: 1px ${isHighContrast(theme.type) ? 'dashed' : 'solid'} ${findRangeHighlightBorder}; }`);
    }
    const hcBorder = theme.getColor(contrastBorder);
    if (hcBorder) {
        collector.addRule(`.monaco-editor .find-widget { border: 1px solid ${hcBorder}; }`);
    }
    const findMatchForeground = theme.getColor(editorFindMatchForeground);
    if (findMatchForeground) {
        collector.addRule(`.monaco-editor .findMatchInline { color: ${findMatchForeground}; }`);
    }
    const findMatchHighlightForeground = theme.getColor(editorFindMatchHighlightForeground);
    if (findMatchHighlightForeground) {
        collector.addRule(`.monaco-editor .currentFindMatchInline { color: ${findMatchHighlightForeground}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2ZpbmQvYnJvd3Nlci9maW5kV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFHdEQsT0FBTyxFQUFFLEtBQUssSUFBSSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFLckUsT0FBTyxFQUlOLElBQUksR0FDSixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXJFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNuRSxPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxrQkFBa0IsQ0FBQTtBQVN6QixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUNOLDBCQUEwQixFQUMxQiw2QkFBNkIsRUFDN0IsUUFBUSxFQUNSLGFBQWEsR0FDYixNQUFNLGdCQUFnQixDQUFBO0FBRXZCLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFFekMsT0FBTyxFQUNOLHNCQUFzQixFQUN0Qix5QkFBeUIsR0FDekIsTUFBTSxvRUFBb0Us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