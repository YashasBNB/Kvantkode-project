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
import { IExtensionManagementServerService, } from './extensionManagement.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { Schemas } from '../../../../base/common/network.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { isWeb } from '../../../../base/common/platform.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { WebExtensionManagementService } from './webExtensionManagementService.js';
import { RemoteExtensionManagementService } from './remoteExtensionManagementService.js';
let ExtensionManagementServerService = class ExtensionManagementServerService {
    constructor(remoteAgentService, labelService, instantiationService) {
        this.localExtensionManagementServer = null;
        this.remoteExtensionManagementServer = null;
        this.webExtensionManagementServer = null;
        const remoteAgentConnection = remoteAgentService.getConnection();
        if (remoteAgentConnection) {
            const extensionManagementService = instantiationService.createInstance(RemoteExtensionManagementService, remoteAgentConnection.getChannel('extensions'));
            this.remoteExtensionManagementServer = {
                id: 'remote',
                extensionManagementService,
                get label() {
                    return (labelService.getHostLabel(Schemas.vscodeRemote, remoteAgentConnection.remoteAuthority) || localize('remote', 'Remote'));
                },
            };
        }
        if (isWeb) {
            const extensionManagementService = instantiationService.createInstance(WebExtensionManagementService);
            this.webExtensionManagementServer = {
                id: 'web',
                extensionManagementService,
                label: localize('browser', 'Browser'),
            };
        }
    }
    getExtensionManagementServer(extension) {
        if (extension.location.scheme === Schemas.vscodeRemote) {
            return this.remoteExtensionManagementServer;
        }
        if (this.webExtensionManagementServer) {
            return this.webExtensionManagementServer;
        }
        throw new Error(`Invalid Extension ${extension.location}`);
    }
    getExtensionInstallLocation(extension) {
        const server = this.getExtensionManagementServer(extension);
        return server === this.remoteExtensionManagementServer
            ? 2 /* ExtensionInstallLocation.Remote */
            : 3 /* ExtensionInstallLocation.Web */;
    }
};
ExtensionManagementServerService = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, ILabelService),
    __param(2, IInstantiationService)
], ExtensionManagementServerService);
export { ExtensionManagementServerService };
registerSingleton(IExtensionManagementServerService, ExtensionManagementServerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vZXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFHTixpQ0FBaUMsR0FDakMsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFNUQsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFbEYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFakYsSUFBTSxnQ0FBZ0MsR0FBdEMsTUFBTSxnQ0FBZ0M7SUFPNUMsWUFDc0Isa0JBQXVDLEVBQzdDLFlBQTJCLEVBQ25CLG9CQUEyQztRQVAxRCxtQ0FBOEIsR0FBc0MsSUFBSSxDQUFBO1FBQ3hFLG9DQUErQixHQUFzQyxJQUFJLENBQUE7UUFDekUsaUNBQTRCLEdBQXNDLElBQUksQ0FBQTtRQU85RSxNQUFNLHFCQUFxQixHQUFHLGtCQUFrQixDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQ2hFLElBQUkscUJBQXFCLEVBQUUsQ0FBQztZQUMzQixNQUFNLDBCQUEwQixHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FDckUsZ0NBQWdDLEVBQ2hDLHFCQUFxQixDQUFDLFVBQVUsQ0FBVyxZQUFZLENBQUMsQ0FDeEQsQ0FBQTtZQUNELElBQUksQ0FBQywrQkFBK0IsR0FBRztnQkFDdEMsRUFBRSxFQUFFLFFBQVE7Z0JBQ1osMEJBQTBCO2dCQUMxQixJQUFJLEtBQUs7b0JBQ1IsT0FBTyxDQUNOLFlBQVksQ0FBQyxZQUFZLENBQ3hCLE9BQU8sQ0FBQyxZQUFZLEVBQ3BCLHFCQUFxQixDQUFDLGVBQWUsQ0FDckMsSUFBSSxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUNqQyxDQUFBO2dCQUNGLENBQUM7YUFDRCxDQUFBO1FBQ0YsQ0FBQztRQUNELElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxNQUFNLDBCQUEwQixHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FDckUsNkJBQTZCLENBQzdCLENBQUE7WUFDRCxJQUFJLENBQUMsNEJBQTRCLEdBQUc7Z0JBQ25DLEVBQUUsRUFBRSxLQUFLO2dCQUNULDBCQUEwQjtnQkFDMUIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDO2FBQ3JDLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELDRCQUE0QixDQUFDLFNBQXFCO1FBQ2pELElBQUksU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3hELE9BQU8sSUFBSSxDQUFDLCtCQUFnQyxDQUFBO1FBQzdDLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sSUFBSSxDQUFDLDRCQUE0QixDQUFBO1FBQ3pDLENBQUM7UUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUMzRCxDQUFDO0lBRUQsMkJBQTJCLENBQUMsU0FBcUI7UUFDaEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzNELE9BQU8sTUFBTSxLQUFLLElBQUksQ0FBQywrQkFBK0I7WUFDckQsQ0FBQztZQUNELENBQUMscUNBQTZCLENBQUE7SUFDaEMsQ0FBQztDQUNELENBQUE7QUEzRFksZ0NBQWdDO0lBUTFDLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLHFCQUFxQixDQUFBO0dBVlgsZ0NBQWdDLENBMkQ1Qzs7QUFFRCxpQkFBaUIsQ0FDaEIsaUNBQWlDLEVBQ2pDLGdDQUFnQyxvQ0FFaEMsQ0FBQSJ9