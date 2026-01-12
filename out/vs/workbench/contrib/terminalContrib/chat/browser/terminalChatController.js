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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0Q29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXQvYnJvd3Nlci90ZXJtaW5hbENoYXRDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzVGLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsb0NBQW9DLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDbEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2xFLE9BQU8sRUFDTiwwQkFBMEIsRUFHMUIsZ0JBQWdCLEdBRWhCLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFNUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBSTFFLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsVUFBVTs7YUFDckMsT0FBRSxHQUFHLGVBQWUsQUFBbEIsQ0FBa0I7SUFFcEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUEyQjtRQUNyQyxPQUFPLFFBQVEsQ0FBQyxlQUFlLENBQXlCLHdCQUFzQixDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ25GLENBQUM7SUFhRDs7O09BR0c7SUFDSCxJQUFJLGtCQUFrQjtRQUNyQixPQUFPLElBQUks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