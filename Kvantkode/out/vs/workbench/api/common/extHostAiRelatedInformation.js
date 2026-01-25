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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEFpUmVsYXRlZEluZm9ybWF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0QWlSZWxhdGVkSW5mb3JtYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUdOLFdBQVcsR0FFWCxNQUFNLHVCQUF1QixDQUFBO0FBTzlCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUU5QyxNQUFNLE9BQU8seUJBQXlCO0lBTXJDLFlBQVksV0FBeUI7UUFMN0IsaUNBQTRCLEdBQTRDLElBQUksR0FBRyxFQUFFLENBQUE7UUFDakYsZ0JBQVcsR0FBRyxDQUFDLENBQUE7UUFLdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBO0lBQy9FLENBQUM7SUFFRCxLQUFLLENBQUMsNEJBQTRCLENBQ2pDLE1BQWMsRUFDZCxLQUFhLEVBQ2IsS0FBd0I7UUFFeEIsSUFBSSxJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2xELE1BQU0sSUFBSSxLQUFLLENBQUMsNkNBQTZDLENBQUMsQ0FBQTtRQUMvRCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM5RCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixNQUFNLElBQUksS0FBSyxDQUFDLHdDQUF3QyxDQUFDLENBQUE7UUFDMUQsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLENBQUMsTUFBTSxRQUFRLENBQUMseUJBQXlCLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQzdFLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVELHFCQUFxQixDQUNwQixTQUFnQyxFQUNoQyxLQUFhLEVBQ2IsS0FBK0I7UUFFL0IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLHdCQUF3QixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0lBRUQsa0NBQWtDLENBQ2pDLFNBQWdDLEVBQ2hDLElBQTRCLEVBQzVCLFFBQW9DO1FBRXBDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUE7UUFDL0IsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ2xCLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3ZELElBQUksQ0FBQyxNQUFNLENBQUMscUNBQXFDLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQy9ELE9BQU8sSUFBSSxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQzFCLElBQUksQ0FBQyxNQUFNLENBQUMsdUNBQXVDLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDM0QsSUFBSSxDQUFDLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNqRCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCJ9