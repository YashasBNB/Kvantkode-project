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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25NYW5hZ2VtZW50L2VsZWN0cm9uLXNhbmRib3gvZXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBR04saUNBQWlDLEdBQ2pDLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFFL0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDN0YsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxzQ0FBc0MsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzlGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUUxRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFMUQsSUFBTSxnQ0FBZ0MsR0FBdEMsTUFBTSxnQ0FDWixTQUFRLFVBQVU7SUFTbEIsWUFDd0Isb0JBQTJDLEVBQzdDLGtCQUF1QyxFQUM3QyxZQUEyQixFQUNuQixvQkFBMkM7UUFFbEUsS0FBSyxFQUFFLENBQUE7UUFUQyxvQ0FBK0IsR0FBc0MsSUFBSSxDQUFBO1FBQ3pFLGlDQUE0QixHQUFzQyxJQUFJLENBQUE7UUFTOUUsTUFBTSwrQkFBK0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNyRCxvQkFBb0IsQ0FBQyxjQUFjLENBQ2xDLGdDQUFnQyxFQUNoQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQzdDLENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyw4QkFBOEIsR0FBRztZQUNyQywwQkFBMEIsRUFBRSwrQkFBK0I7WUFDM0QsRUFBRSxFQUFFLE9BQU87WUFDWCxLQUFLLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7U0FDakMsQ0FBQTtRQUNELE1BQU0scUJBQXFCLEdBQUcsa0JBQWtCLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDaEUsSUFBSSxxQkFBcUIsRUFBRSxDQUFDO1lBQzNCLE1BQU0sMEJBQTBCLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUNyRSxzQ0FBc0MsRUFDdEMscUJBQXFCLENBQUMsVUFBVSxDQUFXLFlBQVksQ0FBQyxFQUN4RCxJQUFJLENBQUMsOEJBQThCLENBQ25DLENBQUE7WUFDRCxJQUFJLENBQUMsK0JBQStCLEdBQUc7Z0JBQ3RDLEVBQUUsRUFBRSxRQUFRO2dCQUNaLDBCQUEwQjtnQkFDMUIsSUFBSSxLQUFLO29CQUNSLE9BQU8sQ0FDTixZQUFZLENBQUMsWUFBWSxDQUN4QixPQUFPLENBQUMsWUFBWSxFQUNwQixxQkFBcUIsQ0FBQyxlQUFlLENBQ3JDLElBQUksUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FDakMsQ0FBQTtnQkFDRixDQUFDO2FBQ0QsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsNEJBQTRCLENBQUMsU0FBcUI7UUFDakQsSUFBSSxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEQsT0FBTyxJQUFJLENBQUMsOEJBQThCLENBQUE7UUFDM0MsQ0FBQztRQUNELElBQ0MsSUFBSSxDQUFDLCtCQUErQjtZQUNwQyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsWUFBWSxFQUNqRCxDQUFDO1lBQ0YsT0FBTyxJQUFJLENBQUMsK0JBQStCLENBQUE7UUFDNUMsQ0FBQztRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO0lBQzNELENBQUM7SUFFRCwyQkFBMkIsQ0FBQyxTQUFxQjtRQUNoRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDM0QsT0FBTyxNQUFNLEtBQUssSUFBSSxDQUFDLCtCQUErQjtZQUNyRCxDQUFDO1lBQ0QsQ0FBQyx1Q0FBK0IsQ0FBQTtJQUNsQyxDQUFDO0NBQ0QsQ0FBQTtBQXJFWSxnQ0FBZ0M7SUFXMUMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxxQkFBcUIsQ0FBQTtHQWRYLGdDQUFnQyxDQXFFNUM7O0FBRUQsaUJBQWlCLENBQ2hCLGlDQUFpQyxFQUNqQyxnQ0FBZ0Msb0NBRWhDLENBQUEifQ==