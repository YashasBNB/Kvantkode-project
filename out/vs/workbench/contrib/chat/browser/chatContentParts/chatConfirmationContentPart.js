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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IChatService, } from '../../common/chatService.js';
import { isResponseVM } from '../../common/chatViewModel.js';
import { IChatWidgetService } from '../chat.js';
import { ChatConfirmationWidget } from './chatConfirmationWidget.js';
let ChatConfirmationContentPart = class ChatConfirmationContentPart extends Disposable {
    constructor(confirmation, context, instantiationService, chatService, chatWidgetService) {
        super();
        this.instantiationService = instantiationService;
        this.chatService = chatService;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        const element = context.element;
        const buttons = confirmation.buttons
            ? confirmation.buttons.map((button) => ({
                label: button,
                data: confirmation.data,
            }))
            : [
                { label: localize('accept', 'Accept'), data: confirmation.data },
                { label: localize('dismiss', 'Dismiss'), data: confirmation.data, isSecondary: true },
            ];
        const confirmationWidget = this._register(this.instantiationService.createInstance(ChatConfirmationWidget, confirmation.title, confirmation.message, buttons));
        confirmationWidget.setShowButtons(!confirmation.isUsed);
        this._register(confirmationWidget.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        this._register(confirmationWidget.onDidClick(async (e) => {
            if (isResponseVM(element)) {
                const prompt = `${e.label}: "${confirmation.title}"`;
                const options = e.isSecondary
                    ? { rejectedConfirmationData: [e.data] }
                    : { acceptedConfirmationData: [e.data] };
                options.agentId = element.agent?.id;
                options.slashCommand = element.slashCommand?.name;
                options.confirmation = e.label;
                const widget = chatWidgetService.getWidgetBySessionId(element.sessionId);
                options.userSelectedModelId = widget?.input.currentLanguageModel;
                options.mode = widget?.input.currentMode;
                if (await this.chatService.sendRequest(element.sessionId, prompt, options)) {
                    confirmation.isUsed = true;
                    confirmationWidget.setShowButtons(false);
                    this._onDidChangeHeight.fire();
                }
            }
        }));
        this.domNode = confirmationWidget.domNode;
    }
    hasSameContent(other) {
        // No other change allowed for this content type
        return other.kind === 'confirmation';
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatConfirmationContentPart = __decorate([
    __param(2, IInstantiationService),
    __param(3, IChatService),
    __param(4, IChatWidgetService)
], ChatConfirmationContentPart);
export { ChatConfirmationContentPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbmZpcm1hdGlvbkNvbnRlbnRQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdENvbmZpcm1hdGlvbkNvbnRlbnRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRXJHLE9BQU8sRUFHTixZQUFZLEdBQ1osTUFBTSw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDNUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQy9DLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRzdELElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTRCLFNBQVEsVUFBVTtJQU0xRCxZQUNDLFlBQStCLEVBQy9CLE9BQXNDLEVBQ2Ysb0JBQTRELEVBQ3JFLFdBQTBDLEVBQ3BDLGlCQUFxQztRQUV6RCxLQUFLLEVBQUUsQ0FBQTtRQUppQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ3BELGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBUHhDLHVCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ3pELHNCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxL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