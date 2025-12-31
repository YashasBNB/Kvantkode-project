/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MainContext, } from './extHost.protocol.js';
import { Disposable } from './extHostTypes.js';
export class ExtHostAiEmbeddingVector {
    constructor(mainContext) {
        this._AiEmbeddingVectorProviders = new Map();
        this._nextHandle = 0;
        this._proxy = mainContext.getProxy(MainContext.MainThreadAiEmbeddingVector);
    }
    async $provideAiEmbeddingVector(handle, strings, token) {
        if (this._AiEmbeddingVectorProviders.size === 0) {
            throw new Error('No embedding vector providers registered');
        }
        const provider = this._AiEmbeddingVectorProviders.get(handle);
        if (!provider) {
            throw new Error('Embedding vector provider not found');
        }
        const result = await provider.provideEmbeddingVector(strings, token);
        if (!result) {
            throw new Error('Embedding vector provider returned undefined');
        }
        return result;
    }
    registerEmbeddingVectorProvider(extension, model, provider) {
        const handle = this._nextHandle;
        this._nextHandle++;
        this._AiEmbeddingVectorProviders.set(handle, provider);
        this._proxy.$registerAiEmbeddingVectorProvider(model, handle);
        return new Disposable(() => {
            this._proxy.$unregisterAiEmbeddingVectorProvider(handle);
            this._AiEmbeddingVectorProviders.delete(handle);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEVtYmVkZGluZ1ZlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RFbWJlZGRpbmdWZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUdOLFdBQVcsR0FFWCxNQUFNLHVCQUF1QixDQUFBO0FBRTlCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUU5QyxNQUFNLE9BQU8sd0JBQXdCO0lBTXBDLFlBQVksV0FBeUI7UUFMN0IsZ0NBQTJCLEdBQXlDLElBQUksR0FBRyxFQUFFLENBQUE7UUFDN0UsZ0JBQVcsR0FBRyxDQUFDLENBQUE7UUFLdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO0lBQzVFLENBQUM7SUFFRCxLQUFLLENBQUMseUJBQXlCLENBQzlCLE1BQWMsRUFDZCxPQUFpQixFQUNqQixLQUF3QjtRQUV4QixJQUFJLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDakQsTUFBTSxJQUFJLEtBQUssQ0FBQywwQ0FBMEMsQ0FBQyxDQUFBO1FBQzVELENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzdELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMscUNBQXFDLENBQUMsQ0FBQTtRQUN2RCxDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsc0JBQXNCLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3BFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE1BQU0sSUFBSSxLQUFLLENBQUMsOENBQThDLENBQUMsQ0FBQTtRQUNoRSxDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRUQsK0JBQStCLENBQzlCLFNBQWdDLEVBQ2hDLEtBQWEsRUFDYixRQUFpQztRQUVqQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFBO1FBQy9CLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNsQixJQUFJLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN0RCxJQUFJLENBQUMsTUFBTSxDQUFDLGtDQUFrQyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM3RCxPQUFPLElBQUksVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUMxQixJQUFJLENBQUMsTUFBTSxDQUFDLG9DQUFvQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3hELElBQUksQ0FBQywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDaEQsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0QifQ==