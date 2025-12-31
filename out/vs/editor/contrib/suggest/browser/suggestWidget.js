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
var SuggestWidget_1;
import * as dom from '../../../../base/browser/dom.js';
import '../../../../base/browser/ui/codicons/codiconStyles.js'; // The codicon symbol styles are defined here and must be loaded
import { List } from '../../../../base/browser/ui/list/listWidget.js';
import { createCancelablePromise, disposableTimeout, TimeoutTimer, } from '../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter, PauseableEmitter } from '../../../../base/common/event.js';
import { DisposableStore, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import { clamp } from '../../../../base/common/numbers.js';
import * as strings from '../../../../base/common/strings.js';
import './media/suggest.css';
import { EmbeddedCodeEditorWidget } from '../../../browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { SuggestWidgetStatus } from './suggestWidgetStatus.js';
import '../../symbolIcons/browser/symbolIcons.js'; // The codicon symbol colors are defined here and must be loaded to get colors
import * as nls from '../../../../nls.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { activeContrastBorder, editorForeground, editorWidgetBackground, editorWidgetBorder, listFocusHighlightForeground, listHighlightForeground, quickInputListFocusBackground, quickInputListFocusForeground, quickInputListFocusIconForeground, registerColor, transparent, } from '../../../../platform/theme/common/colorRegistry.js';
import { isHighContrast } from '../../../../platform/theme/common/theme.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ResizableHTMLElement } from '../../../../base/browser/ui/resizable/resizable.js';
import { Context as SuggestContext, suggestWidgetStatusbarMenu } from './suggest.js';
import { canExpandCompletionItem, SuggestDetailsOverlay, SuggestDetailsWidget, } from './suggestWidgetDetails.js';
import { ItemRenderer } from './suggestWidgetRenderer.js';
import { getListStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { status } from '../../../../base/browser/ui/aria/aria.js';
import { CompletionItemKinds } from '../../../common/languages.js';
/**
 * Suggest widget colors
 */
registerColor('editorSuggestWidget.background', editorWidgetBackground, nls.localize('editorSuggestWidgetBackground', 'Background color of the suggest widget.'));
registerColor('editorSuggestWidget.border', editorWidgetBorder, nls.localize('editorSuggestWidgetBorder', 'Border color of the suggest widget.'));
const editorSuggestWidgetForeground = registerColor('editorSuggestWidget.foreground', editorForeground, nls.localize('editorSuggestWidgetForeground', 'Foreground color of the suggest widget.'));
registerColor('editorSuggestWidget.selectedForeground', quickInputListFocusForeground, nls.localize('editorSuggestWidgetSelectedForeground', 'Foreground color of the selected entry in the suggest widget.'));
registerColor('editorSuggestWidget.selectedIconForeground', quickInputListFocusIconForeground, nls.localize('editorSuggestWidgetSelectedIconForeground', 'Icon foreground color of the selected entry in the suggest widget.'));
export const editorSuggestWidgetSelectedBackground = registerColor('editorSuggestWidget.selectedBackground', quickInputListFocusBackground, nls.localize('editorSuggestWidgetSelectedBackground', 'Background color of the selected entry in the suggest widget.'));
registerColor('editorSuggestWidget.highlightForeground', listHighlightForeground, nls.localize('editorSuggestWidgetHighlightForeground', 'Color of the match highlights in the suggest widget.'));
registerColor('editorSuggestWidget.focusHighlightForeground', listFocusHighlightForeground, nls.localize('editorSuggestWidgetFocusHighlightForeground', 'Color of the match highlights in the suggest widget when an item is focused.'));
registerColor('editorSuggestWidgetStatus.foreground', transparent(editorSuggestWidgetForeground, 0.5), nls.localize('editorSuggestWidgetStatusForeground', 'Foreground color of the suggest widget status.'));
var State;
(function (State) {
    State[State["Hidden"] = 0] = "Hidden";
    State[State["Loading"] = 1] = "Loading";
    State[State["Empty"] = 2] = "Empty";
    State[State["Open"] = 3] = "Open";
    State[State["Frozen"] = 4] = "Frozen";
    State[State["Details"] = 5] = "Details";
    State[State["onDetailsKeyDown"] = 6] = "onDetailsKeyDown";
})(State || (State = {}));
class PersistedWidgetSize {
    constructor(_service, editor) {
        this._service = _service;
        this._key = `suggestWidget.size/${editor.getEditorType()}/${editor instanceof EmbeddedCodeEditorWidget}`;
    }
    restore() {
        const raw = this._service.get(this._key, 0 /* StorageScope.PROFILE */) ?? '';
        try {
            const obj = JSON.parse(raw);
            if (dom.Dimension.is(obj)) {
                return dom.Dimension.lift(obj);
            }
        }
        catch {
            // ignore
        }
        return undefined;
    }
    store(size) {
        this._service.store(this._key, JSON.stringify(size), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
    reset() {
        this._service.remove(this._key, 0 /* StorageScope.PROFILE */);
    }
}
let SuggestWidget = class SuggestWidget {
    static { SuggestWidget_1 = this; }
    static { this.LOADING_MESSAGE = nls.localize('suggestWidget.loading', 'Loading...'); }
    static { this.NO_SUGGESTIONS_MESSAGE = nls.localize('suggestWidget.noSuggestions', 'No suggestions.'); }
    constructor(editor, _storageService, _contextKeyService, _themeService, instantiationService) {
        this.editor = editor;
        this._storageService = _storageService;
        this._state = 0 /* State.Hidden */;
        this._isAuto = false;
        this._pendingLayout = new MutableDisposable();
        this._pendingShowDetails = new MutableDisposable();
        this._ignoreFocusEvents = false;
        this._forceRenderingAbove = false;
        this._explainMode = false;
        this._showTimeout = new TimeoutTimer();
        this._disposables = new DisposableStore();
        this._onDidSelect = new PauseableEmitter();
        this._onDidFocus = new PauseableEmitter();
        this._onDidHide = new Emitter();
        this._onDidShow = new Emitter();
        this.onDidSelect = this._onDidSelect.event;
        this.onDidFocus = this._onDidFocus.event;
        this.onDidHide = this._onDidHide.event;
        this.onDidShow = this._onDidShow.event;
        this._onDetailsKeydown = new Emitter();
        this.onDetailsKeyDown = this._onDetailsKeydown.event;
        this.element = new ResizableHTMLElement();
        this.element.domNode.classList.add('editor-widget', 'suggest-widget');
        this._contentWidget = new SuggestContentWidget(this, editor);
        this._persistedSize = new PersistedWidgetSize(_storageService, editor);
        class ResizeState {
            constructor(persistedSize, currentSize, persistHeight = false, persistWidth = false) {
                this.persistedSize = persistedSize;
                this.currentSize = currentSize;
                this.persistHeight = persistHeight;
                this.persistWidth = persistWidth;
            }
        }
        let state;
        this._disposables.add(this.element.onDidWillResize(() => {
            this._contentWidget.lockPreference();
            state = new ResizeState(this._persistedSize.restore(), this.element.size);
        }));
        this._disposables.add(this.element.onDidResize((e) => {
            this._resize(e.dimension.width, e.dimension.height);
            if (state) {
                state.persistHeight = state.persistHeight || !!e.north || !!e.south;
                state.persistWidth = state.persistWidth || !!e.east || !!e.west;
            }
            if (!e.done) {
                return;
            }
            if (state) {
                // only store width or height value that have changed and also
                // only store changes that are above a certain threshold
                const { itemHeight, defaultSize } = this.getLayoutInfo();
                const threshold = Math.round(itemHeight / 2);
                let { width, height } = this.element.size;
                if (!state.persistHeight || Math.abs(state.currentSize.height - height) <= threshold) {
                    height = state.persistedSize?.height ?? defaultSize.height;
                }
                if (!state.persistWidth || Math.abs(state.currentSize.width - width) <= threshold) {
                    width = state.persistedSize?.width ?? defaultSize.width;
                }
                this._persistedSize.store(new dom.Dimension(width, height));
            }
            // reset working state
            this._contentWidget.unlockPreference();
            state = undefined;
        }));
        this._messageElement = dom.append(this.element.domNode, dom.$('.message'));
        this._listElement = dom.append(this.element.domNode, dom.$('.tree'));
        const details = this._disposables.add(instantiationService.createInstance(SuggestDetailsWidget, this.editor));
        details.onDidClose(() => this.toggleDetails(), this, this._disposables);
        this._details = new SuggestDetailsOverlay(details, this.editor);
        const applyIconStyle = () => this.element.domNode.classList.toggle('no-icons', !this.editor.getOption(123 /* EditorOption.suggest */).showIcons);
        applyIconStyle();
        const renderer = instantiationService.createInstance(ItemRenderer, this.editor);
        this._disposables.add(renderer);
        this._disposables.add(renderer.onDidToggleDetails(() => this.toggleDetails()));
        this._list = new List('SuggestWidget', this._listElement, {
            getHeight: (_element) => this.getLayoutInfo().itemHeight,
            getTemplateId: (_element) => 'suggestion',
        }, [renderer], {
            alwaysConsumeMouseWheel: true,
            useShadows: false,
            mouseSupport: false,
            multipleSelectionSupport: false,
            accessibilityProvider: {
                getRole: () => 'listitem',
                getWidgetAriaLabel: () => nls.localize('suggest', 'Suggest'),
                getWidgetRole: () => 'listbox',
                getAriaLabel: (item) => {
                    let label = item.textLabel;
                    const kindLabel = CompletionItemKinds.toLabel(item.completion.kind);
                    if (typeof item.completion.label !== 'string') {
                        const { detail, description } = item.completion.label;
                        if (detail && description) {
                            label = nls.localize('label.full', '{0} {1}, {2}, {3}', label, detail, description, kindLabel);
                        }
                        else if (detail) {
                            label = nls.localize('label.detail', '{0} {1}, {2}', label, detail, kindLabel);
                        }
                        else if (description) {
                            label = nls.localize('label.desc', '{0}, {1}, {2}', label, description, kindLabel);
                        }
                    }
                    else {
                        label = nls.localize('label', '{0}, {1}', label, kindLabel);
                    }
                    if (!item.isResolved || !this._isDetailsVisible()) {
                        return label;
                    }
                    const { documentation, detail } = item.completion;
                    const docs = strings.format('{0}{1}', detail || '', documentation
                        ? typeof documentation === 'string'
                            ? documentation
                            : documentation.value
                        : '');
                    return nls.localize('ariaCurrenttSuggestionReadDetails', '{0}, docs: {1}', label, docs);
                },
            },
        });
        this._list.style(getListStyles({
            listInactiveFocusBackground: editorSuggestWidgetSelectedBackground,
            listInactiveFocusOutline: activeContrastBorder,
        }));
        this._status = instantiationService.createInstance(SuggestWidgetStatus, this.element.domNode, suggestWidgetStatusbarMenu);
        const applyStatusBarStyle = () => this.element.domNode.classList.toggle('with-status-bar', this.editor.getOption(123 /* EditorOption.suggest */).showStatusBar);
        applyStatusBarStyle();
        this._disposables.add(_themeService.onDidColorThemeChange((t) => this._onThemeChange(t)));
        this._onThemeChange(_themeService.getColorTheme());
        this._disposables.add(this._list.onMouseDown((e) => this._onListMouseDownOrTap(e)));
        this._disposables.add(this._list.onTap((e) => this._onListMouseDownOrTap(e)));
        this._disposables.add(this._list.onDidChangeSelection((e) => this._onListSelection(e)));
        this._disposables.add(this._list.onDidChangeFocus((e) => this._onListFocus(e)));
        this._disposables.add(this.editor.onDidChangeCursorSelection(() => this._onCursorSelectionChanged()));
        this._disposables.add(this.editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(123 /* EditorOption.suggest */)) {
                applyStatusBarStyle();
                applyIconStyle();
            }
            if (this._completionModel &&
                (e.hasChanged(52 /* EditorOption.fontInfo */) ||
                    e.hasChanged(124 /* EditorOption.suggestFontSize */) ||
                    e.hasChanged(125 /* EditorOption.suggestLineHeight */))) {
                this._list.splice(0, this._list.length, this._completionModel.items);
            }
        }));
        this._ctxSuggestWidgetVisible = SuggestContext.Visible.bindTo(_contextKeyService);
        this._ctxSuggestWidgetDetailsVisible = SuggestContext.DetailsVisible.bindTo(_contextKeyService);
        this._ctxSuggestWidgetMultipleSuggestions =
            SuggestContext.MultipleSuggestions.bindTo(_contextKeyService);
        this._ctxSuggestWidgetHasFocusedSuggestion =
            SuggestContext.HasFocusedSuggestion.bindTo(_contextKeyService);
        this._disposables.add(dom.addStandardDisposableListener(this._details.widget.domNode, 'keydown', (e) => {
            this._onDetailsKeydown.fire(e);
        }));
        this._disposables.add(this.editor.onMouseDown((e) => this._onEditorMouseDown(e)));
    }
    dispose() {
        this._details.widget.dispose();
        this._details.dispose();
        this._list.dispose();
        this._status.dispose();
        this._disposables.dispose();
        this._loadingTimeout?.dispose();
        this._pendingLayout.dispose();
        this._pendingShowDetails.dispose();
        this._showTimeout.dispose();
        this._contentWidget.dispose();
        this.element.dispose();
    }
    _onEditorMouseDown(mouseEvent) {
        if (this._details.widget.domNode.contains(mouseEvent.target.element)) {
            // Clicking inside details
            this._details.widget.domNode.focus();
        }
        else {
            // Clicking outside details and inside suggest
            if (this.element.domNode.contains(mouseEvent.target.element)) {
                this.editor.focus();
            }
        }
    }
    _onCursorSelectionChanged() {
        if (this._state !== 0 /* State.Hidden */) {
            this._contentWidget.layout();
        }
    }
    _onListMouseDownOrTap(e) {
        if (typeof e.element === 'undefined' || typeof e.index === 'undefined') {
            return;
        }
        // prevent stealing browser focus from the editor
        e.browserEvent.preventDefault();
        e.browserEvent.stopPropagation();
        this._select(e.element, e.index);
    }
    _onListSelection(e) {
        if (e.elements.length) {
            this._select(e.elements[0], e.indexes[0]);
        }
    }
    _select(item, index) {
        const completionModel = this._completionModel;
        if (completionModel) {
            this._onDidSelect.fire({ item, index, model: completionModel });
            this.editor.focus();
        }
    }
    _onThemeChange(theme) {
        this._details.widget.borderWidth = isHighContrast(theme.type) ? 2 : 1;
    }
    _onListFocus(e) {
        if (this._ignoreFocusEvents) {
            return;
        }
        if (this._state === 5 /* State.Details */) {
            // This can happen when focus is in the details-panel and when
            // arrow keys are pressed to select next/prev items
            this._setState(3 /* State.Open */);
        }
        if (!e.elements.length) {
            if (this._currentSuggestionDetails) {
                this._currentSuggestionDetails.cancel();
                this._currentSuggestionDetails = undefined;
                this._focusedItem = undefined;
            }
            this.editor.setAriaOptions({ activeDescendant: undefined });
            this._ctxSuggestWidgetHasFocusedSuggestion.set(false);
            return;
        }
        if (!this._completionModel) {
            return;
        }
        this._ctxSuggestWidgetHasFocusedSuggestion.set(true);
        const item = e.elements[0];
        const index = e.indexes[0];
        if (item !== this._focusedItem) {
            this._currentSuggestionDetails?.cancel();
            this._currentSuggestionDetails = undefined;
            this._focusedItem = item;
            this._list.reveal(index);
            this._currentSuggestionDetails = createCancelablePromise(async (token) => {
                const loading = disposableTimeout(() => {
                    if (this._isDetailsVisible()) {
                        this._showDetails(true, false);
                    }
                }, 250);
                const sub = token.onCancellationRequested(() => loading.dispose());
                try {
                    return await item.resolve(token);
                }
                finally {
                    loading.dispose();
                    sub.dispose();
                }
            });
            this._currentSuggestionDetails
                .then(() => {
                if (index >= this._list.length || item !== this._list.element(index)) {
                    return;
                }
                // item can have extra information, so re-render
                this._ignoreFocusEvents = true;
                this._list.splice(index, 1, [item]);
                this._list.setFocus([index]);
                this._ignoreFocusEvents = false;
                if (this._isDetailsVisible()) {
                    this._showDetails(false, false);
                }
                else {
                    this.element.domNode.classList.remove('docs-side');
                }
                this.editor.setAriaOptions({ activeDescendant: this._list.getElementID(index) });
            })
                .catch(onUnexpectedError);
        }
        // emit an event
        this._onDidFocus.fire({ item, index, model: this._completionModel });
    }
    _setState(state) {
        if (this._state === state) {
            return;
        }
        this._state = state;
        this.element.domNode.classList.toggle('frozen', state === 4 /* State.Frozen */);
        this.element.domNode.classList.remove('message');
        switch (state) {
            case 0 /* State.Hidden */:
                dom.hide(this._messageElement, this._listElement, this._status.element);
                this._details.hide(true);
                this._status.hide();
                this._contentWidget.hide();
                this._ctxSuggestWidgetVisible.reset();
                this._ctxSuggestWidgetMultipleSuggestions.reset();
                this._ctxSuggestWidgetHasFocusedSuggestion.reset();
                this._showTimeout.cancel();
                this.element.domNode.classList.remove('visible');
                this._list.splice(0, this._list.length);
                this._focusedItem = undefined;
                this._cappedHeight = undefined;
                this._explainMode = false;
                break;
            case 1 /* State.Loading */:
                this.element.domNode.classList.add('message');
                this._messageElement.textContent = SuggestWidget_1.LOADING_MESSAGE;
                dom.hide(this._listElement, this._status.element);
                dom.show(this._messageElement);
                this._details.hide();
                this._show();
                this._focusedItem = undefined;
                status(SuggestWidget_1.LOADING_MESSAGE);
                break;
            case 2 /* State.Empty */:
                this.element.domNode.classList.add('message');
                this._messageElement.textContent = SuggestWidget_1.NO_SUGGESTIONS_MESSAGE;
                dom.hide(this._listElement, this._status.element);
                dom.show(this._messageElement);
                this._details.hide();
                this._show();
                this._focusedItem = undefined;
                status(SuggestWidget_1.NO_SUGGESTIONS_MESSAGE);
                break;
            case 3 /* State.Open */:
                dom.hide(this._messageElement);
                dom.show(this._listElement, this._status.element);
                this._show();
                break;
            case 4 /* State.Frozen */:
                dom.hide(this._messageElement);
                dom.show(this._listElement, this._status.element);
                this._show();
                break;
            case 5 /* State.Details */:
                dom.hide(this._messageElement);
                dom.show(this._listElement, this._status.element);
                this._details.show();
                this._show();
                this._details.widget.focus();
                break;
        }
    }
    _show() {
        this._status.show();
        this._contentWidget.show();
        this._layout(this._persistedSize.restore());
        this._ctxSuggestWidgetVisible.set(true);
        this._showTimeout.cancelAndSet(() => {
            this.element.domNode.classList.add('visible');
            this._onDidShow.fire(this);
        }, 100);
    }
    showTriggered(auto, delay) {
        if (this._state !== 0 /* State.Hidden */) {
            return;
        }
        this._contentWidget.setPosition(this.editor.getPosition());
        this._isAuto = !!auto;
        if (!this._isAuto) {
            this._loadingTimeout = disposableTimeout(() => this._setState(1 /* State.Loading */), delay);
        }
    }
    showSuggestions(completionModel, selectionIndex, isFrozen, isAuto, noFocus) {
        this._contentWidget.setPosition(this.editor.getPosition());
        this._loadingTimeout?.dispose();
        this._currentSuggestionDetails?.cancel();
        this._currentSuggestionDetails = undefined;
        if (this._completionModel !== completionModel) {
            this._completionModel = completionModel;
        }
        if (isFrozen && this._state !== 2 /* State.Empty */ && this._state !== 0 /* State.Hidden */) {
            this._setState(4 /* State.Frozen */);
            return;
        }
        const visibleCount = this._completionModel.items.length;
        const isEmpty = visibleCount === 0;
        this._ctxSuggestWidgetMultipleSuggestions.set(visibleCount > 1);
        if (isEmpty) {
            this._setState(isAuto ? 0 /* State.Hidden */ : 2 /* State.Empty */);
            this._completionModel = undefined;
            return;
        }
        this._focusedItem = undefined;
        // calling list.splice triggers focus event which this widget forwards. That can lead to
        // suggestions being cancelled and the widget being cleared (and hidden). All this happens
        // before revealing and focusing is done which means revealing and focusing will fail when
        // they get run.
        this._onDidFocus.pause();
        this._onDidSelect.pause();
        try {
            this._list.splice(0, this._list.length, this._completionModel.items);
            this._setState(isFrozen ? 4 /* State.Frozen */ : 3 /* State.Open */);
            this._list.reveal(selectionIndex, 0, selectionIndex === 0 ? 0 : this.getLayoutInfo().itemHeight * 0.33);
            this._list.setFocus(noFocus ? [] : [selectionIndex]);
        }
        finally {
            this._onDidFocus.resume();
            this._onDidSelect.resume();
        }
        this._pendingLayout.value = dom.runAtThisOrScheduleAtNextAnimationFrame(dom.getWindow(this.element.domNode), () => {
            this._pendingLayout.clear();
            this._layout(this.element.size);
            // Reset focus border
            this._details.widget.domNode.classList.remove('focused');
        });
    }
    focusSelected() {
        if (this._list.length > 0) {
            this._list.setFocus([0]);
        }
    }
    selectNextPage() {
        switch (this._state) {
            case 0 /* State.Hidden */:
                return false;
            case 5 /* State.Details */:
                this._details.widget.pageDown();
                return true;
            case 1 /* State.Loading */:
                return !this._isAuto;
            default:
                this._list.focusNextPage();
                return true;
        }
    }
    selectNext() {
        switch (this._state) {
            case 0 /* State.Hidden */:
                return false;
            case 1 /* State.Loading */:
                return !this._isAuto;
            default:
                this._list.focusNext(1, true);
                return true;
        }
    }
    selectLast() {
        switch (this._state) {
            case 0 /* State.Hidden */:
                return false;
            case 5 /* State.Details */:
                this._details.widget.scrollBottom();
                return true;
            case 1 /* State.Loading */:
                return !this._isAuto;
            default:
                this._list.focusLast();
                return true;
        }
    }
    selectPreviousPage() {
        switch (this._state) {
            case 0 /* State.Hidden */:
                return false;
            case 5 /* State.Details */:
                this._details.widget.pageUp();
                return true;
            case 1 /* State.Loading */:
                return !this._isAuto;
            default:
                this._list.focusPreviousPage();
                return true;
        }
    }
    selectPrevious() {
        switch (this._state) {
            case 0 /* State.Hidden */:
                return false;
            case 1 /* State.Loading */:
                return !this._isAuto;
            default:
                this._list.focusPrevious(1, true);
                return false;
        }
    }
    selectFirst() {
        switch (this._state) {
            case 0 /* State.Hidden */:
                return false;
            case 5 /* State.Details */:
                this._details.widget.scrollTop();
                return true;
            case 1 /* State.Loading */:
                return !this._isAuto;
            default:
                this._list.focusFirst();
                return true;
        }
    }
    getFocusedItem() {
        if (this._state !== 0 /* State.Hidden */ &&
            this._state !== 2 /* State.Empty */ &&
            this._state !== 1 /* State.Loading */ &&
            this._completionModel &&
            this._list.getFocus().length > 0) {
            return {
                item: this._list.getFocusedElements()[0],
                index: this._list.getFocus()[0],
                model: this._completionModel,
            };
        }
        return undefined;
    }
    toggleDetailsFocus() {
        if (this._state === 5 /* State.Details */) {
            // Should return the focus to the list item.
            this._list.setFocus(this._list.getFocus());
            this._setState(3 /* State.Open */);
        }
        else if (this._state === 3 /* State.Open */) {
            this._setState(5 /* State.Details */);
            if (!this._isDetailsVisible()) {
                this.toggleDetails(true);
            }
            else {
                this._details.widget.focus();
            }
        }
    }
    toggleDetails(focused = false) {
        if (this._isDetailsVisible()) {
            // hide details widget
            this._pendingShowDetails.clear();
            this._ctxSuggestWidgetDetailsVisible.set(false);
            this._setDetailsVisible(false);
            this._details.hide();
            this.element.domNode.classList.remove('shows-details');
        }
        else if ((canExpandCompletionItem(this._list.getFocusedElements()[0]) || this._explainMode) &&
            (this._state === 3 /* State.Open */ || this._state === 5 /* State.Details */ || this._state === 4 /* State.Frozen */)) {
            // show details widget (iff possible)
            this._ctxSuggestWidgetDetailsVisible.set(true);
            this._setDetailsVisible(true);
            this._showDetails(false, focused);
        }
    }
    _showDetails(loading, focused) {
        this._pendingShowDetails.value = dom.runAtThisOrScheduleAtNextAnimationFrame(dom.getWindow(this.element.domNode), () => {
            this._pendingShowDetails.clear();
            this._details.show();
            let didFocusDetails = false;
            if (loading) {
                this._details.widget.renderLoading();
            }
            else {
                this._details.widget.renderItem(this._list.getFocusedElements()[0], this._explainMode);
            }
            if (!this._details.widget.isEmpty) {
                this._positionDetails();
                this.element.domNode.classList.add('shows-details');
                if (focused) {
                    this._details.widget.focus();
                    didFocusDetails = true;
                }
            }
            else {
                this._details.hide();
            }
            if (!didFocusDetails) {
                this.editor.focus();
            }
        });
    }
    toggleExplainMode() {
        if (this._list.getFocusedElements()[0]) {
            this._explainMode = !this._explainMode;
            if (!this._isDetailsVisible()) {
                this.toggleDetails();
            }
            else {
                this._showDetails(false, false);
            }
        }
    }
    resetPersistedSize() {
        this._persistedSize.reset();
    }
    hideWidget() {
        this._pendingLayout.clear();
        this._pendingShowDetails.clear();
        this._loadingTimeout?.dispose();
        this._setState(0 /* State.Hidden */);
        this._onDidHide.fire(this);
        this.element.clearSashHoverState();
        // ensure that a reasonable widget height is persisted so that
        // accidential "resize-to-single-items" cases aren't happening
        const dim = this._persistedSize.restore();
        const minPersistedHeight = Math.ceil(this.getLayoutInfo().itemHeight * 4.3);
        if (dim && dim.height < minPersistedHeight) {
            this._persistedSize.store(dim.with(undefined, minPersistedHeight));
        }
    }
    isFrozen() {
        return this._state === 4 /* State.Frozen */;
    }
    _afterRender(position) {
        if (position === null) {
            if (this._isDetailsVisible()) {
                this._details.hide(); //todo@jrieken soft-hide
            }
            return;
        }
        if (this._state === 2 /* State.Empty */ || this._state === 1 /* State.Loading */) {
            // no special positioning when widget isn't showing list
            return;
        }
        if (this._isDetailsVisible() && !this._details.widget.isEmpty) {
            this._details.show();
        }
        this._positionDetails();
    }
    _layout(size) {
        if (!this.editor.hasModel()) {
            return;
        }
        if (!this.editor.getDomNode()) {
            // happens when running tests
            return;
        }
        const bodyBox = dom.getClientArea(this.element.domNode.ownerDocument.body);
        const info = this.getLayoutInfo();
        if (!size) {
            size = info.defaultSize;
        }
        let height = size.height;
        let width = size.width;
        // status bar
        this._status.element.style.height = `${info.itemHeight}px`;
        if (this._state === 2 /* State.Empty */ || this._state === 1 /* State.Loading */) {
            // showing a message only
            height = info.itemHeight + info.borderHeight;
            width = info.defaultSize.width / 2;
            this.element.enableSashes(false, false, false, false);
            this.element.minSize = this.element.maxSize = new dom.Dimension(width, height);
            this._contentWidget.setPreference(2 /* ContentWidgetPositionPreference.BELOW */);
        }
        else {
            // showing items
            // width math
            const maxWidth = bodyBox.width - info.borderHeight - 2 * info.horizontalPadding;
            if (width > maxWidth) {
                width = maxWidth;
            }
            const preferredWidth = this._completionModel
                ? this._completionModel.stats.pLabelLen * info.typicalHalfwidthCharacterWidth
                : width;
            // height math
            const fullHeight = info.statusBarHeight + this._list.contentHeight + info.borderHeight;
            const minHeight = info.itemHeight + info.statusBarHeight;
            const editorBox = dom.getDomNodePagePosition(this.editor.getDomNode());
            const cursorBox = this.editor.getScrolledVisiblePosition(this.editor.getPosition());
            const cursorBottom = editorBox.top + cursorBox.top + cursorBox.height;
            const maxHeightBelow = Math.min(bodyBox.height - cursorBottom - info.verticalPadding, fullHeight);
            const availableSpaceAbove = editorBox.top + cursorBox.top - info.verticalPadding;
            const maxHeightAbove = Math.min(availableSpaceAbove, fullHeight);
            let maxHeight = Math.min(Math.max(maxHeightAbove, maxHeightBelow) + info.borderHeight, fullHeight);
            if (height === this._cappedHeight?.capped) {
                // Restore the old (wanted) height when the current
                // height is capped to fit
                height = this._cappedHeight.wanted;
            }
            if (height < minHeight) {
                height = minHeight;
            }
            if (height > maxHeight) {
                height = maxHeight;
            }
            const forceRenderingAboveRequiredSpace = 150;
            if (height > maxHeightBelow ||
                (this._forceRenderingAbove && availableSpaceAbove > forceRenderingAboveRequiredSpace)) {
                this._contentWidget.setPreference(1 /* ContentWidgetPositionPreference.ABOVE */);
                this.element.enableSashes(true, true, false, false);
                maxHeight = maxHeightAbove;
            }
            else {
                this._contentWidget.setPreference(2 /* ContentWidgetPositionPreference.BELOW */);
                this.element.enableSashes(false, true, true, false);
                maxHeight = maxHeightBelow;
            }
            this.element.preferredSize = new dom.Dimension(preferredWidth, info.defaultSize.height);
            this.element.maxSize = new dom.Dimension(maxWidth, maxHeight);
            this.element.minSize = new dom.Dimension(220, minHeight);
            // Know when the height was capped to fit and remember
            // the wanted height for later. This is required when going
            // left to widen suggestions.
            this._cappedHeight =
                height === fullHeight
                    ? { wanted: this._cappedHeight?.wanted ?? size.height, capped: height }
                    : undefined;
        }
        this._resize(width, height);
    }
    _resize(width, height) {
        const { width: maxWidth, height: maxHeight } = this.element.maxSize;
        width = Math.min(maxWidth, width);
        height = Math.min(maxHeight, height);
        const { statusBarHeight } = this.getLayoutInfo();
        this._list.layout(height - statusBarHeight, width);
        this._listElement.style.height = `${height - statusBarHeight}px`;
        this.element.layout(height, width);
        this._contentWidget.layout();
        this._positionDetails();
    }
    _positionDetails() {
        if (this._isDetailsVisible()) {
            this._details.placeAtAnchor(this.element.domNode, this._contentWidget.getPosition()?.preference[0] === 2 /* ContentWidgetPositionPreference.BELOW */);
        }
    }
    getLayoutInfo() {
        const fontInfo = this.editor.getOption(52 /* EditorOption.fontInfo */);
        const itemHeight = clamp(this.editor.getOption(125 /* EditorOption.suggestLineHeight */) || fontInfo.lineHeight, 8, 1000);
        const statusBarHeight = !this.editor.getOption(123 /* EditorOption.suggest */).showStatusBar ||
            this._state === 2 /* State.Empty */ ||
            this._state === 1 /* State.Loading */
            ? 0
            : itemHeight;
        const borderWidth = this._details.widget.borderWidth;
        const borderHeight = 2 * borderWidth;
        return {
            itemHeight,
            statusBarHeight,
            borderWidth,
            borderHeight,
            typicalHalfwidthCharacterWidth: fontInfo.typicalHalfwidthCharacterWidth,
            verticalPadding: 22,
            horizontalPadding: 14,
            defaultSize: new dom.Dimension(430, statusBarHeight + 12 * itemHeight),
        };
    }
    _isDetailsVisible() {
        return this._storageService.getBoolean('expandSuggestionDocs', 0 /* StorageScope.PROFILE */, false);
    }
    _setDetailsVisible(value) {
        this._storageService.store('expandSuggestionDocs', value, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    forceRenderingAbove() {
        if (!this._forceRenderingAbove) {
            this._forceRenderingAbove = true;
            this._layout(this._persistedSize.restore());
        }
    }
    stopForceRenderingAbove() {
        this._forceRenderingAbove = false;
    }
};
SuggestWidget = SuggestWidget_1 = __decorate([
    __param(1, IStorageService),
    __param(2, IContextKeyService),
    __param(3, IThemeService),
    __param(4, IInstantiationService)
], SuggestWidget);
export { SuggestWidget };
export class SuggestContentWidget {
    constructor(_widget, _editor) {
        this._widget = _widget;
        this._editor = _editor;
        this.allowEditorOverflow = true;
        this.suppressMouseDown = false;
        this._preferenceLocked = false;
        this._added = false;
        this._hidden = false;
    }
    dispose() {
        if (this._added) {
            this._added = false;
            this._editor.removeContentWidget(this);
        }
    }
    getId() {
        return 'editor.widget.suggestWidget';
    }
    getDomNode() {
        return this._widget.element.domNode;
    }
    show() {
        this._hidden = false;
        if (!this._added) {
            this._added = true;
            this._editor.addContentWidget(this);
        }
    }
    hide() {
        if (!this._hidden) {
            this._hidden = true;
            this.layout();
        }
    }
    layout() {
        this._editor.layoutContentWidget(this);
    }
    getPosition() {
        if (this._hidden || !this._position || !this._preference) {
            return null;
        }
        return {
            position: this._position,
            preference: [this._preference],
        };
    }
    beforeRender() {
        const { height, width } = this._widget.element.size;
        const { borderWidth, horizontalPadding } = this._widget.getLayoutInfo();
        return new dom.Dimension(width + 2 * borderWidth + horizontalPadding, height + 2 * borderWidth);
    }
    afterRender(position) {
        this._widget._afterRender(position);
    }
    setPreference(preference) {
        if (!this._preferenceLocked) {
            this._preference = preference;
        }
    }
    lockPreference() {
        this._preferenceLocked = true;
    }
    unlockPreference() {
        this._preferenceLocked = false;
    }
    setPosition(position) {
        this._position = position;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N1Z2dlc3QvYnJvd3Nlci9zdWdnZXN0V2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBRXRELE9BQU8sdURBQXVELENBQUEsQ0FBQyxnRUFBZ0U7QUFNL0gsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3JFLE9BQU8sRUFFTix1QkFBdUIsRUFDdkIsaUJBQWlCLEVBQ2pCLFlBQVksR0FDWixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQVMsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRixPQUFPLEVBQ04sZUFBZSxFQUVmLGlCQUFpQixHQUNqQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8scUJBQXFCLENBQUE7QUFRNUIsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFHekcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTywwQ0FBMEMsQ0FBQSxDQUFDLDhFQUE4RTtBQUNoSSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0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