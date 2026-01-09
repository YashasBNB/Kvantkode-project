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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNldHRpbmdzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIva3ZhbnRrb2RlL2NvbW1vbi92b2lkU2V0dGluZ3NTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ2hHLE9BQU8sRUFDTixpQkFBaUIsR0FFakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNyRCxPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLG9CQUFvQixHQUVwQixNQUFNLHdCQUF3QixDQUFBO0FBQy9CLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQzVELE9BQU8sRUFDTix5QkFBeUIsRUFNekIsYUFBYSxFQUViLG9CQUFvQixFQUNwQixZQUFZLEVBSVoscUJBQXFCLEVBS3JCLHVCQUF1QixHQUd2QixNQUFNLHdCQUF3QixDQUFBO0FBQy9CLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBNkUxRCxNQUFNLDZCQUE2QixHQUFHLENBQUMsT0FJdEMsRUFBRSxFQUFFO0lB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