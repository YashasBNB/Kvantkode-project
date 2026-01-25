/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
// disable foreign import complaints
/* eslint-disable */
import Anthropic from '@anthropic-ai/sdk';
import { Ollama } from 'ollama';
import OpenAI, { AzureOpenAI } from 'openai/index.mjs';
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
                _setAborter(() => response.controller?.abort());
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZExMTU1lc3NhZ2UuaW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9lbGVjdHJvbi1tYWluL2xsbU1lc3NhZ2Uvc2VuZExMTU1lc3NhZ2UuaW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQUUxRixvQ0FBb0M7QUFDcEMsb0JBQW9CO0FBQ3BCLE9BQU8sU0FBUyxNQUFNLG1CQUFtQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDL0IsT0FBTyxNQUFNLEVBQUUsRUFBaUIsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDckUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzFELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN2RSxPQUFPLEVBR04sV0FBVyxFQUdYLElBQUksR0FDSixNQUFNLGVBQWUsQ0FBQTtBQUN0QixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFnQmhELE9BQU8sRUFFTix5QkFBeUIsR0FLekIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLG9CQUFvQixFQUNwQix1QkFBdUIsRUFDdkIsdUJBQXVCLEVBQ3ZCLDJCQUEyQixHQUMzQixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3JGLE9BQU8sRUFBRSxjQUFjLEVBQW9CLE1BQU0sZ0NBQWdDLENBQUE7QUFDakYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRWpFLE1BQU0sZUFBZSxHQUFHLEtBQUssSUFBSSxFQUFFO0lBQ2xD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