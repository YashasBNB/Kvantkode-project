/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as nls from '../../../../nls.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IRemoteAgentService } from '../common/remoteAgentService.js';
import { IRemoteAuthorityResolverService, RemoteAuthorityResolverError, } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { AbstractRemoteAgentService } from '../common/abstractRemoteAgentService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ISignService } from '../../../../platform/sign/common/sign.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Severity } from '../../../../platform/notification/common/notification.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { IHostService } from '../../host/browser/host.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { IRemoteSocketFactoryService } from '../../../../platform/remote/common/remoteSocketFactoryService.js';
let RemoteAgentService = class RemoteAgentService extends AbstractRemoteAgentService {
    constructor(remoteSocketFactoryService, userDataProfileService, environmentService, productService, remoteAuthorityResolverService, signService, logService) {
        super(remoteSocketFactoryService, userDataProfileService, environmentService, productService, remoteAuthorityResolverService, signService, logService);
    }
};
RemoteAgentService = __decorate([
    __param(0, IRemoteSocketFactoryService),
    __param(1, IUserDataProfileService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IProductService),
    __param(4, IRemoteAuthorityResolverService),
    __param(5, ISignService),
    __param(6, ILogService)
], RemoteAgentService);
export { RemoteAgentService };
let RemoteConnectionFailureNotificationContribution = class RemoteConnectionFailureNotificationContribution {
    static { this.ID = 'workbench.contrib.browserRemoteConnectionFailureNotification'; }
    constructor(remoteAgentService, _dialogService, _hostService) {
        this._dialogService = _dialogService;
        this._hostService = _hostService;
        // Let's cover the case where connecting to fetch the remote extension info fails
        remoteAgentService.getRawEnvironment().then(undefined, (err) => {
            if (!RemoteAuthorityResolverError.isHandled(err)) {
                this._presentConnectionError(err);
            }
        });
    }
    async _presentConnectionError(err) {
        await this._dialogService.prompt({
            type: Severity.Error,
            message: nls.localize('connectionError', 'An unexpected error occurred that requires a reload of this page.'),
            detail: nls.localize('connectionErrorDetail', 'The workbench failed to connect to the server (Error: {0})', err ? err.message : ''),
            buttons: [
                {
                    label: nls.localize({ key: 'reload', comment: ['&& denotes a mnemonic'] }, '&&Reload'),
                    run: () => this._hostService.reload(),
                },
            ],
        });
    }
};
RemoteConnectionFailureNotificationContribution = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IDialogService),
    __param(2, IHostService)
], RemoteConnectionFailureNotificationContribution);
registerWorkbenchContribution2(RemoteConnectionFailureNotificationContribution.ID, RemoteConnectionFailureNotificationContribution, 2 /* WorkbenchPhase.BlockRestore */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQWdlbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcmVtb3RlL2Jyb3dzZXIvcmVtb3RlQWdlbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDN0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDckUsT0FBTyxFQUNOLCtCQUErQixFQUMvQiw0QkFBNEIsR0FDNUIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDbkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFHTiw4QkFBOEIsR0FDOUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDekQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDekYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFFdkcsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSwwQkFBMEI7SUFDakUsWUFDOEIsMEJBQXVELEVBQzNELHNCQUErQyxFQUMxQyxrQkFBZ0QsRUFDN0QsY0FBK0IsRUFFaEQsOEJBQStELEVBQ2pELFdBQXlCLEVBQzFCLFVBQXVCO1FBRXBDLEtBQUssQ0FDSiwwQkFBMEIsRUFDMUIsc0JBQXNCLEVBQ3RCLGtCQUFrQixFQUNsQixjQUFjLEVBQ2QsOEJBQThCLEVBQzlCLFdBQVcsRUFDWCxVQUFVLENBQ1YsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBckJZLGtCQUFrQjtJQUU1QixXQUFBLDJCQUEyQixDQUFBO0lBQzNCLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsV0FBQSw0QkFBNEIsQ0FBQTtJQUM1QixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsK0JBQStCLENBQUE7SUFFL0IsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLFdBQVcsQ0FBQTtHQVRELGtCQUFrQixDQXFCOUI7O0FBRUQsSUFBTSwrQ0FBK0MsR0FBckQsTUFBTSwrQ0FBK0M7YUFDcEMsT0FBRSxHQUFHLDhEQUE4RCxBQUFqRSxDQUFpRTtJQUVuRixZQUNzQixrQkFBdUMsRUFDM0IsY0FBOEIsRUFDaEMsWUFBMEI7UUFEeEIsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQ2hDLGlCQUFZLEdBQVosWUFBWSxDQUFjO1FBRXpELGlGQUFpRjtRQUNqRixrQkFBa0IsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUM5RCxJQUFJLENBQUMsNEJBQTRCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2xELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNsQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sS0FBSyxDQUFDLHVCQUF1QixDQUFDLEdBQVE7UUFDN0MsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQztZQUNoQyxJQUFJLEVBQUUsUUFBUSxDQUFDLEtBQUs7WUFDcEIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3BCLGlCQUFpQixFQUNqQixtRUFBbUUsQ0FDbkU7WUFDRCxNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDbkIsdUJBQXVCLEVBQ3ZCLDREQUE0RCxFQUM1RCxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FDdEI7WUFDRCxPQUFPLEVBQUU7Z0JBQ1I7b0JBQ0MsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxVQUFVLENBQUM7b0JBQ3RGLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRTtpQkFDckM7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7O0FBbkNJLCtDQUErQztJQUlsRCxXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxZQUFZLENBQUE7R0FOVCwrQ0FBK0MsQ0FvQ3BEO0FBRUQsOEJBQThCLENBQzdCLCtDQUErQyxDQUFDLEVBQUUsRUFDbEQsK0NBQStDLHNDQUUvQyxDQUFBIn0=