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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbmZpcm1hdGlvbkNvbnRlbnRQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0Q29uZmlybWF0aW9uQ29udGVudFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFFckcsT0FBTyxFQUdOLFlBQVksR0FDWixNQUFNLDZCQUE2QixDQUFBO0FBQ3BDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFDL0MsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFHN0QsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSxVQUFVO0lBTTFELFlBQ0MsWUFBK0IsRUFDL0IsT0FBc0MsRUFDZixvQkFBNEQsRUFDckUsV0FBMEMsRUFDcEMsaUJBQXFDO1FBRXpELEtBQUssRUFBRSxDQUFBO1FBSmlDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDcEQsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFQeEMsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDekQsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixD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