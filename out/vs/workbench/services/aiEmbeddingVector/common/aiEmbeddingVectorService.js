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
var AiEmbeddingVectorService_1;
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { createCancelablePromise, raceCancellablePromises, timeout, } from '../../../../base/common/async.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { ILogService } from '../../../../platform/log/common/log.js';
export const IAiEmbeddingVectorService = createDecorator('IAiEmbeddingVectorService');
let AiEmbeddingVectorService = class AiEmbeddingVectorService {
    static { AiEmbeddingVectorService_1 = this; }
    static { this.DEFAULT_TIMEOUT = 1000 * 10; } // 10 seconds
    constructor(logService) {
        this.logService = logService;
        this._providers = [];
    }
    isEnabled() {
        return this._providers.length > 0;
    }
    registerAiEmbeddingVectorProvider(model, provider) {
        this._providers.push(provider);
        return {
            dispose: () => {
                const index = this._providers.indexOf(provider);
                if (index >= 0) {
                    this._providers.splice(index, 1);
                }
            },
        };
    }
    async getEmbeddingVector(strings, token) {
        if (this._providers.length === 0) {
            throw new Error('No embedding vector providers registered');
        }
        const stopwatch = StopWatch.create();
        const cancellablePromises = [];
        const timer = timeout(AiEmbeddingVectorService_1.DEFAULT_TIMEOUT);
        const disposable = token.onCancellationRequested(() => {
            disposable.dispose();
            timer.cancel();
        });
        for (const provider of this._providers) {
            cancellablePromises.push(createCancelablePromise(async (t) => {
                try {
                    return await provider.provideAiEmbeddingVector(Array.isArray(strings) ? strings : [strings], t);
                }
                catch (e) {
                    // logged in extension host
                }
                // Wait for the timer to finish to allow for another provider to resolve.
                // Alternatively, if something resolved, or we've timed out, this will throw
                // as expected.
                await timer;
                throw new Error('Embedding vector provider timed out');
            }));
        }
        cancellablePromises.push(createCancelablePromise(async (t) => {
            const disposable = t.onCancellationRequested(() => {
                timer.cancel();
                disposable.dispose();
            });
            await timer;
            throw new Error('Embedding vector provider timed out');
        }));
        try {
            const result = await raceCancellablePromises(cancellablePromises);
            // If we have a single result, return it directly, otherwise return an array.
            // This aligns with the API overloads.
            if (result.length === 1) {
                return result[0];
            }
            return result;
        }
        finally {
            stopwatch.stop();
            this.logService.trace(`[AiEmbeddingVectorService]: getEmbeddingVector took ${stopwatch.elapsed()}ms`);
        }
    }
};
AiEmbeddingVectorService = AiEmbeddingVectorService_1 = __decorate([
    __param(0, ILogService)
], AiEmbeddingVectorService);
export { AiEmbeddingVectorService };
registerSingleton(IAiEmbeddingVectorService, AiEmbeddingVectorService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlFbWJlZGRpbmdWZWN0b3JTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2FpRW1iZWRkaW5nVmVjdG9yL2NvbW1vbi9haUVtYmVkZGluZ1ZlY3RvclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUU1RixPQUFPLEVBRU4sdUJBQXVCLEVBQ3ZCLHVCQUF1QixFQUN2QixPQUFPLEdBQ1AsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV6QyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVwRSxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxlQUFlLENBQ3ZELDJCQUEyQixDQUMzQixDQUFBO0FBa0JNLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXdCOzthQUdwQixvQkFBZSxHQUFHLElBQUksR0FBRyxFQUFFLEFBQVosQ0FBWSxHQUFDLGFBQWE7SUFJekQsWUFBeUIsVUFBd0M7UUFBdkIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUZoRCxlQUFVLEdBQWlDLEVBQUUsQ0FBQTtJQUVNLENBQUM7SUFFckUsU0FBUztRQUNSLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxpQ0FBaUMsQ0FDaEMsS0FBYSxFQUNiLFFBQW9DO1FBRXBDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzlCLE9BQU87WUFDTixPQUFP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