/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { sendLLMMessage } from './llmMessage/sendLLMMessage.js';
import { sendLLMMessageToProviderImplementation } from './llmMessage/sendLLMMessage.impl.js';
// NODE IMPLEMENTATION - calls actual sendLLMMessage() and returns listeners to it
export class LLMMessageChannel {
    // stupidly, channels can't take in @IService
    constructor(metricsService) {
        this.metricsService = metricsService;
        // sendLLMMessage
        this.llmMessageEmitters = {
            onText: new Emitter(),
            onFinalMessage: new Emitter(),
            onError: new Emitter(),
        };
        // aborters for above
        this._infoOfRunningRequest = {};
        // list
        this.listEmitters = {
            ollama: {
                success: new Emitter(),
                error: new Emitter(),
            },
            openaiCompat: {
                success: new Emitter(),
                error: new Emitter(),
            },
        };
        this._callOllamaList = (params) => {
            const { requestId } = params;
            const emitters = this.listEmitters.ollama;
            const mainThreadParams = {
                ...params,
                onSuccess: (p) => {
                    emitters.success.fire({ requestId, ...p });
                },
                onError: (p) => {
                    emitters.error.fire({ requestId, ...p });
                },
            };
            sendLLMMessageToProviderImplementation.ollama.list(mainThreadParams);
        };
        this._callOpenAICompatibleList = (params) => {
            const { requestId, providerName } = params;
            const emitters = this.listEmitters.openaiCompat;
            const mainThreadParams = {
                ...params,
                onSuccess: (p) => {
                    emitters.success.fire({ requestId, ...p });
                },
                onError: (p) => {
                    emitters.error.fire({ requestId, ...p });
                },
            };
            sendLLMMessageToProviderImplementation[providerName].list(mainThreadParams);
        };
    }
    // browser uses this to listen for changes
    listen(_, event) {
        // text
        if (event === 'onText_sendLLMMessage')
            return this.llmMessageEmitters.onText.event;
        else if (event === 'onFinalMessage_sendLLMMessage')
            return this.llmMessageEmitters.onFinalMessage.event;
        else if (event === 'onError_sendLLMMessage')
            return this.llmMessageEmitters.onError.event;
        // list
        else if (event === 'onSuccess_list_ollama')
            return this.listEmitters.ollama.success.event;
        else if (event === 'onError_list_ollama')
            return this.listEmitters.ollama.error.event;
        else if (event === 'onSuccess_list_openAICompatible')
            return this.listEmitters.openaiCompat.success.event;
        else if (event === 'onError_list_openAICompatible')
            return this.listEmitters.openaiCompat.error.event;
        else
            throw new Error(`Event not found: ${event}`);
    }
    // browser uses this to call (see this.channel.call() in llmMessageService.ts for all usages)
    async call(_, command, params) {
        try {
            if (command === 'sendLLMMessage') {
                this._callSendLLMMessage(params);
            }
            else if (command === 'abort') {
                await this._callAbort(params);
            }
            else if (command === 'ollamaList') {
                this._callOllamaList(params);
            }
            else if (command === 'openAICompatibleList') {
                this._callOpenAICompatibleList(params);
            }
            else {
                throw new Error(`Void sendLLM: command "${command}" not recognized.`);
            }
        }
        catch (e) {
            console.log('llmMessageChannel: Call Error:', e);
        }
    }
    // the only place sendLLMMessage is actually called
    _callSendLLMMessage(params) {
        const { requestId } = params;
        if (!(requestId in this._infoOfRunningRequest))
            this._infoOfRunningRequest[requestId] = {
                waitForSend: undefined,
                abortRef: { current: null },
            };
        const mainThreadParams = {
            ...params,
            onText: (p) => {
                this.llmMessageEmitters.onText.fire({ requestId, ...p });
            },
            onFinalMessage: (p) => {
                this.llmMessageEmitters.onFinalMessage.fire({ requestId, ...p });
            },
            onError: (p) => {
                console.log('sendLLM: firing err');
                this.llmMessageEmitters.onError.fire({ requestId, ...p });
            },
            abortRef: this._infoOfRunningRequest[requestId].abortRef,
        };
        const p = sendLLMMessage(mainThreadParams, this.metricsService);
        this._infoOfRunningRequest[requestId].waitForSend = p;
    }
    async _callAbort(params) {
        const { requestId } = params;
        if (!(requestId in this._infoOfRunningRequest))
            return;
        const { waitForSend, abortRef } = this._infoOfRunningRequest[requestId];
        await waitForSend; // wait for the send to finish so we know abortRef was set
        abortRef?.current?.();
        delete this._infoOfRunningRequest[requestId];
    }
}
