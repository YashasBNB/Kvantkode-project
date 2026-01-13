/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
/**
 * Trust Context Keys
 */
export const WorkspaceTrustContext = {
    IsEnabled: new RawContextKey('isWorkspaceTrustEnabled', false, localize('workspaceTrustEnabledCtx', 'Whether the workspace trust feature is enabled.')),
    IsTrusted: new RawContextKey('isWorkspaceTrusted', false, localize('workspaceTrustedCtx', 'Whether the current workspace has been trusted by the user.')),
};
export const MANAGE_TRUST_COMMAND_ID = 'workbench.trust.manage';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93b3Jrc3BhY2UvY29tbW9uL3dvcmtzcGFjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXBGOztHQUVHO0FBRUgsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUc7SUFDcEMsU0FBUyxFQUFFLElBQUksYUFBYSxDQUMzQix5QkFBeUIsRUFDekIsS0FBSyxFQUNMLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxpREFBaUQsQ0FBQyxDQUN2RjtJQUNELFNBQVMsRUFBRSxJQUFJLGFBQWEsQ0FDM0Isb0JBQW9CLEVBQ3BCLEtBQUssRUFDTCxRQUFRLENBQUMscUJBQXFCLEVBQUUsNkRBQTZELENBQUMsQ0FDOUY7Q0FDRCxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsd0JBQXdCLENBQUEifQ==