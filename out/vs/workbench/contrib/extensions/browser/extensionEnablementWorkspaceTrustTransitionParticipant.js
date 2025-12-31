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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRW5hYmxlbWVudFdvcmtzcGFjZVRydXN0VHJhbnNpdGlvblBhcnRpY2lwYW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL2V4dGVuc2lvbkVuYWJsZW1lbnRXb3Jrc3BhY2VUcnVzdFRyYW5zaXRpb25QYXJ0aWNpcGFudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixnQ0FBZ0MsRUFDaEMsZ0NBQWdDLEdBRWhDLE1BQU0seURBQXlELENBQUE7QUFFaEUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDekcsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDMUgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDckYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRTlELElBQU0sc0RBQXNELEdBQTVELE1BQU0sc0RBQ1osU0FBUSxVQUFVO0lBR2xCLFlBQ29CLGdCQUFtQyxFQUN4QyxXQUF5QixFQUNULGtCQUFnRCxFQUU5RSwwQkFBZ0UsRUFFaEUsK0JBQWlFLEVBRWpFLCtCQUFpRTtRQUVqRSxLQUFLLEVBQUUsQ0FBQTtRQUVQLElBQUksK0JBQStCLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxDQUFDO1lBQy9ELHlFQUF5RTtZQUN6RSwwRUFBMEU7WUFDMUUsMEVBQTBFO1lBQzFFLGlFQUFpRTtZQUNqRSwrQkFBK0IsQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUNuRSxNQUFNLG1DQUFtQyxHQUFHLElBQUksQ0FBQztvQkFHaEQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxPQUFnQjt3QkFDakMsSUFBSSxPQUFPLEVBQUUsQ0FBQzs0QkFDYix1QkFBdUI7NEJBQ3ZCLE1BQU0sMEJBQTBCLENBQUMsb0RBQW9ELEVBQUUsQ0FBQTt3QkFDeEYsQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLHVCQUF1Qjs0QkFDdkIsSUFBSSxrQkFBa0IsQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQ0FDeEMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFBOzRCQUNyQixDQUFDO2lDQUFNLENBQUM7Z0NBQ1AsTUFBTSxPQUFPLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FDeEQsUUFBUSxDQUFDLDZCQUE2QixFQUFFLDBCQUEwQixDQUFDLENBQ25FLENBQUE7Z0NBQ0QsTUFBTSwwQkFBMEIsQ0FBQyxvREFBb0QsRUFBRSxDQUFBO2dDQUN2RixJQUFJLE9BQU8sRUFBRSxDQUFDO29DQUNiLGdCQUFnQixDQUFDLG1CQUFtQixFQUFFLENBQUE7Z0NBQ3ZDLENBQUM7NEJBQ0YsQ0FBQzt3QkFDRixDQUFDO29CQUNGLENBQUM7aUJBQ0QsQ0FBQyxFQUFFLENBQUE7Z0JBRUosMERBQTBEO2dCQUMxRCxJQUFJLENBQUMsU0FBUyxDQUNiLCtCQUErQixDQUFDLHNDQUFzQyxDQUNyRSxtQ0FBbUMsQ0FDbkMsQ0FDRCxDQUFBO1lBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUF4RFksc0RBQXNEO0lBS2hFLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLDRCQUE0QixDQUFBO0lBQzVCLFdBQUEsb0NBQW9DLENBQUE7SUFFcEMsV0FBQSxnQ0FBZ0MsQ0FBQTtJQUVoQyxXQUFBLGdDQUFnQyxDQUFBO0dBWnRCLHNEQUFzRCxDQXdEbEUifQ==