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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFByb2ZpbGVDb250ZW50SGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFByb2ZpbGVDb250ZW50SGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFFaEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFHeEYsT0FBTyxFQUdOLFdBQVcsR0FFWCxNQUFNLHVCQUF1QixDQUFBO0FBRTlCLE1BQU0sT0FBTyw2QkFBNkI7SUFLekMsWUFBWSxXQUF5QjtRQUZwQixhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQXdDLENBQUE7UUFHMUUsSUFBSSxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFBO0lBQ2hGLENBQUM7SUFFRCw2QkFBNkIsQ0FDNUIsU0FBZ0MsRUFDaEMsRUFBVSxFQUNWLE9BQXFDO1FBRXJDLHVCQUF1QixDQUFDLFNBQVMsRUFBRSx3QkFBd0IsQ0FBQyxDQUFBO1FBQzVELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixFQUFFLHNCQUFzQixDQUFDLENBQUE7UUFDOUQsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUM5QixJQUFJLENBQUMsS0FBSyxDQUFDLDhCQUE4QixDQUN4QyxFQUFFLEVBQ0YsT0FBTyxDQUFDLElBQUksRUFDWixPQUFPLENBQUMsV0FBVyxFQUNuQixTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FDMUIsQ0FBQTtRQUVELE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUN4QixJQUFJLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2hELENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQ2pCLEVBQVUsRUFDVixJQUFZLEVBQ1osT0FBZSxFQUNmLEtBQXdCO1FBRXhCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3JDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsNEJBQTRCLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbEQsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ2pELENBQUM7SUFFRCxLQUFLLENBQUMsWUFBWSxDQUNqQixFQUFVLEVBQ1YsT0FBK0IsRUFDL0IsS0FBd0I7UUFFeEIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDckMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsTUFBTSxJQUFJLEtBQUssQ0FBQyw0QkFBNEIsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNsRCxDQUFDO1FBRUQsT0FBTyxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3JGLENBQUM7Q0FDRCJ9