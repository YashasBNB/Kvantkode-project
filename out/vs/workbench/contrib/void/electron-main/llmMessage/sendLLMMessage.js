/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { displayInfoOfProviderName } from '../../common/voidSettingsTypes.js';
import { sendLLMMessageToProviderImplementation } from './sendLLMMessage.impl.js';
export const sendLLMMessage = async ({ messagesType, messages: messages_, onText: onText_, onFinalMessage: onFinalMessage_, onError: onError_, abortRef: abortRef_, logging: { loggingName, loggingExtras }, settingsOfProvider, modelSelection, modelSelectionOptions, overridesOfModel, chatMode, separateSystemMessage, mcpTools, }, metricsService) => {
    const { providerName, modelName } = modelSelection;
    // only captures number of messages and message "shape", no actual code, instructions, prompts, etc
    const captureLLMEvent = (eventId, extras) => {
        metricsService.capture(eventId, {
            providerName,
            modelName,
            customEndpointURL: settingsOfProvider[providerName]?.endpoint,
            numModelsAtEndpoint: settingsOfProvider[providerName]?.models?.length,
            ...(messagesType === 'chatMessages'
                ? {
                    numMessages: messages_?.length,
                }
                : messagesType === 'FIMMessage'
                    ? {
                        prefixLength: messages_.prefix.length,
                        suffixLength: messages_.suffix.length,
                    }
                    : {}),
            ...loggingExtras,
            ...extras,
        });
    };
    const submit_time = new Date();
    let _fullTextSoFar = '';
    let _aborter = null;
    let _setAborter = (fn) => {
        _aborter = fn;
    };
    let _didAbort = false;
    const onText = (params) => {
        const { fullText } = params;
        if (_didAbort)
            return;
        onText_(params);
        _fullTextSoFar = fullText;
    };
    const onFinalMessage = (params) => {
        const { fullText, fullReasoning, toolCall } = params;
        if (_didAbort)
            return;
        captureLLMEvent(`${loggingName} - Received Full Message`, {
            messageLength: fullText.length,
            reasoningLength: fullReasoning?.length,
            duration: new Date().getMilliseconds() - submit_time.getMilliseconds(),
            toolCallName: toolCall?.name,
        });
        onFinalMessage_(params);
    };
    const onError = ({ message: errorMessage, fullError }) => {
        if (_didAbort)
            return;
        console.error('sendLLMMessage onError:', errorMessage);
        // handle failed to fetch errors, which give 0 information by design
        if (errorMessage === 'TypeError: fetch failed')
            errorMessage = `Failed to fetch from ${displayInfoOfProviderName(providerName).title}. This likely means you specified the wrong endpoint in KvantKode's Settings, or your local model provider like Ollama is powered off.`;
        captureLLMEvent(`${loggingName} - Error`, { error: errorMessage });
        onError_({ message: errorMessage, fullError });
    };
    // we should NEVER call onAbort internally, only from the outside
    const onAbort = () => {
        captureLLMEvent(`${loggingName} - Abort`, { messageLengthSoFar: _fullTextSoFar.length });
        try {
            _aborter?.();
        }
        catch (e) {
            // aborter sometimes automatically throws an error
        }
        _didAbort = true;
    };
    abortRef_.current = onAbort;
    if (messagesType === 'chatMessages')
        captureLLMEvent(`${loggingName} - Sending Message`, {});
    else if (messagesType === 'FIMMessage')
        captureLLMEvent(`${loggingName} - Sending FIM`, {
            prefixLen: messages_?.prefix?.length,
            suffixLen: messages_?.suffix?.length,
        });
    try {
        const implementation = sendLLMMessageToProviderImplementation[providerName];
        if (!implementation) {
            onError({ message: `Error: Provider "${providerName}" not recognized.`, fullError: null });
            return;
        }
        const { sendFIM, sendChat } = implementation;
        if (messagesType === 'chatMessages') {
            await sendChat({
                messages: messages_,
                onText,
                onFinalMessage,
                onError,
                settingsOfProvider,
                modelSelectionOptions,
                overridesOfModel,
                modelName,
                _setAborter,
                providerName,
                separateSystemMessage,
                chatMode,
                mcpTools,
            });
            return;
        }
        if (messagesType === 'FIMMessage') {
            if (sendFIM) {
                await sendFIM({
                    messages: messages_,
                    onText,
                    onFinalMessage,
                    onError,
                    settingsOfProvider,
                    modelSelectionOptions,
                    overridesOfModel,
                    modelName,
                    _setAborter,
                    providerName,
                    separateSystemMessage,
                });
                return;
            }
            onError({
                message: `Error running Autocomplete with ${providerName} - ${modelName}.`,
                fullError: null,
            });
            return;
        }
        onError({ message: `Error: Message type "${messagesType}" not recognized.`, fullError: null });
        return;
    }
    catch (error) {
        if (error instanceof Error) {
            onError({ message: error + '', fullError: error });
        }
        else {
            onError({ message: `Unexpected Error in sendLLMMessage: ${error}`, fullError: error });
        }
        // ; (_aborter as any)?.()
        // _didAbort = true
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZExMTU1lc3NhZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2VsZWN0cm9uLW1haW4vbGxtTWVzc2FnZS9zZW5kTExNTWVzc2FnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQVMxRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsc0NBQXNDLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUVqRixNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsS0FBSyxFQUNsQyxFQUNDLFlBQVksRUFDWixRQUFRLEVBQUUsU0FBUyxFQUNuQixNQUFNLEVBQUUsT0FBTyxFQUNmLGNBQWMsRUFBRSxlQUFlLEVBQy9CLE9BQU8sRUFBRSxRQUFRLEVBQ2pCLFFBQVEsRUFBRSxTQUFTLEVBQ25CLE9BQU8sRUFBRSxFQUFFLFdBQVcsRUFBRSxhQUFhLEVBQUUsRUFDdkMsa0JBQWtCLEVBQ2xCLGNBQWMsRUFDZCxxQkFBcUIsRUFDckIsZ0JBQWdCLEVBQ2hCLFFBQVEsRUFDUixxQkFBcUIsRUFDckIsUUFBUSxHQUNjLEVBRXZCLGNBQStCLEVBQzlCLEVBQUU7SUFDSCxNQUFNLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxHQUFHLGNBQWMsQ0FBQTtJQUVsRCxtR0FBbUc7SUFDbkcsTUFBTSxlQUFlLEdBQUcsQ0FBQyxPQUFlLEVBQUUsTUFBZSxFQUFFLEVBQUU7UUFDNUQsY0FBYyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7WUFDL0IsWUFBWTtZQUNaLFNBQVM7WUFDVCxpQkFBaUIsRUFBRSxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsRUFBRSxRQUFRO1lBQzdELG1CQUFtQixFQUFFLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNO1lB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