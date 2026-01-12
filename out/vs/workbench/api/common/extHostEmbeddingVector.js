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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEVtYmVkZGluZ1ZlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdEVtYmVkZGluZ1ZlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBR04sV0FBVyxHQUVYLE1BQU0sdUJBQXVCLENBQUE7QUFFOUIsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBRTlDLE1BQU0sT0FBTyx3QkFBd0I7SUFNcEMsWUFBWSxXQUF5QjtRQUw3QixnQ0FBMkIsR0FBeUMsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUM3RSxnQkFBVyxHQUFHLENBQUMsQ0FBQTtRQUt0QixJQUFJLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLDJCQUEyQixDQUFDLENBQUE7SUFDNUUsQ0FBQztJQUVELEtBQUssQ0FBQyx5QkFBeUIsQ0FDOUIsTUFBYyxFQUNkLE9BQWlCLEVBQ2pCLEtBQXdCO1FBRXhCLElBQUksSUFBSSxDQUFDLDJCQUEyQixDQUFDLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqRCxNQUFNLElBQUksS0FBSyxDQUFDLDBDQUEwQyxDQUFDLENBQUE7UUFDNUQsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDN0QsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFBO1FBQ3ZELENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDcEUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFBO1FBQ2hFLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFRCwrQkFBK0IsQ0FDOUIsU0FBZ0MsRUFDaEMsS0FBYSxFQUNiLFFBQWlDO1FBRWpDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUE7UUFDL0IsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ2xCLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3RELElBQUksQ0FBQyxNQUFNLENBQUMsa0NBQWtDLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzdELE9BQU8sSUFBSSxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQzFCLElBQUksQ0FBQyxNQUFNLENBQUMsb0NBQW9DLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDeEQsSUFBSSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNoRCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCJ9