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
import { Dimension, getActiveWindow, trackFocus, } from '../../../../../base/browser/dom.js';
import { createCancelablePromise, DeferredPromise, } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable, } from '../../../../../base/common/lifecycle.js';
import { autorun, observableValue, } from '../../../../../base/common/observable.js';
import { MicrotaskDelay } from '../../../../../base/common/symbols.js';
import { localize } from '../../../../../nls.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IContextKeyService, } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { showChatView } from '../../../chat/browser/chat.js';
import { IChatAgentService } from '../../../chat/common/chatAgents.js';
import { isCellTextEditOperation, } from '../../../chat/common/chatModel.js';
import { IChatService } from '../../../chat/common/chatService.js';
import { ChatAgentLocation } from '../../../chat/common/constants.js';
import { InlineChatWidget } from '../../../inlineChat/browser/inlineChatWidget.js';
import { MENU_INLINE_CHAT_WIDGET_SECONDARY } from '../../../inlineChat/common/inlineChat.js';
import { TerminalStickyScrollContribution } from '../../stickyScroll/browser/terminalStickyScrollContribution.js';
import './media/terminalChatWidget.css';
import { MENU_TERMINAL_CHAT_WIDGET_INPUT_SIDE_TOOLBAR, MENU_TERMINAL_CHAT_WIDGET_STATUS, TerminalChatContextKeys, } from './terminalChat.js';
var Constants;
(function (Constants) {
    Constants[Constants["HorizontalMargin"] = 10] = "HorizontalMargin";
    Constants[Constants["VerticalMargin"] = 30] = "VerticalMargin";
    /** The right padding of the widget, this should align exactly with that in the editor. */
    Constants[Constants["RightPadding"] = 12] = "RightPadding";
    /** The max allowed height of the widget. */
    Constants[Constants["MaxHeight"] = 480] = "MaxHeight";
    /** The max allowed height of the widget as a percentage of the terminal viewport. */
    Constants[Constants["MaxHeightPercentageOfViewport"] = 0.75] = "MaxHeightPercentageOfViewport";
})(Constants || (Constants = {}));
var Message;
(function (Message) {
    Message[Message["None"] = 0] = "None";
    Message[Message["AcceptSession"] = 1] = "AcceptSession";
    Message[Message["CancelSession"] = 2] = "CancelSession";
    Message[Message["PauseSession"] = 4] = "PauseSession";
    Message[Message["CancelRequest"] = 8] = "CancelRequest";
    Message[Message["CancelInput"] = 16] = "CancelInput";
    Message[Message["AcceptInput"] = 32] = "AcceptInput";
    Message[Message["ReturnInput"] = 64] = "ReturnInput";
})(Message || (Message = {}));
let TerminalChatWidget = class TerminalChatWidget extends Disposable {
    get inlineChatWidget() {
        return this._inlineChatWidget;
    }
    get lastResponseContent() {
        return this._lastResponseContent;
    }
    constructor(_terminalElement, _instance, _xterm, contextKeyService, _chatService, _storageService, _viewsService, instantiationService, _chatAgentService) {
        super();
        this._terminalElement = _terminalElement;
        this._instance = _instance;
        this._xterm = _xterm;
        this._chatService = _chatService;
        this._storageService = _storageService;
        this._viewsService = _viewsService;
        this._chatAgentService = _chatAgentService;
        this._onDidHide = this._register(new Emitter());
        this.onDidHide = this._onDidHide.event;
        this._messages = this._store.add(new Emitter());
        this._viewStateStorageKey = 'terminal-inline-chat-view-state';
        this._terminalAgentName = 'terminal';
        this._model = this._register(new MutableDisposable());
        this._requestInProgress = observableValue(this, false);
        this.requestInProgress = this._requestInProgress;
        this._focusedContextKey = TerminalChatContextKeys.focused.bindTo(contextKeyService);
        this._visibleContextKey = TerminalChatContextKeys.visible.bindTo(contextKeyService);
        this._requestActiveContextKey = TerminalChatContextKeys.requestActive.bindTo(contextKeyService);
        this._responseContainsCodeBlockContextKey =
            TerminalChatContextKeys.responseContainsCodeBlock.bindTo(contextKeyService);
        this._responseContainsMulitpleCodeBlocksContextKey =
            TerminalChatContextKeys.responseContainsMultipleCodeBlocks.bindTo(contextKeyService);
        this._container = document.createElement('div');
        this._container.classList.add('terminal-inline-chat');
        this._terminalElement.appendChild(this._container);
        this._inlineChatWidget = instantiationService.createInstance(InlineChatWidget, {
            location: ChatAgentLocation.Terminal,
            resolveData: () => {
                // TODO@meganrogge return something that identifies this terminal
                return undefined;
            },
        }, {
            statusMenuId: {
                menu: MENU_TERMINAL_CHAT_WIDGET_STATUS,
                options: {
                    buttonConfigProvider: (action) => ({
                        showLabel: action.id !== "workbench.action.terminal.chat.rerunRequest" /* TerminalChatCommandId.RerunRequest */,
                        showIcon: action.id === "workbench.action.terminal.chat.rerunRequest" /* TerminalChatCommandId.RerunRequest */,
                        isSecondary: action.id !== "workbench.action.terminal.chat.runCommand" /* TerminalChatCommandId.RunCommand */ &&
                            action.id !== "workbench.action.terminal.chat.runFirstCommand" /* TerminalChatCommandId.RunFirstCommand */,
                    }),
                },
            },
            secondaryMenuId: MENU_INLINE_CHAT_WIDGET_SECONDARY,
            chatWidgetViewOptions: {
                menus: {
                    telemetrySource: 'terminal-inline-chat',
                    executeToolbar: MenuId.ChatExecute,
                    inputSideToolbar: MENU_TERMINAL_CHAT_WIDGET_INPUT_SIDE_TOOLBAR,
                },
            },
        });
        this._register(this._inlineChatWidget.chatWidget.onDidChangeViewModel(() => this._saveViewState()));
        this._register(Event.any(this._inlineChatWidget.onDidChangeHeight, this._instance.onDimensionsChanged, this._inlineChatWidget.chatWidget.onDidChangeContentHeight, Event.debounce(this._xterm.raw.onCursorMove, () => void 0, MicrotaskDelay))(() => this._relayout()));
        const observer = new ResizeObserver(() => this._relayout());
        observer.observe(this._terminalElement);
        this._register(toDisposable(() => observer.disconnect()));
        this._resetPlaceholder();
        this._container.appendChild(this._inlineChatWidget.domNode);
        this._focusTracker = this._register(trackFocus(this._container));
        this._register(this._focusTracker.onDidFocus(() => this._focusedContextKey.set(true)));
        this._register(this._focusTracker.onDidBlur(() => this._focusedContextKey.set(false)));
        this._register(autorun((r) => {
            const isBusy = this._inlineChatWidget.requestInProgress.read(r);
            this._container.classList.toggle('busy', isBusy);
            this._inlineChatWidget.toggleStatus(!!this._inlineChatWidget.responseContent);
            if (isBusy || !this._inlineChatWidget.responseContent) {
                this._responseContainsCodeBlockContextKey.set(false);
                this._responseContainsMulitpleCodeBlocksContextKey.set(false);
            }
            else {
                Promise.all([
                    this._inlineChatWidget.getCodeBlockInfo(0),
                    this._inlineChatWidget.getCodeBlockInfo(1),
                ]).then(([firstCodeBlock, secondCodeBlock]) => {
                    this._responseContainsCodeBlockContextKey.set(!!firstCodeBlock);
                    this._responseContainsMulitpleCodeBlocksContextKey.set(!!secondCodeBlock);
                    this._inlineChatWidget.updateToolbar(true);
                });
            }
        }));
        this.hide();
    }
    _relayout() {
        if (this._dimension) {
            this._doLayout();
        }
    }
    _doLayout() {
        const xtermElement = this._xterm.raw.element;
        if (!xtermElement) {
            return;
        }
        const style = getActiveWindow().getComputedStyle(xtermElement);
        // Calculate width
        const xtermLeftPadding = parseInt(style.paddingLeft);
        const width = xtermElement.clientWidth - xtermLeftPadding - 12 /* Constants.RightPadding */;
        if (width === 0) {
            return;
        }
        // Calculate height
        const terminalViewportHeight = this._getTerminalViewportHeight();
        const widgetAllowedPercentBasedHeight = (terminalViewportHeight ?? 0) * 0.75 /* Constants.MaxHeightPercentageOfViewport */;
        const height = Math.max(Math.min(480 /* Constants.MaxHeight */, this._inlineChatWidget.contentHeight, widgetAllowedPercentBasedHeight), this._inlineChatWidget.minHeight);
        if (height === 0) {
            return;
        }
        // Layout
        this._dimension = new Dimension(width, height);
        this._inlineChatWidget.layout(this._dimension);
        this._inlineChatWidget.domNode.style.paddingLeft = `${xtermLeftPadding}px`;
        this._updateXtermViewportPosition();
    }
    _resetPlaceholder() {
        const defaultAgent = this._chatAgentService.getDefaultAgent(ChatAgentLocation.Terminal);
        this.inlineChatWidget.placeholder = defaultAgent?.description ?? localize('askAI', 'Ask AI');
    }
    async reveal(viewState) {
        await this._createSession(viewState);
        this._doLayout();
        this._container.classList.remove('hide');
        this._visibleContextKey.set(true);
        this._resetPlaceholder();
        this._inlineChatWidget.focus();
        this._instance.scrollToBottom();
    }
    _getTerminalCursorTop() {
        const font = this._instance.xterm?.getFont();
        if (!font?.charHeight) {
            return;
        }
        const terminalWrapperHeight = this._getTerminalViewportHeight() ?? 0;
        const cellHeight = font.charHeight * font.lineHeight;
        const topPadding = terminalWrapperHeight - this._instance.rows * cellHeight;
        const cursorY = (this._instance.xterm?.raw.buffer.active.cursorY ?? 0) + 1;
        return topPadding + cursorY * cellHeight;
    }
    _updateXtermViewportPosition() {
        const top = this._getTerminalCursorTop();
        if (!top) {
            return;
        }
        this._container.style.top = `${top}px`;
        const terminalViewportHeight = this._getTerminalViewportHeight();
        if (!terminalViewportHeight) {
            return;
        }
        const widgetAllowedPercentBasedHeight = terminalViewportHeight * 0.75 /* Constants.MaxHeightPercentageOfViewport */;
        const height = Math.max(Math.min(480 /* Constants.MaxHeight */, this._inlineChatWidget.contentHeight, widgetAllowedPercentBasedHeight), this._inlineChatWidget.minHeight);
        if (top > terminalViewportHeight - height && terminalViewportHeight - height > 0) {
            this._setTerminalViewportOffset(top - (terminalViewportHeight - height));
        }
        else {
            this._setTerminalViewportOffset(undefined);
        }
    }
    _getTerminalViewportHeight() {
        return this._terminalElement.clientHeight;
    }
    hide() {
        this._container.classList.add('hide');
        this._inlineChatWidget.reset();
        this._resetPlaceholder();
        this._inlineChatWidget.updateToolbar(false);
        this._visibleContextKey.set(false);
        this._inlineChatWidget.value = '';
        this._instance.focus();
        this._setTerminalViewportOffset(undefined);
        this._onDidHide.fire();
    }
    _setTerminalViewportOffset(offset) {
        if (offset === undefined || this._container.classList.contains('hide')) {
            this._terminalElement.style.position = '';
            this._terminalElement.style.bottom = '';
            TerminalStickyScrollContribution.get(this._instance)?.hideUnlock();
        }
        else {
            this._terminalElement.style.position = 'relative';
            this._terminalElement.style.bottom = `${offset}px`;
            TerminalStickyScrollContribution.get(this._instance)?.hideLock();
        }
    }
    focus() {
        this.inlineChatWidget.focus();
    }
    hasFocus() {
        return this._inlineChatWidget.hasFocus();
    }
    setValue(value) {
        this._inlineChatWidget.value = value ?? '';
    }
    async acceptCommand(shouldExecute) {
        const code = await this.inlineChatWidget.getCodeBlockInfo(0);
        if (!code) {
            return;
        }
        const value = code.getValue();
        this._instance.runCommand(value, shouldExecute);
        this.clear();
    }
    get focusTracker() {
        return this._focusTracker;
    }
    async _createSession(viewState) {
        this._sessionCtor = createCancelablePromise(async (token) => {
            if (!this._model.value) {
                this._model.value = this._chatService.startSession(ChatAgentLocation.Terminal, token);
                const model = this._model.value;
                if (model) {
                    this._inlineChatWidget.setChatModel(model, this._loadViewState());
                    model.waitForInitialization().then(() => {
                        if (token.isCancellationRequested) {
                            return;
                        }
                        this._resetPlaceholder();
                    });
                }
                if (!this._model.value) {
                    throw new Error('Failed to start chat session');
                }
            }
        });
        this._register(toDisposable(() => this._sessionCtor?.cancel()));
    }
    _loadViewState() {
        const rawViewState = this._storageService.get(this._viewStateStorageKey, 0 /* StorageScope.PROFILE */, undefined);
        let viewState;
        if (rawViewState) {
            try {
                viewState = JSON.parse(rawViewState);
            }
            catch {
                viewState = undefined;
            }
        }
        return viewState;
    }
    _saveViewState() {
        this._storageService.store(this._viewStateStorageKey, JSON.stringify(this._inlineChatWidget.chatWidget.getViewState()), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    clear() {
        this.cancel();
        this._model.clear();
        this._responseContainsCodeBlockContextKey.reset();
        this._requestActiveContextKey.reset();
        this.hide();
        this.setValue(undefined);
    }
    async acceptInput(query, options) {
        if (!this._model.value) {
            await this.reveal();
        }
        this._messages.fire(32 /* Message.AcceptInput */);
        const lastInput = this._inlineChatWidget.value;
        if (!lastInput) {
            return;
        }
        this._activeRequestCts?.cancel();
        this._activeRequestCts = new CancellationTokenSource();
        const store = new DisposableStore();
        this._requestActiveContextKey.set(true);
        const response = await this._inlineChatWidget.chatWidget.acceptInput(lastInput, {
            isVoiceInput: options?.isVoiceInput,
        });
        this._currentRequestId = response?.requestId;
        const responsePromise = new DeferredPromise();
        try {
            this._requestActiveContextKey.set(true);
            if (response) {
                store.add(response.onDidChange(async () => {
                    if (response.isCanceled) {
                        this._requestActiveContextKey.set(false);
                        responsePromise.complete(undefined);
                        return;
                    }
                    if (response.isComplete) {
                        this._requestActiveContextKey.set(false);
                        this._requestActiveContextKey.set(false);
                        const firstCodeBlock = await this._inlineChatWidget.getCodeBlockInfo(0);
                        const secondCodeBlock = await this._inlineChatWidget.getCodeBlockInfo(1);
                        this._responseContainsCodeBlockContextKey.set(!!firstCodeBlock);
                        this._responseContainsMulitpleCodeBlocksContextKey.set(!!secondCodeBlock);
                        this._inlineChatWidget.updateToolbar(true);
                        responsePromise.complete(response);
                    }
                }));
            }
            await responsePromise.p;
            this._lastResponseContent = response?.response.getMarkdown();
            return response;
        }
        catch {
            this._lastResponseContent = undefined;
            return;
        }
        finally {
            store.dispose();
        }
    }
    cancel() {
        this._sessionCtor?.cancel();
        this._sessionCtor = undefined;
        this._activeRequestCts?.cancel();
        this._requestActiveContextKey.set(false);
        const model = this._inlineChatWidget.getChatModel();
        if (!model?.sessionId) {
            return;
        }
        this._chatService.cancelCurrentRequestForSession(model?.sessionId);
    }
    async viewInChat() {
        const widget = await showChatView(this._viewsService);
        const currentRequest = this._inlineChatWidget.chatWidget.viewModel?.model
            .getRequests()
            .find((r) => r.id === this._currentRequestId);
        if (!widget || !currentRequest?.response) {
            return;
        }
        const message = [];
        for (const item of currentRequest.response.response.value) {
            if (item.kind === 'textEditGroup') {
                for (const group of item.edits) {
                    message.push({
                        kind: 'textEdit',
                        edits: group,
                        uri: item.uri,
                    });
                }
            }
            else if (item.kind === 'notebookEditGroup') {
                for (const group of item.edits) {
                    if (isCellTextEditOperation(group)) {
                        message.push({
                            kind: 'textEdit',
                            edits: [group.edit],
                            uri: group.uri,
                        });
                    }
                    else {
                        message.push({
                            kind: 'notebookEdit',
                            edits: [group],
                            uri: item.uri,
                        });
                    }
                }
            }
            else {
                message.push(item);
            }
        }
        this._chatService.addCompleteRequest(widget.viewModel.sessionId, `@${this._terminalAgentName} ${currentRequest.message.text}`, currentRequest.variableData, currentRequest.attempt, {
            message,
            result: currentRequest.response.result,
            followups: currentRequest.response.followups,
        });
        widget.focusLastMessage();
        this.hide();
    }
};
TerminalChatWidget = __decorate([
    __param(3, IContextKeyService),
    __param(4, IChatService),
    __param(5, IStorageService),
    __param(6, IViewsService),
    __param(7, IInstantiationService),
    __param(8, IChatAgentService)
], TerminalChatWidget);
export { TerminalChatWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0V2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXQvYnJvd3Nlci90ZXJtaW5hbENoYXRXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUNOLFNBQVMsRUFDVCxlQUFlLEVBRWYsVUFBVSxHQUNWLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUVOLHVCQUF1QixFQUN2QixlQUFlLEdBQ2YsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUNmLGlCQUFpQixFQUNqQixZQUFZLEdBQ1osTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQ04sT0FBTyxFQUNQLGVBQWUsR0FFZixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzFFLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8s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