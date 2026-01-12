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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlFbWJlZGRpbmdWZWN0b3JTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvYWlFbWJlZGRpbmdWZWN0b3IvY29tbW9uL2FpRW1iZWRkaW5nVmVjdG9yU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRTVGLE9BQU8sRUFFTix1QkFBdUIsRUFDdkIsdUJBQXVCLEVBQ3ZCLE9BQU8sR0FDUCxNQUFNLGtDQUFrQyxDQUFBO0FBRXpDLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXBFLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLGVBQWUsQ0FDdkQsMkJBQTJCLENBQzNCLENBQUE7QUFrQk0sSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBd0I7O2FBR3BCLG9CQUFlLEdBQUcsSUFBSSxHQUFHLEVBQUUsQUFBWixDQUFZLEdBQUMsYUFBYTtJQUl6RCxZQUF5QixVQUF3QztRQUF2QixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBRmhELGVBQVUsR0FBaUMsRUFBRSxDQUFBO0lBRU0sQ0FBQztJQUVyRSxTQUFTO1FBQ1IsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVELGlDQUFpQyxDQUNoQyxLQUFhLEVBQ2IsUUFBb0M7UUFFcEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDOUIsT0FBTztZQUNO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