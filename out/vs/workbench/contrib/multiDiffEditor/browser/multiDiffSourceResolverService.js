/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IMultiDiffSourceResolverService = createDecorator('multiDiffSourceResolverService');
export class MultiDiffEditorItem {
    constructor(originalUri, modifiedUri, goToFileUri, contextKeys) {
        this.originalUri = originalUri;
        this.modifiedUri = modifiedUri;
        this.goToFileUri = goToFileUri;
        this.contextKeys = contextKeys;
        if (!originalUri && !modifiedUri) {
            throw new BugIndicatingError('Invalid arguments');
        }
    }
    getKey() {
        return JSON.stringify([this.modifiedUri?.toString(), this.originalUri?.toString()]);
    }
}
export class MultiDiffSourceResolverService {
    constructor() {
        this._resolvers = new Set();
    }
    registerResolver(resolver) {
        // throw on duplicate
        if (this._resolvers.has(resolver)) {
            throw new BugIndicatingError('Duplicate resolver');
        }
        this._resolvers.add(resolver);
        return toDisposable(() => this._resolvers.delete(resolver));
    }
    resolve(uri) {
        for (const resolver of this._resolvers) {
            if (resolver.canHandleUri(uri)) {
                return resolver.resolveDiffSource(uri);
            }
        }
        return Promise.resolve(undefined);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlEaWZmU291cmNlUmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbXVsdGlEaWZmRWRpdG9yL2Jyb3dzZXIvbXVsdGlEaWZmU291cmNlUmVzb2x2ZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXRFLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUdoRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFNUYsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQUcsZUFBZSxDQUM3RCxnQ0FBZ0MsQ0FDaEMsQ0FBQTtBQXFCRCxNQUFNLE9BQU8sbUJBQW1CO0lBQy9CLFlBQ1UsV0FBNEIsRUFDNUIsV0FBNEIsRUFDNUIsV0FBNEIsRUFDNUIsV0FBNkM7UUFIN0MsZ0JBQVcsR0FBWCxXQUFXLENBQWlCO1FBQzVCLGdCQUFXLEdBQVgsV0FBVyxDQUFpQjtRQUM1QixnQkFBVyxHQUFYLFdBQVcsQ0FBaUI7UUFDNUIsZ0JBQVcsR0FBWCxXQUFXLENBQWtDO1FBRXRELElBQUksQ0FBQyxXQUFXLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNsQyxNQUFNLElBQUksa0JBQWtCLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtRQUNsRCxDQUFDO0lBQ0YsQ0FBQztJQUVELE1BQU07UUFDTCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFFBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3BGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyw4QkFBOEI7SUFBM0M7UUFHa0IsZUFBVSxHQUFHLElBQUksR0FBRyxFQUE0QixDQUFBO0lBbUJsRSxDQUFDO0lBakJBLGdCQUFnQixDQUFDLFFBQWtDO1FBQ2xELHFCQUFxQjtRQUNyQixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDbkMsTUFBTSxJQUFJLGtCQUFrQixDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDbkQsQ0FBQztRQUNELElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzdCLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7SUFDNUQsQ0FBQztJQUVELE9BQU8sQ0FBQyxHQUFRO1FBQ2YsS0FBSyxNQUFNLFFBQVEsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDeEMsSUFBSSxRQUFRLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hDLE9BQU8sUUFBUSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3ZDLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7Q0FDRCJ9