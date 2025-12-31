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
import { ProxyChannel } from '../../../../../base/parts/ipc/common/ipc.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { NativeMcpDiscoveryHelperChannelName, } from '../../../../../platform/mcp/common/nativeMcpDiscoveryHelper.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { IMcpRegistry } from '../mcpRegistryTypes.js';
import { NativeFilesystemMcpDiscovery } from './nativeMcpDiscoveryAbstract.js';
/**
 * Discovers MCP servers on the remote filesystem, if any.
 */
let RemoteNativeMpcDiscovery = class RemoteNativeMpcDiscovery extends NativeFilesystemMcpDiscovery {
    constructor(remoteAgent, logService, labelService, fileService, instantiationService, mcpRegistry, configurationService) {
        super(remoteAgent.getConnection()?.remoteAuthority || null, labelService, fileService, instantiationService, mcpRegistry, configurationService);
        this.remoteAgent = remoteAgent;
        this.logService = logService;
    }
    async start() {
        const connection = this.remoteAgent.getConnection();
        if (!connection) {
            return this.setDetails(undefined);
        }
        await connection.withChannel(NativeMcpDiscoveryHelperChannelName, async (channel) => {
            const service = ProxyChannel.toService(channel);
            service.load().then((data) => this.setDetails(data), (err) => {
                this.logService.warn('Error getting remote process MCP environment', err);
                this.setDetails(undefined);
            });
        });
    }
};
RemoteNativeMpcDiscovery = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, ILogService),
    __param(2, ILabelService),
    __param(3, IFileService),
    __param(4, IInstantiationService),
    __param(5, IMcpRegistry),
    __param(6, IConfigurationService)
], RemoteNativeMpcDiscovery);
export { RemoteNativeMpcDiscovery };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlTWNwUmVtb3RlRGlzY292ZXJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9kaXNjb3ZlcnkvbmF0aXZlTWNwUmVtb3RlRGlzY292ZXJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDNUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN2RSxPQUFPLEVBRU4sbUNBQW1DLEdBQ25DLE1BQU0sZ0VBQWdFLENBQUE7QUFDdkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDOUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ3JELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRTlFOztHQUVHO0FBQ0ksSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSw0QkFBNEI7SUFDekUsWUFDdUMsV0FBZ0MsRUFDeEMsVUFBdUIsRUFDdEMsWUFBMkIsRUFDNUIsV0FBeUIsRUFDaEIsb0JBQTJDLEVBQ3BELFdBQXlCLEVBQ2hCLG9CQUEyQztRQUVsRSxLQUFLLENBQ0osV0FBVyxDQUFDLGFBQWEsRUFBRSxFQUFFLGVBQWUsSUFBSSxJQUFJLEVBQ3BELFlBQVksRUFDWixXQUFXLEVBQ1gsb0JBQW9CLEVBQ3BCLFdBQVcsRUFDWCxvQkFBb0IsQ0FDcEIsQ0FBQTtRQWZxQyxnQkFBVyxHQUFYLFdBQVcsQ0FBcUI7UUFDeEMsZUFBVSxHQUFWLFVBQVUsQ0FBYTtJQWV0RCxDQUFDO0lBRWUsS0FBSyxDQUFDLEtBQUs7UUFDMUIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUNuRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2xDLENBQUM7UUFFRCxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsbUNBQW1DLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQ25GLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQW1DLE9BQU8sQ0FBQyxDQUFBO1lBRWpGLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQ2xCLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUMvQixDQUFDLEdBQUcsRUFBRSxFQUFFO2dCQUNQLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLDhDQUE4QyxFQUFFLEdBQUcsQ0FBQyxDQUFBO2dCQUN6RSxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzNCLENBQUMsQ0FDRCxDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0QsQ0FBQTtBQXRDWSx3QkFBd0I7SUFFbEMsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxxQkFBcUIsQ0FBQTtHQVJYLHdCQUF3QixDQXNDcEMifQ==