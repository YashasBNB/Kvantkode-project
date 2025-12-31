/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError } from '../common/errors.js';
export function createTrustedTypesPolicy(policyName, policyOptions) {
    const monacoEnvironment = globalThis.MonacoEnvironment;
    if (monacoEnvironment?.createTrustedTypesPolicy) {
        try {
            return monacoEnvironment.createTrustedTypesPolicy(policyName, policyOptions);
        }
        catch (err) {
            onUnexpectedError(err);
            return undefined;
        }
    }
    try {
        return globalThis.trustedTypes?.createPolicy(policyName, policyOptions);
    }
    catch (err) {
        onUnexpectedError(err);
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJ1c3RlZFR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3RydXN0ZWRUeXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUV2RCxNQUFNLFVBQVUsd0JBQXdCLENBQ3ZDLFVBQWtCLEVBQ2xCLGFBQXVCO0lBa0J2QixNQUFNLGlCQUFpQixHQUFvQyxVQUFrQixDQUFDLGlCQUFpQixDQUFBO0lBRS9GLElBQUksaUJBQWlCLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQztRQUNqRCxJQUFJLENBQUM7WUFDSixPQUFPLGlCQUFpQixDQUFDLHdCQUF3QixDQUFDLFVBQVUsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUM3RSxDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3RCLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7SUFDRixDQUFDO0lBQ0QsSUFBSSxDQUFDO1FBQ0osT0FBUSxVQUFrQixDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsVUFBVSxFQUFFLGFBQWEsQ0FBQyxDQUFBO0lBQ2pGLENBQUM7SUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2QsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDdEIsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztBQUNGLENBQUMifQ==