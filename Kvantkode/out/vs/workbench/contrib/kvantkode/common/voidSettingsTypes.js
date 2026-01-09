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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNldHRpbmdzVHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2t2YW50a29kZS9jb21tb24vdm9pZFNldHRpbmdzVHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7QUFFMUYsT0FBTyxFQUNOLHVCQUF1QixFQUN2Qix1QkFBdUIsR0FFdkIsTUFBTSx3QkFBd0IsQ0FBQTtBQU8vQixNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBbUIsQ0FBQTtBQUVuRixNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUEwQixDQUFBLENBQUMsa0JBQWtCO0FBQzVHLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQ3hELENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFFLGtCQUErQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FDMUQsQ0FBQSxDQUFDLHNCQUFzQjtBQVF4QixNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxDQUFDLFlBQTBCLEVBQUUsRUFBRTtJQUMxRSxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsWUFBWSxDQUFDLENBQXdCLENBQUE7QUFDakYsQ0FBQyxDQUFBO0FBNkJELE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLENBQ3hDLFlBQTBCLEVBQ0csRUFBRTtJQUMvQixJQUFJLFlBQVksS0FBSyxXQUFXLEVBQUUsQ0FBQztRQUNsQyxPQUFPLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxDQUFBO0lBQzlCLENBQUM7U0FBTSxJQUFJLFlBQVksS0FBSyxRQUFRLEVBQUUsQ0FB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