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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQWdlbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3JlbW90ZS9icm93c2VyL3JlbW90ZUFnZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3JFLE9BQU8sRUFDTiwrQkFBK0IsRUFDL0IsNEJBQTRCLEdBQzVCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBR04sOEJBQThCLEdBQzlCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3pELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBRXZHLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsMEJBQTBCO0lBQ2pFLFlBQzhCLDBCQUF1RCxFQUMzRCxzQkFBK0MsRUFDMUMsa0JBQWdELEVBQzdELGNBQStCLEVBRWhELDhCQUErRCxFQUNqRCxXQUF5QixFQUMxQixVQUF1QjtRQUVwQyxLQUFLLENBQ0osMEJBQTBCLEVBQzFCLHNCQUFzQixFQUN0QixrQkFBa0IsRUFDbEIsY0FBYyxFQUNkLDhCQUE4QixFQUM5QixXQUFXLEVBQ1gsVUFBVSxDQUNWLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXJCWSxrQkFBa0I7SUFFNUIsV0FBQSwyQkFBMkIsQ0FBQTtJQUMzQixXQUFBLHVCQUF1QixDQUFBO0lBQ3ZCLFdBQUEsNEJBQTRCLENBQUE7SUFDNUIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLCtCQUErQixDQUFBO0lBRS9CLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxXQUFXLENBQUE7R0FURCxrQkFBa0IsQ0FxQjlCOztBQUVELElBQU0sK0NBQStDLEdBQXJELE1BQU0sK0NBQStDO2FBQ3BDLE9BQUUsR0FBRyw4REFBOEQsQUFBakUsQ0FBaUU7SUFFbkYsWUFDc0Isa0JBQXVDLEVBQzNCLGNBQThCLEVBQ2hDLFlBQTBCO1FBRHhCLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQUNoQyxpQkFBWSxHQUFaLFlBQVksQ0FBYztRQUV6RCxpRkFBaUY7UUFDakYsa0JBQWtCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDOUQsSUFBSSxDQUFDLDRCQUE0QixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNsRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDbEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxHQUFRO1FBQzdDLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUM7WUFDaEMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxLQUFLO1lBQ3BCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNwQixpQkFBaUIsRUFDakIsbUVBQW1FLENBQ25FO1lBQ0QsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ25CLHVCQUF1QixFQUN2Qiw0REFBNEQsRUFDNUQsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQ3RCO1lBQ0QsT0FBTyxFQUFFO2dCQUNSO29CQUNDLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDO29CQUN0RixHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUU7aUJBQ3JDO2FBQ0Q7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDOztBQW5DSSwrQ0FBK0M7SUFJbEQsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsWUFBWSxDQUFBO0dBTlQsK0NBQStDLENBb0NwRDtBQUVELDhCQUE4QixDQUM3QiwrQ0FBK0MsQ0FBQyxFQUFFLEVBQ2xELCtDQUErQyxzQ0FFL0MsQ0FBQSJ9