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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZExMTU1lc3NhZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvZWxlY3Ryb24tbWFpbi9sbG1NZXNzYWdlL3NlbmRMTE1NZXNzYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGO0FBUzFGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxzQ0FBc0MsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRWpGLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxLQUFLLEVBQ2xDLEVBQ0MsWUFBWSxFQUNaLFFBQVEsRUFBRSxTQUFTLEVBQ25CLE1BQU0sRUFBRSxPQUFPLEVBQ2YsY0FBYyxFQUFFLGVBQWUsRUFDL0IsT0FBTyxFQUFFLFFBQVEsRUFDakIsUUFBUSxFQUFFLFNBQVMsRUFDbkIsT0FBTyxFQUFFLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxFQUN2QyxrQkFBa0IsRUFDbEIsY0FBYyxFQUNkLHFCQUFxQixFQUNyQixnQkFBZ0IsRUFDaEIsUUFBUSxFQUNSLHFCQUFxQixFQUNyQixRQUFRLEdBQ2MsRUFFdkIsY0FBK0IsRUFDOUIsRUFBRTtJQUNILE1BQU0sRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLEdBQUcsY0FBYyxDQUFBO0lBRWxELG1HQUFtRztJQUNuRyxNQUFNLGVBQWUsR0FBRyxDQUFDLE9BQWUsRUFBRSxNQUFlLEVBQUUsRUFBRTtRQUM1RCxjQUFjLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTtZQUMvQixZQUFZO1lBQ1osU0FBUztZQUNULGlCQUFpQixFQUFFLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxFQUFFLFFBQVE7WUFDN0QsbUJBQW1CLEVBQUUsa0JBQWtCLENBQUMsWUFBWSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1B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