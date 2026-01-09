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
import { IVoidSettingsService } from './voidSettingsService.js';
import { ILLMMessageService } from './sendLLMMessageService.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { refreshableProviderNames, } from './voidSettingsTypes.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
const refreshBasedOn = {
    ollama: ['_didFillInProviderSettings', 'endpoint'],
    vLLM: ['_didFillInProviderSettings', 'endpoint'],
    lmStudio: ['_didFillInProviderSettings', 'endpoint'],
    // openAICompatible: ['_didFillInProviderSettings', 'endpoint', 'apiKey'],
};
const REFRESH_INTERVAL = 5_000;
// const COOLDOWN_TIMEOUT = 300
const autoOptions = { enableProviderOnSuccess: true, doNotFire: true };
// element-wise equals
function eq(a, b) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i])
            return false;
    }
    return true;
}
export const IRefreshModelService = createDecorator('RefreshModelService');
let RefreshModelService = class RefreshModelService extends Disposable {
    constructor(voidSettingsService, llmMessageService) {
        super();
        this.voidSettingsService = voidSettingsService;
        this.llmMessageService = llmMessageService;
        this._onDidChangeState = new Emitter();
        this.onDidChangeState = this._onDidChangeState.event; // this is primarily for use in react, so react can listen + update on state changes
        this.state = {
            ollama: { state: 'init', timeoutId: null },
            vLLM: { state: 'init', timeoutId: null },
            lmStudio: { state: 'init', timeoutId: null },
        };
        // start listening for models (and don't stop)
        this.startRefreshingModels = (providerName, options) => {
            this._clearProviderTimeout(providerName);
            this._setRefreshState(providerName, 'refreshing', options);
            const autoPoll = () => {
                if (this.voidSettingsService.state.globalSettings.autoRefreshModels) {
                    // resume auto-polling
                    const timeoutId = setTimeout(() => this.startRefreshingModels(providerName, autoOptions), REFRESH_INTERVAL);
                    this._setTimeoutId(providerName, timeoutId);
                }
            };
            const listFn = providerName === 'ollama'
                ? this.llmMessageService.ollamaList
                : this.llmMessageService.openAICompatibleList;
            listFn({
                providerName,
                onSuccess: ({ models }) => {
                    // set the models to the detected models
                    this.voidSettingsService.setAutodetectedModels(providerName, models.map((model) => {
                        if (providerName === 'ollama')
                            return model.name;
                        else if (providerName === 'vLLM')
                            return model.id;
                        else if (providerName === 'lmStudio')
                            return model.id;
                        else
                            throw new Error('refreshMode fn: unknown provider', providerName);
                    }), {
                        enableProviderOnSuccess: options.enableProviderOnSuccess,
                        hideRefresh: options.doNotFire,
                    });
                    if (options.enableProviderOnSuccess)
                        this.voidSettingsService.setSettingOfProvider(providerName, '_didFillInProviderSettings', true);
                    this._setRefreshState(providerName, 'finished', options);
                    autoPoll();
                },
                onError: ({ error }) => {
                    this._setRefreshState(providerName, 'error', options);
                    autoPoll();
                },
            });
        };
        const disposables = new Set();
        const initializeAutoPollingAndOnChange = () => {
            this._clearAllTimeouts();
            disposables.forEach((d) => d.dispose());
            disposables.clear();
            if (!voidSettingsService.state.globalSettings.autoRefreshModels)
                return;
            for (const providerName of refreshableProviderNames) {
                // const { '_didFillInProviderSettings': enabled } = this.voidSettingsService.state.settingsOfProvider[providerName]
                this.startRefreshingModels(providerName, autoOptions);
                // every time providerName.enabled changes, refresh models too, like a useEffect
                let relevantVals = () => refreshBasedOn[providerName].map((settingName) => voidSettingsService.state.settingsOfProvider[providerName][settingName]);
                let prevVals = relevantVals(); // each iteration of a for loop has its own context and vars, so this is ok
                disposables.add(voidSettingsService.onDidChangeState(() => {
                    // we might want to debounce this
                    const newVals = relevantVals();
                    if (!eq(prevVals, newVals)) {
                        const prevEnabled = prevVals[0];
                        const enabled = newVals[0];
                        // if it was just enabled, or there was a change and it wasn't to the enabled state, refresh
                        if ((enabled && !prevEnabled) || (!enabled && !prevEnabled)) {
                            // if user just clicked enable, refresh
                            this.startRefreshingModels(providerName, autoOptions);
                        }
                        else {
                            // else if user just clicked disable, don't refresh
                            // //give cooldown before re-enabling (or at least re-fetching)
                            // const timeoutId = setTimeout(() => this.refreshModels(providerName, !enabled), COOLDOWN_TIMEOUT)
                            // this._setTimeoutId(providerName, timeoutId)
                        }
                        prevVals = newVals;
                    }
                }));
            }
        };
        // on mount (when get init settings state), and if a relevant feature flag changes, start refreshing models
        voidSettingsService.waitForInitState.then(() => {
            initializeAutoPollingAndOnChange();
            this._register(voidSettingsService.onDidChangeState((type) => {
                if (typeof type === 'object' && type[1] === 'autoRefreshModels')
                    initializeAutoPollingAndOnChange();
            }));
        });
    }
    _clearAllTimeouts() {
        for (const providerName of refreshableProviderNames) {
            this._clearProviderTimeout(providerName);
        }
    }
    _clearProviderTimeout(providerName) {
        // cancel any existing poll
        if (this.state[providerName].timeoutId) {
            clearTimeout(this.state[providerName].timeoutId);
            this._setTimeoutId(providerName, null);
        }
    }
    _setTimeoutId(providerName, timeoutId) {
        this.state[providerName].timeoutId = timeoutId;
    }
    _setRefreshState(providerName, state, options) {
        if (options?.doNotFire)
            return;
        this.state[providerName].state = state;
        this._onDidChangeState.fire(providerName);
    }
};
RefreshModelService = __decorate([
    __param(0, IVoidSettingsService),
    __param(1, ILLMMessageService)
], RefreshModelService);
export { RefreshModelService };
registerSingleton(IRefreshModelService, RefreshModelService, 0 /* InstantiationType.Eager */);
