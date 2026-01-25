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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmcmVzaE1vZGVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9jb21tb24vcmVmcmVzaE1vZGVsU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlFLE9BQU8sRUFFTix3QkFBd0IsR0FFeEIsTUFBTSx3QkFBd0IsQ0FBQTtBQUUvQixPQUFPLEVBQ04saUJBQWlCLEdBRWpCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBK0I1RixNQUFNLGNBQWMsR0FBd0U7SUFDM0YsTUFBTSxFQUFFLENBQUMsNEJBQTRCLEVBQUUsVUFBVSxDQUFDO0lBQ2xELElBQUksRUFBRSxDQUFDLDRCQUE0QixFQUFFLFVBQVUsQ0FBQztJQUNoRCxRQUFRLEVBQUUsQ0FBQyw0QkFBNEIsRUFBRSxVQUFVLENBQUM7SUFDcEQsMEVBQTBFO0NBQzFFLENBQUE7QUFDRCxNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQTtBQUM5QiwrQkFBK0I7QUFFL0IsTUFBTSxXQUFXLEdBQUcsRUFBRSx1QkFBdUIsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFBO0FBRXRFLHNCQUFzQjtBQUN0QixTQUFTLEVBQUUsQ0FBSSxDQUFNLEVBQUUsQ0FBTTtJQUM1QixJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLE1BQU07UUFBRSxPQUFPLEtBQUssQ0FBQTtJQUN2QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ25DLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFBRSxPQUFPLEtBQUssQ0FBQTtJQUNoQyxDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUE7QUFDWixDQUFDO0FBV0QsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsZUFBZSxDQUF1QixxQkFBcUIsQ0FBQyxDQUFBO0FBRXpGLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQU1sRCxZQUN1QixtQkFBMEQsRUFDNUQsaUJBQXNEO1FBRTFFLEtBQUssRUFBRSxDQUFBO1FBSGdDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFDM0Msc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUwxRCxzQkFBaUIsR0FBRyxJQUFJLE9BQU8sRUFBMkIsQ0FBQTtRQUNsRSxxQkFBZ0IsR0FBbUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQSxDQUFDLG9GQUFvRjtRQWlFN0ssVUFBSyxHQUFnQztZQUNwQyxNQUFNLEVBQUUsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUU7WUFDMUMsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFO1lBQ3hDLFFBQVEsRUFBRSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRTtTQUM1QyxDQUFBO1FBRUQsOENBQThDO1FBQzlDLDBCQUFxQixHQUFrRCxDQUN0RSxZQUFZLEVBQ1osT0FBTyxFQUNOLEVBQUU7WUFDSCxJQUFJLENBQUMscUJBQXFCLENBQUMsWUFBWSxDQUFDLENBQUE7WUFFeEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFFMUQsTUFBTSxRQUFRLEdBQUcsR0FBRyxFQUFFO2dCQUNyQixJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLGlCQUFpQixFQUFFLENBQUM7b0JBQ3JFLHNCQUFzQjtvQkFDdEIsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUMzQixHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxFQUMzRCxnQkFBZ0IsQ0FDaEIsQ0FBQTtvQkFDRCxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFDNUMsQ0FBQztZQUNGLENBQUMsQ0FBQTtZQUNELE1BQU0sTUFBTSxHQUNYLFlBQVksS0FBSyxRQUFRO2dCQUN4QixDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVU7Z0JBQ25DLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLENBQUE7WUFFL0MsTUFBTSxDQUFDO2dCQUNOLFlBQVk7Z0JBQ1osU0FBUyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO29CQUN6Qix3Q0FBd0M7b0JBQ3hDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxxQkFBcUIsQ0FDN0MsWUFBWSxFQUNaLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTt3QkFDcEIsSUFBSSxZQUFZLEtBQUssUUFBUTs0QkFBRSxPQUFRLEtBQTZCLENBQUMsSUFBSSxDQUFBOzZCQUNwRSxJQUFJLFlBQVksS0FBSyxNQUFNOzRCQUFFLE9BQVEsS0FBdUMsQ0FBQyxFQUFFLENBQUE7NkJBQy9FLElBQUksWUFBWSxLQUFLLFVBQVU7NEJBQUUsT0FBUSxLQUF1QyxDQUFDLEVBQUUsQ0FBQTs7NEJBQ25GLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLEVBQUUsWUFBWSxDQUFDLENBQUE7b0JBQ3ZFLENBQUMsQ0FBQyxFQUNGO3dCQUNDLHVCQUF1QixFQUFFLE9BQU8sQ0FBQyx1QkFBdUI7d0JBQ3hELFdBQVcsRUFBRSxPQUFPLENBQUMsU0FBUztxQkFDOUIsQ0FDRCxDQUFBO29CQUVELElBQUksT0FBTyxDQUFDLHVCQUF1Qjt3QkFDbEMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLG9CQUFvQixDQUM1QyxZQUFZLEVBQ1osNEJBQTRCLEVBQzVCLElBQUksQ0FDSixDQUFBO29CQUVGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFBO29CQUN4RCxRQUFRLEVBQUUsQ0FBQTtnQkFDWCxDQUFDO2dCQUNELE9BQU8sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRTtvQkFDdEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7b0JBQ3JELFFBQVEsRUFBRSxDQUFBO2dCQUNYLENBQUM7YUFDRCxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUE7UUF4SEEsTUFBTSxXQUFXLEdBQXFCLElBQUksR0FBRyxFQUFFLENBQUE7UUFFL0MsTUFBTSxnQ0FBZ0MsR0FBRyxHQUFHLEVBQUU7WUFDN0MsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7WUFDeEIsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7WUFDdkMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFBO1lBRW5CLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLGlCQUFpQjtnQkFBRSxPQUFNO1lBRXZFLEtBQUssTUFBTSxZQUFZLElBQUksd0JBQXdCLEVBQUUsQ0FBQztnQkFDckQsb0hBQW9IO2dCQUNwSCxJQUFJLENBQUMscUJBQXFCLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFBO2dCQUVyRCxnRkFBZ0Y7Z0JBQ2hGLElBQUksWUFBWSxHQUFHLEdBQUcsRUFBRSxDQUN2QixjQUFjLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBRyxDQUMvQixDQUFDLFdBQVcsRUFBRSxFQUFFLENBQ2YsbUJBQW1CLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUN4RSxDQUFBO2dCQUNGLElBQUksUUFBUSxHQUFHLFlBQVksRUFBRSxDQUFBLENBQUMsMkVBQTJFO2dCQUN6RyxXQUFXLENBQUMsR0FBRyxDQUNkLG1CQUFtQixDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRTtvQkFDekMsaUNBQWlDO29CQUNqQyxNQUFNLE9BQU8sR0FBRyxZQUFZLEVBQUUsQ0FBQTtvQkFDOUIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQzt3QkFDNUIsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBWSxDQUFBO3dCQUMxQyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFZLENBQUE7d0JBRXJDLDRGQUE0Rjt3QkFDNUYsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDOzRCQUM3RCx1Q0FBdUM7NEJBQ3ZDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLENBQUE7d0JBQ3RELENBQUM7NkJBQU0sQ0FBQzs0QkFDUCxtREFBbUQ7NEJBQ25ELCtEQUErRDs0QkFDL0QsbUdBQW1HOzRCQUNuRyw4Q0FBOEM7d0JBQy9DLENBQUM7d0JBQ0QsUUFBUSxHQUFHLE9BQU8sQ0FBQTtvQkFDbkIsQ0FBQztnQkFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQUVELDJHQUEyRztRQUMzRyxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQzlDLGdDQUFnQyxFQUFFLENBQUE7WUFDbEMsSUFBSSxDQUFDLFNBQVMsQ0FDYixtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO2dCQUM3QyxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssbUJBQW1CO29CQUM5RCxnQ0FBZ0MsRUFBRSxDQUFBO1lBQ3BDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFtRUQsaUJBQWlCO1FBQ2hCLEtBQUssTUFBTSxZQUFZLElBQUksd0JBQXdCLEVBQUUsQ0FBQztZQUNyRCxJQUFJLENBQUMscUJBQXFCLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDekMsQ0FBQztJQUNGLENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxZQUFxQztRQUMxRCwyQkFBMkI7UUFDM0IsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3hDLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ2hELElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZDLENBQUM7SUFDRixDQUFDO0lBRU8sYUFBYSxDQUFDLFlBQXFDLEVBQUUsU0FBZ0M7UUFDNUYsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO0lBQy9DLENBQUM7SUFFTyxnQkFBZ0IsQ0FDdkIsWUFBcUMsRUFDckMsS0FBZ0MsRUFDaEMsT0FBZ0M7UUFFaEMsSUFBSSxPQUFPLEVBQUUsU0FBUztZQUFFLE9BQU07UUFDOUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDMUMsQ0FBQztDQUNELENBQUE7QUFqS1ksbUJBQW1CO0lBTzdCLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSxrQkFBa0IsQ0FBQTtHQVJSLG1CQUFtQixDQWlLL0I7O0FBRUQsaUJBQWlCLENBQUMsb0JBQW9CLEVBQUUsbUJBQW1CLGtDQUEwQixDQUFBIn0=