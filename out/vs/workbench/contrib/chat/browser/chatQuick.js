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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFF1aWNrLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRRdWljay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQWUsSUFBSSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDNUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixpQkFBaUIsR0FDakIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDdkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFDTixrQkFBa0IsR0FFbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLGVBQWUsRUFDZixvQkFBb0IsRUFDcEIsb0JBQW9CLEdBQ3BCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUE0QyxZQUFZLEVBQUUsTUFBTSxXQUFXLENBQUE7QUFDbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzVDLE9BQU8sRUFBYSx1QkFBdUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRTNFLE9BQU8sRUFBaUIsWUFBWSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDdEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRW5ELElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWlCLFNBQVEsVUFBVTtJQVcvQyxZQUNxQixpQkFBc0QsRUFDNUQsV0FBMEMsRUFDakMsb0JBQTREO1FBRW5GLEtBQUssRUFBRSxDQUFBO1FBSjhCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDM0MsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDaEIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQVhuRSxnQkFBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ3pELGVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQTtJQWE1QyxDQUFDO0lBRUQsSUFBSSxPQUFPO1FBQ1YsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUVELElBQUksT0FBTztRQUNWLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBaUMsQ0FBQTtRQUM3RCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxPQUFPLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsTUFBTSxDQUFDLE9BQStCO1FBQ3JDLHVGQUF1RjtRQUN2RixzREFBc0Q7UUFDdEQsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNiLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNsQixzRkFBc0Y7WUFDdEYsMEVBQTBFO1lBQzFFLElBQUksT0FBTyxFQUFFLGNBQWMsRUFBRSxDQUFDO2dCQUM3QixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FDakMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxFQUFFO29CQUNoQyxJQUFJLENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxDQUFBO29CQUMvQixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDL0IsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FBQyxPQUErQjtRQUNuQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixJQUFJLElBQUksQ0FBQyxZQUFZLElBQUksT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDO2dCQUN6QyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUN6QixJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDNUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDN0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtnQkFDaEMsQ0FBQztnQkFDRCxPQUFNO1lBQ1AsQ0FBQztZQUNELE9BQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3BCLENBQUM7UUFFRCxNQUFNLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBRTdDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDeEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEdBQUcsa0JBQWtCLENBQUE7UUFDM0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFBO1FBQ2pDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRWhDLElBQUksQ0FBQyxVQUFVLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQ2pELElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUE7UUFFcEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUV2RSxrREFBa0Q7WUFDbEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzFDLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUN6QixDQUFDO1FBRUQsZUFBZSxDQUFDLEdBQUcsQ0FDbEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFO1lBQzFCLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUN6QixJQUFJLENBQUMsWUFBYSxDQUFDLElBQUksRUFBRSxDQUFBO1lBQ3pCLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFBO1lBQ3ZCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDeEIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFekIsSUFBSSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDcEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDNUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtZQUNoQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFDRCxLQUFLO1FBQ0osSUFBSSxDQUFDLFlBQVksRUFBRSxLQUFLLEVBQUUsQ0FBQTtJQUMzQixDQUFDO0lBQ0QsS0FBSztRQUNKLElBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUE7UUFDdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUE7SUFDeEIsQ0FBQztJQUNELEtBQUssQ0FBQyxjQUFjO1FBQ25CLE1BQU0sSUFBSSxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsQ0FBQTtRQUN2QyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDYixDQUFDO0NBQ0QsQ0FBQTtBQWpIWSxnQkFBZ0I7SUFZMUIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEscUJBQXFCLENBQUE7R0FkWCxnQkFBZ0IsQ0FpSDVCOztBQUVELElBQU0sU0FBUyxHQUFmLE1BQU0sU0FBVSxTQUFRLFVBQVU7O0lBQ2pDLG9EQUFvRDthQUM3Qyx1QkFBa0IsR0FBRyxHQUFHLEFBQU4sQ0FBTTthQUNQLDBCQUFxQixHQUFHLEdBQUcsQUFBTixDQUFNO0lBV25ELFlBQ3dCLG9CQUE0RCxFQUMvRCxpQkFBc0QsRUFDNUQsV0FBMEMsRUFDeEMsYUFBOEMsRUFDL0MsWUFBNEM7UUFFM0QsS0FBSyxFQUFFLENBQUE7UUFOaUMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUM5QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQzNDLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ3ZCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUM5QixpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQVYzQyx3QkFBbUIsR0FBbUMsSUFBSSxDQUFDLFNBQVMsQ0FDcEYsSUFBSSxpQkFBaUIsRUFBZSxDQUNwQyxDQUFBO1FBQ08sZ0NBQTJCLEdBQVksS0FBSyxDQUFBO0lBVXBELENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQTtRQUNyQixJQUFJLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQTtRQUN0QixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDbEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFRCxLQUFLLENBQUMsU0FBcUI7UUFDMUIsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQTtZQUN4QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUNoRCxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FDbkMsU0FBUyxJQUFJO29CQUNaLGVBQWUsRUFBRSxDQUFDO29CQUNsQixXQUFXLEVBQUUsQ0FBQztvQkFDZCxhQUFhLEVBQUUsQ0FBQztvQkFDaEIsU0FBUyxFQUFFLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQztpQkFDM0IsQ0FDRCxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSTtRQUNILElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzdCLGtGQUFrRjtRQUNsRix5Q0FBeUM7UUFDekMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUU7WUFDdkQsNkVBQTZFO1lBQzdFLHVFQUF1RTtZQUN2RSxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDakMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQSxDQUFDLGFBQWE7SUFDNUIsQ0FBQztJQUVELElBQUk7UUFDSCxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM1QixxRkFBcUY7UUFDckYsc0NBQXNDO1FBQ3RDLElBQUksSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLDJCQUEyQixHQUFHLEtBQUssQ0FBQTtZQUN4QyxJQUFJLENBQUMsTUFBTSxDQUFDLCtCQUErQixDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDL0QsQ0FBQztRQUNELElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDckMsSUFBSSxDQUFDLE1BQU0sQ0FBQyw2QkFBNkIsRUFBRSxDQUFBO1FBQzVDLENBQUM7SUFDRixDQUFDO0lBRUQsTUFBTSxDQUFDLE1BQW1CO1FBQ3pCLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLG9HQUFvRztZQUNwRyxNQUFNLElBQUksS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUE7UUFDbEQsQ0FBQztRQUNELE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDaEQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FDcEMsSUFBSSxpQkFBaUIsQ0FBQztZQUNyQixrQkFBa0I7WUFDbEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQzNELENBQUMsQ0FDRixDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQzNCLDBCQUEwQixDQUFDLGNBQWMsQ0FDeEMsVUFBVSxFQUNWLGlCQUFpQixDQUFDLEtBQUssRUFDdkIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLEVBQ3JCO1lBQ0MsVUFBVSxFQUFFLElBQUk7WUFDaEIsZ0JBQWdCLEVBQUUsSUFBSTtZQUN0QixXQUFXLEVBQUUsU0FBUztZQUN0QixLQUFLLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsYUFBYSxFQUFFO1lBQ2pELHFCQUFxQixFQUFFLElBQUk7U0FDM0IsRUFDRDtZQUNDLGNBQWMsRUFBRSxvQkFBb0I7WUFDcEMsY0FBYyxFQUFFLG9CQUFvQjtZQUNwQyxpQkFBaUIsRUFBRSwrQkFBK0I7WUFDbEQscUJBQXFCLEVBQUUsZUFBZTtZQUN0QyxzQkFBc0IsRUFBRSxnQkFBZ0I7U0FDeEMsQ0FDRCxDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMxQixJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM1QixJQUFJLENBQUMsTUFBTSxDQUFDLDRCQUE0QixDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDM0QsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ2xCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDekIsSUFBSSxJQUFJLENBQ1AsTUFBTSxFQUNOLEVBQUUsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxFQUNuRCxFQUFFLFdBQVcsZ0NBQXdCLEVBQUUsQ0FDdkMsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQy9CLENBQUM7SUFFRCxJQUFZLFNBQVM7UUFDcEIsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLHNCQUFzQixDQUFDLE1BQU0sR0FBRyxXQUFTLENBQUMscUJBQXFCLENBQUE7SUFDMUYsQ0FBQztJQUVPLGlCQUFpQixDQUFDLE1BQW1CO1FBQzVDLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLEVBQUU7WUFDaEQsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN6QixJQUFJLENBQUMsTUFBTSxDQUFDLCtCQUErQixDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDL0QsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLHVFQUF1RTtnQkFDdkUsK0RBQStEO2dCQUMvRCw0QkFBNEI7Z0JBQzVCLElBQUksQ0FBQywyQkFBMkIsR0FBRyxJQUFJLENBQUE7WUFDeEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDckQsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUN4RCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEUsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQTtRQUNoQyxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUN6QixJQUFJLENBQUMsTUFBTSxDQUFDLGtDQUFrQyxHQUFHLEtBQUssQ0FBQTtRQUN2RCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzNCLElBQUksQ0FBQyxDQUFDLFFBQVEsR0FBRyxXQUFTLENBQUMsa0JBQWtCLElBQUksQ0FBQyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQzlFLE9BQU07WUFDUCxDQUFDO1lBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUNyQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ25CLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUN6QixJQUFJLENBQUMsTUFBTSxDQUFDLGtDQUFrQyxHQUFHLElBQUksQ0FBQTtZQUNyRCxJQUFJLENBQUMsTUFBTSxDQUFDLDZCQUE2QixFQUFFLENBQUE7UUFDNUMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVztRQUNoQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUE7SUFDakMsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZO1FBQ2pCLE1BQU0sTUFBTSxHQUFHLE1BQU0sWUFBWSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNwRCxJQUFJLENBQUMsTUFBTSxFQUFFLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN2QyxPQUFNO1FBQ1AsQ0FBQztRQUVELEtBQUssTUFBTSxPQUFPLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO1lBQ2hELElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsS0FBSyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUM7Z0JBQ2xFLE1BQU0sT0FBTyxHQUFvQixFQUFFLENBQUE7Z0JBQ25DLEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ3BELElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxlQUFlLEVBQUUsQ0FBQzt3QkFDbkMsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7NEJBQ2hDLE9BQU8sQ0FBQyxJQUFJLENBQUM7Z0NBQ1osSUFBSSxFQUFFLFVBQVU7Z0NBQ2hCLEtBQUssRUFBRSxLQUFLO2dDQUNaLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRzs2QkFDYixDQUFDLENBQUE7d0JBQ0gsQ0FBQztvQkFDRixDQUFDO3lCQUFNLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxtQkFBbUIsRUFBRSxDQUFDO3dCQUM5QyxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQzs0QkFDaEMsSUFBSSx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dDQUNwQyxPQUFPLENBQUMsSUFBSSxDQUFDO29DQUNaLElBQUksRUFBRSxVQUFVO29DQUNoQixLQUFLLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO29DQUNuQixHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUc7aUNBQ2QsQ0FBQyxDQUFBOzRCQUNILENBQUM7aUNBQU0sQ0FBQztnQ0FDUCxPQUFPLENBQUMsSUFBSSxDQUFDO29DQUNaLElBQUksRUFBRSxjQUFjO29DQUNwQixLQUFLLEVBQUUsQ0FBQyxLQUFLLENBQUM7b0NBQ2QsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO2lDQUNiLENBQUMsQ0FBQTs0QkFDSCxDQUFDO3dCQUNGLENBQUM7b0JBQ0YsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7b0JBQ25CLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUNsQyxNQUFNLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFDMUIsT0FBTyxDQUFDLE9BQTZCLEVBQ3JDLE9BQU8sQ0FBQyxZQUFZLEVBQ3BCLE9BQU8sQ0FBQyxPQUFPLEVBQ2Y7b0JBQ0MsT0FBTztvQkFDUCxNQUFNLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNO29CQUMvQixTQUFTLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxTQUFTO2lCQUNyQyxDQUNELENBQUE7WUFDRixDQUFDO2lCQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzdCLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDaEQsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ25DLENBQUM7UUFDRCxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUE7SUFDcEIsQ0FBQztJQUVELFFBQVEsQ0FBQyxLQUFhLEVBQUUsU0FBcUI7UUFDNUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3ZDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDdEIsQ0FBQztJQUVELFVBQVU7UUFDVCxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVPLFdBQVc7UUFDbEIsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDN0YsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNqQixNQUFNLElBQUksS0FBSyxDQUFDLDhCQUE4QixDQUFDLENBQUE7UUFDaEQsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUE7SUFDckUsQ0FBQzs7QUF4UEksU0FBUztJQWVaLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxhQUFhLENBQUE7R0FuQlYsU0FBUyxDQXlQZCJ9