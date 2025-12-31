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
import { Schemas } from '../../../../base/common/network.js';
import { IExtensionManagementServerService, } from '../common/extensionManagement.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { ISharedProcessService } from '../../../../platform/ipc/electron-sandbox/services.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { NativeRemoteExtensionManagementService } from './remoteExtensionManagementService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { NativeExtensionManagementService } from './nativeExtensionManagementService.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
let ExtensionManagementServerService = class ExtensionManagementServerService extends Disposable {
    constructor(sharedProcessService, remoteAgentService, labelService, instantiationService) {
        super();
        this.remoteExtensionManagementServer = null;
        this.webExtensionManagementServer = null;
        const localExtensionManagementService = this._register(instantiationService.createInstance(NativeExtensionManagementService, sharedProcessService.getChannel('extensions')));
        this.localExtensionManagementServer = {
            extensionManagementService: localExtensionManagementService,
            id: 'local',
            label: localize('local', 'Local'),
        };
        const remoteAgentConnection = remoteAgentService.getConnection();
        if (remoteAgentConnection) {
            const extensionManagementService = instantiationService.createInstance(NativeRemoteExtensionManagementService, remoteAgentConnection.getChannel('extensions'), this.localExtensionManagementServer);
            this.remoteExtensionManagementServer = {
                id: 'remote',
                extensionManagementService,
                get label() {
                    return (labelService.getHostLabel(Schemas.vscodeRemote, remoteAgentConnection.remoteAuthority) || localize('remote', 'Remote'));
                },
            };
        }
    }
    getExtensionManagementServer(extension) {
        if (extension.location.scheme === Schemas.file) {
            return this.localExtensionManagementServer;
        }
        if (this.remoteExtensionManagementServer &&
            extension.location.scheme === Schemas.vscodeRemote) {
            return this.remoteExtensionManagementServer;
        }
        throw new Error(`Invalid Extension ${extension.location}`);
    }
    getExtensionInstallLocation(extension) {
        const server = this.getExtensionManagementServer(extension);
        return server === this.remoteExtensionManagementServer
            ? 2 /* ExtensionInstallLocation.Remote */
            : 1 /* ExtensionInstallLocation.Local */;
    }
};
ExtensionManagementServerService = __decorate([
    __param(0, ISharedProcessService),
    __param(1, IRemoteAgentService),
    __param(2, ILabelService),
    __param(3, IInstantiationService)
], ExtensionManagementServerService);
export { ExtensionManagementServerService };
registerSingleton(IExtensionManagementServerService, ExtensionManagementServerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9uTWFuYWdlbWVudC9lbGVjdHJvbi1zYW5kYm94L2V4dGVuc2lvbk1hbmFnZW1lbnRTZXJ2ZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUdOLGlDQUFpQyxHQUNqQyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRS9FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzdGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsc0NBQXNDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFMUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDeEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRTFELElBQU0sZ0NBQWdDLEdBQXRDLE1BQU0sZ0NBQ1osU0FBUSxVQUFVO0lBU2xCLFlBQ3dCLG9CQUEyQyxFQUM3QyxrQkFBdUMsRUFDN0MsWUFBMkIsRUFDbkIsb0JBQTJDO1FBRWxFLEtBQUssRUFBRSxDQUFBO1FBVEMsb0NBQStCLEdBQXNDLElBQUksQ0FBQTtRQUN6RSxpQ0FBNEIsR0FBc0MsSUFBSSxDQUFBO1FBUzlFLE1BQU0sK0JBQStCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDckQsb0JBQW9CLENBQUMsY0FBYyxDQUNsQyxnQ0FBZ0MsRUFDaEMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUM3QyxDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsOEJBQThCLEdBQUc7WUFDckMsMEJBQTBCLEVBQUUsK0JBQStCO1lBQzNELEVBQUUsRUFBRSxPQUFPO1lBQ1gsS0FBSyxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO1NBQ2pDLENBQUE7UUFDRCxNQUFNLHFCQUFxQixHQUFHLGtCQUFrQixDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQ2hFLElBQUkscUJBQXFCLEVBQUUsQ0FBQztZQUMzQixNQUFNLDBCQUEwQixHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FDckUsc0NBQXNDLEVBQ3RDLHFCQUFxQixDQUFDLFVBQVUsQ0FBVyxZQUFZLENBQUMsRUFDeEQsSUFBSSxDQUFDLDhCQUE4QixDQUNuQyxDQUFBO1lBQ0QsSUFBSSxDQUFDLCtCQUErQixHQUFHO2dCQUN0QyxFQUFFLEVBQUUsUUFBUTtnQkFDWiwwQkFBMEI7Z0JBQzFCLElBQUksS0FBSztvQkFDUixPQUFPLENBQ04sWUFBWSxDQUFDLFlBQVksQ0FDeEIsT0FBTyxDQUFDLFlBQVksRUFDcEIscUJBQXFCLENBQUMsZUFBZSxDQUNyQyxJQUFJLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQ2pDLENBQUE7Z0JBQ0YsQ0FBQzthQUNELENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELDRCQUE0QixDQUFDLFNBQXFCO1FBQ2pELElBQUksU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hELE9BQU8sSUFBSSxDQUFDLDhCQUE4QixDQUFBO1FBQzNDLENBQUM7UUFDRCxJQUNDLElBQUksQ0FBQywrQkFBK0I7WUFDcEMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLFlBQVksRUFDakQsQ0FBQztZQUNGLE9BQU8sSUFBSSxDQUFDLCtCQUErQixDQUFBO1FBQzVDLENBQUM7UUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUMzRCxDQUFDO0lBRUQsMkJBQTJCLENBQUMsU0FBcUI7UUFDaEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzNELE9BQU8sTUFBTSxLQUFLLElBQUksQ0FBQywrQkFBK0I7WUFDckQsQ0FBQztZQUNELENBQUMsdUNBQStCLENBQUE7SUFDbEMsQ0FBQztDQUNELENBQUE7QUFyRVksZ0NBQWdDO0lBVzFDLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEscUJBQXFCLENBQUE7R0FkWCxnQ0FBZ0MsQ0FxRTVDOztBQUVELGlCQUFpQixDQUNoQixpQ0FBaUMsRUFDakMsZ0NBQWdDLG9DQUVoQyxDQUFBIn0=