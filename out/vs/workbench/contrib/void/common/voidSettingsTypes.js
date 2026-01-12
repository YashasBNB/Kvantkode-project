/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { defaultModelsOfProvider, defaultProviderSettings, } from './modelCapabilities.js';
export const providerNames = Object.keys(defaultProviderSettings);
export const localProviderNames = ['ollama', 'vLLM', 'lmStudio']; // all local names
export const nonlocalProviderNames = providerNames.filter((name) => !localProviderNames.includes(name)); // all non-local names
export const customSettingNamesOfProvider = (providerName) => {
    return Object.keys(defaultProviderSettings[providerName]);
};
export const displayInfoOfProviderName = (providerName) => {
    if (providerName === 'anthropic') {
        return { title: 'Anthropic' };
    }
    else if (providerName === 'openAI') {
        return { title: 'OpenAI' };
    }
    else if (providerName === 'deepseek') {
        return { title: 'DeepSeek' };
    }
    else if (providerName === 'openRouter') {
        return { title: 'OpenRouter' };
    }
    else if (providerName === 'ollama') {
        return { title: 'Ollama' };
    }
    else if (providerName === 'vLLM') {
        return { title: 'vLLM' };
    }
    else if (providerName === 'liteLLM') {
        return { title: 'LiteLLM' };
    }
    else if (providerName === 'lmStudio') {
        return { title: 'LM Studio' };
    }
    else if (providerName === 'openAICompatible') {
        return { title: 'Built-in' };
    }
    else if (providerName === 'gemini') {
        return { title: 'Gemini' };
    }
    else if (providerName === 'groq') {
        return { title: 'Groq' };
    }
    else if (providerName === 'xAI') {
        return { title: 'Grok (xAI)' };
    }
    else if (providerName === 'mistral') {
        return { title: 'Mistral' };
    }
    else if (providerName === 'googleVertex') {
        return { title: 'Google Vertex AI' };
    }
    else if (providerName === 'microsoftAzure') {
        return { title: 'Microsoft Azure OpenAI' };
    }
    else if (providerName === 'awsBedrock') {
        return { title: 'AWS Bedrock' };
    }
    throw new Error(`descOfProviderName: Unknown provider name: "${providerName}"`);
};
export const subTextMdOfProviderName = (providerName) => {
    if (providerName === 'anthropic')
        return 'Get your [API Key here](https://console.anthropic.com/settings/keys).';
    if (providerName === 'openAI')
        return 'Get your [API Key here](https://platform.openai.com/api-keys).';
    if (providerName === 'deepseek')
        return 'Get your [API Key here](https://platform.deepseek.com/api_keys).';
    if (providerName === 'openRouter')
        return 'Get your [API Key here](https://openrouter.ai/settings/keys). Read about [rate limits here](https://openrouter.ai/docs/api-reference/limits).';
    if (providerName === 'gemini')
        return 'Get your [API Key here](https://aistudio.google.com/apikey). Read about [rate limits here](https://ai.google.dev/gemini-api/docs/rate-limits#current-rate-limits).';
    if (providerName === 'groq')
        return 'Get your [API Key here](https://console.groq.com/keys).';
    if (providerName === 'xAI')
        return 'Get your [API Key here](https://console.x.ai).';
    if (providerName === 'mistral')
        return 'Get your [API Key here](https://console.mistral.ai/api-keys).';
    if (providerName === 'openAICompatible')
        return 'Built-in provider.';
    if (providerName === 'googleVertex')
        return 'You must authenticate before using Vertex with Void. Read more about endpoints [here](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/call-vertex-using-openai-library), and regions [here](https://cloud.google.com/vertex-ai/docs/general/locations#available-regions).';
    if (providerName === 'microsoftAzure')
        return 'Read more about endpoints [here](https://learn.microsoft.com/en-us/rest/api/aifoundry/model-inference/get-chat-completions/get-chat-completions?view=rest-aifoundry-model-inference-2024-05-01-preview&tabs=HTTP), and get your API key [here](https://learn.microsoft.com/en-us/azure/search/search-security-api-keys?tabs=rest-use%2Cportal-find%2Cportal-query#find-existing-keys).';
    if (providerName === 'awsBedrock')
        return 'Connect via a LiteLLM proxy or the AWS [Bedrock-Access-Gateway](https://github.com/aws-samples/bedrock-access-gateway). LiteLLM Bedrock setup docs are [here](https://docs.litellm.ai/docs/providers/bedrock).';
    if (providerName === 'ollama')
        return 'Read more about custom [Endpoints here](https://github.com/ollama/ollama/blob/main/docs/faq.md#how-can-i-expose-ollama-on-my-network).';
    if (providerName === 'vLLM')
        return 'Read more about custom [Endpoints here](https://docs.vllm.ai/en/latest/getting_started/quickstart.html#openai-compatible-server).';
    if (providerName === 'lmStudio')
        return 'Read more about custom [Endpoints here](https://lmstudio.ai/docs/app/api/endpoints/openai).';
    if (providerName === 'liteLLM')
        return 'Read more about endpoints [here](https://docs.litellm.ai/docs/providers/openai_compatible).';
    throw new Error(`subTextMdOfProviderName: Unknown provider name: "${providerName}"`);
};
export const displayInfoOfSettingName = (providerName, settingName) => {
    if (settingName === 'apiKey') {
        return {
            title: 'API Key',
            // **Please follow this convention**:
            // The word "key..." here is a placeholder for the hash. For example, sk-ant-key... means the key will look like sk-ant-abcdefg123...
            placeholder: providerName === 'anthropic'
                ? 'sk-ant-key...' // sk-ant-api03-key
                : providerName === 'openAI'
                    ? 'sk-proj-key...'
                    : providerName === 'deepseek'
                        ? 'sk-key...'
                        : providerName === 'openRouter'
                            ? 'sk-or-key...' // sk-or-v1-key
                            : providerName === 'gemini'
                                ? 'AIzaSy...'
                                : providerName === 'groq'
                                    ? 'gsk_key...'
                                    : providerName === 'openAICompatible'
                                        ? 'sk-key...'
                                        : providerName === 'xAI'
                                            ? 'xai-key...'
                                            : providerName === 'mistral'
                                                ? 'api-key...'
                                                : providerName === 'googleVertex'
                                                    ? 'AIzaSy...'
                                                    : providerName === 'microsoftAzure'
                                                        ? 'key-...'
                                                        : providerName === 'awsBedrock'
                                                            ? 'key-...'
                                                            : '',
            isPasswordField: true,
        };
    }
    else if (settingName === 'endpoint') {
        return {
            title: providerName === 'ollama'
                ? 'Endpoint'
                : providerName === 'vLLM'
                    ? 'Endpoint'
                    : providerName === 'lmStudio'
                        ? 'Endpoint'
                        : providerName === 'openAICompatible'
                            ? 'baseURL' // (do not include /chat/completions)
                            : providerName === 'googleVertex'
                                ? 'baseURL'
                                : providerName === 'microsoftAzure'
                                    ? 'baseURL'
                                    : providerName === 'liteLLM'
                                        ? 'baseURL'
                                        : providerName === 'awsBedrock'
                                            ? 'Endpoint'
                                            : '(never)',
            placeholder: providerName === 'ollama'
                ? defaultProviderSettings.ollama.endpoint
                : providerName === 'vLLM'
                    ? defaultProviderSettings.vLLM.endpoint
                    : providerName === 'openAICompatible'
                        ? 'https://my-website.com/v1'
                        : providerName === 'lmStudio'
                            ? defaultProviderSettings.lmStudio.endpoint
                            : providerName === 'liteLLM'
                                ? 'http://localhost:4000'
                                : providerName === 'awsBedrock'
                                    ? 'http://localhost:4000/v1'
                                    : '(never)',
        };
    }
    else if (settingName === 'headersJSON') {
        return { title: 'Custom Headers', placeholder: '{ "X-Request-Id": "..." }' };
    }
    else if (settingName === 'region') {
        // vertex only
        return {
            title: 'Region',
            placeholder: providerName === 'googleVertex'
                ? defaultProviderSettings.googleVertex.region
                : providerName === 'awsBedrock'
                    ? defaultProviderSettings.awsBedrock.region
                    : '',
        };
    }
    else if (settingName === 'azureApiVersion') {
        // azure only
        return {
            title: 'API Version',
            placeholder: providerName === 'microsoftAzure'
                ? defaultProviderSettings.microsoftAzure.azureApiVersion
                : '',
        };
    }
    else if (settingName === 'project') {
        return {
            title: providerName === 'microsoftAzure'
                ? 'Resource'
                : providerName === 'googleVertex'
                    ? 'Project'
                    : '',
            placeholder: providerName === 'microsoftAzure'
                ? 'my-resource'
                : providerName === 'googleVertex'
                    ? 'my-project'
                    : '',
        };
    }
    else if (settingName === '_didFillInProviderSettings') {
        return {
            title: '(never)',
            placeholder: '(never)',
        };
    }
    else if (settingName === 'models') {
        return {
            title: '(never)',
            placeholder: '(never)',
        };
    }
    throw new Error(`displayInfo: Unknown setting name: "${settingName}"`);
};
const defaultCustomSettings = {
    apiKey: undefined,
    endpoint: undefined,
    region: undefined, // googleVertex
    project: undefined,
    azureApiVersion: undefined,
    headersJSON: undefined,
};
const modelInfoOfDefaultModelNames = (defaultModelNames) => {
    return {
        models: defaultModelNames.map((modelName, i) => ({
            modelName,
            type: 'default',
            isHidden: defaultModelNames.length >= 10, // hide all models if there are a ton of them, and make user enable them individually
        })),
    };
};
// used when waiting and for a type reference
export const defaultSettingsOfProvider = {
    anthropic: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.anthropic,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.anthropic),
        _didFillInProviderSettings: undefined,
    },
    openAI: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.openAI,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.openAI),
        _didFillInProviderSettings: undefined,
    },
    deepseek: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.deepseek,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.deepseek),
        _didFillInProviderSettings: undefined,
    },
    gemini: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.gemini,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.gemini),
        _didFillInProviderSettings: undefined,
    },
    xAI: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.xAI,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.xAI),
        _didFillInProviderSettings: undefined,
    },
    mistral: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.mistral,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.mistral),
        _didFillInProviderSettings: undefined,
    },
    liteLLM: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.liteLLM,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.liteLLM),
        _didFillInProviderSettings: undefined,
    },
    lmStudio: {
        ...defaultCustomSettings,
        ...defaultProviderSettings.lmStudio,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.lmStudio),
        _didFillInProviderSettings: undefined,
    },
    groq: {
        // aggregator (serves models from multiple providers)
        ...defaultCustomSettings,
        ...defaultProviderSettings.groq,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.groq),
        _didFillInProviderSettings: undefined,
    },
    openRouter: {
        // aggregator (serves models from multiple providers)
        ...defaultCustomSettings,
        ...defaultProviderSettings.openRouter,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.openRouter),
        _didFillInProviderSettings: undefined,
    },
    openAICompatible: {
        // aggregator (serves models from multiple providers)
        ...defaultCustomSettings,
        ...defaultProviderSettings.openAICompatible,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.openAICompatible),
        _didFillInProviderSettings: undefined,
    },
    ollama: {
        // aggregator (serves models from multiple providers)
        ...defaultCustomSettings,
        ...defaultProviderSettings.ollama,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.ollama),
        _didFillInProviderSettings: undefined,
    },
    vLLM: {
        // aggregator (serves models from multiple providers)
        ...defaultCustomSettings,
        ...defaultProviderSettings.vLLM,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.vLLM),
        _didFillInProviderSettings: undefined,
    },
    googleVertex: {
        // aggregator (serves models from multiple providers)
        ...defaultCustomSettings,
        ...defaultProviderSettings.googleVertex,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.googleVertex),
        _didFillInProviderSettings: undefined,
    },
    microsoftAzure: {
        // aggregator (serves models from multiple providers)
        ...defaultCustomSettings,
        ...defaultProviderSettings.microsoftAzure,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.microsoftAzure),
        _didFillInProviderSettings: undefined,
    },
    awsBedrock: {
        // aggregator (serves models from multiple providers)
        ...defaultCustomSettings,
        ...defaultProviderSettings.awsBedrock,
        ...modelInfoOfDefaultModelNames(defaultModelsOfProvider.awsBedrock),
        _didFillInProviderSettings: undefined,
    },
};
export const modelSelectionsEqual = (m1, m2) => {
    return m1.modelName === m2.modelName && m1.providerName === m2.providerName;
};
// this is a state
export const featureNames = ['Chat', 'Ctrl+K', 'Autocomplete', 'Apply', 'SCM'];
export const displayInfoOfFeatureName = (featureName) => {
    // editor:
    if (featureName === 'Autocomplete')
        return 'Autocomplete';
    else if (featureName === 'Ctrl+K')
        return 'Quick Edit';
    // sidebar:
    else if (featureName === 'Chat')
        return 'Chat';
    else if (featureName === 'Apply')
        return 'Apply';
    // source control:
    else if (featureName === 'SCM')
        return 'Commit Message Generator';
    else
        throw new Error(`Feature Name ${featureName} not allowed`);
};
// the models of these can be refreshed (in theory all can, but not all should)
export const refreshableProviderNames = localProviderNames;
// models that come with download buttons
export const hasDownloadButtonsOnModelsProviderNames = ['ollama'];
// use this in isFeatuerNameDissbled
export const isProviderNameDisabled = (providerName, settingsState) => {
    const settingsAtProvider = settingsState.settingsOfProvider[providerName];
    const isAutodetected = refreshableProviderNames.includes(providerName);
    const isDisabled = settingsAtProvider.models.length === 0;
    if (isDisabled) {
        return isAutodetected
            ? 'providerNotAutoDetected'
            : !settingsAtProvider._didFillInProviderSettings
                ? 'notFilledIn'
                : 'addModel';
    }
    return false;
};
export const isFeatureNameDisabled = (featureName, settingsState) => {
    // if has a selected provider, check if it's enabled
    const selectedProvider = settingsState.modelSelectionOfFeature[featureName];
    if (selectedProvider) {
        const { providerName } = selectedProvider;
        return isProviderNameDisabled(providerName, settingsState);
    }
    // if there are any models they can turn on, tell them that
    const canTurnOnAModel = !!providerNames.find((providerName) => settingsState.settingsOfProvider[providerName].models.filter((m) => m.isHidden).length !== 0);
    if (canTurnOnAModel)
        return 'needToEnableModel';
    // if there are any providers filled in, then they just need to add a model
    const anyFilledIn = !!providerNames.find((providerName) => settingsState.settingsOfProvider[providerName]._didFillInProviderSettings);
    if (anyFilledIn)
        return 'addModel';
    return 'addProvider';
};
export const defaultGlobalSettings = {
    autoRefreshModels: true,
    aiInstructions: 'Do not recommend or suggest any stocks, securities, trading strategies, or algorithms. Do not provide investment advice. Only implement the exact trading algorithm the user explicitly requests, using their codebase conventions and modules. If requirements are ambiguous, ask clarifying questions. Output code and tests; avoid prescriptive recommendations.\n\nFor Python trading code in this workspace, always import and use the provided helpers instead of reimplementing HTTP calls or credential logic:\nfrom kk_broker_creds import get_historical_active, place_order_active, get_active_broker_credentials\n\nHow and when to use these helpers:\n- get_active_broker_credentials(backend_url=None, user_id=None):\n  Use when you need to know which broker is active and to retrieve the associated credentials object from the backend. Do NOT print or log secrets. Use this mainly to branch logic based on broker type or to validate that an active broker is configured.\n- get_historical_active(...):\n  Use in backtesting, analysis, and data-preparation functions to fetch historical market data for the active broker. Never hand-wire requests to the broker APIs directly; rely on this helper so secrets stay on the backend.\n- place_order_active(order, backend_url=None, user_id=None):\n  Use ONLY in functions that represent explicit live-trading behavior and only when the user has clearly asked to place or simulate an order. The order parameter should be a dict like {"symbol": str, "side": "buy"|"sell", "qty": number, "type": "market"|"limit"|"stop", ...}. Do not expose credentials, and do not create new order endpoints yourself—always call place_order_active to route orders through the backend.\n\nTemplate for file structure when using kk_broker_creds:\n- Top of file:\n  - Import standard libs (typing, datetime, numpy/pandas if needed).\n  - Import your internal modules (data loaders, indicators, strategies).\n  - Import broker helpers: `from kk_broker_creds import get_historical_active, place_order_active, get_active_broker_credentials`.\n- Config section:\n  - Define symbols/universe, timeframes, and basic risk parameters as simple constants or small config dicts.\n- Data layer functions:\n  - Small functions that call `get_historical_active(...)` and return cleaned dataframes/arrays ready for the strategy.\n- Strategy logic functions:\n  - Pure functions that take prepared data and parameters and return signals/trades (no I/O, no network).\n- Execution layer functions:\n  - Thin wrappers that translate strategy signals into `order` dicts and call `place_order_active(order, ...)` when the user has explicitly requested live trading.\n- Main entrypoint / run() function:\n  - Orchestrates: load data -> run strategy -> optionally call execution layer.\n\nRequirements:\n- Assume `VOID_JWT` or ~/.void_jwt and backend URL envs are set so kk_broker_creds can resolve user and broker.\n- Never print or log raw credentials. Only work with the high-level objects returned by the helpers.\n- Keep strategy code separable from execution so strategies can be reused for backtesting without live orders.\n- If you are unsure about symbol formats, timeframes, or order fields, ask the user for those details instead of guessing.',
    enableAutocomplete: false,
    syncApplyToChat: true,
    syncSCMToChat: true,
    enableFastApply: true,
    chatMode: 'agent',
    autoApprove: {},
    showInlineSuggestions: true,
    includeToolLintErrors: true,
    isOnboardingComplete: false,
    disableSystemMessage: false,
    autoAcceptLLMChanges: true,
    autoAllToolsEnabledOnce: false,
};
export const globalSettingNames = Object.keys(defaultGlobalSettings);
const overridesOfModel = {};
for (const providerName of providerNames) {
    overridesOfModel[providerName] = {};
}
export const defaultOverridesOfModel = overridesOfModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNldHRpbmdzVHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvY29tbW9uL3ZvaWRTZXR0aW5nc1R5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGO0FBRTFGLE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsdUJBQXVCLEdBRXZCLE1BQU0sd0JBQXdCLENBQUE7QUFPL0IsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQW1CLENBQUE7QUFFbkYsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBMEIsQ0FBQSxDQUFDLGtCQUFrQjtBQUM1RyxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxhQUFhLENBQUMsTUFBTSxDQUN4RCxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBRSxrQkFBK0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQzFELENBQUEsQ0FBQyxzQkFBc0I7QUFReEIsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsQ0FBQyxZQUEwQixFQUFFLEVBQUU7SUFDMUUsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFlBQVksQ0FBQyxDQUF3QixDQUFBO0FBQ2pGLENBQUMsQ0FBQTtBQTZCRCxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxDQUN4QyxZQUEwQixFQUNHLEVBQUU7SUFDL0IsSUFBSSxZQUFZLEtBQUssV0FBVyxFQUFFLENBQUM7UUFDbEMsT0FBTyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsQ0FBQTtJQUM5QixDQUFDO1NBQU0sSUFBSSxZQUFZLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDdEMsT0FBTyxFQUFFLEtBQUss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