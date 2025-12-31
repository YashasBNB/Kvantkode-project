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
var TerminalChatController_1;
import { Lazy } from '../../../../../base/common/lazy.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { IChatCodeBlockContextProviderService, showChatView } from '../../../chat/browser/chat.js';
import { IChatService } from '../../../chat/common/chatService.js';
import { isDetachedTerminalInstance, ITerminalService, } from '../../../terminal/browser/terminal.js';
import { TerminalChatWidget } from './terminalChatWidget.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
let TerminalChatController = class TerminalChatController extends Disposable {
    static { TerminalChatController_1 = this; }
    static { this.ID = 'terminal.chat'; }
    static get(instance) {
        return instance.getContribution(TerminalChatController_1.ID);
    }
    /**
     * The terminal chat widget for the controller, this will be undefined if xterm is not ready yet (ie. the
     * terminal is still initializing). This wraps the inline chat widget.
     */
    get terminalChatWidget() {
        return this._terminalChatWidget?.value;
    }
    get lastResponseContent() {
        return this._lastResponseContent;
    }
    get scopedContextKeyService() {
        return (this._terminalChatWidget?.value.inlineChatWidget.scopedContextKeyService ??
            this._contextKeyService);
    }
    constructor(_ctx, chatCodeBlockContextProviderService, _contextKeyService, _instantiationService, _terminalService) {
        super();
        this._ctx = _ctx;
        this._contextKeyService = _contextKeyService;
        this._instantiationService = _instantiationService;
        this._terminalService = _terminalService;
        this._forcedPlaceholder = undefined;
        this._register(chatCodeBlockContextProviderService.registerProvider({
            getCodeBlockContext: (editor) => {
                if (!editor || !this._terminalChatWidget?.hasValue || !this.hasFocus()) {
                    return;
                }
                return {
                    element: editor,
                    code: editor.getValue(),
                    codeBlockIndex: 0,
                    languageId: editor.getModel().getLanguageId(),
                };
            },
        }, 'terminal'));
    }
    xtermReady(xterm) {
        this._terminalChatWidget = new Lazy(() => {
            const chatWidget = this._register(this._instantiationService.createInstance(TerminalChatWidget, this._ctx.instance.domElement, this._ctx.instance, xterm));
            this._register(chatWidget.focusTracker.onDidFocus(() => {
                TerminalChatController_1.activeChatController = this;
                if (!isDetachedTerminalInstance(this._ctx.instance)) {
                    this._terminalService.setActiveInstance(this._ctx.instance);
                }
            }));
            this._register(chatWidget.focusTracker.onDidBlur(() => {
                TerminalChatController_1.activeChatController = undefined;
                this._ctx.instance.resetScrollbarVisibility();
            }));
            if (!this._ctx.instance.domElement) {
                throw new Error('FindWidget expected terminal DOM to be initialized');
            }
            return chatWidget;
        });
    }
    _updatePlaceholder() {
        const inlineChatWidget = this._terminalChatWidget?.value.inlineChatWidget;
        if (inlineChatWidget) {
            inlineChatWidget.placeholder = this._getPlaceholderText();
        }
    }
    _getPlaceholderText() {
        return this._forcedPlaceholder ?? '';
    }
    setPlaceholder(text) {
        this._forcedPlaceholder = text;
        this._updatePlaceholder();
    }
    resetPlaceholder() {
        this._forcedPlaceholder = undefined;
        this._updatePlaceholder();
    }
    updateInput(text, selectAll = true) {
        const widget = this._terminalChatWidget?.value.inlineChatWidget;
        if (widget) {
            widget.value = text;
            if (selectAll) {
                widget.selectAll();
            }
        }
    }
    focus() {
        this._terminalChatWidget?.value.focus();
    }
    hasFocus() {
        return this._terminalChatWidget?.rawValue?.hasFocus() ?? false;
    }
    async viewInChat() {
        const chatModel = this.terminalChatWidget?.inlineChatWidget.chatWidget.viewModel?.model;
        if (chatModel) {
            await this._instantiationService.invokeFunction(moveToPanelChat, chatModel);
        }
        this._terminalChatWidget?.rawValue?.hide();
    }
};
TerminalChatController = TerminalChatController_1 = __decorate([
    __param(1, IChatCodeBlockContextProviderService),
    __param(2, IContextKeyService),
    __param(3, IInstantiationService),
    __param(4, ITerminalService)
], TerminalChatController);
export { TerminalChatController };
async function moveToPanelChat(accessor, model) {
    const viewsService = accessor.get(IViewsService);
    const chatService = accessor.get(IChatService);
    const widget = await showChatView(viewsService);
    if (widget && widget.viewModel && model) {
        for (const request of model.getRequests().slice()) {
            await chatService.adoptRequest(widget.viewModel.model.sessionId, request);
        }
        widget.focusLastMessage();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0Q29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0L2Jyb3dzZXIvdGVybWluYWxDaGF0Q29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM1RixPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2xHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNsRSxPQUFPLEVBQ04sMEJBQTBCLEVBRzFCLGdCQUFnQixHQUVoQixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRTVELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUkxRSxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUF1QixTQUFRLFVBQVU7O2FBQ3JDLE9BQUUsR0FBRyxlQUFlLEFBQWxCLENBQWtCO0lBRXBDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBMkI7UUFDckMsT0FBTyxRQUFRLENBQUMsZUFBZSxDQUF5Qix3QkFBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUNuRixDQUFDO0lBYUQ7OztPQUdHO0lBQ0gsSUFBSSxrQkFBa0I7UUFDckIsT0FBTyxJQUFJLENBQUMs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