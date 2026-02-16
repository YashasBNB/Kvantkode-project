/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
// disable foreign import complaints
/* eslint-disable */
import Anthropic from '@anthropic-ai/sdk';
import { Ollama } from 'ollama';
import OpenAI, { AzureOpenAI } from 'openai';
import { MistralCore } from '@mistralai/mistralai/core.js';
import { fimComplete } from '@mistralai/mistralai/funcs/fimComplete.js';
import { GoogleGenAI, Type, } from '@google/genai';
import { GoogleAuth } from 'google-auth-library';
import { displayInfoOfProviderName, } from '../../common/voidSettingsTypes.js';
import { getSendableReasoningInfo, getModelCapabilities, getProviderCapabilities, defaultProviderSettings, getReservedOutputTokenSpace, } from '../../common/modelCapabilities.js';
import { extractReasoningWrapper, extractXMLToolsWrapper } from './extractGrammar.js';
import { availableTools } from '../../common/prompt/prompts.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
const getGoogleApiKey = async () => {
    // module‑level singleton
    const auth = new GoogleAuth({ scopes: `https://www.googleapis.com/auth/cloud-platform` });
    const key = await auth.getAccessToken();
    if (!key)
        throw new Error(`Google API failed to generate a key.`);
    return key;
};
const invalidApiKeyMessage = (providerName) => `Invalid ${displayInfoOfProviderName(providerName).title} API key.`;
// ------------ OPENAI-COMPATIBLE (HELPERS) ------------
const parseHeadersJSON = (s) => {
    if (!s)
        return undefined;
    try {
        return JSON.parse(s);
    }
    catch (e) {
        throw new Error(`Error parsing OpenAI-Compatible headers: ${s} is not a valid JSON.`);
    }
};
const newOpenAICompatibleSDK = async ({ settingsOfProvider, providerName, includeInPayload, }) => {
    const commonPayloadOpts = {
        dangerouslyAllowBrowser: true,
        ...includeInPayload,
    };
    if (providerName === 'openAI') {
        const thisConfig = settingsOfProvider[providerName];
        return new OpenAI({ apiKey: thisConfig.apiKey, ...commonPayloadOpts });
    }
    else if (providerName === 'ollama') {
        const thisConfig = settingsOfProvider[providerName];
        return new OpenAI({
            baseURL: `${thisConfig.endpoint}/v1`,
            apiKey: 'noop',
            ...commonPayloadOpts,
        });
    }
    else if (providerName === 'vLLM') {
        const thisConfig = settingsOfProvider[providerName];
        return new OpenAI({
            baseURL: `${thisConfig.endpoint}/v1`,
            apiKey: 'noop',
            ...commonPayloadOpts,
        });
    }
    else if (providerName === 'liteLLM') {
        const thisConfig = settingsOfProvider[providerName];
        return new OpenAI({
            baseURL: `${thisConfig.endpoint}/v1`,
            apiKey: 'noop',
            ...commonPayloadOpts,
        });
    }
    else if (providerName === 'lmStudio') {
        const thisConfig = settingsOfProvider[providerName];
        return new OpenAI({
            baseURL: `${thisConfig.endpoint}/v1`,
            apiKey: 'noop',
            ...commonPayloadOpts,
        });
    }
    else if (providerName === 'openRouter') {
        const thisConfig = settingsOfProvider[providerName];
        return new OpenAI({
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey: thisConfig.apiKey,
            defaultHeaders: {
                'HTTP-Referer': 'https://kvantkode.com', // Optional, for including your app on openrouter.ai rankings.
                'X-Title': 'KvantKode', // Optional. Shows in rankings on openrouter.ai.
            },
            ...commonPayloadOpts,
        });
    }
    else if (providerName === 'googleVertex') {
        // https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/call-vertex-using-openai-library
        const thisConfig = settingsOfProvider[providerName];
        const baseURL = `https://${thisConfig.region}-aiplatform.googleapis.com/v1/projects/${thisConfig.project}/locations/${thisConfig.region}/endpoints/${'openapi'}`;
        const apiKey = await getGoogleApiKey();
        return new OpenAI({ baseURL: baseURL, apiKey: apiKey, ...commonPayloadOpts });
    }
    else if (providerName === 'microsoftAzure') {
        // https://learn.microsoft.com/en-us/rest/api/aifoundry/model-inference/get-chat-completions/get-chat-completions?view=rest-aifoundry-model-inference-2024-05-01-preview&tabs=HTTP
        //  https://github.com/openai/openai-node?tab=readme-ov-file#microsoft-azure-openai
        const thisConfig = settingsOfProvider[providerName];
        const endpoint = `https://${thisConfig.project}.openai.azure.com/`;
        const apiVersion = thisConfig.azureApiVersion ?? '2024-04-01-preview';
        const options = { endpoint, apiKey: thisConfig.apiKey, apiVersion };
        return new AzureOpenAI({ ...options, ...commonPayloadOpts });
    }
    else if (providerName === 'awsBedrock') {
        /**
         * We treat Bedrock as *OpenAI-compatible only through a proxy*:
         *   • LiteLLM default → http://localhost:4000/v1
         *   • Bedrock-Access-Gateway → https://<api-id>.execute-api.<region>.amazonaws.com/openai/
         *
         * The native Bedrock runtime endpoint
         *   https://bedrock-runtime.<region>.amazonaws.com
         * is **NOT** OpenAI-compatible, so we do *not* fall back to it here.
         */
        const { endpoint, apiKey } = settingsOfProvider.awsBedrock;
        // ① use the user-supplied proxy if present
        // ② otherwise default to local LiteLLM
        let baseURL = endpoint || 'http://localhost:4000/v1';
        // Normalize: make sure we end with “/v1”
        if (!baseURL.endsWith('/v1'))
            baseURL = baseURL.replace(/\/+$/, '') + '/v1';
        return new OpenAI({ baseURL, apiKey, ...commonPayloadOpts });
    }
    else if (providerName === 'deepseek') {
        const thisConfig = settingsOfProvider[providerName];
        return new OpenAI({
            baseURL: 'https://api.deepseek.com/v1',
            apiKey: thisConfig.apiKey,
            ...commonPayloadOpts,
        });
    }
    else if (providerName === 'openAICompatible') {
        const thisConfig = settingsOfProvider[providerName];
        const headers = parseHeadersJSON(thisConfig.headersJSON);
        return new OpenAI({
            baseURL: thisConfig.endpoint,
            apiKey: thisConfig.apiKey,
            defaultHeaders: headers,
            ...commonPayloadOpts,
        });
    }
    else if (providerName === 'groq') {
        const thisConfig = settingsOfProvider[providerName];
        return new OpenAI({
            baseURL: 'https://api.groq.com/openai/v1',
            apiKey: thisConfig.apiKey,
            ...commonPayloadOpts,
        });
    }
    else if (providerName === 'xAI') {
        const thisConfig = settingsOfProvider[providerName];
        return new OpenAI({
            baseURL: 'https://api.x.ai/v1',
            apiKey: thisConfig.apiKey,
            ...commonPayloadOpts,
        });
    }
    else if (providerName === 'mistral') {
        const thisConfig = settingsOfProvider[providerName];
        return new OpenAI({
            baseURL: 'https://api.mistral.ai/v1',
            apiKey: thisConfig.apiKey,
            ...commonPayloadOpts,
        });
    }
    else
        throw new Error(`Void providerName was invalid: ${providerName}.`);
};
const _sendOpenAICompatibleFIM = async ({ messages: { prefix, suffix, stopTokens }, onFinalMessage, onError, settingsOfProvider, modelName: modelName_, _setAborter, providerName, overridesOfModel, }) => {
    const { modelName, supportsFIM, additionalOpenAIPayload } = getModelCapabilities(providerName, modelName_, overridesOfModel);
    if (!supportsFIM) {
        if (modelName === modelName_)
            onError({ message: `Model ${modelName} does not support FIM.`, fullError: null });
        else
            onError({
                message: `Model ${modelName_} (${modelName}) does not support FIM.`,
                fullError: null,
            });
        return;
    }
    const openai = await newOpenAICompatibleSDK({
        providerName,
        settingsOfProvider,
        includeInPayload: additionalOpenAIPayload,
    });
    openai.completions
        .create({
        model: modelName,
        prompt: prefix,
        suffix: suffix,
        stop: stopTokens,
        max_tokens: 300,
    })
        .then(async (response) => {
        const fullText = response.choices[0]?.text;
        onFinalMessage({ fullText, fullReasoning: '', anthropicReasoning: null });
    })
        .catch((error) => {
        if (error instanceof OpenAI.APIError) {
            if (error.status === 401) {
                onError({ message: invalidApiKeyMessage(providerName), fullError: error });
            }
            else if (error.status === 429) {
                // Quota exceeded – try to extract reset time from headers/body
                const anyErr = error;
                const resetAtHeader = anyErr?.headers?.['x-quota-reset-at'] || anyErr?.response?.headers?.['x-quota-reset-at'];
                let resetAt = '' + (resetAtHeader || anyErr?.response?.data?.resetAt || '');
                const iso = (() => {
                    try {
                        return new Date(resetAt).toISOString();
                    }
                    catch {
                        return '';
                    }
                })();
                const pretty = iso ? iso.replace('T', ' ').replace('Z', ' UTC') : '';
                const resetPart = pretty ? ` at ${pretty}` : ' (resets at UTC midnight)';
                onError({
                    message: `Daily token quota reached${resetPart}. Please try Chat again after it resets.`,
                    fullError: error,
                });
            }
            else {
                onError({ message: error + '', fullError: error });
            }
        }
        else {
            onError({ message: error + '', fullError: error });
        }
    });
};
const toOpenAICompatibleTool = (toolInfo) => {
    const { name, description, params } = toolInfo;
    const paramsWithType = {};
    for (const key in params) {
        paramsWithType[key] = { ...params[key], type: 'string' };
    }
    return {
        type: 'function',
        function: {
            name: name,
            // strict: true, // strict mode - https://platform.openai.com/docs/guides/function-calling?api-mode=chat
            description: description,
            parameters: {
                type: 'object',
                properties: params,
                // required: Object.keys(params), // in strict mode, all params are required and additionalProperties is false
                // additionalProperties: false,
            },
        },
    };
};
const openAITools = (chatMode, mcpTools) => {
    const allowedTools = availableTools(chatMode, mcpTools);
    if (!allowedTools || Object.keys(allowedTools).length === 0)
        return null;
    const openAITools = [];
    for (const t in allowedTools ?? {}) {
        openAITools.push(toOpenAICompatibleTool(allowedTools[t]));
    }
    return openAITools;
};
// convert LLM tool call to our tool format
const rawToolCallObjOfParamsStr = (name, toolParamsStr, id) => {
    let input;
    try {
        input = JSON.parse(toolParamsStr);
    }
    catch (e) {
        return null;
    }
    if (input === null)
        return null;
    if (typeof input !== 'object')
        return null;
    const rawParams = input;
    return { id, name, rawParams, doneParams: Object.keys(rawParams), isDone: true };
};
const rawToolCallObjOfAnthropicParams = (toolBlock) => {
    const { id, name, input } = toolBlock;
    if (input === null)
        return null;
    if (typeof input !== 'object')
        return null;
    const rawParams = input;
    return { id, name, rawParams, doneParams: Object.keys(rawParams), isDone: true };
};
// ------------ OPENAI-COMPATIBLE ------------
const _sendOpenAICompatibleChat = async ({ messages, onText, onFinalMessage, onError, settingsOfProvider, modelSelectionOptions, modelName: modelName_, _setAborter, providerName, chatMode, separateSystemMessage, overridesOfModel, mcpTools, }) => {
    console.log('🔧 Backend: _sendOpenAICompatibleChat called:', {
        providerName,
        modelName: modelName_,
        messageCount: Array.isArray(messages) ? messages.length : 0,
        hasSystemMessage: !!separateSystemMessage
    });
    const { modelName, specialToolFormat, reasoningCapabilities, additionalOpenAIPayload } = getModelCapabilities(providerName, modelName_, overridesOfModel);
    const { providerReasoningIOSettings } = getProviderCapabilities(providerName);
    // reasoning
    const { canIOReasoning, openSourceThinkTags } = reasoningCapabilities || {};
    const reasoningInfo = getSendableReasoningInfo('Chat', providerName, modelName_, modelSelectionOptions, overridesOfModel); // user's modelName_ here
    const includeInPayload = {
        ...providerReasoningIOSettings?.input?.includeInPayload?.(reasoningInfo),
        ...additionalOpenAIPayload,
    };
    // tools
    const potentialTools = openAITools(chatMode, mcpTools);
    const nativeToolsObj = potentialTools && specialToolFormat === 'openai-style'
        ? { tools: potentialTools }
        : {};
    // instance
    const openai = await newOpenAICompatibleSDK({
        providerName,
        settingsOfProvider,
        includeInPayload,
    });
    if (providerName === 'microsoftAzure') {
        // Required to select the model
        ;
        openai.deploymentName = modelName;
    }
    const options = {
        model: modelName,
        messages: messages,
        stream: true,
        ...nativeToolsObj,
        ...additionalOpenAIPayload,
        // max_completion_tokens: maxTokens,
    };
    // open source models - manually parse think tokens
    const { needsManualParse: needsManualReasoningParse, nameOfFieldInDelta: nameOfReasoningFieldInDelta, } = providerReasoningIOSettings?.output ?? {};
    const manuallyParseReasoning = needsManualReasoningParse && canIOReasoning && openSourceThinkTags;
    if (manuallyParseReasoning) {
        const { newOnText, newOnFinalMessage } = extractReasoningWrapper(onText, onFinalMessage, openSourceThinkTags);
        onText = newOnText;
        onFinalMessage = newOnFinalMessage;
    }
    // manually parse out tool results if XML
    if (!specialToolFormat) {
        const { newOnText, newOnFinalMessage } = extractXMLToolsWrapper(onText, onFinalMessage, chatMode, mcpTools);
        onText = newOnText;
        onFinalMessage = newOnFinalMessage;
    }
    let fullReasoningSoFar = '';
    let fullTextSoFar = '';
    let toolName = '';
    let toolId = '';
    let toolParamsStr = '';
    openai.chat.completions
        .create(options)
        .then(async (response) => {
        console.log('🌐 Backend: OpenAI-compatible request sent:', {
            endpoint: settingsOfProvider.endpoint,
            model: modelName,
            stream: options.stream,
            messageCount: options.messages?.length || 0
        });
        _setAborter(() => response.controller.abort());
        // when receive text
        for await (const chunk of response) {
            // message
            const newText = chunk.choices[0]?.delta?.content ?? '';
            if (newText) {
                console.log('📨 Backend: Received chunk:', {
                    contentLength: newText.length,
                    content: newText.substring(0, 50) + (newText.length > 50 ? '...' : '')
                });
            }
            fullTextSoFar += newText;
            // tool call
            for (const tool of chunk.choices[0]?.delta?.tool_calls ?? []) {
                const index = tool.index;
                if (index !== 0)
                    continue;
                toolName += tool.function?.name ?? '';
                toolParamsStr += tool.function?.arguments ?? '';
                toolId += tool.id ?? '';
            }
            // reasoning
            let newReasoning = '';
            if (nameOfReasoningFieldInDelta) {
                // @ts-ignore
                newReasoning = (chunk.choices[0]?.delta?.[nameOfReasoningFieldInDelta] || '') + '';
                fullReasoningSoFar += newReasoning;
            }
            // call onText
            onText({
                fullText: fullTextSoFar,
                fullReasoning: fullReasoningSoFar,
                toolCall: !toolName
                    ? undefined
                    : { name: toolName, rawParams: {}, isDone: false, doneParams: [], id: toolId },
            });
        }
        // on final
        if (!fullTextSoFar && !fullReasoningSoFar && !toolName) {
            onError({ message: 'KvantKode: Response from model was empty.', fullError: null });
        }
        else {
            const toolCall = rawToolCallObjOfParamsStr(toolName, toolParamsStr, toolId);
            const toolCallObj = toolCall ? { toolCall } : {};
            onFinalMessage({
                fullText: fullTextSoFar,
                fullReasoning: fullReasoningSoFar,
                anthropicReasoning: null,
                ...toolCallObj,
            });
        }
    })
        // when error/fail - this catches errors of both .create() and .then(for await)
        .catch(async (error) => {
        if (error instanceof OpenAI.APIError && error.status === 401) {
            onError({ message: invalidApiKeyMessage(providerName), fullError: error });
        }
        else if (error instanceof OpenAI.APIError && error.status === 400 && error.message?.includes('streaming_disabled_for_quota')) {
            // Fallback to non-streaming request when streaming is disabled due to quota
            try {
                const nonStreamingOptions = { ...options, stream: false };
                const response = await openai.chat.completions.create(nonStreamingOptions);
                // Handle non-streaming response
                const content = response.choices[0]?.message?.content ?? '';
                onText({ fullText: content, fullReasoning: '' });
                onFinalMessage({ fullText: content, fullReasoning: '', anthropicReasoning: null });
            }
            catch (fallbackError) {
                onError({ message: `Fallback request failed: ${fallbackError}`, fullError: fallbackError });
            }
        }
        else {
            onError({ message: error + '', fullError: error });
        }
    });
};
const _openaiCompatibleList = async ({ onSuccess: onSuccess_, onError: onError_, settingsOfProvider, providerName, }) => {
    const onSuccess = ({ models }) => {
        onSuccess_({ models });
    };
    const onError = ({ error }) => {
        onError_({ error });
    };
    try {
        const openai = await newOpenAICompatibleSDK({ providerName, settingsOfProvider });
        openai.models
            .list()
            .then(async (response) => {
            const models = [];
            models.push(...response.data);
            while (response.hasNextPage()) {
                models.push(...(await response.getNextPage()).data);
            }
            onSuccess({ models });
        })
            .catch((error) => {
            onError({ error: error + '' });
        });
    }
    catch (error) {
        onError({ error: error + '' });
    }
};
// ------------ ANTHROPIC (HELPERS) ------------
const toAnthropicTool = (toolInfo) => {
    const { name, description, params } = toolInfo;
    const paramsWithType = {};
    for (const key in params) {
        paramsWithType[key] = { ...params[key], type: 'string' };
    }
    return {
        name: name,
        description: description,
        input_schema: {
            type: 'object',
            properties: paramsWithType,
            // required: Object.keys(params),
        },
    };
};
const anthropicTools = (chatMode, mcpTools) => {
    const allowedTools = availableTools(chatMode, mcpTools);
    if (!allowedTools || Object.keys(allowedTools).length === 0)
        return null;
    const anthropicTools = [];
    for (const t in allowedTools ?? {}) {
        anthropicTools.push(toAnthropicTool(allowedTools[t]));
    }
    return anthropicTools;
};
// ------------ ANTHROPIC ------------
const sendAnthropicChat = async ({ messages, providerName, onText, onFinalMessage, onError, settingsOfProvider, modelSelectionOptions, overridesOfModel, modelName: modelName_, _setAborter, separateSystemMessage, chatMode, mcpTools, }) => {
    const { modelName, specialToolFormat } = getModelCapabilities(providerName, modelName_, overridesOfModel);
    const thisConfig = settingsOfProvider.anthropic;
    const { providerReasoningIOSettings } = getProviderCapabilities(providerName);
    // reasoning
    const reasoningInfo = getSendableReasoningInfo('Chat', providerName, modelName_, modelSelectionOptions, overridesOfModel); // user's modelName_ here
    const includeInPayload = providerReasoningIOSettings?.input?.includeInPayload?.(reasoningInfo) || {};
    // anthropic-specific - max tokens
    const maxTokens = getReservedOutputTokenSpace(providerName, modelName_, {
        isReasoningEnabled: !!reasoningInfo?.isReasoningEnabled,
        overridesOfModel,
    });
    // tools
    const potentialTools = anthropicTools(chatMode, mcpTools);
    const nativeToolsObj = potentialTools && specialToolFormat === 'anthropic-style'
        ? { tools: potentialTools, tool_choice: { type: 'auto' } }
        : {};
    // instance
    const anthropic = new Anthropic({
        apiKey: thisConfig.apiKey,
        dangerouslyAllowBrowser: true,
    });
    const stream = anthropic.messages.stream({
        system: separateSystemMessage ?? undefined,
        messages: messages,
        model: modelName,
        max_tokens: maxTokens ?? 4_096, // anthropic requires this
        ...includeInPayload,
        ...nativeToolsObj,
    });
    // manually parse out tool results if XML
    if (!specialToolFormat) {
        const { newOnText, newOnFinalMessage } = extractXMLToolsWrapper(onText, onFinalMessage, chatMode, mcpTools);
        onText = newOnText;
        onFinalMessage = newOnFinalMessage;
    }
    // when receive text
    let fullText = '';
    let fullReasoning = '';
    let fullToolName = '';
    let fullToolParams = '';
    const runOnText = () => {
        onText({
            fullText,
            fullReasoning,
            toolCall: !fullToolName
                ? undefined
                : { name: fullToolName, rawParams: {}, isDone: false, doneParams: [], id: 'dummy' },
        });
    };
    // there are no events for tool_use, it comes in at the end
    stream.on('streamEvent', (e) => {
        // start block
        if (e.type === 'content_block_start') {
            if (e.content_block.type === 'text') {
                if (fullText)
                    fullText += '\n\n'; // starting a 2nd text block
                fullText += e.content_block.text;
                runOnText();
            }
            else if (e.content_block.type === 'thinking') {
                if (fullReasoning)
                    fullReasoning += '\n\n'; // starting a 2nd reasoning block
                fullReasoning += e.content_block.thinking;
                runOnText();
            }
            else if (e.content_block.type === 'redacted_thinking') {
                console.log('delta', e.content_block.type);
                if (fullReasoning)
                    fullReasoning += '\n\n'; // starting a 2nd reasoning block
                fullReasoning += '[redacted_thinking]';
                runOnText();
            }
            else if (e.content_block.type === 'tool_use') {
                fullToolName += e.content_block.name ?? ''; // anthropic gives us the tool name in the start block
                runOnText();
            }
        }
        // delta
        else if (e.type === 'content_block_delta') {
            if (e.delta.type === 'text_delta') {
                fullText += e.delta.text;
                runOnText();
            }
            else if (e.delta.type === 'thinking_delta') {
                fullReasoning += e.delta.thinking;
                runOnText();
            }
            else if (e.delta.type === 'input_json_delta') {
                // tool use
                fullToolParams += e.delta.partial_json ?? ''; // anthropic gives us the partial delta (string) here - https://docs.anthropic.com/en/api/messages-streaming
                runOnText();
            }
        }
    });
    // on done - (or when error/fail) - this is called AFTER last streamEvent
    stream.on('finalMessage', (response) => {
        const anthropicReasoning = response.content.filter((c) => c.type === 'thinking' || c.type === 'redacted_thinking');
        const tools = response.content.filter((c) => c.type === 'tool_use');
        // console.log('TOOLS!!!!!!', JSON.stringify(tools, null, 2))
        // console.log('TOOLS!!!!!!', JSON.stringify(response, null, 2))
        const toolCall = tools[0] && rawToolCallObjOfAnthropicParams(tools[0]);
        const toolCallObj = toolCall ? { toolCall } : {};
        onFinalMessage({ fullText, fullReasoning, anthropicReasoning, ...toolCallObj });
    });
    // on error
    stream.on('error', (error) => {
        if (error instanceof Anthropic.APIError && error.status === 401) {
            onError({ message: invalidApiKeyMessage(providerName), fullError: error });
        }
        else {
            onError({ message: error + '', fullError: error });
        }
    });
    _setAborter(() => stream.controller.abort());
};
// ------------ MISTRAL ------------
// https://docs.mistral.ai/api/#tag/fim
const sendMistralFIM = ({ messages, onFinalMessage, onError, settingsOfProvider, overridesOfModel, modelName: modelName_, _setAborter, providerName, }) => {
    const { modelName, supportsFIM } = getModelCapabilities(providerName, modelName_, overridesOfModel);
    if (!supportsFIM) {
        if (modelName === modelName_)
            onError({ message: `Model ${modelName} does not support FIM.`, fullError: null });
        else
            onError({
                message: `Model ${modelName_} (${modelName}) does not support FIM.`,
                fullError: null,
            });
        return;
    }
    const mistral = new MistralCore({ apiKey: settingsOfProvider.mistral.apiKey });
    fimComplete(mistral, {
        model: modelName,
        prompt: messages.prefix,
        suffix: messages.suffix,
        stream: false,
        maxTokens: 300,
        stop: messages.stopTokens,
    })
        .then(async (response) => {
        // unfortunately, _setAborter() does not exist
        let content = response?.ok ? (response.value.choices?.[0]?.message?.content ?? '') : '';
        const fullText = typeof content === 'string'
            ? content
            : content.map((chunk) => (chunk.type === 'text' ? chunk.text : '')).join('');
        onFinalMessage({ fullText, fullReasoning: '', anthropicReasoning: null });
    })
        .catch((error) => {
        onError({ message: error + '', fullError: error });
    });
};
// ------------ OLLAMA ------------
const newOllamaSDK = ({ endpoint }) => {
    // if endpoint is empty, normally ollama will send to 11434, but we want it to fail - the user should type it in
    if (!endpoint)
        throw new Error(`Ollama Endpoint was empty (please enter ${defaultProviderSettings.ollama.endpoint} in Void if you want the default url).`);
    const ollama = new Ollama({ host: endpoint });
    return ollama;
};
const ollamaList = async ({ onSuccess: onSuccess_, onError: onError_, settingsOfProvider, }) => {
    const onSuccess = ({ models }) => {
        onSuccess_({ models });
    };
    const onError = ({ error }) => {
        onError_({ error });
    };
    try {
        const thisConfig = settingsOfProvider.ollama;
        const ollama = newOllamaSDK({ endpoint: thisConfig.endpoint });
        ollama
            .list()
            .then((response) => {
            const { models } = response;
            onSuccess({ models });
        })
            .catch((error) => {
            onError({ error: error + '' });
        });
    }
    catch (error) {
        onError({ error: error + '' });
    }
};
const sendOllamaFIM = ({ messages, onFinalMessage, onError, settingsOfProvider, modelName, _setAborter, }) => {
    const thisConfig = settingsOfProvider.ollama;
    const ollama = newOllamaSDK({ endpoint: thisConfig.endpoint });
    let fullText = '';
    ollama
        .generate({
        model: modelName,
        prompt: messages.prefix,
        suffix: messages.suffix,
        options: {
            stop: messages.stopTokens,
            num_predict: 300, // max tokens
            // repeat_penalty: 1,
        },
        raw: true,
        stream: true, // stream is not necessary but lets us expose the
    })
        .then(async (stream) => {
        _setAborter(() => stream.abort());
        for await (const chunk of stream) {
            const newText = chunk.response;
            fullText += newText;
        }
        onFinalMessage({ fullText, fullReasoning: '', anthropicReasoning: null });
    })
        // when error/fail
        .catch((error) => {
        onError({ message: error + '', fullError: error });
    });
};
// ---------------- GEMINI NATIVE IMPLEMENTATION ----------------
const toGeminiFunctionDecl = (toolInfo) => {
    const { name, description, params } = toolInfo;
    return {
        name,
        description,
        parameters: {
            type: Type.OBJECT,
            properties: Object.entries(params).reduce((acc, [key, value]) => {
                acc[key] = {
                    type: Type.STRING,
                    description: value.description,
                };
                return acc;
            }, {}),
        },
    };
};
const geminiTools = (chatMode, mcpTools) => {
    const allowedTools = availableTools(chatMode, mcpTools);
    if (!allowedTools || Object.keys(allowedTools).length === 0)
        return null;
    const functionDecls = [];
    for (const t in allowedTools ?? {}) {
        functionDecls.push(toGeminiFunctionDecl(allowedTools[t]));
    }
    const tools = { functionDeclarations: functionDecls };
    return [tools];
};
// Implementation for Gemini using Google's native API
const sendGeminiChat = async ({ messages, separateSystemMessage, onText, onFinalMessage, onError, settingsOfProvider, overridesOfModel, modelName: modelName_, _setAborter, providerName, modelSelectionOptions, chatMode, mcpTools, }) => {
    if (providerName !== 'gemini')
        throw new Error(`Sending Gemini chat, but provider was ${providerName}`);
    const thisConfig = settingsOfProvider[providerName];
    const { modelName, specialToolFormat,
    // reasoningCapabilities,
     } = getModelCapabilities(providerName, modelName_, overridesOfModel);
    // const { providerReasoningIOSettings } = getProviderCapabilities(providerName)
    // reasoning
    // const { canIOReasoning, openSourceThinkTags, } = reasoningCapabilities || {}
    const reasoningInfo = getSendableReasoningInfo('Chat', providerName, modelName_, modelSelectionOptions, overridesOfModel); // user's modelName_ here
    // const includeInPayload = providerReasoningIOSettings?.input?.includeInPayload?.(reasoningInfo) || {}
    const thinkingConfig = !reasoningInfo?.isReasoningEnabled
        ? undefined
        : reasoningInfo.type === 'budget_slider_value'
            ? { thinkingBudget: reasoningInfo.reasoningBudget }
            : undefined;
    // tools
    const potentialTools = geminiTools(chatMode, mcpTools);
    const toolConfig = potentialTools && specialToolFormat === 'gemini-style' ? potentialTools : undefined;
    // instance
    const genAI = new GoogleGenAI({ apiKey: thisConfig.apiKey });
    // manually parse out tool results if XML
    if (!specialToolFormat) {
        const { newOnText, newOnFinalMessage } = extractXMLToolsWrapper(onText, onFinalMessage, chatMode, mcpTools);
        onText = newOnText;
        onFinalMessage = newOnFinalMessage;
    }
    // when receive text
    let fullReasoningSoFar = '';
    let fullTextSoFar = '';
    let toolName = '';
    let toolParamsStr = '';
    let toolId = '';
    genAI.models
        .generateContentStream({
        model: modelName,
        config: {
            systemInstruction: separateSystemMessage,
            thinkingConfig: thinkingConfig,
            tools: toolConfig,
        },
        contents: messages,
    })
        .then(async (stream) => {
        _setAborter(() => {
            stream.return(fullTextSoFar);
        });
        // Process the stream
        for await (const chunk of stream) {
            // message
            const newText = chunk.text ?? '';
            fullTextSoFar += newText;
            // tool call
            const functionCalls = chunk.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
                const functionCall = functionCalls[0]; // Get the first function call
                toolName = functionCall.name ?? '';
                toolParamsStr = JSON.stringify(functionCall.args ?? {});
                toolId = functionCall.id ?? '';
            }
            // (do not handle reasoning yet)
            // call onText
            onText({
                fullText: fullTextSoFar,
                fullReasoning: fullReasoningSoFar,
                toolCall: !toolName
                    ? undefined
                    : { name: toolName, rawParams: {}, isDone: false, doneParams: [], id: toolId },
            });
        }
        // on final
        if (!fullTextSoFar && !fullReasoningSoFar && !toolName) {
            onError({ message: 'KvantKode: Response from model was empty.', fullError: null });
        }
        else {
            if (!toolId)
                toolId = generateUuid(); // ids are empty, but other providers might expect an id
            const toolCall = rawToolCallObjOfParamsStr(toolName, toolParamsStr, toolId);
            const toolCallObj = toolCall ? { toolCall } : {};
            onFinalMessage({
                fullText: fullTextSoFar,
                fullReasoning: fullReasoningSoFar,
                anthropicReasoning: null,
                ...toolCallObj,
            });
        }
    })
        .catch((error) => {
        const message = error?.message;
        if (typeof message === 'string') {
            if (error.message?.includes('API key')) {
                onError({ message: invalidApiKeyMessage(providerName), fullError: error });
            }
            else if (error?.message?.includes('429')) {
                onError({ message: 'Rate limit reached. ' + error, fullError: error });
            }
            else
                onError({ message: error + '', fullError: error });
        }
        else {
            onError({ message: error + '', fullError: error });
        }
    });
};
export const sendLLMMessageToProviderImplementation = {
    anthropic: {
        sendChat: sendAnthropicChat,
        sendFIM: null,
        list: null,
    },
    openAI: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: null,
        list: null,
    },
    xAI: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: null,
        list: null,
    },
    gemini: {
        sendChat: (params) => sendGeminiChat(params),
        sendFIM: null,
        list: null,
    },
    mistral: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: (params) => sendMistralFIM(params),
        list: null,
    },
    ollama: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: sendOllamaFIM,
        list: ollamaList,
    },
    openAICompatible: {
        sendChat: (params) => _sendOpenAICompatibleChat(params), // using openai's SDK is not ideal (your implementation might not do tools, reasoning, FIM etc correctly), talk to us for a custom integration
        sendFIM: (params) => _sendOpenAICompatibleFIM(params),
        list: null,
    },
    openRouter: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: (params) => _sendOpenAICompatibleFIM(params),
        list: null,
    },
    vLLM: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: (params) => _sendOpenAICompatibleFIM(params),
        list: (params) => _openaiCompatibleList(params),
    },
    deepseek: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: null,
        list: null,
    },
    groq: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: null,
        list: null,
    },
    lmStudio: {
        // lmStudio has no suffix parameter in /completions, so sendFIM might not work
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: (params) => _sendOpenAICompatibleFIM(params),
        list: (params) => _openaiCompatibleList(params),
    },
    liteLLM: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: (params) => _sendOpenAICompatibleFIM(params),
        list: null,
    },
    googleVertex: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: null,
        list: null,
    },
    microsoftAzure: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: null,
        list: null,
    },
    awsBedrock: {
        sendChat: (params) => _sendOpenAICompatibleChat(params),
        sendFIM: null,
        list: null,
    },
};
/*
FIM info (this may be useful in the future with vLLM, but in most cases the only way to use FIM is if the provider explicitly supports it):

qwen2.5-coder https://ollama.com/library/qwen2.5-coder/blobs/e94a8ecb9327
<|fim_prefix|>{{ .Prompt }}<|fim_suffix|>{{ .Suffix }}<|fim_middle|>

codestral https://ollama.com/library/codestral/blobs/51707752a87c
[SUFFIX]{{ .Suffix }}[PREFIX] {{ .Prompt }}

deepseek-coder-v2 https://ollama.com/library/deepseek-coder-v2/blobs/22091531faf0
<｜fim▁begin｜>{{ .Prompt }}<｜fim▁hole｜>{{ .Suffix }}<｜fim▁end｜>

starcoder2 https://ollama.com/library/starcoder2/blobs/3b190e68fefe
<file_sep>
<fim_prefix>
{{ .Prompt }}<fim_suffix>{{ .Suffix }}<fim_middle>
<|end_of_text|>

codegemma https://ollama.com/library/codegemma:2b/blobs/48d9a8140749
<|fim_prefix|>{{ .Prompt }}<|fim_suffix|>{{ .Suffix }}<|fim_middle|>

*/
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZExMTU1lc3NhZ2UuaW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9lbGVjdHJvbi1tYWluL2xsbU1lc3NhZ2Uvc2VuZExMTU1lc3NhZ2UuaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQUUxRixvQ0FBb0M7QUFDcEMsb0JBQW9CO0FBQ3BCLE9BQU8sU0FBUyxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDL0IsT0FBTyxNQUFNLEVBQUUsRUFBaUIsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQzNELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDdkUsT0FBTyxFQUdOLFdBQVcsRUFHWCxJQUFJLEdBQ0osTUFBTSxlQUFlLENBQUE7QUFDdEIsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBZ0JoRCxPQUFPLEVBRU4seUJBQXlCLEdBS3pCLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUNOLHdCQUF3QixFQUN4QixvQkFBb0IsRUFDcEIsdUJBQXVCLEVBQ3ZCLHVCQUF1QixFQUN2QiwyQkFBMkIsR0FDM0IsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNyRixPQUFPLEVBQUUsY0FBYyxFQUFvQixNQUFNLGdDQUFnQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUVqRSxNQUFNLGVBQWUsR0FBRyxLQUFLLElBQUksRUFBRTtJQUNsQyx5QkFBeUI7SUFDekIsTUFBTSxJQUFJLEdBQUcsSUFBSSxVQUFVLENBQUMsRUFBRSxNQUFNLEVBQUUsZ0RBQWdELEVBQUUsQ0FBQyxDQUFBO0lBQ3pGLE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO0lBQ3ZDLElBQUksQ0FBQyxHQUFHO1FBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFBO0lBQ2pFLE9BQU8sR0FBRyxDQUFBO0FBQ1gsQ0FBQyxDQUFBO0FBMEJELE1BQU0sb0JBQW9CLEdBQUcsQ0FBQyxZQUEwQixFQUFFLEVBQUUsQ0FDM0QsV0FBVyx5QkFBeUIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxLQUFLLFdBQVcsQ0FBQTtBQUVwRSx3REFBd0Q7QUFFeEQsTUFBTSxnQkFBZ0IsR0FBRyxDQUN4QixDQUFxQixFQUNtQyxFQUFFO0lBQzFELElBQUksQ0FBQyxDQUFDO1FBQUUsT0FBTyxTQUFTLENBQUE7SUFDeEIsSUFBSSxDQUFDO1FBQ0osT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3JCLENBQUM7SUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyw0Q0FBNEMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO0lBQ3RGLENBQUM7QUFDRixDQUFDLENBQUE7QUFFRCxNQUFNLHNCQUFzQixHQUFHLEtBQUssRUFBRSxFQUNyQyxrQkFBa0IsRUFDbEIsWUFBWSxFQUNaLGdCQUFnQixHQUtoQixFQUFFLEVBQUU7SUFDSixNQUFNLGlCQUFpQixHQUFrQjtRQUN4Qyx1QkFBdUIsRUFBRSxJQUFJO1FBQzdCLEdBQUcsZ0JBQWdCO0tBQ25CLENBQUE7SUFDRCxJQUFJLFlBQVksS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUMvQixNQUFNLFVBQVUsR0FBRyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNuRCxPQUFPLElBQUksTUFBTSxDQUFDLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxNQUFNLEVBQUUsR0FBRyxpQkFBaUIsRUFBRSxDQUFDLENBQUE7SUFDdkUsQ0FBQztTQUFNLElBQUksWUFBWSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3RDLE1BQU0sVUFBVSxHQUFHLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ25ELE9BQU8sSUFBSSxNQUFNLENBQUM7WUFDakIsT0FBTyxFQUFFLEdBQUcsVUFBVSxDQUFDLFFBQVEsS0FBSztZQUNwQyxNQUFNLEVBQUUsTUFBTTtZQUNkLEdBQUcsaUJBQWlCO1NBQ3BCLENBQUMsQ0FBQTtJQUNILENBQUM7U0FBTSxJQUFJLFlBQVksS0FBSyxNQUFNLEVBQUUsQ0FBQztRQUNwQyxNQUFNLFVBQVUsR0FBRyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNuRCxPQUFPLElBQUksTUFBTSxDQUFDO1lBQ2pCLE9BQU8sRUFBRSxHQUFHLFVBQVUsQ0FBQyxRQUFRLEtBQUs7WUFDcEMsTUFBTSxFQUFFLE1BQU07WUFDZCxHQUFHLGlCQUFpQjtTQUNwQixDQUFDLENBQUE7SUFDSCxDQUFDO1NBQU0sSUFBSSxZQUFZLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDdkMsTUFBTSxVQUFVLEdBQUcsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDbkQsT0FBTyxJQUFJLE1BQU0sQ0FBQztZQUNqQixPQUFPLEVBQUUsR0FBRyxVQUFVLENBQUMsUUFBUSxLQUFLO1lBQ3BDLE1BQU0sRUFBRSxNQUFNO1lBQ2QsR0FBRyxpQkFBaUI7U0FDcEIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztTQUFNLElBQUksWUFBWSxLQUFLLFVBQVUsRUFBRSxDQUFDO1FBQ3hDLE1BQU0sVUFBVSxHQUFHLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ25ELE9BQU8sSUFBSSxNQUFNLENBQUM7WUFDakIsT0FBTyxFQUFFLEdBQUcsVUFBVSxDQUFDLFFBQVEsS0FBSztZQUNwQyxNQUFNLEVBQUUsTUFBTTtZQUNkLEdBQUcsaUJBQWlCO1NBQ3BCLENBQUMsQ0FBQTtJQUNILENBQUM7U0FBTSxJQUFJLFlBQVksS0FBSyxZQUFZLEVBQUUsQ0FBQztRQUMxQyxNQUFNLFVBQVUsR0FBRyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNuRCxPQUFPLElBQUksTUFBTSxDQUFDO1lBQ2pCLE9BQU8sRUFBRSw4QkFBOEI7WUFDdkMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxNQUFNO1lBQ3pCLGNBQWMsRUFBRTtnQkFDZixjQUFjLEVBQUUsdUJBQXVCLEVBQUUsOERBQThEO2dCQUN2RyxTQUFTLEVBQUUsV0FBVyxFQUFFLGdEQUFnRDthQUN4RTtZQUNELEdBQUcsaUJBQWlCO1NBQ3BCLENBQUMsQ0FBQTtJQUNILENBQUM7U0FBTSxJQUFJLFlBQVksS0FBSyxjQUFjLEVBQUUsQ0FBQztRQUM1QyxvR0FBb0c7UUFDcEcsTUFBTSxVQUFVLEdBQUcsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDbkQsTUFBTSxPQUFPLEdBQUcsV0FBVyxVQUFVLENBQUMsTUFBTSwwQ0FBMEMsVUFBVSxDQUFDLE9BQU8sY0FBYyxVQUFVLENBQUMsTUFBTSxjQUFjLFNBQVMsRUFBRSxDQUFBO1FBQ2hLLE1BQU0sTUFBTSxHQUFHLE1BQU0sZUFBZSxFQUFFLENBQUE7UUFDdEMsT0FBTyxJQUFJLE1BQU0sQ0FBQyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLGlCQUFpQixFQUFFLENBQUMsQ0FBQTtJQUM5RSxDQUFDO1NBQU0sSUFBSSxZQUFZLEtBQUssZ0JBQWdCLEVBQUUsQ0FBQztRQUM5QyxrTEFBa0w7UUFDbEwsbUZBQW1GO1FBQ25GLE1BQU0sVUFBVSxHQUFHLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ25ELE1BQU0sUUFBUSxHQUFHLFdBQVcsVUFBVSxDQUFDLE9BQU8sb0JBQW9CLENBQUE7UUFDbEUsTUFBTSxVQUFVLEdBQUcsVUFBVSxDQUFDLGVBQWUsSUFBSSxvQkFBb0IsQ0FBQTtRQUNyRSxNQUFNLE9BQU8sR0FBRyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsQ0FBQTtRQUNuRSxPQUFPLElBQUksV0FBVyxDQUFDLEVBQUUsR0FBRyxPQUFPLEVBQUUsR0FBRyxpQkFBaUIsRUFBRSxDQUFDLENBQUE7SUFDN0QsQ0FBQztTQUFNLElBQUksWUFBWSxLQUFLLFlBQVksRUFBRSxDQUFDO1FBQzFDOzs7Ozs7OztXQVFHO1FBQ0gsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsR0FBRyxrQkFBa0IsQ0FBQyxVQUFVLENBQUE7UUFFMUQsMkNBQTJDO1FBQzNDLHVDQUF1QztRQUN2QyxJQUFJLE9BQU8sR0FBRyxRQUFRLElBQUksMEJBQTBCLENBQUE7UUFFcEQseUNBQXlDO1FBQ3pDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztZQUFFLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUE7UUFFM0UsT0FBTyxJQUFJLE1BQU0sQ0FBQyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsR0FBRyxpQkFBaUIsRUFBRSxDQUFDLENBQUE7SUFDN0QsQ0FBQztTQUFNLElBQUksWUFBWSxLQUFLLFVBQVUsRUFBRSxDQUFDO1FBQ3hDLE1BQU0sVUFBVSxHQUFHLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ25ELE9BQU8sSUFBSSxNQUFNLENBQUM7WUFDakIsT0FBTyxFQUFFLDZCQUE2QjtZQUN0QyxNQUFNLEVBQUUsVUFBVSxDQUFDLE1BQU07WUFDekIsR0FBRyxpQkFBaUI7U0FDcEIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztTQUFNLElBQUksWUFBWSxLQUFLLGtCQUFrQixFQUFFLENBQUM7UUFDaEQsTUFBTSxVQUFVLEdBQUcsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDbkQsTUFBTSxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3hELE9BQU8sSUFBSSxNQUFNLENBQUM7WUFDakIsT0FBTyxFQUFFLFVBQVUsQ0FBQyxRQUFRO1lBQzVCLE1BQU0sRUFBRSxVQUFVLENBQUMsTUFBTTtZQUN6QixjQUFjLEVBQUUsT0FBTztZQUN2QixHQUFHLGlCQUFpQjtTQUNwQixDQUFDLENBQUE7SUFDSCxDQUFDO1NBQU0sSUFBSSxZQUFZLEtBQUssTUFBTSxFQUFFLENBQUM7UUFDcEMsTUFBTSxVQUFVLEdBQUcsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDbkQsT0FBTyxJQUFJLE1BQU0sQ0FBQztZQUNqQixPQUFPLEVBQUUsZ0NBQWdDO1lBQ3pDLE1BQU0sRUFBRSxVQUFVLENBQUMsTUFBTTtZQUN6QixHQUFHLGlCQUFpQjtTQUNwQixDQUFDLENBQUE7SUFDSCxDQUFDO1NBQU0sSUFBSSxZQUFZLEtBQUssS0FBSyxFQUFFLENBQUM7UUFDbkMsTUFBTSxVQUFVLEdBQUcsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDbkQsT0FBTyxJQUFJLE1BQU0sQ0FBQztZQUNqQixPQUFPLEVBQUUscUJBQXFCO1lBQzlCLE1BQU0sRUFBRSxVQUFVLENBQUMsTUFBTTtZQUN6QixHQUFHLGlCQUFpQjtTQUNwQixDQUFDLENBQUE7SUFDSCxDQUFDO1NBQU0sSUFBSSxZQUFZLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDdkMsTUFBTSxVQUFVLEdBQUcsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDbkQsT0FBTyxJQUFJLE1BQU0sQ0FBQztZQUNqQixPQUFPLEVBQUUsMkJBQTJCO1lBQ3BDLE1BQU0sRUFBRSxVQUFVLENBQUMsTUFBTTtZQUN6QixHQUFHLGlCQUFpQjtTQUNwQixDQUFDLENBQUE7SUFDSCxDQUFDOztRQUFNLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLFlBQVksR0FBRyxDQUFDLENBQUE7QUFDMUUsQ0FBQyxDQUFBO0FBRUQsTUFBTSx3QkFBd0IsR0FBRyxLQUFLLEVBQUUsRUFDdkMsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsRUFDeEMsY0FBYyxFQUNkLE9BQU8sRUFDUCxrQkFBa0IsRUFDbEIsU0FBUyxFQUFFLFVBQVUsRUFDckIsV0FBVyxFQUNYLFlBQVksRUFDWixnQkFBZ0IsR0FDUSxFQUFFLEVBQUU7SUFDNUIsTUFBTSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsdUJBQXVCLEVBQUUsR0FBRyxvQkFBb0IsQ0FDL0UsWUFBWSxFQUNaLFVBQVUsRUFDVixnQkFBZ0IsQ0FDaEIsQ0FBQTtJQUVELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNsQixJQUFJLFNBQVMsS0FBSyxVQUFVO1lBQzNCLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxTQUFTLFNBQVMsd0JBQXdCLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7O1lBRWpGLE9BQU8sQ0FBQztnQkFDUCxPQUFPLEVBQUUsU0FBUyxVQUFVLEtBQUssU0FBUyx5QkFBeUI7Z0JBQ25FLFNBQVMsRUFBRSxJQUFJO2FBQ2YsQ0FBQyxDQUFBO1FBQ0gsT0FBTTtJQUNQLENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLHNCQUFzQixDQUFDO1FBQzNDLFlBQVk7UUFDWixrQkFBa0I7UUFDbEIsZ0JBQWdCLEVBQUUsdUJBQXVCO0tBQ3pDLENBQUMsQ0FBQTtJQUNGLE1BQU0sQ0FBQyxXQUFXO1NBQ2hCLE1BQU0sQ0FBQztRQUNQLEtBQUssRUFBRSxTQUFTO1FBQ2hCLE1BQU0sRUFBRSxNQUFNO1FBQ2QsTUFBTSxFQUFFLE1BQU07UUFDZCxJQUFJLEVBQUUsVUFBVTtRQUNoQixVQUFVLEVBQUUsR0FBRztLQUNmLENBQUM7U0FDRCxJQUFJLENBQUMsS0FBSyxFQUFFLFFBQWEsRUFBRSxFQUFFO1FBQzdCLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFBO1FBQzFDLGNBQWMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsRUFBRSxFQUFFLGtCQUFrQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7SUFDMUUsQ0FBQyxDQUFDO1NBQ0QsS0FBSyxDQUFDLENBQUMsS0FBVSxFQUFFLEVBQUU7UUFDckIsSUFBSSxLQUFLLFlBQVksTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3RDLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztnQkFDMUIsT0FBTyxDQUFDLEVBQUUsT0FBTyxFQUFFLG9CQUFvQixDQUFDLFlBQVksQ0FBQyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1lBQzNFLENBQUM7aUJBQU0sSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO2dCQUNqQywrREFBK0Q7Z0JBQy9ELE1BQU0sTUFBTSxHQUFRLEtBQVksQ0FBQTtnQkFDaEMsTUFBTSxhQUFhLEdBQ2xCLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtnQkFDekYsSUFBSSxPQUFPLEdBQUcsRUFBRSxHQUFHLENBQUMsYUFBYSxJQUFJLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQTtnQkFDM0UsTUFBTSxHQUFHLEdBQUcsQ0FBQyxHQUFHLEVBQUU7b0JBQ2pCLElBQUksQ0FBQzt3QkFDSixPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFBO29CQUN2QyxDQUFDO29CQUFDLE1BQU0sQ0FBQzt3QkFDUixPQUFPLEVBQUUsQ0FBQTtvQkFDVixDQUFDO2dCQUNGLENBQUMsQ0FBQyxFQUFFLENBQUE7Z0JBQ0osTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7Z0JBQ3BFLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsMkJBQTJCLENBQUE7Z0JBQ3hFLE9BQU8sQ0FBQztvQkFDUCxPQUFPLEVBQUUsNEJBQTRCLFNBQVMsMENBQTBDO29CQUN4RixTQUFTLEVBQUUsS0FBSztpQkFDaEIsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEdBQUcsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1lBQ25ELENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEdBQUcsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ25ELENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNKLENBQUMsQ0FBQTtBQUVELE1BQU0sc0JBQXNCLEdBQUcsQ0FBQyxRQUEwQixFQUFFLEVBQUU7SUFDN0QsTUFBTSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFBO0lBRTlDLE1BQU0sY0FBYyxHQUE2RCxFQUFFLENBQUE7SUFDbkYsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUMxQixjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUE7SUFDekQsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLEVBQUUsVUFBVTtRQUNoQixRQUFRLEVBQUU7WUFDVCxJQUFJLEVBQUUsSUFBSTtZQUNWLHdHQUF3RztZQUN4RyxXQUFXLEVBQUUsV0FBVztZQUN4QixVQUFVLEVBQUU7Z0JBQ1gsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsVUFBVSxFQUFFLE1BQU07Z0JBQ2xCLDhHQUE4RztnQkFDOUcsK0JBQStCO2FBQy9CO1NBQ0Q7S0FDYSxDQUFBO0FBQ2hCLENBQUMsQ0FBQTtBQUVELE1BQU0sV0FBVyxHQUFHLENBQUMsUUFBeUIsRUFBRSxRQUF3QyxFQUFFLEVBQUU7SUFDM0YsTUFBTSxZQUFZLEdBQUcsY0FBYyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN2RCxJQUFJLENBQUMsWUFBWSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUM7UUFBRSxPQUFPLElBQUksQ0FBQTtJQUV4RSxNQUFNLFdBQVcsR0FBVSxFQUFFLENBQUE7SUFDN0IsS0FBSyxNQUFNLENBQUMsSUFBSSxZQUFZLElBQUksRUFBRSxFQUFFLENBQUM7UUFDcEMsV0FBVyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzFELENBQUM7SUFDRCxPQUFPLFdBQVcsQ0FBQTtBQUNuQixDQUFDLENBQUE7QUFFRCwyQ0FBMkM7QUFDM0MsTUFBTSx5QkFBeUIsR0FBRyxDQUNqQyxJQUFZLEVBQ1osYUFBcUIsRUFDckIsRUFBVSxFQUNjLEVBQUU7SUFDMUIsSUFBSSxLQUFjLENBQUE7SUFDbEIsSUFBSSxDQUFDO1FBQ0osS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDWixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxJQUFJLEtBQUssS0FBSyxJQUFJO1FBQUUsT0FBTyxJQUFJLENBQUE7SUFDL0IsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRO1FBQUUsT0FBTyxJQUFJLENBQUE7SUFFMUMsTUFBTSxTQUFTLEdBQXFCLEtBQUssQ0FBQTtJQUN6QyxPQUFPLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFBO0FBQ2pGLENBQUMsQ0FBQTtBQUVELE1BQU0sK0JBQStCLEdBQUcsQ0FDdkMsU0FBMEMsRUFDbEIsRUFBRTtJQUMxQixNQUFNLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxTQUFTLENBQUE7SUFFckMsSUFBSSxLQUFLLEtBQUssSUFBSTtRQUFFLE9BQU8sSUFBSSxDQUFBO0lBQy9CLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUTtRQUFFLE9BQU8sSUFBSSxDQUFBO0lBRTFDLE1BQU0sU0FBUyxHQUFxQixLQUFLLENBQUE7SUFDekMsT0FBTyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQTtBQUNqRixDQUFDLENBQUE7QUFFRCw4Q0FBOEM7QUFFOUMsTUFBTSx5QkFBeUIsR0FBRyxLQUFLLEVBQUUsRUFDeEMsUUFBUSxFQUNSLE1BQU0sRUFDTixjQUFjLEVBQ2QsT0FBTyxFQUNQLGtCQUFrQixFQUNsQixxQkFBcUIsRUFDckIsU0FBUyxFQUFFLFVBQVUsRUFDckIsV0FBVyxFQUNYLFlBQVksRUFDWixRQUFRLEVBQ1IscUJBQXFCLEVBQ3JCLGdCQUFnQixFQUNoQixRQUFRLEdBQ2lCLEVBQUUsRUFBRTtJQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLCtDQUErQyxFQUFFO1FBQzVELFlBQVk7UUFDWixTQUFTLEVBQUUsVUFBVTtRQUNyQixZQUFZLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRCxnQkFBZ0IsRUFBRSxDQUFDLENBQUMscUJBQXFCO0tBQ3pDLENBQUMsQ0FBQTtJQUVGLE1BQU0sRUFBRSxTQUFTLEVBQUUsaUJBQWlCLEVBQUUscUJBQXFCLEVBQUUsdUJBQXVCLEVBQUUsR0FDckYsb0JBQW9CLENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO0lBRWpFLE1BQU0sRUFBRSwyQkFBMkIsRUFBRSxHQUFHLHVCQUF1QixDQUFDLFlBQVksQ0FBQyxDQUFBO0lBRTdFLFlBQVk7SUFDWixNQUFNLEVBQUUsY0FBYyxFQUFFLG1CQUFtQixFQUFFLEdBQUcscUJBQXFCLElBQUksRUFBRSxDQUFBO0lBQzNFLE1BQU0sYUFBYSxHQUFHLHdCQUF3QixDQUM3QyxNQUFNLEVBQ04sWUFBWSxFQUNaLFVBQVUsRUFDVixxQkFBcUIsRUFDckIsZ0JBQWdCLENBQ2hCLENBQUEsQ0FBQyx5QkFBeUI7SUFFM0IsTUFBTSxnQkFBZ0IsR0FBRztRQUN4QixHQUFHLDJCQUEyQixFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLGFBQWEsQ0FBQztRQUN4RSxHQUFHLHVCQUF1QjtLQUMxQixDQUFBO0lBRUQsUUFBUTtJQUNSLE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDdEQsTUFBTSxjQUFjLEdBQ25CLGNBQWMsSUFBSSxpQkFBaUIsS0FBSyxjQUFjO1FBQ3JELENBQUMsQ0FBRSxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQVk7UUFDdEMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtJQUVOLFdBQVc7SUFDWCxNQUFNLE1BQU0sR0FBVyxNQUFNLHNCQUFzQixDQUFDO1FBQ25ELFlBQVk7UUFDWixrQkFBa0I7UUFDbEIsZ0JBQWdCO0tBQ2hCLENBQUMsQ0FBQTtJQUNGLElBQUksWUFBWSxLQUFLLGdCQUFnQixFQUFFLENBQUM7UUFDdkMsK0JBQStCO1FBQy9CLENBQUM7UUFBQyxNQUFzQixDQUFDLGNBQWMsR0FBRyxTQUFTLENBQUE7SUFDcEQsQ0FBQztJQUNELE1BQU0sT0FBTyxHQUFRO1FBQ3BCLEtBQUssRUFBRSxTQUFTO1FBQ2hCLFFBQVEsRUFBRSxRQUFlO1FBQ3pCLE1BQU0sRUFBRSxJQUFJO1FBQ1osR0FBRyxjQUFjO1FBQ2pCLEdBQUcsdUJBQXVCO1FBQzFCLG9DQUFvQztLQUNwQyxDQUFBO0lBRUQsbURBQW1EO0lBQ25ELE1BQU0sRUFDTCxnQkFBZ0IsRUFBRSx5QkFBeUIsRUFDM0Msa0JBQWtCLEVBQUUsMkJBQTJCLEdBQy9DLEdBQUcsMkJBQTJCLEVBQUUsTUFBTSxJQUFJLEVBQUUsQ0FBQTtJQUM3QyxNQUFNLHNCQUFzQixHQUFHLHlCQUF5QixJQUFJLGNBQWMsSUFBSSxtQkFBbUIsQ0FBQTtJQUNqRyxJQUFJLHNCQUFzQixFQUFFLENBQUM7UUFDNUIsTUFBTSxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSxHQUFHLHVCQUF1QixDQUMvRCxNQUFNLEVBQ04sY0FBYyxFQUNkLG1CQUFtQixDQUNuQixDQUFBO1FBQ0QsTUFBTSxHQUFHLFNBQVMsQ0FBQTtRQUNsQixjQUFjLEdBQUcsaUJBQWlCLENBQUE7SUFDbkMsQ0FBQztJQUVELHlDQUF5QztJQUN6QyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUN4QixNQUFNLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixFQUFFLEdBQUcsc0JBQXNCLENBQzlELE1BQU0sRUFDTixjQUFjLEVBQ2QsUUFBUSxFQUNSLFFBQVEsQ0FDUixDQUFBO1FBQ0QsTUFBTSxHQUFHLFNBQVMsQ0FBQTtRQUNsQixjQUFjLEdBQUcsaUJBQWlCLENBQUE7SUFDbkMsQ0FBQztJQUVELElBQUksa0JBQWtCLEdBQUcsRUFBRSxDQUFBO0lBQzNCLElBQUksYUFBYSxHQUFHLEVBQUUsQ0FBQTtJQUV0QixJQUFJLFFBQVEsR0FBRyxFQUFFLENBQUE7SUFDakIsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFBO0lBQ2YsSUFBSSxhQUFhLEdBQUcsRUFBRSxDQUFBO0lBRXRCLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVztTQUNyQixNQUFNLENBQUMsT0FBTyxDQUFDO1NBQ2YsSUFBSSxDQUFDLEtBQUssRUFBRSxRQUFhLEVBQUUsRUFBRTtRQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLDZDQUE2QyxFQUFFO1lBQzFELFFBQVEsRUFBRyxrQkFBMEIsQ0FBQyxRQUFRO1lBQzlDLEtBQUssRUFBRSxTQUFTO1lBQ2hCLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtZQUN0QixZQUFZLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxNQUFNLElBQUksQ0FBQztTQUMzQyxDQUFDLENBQUE7UUFFRixXQUFXLENBQUMsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQzlDLG9CQUFvQjtRQUNwQixJQUFJLEtBQUssRUFBRSxNQUFNLEtBQUssSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNwQyxVQUFVO1lBQ1YsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxJQUFJLEVBQUUsQ0FBQTtZQUN0RCxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLEVBQUU7b0JBQzFDLGFBQWEsRUFBRSxPQUFPLENBQUMsTUFBTTtvQkFDN0IsT0FBTyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2lCQUN0RSxDQUFDLENBQUE7WUFDSCxDQUFDO1lBQ0QsYUFBYSxJQUFJLE9BQU8sQ0FBQTtZQUV4QixZQUFZO1lBQ1osS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxVQUFVLElBQUksRUFBRSxFQUFFLENBQUM7Z0JBQzlELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUE7Z0JBQ3hCLElBQUksS0FBSyxLQUFLLENBQUM7b0JBQUUsU0FBUTtnQkFFekIsUUFBUSxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQTtnQkFDckMsYUFBYSxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsU0FBUyxJQUFJLEVBQUUsQ0FBQTtnQkFDL0MsTUFBTSxJQUFJLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFBO1lBQ3hCLENBQUM7WUFFRCxZQUFZO1lBQ1osSUFBSSxZQUFZLEdBQUcsRUFBRSxDQUFBO1lBQ3JCLElBQUksMkJBQTJCLEVBQUUsQ0FBQztnQkFDakMsYUFBYTtnQkFDYixZQUFZLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLDJCQUEyQixDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFBO2dCQUNsRixrQkFBa0IsSUFBSSxZQUFZLENBQUE7WUFDbkMsQ0FBQztZQUVELGNBQWM7WUFDZCxNQUFNLENBQUM7Z0JBQ04sUUFBUSxFQUFFLGFBQWE7Z0JBQ3ZCLGFBQWEsRUFBRSxrQkFBa0I7Z0JBQ2pDLFFBQVEsRUFBRSxDQUFDLFFBQVE7b0JBQ2xCLENBQUMsQ0FBQyxTQUFTO29CQUNYLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRTthQUMvRSxDQUFDLENBQUE7UUFDSCxDQUFDO1FBQ0QsV0FBVztRQUNYLElBQUksQ0FBQyxhQUFhLElBQUksQ0FBQyxrQkFBa0IsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3hELE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSwyQ0FBMkMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNuRixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sUUFBUSxHQUFHLHlCQUF5QixDQUFDLFFBQVEsRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDM0UsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7WUFDaEQsY0FBYyxDQUFDO2dCQUNkLFFBQVEsRUFBRSxhQUFhO2dCQUN2QixhQUFhLEVBQUUsa0JBQWtCO2dCQUNqQyxrQkFBa0IsRUFBRSxJQUFJO2dCQUN4QixHQUFHLFdBQVc7YUFDZCxDQUFDLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQyxDQUFDO1FBQ0YsK0VBQStFO1NBQzlFLEtBQUssQ0FBQyxLQUFLLEVBQUUsS0FBVSxFQUFFLEVBQUU7UUFDM0IsSUFBSSxLQUFLLFlBQVksTUFBTSxDQUFDLFFBQVEsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQzlELE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQyxZQUFZLENBQUMsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUMzRSxDQUFDO2FBQU0sSUFBSSxLQUFLLFlBQVksTUFBTSxDQUFDLFFBQVEsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFLENBQUM7WUFDaEksNEVBQTRFO1lBQzVFLElBQUksQ0FBQztnQkFDSixNQUFNLG1CQUFtQixHQUFHLEVBQUUsR0FBRyxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFBO2dCQUN6RCxNQUFNLFFBQVEsR0FBRyxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO2dCQUUxRSxnQ0FBZ0M7Z0JBQ2hDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLE9BQU8sSUFBSSxFQUFFLENBQUE7Z0JBQzNELE1BQU0sQ0FBQyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7Z0JBQ2hELGNBQWMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQ25GLENBQUM7WUFBQyxPQUFPLGFBQWEsRUFBRSxDQUFDO2dCQUN4QixPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsNEJBQTRCLGFBQWEsRUFBRSxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFBO1lBQzVGLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEdBQUcsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ25ELENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNKLENBQUMsQ0FBQTtBQVFELE1BQU0scUJBQXFCLEdBQUcsS0FBSyxFQUFFLEVBQ3BDLFNBQVMsRUFBRSxVQUFVLEVBQ3JCLE9BQU8sRUFBRSxRQUFRLEVBQ2pCLGtCQUFrQixFQUNsQixZQUFZLEdBQ3NCLEVBQUUsRUFBRTtJQUN0QyxNQUFNLFNBQVMsR0FBRyxDQUFDLEVBQUUsTUFBTSxFQUE2QixFQUFFLEVBQUU7UUFDM0QsVUFBVSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtJQUN2QixDQUFDLENBQUE7SUFDRCxNQUFNLE9BQU8sR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFxQixFQUFFLEVBQUU7UUFDaEQsUUFBUSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUNwQixDQUFDLENBQUE7SUFDRCxJQUFJLENBQUM7UUFDSixNQUFNLE1BQU0sR0FBRyxNQUFNLHNCQUFzQixDQUFDLEVBQUUsWUFBWSxFQUFFLGtCQUFrQixFQUFFLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsTUFBTTthQUNYLElBQUksRUFBRTthQUNOLElBQUksQ0FBQyxLQUFLLEVBQUUsUUFBYSxFQUFFLEVBQUU7WUFDN0IsTUFBTSxNQUFNLEdBQWtCLEVBQUUsQ0FBQTtZQUNoQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzdCLE9BQU8sUUFBUSxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUM7Z0JBQy9CLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDcEQsQ0FBQztZQUNELFNBQVMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7UUFDdEIsQ0FBQyxDQUFDO2FBQ0QsS0FBSyxDQUFDLENBQUMsS0FBVSxFQUFFLEVBQUU7WUFDckIsT0FBTyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQy9CLENBQUMsQ0FBQyxDQUFBO0lBQ0osQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDaEIsT0FBTyxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQy9CLENBQUM7QUFDRixDQUFDLENBQUE7QUFFRCxnREFBZ0Q7QUFDaEQsTUFBTSxlQUFlLEdBQUcsQ0FBQyxRQUEwQixFQUFFLEVBQUU7SUFDdEQsTUFBTSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFBO0lBQzlDLE1BQU0sY0FBYyxHQUE2RCxFQUFFLENBQUE7SUFDbkYsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUMxQixjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUE7SUFDekQsQ0FBQztJQUNELE9BQU87UUFDTixJQUFJLEVBQUUsSUFBSTtRQUNWLFdBQVcsRUFBRSxXQUFXO1FBQ3hCLFlBQVksRUFBRTtZQUNiLElBQUksRUFBRSxRQUFRO1lBQ2QsVUFBVSxFQUFFLGNBQWM7WUFDMUIsaUNBQWlDO1NBQ2pDO0tBQ2lDLENBQUE7QUFDcEMsQ0FBQyxDQUFBO0FBRUQsTUFBTSxjQUFjLEdBQUcsQ0FBQyxRQUF5QixFQUFFLFFBQXdDLEVBQUUsRUFBRTtJQUM5RixNQUFNLFlBQVksR0FBRyxjQUFjLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3ZELElBQUksQ0FBQyxZQUFZLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQztRQUFFLE9BQU8sSUFBSSxDQUFBO0lBRXhFLE1BQU0sY0FBYyxHQUFtQyxFQUFFLENBQUE7SUFDekQsS0FBSyxNQUFNLENBQUMsSUFBSSxZQUFZLElBQUksRUFBRSxFQUFFLENBQUM7UUFDcEMsY0FBYyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN0RCxDQUFDO0lBQ0QsT0FBTyxjQUFjLENBQUE7QUFDdEIsQ0FBQyxDQUFBO0FBRUQsc0NBQXNDO0FBQ3RDLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxFQUFFLEVBQ2hDLFFBQVEsRUFDUixZQUFZLEVBQ1osTUFBTSxFQUNOLGNBQWMsRUFDZCxPQUFPLEVBQ1Asa0JBQWtCLEVBQ2xCLHFCQUFxQixFQUNyQixnQkFBZ0IsRUFDaEIsU0FBUyxFQUFFLFVBQVUsRUFDckIsV0FBVyxFQUNYLHFCQUFxQixFQUNyQixRQUFRLEVBQ1IsUUFBUSxHQUNpQixFQUFFLEVBQUU7SUFDN0IsTUFBTSxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSxHQUFHLG9CQUFvQixDQUM1RCxZQUFZLEVBQ1osVUFBVSxFQUNWLGdCQUFnQixDQUNoQixDQUFBO0lBRUQsTUFBTSxVQUFVLEdBQUcsa0JBQWtCLENBQUMsU0FBUyxDQUFBO0lBQy9DLE1BQU0sRUFBRSwyQkFBMkIsRUFBRSxHQUFHLHVCQUF1QixDQUFDLFlBQVksQ0FBQyxDQUFBO0lBRTdFLFlBQVk7SUFDWixNQUFNLGFBQWEsR0FBRyx3QkFBd0IsQ0FDN0MsTUFBTSxFQUNOLFlBQVksRUFDWixVQUFVLEVBQ1YscUJBQXFCLEVBQ3JCLGdCQUFnQixDQUNoQixDQUFBLENBQUMseUJBQXlCO0lBQzNCLE1BQU0sZ0JBQWdCLEdBQ3JCLDJCQUEyQixFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUU1RSxrQ0FBa0M7SUFDbEMsTUFBTSxTQUFTLEdBQUcsMkJBQTJCLENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRTtRQUN2RSxrQkFBa0IsRUFBRSxDQUFDLENBQUMsYUFBYSxFQUFFLGtCQUFrQjtRQUN2RCxnQkFBZ0I7S0FDaEIsQ0FBQyxDQUFBO0lBRUYsUUFBUTtJQUNSLE1BQU0sY0FBYyxHQUFHLGNBQWMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDekQsTUFBTSxjQUFjLEdBQ25CLGNBQWMsSUFBSSxpQkFBaUIsS0FBSyxpQkFBaUI7UUFDeEQsQ0FBQyxDQUFFLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQVk7UUFDckUsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtJQUVOLFdBQVc7SUFDWCxNQUFNLFNBQVMsR0FBRyxJQUFJLFNBQVMsQ0FBQztRQUMvQixNQUFNLEVBQUUsVUFBVSxDQUFDLE1BQU07UUFDekIsdUJBQXVCLEVBQUUsSUFBSTtLQUM3QixDQUFDLENBQUE7SUFFRixNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUN4QyxNQUFNLEVBQUUscUJBQXFCLElBQUksU0FBUztRQUMxQyxRQUFRLEVBQUUsUUFBcUM7UUFDL0MsS0FBSyxFQUFFLFNBQVM7UUFDaEIsVUFBVSxFQUFFLFNBQVMsSUFBSSxLQUFLLEVBQUUsMEJBQTBCO1FBQzFELEdBQUcsZ0JBQWdCO1FBQ25CLEdBQUcsY0FBYztLQUNqQixDQUFDLENBQUE7SUFFRix5Q0FBeUM7SUFDekMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDeEIsTUFBTSxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSxHQUFHLHNCQUFzQixDQUM5RCxNQUFNLEVBQ04sY0FBYyxFQUNkLFFBQVEsRUFDUixRQUFRLENBQ1IsQ0FBQTtRQUNELE1BQU0sR0FBRyxTQUFTLENBQUE7UUFDbEIsY0FBYyxHQUFHLGlCQUFpQixDQUFBO0lBQ25DLENBQUM7SUFFRCxvQkFBb0I7SUFDcEIsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFBO0lBQ2pCLElBQUksYUFBYSxHQUFHLEVBQUUsQ0FBQTtJQUV0QixJQUFJLFlBQVksR0FBRyxFQUFFLENBQUE7SUFDckIsSUFBSSxjQUFjLEdBQUcsRUFBRSxDQUFBO0lBRXZCLE1BQU0sU0FBUyxHQUFHLEdBQUcsRUFBRTtRQUN0QixNQUFNLENBQUM7WUFDTixRQUFRO1lBQ1IsYUFBYTtZQUNiLFFBQVEsRUFBRSxDQUFDLFlBQVk7Z0JBQ3RCLENBQUMsQ0FBQyxTQUFTO2dCQUNYLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRTtTQUNwRixDQUFDLENBQUE7SUFDSCxDQUFDLENBQUE7SUFDRCwyREFBMkQ7SUFDM0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtRQUM5QixjQUFjO1FBQ2QsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLHFCQUFxQixFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDckMsSUFBSSxRQUFRO29CQUFFLFFBQVEsSUFBSSxNQUFNLENBQUEsQ0FBQyw0QkFBNEI7Z0JBQzdELFFBQVEsSUFBSSxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQTtnQkFDaEMsU0FBUyxFQUFFLENBQUE7WUFDWixDQUFDO2lCQUFNLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFFLENBQUM7Z0JBQ2hELElBQUksYUFBYTtvQkFBRSxhQUFhLElBQUksTUFBTSxDQUFBLENBQUMsaUNBQWlDO2dCQUM1RSxhQUFhLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUE7Z0JBQ3pDLFNBQVMsRUFBRSxDQUFBO1lBQ1osQ0FBQztpQkFBTSxJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLG1CQUFtQixFQUFFLENBQUM7Z0JBQ3pELE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQzFDLElBQUksYUFBYTtvQkFBRSxhQUFhLElBQUksTUFBTSxDQUFBLENBQUMsaUNBQWlDO2dCQUM1RSxhQUFhLElBQUkscUJBQXFCLENBQUE7Z0JBQ3RDLFNBQVMsRUFBRSxDQUFBO1lBQ1osQ0FBQztpQkFBTSxJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUNoRCxZQUFZLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFBLENBQUMsc0RBQXNEO2dCQUNqRyxTQUFTLEVBQUUsQ0FBQTtZQUNaLENBQUM7UUFDRixDQUFDO1FBRUQsUUFBUTthQUNILElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxxQkFBcUIsRUFBRSxDQUFDO1lBQzNDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssWUFBWSxFQUFFLENBQUM7Z0JBQ25DLFFBQVEsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQTtnQkFDeEIsU0FBUyxFQUFFLENBQUE7WUFDWixDQUFDO2lCQUFNLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssZ0JBQWdCLEVBQUUsQ0FBQztnQkFDOUMsYUFBYSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFBO2dCQUNqQyxTQUFTLEVBQUUsQ0FBQTtZQUNaLENBQUM7aUJBQU0sSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxrQkFBa0IsRUFBRSxDQUFDO2dCQUNoRCxXQUFXO2dCQUNYLGNBQWMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUEsQ0FBQyw0R0FBNEc7Z0JBQ3pKLFNBQVMsRUFBRSxDQUFBO1lBQ1osQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLHlFQUF5RTtJQUN6RSxNQUFNLENBQUMsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFO1FBQ3RDLE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQ2pELENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLFVBQVUsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLG1CQUFtQixDQUM5RCxDQUFBO1FBQ0QsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFDLENBQUE7UUFDbkUsNkRBQTZEO1FBQzdELGdFQUFnRTtRQUNoRSxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksK0JBQStCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdEUsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFFaEQsY0FBYyxDQUFDLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxrQkFBa0IsRUFBRSxHQUFHLFdBQVcsRUFBRSxDQUFDLENBQUE7SUFDaEYsQ0FBQyxDQUFDLENBQUE7SUFDRixXQUFXO0lBQ1gsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtRQUM1QixJQUFJLEtBQUssWUFBWSxTQUFTLENBQUMsUUFBUSxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDakUsT0FBTyxDQUFDLEVBQUUsT0FBTyxFQUFFLG9CQUFvQixDQUFDLFlBQVksQ0FBQyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQzNFLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssR0FBRyxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDbkQsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0YsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtBQUM3QyxDQUFDLENBQUE7QUFFRCxvQ0FBb0M7QUFDcEMsdUNBQXVDO0FBQ3ZDLE1BQU0sY0FBYyxHQUFHLENBQUMsRUFDdkIsUUFBUSxFQUNSLGNBQWMsRUFDZCxPQUFPLEVBQ1Asa0JBQWtCLEVBQ2xCLGdCQUFnQixFQUNoQixTQUFTLEVBQUUsVUFBVSxFQUNyQixXQUFXLEVBQ1gsWUFBWSxHQUNZLEVBQUUsRUFBRTtJQUM1QixNQUFNLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxHQUFHLG9CQUFvQixDQUN0RCxZQUFZLEVBQ1osVUFBVSxFQUNWLGdCQUFnQixDQUNoQixDQUFBO0lBQ0QsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ2xCLElBQUksU0FBUyxLQUFLLFVBQVU7WUFDM0IsT0FBTyxDQUFDLEVBQUUsT0FBTyxFQUFFLFNBQVMsU0FBUyx3QkFBd0IsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTs7WUFFakYsT0FBTyxDQUFDO2dCQUNQLE9BQU8sRUFBRSxTQUFTLFVBQVUsS0FBSyxTQUFTLHlCQUF5QjtnQkFDbkUsU0FBUyxFQUFFLElBQUk7YUFDZixDQUFDLENBQUE7UUFDSCxPQUFNO0lBQ1AsQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFHLElBQUksV0FBVyxDQUFDLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQzlFLFdBQVcsQ0FBQyxPQUFPLEVBQUU7UUFDcEIsS0FBSyxFQUFFLFNBQVM7UUFDaEIsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNO1FBQ3ZCLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTTtRQUN2QixNQUFNLEVBQUUsS0FBSztRQUNiLFNBQVMsRUFBRSxHQUFHO1FBQ2QsSUFBSSxFQUFFLFFBQVEsQ0FBQyxVQUFVO0tBQ3pCLENBQUM7U0FDQSxJQUFJLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFFO1FBQ3hCLDhDQUE4QztRQUM5QyxJQUFJLE9BQU8sR0FBRyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO1FBQ3ZGLE1BQU0sUUFBUSxHQUNiLE9BQU8sT0FBTyxLQUFLLFFBQVE7WUFDMUIsQ0FBQyxDQUFDLE9BQU87WUFDVCxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7UUFFOUUsY0FBYyxDQUFDLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUMxRSxDQUFDLENBQUM7U0FDRCxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtRQUNoQixPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxHQUFHLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUNuRCxDQUFDLENBQUMsQ0FBQTtBQUNKLENBQUMsQ0FBQTtBQUVELG1DQUFtQztBQUNuQyxNQUFNLFlBQVksR0FBRyxDQUFDLEVBQUUsUUFBUSxFQUF3QixFQUFFLEVBQUU7SUFDM0QsZ0hBQWdIO0lBQ2hILElBQUksQ0FBQyxRQUFRO1FBQ1osTUFBTSxJQUFJLEtBQUssQ0FDZCwyQ0FBMkMsdUJBQXVCLENBQUMsTUFBTSxDQUFDLFFBQVEsd0NBQXdDLENBQzFILENBQUE7SUFDRixNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFBO0lBQzdDLE9BQU8sTUFBTSxDQUFBO0FBQ2QsQ0FBQyxDQUFBO0FBRUQsTUFBTSxVQUFVLEdBQUcsS0FBSyxFQUFFLEVBQ3pCLFNBQVMsRUFBRSxVQUFVLEVBQ3JCLE9BQU8sRUFBRSxRQUFRLEVBQ2pCLGtCQUFrQixHQUN3QixFQUFFLEVBQUU7SUFDOUMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxFQUFFLE1BQU0sRUFBcUMsRUFBRSxFQUFFO1FBQ25FLFVBQVUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDdkIsQ0FBQyxDQUFBO0lBQ0QsTUFBTSxPQUFPLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBcUIsRUFBRSxFQUFFO1FBQ2hELFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDcEIsQ0FBQyxDQUFBO0lBQ0QsSUFBSSxDQUFDO1FBQ0osTUFBTSxVQUFVLEdBQUcsa0JBQWtCLENBQUMsTUFBTSxDQUFBO1FBQzVDLE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxFQUFFLFFBQVEsRUFBRSxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUM5RCxNQUFNO2FBQ0osSUFBSSxFQUFFO2FBQ04sSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDbEIsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQTtZQUMzQixTQUFTLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO1FBQ3RCLENBQUMsQ0FBQzthQUNELEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ2hCLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMvQixDQUFDLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2hCLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUMvQixDQUFDO0FBQ0YsQ0FBQyxDQUFBO0FBRUQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxFQUN0QixRQUFRLEVBQ1IsY0FBYyxFQUNkLE9BQU8sRUFDUCxrQkFBa0IsRUFDbEIsU0FBUyxFQUNULFdBQVcsR0FDYSxFQUFFLEVBQUU7SUFDNUIsTUFBTSxVQUFVLEdBQUcsa0JBQWtCLENBQUMsTUFBTSxDQUFBO0lBQzVDLE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxFQUFFLFFBQVEsRUFBRSxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUU5RCxJQUFJLFFBQVEsR0FBRyxFQUFFLENBQUE7SUFDakIsTUFBTTtTQUNKLFFBQVEsQ0FBQztRQUNULEtBQUssRUFBRSxTQUFTO1FBQ2hCLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTTtRQUN2QixNQUFNLEVBQUUsUUFBUSxDQUFDLE1BQU07UUFDdkIsT0FBTyxFQUFFO1lBQ1IsSUFBSSxFQUFFLFFBQVEsQ0FBQyxVQUFVO1lBQ3pCLFdBQVcsRUFBRSxHQUFHLEVBQUUsYUFBYTtZQUMvQixxQkFBcUI7U0FDckI7UUFDRCxHQUFHLEVBQUUsSUFBSTtRQUNULE1BQU0sRUFBRSxJQUFJLEVBQUUsaURBQWlEO0tBQy9ELENBQUM7U0FDRCxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3RCLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUNqQyxJQUFJLEtBQUssRUFBRSxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNsQyxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFBO1lBQzlCLFFBQVEsSUFBSSxPQUFPLENBQUE7UUFDcEIsQ0FBQztRQUNELGNBQWMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsRUFBRSxFQUFFLGtCQUFrQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7SUFDMUUsQ0FBQyxDQUFDO1FBQ0Ysa0JBQWtCO1NBQ2pCLEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1FBQ2hCLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEdBQUcsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBQ25ELENBQUMsQ0FBQyxDQUFBO0FBQ0osQ0FBQyxDQUFBO0FBRUQsaUVBQWlFO0FBRWpFLE1BQU0sb0JBQW9CLEdBQUcsQ0FBQyxRQUEwQixFQUFFLEVBQUU7SUFDM0QsTUFBTSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFBO0lBQzlDLE9BQU87UUFDTixJQUFJO1FBQ0osV0FBVztRQUNYLFVBQVUsRUFBRTtZQUNYLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNqQixVQUFVLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQ3hDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUU7Z0JBQ3JCLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRztvQkFDVixJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU07b0JBQ2pCLFdBQVcsRUFBRSxLQUFLLENBQUMsV0FBVztpQkFDOUIsQ0FBQTtnQkFDRCxPQUFPLEdBQUcsQ0FBQTtZQUNYLENBQUMsRUFDRCxFQUE0QixDQUM1QjtTQUNEO0tBQzZCLENBQUE7QUFDaEMsQ0FBQyxDQUFBO0FBRUQsTUFBTSxXQUFXLEdBQUcsQ0FDbkIsUUFBeUIsRUFDekIsUUFBd0MsRUFDbEIsRUFBRTtJQUN4QixNQUFNLFlBQVksR0FBRyxjQUFjLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3ZELElBQUksQ0FBQyxZQUFZLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQztRQUFFLE9BQU8sSUFBSSxDQUFBO0lBQ3hFLE1BQU0sYUFBYSxHQUEwQixFQUFFLENBQUE7SUFDL0MsS0FBSyxNQUFNLENBQUMsSUFBSSxZQUFZLElBQUksRUFBRSxFQUFFLENBQUM7UUFDcEMsYUFBYSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzFELENBQUM7SUFDRCxNQUFNLEtBQUssR0FBZSxFQUFFLG9CQUFvQixFQUFFLGFBQWEsRUFBRSxDQUFBO0lBQ2pFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUNmLENBQUMsQ0FBQTtBQUVELHNEQUFzRDtBQUN0RCxNQUFNLGNBQWMsR0FBRyxLQUFLLEVBQUUsRUFDN0IsUUFBUSxFQUNSLHFCQUFxQixFQUNyQixNQUFNLEVBQ04sY0FBYyxFQUNkLE9BQU8sRUFDUCxrQkFBa0IsRUFDbEIsZ0JBQWdCLEVBQ2hCLFNBQVMsRUFBRSxVQUFVLEVBQ3JCLFdBQVcsRUFDWCxZQUFZLEVBQ1oscUJBQXFCLEVBQ3JCLFFBQVEsRUFDUixRQUFRLEdBQ2lCLEVBQUUsRUFBRTtJQUM3QixJQUFJLFlBQVksS0FBSyxRQUFRO1FBQzVCLE1BQU0sSUFBSSxLQUFLLENBQUMseUNBQXlDLFlBQVksRUFBRSxDQUFDLENBQUE7SUFFekUsTUFBTSxVQUFVLEdBQUcsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUE7SUFFbkQsTUFBTSxFQUNMLFNBQVMsRUFDVCxpQkFBaUI7SUFDakIseUJBQXlCO01BQ3pCLEdBQUcsb0JBQW9CLENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO0lBRXBFLGdGQUFnRjtJQUVoRixZQUFZO0lBQ1osK0VBQStFO0lBQy9FLE1BQU0sYUFBYSxHQUFHLHdCQUF3QixDQUM3QyxNQUFNLEVBQ04sWUFBWSxFQUNaLFVBQVUsRUFDVixxQkFBcUIsRUFDckIsZ0JBQWdCLENBQ2hCLENBQUEsQ0FBQyx5QkFBeUI7SUFDM0IsdUdBQXVHO0lBRXZHLE1BQU0sY0FBYyxHQUErQixDQUFDLGFBQWEsRUFBRSxrQkFBa0I7UUFDcEYsQ0FBQyxDQUFDLFNBQVM7UUFDWCxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxxQkFBcUI7WUFDN0MsQ0FBQyxDQUFDLEVBQUUsY0FBYyxFQUFFLGFBQWEsQ0FBQyxlQUFlLEVBQUU7WUFDbkQsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtJQUViLFFBQVE7SUFDUixNQUFNLGNBQWMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3RELE1BQU0sVUFBVSxHQUNmLGNBQWMsSUFBSSxpQkFBaUIsS0FBSyxjQUFjLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0lBRXBGLFdBQVc7SUFDWCxNQUFNLEtBQUssR0FBRyxJQUFJLFdBQVcsQ0FBQyxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtJQUU1RCx5Q0FBeUM7SUFDekMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDeEIsTUFBTSxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSxHQUFHLHNCQUFzQixDQUM5RCxNQUFNLEVBQ04sY0FBYyxFQUNkLFFBQVEsRUFDUixRQUFRLENBQ1IsQ0FBQTtRQUNELE1BQU0sR0FBRyxTQUFTLENBQUE7UUFDbEIsY0FBYyxHQUFHLGlCQUFpQixDQUFBO0lBQ25DLENBQUM7SUFFRCxvQkFBb0I7SUFDcEIsSUFBSSxrQkFBa0IsR0FBRyxFQUFFLENBQUE7SUFDM0IsSUFBSSxhQUFhLEdBQUcsRUFBRSxDQUFBO0lBRXRCLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQTtJQUNqQixJQUFJLGFBQWEsR0FBRyxFQUFFLENBQUE7SUFDdEIsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFBO0lBRWYsS0FBSyxDQUFDLE1BQU07U0FDVixxQkFBcUIsQ0FBQztRQUN0QixLQUFLLEVBQUUsU0FBUztRQUNoQixNQUFNLEVBQUU7WUFDUCxpQkFBaUIsRUFBRSxxQkFBcUI7WUFDeEMsY0FBYyxFQUFFLGNBQWM7WUFDOUIsS0FBSyxFQUFFLFVBQVU7U0FDakI7UUFDRCxRQUFRLEVBQUUsUUFBa0M7S0FDNUMsQ0FBQztTQUNELElBQUksQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDdEIsV0FBVyxDQUFDLEdBQUcsRUFBRTtZQUNoQixNQUFNLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQzdCLENBQUMsQ0FBQyxDQUFBO1FBRUYscUJBQXFCO1FBQ3JCLElBQUksS0FBSyxFQUFFLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ2xDLFVBQVU7WUFDVixNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQTtZQUNoQyxhQUFhLElBQUksT0FBTyxDQUFBO1lBRXhCLFlBQVk7WUFDWixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFBO1lBQ3pDLElBQUksYUFBYSxJQUFJLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQy9DLE1BQU0sWUFBWSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFDLDhCQUE4QjtnQkFDcEUsUUFBUSxHQUFHLFlBQVksQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFBO2dCQUNsQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFBO2dCQUN2RCxNQUFNLEdBQUcsWUFBWSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUE7WUFDL0IsQ0FBQztZQUVELGdDQUFnQztZQUVoQyxjQUFjO1lBQ2QsTUFBTSxDQUFDO2dCQUNOLFFBQVEsRUFBRSxhQUFhO2dCQUN2QixhQUFhLEVBQUUsa0JBQWtCO2dCQUNqQyxRQUFRLEVBQUUsQ0FBQyxRQUFRO29CQUNsQixDQUFDLENBQUMsU0FBUztvQkFDWCxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUU7YUFDL0UsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELFdBQVc7UUFDWCxJQUFJLENBQUMsYUFBYSxJQUFJLENBQUMsa0JBQWtCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN4RCxPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsMkNBQTJDLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDbkYsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsTUFBTTtnQkFBRSxNQUFNLEdBQUcsWUFBWSxFQUFFLENBQUEsQ0FBQyx3REFBd0Q7WUFDN0YsTUFBTSxRQUFRLEdBQUcseUJBQXlCLENBQUMsUUFBUSxFQUFFLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUMzRSxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtZQUNoRCxjQUFjLENBQUM7Z0JBQ2QsUUFBUSxFQUFFLGFBQWE7Z0JBQ3ZCLGFBQWEsRUFBRSxrQkFBa0I7Z0JBQ2pDLGtCQUFrQixFQUFFLElBQUk7Z0JBQ3hCLEdBQUcsV0FBVzthQUNkLENBQUMsQ0FBQTtRQUNILENBQUM7SUFDRixDQUFDLENBQUM7U0FDRCxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtRQUNoQixNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsT0FBTyxDQUFBO1FBQzlCLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDakMsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUN4QyxPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsb0JBQW9CLENBQUMsWUFBWSxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7WUFDM0UsQ0FBQztpQkFBTSxJQUFJLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzVDLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxzQkFBc0IsR0FBRyxLQUFLLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7WUFDdkUsQ0FBQzs7Z0JBQU0sT0FBTyxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssR0FBRyxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDMUQsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxHQUFHLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUNuRCxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSixDQUFDLENBQUE7QUFVRCxNQUFNLENBQUMsTUFBTSxzQ0FBc0MsR0FBRztJQUNyRCxTQUFTLEVBQUU7UUFDVixRQUFRLEVBQUUsaUJBQWlCO1FBQzNCLE9BQU8sRUFBRSxJQUFJO1FBQ2IsSUFBSSxFQUFFLElBQUk7S0FDVjtJQUNELE1BQU0sRUFBRTtRQUNQLFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDO1FBQ3ZELE9BQU8sRUFBRSxJQUFJO1FBQ2IsSUFBSSxFQUFFLElBQUk7S0FDVjtJQUNELEdBQUcsRUFBRTtRQUNKLFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDO1FBQ3ZELE9BQU8sRUFBRSxJQUFJO1FBQ2IsSUFBSSxFQUFFLElBQUk7S0FDVjtJQUNELE1BQU0sRUFBRTtRQUNQLFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQztRQUM1QyxPQUFPLEVBQUUsSUFBSTtRQUNiLElBQUksRUFBRSxJQUFJO0tBQ1Y7SUFDRCxPQUFPLEVBQUU7UUFDUixRQUFRLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQztRQUN2RCxPQUFPLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUM7UUFDM0MsSUFBSSxFQUFFLElBQUk7S0FDVjtJQUNELE1BQU0sRUFBRTtRQUNQLFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDO1FBQ3ZELE9BQU8sRUFBRSxhQUFhO1FBQ3RCLElBQUksRUFBRSxVQUFVO0tBQ2hCO0lBQ0QsZ0JBQWdCLEVBQUU7UUFDakIsUUFBUSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsRUFBRSw4SUFBOEk7UUFDdk0sT0FBTyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUM7UUFDckQsSUFBSSxFQUFFLElBQUk7S0FDVjtJQUNELFVBQVUsRUFBRTtRQUNYLFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDO1FBQ3ZELE9BQU8sRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDO1FBQ3JELElBQUksRUFBRSxJQUFJO0tBQ1Y7SUFDRCxJQUFJLEVBQUU7UUFDTCxRQUFRLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQztRQUN2RCxPQUFPLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQztRQUNyRCxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQztLQUMvQztJQUNELFFBQVEsRUFBRTtRQUNULFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDO1FBQ3ZELE9BQU8sRUFBRSxJQUFJO1FBQ2IsSUFBSSxFQUFFLElBQUk7S0FDVjtJQUNELElBQUksRUFBRTtRQUNMLFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDO1FBQ3ZELE9BQU8sRUFBRSxJQUFJO1FBQ2IsSUFBSSxFQUFFLElBQUk7S0FDVjtJQUVELFFBQVEsRUFBRTtRQUNULDhFQUE4RTtRQUM5RSxRQUFRLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQztRQUN2RCxPQUFPLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQztRQUNyRCxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQztLQUMvQztJQUNELE9BQU8sRUFBRTtRQUNSLFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDO1FBQ3ZELE9BQU8sRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDO1FBQ3JELElBQUksRUFBRSxJQUFJO0tBQ1Y7SUFDRCxZQUFZLEVBQUU7UUFDYixRQUFRLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQztRQUN2RCxPQUFPLEVBQUUsSUFBSTtRQUNiLElBQUksRUFBRSxJQUFJO0tBQ1Y7SUFDRCxjQUFjLEVBQUU7UUFDZixRQUFRLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQztRQUN2RCxPQUFPLEVBQUUsSUFBSTtRQUNiLElBQUksRUFBRSxJQUFJO0tBQ1Y7SUFDRCxVQUFVLEVBQUU7UUFDWCxRQUFRLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQztRQUN2RCxPQUFPLEVBQUUsSUFBSTtRQUNiLElBQUksRUFBRSxJQUFJO0tBQ1Y7Q0FDMEIsQ0FBQTtBQUU1Qjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBcUJFIn0=