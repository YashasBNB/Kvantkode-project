/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import Severity from '../../../../../base/common/severity.js';
import { localize } from '../../../../../nls.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IAuthenticationAccessService } from '../../../../services/authentication/browser/authenticationAccessService.js';
import { IAuthenticationUsageService } from '../../../../services/authentication/browser/authenticationUsageService.js';
import { IAuthenticationService } from '../../../../services/authentication/common/authentication.js';
export class SignOutOfAccountAction extends Action2 {
    constructor() {
        super({
            id: '_signOutOfAccount',
            title: localize('signOutOfAccount', 'Sign out of account'),
            f1: false,
        });
    }
    async run(accessor, { providerId, accountLabel }) {
        const authenticationService = accessor.get(IAuthenticationService);
        const authenticationUsageService = accessor.get(IAuthenticationUsageService);
        const authenticationAccessService = accessor.get(IAuthenticationAccessService);
        const dialogService = accessor.get(IDialogService);
        if (!providerId || !accountLabel) {
            throw new Error('Invalid arguments. Expected: { providerId: string; accountLabel: string }');
        }
        const allSessions = await authenticationService.getSessions(providerId);
        const sessions = allSessions.filter((s) => s.account.label === accountLabel);
        const accountUsages = authenticationUsageService.readAccountUsages(providerId, accountLabel);
        const { confirmed } = await dialogService.confirm({
            type: Severity.Info,
            message: accountUsages.length
                ? localize('signOutMessage', "The account '{0}' has been used by: \n\n{1}\n\n Sign out from these extensions?", accountLabel, accountUsages.map((usage) => usage.extensionName).join('\n'))
                : localize('signOutMessageSimple', "Sign out of '{0}'?", accountLabel),
            primaryButton: localize({ key: 'signOut', comment: ['&& denotes a mnemonic'] }, '&&Sign Out'),
        });
        if (confirmed) {
            const removeSessionPromises = sessions.map((session) => authenticationService.removeSession(providerId, session.id));
            await Promise.all(removeSessionPromises);
            authenticationUsageService.removeAccountUsage(providerId, accountLabel);
            authenticationAccessService.removeAllowedExtensions(providerId, accountLabel);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lnbk91dE9mQWNjb3VudEFjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2F1dGhlbnRpY2F0aW9uL2Jyb3dzZXIvYWN0aW9ucy9zaWduT3V0T2ZBY2NvdW50QWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sUUFBUSxNQUFNLHdDQUF3QyxDQUFBO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWxGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDRFQUE0RSxDQUFBO0FBQ3pILE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDJFQUEyRSxDQUFBO0FBQ3ZILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBRXJHLE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxPQUFPO0lBQ2xEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLG1CQUFtQjtZQUN2QixLQUFLLEVBQUUsUUFBUSxDQUFDLGtCQUFrQixFQUFFLHFCQUFxQixDQUFDO1lBQzFELEVBQUUsRUFBRSxLQUFLO1NBQ1QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVRLEtBQUssQ0FBQyxHQUFHLENBQ2pCLFFBQTBCLEVBQzFCLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBZ0Q7UUFFMUUsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFDbEUsTUFBTSwwQkFBMEIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUE7UUFDNUUsTUFBTSwyQkFBMkIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDRCQUE0QixDQUFDLENBQUE7UUFDOUUsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUVsRCxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbEMsTUFBTSxJQUFJLEtBQUssQ0FBQywyRUFBMkUsQ0FBQyxDQUFBO1FBQzdGLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxNQUFNLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUN2RSxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssS0FBSyxZQUFZLENBQUMsQ0FBQTtRQUU1RSxNQUFNLGFBQWEsR0FBRywwQkFBMEIsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFFNUYsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLE1BQU0sYUFBYSxDQUFDLE9BQU8sQ0FBQztZQUNqRCxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7WUFDbkIsT0FBTyxFQUFFLGFBQWEsQ0FBQyxNQUFNO2dCQUM1QixDQUFDLENBQUMsUUFBUSxDQUNSLGdCQUFnQixFQUNoQixpRkFBaUYsRUFDakYsWUFBWSxFQUNaLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQzVEO2dCQUNGLENBQUMsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsb0JBQW9CLEVBQUUsWUFBWSxDQUFDO1lBQ3ZFLGFBQWEsRUFBRSxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUM7U0FDN0YsQ0FBQyxDQUFBO1FBRUYsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQ3RELHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUMzRCxDQUFBO1lBQ0QsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7WUFDeEMsMEJBQTBCLENBQUMsa0JBQWtCLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFBO1lBQ3ZFLDJCQUEyQixDQUFDLHVCQUF1QixDQUFDLFVBQVUsRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUM5RSxDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=