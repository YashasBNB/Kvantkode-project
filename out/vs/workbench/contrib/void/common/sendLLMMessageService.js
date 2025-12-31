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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZExMTU1lc3NhZ2VTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9jb21tb24vc2VuZExMTU1lc3NhZ2VTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBaUIxRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLHlEQUF5RCxDQUFBO0FBRWhFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDL0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRTdDLHNDQUFzQztBQUN0QyxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQXFCLG1CQUFtQixDQUFDLENBQUE7QUFVMUYscURBQXFEO0FBQzlDLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWtCLFNBQVEsVUFBVTtJQTJDaEQsWUFDc0Isa0JBQXdELEVBQ3ZELG1CQUEwRCxFQUVuRSxVQUF3QztRQUVyRCxLQUFLLEVBQUUsQ0FBQTtRQUwrQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3RDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFFbEQsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQTNDdEQsaUJBQWlCO1FBQ0Esb0JBQWUsR0FBRztZQUNsQyxNQUFNLEVBQUUsRUFBMEU7WUFDbEYsY0FBYyxFQUFFLEVBRWY7WUFD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