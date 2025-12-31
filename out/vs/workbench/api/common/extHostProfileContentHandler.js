/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toDisposable } from '../../../base/common/lifecycle.js';
import { isString } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { MainContext, } from './extHost.protocol.js';
export class ExtHostProfileContentHandlers {
    constructor(mainContext) {
        this.handlers = new Map();
        this.proxy = mainContext.getProxy(MainContext.MainThreadProfileContentHandlers);
    }
    registerProfileContentHandler(extension, id, handler) {
        checkProposedApiEnabled(extension, 'profileContentHandlers');
        if (this.handlers.has(id)) {
            throw new Error(`Handler with id '${id}' already registered`);
        }
        this.handlers.set(id, handler);
        this.proxy.$registerProfileContentHandler(id, handler.name, handler.description, extension.identifier.value);
        return toDisposable(() => {
            this.handlers.delete(id);
            this.proxy.$unregisterProfileContentHandler(id);
        });
    }
    async $saveProfile(id, name, content, token) {
        const handler = this.handlers.get(id);
        if (!handler) {
            throw new Error(`Unknown handler with id: ${id}`);
        }
        return handler.saveProfile(name, content, token);
    }
    async $readProfile(id, idOrUri, token) {
        const handler = this.handlers.get(id);
        if (!handler) {
            throw new Error(`Unknown handler with id: ${id}`);
        }
        return handler.readProfile(isString(idOrUri) ? idOrUri : URI.revive(idOrUri), token);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFByb2ZpbGVDb250ZW50SGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RQcm9maWxlQ29udGVudEhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBRWhFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBR3hGLE9BQU8sRUFHTixXQUFXLEdBRVgsTUFBTSx1QkFBdUIsQ0FBQTtBQUU5QixNQUFNLE9BQU8sNkJBQTZCO0lBS3pDLFlBQVksV0FBeUI7UUFGcEIsYUFBUSxHQUFHLElBQUksR0FBRyxFQUF3QyxDQUFBO1FBRzFFLElBQUksQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsZ0NBQWdDLENBQUMsQ0FBQTtJQUNoRixDQUFDO0lBRUQsNkJBQTZCLENBQzVCLFNBQWdDLEVBQ2hDLEVBQVUsRUFDVixPQUFxQztRQUVyQyx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsd0JBQXdCLENBQUMsQ0FBQTtRQUM1RCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxzQkFBc0IsQ0FBQyxDQUFBO1FBQzlELENBQUM7UUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDOUIsSUFBSSxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsQ0FDeEMsRUFBRSxFQUNGLE9BQU8sQ0FBQyxJQUFJLEVBQ1osT0FBTyxDQUFDLFdBQVcsRUFDbkIsU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQzFCLENBQUE7UUFFRCxPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDeEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDeEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNoRCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsWUFBWSxDQUNqQixFQUFVLEVBQ1YsSUFBWSxFQUNaLE9BQWUsRUFDZixLQUF3QjtRQUV4QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNyQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxNQUFNLElBQUksS0FBSyxDQUFDLDRCQUE0QixFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2xELENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNqRCxDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FDakIsRUFBVSxFQUNWLE9BQStCLEVBQy9CLEtBQXdCO1FBRXhCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3JDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsNEJBQTRCLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbEQsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNyRixDQUFDO0NBQ0QifQ==