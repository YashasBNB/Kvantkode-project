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
var QuickChat_1;
import * as dom from '../../../../base/browser/dom.js';
import { Sash } from '../../../../base/browser/ui/sash/sash.js';
import { disposableTimeout } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { editorBackground, inputBackground, quickInputBackground, quickInputForeground, } from '../../../../platform/theme/common/colorRegistry.js';
import { showChatView } from './chat.js';
import { ChatWidget } from './chatWidget.js';
import { isCellTextEditOperation } from '../common/chatModel.js';
import { IChatService } from '../common/chatService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { EDITOR_DRAG_AND_DROP_BACKGROUND } from '../../../common/theme.js';
import { ChatAgentLocation } from '../common/constants.js';
let QuickChatService = class QuickChatService extends Disposable {
    constructor(quickInputService, chatService, instantiationService) {
        super();
        this.quickInputService = quickInputService;
        this.chatService = chatService;
        this.instantiationService = instantiationService;
        this._onDidClose = this._register(new Emitter());
        this.onDidClose = this._onDidClose.event;
    }
    get enabled() {
        return !!this.chatService.isEnabled(ChatAgentLocation.Panel);
    }
    get focused() {
        const widget = this._input?.widget;
        if (!widget) {
            return false;
        }
        return dom.isAncestorOfActiveElement(widget);
    }
    toggle(options) {
        // If the input is already shown, hide it. This provides a toggle behavior of the quick
        // pick. This should not happen when there is a query.
        if (this.focused && !options?.query) {
            this.close();
        }
        else {
            this.open(options);
            // If this is a partial query, the value should be cleared when closed as otherwise it
            // would remain for the next time the quick chat is opened in any context.
            if (options?.isPartialQuery) {
                const disposable = this._store.add(Event.once(this.onDidClose)(() => {
                    this._currentChat?.clearValue();
                    this._store.delete(disposable);
                }));
            }
        }
    }
    open(options) {
        if (this._input) {
            if (this._currentChat && options?.query) {
                this._currentChat.focus();
                this._currentChat.setValue(options.query, options.selection);
                if (!options.isPartialQuery) {
                    this._currentChat.acceptInput();
                }
                return;
            }
            return this.focus();
        }
        const disposableStore = new DisposableStore();
        this._input = this.quickInputService.createQuickWidget();
        this._input.contextKey = 'chatInputVisible';
        this._input.ignoreFocusOut = true;
        disposableStore.add(this._input);
        this._container ??= dom.$('.interactive-session');
        this._input.widget = this._container;
        this._input.show();
        if (!this._currentChat) {
            this._currentChat = this.instantiationService.createInstance(QuickChat);
            // show needs to come after the quickpick is shown
            this._currentChat.render(this._container);
        }
        else {
            this._currentChat.show();
        }
        disposableStore.add(this._input.onDidHide(() => {
            disposableStore.dispose();
            this._currentChat.hide();
            this._input = undefined;
            this._onDidClose.fire();
        }));
        this._currentChat.focus();
        if (options?.query) {
            this._currentChat.setValue(options.query, options.selection);
            if (!options.isPartialQuery) {
                this._currentChat.acceptInput();
            }
        }
    }
    focus() {
        this._currentChat?.focus();
    }
    close() {
        this._input?.dispose();
        this._input = undefined;
    }
    async openInChatView() {
        await this._currentChat?.openChatView();
        this.close();
    }
};
QuickChatService = __decorate([
    __param(0, IQuickInputService),
    __param(1, IChatService),
    __param(2, IInstantiationService)
], QuickChatService);
export { QuickChatService };
let QuickChat = class QuickChat extends Disposable {
    static { QuickChat_1 = this; }
    // TODO@TylerLeonhardt: be responsive to window size
    static { this.DEFAULT_MIN_HEIGHT = 200; }
    static { this.DEFAULT_HEIGHT_OFFSET = 100; }
    constructor(instantiationService, contextKeyService, chatService, layoutService, viewsService) {
        super();
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.chatService = chatService;
        this.layoutService = layoutService;
        this.viewsService = viewsService;
        this.maintainScrollTimer = this._register(new MutableDisposable());
        this._deferUpdatingDynamicLayout = false;
    }
    clear() {
        this.model?.dispose();
        this.model = undefined;
        this.updateModel();
        this.widget.inputEditor.setValue('');
    }
    focus(selection) {
        if (this.widget) {
            this.widget.focusInput();
            const value = this.widget.inputEditor.getValue();
            if (value) {
                this.widget.inputEditor.setSelection(selection ?? {
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: value.length + 1,
                });
            }
        }
    }
    hide() {
        this.widget.setVisible(false);
        // Maintain scroll position for a short time so that if the user re-shows the chat
        // the same scroll position will be used.
        this.maintainScrollTimer.value = disposableTimeout(() => {
            // At this point, clear this mutable disposable which will be our signal that
            // the timer has expired and we should stop maintaining scroll position
            this.maintainScrollTimer.clear();
        }, 30 * 1000); // 30 seconds
    }
    show() {
        this.widget.setVisible(true);
        // If the mutable disposable is set, then we are keeping the existing scroll position
        // so we should not update the layout.
        if (this._deferUpdatingDynamicLayout) {
            this._deferUpdatingDynamicLayout = false;
            this.widget.updateDynamicChatTreeItemLayout(2, this.maxHeight);
        }
        if (!this.maintainScrollTimer.value) {
            this.widget.layoutDynamicChatTreeItemMode();
        }
    }
    render(parent) {
        if (this.widget) {
            // NOTE: if this changes, we need to make sure disposables in this function are tracked differently.
            throw new Error('Cannot render quick chat twice');
        }
        const scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([
            IContextKeyService,
            this._register(this.contextKeyService.createScoped(parent)),
        ])));
        this.widget = this._register(scopedInstantiationService.createInstance(ChatWidget, ChatAgentLocation.Panel, { isQuickChat: true }, {
            autoScroll: true,
            renderInputOnTop: true,
            renderStyle: 'compact',
            menus: { inputSideToolbar: MenuId.ChatInputSide },
            enableImplicitContext: true,
        }, {
            listForeground: quickInputForeground,
            listBackground: quickInputBackground,
            overlayBackground: EDITOR_DRAG_AND_DROP_BACKGROUND,
            inputEditorBackground: inputBackground,
            resultEditorBackground: editorBackground,
        }));
        this.widget.render(parent);
        this.widget.setVisible(true);
        this.widget.setDynamicChatTreeItemLayout(2, this.maxHeight);
        this.updateModel();
        this.sash = this._register(new Sash(parent, { getHorizontalSashTop: () => parent.offsetHeight }, { orientation: 1 /* Orientation.HORIZONTAL */ }));
        this.registerListeners(parent);
    }
    get maxHeight() {
        return this.layoutService.mainContainerDimension.height - QuickChat_1.DEFAULT_HEIGHT_OFFSET;
    }
    registerListeners(parent) {
        this._register(this.layoutService.onDidLayoutMainContainer(() => {
            if (this.widget.visible) {
                this.widget.updateDynamicChatTreeItemLayout(2, this.maxHeight);
            }
            else {
                // If the chat is not visible, then we should defer updating the layout
                // because it relies on offsetHeight which only works correctly
                // when the chat is visible.
                this._deferUpdatingDynamicLayout = true;
            }
        }));
        this._register(this.widget.inputEditor.onDidChangeModelContent((e) => {
            this._currentQuery = this.widget.inputEditor.getValue();
        }));
        this._register(this.widget.onDidClear(() => this.clear()));
        this._register(this.widget.onDidChangeHeight((e) => this.sash.layout()));
        const width = parent.offsetWidth;
        this._register(this.sash.onDidStart(() => {
            this.widget.isDynamicChatTreeItemLayoutEnabled = false;
        }));
        this._register(this.sash.onDidChange((e) => {
            if (e.currentY < QuickChat_1.DEFAULT_MIN_HEIGHT || e.currentY > this.maxHeight) {
                return;
            }
            this.widget.layout(e.currentY, width);
            this.sash.layout();
        }));
        this._register(this.sash.onDidReset(() => {
            this.widget.isDynamicChatTreeItemLayoutEnabled = true;
            this.widget.layoutDynamicChatTreeItemMode();
        }));
    }
    async acceptInput() {
        return this.widget.acceptInput();
    }
    async openChatView() {
        const widget = await showChatView(this.viewsService);
        if (!widget?.viewModel || !this.model) {
            return;
        }
        for (const request of this.model.getRequests()) {
            if (request.response?.response.value || request.response?.result) {
                const message = [];
                for (const item of request.response.response.value) {
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
                this.chatService.addCompleteRequest(widget.viewModel.sessionId, request.message, request.variableData, request.attempt, {
                    message,
                    result: request.response.result,
                    followups: request.response.followups,
                });
            }
            else if (request.message) {
            }
        }
        const value = this.widget.inputEditor.getValue();
        if (value) {
            widget.inputEditor.setValue(value);
        }
        widget.focusInput();
    }
    setValue(value, selection) {
        this.widget.inputEditor.setValue(value);
        this.focus(selection);
    }
    clearValue() {
        this.widget.inputEditor.setValue('');
    }
    updateModel() {
        this.model ??= this.chatService.startSession(ChatAgentLocation.Panel, CancellationToken.None);
        if (!this.model) {
            throw new Error('Could not start chat session');
        }
        this.widget.setModel(this.model, { inputValue: this._currentQuery });
    }
};
QuickChat = QuickChat_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, IContextKeyService),
    __param(2, IChatService),
    __param(3, ILayoutService),
    __param(4, IViewsService)
], QuickChat);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFF1aWNrLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdFF1aWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBZSxJQUFJLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLGlCQUFpQixHQUNqQixNQUFNLHNDQUFzQyxDQUFBO0FBRTdDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUNOLGtCQUFrQixHQUVsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsZUFBZSxFQUNmLG9CQUFvQixFQUNwQixvQkFBb0IsR0FDcEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQTRDLFlBQVksRUFBRSxNQUFNLFdBQVcsQ0FBQTtBQUNsRixPQUFP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