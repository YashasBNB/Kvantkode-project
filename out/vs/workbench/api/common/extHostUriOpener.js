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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFVyaU9wZW5lci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFVyaU9wZW5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFJaEUsT0FBTyxFQUdOLFdBQVcsR0FFWCxNQUFNLHVCQUF1QixDQUFBO0FBRTlCLE1BQU0sT0FBTyxpQkFBaUI7YUFDTCxxQkFBZ0IsR0FBRyxJQUFJLEdBQUcsQ0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEFBQWpELENBQWlEO0lBTXpGLFlBQVksV0FBeUI7UUFGcEIsYUFBUSxHQUFHLElBQUksR0FBRyxFQUFvQyxDQUFBO1FBR3RFLElBQUksQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtJQUNyRSxDQUFDO0lBRUQseUJBQXlCLENBQ3hCLFdBQWdDLEVBQ2hDLEVBQVUsRUFDVixNQUFnQyxFQUNoQyxRQUEwQztRQUUxQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxzQkFBc0IsQ0FBQyxDQUFBO1FBQzdELENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FDMUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUMzRCxDQUFBO1FBQ0QsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNuQixNQUFNLElBQUksS0FBSyxDQUNkLFdBQVcsYUFBYSxrRUFBa0UsQ0FDMUYsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDN0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRWpGLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUN4QixJQUFJLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3JDLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQ2hCLEVBQVUsRUFDVixhQUE0QixFQUM1QixLQUF3QjtRQUV4QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNwQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixNQUFNLElBQUksS0FBSyxDQUFDLDJCQUEyQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2pELENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ3JDLE9BQU8sTUFBTSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsS0FBSyxDQUFDLFFBQVEsQ0FDYixFQUFVLEVBQ1YsT0FBaUUsRUFDakUsS0FBd0I7UUFFeEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDcEMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUM5QyxDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUM1QixHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFDL0I7WUFDQyxTQUFTLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO1NBQ3hDLEVBQ0QsS0FBSyxDQUNMLENBQUE7SUFDRixDQUFDIn0=