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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlSZWxhdGVkSW5mb3JtYXRpb25TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvYWlSZWxhdGVkSW5mb3JtYXRpb24vY29tbW9uL2FpUmVsYXRlZEluZm9ybWF0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUVOLHVCQUF1QixFQUN2QixXQUFXLEdBQ1gsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV6QyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sNEJBQTRCLEdBSTVCLE1BQU0sMkJBQTJCLENBQUE7QUFFM0IsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBMkI7O2FBR3ZCLG9CQUFlLEdBQUcsSUFBSSxHQUFHLEVBQUUsQUFBWixDQUFZLEdBQUMsYUFBYTtJQUt6RCxZQUF5QixVQUF3QztRQUF2QixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBSGhELGVBQVUsR0FDMUIsSUFBSSxHQUFHLEVBQUUsQ0FBQTtJQUUwRCxDQUFDO0lBRXJFLFNBQVM7UUFDUixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsb0NBQW9DLENBQ25DLElBQTRCLEVBQzVCLFFBQXVDO1FBRXZDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNqRCxTQUFTLENBQUMsSUFBSSxD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