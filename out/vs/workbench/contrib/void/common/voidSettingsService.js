/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { deepClone } from '../../../../base/common/objects.js';
import { IEncryptionService } from '../../../../platform/encryption/common/encryptionService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IMetricsService } from './metricsService.js';
import { defaultProviderSettings, getModelCapabilities, } from './modelCapabilities.js';
import { VOID_SETTINGS_STORAGE_KEY } from './storageKeys.js';
import { defaultSettingsOfProvider, providerNames, modelSelectionsEqual, featureNames, defaultGlobalSettings, defaultOverridesOfModel, } from './voidSettingsTypes.js';
import { toolApprovalTypes } from './toolsServiceTypes.js';
const _modelsWithSwappedInNewModels = (options) => {
    const { existingModels, models, type } = options;
    const existingModelsMap = {};
    for (const existingModel of existingModels) {
        existingModelsMap[existingModel.modelName] = existingModel;
    }
    const newDefaultModels = models.map((modelName, i) => ({
        modelName,
        type,
        isHidden: !!existingModelsMap[modelName]?.isHidden,
    }));
    return [
        ...newDefaultModels, // swap out all the models of this type for the new models of this type
        ...existingModels.filter((m) => {
            const keep = m.type !== type;
            return keep;
        }),
    ];
};
export const modelFilterOfFeatureName = {
    Autocomplete: {
        filter: (o, opts) => getModelCapabilities(o.providerName, o.modelName, opts.overridesOfModel).supportsFIM,
        emptyMessage: { message: 'No models support FIM', priority: 'always' },
    },
    Chat: { filter: (o) => true, emptyMessage: null },
    'Ctrl+K': { filter: (o) => true, emptyMessage: null },
    Apply: { filter: (o) => true, emptyMessage: null },
    SCM: { filter: (o) => true, emptyMessage: null },
};
const _stateWithMergedDefaultModels = (state) => {
    let newSettingsOfProvider = state.settingsOfProvider;
    // recompute default models
    for (const providerName of providerNames) {
        const defaultModels = defaultSettingsOfProvider[providerName]?.models ?? [];
        const currentModels = newSettingsOfProvider[providerName]?.models ?? [];
        const defaultModelNames = defaultModels.map((m) => m.modelName);
        const newModels = _modelsWithSwappedInNewModels({
            existingModels: currentModels,
            models: defaultModelNames,
            type: 'default',
        });
        newSettingsOfProvider = {
            ...newSettingsOfProvider,
            [providerName]: {
                ...newSettingsOfProvider[providerName],
                models: newModels,
            },
        };
    }
    return {
        ...state,
        settingsOfProvider: newSettingsOfProvider,
    };
};
const _validatedModelState = (state) => {
    let newSettingsOfProvider = state.settingsOfProvider;
    // recompute _didFillInProviderSettings
    for (const providerName of providerNames) {
        const settingsAtProvider = newSettingsOfProvider[providerName];
        const didFillInProviderSettings = Object.keys(defaultProviderSettings[providerName]).every((key) => !!settingsAtProvider[key]);
        if (didFillInProviderSettings === settingsAtProvider._didFillInProviderSettings)
            continue;
        newSettingsOfProvider = {
            ...newSettingsOfProvider,
            [providerName]: {
                ...settingsAtProvider,
                _didFillInProviderSettings: didFillInProviderSettings,
            },
        };
    }
    // update model options
    let newModelOptions = [];
    for (const providerName of providerNames) {
        const providerTitle = providerName; // displayInfoOfProviderName(providerName).title.toLowerCase()
        if (!newSettingsOfProvider[providerName]._didFillInProviderSettings)
            continue; // if disabled, don't display model options
        for (const { modelName, isHidden } of newSettingsOfProvider[providerName].models) {
            if (isHidden)
                continue;
            const name = providerName === 'openAICompatible'
                ? `${modelName}` // hide provider label to appear built-in
                : `${modelName} (${providerTitle})`;
            newModelOptions.push({ name, selection: { providerName, modelName } });
        }
    }
    // now that model options are updated, make sure the selection is valid
    // if the user-selected model is no longer in the list, update the selection for each feature that needs it to something relevant (the 0th model available, or null)
    let newModelSelectionOfFeature = state.modelSelectionOfFeature;
    for (const featureName of featureNames) {
        const { filter } = modelFilterOfFeatureName[featureName];
        const filterOpts = {
            chatMode: state.globalSettings.chatMode,
            overridesOfModel: state.overridesOfModel,
        };
        const modelOptionsForThisFeature = newModelOptions.filter((o) => filter(o.selection, filterOpts));
        const modelSelectionAtFeature = newModelSelectionOfFeature[featureName];
        const selnIdx = modelSelectionAtFeature === null
            ? -1
            : modelOptionsForThisFeature.findIndex((m) => modelSelectionsEqual(m.selection, modelSelectionAtFeature));
        if (selnIdx !== -1)
            continue; // no longer in list, so update to 1st in list or null
        newModelSelectionOfFeature = {
            ...newModelSelectionOfFeature,
            [featureName]: modelOptionsForThisFeature.length === 0 ? null : modelOptionsForThisFeature[0].selection,
        };
    }
    const newState = {
        ...state,
        settingsOfProvider: newSettingsOfProvider,
        modelSelectionOfFeature: newModelSelectionOfFeature,
        overridesOfModel: state.overridesOfModel,
        _modelOptions: newModelOptions,
    };
    return newState;
};
const defaultState = () => {
    const d = {
        settingsOfProvider: deepClone(defaultSettingsOfProvider),
        modelSelectionOfFeature: {
            Chat: null,
            'Ctrl+K': null,
            Autocomplete: null,
            Apply: null,
            SCM: null,
        },
        globalSettings: deepClone(defaultGlobalSettings),
        optionsOfModelSelection: { Chat: {}, 'Ctrl+K': {}, Autocomplete: {}, Apply: {}, SCM: {} },
        overridesOfModel: deepClone(defaultOverridesOfModel),
        _modelOptions: [], // computed later
        mcpUserStateOfName: {},
    };
    return d;
};
export const IVoidSettingsService = createDecorator('VoidSettingsService');
let VoidSettingsService = class VoidSettingsService extends Disposable {
    constructor(_storageService, _encryptionService, _metricsService) {
        super();
        this._storageService = _storageService;
        this._encryptionService = _encryptionService;
        this._metricsService = _metricsService;
        this._onDidChangeState = new Emitter();
        this.onDidChangeState = this._onDidChangeState.event; // this is primarily for use in react, so react can listen + update on state changes
        this.dangerousSetState = async (newState) => {
            this.state = _validatedModelState(newState);
            await this._storeState();
            this._onDidChangeState.fire();
            this._onUpdate_syncApplyToChat();
            this._onUpdate_syncSCMToChat();
        };
        this.setSettingOfProvider = async (providerName, settingName, newVal) => {
            const newModelSelectionOfFeature = this.state.modelSelectionOfFeature;
            const newOptionsOfModelSelection = this.state.optionsOfModelSelection;
            const newSettingsOfProvider = {
                ...this.state.settingsOfProvider,
                [providerName]: {
                    ...this.state.settingsOfProvider[providerName],
                    [settingName]: newVal,
                },
            };
            const newGlobalSettings = this.state.globalSettings;
            const newOverridesOfModel = this.state.overridesOfModel;
            const newMCPUserStateOfName = this.state.mcpUserStateOfName;
            const newState = {
                modelSelectionOfFeature: newModelSelectionOfFeature,
                optionsOfModelSelection: newOptionsOfModelSelection,
                settingsOfProvider: newSettingsOfProvider,
                globalSettings: newGlobalSettings,
                overridesOfModel: newOverridesOfModel,
                mcpUserStateOfName: newMCPUserStateOfName,
            };
            this.state = _validatedModelState(newState);
            await this._storeState();
            this._onDidChangeState.fire();
        };
        this.setGlobalSetting = async (settingName, newVal) => {
            const newState = {
                ...this.state,
                globalSettings: {
                    ...this.state.globalSettings,
                    [settingName]: newVal,
                },
            };
            this.state = _validatedModelState(newState);
            await this._storeState();
            this._onDidChangeState.fire();
            // hooks
            if (this.state.globalSettings.syncApplyToChat)
                this._onUpdate_syncApplyToChat();
            if (this.state.globalSettings.syncSCMToChat)
                this._onUpdate_syncSCMToChat();
        };
        this.setModelSelectionOfFeature = async (featureName, newVal) => {
            const newState = {
                ...this.state,
                modelSelectionOfFeature: {
                    ...this.state.modelSelectionOfFeature,
                    [featureName]: newVal,
                },
            };
            this.state = _validatedModelState(newState);
            await this._storeState();
            this._onDidChangeState.fire();
            // hooks
            if (featureName === 'Chat') {
                // When Chat model changes, update synced features
                this._onUpdate_syncApplyToChat();
                this._onUpdate_syncSCMToChat();
            }
        };
        this.setOptionsOfModelSelection = async (featureName, providerName, modelName, newVal) => {
            const newState = {
                ...this.state,
                optionsOfModelSelection: {
                    ...this.state.optionsOfModelSelection,
                    [featureName]: {
                        ...this.state.optionsOfModelSelection[featureName],
                        [providerName]: {
                            ...this.state.optionsOfModelSelection[featureName][providerName],
                            [modelName]: {
                                ...this.state.optionsOfModelSelection[featureName][providerName]?.[modelName],
                                ...newVal,
                            },
                        },
                    },
                },
            };
            this.state = _validatedModelState(newState);
            await this._storeState();
            this._onDidChangeState.fire();
        };
        this.setOverridesOfModel = async (providerName, modelName, overrides) => {
            const newState = {
                ...this.state,
                overridesOfModel: {
                    ...this.state.overridesOfModel,
                    [providerName]: {
                        ...this.state.overridesOfModel[providerName],
                        [modelName]: overrides === undefined
                            ? undefined
                            : {
                                ...this.state.overridesOfModel[providerName][modelName],
                                ...overrides,
                            },
                    },
                },
            };
            this.state = _validatedModelState(newState);
            await this._storeState();
            this._onDidChangeState.fire();
            this._metricsService.capture('Update Model Overrides', { providerName, modelName, overrides });
        };
        // MCP Server State
        this._setMCPUserStateOfName = async (newStates) => {
            const newState = {
                ...this.state,
                mcpUserStateOfName: {
                    ...this.state.mcpUserStateOfName,
                    ...newStates,
                },
            };
            this.state = _validatedModelState(newState);
            await this._storeState();
            this._onDidChangeState.fire();
            this._metricsService.capture('Set MCP Server States', { newStates });
        };
        this.addMCPUserStateOfNames = async (newMCPStates) => {
            const { mcpUserStateOfName: mcpServerStates } = this.state;
            const newMCPServerStates = {
                ...mcpServerStates,
                ...newMCPStates,
            };
            await this._setMCPUserStateOfName(newMCPServerStates);
            this._metricsService.capture('Add MCP Servers', {
                servers: Object.keys(newMCPStates).join(', '),
            });
        };
        this.removeMCPUserStateOfNames = async (serverNames) => {
            const { mcpUserStateOfName: mcpServerStates } = this.state;
            const newMCPServerStates = {
                ...mcpServerStates,
            };
            serverNames.forEach((serverName) => {
                if (serverName in newMCPServerStates) {
                    delete newMCPServerStates[serverName];
                }
            });
            await this._setMCPUserStateOfName(newMCPServerStates);
            this._metricsService.capture('Remove MCP Servers', { servers: serverNames.join(', ') });
        };
        this.setMCPServerState = async (serverName, state) => {
            const { mcpUserStateOfName } = this.state;
            const newMCPServerStates = {
                ...mcpUserStateOfName,
                [serverName]: state,
            };
            await this._setMCPUserStateOfName(newMCPServerStates);
            this._metricsService.capture('Update MCP Server State', { serverName, state });
        };
        // at the start, we haven't read the partial config yet, but we need to set state to something
        this.state = defaultState();
        let resolver = () => { };
        this.waitForInitState = new Promise((res, rej) => (resolver = res));
        this._resolver = resolver;
        this.readAndInitializeState();
    }
    async resetState() {
        await this.dangerousSetState(defaultState());
    }
    async readAndInitializeState() {
        let readS;
        let didMigrateEnableTools = false;
        try {
            readS = await this._readState();
            // 1.0.3 addition, remove when enough users have had this code run
            if (readS.globalSettings.includeToolLintErrors === undefined)
                readS.globalSettings.includeToolLintErrors = true;
            // autoapprove is now an obj not a boolean (1.2.5)
            if (typeof readS.globalSettings.autoApprove === 'boolean')
                readS.globalSettings.autoApprove = {};
            // 1.3.5 add source control feature
            if (readS.modelSelectionOfFeature && !readS.modelSelectionOfFeature['SCM']) {
                readS.modelSelectionOfFeature['SCM'] = deepClone(readS.modelSelectionOfFeature['Chat']);
                readS.optionsOfModelSelection['SCM'] = deepClone(readS.optionsOfModelSelection['Chat']);
            }
            // add disableSystemMessage feature
            if (!readS.globalSettings.autoAllToolsEnabledOnce) {
                // Enable auto-approve for all tool approval types
                const autoApprove = { ...readS.globalSettings.autoApprove };
                for (const t of toolApprovalTypes)
                    autoApprove[t] = true;
                readS.globalSettings.autoApprove = autoApprove;
                readS.globalSettings.includeToolLintErrors = true;
                readS.globalSettings.autoAcceptLLMChanges = true;
                readS.globalSettings.autoAllToolsEnabledOnce = true;
                didMigrateEnableTools = true;
            }
        }
        catch (e) {
            readS = defaultState();
        }
        // the stored data structure might be outdated, so we need to update it here
        try {
            readS = {
                ...defaultState(),
                ...readS,
                // no idea why this was here, seems like a bug
                // ...defaultSettingsOfProvider,
                // ...readS.settingsOfProvider,
            };
            for (const providerName of providerNames) {
                readS.settingsOfProvider[providerName] = {
                    ...defaultSettingsOfProvider[providerName],
                    ...readS.settingsOfProvider[providerName],
                };
                // conversion from 1.0.3 to 1.2.5 (can remove this when enough people update)
                for (const m of readS.settingsOfProvider[providerName].models) {
                    if (!m.type) {
                        const old = m;
                        if (old.isAutodetected)
                            m.type = 'autodetected';
                        else if (old.isDefault)
                            m.type = 'default';
                        else
                            m.type = 'custom';
                    }
                }
                // remove when enough people have had it run (default is now {})
                if (providerName === 'openAICompatible' &&
                    !readS.settingsOfProvider[providerName].headersJSON) {
                    readS.settingsOfProvider[providerName].headersJSON = '{}';
                }
            }
            // Ensure OpenAI-Compatible backend defaults for existing users
            {
                const providerName = 'openAICompatible';
                const s = readS.settingsOfProvider[providerName];
                if (!s.endpoint)
                    s.endpoint = defaultProviderSettings.openAICompatible.endpoint;
                // Normalize to include trailing /v1 exactly once
                if (s.endpoint) {
                    let ep = s.endpoint.trim();
                    // remove trailing slashes
                    ep = ep.replace(/\/+$/, '');
                    // append /v1 if missing
                    if (!/\/(v1)$/.test(ep))
                        ep = ep + '/v1';
                    s.endpoint = ep;
                }
                if (!s.apiKey)
                    s.apiKey = defaultProviderSettings.openAICompatible.apiKey;
                if (!s.headersJSON)
                    s.headersJSON = '{}';
                // Ensure backend-default model exists and is visible
                const hasBackendDefault = s.models.some((m) => m.modelName === 'backend-default');
                if (!hasBackendDefault) {
                    s.models = [
                        ...s.models,
                        { modelName: 'backend-default', type: 'default', isHidden: false },
                    ];
                }
            }
        }
        catch (e) {
            readS = defaultState();
        }
        this.state = readS;
        this.state = _stateWithMergedDefaultModels(this.state);
        this.state = _validatedModelState(this.state);
        // Persist one-time migration so user's future changes are respected
        if (didMigrateEnableTools) {
            await this._storeState();
        }
        this._resolver();
        this._onDidChangeState.fire();
    }
    async _readState() {
        const encryptedState = this._storageService.get(VOID_SETTINGS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
        if (!encryptedState)
            return defaultState();
        const stateStr = await this._encryptionService.decrypt(encryptedState);
        const state = JSON.parse(stateStr);
        return state;
    }
    async _storeState() {
        const state = this.state;
        const encryptedState = await this._encryptionService.encrypt(JSON.stringify(state));
        this._storageService.store(VOID_SETTINGS_STORAGE_KEY, encryptedState, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    _onUpdate_syncApplyToChat() {
        // if sync is turned on, sync (call this whenever Chat model or !!sync changes)
        this.setModelSelectionOfFeature('Apply', deepClone(this.state.modelSelectionOfFeature['Chat']));
    }
    _onUpdate_syncSCMToChat() {
        this.setModelSelectionOfFeature('SCM', deepClone(this.state.modelSelectionOfFeature['Chat']));
    }
    setAutodetectedModels(providerName, autodetectedModelNames, logging) {
        const { models } = this.state.settingsOfProvider[providerName];
        const oldModelNames = models.map((m) => m.modelName);
        const newModels = _modelsWithSwappedInNewModels({
            existingModels: models,
            models: autodetectedModelNames,
            type: 'autodetected',
        });
        this.setSettingOfProvider(providerName, 'models', newModels);
        // if the models changed, log it
        const new_names = newModels.map((m) => m.modelName);
        if (!(oldModelNames.length === new_names.length &&
            oldModelNames.every((_, i) => oldModelNames[i] === new_names[i]))) {
            this._metricsService.capture('Autodetect Models', {
                providerName,
                newModels: newModels,
                ...logging,
            });
        }
    }
    toggleModelHidden(providerName, modelName) {
        const { models } = this.state.settingsOfProvider[providerName];
        const modelIdx = models.findIndex((m) => m.modelName === modelName);
        if (modelIdx === -1)
            return;
        const newIsHidden = !models[modelIdx].isHidden;
        const newModels = [
            ...models.slice(0, modelIdx),
            { ...models[modelIdx], isHidden: newIsHidden },
            ...models.slice(modelIdx + 1, Infinity),
        ];
        this.setSettingOfProvider(providerName, 'models', newModels);
        this._metricsService.capture('Toggle Model Hidden', { providerName, modelName, newIsHidden });
    }
    addModel(providerName, modelName) {
        const { models } = this.state.settingsOfProvider[providerName];
        const existingIdx = models.findIndex((m) => m.modelName === modelName);
        if (existingIdx !== -1)
            return; // if exists, do nothing
        const newModels = [...models, { modelName, type: 'custom', isHidden: false }];
        this.setSettingOfProvider(providerName, 'models', newModels);
        this._metricsService.capture('Add Model', { providerName, modelName });
    }
    deleteModel(providerName, modelName) {
        const { models } = this.state.settingsOfProvider[providerName];
        const delIdx = models.findIndex((m) => m.modelName === modelName);
        if (delIdx === -1)
            return false;
        const newModels = [
            ...models.slice(0, delIdx), // delete the idx
            ...models.slice(delIdx + 1, Infinity),
        ];
        this.setSettingOfProvider(providerName, 'models', newModels);
        this._metricsService.capture('Delete Model', { providerName, modelName });
        return true;
    }
};
VoidSettingsService = __decorate([
    __param(0, IStorageService),
    __param(1, IEncryptionService),
    __param(2, IMetricsService)
], VoidSettingsService);
registerSingleton(IVoidSettingsService, VoidSettingsService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNldHRpbmdzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9jb21tb24vdm9pZFNldHRpbmdzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNoRyxPQUFPLEVBQ04saUJBQWlCLEdBRWpCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDckQsT0FBTyxFQUNOLHVCQUF1QixFQUN2QixvQkFBb0IsR0FFcEIsTUFBTSx3QkFBd0IsQ0FBQTtBQUMvQixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUM1RCxPQUFPLEVBQ04seUJBQXlCLEVBTXpCLGFBQWEsRUFFYixvQkFBb0IsRUFDcEIsWUFBWSxFQUlaLHFCQUFxQixFQUtyQix1QkFBdUIsR0FHdkIsTUFBTSx3QkFBd0IsQ0FBQTtBQUMvQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQTZFMUQsTUFBTSw2QkFBNkIsR0FBRyxDQUFDLE9BSXRDLEVBQUUsRUFBRTtJQUNKLE1B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