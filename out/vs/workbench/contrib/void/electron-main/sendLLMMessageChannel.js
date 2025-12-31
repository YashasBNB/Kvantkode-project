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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZExMTU1lc3NhZ2VDaGFubmVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9lbGVjdHJvbi1tYWluL3NlbmRMTE1NZXNzYWdlQ2hhbm5lbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQU0xRixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFnQmpFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsc0NBQXNDLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU1RixrRkFBa0Y7QUFFbEYsTUFBTSxPQUFPLGlCQUFpQjtJQStCN0IsNkNBQTZDO0lBQzdDLFlBQTZCLGNBQStCO1FBQS9CLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQS9CNUQsaUJBQWlCO1FBQ0EsdUJBQWtCLEdBQUc7WUFDckMsTUFBTSxFQUFFLElBQUksT0FBTyxFQUErQjtZQUNsRCxjQUFjLEVBQUUsSUFBSSxPQUFPLEVBQXVDO1lBQ2xFLE9BQU8sRUFBRSxJQUFJLE9BQU8sRUFBZ0M7U0FDcEQsQ0FBQTtRQUVELHFCQUFxQjtRQUNKLDBCQUFxQixHQUdsQyxFQUFFLENBQUE7UUFFTixPQUFPO1FBQ1UsaUJBQVksR0FBRztZQUMvQixNQUFNLEVBQUU7Z0JBQ1AsT0FBTyxFQUFFLElBQUksT0FBTyxFQUFzRDtnQkFDMUUsS0FBSyxFQUFFLElBQUksT0FBTyxFQUFvRDthQUN0RTtZQUNELFlBQVksRUFBRTtnQkFDYixPQUFPLEVBQUUsSUFBSSxPQUFPLEVBQWdFO2dCQUNwRixLQUFLLEVBQUUsSUFBSSxPQUFPLEVBQThEO2FBQ2hGO1NBTUQsQ0FBQTtRQThFRCxvQkFBZSxHQUFHLENBQUMsTUFBZ0QsRUFBRSxFQUFFO1lBQ3RFLE1BQU0sRUFBRSxTQUFTLEVB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