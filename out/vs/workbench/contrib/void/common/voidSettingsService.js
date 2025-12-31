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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNldHRpbmdzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvY29tbW9uL3ZvaWRTZXR0aW5nc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDaEcsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3JELE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsb0JBQW9CLEdBRXBCLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDNUQsT0FBTyxFQUNOLHlCQUF5QixFQU16QixhQUFhLEVBRWIsb0JBQW9CLEVBQ3BCLFlBQVksRUFJWixxQkFBcUIsRUFLckIsdUJBQXVCLEdBR3ZCLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUE2RTFELE1BQU0sNkJBQTZCLEdBQUcsQ0FBQyxPQUl0QyxFQUFFLEVBQUU7SUFDSixNQUFNLEVBQUUsY0FBYyxFQUFFLE1BQU0s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