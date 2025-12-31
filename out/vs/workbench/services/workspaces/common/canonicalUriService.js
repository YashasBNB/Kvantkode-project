/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ICanonicalUriService, } from '../../../../platform/workspace/common/canonicalUri.js';
export class CanonicalUriService {
    constructor() {
        this._providers = new Map();
    }
    registerCanonicalUriProvider(provider) {
        this._providers.set(provider.scheme, provider);
        return {
            dispose: () => this._providers.delete(provider.scheme),
        };
    }
    async provideCanonicalUri(uri, targetScheme, token) {
        const provider = this._providers.get(uri.scheme);
        if (provider) {
            return provider.provideCanonicalUri(uri, targetScheme, token);
        }
        return undefined;
    }
}
registerSingleton(ICanonicalUriService, CanonicalUriService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2Fub25pY2FsVXJpU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3Jrc3BhY2VzL2NvbW1vbi9jYW5vbmljYWxVcmlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sdURBQXVELENBQUE7QUFFOUQsTUFBTSxPQUFPLG1CQUFtQjtJQUFoQztRQUdrQixlQUFVLEdBQUcsSUFBSSxHQUFHLEVBQWlDLENBQUE7SUFvQnZFLENBQUM7SUFsQkEsNEJBQTRCLENBQUMsUUFBK0I7UUFDM0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUM5QyxPQUFPO1lBQ04sT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7U0FDdEQsQ0FBQTtJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsbUJBQW1CLENBQ3hCLEdBQVEsRUFDUixZQUFvQixFQUNwQixLQUF3QjtRQUV4QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDaEQsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLE9BQU8sUUFBUSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDOUQsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7Q0FDRDtBQUVELGlCQUFpQixDQUFDLG9CQUFvQixFQUFFLG1CQUFtQixvQ0FBNEIsQ0FBQSJ9