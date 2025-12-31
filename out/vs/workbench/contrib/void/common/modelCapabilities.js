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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxDYXBhYmlsaXRpZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2NvbW1vbi9tb2RlbENhcGFiaWxpdGllcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQVMxRixNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRztJQUN0QyxTQUFTLEVBQUU7UUFDVixNQUFNLEVBQUUsRUFBRTtLQUNWO0lBQ0QsTUFBTSxFQUFFO1FBQ1AsTUFBTSxFQUFFLEVBQUU7S0FDVjtJQUNELFFBQVEsRUFBRTtRQUNULE1BQU0sRUFBRSxFQUFFO0tBQ1Y7SUFDRCxNQUFNLEVBQUU7UUFDUCxRQUFRLEVBQUUsd0JBQXdCO0tBQ2xDO0lBQ0QsSUFBSSxFQUFFO1FBQ0wsUUFBUSxFQUFFLHVCQUF1QjtLQUNqQztJQUNELFVBQVUsRUFBRTtRQUNYLE1BQU0sRUFBRSxFQUFFO0tBQ1Y7SUFDRCxnQkFBZ0IsRUFBRTtRQUNqQixRQUFRLEVBQUUsMEJBQTBCO1FBQ3BDLE1BQU0sRUFBRSxNQUFNO1FBQ2QsV0FBVyxFQUFFLElBQUksRUFBRSxnQkFBZ0I7S0FDbkM7SUFDRCxNQUFNLEVBQUU7UUFDUCxNQUFNLEVBQUUsRUFBRTtLQUNWO0lBQ0QsSUFBSSxFQUFFO1FBQ0wsTUFBTSxFQUFFLEVBQUU7S0FDVjtJQUNELEdBQUcsRUFBRTtRQUNKLE1BQU0sRUFBRSxFQUFFO0tBQ1Y7SUFDRCxPQUFPLEVBQUU7UUFDUixNQUFNLEVBQUUsRUFBRTtLQUNWO0lBQ0QsUUFBUSxFQUFFO1FBQ1QsUUFBUSxFQUFFLHVCQUF1QjtLQUNqQztJQUNELE9BQU8sRUFBRTtRQUNSLDJEQUEyRDtRQUMzRCxRQUFRLEVBQUUsRUFBRTtLQUNaO0lBQ0QsWUFBWSxFQUFFO1FBQ2IsMkdBQTJHO1FBQzNHLE1BQU0sRUFBRSxVQUFVO1FBQ2xCLE9B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