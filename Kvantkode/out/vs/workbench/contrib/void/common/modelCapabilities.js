/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
export const defaultProviderSettings = {
    anthropic: {
        apiKey: '',
    },
    openAI: {
        apiKey: '',
    },
    deepseek: {
        apiKey: '',
    },
    ollama: {
        endpoint: 'http://127.0.0.1:11434',
    },
    vLLM: {
        endpoint: 'http://localhost:8000',
    },
    openRouter: {
        apiKey: '',
    },
    openAICompatible: {
        endpoint: 'http://localhost:3000/v1',
        apiKey: 'noop',
        headersJSON: '{}', // default to {}
    },
    gemini: {
        apiKey: '',
    },
    groq: {
        apiKey: '',
    },
    xAI: {
        apiKey: '',
    },
    mistral: {
        apiKey: '',
    },
    lmStudio: {
        endpoint: 'http://localhost:1234',
    },
    liteLLM: {
        // https://docs.litellm.ai/docs/providers/openai_compatible
        endpoint: '',
    },
    googleVertex: {
        // google https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/call-vertex-using-openai-library
        region: 'us-west2',
        project: '',
    },
    microsoftAzure: {
        // microsoft Azure Foundry
        project: '', // really 'resource'
        apiKey: '',
        azureApiVersion: '2024-05-01-preview',
    },
    awsBedrock: {
        apiKey: '',
        region: 'us-east-1', // add region setting
        endpoint: '', // optionally allow overriding default
    },
};
export const defaultModelsOfProvider = {
    openAI: [
        // https://platform.openai.com/docs/models/gp
        'gpt-4.1',
        'gpt-4.1-mini',
        'gpt-4.1-nano',
        'o3',
        'o4-mini',
        // 'o1',
        // 'o1-mini',
        // 'gpt-4o',
        // 'gpt-4o-mini',
    ],
    anthropic: [
        // https://docs.anthropic.com/en/docs/about-claude/models
        'claude-opus-4-0',
        'claude-sonnet-4-0',
        'claude-3-7-sonnet-latest',
        'claude-3-5-sonnet-latest',
        'claude-3-5-haiku-latest',
        'claude-3-opus-latest',
    ],
    xAI: [
        // https://docs.x.ai/docs/models?cluster=us-east-1
        'grok-2',
        'grok-3',
        'grok-3-mini',
        'grok-3-fast',
        'grok-3-mini-fast',
    ],
    gemini: [
        // https://ai.google.dev/gemini-api/docs/models/gemini
        'gemini-2.5-pro-exp-03-25',
        'gemini-2.5-flash-preview-04-17',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-2.5-pro-preview-05-06',
    ],
    deepseek: [
        // https://api-docs.deepseek.com/quick_start/pricing
        'deepseek-chat',
        'deepseek-reasoner',
    ],
    ollama: [
    // autodetected
    ],
    vLLM: [
    // autodetected
    ],
    lmStudio: [], // autodetected
    openRouter: [
        // https://openrouter.ai/models
        // 'anthropic/claude-3.7-sonnet:thinking',
        'anthropic/claude-opus-4',
        'anthropic/claude-sonnet-4',
        'qwen/qwen3-235b-a22b',
        'anthropic/claude-3.7-sonnet',
        'anthropic/claude-3.5-sonnet',
        'deepseek/deepseek-r1',
        'deepseek/deepseek-r1-zero:free',
        'mistralai/devstral-small:free',
        // 'openrouter/quasar-alpha',
        // 'google/gemini-2.5-pro-preview-03-25',
        // 'mistralai/codestral-2501',
        // 'qwen/qwen-2.5-coder-32b-instruct',
        // 'mistralai/mistral-small-3.1-24b-instruct:free',
        // 'google/gemini-2.0-flash-lite-preview-02-05:free',
        // 'google/gemini-2.0-pro-exp-02-05:free',
        // 'google/gemini-2.0-flash-exp:free',
    ],
    groq: [
        // https://console.groq.com/docs/models
        'qwen-qwq-32b',
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
        // 'qwen-2.5-coder-32b', // preview mode (experimental)
    ],
    mistral: [
        // https://docs.mistral.ai/getting-started/models/models_overview/
        'codestral-latest',
        'devstral-small-latest',
        'mistral-large-latest',
        'mistral-medium-latest',
        'ministral-3b-latest',
        'ministral-8b-latest',
    ],
    openAICompatible: ['backend-default'], // fallback
    googleVertex: [],
    microsoftAzure: [],
    awsBedrock: [],
    liteLLM: [],
};
// if you change the above type, remember to update the Settings link
export const modelOverrideKeys = [
    'contextWindow',
    'reservedOutputTokenSpace',
    'supportsSystemMessage',
    'specialToolFormat',
    'supportsFIM',
    'reasoningCapabilities',
    'additionalOpenAIPayload',
];
const defaultModelOptions = {
    contextWindow: 4_096,
    reservedOutputTokenSpace: 4_096,
    cost: { input: 0, output: 0 },
    downloadable: false,
    supportsSystemMessage: false,
    supportsFIM: false,
    reasoningCapabilities: false,
};
// TODO!!! double check all context sizes below
// TODO!!! add openrouter common models
// TODO!!! allow user to modify capabilities and tell them if autodetected model or falling back
const openSourceModelOptions_assumingOAICompat = {
    deepseekR1: {
        supportsFIM: false,
        supportsSystemMessage: false,
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: false,
            canIOReasoning: true,
            openSourceThinkTags: ['<think>', '</think>'],
        },
        contextWindow: 32_000,
        reservedOutputTokenSpace: 4_096,
    },
    deepseekCoderV3: {
        supportsFIM: false,
        supportsSystemMessage: false, // unstable
        reasoningCapabilities: false,
        contextWindow: 32_000,
        reservedOutputTokenSpace: 4_096,
    },
    deepseekCoderV2: {
        supportsFIM: false,
        supportsSystemMessage: false, // unstable
        reasoningCapabilities: false,
        contextWindow: 32_000,
        reservedOutputTokenSpace: 4_096,
    },
    codestral: {
        supportsFIM: true,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
        contextWindow: 32_000,
        reservedOutputTokenSpace: 4_096,
    },
    devstral: {
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
        contextWindow: 131_000,
        reservedOutputTokenSpace: 8_192,
    },
    'openhands-lm-32b': {
        // https://www.all-hands.dev/blog/introducing-openhands-lm-32b----a-strong-open-coding-agent-model
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false, // built on qwen 2.5 32B instruct
        contextWindow: 128_000,
        reservedOutputTokenSpace: 4_096,
    },
    // really only phi4-reasoning supports reasoning... simpler to combine them though
    phi4: {
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: true,
            canIOReasoning: true,
            openSourceThinkTags: ['<think>', '</think>'],
        },
        contextWindow: 16_000,
        reservedOutputTokenSpace: 4_096,
    },
    gemma: {
        // https://news.ycombinator.com/item?id=43451406
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
        contextWindow: 32_000,
        reservedOutputTokenSpace: 4_096,
    },
    // llama 4 https://ai.meta.com/blog/llama-4-multimodal-intelligence/
    'llama4-scout': {
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
        contextWindow: 10_000_000,
        reservedOutputTokenSpace: 4_096,
    },
    'llama4-maverick': {
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
        contextWindow: 10_000_000,
        reservedOutputTokenSpace: 4_096,
    },
    // llama 3
    llama3: {
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
        contextWindow: 32_000,
        reservedOutputTokenSpace: 4_096,
    },
    'llama3.1': {
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
        contextWindow: 32_000,
        reservedOutputTokenSpace: 4_096,
    },
    'llama3.2': {
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
        contextWindow: 32_000,
        reservedOutputTokenSpace: 4_096,
    },
    'llama3.3': {
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
        contextWindow: 32_000,
        reservedOutputTokenSpace: 4_096,
    },
    // qwen
    'qwen2.5coder': {
        supportsFIM: true,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
        contextWindow: 32_000,
        reservedOutputTokenSpace: 4_096,
    },
    qwq: {
        supportsFIM: false, // no FIM, yes reasoning
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: false,
            canIOReasoning: true,
            openSourceThinkTags: ['<think>', '</think>'],
        },
        contextWindow: 128_000,
        reservedOutputTokenSpace: 8_192,
    },
    qwen3: {
        supportsFIM: false, // replaces QwQ
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: true,
            canIOReasoning: true,
            openSourceThinkTags: ['<think>', '</think>'],
        },
        contextWindow: 32_768,
        reservedOutputTokenSpace: 8_192,
    },
    // FIM only
    starcoder2: {
        supportsFIM: true,
        supportsSystemMessage: false,
        reasoningCapabilities: false,
        contextWindow: 128_000,
        reservedOutputTokenSpace: 8_192,
    },
    'codegemma:2b': {
        supportsFIM: true,
        supportsSystemMessage: false,
        reasoningCapabilities: false,
        contextWindow: 128_000,
        reservedOutputTokenSpace: 8_192,
    },
    quasar: {
        // openrouter/quasar-alpha
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
        contextWindow: 1_000_000,
        reservedOutputTokenSpace: 32_000,
    },
};
// keep modelName, but use the fallback's defaults
const extensiveModelOptionsFallback = (modelName, fallbackKnownValues) => {
    const lower = modelName.toLowerCase();
    const toFallback = (obj, recognizedModelName) => {
        const opts = obj[recognizedModelName];
        const supportsSystemMessage = opts.supportsSystemMessage === 'separated' ? 'system-role' : opts.supportsSystemMessage;
        return {
            recognizedModelName,
            modelName,
            ...opts,
            supportsSystemMessage: supportsSystemMessage,
            cost: { input: 0, output: 0 },
            downloadable: false,
            ...fallbackKnownValues,
        };
    };
    if (lower.includes('gemini') && (lower.includes('2.5') || lower.includes('2-5')))
        return toFallback(geminiModelOptions, 'gemini-2.5-pro-exp-03-25');
    if (lower.includes('claude-3-5') || lower.includes('claude-3.5'))
        return toFallback(anthropicModelOptions, 'claude-3-5-sonnet-20241022');
    if (lower.includes('claude'))
        return toFallback(anthropicModelOptions, 'claude-3-7-sonnet-20250219');
    if (lower.includes('grok2') || lower.includes('grok2'))
        return toFallback(xAIModelOptions, 'grok-2');
    if (lower.includes('grok'))
        return toFallback(xAIModelOptions, 'grok-3');
    if (lower.includes('deepseek-r1') || lower.includes('deepseek-reasoner'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'deepseekR1');
    if (lower.includes('deepseek') && lower.includes('v2'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'deepseekCoderV2');
    if (lower.includes('deepseek'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'deepseekCoderV3');
    if (lower.includes('llama3'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'llama3');
    if (lower.includes('llama3.1'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'llama3.1');
    if (lower.includes('llama3.2'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'llama3.2');
    if (lower.includes('llama3.3'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'llama3.3');
    if (lower.includes('llama') || lower.includes('scout'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'llama4-scout');
    if (lower.includes('llama') || lower.includes('maverick'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'llama4-scout');
    if (lower.includes('llama'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'llama4-scout');
    if (lower.includes('qwen') && lower.includes('2.5') && lower.includes('coder'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'qwen2.5coder');
    if (lower.includes('qwen') && lower.includes('3'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'qwen3');
    if (lower.includes('qwen'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'qwen3');
    if (lower.includes('qwq')) {
        return toFallback(openSourceModelOptions_assumingOAICompat, 'qwq');
    }
    if (lower.includes('phi4'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'phi4');
    if (lower.includes('codestral'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'codestral');
    if (lower.includes('devstral'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'devstral');
    if (lower.includes('gemma'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'gemma');
    if (lower.includes('starcoder2'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'starcoder2');
    if (lower.includes('openhands'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'openhands-lm-32b'); // max output uncler
    if (lower.includes('quasar') || lower.includes('quaser'))
        return toFallback(openSourceModelOptions_assumingOAICompat, 'quasar');
    if (lower.includes('gpt') &&
        lower.includes('mini') &&
        (lower.includes('4.1') || lower.includes('4-1')))
        return toFallback(openAIModelOptions, 'gpt-4.1-mini');
    if (lower.includes('gpt') &&
        lower.includes('nano') &&
        (lower.includes('4.1') || lower.includes('4-1')))
        return toFallback(openAIModelOptions, 'gpt-4.1-nano');
    if (lower.includes('gpt') && (lower.includes('4.1') || lower.includes('4-1')))
        return toFallback(openAIModelOptions, 'gpt-4.1');
    if (lower.includes('4o') && lower.includes('mini'))
        return toFallback(openAIModelOptions, 'gpt-4o-mini');
    if (lower.includes('4o'))
        return toFallback(openAIModelOptions, 'gpt-4o');
    if (lower.includes('o1') && lower.includes('mini'))
        return toFallback(openAIModelOptions, 'o1-mini');
    if (lower.includes('o1'))
        return toFallback(openAIModelOptions, 'o1');
    if (lower.includes('o3') && lower.includes('mini'))
        return toFallback(openAIModelOptions, 'o3-mini');
    if (lower.includes('o3'))
        return toFallback(openAIModelOptions, 'o3');
    if (lower.includes('o4') && lower.includes('mini'))
        return toFallback(openAIModelOptions, 'o4-mini');
    if (Object.keys(openSourceModelOptions_assumingOAICompat)
        .map((k) => k.toLowerCase())
        .includes(lower))
        return toFallback(openSourceModelOptions_assumingOAICompat, lower);
    return null;
};
// ---------------- ANTHROPIC ----------------
const anthropicModelOptions = {
    'claude-3-7-sonnet-20250219': {
        // https://docs.anthropic.com/en/docs/about-claude/models/all-models#model-comparison-table
        contextWindow: 200_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 3.0, cache_read: 0.3, cache_write: 3.75, output: 15.0 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'anthropic-style',
        supportsSystemMessage: 'separated',
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: true,
            canIOReasoning: true,
            reasoningReservedOutputTokenSpace: 8192, // can bump it to 128_000 with beta mode output-128k-2025-02-19
            reasoningSlider: { type: 'budget_slider', min: 1024, max: 8192, default: 1024 }, // they recommend batching if max > 32_000. we cap at 8192 because above is typically not necessary (often even buggy)
        },
    },
    'claude-opus-4-20250514': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 15.0, cache_read: 1.5, cache_write: 18.75, output: 30.0 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'anthropic-style',
        supportsSystemMessage: 'separated',
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: true,
            canIOReasoning: true,
            reasoningReservedOutputTokenSpace: 8192, // can bump it to 128_000 with beta mode output-128k-2025-02-19
            reasoningSlider: { type: 'budget_slider', min: 1024, max: 8192, default: 1024 }, // they recommend batching if max > 32_000. we cap at 8192 because above is typically not necessary (often even buggy)
        },
    },
    'claude-sonnet-4-20250514': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 3.0, cache_read: 0.3, cache_write: 3.75, output: 6.0 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'anthropic-style',
        supportsSystemMessage: 'separated',
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: true,
            canIOReasoning: true,
            reasoningReservedOutputTokenSpace: 8192, // can bump it to 128_000 with beta mode output-128k-2025-02-19
            reasoningSlider: { type: 'budget_slider', min: 1024, max: 8192, default: 1024 }, // they recommend batching if max > 32_000. we cap at 8192 because above is typically not necessary (often even buggy)
        },
    },
    'claude-3-5-sonnet-20241022': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 3.0, cache_read: 0.3, cache_write: 3.75, output: 15.0 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'anthropic-style',
        supportsSystemMessage: 'separated',
        reasoningCapabilities: false,
    },
    'claude-3-5-haiku-20241022': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0.8, cache_read: 0.08, cache_write: 1.0, output: 4.0 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'anthropic-style',
        supportsSystemMessage: 'separated',
        reasoningCapabilities: false,
    },
    'claude-3-opus-20240229': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: 4_096,
        cost: { input: 15.0, cache_read: 1.5, cache_write: 18.75, output: 75.0 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'anthropic-style',
        supportsSystemMessage: 'separated',
        reasoningCapabilities: false,
    },
    'claude-3-sonnet-20240229': {
        // no point of using this, but including this for people who put it in
        contextWindow: 200_000,
        cost: { input: 3.0, output: 15.0 },
        downloadable: false,
        reservedOutputTokenSpace: 4_096,
        supportsFIM: false,
        specialToolFormat: 'anthropic-style',
        supportsSystemMessage: 'separated',
        reasoningCapabilities: false,
    },
};
const anthropicSettings = {
    providerReasoningIOSettings: {
        input: {
            includeInPayload: (reasoningInfo) => {
                if (!reasoningInfo?.isReasoningEnabled)
                    return null;
                if (reasoningInfo.type === 'budget_slider_value') {
                    return { thinking: { type: 'enabled', budget_tokens: reasoningInfo.reasoningBudget } };
                }
                return null;
            },
        },
    },
    modelOptions: anthropicModelOptions,
    modelOptionsFallback: (modelName) => {
        const lower = modelName.toLowerCase();
        let fallbackName = null;
        if (lower.includes('claude-4-opus') || lower.includes('claude-opus-4'))
            fallbackName = 'claude-opus-4-20250514';
        if (lower.includes('claude-4-sonnet') || lower.includes('claude-sonnet-4'))
            fallbackName = 'claude-sonnet-4-20250514';
        if (lower.includes('claude-3-7-sonnet'))
            fallbackName = 'claude-3-7-sonnet-20250219';
        if (lower.includes('claude-3-5-sonnet'))
            fallbackName = 'claude-3-5-sonnet-20241022';
        if (lower.includes('claude-3-5-haiku'))
            fallbackName = 'claude-3-5-haiku-20241022';
        if (lower.includes('claude-3-opus'))
            fallbackName = 'claude-3-opus-20240229';
        if (lower.includes('claude-3-sonnet'))
            fallbackName = 'claude-3-sonnet-20240229';
        if (fallbackName)
            return {
                modelName: fallbackName,
                recognizedModelName: fallbackName,
                ...anthropicModelOptions[fallbackName],
            };
        return null;
    },
};
// ---------------- OPENAI ----------------
const openAIModelOptions = {
    // https://platform.openai.com/docs/pricing
    o3: {
        contextWindow: 1_047_576,
        reservedOutputTokenSpace: 32_768,
        cost: { input: 10.0, output: 40.0, cache_read: 2.5 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'developer-role',
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: false,
            canIOReasoning: false,
            reasoningSlider: { type: 'effort_slider', values: ['low', 'medium', 'high'], default: 'low' },
        },
    },
    'o4-mini': {
        contextWindow: 1_047_576,
        reservedOutputTokenSpace: 32_768,
        cost: { input: 1.1, output: 4.4, cache_read: 0.275 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'developer-role',
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: false,
            canIOReasoning: false,
            reasoningSlider: { type: 'effort_slider', values: ['low', 'medium', 'high'], default: 'low' },
        },
    },
    'gpt-4.1': {
        contextWindow: 1_047_576,
        reservedOutputTokenSpace: 32_768,
        cost: { input: 2.0, output: 8.0, cache_read: 0.5 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'developer-role',
        reasoningCapabilities: false,
    },
    'gpt-4.1-mini': {
        contextWindow: 1_047_576,
        reservedOutputTokenSpace: 32_768,
        cost: { input: 0.4, output: 1.6, cache_read: 0.1 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'developer-role',
        reasoningCapabilities: false,
    },
    'gpt-4.1-nano': {
        contextWindow: 1_047_576,
        reservedOutputTokenSpace: 32_768,
        cost: { input: 0.1, output: 0.4, cache_read: 0.03 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'developer-role',
        reasoningCapabilities: false,
    },
    o1: {
        contextWindow: 128_000,
        reservedOutputTokenSpace: 100_000,
        cost: { input: 15.0, cache_read: 7.5, output: 60.0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'developer-role',
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: false,
            canIOReasoning: false,
            reasoningSlider: { type: 'effort_slider', values: ['low', 'medium', 'high'], default: 'low' },
        },
    },
    'o3-mini': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: 100_000,
        cost: { input: 1.1, cache_read: 0.55, output: 4.4 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'developer-role',
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: false,
            canIOReasoning: false,
            reasoningSlider: { type: 'effort_slider', values: ['low', 'medium', 'high'], default: 'low' },
        },
    },
    'gpt-4o': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: 16_384,
        cost: { input: 2.5, cache_read: 1.25, output: 10.0 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'o1-mini': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: 65_536,
        cost: { input: 1.1, cache_read: 0.55, output: 4.4 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: false, // does not support any system
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: false,
            canIOReasoning: false,
            reasoningSlider: { type: 'effort_slider', values: ['low', 'medium', 'high'], default: 'low' },
        },
    },
    'gpt-4o-mini': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: 16_384,
        cost: { input: 0.15, cache_read: 0.075, output: 0.6 },
        downloadable: false,
        supportsFIM: false,
        specialToolFormat: 'openai-style',
        supportsSystemMessage: 'system-role', // ??
        reasoningCapabilities: false,
    },
};
// https://platform.openai.com/docs/guides/reasoning?api-mode=chat
const openAICompatIncludeInPayloadReasoning = (reasoningInfo) => {
    if (!reasoningInfo?.isReasoningEnabled)
        return null;
    if (reasoningInfo.type === 'effort_slider_value') {
        return { reasoning_effort: reasoningInfo.reasoningEffort };
    }
    return null;
};
const openAISettings = {
    modelOptions: openAIModelOptions,
    modelOptionsFallback: (modelName) => {
        const lower = modelName.toLowerCase();
        let fallbackName = null;
        if (lower.includes('o1')) {
            fallbackName = 'o1';
        }
        if (lower.includes('o3-mini')) {
            fallbackName = 'o3-mini';
        }
        if (lower.includes('gpt-4o')) {
            fallbackName = 'gpt-4o';
        }
        if (fallbackName)
            return {
                modelName: fallbackName,
                recognizedModelName: fallbackName,
                ...openAIModelOptions[fallbackName],
            };
        return null;
    },
    providerReasoningIOSettings: {
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
    },
};
// ---------------- XAI ----------------
const xAIModelOptions = {
    // https://docs.x.ai/docs/guides/reasoning#reasoning
    // https://docs.x.ai/docs/models#models-and-pricing
    'grok-2': {
        contextWindow: 131_072,
        reservedOutputTokenSpace: null,
        cost: { input: 2.0, output: 10.0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        specialToolFormat: 'openai-style',
        reasoningCapabilities: false,
    },
    'grok-3': {
        contextWindow: 131_072,
        reservedOutputTokenSpace: null,
        cost: { input: 3.0, output: 15.0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        specialToolFormat: 'openai-style',
        reasoningCapabilities: false,
    },
    'grok-3-fast': {
        contextWindow: 131_072,
        reservedOutputTokenSpace: null,
        cost: { input: 5.0, output: 25.0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        specialToolFormat: 'openai-style',
        reasoningCapabilities: false,
    },
    // only mini supports thinking
    'grok-3-mini': {
        contextWindow: 131_072,
        reservedOutputTokenSpace: null,
        cost: { input: 0.3, output: 0.5 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        specialToolFormat: 'openai-style',
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: false,
            canIOReasoning: false,
            reasoningSlider: { type: 'effort_slider', values: ['low', 'high'], default: 'low' },
        },
    },
    'grok-3-mini-fast': {
        contextWindow: 131_072,
        reservedOutputTokenSpace: null,
        cost: { input: 0.6, output: 4.0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        specialToolFormat: 'openai-style',
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: false,
            canIOReasoning: false,
            reasoningSlider: { type: 'effort_slider', values: ['low', 'high'], default: 'low' },
        },
    },
};
const xAISettings = {
    modelOptions: xAIModelOptions,
    modelOptionsFallback: (modelName) => {
        const lower = modelName.toLowerCase();
        let fallbackName = null;
        if (lower.includes('grok-2'))
            fallbackName = 'grok-2';
        if (lower.includes('grok-3'))
            fallbackName = 'grok-3';
        if (lower.includes('grok'))
            fallbackName = 'grok-3';
        if (fallbackName)
            return {
                modelName: fallbackName,
                recognizedModelName: fallbackName,
                ...xAIModelOptions[fallbackName],
            };
        return null;
    },
    // same implementation as openai
    providerReasoningIOSettings: {
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
    },
};
// ---------------- GEMINI ----------------
const geminiModelOptions = {
    // https://ai.google.dev/gemini-api/docs/pricing
    // https://ai.google.dev/gemini-api/docs/thinking#set-budget
    'gemini-2.5-pro-preview-05-06': {
        contextWindow: 1_048_576,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'separated',
        specialToolFormat: 'gemini-style',
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: true,
            canIOReasoning: false,
            reasoningSlider: { type: 'budget_slider', min: 1024, max: 8192, default: 1024 }, // max is really 24576
            reasoningReservedOutputTokenSpace: 8192,
        },
    },
    'gemini-2.0-flash-lite': {
        contextWindow: 1_048_576,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'separated',
        specialToolFormat: 'gemini-style',
        reasoningCapabilities: false, // no reasoning
    },
    'gemini-2.5-flash-preview-04-17': {
        contextWindow: 1_048_576,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0.15, output: 0.6 }, // TODO $3.50 output with thinking not included
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'separated',
        specialToolFormat: 'gemini-style',
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: true,
            canIOReasoning: false,
            reasoningSlider: { type: 'budget_slider', min: 1024, max: 8192, default: 1024 }, // max is really 24576
            reasoningReservedOutputTokenSpace: 8192,
        },
    },
    'gemini-2.5-pro-exp-03-25': {
        contextWindow: 1_048_576,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'separated',
        specialToolFormat: 'gemini-style',
        reasoningCapabilities: {
            supportsReasoning: true,
            canTurnOffReasoning: true,
            canIOReasoning: false,
            reasoningSlider: { type: 'budget_slider', min: 1024, max: 8192, default: 1024 }, // max is really 24576
            reasoningReservedOutputTokenSpace: 8192,
        },
    },
    'gemini-2.0-flash': {
        contextWindow: 1_048_576,
        reservedOutputTokenSpace: 8_192, // 8_192,
        cost: { input: 0.1, output: 0.4 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'separated',
        specialToolFormat: 'gemini-style',
        reasoningCapabilities: false,
    },
    'gemini-2.0-flash-lite-preview-02-05': {
        contextWindow: 1_048_576,
        reservedOutputTokenSpace: 8_192, // 8_192,
        cost: { input: 0.075, output: 0.3 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'separated',
        specialToolFormat: 'gemini-style',
        reasoningCapabilities: false,
    },
    'gemini-1.5-flash': {
        contextWindow: 1_048_576,
        reservedOutputTokenSpace: 8_192, // 8_192,
        cost: { input: 0.075, output: 0.3 }, // TODO!!! price doubles after 128K tokens, we are NOT encoding that info right now
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'separated',
        specialToolFormat: 'gemini-style',
        reasoningCapabilities: false,
    },
    'gemini-1.5-pro': {
        contextWindow: 2_097_152,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 1.25, output: 5.0 }, // TODO!!! price doubles after 128K tokens, we are NOT encoding that info right now
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'separated',
        specialToolFormat: 'gemini-style',
        reasoningCapabilities: false,
    },
    'gemini-1.5-flash-8b': {
        contextWindow: 1_048_576,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0.0375, output: 0.15 }, // TODO!!! price doubles after 128K tokens, we are NOT encoding that info right now
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'separated',
        specialToolFormat: 'gemini-style',
        reasoningCapabilities: false,
    },
};
const geminiSettings = {
    modelOptions: geminiModelOptions,
    modelOptionsFallback: (modelName) => {
        return null;
    },
};
// ---------------- DEEPSEEK API ----------------
const deepseekModelOptions = {
    'deepseek-chat': {
        ...openSourceModelOptions_assumingOAICompat.deepseekR1,
        contextWindow: 64_000, // https://api-docs.deepseek.com/quick_start/pricing
        reservedOutputTokenSpace: 8_000, // 8_000,
        cost: { cache_read: 0.07, input: 0.27, output: 1.1 },
        downloadable: false,
    },
    'deepseek-reasoner': {
        ...openSourceModelOptions_assumingOAICompat.deepseekCoderV2,
        contextWindow: 64_000,
        reservedOutputTokenSpace: 8_000, // 8_000,
        cost: { cache_read: 0.14, input: 0.55, output: 2.19 },
        downloadable: false,
    },
};
const deepseekSettings = {
    modelOptions: deepseekModelOptions,
    modelOptionsFallback: (modelName) => {
        return null;
    },
    providerReasoningIOSettings: {
        // reasoning: OAICompat +  response.choices[0].delta.reasoning_content // https://api-docs.deepseek.com/guides/reasoning_model
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
        output: { nameOfFieldInDelta: 'reasoning_content' },
    },
};
// ---------------- MISTRAL ----------------
const mistralModelOptions = {
    // https://mistral.ai/products/la-plateforme#pricing https://docs.mistral.ai/getting-started/models/models_overview/#premier-models
    'mistral-large-latest': {
        contextWindow: 131_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 2.0, output: 6.0 },
        supportsFIM: false,
        downloadable: { sizeGb: 73 },
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'mistral-medium-latest': {
        // https://openrouter.ai/mistralai/mistral-medium-3
        contextWindow: 131_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0.4, output: 2.0 },
        supportsFIM: false,
        downloadable: { sizeGb: 'not-known' },
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'codestral-latest': {
        contextWindow: 256_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0.3, output: 0.9 },
        supportsFIM: true,
        downloadable: { sizeGb: 13 },
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'magistral-medium-latest': {
        contextWindow: 256_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0.3, output: 0.9 }, // TODO: check this
        supportsFIM: true,
        downloadable: { sizeGb: 13 },
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: {
            supportsReasoning: true,
            canIOReasoning: true,
            canTurnOffReasoning: false,
            openSourceThinkTags: ['<think>', '</think>'],
        },
    },
    'magistral-small-latest': {
        contextWindow: 40_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0.3, output: 0.9 }, // TODO: check this
        supportsFIM: true,
        downloadable: { sizeGb: 13 },
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: {
            supportsReasoning: true,
            canIOReasoning: true,
            canTurnOffReasoning: false,
            openSourceThinkTags: ['<think>', '</think>'],
        },
    },
    'devstral-small-latest': {
        //https://openrouter.ai/mistralai/devstral-small:free
        contextWindow: 131_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0, output: 0 },
        supportsFIM: false,
        downloadable: { sizeGb: 14 }, //https://ollama.com/library/devstral
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'ministral-8b-latest': {
        // ollama 'mistral'
        contextWindow: 131_000,
        reservedOutputTokenSpace: 4_096,
        cost: { input: 0.1, output: 0.1 },
        supportsFIM: false,
        downloadable: { sizeGb: 4.1 },
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'ministral-3b-latest': {
        contextWindow: 131_000,
        reservedOutputTokenSpace: 4_096,
        cost: { input: 0.04, output: 0.04 },
        supportsFIM: false,
        downloadable: { sizeGb: 'not-known' },
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
};
const mistralSettings = {
    modelOptions: mistralModelOptions,
    modelOptionsFallback: (modelName) => {
        return null;
    },
    providerReasoningIOSettings: {
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
    },
};
// ---------------- GROQ ----------------
const groqModelOptions = {
    // https://console.groq.com/docs/models, https://groq.com/pricing/
    'llama-3.3-70b-versatile': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: 32_768, // 32_768,
        cost: { input: 0.59, output: 0.79 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'llama-3.1-8b-instant': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0.05, output: 0.08 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'qwen-2.5-coder-32b': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: null, // not specified?
        cost: { input: 0.79, output: 0.79 },
        downloadable: false,
        supportsFIM: false, // unfortunately looks like no FIM support on groq
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'qwen-qwq-32b': {
        // https://huggingface.co/Qwen/QwQ-32B
        contextWindow: 128_000,
        reservedOutputTokenSpace: null, // not specified?
        cost: { input: 0.29, output: 0.39 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: {
            supportsReasoning: true,
            canIOReasoning: true,
            canTurnOffReasoning: false,
            openSourceThinkTags: ['<think>', '</think>'],
        }, // we're using reasoning_format:parsed so really don't need to know openSourceThinkTags
    },
};
const groqSettings = {
    modelOptions: groqModelOptions,
    modelOptionsFallback: (modelName) => {
        return null;
    },
    providerReasoningIOSettings: {
        // Must be set to either parsed or hidden when using tool calling https://console.groq.com/docs/reasoning
        input: {
            includeInPayload: (reasoningInfo) => {
                if (!reasoningInfo?.isReasoningEnabled)
                    return null;
                if (reasoningInfo.type === 'budget_slider_value') {
                    return { reasoning_format: 'parsed' };
                }
                return null;
            },
        },
        output: { nameOfFieldInDelta: 'reasoning' },
    },
};
// ---------------- GOOGLE VERTEX ----------------
const googleVertexModelOptions = {};
const googleVertexSettings = {
    modelOptions: googleVertexModelOptions,
    modelOptionsFallback: (modelName) => {
        return null;
    },
    providerReasoningIOSettings: {
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
    },
};
// ---------------- MICROSOFT AZURE ----------------
const microsoftAzureModelOptions = {};
const microsoftAzureSettings = {
    modelOptions: microsoftAzureModelOptions,
    modelOptionsFallback: (modelName) => {
        return null;
    },
    providerReasoningIOSettings: {
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
    },
};
// ---------------- AWS BEDROCK ----------------
const awsBedrockModelOptions = {};
const awsBedrockSettings = {
    modelOptions: awsBedrockModelOptions,
    modelOptionsFallback: (modelName) => {
        return null;
    },
    providerReasoningIOSettings: {
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
    },
};
// ---------------- VLLM, OLLAMA, OPENAICOMPAT (self-hosted / local) ----------------
const ollamaModelOptions = {
    'qwen2.5-coder:7b': {
        contextWindow: 32_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: { sizeGb: 1.9 },
        supportsFIM: true,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'qwen2.5-coder:3b': {
        contextWindow: 32_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: { sizeGb: 1.9 },
        supportsFIM: true,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'qwen2.5-coder:1.5b': {
        contextWindow: 32_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: { sizeGb: 0.986 },
        supportsFIM: true,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'llama3.1': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: { sizeGb: 4.9 },
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'qwen2.5-coder': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: { sizeGb: 4.7 },
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    qwq: {
        contextWindow: 128_000,
        reservedOutputTokenSpace: 32_000,
        cost: { input: 0, output: 0 },
        downloadable: { sizeGb: 20 },
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: {
            supportsReasoning: true,
            canIOReasoning: false,
            canTurnOffReasoning: false,
            openSourceThinkTags: ['<think>', '</think>'],
        },
    },
    'deepseek-r1': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: { sizeGb: 4.7 },
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: {
            supportsReasoning: true,
            canIOReasoning: false,
            canTurnOffReasoning: false,
            openSourceThinkTags: ['<think>', '</think>'],
        },
    },
    'devstral:latest': {
        contextWindow: 131_000,
        reservedOutputTokenSpace: 8_192,
        cost: { input: 0, output: 0 },
        downloadable: { sizeGb: 14 },
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
};
export const ollamaRecommendedModels = [
    'qwen2.5-coder:1.5b',
    'llama3.1',
    'qwq',
    'deepseek-r1',
    'devstral:latest',
];
const vLLMSettings = {
    modelOptionsFallback: (modelName) => extensiveModelOptionsFallback(modelName, { downloadable: { sizeGb: 'not-known' } }),
    modelOptions: {},
    providerReasoningIOSettings: {
        // reasoning: OAICompat + response.choices[0].delta.reasoning_content // https://docs.vllm.ai/en/stable/features/reasoning_outputs.html#streaming-chat-completions
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
        output: { nameOfFieldInDelta: 'reasoning_content' },
    },
};
const lmStudioSettings = {
    modelOptionsFallback: (modelName) => extensiveModelOptionsFallback(modelName, {
        downloadable: { sizeGb: 'not-known' },
        contextWindow: 4_096,
    }),
    modelOptions: {},
    providerReasoningIOSettings: {
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
        output: { needsManualParse: true },
    },
};
const ollamaSettings = {
    modelOptionsFallback: (modelName) => extensiveModelOptionsFallback(modelName, { downloadable: { sizeGb: 'not-known' } }),
    modelOptions: ollamaModelOptions,
    providerReasoningIOSettings: {
        // reasoning: we need to filter out reasoning <think> tags manually
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
        output: { needsManualParse: true },
    },
};
const openaiCompatible = {
    modelOptionsFallback: (modelName) => extensiveModelOptionsFallback(modelName),
    modelOptions: {},
    providerReasoningIOSettings: {
        // reasoning: we have no idea what endpoint they used, so we can't consistently parse out reasoning
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
        output: { nameOfFieldInDelta: 'reasoning_content' },
    },
};
const liteLLMSettings = {
    // https://docs.litellm.ai/docs/reasoning_content
    modelOptionsFallback: (modelName) => extensiveModelOptionsFallback(modelName, { downloadable: { sizeGb: 'not-known' } }),
    modelOptions: {},
    providerReasoningIOSettings: {
        input: { includeInPayload: openAICompatIncludeInPayloadReasoning },
        output: { nameOfFieldInDelta: 'reasoning_content' },
    },
};
// ---------------- OPENROUTER ----------------
const openRouterModelOptions_assumingOpenAICompat = {
    'qwen/qwen3-235b-a22b': {
        contextWindow: 40_960,
        reservedOutputTokenSpace: null,
        cost: { input: 0.1, output: 0.1 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: {
            supportsReasoning: true,
            canIOReasoning: true,
            canTurnOffReasoning: false,
        },
    },
    'microsoft/phi-4-reasoning-plus:free': {
        // a 14B model...
        contextWindow: 32_768,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: {
            supportsReasoning: true,
            canIOReasoning: true,
            canTurnOffReasoning: false,
        },
    },
    'mistralai/mistral-small-3.1-24b-instruct:free': {
        contextWindow: 128_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'google/gemini-2.0-flash-lite-preview-02-05:free': {
        contextWindow: 1_048_576,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'google/gemini-2.0-pro-exp-02-05:free': {
        contextWindow: 1_048_576,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'google/gemini-2.0-flash-exp:free': {
        contextWindow: 1_048_576,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'deepseek/deepseek-r1': {
        ...openSourceModelOptions_assumingOAICompat.deepseekR1,
        contextWindow: 128_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0.8, output: 2.4 },
        downloadable: false,
    },
    'anthropic/claude-opus-4': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: null,
        cost: { input: 15.0, output: 75.0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'anthropic/claude-sonnet-4': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: null,
        cost: { input: 15.0, output: 75.0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'anthropic/claude-3.7-sonnet:thinking': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: null,
        cost: { input: 3.0, output: 15.0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: {
            // same as anthropic, see above
            supportsReasoning: true,
            canTurnOffReasoning: false,
            canIOReasoning: true,
            reasoningReservedOutputTokenSpace: 8192,
            reasoningSlider: { type: 'budget_slider', min: 1024, max: 8192, default: 1024 }, // they recommend batching if max > 32_000.
        },
    },
    'anthropic/claude-3.7-sonnet': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: null,
        cost: { input: 3.0, output: 15.0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false, // stupidly, openrouter separates thinking from non-thinking
    },
    'anthropic/claude-3.5-sonnet': {
        contextWindow: 200_000,
        reservedOutputTokenSpace: null,
        cost: { input: 3.0, output: 15.0 },
        downloadable: false,
        supportsFIM: false,
        supportsSystemMessage: 'system-role',
        reasoningCapabilities: false,
    },
    'mistralai/codestral-2501': {
        ...openSourceModelOptions_assumingOAICompat.codestral,
        contextWindow: 256_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0.3, output: 0.9 },
        downloadable: false,
        reasoningCapabilities: false,
    },
    'mistralai/devstral-small:free': {
        ...openSourceModelOptions_assumingOAICompat.devstral,
        contextWindow: 130_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0, output: 0 },
        downloadable: false,
        reasoningCapabilities: false,
    },
    'qwen/qwen-2.5-coder-32b-instruct': {
        ...openSourceModelOptions_assumingOAICompat['qwen2.5coder'],
        contextWindow: 33_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0.07, output: 0.16 },
        downloadable: false,
    },
    'qwen/qwq-32b': {
        ...openSourceModelOptions_assumingOAICompat['qwq'],
        contextWindow: 33_000,
        reservedOutputTokenSpace: null,
        cost: { input: 0.07, output: 0.16 },
        downloadable: false,
    },
};
const openRouterSettings = {
    modelOptions: openRouterModelOptions_assumingOpenAICompat,
    modelOptionsFallback: (modelName) => {
        const res = extensiveModelOptionsFallback(modelName);
        // openRouter does not support gemini-style, use openai-style instead
        if (res?.specialToolFormat === 'gemini-style') {
            res.specialToolFormat = 'openai-style';
        }
        return res;
    },
    providerReasoningIOSettings: {
        // reasoning: OAICompat + response.choices[0].delta.reasoning : payload should have {include_reasoning: true} https://openrouter.ai/announcements/reasoning-tokens-for-thinking-models
        input: {
            // https://openrouter.ai/docs/use-cases/reasoning-tokens
            includeInPayload: (reasoningInfo) => {
                if (!reasoningInfo?.isReasoningEnabled)
                    return null;
                if (reasoningInfo.type === 'budget_slider_value') {
                    return {
                        reasoning: {
                            max_tokens: reasoningInfo.reasoningBudget,
                        },
                    };
                }
                if (reasoningInfo.type === 'effort_slider_value')
                    return {
                        reasoning: {
                            effort: reasoningInfo.reasoningEffort,
                        },
                    };
                return null;
            },
        },
        output: { nameOfFieldInDelta: 'reasoning' },
    },
};
// ---------------- model settings of everything above ----------------
const modelSettingsOfProvider = {
    openAI: openAISettings,
    anthropic: anthropicSettings,
    xAI: xAISettings,
    gemini: geminiSettings,
    // open source models
    deepseek: deepseekSettings,
    groq: groqSettings,
    // open source models + providers (mixture of everything)
    openRouter: openRouterSettings,
    vLLM: vLLMSettings,
    ollama: ollamaSettings,
    openAICompatible: openaiCompatible,
    mistral: mistralSettings,
    liteLLM: liteLLMSettings,
    lmStudio: lmStudioSettings,
    googleVertex: googleVertexSettings,
    microsoftAzure: microsoftAzureSettings,
    awsBedrock: awsBedrockSettings,
};
// ---------------- exports ----------------
// returns the capabilities and the adjusted modelName if it was a fallback
export const getModelCapabilities = (providerName, modelName, overridesOfModel) => {
    const lowercaseModelName = modelName.toLowerCase();
    const { modelOptions, modelOptionsFallback } = modelSettingsOfProvider[providerName];
    // Get any override settings for this model
    const overrides = overridesOfModel?.[providerName]?.[modelName];
    // search model options object directly first
    for (const modelName_ in modelOptions) {
        const lowercaseModelName_ = modelName_.toLowerCase();
        if (lowercaseModelName === lowercaseModelName_) {
            return {
                ...modelOptions[modelName],
                ...overrides,
                modelName,
                recognizedModelName: modelName,
                isUnrecognizedModel: false,
            };
        }
    }
    const result = modelOptionsFallback(modelName);
    if (result) {
        return { ...result, ...overrides, modelName: result.modelName, isUnrecognizedModel: false };
    }
    return { modelName, ...defaultModelOptions, ...overrides, isUnrecognizedModel: true };
};
// non-model settings
export const getProviderCapabilities = (providerName) => {
    const { providerReasoningIOSettings } = modelSettingsOfProvider[providerName];
    return { providerReasoningIOSettings };
};
export const getIsReasoningEnabledState = (featureName, providerName, modelName, modelSelectionOptions, overridesOfModel) => {
    const { supportsReasoning, canTurnOffReasoning } = getModelCapabilities(providerName, modelName, overridesOfModel).reasoningCapabilities || {};
    if (!supportsReasoning)
        return false;
    // default to enabled if can't turn off, or if the featureName is Chat.
    const defaultEnabledVal = featureName === 'Chat' || !canTurnOffReasoning;
    const isReasoningEnabled = modelSelectionOptions?.reasoningEnabled ?? defaultEnabledVal;
    return isReasoningEnabled;
};
export const getReservedOutputTokenSpace = (providerName, modelName, opts) => {
    const { reasoningCapabilities, reservedOutputTokenSpace } = getModelCapabilities(providerName, modelName, opts.overridesOfModel);
    return opts.isReasoningEnabled && reasoningCapabilities
        ? reasoningCapabilities.reasoningReservedOutputTokenSpace
        : reservedOutputTokenSpace;
};
// used to force reasoning state (complex) into something simple we can just read from when sending a message
export const getSendableReasoningInfo = (featureName, providerName, modelName, modelSelectionOptions, overridesOfModel) => {
    const { reasoningSlider: reasoningBudgetSlider } = getModelCapabilities(providerName, modelName, overridesOfModel).reasoningCapabilities || {};
    const isReasoningEnabled = getIsReasoningEnabledState(featureName, providerName, modelName, modelSelectionOptions, overridesOfModel);
    if (!isReasoningEnabled)
        return null;
    // check for reasoning budget
    const reasoningBudget = reasoningBudgetSlider?.type === 'budget_slider'
        ? (modelSelectionOptions?.reasoningBudget ?? reasoningBudgetSlider?.default)
        : undefined;
    if (reasoningBudget) {
        return {
            type: 'budget_slider_value',
            isReasoningEnabled: isReasoningEnabled,
            reasoningBudget: reasoningBudget,
        };
    }
    // check for reasoning effort
    const reasoningEffort = reasoningBudgetSlider?.type === 'effort_slider'
        ? (modelSelectionOptions?.reasoningEffort ?? reasoningBudgetSlider?.default)
        : undefined;
    if (reasoningEffort) {
        return {
            type: 'effort_slider_value',
            isReasoningEnabled: isReasoningEnabled,
            reasoningEffort: reasoningEffort,
        };
    }
    return null;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxDYXBhYmlsaXRpZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvY29tbW9uL21vZGVsQ2FwYWJpbGl0aWVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGO0FBUzFGLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHO0lBQ3RDLFNBQVMsRUFBRTtRQUNWLE1BQU0sRUFBRSxFQUFFO0tBQ1Y7SUFDRCxNQUFNLEVBQUU7UUFDUCxNQUFNLEVBQUUsRUFBRTtLQUNWO0lBQ0QsUUFBUSxFQUFFO1FBQ1QsTUFBTSxFQUFFLEVBQUU7S0FDVjtJQUNELE1BQU0sRUFBRTtRQUNQLFFBQVEsRUFBRSx3QkFBd0I7S0FDbEM7SUFDRCxJQUFJLEVBQUU7UUFDTCxRQUFRLEVBQUUsdUJBQXVCO0tBQ2pDO0lBQ0QsVUFBVSxFQUFFO1FBQ1gsTUFBTSxFQUFFLEVBQUU7S0FDVjtJQUNELGdCQUFnQixFQUFFO1FBQ2pCLFFBQVEsRUFBRSwwQkFBMEI7UUFDcEMsTUFBTSxFQUFFLE1BQU07UUFDZCxXQUFXLEVBQUUsSUFBSSxFQUFFLGdCQUFnQjtLQUNuQztJQUNELE1BQU0sRUFBRTtRQUNQLE1BQU0sRUFBRSxFQUFFO0tBQ1Y7SUFDRCxJQUFJLEVBQUU7UUFDTCxNQUFNLEVBQUUsRUFBRTtLQUNWO0lBQ0QsR0FBRyxFQUFFO1FBQ0osTUFBTSxFQUFFLEVBQUU7S0FDVjtJQUNELE9BQU8sRUFBRTtRQUNSLE1BQU0sRUFBRSxFQUFFO0tBQ1Y7SUFDRCxRQUFRLEVBQUU7UUFDVCxRQUFRLEVBQUUsdUJBQXVCO0tBQ2pDO0lBQ0QsT0FBTyxFQUFFO1FBQ1IsMkRBQTJEO1FBQzNELFFBQVEsRUFBRSxFQUFFO0tBQ1o7SUFDRCxZQUFZLEVBQUU7UUFDYiwyR0FBMkc7UUFDM0csTUFBTSxFQUFFLFVBQVU7UUFD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