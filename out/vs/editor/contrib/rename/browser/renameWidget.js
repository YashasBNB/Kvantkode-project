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
import * as dom from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { getBaseLayerHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegate2.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { List } from '../../../../base/browser/ui/list/listWidget.js';
import * as arrays from '../../../../base/common/arrays.js';
import { DeferredPromise, raceCancellation } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { assertType, isDefined } from '../../../../base/common/types.js';
import './renameWidget.css';
import * as domFontInfo from '../../../browser/config/domFontInfo.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { NewSymbolNameTag, NewSymbolNameTriggerKind, } from '../../../common/languages.js';
import * as nls from '../../../../nls.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { getListStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { editorWidgetBackground, inputBackground, inputBorder, inputForeground, quickInputListFocusBackground, quickInputListFocusForeground, widgetBorder, widgetShadow, } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
/** for debugging */
const _sticky = false;
// || Boolean("true") // done "weirdly" so that a lint warning prevents you from pushing this
export const CONTEXT_RENAME_INPUT_VISIBLE = new RawContextKey('renameInputVisible', false, nls.localize('renameInputVisible', 'Whether the rename input widget is visible'));
export const CONTEXT_RENAME_INPUT_FOCUSED = new RawContextKey('renameInputFocused', false, nls.localize('renameInputFocused', 'Whether the rename input widget is focused'));
let RenameWidget = class RenameWidget {
    constructor(_editor, _acceptKeybindings, _themeService, _keybindingService, contextKeyService, _logService) {
        this._editor = _editor;
        this._acceptKeybindings = _acceptKeybindings;
        this._themeService = _themeService;
        this._keybindingService = _keybindingService;
        this._logService = _logService;
        // implement IContentWidget
        this.allowEditorOverflow = true;
        this._disposables = new DisposableStore();
        this._visibleContextKey = CONTEXT_RENAME_INPUT_VISIBLE.bindTo(contextKeyService);
        this._isEditingRenameCandidate = false;
        this._nRenameSuggestionsInvocations = 0;
        this._hadAutomaticRenameSuggestionsInvocation = false;
        this._candidates = new Set();
        this._beforeFirstInputFieldEditSW = new StopWatch();
        this._inputWithButton = new InputWithButton();
        this._disposables.add(this._inputWithButton);
        this._editor.addContentWidget(this);
        this._disposables.add(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(52 /* EditorOption.fontInfo */)) {
                this._updateFont();
            }
        }));
        this._disposables.add(_themeService.onDidColorThemeChange(this._updateStyles, this));
    }
    dispose() {
        this._disposables.dispose();
        this._editor.removeContentWidget(this);
    }
    getId() {
        return '__renameInputWidget';
    }
    getDomNode() {
        if (!this._domNode) {
            this._domNode = document.createElement('div');
            this._domNode.className = 'monaco-editor rename-box';
            this._domNode.appendChild(this._inputWithButton.domNode);
            this._renameCandidateListView = this._disposables.add(new RenameCandidateListView(this._domNode, {
                fontInfo: this._editor.getOption(52 /* EditorOption.fontInfo */),
                onFocusChange: (newSymbolName) => {
                    this._inputWithButton.input.value = newSymbolName;
                    this._isEditingRenameCandidate = false; // @ulugbekna: reset
                },
                onSelectionChange: () => {
                    this._isEditingRenameCandidate = false; // @ulugbekna: because user picked a rename suggestion
                    this.acceptInput(false); // we don't allow preview with mouse click for now
                },
            }));
            this._disposables.add(this._inputWithButton.onDidInputChange(() => {
                if (this._renameCandidateListView?.focusedCandidate !== undefined) {
                    this._isEditingRenameCandidate = true;
                }
                this._timeBeforeFirstInputFieldEdit ??= this._beforeFirstInputFieldEditSW.elapsed();
                if (this._renameCandidateProvidersCts?.token.isCancellationRequested === false) {
                    this._renameCandidateProvidersCts.cancel();
                }
                this._renameCandidateListView?.clearFocus();
            }));
            this._label = document.createElement('div');
            this._label.className = 'rename-label';
            this._domNode.appendChild(this._label);
            this._updateFont();
            this._updateStyles(this._themeService.getColorTheme());
        }
        return this._domNode;
    }
    _updateStyles(theme) {
        if (!this._domNode) {
            return;
        }
        const widgetShadowColor = theme.getColor(widgetShadow);
        const widgetBorderColor = theme.getColor(widgetBorder);
        this._domNode.style.backgroundColor = String(theme.getColor(editorWidgetBackground) ?? '');
        this._domNode.style.boxShadow = widgetShadowColor ? ` 0 0 8px 2px ${widgetShadowColor}` : '';
        this._domNode.style.border = widgetBorderColor ? `1px solid ${widgetBorderColor}` : '';
        this._domNode.style.color = String(theme.getColor(inputForeground) ?? '');
        const border = theme.getColor(inputBorder);
        this._inputWithButton.domNode.style.backgroundColor = String(theme.getColor(inputBackground) ?? '');
        this._inputWithButton.input.style.backgroundColor = String(theme.getColor(inputBackground) ?? '');
        this._inputWithButton.domNode.style.borderWidth = border ? '1px' : '0px';
        this._inputWithButton.domNode.style.borderStyle = border ? 'solid' : 'none';
        this._inputWithButton.domNode.style.borderColor = border?.toString() ?? 'none';
    }
    _updateFont() {
        if (this._domNode === undefined) {
            return;
        }
        assertType(this._label !== undefined, 'RenameWidget#_updateFont: _label must not be undefined given _domNode is defined');
        this._editor.applyFontInfo(this._inputWithButton.input);
        const fontInfo = this._editor.getOption(52 /* EditorOption.fontInfo */);
        this._label.style.fontSize = `${this._computeLabelFontSize(fontInfo.fontSize)}px`;
    }
    _computeLabelFontSize(editorFontSize) {
        return editorFontSize * 0.8;
    }
    getPosition() {
        if (!this._visible) {
            return null;
        }
        if (!this._editor.hasModel() || // @ulugbekna: shouldn't happen
            !this._editor.getDomNode() // @ulugbekna: can happen during tests based on suggestWidget's similar predicate check
        ) {
            return null;
        }
        const bodyBox = dom.getClientArea(this.getDomNode().ownerDocument.body);
        const editorBox = dom.getDomNodePagePosition(this._editor.getDomNode());
        const cursorBoxTop = this._getTopForPosition();
        this._nPxAvailableAbove = cursorBoxTop + editorBox.top;
        this._nPxAvailableBelow = bodyBox.height - this._nPxAvailableAbove;
        const lineHeight = this._editor.getOption(68 /* EditorOption.lineHeight */);
        const { totalHeight: candidateViewHeight } = RenameCandidateView.getLayoutInfo({ lineHeight });
        const positionPreference = this._nPxAvailableBelow >
            candidateViewHeight *
                6 /* approximate # of candidates to fit in (inclusive of rename input box & rename label) */
            ? [2 /* ContentWidgetPositionPreference.BELOW */, 1 /* ContentWidgetPositionPreference.ABOVE */]
            : [1 /* ContentWidgetPositionPreference.ABOVE */, 2 /* ContentWidgetPositionPreference.BELOW */];
        return {
            position: this._position,
            preference: positionPreference,
        };
    }
    beforeRender() {
        const [accept, preview] = this._acceptKeybindings;
        this._label.innerText = nls.localize({
            key: 'label',
            comment: ['placeholders are keybindings, e.g "F2 to Rename, Shift+F2 to Preview"'],
        }, '{0} to Rename, {1} to Preview', this._keybindingService.lookupKeybinding(accept)?.getLabel(), this._keybindingService.lookupKeybinding(preview)?.getLabel());
        this._domNode.style.minWidth = `200px`; // to prevent from widening when candidates come in
        return null;
    }
    afterRender(position) {
        // FIXME@ulugbekna: commenting trace log out until we start unmounting the widget from editor properly - https://github.com/microsoft/vscode/issues/226975
        // this._trace('invoking afterRender, position: ', position ? 'not null' : 'null');
        if (position === null) {
            // cancel rename when input widget isn't rendered anymore
            this.cancelInput(true, 'afterRender (because position is null)');
            return;
        }
        if (!this._editor.hasModel() || // shouldn't happen
            !this._editor.getDomNode() // can happen during tests based on suggestWidget's similar predicate check
        ) {
            return;
        }
        assertType(this._renameCandidateListView);
        assertType(this._nPxAvailableAbove !== undefined);
        assertType(this._nPxAvailableBelow !== undefined);
        const inputBoxHeight = dom.getTotalHeight(this._inputWithButton.domNode);
        const labelHeight = dom.getTotalHeight(this._label);
        let totalHeightAvailable;
        if (position === 2 /* ContentWidgetPositionPreference.BELOW */) {
            totalHeightAvailable = this._nPxAvailableBelow;
        }
        else {
            totalHeightAvailable = this._nPxAvailableAbove;
        }
        this._renameCandidateListView.layout({
            height: totalHeightAvailable - labelHeight - inputBoxHeight,
            width: dom.getTotalWidth(this._inputWithButton.domNode),
        });
    }
    acceptInput(wantsPreview) {
        this._trace(`invoking acceptInput`);
        this._currentAcceptInput?.(wantsPreview);
    }
    cancelInput(focusEditor, caller) {
        // this._trace(`invoking cancelInput, caller: ${caller}, _currentCancelInput: ${this._currentAcceptInput ? 'not undefined' : 'undefined'}`);
        this._currentCancelInput?.(focusEditor);
    }
    focusNextRenameSuggestion() {
        if (!this._renameCandidateListView?.focusNext()) {
            this._inputWithButton.input.value = this._currentName;
        }
    }
    focusPreviousRenameSuggestion() {
        // TODO@ulugbekna: this and focusNext should set the original name if no candidate is focused
        if (!this._renameCandidateListView?.focusPrevious()) {
            this._inputWithButton.input.value = this._currentName;
        }
    }
    /**
     * @param requestRenameCandidates is `undefined` when there are no rename suggestion providers
     */
    getInput(where, currentName, supportPreview, requestRenameCandidates, cts) {
        const { start: selectionStart, end: selectionEnd } = this._getSelection(where, currentName);
        this._renameCts = cts;
        const disposeOnDone = new DisposableStore();
        this._nRenameSuggestionsInvocations = 0;
        this._hadAutomaticRenameSuggestionsInvocation = false;
        if (requestRenameCandidates === undefined) {
            this._inputWithButton.button.style.display = 'none';
        }
        else {
            this._inputWithButton.button.style.display = 'flex';
            this._requestRenameCandidatesOnce = requestRenameCandidates;
            this._requestRenameCandidates(currentName, false);
            disposeOnDone.add(dom.addDisposableListener(this._inputWithButton.button, 'click', () => this._requestRenameCandidates(currentName, true)));
            disposeOnDone.add(dom.addDisposableListener(this._inputWithButton.button, dom.EventType.KEY_DOWN, (e) => {
                const keyEvent = new StandardKeyboardEvent(e);
                if (keyEvent.equals(3 /* KeyCode.Enter */) || keyEvent.equals(10 /* KeyCode.Space */)) {
                    keyEvent.stopPropagation();
                    keyEvent.preventDefault();
                    this._requestRenameCandidates(currentName, true);
                }
            }));
        }
        this._isEditingRenameCandidate = false;
        this._domNode.classList.toggle('preview', supportPreview);
        this._position = new Position(where.startLineNumber, where.startColumn);
        this._currentName = currentName;
        this._inputWithButton.input.value = currentName;
        this._inputWithButton.input.setAttribute('selectionStart', selectionStart.toString());
        this._inputWithButton.input.setAttribute('selectionEnd', selectionEnd.toString());
        this._inputWithButton.input.size = Math.max((where.endColumn - where.startColumn) * 1.1, 20); // determines width
        this._beforeFirstInputFieldEditSW.reset();
        disposeOnDone.add(toDisposable(() => {
            this._renameCts = undefined;
            cts.dispose(true);
        })); // @ulugbekna: this may result in `this.cancelInput` being called twice, but it should be safe since we set it to undefined after 1st call
        disposeOnDone.add(toDisposable(() => {
            if (this._renameCandidateProvidersCts !== undefined) {
                this._renameCandidateProvidersCts.dispose(true);
                this._renameCandidateProvidersCts = undefined;
            }
        }));
        disposeOnDone.add(toDisposable(() => this._candidates.clear()));
        const inputResult = new DeferredPromise();
        inputResult.p.finally(() => {
            disposeOnDone.dispose();
            this._hide();
        });
        this._currentCancelInput = (focusEditor) => {
            this._trace('invoking _currentCancelInput');
            this._currentAcceptInput = undefined;
            this._currentCancelInput = undefined;
            // fixme session cleanup
            this._renameCandidateListView?.clearCandidates();
            inputResult.complete(focusEditor);
            return true;
        };
        this._currentAcceptInput = (wantsPreview) => {
            this._trace('invoking _currentAcceptInput');
            assertType(this._renameCandidateListView !== undefined);
            const nRenameSuggestions = this._renameCandidateListView.nCandidates;
            let newName;
            let source;
            const focusedCandidate = this._renameCandidateListView.focusedCandidate;
            if (focusedCandidate !== undefined) {
                this._trace('using new name from renameSuggestion');
                newName = focusedCandidate;
                source = { k: 'renameSuggestion' };
            }
            else {
                this._trace('using new name from inputField');
                newName = this._inputWithButton.input.value;
                source = this._isEditingRenameCandidate
                    ? { k: 'userEditedRenameSuggestion' }
                    : { k: 'inputField' };
            }
            if (newName === currentName || newName.trim().length === 0 /* is just whitespace */) {
                this.cancelInput(true, '_currentAcceptInput (because newName === value || newName.trim().length === 0)');
                return;
            }
            this._currentAcceptInput = undefined;
            this._currentCancelInput = undefined;
            this._renameCandidateListView.clearCandidates();
            // fixme session cleanup
            inputResult.complete({
                newName,
                wantsPreview: supportPreview && wantsPreview,
                stats: {
                    source,
                    nRenameSuggestions,
                    timeBeforeFirstInputFieldEdit: this._timeBeforeFirstInputFieldEdit,
                    nRenameSuggestionsInvocations: this._nRenameSuggestionsInvocations,
                    hadAutomaticRenameSuggestionsInvocation: this._hadAutomaticRenameSuggestionsInvocation,
                },
            });
        };
        disposeOnDone.add(cts.token.onCancellationRequested(() => this.cancelInput(true, 'cts.token.onCancellationRequested')));
        if (!_sticky) {
            disposeOnDone.add(this._editor.onDidBlurEditorWidget(() => this.cancelInput(!this._domNode?.ownerDocument.hasFocus(), 'editor.onDidBlurEditorWidget')));
        }
        this._show();
        return inputResult.p;
    }
    _requestRenameCandidates(currentName, isManuallyTriggered) {
        if (this._requestRenameCandidatesOnce === undefined) {
            return;
        }
        if (this._renameCandidateProvidersCts !== undefined) {
            this._renameCandidateProvidersCts.dispose(true);
        }
        assertType(this._renameCts);
        if (this._inputWithButton.buttonState !== 'stop') {
            this._renameCandidateProvidersCts = new CancellationTokenSource();
            const triggerKind = isManuallyTriggered
                ? NewSymbolNameTriggerKind.Invoke
                : NewSymbolNameTriggerKind.Automatic;
            const candidates = this._requestRenameCandidatesOnce(triggerKind, this._renameCandidateProvidersCts.token);
            if (candidates.length === 0) {
                this._inputWithButton.setSparkleButton();
                return;
            }
            if (!isManuallyTriggered) {
                this._hadAutomaticRenameSuggestionsInvocation = true;
            }
            this._nRenameSuggestionsInvocations += 1;
            this._inputWithButton.setStopButton();
            this._updateRenameCandidates(candidates, currentName, this._renameCts.token);
        }
    }
    /**
     * This allows selecting only part of the symbol name in the input field based on the selection in the editor
     */
    _getSelection(where, currentName) {
        assertType(this._editor.hasModel());
        const selection = this._editor.getSelection();
        let start = 0;
        let end = currentName.length;
        if (!Range.isEmpty(selection) &&
            !Range.spansMultipleLines(selection) &&
            Range.containsRange(where, selection)) {
            start = Math.max(0, selection.startColumn - where.startColumn);
            end = Math.min(where.endColumn, selection.endColumn) - where.startColumn;
        }
        return { start, end };
    }
    _show() {
        this._trace('invoking _show');
        this._editor.revealLineInCenterIfOutsideViewport(this._position.lineNumber, 0 /* ScrollType.Smooth */);
        this._visible = true;
        this._visibleContextKey.set(true);
        this._editor.layoutContentWidget(this);
        // TODO@ulugbekna: could this be simply run in `afterRender`?
        setTimeout(() => {
            this._inputWithButton.input.focus();
            this._inputWithButton.input.setSelectionRange(parseInt(this._inputWithButton.input.getAttribute('selectionStart')), parseInt(this._inputWithButton.input.getAttribute('selectionEnd')));
        }, 100);
    }
    async _updateRenameCandidates(candidates, currentName, token) {
        const trace = (...args) => this._trace('_updateRenameCandidates', ...args);
        trace('start');
        const namesListResults = await raceCancellation(Promise.allSettled(candidates), token);
        this._inputWithButton.setSparkleButton();
        if (namesListResults === undefined) {
            trace('returning early - received updateRenameCandidates results - undefined');
            return;
        }
        const newNames = namesListResults.flatMap((namesListResult) => namesListResult.status === 'fulfilled' && isDefined(namesListResult.value)
            ? namesListResult.value
            : []);
        trace(`received updateRenameCandidates results - total (unfiltered) ${newNames.length} candidates.`);
        // deduplicate and filter out the current value
        const distinctNames = arrays.distinct(newNames, (v) => v.newSymbolName);
        trace(`distinct candidates - ${distinctNames.length} candidates.`);
        const validDistinctNames = distinctNames.filter(({ newSymbolName }) => newSymbolName.trim().length > 0 &&
            newSymbolName !== this._inputWithButton.input.value &&
            newSymbolName !== currentName &&
            !this._candidates.has(newSymbolName));
        trace(`valid distinct candidates - ${newNames.length} candidates.`);
        validDistinctNames.forEach((n) => this._candidates.add(n.newSymbolName));
        if (validDistinctNames.length < 1) {
            trace('returning early - no valid distinct candidates');
            return;
        }
        // show the candidates
        trace('setting candidates');
        this._renameCandidateListView.setCandidates(validDistinctNames);
        // ask editor to re-layout given that the widget is now of a different size after rendering rename candidates
        trace('asking editor to re-layout');
        this._editor.layoutContentWidget(this);
    }
    _hide() {
        this._trace('invoked _hide');
        this._visible = false;
        this._visibleContextKey.reset();
        this._editor.layoutContentWidget(this);
    }
    _getTopForPosition() {
        const visibleRanges = this._editor.getVisibleRanges();
        let firstLineInViewport;
        if (visibleRanges.length > 0) {
            firstLineInViewport = visibleRanges[0].startLineNumber;
        }
        else {
            this._logService.warn('RenameWidget#_getTopForPosition: this should not happen - visibleRanges is empty');
            firstLineInViewport = Math.max(1, this._position.lineNumber - 5); // @ulugbekna: fallback to current line minus 5
        }
        return (this._editor.getTopForLineNumber(this._position.lineNumber) -
            this._editor.getTopForLineNumber(firstLineInViewport));
    }
    _trace(...args) {
        this._logService.trace('RenameWidget', ...args);
    }
};
RenameWidget = __decorate([
    __param(2, IThemeService),
    __param(3, IKeybindingService),
    __param(4, IContextKeyService),
    __param(5, ILogService)
], RenameWidget);
export { RenameWidget };
class RenameCandidateListView {
    // FIXME@ulugbekna: rewrite using event emitters
    constructor(parent, opts) {
        this._disposables = new DisposableStore();
        this._availableHeight = 0;
        this._minimumWidth = 0;
        this._lineHeight = opts.fontInfo.lineHeight;
        this._typicalHalfwidthCharacterWidth = opts.fontInfo.typicalHalfwidthCharacterWidth;
        this._listContainer = document.createElement('div');
        this._listContainer.className = 'rename-box rename-candidate-list-container';
        parent.appendChild(this._listContainer);
        this._listWidget = RenameCandidateListView._createListWidget(this._listContainer, this._candidateViewHeight, opts.fontInfo);
        this._listWidget.onDidChangeFocus((e) => {
            if (e.elements.length === 1) {
                opts.onFocusChange(e.elements[0].newSymbolName);
            }
        }, this._disposables);
        this._listWidget.onDidChangeSelection((e) => {
            if (e.elements.length === 1) {
                opts.onSelectionChange();
            }
        }, this._disposables);
        this._disposables.add(this._listWidget.onDidBlur((e) => {
            // @ulugbekna: because list widget otherwise remembers last focused element and returns it as focused element
            this._listWidget.setFocus([]);
        }));
        this._listWidget.style(getListStyles({
            listInactiveFocusForeground: quickInputListFocusForeground,
            listInactiveFocusBackground: quickInputListFocusBackground,
        }));
    }
    dispose() {
        this._listWidget.dispose();
        this._disposables.dispose();
    }
    // height - max height allowed by parent element
    layout({ height, width }) {
        this._availableHeight = height;
        this._minimumWidth = width;
    }
    setCandidates(candidates) {
        // insert candidates into list widget
        this._listWidget.splice(0, 0, candidates);
        // adjust list widget layout
        const height = this._pickListHeight(this._listWidget.length);
        const width = this._pickListWidth(candidates);
        this._listWidget.layout(height, width);
        // adjust list container layout
        this._listContainer.style.height = `${height}px`;
        this._listContainer.style.width = `${width}px`;
        aria.status(nls.localize('renameSuggestionsReceivedAria', 'Received {0} rename suggestions', candidates.length));
    }
    clearCandidates() {
        this._listContainer.style.height = '0px';
        this._listContainer.style.width = '0px';
        this._listWidget.splice(0, this._listWidget.length, []);
    }
    get nCandidates() {
        return this._listWidget.length;
    }
    get focusedCandidate() {
        if (this._listWidget.length === 0) {
            return;
        }
        const selectedElement = this._listWidget.getSelectedElements()[0];
        if (selectedElement !== undefined) {
            return selectedElement.newSymbolName;
        }
        const focusedElement = this._listWidget.getFocusedElements()[0];
        if (focusedElement !== undefined) {
            return focusedElement.newSymbolName;
        }
        return;
    }
    focusNext() {
        if (this._listWidget.length === 0) {
            return false;
        }
        const focusedIxs = this._listWidget.getFocus();
        if (focusedIxs.length === 0) {
            this._listWidget.focusFirst();
            this._listWidget.reveal(0);
            return true;
        }
        else {
            if (focusedIxs[0] === this._listWidget.length - 1) {
                this._listWidget.setFocus([]);
                this._listWidget.reveal(0); // @ulugbekna: without this, it seems like focused element is obstructed
                return false;
            }
            else {
                this._listWidget.focusNext();
                const focused = this._listWidget.getFocus()[0];
                this._listWidget.reveal(focused);
                return true;
            }
        }
    }
    /**
     * @returns true if focus is moved to previous element
     */
    focusPrevious() {
        if (this._listWidget.length === 0) {
            return false;
        }
        const focusedIxs = this._listWidget.getFocus();
        if (focusedIxs.length === 0) {
            this._listWidget.focusLast();
            const focused = this._listWidget.getFocus()[0];
            this._listWidget.reveal(focused);
            return true;
        }
        else {
            if (focusedIxs[0] === 0) {
                this._listWidget.setFocus([]);
                return false;
            }
            else {
                this._listWidget.focusPrevious();
                const focused = this._listWidget.getFocus()[0];
                this._listWidget.reveal(focused);
                return true;
            }
        }
    }
    clearFocus() {
        this._listWidget.setFocus([]);
    }
    get _candidateViewHeight() {
        const { totalHeight } = RenameCandidateView.getLayoutInfo({ lineHeight: this._lineHeight });
        return totalHeight;
    }
    _pickListHeight(nCandidates) {
        const heightToFitAllCandidates = this._candidateViewHeight * nCandidates;
        const MAX_N_CANDIDATES = 7; // @ulugbekna: max # of candidates we want to show at once
        const height = Math.min(heightToFitAllCandidates, this._availableHeight, this._candidateViewHeight * MAX_N_CANDIDATES);
        return height;
    }
    _pickListWidth(candidates) {
        const longestCandidateWidth = Math.ceil(Math.max(...candidates.map((c) => c.newSymbolName.length)) *
            this._typicalHalfwidthCharacterWidth);
        const width = Math.max(this._minimumWidth, 4 /* padding */ +
            16 /* sparkle icon */ +
            5 /* margin-left */ +
            longestCandidateWidth +
            10 /* (possibly visible) scrollbar width */);
        return width;
    }
    static _createListWidget(container, candidateViewHeight, fontInfo) {
        const virtualDelegate = new (class {
            getTemplateId(element) {
                return 'candidate';
            }
            getHeight(element) {
                return candidateViewHeight;
            }
        })();
        const renderer = new (class {
            constructor() {
                this.templateId = 'candidate';
            }
            renderTemplate(container) {
                return new RenameCandidateView(container, fontInfo);
            }
            renderElement(candidate, index, templateData) {
                templateData.populate(candidate);
            }
            disposeTemplate(templateData) {
                templateData.dispose();
            }
        })();
        return new List('NewSymbolNameCandidates', container, virtualDelegate, [renderer], {
            keyboardSupport: false, // @ulugbekna: because we handle keyboard events through proper commands & keybinding service, see `rename.ts`
            mouseSupport: true,
            multipleSelectionSupport: false,
        });
    }
}
class InputWithButton {
    constructor() {
        this._buttonHoverContent = '';
        this._onDidInputChange = new Emitter();
        this.onDidInputChange = this._onDidInputChange.event;
        this._disposables = new DisposableStore();
    }
    get domNode() {
        if (!this._domNode) {
            this._domNode = document.createElement('div');
            this._domNode.className = 'rename-input-with-button';
            this._domNode.style.display = 'flex';
            this._domNode.style.flexDirection = 'row';
            this._domNode.style.alignItems = 'center';
            this._inputNode = document.createElement('input');
            this._inputNode.className = 'rename-input';
            this._inputNode.type = 'text';
            this._inputNode.style.border = 'none';
            this._inputNode.setAttribute('aria-label', nls.localize('renameAriaLabel', 'Rename input. Type new name and press Enter to commit.'));
            this._domNode.appendChild(this._inputNode);
            this._buttonNode = document.createElement('div');
            this._buttonNode.className = 'rename-suggestions-button';
            this._buttonNode.setAttribute('tabindex', '0');
            this._buttonGenHoverText = nls.localize('generateRenameSuggestionsButton', 'Generate new name suggestions');
            this._buttonCancelHoverText = nls.localize('cancelRenameSuggestionsButton', 'Cancel');
            this._buttonHoverContent = this._buttonGenHoverText;
            this._disposables.add(getBaseLayerHoverDelegate().setupDelayedHover(this._buttonNode, () => ({
                content: this._buttonHoverContent,
                appearance: {
                    showPointer: true,
                    compact: true,
                },
            })));
            this._domNode.appendChild(this._buttonNode);
            // notify if selection changes to cancel request to rename-suggestion providers
            this._disposables.add(dom.addDisposableListener(this.input, dom.EventType.INPUT, () => this._onDidInputChange.fire()));
            this._disposables.add(dom.addDisposableListener(this.input, dom.EventType.KEY_DOWN, (e) => {
                const keyEvent = new StandardKeyboardEvent(e);
                if (keyEvent.keyCode === 15 /* KeyCode.LeftArrow */ || keyEvent.keyCode === 17 /* KeyCode.RightArrow */) {
                    this._onDidInputChange.fire();
                }
            }));
            this._disposables.add(dom.addDisposableListener(this.input, dom.EventType.CLICK, () => this._onDidInputChange.fire()));
            // focus "container" border instead of input box
            this._disposables.add(dom.addDisposableListener(this.input, dom.EventType.FOCUS, () => {
                this.domNode.style.outlineWidth = '1px';
                this.domNode.style.outlineStyle = 'solid';
                this.domNode.style.outlineOffset = '-1px';
                this.domNode.style.outlineColor = 'var(--vscode-focusBorder)';
            }));
            this._disposables.add(dom.addDisposableListener(this.input, dom.EventType.BLUR, () => {
                this.domNode.style.outline = 'none';
            }));
        }
        return this._domNode;
    }
    get input() {
        assertType(this._inputNode);
        return this._inputNode;
    }
    get button() {
        assertType(this._buttonNode);
        return this._buttonNode;
    }
    get buttonState() {
        return this._buttonState;
    }
    setSparkleButton() {
        this._buttonState = 'sparkle';
        this._sparkleIcon ??= renderIcon(Codicon.sparkle);
        dom.clearNode(this.button);
        this.button.appendChild(this._sparkleIcon);
        this.button.setAttribute('aria-label', 'Generating new name suggestions');
        this._buttonHoverContent = this._buttonGenHoverText;
        this.input.focus();
    }
    setStopButton() {
        this._buttonState = 'stop';
        this._stopIcon ??= renderIcon(Codicon.stopCircle);
        dom.clearNode(this.button);
        this.button.appendChild(this._stopIcon);
        this.button.setAttribute('aria-label', 'Cancel generating new name suggestions');
        this._buttonHoverContent = this._buttonCancelHoverText;
        this.input.focus();
    }
    dispose() {
        this._disposables.dispose();
    }
}
class RenameCandidateView {
    static { this._PADDING = 2; }
    constructor(parent, fontInfo) {
        this._domNode = document.createElement('div');
        this._domNode.className = 'rename-box rename-candidate';
        this._domNode.style.display = `flex`;
        this._domNode.style.columnGap = `5px`;
        this._domNode.style.alignItems = `center`;
        this._domNode.style.height = `${fontInfo.lineHeight}px`;
        this._domNode.style.padding = `${RenameCandidateView._PADDING}px`;
        // @ulugbekna: needed to keep space when the `icon.style.display` is set to `none`
        const iconContainer = document.createElement('div');
        iconContainer.style.display = `flex`;
        iconContainer.style.alignItems = `center`;
        iconContainer.style.width = iconContainer.style.height = `${fontInfo.lineHeight * 0.8}px`;
        this._domNode.appendChild(iconContainer);
        this._icon = renderIcon(Codicon.sparkle);
        this._icon.style.display = `none`;
        iconContainer.appendChild(this._icon);
        this._label = document.createElement('div');
        domFontInfo.applyFontInfo(this._label, fontInfo);
        this._domNode.appendChild(this._label);
        parent.appendChild(this._domNode);
    }
    populate(value) {
        this._updateIcon(value);
        this._updateLabel(value);
    }
    _updateIcon(value) {
        const isAIGenerated = !!value.tags?.includes(NewSymbolNameTag.AIGenerated);
        this._icon.style.display = isAIGenerated ? 'inherit' : 'none';
    }
    _updateLabel(value) {
        this._label.innerText = value.newSymbolName;
    }
    static getLayoutInfo({ lineHeight }) {
        const totalHeight = lineHeight + RenameCandidateView._PADDING * 2; /* top & bottom padding */
        return { totalHeight };
    }
    dispose() { }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuYW1lV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9yZW5hbWUvYnJvd3Nlci9yZW5hbWVXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNqRixPQUFPLEtBQUssSUFBSSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUVoRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDckUsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDcEYsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFMUQsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RSxPQUFPLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sS0FBSyxXQUFX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