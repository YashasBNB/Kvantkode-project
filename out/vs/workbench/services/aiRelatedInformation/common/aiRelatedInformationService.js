/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AiRelatedInformationService_1;
import { createCancelablePromise, raceTimeout, } from '../../../../base/common/async.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IAiRelatedInformationService, } from './aiRelatedInformation.js';
let AiRelatedInformationService = class AiRelatedInformationService {
    static { AiRelatedInformationService_1 = this; }
    static { this.DEFAULT_TIMEOUT = 1000 * 10; } // 10 seconds
    constructor(logService) {
        this.logService = logService;
        this._providers = new Map();
    }
    isEnabled() {
        return this._providers.size > 0;
    }
    registerAiRelatedInformationProvider(type, provider) {
        const providers = this._providers.get(type) ?? [];
        providers.push(provider);
        this._providers.set(type, providers);
        return {
            dispose: () => {
                const providers = this._providers.get(type) ?? [];
                const index = providers.indexOf(provider);
                if (index !== -1) {
                    providers.splice(index, 1);
                }
                if (providers.length === 0) {
                    this._providers.delete(type);
                }
            },
        };
    }
    async getRelatedInformation(query, types, token) {
        if (this._providers.size === 0) {
            throw new Error('No related information providers registered');
        }
        // get providers for each type
        const providers = [];
        for (const type of types) {
            const typeProviders = this._providers.get(type);
            if (typeProviders) {
                providers.push(...typeProviders);
            }
        }
        if (providers.length === 0) {
            throw new Error('No related information providers registered for the given types');
        }
        const stopwatch = StopWatch.create();
        const cancellablePromises = providers.map((provider) => {
            return createCancelablePromise(async (t) => {
                try {
                    const result = await provider.provideAiRelatedInformation(query, t);
                    // double filter just in case
                    return result.filter((r) => types.includes(r.type));
                }
                catch (e) {
                    // logged in extension host
                }
                return [];
            });
        });
        try {
            const results = await raceTimeout(Promise.allSettled(cancellablePromises), AiRelatedInformationService_1.DEFAULT_TIMEOUT, () => {
                cancellablePromises.forEach((p) => p.cancel());
                this.logService.warn('[AiRelatedInformationService]: Related information provider timed out');
            });
            if (!results) {
                return [];
            }
            const result = results
                .filter((r) => r.status === 'fulfilled')
                .flatMap((r) => r.value);
            return result;
        }
        finally {
            stopwatch.stop();
            this.logService.trace(`[AiRelatedInformationService]: getRelatedInformation took ${stopwatch.elapsed()}ms`);
        }
    }
};
AiRelatedInformationService = AiRelatedInformationService_1 = __decorate([
    __param(0, ILogService)
], AiRelatedInformationService);
export { AiRelatedInformationService };
registerSingleton(IAiRelatedInformationService, AiRelatedInformationService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlSZWxhdGVkSW5mb3JtYXRpb25TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2FpUmVsYXRlZEluZm9ybWF0aW9uL2NvbW1vbi9haVJlbGF0ZWRJbmZvcm1hdGlvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFFTix1QkFBdUIsRUFDdkIsV0FBVyxHQUNYLE1BQU0sa0NBQWtDLENBQUE7QUFFekMsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUNOLDRCQUE0QixHQUk1QixNQUFNLDJCQUEyQixDQUFBO0FBRTNCLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTJCOzthQUd2QixvQkFBZSxHQUFHLElBQUksR0FBRyxFQUFFLEFBQVosQ0FBWSxHQUFDLGFBQWE7SUFLekQsWUFBeUIsVUFBd0M7UUFBdkIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUhoRCxlQUFVLEdBQzFCLElBQUksR0FBRyxFQUFFLENBQUE7SUFFMEQsQ0FBQztJQUVyRSxTQUFTO1FBQ1IsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUE7SUFDaEMsQ0FBQztJQUVELG9DQUFvQyxDQUNuQyxJQUE0QixFQUM1QixRQUF1QztRQUV2QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDakQsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN4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