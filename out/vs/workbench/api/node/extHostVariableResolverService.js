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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFZhcmlhYmxlUmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL25vZGUvZXh0SG9zdFZhcmlhYmxlUmVzb2x2ZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDNUIsT0FBTyxFQUFFLHNDQUFzQyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFcEcsTUFBTSxPQUFPLDBDQUEyQyxTQUFRLHNDQUFzQztJQUNsRixPQUFPO1FBQ3pCLE9BQU8sT0FBTyxFQUFFLENBQUE7SUFDakIsQ0FBQztDQUNEIn0=