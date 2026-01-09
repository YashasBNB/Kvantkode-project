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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2Fub25pY2FsVXJpU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtzcGFjZXMvY29tbW9uL2Nhbm9uaWNhbFVyaVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSx1REFBdUQsQ0FBQTtBQUU5RCxNQUFNLE9BQU8sbUJBQW1CO0lBQWhDO1FBR2tCLGVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBaUMsQ0FBQTtJQW9CdkUsQ0FBQztJQWxCQSw0QkFBNEIsQ0FBQyxRQUErQjtRQUMzRCxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzlDLE9BQU87WUFDTixPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztTQUN0RCxDQUFBO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxtQkFBbUIsQ0FDeEIsR0FBUSxFQUNSLFlBQW9CLEVBQ3BCLEtBQXdCO1FBRXhCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNoRCxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsT0FBTyxRQUFRLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM5RCxDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztDQUNEO0FBRUQsaUJBQWlCLENBQUMsb0JBQW9CLEVBQUUsbUJBQW1CLG9DQUE0QixDQUFBIn0=