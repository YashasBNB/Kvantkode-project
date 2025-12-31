/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import { MainContext, } from './extHost.protocol.js';
export class ExtHostEmbeddings {
    constructor(mainContext) {
        this._provider = new Map();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._allKnownModels = new Set();
        this._handlePool = 0;
        this._proxy = mainContext.getProxy(MainContext.MainThreadEmbeddings);
    }
    registerEmbeddingsProvider(_extension, embeddingsModel, provider) {
        if (this._allKnownModels.has(embeddingsModel)) {
            throw new Error('An embeddings provider for this model is already registered');
        }
        const handle = this._handlePool++;
        this._proxy.$registerEmbeddingProvider(handle, embeddingsModel);
        this._provider.set(handle, { id: embeddingsModel, provider });
        return toDisposable(() => {
            this._allKnownModels.delete(embeddingsModel);
            this._proxy.$unregisterEmbeddingProvider(handle);
            this._provider.delete(handle);
        });
    }
    async computeEmbeddings(embeddingsModel, input, token) {
        token ??= CancellationToken.None;
        let returnSingle = false;
        if (typeof input === 'string') {
            input = [input];
            returnSingle = true;
        }
        const result = await this._proxy.$computeEmbeddings(embeddingsModel, input, token);
        if (result.length !== input.length) {
            throw new Error();
        }
        if (returnSingle) {
            if (result.length !== 1) {
                throw new Error();
            }
            return result[0];
        }
        return result;
    }
    async $provideEmbeddings(handle, input, token) {
        const data = this._provider.get(handle);
        if (!data) {
            return [];
        }
        const result = await data.provider.provideEmbeddings(input, token);
        if (!result) {
            return [];
        }
        return result;
    }
    get embeddingsModels() {
        return Array.from(this._allKnownModels);
    }
    $acceptEmbeddingModels(models) {
        this._allKnownModels = new Set(models);
        this._onDidChange.fire();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEVtYmVkZGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RFbWJlZGRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU3RSxPQUFPLEVBR04sV0FBVyxHQUVYLE1BQU0sdUJBQXVCLENBQUE7QUFHOUIsTUFBTSxPQUFPLGlCQUFpQjtJQWE3QixZQUFZLFdBQXlCO1FBWHBCLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFHakMsQ0FBQTtRQUVjLGlCQUFZLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQTtRQUMxQyxnQkFBVyxHQUFnQixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtRQUVuRCxvQkFBZSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUE7UUFDbkMsZ0JBQVcsR0FBVyxDQUFDLENBQUE7UUFHOUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO0lBQ3JFLENBQUM7SUFFRCwwQkFBMEIsQ0FDekIsVUFBaUMsRUFDakMsZUFBdUIsRUFDdkIsUUFBbUM7UUFFbkMsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO1lBQy9DLE1BQU0sSUFBSSxLQUFLLENBQUMsNkRBQTZELENBQUMsQ0FBQTtRQUMvRSxDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBRWpDLElBQUks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