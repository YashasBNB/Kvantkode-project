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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuYW1lV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvcmVuYW1lL2Jyb3dzZXIvcmVuYW1lV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDakYsT0FBTyxLQUFLLElBQUksTUFBTSwwQ0FBMEMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFFaEYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3JFLE9BQU8sS0FBSyxNQUFNLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3BGLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTFELE9BQU8sRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEUsT0FBTyxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEtBQUssV0FBVyxNQUFNLHdDQUF3QyxDQUFBO0FBVXJF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