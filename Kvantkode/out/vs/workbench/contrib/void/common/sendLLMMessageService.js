/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IVoidSettingsService } from './voidSettingsService.js';
import { IMCPService } from './mcpService.js';
// calls channel to implement features
export const ILLMMessageService = createDecorator('llmMessageService');
// open this file side by side with llmMessageChannel
let LLMMessageService = class LLMMessageService extends Disposable {
    constructor(mainProcessService, voidSettingsService, mcpService) {
        super();
        this.mainProcessService = mainProcessService;
        this.voidSettingsService = voidSettingsService;
        this.mcpService = mcpService;
        // sendLLMMessage
        this.llmMessageHooks = {
            onText: {},
            onFinalMessage: {},
            onError: {},
            onAbort: {}, // NOT sent over the channel, result is instant when we call .abort()
        };
        // list hooks
        this.listHooks = {
            ollama: {
                success: {},
                error: {},
            },
            openAICompat: {
                success: {},
                error: {},
            },
        };
        this.ollamaList = (params) => {
            const { onSuccess, onError, ...proxyParams } = params;
            const { settingsOfProvider } = this.voidSettingsService.state;
            // add state for request id
            const requestId_ = generateUuid();
            this.listHooks.ollama.success[requestId_] = onSuccess;
            this.listHooks.ollama.error[requestId_] = onError;
            this.channel.call('ollamaList', {
                ...proxyParams,
                settingsOfProvider,
                providerName: 'ollama',
                requestId: requestId_,
            });
        };
        this.openAICompatibleList = (params) => {
            const { onSuccess, onError, ...proxyParams } = params;
            const { settingsOfProvider } = this.voidSettingsService.state;
            // add state for request id
            const requestId_ = generateUuid();
            this.listHooks.openAICompat.success[requestId_] = onSuccess;
            this.listHooks.openAICompat.error[requestId_] = onError;
            this.channel.call('openAICompatibleList', {
                ...proxyParams,
                settingsOfProvider,
                requestId: requestId_,
            });
        };
        // const service = ProxyChannel.toService<LLMMessageChannel>(mainProcessService.getChannel('void-channel-sendLLMMessage')); // lets you call it like a service
        // see llmMessageChannel.ts
        this.channel = this.mainProcessService.getChannel('void-channel-llmMessage');
        // .listen sets up an IPC channel and takes a few ms, so we set up listeners immediately and add hooks to them instead
        // llm
        this._register(this.channel.listen('onText_sendLLMMessage')((e) => {
            this.llmMessageHooks.onText[e.requestId]?.(e);
        }));
        this._register(this.channel.listen('onFinalMessage_sendLLMMessage')((e) => {
            this.llmMessageHooks.onFinalMessage[e.requestId]?.(e);
            this._clearChannelHooks(e.requestId);
        }));
        this._register(this.channel.listen('onError_sendLLMMessage')((e) => {
            this.llmMessageHooks.onError[e.requestId]?.(e);
            this._clearChannelHooks(e.requestId);
            console.error('Error in LLMMessageService:', JSON.stringify(e));
        }));
        // .list()
        this._register(this.channel.listen('onSuccess_list_ollama')((e) => {
            this.listHooks.ollama.success[e.requestId]?.(e);
        }));
        this._register(this.channel.listen('onError_list_ollama')((e) => {
            this.listHooks.ollama.error[e.requestId]?.(e);
        }));
        this._register(this.channel.listen('onSuccess_list_openAICompatible')((e) => {
            this.listHooks.openAICompat.success[e.requestId]?.(e);
        }));
        this._register(this.channel.listen('onError_list_openAICompatible')((e) => {
            this.listHooks.openAICompat.error[e.requestId]?.(e);
        }));
    }
    sendLLMMessage(params) {
        const { onText, onFinalMessage, onError, onAbort, modelSelection, ...proxyParams } = params;
        // throw an error if no model/provider selected (this should usually never be reached, the UI should check this first, but might happen in cases like Apply where we haven't built much UI/checks yet, good practice to have check logic on backend)
        if (modelSelection === null) {
            const message = `Please add a provider in KvantKode's Settings.`;
            onError({ message, fullError: null });
            return null;
        }
        if (params.messagesType === 'chatMessages' && (params.messages?.length ?? 0) === 0) {
            const message = `No messages detected.`;
            onError({ message, fullError: null });
            return null;
        }
        const { settingsOfProvider } = this.voidSettingsService.state;
        const mcpTools = this.mcpService.getMCPTools();
        // add state for request id
        const requestId = generateUuid();
        this.llmMessageHooks.onText[requestId] = onText;
        this.llmMessageHooks.onFinalMessage[requestId] = onFinalMessage;
        this.llmMessageHooks.onError[requestId] = onError;
        this.llmMessageHooks.onAbort[requestId] = onAbort; // used internally only
        // params will be stripped of all its functions over the IPC channel
        this.channel.call('sendLLMMessage', {
            ...proxyParams,
            requestId,
            settingsOfProvider,
            modelSelection,
            mcpTools,
        });
        return requestId;
    }
    abort(requestId) {
        this.llmMessageHooks.onAbort[requestId]?.(); // calling the abort hook here is instant (doesn't go over a channel)
        this.channel.call('abort', { requestId });
        this._clearChannelHooks(requestId);
    }
    _clearChannelHooks(requestId) {
        delete this.llmMessageHooks.onText[requestId];
        delete this.llmMessageHooks.onFinalMessage[requestId];
        delete this.llmMessageHooks.onError[requestId];
        delete this.listHooks.ollama.success[requestId];
        delete this.listHooks.ollama.error[requestId];
        delete this.listHooks.openAICompat.success[requestId];
        delete this.listHooks.openAICompat.error[requestId];
    }
};
LLMMessageService = __decorate([
    __param(0, IMainProcessService),
    __param(1, IVoidSettingsService),
    __param(2, IMCPService)
], LLMMessageService);
export { LLMMessageService };
registerSingleton(ILLMMessageService, LLMMessageService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZExMTU1lc3NhZ2VTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2NvbW1vbi9zZW5kTExNTWVzc2FnZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFpQjFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQ04saUJBQWlCLEdBRWpCLE1BQU0seURBQXlELENBQUE7QUFFaEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDM0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRTlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFFN0Msc0NBQXNDO0FBQ3RDLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLGVBQWUsQ0FBcUIsbUJBQW1CLENBQUMsQ0FBQTtBQVUxRixxREFBcUQ7QUFDOUMsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBa0IsU0FBUSxVQUFVO0lBMkNoRCxZQUNzQixrQkFBd0QsRUFDdkQsbUJBQTBELEVBRW5FLFVBQXdDO1FBRXJELEtBQUssRUFBRSxDQUFBO1FBTCtCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDdEMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFzQjtRQUVsRCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBM0N0RCxpQkFBaUI7UUFDQSxvQkFBZSxHQUFHO1lBQ2xDLE1BQU0sRUFBRSxFQUEwRTtZ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