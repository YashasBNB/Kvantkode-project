/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MainContext, } from './extHost.protocol.js';
import { DocumentSelector, Range } from './extHostTypeConverters.js';
import { URI } from '../../../base/common/uri.js';
export class ExtHostShare {
    static { this.handlePool = 0; }
    constructor(mainContext, uriTransformer) {
        this.uriTransformer = uriTransformer;
        this.providers = new Map();
        this.proxy = mainContext.getProxy(MainContext.MainThreadShare);
    }
    async $provideShare(handle, shareableItem, token) {
        const provider = this.providers.get(handle);
        const result = await provider?.provideShare({
            selection: Range.to(shareableItem.selection),
            resourceUri: URI.revive(shareableItem.resourceUri),
        }, token);
        return result ?? undefined;
    }
    registerShareProvider(selector, provider) {
        const handle = ExtHostShare.handlePool++;
        this.providers.set(handle, provider);
        this.proxy.$registerShareProvider(handle, DocumentSelector.from(selector, this.uriTransformer), provider.id, provider.label, provider.priority);
        return {
            dispose: () => {
                this.proxy.$unregisterShareProvider(handle);
                this.providers.delete(handle);
            },
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFNoYXJlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0U2hhcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUlOLFdBQVcsR0FFWCxNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUdwRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBRWhFLE1BQU0sT0FBTyxZQUFZO2FBQ1QsZUFBVSxHQUFXLENBQUMsQUFBWixDQUFZO0lBS3JDLFlBQ0MsV0FBeUIsRUFDUixjQUEyQztRQUEzQyxtQkFBYyxHQUFkLGNBQWMsQ0FBNkI7UUFKckQsY0FBUyxHQUFzQyxJQUFJLEdBQUcsRUFBRSxDQUFBO1FBTS9ELElBQUksQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDL0QsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQ2xCLE1BQWMsRUFDZCxhQUFnQyxFQUNoQyxLQUF3QjtRQUV4QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMzQyxNQUFNLE1BQU0sR0FBRyxNQUFNLFFBQVEsRUFBRSxZQUFZLENBQzFDO1lBQ0MsU0FBUyxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQztZQUM1QyxXQUFXLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDO1NBQ2xELEVBQ0QsS0FBSyxDQUNMLENBQUE7UUFDRCxPQUFPLE1BQU0sSUFBSSxTQUFTLENBQUE7SUFDM0IsQ0FBQztJQUVELHFCQUFxQixDQUNwQixRQUFpQyxFQUNqQyxRQUE4QjtRQUU5QixNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDeEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3BDLElBQUksQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQ2hDLE1BQU0sRUFDTixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsRUFDcEQsUUFBUSxDQUFDLEVBQUUsRUFDWCxRQUFRLENBQUMsS0FBSyxFQUNkLFFBQVEsQ0FBQyxRQUFRLENBQ2pCLENBQUE7UUFDRCxPQUFPO1lBQ04sT0FBTyxFQUFFLEdBQUcsRUFBRTtnQkFDYixJQUFJLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUMzQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUM5QixDQUFDO1NBQ0QsQ0FBQTtJQUNGLENBQUMifQ==