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
import { IRemoteAgentService } from '../common/remoteAgentService.js';
import { IRemoteAuthorityResolverService, RemoteAuthorityResolverError, } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { AbstractRemoteAgentService } from '../common/abstractRemoteAgentService.js';
import { ISignService } from '../../../../platform/sign/common/sign.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { URI } from '../../../../base/common/uri.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
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
    static { this.ID = 'workbench.contrib.nativeRemoteConnectionFailureNotification'; }
    constructor(_remoteAgentService, notificationService, environmentService, telemetryService, nativeHostService, _remoteAuthorityResolverService, openerService) {
        this._remoteAgentService = _remoteAgentService;
        this._remoteAuthorityResolverService = _remoteAuthorityResolverService;
        // Let's cover the case where connecting to fetch the remote extension info fails
        this._remoteAgentService.getRawEnvironment().then(undefined, (err) => {
            if (!RemoteAuthorityResolverError.isHandled(err)) {
                const choices = [
                    {
                        label: nls.localize('devTools', 'Open Developer Tools'),
                        run: () => nativeHostService.openDevTools(),
                    },
                ];
                const troubleshootingURL = this._getTroubleshootingURL();
                if (troubleshootingURL) {
                    choices.push({
                        label: nls.localize('directUrl', 'Open in browser'),
                        run: () => openerService.open(troubleshootingURL, { openExternal: true }),
                    });
                }
                notificationService.prompt(Severity.Error, nls.localize('connectionError', 'Failed to connect to the remote extension host server (Error: {0})', err ? err.message : ''), choices);
            }
        });
    }
    _getTroubleshootingURL() {
        const remoteAgentConnection = this._remoteAgentService.getConnection();
        if (!remoteAgentConnection) {
            return null;
        }
        const connectionData = this._remoteAuthorityResolverService.getConnectionData(remoteAgentConnection.remoteAuthority);
        if (!connectionData || connectionData.connectTo.type !== 0 /* RemoteConnectionType.WebSocket */) {
            return null;
        }
        return URI.from({
            scheme: 'http',
            authority: `${connectionData.connectTo.host}:${connectionData.connectTo.port}`,
            path: `/version`,
        });
    }
};
RemoteConnectionFailureNotificationContribution = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, INotificationService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, ITelemetryService),
    __param(4, INativeHostService),
    __param(5, IRemoteAuthorityResolverService),
    __param(6, IOpenerService)
], RemoteConnectionFailureNotificationContribution);
registerWorkbenchContribution2(RemoteConnectionFailureNotificationContribution.ID, RemoteConnectionFailureNotificationContribution, 2 /* WorkbenchPhase.BlockRestore */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQWdlbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3JlbW90ZS9lbGVjdHJvbi1zYW5kYm94L3JlbW90ZUFnZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3JFLE9BQU8sRUFDTiwrQkFBK0IsRUFFL0IsNEJBQTRCLEdBQzVCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDN0YsT0FBTyxFQUNOLG9CQUFvQixFQUVwQixRQUFRLEdBQ1IsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBR04sOEJBQThCLEdBQzlCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUs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