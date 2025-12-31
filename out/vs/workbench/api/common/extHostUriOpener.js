/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toDisposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
import { MainContext, } from './extHost.protocol.js';
export class ExtHostUriOpeners {
    static { this.supportedSchemes = new Set([Schemas.http, Schemas.https]); }
    constructor(mainContext) {
        this._openers = new Map();
        this._proxy = mainContext.getProxy(MainContext.MainThreadUriOpeners);
    }
    registerExternalUriOpener(extensionId, id, opener, metadata) {
        if (this._openers.has(id)) {
            throw new Error(`Opener with id '${id}' already registered`);
        }
        const invalidScheme = metadata.schemes.find((scheme) => !ExtHostUriOpeners.supportedSchemes.has(scheme));
        if (invalidScheme) {
            throw new Error(`Scheme '${invalidScheme}' is not supported. Only http and https are currently supported.`);
        }
        this._openers.set(id, opener);
        this._proxy.$registerUriOpener(id, metadata.schemes, extensionId, metadata.label);
        return toDisposable(() => {
            this._openers.delete(id);
            this._proxy.$unregisterUriOpener(id);
        });
    }
    async $canOpenUri(id, uriComponents, token) {
        const opener = this._openers.get(id);
        if (!opener) {
            throw new Error(`Unknown opener with id: ${id}`);
        }
        const uri = URI.revive(uriComponents);
        return opener.canOpenExternalUri(uri, token);
    }
    async $openUri(id, context, token) {
        const opener = this._openers.get(id);
        if (!opener) {
            throw new Error(`Unknown opener id: '${id}'`);
        }
        return opener.openExternalUri(URI.revive(context.resolvedUri), {
            sourceUri: URI.revive(context.sourceUri),
        }, token);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFVyaU9wZW5lci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RVcmlPcGVuZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBSWhFLE9BQU8sRUFHTixXQUFXLEdBRVgsTUFBTSx1QkFBdUIsQ0FBQTtBQUU5QixNQUFNLE9BQU8saUJBQWlCO2FBQ0wscUJBQWdCLEdBQUcsSUFBSSxHQUFHLENBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxBQUFqRCxDQUFpRDtJQU16RixZQUFZLFdBQXlCO1FBRnBCLGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBb0MsQ0FBQTtRQUd0RSxJQUFJLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUE7SUFDckUsQ0FBQztJQUVELHlCQUF5QixDQUN4QixXQUFnQyxFQUNoQyxFQUFVLEVBQ1YsTUFBZ0MsRUFDaEMsUUFBMEM7UUFFMUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLEVBQUUsc0JBQXNCLENBQUMsQ0FBQTtRQUM3RCxDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQzFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FDM0QsQ0FBQTtRQUNELElBQUksYUFBYSxFQUFFLENBQUM7WUFDbkIsTUFBTSxJQUFJLEtBQUssQ0FDZCxXQUFXLGFBQWEsa0VBQWtFLENBQzFGLENBQUE7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzdCLElBQUksQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUVqRixPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDeEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNyQyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVyxDQUNoQixFQUFVLEVBQ1YsYUFBNEIsRUFDNUIsS0FBd0I7UUFFeEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDcEMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQywyQkFBMkIsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNqRCxDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNyQyxPQUFPLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDN0MsQ0FBQztJQUVELEtBQUssQ0FBQyxRQUFRLENBQ2IsRUFBVSxFQUNWLE9BQWlFLEVBQ2pFLEtBQXdCO1FBRXhCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3BDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDOUMsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFDLGVBQWUsQ0FDNUIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQy9CO1lBQ0MsU0FBUyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztTQUN4QyxFQUNELEtBQUssQ0FDTCxDQUFBO0lBQ0YsQ0FBQyJ9