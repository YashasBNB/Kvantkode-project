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
var HunkAccessibleDiffViewer_1;
import { $, getActiveElement, getTotalHeight, getWindow, h, reset, trackFocus, } from '../../../../base/browser/dom.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { constObservable, derived, observableValue, } from '../../../../base/common/observable.js';
import { AccessibleDiffViewer, } from '../../../../editor/browser/widget/diffEditor/components/accessibleDiffViewer.js';
import { LineRange } from '../../../../editor/common/core/lineRange.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import { DetailedLineRangeMapping, RangeMapping, } from '../../../../editor/common/diff/rangeMapping.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../nls.js';
import { IAccessibleViewService } from '../../../../platform/accessibility/browser/accessibleView.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { MenuWorkbenchButtonBar, } from '../../../../platform/actions/browser/buttonbar.js';
import { createActionViewItem, } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { MenuId, MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { asCssVariable, asCssVariableName, editorBackground, inputBackground, } from '../../../../platform/theme/common/colorRegistry.js';
import { EDITOR_DRAG_AND_DROP_BACKGROUND } from '../../../common/theme.js';
import { MarkUnhelpfulActionId } from '../../chat/browser/actions/chatTitleActions.js';
import { ChatVoteDownButton } from '../../chat/browser/chatListRenderer.js';
import { ChatWidget, } from '../../chat/browser/chatWidget.js';
import { chatRequestBackground } from '../../chat/common/chatColors.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { ChatAgentVoteDirection, IChatService } from '../../chat/common/chatService.js';
import { isResponseVM } from '../../chat/common/chatViewModel.js';
import { CTX_INLINE_CHAT_FOCUSED, CTX_INLINE_CHAT_RESPONSE_FOCUSED, inlineChatBackground, inlineChatForeground, } from '../common/inlineChat.js';
import './media/inlineChat.css';
let InlineChatWidget = class InlineChatWidget {
    constructor(location, _options, _instantiationService, _contextKeyService, _keybindingService, _accessibilityService, _configurationService, _accessibleViewService, _textModelResolverService, _chatService, _hoverService) {
        this._options = _options;
        this._instantiationService = _instantiationService;
        this._contextKeyService = _contextKeyService;
        this._keybindingService = _keybindingService;
        this._accessibilityService = _accessibilityService;
        this._configurationService = _configurationService;
        this._accessibleViewService = _accessibleViewService;
        this._textModelResolverService = _textModelResolverService;
        this._chatService = _chatService;
        this._hoverService = _hoverService;
        this._elements = h('div.inline-chat@root', [
            h('div.chat-widget@chatWidget'),
            h('div.accessibleViewer@accessibleViewer'),
            h('div.status@status', [
                h('div.label.info.hidden@infoLabel'),
                h('div.actions.hidden@toolbar1'),
                h('div.label.status.hidden@statusLabel'),
                h('div.actions.secondary.hidden@toolbar2'),
            ]),
        ]);
        this._store = new DisposableStore();
        this._onDidChangeHeight = this._store.add(new Emitter());
        this.onDidChangeHeight = Event.filter(this._onDidChangeHeight.event, (_) => !this._isLayouting);
        this._requestInProgress = observableValue(this, false);
        this.requestInProgress = this._requestInProgress;
        this._isLayouting = false;
        this.scopedContextKeyService = this._store.add(_contextKeyService.createScoped(this._elements.chatWidget));
        const scopedInstaService = _instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService]), this._store);
        this._chatWidget = scopedInstaService.createInstance(ChatWidget, location, undefined, {
            autoScroll: true,
            defaultElementHeight: 32,
            renderStyle: 'minimal',
            renderInputOnTop: false,
            renderFollowups: true,
            supportsFileReferences: true,
            filter: (item) => {
                if (!isResponseVM(item) || item.errorDetails) {
                    // show all requests and errors
                    return true;
                }
                const emptyResponse = item.response.value.length === 0;
                if (emptyResponse) {
                    return false;
                }
                if (item.response.value.every((item) => item.kind === 'textEditGroup' &&
                    _options.chatWidgetViewOptions?.rendererOptions?.renderTextEditsAsSummary?.(item.uri))) {
                    return false;
                }
                return true;
            },
            ..._options.chatWidgetViewOptions,
        }, {
            listForeground: inlineChatForeground,
            listBackground: inlineChatBackground,
            overlayBackground: EDITOR_DRAG_AND_DROP_BACKGROUND,
            inputEditorBackground: inputBackground,
            resultEditorBackground: editorBackground,
        });
        this._elements.root.classList.toggle('in-zone-widget', !!_options.inZoneWidget);
        this._chatWidget.render(this._elements.chatWidget);
        this._elements.chatWidget.style.setProperty(asCssVariableName(chatRequestBackground), asCssVariable(inlineChatBackground));
        this._chatWidget.setVisible(true);
        this._store.add(this._chatWidget);
        const ctxResponse = ChatContextKeys.isResponse.bindTo(this.scopedContextKeyService);
        const ctxResponseVote = ChatContextKeys.responseVote.bindTo(this.scopedContextKeyService);
        const ctxResponseSupportIssues = ChatContextKeys.responseSupportsIssueReporting.bindTo(this.scopedContextKeyService);
        const ctxResponseError = ChatContextKeys.responseHasError.bindTo(this.scopedContextKeyService);
        const ctxResponseErrorFiltered = ChatContextKeys.responseIsFiltered.bindTo(this.scopedContextKeyService);
        const viewModelStore = this._store.add(new DisposableStore());
        this._store.add(this._chatWidget.onDidChangeViewModel(() => {
            viewModelStore.clear();
            const viewModel = this._chatWidget.viewModel;
            if (!viewModel) {
                return;
            }
            viewModelStore.add(toDisposable(() => {
                toolbar2.context = undefined;
                ctxResponse.reset();
                ctxResponseVote.reset();
                ctxResponseError.reset();
                ctxResponseErrorFiltered.reset();
                ctxResponseSupportIssues.reset();
            }));
            viewModelStore.add(viewModel.onDidChange(() => {
                this._requestInProgress.set(viewModel.requestInProgress, undefined);
                const last = viewModel.getItems().at(-1);
                toolbar2.context = last;
                ctxResponse.set(isResponseVM(last));
                ctxResponseVote.set(isResponseVM(last)
                    ? last.vote === ChatAgentVoteDirection.Down
                        ? 'down'
                        : last.vote === ChatAgentVoteDirection.Up
                            ? 'up'
                            : ''
                    : '');
                ctxResponseError.set(isResponseVM(last) && last.errorDetails !== undefined);
                ctxResponseErrorFiltered.set(!!(isResponseVM(last) && last.errorDetails?.responseIsFiltered));
                ctxResponseSupportIssues.set(isResponseVM(last) && (last.agent?.metadata.supportIssueReporting ?? false));
                this._onDidChangeHeight.fire();
            }));
            this._onDidChangeHeight.fire();
        }));
        this._store.add(this.chatWidget.onDidChangeContentHeight(() => {
            this._onDidChangeHeight.fire();
        }));
        // context keys
        this._ctxResponseFocused = CTX_INLINE_CHAT_RESPONSE_FOCUSED.bindTo(this._contextKeyService);
        const tracker = this._store.add(trackFocus(this.domNode));
        this._store.add(tracker.onDidBlur(() => this._ctxResponseFocused.set(false)));
        this._store.add(tracker.onDidFocus(() => this._ctxResponseFocused.set(true)));
        this._ctxInputEditorFocused = CTX_INLINE_CHAT_FOCUSED.bindTo(_contextKeyService);
        this._store.add(this._chatWidget.inputEditor.onDidFocusEditorWidget(() => this._ctxInputEditorFocused.set(true)));
        this._store.add(this._chatWidget.inputEditor.onDidBlurEditorWidget(() => this._ctxInputEditorFocused.set(false)));
        const statusMenuId = _options.statusMenuId instanceof MenuId ? _options.statusMenuId : _options.statusMenuId.menu;
        // BUTTON bar
        const statusMenuOptions = _options.statusMenuId instanceof MenuId ? undefined : _options.statusMenuId.options;
        const statusButtonBar = scopedInstaService.createInstance(MenuWorkbenchButtonBar, this._elements.toolbar1, statusMenuId, {
            toolbarOptions: { primaryGroup: '0_main' },
            telemetrySource: _options.chatWidgetViewOptions?.menus?.telemetrySource,
            menuOptions: { renderShortTitle: true },
            ...statusMenuOptions,
        });
        this._store.add(statusButtonBar.onDidChange(() => this._onDidChangeHeight.fire()));
        this._store.add(statusButtonBar);
        // secondary toolbar
        const toolbar2 = scopedInstaService.createInstance(MenuWorkbenchToolBar, this._elements.toolbar2, _options.secondaryMenuId ?? MenuId.for(''), {
            telemetrySource: _options.chatWidgetViewOptions?.menus?.telemetrySource,
            menuOptions: { renderShortTitle: true, shouldForwardArgs: true },
            actionViewItemProvider: (action, options) => {
                if (action instanceof MenuItemAction && action.item.id === MarkUnhelpfulActionId) {
                    return scopedInstaService.createInstance(ChatVoteDownButton, action, options);
                }
                return createActionViewItem(scopedInstaService, action, options);
            },
        });
        this._store.add(toolbar2.onDidChangeMenuItems(() => this._onDidChangeHeight.fire()));
        this._store.add(toolbar2);
        this._store.add(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("accessibility.verbosity.inlineChat" /* AccessibilityVerbositySettingId.InlineChat */)) {
                this._updateAriaLabel();
            }
        }));
        this._elements.root.tabIndex = 0;
        this._elements.statusLabel.tabIndex = 0;
        this._updateAriaLabel();
        // this._elements.status
        this._store.add(this._hoverService.setupManagedHover(getDefaultHoverDelegate('element'), this._elements.statusLabel, () => {
            return this._elements.statusLabel.dataset['title'];
        }));
        this._store.add(this._chatService.onDidPerformUserAction((e) => {
            if (e.sessionId === this._chatWidget.viewModel?.model.sessionId &&
                e.action.kind === 'vote') {
                this.updateStatus('Thank you for your feedback!', { resetAfter: 1250 });
            }
        }));
    }
    _updateAriaLabel() {
        this._elements.root.ariaLabel = this._accessibleViewService.getOpenAriaHint("accessibility.verbosity.inlineChat" /* AccessibilityVerbositySettingId.InlineChat */);
        if (this._accessibilityService.isScreenReaderOptimized()) {
            let label = defaultAriaLabel;
            if (this._configurationService.getValue("accessibility.verbosity.inlineChat" /* AccessibilityVerbositySettingId.InlineChat */)) {
                const kbLabel = this._keybindingService
                    .lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)
                    ?.getLabel();
                label = kbLabel
                    ? localize('inlineChat.accessibilityHelp', 'Inline Chat Input, Use {0} for Inline Chat Accessibility Help.', kbLabel)
                    : localize('inlineChat.accessibilityHelpNoKb', 'Inline Chat Input, Run the Inline Chat Accessibility Help command for more information.');
            }
            this._chatWidget.inputEditor.updateOptions({ ariaLabel: label });
        }
    }
    dispose() {
        this._store.dispose();
    }
    get domNode() {
        return this._elements.root;
    }
    get chatWidget() {
        return this._chatWidget;
    }
    saveState() {
        this._chatWidget.saveState();
    }
    layout(widgetDim) {
        const contentHeight = this.contentHeight;
        this._isLayouting = true;
        try {
            this._doLayout(widgetDim);
        }
        finally {
            this._isLayouting = false;
            if (this.contentHeight !== contentHeight) {
                this._onDidChangeHeight.fire();
            }
        }
    }
    _doLayout(dimension) {
        const extraHeight = this._getExtraHeight();
        const statusHeight = getTotalHeight(this._elements.status);
        // console.log('ZONE#Widget#layout', { height: dimension.height, extraHeight, progressHeight, followUpsHeight, statusHeight, LIST: dimension.height - progressHeight - followUpsHeight - statusHeight - extraHeight });
        this._elements.root.style.height = `${dimension.height - extraHeight}px`;
        this._elements.root.style.width = `${dimension.width}px`;
        this._chatWidget.layout(dimension.height - statusHeight - extraHeight, dimension.width);
    }
    /**
     * The content height of this widget is the size that would require no scrolling
     */
    get contentHeight() {
        const data = {
            chatWidgetContentHeight: this._chatWidget.contentHeight,
            statusHeight: getTotalHeight(this._elements.status),
            extraHeight: this._getExtraHeight(),
        };
        const result = data.chatWidgetContentHeight + data.statusHeight + data.extraHeight;
        return result;
    }
    get minHeight() {
        // The chat widget is variable height and supports scrolling. It should be
        // at least "maxWidgetHeight" high and at most the content height.
        let maxWidgetOutputHeight = 100;
        for (const item of this._chatWidget.viewModel?.getItems() ?? []) {
            if (isResponseVM(item) &&
                item.response.value.some((r) => r.kind === 'textEditGroup' && !r.state?.applied)) {
                maxWidgetOutputHeight = 270;
                break;
            }
        }
        let value = this.contentHeight;
        value -= this._chatWidget.contentHeight;
        value += Math.min(this._chatWidget.input.contentHeight + maxWidgetOutputHeight, this._chatWidget.contentHeight);
        return value;
    }
    _getExtraHeight() {
        return this._options.inZoneWidget ? 1 : 2 /*border*/ + 4; /*shadow*/
    }
    get value() {
        return this._chatWidget.getInput();
    }
    set value(value) {
        this._chatWidget.setInput(value);
    }
    selectAll() {
        this._chatWidget.inputEditor.setSelection(new Selection(1, 1, Number.MAX_SAFE_INTEGER, 1));
    }
    set placeholder(value) {
        this._chatWidget.setInputPlaceholder(value);
    }
    toggleStatus(show) {
        this._elements.toolbar1.classList.toggle('hidden', !show);
        this._elements.toolbar2.classList.toggle('hidden', !show);
        this._elements.status.classList.toggle('hidden', !show);
        this._elements.infoLabel.classList.toggle('hidden', !show);
        this._onDidChangeHeight.fire();
    }
    updateToolbar(show) {
        this._elements.root.classList.toggle('toolbar', show);
        this._elements.toolbar1.classList.toggle('hidden', !show);
        this._elements.toolbar2.classList.toggle('hidden', !show);
        this._elements.status.classList.toggle('actions', show);
        this._elements.infoLabel.classList.toggle('hidden', show);
        this._onDidChangeHeight.fire();
    }
    async getCodeBlockInfo(codeBlockIndex) {
        const { viewModel } = this._chatWidget;
        if (!viewModel) {
            return undefined;
        }
        const items = viewModel.getItems().filter((i) => isResponseVM(i));
        const item = items.at(-1);
        if (!item) {
            return;
        }
        return viewModel.codeBlockModelCollection.get(viewModel.sessionId, item, codeBlockIndex)?.model;
    }
    get responseContent() {
        const requests = this._chatWidget.viewModel?.model.getRequests();
        return requests?.at(-1)?.response?.response.toString();
    }
    getChatModel() {
        return this._chatWidget.viewModel?.model;
    }
    setChatModel(chatModel, state) {
        this._chatWidget.setModel(chatModel, { ...state, inputValue: undefined });
    }
    updateInfo(message) {
        this._elements.infoLabel.classList.toggle('hidden', !message);
        const renderedMessage = renderLabelWithIcons(message);
        reset(this._elements.infoLabel, ...renderedMessage);
        this._onDidChangeHeight.fire();
    }
    updateStatus(message, ops = {}) {
        const isTempMessage = typeof ops.resetAfter === 'number';
        if (isTempMessage && !this._elements.statusLabel.dataset['state']) {
            const statusLabel = this._elements.statusLabel.innerText;
            const title = this._elements.statusLabel.dataset['title'];
            const classes = Array.from(this._elements.statusLabel.classList.values());
            setTimeout(() => {
                this.updateStatus(statusLabel, { classes, keepMessage: true, title });
            }, ops.resetAfter);
        }
        const renderedMessage = renderLabelWithIcons(message);
        reset(this._elements.statusLabel, ...renderedMessage);
        this._elements.statusLabel.className = `label status ${(ops.classes ?? []).join(' ')}`;
        this._elements.statusLabel.classList.toggle('hidden', !message);
        if (isTempMessage) {
            this._elements.statusLabel.dataset['state'] = 'temp';
        }
        else {
            delete this._elements.statusLabel.dataset['state'];
        }
        if (ops.title) {
            this._elements.statusLabel.dataset['title'] = ops.title;
        }
        else {
            delete this._elements.statusLabel.dataset['title'];
        }
        this._onDidChangeHeight.fire();
    }
    reset() {
        this._chatWidget.attachmentModel.clear();
        this._chatWidget.saveState();
        reset(this._elements.statusLabel);
        this._elements.statusLabel.classList.toggle('hidden', true);
        this._elements.toolbar1.classList.add('hidden');
        this._elements.toolbar2.classList.add('hidden');
        this.updateInfo('');
        this._elements.accessibleViewer.classList.toggle('hidden', true);
        this._onDidChangeHeight.fire();
    }
    focus() {
        this._chatWidget.focusInput();
    }
    hasFocus() {
        return this.domNode.contains(getActiveElement());
    }
};
InlineChatWidget = __decorate([
    __param(2, IInstantiationService),
    __param(3, IContextKeyService),
    __param(4, IKeybindingService),
    __param(5, IAccessibilityService),
    __param(6, IConfigurationService),
    __param(7, IAccessibleViewService),
    __param(8, ITextModelService),
    __param(9, IChatService),
    __param(10, IHoverService)
], InlineChatWidget);
export { InlineChatWidget };
const defaultAriaLabel = localize('aria-label', 'Inline Chat Input');
let EditorBasedInlineChatWidget = class EditorBasedInlineChatWidget extends InlineChatWidget {
    constructor(location, _parentEditor, options, contextKeyService, keybindingService, instantiationService, accessibilityService, configurationService, accessibleViewService, textModelResolverService, chatService, hoverService, layoutService) {
        const overflowWidgetsNode = layoutService
            .getContainer(getWindow(_parentEditor.getContainerDomNode()))
            .appendChild($('.inline-chat-overflow.monaco-editor'));
        super(location, {
            ...options,
            chatWidgetViewOptions: {
                ...options.chatWidgetViewOptions,
                editorOverflowWidgetsDomNode: overflowWidgetsNode,
            },
        }, instantiationService, contextKeyService, keybindingService, accessibilityService, configurationService, accessibleViewService, textModelResolverService, chatService, hoverService);
        this._parentEditor = _parentEditor;
        this._accessibleViewer = this._store.add(new MutableDisposable());
        this._store.add(toDisposable(() => {
            overflowWidgetsNode.remove();
        }));
    }
    // --- layout
    get contentHeight() {
        let result = super.contentHeight;
        if (this._accessibleViewer.value) {
            result += this._accessibleViewer.value.height + 8; /* padding */
        }
        return result;
    }
    _doLayout(dimension) {
        let newHeight = dimension.height;
        if (this._accessibleViewer.value) {
            this._accessibleViewer.value.width = dimension.width - 12;
            newHeight -= this._accessibleViewer.value.height + 8;
        }
        super._doLayout(dimension.with(undefined, newHeight));
        // update/fix the height of the zone which was set to newHeight in super._doLayout
        this._elements.root.style.height = `${dimension.height - this._getExtraHeight()}px`;
    }
    reset() {
        this._accessibleViewer.clear();
        super.reset();
    }
    // --- accessible viewer
    showAccessibleHunk(session, hunkData) {
        this._elements.accessibleViewer.classList.remove('hidden');
        this._accessibleViewer.clear();
        this._accessibleViewer.value = this._instantiationService.createInstance(HunkAccessibleDiffViewer, this._elements.accessibleViewer, session, hunkData, new AccessibleHunk(this._parentEditor, session, hunkData));
        this._onDidChangeHeight.fire();
    }
};
EditorBasedInlineChatWidget = __decorate([
    __param(3, IContextKeyService),
    __param(4, IKeybindingService),
    __param(5, IInstantiationService),
    __param(6, IAccessibilityService),
    __param(7, IConfigurationService),
    __param(8, IAccessibleViewService),
    __param(9, ITextModelService),
    __param(10, IChatService),
    __param(11, IHoverService),
    __param(12, ILayoutService)
], EditorBasedInlineChatWidget);
export { EditorBasedInlineChatWidget };
let HunkAccessibleDiffViewer = HunkAccessibleDiffViewer_1 = class HunkAccessibleDiffViewer extends AccessibleDiffViewer {
    set width(value) {
        this._width2.set(value, undefined);
    }
    constructor(parentNode, session, hunk, models, instantiationService) {
        const width = observableValue('width', 0);
        const diff = observableValue('diff', HunkAccessibleDiffViewer_1._asMapping(hunk));
        const diffs = derived((r) => [diff.read(r)]);
        const lines = Math.min(10, 8 + diff.get().changedLineCount);
        const height = models.getModifiedOptions().get(68 /* EditorOption.lineHeight */) * lines;
        super(parentNode, constObservable(true), () => { }, constObservable(false), width, constObservable(height), diffs, models, instantiationService);
        this.height = height;
        this._width2 = width;
        this._store.add(session.textModelN.onDidChangeContent(() => {
            diff.set(HunkAccessibleDiffViewer_1._asMapping(hunk), undefined);
        }));
    }
    static _asMapping(hunk) {
        const ranges0 = hunk.getRanges0();
        const rangesN = hunk.getRangesN();
        const originalLineRange = LineRange.fromRangeInclusive(ranges0[0]);
        const modifiedLineRange = LineRange.fromRangeInclusive(rangesN[0]);
        const innerChanges = [];
        for (let i = 1; i < ranges0.length; i++) {
            innerChanges.push(new RangeMapping(ranges0[i], rangesN[i]));
        }
        return new DetailedLineRangeMapping(originalLineRange, modifiedLineRange, innerChanges);
    }
};
HunkAccessibleDiffViewer = HunkAccessibleDiffViewer_1 = __decorate([
    __param(4, IInstantiationService)
], HunkAccessibleDiffViewer);
class AccessibleHunk {
    constructor(_editor, _session, _hunk) {
        this._editor = _editor;
        this._session = _session;
        this._hunk = _hunk;
    }
    getOriginalModel() {
        return this._session.textModel0;
    }
    getModifiedModel() {
        return this._session.textModelN;
    }
    getOriginalOptions() {
        return this._editor.getOptions();
    }
    getModifiedOptions() {
        return this._editor.getOptions();
    }
    originalReveal(range) {
        // throw new Error('Method not implemented.');
    }
    modifiedReveal(range) {
        this._editor.revealRangeInCenterIfOutsideViewport(range || this._hunk.getRangesN()[0], 0 /* ScrollType.Smooth */);
    }
    modifiedSetSelection(range) {
        // this._editor.revealRangeInCenterIfOutsideViewport(range, ScrollType.Smooth);
        // this._editor.setSelection(range);
    }
    modifiedFocus() {
        this._editor.focus();
    }
    getModifiedPosition() {
        return this._hunk.getRangesN()[0].getStartPosition();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lubGluZUNoYXQvYnJvd3Nlci9pbmxpbmVDaGF0V2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sQ0FBQyxFQUVELGdCQUFnQixFQUNoQixjQUFjLEVBQ2QsU0FBUyxFQUNULENBQUMsRUFDRCxLQUFLLEVBQ0wsVUFBVSxHQUNWLE1BQU0saUNBQWlDLENBQUE7QUFFeEMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbkcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFFMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sZUFBZSxFQUNmLGlCQUFpQixFQUNqQixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQ04sZUFBZSxFQUNmLE9BQU8sRUFHUCxlQUFlLEdBQ2YsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU5QyxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0saUZBQWlGLENBQUE7QUFLeEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBR3ZFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN2RSxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLFlBQVksR0FDWixNQUFNLGdEQUFnRCxDQUFBO0FBR3ZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsc0JBQXNC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