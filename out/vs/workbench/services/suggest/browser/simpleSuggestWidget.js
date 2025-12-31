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
var SimpleSuggestWidget_1;
import './media/suggest.css';
import * as dom from '../../../../base/browser/dom.js';
import { List } from '../../../../base/browser/ui/list/listWidget.js';
import { ResizableHTMLElement } from '../../../../base/browser/ui/resizable/resizable.js';
import { getAriaId, SimpleSuggestWidgetItemRenderer, } from './simpleSuggestWidgetRenderer.js';
import { createCancelablePromise, disposableTimeout, TimeoutTimer, } from '../../../../base/common/async.js';
import { Emitter, PauseableEmitter } from '../../../../base/common/event.js';
import { MutableDisposable, Disposable } from '../../../../base/common/lifecycle.js';
import { clamp } from '../../../../base/common/numbers.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { SuggestWidgetStatus } from '../../../../editor/contrib/suggest/browser/suggestWidgetStatus.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { canExpandCompletionItem, SimpleSuggestDetailsOverlay, SimpleSuggestDetailsWidget, } from './simpleSuggestWidgetDetails.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import * as strings from '../../../../base/common/strings.js';
import { status } from '../../../../base/browser/ui/aria/aria.js';
const $ = dom.$;
var State;
(function (State) {
    State[State["Hidden"] = 0] = "Hidden";
    State[State["Loading"] = 1] = "Loading";
    State[State["Empty"] = 2] = "Empty";
    State[State["Open"] = 3] = "Open";
    State[State["Frozen"] = 4] = "Frozen";
    State[State["Details"] = 5] = "Details";
})(State || (State = {}));
var WidgetPositionPreference;
(function (WidgetPositionPreference) {
    WidgetPositionPreference[WidgetPositionPreference["Above"] = 0] = "Above";
    WidgetPositionPreference[WidgetPositionPreference["Below"] = 1] = "Below";
})(WidgetPositionPreference || (WidgetPositionPreference = {}));
export const SimpleSuggestContext = {
    HasFocusedSuggestion: new RawContextKey('simpleSuggestWidgetHasFocusedSuggestion', false, localize('simpleSuggestWidgetHasFocusedSuggestion', 'Whether any simple suggestion is focused')),
    HasNavigated: new RawContextKey('simpleSuggestWidgetHasNavigated', false, localize('simpleSuggestWidgetHasNavigated', 'Whether the simple suggestion widget has been navigated downwards')),
};
let SimpleSuggestWidget = class SimpleSuggestWidget extends Disposable {
    static { SimpleSuggestWidget_1 = this; }
    static { this.LOADING_MESSAGE = localize('suggestWidget.loading', 'Loading...'); }
    static { this.NO_SUGGESTIONS_MESSAGE = localize('suggestWidget.noSuggestions', 'No suggestions.'); }
    get list() {
        return this._list;
    }
    constructor(_container, _persistedSize, _options, _getFontInfo, _onDidFontConfigurationChange, _getAdvancedExplainModeDetails, _instantiationService, _configurationService, _storageService, _contextKeyService) {
        super();
        this._container = _container;
        this._persistedSize = _persistedSize;
        this._options = _options;
        this._getFontInfo = _getFontInfo;
        this._onDidFontConfigurationChange = _onDidFontConfigurationChange;
        this._getAdvancedExplainModeDetails = _getAdvancedExplainModeDetails;
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._storageService = _storageService;
        this._state = 0 /* State.Hidden */;
        this._forceRenderingAbove = false;
        this._explainMode = false;
        this._pendingShowDetails = this._register(new MutableDisposable());
        this._pendingLayout = this._register(new MutableDisposable());
        this._ignoreFocusEvents = false;
        this._showTimeout = this._register(new TimeoutTimer());
        this._onDidSelect = this._register(new Emitter());
        this.onDidSelect = this._onDidSelect.event;
        this._onDidHide = this._register(new Emitter());
        this.onDidHide = this._onDidHide.event;
        this._onDidShow = this._register(new Emitter());
        this.onDidShow = this._onDidShow.event;
        this._onDidFocus = new PauseableEmitter();
        this.onDidFocus = this._onDidFocus.event;
        this._onDidBlurDetails = this._register(new Emitter());
        this.onDidBlurDetails = this._onDidBlurDetails.event;
        this.element = this._register(new ResizableHTMLElement());
        this.element.domNode.classList.add('workbench-suggest-widget');
        this._container.appendChild(this.element.domNode);
        this._ctxSuggestWidgetHasFocusedSuggestion =
            SimpleSuggestContext.HasFocusedSuggestion.bindTo(_contextKeyService);
        this._ctxSuggestWidgetHasBeenNavigated =
            SimpleSuggestContext.HasNavigated.bindTo(_contextKeyService);
        class ResizeState {
            constructor(persistedSize, currentSize, persistHeight = false, persistWidth = false) {
                this.persistedSize = persistedSize;
                this.currentSize = currentSize;
                this.persistHeight = persistHeight;
                this.persistWidth = persistWidth;
            }
        }
        let state;
        this._register(this.element.onDidWillResize(() => {
            // this._preferenceLocked = true;
            state = new ResizeState(this._persistedSize.restore(), this.element.size);
        }));
        this._register(this.element.onDidResize((e) => {
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
                const { itemHeight, defaultSize } = this._getLayoutInfo();
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
            // this._preferenceLocked = false;
            state = undefined;
        }));
        const applyIconStyle = () => this.element.domNode.classList.toggle('no-icons', !_configurationService.getValue('editor.suggest.showIcons'));
        applyIconStyle();
        const renderer = this._instantiationService.createInstance(SimpleSuggestWidgetItemRenderer, this._getFontInfo.bind(this), this._onDidFontConfigurationChange.bind(this));
        this._register(renderer);
        this._listElement = dom.append(this.element.domNode, $('.tree'));
        this._list = this._register(new List('SuggestWidget', this._listElement, {
            getHeight: () => this._getLayoutInfo().itemHeight,
            getTemplateId: () => 'suggestion',
        }, [renderer], {
            alwaysConsumeMouseWheel: true,
            useShadows: false,
            mouseSupport: false,
            multipleSelectionSupport: false,
            accessibilityProvider: {
                getRole: () => 'listitem',
                getWidgetAriaLabel: () => localize('suggest', 'Suggest'),
                getWidgetRole: () => 'listbox',
                getAriaLabel: (item) => {
                    let label = item.textLabel;
                    const kindLabel = item.completion.kindLabel ?? '';
                    if (typeof item.completion.label !== 'string') {
                        const { detail, description } = item.completion.label;
                        if (detail && description) {
                            label = localize('label.full', '{0}{1}, {2} {3}', label, detail, description, kindLabel);
                        }
                        else if (detail) {
                            label = localize('label.detail', '{0}{1} {2}', label, detail, kindLabel);
                        }
                        else if (description) {
                            label = localize('label.desc', '{0}, {1} {2}', label, description, kindLabel);
                        }
                    }
                    else {
                        label = localize('label', '{0}, {1}', label, kindLabel);
                    }
                    const { documentation, detail } = item.completion;
                    const docs = strings.format('{0}{1}', detail || '', documentation
                        ? typeof documentation === 'string'
                            ? documentation
                            : documentation.value
                        : '');
                    return localize('ariaCurrenttSuggestionReadDetails', '{0}, docs: {1}', label, docs);
                },
            },
        }));
        this._register(this._list.onDidChangeFocus((e) => {
            if (e.indexes.length && e.indexes[0] !== 0) {
                this._ctxSuggestWidgetHasBeenNavigated.set(true);
            }
        }));
        this._messageElement = dom.append(this.element.domNode, dom.$('.message'));
        const details = this._register(_instantiationService.createInstance(SimpleSuggestDetailsWidget, this._getFontInfo.bind(this), this._onDidFontConfigurationChange.bind(this), this._getAdvancedExplainModeDetails.bind(this)));
        this._register(details.onDidClose(() => this.toggleDetails()));
        this._details = this._register(new SimpleSuggestDetailsOverlay(details, this._listElement));
        this._register(dom.addDisposableListener(this._details.widget.domNode, 'blur', (e) => this._onDidBlurDetails.fire(e)));
        if (_options.statusBarMenuId &&
            _options.showStatusBarSettingId &&
            _configurationService.getValue(_options.showStatusBarSettingId)) {
            this._status = this._register(_instantiationService.createInstance(SuggestWidgetStatus, this.element.domNode, _options.statusBarMenuId));
            this.element.domNode.classList.toggle('with-status-bar', true);
        }
        this._register(this._list.onMouseDown((e) => this._onListMouseDownOrTap(e)));
        this._register(this._list.onTap((e) => this._onListMouseDownOrTap(e)));
        this._register(this._list.onDidChangeFocus((e) => this._onListFocus(e)));
        this._register(this._list.onDidChangeSelection((e) => this._onListSelection(e)));
        this._register(this._onDidFontConfigurationChange(() => {
            if (this._completionModel) {
                this._list.splice(0, this._completionModel.items.length, this._completionModel.items);
            }
        }));
        this._register(_configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('editor.suggest.showIcons')) {
                applyIconStyle();
            }
            if (_options.statusBarMenuId &&
                _options.showStatusBarSettingId &&
                e.affectsConfiguration(_options.showStatusBarSettingId)) {
                const showStatusBar = _configurationService.getValue(_options.showStatusBarSettingId);
                if (showStatusBar && !this._status) {
                    this._status = this._register(_instantiationService.createInstance(SuggestWidgetStatus, this.element.domNode, _options.statusBarMenuId));
                    this._status.show();
                }
                else if (showStatusBar && this._status) {
                    this._status.show();
                }
                else if (this._status) {
                    this._status.element.remove();
                    this._status.dispose();
                    this._status = undefined;
                    this._layout(undefined);
                }
                this.element.domNode.classList.toggle('with-status-bar', showStatusBar);
            }
        }));
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
                this._ctxSuggestWidgetHasFocusedSuggestion.set(false);
            }
            this._clearAriaActiveDescendant();
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
            const id = getAriaId(index);
            const node = dom.getActiveWindow().document.activeElement;
            if (node && id) {
                node.setAttribute('aria-haspopup', 'true');
                node.setAttribute('aria-autocomplete', 'list');
                node.setAttribute('aria-activedescendant', id);
            }
            else {
                this._clearAriaActiveDescendant();
            }
            this._currentSuggestionDetails = createCancelablePromise(async (token) => {
                const loading = disposableTimeout(() => {
                    if (this._isDetailsVisible()) {
                        this._showDetails(true, false);
                    }
                }, 250);
                const sub = token.onCancellationRequested(() => loading.dispose());
                try {
                    return await Promise.resolve();
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
            })
                .catch();
        }
        // emit an event
        this._onDidFocus.fire({ item, index, model: this._completionModel });
    }
    _clearAriaActiveDescendant() {
        const node = dom.getActiveWindow().document.activeElement;
        if (!node) {
            return;
        }
        node.setAttribute('aria-haspopup', 'false');
        node.setAttribute('aria-autocomplete', 'both');
        node.removeAttribute('aria-activedescendant');
    }
    setCompletionModel(completionModel) {
        this._completionModel = completionModel;
    }
    hasCompletions() {
        return this._completionModel?.items.length !== 0;
    }
    resetWidgetSize() {
        this._persistedSize.reset();
    }
    showSuggestions(selectionIndex, isFrozen, isAuto, cursorPosition) {
        this._cursorPosition = cursorPosition;
        // this._contentWidget.setPosition(this.editor.getPosition());
        // this._loadingTimeout?.dispose();
        // this._currentSuggestionDetails?.cancel();
        // this._currentSuggestionDetails = undefined;
        if (isFrozen && this._state !== 2 /* State.Empty */ && this._state !== 0 /* State.Hidden */) {
            this._setState(4 /* State.Frozen */);
            return;
        }
        const visibleCount = this._completionModel?.items.length ?? 0;
        const isEmpty = visibleCount === 0;
        // this._ctxSuggestWidgetMultipleSuggestions.set(visibleCount > 1);
        if (isEmpty) {
            this._setState(isAuto ? 0 /* State.Hidden */ : 2 /* State.Empty */);
            this._completionModel = undefined;
            return;
        }
        // this._focusedItem = undefined;
        // calling list.splice triggers focus event which this widget forwards. That can lead to
        // suggestions being cancelled and the widget being cleared (and hidden). All this happens
        // before revealing and focusing is done which means revealing and focusing will fail when
        // they get run.
        // this._onDidFocus.pause();
        // this._onDidSelect.pause();
        try {
            this._list.splice(0, this._list.length, this._completionModel?.items ?? []);
            this._setState(isFrozen ? 4 /* State.Frozen */ : 3 /* State.Open */);
            this._list.reveal(selectionIndex, 0);
            this._list.setFocus([selectionIndex]);
            // this._list.setFocus(noFocus ? [] : [selectionIndex]);
        }
        finally {
            // this._onDidFocus.resume();
            // this._onDidSelect.resume();
        }
        this._pendingLayout.value = dom.runAtThisOrScheduleAtNextAnimationFrame(dom.getWindow(this.element.domNode), () => {
            this._pendingLayout.clear();
            this._layout(this.element.size);
            // Reset focus border
            // this._details.widget.domNode.classList.remove('focused');
        });
        this._afterRender();
    }
    setLineContext(lineContext) {
        if (this._completionModel) {
            this._completionModel.lineContext = lineContext;
        }
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
                if (this._status) {
                    dom.hide(this._status.element);
                }
                dom.hide(this._listElement);
                dom.hide(this._messageElement);
                dom.hide(this.element.domNode);
                this._details.hide(true);
                this._status?.hide();
                // this._contentWidget.hide();
                // this._ctxSuggestWidgetVisible.reset();
                // this._ctxSuggestWidgetMultipleSuggestions.reset();
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
                this._messageElement.textContent = SimpleSuggestWidget_1.LOADING_MESSAGE;
                dom.hide(this._listElement);
                if (this._status) {
                    dom.hide(this._status.element);
                }
                dom.show(this._messageElement);
                this._details.hide();
                this._show();
                this._focusedItem = undefined;
                break;
            case 2 /* State.Empty */:
                this.element.domNode.classList.add('message');
                this._messageElement.textContent = SimpleSuggestWidget_1.NO_SUGGESTIONS_MESSAGE;
                dom.hide(this._listElement);
                if (this._status) {
                    dom.hide(this._status.element);
                }
                dom.show(this._messageElement);
                this._details.hide();
                this._show();
                this._focusedItem = undefined;
                status(SimpleSuggestWidget_1.NO_SUGGESTIONS_MESSAGE);
                break;
            case 3 /* State.Open */:
                dom.hide(this._messageElement);
                this._showListAndStatus();
                this._show();
                break;
            case 4 /* State.Frozen */:
                dom.hide(this._messageElement);
                this._showListAndStatus();
                this._show();
                break;
            case 5 /* State.Details */:
                dom.hide(this._messageElement);
                this._showListAndStatus();
                this._details.show();
                this._show();
                break;
        }
    }
    _showListAndStatus() {
        if (this._status) {
            dom.show(this._listElement, this._status.element);
        }
        else {
            dom.show(this._listElement);
        }
    }
    _show() {
        // this._layout(this._persistedSize.restore());
        // dom.show(this.element.domNode);
        // this._onDidShow.fire();
        this._status?.show();
        // this._contentWidget.show();
        dom.show(this.element.domNode);
        this._layout(this._persistedSize.restore());
        // this._ctxSuggestWidgetVisible.set(true);
        this._onDidShow.fire(this);
        this._showTimeout.cancelAndSet(() => {
            this.element.domNode.classList.add('visible');
        }, 100);
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
            // this._ctxSuggestWidgetDetailsVisible.set(false);
            this._setDetailsVisible(false);
            this._details.hide();
            this.element.domNode.classList.remove('shows-details');
        }
        else if ((canExpandCompletionItem(this._list.getFocusedElements()[0]) || this._explainMode) &&
            (this._state === 3 /* State.Open */ || this._state === 5 /* State.Details */ || this._state === 4 /* State.Frozen */)) {
            // show details widget (iff possible)
            // this._ctxSuggestWidgetDetailsVisible.set(true);
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
                // this.editor.focus();
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
    hide() {
        this._pendingLayout.clear();
        this._pendingShowDetails.clear();
        // this._loadingTimeout?.dispose();
        this._ctxSuggestWidgetHasBeenNavigated.reset();
        this._setState(0 /* State.Hidden */);
        this._onDidHide.fire(this);
        dom.hide(this.element.domNode);
        this.element.clearSashHoverState();
        // ensure that a reasonable widget height is persisted so that
        // accidential "resize-to-single-items" cases aren't happening
        const dim = this._persistedSize.restore();
        const minPersistedHeight = Math.ceil(this._getLayoutInfo().itemHeight * 4.3);
        if (dim && dim.height < minPersistedHeight) {
            this._persistedSize.store(dim.with(undefined, minPersistedHeight));
        }
    }
    _layout(size) {
        if (!this._cursorPosition) {
            return;
        }
        // if (!this.editor.hasModel()) {
        // 	return;
        // }
        // if (!this.editor.getDomNode()) {
        // 	// happens when running tests
        // 	return;
        // }
        const bodyBox = dom.getClientArea(this._container.ownerDocument.body);
        const info = this._getLayoutInfo();
        if (!size) {
            size = info.defaultSize;
        }
        let height = size.height;
        let width = size.width;
        // status bar
        if (this._status) {
            this._status.element.style.height = `${info.itemHeight}px`;
        }
        // if (this._state === State.Empty || this._state === State.Loading) {
        // 	// showing a message only
        // 	height = info.itemHeight + info.borderHeight;
        // 	width = info.defaultSize.width / 2;
        // 	this.element.enableSashes(false, false, false, false);
        // 	this.element.minSize = this.element.maxSize = new dom.Dimension(width, height);
        // 	this._contentWidget.setPreference(ContentWidgetPositionPreference.BELOW);
        // } else {
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
        const fullHeight = info.statusBarHeight +
            this._list.contentHeight +
            this._messageElement.clientHeight +
            info.borderHeight;
        const minHeight = info.itemHeight + info.statusBarHeight;
        // const editorBox = dom.getDomNodePagePosition(this.editor.getDomNode());
        // const cursorBox = this.editor.getScrolledVisiblePosition(this.editor.getPosition());
        const editorBox = dom.getDomNodePagePosition(this._container);
        const cursorBox = this._cursorPosition; //this.editor.getScrolledVisiblePosition(this.editor.getPosition());
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
            this._preference = 0 /* WidgetPositionPreference.Above */;
            this.element.enableSashes(true, true, false, false);
            maxHeight = maxHeightAbove;
        }
        else {
            this._preference = 1 /* WidgetPositionPreference.Below */;
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
        // }
        this.element.domNode.style.left = `${this._cursorPosition.left}px`;
        if (this._preference === 0 /* WidgetPositionPreference.Above */) {
            this.element.domNode.style.top = `${this._cursorPosition.top - height - info.borderHeight}px`;
        }
        else {
            this.element.domNode.style.top = `${this._cursorPosition.top + this._cursorPosition.height}px`;
        }
        this._resize(width, height);
    }
    _afterRender() {
        // if (position === null) {
        // 	if (this._isDetailsVisible()) {
        // 		this._details.hide(); //todo@jrieken soft-hide
        // 	}
        // 	return;
        // }
        if (this._state === 2 /* State.Empty */ || this._state === 1 /* State.Loading */) {
            // no special positioning when widget isn't showing list
            return;
        }
        if (this._isDetailsVisible() && !this._details.widget.isEmpty) {
            this._details.show();
        }
        this._positionDetails();
    }
    _resize(width, height) {
        const { width: maxWidth, height: maxHeight } = this.element.maxSize;
        width = Math.min(maxWidth, width);
        if (maxHeight) {
            height = Math.min(maxHeight, height);
        }
        const { statusBarHeight } = this._getLayoutInfo();
        this._list.layout(height - statusBarHeight, width);
        this._listElement.style.height = `${height - statusBarHeight}px`;
        this._listElement.style.width = `${width}px`;
        this.element.layout(height, width);
        if (this._cursorPosition && this._preference === 0 /* WidgetPositionPreference.Above */) {
            this.element.domNode.style.top = `${this._cursorPosition.top - height}px`;
        }
        this._positionDetails();
    }
    _positionDetails() {
        if (this._isDetailsVisible()) {
            this._details.placeAtAnchor(this.element.domNode);
        }
    }
    _getLayoutInfo() {
        const fontInfo = this._getFontInfo();
        const itemHeight = clamp(fontInfo.lineHeight, 8, 1000);
        const statusBarHeight = !this._options.statusBarMenuId ||
            !this._options.showStatusBarSettingId ||
            !this._configurationService.getValue(this._options.showStatusBarSettingId) ||
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
            typicalHalfwidthCharacterWidth: 10,
            verticalPadding: 22,
            horizontalPadding: 14,
            defaultSize: new dom.Dimension(430, statusBarHeight + 12 * itemHeight + borderHeight),
        };
    }
    _onListMouseDownOrTap(e) {
        if (typeof e.element === 'undefined' || typeof e.index === 'undefined') {
            return;
        }
        // prevent stealing browser focus from the terminal
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
        }
    }
    selectNext() {
        this._list.focusNext(1, true);
        const focus = this._list.getFocus();
        if (focus.length > 0) {
            this._list.reveal(focus[0]);
        }
        return true;
    }
    selectNextPage() {
        this._list.focusNextPage();
        const focus = this._list.getFocus();
        if (focus.length > 0) {
            this._list.reveal(focus[0]);
        }
        return true;
    }
    selectPrevious() {
        this._list.focusPrevious(1, true);
        const focus = this._list.getFocus();
        if (focus.length > 0) {
            this._list.reveal(focus[0]);
        }
        return true;
    }
    selectPreviousPage() {
        this._list.focusPreviousPage();
        const focus = this._list.getFocus();
        if (focus.length > 0) {
            this._list.reveal(focus[0]);
        }
        return true;
    }
    getFocusedItem() {
        if (this._completionModel) {
            return {
                item: this._list.getFocusedElements()[0],
                index: this._list.getFocus()[0],
                model: this._completionModel,
            };
        }
        return undefined;
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
SimpleSuggestWidget = SimpleSuggestWidget_1 = __decorate([
    __param(6, IInstantiationService),
    __param(7, IConfigurationService),
    __param(8, IStorageService),
    __param(9, IContextKeyService)
], SimpleSuggestWidget);
export { SimpleSuggestWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlU3VnZ2VzdFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zdWdnZXN0L2Jyb3dzZXIvc2ltcGxlU3VnZ2VzdFdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBTXRELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUd6RixPQUFPLEVBQ04sU0FBUyxFQUNULCtCQUErQixHQUUvQixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFFTix1QkFBdUIsRUFDdkIsaUJBQWlCLEVBQ2pCLFlBQVksR0FDWixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxPQUFPLEVBQVMsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDcEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUV2RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUNOLHVCQUF1QixF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