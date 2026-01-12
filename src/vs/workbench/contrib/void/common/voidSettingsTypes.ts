/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import {
	defaultModelsOfProvider,
	defaultProviderSettings,
	ModelOverrides,
} from './modelCapabilities.js'
import { ToolApprovalType } from './toolsServiceTypes.js'
import { VoidSettingsState } from './voidSettingsService.js'

type UnionOfKeys<T> = T extends T ? keyof T : never

export type ProviderName = keyof typeof defaultProviderSettings
export const providerNames = Object.keys(defaultProviderSettings) as ProviderName[]

export const localProviderNames = ['ollama', 'vLLM', 'lmStudio'] satisfies ProviderName[] // all local names
export const nonlocalProviderNames = providerNames.filter(
	(name) => !(localProviderNames as string[]).includes(name),
) // all non-local names

type CustomSettingName = UnionOfKeys<(typeof defaultProviderSettings)[ProviderName]>
type CustomProviderSettings<providerName extends ProviderName> = {
	[k in CustomSettingName]: k extends keyof (typeof defaultProviderSettings)[providerName]
		? string
		: undefined
}
export const customSettingNamesOfProvider = (providerName: ProviderName) => {
	return Object.keys(defaultProviderSettings[providerName]) as CustomSettingName[]
}

export type VoidStatefulModelInfo = {
	// <-- STATEFUL
	modelName: string
	type: 'default' | 'autodetected' | 'custom'
	isHidden: boolean // whether or not the user is hiding it (switched off)
}

type CommonProviderSettings = {
	_didFillInProviderSettings: boolean | undefined // undefined initially, computed when user types in all fields
	models: VoidStatefulModelInfo[]
}

export type SettingsAtProvider<providerName extends ProviderName> =
	CustomProviderSettings<providerName> & CommonProviderSettings

// part of state
export type SettingsOfProvider = {
	[providerName in ProviderName]: SettingsAtProvider<providerName>
}

export type SettingName = keyof SettingsAtProvider<ProviderName>

type DisplayInfoForProviderName = {
	title: string
	desc?: string
}

export const displayInfoOfProviderName = (
	providerName: ProviderName,
): DisplayInfoForProviderName => {
	if (providerName === 'anthropic') {
		return { title: 'Anthropic' }
	} else if (providerName === 'openAI') {
		return { title: 'OpenAI' }
	} else if (providerName === 'deepseek') {
		return { title: 'DeepSeek' }
	} else if (providerName === 'openRouter') {
		return { title: 'OpenRouter' }
	} else if (providerName === 'ollama') {
		return { title: 'Ollama' }
	} else if (providerName === 'vLLM') {
		return { title: 'vLLM' }
	} else if (providerName === 'liteLLM') {
		return { title: 'LiteLLM' }
	} else if (providerName === 'lmStudio') {
		return { title: 'LM Studio' }
	} else if (providerName === 'openAICompatible') {
		return { title: 'Built-in' }
	} else if (providerName === 'gemini') {
		return { title: 'Gemini' }
	} else if (providerName === 'groq') {
		return { title: 'Groq' }
	} else if (providerName === 'xAI') {
		return { title: 'Grok (xAI)' }
	} else if (providerName === 'mistral') {
		return { title: 'Mistral' }
	} else if (providerName === 'googleVertex') {
		return { title: 'Google Vertex AI' }
	} else if (providerName === 'microsoftAzure') {
		return { title: 'Microsoft Azure OpenAI' }
	} else if (providerName === 'awsBedrock') {
		return { title: 'AWS Bedrock' }
	}

	throw new Error(`descOfProviderName: Unknown provider name: "${providerName}"`)
}

export const subTextMdOfProviderName = (providerName: ProviderName): string => {
	if (providerName === 'anthropic')
		return 'Get your [API Key here](https://console.anthropic.com/settings/keys).'
	if (providerName === 'openAI')
		return 'Get your [API Key here](https://platform.openai.com/api-keys).'
	if (providerName === 'deepseek')
		return 'Get your [API Key here](https://platform.deepseek.com/api_keys).'
	if (providerName === 'openRouter')
		return 'Get your [API Key here](https://openrouter.ai/settings/keys). Read about [rate limits here](https://openrouter.ai/docs/api-reference/limits).'
	if (providerName === 'gemini')
		return 'Get your [API Key here](https://aistudio.google.com/apikey). Read about [rate limits here](https://ai.google.dev/gemini-api/docs/rate-limits#current-rate-limits).'
	if (providerName === 'groq') return 'Get your [API Key here](https://console.groq.com/keys).'
	if (providerName === 'xAI') return 'Get your [API Key here](https://console.x.ai).'
	if (providerName === 'mistral')
		return 'Get your [API Key here](https://console.mistral.ai/api-keys).'
	if (providerName === 'openAICompatible') return 'Built-in provider.'
	if (providerName === 'googleVertex')
		return 'You must authenticate before using Vertex with Void. Read more about endpoints [here](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/call-vertex-using-openai-library), and regions [here](https://cloud.google.com/vertex-ai/docs/general/locations#available-regions).'
	if (providerName === 'microsoftAzure')
		return 'Read more about endpoints [here](https://learn.microsoft.com/en-us/rest/api/aifoundry/model-inference/get-chat-completions/get-chat-completions?view=rest-aifoundry-model-inference-2024-05-01-preview&tabs=HTTP), and get your API key [here](https://learn.microsoft.com/en-us/azure/search/search-security-api-keys?tabs=rest-use%2Cportal-find%2Cportal-query#find-existing-keys).'
	if (providerName === 'awsBedrock')
		return 'Connect via a LiteLLM proxy or the AWS [Bedrock-Access-Gateway](https://github.com/aws-samples/bedrock-access-gateway). LiteLLM Bedrock setup docs are [here](https://docs.litellm.ai/docs/providers/bedrock).'
	if (providerName === 'ollama')
		return 'Read more about custom [Endpoints here](https://github.com/ollama/ollama/blob/main/docs/faq.md#how-can-i-expose-ollama-on-my-network).'
	if (providerName === 'vLLM')
		return 'Read more about custom [Endpoints here](https://docs.vllm.ai/en/latest/getting_started/quickstart.html#openai-compatible-server).'
	if (providerName === 'lmStudio')
		return 'Read more about custom [Endpoints here](https://lmstudio.ai/docs/app/api/endpoints/openai).'
	if (providerName === 'liteLLM')
		return 'Read more about endpoints [here](https://docs.litellm.ai/docs/providers/openai_compatible).'

	throw new Error(`subTextMdOfProviderName: Unknown provider name: "${providerName}"`)
}

type DisplayInfo = {
	title: string
	placeholder: string
	isPasswordField?: boolean
}
export const displayInfoOfSettingName = (
	providerName: ProviderName,
	settingName: SettingName,
): DisplayInfo => {
	if (settingName === 'apiKey') {
		return {
			title: 'API Key',

			// **Please follow this convention**:
			// The word "key..." here is a placeholder for the hash. For example, sk-ant-key... means the key will look like sk-ant-abcdefg123...
			placeholder:
				providerName === 'anthropic'
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
		}
	} else if (settingName === 'endpoint') {
		return {
			title:
				providerName === 'ollama'
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

			placeholder:
				providerName === 'ollama'
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
		}
	} else if (settingName === 'headersJSON') {
		return { title: 'Custom Headers', placeholder: '{ "X-Request-Id": "..." }' }
	} else if (settingName === 'region') {
		// vertex only
		return {
			title: 'Region',
			placeholder:
				providerName === 'googleVertex'
					? defaultProviderSettings.googleVertex.region
					: providerName === 'awsBedrock'
						? defaultProviderSettings.awsBedrock.region
						: '',
		}
	} else if (settingName === 'azureApiVersion') {
		// azure only
		return {
			title: 'API Version',
			placeholder:
				providerName === 'microsoftAzure'
					? defaultProviderSettings.microsoftAzure.azureApiVersion
					: '',
		}
	} else if (settingName === 'project') {
		return {
			title:
				providerName === 'microsoftAzure'
					? 'Resource'
					: providerName === 'googleVertex'
						? 'Project'
						: '',
			placeholder:
				providerName === 'microsoftAzure'
					? 'my-resource'
					: providerName === 'googleVertex'
						? 'my-project'
						: '',
		}
	} else if (settingName === '_didFillInProviderSettings') {
		return {
			title: '(never)',
			placeholder: '(never)',
		}
	} else if (settingName === 'models') {
		return {
			title: '(never)',
			placeholder: '(never)',
		}
	}

	throw new Error(`displayInfo: Unknown setting name: "${settingName}"`)
}

const defaultCustomSettings: Record<CustomSettingName, undefined> = {
	apiKey: undefined,
	endpoint: undefined,
	region: undefined, // googleVertex
	project: undefined,
	azureApiVersion: undefined,
	headersJSON: undefined,
}

const modelInfoOfDefaultModelNames = (
	defaultModelNames: string[],
): { models: VoidStatefulModelInfo[] } => {
	return {
		models: defaultModelNames.map((modelName, i) => ({
			modelName,
			type: 'default',
			isHidden: defaultModelNames.length >= 10, // hide all models if there are a ton of them, and make user enable them individually
		})),
	}
}

// used when waiting and for a type reference
export const defaultSettingsOfProvider: SettingsOfProvider = {
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
}

export type ModelSelection = { providerName: ProviderName; modelName: string }

export const modelSelectionsEqual = (m1: ModelSelection, m2: ModelSelection) => {
	return m1.modelName === m2.modelName && m1.providerName === m2.providerName
}

// this is a state
export const featureNames = ['Chat', 'Ctrl+K', 'Autocomplete', 'Apply', 'SCM'] as const
export type ModelSelectionOfFeature = Record<(typeof featureNames)[number], ModelSelection | null>
export type FeatureName = keyof ModelSelectionOfFeature

export const displayInfoOfFeatureName = (featureName: FeatureName) => {
	// editor:
	if (featureName === 'Autocomplete') return 'Autocomplete'
	else if (featureName === 'Ctrl+K') return 'Quick Edit'
	// sidebar:
	else if (featureName === 'Chat') return 'Chat'
	else if (featureName === 'Apply') return 'Apply'
	// source control:
	else if (featureName === 'SCM') return 'Commit Message Generator'
	else throw new Error(`Feature Name ${featureName} not allowed`)
}

// the models of these can be refreshed (in theory all can, but not all should)
export const refreshableProviderNames = localProviderNames
export type RefreshableProviderName = (typeof refreshableProviderNames)[number]

// models that come with download buttons
export const hasDownloadButtonsOnModelsProviderNames = ['ollama'] as const satisfies ProviderName[]

// use this in isFeatuerNameDissbled
export const isProviderNameDisabled = (
	providerName: ProviderName,
	settingsState: VoidSettingsState,
) => {
	const settingsAtProvider = settingsState.settingsOfProvider[providerName]
	const isAutodetected = (refreshableProviderNames as string[]).includes(providerName)

	const isDisabled = settingsAtProvider.models.length === 0
	if (isDisabled) {
		return isAutodetected
			? 'providerNotAutoDetected'
			: !settingsAtProvider._didFillInProviderSettings
				? 'notFilledIn'
				: 'addModel'
	}
	return false
}

export const isFeatureNameDisabled = (
	featureName: FeatureName,
	settingsState: VoidSettingsState,
) => {
	// if has a selected provider, check if it's enabled
	const selectedProvider = settingsState.modelSelectionOfFeature[featureName]

	if (selectedProvider) {
		const { providerName } = selectedProvider
		return isProviderNameDisabled(providerName, settingsState)
	}

	// if there are any models they can turn on, tell them that
	const canTurnOnAModel = !!providerNames.find(
		(providerName) =>
			settingsState.settingsOfProvider[providerName].models.filter((m) => m.isHidden).length !== 0,
	)
	if (canTurnOnAModel) return 'needToEnableModel'

	// if there are any providers filled in, then they just need to add a model
	const anyFilledIn = !!providerNames.find(
		(providerName) => settingsState.settingsOfProvider[providerName]._didFillInProviderSettings,
	)
	if (anyFilledIn) return 'addModel'

	return 'addProvider'
}

export type ChatMode = 'agent' | 'gather' | 'normal'

export type GlobalSettings = {
	autoRefreshModels: boolean
	aiInstructions: string
	enableAutocomplete: boolean
	syncApplyToChat: boolean
	syncSCMToChat: boolean
	enableFastApply: boolean
	chatMode: ChatMode
	autoApprove: { [approvalType in ToolApprovalType]?: boolean }
	showInlineSuggestions: boolean
	includeToolLintErrors: boolean
	isOnboardingComplete: boolean
	disableSystemMessage: boolean
	autoAcceptLLMChanges: boolean
	/** One-time migration flag so we only force-enable tool settings once. */
	autoAllToolsEnabledOnce?: boolean
}

export const defaultGlobalSettings: GlobalSettings = {
	autoRefreshModels: true,
	aiInstructions:
	    'Do not recommend or suggest any stocks, securities, trading strategies, or algorithms. Do not provide investment advice. Only implement the exact trading algorithm the user explicitly requests, using their codebase conventions and modules. If requirements are ambiguous, ask clarifying questions. Output code and tests; avoid prescriptive recommendations.\n\nFor Python trading code in this workspace, always import and use the provided helpers instead of reimplementing HTTP calls or credential logic:\nfrom kk_broker_creds import get_historical_active, place_order_active, get_active_broker_credentials\n\nHow and when to use these helpers:\n- get_active_broker_credentials(backend_url=None, user_id=None):\n  Use when you need to know which broker is active and to retrieve the associated credentials object from the backend. Do NOT print or log secrets. Use this mainly to branch logic based on broker type or to validate that an active broker is configured.\n- get_historical_active(...):\n  Use in backtesting, analysis, and data-preparation functions to fetch historical market data for the active broker. Never hand-wire requests to the broker APIs directly; rely on this helper so secrets stay on the backend.\n- place_order_active(order, backend_url=None, user_id=None):\n  Use ONLY in functions that represent explicit live-trading behavior and only when the user has clearly asked to place or simulate an order. The order parameter should be a dict like {"symbol": str, "side": "buy"|"sell", "qty": number, "type": "market"|"limit"|"stop", ...}. Do not expose credentials, and do not create new order endpoints yourself—always call place_order_active to route orders through the backend.\n\nTemplate for file structure when using kk_broker_creds:\n- Top of file:\n  - Import standard libs (typing, datetime, numpy/pandas if needed).\n  - Import your internal modules (data loaders, indicators, strategies).\n  - Import broker helpers: `from kk_broker_creds import get_historical_active, place_order_active, get_active_broker_credentials`.\n- Config section:\n  - Define symbols/universe, timeframes, and basic risk parameters as simple constants or small config dicts.\n- Data layer functions:\n  - Small functions that call `get_historical_active(...)` and return cleaned dataframes/arrays ready for the strategy.\n- Strategy logic functions:\n  - Pure functions that take prepared data and parameters and return signals/trades (no I/O, no network).\n- Execution layer functions:\n  - Thin wrappers that translate strategy signals into `order` dicts and call `place_order_active(order, ...)` when the user has explicitly requested live trading.\n- Main entrypoint / run() function:\n  - Orchestrates: load data -> run strategy -> optionally call execution layer.\n\nRequirements:\n- Assume `VOID_JWT` or ~/.void_jwt and backend URL envs are set so kk_broker_creds can resolve user and broker.\n- Never print or log raw credentials. Only work with the high-level objects returned by the helpers.\n- Keep strategy code separable from execution so strategies can be reused for backtesting without live orders.\n- If you are unsure about symbol formats, timeframes, or order fields, ask the user for those details instead of guessing.',
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
}

export type GlobalSettingName = keyof GlobalSettings
export const globalSettingNames = Object.keys(defaultGlobalSettings) as GlobalSettingName[]

export type ModelSelectionOptions = {
	reasoningEnabled?: boolean
	reasoningBudget?: number
	reasoningEffort?: string
}

export type OptionsOfModelSelection = {
	[featureName in FeatureName]: Partial<{
		[providerName in ProviderName]: {
			[modelName: string]: ModelSelectionOptions | undefined
		}
	}>
}

export type OverridesOfModel = {
	[providerName in ProviderName]: {
		[modelName: string]: Partial<ModelOverrides> | undefined
	}
}

const overridesOfModel = {} as OverridesOfModel
for (const providerName of providerNames) {
	overridesOfModel[providerName] = {}
}
export const defaultOverridesOfModel = overridesOfModel

export interface MCPUserStateOfName {
	[serverName: string]: MCPUserState | undefined
}

export interface MCPUserState {
	isOn: boolean
}
