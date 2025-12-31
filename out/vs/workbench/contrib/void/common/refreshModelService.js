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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmcmVzaE1vZGVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvY29tbW9uL3JlZnJlc2hNb2RlbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDL0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RSxPQUFPLEVBRU4sd0JBQXdCLEdBRXhCLE1BQU0sd0JBQXdCLENBQUE7QUFFL0IsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQStCNUYsTUFBTSxjQUFjLEdBQXdFO0lBQzNGLE1BQU0sRUFBRSxDQUFDLDRCQUE0QixFQUFFLFVBQVUsQ0FBQztJQUNsRCxJQUFJLEVBQUUsQ0FBQyw0QkFBNEIsRUFBRSxVQUFVLENBQUM7SUFDaEQsUUFBUSxFQUFFLENBQUMsNEJBQTRCLEVBQUUsVUFBVSxDQUFDO0lBQ3BELDBFQUEwRTtDQUMxRSxDQUFBO0FBQ0QsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUE7QUFDOUIsK0JBQStCO0FBRS9CLE1BQU0sV0FBVyxHQUFHLEVBQUUsdUJBQXVCLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQTtBQUV0RSxzQkFBc0I7QUFDdEIsU0FBUyxFQUFFLENBQUksQ0FBTSxFQUFFLENBQU07SUFDNUIsSUFBSSxDQUFDLENBQUMsTUFB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