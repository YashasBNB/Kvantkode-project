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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZExMTU1lc3NhZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2t2YW50a29kZS9lbGVjdHJvbi1tYWluL2xsbU1lc3NhZ2Uvc2VuZExMTU1lc3NhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7QUFTMUYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0UsT0FBTyxFQUFFLHNDQUFzQyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFakYsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLEtBQUssRUFDbEMsRUFDQyxZQUFZLEVBQ1osUUFBUSxFQUFFLFNBQVMsRUFDbkIsTUFBTSxFQUFFLE9BQU8sRUFDZixjQUFjLEVBQUUsZUFBZSxFQUMvQixPQUFPLEVBQUUsUUFBUSxFQUNqQixRQUFRLEVBQUUsU0FBUyxFQUNuQixPQUFPLEVBQUUsRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLEVBQ3ZDLGtCQUFrQixFQUNsQixjQUFjLEVBQ2QscUJBQXFCLEVBQ3JCLGdCQUFnQixFQUNoQixRQUFRLEVBQ1IscUJBQXFCLEVBQ3JCLFFBQVEsR0FDYyxFQUV2QixjQUErQixFQUM5QixFQUFFO0lBQ0gsTUFBTSxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsR0FBRyxjQUFjLENBQUE7SUFFbEQsbUdBQW1HO0lBQ25HLE1BQU0sZUFBZSxHQUFHLENBQUMsT0FBZSxFQUFFLE1BQWUsRUFBRSxFQUFFO1FBQzVELGNBQWMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO1lBQy9CLFlBQVk7WUFDWixTQUFTO1lBQ1QsaUJBQWlCLEVBQUUsa0JBQWtCLENBQUMsWUFBWSxDQUFDLEVBQUUsUUFBUTtZQUM3RCxtQkFBbUIsRUFBRSxrQkFBa0IsQ0FBQyxZQUFZ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