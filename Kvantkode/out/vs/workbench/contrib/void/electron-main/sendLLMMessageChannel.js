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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZExMTU1lc3NhZ2VDaGFubmVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2VsZWN0cm9uLW1haW4vc2VuZExMTU1lc3NhZ2VDaGFubmVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGO0FBTTFGLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQWdCakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRS9ELE9BQU8sRUFBRSxzQ0FBc0MsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTVGLGtGQUFrRjtBQUVsRixNQUFNLE9BQU8saUJBQWlCO0lBK0I3Qiw2Q0FBNkM7SUFDN0MsWUFBNkIsY0FBK0I7UUFBL0IsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBL0I1RCxpQkFBaUI7UUFDQSx1QkFBa0IsR0FBRztZQUNyQyxNQUFNLEVBQUUsSUFBSSxPQUFPLEVBQStCO1lBQ2xELGNBQWMsRUFBRSxJQUFJLE9BQU8sRUFBdUM7WUFDbEUsT0FBTyxFQUFFLElBQUksT0FBTyxFQUFnQztTQUNwRCxDQUFBO1FBRUQscUJBQXFCO1FBQ0osMEJBQXFCLEdBR2xDLEVBQUUsQ0FBQTtRQUVOLE9BQU87UUFDVSxpQkFBWSxHQUFHO1lBQy9CLE1BQU0sRUFBRTtnQkFDUCxPQUFPLEVBQUUsSUFBSSxPQUFPLEVBQXNEO2dCQUMxRSxLQUFLLEVBQUUsSUFBSSxPQUFPLEVBQW9EO2FBQ3RFO1lBQ0QsWUFBWSxFQUFFO2dCQUNiLE9BQU8sRUFBRSxJQUFJLE9BQU8sRUFBZ0U7Z0JBQ3BGLEtBQUssRUFBRSxJQUFJLE9BQU8sRUFBOEQ7YUFDaEY7U0FNRCxDQUFBO1FBOEVELG9CQUFlLEdBQUcsQ0FBQyxNQUFnRCxFQUFFLEVBQUU7WUFDdEUsTUFBTSxFQUFFLFNB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