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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFNoYXJlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFNoYXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFJTixXQUFXLEdBRVgsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFHcEUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUVoRSxNQUFNLE9BQU8sWUFBWTthQUNULGVBQVUsR0FBVyxDQUFDLEFBQVosQ0FBWTtJQUtyQyxZQUNDLFdBQXlCLEVBQ1IsY0FBMkM7UUFBM0MsbUJBQWMsR0FBZCxjQUFjLENBQTZCO1FBSnJELGNBQVMsR0FBc0MsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQU0vRCxJQUFJLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQy9ELENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUNsQixNQUFjLEVBQ2QsYUFBZ0MsRUFDaEMsS0FBd0I7UUFFeEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDM0MsTUFBTSxNQUFNLEdBQUcsTUFBTSxRQUFRLEVBQUUsWUFBWSxDQUMxQztZQUNDLFNBQVMsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUM7WUFDNUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQztTQUNsRCxFQUNELEtBQUssQ0FDTCxDQUFBO1FBQ0QsT0FBTyxNQUFNLElBQUksU0FBUyxDQUFBO0lBQzNCLENBQUM7SUFFRCxxQkFBcUIsQ0FDcEIsUUFBaUMsRUFDakMsUUFBOEI7UUFFOUIsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ3hDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNwQyxJQUFJLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUNoQyxNQUFNLEVBQ04sZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQ3BELFFBQVEsQ0FBQyxFQUFFLEVBQ1gsUUFBUSxDQUFDLEtBQUssRUFDZCxRQUFRLENBQUMsUUFBUSxDQUNqQixDQUFBO1FBQ0QsT0FBTztZQUNOLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2IsSUFBSSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDM0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDOUIsQ0FBQztTQUNELENBQUE7SUFDRixDQUFDIn0=