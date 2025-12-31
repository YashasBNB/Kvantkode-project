/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MainContext, } from './extHost.protocol.js';
import { Disposable } from './extHostTypes.js';
export class ExtHostRelatedInformation {
    constructor(mainContext) {
        this._relatedInformationProviders = new Map();
        this._nextHandle = 0;
        this._proxy = mainContext.getProxy(MainContext.MainThreadAiRelatedInformation);
    }
    async $provideAiRelatedInformation(handle, query, token) {
        if (this._relatedInformationProviders.size === 0) {
            throw new Error('No related information providers registered');
        }
        const provider = this._relatedInformationProviders.get(handle);
        if (!provider) {
            throw new Error('related information provider not found');
        }
        const result = (await provider.provideRelatedInformation(query, token)) ?? [];
        return result;
    }
    getRelatedInformation(extension, query, types) {
        return this._proxy.$getAiRelatedInformation(query, types);
    }
    registerRelatedInformationProvider(extension, type, provider) {
        const handle = this._nextHandle;
        this._nextHandle++;
        this._relatedInformationProviders.set(handle, provider);
        this._proxy.$registerAiRelatedInformationProvider(handle, type);
        return new Disposable(() => {
            this._proxy.$unregisterAiRelatedInformationProvider(handle);
            this._relatedInformationProviders.delete(handle);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEFpUmVsYXRlZEluZm9ybWF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdEFpUmVsYXRlZEluZm9ybWF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFHTixXQUFXLEdBRVgsTUFBTSx1QkFBdUIsQ0FBQTtBQU85QixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFFOUMsTUFBTSxPQUFPLHlCQUF5QjtJQU1yQyxZQUFZLFdBQXlCO1FBTDdCLGlDQUE0QixHQUE0QyxJQUFJLEdBQUcsRUFBRSxDQUFBO1FBQ2pGLGdCQUFXLEdBQUcsQ0FBQyxDQUFBO1FBS3RCLElBQUksQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsOEJBQThCLENBQUMsQ0FBQTtJQUMvRSxDQUFDO0lBRUQsS0FBSyxDQUFDLDRCQUE0QixDQUNqQyxNQUFjLEVBQ2QsS0FBYSxFQUNiLEtBQXdCO1FBRXhCLElBQUksSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNsRCxNQUFNLElBQUksS0FBSyxDQUFDLDZDQUE2QyxDQUFDLENBQUE7UUFDL0QsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDOUQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFBO1FBQzFELENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxDQUFDLE1BQU0sUUFBUSxDQUFDLHlCQUF5QixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUM3RSxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFRCxxQkFBcUIsQ0FDcEIsU0FBZ0MsRUFDaEMsS0FBYSxFQUNiLEtBQStCO1FBRS9CLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDMUQsQ0FBQztJQUVELGtDQUFrQyxDQUNqQyxTQUFnQyxFQUNoQyxJQUE0QixFQUM1QixRQUFvQztRQUVwQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFBO1FBQy9CLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNsQixJQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN2RCxJQUFJLENBQUMsTUFBTSxDQUFDLHFDQUFxQyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvRCxPQUFPLElBQUksVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUMxQixJQUFJLENBQUMsTUFBTSxDQUFDLHVDQUF1QyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzNELElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDakQsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0QifQ==