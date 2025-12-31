/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { homedir } from 'os';
import { ExtHostVariableResolverProviderService } from '../common/extHostVariableResolverService.js';
export class NodeExtHostVariableResolverProviderService extends ExtHostVariableResolverProviderService {
    homeDir() {
        return homedir();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFZhcmlhYmxlUmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9ub2RlL2V4dEhvc3RWYXJpYWJsZVJlc29sdmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQzVCLE9BQU8sRUFBRSxzQ0FBc0MsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRXBHLE1BQU0sT0FBTywwQ0FBMkMsU0FBUSxzQ0FBc0M7SUFDbEYsT0FBTztRQUN6QixPQUFPLE9BQU8sRUFBRSxDQUFBO0lBQ2pCLENBQUM7Q0FDRCJ9