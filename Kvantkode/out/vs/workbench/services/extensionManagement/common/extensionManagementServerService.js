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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9leHRlbnNpb25NYW5hZ2VtZW50U2VydmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUdOLGlDQUFpQyxHQUNqQyxNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUU1RCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUVsRixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUVqRixJQUFNLGdDQUFnQyxHQUF0QyxNQUFNLGdDQUFnQztJQU81QyxZQUNzQixrQkFBdUMsRUFDN0MsWUFBMkIsRUFDbkIsb0JBQTJDO1FBUDFELG1DQUE4QixHQUFzQyxJQUFJLENBQUE7UUFDeEUsb0NBQStCLEdBQXNDLElBQUksQ0FBQTtRQUN6RSxpQ0FBNEIsR0FBc0MsSUFBSSxDQUFBO1FBTzlFLE1BQU0scUJBQXFCLEdBQUcsa0JBQWtCLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDaEUsSUFBSSxxQkFBcUIsRUFBRSxDQUFDO1lBQzNCLE1BQU0sMEJBQTBCLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUNyRSxnQ0FBZ0MsRUFDaEMscUJBQXFCLENBQUMsVUFBVSxDQUFXLFlBQVksQ0FBQyxDQUN4RCxDQUFBO1lBQ0QsSUFBSSxDQUFDLCtCQUErQixHQUFHO2dCQUN0QyxFQUFFLEVBQUUsUUFBUTtnQkFDWiwwQkFBMEI7Z0JBQzFCLElBQUksS0FBSztvQkFDUixPQUFPLENBQ04sWUFBWSxDQUFDLFlBQVksQ0FDeEIsT0FBTyxDQUFDLFlBQVksRUFDcEIscUJBQXFCLENBQUMsZUFBZSxDQUNyQyxJQUFJLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQ2pDLENBQUE7Z0JBQ0YsQ0FBQzthQUNELENBQUE7UUFDRixDQUFDO1FBQ0QsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLE1BQU0sMEJBQTBCLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUNyRSw2QkFBNkIsQ0FDN0IsQ0FBQTtZQUNELElBQUksQ0FBQyw0QkFBNEIsR0FBRztnQkFDbkMsRUFBRSxFQUFFLEtBQUs7Z0JBQ1QsMEJBQTBCO2dCQUMxQixLQUFLLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUM7YUFDckMsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsNEJBQTRCLENBQUMsU0FBcUI7UUFDakQsSUFBSSxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEQsT0FBTyxJQUFJLENBQUMsK0JBQWdDLENBQUE7UUFDN0MsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLDRCQUE0QixFQUFFLENBQUM7WUFDdkMsT0FBTyxJQUFJLENBQUMsNEJBQTRCLENBQUE7UUFDekMsQ0FBQztRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO0lBQzNELENBQUM7SUFFRCwyQkFBMkIsQ0FBQyxTQUFxQjtRQUNoRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDM0QsT0FBTyxNQUFNLEtBQUssSUFBSSxDQUFDLCtCQUErQjtZQUNyRCxDQUFDO1lBQ0QsQ0FBQyxxQ0FBNkIsQ0FBQTtJQUNoQyxDQUFDO0NBQ0QsQ0FBQTtBQTNEWSxnQ0FBZ0M7SUFRMUMsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEscUJBQXFCLENBQUE7R0FWWCxnQ0FBZ0MsQ0EyRDVDOztBQUVELGlCQUFpQixDQUNoQixpQ0FBaUMsRUFDakMsZ0NBQWdDLG9DQUVoQyxDQUFBIn0=