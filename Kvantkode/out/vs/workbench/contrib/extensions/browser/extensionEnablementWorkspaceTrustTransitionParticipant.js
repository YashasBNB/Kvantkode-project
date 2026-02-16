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
import { localize } from '../../../../nls.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkspaceTrustEnablementService, IWorkspaceTrustManagementService, } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IHostService } from '../../../services/host/browser/host.js';
let ExtensionEnablementWorkspaceTrustTransitionParticipant = class ExtensionEnablementWorkspaceTrustTransitionParticipant extends Disposable {
    constructor(extensionService, hostService, environmentService, extensionEnablementService, workspaceTrustEnablementService, workspaceTrustManagementService) {
        super();
        if (workspaceTrustEnablementService.isWorkspaceTrustEnabled()) {
            // The extension enablement participant will be registered only after the
            // workspace trust state has been initialized. There is no need to execute
            // the participant as part of the initialization process, as the workspace
            // trust state is initialized before starting the extension host.
            workspaceTrustManagementService.workspaceTrustInitialized.then(() => {
                const workspaceTrustTransitionParticipant = new (class {
                    async participate(trusted) {
                        if (trusted) {
                            // Untrusted -> Trusted
                            await extensionEnablementService.updateExtensionsEnablementsWhenWorkspaceTrustChanges();
                        }
                        else {
                            // Trusted -> Untrusted
                            if (environmentService.remoteAuthority) {
                                hostService.reload();
                            }
                            else {
                                const stopped = await extensionService.stopExtensionHosts(localize('restartExtensionHost.reason', 'Changing workspace trust'));
                                await extensionEnablementService.updateExtensionsEnablementsWhenWorkspaceTrustChanges();
                                if (stopped) {
                                    extensionService.startExtensionHosts();
                                }
                            }
                        }
                    }
                })();
                // Execute BEFORE the workspace trust transition completes
                this._register(workspaceTrustManagementService.addWorkspaceTrustTransitionParticipant(workspaceTrustTransitionParticipant));
            });
        }
    }
};
ExtensionEnablementWorkspaceTrustTransitionParticipant = __decorate([
    __param(0, IExtensionService),
    __param(1, IHostService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IWorkbenchExtensionEnablementService),
    __param(4, IWorkspaceTrustEnablementService),
    __param(5, IWorkspaceTrustManagementService)
], ExtensionEnablementWorkspaceTrustTransitionParticipant);
export { ExtensionEnablementWorkspaceTrustTransitionParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRW5hYmxlbWVudFdvcmtzcGFjZVRydXN0VHJhbnNpdGlvblBhcnRpY2lwYW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvZXh0ZW5zaW9uRW5hYmxlbWVudFdvcmtzcGFjZVRydXN0VHJhbnNpdGlvblBhcnRpY2lwYW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUNOLGdDQUFnQyxFQUNoQyxnQ0FBZ0MsR0FFaEMsTUFBTSx5REFBeUQsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsb0NBQW9DLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUMxSCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFOUQsSUFBTSxzREFBc0QsR0FBNUQsTUFBTSxzREFDWixTQUFRLFVBQVU7SUFHbEIsWUFDb0IsZ0JBQW1DLEVBQ3hDLFdBQXlCLEVBQ1Qsa0JBQWdELEVBRTlFLDBCQUFnRSxFQUVoRSwrQkFBaUUsRUFFakUsK0JBQWlFO1FBRWpFLEtBQUssRUFBRSxDQUFBO1FBRVAsSUFBSSwrQkFBK0IsQ0FBQyx1QkFBdUIsRUFBRSxFQUFFLENBQUM7WUFDL0QseUVBQXlFO1lBQ3pFLDBFQUEwRTtZQUMxRSwwRUFBMEU7WUFDMUUsaUVBQWlFO1lBQ2pFLCtCQUErQixDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQ25FLE1BQU0sbUNBQW1DLEdBQUcsSUFBSSxDQUFDO29CQUdoRCxLQUFLLENBQUMsV0FBVyxDQUFDLE9BQWdCO3dCQUNqQyxJQUFJLE9BQU8sRUFBRSxDQUFDOzRCQUNiLHVCQUF1Qjs0QkFDdkIsTUFBTSwwQkFBMEIsQ0FBQyxvREFBb0QsRUFBRSxDQUFBO3dCQUN4RixDQUFDOzZCQUFNLENBQUM7NEJBQ1AsdUJBQXVCOzRCQUN2QixJQUFJLGtCQUFrQixDQUFDLGVBQWUsRUFBRSxDQUFDO2dDQUN4QyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUE7NEJBQ3JCLENBQUM7aUNBQU0sQ0FBQztnQ0FDUCxNQUFNLE9BQU8sR0FBRyxNQUFNLGdCQUFnQixDQUFDLGtCQUFrQixDQUN4RCxRQUFRLENBQUMsNkJBQTZCLEVBQUUsMEJBQTBCLENBQUMsQ0FDbkUsQ0FBQTtnQ0FDRCxNQUFNLDBCQUEwQixDQUFDLG9EQUFvRCxFQUFFLENBQUE7Z0NBQ3ZGLElBQUksT0FBTyxFQUFFLENBQUM7b0NBQ2IsZ0JBQWdCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtnQ0FDdkMsQ0FBQzs0QkFDRixDQUFDO3dCQUNGLENBQUM7b0JBQ0YsQ0FBQztpQkFDRCxDQUFDLEVBQUUsQ0FBQTtnQkFFSiwwREFBMEQ7Z0JBQzFELElBQUksQ0FBQyxTQUFTLENBQ2IsK0JBQStCLENBQUMsc0NBQXNDLENBQ3JFLG1DQUFtQyxDQUNuQyxDQUNELENBQUE7WUFDRixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXhEWSxzREFBc0Q7SUFLaEUsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsNEJBQTRCLENBQUE7SUFDNUIsV0FBQSxvQ0FBb0MsQ0FBQTtJQUVwQyxXQUFBLGdDQUFnQyxDQUFBO0lBRWhDLFdBQUEsZ0NBQWdDLENBQUE7R0FadEIsc0RBQXNELENBd0RsRSJ9